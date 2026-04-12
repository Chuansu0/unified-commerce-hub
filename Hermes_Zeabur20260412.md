# Hermes Zeabur 佈署工作計畫

**版本**: 1.0
**日期**: 2026-04-12
**狀態**: 規劃中

---

## 1. 系統架構概觀

### 1.1 整體資料流

```
用戶訊息
    ↓
neovegasherlock_bot (Hermes Agent / Zeabur)
    ↓ 分析後產出 JSONL 格式化資訊
    ↓
n8n Webhook (hermes-sherlock-dispatcher)
    ├─→ neovegaconan_bot (OpenClaw / Zeabur)  → 雲端下一步動作
    └─→ neovegaaria_bot  (Home Workstation)   → 本地下一步動作
```

### 1.2 服務清單

| 服務名稱 | 類型 | 位置 | 說明 |
|---------|------|------|------|
| Hermes Agent | GitHub 自建 Docker | Zeabur | neovegasherlock_bot 的 AI 後端 |
| Hermes WebUI | GitHub 自建 Docker | Zeabur | Hermes 管理介面 |
| OpenClaw | Prebuilt | Zeabur (現有) | neovegaconan_bot |
| N8N | Prebuilt | Zeabur (現有) | 訊息路由與分發 |
| neovegaaria_bot | Python polling | Home Workstation | 本地執行者 |

### 1.3 Bot 角色分工

| Bot | Token | 角色 | 執行位置 |
|-----|-------|------|---------|
| neovegasherlock_bot | `8505666076:AAFsPUQCBA7UVdIiw8ItBU3QHDbggI6Payg` | 偵探/分析者，產出 JSONL | Zeabur (Hermes) |
| neovegaconan_bot | `8622712926:AAFjLECd5xFxeveZAlRDmqLyFN3sXRIfpvg` | 雲端執行者 | Zeabur (OpenClaw) |
| neovegaaria_bot | `8102780828:AAEZYs0cCNBGOr4_uR-7zVeeDPlXmyF1AN4` | 本地執行者 | Home Workstation |

---

## 2. LLM 設定

| 項目 | 值 |
|------|-----|
| API Base URL | `https://opencode.ai/zen/go/v1` |
| API Key | `sk-NQXHpmDhh4SHISdAtMtFEGCcbkJjYEWKQ6xolQbPygsfcrtX6F7wBFYC9bSryTDw` |
| 模型 | `minimax-m2.7` |
| API 格式 | OpenAI-compatible |

---

## 3. JSONL 訊息格式規範

Hermes Agent (neovegasherlock_bot) 產出的結構化資訊採用 **JSONL** 格式（每行一個 JSON 物件），透過 Telegram 訊息傳遞給 n8n。

### 3.1 標準 JSONL 輸出格式

每條 Sherlock 分析結果由一或多行 JSON 組成，每行代表一個動作指令：

```jsonl
{"schema":"sherlock/v1","ts":"2026-04-12T12:00:00Z","session":"abc123","type":"analysis","summary":"偵測到異常登入行為","confidence":0.92}
{"schema":"sherlock/v1","ts":"2026-04-12T12:00:00Z","session":"abc123","type":"action","target":"conan","action_type":"alert","payload":{"level":"high","message":"異常 IP 登入：203.0.113.42","recommend":"封鎖 IP 並通知管理員"}}
{"schema":"sherlock/v1","ts":"2026-04-12T12:00:00Z","session":"abc123","type":"action","target":"aria","action_type":"local_scan","payload":{"path":"D:\\knowledge-vault","pattern":"*.log","since":"2026-04-12T00:00:00Z"}}
```

### 3.2 欄位說明

| 欄位 | 型別 | 說明 |
|------|------|------|
| `schema` | string | 固定值 `sherlock/v1` |
| `ts` | ISO8601 | 產生時間戳 |
| `session` | string | 對話 session ID |
| `type` | enum | `analysis` / `action` / `report` |
| `target` | string | 目標 bot：`conan` / `aria` / `all` |
| `action_type` | string | 動作類型（見下表） |
| `payload` | object | 動作參數 |
| `confidence` | float | 分析信心度 0.0–1.0（type=analysis 時） |

### 3.3 action_type 列表

| action_type | 目標 | 說明 |
|-------------|------|------|
| `alert` | conan/aria | 發送警報通知 |
| `local_scan` | aria | 本地檔案掃描 |
| `web_search` | conan | 雲端網路搜尋 |
| `ingest_url` | aria | 下載 URL 並入庫 |
| `run_script` | aria | 執行本地腳本 |
| `query_kb` | conan | 查詢知識庫 |
| `report` | all | 產出報告並廣播 |

