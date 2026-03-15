# Webhook Bridge End-to-End Test Script

Write-Host "=== Webhook Bridge E2E Test ===" -ForegroundColor Cyan
Write-Host ""

# Test 1: Health Check
Write-Host "Test 1: Health Check..." -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "https://webhook-bridge.neovega.cc/health"
    Write-Host "✓ Bridge is healthy: $($health.status)" -ForegroundColor Green
}
catch {
    Write-Host "✗ Bridge health check failed" -ForegroundColor Red
    exit 1
}

# Test 2: Message Forward
Write-Host "`nTest 2: Message Forward..." -ForegroundColor Yellow
$body = @{
    message_id = 123
    chat_id    = -100123456789
    text       = "@andrea Test message from E2E"
    from       = @{
        id       = 111
        username = "openclaw_bot"
    }
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "https://webhook-bridge.neovega.cc/webhook/openclaw" `
        -Method POST `
        -Body $body `
        -ContentType "application/json"
    
    Write-Host "✓ Message forwarded: $($response.forwarded_to)" -ForegroundColor Green
}
catch {
    Write-Host "✗ Message forward failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Test 3: Check n8n Execution
Write-Host "`nTest 3: Verify n8n received message..." -ForegroundColor Yellow
Start-Sleep -Seconds 2
Write-Host "→ Please check n8n executions manually" -ForegroundColor Gray

# Test 4: Response Send
Write-Host "`nTest 4: Response Send..." -ForegroundColor Yellow
$responseBody = @{
    chat_id    = -100123456789
    message_id = 123
    text       = "E2E test response"
    source_bot = "andrea"
} | ConvertTo-Json

try {
    $result = Invoke-RestMethod -Uri "https://webhook-bridge.neovega.cc/webhook/response" `
        -Method POST `
        -Body $responseBody `
        -ContentType "application/json"
    
    Write-Host "✓ Response sent: $($result.sent)" -ForegroundColor Green
}
catch {
    Write-Host "✗ Response send failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host "`n=== All Tests Passed ===" -ForegroundColor Green
Write-Host "→ Check Telegram group for the response message" -ForegroundColor Cyan
