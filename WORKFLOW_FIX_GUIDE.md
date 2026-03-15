# Message Router Workflow 修復指南

**日期：** 2026-03-15  
**問題：** Analyze Intent 節點超時 + Create Workflow Record URL 錯誤

## 🔧 已修復的問題

### 1. PocketBase URL 錯誤
- ❌ 舊：`http://pocketbase.zeabur.internal:8090/api/...`
- ✅ 新：`https://pocketbase.neovega.cc/api/...`

### 2. jsonBody 格式錯誤
- ❌ 舊：使用錯誤的模板語法 `{{ }}` 和 `JSON.stringify()`
- ✅ 新：使用正確的 n8n 表達式 `={{ }}`

## 📝 重新匯入步驟

1. **登入 n8n**
   ```
   https://n8n.neovega.cc
   ```

2. **刪除舊的 Message Router workflow**
   - 開啟 Message Router workflow
   - 點擊右上角的 "..." 選單
   - 選擇 "Delete"

3. **匯入修正後的 workflow**
   - 點擊 "+" 建立新 workflow
   - 點擊右上角的 "..." 選單
   - 選擇 "Import from File"
   - 選擇 `n8n/message-router-workflow.json`

4. **發布 workflow**
   - 點擊右上角的 "Publish" 按鈕
   - 確認 webhook URL 仍然是：`https://n8n.neovega.cc/webhook/message-router`

## 🧪 重新測試

執行測試腳本：
```powershell
.\test-stage2.ps1
```

## 🔍 如果仍然超時

如果 Analyze Intent 節點仍然超時，可能需要：

### 方案 1：簡化 Code 節點
將複雜的關鍵字分析改為簡單的邏輯：

```javascript
const message = $input.item.json.message || '';
const conversationId = $input.item.json.conversation_id;

// 簡化版本：只檢查幾個關鍵字
let agents = ['main'];
let workflowType = 'single';

if (message.toLowerCase().includes('infrastructure') || 
    message.toLowerCase().includes('deploy')) {
  agents = ['linus'];
}

if (message.toLowerCase().includes('executive') || 
    message.toLowerCase().includes('approval')) {
  agents = ['andrea'];
}

return {
  json: {
    message,
    conversation_id: conversationId,
    agents,
    workflowType,
    timestamp: new Date().toISOString()
  }
};
```

### 方案 2：使用 Switch 節點替代 Code 節點
- 使用 n8n 的 Switch 節點根據關鍵字路由
- 避免使用 Code 節點

### 方案 3：增加超時設定
- 在 Code 節點的設定中增加 timeout 時間
- 或在 n8n 環境變數中調整全域 timeout

## 📊 驗證成功標準

- ✅ Webhook 接收訊息
- ✅ Analyze Intent 成功執行（不超時）
- ✅ Create Workflow Record 成功建立記錄
- ✅ 回應包含 workflow_id 和 agents 資訊
