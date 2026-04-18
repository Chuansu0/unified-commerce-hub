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
from aiohttp import web
from telegram import Update, Bot
from telegram.ext import Application, MessageHandler, CommandHandler, ContextTypes, filters

# ── 平台偵測 ──
import platform
IS_WSL = platform.system() != "Windows"

# ── 設定 ──
TOKEN = os.getenv("CARRIE_BOT_TOKEN", "8615424711:AAGLoHijlMpqWX7yD_JhJjKeTS0Dd5H5GTg")
_vaults_base_raw = os.getenv("VAULTS_BASE", "D:\\vaults")
# WSL 自動轉換：D:\vaults → /mnt/d/vaults
if IS_WSL and len(_vaults_base_raw) >= 2 and _vaults_base_raw[1] in (":", "\\"):
	_drive = _vaults_base_raw[0].lower()
	_rest = _vaults_base_raw[2:].replace("\\", "/")
	VAULTS_BASE = Path(f"/mnt/{_drive}{_rest}")
else:
	VAULTS_BASE = Path(_vaults_base_raw)
DEFAULT_VAULT_ID = os.getenv("DEFAULT_VAULT_ID", "rnd")
VAULT_PATH = VAULTS_BASE / f"{DEFAULT_VAULT_ID}-vault"
RAW_INBOX = VAULT_PATH / "raw" / "inbox"
WIKI_SOURCES = VAULT_PATH / "wiki" / "sources"
EMBED_DIR = VAULT_PATH / "embeddings"

# Vault 路徑對照表（啟動時從 registry 載入）
VAULT_MAP = {}


def winPathToLocal(p: str) -> Path:
	"""將 Windows 路徑轉換為當前平台路徑（WSL 自動轉 /mnt/d/...）"""
	import platform
	if platform.system() != "Windows" and len(p) >= 2 and p[1] in (":", "/"):
		# WSL: D:/vaults/xxx → /mnt/d/vaults/xxx
		drive = p[0].lower()
		rest = p[2:].replace("\\", "/")
		return Path(f"/mnt/{drive}{rest}")
	return Path(p)


def loadVaultMap():
	"""從 VAULT_REGISTRY.json 載入 vault 路徑對照（自動處理 Windows/WSL 路徑）"""
	global VAULT_MAP
	registry_path = VAULTS_BASE / "meta-vault" / "schema" / "VAULT_REGISTRY.json"
	if registry_path.exists():
		try:
			data = json.loads(registry_path.read_text(encoding="utf-8"))
			for v in data.get("vaults", []):
				VAULT_MAP[v["id"]] = winPathToLocal(v["path"])
			logger.info(f"已載入 {len(VAULT_MAP)} 個 vault: {list(VAULT_MAP.keys())}")
			if VAULT_MAP:
				sample = next(iter(VAULT_MAP.values()))
				logger.info(f"路徑範例: {sample} (exists={sample.exists()})")
		except Exception as e:
			logger.error(f"載入 vault registry 失敗: {e}")
	# 確保預設 vault 存在
	if DEFAULT_VAULT_ID not in VAULT_MAP:
		VAULT_MAP[DEFAULT_VAULT_ID] = VAULT_PATH


def getVaultPath(vault_id: str) -> Path:
	"""取得指定 vault 的路徑，不存在則回傳預設"""
	return VAULT_MAP.get(vault_id, VAULT_MAP.get(DEFAULT_VAULT_ID, VAULT_PATH))

# Chat: llama-server (port 8080), Embedding: Ollama (port 11434)
OLLAMA_CHAT_URL = "http://127.0.0.1:8080/v1/chat/completions"
OLLAMA_EMBED_URL = "http://127.0.0.1:11434/api/embeddings"
OLLAMA_MODEL = "qwen-big-tools"
EMBED_MODEL = "nomic-embed-text"

