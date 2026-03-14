# n8n Workflow 404 錯誤修復指南

## 問題

n8n workflow `webchat-umio-integration` 出現 404 錯誤：

```
404 - "{"code":404,"message":"The requested resource wasn't found.","data":{}}"
```

請求內容：
```json
{
  "session_id": "test-umio-001",
  "content": "你好 Umio",
  "role": "user",
  "agent": "umio",
  "platform": "webchat"
}
```

## 錯誤原因

原始的 workflow 有以下問題：

1. **欄位名稱錯誤**：使用了 `session_id` 而不是 `guest_session_id`
2. **缺少必需的 `conversation` 欄位**：`messages` collection 需要 `conversation` relation
3. **沒有先建立 conversation**：必須先建立 conversations 記錄，才能儲存 messages

## 修正方案

使用 `webchat-umio-integration-workflow-fixed.json`，修正內容：

### 1. 新增 "Get or Create Conversation" 節點

先查詢現有的 conversation：

```javascript
GET http://pocketbase-convo.zeabur.internal:8090/api/collections/conversations/records
Query: filter=guest_session_id="{{sessionId}}" && platform="umio"
```

### 2. 新增 "Conversation Exists?" IF 節點

檢查是否已存在 conversation：

```javascript
// 條件: $json.totalItems > 0
// True: 使用現有 conversation
// False: 建立新 conversation
```

### 3. 新增 "Create Conversation" 節點

如果不存在，建立新的 conversation：

```javascript
POST http://pocketbase-convo.zeabur.internal:8090/api/collections/conversations/records
Body: {
  guest_session_id: sessionId,
  platform: "umio",
  status: "active"
}
```

### 4. 修正 "Store User Message" 節點

正確的欄位對應：

```javascript
POST http://pocketbase-convo.zeabur.internal:8090/api/collections/messages/records
Body: {
  conversation: conversationId,  // 來自 Get or Create Conversation
  sender: "user",
  channel: "web",
  content: message,
  metadata: {
    agent: "umio",
    platform: "webchat",
    sessionId: sessionId
  }
}
```

## PocketBase Schema 驗證

確保 `conversations` collection 有以下欄位：

```json
{
  "name": "conversations",
  "fields": [
    { "name": "user", "type": "relation", "required": false },
    { "name": "telegram_chat_id", "type": "text", "required": false },
    { "name": "guest_session_id", "type": "text", "required": false },
    { "name": "platform", "type": "select", "required": true },
    { "name": "status", "type": "select", "required": false },
    { "name": "last_message", "type": "text", "required": false },
    { "name": "last_message_at", "type": "datetime", "required": false }
  ]
}
```

確保 `messages` collection 有以下欄位：

```json
{
  "name": "messages",
  "fields": [
    { "name": "conversation", "type": "relation", "required": true },
    { "name": "sender", "type": "select", "required": true },
    { "name": "channel", "type": "select", "required": false },
    { "name": "content", "type": "text", "required": true },
    { "name": "metadata", "type": "json", "required": false }
  ]
}
```

## 部署步驟

1. 在 n8n 中刪除舊的 "WebChat Umio Integration" workflow
2. 匯入 `webchat-umio-integration-workflow-fixed.json`
3. 設定 Telegram API credentials
4. 啟用 workflow
5. 測試發送訊息

## 測試

使用 curl 測試：

```bash
curl -X POST https://www.neovega.cc/api/webhook/umio-chat \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "test-fix-001",
    "message": "測試訊息",
    "platform": "webchat"
  }'
```

預期結果：
- 建立新的 conversation 記錄
- 儲存 user message
- 發送到 Telegram
- 返回成功回應
