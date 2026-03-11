# Web Chat 通過 Telegram 與 OpenClaw 通訊整合方案 - 第二階段

**日期**：2026-03-10  
**版本**：v2.0  
**狀態**：待實施
**前置文件**：webchat_via_telegram_openclaw.md

---

## 1. 執行成果檢視

### 1.1 已完成項目 ✅

#### 後端服務（telegram-webhook）
- ✅ Express伺服器架構完整
- ✅ `/api/send-to-openclaw` - Web Chat 發送訊息到 OpenClaw（通過 Telegram）
- ✅ `/webhook/telegram` - 接收 Telegram webhook
- ✅ `handleIncomingMessage` - 處理來自 Telegram 的訊息
- ✅ `handleOpenClawReply` - 處理 OpenClaw 回覆並存入 PocketBase
- ✅ PocketBase 整合（訂閱、儲存訊息）
- ✅ Telegram 帳號綁定/解綁 API
- ✅ 健康檢查端點
- ✅ TypeScript 型別定義完整
- ✅ 錯誤處理機制

#### 基礎設施
- ✅ telegram-webhook 專案結構
- ✅ package.json 依賴配置
- ✅ .env.example 環境變數範本
- ✅ TypeScript 配置

### 1.2 未完成項目 ❌

#### 前端整合（關鍵缺口）
- ❌ **ChatWidget 未呼叫 `/api/send-to-openclaw`**
- ❌ **useChat hook仍直接呼叫 OpenClaw API**
- ❌ **未實作 PocketBase Realtime 訂閱接收回覆**
- ❌ **chat.ts 未使用 Telegram 中繼**

#### 部署配置
- ❌ Telegram Webhook 未設定
- ❌ nginx 配置未更新
- ❌ 環境變數未配置
- ❌ Docker/Zeabur 部署配置

#### 測試驗證
- ❌ 端到端測試
- ❌ Telegram Bot 測試
- ❌ PocketBase Realtime 測試

---

## 2. 問題分析

### 2.1 核心問題

**前端與後端未連接**

目前前端（ChatWidget、useChat、chat.ts）仍然直接呼叫 OpenClaw API：
```typescript
//目前的實作（錯誤）
const clawRes = await callOpenClaw({ userId, message, context }, settings);
```

**應該改為**通過 Telegram webhook 中繼：
```typescript
// 正確的實作
await fetch('/api/send-to-openclaw', {
  method: 'POST',
  body: JSON.stringify({ message, userId, sessionId })
});
```

### 2.2 架構不一致

原始計畫書的架構：
```
Web Chat → Telegram Bot API → Telegram Platform → OpenClaw
                ↓
Web Chat ← PocketBase Realtime ← telegram-webhook ← Telegram
```

目前實際架構：
```
Web Chat → 直接呼叫 OpenClaw API（未使用 Telegram）
```

---

## 3. 第二階段實施計畫

### 3.1 前端整合（優先）

#### 任務 1：修改 ChatWidget 使用 Telegram 中繼

**檔案**：`src/components/storefront/ChatWidget.tsx`

**修改重點**：
1. 移除直接呼叫 `useChat` 的 OpenClaw 邏輯
2. 改為呼叫 `/api/send-to-openclaw`
3. 訂閱 PocketBase Realtime 接收回覆

**實作範例**：
```typescript
// 發送訊息
const handleSend = async () => {
  if (!input.trim() || loading) return;
  
  const userMsg = { id: generateId(), role: 'user', content: input };
  setMessages(prev => [...prev, userMsg]);
  setInput('');
  setLoading(true);

  try {
    // 發送到 Telegram webhook
    await fetch('/api/send-to-openclaw', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: input,
        userId: pb.authStore.model?.id,
        sessionId: userId // guest session
      })
    });
  } catch (error) {
    console.error('發送失敗:', error);setLoading(false);
  }
};

// 訂閱回覆
useEffect(() => {
  if (!userId) return;
  
  const filter = pb.authStore.model?.id 
    ? `user = "${pb.authStore.model.id}" && platform = "webchat"`
    : null;
    
  if (!filter) return;

  pb.collection('messages').subscribe('*', (e) => {
    if (e.action === 'create' && e.record.sender === 'assistant') {
      setMessages(prev => [...prev, {
        id: e.record.id,
        role: 'assistant',
        content: e.record.content
      }]);
      setLoading(false);
    }
  }, { filter });

  return () => pb.collection('messages').unsubscribe();
}, [userId]);
```

