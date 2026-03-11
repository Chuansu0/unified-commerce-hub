# Web Chat 通過 Telegram 與 OpenClaw 通訊整合方案

**日期**：2026-03-10  
**版本**：v1.0  
**目標**：使用 Telegram Bot作為中間層，實現 Web Chat 與 OpenClaw 的通訊

---

## 1. 架構概述

### 1.1 通訊流程

```
┌─────────────┐      ┌──────────────┐      ┌──────────────┐      ┌──────────┐
│  Web Chat   │─────>│ Telegram Bot │─────>│Telegram   │─────>│ OpenClaw │
│  (前端)     │      │   API│      │   Platform   │      │  Agent   │
└─────────────┘      └──────────────┘      └──────────┘
       ↑                                                                 │
       │                                                                 │
       └─────────────────────────────────────────────────────────────────┘
                回覆路徑（通過 Webhook）
```

### 1.2 核心概念

- **Web Chat**：用戶在網站上的聊天介面
- **Telegram Bot**：作為中間層的 Bot，轉發訊息
- **OpenClaw**：已經與 Telegram 整合的 AI Agent
- **Webhook**：接收 Telegram 的回覆並轉發給前端

---

## 2. 已配置的Telegram Bot資源

### 2.1 Bot資訊

| 項目 | 值 |
|------|-----|
| Bot名稱 | andrea |
| Bot Username | @neovegaandrea_bot |
| Bot URL | https://t.me/neovegaandrea_bot |
| HTTP API Token | `8647752152:AAFt7U18c_BfVf5zEKW-TMZD41NDtUOHx-Y` |
| OpenClaw 監聽 Chat ID | `-1003806455231` |

### 2.2 Bot 用途

- **Web Chat 中繼**：接收來自網站的用戶訊息
- **OpenClaw 通訊**：轉發訊息到 OpenClaw Agent
- **回覆轉發**：將 OpenClaw 的回覆傳回網站

### 2.3 安全注意事項

⚠️ **重要**：
- API Token 是敏感資訊，不要提交到 Git
- 使用環境變數存儲
- 定期輪換 Token（如有需要）

---

## 3. 技術實現方案

### 3.1 方案 A：直接使用 Telegram Bot API（推薦）

**優點**：
- 簡單直接
- 不需要額外的後端服務
- Telegram API 穩定可靠

**缺點**：
- 需要輪詢或Webhook 接收回覆
- 可能有延遲

**實現步驟**：

#### 步驟 1：前端發送訊息到 Telegram

```typescript
// src/services/telegram.ts
export async function sendMessageToTelegram(
  botToken: string,
  chatId: string,
  message: string
): Promise<void> {
  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
  
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: message,
    }),
  });
}
```

#### 步驟 2：接收 Telegram 回覆

**選項A：Webhook（推薦）**

```typescript
// telegram-webhook/src/index.ts
import express from 'express';

const app = express();
app.use(express.json());

app.post('/webhook/telegram', (req, res) => {
  const update = req.body;
  
  if (update.message) {
    const chatId = update.message.chat.id;
    const text = update.message.text;
    const from = update.message.from;
    
    // 將回覆存儲到 PocketBase 或直接推送到前端
    // TODO: 實現回覆處理邏輯
  }
  
  res.sendStatus(200);
});

app.listen(3000);
```

**選項 B：長輪詢**

```typescript
export async function pollTelegramUpdates(
  botToken: string,
  offset: number = 0
): Promise<any[]> {
  const url = `https://api.telegram.org/bot${botToken}/getUpdates`;
  
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      offset,
      timeout: 30,
    }),
  });
  
  const data = await res.json();
  return data.result || [];
}
```

#### 步驟 3：前端接收回覆

**使用 PocketBase Realtime**：

```typescript
// src/hooks/useChat.ts
pb.collection('telegram_messages').subscribe('*', (e) => {
  if (e.action === 'create') {
    // 新訊息到達
    const message = e.record;
    // 更新聊天介面
  }
});
```

---

### 3.2 方案 B：使用現有的 telegram-webhook 服務

**優點**：
- 已有基礎代碼
- 可以擴展功能

**實現步驟**：

#### 步驟 1：擴展 telegram-webhook 服務

```typescript
// telegram-webhook/src/index.ts
import express from 'express';
import fetch from 'node-fetch';

const app = express();
app.use(express.json());

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const OPENCLAW_CHAT_ID = process.env.OPENCLAW_CHAT_ID!;

// 接收來自前端的訊息
app.post('/api/send-to-openclaw', async (req, res) => {
  const { message, userId } = req.body;
  
  // 發送到 Telegram（OpenClaw 監聽）
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: OPENCLAW_CHAT_ID,
      text: `[User: ${userId}] ${message}`,
    }),
  });
  
  res.json({ success: true });
});