# Sherlock bot 的 user ID（token 冒號前的數字）
# 用於在群組中過濾：只處理 Sherlock 發的 JSONL
SHERLOCK_BOT_ID = int(os.getenv("SHERLOCK_BOT_ID", "8505666076"))

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
async def doFullIngestToVault(url: str, vault_id: str, update: Update) -> dict:
	"""多 vault 版 ingest：根據 vault_id 切換目標 vault"""
	target_vault = getVaultPath(vault_id)
	vault_name = vault_id
	for v_id, v_path in VAULT_MAP.items():
		if v_id == vault_id:
			vault_name = v_id
			break

	msg = await update.message.reply_text(
		f"⏳ 開始入庫: {url}\n📂 目標 vault: {vault_name} ({target_vault})"
	)

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
		raw_inbox = target_vault / "raw" / "inbox"
		raw_path = raw_inbox / f"{sha}.md"

		if raw_path.exists():
			await msg.edit_text(f"ℹ️ 已存在: {raw_path.name} (vault: {vault_name})")
			return {"status": "already_exists", "path": str(raw_path)}

		# 3. 儲存原始內容
		raw_inbox.mkdir(parents=True, exist_ok=True)
		raw_content = f"---\ntitle: \"{title}\"\nsource: \"{url}\"\ndate: \"{datetime.now().isoformat()}\"\nsha: \"{sha}\"\nvault: \"{vault_id}\"\n---\n\n# {title}\n\n{text}"
		raw_path.write_text(raw_content, encoding="utf-8")

		await msg.edit_text(f"📥 已下載到 {vault_name}/raw/inbox/{sha}.md\n⏳ LLM 產生摘要中...")

		# 4. LLM 產生摘要頁
		summary = await callOllamaSummarize(text, url, title, sha)

		# 5. 寫入 wiki/sources/
		wiki_sources = target_vault / "wiki" / "sources"
		wiki_sources.mkdir(parents=True, exist_ok=True)
		ts = datetime.now().strftime("%Y%m%d_%H%M%S")
		wiki_path = wiki_sources / f"{ts}_{sha}.md"
		wiki_path.write_text(summary, encoding="utf-8")

		await msg.edit_text(f"📝 摘要已寫入 {vault_name}/wiki/sources/\n⏳ 建立 embedding...")

		# 6. 建立 embedding（使用目標 vault 的 embeddings/）
		embed_dir = target_vault / "embeddings"
		embed_ok = await addEmbeddingToVault(wiki_path, summary, embed_dir)

		# 7. 更新 log.md
		log_path = target_vault / "wiki" / "log.md"
		log_entry = f"- {datetime.now().isoformat()} ingest {url} {wiki_path.name}\n"
		with open(log_path, "a", encoding="utf-8") as lf:
			lf.write(log_entry)

		embed_status = "✅" if embed_ok else "⚠️"
		await msg.edit_text(
			f"✅ 入庫完成！\n\n"
			f"📂 Vault: {vault_name}\n"
			f" 原始: raw/inbox/{sha}.md\n"
			f"📝 摘要: wiki/sources/{wiki_path.name}\n"
			f"🔢 Embedding: {embed_status}\n"
			f"📖 標題: {title}"
		)

		return {"status": "ok", "vault": vault_id, "raw": str(raw_path), "wiki": str(wiki_path)}

	except Exception as e:
		logger.error(f"Ingest 失敗: {e}")
		await msg.edit_text(f"❌ 入庫失敗: {e}")
		return {"error": str(e)}


async def addEmbeddingToVault(wiki_path: Path, text: str, embed_dir: Path) -> bool:
	"""為單一文件新增 embedding 到指定 vault 的 FAISS 索引"""
	try:
		import faiss
		import numpy as np

		async with httpx.AsyncClient(timeout=30.0) as client:
			r = await client.post(
				OLLAMA_EMBED_URL,
				json={"model": EMBED_MODEL, "prompt": text[:2000]}
			)
			vec = r.json().get("embedding")
			if not vec:
				return False

		embed_dir.mkdir(parents=True, exist_ok=True)
		index_path = embed_dir / "index.faiss"
		meta_path = embed_dir / "metadata.json"

		if index_path.exists() and meta_path.exists():
			index = faiss.read_index(str(index_path))
			meta = json.loads(meta_path.read_text(encoding="utf-8"))
		else:
			dim = len(vec)
			index = faiss.IndexFlatL2(dim)
			meta = []

		index.add(np.array([vec], dtype="float32"))
		meta.append({"path": str(wiki_path), "title": wiki_path.stem, "size": len(text)})

		faiss.write_index(index, str(index_path))
		with open(meta_path, "w", encoding="utf-8") as mf:
			json.dump(meta, mf, ensure_ascii=False, indent=2)

		return True
	except Exception as e:
		logger.error(f"Embedding 失敗: {e}")
		return False


async def doFullIngest(url: str, update: Update) -> dict:
	"""預設 vault 的 ingest（向後相容）"""
	return await doFullIngestToVault(url, DEFAULT_VAULT_ID, update)


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