#### 任務 2：建立 Telegram 服務模組

**檔案**：`src/services/telegram.ts`（已存在，需擴充）

**新增功能**：
```typescript
// 發送訊息到 OpenClaw（通過 Telegram）
export async function sendToOpenClaw(params: {
  message: string;
  userId?: string;
  sessionId?: string;
}): Promise<void> {
  const response = await fetch('/api/send-to-openclaw', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params)
  });
  
  if (!response.ok) {
    throw new Error('發送訊息失敗');
  }
}

// 訂閱 OpenClaw 回覆
export function subscribeToReplies(
  userId: string,
  onMessage: (message: string) => void
): () => void {
  const filter = `user = "${userId}" && platform = "webchat" && sender = "assistant"`;
  
  pb.collection('messages').subscribe('*', (e) => {
    if (e.action === 'create') {
      onMessage(e.record.content);
    }
  }, { filter });

  return () => pb.collection('messages').unsubscribe();
}
```

#### 任務 3：更新 useChat hook（可選）

**檔案**：`src/hooks/useChat.ts`

**選項A**：保持現有直接呼叫 OpenClaw 的邏輯（用於後台管理）  
**選項 B**：新增 `useTelegramChat` hook 專門用於 Storefront

建議：**選項 B**，建立新的 hook

**新檔案**：`src/hooks/useTelegramChat.ts`
```typescript
import { useState, useEffect } from 'react';
import { sendToOpenClaw, subscribeToReplies } from '@/services/telegram';
import pb from '@/services/pocketbase';

export function useTelegramChat(sessionId: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);

  const userId = pb.authStore.model?.id || sessionId;

  useEffect(() => {
    if (!pb.authStore.model?.id) return;
    
    const unsubscribe = subscribeToReplies(userId, (content) => {
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: 'assistant',
        content,
        timestamp: new Date()
      }]);
      setLoading(false);
    });

    return unsubscribe;
  }, [userId]);

  const sendMessage = async (text: string) => {
    const userMsg = {
      id: crypto.randomUUID(),
      role: 'user' as const,
      content: text,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      await sendToOpenClaw({
        message: text,
        userId: pb.authStore.model?.id,
        sessionId
      });
    } catch (error) {
      console.error('發送失敗:', error);setLoading(false);
    }
  };

  return { messages, loading, sendMessage };
}
```

### 3.2 後端優化

#### 任務 4：改進 handleOpenClawReply

**問題**：目前 `handleOpenClawReply` 只在 webhook 中被定義但未被呼叫

**修改**：在 `/webhook/telegram` 中正確呼叫

```typescript
app.post('/webhook/telegram', async (req: Request, res: Response) => {
  try {
    const update: TelegramUpdate = req.body;

    if (update.message) {
      const chatId = update.message.chat.id;
      
      // 檢查是否來自 OpenClaw Chat
      if (chatId.toString() === OPENCLAW_CHAT_ID) {
        await handleOpenClawReply(update.message);
      } else {
        await handleIncomingMessage(update.message);
      }
    }

    res.sendStatus(200);
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.sendStatus(500);
  }
});
```

#### 任務 5：改進訊息格式解析

**問題**：OpenClaw 回覆時需要正確解析用戶 ID

**改進 handleOpenClawReply**：
```typescript
async function handleOpenClawReply(message: TelegramMessage): Promise<void> {
  const text = message.text || '';
  
  // 解析格式：[WebChat:userId] 或 [WebChat:guest:sessionId]
  const match = text.match(/\[WebChat:([^\]]+)\]\s*(.*)/s);
  if (!match) {
    console.log('無法解析 WebChat 訊息格式');
    return;
  }

  const userIdOrSession = match[1];
  const replyText = match[2].trim();
  
  console.log(`[OpenClaw→WebChat] ${userIdOrSession}: ${replyText}`);

  // 儲存到 PocketBase（觸發 Realtime 通知）
  try {
    if (!userIdOrSession.startsWith('guest:')) {
      // 登入用戶
      const conversation = await pb.collection('conversations').getFirstListItem(
        `user = "${userIdOrSession}" && platform = "webchat"`
      );

      await pb.collection('messages').create({
        conversation: conversation.id,
        sender: 'assistant',
        channel: 'telegram',
        content: replyText
      });
    }
    // guest用戶暫不儲存（或建立臨時 conversation）
  } catch (error) {
    console.error('儲存回覆失敗:', error);
  }
}
```

