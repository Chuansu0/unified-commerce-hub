# Webhook Bridge 部署檢查清單

## 📋 部署前準備

### 1. Bot Tokens 準備 ⏳

需要準備以下 Telegram bot tokens：

- [ ] **OpenClaw Bot Token**
  - 用途：接收訊息並發送回應
  - 取得方式：@BotFather → /newbot 或使用現有 bot
  - 格式：`123456789:ABCdefGHIjklMNOpqrsTUVwxyz`

- [ ] **Andrea Bot Token** (可選)
  - 用途：目標 bot 之一
  - 如果使用 Andrea bot 需要配置

- [ ] **Umio Bot Token** (可選)
  - 用途：目標 bot 之一
  - 如果使用 Umio bot 需要配置

### 2. 服務端點確認 ✅

- [x] n8n Webhook URL: `https://n8n.neovega.cc/webhook/message-router`
- [x] PocketBase URL: `https://pocketbase.neovega.cc`

### 3. 本地測試 ⏳

```powershell
# 1. 編輯 .env 文件
notepad webhook-bridge\.env

# 2. 填入實際的 bot tokens

# 3. 啟動開發服務器
cd webhook-bridge
npm run dev

# 4. 測試健康檢查（另開終端）
Invoke-WebRequest -Uri "http://localhost:3003/health"
```

## 🚀 Zeabur 部署步驟

### 步驟 1：建立新服務

1. 登入 Zeabur: https://zeabur.com
2. 選擇專案：`neovega` (或您的專案名稱)
3. 點擊 "Add Service"
4. 選擇 "Git Repository"
5. 選擇 repository 和 branch
6. 設定 Root Directory: `webhook-bridge`

### 步驟 2：配置環境變數

在 Zeabur 服務設定中添加（使用 TELEGRAM_ 前綴與現有環境變數一致）：

```
TELEGRAM_OPENCLAW_BOT_TOKEN=<your_token>
TELEGRAM_ANDREA_BOT_TOKEN=<your_token>
TELEGRAM_UMIO_BOT_TOKEN=<your_token>
WEBHOOK_SECRET=<generate_random_string>
PORT=3003
N8N_WEBHOOK_URL=https://n8n.neovega.cc/webhook/message-router
POCKETBASE_URL=https://pocketbase.neovega.cc
```

**注意：** 如果 Zeabur 中已有這些 TELEGRAM_*_BOT_TOKEN 變數，可直接使用，無需重複設定。

### 步驟 3：設定網域

1. 在服務設定中點擊 "Networking"
2. 添加自訂網域：`webhook-bridge.neovega.cc`
3. 或使用 Zeabur 提供的網域

### 步驟 4：部署

1. 點擊 "Deploy"
2. 等待建置完成
3. 檢查部署日誌

## ✅ 部署後驗證

### 1. 健康檢查

```powershell
Invoke-WebRequest -Uri "https://webhook-bridge.neovega.cc/health"
```

預期回應：
```json
{
  "status": "ok",
  "service": "webhook-bridge"
}
```

### 2. 設定 Telegram Webhook

```powershell
# 設定 OpenClaw bot webhook
$token = "<OPENCLAW_BOT_TOKEN>"
$url = "https://webhook-bridge.neovega.cc/webhook/openclaw"

Invoke-WebRequest -Uri "https://api.telegram.org/bot$token/setWebhook" `
    -Method POST `
    -Body (@{ url = $url } | ConvertTo-Json) `
    -ContentType "application/json"
```

### 3. 執行端到端測試

```powershell
.\test-webhook-bridge-e2e.ps1
```

### 4. 匯入 n8n Workflow

1. 登入 n8n: https://n8n.neovega.cc
2. 點擊 "Import from File"
3. 選擇：`n8n/webhook-bridge-response-workflow.json`
4. 啟用 workflow

## 📊 監控設定

### 查看日誌

```
Zeabur Dashboard → webhook-bridge → Logs
```

### 監控指標

- 請求成功率
- 回應時間
- 錯誤率

## 🔧 故障排除

### 問題 1：Bot token 無效

**症狀：** 401 Unauthorized 錯誤

**解決：**
1. 檢查 token 格式
2. 確認 token 未過期
3. 重新生成 token

### 問題 2：無法連接 n8n

**症狀：** Connection refused

**解決：**
1. 確認 n8n URL 正確
2. 檢查網路連線
3. 驗證 n8n 服務運行中

### 問題 3：訊息未轉發

**症狀：** 收到訊息但未轉發

**解決：**
1. 查看 Bridge 日誌
2. 確認 webhook 已設定
3. 檢查訊息格式

## 📝 下一步

部署完成後：

- [ ] 測試完整訊息流程
- [ ] 配置監控告警
- [ ] 建立備份策略
- [ ] 文件化運維流程
- [ ] 訓練團隊使用

---
建立時間：2026-03-15
狀態：準備部署
