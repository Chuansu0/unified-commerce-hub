# Umio HTTP Integration 完整指南

## 架構概述

本文件說明 Umio HTTP 整合的完整流程：

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Web Chat      │────▶│  openclaw-http   │────▶│  OpenClaw       │
│   (Frontend)    │     │  -bridge         │     │  WebSocket      │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                                                              │
                                                              ▼
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Web Chat      │◀────│  telegram-       │◀────│  Telegram       │
│   (Frontend)    │     │  webhook         │     │  (OpenClaw)     │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                                │
                                ▼
                       ┌──────────────────┐
                       │  n8n (PocketBase)│
                       │  儲存回覆        │
                       └──────────────────┘
```

## 1. 發送訊息流程 (Web Chat → OpenClaw)

### 1.1 前端發送

前端使用 `useUmioChat` hook 發送訊息：

```typescript
// src/hooks/useUmioChat.ts
const sendMessage = async (message: string) => {
  const response = await fetch(
    'https://openclaw-http-bridge.zeabur.app/api/umio/chat',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        sessionId: getOrCreateGuestSession(),
      }),
    }
  );
};
```

### 1.2 openclaw-http-bridge 轉發

`openclaw-http-bridge` 接收 HTTP 請求，轉發到 OpenClaw WebSocket：

```javascript
// POST /api/umio/chat
// 1. 建立 WebSocket 連線到 OpenClaw
// 2. 發送訊息
// 3. 等待回應（30秒超時）
// 4. 返回 Umio 的回覆
```

**注意**: openclaw-http-bridge 只處理同步回覆（Umio 的直接回覆）。Andrea 的延遲回覆通過不同的路徑。

### 1.3 OpenClaw 處理

OpenClaw 收到訊息後：
1. Umio 可能立即回覆（通過 WebSocket 返回）
2. Andrea 可能稍後在 Telegram 中回覆

## 2. 接收回覆流程 (Andrea → Web Chat)

### 2.1 Andrea 在 Telegram 回覆

Andrea 在 OpenClaw Telegram Chat 中看到 `[WebChat:sessionId]` 格式的訊息，並回覆。

### 2.2 telegram-webhook 轉發

`telegram-webhook` 服務通過 Telegram Webhook 接收 Andrea 的回覆：

```typescript
// telegram-webhook/src/index.ts
// 1. 檢查是否來自 OpenClaw Chat
// 2. 解析訊息中的 [WebChat:sessionId]
// 3. 轉發到 n8n webhook

const n8nPayload = {
  sessionId: userIdOrSession.replace('guest:', ''),
  replyText: replyText,
  agentName: 'andrea', // 或 'umio'
  timestamp: new Date().toISOString(),
  isGuest: userIdOrSession.startsWith('guest:'),
  originalMessageId: message.message_id,
  senderName: senderName
};

// 轉發到 n8n
fetch(`${N8N_WEBHOOK_URL}/umio-reply`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(n8nPayload)
});
```

### 2.3 n8n 處理並儲存到 PocketBase

n8n workflow `umio-reply-handler` 接收 webhook，儲存到 PocketBase：

```javascript
// n8n 節點配置
{
  "sessionId": "來自 webhook",
  "replyText": "來自 webhook",
  "agentName": "andrea",
  "timestamp": "ISO 時間戳",
  "isGuest": true/false
}

// 儲存到 messages collection
{
  conversation: <查找或建立>,
  sender: 'assistant',
  channel: 'telegram',
  content: replyText,
  metadata: { agentName, timestamp }
}
```

### 2.4 前端接收回覆

前端通過 PocketBase Realtime 或輪詢接收回覆：

```typescript
// src/hooks/useUmioChat.ts
// 訂閱 PocketBase messages collection 變更
pb.collection('messages').subscribe('*', (e) => {
  if (e.record.conversation === currentConversationId) {
    addMessage(e.record);
  }
});
```

## 3. 環境變數配置

### 3.1 openclaw-http-bridge

```bash
OPENCLAW_WS_URL=ws://openclaw-neovega.zeabur.app:8001/ws
PORT=3000
```

### 3.2 telegram-webhook

```bash
TELEGRAM_BOT_TOKEN=your_bot_token
POCKETBASE_URL=http://pocketbase-convo.zeabur.internal:8090
OPENCLAW_CHAT_ID=-1003806455231
N8N_WEBHOOK_URL=https://www.neovega.cc/api/webhook
```

### 3.3 前端

```bash
VITE_USE_N8N=false
VITE_UMIO_HTTP_BRIDGE_URL=https://openclaw-http-bridge.zeabur.app/api/umio/chat
```

## 4. 部署步驟

### 4.1 部署 openclaw-http-bridge

```bash
cd openclaw-http-bridge
# 推送到 GitHub
git add .
git commit -m "Fix syntax errors and add debug logging"
git push

# Zeabur 會自動重新部署
```

### 4.2 部署 telegram-webhook

```bash
# 確保環境變數已設定
# Zeabur 會自動重新部署
```

### 4.3 部署 n8n Workflow

1. 在 n8n 中建立新的 Workflow: `umio-reply-handler`
2. Webhook 節點路徑設定為 `umio-reply`
3. 添加 PocketBase 節點儲存訊息
4. 啟用 Workflow

## 5. 測試流程

### 5.1 測試發送

```bash
curl -X POST https://openclaw-http-bridge.zeabur.app/api/umio/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "你好，我想詢問產品資訊",
    "sessionId": "test-session-123"
  }'
```

### 5.2 測試接收

1. 在 Web Chat 發送訊息
2. 在 OpenClaw Telegram Chat 中查看 `[WebChat:test-session-123]` 訊息
3. Andrea 回覆該訊息
4. 檢查 n8n Webhook 是否收到請求
5. 檢查 PocketBase 是否有新訊息
6. 前端是否顯示回覆

## 6. 故障排除

### 6.1 openclaw-http-bridge 問題

**問題**: 無法連線到 OpenClaw
- 檢查 `OPENCLAW_WS_URL` 是否正確
- 檢查 Zeabur 日誌中的除錯訊息

**問題**: 返回 500 錯誤
- 檢查 WebSocket 連線狀態
- 檢查請求格式是否正確

### 6.2 telegram-webhook 問題

**問題**: 無法接收 Telegram 訊息
- 檢查 Webhook URL 是否正確設定
- 檢查 `TELEGRAM_BOT_TOKEN`

**問題**: 無法轉發到 n8n
- 檢查 `N8N_WEBHOOK_URL` 環境變數
- 檢查 n8n Webhook 是否啟用

### 6.3 n8n 問題

**問題**: Webhook 沒有觸發
- 檢查 Webhook 路徑是否正確
- 檢查 Workflow 是否啟用

**問題**: 無法儲存到 PocketBase
- 檢查 PocketBase 連線設定
- 檢查 collection 權限

## 7. 相關檔案

- `src/hooks/useUmioChat.ts` - 前端 hook
- `openclaw-http-bridge/index.js` - HTTP bridge 服務
- `telegram-webhook/src/index.ts` - Telegram webhook 服務
- `n8n/umio-reply-handler-workflow.json` - n8n workflow

## 8. 下一步

1. ✅ 更新 nginx.conf 添加 `/api/umio` 路由
2. ✅ 更新 telegram-webhook 轉發到 n8n
3. 🔄 重新部署 openclaw-http-bridge
4. 🔄 測試完整流程