---

## 4. Phase 1：Hermes Agent 佈署

### 4.1 準備 GitHub Repo

```bash
# Clone hermes-agent
git clone https://github.com/nousresearch/hermes-agent
cd hermes-agent
```

確認 repo 根目錄有 `Dockerfile`，若無則建立（見 4.2）。

### 4.2 Dockerfile（若 repo 無提供）

```dockerfile
FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

ENV PYTHONUNBUFFERED=1
EXPOSE 8080

CMD ["python", "-m", "hermes_agent"]
```

### 4.3 Zeabur 服務設定

在 Zeabur Dashboard → 現有 Project → Add Service → Git：

- **Repository**: `https://github.com/nousresearch/hermes-agent`
- **Branch**: `main`
- **Service Name**: `HermesAgent`
- **Port**: `8080` (HTTP)

### 4.4 環境變數

| 變數名稱 | 值 |
|---------|-----|
| `OPENAI_API_BASE` | `https://opencode.ai/zen/go/v1` |
| `OPENAI_API_KEY` | `sk-NQXHpmDhh4SHISdAtMtFEGCcbkJjYEWKQ6xolQbPygsfcrtX6F7wBFYC9bSryTDw` |
| `OPENAI_MODEL` | `minimax-m2.7` |
| `TELEGRAM_BOT_TOKEN` | `8505666076:AAFsPUQCBA7UVdIiw8ItBU3QHDbggI6Payg` |
| `TELEGRAM_BOT_NAME` | `neovegasherlock_bot` |
| `N8N_WEBHOOK_URL` | `https://<n8n-domain>/webhook/sherlock-output` |
| `OUTPUT_FORMAT` | `jsonl` |
| `PORT` | `8080` |

### 4.5 Volume 設定

| Volume ID | 掛載路徑 | 說明 |
|-----------|---------|------|
| `hermes-data` | `/app/data` | 對話記憶與 session 儲存 |
| `hermes-logs` | `/app/logs` | 執行日誌 |

---

## 5. Phase 2：Hermes WebUI 佈署

### 5.1 準備 GitHub Repo

```bash
git clone https://github.com/nesquena/hermes-webui
cd hermes-webui
```

### 5.2 Dockerfile（若 repo 無提供）

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json .

EXPOSE 3000
CMD ["node", "dist/server.js"]
```

### 5.3 Zeabur 服務設定

- **Repository**: `https://github.com/nesquena/hermes-webui`
- **Branch**: `main`
- **Service Name**: `HermesWebUI`
- **Port**: `3000` (HTTP)
- **Domain**: 建議設定為 `hermes.neovega.cc`

### 5.4 環境變數

| 變數名稱 | 值 |
|---------|-----|
| `HERMES_AGENT_URL` | `http://HermesAgent:8080` (Zeabur 內網) |
| `PORT` | `3000` |
| `AUTH_SECRET` | 自行產生強密碼 |

---

## 6. Phase 3：n8n Workflow — Sherlock JSONL 分發器

### 6.1 Workflow 設計：`hermes-sherlock-dispatcher`

```
[Webhook Trigger]
    POST /webhook/sherlock-output
    ↓
[Parse JSONL]
    逐行解析，過濾 type=action
    ↓
[Switch: target]
    ├─ target=conan  → [Send to Conan Bot]
    ├─ target=aria   → [Send to Aria Bot]
    └─ target=all    → [Send to Both]
```

### 6.2 Webhook Trigger 節點設定

```json
{
  "path": "sherlock-output",
  "httpMethod": "POST",
  "responseMode": "onReceived",
  "options": {
    "rawBody": true
  }
}
```

### 6.3 Parse JSONL 節點（Code Node）

```javascript
// 解析 JSONL 格式，每行一個 JSON 物件
const raw = $input.item.json.body || $input.item.json;
const text = typeof raw === 'string' ? raw : JSON.stringify(raw);

const lines = text.split('\n').filter(l => l.trim());
const actions = [];

for (const line of lines) {
	try {
		const obj = JSON.parse(line);
		// 只處理 type=action 的行
		if (obj.type === 'action' && obj.target && obj.action_type) {
			actions.push(obj);
		}
	} catch (e) {
		// 跳過無效行
	}
}

return actions.map(a => ({ json: a }));
```

### 6.4 Switch 節點（依 target 分流）

條件設定：
- `target` equals `conan` → 輸出 1
- `target` equals `aria` → 輸出 2
- `target` equals `all` → 輸出 3（同時觸發兩個分支）

