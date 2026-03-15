# Webhook Bridge 互動式診斷腳本

Write-Host "=== Webhook Bridge 服務診斷 ===" -ForegroundColor Cyan
Write-Host ""

# 1. 檢查 DNS
Write-Host "1. 檢查自訂網域 DNS..." -ForegroundColor Yellow
try {
    $dns = Resolve-DnsName webhook-bridge.neovega.cc -ErrorAction Stop
    Write-Host "✓ DNS 解析成功: $($dns.IPAddress)" -ForegroundColor Green
    $useCustomDomain = $true
}
catch {
    Write-Host "✗ DNS 解析失敗 - 自訂網域尚未配置" -ForegroundColor Red
    $useCustomDomain = $false
}

Write-Host ""

# 2. 提示輸入 Zeabur 預設網域
if (-not $useCustomDomain) {
    Write-Host "2. 請輸入 Zeabur 預設網域" -ForegroundColor Yellow
    Write-Host "   (在 Zeabur Dashboard → webhook-bridge → Networking 中查看)" -ForegroundColor Gray
    Write-Host ""
    $url = Read-Host "   URL (例如: https://webhook-bridge-xxx.zeabur.app)"
    
    if (-not $url) {
        Write-Host "✗ 未輸入 URL，結束診斷" -ForegroundColor Red
        exit 1
    }
}
else {
    $url = "https://webhook-bridge.neovega.cc"
}

Write-Host ""

# 3. 測試健康檢查
Write-Host "3. 測試服務健康檢查..." -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "$url/health"
    Write-Host "✓ 服務運行正常!" -ForegroundColor Green
    Write-Host "   狀態: $($health.status)" -ForegroundColor Gray
    Write-Host "   服務: $($health.service)" -ForegroundColor Gray
}
catch {
    Write-Host "✗ 服務無法訪問" -ForegroundColor Red
    Write-Host "   錯誤: $($_.Exception.Message)" -ForegroundColor Gray
    Write-Host ""
    Write-Host "請檢查:" -ForegroundColor Yellow
    Write-Host "  1. Zeabur 服務是否正在運行" -ForegroundColor Gray
    Write-Host "  2. URL 是否正確" -ForegroundColor Gray
    Write-Host "  3. 環境變數是否已設定" -ForegroundColor Gray
    exit 1
}

Write-Host ""
Write-Host "=== 診斷完成 ===" -ForegroundColor Green
Write-Host ""
Write-Host "下一步:" -ForegroundColor Cyan
Write-Host "  1. 更新測試腳本中的 URL" -ForegroundColor Gray
Write-Host "  2. 執行完整測試: .\test-webhook-bridge-e2e.ps1" -ForegroundColor Gray
Write-Host ""
Write-Host "服務 URL: $url" -ForegroundColor Yellow
