# Hermes Agent (neovegasherlock_bot) Zeabur 部署指南

> 日期: 2026-04-13
> 目標: 在 Zeabur unified-commerce-hub 專案部署 Hermes Agent

---

## 情況確認

從您的 Zeabur Dashboard 截圖可見，目前的服務有：
- Worker
- Runners
- N8N
- Redis
- PostgreSQL
- OpenClaw
- unified-commerce-hub
- openclaw-http-bridge
- PocketBase
- ghcrlonesquenaherm... (可能是 HermesWebUI)

**缺少：HermesAgent 服務**

---

## 部署方式一：透過 Zeabur Dashboard 手動新增 (推薦)

### 步驟 1: 新增 Git 服務

1. 登入 Zeabur Dashboard: https://dash.zeabur.com
2. 選擇 **unified-commerce-hub** 專案
3. 點擊左側 **"新建服務"**
4. 選擇 **"從原始碼部署"** → **Git**
5. 填入以下資訊：

| 欄位 | 值 |
|------|-----|
| **Repository URL** | `https://github.com/nousresearch/hermes-agent` |
| **分支** | `main` |
| **服務名稱** | `HermesAgent` |

6. 點擊 **部署**

### 步驟 2: 設定環境變數

服務建立後，進入 **HermesAgent → 環境變數** 標籤，新增：

```
OPENAI_API_KEY=sk-NQXHpmDhh4SHISdAtMtFEGCcbkJjYEWKQ6xolQbPygsfcrtX6F7wBFYC9bSryTDw
OPENAI_BASE_URL=https://opencode.ai/zen/go/v1
OPENAI_MODEL=kimi-k2.5
TELEGRAM_BOT_TOKEN=8505666076:AAFsPUQCBA7UVdIiw8ItBU3QHDbggI6Payg
N8N_WEBHOOK_URL=https://n8n.neovega.cc/webhook/sherlock-output
```

### 步驟 3: 設定域名

進入 **網路** 標籤，設定：
- **網域**: `hermes.neovega.cc`

---

## 部署方式二：使用本地建立的版本

如果您想使用我們剛剛在 `hermes-agent/` 目錄中建立的版本：

### 步驟 1: 推送程式碼到 GitHub

```bash
cd d:\WSL\unified-commerce-hub\hermes-agent

# 初始化 git (如果還沒有)
git init

# 添加檔案
git add .

# 提交
git commit -m "Initial Hermes Agent setup with kimi-k2.5"

# 推送到 GitHub (需要先建立 repo)
git remote add origin https://github.com/YOUR_USERNAME/hermes-agent.git
git push -u origin main
```

### 步驟 2: 在 Zeabur 部署

1. Zeabur Dashboard → 新建服務 → 從原始碼部署 → Git
2. 填入您的 GitHub repo URL
3. 服務名稱: `HermesAgent`
4. 部署

---

## 部署方式三：更新現有 project.yaml 並重新部署

如果 Zeabur 支援從 project.yaml 重新部署：

1. 確保 project.yaml 中的 HermesAgent 定義正確
2. 在 Zeabur Dashboard 尋找 "重新部署" 或 "套用設定" 選項
3. 或者刪除專案後重新從 project.yaml 建立（**注意：會刪除所有資料**）

---

## 驗證部署

部署完成後：

1. **檢查日誌**: Zeabur Dashboard → HermesAgent → Logs
   - 應該看到 "neovegasherlock_bot (Hermes Agent) 啟動"

2. **測試 Bot**: 在 Telegram 發送訊息給 @neovegasherlock_bot
   - 應該收到回應並產出 JSONL

3. **檢查 n8n**: 查看 n8n.neovega.cc 的 webhook 是否收到請求

---

## 故障排除

### 問題 1: Build 失敗

**原因**: Dockerfile 或依賴問題

**解決**:
```bash
# 確保 hermes-agent/ 目錄有:
# - Dockerfile
# - requirements.txt
# - hermes_agent/__init__.py
# - hermes_agent/__main__.py
```

### 問題 2: Bot 無回應

**原因**: Telegram Bot Token 錯誤或有其他服務使用相同 token

**解決**:
1. 檢查環境變數 `TELEGRAM_BOT_TOKEN` 是否正確
2. 確保只有一個服務使用此 token

### 問題 3: 無法連接到 n8n

**原因**: n8n webhook URL 錯誤

**解決**:
1. 確認 `N8N_WEBHOOK_URL` 設定為 `https://n8n.neovega.cc/webhook/sherlock-output`
2. 在 n8n 建立對應的 webhook

---

## 相關檔案

本地已建立的檔案：
- `hermes-agent/Dockerfile`
- `hermes-agent/requirements.txt`
- `hermes-agent/hermes_agent/__init__.py`
- `hermes-agent/hermes_agent/__main__.py`
- `hermes-agent/carrie_bot.py` (本地執行者)
- `hermes-agent/hermes-config.yaml`

---

**建議**: 使用方式一部署，最快最簡單。