### 6.5 Send to Conan Bot 節點（HTTP Request）

```
POST https://api.telegram.org/bot8622712926:AAFjLECd5xFxeveZAlRDmqLyFN3sXRIfpvg/sendMessage
Content-Type: application/json

{
  "chat_id": "{{ $json.payload.chat_id || CONAN_DEFAULT_CHAT_ID }}",
  "text": "🔍 Sherlock 指令\n動作: {{ $json.action_type }}\n\n{{ JSON.stringify($json.payload, null, 2) }}",
  "parse_mode": "HTML"
}
```

### 6.6 Send to Aria Bot 節點（HTTP Request）

```
POST https://api.telegram.org/bot8102780828:AAEZYs0cCNBGOr4_uR-7zVeeDPlXmyF1AN4/sendMessage
Content-Type: application/json

{
  "chat_id": "{{ $json.payload.chat_id || ARIA_DEFAULT_CHAT_ID }}",
  "text": "🏠 Sherlock 本地指令\n動作: {{ $json.action_type }}\n\n{{ JSON.stringify($json.payload, null, 2) }}",
  "parse_mode": "HTML"
}
```

### 6.7 n8n 環境變數

在 Zeabur N8N 服務新增：

| 變數名稱 | 值 |
|---------|-----|
| `SHERLOCK_CONAN_CHAT_ID` | neovegaconan_bot 的預設 chat_id |
| `SHERLOCK_ARIA_CHAT_ID` | neovegaaria_bot 的預設 chat_id |

---

## 7. Phase 4：neovegaaria_bot 本地接收端

### 7.1 設計原則

參考 `local_bot.py` 的設計，neovegaaria_bot 採用 **Telegram Bot API polling** 模式，在 Home Workstation 持續輪詢接收 Sherlock 發來的 JSONL 指令並執行本地動作。

### 7.2 aria_bot.py 核心邏輯

```python
#!/usr/bin/env python3
"""
neovegaaria_bot - 本地執行者
接收 Sherlock JSONL 指令，執行本地動作
"""

import os
import json
import asyncio
import logging
from telegram import Update
from telegram.ext import Application, MessageHandler, ContextTypes, filters

TOKEN = os.getenv("ARIA_BOT_TOKEN", "8102780828:AAEZYs0cCNBGOr4_uR-7zVeeDPlXmyF1AN4")
SHERLOCK_BOT_ID = 8505666076  # 只接受 Sherlock 的指令

logger = logging.getLogger(__name__)

# action_type → 處理函式映射
ACTION_HANDLERS = {
	"local_scan": handle_local_scan,
	"ingest_url": handle_ingest_url,
	"run_script": handle_run_script,
	"alert": handle_alert,
	"report": handle_report,
}

async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
	"""接收並解析 JSONL 指令"""
	text = update.message.text or ""
	sender_id = update.message.from_user.id

	# 安全驗證：只接受 Sherlock bot 的訊息
	if sender_id != SHERLOCK_BOT_ID:
		return

	# 解析 JSONL
	for line in text.strip().split('\n'):
		try:
			obj = json.loads(line)
			if obj.get("type") == "action" and obj.get("target") in ("aria", "all"):
				action_type = obj.get("action_type")
				handler = ACTION_HANDLERS.get(action_type)
				if handler:
					await handler(obj["payload"], update, context)
		except json.JSONDecodeError:
			pass

def main():
	app = Application.builder().token(TOKEN).build()
	app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message))
	logger.info("neovegaaria_bot 啟動 (polling 模式)")
	app.run_polling(allowed_updates=Update.ALL_TYPES)

if __name__ == "__main__":
	main()
```

### 7.3 本地動作實作

```python
async def handle_local_scan(payload: dict, update, context):
	"""掃描本地路徑"""
	path = payload.get("path", "D:\\knowledge-vault")
	pattern = payload.get("pattern", "*")
	# 執行掃描邏輯...
	await update.message.reply_text(f"✅ 掃描完成: {path}/{pattern}")

async def handle_ingest_url(payload: dict, update, context):
	"""下載 URL 並入庫"""
	url = payload.get("url")
	# 呼叫 trafilatura 下載並存入 raw/inbox/
	await update.message.reply_text(f"⏳ 正在入庫: {url}")

async def handle_run_script(payload: dict, update, context):
	"""執行本地 PowerShell 腳本"""
	script = payload.get("script")
	# 安全白名單驗證後執行
	await update.message.reply_text(f"🔧 執行腳本: {script}")

async def handle_alert(payload: dict, update, context):
	"""顯示警報"""
	msg = payload.get("message", "")
	level = payload.get("level", "info")
	emoji = {"high": "🚨", "medium": "⚠️", "low": "ℹ️"}.get(level, "📢")
	await update.message.reply_text(f"{emoji} 警報 [{level.upper()}]\n{msg}")

async def handle_report(payload: dict, update, context):
	"""接收報告"""
	content = payload.get("content", "")
	await update.message.reply_text(f"📊 報告\n{content}")
```

