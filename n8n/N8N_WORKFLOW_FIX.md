# n8n Workflow 錯誤修復指南

## 問題 1：404 錯誤

n8n workflow `webchat-umio-integration` 出現 404 錯誤：

```
404 - "{"code":404,"message":"The requested resource wasn't found.","data":{}}"
```

### 錯誤原因

原始的 workflow 有以下問題：

1. **欄位名稱錯誤**：使用了 `session_id` 而不是 `guest_session_id`
2. **缺少必需的 `conversation` 欄位**：`messages` collection 需要 `conversation` relation
3. **沒有先建立 conversation**：必須先建立 conversations 記錄，才能儲存 messages

---

## 問題 2：403 權限錯誤

```
403 - "{"code":403,"message":"Only admins can perform this action.","data":{}}"
```

### 錯誤原因

PocketBase collections 的 API 規則設定為僅 Admin 可存取，但 HTTP Request 節點沒有提供 Admin Token。

### 修正方案

所有 PocketBase HTTP 請求都必須加入 `Authorization: Bearer {admin_token}` Header：

```javascript
// 在每個 HTTP Request 節點的 Header Parameters 中
{
  "Authorization": "={{ 'Bearer ' + $env.POCKETBASE_ADMIN_TOKEN }}"
}
```

**需要在 n8n Environment 中設定環境變數：**

```bash
POCKETBASE_ADMIN_TOKEN=eyJhbGciOiJIUzI1NiIs... # PocketBase Admin JWT Token
```

---

## 修正後的 Workflow 結構

使用 `webchat-umio-integration-workflow-fixed.json`，包含以下節點：

### 1. "Get or Create Conversation" 節點

先查詢現有的 conversation，並加入 Admin Token：

```javascript
GET http://pocketbase-convo.zeabur.internal:8090/api/collections/conversations/records
Query: filter=guest_session_id="{{sessionId}}" && platform="umio"
Headers: Authorization: Bearer {{$env.POCKETBASE_ADMIN_TOKEN}}
```

### 2. "Conversation Exists?" IF 節點

檢查是否已存在 conversation：

```javascript
// 條件: $json.totalItems > 0
// True: 使用現有 conversation
// False: 建立新 conversation
```

### 3. "Create Conversation" 節點

如果不存在，建立新的 conversation：

```javascript
POST http://pocketbase-convo.zeabur.internal:8090/api/collections/conversations/records
Headers: Authorization: Bearer {{$env.POCKETBASE_ADMIN_TOKEN}}
Body: {
  guest_session_id: sessionId,
  platform: "umio",
  status: "active"
}
```

### 4. "Store User Message" 節點

儲存訊息到正確的 conversation：

```javascript
POST http://pocketbase-convo.zeabur.internal:8090/api/collections/messages/records
Headers: Authorization: Bearer {{$env.POCKETBASE_ADMIN_TOKEN}}
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

---

## 如何取得 PocketBase Admin Token

1. 登入 PocketBase Admin UI
2. 進入 "Settings" → "Admin"
3. 複製 Admin 的 JWT Token，或建立一個新的 API Key
4. 在 n8n 的 Environment Variables 中加入：
   ```bash
   POCKETBASE_ADMIN_TOKEN=your_token_here
   ```

---

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

---

## 部署步驟

1. **設定 n8n 環境變數**：
   ```bash
   POCKETBASE_ADMIN_TOKEN=eyJhbGciOiJIUzI1NiIs...
   ```

2. **在 n8n 中刪除舊的 workflow**：刪除 "WebChat Umio Integration"

3. **匯入修正後的 workflow**：`webchat-umio-integration-workflow-fixed.json`

4. **設定 Telegram API credentials**

5. **啟用 workflow**

6. **測試發送訊息**

---

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
- ✅ 查詢/建立 conversation 記錄
- ✅ 儲存 user message 到 PocketBase
- ✅ 發送到 Telegram 群組
- ✅ 返回成功回應

---

## 常見錯誤排查

| 錯誤 | 原因 | 解決方案 |
|------|------|----------|
| 403 Forbidden | 缺少 Admin Token | 設定 `POCKETBASE_ADMIN_TOKEN` 環境變數 |
| 404 Not Found | 欄位名稱錯誤或缺少 relation | 使用正確的 `guest_session_id` 和 `conversation` 欄位 |
| 400 Bad Request | 缺少必填欄位 | 確保所有必填欄位都有值 |
