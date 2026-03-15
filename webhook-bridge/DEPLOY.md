# Webhook Bridge 部署指南

## 部署到 Zeabur

### 1. 準備工作

確保已完成：
- ✅ OpenClaw bot token
- ✅ Andrea bot token (可選)
- ✅ Umio bot token (可選)
- ✅ n8n webhook URL
- ✅ PocketBase URL

### 2. 部署步驟

**2.1 建立新服務**
```bash
# 在 Zeabur 專案中新增服務
# 選擇 Git Repository
# 選擇 webhook-bridge 目錄
```

**2.2 設定環境變數**
```
OPENCLAW_BOT_TOKEN=your_token
ANDREA_BOT_TOKEN=your_token
UMIO_BOT_TOKEN=your_token
WEBHOOK_SECRET=your_secret
PORT=3003
N8N_WEBHOOK_URL=https://n8n.neovega.cc/webhook/message-router
POCKETBASE_URL=https://pocketbase.neovega.cc
```

**2.3 設定網域**
```
webhook-bridge.neovega.cc
```

### 3. 測試部署

**健康檢查：**
```bash
curl https://webhook-bridge.neovega.cc/health
```

**預期回應：**
```json
{
  "status": "ok",
  "service": "webhook-bridge"
}
```

### 4. 配置 Telegram Webhook

**設定 OpenClaw bot webhook：**
```bash
curl -X POST "https://api.telegram.org/bot<OPENCLAW_TOKEN>/setWebhook" \
  -d "url=https://webhook-bridge.neovega.cc/webhook/openclaw"
```

## 本地開發

**安裝依賴：**
```bash
cd webhook-bridge
npm install
```

**設定環境變數：**
```bash
cp .env.example .env
# 編輯 .env 填入實際值
```

**啟動開發服務器：**
```bash
npm run dev
```

**測試端點：**
```bash
# 健康檢查
curl http://localhost:3003/health

# 測試訊息轉發
curl -X POST http://localhost:3003/webhook/openclaw \
  -H "Content-Type: application/json" \
  -d '{
    "message_id": 123,
    "chat_id": -100123456789,
    "text": "@andrea 測試訊息",
    "from": {"id": 111, "username": "test"}
  }'
```

## 監控和除錯

**查看日誌：**
```bash
# Zeabur 控制台 → webhook-bridge → Logs
```

**常見問題：**

1. **Bot token 無效**
   - 檢查環境變數是否正確設定
   - 確認 token 格式正確

2. **無法轉發訊息**
   - 檢查 n8n webhook URL 是否可訪問
   - 查看日誌確認錯誤訊息

3. **回應未送達**
   - 確認 chat_id 正確
   - 檢查 bot 是否有發送訊息權限
