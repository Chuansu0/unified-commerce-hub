# PocketBase Admin API - Create agent_workflows Collection
# Usage: .\create-agent-workflows-collection.ps1

$POCKETBASE_URL = "https://pocketbase.neovega.cc"

# Step 1: Admin Login
Write-Host "Step 1: Admin Login..." -ForegroundColor Cyan
$adminEmail = Read-Host "Enter Admin Email"
$adminPassword = Read-Host "Enter Admin Password" -AsSecureString
$adminPasswordPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($adminPassword))

$loginBody = @{
    identity = $adminEmail
    password = $adminPasswordPlain
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "$POCKETBASE_URL/api/admins/auth-with-password" `
        -Method POST `
        -Body $loginBody `
        -ContentType "application/json"
    
    $token = $loginResponse.token
    Write-Host "Login successful!" -ForegroundColor Green
    Write-Host "Token: $($token.Substring(0, 20))..." -ForegroundColor Gray
}
catch {
    Write-Host "Login failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Step 2: Create agent_workflows Collection
Write-Host "`nStep 2: Creating agent_workflows collection..." -ForegroundColor Cyan

$collectionData = @{
    name       = "agent_workflows"
    type       = "base"
    schema     = @(
        @{
            name     = "conversation_id"
            type     = "text"
            required = $true
        },
        @{
            name     = "workflow_type"
            type     = "select"
            required = $true
            options  = @{
                maxSelect = 1
                values    = @("single", "sequential", "parallel")
            }
        },
        @{
            name     = "agents"
            type     = "json"
            required = $true
        },
        @{
            name     = "status"
            type     = "select"
            required = $true
            options  = @{
                maxSelect = 1
                values    = @("pending", "in_progress", "completed", "failed")
            }
        },
        @{
            name     = "current_agent_index"
            type     = "number"
            required = $false
        },
        @{
            name     = "results"
            type     = "json"
            required = $false
        },
        @{
            name     = "error"
            type     = "text"
            required = $false
        }
    )
    listRule   = ""
    viewRule   = ""
    createRule = ""
    updateRule = ""
    deleteRule = ""
} | ConvertTo-Json -Depth 10

try {
    $createResponse = Invoke-RestMethod -Uri "$POCKETBASE_URL/api/collections" `
        -Method POST `
        -Body $collectionData `
        -ContentType "application/json" `
        -Headers @{
        "Authorization" = $token
    }
    
    Write-Host "Collection created successfully!" -ForegroundColor Green
    Write-Host "Collection ID: $($createResponse.id)" -ForegroundColor Gray
    Write-Host "Collection Name: $($createResponse.name)" -ForegroundColor Gray
}
catch {
    Write-Host "Creation failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Response: $($_.ErrorDetails.Message)" -ForegroundColor Yellow
    exit 1
}

Write-Host "`nDone! agent_workflows collection created successfully." -ForegroundColor Green
