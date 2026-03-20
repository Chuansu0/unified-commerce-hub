# WebChat Umio Webhook 測試腳本 (UTF-8 編碼修正版)
# 使用方法: .\test-umio-webhook-fixed.ps1

# 設定 UTF-8 編碼
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$PSDefaultParameterValues['*:Encoding'] = 'utf8'

$webhookUrl = "https://n8n.neovega.cc/webhook/umio-chat-v6"

Write-Host "=== WebChat Umio Webhook 測試 ===" -ForegroundColor Cyan
Write-Host "Webhook URL: $webhookUrl" -ForegroundColor Gray
Write-Host ""

# 測試 1: 英文訊息
Write-Host "測試 1: 英文訊息..." -ForegroundColor Yellow
$body1 = @{
    message   = "Hello from PowerShell"
    sessionId = "test-en-$(Get-Random)"
    context   = @{
        platform = "webchat"
        userName = "TestUser"
    }
} | ConvertTo-Json -Compress

try {
    $response1 = Invoke-RestMethod -Uri $webhookUrl -Method POST -ContentType "application/json; charset=utf-8" -Body $body1
    Write-Host "✓ 回應: $($response1 | ConvertTo-Json)" -ForegroundColor Green
}
catch {
    Write-Host "✗ 錯誤: $_" -ForegroundColor Red
}
Write-Host ""

# 測試 2: 中文訊息（使用 UTF-8 編碼）
Write-Host "測試 2: 中文訊息..." -ForegroundColor Yellow

# 方法 A: 使用 Invoke-RestMethod 直接發送
try {
    $body2 = @{
        message   = "你好，這是測試訊息"
        sessionId = "test-zh-$(Get-Random)"
        context   = @{
            platform = "webchat"
            userName = "測試用戶"
        }
    } | ConvertTo-Json -Compress

    # 強制使用 UTF-8 編碼
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($body2)

    $response2 = Invoke-RestMethod -Uri $webhookUrl -Method POST `
        -ContentType "application/json; charset=utf-8" `
        -Body $bytes

    Write-Host "✓ 回應: $($response2 | ConvertTo-Json)" -ForegroundColor Green
}
catch {
    Write-Host "✗ 錯誤: $_" -ForegroundColor Red
}
Write-Host ""

# 測試 3: 使用 curl (如果可用)
Write-Host "測試 3: 使用 curl 發送中文..." -ForegroundColor Yellow
$jsonBody = '{"message":"使用 curl 的中文測試","sessionId":"test-curl-' + (Get-Random) + '","context":{"platform":"webchat","userName":"Curl用戶"}}'
$tempFile = [System.IO.Path]::GetTempFileName()
[System.IO.File]::WriteAllText($tempFile, $jsonBody, [System.Text.Encoding]::UTF8)

try {
    $curlOutput = curl -s -X POST $webhookUrl -H "Content-Type: application/json" -d "@$tempFile"
    Write-Host "✓ 回應: $curlOutput" -ForegroundColor Green
}
catch {
    Write-Host "✗ 錯誤: $_" -ForegroundColor Red
}
finally {
    Remove-Item $tempFile -ErrorAction SilentlyContinue
}

Write-Host ""
Write-Host "=== 測試完成 ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "注意事項:" -ForegroundColor Yellow
Write-Host "- 如果中文顯示為 ????，請檢查 PowerShell 版本和編碼設定" -ForegroundColor Gray
Write-Host "- 建議使用 PowerShell 7+ 獲得更好的 UTF-8 支援" -ForegroundColor Gray
Write-Host "- 或在 Windows Terminal 中執行此腳本" -ForegroundColor Gray
