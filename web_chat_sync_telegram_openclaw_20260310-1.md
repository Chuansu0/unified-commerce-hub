# Web Chat 與 Telegram/OpenClaw 同步架構設計

## 1. 架構概述

本文件描述 Vite+React 網頁應用如何透過 Telegram Bot 與 OpenClaw AI Agent 進行雙向同步通訊。

### 核心原則
- **不直接呼叫 OpenClaw API**：所有 AI 對話透過 Telegram Bot 中轉
- **PocketBase 作為中央資料庫**：儲存所有對話記錄
- **Realtime 同步**：Web 前端透過 PocketBase Realtime 訂閱更新
- **平台統一**：Web 和 Telegram 對話記錄統一管理

---

## 2. 系統架構圖

```
┌─────────────────────────────────────────────────────────────────┐
│                         使用者層                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────┐                    ┌──────────────┐          │
│  │  Web Chat    │                    │  Telegram    │          │
│  │  (React)     │                    │  Client      │          │
│  └──────┬───────┘                    └──────┬───────┘          │
│         │                                    │                   │
└─────────┼────────────────────────────────────┼──────────────────┘
          │                                    │
          │ HTTP/WebSocket                     │ Telegram Protocol
          │                                    │
┌─────────▼────────────────────────────────────▼──────────────────┐
│                      應用層                                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────────────────────────────────────────────┐      │
│  │              PocketBase Backend                       │      │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐    │      │
│  │  │conversations│  │  messages  │  │   users    │    │      │
│  │  └────────────┘  └────────────┘  └────────────┘    │      │
│  │                                                       │      │
│  │  • Realtime Subscriptions                           │      │
│  │  • REST API                                          │      │
│  │  • Authentication                                    │      │
│  └──────────────────────────────────────────────────────┘      │
│                                                                   │
│  ┌──────────────────────────────────────────────────────┐      │
│  │         Telegram Bot Webhook Handler                  │      │
│  │         (Node.js / PocketBase Hook)                   │      │
│  │                                                       │      │
│  │  • 接收 Telegram 訊息                                │      │
│  │  • 儲存到 PocketBase                                 │      │
│  │  • 發送訊息到 Telegram Bot API                      │      │
│  └──────────────────────────────────────────────────────┘      │
│                                                                   │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          │ HTTPS
                          │
┌─────────────────────────▼───────────────────────────────────────┐
│                      外部服務層                                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────────────────────────────────────────────┐      │
│  │           Telegram Bot API                            │      │
│  │           (api.telegram.org)                          │      │
│  └──────────────────────┬───────────────────────────────┘      │
│                         │                                        │
│                         │ Bot Messages                           │
│                         │                                        │
│  ┌──────────────────────▼───────────────────────────────┐      │
│  │           OpenClaw Telegram Bot                       │      │
│  │           (AI Agent)                                  │      │
│  │                                                       │      │
│  │  • 接收 Telegram 訊息                                │      │
│  │  • AI 處理與回覆                                     │      │
│  │  • 支援多種 LLM (GPT-4, Claude, etc.)               │      │
│  └──────────────────────────────────────────────────────┘      │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. 資料流程

### 3.1 Web 用戶發送訊息流程

```
1. Web Chat UI
   ↓ (用戶輸入訊息)
   
2. React Component (ChatWidget.tsx)
   ↓ (呼叫 sendMessage)
   
3. chat.ts Service
   ↓ (儲存到 PocketBase)
   
4. PocketBase messages collection
   - conversation: 對話 ID
   - sender: "user"
   - channel: "web"
   - content: 訊息內容
   ↓
   
5. Telegram Bot Webhook Handler
   ↓ (檢查用戶是否綁定 Telegram)
   
6. 如果已綁定:
   ↓ (透過 Telegram Bot API 發送)
   
7. Telegram Bot API
   ↓ (發送給用戶的 Telegram)
   
8. OpenClaw Bot
   ↓ (AI 處理)
   
9. OpenClaw 回覆到 Telegram
   ↓
   
10. Telegram Webhook → Bot Handler
    ↓ (儲存回覆)
    
11. PocketBase messages collection
    - sender: "assistant"
    - channel: "telegram"
    - content: AI 回覆
    ↓
    
12. PocketBase Realtime
    ↓ (推送更新)
    
13. Web Chat UI 自動更新
```

### 3.2 Telegram 用戶發送訊息流程

```
1. Telegram Client
   ↓ (用戶發送訊息)
   
2. OpenClaw Bot
   ↓ (AI 處理)
   
3. OpenClaw 回覆
   ↓
   
4. Telegram Webhook → Bot Handler
   ↓ (儲存對話)
   
5. PocketBase
   - 儲存用戶訊息 (sender: "user", channel: "telegram")
   - 儲存 AI 回覆 (sender: "assistant", channel: "telegram")
   ↓
   
6. PocketBase Realtime
   ↓ (如果用戶同時開啟 Web)
   
