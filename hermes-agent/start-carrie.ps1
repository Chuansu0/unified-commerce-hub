# 啟動 Carrie Bot (neovegacarrie_bot)
# 本地執行者

Write-Host "🎬 啟動 Carrie Bot (本地執行者)..." -ForegroundColor Cyan

# 設定環境變數
$env:TELEGRAM_BOT_TOKEN = "8615424711:AAGLoHijlMpqWX7yD_JhJjKeTS0Dd5H5GTg"
$env:OPENAI_API_KEY = "sk-NQXHpmDhh4SHISdAtMtFEGCcbkJjYEWKQ6xolQbPygsfcrtX6F7wBFYC9bSryTDw"
$env:OPENAI_API_BASE = "https://opencode.ai/zen/go/v1"
$env:OPENAI_MODEL = "kimi-k2.5"

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

# 啟動 Carrie
Write-Host "🚀 啟動 Carrie Bot..." -ForegroundColor Green
Write-Host "💡 等待來自 n8n 的執行指令..." -ForegroundColor Gray
python carrie_bot.py
