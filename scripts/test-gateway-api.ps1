# Gateway API - Quick Test Script (PowerShell)
# Usage: .\scripts\test-gateway-api.ps1

$API_URL = "http://localhost:3000"
$USER_ID = "test-user-$(Get-Date -Format 'yyyyMMddHHmmss')"
$FAILED = 0

Write-Host "🧪 Testing Gateway API..." -ForegroundColor Cyan
Write-Host "API URL: $API_URL"
Write-Host "User ID: $USER_ID"
Write-Host "=========================================="

# Test 1: Health Check
Write-Host "`n[1/8] Testing health endpoint..." -ForegroundColor Yellow
try {
    $healthResponse = Invoke-RestMethod -Uri "$API_URL/health" -Method Get
    if ($healthResponse.status -eq "healthy") {
        Write-Host "✓ Health check passed" -ForegroundColor Green
    } else {
        Write-Host "✗ Health check failed" -ForegroundColor Red
        $healthResponse | ConvertTo-Json
        $FAILED++
    }
} catch {
    Write-Host "✗ Health check failed: $_" -ForegroundColor Red
    $FAILED++
}

# Test 2: List Models
Write-Host "`n[2/8] Testing list models..." -ForegroundColor Yellow
try {
    $modelsResponse = Invoke-RestMethod -Uri "$API_URL/v1/models/available" -Method Get
    if ($modelsResponse.models.Count -gt 0) {
        Write-Host "✓ List models passed" -ForegroundColor Green
        Write-Host "  Models available: $($modelsResponse.models.Count)"
    } else {
        Write-Host "✗ No models found" -ForegroundColor Red
        $FAILED++
    }
} catch {
    Write-Host "✗ List models failed: $_" -ForegroundColor Red
    $FAILED++
}

# Test 3: Create Conversation
Write-Host "`n[3/8] Creating conversation..." -ForegroundColor Yellow
try {
    $convBody = @{
        title = "Test Conversation - Gateway API"
        modelId = "mistralai/mistral-7b-instruct:free"
        temperature = 0.7
        maxLayers = 3
    } | ConvertTo-Json

    $convHeaders = @{
        "Content-Type" = "application/json"
        "x-user-id" = $USER_ID
    }

    $convResponse = Invoke-RestMethod -Uri "$API_URL/v1/conversations" -Method Post -Headers $convHeaders -Body $convBody
    $CONV_ID = $convResponse.id

    if ($CONV_ID) {
        Write-Host "✓ Conversation created" -ForegroundColor Green
        Write-Host "  ID: $CONV_ID"
    } else {
        Write-Host "✗ Failed to create conversation" -ForegroundColor Red
        $FAILED++
        exit 1
    }
} catch {
    Write-Host "✗ Create conversation failed: $_" -ForegroundColor Red
    Write-Host $_.Exception.Response
    $FAILED++
    exit 1
}

# Test 4: List Conversations
Write-Host "`n[4/8] Listing conversations..." -ForegroundColor Yellow
try {
    $listHeaders = @{ "x-user-id" = $USER_ID }
    $listConvResponse = Invoke-RestMethod -Uri "$API_URL/v1/conversations?limit=10&offset=0" -Method Get -Headers $listHeaders
    
    if ($listConvResponse.conversations.Count -gt 0) {
        Write-Host "✓ List conversations passed" -ForegroundColor Green
        Write-Host "  Total: $($listConvResponse.total)"
    } else {
        Write-Host "✗ No conversations found" -ForegroundColor Red
        $FAILED++
    }
} catch {
    Write-Host "✗ List conversations failed: $_" -ForegroundColor Red
    $FAILED++
}

# Test 5: Send Message
Write-Host "`n[5/8] Sending message..." -ForegroundColor Yellow
try {
    $msgBody = @{
        content = "What is 2+2?"
        temperature = 0.7
    } | ConvertTo-Json

    $msgHeaders = @{
        "Content-Type" = "application/json"
        "x-user-id" = $USER_ID
    }

    $msgResponse = Invoke-RestMethod -Uri "$API_URL/v1/conversations/$CONV_ID/messages" -Method Post -Headers $msgHeaders -Body $msgBody

    if ($msgResponse.userMessage -and $msgResponse.assistantMessage) {
        Write-Host "✓ Message sent successfully" -ForegroundColor Green
        Write-Host "  User message: $($msgResponse.userMessage.content.Substring(0, [Math]::Min(50, $msgResponse.userMessage.content.Length)))..."
        Write-Host "  AI response: $($msgResponse.assistantMessage.content.Substring(0, [Math]::Min(80, $msgResponse.assistantMessage.content.Length)))..."
        Write-Host "  Tokens: $($msgResponse.usage.totalTokens)"
    } else {
        Write-Host "✗ Invalid message response" -ForegroundColor Red
        $FAILED++
    }
} catch {
    Write-Host "✗ Send message failed: $_" -ForegroundColor Red
    Write-Host $_.Exception.Message
    $FAILED++
}

# Test 6: List Messages
Write-Host "`n[6/8] Listing messages..." -ForegroundColor Yellow
try {
    $listMsgHeaders = @{ "x-user-id" = $USER_ID }
    $listMsgResponse = Invoke-RestMethod -Uri "$API_URL/v1/conversations/$CONV_ID/messages?limit=20&offset=0" -Method Get -Headers $listMsgHeaders
    
    if ($listMsgResponse.messages.Count -ge 2) {
        Write-Host "✓ List messages passed" -ForegroundColor Green
        Write-Host "  Total messages: $($listMsgResponse.total)"
    } else {
        Write-Host "✗ Expected at least 2 messages" -ForegroundColor Red
        $FAILED++
    }
} catch {
    Write-Host "✗ List messages failed: $_" -ForegroundColor Red
    $FAILED++
}

# Test 7: Update Conversation
Write-Host "`n[7/8] Updating conversation title..." -ForegroundColor Yellow
try {
    $updateBody = @{ title = "Updated Test Conversation" } | ConvertTo-Json
    $updateHeaders = @{
        "Content-Type" = "application/json"
        "x-user-id" = $USER_ID
    }

    $updateResponse = Invoke-RestMethod -Uri "$API_URL/v1/conversations/$CONV_ID" -Method Patch -Headers $updateHeaders -Body $updateBody

    if ($updateResponse.title -eq "Updated Test Conversation") {
        Write-Host "✓ Update conversation passed" -ForegroundColor Green
    } else {
        Write-Host "✗ Title not updated" -ForegroundColor Red
        $FAILED++
    }
} catch {
    Write-Host "✗ Update conversation failed: $_" -ForegroundColor Red
    $FAILED++
}

# Test 8: Delete Conversation
Write-Host "`n[8/8] Deleting conversation..." -ForegroundColor Yellow
try {
    $deleteHeaders = @{ "x-user-id" = $USER_ID }
    Invoke-RestMethod -Uri "$API_URL/v1/conversations/$CONV_ID" -Method Delete -Headers $deleteHeaders
    Write-Host "✓ Delete conversation passed" -ForegroundColor Green
} catch {
    if ($_.Exception.Response.StatusCode.value__ -eq 204) {
        Write-Host "✓ Delete conversation passed (204 No Content)" -ForegroundColor Green
    } else {
        Write-Host "✗ Delete conversation failed: $_" -ForegroundColor Red
        $FAILED++
    }
}

# Summary
Write-Host ""
Write-Host "=========================================="
if ($FAILED -eq 0) {
    Write-Host "✅ All tests passed!" -ForegroundColor Green
    exit 0
} else {
    Write-Host "❌ $FAILED test(s) failed" -ForegroundColor Red
    exit 1
}
