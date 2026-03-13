# n8n Webhook 診斷腳本

Write-Host "=== n8n Webhook 診斷 ===" -ForegroundColor Cyan
Write-Host ""

# 測試 1: 檢查 nginx 代理 (應該要通過)
Write-Host "1. 測試 nginx 代理 (/api/webhook/chat-inbound)..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "https://www.neovega.cc/api/webhook/chat-inbound" `
        -Method POST `
        -ContentType "application/json" `
        -Body '{"sessionId":"test-123","message":"診斷測試","platform":"webchat"}' `
        -UseBasicParsing `
        -TimeoutSec 10
    Write-Host "   狀態: $($response.StatusCode)" -ForegroundColor Green
    Write-Host "   回應: $($response.Content)" -ForegroundColor Gray
}
catch {
    Write-Host "   錯誤: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        Write-Host "   HTTP 狀態: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
    }
}

Write-Host ""

# 測試 2: 直接測試 n8n (繞過 nginx)
Write-Host "2. 測試直接連線 n8n (繞過 nginx)..." -ForegroundColor Yellow
Write-Host "   注意: 這需要 n8n 暴露公開端口或使用內部網路" -ForegroundColor Gray
Write-Host "   預期: 可能無法直接訪問 (這是正常的)" -ForegroundColor Gray

Write-Host ""

# 測試 3: 列出可能的問題
Write-Host "3. 常見問題檢查清單:" -ForegroundColor Yellow
Write-Host "   [ ] Workflow 已啟動 (Activated)?" -ForegroundColor White
Write-Host "   [ ] Webhook 節點已停止測試模式?" -ForegroundColor White
Write-Host "   [ ] n8n credential 已配置 Telegram Bot Token?" -ForegroundColor White
Write-Host "   [ ] 群組 ID (-1003806455231) 正確?" -ForegroundColor White
Write-Host "   [ ] Bot 已在該群組中?" -ForegroundColor White

Write-Host ""
Write-Host "=== 診斷完成 ===" -ForegroundColor Cyan
