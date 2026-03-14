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

---

## 問題 3：環境變數訪問被拒

```
access to env vars denied
If you need access please contact the administrator to remove the environment variable 'N8N_BLOCK_ENV_ACCESS_IN_NODE'
```

### 錯誤原因

n8n 的安全設定 `N8N_BLOCK_ENV_ACCESS_IN_NODE` 阻擋了使用 `$env` 變數。

---

## 修正方案：使用 n8n Credentials

由於 n8n 無法直接訪問環境變數，我們需要使用 **HTTP Header Auth** credential 來儲存 Admin Token。

### 步驟 1：建立 HTTP Header Auth Credential

在 n8n 中：

1. 點擊左側導航欄的 **Settings** → **Credentials**
2. 點擊 **Add Credential**
3. 選擇 **HTTP Header Auth**
4. 填寫：
   - **Name**: `pocketbase-admin-token`
   - **Name**: `Authorization`
   - **Value**: `Bearer YOUR_POCKETBASE_ADMIN_TOKEN`

### 步驟 2：更新 Workflow 使用 Credential

在 workflow JSON 中，所有 HTTP Request 節點需要設定：

```json
{
  "parameters": {
    "authentication": "genericCredentialType",
    "genericAuthType": "httpHeaderAuth"
  },
  "credentials": {
    "httpHeaderAuth": {
      "name": "pocketbase-admin-token",
      "id": ""
    }
  }
}
```

---

## 修正後的 Workflow 節點

### 1. "Get or Create Conversation" 節點

```json
{
  "id": "get-or-create-conversation",
  "name": "Get or Create Conversation",
  "type": "n8n-nodes-base.httpRequest",
  "parameters": {
    "method": "GET",
    "url": "http://pocketbase-convo.zeabur.internal:8090/api/collections/conversations/records",
    "sendQuery": true,
    "queryParameters": {
      "parameters": [
        {
          "name": "filter",
          "value": "={{ 'guest_session_id=\"' + $json.body.sessionId + '\" && platform=\"umio\"' }}"
        }
      ]
    },
    "authentication": "genericCredentialType",
    "genericAuthType": "httpHeaderAuth",
    "sendHeaders": true
  },
  "credentials": {
    "httpHeaderAuth": {
      "name": "pocketbase-admin-token",
      "id": ""
    }
  }
}
```

### 2. "Create Conversation" 節點

```json
{
  "id": "create-conversation",
  "name": "Create Conversation",
  "type": "n8n-nodes-base.httpRequest",
  "parameters": {
    "method": "POST",
    "url": "http://pocketbase-convo.zeabur.internal:8090/api/collections/conversations/records",
    "sendBody": true,
    "contentType": "application/json",
    "body": "={{ { guest_session_id: $('WebChat Webhook').item.json.body.sessionId, platform: 'umio', status: 'active' } }}",
    "authentication": "genericCredentialType",
    "genericAuthType": "httpHeaderAuth",
    "sendHeaders": true
  },
  "credentials": {
    "httpHeaderAuth": {
      "name": "pocketbase-admin-token",
      "id": ""
    }
  }
}
```

### 3. "Store User Message" 節點

```json
{
  "id": "store-user-msg",
  "name": "Store User Message",
  "type": "n8n-nodes-base.httpRequest",
  "parameters": {
    "method": "POST",
    "url": "http://pocketbase-convo.zeabur.internal:8090/api/collections/messages/records",
    "sendBody": true,
    "contentType": "application/json",
    "body": "={{ { conversation: $json.items && $json.items[0] ? $json.items[0].id : $json.id, sender: 'user', channel: 'web', content: $('WebChat Webhook').item.json.body.message, metadata: { agent: 'umio', platform: 'webchat', sessionId: $('WebChat Webhook').item.json.body.sessionId } } }}",
    "authentication": "genericCredentialType",
    "genericAuthType": "httpHeaderAuth",
    "sendHeaders": true
  },
  "credentials": {
    "httpHeaderAuth": {
      "name": "pocketbase-admin-token",
      "id": ""
    }
  }
}
```

---

## 如何取得 PocketBase Admin Token

1. 登入 PocketBase Admin UI
2. 進入 **Settings** → **Admin**
3. 複製 Admin 的 JWT Token
4. 在 n8n 建立 Credential 時使用：**`Bearer YOUR_TOKEN`**

---

## 部署步驟

1. **在 n8n 中建立 HTTP Header Auth Credential**：
   - Name: `pocketbase-admin-token`
   - Header Name: `Authorization`
   - Header Value: `Bearer YOUR_TOKEN`

2. **刪除舊的 workflow**：刪除 "WebChat Umio Integration"

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
| 403 Forbidden | 缺少 Admin Token | 建立 `pocketbase-admin-token` HTTP Header Auth credential |
| access to env vars denied | n8n 安全設定阻擋 | 使用 Credentials 而非環境變數 |
| 404 Not Found | 欄位名稱錯誤或缺少 relation | 使用正確的 `guest_session_id` 和 `conversation` 欄位 |
| 400 Bad Request | 缺少必填欄位 | 確保所有必填欄位都有值 |
