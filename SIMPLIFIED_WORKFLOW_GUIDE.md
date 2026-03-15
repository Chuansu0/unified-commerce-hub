# 簡化版 Message Router Workflow

**日期：** 2026-03-15  
**策略：** 移除有問題的 Code 節點，使用原生 Set 節點

## 🔍 問題總結

經過多次嘗試，發現 n8n 環境中的 Code 節點持續超時（60秒），無論：
- ✗ 移除亂碼字元
- ✗ 改為 typeVersion 1
- ✗ 簡化代碼邏輯

所有嘗試都失敗，表示 Code 節點在當前環境中有根本性問題。

## ✅ 解決方案

**使用 Set 節點替代 Code 節點**

### Workflow 結構：

```
Webhook → Set Default Routing → Create Workflow Record → Respond to Webhook
```

### 節點說明：

1. **Webhook** - 接收 POST 請求
2. **Set Default Routing** - 設定固定值：
   - agents: ["main"]
   - workflowType: "single"
3. **Create Workflow Record** - 建立 PocketBase 記錄
4. **Respond to Webhook** - 返回成功回應

## 📝 匯入步驟

1. **登入 n8n**
   ```
   https://n8n.neovega.cc
   ```

2. **刪除舊的 Message Router workflow**

3. **匯入簡化版 workflow**
   - 選擇 `n8n/message-router-workflow-simple.json`

4. **發布 workflow**
   - Webhook URL: `https://n8n.neovega.cc/webhook/message-router`

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

## 📊 預期結果

```json
{
  "success": true,
  "workflow_id": "xxx",
  "agents": ["main"],
  "workflow_type": "single"
}
```

## 🔄 後續改進

一旦基本流程能夠運行，可以考慮：

1. **使用 Switch 節點** - 根據關鍵字路由到不同 agents
2. **使用外部 API** - 呼叫外部服務進行意圖分析
3. **使用 Function 節點** - 如果環境支援的話

## 📌 重要提醒

此版本將所有訊息都路由到 `main` agent，不進行複雜的意圖分析。這是為了先驗證基礎架構是否正常運作。
