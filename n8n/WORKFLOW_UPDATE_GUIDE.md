# n8n Workflow 更新指南

## 問題

PocketBase schema 與 n8n workflow 欄位名稱不匹配：

| n8n (舊) | PocketBase (正確) |
|---------|------------------|
| `session_id` | `telegram_chat_id` (在 conversations) |
| `role` | `sender` |
| `platform` | `channel` |
| 直接寫入 messages | 需要先建立/查詢 conversation |

## 解決方案

需要更新 n8n workflow，加入 conversation 邏輯。

## 手動更新步驟

### 1. 登入 n8n

開啟 https://n8n.neovega.cc

### 2. 更新 "WebChat Inbound Handler" Workflow

#### 步驟 2.1: 新增 "Find Conversation" 節點

在 "Format Message Data" 之後，新增 HTTP Request 節點：

- **Name**: `Find Conversation`
- **Method**: `GET`
- **URL**: `http://pocketbase.zeabur.internal:8090/api/collections/conversations/records`
- **Send Query**: `true`
- **Query Parameters**:
  - `filter`: `=(telegram_chat_id='{{ $json.sessionId }}')`

#### 步驟 2.2: 新增 "Conversation Exists?" 條件節點

- **Name**: `Conversation Exists?`
- **Type**: If
- **Condition**:
  - `{{ $json.totalItems }}` > `0`

#### 步驟 2.3: 新增 "Create Conversation" 節點 (False 分支)

- **Name**: `Create Conversation`
- **Method**: `POST`
- **URL**: `http://pocketbase.zeabur.internal:8090/api/collections/conversations/records`
- **Body**:
```json
{
  "telegram_chat_id": "={{ $node['Format Message Data'].json.sessionId }}",
  "platform": "web",
  "status": "active",
  "last_message": "={{ $node['Format Message Data'].json.message }}",
  "last_message_at": "={{ $node['Format Message Data'].json.timestamp }}"
}
```

#### 步驟 2.4: 新增 "Extract Conversation ID" 節點 (True 分支)

- **Name**: `Extract Conversation ID`
- **Type**: Set
- **Fields**:
  - `conversationId`: `={{ $json.items[0].id }}`

#### 步驟 2.5: 新增 "Extract New Conversation ID" 節點

- **Name**: `Extract New Conversation ID`
- **Type**: Set
- **Fields**:
  - `conversationId`: `={{ $json.id }}`

#### 步驟 2.6: 更新 "Store Message" 節點

修改現有的 HTTP Request 節點：

- **Name**: `Store Message`
- **Method**: `POST`
- **URL**: `http://pocketbase.zeabur.internal:8090/api/collections/messages/records`
- **Body**:
```json
{
  "conversation": "={{ $json.conversationId }}",
  "sender": "user",
  "channel": "={{ $node['Format Message Data'].json.platform }}",
  "content": "={{ $node['Format Message Data'].json.message }}"
}
```

### 3. 更新連接

新的連接順序：

```
Format Message Data
    ├──→ Find Conversation
    │       └──→ Conversation Exists?
    │               ├──→ (True) Extract Conversation ID ──→ Store Message
    │               └──→ (False) Create Conversation
    │                       └──→ Extract New Conversation ID ──→ Store Message
    │
    └──→ Send to Telegram Group
            └──→ Respond to Webhook
```

### 4. 更新 Telegram 訊息

修改 "Send to Telegram Group"：

```
🌐 WebChat: {{ $node["Format Message Data"].json.message }}
💬 回覆此訊息以回覆客戶
```

### 5. 儲存並測試

1. 點擊 **Save**
2. 點擊 **Active** toggle 啟動 workflow
3. 測試 webhook

## 簡化替代方案

如果不想修改這麼多節點，可以暫時 **跳過 PocketBase 儲存**，只發送到 Telegram：

1. 刪除 "Store to PocketBase" 節點
2. 直接從 "Format Message Data" 連接到 "Send to Telegram Group"
3. 這樣訊息會轉發到 Telegram，但不會儲存到 PocketBase

## 測試

更新後測試：

```bash
curl -X POST https://www.neovega.cc/api/webhook/chat-inbound \
  -H "Content-Type: application/json" \
  -d '{"sessionId":"test-123","message":"測試訊息","platform":"webchat"}'
```

## 預期結果

✅ HTTP 200 回應  
✅ Telegram 群組收到訊息  
✅ PocketBase conversations collection 新增記錄  
✅ PocketBase messages collection 新增記錄