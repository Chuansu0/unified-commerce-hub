# Add sent_to_telegram and sent_at fields to messages collection

$pbUrl = "https://www.neovega.cc/pb"
$adminEmail = "alex0715@ms87.url.com.tw"
$adminPassword = "527@Chuansu0"

Write-Host "Step 1: Login to PocketBase Admin..." -ForegroundColor Cyan

# Login to get token
$loginBody = @{
    identity = $adminEmail
    password = $adminPassword
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "$pbUrl/api/admins/auth-with-password" `
        -Method POST `
        -ContentType "application/json" `
        -Body $loginBody

    $token = $loginResponse.token
    Write-Host "Success! Token obtained." -ForegroundColor Green

    Write-Host "`nStep 2: Get current messages collection schema..." -ForegroundColor Cyan

    # Get messages collection
    $headers = @{
        "Authorization" = $token
    }

    $collection = Invoke-RestMethod -Uri "$pbUrl/api/collections/messages" `
        -Method GET `
        -Headers $headers

    Write-Host "Success! Current fields count: $($collection.schema.Count)" -ForegroundColor Green

    Write-Host "`nStep 3: Add new fields..." -ForegroundColor Cyan

    # Add sent_to_telegram field
    $collection.schema += @{
        name     = "sent_to_telegram"
        type     = "bool"
        required = $false
        options  = @{}
    }

    # Add sent_at field
    $collection.schema += @{
        name     = "sent_at"
        type     = "date"
        required = $false
        options  = @{}
    }

    Write-Host "New fields added to schema" -ForegroundColor Green

    Write-Host "`nStep 4: Update collection..." -ForegroundColor Cyan

    # Prepare update data
    $updateBody = @{
        name       = $collection.name
        type       = $collection.type
        schema     = $collection.schema
        listRule   = $collection.listRule
        viewRule   = $collection.viewRule
        createRule = $collection.createRule
        updateRule = $collection.updateRule
        deleteRule = $collection.deleteRule
    } | ConvertTo-Json -Depth 10

    # Update collection
    $updateResponse = Invoke-RestMethod -Uri "$pbUrl/api/collections/messages" `
        -Method PATCH `
        -Headers $headers `
        -ContentType "application/json" `
        -Body $updateBody

    Write-Host "Collection updated successfully!" -ForegroundColor Green

    Write-Host "`nStep 5: Verify new fields..." -ForegroundColor Cyan

    # Verify
    $verifyCollection = Invoke-RestMethod -Uri "$pbUrl/api/collections/messages" `
        -Method GET `
        -Headers $headers

    $hasSentToTelegram = $verifyCollection.schema | Where-Object { $_.name -eq "sent_to_telegram" }
    $hasSentAt = $verifyCollection.schema | Where-Object { $_.name -eq "sent_at" }

    if ($hasSentToTelegram -and $hasSentAt) {
        Write-Host "Verification successful! Both fields added:" -ForegroundColor Green
        Write-Host "  - sent_to_telegram (bool)" -ForegroundColor Green
        Write-Host "  - sent_at (date)" -ForegroundColor Green
    }
    else {
        Write-Host "Verification failed!" -ForegroundColor Red
        if (-not $hasSentToTelegram) { Write-Host "  - sent_to_telegram field not found" -ForegroundColor Red }
        if (-not $hasSentAt) { Write-Host "  - sent_at field not found" -ForegroundColor Red }
    }

    Write-Host "`nComplete!" -ForegroundColor Cyan

}
catch {
    Write-Host "Error occurred: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Details: $($_.ErrorDetails.Message)" -ForegroundColor Red
}
