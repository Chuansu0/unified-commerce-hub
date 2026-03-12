# n8n Webhook 整合設定指南

## 概述

此整合讓 WebChat 訊息透過 n8n 處理並轉發到 Telegram，同時將 Telegram Agent 回覆同步回 WebChat。

## Phase 1: 設定 n8n Workflow

### 1.1 匯入 WebChat Inbound Workflow

1. 登入 n8n (https://neovegan8n.zeabur.app)
2. 前往 Settings → API，建立 API Key（記得複製保存）
3. 建立新 Workflow，名稱為 "WebChat Inbound Handler"
4. 匯入檔案：`n8n/webchat-inbound-workflow.json`

### 1.2 設定 Telegram Credential

在 n8n 中設定 Telegram Bot Credential：
- Name: `telegram-bot-credential`
- Bot Token: `8751641141:AAGeQKXV4WvOguP4H5UpUWegVcq2obdzIVw`

### 1.3 啟動 Workflow

點擊 "Active" 切換開關啟動 workflow。

Webhook URL 將為：`https://www.neovega.cc/api/webhook/chat-inbound`

### 1.4 匯入 Telegram Reply Handler

1. 建立新 Workflow，名稱為 "Telegram Reply Handler"
2. 匯入檔案：`n8n/telegram-reply-workflow.json`
3. 啟動 workflow

## Phase 2: 部署到 Zeabur

### 2.1 設定環境變數

在 Zeabur Dashboard 中設定以下環境變數：

**OpenClaw 服務：**
- `N8N_API_KEY` = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
- `N8N_API_URL` = `http://n8n.zeabur.internal:5678`

**主應用 (unified-commerce-hub)：**
- `VITE_USE_N8N` = `true`

### 2.2 部署更新

```bash
git push origin main
```

或前往 Zeabur Dashboard → 重新部署服務

## 設定 n8n API Key

您提供的 API Key:
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJiMTU0ZWY0Yy1jNmYzLTQ4ZmYtYWJjYS02OWRhMDJkZGE5NzgiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzczMzA1NzE1fQ.LnCHZTLooG5CK6ov8nZcJXpFG0Isobj6L472P3da8sA
```

此 Key 用於：
1. OpenClaw Skill 呼叫 n8n API
2. telegram-webhook 轉發訊息到 n8n

## Phase 3: 測試驗證

### 3.1 測試 WebChat → Telegram

```bash
curl -X POST https://www.neovega.cc/api/webhook/chat-inbound \
  -H "Content-Type: application/json" \
  -d '{"sessionId":"test-123","message":"n8n測試","platform":"webchat"}'
```

預期結果：
- 收到 success: true 回應
- Telegram 群組收到訊息
- PocketBase messages 集合新增記錄

### 3.2 測試 Telegram → WebChat

在 Telegram 群組中回覆 webchat 訊息，檢查是否同步到 WebChat UI。

## 完整流程驗證

| 步驟 | 動作 | 預期結果 |
|------|------|----------|
| 1 | WebChat 發訊息 | Telegram 群組收到 |
| 2 | Agent 在 Telegram 回覆 | WebChat 顯示回覆 |
| 3 | 檢查 PocketBase | messages 集合有雙向記錄 |

## 故障排除

### Webhook 無法觸發

1. 檢查 nginx.conf 是否正確部署
2. 檢查 n8n workflow 是否為 Active 狀態
3. 檢查 Zeabur 服務名稱解析：
   ```bash
   curl http://n8n.zeabur.internal:5678/health
   ```

### Telegram 訊息未發送

1. 檢查 credential 是否正確設定
2. 檢查 chatId 是否正確
3. 檢查 n8n 日誌

## 環境變數參考

| 變數 | 說明 | 預設值 |
|------|------|--------|
| VITE_USE_N8N | 是否啟用 n8n 模式 | false |
| TELEGRAM_BOT_TOKEN | Telegram Bot Token | - |
| N8N_API_KEY | n8n API Key（OpenClaw 使用）| - |
