# Code 節點 TypeVersion 修復

**日期：** 2026-03-15  
**問題：** Analyze Intent 節點持續超時（60秒）

## 🔍 根本原因

**Code 節點的 typeVersion 2 執行問題**

即使移除了亂碼字元，Analyze Intent 節點仍然超時。問題在於 n8n 的 Code 節點 typeVersion 2 在某些環境下有執行問題。

## ✅ 修復方案

將 Code 節點從 **typeVersion 2** 改為 **typeVersion 1**

### 主要變更：

**typeVersion 2 語法（有問題）：**
```javascript
const message = $input.item.json.message || '';
// 直接訪問當前項目
```

**typeVersion 1 語法（穩定）：**
```javascript
for (const item of items) {
  const message = item.json.message || '';
  // 遍歷 items 數組
}
return items;
```

## 📝 重新匯入步驟

1. 登入 n8n: https://n8n.neovega.cc
2. 刪除舊的 Message Router workflow
3. 匯入修正後的 `n8n/message-router-workflow.json`
4. 發布 workflow

## 🧪 測試

```powershell
# 單一測試
$body = @{
    conversation_id = "test_conv_001"
    message = "Please help me deploy the infrastructure"
    user_id = "test_user"
    timestamp = (Get-Date -Format "yyyy-MM-ddTHH:mm:ssZ")
} | ConvertTo-Json

Invoke-WebRequest -Uri "https://n8n.neovega.cc/webhook/message-router" -Method POST -Body $body -ContentType "application/json" -UseBasicParsing
```

## 📊 預期結果

- ✅ Analyze Intent 節點不再超時
- ✅ Workflow 成功執行
- ✅ 返回包含 workflow_id 和 agents 的 JSON 回應
