# Umio Webhook 部署指南

## 概述

這個服務讓 Webchat 可以直接與 `neovegaumio_bot` 通訊，無需經過 OpenClaw Gateway。

## 架構流程

```
Webchat 發送訊息 → POST /api/send-to-umio → Telegram API → neovegaumio_bot
                                                        ↓
Umio 回覆訊息 ← Telegram Webhook ← POST /webhook/telegram ← PocketBase
                                                        ↓
                              Webchat 訂閱 PocketBase Realtime
```

## 環境變數設定

在 Zeabur Dashboard 設定以下環境變數：

```env
# 必要設定
UMIO_BOT_TOKEN=neovegaumio_bot 的 Bot Token
UMIO_CHAT_ID=neovegaumio_bot 監聽的 Chat ID（群組或私聊）

# PocketBase 連接
POCKETBASE_URL=http://pocketbase.zeabur.internal:8090

# 服務設定
PORT=8080
```

## Zeabur 部署步驟

### 1. 推送代碼到 GitHub

```bash
git add umio-webhook/
git commit -m "feat: Add zbpack.json for umio-webhook deployment"
git push origin main
```

### 2. 在 Zeabur 創建服務

1. 進入 [Zeabur Dashboard](https://dash.zeabur.com)
2. 點擊 "Create Service"
3. 選擇 "Deploy from GitHub"
4. 選擇你的儲存庫
5. **重要**：選擇 "umio-webhook" 目錄（不是根目錄）
6. 點擊 Deploy

### 3. 設定環境變數

在服務的 Environment Variables 頁面添加：

- `PORT` = `8080`
- `POCKETBASE_URL` = `http://pocketbase.zeabur.internal:8090`
- `UMIO_BOT_TOKEN` = `your_bot_token_here`
- `UMIO_CHAT_ID` = `your_chat_id_here`

### 4. 綁定域名

1. 在服務的 Domain 頁面
2. 點擊 "Generate Domain" 或 "Custom Domain"
3. 建議使用 `umio.neovega.cc`

### 5. 設置 Telegram Webhook

部署完成後，設置 Telegram Webhook：

```bash
curl -X POST "https://api.telegram.org/bot<UMIO_BOT_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://umio.neovega.cc/webhook/telegram",
    "allowed_updates": ["message"]
  }'
```

### 6. 測試

```bash
# 測試 health 端點
curl https://umio.neovega.cc/health

# 測試發送訊息
curl -X POST https://umio.neovega.cc/api/send-to-umio \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Hello Umio!",
    "sessionId": "test-123",
    "userName": "Test User"
  }'
```

## API 端點

### POST /api/send-to-umio

發送訊息給 Umio。

**Request Body:**
```json
{
  "message": "你好，我想詢問...",
  "sessionId": "user-123",
  "userName": "訪客",
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

## 如何取得 Umio Chat ID

### 方法一：透過 Bot API

1. 將 neovegaumio_bot 加入群組，或開始私聊
2. 在群組/私聊中發送任意訊息
3. 訪問：`https://api.telegram.org/bot<TOKEN>/getUpdates`
4. 找到 `"chat":{"id":-123456789` 這個數字就是 Chat ID

### 方法二：使用 BotFather

如果需要，可以使用 `/setprivacy` 設定 Bot 的隱私。

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

<b>👤 用戶:</b> 訪客
<b>📋 資訊:</b>
• page: /products
• source: webchat

<b>💬 訊息:</b>
你好，我想詢問..
```

Umio 回覆時，建議使用「引用回覆」（Reply），這樣系統可以正確識別對應的 Session。

## 故障排除

### Webhook 沒收到訊息

1. 檢查 Webhook URL 是否正確設定
2. 確認服務可以被 Telegram 訪問（必須是 HTTPS）
3. 檢查伺服器日誌

### 訊息發送失敗

1. 檢查 `UMIO_BOT_TOKEN` 是否正確
2. 檢查 `UMIO_CHAT_ID` 是否正確
3. 確認 Bot 有權限在 Chat 中發送訊息

### PocketBase 連接失敗

1. 檢查 `POCKETBASE_URL`
2. 確認 PocketBase 服務正在運行
3. 檢查網路連接

## 安全注意事項

1. **不要將 Bot Token 提交到 Git**
2. **設定 Webhook Secret**（可選，增強安全性）
3. **限制 IP 範圍**（Telegram Webhook 來自固定 IP）