# 使用者 chat_id（私聊時允許直接操作）
OWNER_CHAT_ID = int(os.getenv("OWNER_CHAT_ID", "8240891231"))


# ── JSONL 訊息處理 ──
async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
	"""接收並解析 JSONL 指令或純 URL
	
	支援兩種場景：
	1. 群組：只處理 Sherlock bot 發的 JSONL（透過 from_user.id 過濾）
	2. 私聊：允許 owner 直接傳 URL 或 JSONL
	"""
	if not update.message or not update.message.text:
		return

	text = update.message.text.strip()
	sender_id = update.message.from_user.id if update.message.from_user else 0
	chat_type = update.message.chat.type  # "private", "group", "supergroup"
	is_group = chat_type in ("group", "supergroup")

	logger.info(f"收到訊息: chat_type={chat_type}, sender={sender_id}, text={text[:80]}...")

	if is_group:
		# ── 群組模式：只處理 Sherlock 發的 JSONL ──
		if sender_id != SHERLOCK_BOT_ID:
			logger.debug(f"群組中忽略非 Sherlock 訊息 (from {sender_id})")
			return
		# Sherlock 發的，解析 JSONL
		await parseAndDispatchJsonl(text, update, context)
	else:
		# ── 私聊模式：允許 owner 直接操作 ──
		# 純 URL → 直接入庫到預設 vault
		if text.startswith("http://") or text.startswith("https://"):
			await doFullIngest(text, update)
			return

		# JSONL → 解析並執行
		if text.startswith('{'):
			await parseAndDispatchJsonl(text, update, context)
			return

		# 其他文字：忽略（避免回應無關訊息）
		logger.info(f"私聊中忽略非指令訊息: {text[:50]}")


