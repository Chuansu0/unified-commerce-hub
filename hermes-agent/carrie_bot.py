#!/usr/bin/env python3
"""
neovegacarrie_bot - 本地執行者（Home Workstation）
職責: 接收 Sherlock/n8n 的 JSONL 指令，執行本地動作
包含: ingest_url → embedding → wiki 整理 完整流程

環境變數:
	CARRIE_BOT_TOKEN: Telegram Bot Token
	VAULT_PATH: Knowledge vault 路徑 (預設: D:\\knowledge-vault)
"""

import os
import json
import hashlib
import asyncio
import logging
import subprocess
from datetime import datetime
from pathlib import Path
from typing import Optional

import httpx
import trafilatura
from telegram import Update
from telegram.ext import Application, MessageHandler, CommandHandler, ContextTypes, filters

# ── 設定 ──
TOKEN = os.getenv("CARRIE_BOT_TOKEN", "8615424711:AAGLoHijlMpqWX7yD_JhJjKeTS0Dd5H5GTg")
VAULT_PATH = Path(os.getenv("VAULT_PATH", "D:\\knowledge-vault"))
RAW_INBOX = VAULT_PATH / "raw" / "inbox"
WIKI_SOURCES = VAULT_PATH / "wiki" / "sources"
EMBED_DIR = VAULT_PATH / "embeddings"

OLLAMA_CHAT_URL = "http://127.0.0.1:11434/v1/chat/completions"
OLLAMA_EMBED_URL = "http://127.0.0.1:11434/api/embeddings"
OLLAMA_MODEL = "gemma:2b"
EMBED_MODEL = "nomic-embed-text"

# Sherlock bot 的 chat_id（設為 0 表示接受所有人）
SHERLOCK_BOT_ID = int(os.getenv("SHERLOCK_BOT_ID", "0"))

# 腳本白名單
SCRIPT_WHITELIST = {
	"rebuild_index": str(VAULT_PATH / "ops" / "scripts" / "rebuild_index.py"),
	"sync_vault": str(VAULT_PATH / "ops" / "scripts" / "sync_vault.ps1"),
}

# Home n8n webhook（用於回報結果）
HOME_N8N_WEBHOOK = os.getenv("HOME_N8N_WEBHOOK", "https://home-n8n.neovega.cc/webhook/carrie-report")

logging.basicConfig(
	format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
	level=logging.INFO,
)
logger = logging.getLogger(__name__)


# ── 指令處理 ──
async def start_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
	await update.message.reply_text(
		"🏠 neovegacarrie_bot 已啟動\n\n"
		"我是 Home Workstation 的本地執行者。\n"
		"接收 Sherlock 的 JSONL 指令並執行：\n"
		"• ingest_url - 下載連結入庫 + embedding + wiki 整理\n"
		"• local_scan - 本地檔案掃描\n"
		"• run_script - 執行白名單腳本\n\n"
		"使用 /status 查看狀態\n"
		"使用 /ingest <url> 手動入庫連結"
	)


async def status_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
	raw_count = len(list(RAW_INBOX.glob("*.md"))) if RAW_INBOX.exists() else 0
	wiki_count = len(list(WIKI_SOURCES.glob("*.md"))) if WIKI_SOURCES.exists() else 0
	faiss_exists = (EMBED_DIR / "index.faiss").exists()

	await update.message.reply_text(
		f"🏠 Carrie Bot 狀態\n"
		f"• Vault: {VAULT_PATH}\n"
		f"• raw/inbox: {raw_count} 檔案\n"
		f"• wiki/sources: {wiki_count} 頁面\n"
		f"• FAISS 索引: {'✅' if faiss_exists else '❌'}\n"
		f"• Ollama: {OLLAMA_CHAT_URL}\n"
		f"• Embed: {EMBED_MODEL}"
	)


async def ingest_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
	"""手動 /ingest <url> 指令"""
	if not context.args:
		await update.message.reply_text("用法: /ingest <url>")
		return
	url = context.args[0]
	await doFullIngest(url, update)


