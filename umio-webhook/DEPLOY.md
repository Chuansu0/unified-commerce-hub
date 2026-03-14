# Umio Webhook 部署指南

## 簡介

這個服務讓 Webchat 可以直接與 `neovegaumio_bot` 通訊，無需透過 OpenClaw。

## 架構

```
Webchat → POST /api/send-to-umio → Telegram API → neovegaumio_bot
                                         ↓
Umio 回覆 → Telegram Webhook → POST /webhook/telegram → PocketBase
                                         ↓
                              Webchat 訂閱 PocketBase Realtime
```

## 環境變數設定

在 Zeabur 或其他部署平台設定以下環境變數：

```env
# 必要設定
UMIO_BOT_TOKEN=neovegaumio_bot 的 Bot Token
UMIO_CHAT_ID=neovegaumio_bot 所在的 Chat ID（群組或私聊）

# PocketBase 連線
POCKETBASE_URL=http://pocketbase-convo.zeabur.internal:8090

# 選擇性設定
PORT=3000
```

## 如何取得 Umio Chat ID

### 方法一：透過 Bot API

1. 先將 neovegaumio_bot 加入群組，或開始私聊
2. 在群組/私聊發送一則訊息
3. 訪問：`https://api.telegram.org/bot<TOKEN>/getUpdates`
4. 找到 `"chat":{"id":-123456789` 這個數字就是 Chat ID

### 方法二：使用 BotFather

如果是私聊，可以使用 `/setprivacy` 查看 Bot 的資訊。

## 設定 Telegram Webhook

部署完成後，需要設定 Telegram Webhook：

```bash
curl -X POST "https://api.telegram.org/bot<UMIO_BOT_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://your-service.zeabur.app/webhook/telegram",
    "allowed_updates": ["message"]
  }'
```

## Zeabur 部署步驟

1. 建立新服務，選擇 "Git Repository"
2. 選擇 umio-webhook 資料夾
3. 設定環境變數（如上）
4. 部署
5. 取得服務 URL
6. 設定 Telegram Webhook

## API 端點

### POST /api/send-to-umio

發送訊息給 Umio。

**Request Body:**
```json
{
  "message": "你好，我想詢問...",
  "sessionId": "user-123",
  "userName": "王小明",
  "metadata": {
    "page": "/products",
    "source": "webchat"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Message sent to Umio"
}
```

### GET /api/conversations/:sessionId

取得對話歷史。

**Response:**
```json
{
  "success": true,
  "conversation": {
    "id": "rec123",
    "sessionId": "user-123",
    "status": "active"
  },
  "messages": [
    {
      "id": "msg456",
      "sender": "user",
      "content": "你好",
      "created": "2024-01-01T00:00:00Z"
    },
    {
      "id": "msg457",
      "sender": "assistant",
      "content": "你好！有什麼可以幫你？",
      "created": "2024-01-01T00:00:01Z"
    }
  ]
}
```

### POST /webhook/telegram

Telegram Webhook 端點（由 Telegram 呼叫）。

### GET /health

健康檢查。

## 前端整合

在 ChatWidget 中使用：

```typescript
import { sendToUmio, subscribeToUmioReplies } from '@/services/umioChat';

// 發送訊息
await sendToUmio({
  message: '你好',
  sessionId: 'user-123',
  userName: '訪客'
});

// 訂閱回覆
subscribeToUmioReplies('user-123', (message) => {
  console.log('收到 Umio 回覆:', message);
});
```

## 訊息格式

發送給 Umio 的訊息格式：

```
<b>[Session:user-123]</b>

<b>👤 用戶:</b> 王小明
<b>📋 資訊:</b>
• page: /products
• source: webchat

<b>💬 訊息:</b>
你好，我想詢問...
```

Umio 回覆時，建議使用「回覆」功能（Reply），這樣系統可以自動識別對應的 Session。

## 故障排除

### Webhook 沒有收到訊息

1. 檢查 Webhook URL 是否正確設定
2. 確認服務可以被 Telegram 訪問（必須是 HTTPS）
3. 檢查伺服器日誌

### 無法發送訊息

1. 檢查 `UMIO_BOT_TOKEN` 是否正確
2. 檢查 `UMIO_CHAT_ID` 是否正確
3. 確認 Bot 有權限在 Chat 中發送訊息

### PocketBase 連線失敗

1. 檢查 `POCKETBASE_URL`
2. 確認 PocketBase 服務運行中
3. 檢查網路連線

## 安全注意事項

1. **不要將 Bot Token 提交到 Git**
2. **設定 Webhook Secret**（可選，進階功能）
3. **限制 IP 白名單**（Telegram Webhook 來自特定 IP）
