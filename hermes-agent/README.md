# Hermes Agent - neovegasherlock_bot 本地部署指南

> 本地執行於 Home Workstation，使用 kimi-k2.5 模型

---

## 系統需求

- Windows 10/11 或 WSL2 Ubuntu
- Python 3.10+
- 網路連線（連接 opencode.ai API）

---

## 安裝步驟

### 1. 安裝 Python 依賴

```bash
cd d:\WSL\unified-commerce-hub\hermes-agent
pip install -r requirements.txt
```

### 2. 設定環境變數

在 PowerShell 中：

```powershell
$env:TELEGRAM_BOT_TOKEN="8505666076:AAFsPUQCBA7UVdIiw8ItBU3QHDbggI6Payg"
$env:OPENAI_API_KEY="sk-NQXHpmDhh4SHISdAtMtFEGCcbkJjYEWKQ6xolQbPygsfcrtX6F7wBFYC9bSryTDw"
$env:OPENAI_API_BASE="https://opencode.ai/zen/go/v1"
$env:OPENAI_MODEL="kimi-k2.5"
$env:N8N_WEBHOOK_URL="https://n8n.neovega.cc/webhook/sherlock-output"
```

或在 `.env` 檔案中：

```
TELEGRAM_BOT_TOKEN=8505666076:AAFsPUQCBA7UVdIiw8ItBU3QHDbggI6Payg
OPENAI_API_KEY=sk-NQXHpmDhh4SHISdAtMtFEGCcbkJjYEWKQ6xolQbPygsfcrtX6F7wBFYC9bSryTDw
OPENAI_API_BASE=https://opencode.ai/zen/go/v1
OPENAI_MODEL=kimi-k2.5
N8N_WEBHOOK_URL=https://n8n.neovega.cc/webhook/sherlock-output
```

### 3. 啟動 Hermes Agent (Sherlock)

```bash
python -m hermes_agent
```

---

## 啟動 Carrie Bot（本地執行者）

在另一個終端機：

```bash
cd d:\WSL\unified-commerce-hub\hermes-agent
python carrie_bot.py
```

---

## 驗證運作

1. 在 Telegram 發送訊息給 @neovegasherlock_bot
2. Sherlock 會分析並產出 JSONL
3. JSONL 會發送到 n8n webhook
4. n8n 會根據 target 分流給 Conan (Zeabur) 或 Carrie (本地)
5. Carrie Bot 會執行本地動作

---

## 檔案說明

| 檔案 | 用途 |
|------|------|
| `hermes_agent/__main__.py` | Sherlock 主程式 (AI 分析) |
| `carrie_bot.py` | Carrie 本地執行者 |
| `Dockerfile` | Zeabur 部署用 |
| `requirements.txt` | Python 依賴 |
