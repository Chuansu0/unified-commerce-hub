# Stage 2 Integration Test Script
# Date: 2026-03-15

Write-Host "=== Stage 2: Message Router Integration Test ===" -ForegroundColor Cyan
Write-Host ""

# Configuration
$messageRouterUrl = "https://n8n.neovega.cc/webhook/message-router"
$pocketbaseUrl = "https://pocketbase.neovega.cc/api"

# Test 1: Single Agent Routing (Linus)
Write-Host "Test 1: Single Agent Routing (Linus)" -ForegroundColor Yellow
$body1 = @{
    conversation_id = "test_conv_001"
    message         = "Please help me deploy the infrastructure and set up the database server"
    user_id         = "test_user"
    timestamp       = (Get-Date -Format "yyyy-MM-ddTHH:mm:ssZ")
} | ConvertTo-Json

try {
    $response1 = Invoke-WebRequest -Uri $messageRouterUrl -Method POST -Body $body1 -ContentType "application/json" -UseBasicParsing
    Write-Host "[PASS] Test 1 Success! StatusCode: $($response1.StatusCode)" -ForegroundColor Green
    Write-Host "Response: $($response1.Content)" -ForegroundColor Gray
}
catch {
    Write-Host "[FAIL] Test 1 Failed: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 2: Single Agent Routing (Andrea)
Write-Host "Test 2: Single Agent Routing (Andrea)" -ForegroundColor Yellow
$body2 = @{
    conversation_id = "test_conv_002"
    message         = "I need executive approval for the new business strategy and decision on the budget allocation"
    user_id         = "test_user"
    timestamp       = (Get-Date -Format "yyyy-MM-ddTHH:mm:ssZ")
} | ConvertTo-Json

try {
    $response2 = Invoke-WebRequest -Uri $messageRouterUrl -Method POST -Body $body2 -ContentType "application/json" -UseBasicParsing
    Write-Host "[PASS] Test 2 Success! StatusCode: $($response2.StatusCode)" -ForegroundColor Green
    Write-Host "Response: $($response2.Content)" -ForegroundColor Gray
}
catch {
    Write-Host "[FAIL] Test 2 Failed: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 3: Sequential Workflow (Linus -> Andrea)
Write-Host "Test 3: Sequential Workflow (Linus -> Andrea)" -ForegroundColor Yellow
$body3 = @{
    conversation_id = "test_conv_003"
    message         = "We need to deploy a new infrastructure for the database server. Please analyze the technical requirements and get executive approval for the budget."
    user_id         = "test_user"
    timestamp       = (Get-Date -Format "yyyy-MM-ddTHH:mm:ssZ")
} | ConvertTo-Json

try {
    $response3 = Invoke-WebRequest -Uri $messageRouterUrl -Method POST -Body $body3 -ContentType "application/json" -UseBasicParsing
    Write-Host "[PASS] Test 3 Success! StatusCode: $($response3.StatusCode)" -ForegroundColor Green
    Write-Host "Response: $($response3.Content)" -ForegroundColor Gray
}
catch {
    Write-Host "[FAIL] Test 3 Failed: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 4: Parallel Workflow (Simultaneous Query)
Write-Host "Test 4: Parallel Workflow (Simultaneous Query)" -ForegroundColor Yellow
$body4 = @{
    conversation_id = "test_conv_004"
    message         = "What are the infrastructure requirements and what is the executive perspective on this project?"
    user_id         = "test_user"
    timestamp       = (Get-Date -Format "yyyy-MM-ddTHH:mm:ssZ")
    workflow_type   = "parallel"
} | ConvertTo-Json

try {
    $response4 = Invoke-WebRequest -Uri $messageRouterUrl -Method POST -Body $body4 -ContentType "application/json" -UseBasicParsing
    Write-Host "[PASS] Test 4 Success! StatusCode: $($response4.StatusCode)" -ForegroundColor Green
    Write-Host "Response: $($response4.Content)" -ForegroundColor Gray
}
catch {
    Write-Host "[FAIL] Test 4 Failed: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

Write-Host "=== Test Complete ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "1. Login to PocketBase Admin UI to check agent_workflows collection"
Write-Host "2. Login to n8n to check workflow execution logs"
Write-Host "3. Verify error handling mechanism"
