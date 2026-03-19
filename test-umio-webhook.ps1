# Test Umio Webhook Script
# 使用 UTF-8 編碼發送請求

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$uri = "https://n8n.neovega.cc/webhook/umio-chat"

# 建立 JSON body 時指定 UTF-8
$body = @{
    message   = "Hello from PowerShell"
    sessionId = "test-$(Get-Random)"
    context   = @{
        platform = "webchat"
        userName = "Test User"
    }
}

# 使用 Newtonsoft.Json 或手動序列化以確保 UTF-8
$jsonBody = $body | ConvertTo-Json -Compress

Write-Host "Request Body: $jsonBody" -ForegroundColor Cyan

$headers = @{
    "Content-Type" = "application/json; charset=utf-8"
}

try {
    $response = Invoke-RestMethod -Uri $uri -Method POST -Headers $headers -Body $jsonBody
    Write-Host "`nResponse:" -ForegroundColor Green
    $response | Format-List
}
catch {
    Write-Host "`nError: $_" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $reader.BaseStream.Position = 0
        $reader.DiscardBufferedData()
        $errorBody = $reader.ReadToEnd()
        Write-Host "Error Body: $errorBody" -ForegroundColor Red
    }
}