### 3.3 部署配置

#### 任務 6：設定 Telegram Webhook

**步驟**：
1. 確保 telegram-webhook 服務已部署
2. 設定 webhook URL

```bash
# 設定 Webhook
curl -X POST "https://api.telegram.org/bot8647752152:AAFt7U18c_BfVf5zEKW-TMZD41NDtUOHx-Y/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://www.neovega.cc/webhook/telegram",
    "allowed_updates": ["message"]
  }'

# 驗證設定
curl "https://api.telegram.org/bot8647752152:AAFt7U18c_BfVf5zEKW-TMZD41NDtUOHx-Y/getWebhookInfo"
```

#### 任務 7：更新 nginx 配置

**檔案**：`nginx.conf`

**新增路由**：
```nginx
# Telegram Webhook
location /webhook/telegram {
    proxy_pass http://telegram-webhook:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
}

# Web Chat to OpenClaw API
location /api/send-to-openclaw {
    proxy_pass http://telegram-webhook:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
}

# Telegram 綁定 API
location /api/bind-telegram {
    proxy_pass http://telegram-webhook:3000;
    proxy_set_header Host $host;
}

location /api/unbind-telegram {
    proxy_pass http://telegram-webhook:3000;
    proxy_set_header Host $host;
}

location /api/telegram-status {
    proxy_pass http://telegram-webhook:3000;
    proxy_set_header Host $host;
}
```

#### 任務 8：環境變數配置

**Zeabur 環境變數**：
```env
# telegram-webhook 服務
TELEGRAM_BOT_TOKEN=8647752152:AAFt7U18c_BfVf5zEKW-TMZD41NDtUOHx-Y
OPENCLAW_CHAT_ID=-1003806455231
POCKETBASE_URL=http://pocketbase:8090
POCKETBASE_ADMIN_EMAIL=admin@neovega.cc
POCKETBASE_ADMIN_PASSWORD=<設定密碼>
PORT=3000
```

#### 任務 9：Docker 配置（如需要）

**新增到 docker-compose.yml**：
```yaml
services:
  telegram-webhook:
    build: ./telegram-webhook
    ports:
      - "3000:3000"
    environment:
      - TELEGRAM_BOT_TOKEN=${TELEGRAM_BOT_TOKEN}
      - OPENCLAW_CHAT_ID=${OPENCLAW_CHAT_ID}
      - POCKETBASE_URL=http://pocketbase:8090
      - POCKETBASE_ADMIN_EMAIL=${POCKETBASE_ADMIN_EMAIL}
      - POCKETBASE_ADMIN_PASSWORD=${POCKETBASE_ADMIN_PASSWORD}
    depends_on:
      - pocketbase
```

### 3.4 測試驗證

#### 任務 10：端到端測試

**測試流程**：
1. 在 Web Chat 輸入訊息
2. 檢查 telegram-webhook 日誌
3. 檢查 Telegram Chat（OpenClaw 監聽）是否收到訊息
4. OpenClaw 回覆後，檢查 PocketBase messages collection
5. 檢查 Web Chat 是否顯示回覆

**測試指令**：
```bash
# 1. 測試發送到 OpenClaw
curl -X POST http://localhost:3000/api/send-to-openclaw \
  -H "Content-Type: application/json" \
  -d '{
    "message": "測試訊息",
    "userId": "test-user-123"
  }'

# 2. 檢查 Telegram
# 到 https://t.me/neovegaandrea_bot 查看訊息

# 3. 模擬 OpenClaw 回覆
curl -X POST http://localhost:3000/webhook/telegram \
  -H "Content-Type: application/json" \
  -d '{
    "update_id": 123,
    "message": {
      "message_id": 456,
      "chat": { "id": -1003806455231, "type": "group" },
      "date": 1234567890,
      "text": "[WebChat:test-user-123] 這是測試回覆"
    }
  }'

# 4. 檢查 PocketBase
# 查看 messages collection 是否有新記錄
```

