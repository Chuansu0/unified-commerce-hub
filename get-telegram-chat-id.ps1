# 獲取 Telegram Chat ID 腳本
# 使用方法：
# 1. 先在 Telegram 向你的 bot 發送一條消息（例如 /start）
# 2. 執行此腳本獲取 chat_id

param(
    [string]$BotToken = $env:TELEGRAM_OPENCLAW_BOT_TOKEN
)

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "  Telegram Chat ID 獲取工具" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""

if (-not $BotToken) {
    Write-Host "❌ 錯誤：未提供 Bot Token" -ForegroundColor Red
    Write-Host ""
    Write-Host "使用方法：" -ForegroundColor Yellow
    Write-Host "  .\get-telegram-chat-id.ps1 -BotToken 'YOUR_BOT_TOKEN'" -ForegroundColor Yellow
    Write-Host "  或設定環境變數：" -ForegroundColor Yellow
    Write-Host "  `$env:TELEGRAM_OPENCLAW_BOT_TOKEN = 'YOUR_BOT_TOKEN'" -ForegroundColor Yellow
    exit 1
}

Write-Host "📡 正在獲取最近的更新..." -ForegroundColor Yellow
Write-Host ""

try {
    $url = "https://api.telegram.org/bot$BotToken/getUpdates"
    $response = Invoke-RestMethod -Uri $url -Method Get
    
    if ($response.ok -and $response.result.Count -gt 0) {
        Write-Host "✅ 找到 $($response.result.Count) 條更新" -ForegroundColor Green
        Write-Host ""
        Write-Host "==================================================" -ForegroundColor Cyan
        
        foreach ($update in $response.result) {
            if ($update.message) {
                $msg = $update.message
                Write-Host "Chat ID: $($msg.chat.id)" -ForegroundColor Green
                Write-Host "  類型: $($msg.chat.type)"
                Write-Host "  來自: $($msg.from.first_name) $($msg.from.last_name)"
                if ($msg.from.username) {
                    Write-Host "  用戶名: @$($msg.from.username)"
                }
                Write-Host "  訊息: $($msg.text)"
                Write-Host "  時間: $(Get-Date -UnixTimeSeconds $msg.date -Format 'yyyy-MM-dd HH:mm:ss')"
                Write-Host "--------------------------------------------------"
            }
        }
        
        Write-Host ""
        Write-Host "💡 提示：複製上面的 Chat ID 用於測試" -ForegroundColor Yellow
        
    }
    elseif ($response.ok) {
        Write-Host "⚠️  沒有找到任何更新" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "請先在 Telegram 向 bot 發送一條消息，然後重新執行此腳本" -ForegroundColor Yellow
    }
    else {
        Write-Host "❌ API 返回錯誤：$($response.description)" -ForegroundColor Red
    }
    
}
catch {
    Write-Host "❌ 錯誤：$($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "可能的原因：" -ForegroundColor Yellow
    Write-Host "  1. Bot Token 無效" -ForegroundColor Yellow
    Write-Host "  2. 網路連接問題" -ForegroundColor Yellow
    Write-Host "  3. Telegram API 暫時無法訪問" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "==================================================" -ForegroundColor Cyan
