# 階段 2：訊息路由引擎整合測試指南

**日期：** 2026-03-15  
**狀態：** 🚀 進行中

## 📋 測試目標

驗證 message-router 和 agent execution workflows 的功能，確保：
1. ✅ 訊息能正確路由到對應的 agent
2. ✅ Sequential workflow 能正確執行（Linus → Andrea）
3. ✅ Parallel workflow 能正確執行（同時查詢多個 agents）
4. ✅ 錯誤處理機制正常運作

## 🔧 前置準備

### 1. 確認 Workflows 已發布

**已發布的 Webhook URLs：**
- Message Router: `https://n8n.neovega.cc/webhook/message-router`
- Sequential Execution: `https://n8n.neovega.cc/webhook/sequential-execution`
- Parallel Execution: `https://n8n.neovega.cc/webhook/parallel-execution`

### 2. 確認服務狀態

```powershell
# 測試 PocketBase
Invoke-WebRequest -Uri "https://pocketbase.neovega.cc/api/health" -UseBasicParsing

# 測試 OpenClaw HTTP Bridge
Invoke-WebRequest -Uri "https://openclaw-http-bridge.neovega.cc/health" -UseBasicParsing

# 測試 n8n webhooks
Invoke-WebRequest -Uri "https://n8n.neovega.cc/webhook/message-router" -Method POST -Body '{"test":"ping"}' -ContentType "application/json" -UseBasicParsing
```

## 📝 測試案例

### 測試 1：單一 Agent 路由（Linus）

**目的：** 驗證訊息能正確路由到 Linus agent

**測試數據：**
```json
{
  "conversation_id": "test_conv_001",
  "message": "Please help me deploy the infrastructure and set up the database server",
  "user_id": "test_user",
  "timestamp": "2026-03-15T09:00:00Z"
}
```

**執行命令：**
```powershell
$body = @{
  conversation_id = "test_conv_001"
  message = "Please help me deploy the infrastructure and set up the database server"
  user_id = "test_user"
  timestamp = "2026-03-15T09:00:00Z"
} | ConvertTo-Json

Invoke-WebRequest -Uri "https://n8n.neovega.cc/webhook/message-router" -Method POST -Body $body -ContentType "application/json" -UseBasicParsing
```

**預期結果：**
- ✅ Message Router 識別關鍵字：`infrastructure`, `deploy`, `database`
- ✅ 路由到 `linus` agent
- ✅ 建立 workflow record（workflow_type: "single", agents: ["linus"]）
- ✅ 呼叫 OpenClaw HTTP Bridge 的 linus agent
- ✅ 回應儲存到 PocketBase messages collection

**驗證方式：**
```powershell
# 查詢 agent_workflows collection
$token = "YOUR_ADMIN_TOKEN"
$headers = @{"Authorization" = "Bearer $token"}
Invoke-WebRequest -Uri "https://pocketbase.neovega.cc/api/collections/agent_workflows/records?filter=(conversation_id='test_conv_001')" -Headers $headers -UseBasicParsing
```

---

### 測試 2：單一 Agent 路由（Andrea）

**目的：** 驗證訊息能正確路由到 Andrea agent

**測試數據：**
```json
{
  "conversation_id": "test_conv_002",
  "message": "I need executive approval for the new business strategy and decision on the budget allocation",
  "user_id": "test_user",
  "timestamp": "2026-03-15T09:05:00Z"
}
```

**執行命令：**
```powershell
$body = @{
  conversation_id = "test_conv_002"
  message = "I need executive approval for the new business strategy and decision on the budget allocation"
  user_id = "test_user"
  timestamp = "2026-03-15T09:05:00Z"
} | ConvertTo-Json

Invoke-WebRequest -Uri "https://n8n.neovega.cc/webhook/message-router" -Method POST -Body $body -ContentType "application/json" -UseBasicParsing
```

**預期結果：**
- ✅ Message Router 識別關鍵字：`executive`, `approval`, `decision`, `strategy`
- ✅ 路由到 `andrea` agent
- ✅ 建立 workflow record（workflow_type: "single", agents: ["andrea"]）

---

### 測試 3：Sequential Workflow（Linus → Andrea）

**目的：** 驗證順序執行工作流程，Linus 先分析技術問題，Andrea 基於分析結果做決策

**測試數據：**
```json
{
  "conversation_id": "test_conv_003",
  "message": "We need to deploy a new infrastructure for the database server. Please analyze the technical requirements and get executive approval for the budget.",
  "user_id": "test_user",
  "timestamp": "2026-03-15T09:10:00Z"
}
```

**執行命令：**
```powershell
$body = @{
  conversation_id = "test_conv_003"
  message = "We need to deploy a new infrastructure for the database server. Please analyze the technical requirements and get executive approval for the budget."
  user_id = "test_user"
  timestamp = "2026-03-15T09:10:00Z"
} | ConvertTo-Json

Invoke-WebRequest -Uri "https://n8n.neovega.cc/webhook/message-router" -Method POST -Body $body -ContentType "application/json" -UseBasicParsing
```

