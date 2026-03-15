# 階段 2 整合測試腳本
# 日期：2026-03-15

Write-Host "=== 階段 2：訊息路由引擎整合測試 ===" -ForegroundColor Cyan
Write-Host ""

# 設定變數
$messageRouterUrl = "https://n8n.neovega.cc/webhook/message-router"
$pocketbaseUrl = "https://pocketbase.neovega.cc/api"

# 測試 1：單一 Agent 路由（Linus）
Write-Host "測試 1：單一 Agent 路由（Linus）" -ForegroundColor Yellow
$body1 = @{
    conversation_id = "test_conv_001"
    message         = "Please help me deploy the infrastructure and set up the database server"
    user_id         = "test_user"
    timestamp       = (Get-Date -Format "yyyy-MM-ddTHH:mm:ssZ")
} | ConvertTo-Json

try {
    $response1 = Invoke-WebRequest -Uri $messageRouterUrl -Method POST -Body $body1 -ContentType "application/json" -UseBasicParsing
    Write-Host "✅ 測試 1 成功！StatusCode: $($response1.StatusCode)" -ForegroundColor Green
    Write-Host "回應: $($response1.Content)" -ForegroundColor Gray
}
catch {
    Write-Host "❌ 測試 1 失敗：$($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# 測試 2：單一 Agent 路由（Andrea）
Write-Host "測試 2：單一 Agent 路由（Andrea）" -ForegroundColor Yellow
$body2 = @{
    conversation_id = "test_conv_002"
    message         = "I need executive approval for the new business strategy and decision on the budget allocation"
    user_id         = "test_user"
    timestamp       = (Get-Date -Format "yyyy-MM-ddTHH:mm:ssZ")
} | ConvertTo-Json

try {
    $response2 = Invoke-WebRequest -Uri $messageRouterUrl -Method POST -Body $body2 -ContentType "application/json" -UseBasicParsing
    Write-Host "✅ 測試 2 成功！StatusCode: $($response2.StatusCode)" -ForegroundColor Green
    Write-Host "回應: $($response2.Content)" -ForegroundColor Gray
}
catch {
    Write-Host "❌ 測試 2 失敗：$($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# 測試 3：Sequential Workflow（Linus → Andrea）
Write-Host "測試 3：Sequential Workflow（Linus → Andrea）" -ForegroundColor Yellow
$body3 = @{
    conversation_id = "test_conv_003"
    message         = "We need to deploy a new infrastructure for the database server. Please analyze the technical requirements and get executive approval for the budget."
    user_id         = "test_user"
    timestamp       = (Get-Date -Format "yyyy-MM-ddTHH:mm:ssZ")
} | ConvertTo-Json

try {
    $response3 = Invoke-WebRequest -Uri $messageRouterUrl -Method POST -Body $body3 -ContentType "application/json" -UseBasicParsing
    Write-Host "✅ 測試 3 成功！StatusCode: $($response3.StatusCode)" -ForegroundColor Green
    Write-Host "回應: $($response3.Content)" -ForegroundColor Gray
}
catch {
    Write-Host "❌ 測試 3 失敗：$($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# 測試 4：Parallel Workflow（同時查詢）
Write-Host "測試 4：Parallel Workflow（同時查詢）" -ForegroundColor Yellow
$body4 = @{
    conversation_id = "test_conv_004"
    message         = "What are the infrastructure requirements and what is the executive perspective on this project?"
    user_id         = "test_user"
    timestamp       = (Get-Date -Format "yyyy-MM-ddTHH:mm:ssZ")
    workflow_type   = "parallel"
} | ConvertTo-Json

try {
    $response4 = Invoke-WebRequest -Uri $messageRouterUrl -Method POST -Body $body4 -ContentType "application/json" -UseBasicParsing
    Write-Host "✅ 測試 4 成功！StatusCode: $($response4.StatusCode)" -ForegroundColor Green
    Write-Host "回應: $($response4.Content)" -ForegroundColor Gray
}
catch {
    Write-Host "❌ 測試 4 失敗：$($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

Write-Host "=== 測試完成 ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "下一步：" -ForegroundColor Yellow
Write-Host "1. 登入 PocketBase Admin UI 查看 agent_workflows collection"
Write-Host "2. 登入 n8n 查看 workflow 執行日誌"
Write-Host "3. 驗證錯誤處理機制"
