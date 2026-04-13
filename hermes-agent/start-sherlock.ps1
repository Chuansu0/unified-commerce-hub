# 啟動 Hermes Agent (neovegasherlock_bot)
# 本地部署版本

Write-Host "🔍 啟動 Hermes Agent (Sherlock)..." -ForegroundColor Cyan

# 設定環境變數
$env:TELEGRAM_BOT_TOKEN = "8505666076:AAFsPUQCBA7UVdIiw8ItBU3QHDbggI6Payg"
$env:OPENAI_API_KEY = "sk-NQXHpmDhh4SHISdAtMtFEGCcbkJjYEWKQ6xolQbPygsfcrtX6F7wBFYC9bSryTDw"
$env:OPENAI_API_BASE = "https://opencode.ai/zen/go/v1"
$env:OPENAI_MODEL = "kimi-k2.5"
$env:N8N_WEBHOOK_URL = "https://n8n.neovega.cc/webhook/sherlock-output"

# 檢查 Python
$python = Get-Command python -ErrorAction SilentlyContinue
if (-not $python) {
    Write-Host "❌ 錯誤：找不到 Python。請先安裝 Python 3.10+" -ForegroundColor Red
    exit 1
}

# 檢查依賴
try {
    python -c "import telegram" 2>$null
}
catch {
    Write-Host "📦 安裝 Python 依賴..." -ForegroundColor Yellow
    pip install -r requirements.txt
}

# 啟動 Sherlock
Write-Host "🚀 啟動 Sherlock Bot..." -ForegroundColor Green
python -m hermes_agent