---

## 8. Phase 5：Hermes Agent 系統提示詞設定

Hermes Agent 的 system prompt 需要指示它在分析完成後輸出 JSONL 格式：

```
你是 Sherlock，一個專業的分析偵探 AI。

當你完成分析後，必須在回覆末尾附上 JSONL 格式的結構化指令，每行一個 JSON 物件。

格式規範：
- 第一行：type=analysis，包含摘要與信心度
- 後續行：type=action，指定目標 bot 與動作

目標 bot：
- conan：雲端執行者（Zeabur），適合網路搜尋、查詢、警報
- aria：本地執行者（Home Workstation），適合本地掃描、檔案入庫、腳本執行
- all：廣播給所有 bot

範例輸出：
{"schema":"sherlock/v1","ts":"<ISO8601>","session":"<id>","type":"analysis","summary":"<摘要>","confidence":0.9}
{"schema":"sherlock/v1","ts":"<ISO8601>","session":"<id>","type":"action","target":"conan","action_type":"alert","payload":{"level":"high","message":"<訊息>"}}
```

---

## 9. Zeabur project.yaml 新增片段

在現有 `project.yaml` 的 `services` 陣列中新增以下兩個服務：

### 9.1 HermesAgent 服務

```yaml
- name: HermesAgent
  icon: https://i.imgur.com/KUcP61Z.png
  template: GIT
  spec:
    source:
      git: https://github.com/nousresearch/hermes-agent
      branch: main
    ports:
      - id: web
        port: 8080
        type: HTTP
    volumes:
      - id: hermes-data
        dir: /app/data
      - id: hermes-logs
        dir: /app/logs
    env:
      OPENAI_API_BASE:
        default: https://opencode.ai/zen/go/v1
        expose: false
      OPENAI_API_KEY:
        default: sk-NQXHpmDhh4SHISdAtMtFEGCcbkJjYEWKQ6xolQbPygsfcrtX6F7wBFYC9bSryTDw
        expose: false
      OPENAI_MODEL:
        default: minimax-m2.7
        expose: false
      TELEGRAM_BOT_TOKEN:
        default: 8505666076:AAFsPUQCBA7UVdIiw8ItBU3QHDbggI6Payg
        expose: false
      N8N_WEBHOOK_URL:
        default: ${ZEABUR_WEB_URL}/webhook/sherlock-output
        expose: false
      OUTPUT_FORMAT:
        default: jsonl
        expose: false
      PORT:
        default: "8080"
        expose: false
```

### 9.2 HermesWebUI 服務

```yaml
- name: HermesWebUI
  icon: https://i.imgur.com/KUcP61Z.png
  template: GIT
  spec:
    source:
      git: https://github.com/nesquena/hermes-webui
      branch: main
    ports:
      - id: web
        port: 3000
        type: HTTP
    env:
      HERMES_AGENT_URL:
        default: http://HermesAgent:8080
        expose: false
      PORT:
        default: "3000"
        expose: false
      AUTH_SECRET:
        default: ${PASSWORD}
        expose: false
```

---

## 10. 佈署步驟清單

### Phase 1：Hermes Agent

- [ ] 確認 `nousresearch/hermes-agent` repo 的 Dockerfile 與啟動方式
- [ ] 在 Zeabur Dashboard 新增 Git 服務 `HermesAgent`
- [ ] 設定所有環境變數（見 4.4）
- [ ] 掛載 Volume：`/app/data`、`/app/logs`
- [ ] 等待 Build 完成，確認服務啟動
- [ ] 驗證 Telegram Bot polling 正常（發訊息給 neovegasherlock_bot）

### Phase 2：Hermes WebUI

- [ ] 確認 `nesquena/hermes-webui` repo 的 Dockerfile 與啟動方式
- [ ] 在 Zeabur Dashboard 新增 Git 服務 `HermesWebUI`
- [ ] 設定環境變數 `HERMES_AGENT_URL=http://HermesAgent:8080`
- [ ] 設定自訂域名（如 `hermes.neovega.cc`）
- [ ] 驗證 WebUI 可正常存取

### Phase 3：n8n Workflow