async def parseAndDispatchJsonl(text: str, update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
	"""解析 JSONL 文字並分發動作"""
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
				logger.info(f"📋 JSONL 動作: {action_type}, vault={payload.get('vault', 'N/A')}")
				await dispatchAction(action_type, payload, update, context)
				processed += 1
		except json.JSONDecodeError:
			pass

	if processed == 0 and text.startswith('{'):
		await update.message.reply_text("⚠️ 未找到有效的 JSONL 指令")
	elif processed > 0:
		logger.info(f"✅ 已處理 {processed} 個 JSONL 動作")


async def dispatchAction(action_type: str, payload: dict, update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
	"""分發動作（支援多 vault 路由）"""
	if action_type == "ingest_url":
		url = payload.get("url")
		vault_id = payload.get("vault", DEFAULT_VAULT_ID)
		if url:
			await doFullIngestToVault(url, vault_id, update)
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


# ── Webhook 無 Update 版 ingest（供 HTTP webhook 呼叫）──
async def webhookIngestToVault(url: str, vault_id: str, bot: Bot, chat_id: int) -> dict:
	"""HTTP webhook 觸發的 ingest，不依賴 Telegram Update 物件"""
	target_vault = getVaultPath(vault_id)
	logger.info(f"🌐 Webhook ingest: {url} → {vault_id} ({target_vault})")

	try:
		await bot.send_message(chat_id, f"⏳ [webhook] 開始入庫: {url}\n📂 目標 vault: {vault_id}")
	except Exception:
		pass  # 通知失敗不影響 ingest

	try:
		# 1. 下載
		downloaded = trafilatura.fetch_url(url)
		if not downloaded:
			try:
				await bot.send_message(chat_id, f"❌ [webhook] 無法下載: {url}\n（可能被目標網站擋住 403）")
			except Exception:
				pass
			return {"error": "download_failed", "url": url}

		text = trafilatura.extract(downloaded, include_tables=True)
		metadata = trafilatura.extract_metadata(downloaded)
		title = metadata.title if metadata and metadata.title else "Untitled"

		if not text or len(text.strip()) < 20:
			try:
				await bot.send_message(chat_id, f"❌ [webhook] 內容太短或無法擷取: {url}")
			except Exception:
				pass
			return {"error": "extract_failed", "url": url}

		# 2. SHA256 去重
		sha = hashlib.sha256(text.encode()).hexdigest()[:12]
		raw_inbox = target_vault / "raw" / "inbox"
		raw_path = raw_inbox / f"{sha}.md"

		if raw_path.exists():
			return {"status": "already_exists", "path": str(raw_path)}

		# 3. 儲存原始內容
		raw_inbox.mkdir(parents=True, exist_ok=True)
		raw_content = (
			f"---\ntitle: \"{title}\"\nsource: \"{url}\"\n"
			f"date: \"{datetime.now().isoformat()}\"\nsha: \"{sha}\"\n"
			f"vault: \"{vault_id}\"\n---\n\n# {title}\n\n{text}"
		)
		raw_path.write_text(raw_content, encoding="utf-8")

		# 4. LLM 摘要
		summary = await callOllamaSummarize(text, url, title, sha)

		# 5. wiki/sources/
		wiki_sources = target_vault / "wiki" / "sources"
		wiki_sources.mkdir(parents=True, exist_ok=True)
		ts = datetime.now().strftime("%Y%m%d_%H%M%S")
		wiki_path = wiki_sources / f"{ts}_{sha}.md"
		wiki_path.write_text(summary, encoding="utf-8")

		# 6. embedding
		embed_dir = target_vault / "embeddings"
		embed_ok = await addEmbeddingToVault(wiki_path, summary, embed_dir)

		# 7. log
		log_path = target_vault / "wiki" / "log.md"
		log_entry = f"- {datetime.now().isoformat()} ingest {url} {wiki_path.name}\n"
		with open(log_path, "a", encoding="utf-8") as lf:
			lf.write(log_entry)

		# 通知使用者
		try:
			embed_status = "✅" if embed_ok else "⚠️"
			await bot.send_message(
				chat_id,
				f"✅ [webhook] 入庫完成！\n📂 Vault: {vault_id}\n"
				f"📖 {title}\n🔢 Embedding: {embed_status}"
			)
		except Exception:
			pass

		return {"status": "ok", "vault": vault_id, "raw": str(raw_path), "wiki": str(wiki_path), "title": title}

	except Exception as e:
		logger.error(f"Webhook ingest 失敗: {e}")
		return {"error": str(e)}


async def webhookDispatchAction(action_type: str, payload: dict, bot: Bot, chat_id: int) -> dict:
	"""HTTP webhook 觸發的動作分發"""
	if action_type == "ingest_url":
		url = payload.get("url")
		vault_id = payload.get("vault", DEFAULT_VAULT_ID)
		if url:
			return await webhookIngestToVault(url, vault_id, bot, chat_id)
		return {"error": "missing_url"}
	elif action_type == "alert":
		level = payload.get("level", "info")
		msg_text = payload.get("message", "")
		emoji = {"high": "🚨", "medium": "⚠️", "low": "ℹ️"}.get(level, "📢")
		try:
			await bot.send_message(chat_id, f"{emoji} [{level.upper()}] {msg_text}")
		except Exception:
			pass
		return {"status": "ok", "action": "alert"}
	else:
		return {"status": "ok", "action": action_type, "note": "not_implemented_via_webhook"}


# ── HTTP Webhook Server ──
WEBHOOK_PORT = int(os.getenv("CARRIE_WEBHOOK_PORT", "18800"))
WEBHOOK_SECRET = os.getenv("CARRIE_WEBHOOK_SECRET", "hermes-carrie-2026")


async def webhookDispatchHandler(request):
	"""POST /webhook/dispatch — 接收 Sherlock 或 n8n 的 JSONL"""
	# 簡易驗證
	auth = request.headers.get("X-Webhook-Secret", "")
	if auth != WEBHOOK_SECRET:
		return web.json_response({"error": "unauthorized"}, status=401)

	try:
		body = await request.text()
		logger.info(f"🌐 Webhook 收到: {body[:200]}...")
	except Exception as e:
		return web.json_response({"error": f"read_body: {e}"}, status=400)

	bot = Bot(token=TOKEN)
	results = []

	for line in body.strip().split('\n'):
		line = line.strip()
		if not line:
			continue
		try:
			obj = json.loads(line)
			if obj.get("type") == "action" and obj.get("target") in ("aria", "carrie", "all"):
				action_type = obj.get("action_type")
				payload = obj.get("payload", {})
				logger.info(f"📋 Webhook JSONL: {action_type}, vault={payload.get('vault', 'N/A')}")
				result = await webhookDispatchAction(action_type, payload, bot, OWNER_CHAT_ID)
				results.append(result)
		except json.JSONDecodeError:
			pass

	return web.json_response({"processed": len(results), "results": results})


async def webhookHealthHandler(request):
	"""GET /health — 健康檢查"""
	return web.json_response({
		"status": "ok",
		"service": "carrie-bot",
		"vaults": list(VAULT_MAP.keys()),
		"timestamp": datetime.now().isoformat(),
	})


async def startWebhookServer():
	"""啟動 HTTP webhook server"""
	app = web.Application()
	app.router.add_post("/webhook/dispatch", webhookDispatchHandler)
	app.router.add_get("/health", webhookHealthHandler)

	runner = web.AppRunner(app)
	await runner.setup()
	site = web.TCPSite(runner, "0.0.0.0", WEBHOOK_PORT)
	await site.start()
	logger.info(f"🌐 Webhook server 已啟動: http://0.0.0.0:{WEBHOOK_PORT}")
	logger.info(f"   POST /webhook/dispatch — 接收 JSONL")
	logger.info(f"   GET  /health — 健康檢查")


# ── Sherlock 離線佇列拉取 ──
SHERLOCK_API_URL = os.getenv("SHERLOCK_API_URL", "https://neovegahermes.zeabur.app")


async def drainSherlockQueue():
	"""啟動時從 Sherlock 的離線佇列拉取待處理的 JSONL"""
	drain_url = f"{SHERLOCK_API_URL}/api/queue/drain"
	try:
		async with httpx.AsyncClient(timeout=15.0) as client:
			r = await client.post(
				drain_url,
				headers={"X-Webhook-Secret": WEBHOOK_SECRET},
			)
			if r.status_code != 200:
				logger.warning(f"佇列拉取失敗: HTTP {r.status_code}")
				return 0

			data = r.json()
			items = data.get("items", [])
			if not items:
				logger.info("📦 Sherlock 佇列為空，無待處理項目")
				return 0

			logger.info(f"📦 從 Sherlock 佇列拉取 {len(items)} 筆待處理")
			bot = Bot(token=TOKEN)
			processed = 0

			for item in items:
				jsonl_text = item.get("jsonl", "")
				session_id = item.get("session_id", "unknown")
				for line in jsonl_text.strip().split('\n'):
					line = line.strip()
					if not line:
						continue
					try:
						obj = json.loads(line)
						if obj.get("type") == "action" and obj.get("target") in ("aria", "carrie", "all"):
							action_type = obj.get("action_type")
							payload = obj.get("payload", {})
							logger.info(f"📦 佇列回放: {action_type} (session={session_id})")
							await webhookDispatchAction(action_type, payload, bot, OWNER_CHAT_ID)
							processed += 1
					except json.JSONDecodeError:
						pass

			logger.info(f"✅ 佇列回放完成: {processed} 個動作")
			try:
				await bot.send_message(
					OWNER_CHAT_ID,
					f"📦 已從 Sherlock 佇列回放 {processed} 個離線動作"
				)
			except Exception:
				pass
			return processed

	except Exception as e:
		logger.warning(f"佇列拉取異常: {e}")
		return 0


# ── 主程式（非同步版）──
async def main_async() -> None:
	"""非同步主程式：同時啟動 webhook server + Telegram polling"""
	loadVaultMap()

	logger.info("neovegacarrie_bot 啟動")
	logger.info(f"預設 Vault: {VAULT_PATH}")
	logger.info(f"已載入 Vault: {list(VAULT_MAP.keys())}")
	logger.info(f"Ollama: {OLLAMA_CHAT_URL} / {OLLAMA_MODEL}")

	# 啟動 webhook server
	await startWebhookServer()

	# 拉取 Sherlock 離線佇列
	await drainSherlockQueue()

	# 建立 Telegram bot
	app = Application.builder().token(TOKEN).build()
	app.add_handler(CommandHandler("start", start_command))
	app.add_handler(CommandHandler("status", status_command))
	app.add_handler(CommandHandler("ingest", ingest_command))
	app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message))

	# 啟動 Telegram polling
	await app.initialize()
	await app.start()
	logger.info("🤖 Telegram polling 已啟動")
	logger.info("📱 私聊：直接傳 URL 入庫")
	logger.info(f"🌐 Webhook：http://0.0.0.0:{WEBHOOK_PORT}/webhook/dispatch")
	await app.updater.start_polling(allowed_updates=Update.ALL_TYPES)

	# 保持運行
	try:
		await asyncio.Event().wait()
	except (KeyboardInterrupt, SystemExit):
		logger.info("正在關閉...")
	finally:
		await app.updater.stop()
		await app.stop()
		await app.shutdown()


def main() -> None:
	asyncio.run(main_async())


if __name__ == "__main__":
	main()