**預期結果：**
- ✅ Message Router 識別需要兩個 agents：`linus` 和 `andrea`
- ✅ 選擇 workflow_type: "sequential"
- ✅ 建立 workflow record
- ✅ 觸發 Sequential Execution workflow
- ✅ 步驟 1：呼叫 Linus agent 分析技術需求
- ✅ 步驟 2：將 Linus 的回應作為上下文，呼叫 Andrea agent 做決策
- ✅ 最終回應包含兩個 agent 的結果（Andrea 的回應已包含 Linus 的分析）

**驗證方式：**
```powershell
# 查詢 workflow record，檢查 results 欄位
$token = "YOUR_ADMIN_TOKEN"
$headers = @{"Authorization" = "Bearer $token"}
$response = Invoke-WebRequest -Uri "https://pocketbase.neovega.cc/api/collections/agent_workflows/records?filter=(conversation_id='test_conv_003')" -Headers $headers -UseBasicParsing
$workflow = ($response.Content | ConvertFrom-Json).items[0]

# 檢查 results 應該包含兩個 agent 的回應
Write-Output "Workflow Type: $($workflow.workflow_type)"
Write-Output "Agents: $($workflow.agents)"
Write-Output "Status: $($workflow.status)"
Write-Output "Results: $($workflow.results)"
```

---

### 測試 4：Parallel Workflow（同時查詢）

**目的：** 驗證平行執行工作流程，同時查詢多個 agents 並合併回應

**測試數據：**
```json
{
  "conversation_id": "test_conv_004",
  "message": "What are the infrastructure requirements and what is the executive perspective on this project?",
  "user_id": "test_user",
  "timestamp": "2026-03-15T09:15:00Z",
  "workflow_type": "parallel"
}
```

**執行命令：**
```powershell
$body = @{
  conversation_id = "test_conv_004"
  message = "What are the infrastructure requirements and what is the executive perspective on this project?"
  user_id = "test_user"
  timestamp = "2026-03-15T09:15:00Z"
  workflow_type = "parallel"
} | ConvertTo-Json

Invoke-WebRequest -Uri "https://n8n.neovega.cc/webhook/message-router" -Method POST -Body $body -ContentType "application/json" -UseBasicParsing
```

**預期結果：**
- ✅ Message Router 識別需要兩個 agents
- ✅ 使用 workflow_type: "parallel"（或手動指定）
- ✅ 觸發 Parallel Execution workflow
- ✅ 同時呼叫 Linus 和 Andrea agents
- ✅ 合併兩個 agent 的回應
- ✅ 最終回應包含兩個獨立的 agent 回應

---

### 測試 5：錯誤處理（Agent 不可用）

**目的：** 驗證當 OpenClaw HTTP Bridge 不可用時的錯誤處理

**執行命令：**
```powershell
# 先停止 OpenClaw HTTP Bridge（或使用錯誤的 URL）
# 然後發送測試訊息
$body = @{
  conversation_id = "test_conv_005"
  message = "Test error handling"
  user_id = "test_user"
  timestamp = "2026-03-15T09:20:00Z"
} | ConvertTo-Json

Invoke-WebRequest -Uri "https://n8n.neovega.cc/webhook/message-router" -Method POST -Body $body -ContentType "application/json" -UseBasicParsing
```

**預期結果：**
- ✅ Workflow 捕獲錯誤
- ✅ 更新 workflow record 的 status 為 "failed"
- ✅ 記錄錯誤訊息到 error 欄位
- ✅ 回傳友善的錯誤訊息給用戶

---

## 🔍 故障排除

### 問題 1：Workflow 沒有觸發

**可能原因：**
- Webhook URL 不正確
- Workflow 未發布或已停用
- n8n 服務異常

**解決方式：**
1. 檢查 n8n workflow 狀態（是否已發布）
2. 檢查 webhook URL 是否正確
3. 查看 n8n 執行日誌

### 問題 2：Agent 沒有回應

**可能原因：**
- OpenClaw HTTP Bridge 不可用
- Agent 名稱不正確
- 網路連線問題

**解決方式：**
1. 測試 OpenClaw HTTP Bridge 健康狀態
2. 檢查 agent 名稱是否正確（linus, andrea, main）
3. 查看 n8n workflow 執行日誌

### 問題 3：PocketBase 寫入失敗

**可能原因：**
- PocketBase 權限設定不正確
- Collection schema 不匹配
- 網路連線問題

**解決方式：**
1. 檢查 PocketBase collection 權限
2. 驗證 schema 是否正確
3. 測試 PocketBase API 連線

---

## ✅ 測試檢查清單

- [ ] 測試 1：單一 Agent 路由（Linus）
- [ ] 測試 2：單一 Agent 路由（Andrea）
- [ ] 測試 3：Sequential Workflow（Linus → Andrea）
- [ ] 測試 4：Parallel Workflow（同時查詢）
- [ ] 測試 5：錯誤處理（Agent 不可用）

**完成所有測試後，進入階段 3：與現有系統整合**

---

**下一步：** 整合到 WebChat 和 Telegram 群組
