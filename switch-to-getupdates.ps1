# 切換到 getUpdates 模式腳本
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "  切換到 getUpdates 模式" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""

# 步驟 1：刪除 Webhooks
Write-Host "步驟 1：刪除所有 Webhook 設定..." -ForegroundColor Yellow

$tokens = @{
    "OpenClaw" = $env:TELEGRAM_OPENCLAW_BOT_TOKEN
    "Andrea"   = $env:TELEGRAM_ANDREA_BOT_TOKEN
    "Umio"     = $env:TELEGRAM_UMIO_BOT_TOKEN
}

foreach ($bot in $tokens.Keys) {
    $token = $tokens[$bot]
    if ($token) {
        Write-Host "  刪除 $bot webhook..." -ForegroundColor Gray
        try {
            $response = Invoke-RestMethod -Uri "https://api.telegram.org/bot$token/deleteWebhook" -Method Post
            if ($response.ok) {
                Write-Host "  ✅ $bot webhook 已刪除" -ForegroundColor Green
            }
            else {
                Write-Host "  ⚠️  $bot webhook 刪除失敗：$($response.description)" -ForegroundColor Yellow
            }
        }
        catch {
            Write-Host "  ❌ $bot 錯誤：$($_.Exception.Message)" -ForegroundColor Red
        }
    }
    else {
        Write-Host "  ⚠️  $bot token 未設定，跳過" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "步驟 2：驗證 Webhook 狀態..." -ForegroundColor Yellow

foreach ($bot in $tokens.Keys) {
    $token = $tokens[$bot]
    if ($token) {
        try {
            $info = Invoke-RestMethod -Uri "https://api.telegram.org/bot$token/getWebhookInfo" -Method Get
            if ($info.result.url -eq "") {
                Write-Host "  ✅ $bot - 無 webhook（正確）" -ForegroundColor Green
            }
            else {
                Write-Host "  ⚠️  $bot - 仍有 webhook: $($info.result.url)" -ForegroundColor Yellow
            }
        }
        catch {
            Write-Host "  ❌ $bot 檢查失敗" -ForegroundColor Red
        }
    }
}

Write-Host ""
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "✅ 完成！" -ForegroundColor Green
Write-Host ""
Write-Host "下一步：" -ForegroundColor Yellow
Write-Host "1. 在 Zeabur 停用 webhook-bridge 服務" -ForegroundColor White
Write-Host "2. 確認所有 agents 使用 getUpdates 模式" -ForegroundColor White
Write-Host "3. 在 Telegram 測試所有 bots" -ForegroundColor White
Write-Host "==================================================" -ForegroundColor Cyan