# ── 核心 ingest 流程 ──
async def doFullIngest(url: str, update: Update) -> dict:
	"""完整 ingest 流程：下載 → 儲存 → LLM 摘要 → embedding → wiki 更新"""
	msg = await update.message.reply_text(f"⏳ 開始入庫: {url}")

	try:
		# 1. 下載並清理內容
		downloaded = trafilatura.fetch_url(url)
		if not downloaded:
			await msg.edit_text(f"❌ 無法下載: {url}")
			return {"error": "download_failed"}

		text = trafilatura.extract(downloaded, include_tables=True)
		metadata = trafilatura.extract_metadata(downloaded)
		title = metadata.title if metadata and metadata.title else "Untitled"

		if not text or len(text.strip()) < 20:
			await msg.edit_text(f"❌ 內容太短或無法擷取: {url}")
			return {"error": "extract_failed"}

		# 2. SHA256 去重
		sha = hashlib.sha256(text.encode()).hexdigest()[:12]
		raw_path = RAW_INBOX / f"{sha}.md"

		if raw_path.exists():
			await msg.edit_text(f"ℹ️ 已存在: {raw_path.name}")
			return {"status": "already_exists", "path": str(raw_path)}

		# 3. 儲存原始內容到 raw/inbox/
		RAW_INBOX.mkdir(parents=True, exist_ok=True)
		raw_content = f"---\ntitle: \"{title}\"\nsource: \"{url}\"\ndate: \"{datetime.now().isoformat()}\"\nsha: \"{sha}\"\n---\n\n# {title}\n\n{text}"
		raw_path.write_text(raw_content, encoding="utf-8")

		await msg.edit_text(f"📥 已下載到 raw/inbox/{sha}.md\n⏳ LLM 產生摘要中...")

		# 4. LLM 產生摘要頁
		summary = await callOllamaSummarize(text, url, title, sha)

		# 5. 寫入 wiki/sources/
		WIKI_SOURCES.mkdir(parents=True, exist_ok=True)
		ts = datetime.now().strftime("%Y%m%d_%H%M%S")
		wiki_path = WIKI_SOURCES / f"{ts}_{sha}.md"
		wiki_path.write_text(summary, encoding="utf-8")

		await msg.edit_text(f"📝 摘要已寫入 wiki/sources/\n⏳ 建立 embedding...")

		# 6. 建立 embedding
		embed_ok = await addEmbedding(wiki_path, summary)

		# 7. 更新 log.md
		log_entry = f"- {datetime.now().isoformat()} ingest {url} {wiki_path.name}\n"
		log_path = VAULT_PATH / "wiki" / "log.md"
		with open(log_path, "a", encoding="utf-8") as lf:
			lf.write(log_entry)

		# 8. 更新 index.md
		await updateIndex(wiki_path.name, title, sha)

		embed_status = "✅" if embed_ok else "⚠️ (embedding 失敗，夜間批次會重建)"
		await msg.edit_text(
			f"✅ 入庫完成！\n\n"
			f"📄 原始: raw/inbox/{sha}.md\n"
			f"📝 摘要: wiki/sources/{wiki_path.name}\n"
			f"🔢 Embedding: {embed_status}\n"
			f"📖 標題: {title}"
		)

		return {"status": "ok", "raw": str(raw_path), "wiki": str(wiki_path)}

	except Exception as e:
		logger.error(f"Ingest 失敗: {e}")
		await msg.edit_text(f"❌ 入庫失敗: {e}")
		return {"error": str(e)}


async def callOllamaSummarize(text: str, url: str, title: str, sha: str) -> str:
	"""呼叫 Ollama 產生摘要頁"""
	prompt = f"""請為以下文章產生一份結構化的 Markdown 摘要頁面。

要求：
1. 開頭包含 YAML frontmatter（title, source, tags, sha）
2. 摘要 300-500 字
3. 列出 3-5 個關鍵概念
4. 標記可能的 Obsidian 內部連結（用 [[概念名]] 語法）

來源 URL: {url}
標題: {title}

文章內容（前 3000 字）:
{text[:3000]}
"""
	try:
		async with httpx.AsyncClient(timeout=120.0) as client:
			r = await client.post(
				OLLAMA_CHAT_URL,
				json={
					"model": OLLAMA_MODEL,
					"messages": [{"role": "user", "content": prompt}],
					"temperature": 0.3,
					"max_tokens": 1500
				}
			)
			data = r.json()
			return data["choices"][0]["message"]["content"]
	except Exception as e:
		logger.error(f"LLM 摘要失敗: {e}")
		return f"""---
title: "{title}"
source: "{url}"
ingested: "{datetime.now().isoformat()}"
sha: "{sha}"
tags: [待分類]
---

# {title}

> 來源: {url}

LLM 摘要產生失敗，原始內容前 500 字：

{text[:500]}
"""


