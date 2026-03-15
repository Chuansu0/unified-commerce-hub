# 匯入簡化版 Message Router Workflow

**重要：** 請確認匯入的是 `message-router-workflow-simple.json`，不是 `message-router-workflow.json`

## 📋 匯入步驟

### 1. 登入 n8n
```
https://n8n.neovega.cc
```

### 2. 刪除舊的 Message Router workflow
- 在 workflow 列表中找到 "Message Router"
- 點擊右側的 "..." 選單
- 選擇 "Delete"
- 確認刪除

### 3. 匯入簡化版 workflow
- 點擊左上角的 "+" 按鈕建立新 workflow
- 點擊右上角的 "..." 選單
- 選擇 "Import from File"
- **重要：選擇 `n8n/message-router-workflow-simple.json`**
- 確認匯入

### 4. 驗證 workflow 結構
匯入後，您應該看到以下節點（**沒有** Analyze Intent）：
```
Webhook → Set Default Routing → Create Workflow Record → Respond to Webhook
```

**如果看到 "Analyze Intent" 節點，表示匯入錯誤！**

### 5. 發布 workflow
- 點擊右上角的 "Publish" 按鈕
- Webhook URL 應該是：`https://n8n.neovega.cc/webhook/message-router`

## 🧪 測試

```powershell
$body = @{
    conversation_id = "test_conv_001"
    message = "Test message"
    user_id = "test_user"
    timestamp = (Get-Date -Format "yyyy-MM-ddTHH:mm:ssZ")
} | ConvertTo-Json

Invoke-WebRequest -Uri "https://n8n.neovega.cc/webhook/message-router" -Method POST -Body $body -ContentType "application/json" -UseBasicParsing
```

## ✅ 預期結果

```json
{
  "success": true,
  "workflow_id": "xxx",
  "agents": ["main"],
  "workflow_type": "single"
}
```

## 🔍 檔案位置

- ✅ 正確：`d:\WSL\unified-commerce-hub\n8n\message-router-workflow-simple.json`
- ❌ 錯誤：`d:\WSL\unified-commerce-hub\n8n\message-router-workflow.json`
