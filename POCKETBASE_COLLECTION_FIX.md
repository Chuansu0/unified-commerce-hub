# PocketBase Collection 修復指南

**問題：** Create Workflow Record 節點失敗（Bad request）  
**原因：** collection 定義中的 `conversation` 欄位是 relation 類型，但 workflow 傳送的是字串

## ✅ 解決方案

使用修正版的 collection 定義：`pocketbase/agent_workflows_fixed.json`

**主要變更：**
- `conversation` (relation) → `conversation_id` (text)

## 📝 匯入步驟

### 1. 登入 PocketBase Admin
```
https://pocketbase.neovega.cc/_/
```

### 2. 刪除舊的 agent_workflows collection（如果存在）
- 進入 Collections
- 找到 `agent_workflows`
- 點擊右側的 "..." → Delete
- 確認刪除

### 3. 建立新的 agent_workflows collection

**方法 A：手動建立（推薦）**

1. 點擊 "New collection"
2. 選擇 "Base collection"
3. Name: `agent_workflows`
4. 添加以下欄位：

| 欄位名稱 | 類型 | 必填 | 選項 |
|---------|------|------|------|
| conversation_id | Text | ✓ | - |
| workflow_type | Select | ✓ | single, sequential, parallel |
| agents | JSON | ✓ | - |
| status | Select | ✓ | pending, in_progress, completed, failed |
| current_agent_index | Number | ✗ | - |
| results | JSON | ✗ | - |
| error | Text | ✗ | - |

5. API Rules 設定為空（允許所有操作）
6. 儲存

**方法 B：使用 API 匯入**

```powershell
# 讀取 JSON 文件
$json = Get-Content "pocketbase/agent_workflows_fixed.json" -Raw

# 發送 POST 請求（需要 Admin 認證）
Invoke-WebRequest -Uri "https://pocketbase.neovega.cc/api/collections" `
  -Method POST `
  -Body $json `
  -ContentType "application/json" `
  -Headers @{"Authorization"="Admin YOUR_ADMIN_TOKEN"}
```

## 🔄 更新 n8n Workflow

1. 登入 n8n (https://n8n.neovega.cc)
2. 開啟 Message Router workflow
3. 刪除舊的 workflow
4. 匯入更新後的 `n8n/message-router-workflow-simple.json`
5. 發布

## 🧪 測試

```powershell
$body = @{
    conversation_id = "test_conv_001"
    message = "Test message"
    user_id = "test_user"
    timestamp = (Get-Date -Format "yyyy-MM-ddTHH:mm:ssZ")
} | ConvertTo-Json

Invoke-WebRequest -Uri "https://n8n.neovega.cc/webhook/message-router" `
  -Method POST `
  -Body $body `
  -ContentType "application/json" `
  -UseBasicParsing
```

## 📊 預期結果

```json
{
  "success": true,
  "workflow_id": "xxx",
  "agents": ["main"],
  "workflow_type": "single"
}
```