7. Web Chat UI 自動同步顯示
```

---

## 4. 核心組件設計

### 4.1 PocketBase Schema

#### conversations 表
```json
{
  "user": "relation(users)",
  "telegram_chat_id": "text",
  "platform": "select(telegram|web|line)",
  "status": "select(active|resolved|pending)",
  "last_message": "text",
  "last_message_at": "datetime",
  "unread_count": "number",
  "metadata": "json"
}
```

#### messages 表
```json
{
  "conversation": "relation(conversations)",
  "sender": "select(user|assistant|system)",
  "channel": "select(web|telegram)",
  "content": "text",
  "intent": "text",
  "metadata": "json",
  "created": "autodate"
}
```

#### users 表（Telegram 綁定欄位）
```json
{
  "telegram_user_id": "number",
  "telegram_username": "text",
  "telegram_bound_at": "date"
}
```

### 4.2 Telegram Bot Webhook Handler

**技術選擇**：
- **選項 A**：獨立 Node.js 服務（推薦）
- **選項 B**：PocketBase Hooks（JavaScript）
- **選項 C**：Cloudflare Workers / Vercel Functions

**推薦架構**：獨立 Node.js 服務

```typescript
// telegram-webhook/index.ts
import express from 'express';
import PocketBase from 'pocketbase';

const app = express();
const pb = new PocketBase(process.env.POCKETBASE_URL);

// Telegram Bot Token
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

// Webhook 端點：接收 Telegram 訊息
app.post('/webhook/telegram', async (req, res) => {
  const update = req.body;
  
  if (update.message) {
    await handleIncomingMessage(update.message);
  }
  
  res.sendStatus(200);
});

async function handleIncomingMessage(message: any) {
  const telegramUserId = message.from.id;
  const text = message.text;
  
  // 1. 查找綁定的用戶
  const user = await pb.collection('users').getFirstListItem(
    `telegram_user_id = ${telegramUserId}`
  );
  
  if (!user) return; // 未綁定用戶，忽略
  
  // 2. 查找或建立對話
  let conversation = await pb.collection('conversations').getFirstListItem(
    `user = "${user.id}" && telegram_chat_id = "${message.chat.id}"`
  ).catch(() => null);
  
  if (!conversation) {
    conversation = await pb.collection('conversations').create({
      user: user.id,
      telegram_chat_id: message.chat.id,
      platform: 'telegram',
      status: 'active'
    });
  }
  
  // 3. 儲存用戶訊息
  await pb.collection('messages').create({
    conversation: conversation.id,
    sender: 'user',
    channel: 'telegram',
    content: text
  });
  
  // 4. 儲存 AI 回覆（如果 OpenClaw 已回覆）
  // OpenClaw 會自動回覆到 Telegram，我們在下一個 update 接收
}

// PocketBase 訊息變更監聽：Web → Telegram
pb.collection('messages').subscribe('*', async (e) => {
  if (e.action === 'create' && e.record.channel === 'web') {
    await forwardToTelegram(e.record);
  }
});

async function forwardToTelegram(message: any) {
  // 1. 取得對話資訊
  const conversation = await pb.collection('conversations').getOne(
    message.conversation,
    { expand: 'user' }
  );
  
  const user = conversation.expand?.user;
  if (!user?.telegram_user_id) return;
  
  // 2. 透過 Telegram Bot API 發送訊息
  await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: user.telegram_user_id,
      text: message.content
    })
  });
}
```

### 4.3 Web 前端實作

**修改 `src/services/api.ts`**：

```typescript
// 移除直接呼叫 OpenClaw 的邏輯
// 改為透過 PocketBase Realtime 接收回覆

export async function sendMessageToAI(
  conversationId: string,
  message: string
): Promise<void> {
  // 只儲存訊息到 PocketBase
  // AI 回覆會透過 Telegram → Webhook → PocketBase → Realtime 返回
  await pb.collection('messages').create({
    conversation: conversationId,
    sender: 'user',
    channel: 'web',
    content: message
  });
  
  // 不需要等待回覆，透過 Realtime 訂閱接收
}
```

**修改 `src/hooks/useChat.ts`**：

```typescript
import { useEffect, useState } from 'react';
import pb from '../services/pocketbase';

export function useChat(conversationId: string) {
  const [messages, setMessages] = useState([]);
  
  useEffect(() => {
    // 訂閱訊息更新
    pb.collection('messages').subscribe('*', (e) => {
      if (e.record.conversation === conversationId) {
        if (e.action === 'create') {
          setMessages(prev => [...prev, e.record]);
        }
      }
    });
    
    return () => {
      pb.collection('messages').unsubscribe();
    };
  }, [conversationId]);
  
  return { messages };
}
```

---

## 5. 部署架構

### 5.1 服務部署

```
┌─────────────────────────────────────────────────────────┐
│                    Zeabur / 雲端平台                      │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  ┌──────────────────┐      ┌──────────────────┐        │
│  │  Vite+React      │      │  PocketBase      │        │
│  │  Frontend        │◄─────┤  Backend         │        │
│  │  (Static)        │      │  (Port 8090)     │        │
│  └──────────────────┘      └──────────────────┘        │
│                                                           │
│  ┌──────────────────────────────────────────┐           │
│  │  Telegram Webhook Handler                │           │
│  │  (Node.js Service)                       │           │
│  │  Port 3000                               │           │
│  └──────────────────────────────────────────┘           │
│                                                           │
└─────────────────────────────────────────────────────────┘
                          │
                          │ HTTPS Webhook
                          ▼
              ┌────────────────────────┐
              │  Telegram Bot API      │
              └────────────────────────┘
                          │
                          ▼
              ┌────────────────────────┐
              │  OpenClaw Bot          │
              └────────────────────────┘