// 接收來自 Telegram 的回覆
app.post('/webhook/telegram', async (req, res) => {
  const update = req.body;
  
  if (update.message) {
    const text = update.message.text;
    // 解析用戶 ID
    const match = text.match(/\[User: (.*?)\]/);
    const userId = match ? match[1] : 'unknown';
    
    // 存儲到 PocketBase
    await fetch('http://pocketbase:8090/api/collections/telegram_messages/records', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        message: text,
        timestamp: new Date().toISOString(),
      }),
    });
  }
  
  res.sendStatus(200);
});

app.listen(3000);
```

---

## 4. PocketBase Schema 設計

### 4.1 telegram_messages Collection

```json
{
  "name": "telegram_messages",
  "type": "base",
  "schema": [
    {
      "name": "userId",
      "type": "text",
      "required": true
    },
    {
      "name": "message",
      "type": "text",
      "required": true
    },
    {
      "name": "direction",
      "type": "select",
      "options": {
        "values": ["outgoing", "incoming"]
      }
    },
    {
      "name": "timestamp",
      "type": "date",
      "required": true
    }
  ]
}
```

---

## 5. 前端整合

### 5.1 修改 ChatWidget

```typescript
// src/components/storefront/ChatWidget.tsx
const handleSendMessage = async (message: string) => {
  // 發送到 Telegram
  await fetch('/api/send-to-openclaw', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message,
      userId: sessionId,
    }),
  });
  // 訂閱回覆
  pb.collection('telegram_messages')
    .subscribe(`userId="${sessionId}"`, (e) => {
      if (e.action === 'create' && e.record.direction === 'incoming') {
        // 顯示回覆
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: e.record.message,}]);
      }
    });
};
```

---

## 6. 部署配置

### 6.1 環境變數

**telegram-webhook/.env**：
```env
TELEGRAM_BOT_TOKEN=8647752152:AAFt7U18c_BfVf5zEKW-TMZD41NDtUOHx-Y
OPENCLAW_CHAT_ID=-1003806455231
POCKETBASE_URL=http://pocketbase:8090
```

### 6.2 Telegram Webhook 設定

```bash
# 設定 Webhook
curl -X POST https://api.telegram.org/bot8647752152:AAFt7U18c_BfVf5zEKW-TMZD41NDtUOHx-Y/setWebhook \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://www.neovega.cc/webhook/telegram"
  }'

# 驗證 Webhook 設定
curl https://api.telegram.org/bot8647752152:AAFt7U18c_BfVf5zEKW-TMZD41NDtUOHx-Y/getWebhookInfo
```

### 6.3 測試命令

**測試發送訊息到 OpenClaw**：
```bash
curl -X POST https://api.telegram.org/bot8647752152:AAFt7U18c_BfVf5zEKW-TMZD41NDtUOHx-Y/sendMessage \
  -H "Content-Type: application/json" \
  -d '{
    "chat_id": "-1003806455231",
    "text": "測試訊息：你好，這是來自 Web Chat 的測試"
  }'
```

**測試獲取更新**：
```bash
curl https://api.telegram.org/bot8647752152:AAFt7U18c_BfVf5zEKW-TMZD41NDtUOHx-Y/getUpdates
```

### 6.3 nginx 配置

```nginx
#添加 Telegram webhook 路由
location /webhook/telegram {proxy_pass http://telegram-webhook:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
}

# 添加發送訊息 API
location /api/send-to-openclaw {
    proxy_pass http://telegram-webhook:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
}
```

---

## 7. 實施步驟

### 階段 1：準備工作（1天）
- [ ] 創建 Telegram Bot
- [ ] 獲取 Bot Token
- [ ] 確認 OpenClaw 的 Telegram 整合
- [ ] 測試 Telegram Bot API

### 階段 2：後端開發（2天）
- [ ] 擴展 telegram-webhook 服務
- [ ] 實現發送訊息 API
- [ ] 實現接收 Webhook
- [ ] 整合 PocketBase

### 階段 3：前端整合（1天）
- [ ] 修改 ChatWidget
- [ ] 實現 Realtime 訂閱
- [ ] 測試端到端流程

### 階段 4：部署測試（1天）
- [ ] 部署到 Zeabur
- [ ] 設定 Telegram Webhook
- [ ] 端到端測試
- [ ] 性能優化

---

## 8. 優勢與限制

### 8.1 優勢
✅ 利用現有的 OpenClaw-Telegram 整合  
✅ Telegram API 穩定可靠  
✅ 不需要直接調用 OpenClaw API  
✅ 可以記錄所有對話歷史  

### 8.2 限制
⚠️ 可能有輕微延遲（Telegram 轉發）  
⚠️ 需要管理 Telegram Bot  
⚠️ 依賴 Telegram 平台穩定性

---

## 9. 後續優化

### 9.1 短期優化
- 添加訊息隊列處理
- 實現重試機制
- 添加錯誤處理

### 9.2 長期優化
- 支持多用戶並發
- 添加訊息加密
- 實現訊息持久化

---

**文件版本**：v1.0  
**最後更新**：2026-03-10 22:17