---

## 4. 實施優先順序

### 第一優先（核心功能）
1. ✅ 任務 2：建立 Telegram 服務模組
2. ✅ 任務 3：建立 useTelegramChat hook
3. ✅ 任務 1：修改 ChatWidget
4. ✅ 任務 4：改進 handleOpenClawReply

### 第二優先（部署）
5. ✅ 任務 7：更新 nginx 配置
6. ✅ 任務 8：環境變數配置
7. ✅ 任務 6：設定 Telegram Webhook

### 第三優先（測試）
8. ✅ 任務 10：端到端測試
9. ✅ 任務 5：改進訊息格式解析

---

## 5. 預期成果

### 5.1 功能完整性
- ✅ Web Chat 訊息通過 Telegram 轉發到 OpenClaw
- ✅ OpenClaw 回覆通過 Telegram webhook 返回
- ✅ PocketBase Realtime 即時推送回覆到前端
- ✅ 支援登入用戶和訪客

### 5.2 架構一致性
```
Web Chat (ChatWidget)↓ POST /api/send-to-openclaw
telegram-webhook
    ↓ Telegram Bot API
Telegram Platform
    ↓ 轉發到 Chat ID: -1003806455231
OpenClaw Agent
    ↓ 回覆到 Telegram
Telegram Platform
    ↓ Webhook: /webhook/telegram
telegram-webhook (handleOpenClawReply)
    ↓ 存入 PocketBase messages
PocketBase Realtime
    ↓訂閱通知
Web Chat (ChatWidget)
```

### 5.3 可觀測性
- 完整的日誌記錄
- 健康檢查端點
- 錯誤處理和重試機制

---

## 6. 風險與限制

### 6.1 已知限制
- Telegram API 有速率限制（30 msg/sec）
- Webhook 需要 HTTPS
- 訊息延遲約 1-3 秒
- 訪客用戶的訊息不會持久化（除非建立臨時 conversation）

### 6.2 風險緩解
- 實作訊息隊列（如需要）
- 添加重試機制
- 監控 Telegram API狀態
- Fallback 到直接呼叫 OpenClaw（如 Telegram 失敗）

---

## 7. 後續優化建議

### 7.1 短期（1-2 週）
- 添加訊息狀態追蹤（發送中、已送達、已讀）
- 實作訊息重試機制
- 添加 Telegram綁定 UI（Settings頁面）
- 支援訪客訊息持久化

### 7.2 中期（1個月）
- 實作訊息加密
- 添加多語言支援
- 優化 PocketBase Realtime 連線管理
- 添加訊息搜尋功能

### 7.3 長期（3個月）
- 支援多個 Telegram Bot
- 實作訊息分析和統計
- 添加A/B 測試框架
- 整合其他通訊平台（WhatsApp、LINE）

---

## 8. 檢查清單

### 開發階段
- [ ] 建立 `src/services/telegram.ts` 模組
- [ ] 建立 `src/hooks/useTelegramChat.ts` hook
- [ ] 修改 `src/components/storefront/ChatWidget.tsx`
- [ ] 修改 `telegram-webhook/src/index.ts` 的 webhook 處理
- [ ] 改進 `handleOpenClawReply` 函數

### 配置階段
- [ ] 更新 `nginx.conf`
- [ ] 設定 Zeabur 環境變數
- [ ] 設定 Telegram Webhook URL
- [ ] 驗證 Webhook 設定

### 測試階段
- [ ] 本地測試發送訊息
- [ ] 測試 Telegram 接收
- [ ] 測試 OpenClaw 回覆
- [ ] 測試 PocketBase Realtime
- [ ] 端到端測試

### 部署階段
- [ ] 部署 telegram-webhook 服務
- [ ] 更新 nginx 配置
- [ ] 重啟相關服務
- [ ] 驗證生產環境

---

**文件版本**：v2.0  
**建立日期**：2026-03-1022:50
**狀態**：待實施