async def addEmbedding(wiki_path: Path, text: str) -> bool:
	"""為單一文件新增 embedding 到 FAISS 索引"""
	try:
		import faiss
		import numpy as np

		# 取得 embedding
		async with httpx.AsyncClient(timeout=30.0) as client:
			r = await client.post(
				OLLAMA_EMBED_URL,
				json={"model": EMBED_MODEL, "prompt": text[:2000]}
			)
			vec = r.json().get("embedding")
			if not vec:
				return False

		EMBED_DIR.mkdir(parents=True, exist_ok=True)
		index_path = EMBED_DIR / "index.faiss"
		meta_path = EMBED_DIR / "metadata.json"

		# 載入或建立索引
		if index_path.exists() and meta_path.exists():
			index = faiss.read_index(str(index_path))
			meta = json.loads(meta_path.read_text(encoding="utf-8"))
		else:
			dim = len(vec)
			index = faiss.IndexFlatL2(dim)
			meta = []

		# 新增向量
		index.add(np.array([vec], dtype="float32"))
		meta.append({"path": str(wiki_path), "title": wiki_path.stem, "size": len(text)})

		# 儲存
		faiss.write_index(index, str(index_path))
		with open(meta_path, "w", encoding="utf-8") as mf:
			json.dump(meta, mf, ensure_ascii=False, indent=2)

		logger.info(f"Embedding 已新增: {wiki_path.name}")
		return True

	except Exception as e:
		logger.error(f"Embedding 失敗: {e}")
		return False


async def updateIndex(wiki_filename: str, title: str, sha: str) -> None:
	"""更新 wiki/index.md 的來源列表"""
	index_path = VAULT_PATH / "wiki" / "index.md"
	if not index_path.exists():
		return

	content = index_path.read_text(encoding="utf-8")
	new_entry = f"- [[sources/{wiki_filename}|{title}]] (sha: {sha})"

	# 在 "## 來源 (Sources)" 區塊後面加入
	if "## 來源 (Sources)" in content:
		content = content.replace(
			"_尚無頁面_",
			new_entry
		)
		# 如果已經有頁面了，在 Sources 區塊末尾加入
		if new_entry not in content:
			lines = content.split("\n")
			insert_idx = None
			for i, line in enumerate(lines):
				if line.startswith("## 來源"):
					insert_idx = i + 1
				elif insert_idx and line.startswith("## ") and i > insert_idx:
					break
				elif insert_idx and line.startswith("---") and i > insert_idx:
					break
				elif insert_idx:
					insert_idx = i + 1

			if insert_idx:
				lines.insert(insert_idx, new_entry)
				content = "\n".join(lines)

	# 更新時間戳
	content = content.replace(
		"*最後更新:",
		f"*最後更新: {datetime.now().strftime('%Y-%m-%d %H:%M')}*\n*舊更新:"
	)

	index_path.write_text(content, encoding="utf-8")


