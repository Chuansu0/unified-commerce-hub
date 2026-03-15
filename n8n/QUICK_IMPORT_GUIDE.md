# n8n Workflows 快速匯入指南

## 🎯 目標
將 3 個 workflow 文件匯入到 n8n 實例中以啟用訊息路由功能。

## 📋 需要匯入的 Workflows

1. **message-router-workflow.json** - 訊息路由器
2. **sequential-agent-execution-workflow.json** - 順序執行
3. **parallel-agent-execution-workflow.json** - 並行執行

## 🚀 匯入步驟

### 1. 登入 n8n
訪問：https://n8n.neovega.cc

### 2. 匯入 Workflow（重複 3 次）

對每個 workflow 文件執行以下步驟：

1. 點擊左上角 **"+"** 按鈕
2. 選擇 **"Import from File"** 或 **"Import from URL"**
3. 選擇對應的 JSON 文件
4. 點擊 **"Import"**
5. 檢查 workflow 節點配置
6. 點擊右上角 **"Save"** 保存
7. 點擊右上角 **"Active"** 切換開關啟用 workflow

### 3. 驗證 Webhook URLs

匯入後，確認以下 webhook URLs 可用：

```
Message Router: https://n8n.neovega.cc/webhook/message-router
Sequential: https://n8n.neovega.cc/webhook/sequential-agent
Parallel: https://n8n.neovega.cc/webhook/parallel-agent
```

### 4. 測試

使用以下命令測試 message-router：

```powershell
$body = Get-Content "test-message-router.json" -Raw
Invoke-WebRequest -Uri "https://n8n.neovega.cc/webhook/message-router" `
  -Method POST -Body $body -ContentType "application/json" -UseBasicParsing
```

## ⚠️ 注意事項

1. **PocketBase URL**: 確保 workflow 中的 PocketBase URL 為 `http://pocketbase.zeabur.internal:8090`
2. **Webhook 路徑**: 確保 webhook 節點的路徑正確（message-router, sequential-agent, parallel-agent）
3. **啟用狀態**: 所有 workflows 必須處於 "Active" 狀態

## 🔍 故障排除

如果 webhook 返回錯誤：
1. 檢查 workflow 執行日誌（n8n UI 中的 "Executions" 標籤）
2. 確認 PocketBase 可從 n8n 訪問
3. 檢查 agent_workflows collection 是否存在
4. 驗證 JSON 格式正確

---

**完成後通知我繼續測試！**
