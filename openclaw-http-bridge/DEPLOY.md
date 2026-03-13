# OpenClaw HTTP Bridge 部署指南

## 部署到 Zeabur

### 1. 建立新服務

在 Zeabur 專案中新增服務：
-服務名稱：`openclaw-http-bridge`
- 類型：Git Repository
- 選擇此目錄：`openclaw-http-bridge`

### 2. 設定環境變數

```
OPENCLAW_WS_URL=ws://openclaw.zeabur.internal:18789
OPENCLAW_GATEWAY_TOKEN=<從 OpenClaw 服務複製>
N8N_REPLY_WEBHOOK=https://n8n.neovega.cc/webhook/openclaw-reply
PORT=3000
```

### 3. 部署

Zeabur 會自動偵測 Dockerfile 並部署。

### 4. 測試

```bash
curl -X POST https://openclaw-http-bridge.zeabur.app/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "你好",
    "sessionId": "test-123",
    "agentId": "andrea"
  }'
```

應該回傳：
```json
{
  "success": true,
  "response": "Andrea的回應...",
  "sessionId": "test-123"
}
```

## 整合到 n8n

更新 `webchat-to-openclaw-workflow.json` 中的 URL：
```
https://openclaw-http-bridge.zeabur.app/api/chat
```

## 故障排除

### 連接 OpenClaw 失敗
- 檢查 `OPENCLAW_GATEWAY_TOKEN` 是否正確
- 確認 OpenClaw 服務在Zeabur 內部網路可訪問
- 查看 bridge 服務日誌

### 超時錯誤
- OpenClaw 可能正在處理，增加 timeout
- 檢查 OpenClaw 日誌確認是否收到請求

### n8n Webhook 失敗
- 確認 `N8N_REPLY_WEBHOOK` URL 正確
- 檢查 n8n workflow 是否已啟用