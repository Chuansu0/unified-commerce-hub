# Test PocketBase agent_workflows Collection

$POCKETBASE_URL = "https://pocketbase.neovega.cc"

Write-Host "Testing PocketBase Collections..." -ForegroundColor Cyan

# Test 1: List all collections
Write-Host "`n[Test 1] List all collections" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$POCKETBASE_URL/api/collections" -Method GET
    Write-Host "Success: Got collections list" -ForegroundColor Green
    Write-Host "Collections:" -ForegroundColor Gray
    $response.items | ForEach-Object { Write-Host "  - $($_.name)" -ForegroundColor Gray }
    
    # Check if agent_workflows exists
    $hasAgentWorkflows = $response.items | Where-Object { $_.name -eq "agent_workflows" }
    if ($hasAgentWorkflows) {
        Write-Host "`nSuccess: agent_workflows collection exists!" -ForegroundColor Green
    }
    else {
        Write-Host "`nError: agent_workflows collection NOT found!" -ForegroundColor Red
    }
}
catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 2: Test agent_workflows API directly
Write-Host "`n[Test 2] Test agent_workflows API" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$POCKETBASE_URL/api/collections/agent_workflows/records" -Method GET
    Write-Host "Success: agent_workflows API is accessible" -ForegroundColor Green
    Write-Host "Records count: $($response.items.Count)" -ForegroundColor Gray
}
catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails.Message) {
        Write-Host "Details: $($_.ErrorDetails.Message)" -ForegroundColor Yellow
    }
}

Write-Host "`nTest completed." -ForegroundColor Cyan