```

### 5.2 環境變數配置

**PocketBase**：
```env
# 無需額外配置
```

**Telegram Webhook Handler**：
```env
POCKETBASE_URL=http://pocketbase:8090
POCKETBASE_ADMIN_EMAIL=admin@example.com
POCKETBASE_ADMIN_PASSWORD=your_password
TELEGRAM_BOT_TOKEN=your_bot_token
WEBHOOK_URL=https://your-domain.com/webhook/telegram
PORT=3000
```

**Web Frontend**：
```env
VITE_POCKETBASE_URL=https://your-pocketbase-url.com
```

---

## 6. 實作步驟

### 階段 1：Telegram Bot 設定

1. **建立 Telegram Bot**：
   ```bash
   # 與 @BotFather 對話
   /newbot
   # 取得 Bot Token
   ```

2. **設定 Webhook**：
   ```bash
   curl -X POST "https://api.telegram.org/bot<TOKEN>/setWebhook" \
     -d "url=https://your-domain.com/webhook/telegram"
   ```

3. **整合 OpenClaw**：
   - 在 OpenClaw 配置中啟用 Telegram extension
   - 設定 Bot Token

### 階段 2：Webhook Handler 開發

1. **建立 Node.js 專案**：
   ```bash
   mkdir telegram-webhook
   cd telegram-webhook
   npm init -y
   npm install express pocketbase
   ```

2. **實作 Webhook 邏輯**（見 4.2 節）

3. **部署服務**

### 階段 3：Web 前端修改

1. **移除直接 OpenClaw API 呼叫**
2. **實作 PocketBase Realtime 訂閱**
3. **更新 UI 顯示邏輯**

### 階段 4：測試

1. **Web → Telegram → OpenClaw 流程測試**
2. **Telegram → OpenClaw → Web 同步測試**
3. **多平台同步測試**

---

## 7. 優勢與限制

### 優勢

✅ **統一對話管理**：所有平台對話集中在 PocketBase
✅ **Realtime 同步**：Web 和 Telegram 即時同步
✅ **OpenClaw 整合**：利用 OpenClaw 的 Telegram 支援
✅ **可擴展性**：易於添加 LINE、WhatsApp 等平台
✅ **成本效益**：無需自建 AI 推理服務

### 限制

⚠️ **延遲**：Web → Telegram → OpenClaw → Telegram → Web 有額外延遲
⚠️ **依賴 Telegram**：需要用戶綁定 Telegram 帳號
⚠️ **Webhook 穩定性**：需要穩定的 HTTPS 端點
⚠️ **訊息順序**：高並發時可能有順序問題

---

## 8. 替代方案

### 方案 B：混合模式

- **已綁定 Telegram 用戶**：使用 Telegram Bot 流程
- **未綁定用戶**：直接呼叫 OpenClaw API（如原設計）

**優點**：更好的用戶體驗，無需強制綁定
**缺點**：需要維護兩套邏輯

### 方案 C：Server-Sent Events (SSE)

使用 SSE 替代 PocketBase Realtime，減少 WebSocket 連線數。

---

## 9. 安全考量

1. **Telegram Webhook 驗證**：
   ```typescript
   // 驗證請求來自 Telegram
   const secretToken = crypto
     .createHash('sha256')
     .update(BOT_TOKEN)
     .digest('hex');
   ```

2. **PocketBase 權限規則**：
   ```javascript
   // messages collection 規則
   @request.auth.id = conversation.user.id
   ```

3. **環境變數保護**：
   - 不要將 Bot Token 提交到 Git
   - 使用 Zeabur 環境變數管理

---

## 10. 監控與除錯

### 日誌記錄

```typescript
// Webhook Handler
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});
```

### 健康檢查

```typescript
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    pocketbase: pb.authStore.isValid,
    telegram: !!BOT_TOKEN
  });
});
```

---

## 11. 總結

本架構透過 **Telegram Bot 作為中介**，實現 Web Chat 與 OpenClaw 的雙向同步通訊。核心優勢是利用 OpenClaw 原生的 Telegram 支援，避免直接管理 AI 推理服務。

**關鍵技術**：
- PocketBase Realtime Subscriptions
- Telegram Bot API + Webhooks
- OpenClaw Telegram Extension

**下一步**：
1. 實作 Telegram Webhook Handler
2. 修改 Web 前端移除直接 API 呼叫
3. 部署並測試完整流程

