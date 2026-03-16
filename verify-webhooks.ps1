# 驗證所有 bots 的 webhook 狀態
Write-Host "驗證 Webhook 狀態..." -ForegroundColor Cyan
Write-Host ""

# OpenClaw
Write-Host "OpenClaw:" -ForegroundColor Yellow
$info = Invoke-RestMethod -Uri "https://api.telegram.org/bot8233862780:AAG-Eq1HLcdGvQ8lNtXO8mAqfSM2Fweq7OI/getWebhookInfo"
Write-Host "  URL: $($info.result.url)" -ForegroundColor $(if ($info.result.url -eq "") { "Green" }else { "Red" })

# Andrea
Write-Host "Andrea:" -ForegroundColor Yellow
$info = Invoke-RestMethod -Uri "https://api.telegram.org/bot8647752152:AAFt7U18c_BfVf5zEKW-TMZD41NDtUOHx-Y/getWebhookInfo"
Write-Host "  URL: $($info.result.url)" -ForegroundColor $(if ($info.result.url -eq "") { "Green" }else { "Red" })

# Umio
Write-Host "Umio:" -ForegroundColor Yellow
$info = Invoke-RestMethod -Uri "https://api.telegram.org/bot8751641141:AAGeQKXV4WvOguP4H5UpUWegVcq2obdzIVw/getWebhookInfo"
Write-Host "  URL: $($info.result.url)" -ForegroundColor $(if ($info.result.url -eq "") { "Green" }else { "Red" })

# Lele
Write-Host "Lele:" -ForegroundColor Yellow
$info = Invoke-RestMethod -Uri "https://api.telegram.org/bot8719719797:AAERwcAQFWWpNxLTpG8cKNSfy24uMdZqsyQ/getWebhookInfo"
Write-Host "  URL: $($info.result.url)" -ForegroundColor $(if ($info.result.url -eq "") { "Green" }else { "Red" })

# Linus
Write-Host "Linus:" -ForegroundColor Yellow
$info = Invoke-RestMethod -Uri "https://api.telegram.org/bot8672162699:AAEyEDVYYIKEA7-oT59upjvuCi7z_ci98gs/getWebhookInfo"
Write-Host "  URL: $($info.result.url)" -ForegroundColor $(if ($info.result.url -eq "") { "Green" }else { "Red" })

# Mako
Write-Host "Mako:" -ForegroundColor Yellow
$info = Invoke-RestMethod -Uri "https://api.telegram.org/bot8781354977:AAF8oQAaefSvxQWGkMR4m-hdOlsMmUPgkiY/getWebhookInfo"
Write-Host "  URL: $($info.result.url)" -ForegroundColor $(if ($info.result.url -eq "") { "Green" }else { "Red" })

Write-Host ""
Write-Host "✅ 驗證完成！空 URL 表示無 webhook（正確狀態）" -ForegroundColor Green