# ── JSONL 訊息處理 ──
async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
	"""接收並解析 JSONL 指令或純 URL"""
	if not update.message or not update.message.text:
		return

	text = update.message.text.strip()
	sender_id = update.message.from_user.id if update.message.from_user else 0

	# 安全驗證
	if SHERLOCK_BOT_ID and sender_id != SHERLOCK_BOT_ID:
		# 如果不是 Sherlock，檢查是否是純 URL（允許任何人傳 URL 入庫）
		if text.startswith("http://") or text.startswith("https://"):
			await doFullIngest(text, update)
			return
		logger.warning(f"拒絕來自 {sender_id} 的非 URL 訊息")
		return

	# 檢查是否是純 URL
	if text.startswith("http://") or text.startswith("https://"):
		await doFullIngest(text, update)
		return

	# 解析 JSONL
	processed = 0
	for line in text.split('\n'):
		line = line.strip()
		if not line:
			continue
		try:
			obj = json.loads(line)
			if obj.get("type") == "action" and obj.get("target") in ("aria", "carrie", "all"):
				action_type = obj.get("action_type")
				payload = obj.get("payload", {})
				await dispatchAction(action_type, payload, update, context)
				processed += 1
		except json.JSONDecodeError:
			pass

	if processed == 0 and text.startswith('{'):
		await update.message.reply_text("⚠️ 未找到有效的 JSONL 指令")


async def dispatchAction(action_type: str, payload: dict, update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
	"""分發動作"""
	if action_type == "ingest_url":
		url = payload.get("url")
		if url:
			await doFullIngest(url, update)
	elif action_type == "local_scan":
		await handleLocalScan(payload, update)
	elif action_type == "run_script":
		await handleRunScript(payload, update)
	elif action_type == "alert":
		await handleAlert(payload, update)
	elif action_type == "report":
		await handleReport(payload, update)
	else:
		await update.message.reply_text(f"⚠️ 未知動作: {action_type}")


async def handleLocalScan(payload: dict, update: Update) -> None:
	path = Path(payload.get("path", str(VAULT_PATH)))
	pattern = payload.get("pattern", "*")
	await update.message.reply_text(f"🔎 掃描: {path}/{pattern}")
	try:
		files = list(path.rglob(pattern))
		result = f"✅ 找到 {len(files)} 個檔案"
		if files[:5]:
			result += "\n" + "\n".join(f"  • {f.name}" for f in files[:5])
		await update.message.reply_text(result)
	except Exception as e:
		await update.message.reply_text(f"❌ 掃描失敗: {e}")


async def handleRunScript(payload: dict, update: Update) -> None:
	script_key = payload.get("script")
	if script_key not in SCRIPT_WHITELIST:
		await update.message.reply_text(f"❌ 腳本不在白名單: {script_key}")
		return
	script_path = SCRIPT_WHITELIST[script_key]
	await update.message.reply_text(f"⚙️ 執行: {script_key}")
	try:
		if script_path.endswith(".py"):
			result = subprocess.run(["python", script_path], capture_output=True, text=True, timeout=300)
		else:
			result = subprocess.run(["powershell", "-ExecutionPolicy", "Bypass", "-File", script_path], capture_output=True, text=True, timeout=300)
		status = "✅" if result.returncode == 0 else "❌"
		await update.message.reply_text(f"{status}\n{(result.stdout + result.stderr)[:500]}")
	except Exception as e:
		await update.message.reply_text(f"❌ 執行失敗: {e}")


async def handleAlert(payload: dict, update: Update) -> None:
	level = payload.get("level", "info")
	msg = payload.get("message", "")
	emoji = {"high": "🚨", "medium": "⚠️", "low": "ℹ️"}.get(level, "📢")
	await update.message.reply_text(f"{emoji} [{level.upper()}] {msg}")


async def handleReport(payload: dict, update: Update) -> None:
	title = payload.get("title", "報告")
	content = payload.get("content", "")
	await update.message.reply_text(f"📊 {title}\n\n{content[:1000]}")


def main() -> None:
	app = Application.builder().token(TOKEN).build()
	app.add_handler(CommandHandler("start", start_command))
	app.add_handler(CommandHandler("status", status_command))
	app.add_handler(CommandHandler("ingest", ingest_command))
	app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message))
	logger.info("neovegacarrie_bot 啟動 (polling 模式)")
	logger.info(f"Vault: {VAULT_PATH}")
	logger.info(f"Ollama: {OLLAMA_CHAT_URL} / {OLLAMA_MODEL}")
	app.run_polling(allowed_updates=Update.ALL_TYPES)


if __name__ == "__main__":
	main()
