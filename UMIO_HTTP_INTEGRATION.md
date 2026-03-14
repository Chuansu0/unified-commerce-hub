# Umio HTTP 端點整合指南

## 概述

此整合方案使用 `openclaw-http-bridge` 提供的 HTTP API `/api/umio/chat` 直接與 OpenClaw AI Bot (Umio) 通訊。相較於之前的 Telegram 轉發方案，此方案更直接、更快速。

## 架構流程

```
ChatWidget (Web) → useUmioChat Hook → umioChat Service → OpenClaw HTTP Bridge → OpenClaw (Umio Bot)
                                          ↓
                                   PocketBase (儲存對話)
```

## API 端點

### POST `/api/umio/chat`

**URL**: `https://openclaw-http-bridge.zeabur.app/api/umio/chat`

**Request Body**:
```json
{
  "message": "你好 Umio",
  "sessionId": "user-123",
  "context": {
    "userName": "訪客",
    "platform": "webchat"
  }
}
```

**Response Body**:
```json
{
  "success": true,
  "response": "你好！我是 Umio，很高興為你服務。",
  "sessionId": "user-123",
  "agent": "umio",
  "timestamp": "2026-03-14T16:00:00.000Z"
}
```

### GET `/health`

**URL**: `https://openclaw-http-bridge.zeabur.app/health`

檢查 OpenClaw Bridge 健康狀態。

## 檔案結構

### 核心檔案

1. **`src/services/umioChat.ts`** - Umio 服務
   - `sendToUmio()` - 發送訊息並等待回覆
   - `chatWithUmio()` - 簡易同步聊天函數
   - `subscribeToUmioReplies()` - 訂閱回覆（備用方案）
   - `getUmioConversation()` - 取得對話歷史
   - `checkUmioHealth()` - 檢查服務健康狀態

2. **`src/hooks/useUmioChat.ts`** - React Hook
   - `messages` - 訊息列表
   - `isLoading` - 載入狀態
   - `sendMessage()` - 發送訊息（同步）
   - `sendMessageAsync()` - 發送訊息（非同步）
   - `clearMessages()` - 清除訊息
   - `restartChat()` - 重新開始對話

3. **`src/components/storefront/ChatWidget.tsx`** - 聊天組件
   - 使用 `useUmioChat` Hook
   - 提供 WebChat UI

## 環境變數

複製 `.env.umio.example` 為 `.env`:

```bash
# OpenClaw HTTP Bridge URL
VITE_OPENCLAW_BRIDGE_URL=https://openclaw-http-bridge.zeabur.app

# PocketBase URL
VITE_POCKETBASE_URL=/pb
```

## 使用方式

### 在組件中使用

```tsx
import { useUmioChat } from "@/hooks/useUmioChat";

function MyChat() {
  const { messages, isLoading, sendMessage } = useUmioChat();

  const handleSend = async (text: string) => {
    await sendMessage(text);
  };

  return (
    <div>
      {messages.map(m => (
        <div key={m.id} className={m.sender}>
          {m.content}
        </div>
      ))}
      {isLoading && <div>思考中...</div>}
      <button onClick={() => handleSend("你好")}>發送</button>
    </div>
  );
}
```

### 直接使用服務

```typescript
import { chatWithUmio, checkUmioHealth } from "@/services/umioChat";

// 發送訊息
const response = await chatWithUmio("你好", "session-123");
console.log(response); // "你好！我是 Umio..."

// 檢查健康狀態
const health = await checkUmioHealth();
console.log(health.ok); // true/false
```

## 與舊方案比較

| 功能 | 舊方案 (Telegram) | 新方案 (HTTP) |
|------|------------------|---------------|
| 通訊方式 | Web → Telegram → OpenClaw | Web → HTTP Bridge → OpenClaw |
| 回覆方式 | 非同步（訂閱） | 同步（直接回覆） |
| 延遲 | 較高（多層轉發） | 較低（直接連接） |
| 可靠性 | 依賴 Telegram | 不依賴第三方 |
| 複雜度 | 高 | 低 |

## 疑難排解

### 無法連接到 Umio

1. 檢查 `VITE_OPENCLAW_BRIDGE_URL` 是否正確
2. 測試健康檢查端點：
   ```bash
   curl https://openclaw-http-bridge.zeabur.app/health
   ```

### 沒有收到回覆

1. 檢查瀏覽器控制台是否有錯誤
2. 確認 OpenClaw Bridge 正常運行
3. 檢查 Network Tab 中的 API 請求

### 訊息沒有儲存

1. 確認 PocketBase 連線正常
2. 檢查 conversations 和 messages collections 存在
3. 查看瀏覽器控制台錯誤

## 相關文件

- `openclaw-http-bridge/index.js` - HTTP Bridge 原始碼
- `openclaw-http-bridge/DEPLOY.md` - 部署指南
- `.env.umio.example` - 環境變數範例

## 下一步

1. 測試 HTTP Bridge 是否正常運作
2. 部署更新後的前端程式
3. 驗證 Umio 回覆功能