- [ ] 在 n8n 新建 Workflow：`hermes-sherlock-dispatcher`
- [ ] 新增 Webhook Trigger 節點（path: `sherlock-output`）
- [ ] 新增 Code 節點解析 JSONL
- [ ] 新增 Switch 節點依 `target` 分流
- [ ] 新增 HTTP Request 節點發送給 neovegaconan_bot
- [ ] 新增 HTTP Request 節點發送給 neovegaaria_bot
- [ ] 啟用 Workflow
- [ ] 記錄 Webhook URL，填入 HermesAgent 的 `N8N_WEBHOOK_URL` 環境變數

### Phase 4：neovegaaria_bot 本地端

- [ ] 在 Home Workstation 建立 `aria_bot.py`（參考 7.2 設計）
- [ ] 安裝依賴：`pip install python-telegram-bot aiohttp trafilatura`
- [ ] 設定環境變數 `ARIA_BOT_TOKEN`
- [ ] 啟動 bot：`python aria_bot.py`
- [ ] 驗證能接收 Sherlock 發來的 JSONL 指令

### Phase 5：端對端測試

- [ ] 發訊息給 neovegasherlock_bot，觸發分析
- [ ] 確認 Hermes Agent 產出 JSONL 並 POST 到 n8n webhook
- [ ] 確認 n8n 正確解析並分流
- [ ] 確認 neovegaconan_bot 收到 `target=conan` 的指令
- [ ] 確認 neovegaaria_bot 收到 `target=aria` 的指令
- [ ] 確認 `target=all` 時兩個 bot 都收到

---

## 11. 安全性注意事項

1. **API Key 保護**：`OPENAI_API_KEY` 設定為 `expose: false`，不對外暴露
2. **Bot Token 保護**：所有 Telegram Bot Token 設定為 `expose: false`
3. **Aria Bot 安全驗證**：只接受來自 neovegasherlock_bot (ID: 8505666076) 的指令
4. **Script 白名單**：`run_script` 動作需維護允許執行的腳本白名單
5. **JSONL 驗證**：解析前驗證 `schema` 欄位為 `sherlock/v1`

---

## 12. 監控與除錯

### 12.1 Hermes Agent 日誌

```bash
# Zeabur Dashboard → HermesAgent → Logs
# 或透過 Zeabur CLI
zeabur logs HermesAgent --follow
```

### 12.2 n8n Workflow 執行記錄

1. 開啟 n8n → Executions
2. 篩選 `hermes-sherlock-dispatcher`
3. 查看每次執行的輸入/輸出

### 12.3 測試 Webhook

```powershell
# 測試 n8n webhook 是否正常接收 JSONL
$body = @'
{"schema":"sherlock/v1","ts":"2026-04-12T12:00:00Z","session":"test001","type":"analysis","summary":"測試分析","confidence":0.99}
{"schema":"sherlock/v1","ts":"2026-04-12T12:00:00Z","session":"test001","type":"action","target":"conan","action_type":"alert","payload":{"level":"low","message":"這是測試訊息"}}
'@

Invoke-RestMethod -Uri "https://<n8n-domain>/webhook/sherlock-output" `
	-Method POST `
	-Body $body `
	-ContentType "text/plain"
```

### 12.4 常見問題

| 問題 | 原因 | 解決方式 |
|------|------|---------|
| Hermes Agent Build 失敗 | Dockerfile 不存在或依賴問題 | 手動建立 Dockerfile，確認 requirements.txt |
| Telegram Bot 無回應 | Token 錯誤或 polling 衝突 | 確認 Token，確保只有一個 polling 實例 |
| n8n webhook 收不到資料 | URL 設定錯誤 | 確認 `N8N_WEBHOOK_URL` 環境變數 |
| JSONL 解析失敗 | 格式不符 | 檢查 Hermes Agent 的 system prompt |
| Aria bot 不執行指令 | sender_id 驗證失敗 | 確認 `SHERLOCK_BOT_ID` 設定正確 |

---

## 13. 後續擴展方向

1. **雙向回報**：conan/aria 執行完動作後，回報結果給 Sherlock 做後續分析
2. **記憶持久化**：Hermes Agent 的對話記憶存入 PostgreSQL（現有 Zeabur 服務）
3. **WebUI 整合**：在 Hermes WebUI 中顯示 JSONL 指令執行歷史
4. **多模型支援**：在 WebUI 中切換不同 LLM 模型
5. **Conan 回調**：neovegaconan_bot 執行完 OpenClaw 任務後，透過 n8n 回傳結果給 Sherlock

---

**文件版本**: 1.0
**最後更新**: 2026-04-12
**負責人**: neovega
