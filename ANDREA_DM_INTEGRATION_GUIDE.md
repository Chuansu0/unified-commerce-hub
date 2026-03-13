# Andrea DM Integration 部署指南

## 架構

```
WebChat → n8n (webhook) → Telegram (Andrea DM)
                ↓
                         Andrea 回覆
                              ↓
                    n8n (trigger) → WebChat API
```

## 部署步驟

### 1. 在 n8n 匯入 Workflows

#### Workflow 1: WebChat to Andrea DM
- 匯入 `n8n/webchat-andrea-dm-workflow.json`
- 設定 Telegram credential (使用 umio bot token)
- 啟用 workflow
- 記下 webhook URL: `https://n8n.neovega.cc/webhook/webchat-to-andrea`

#### Workflow 2: Andrea Reply to WebChat
- 匯入 `n8n/andrea-reply-to-webchat-workflow.json`
- 使用相同的 Telegram credential
- 更新 "Send to WebChat" 節點的 URL 為你的 API 端點
- 啟用 workflow

### 2. 部署 WebChat API 端點

在 `unified-commerce-hub` 中新增路由：

```typescript
// 在你的 API 路由中新增
app.post('/api/chat/reply', async (req, res) => {
    const { sessionId, message, source } = req.body;
    storeReply({ sessionId, message, source });
    res.json({ success: true });
});
```

### 3. 更新 WebChat 前端

修改 `src/services/chat.ts` 使用新的 Andrea chat service：

```typescript
import { sendToAndrea } from './andreaChat';

export async function sendMessage(message: string, sessionId: string) {
    const reply = await sendToAndrea(message, sessionId);
    return { message: reply, sessionId };
}
```

### 4. 測試流程

1. 在 WebChat 發送訊息
2. 檢查 n8n workflow 執行日誌
3. 確認 Andrea 收到私訊
4. Andrea 回覆後，確認回覆出現在 WebChat

## 測試指令

```bash
# 測試發送到 Andrea
curl -X POST https://n8n.neovega.cc/webhook/webchat-to-andrea \
  -H "Content-Type: application/json" \
  -d '{
    "message": "你好",
    "sessionId": "test-123"
  }'

# 測試接收回覆
curl -X POST https://www.neovega.cc/api/chat/reply \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "test-123",
    "message": "Andrea 的回覆",
    "source": "andrea"
  }'
```

## 故障排除

### Andrea 沒有收到訊息
- 檢查 n8n Telegram credential 是否正確
- 確認 umio bot 能發送私訊給 Andrea
- 查看 n8n workflow 執行日誌

### WebChat 沒有收到回覆
- 檢查 Andrea Reply workflow 是否啟用
- 確認 API 端點 URL 正確
- 查看瀏覽器 console 和網路請求

### Session ID 不匹配
- 確認 Extract Session ID 節點的正則表達式正確
- 檢查訊息格式是否包含 Session ID

## 優化建議

### 使用 Redis 儲存 Session
將 `pendingReplies` 改用 Redis：

```typescript
import Redis from 'ioredis';
const redis = new Redis(process.env.REDIS_URL);

export async function storeReply(reply: AndreaReply) {
    await redis.setex(
        `andrea:reply:${reply.sessionId}`,
        60, // 60 seconds TTL
        JSON.stringify(reply)
    );
}
```

### 使用 WebSocket 即時推送
不使用 polling，改用 WebSocket 即時推送回覆到前端。

### 新增重試機制
如果 Andrea 沒有回應，自動重試或使用備用回應。