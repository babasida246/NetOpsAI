# Script to test all API endpoints
# Usage: .\test-all-apis.ps1

$ErrorActionPreference = 'Continue'
$baseUrl = "http://localhost:3000/api/v1"
$totalTests = 0
$passedTests = 0
$failedTests = 0

Write-Host "=== API Endpoint Testing ===" -ForegroundColor Cyan
Write-Host "Base URL: $baseUrl" -ForegroundColor Gray
Write-Host ""

function Test-Endpoint {
    param(
        [string]$Method,
        [string]$Endpoint,
        [string]$Description
    )
    
    $global:totalTests++
    Write-Host "[$global:totalTests] Testing $Method $Endpoint" -NoNewline
    
    try {
        $uri = "$baseUrl$Endpoint"
        $response = Invoke-WebRequest -Uri $uri -Method $Method -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
        
        if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 300) {
            Write-Host " ✅ $($response.StatusCode)" -ForegroundColor Green
            $global:passedTests++
            return $true
        } else {
            Write-Host " ⚠️  $($response.StatusCode)" -ForegroundColor Yellow
            $global:failedTests++
            return $false
        }
    } catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        if ($statusCode -eq 401 -or $statusCode -eq 403) {
            Write-Host " ⚠️  $statusCode (Auth required)" -ForegroundColor Yellow
            $global:passedTests++  # Auth errors are expected for unauthenticated requests
            return $true
        } elseif ($statusCode -eq 404) {
            Write-Host " ❌ 404 NOT FOUND" -ForegroundColor Red
            $global:failedTests++
            return $false
        } else {
            Write-Host " ❌ ERROR: $statusCode" -ForegroundColor Red
            $global:failedTests++
            return $false
        }
    }
}

# Health & System
Write-Host "=== Health & System ===" -ForegroundColor Magenta
Test-Endpoint "GET" "/health" "Health check"
Test-Endpoint "GET" "/setup/status" "Setup status"

# Auth
Write-Host "`n=== Auth ===" -ForegroundColor Magenta
Test-Endpoint "POST" "/auth/login" "Login endpoint"
Test-Endpoint "POST" "/auth/register" "Register endpoint"

# CMDB
Write-Host "`n=== CMDB ===" -ForegroundColor Magenta
Test-Endpoint "GET" "/cmdb/types" "List CI types"
Test-Endpoint "GET" "/cmdb/cis?page=1&limit=10" "List CIs"
Test-Endpoint "GET" "/cmdb/services?page=1&limit=10" "List services"
Test-Endpoint "GET" "/cmdb/relationship-types" "List relationship types"
Test-Endpoint "GET" "/cmdb/graph?depth=2&direction=both" "Get CMDB graph"

# Conversations & Chat
Write-Host "`n=== Conversations & Chat ===" -ForegroundColor Magenta
Test-Endpoint "GET" "/conversations" "List conversations"
Test-Endpoint "GET" "/chat/providers" "List AI providers"
Test-Endpoint "GET" "/chat/models" "List AI models"

# Assets
Write-Host "`n=== Assets ===" -ForegroundColor Magenta
Test-Endpoint "GET" "/assets?page=1&limit=10" "List assets"
Test-Endpoint "GET" "/categories" "List asset categories"
Test-Endpoint "GET" "/locations" "List locations"

# Maintenance & Repair
Write-Host "`n=== Maintenance & Repair ===" -ForegroundColor Magenta
Test-Endpoint "GET" "/maintenance?page=1&limit=10" "List maintenance tickets"
Test-Endpoint "GET" "/repair-orders?page=1&limit=10" "List repair orders"

# Inventory
Write-Host "`n=== Inventory ===" -ForegroundColor Magenta
Test-Endpoint "GET" "/inventory-sessions?page=1&limit=10" "List inventory sessions"
Test-Endpoint "GET" "/spare-parts?page=1&limit=10" "List spare parts"
Test-Endpoint "GET" "/warehouses" "List warehouses"

# NetOps
Write-Host "`n=== NetOps ===" -ForegroundColor Magenta
Test-Endpoint "GET" "/netops/devices?page=1&limit=10" "List network devices"
Test-Endpoint "GET" "/netops/change-requests?page=1&limit=10" "List change requests"

# Admin
Write-Host "`n=== Admin ===" -ForegroundColor Magenta
Test-Endpoint "GET" "/admin/users?page=1&limit=10" "List users"
Test-Endpoint "GET" "/admin/audit-logs?page=1&limit=10" "List audit logs"

# Summary
Write-Host ""
Write-Host "=== Test Summary ===" -ForegroundColor Cyan
Write-Host "Total Tests: $totalTests" -ForegroundColor White
Write-Host "Passed: $passedTests" -ForegroundColor Green
Write-Host "Failed: $failedTests" -ForegroundColor Red

$successRate = [math]::Round(($passedTests / $totalTests) * 100, 2)
Write-Host "Success Rate: $successRate%" -ForegroundColor $(if ($successRate -ge 80) { "Green" } elseif ($successRate -ge 50) { "Yellow" } else { "Red" })

if ($failedTests -eq 0) {
    Write-Host "`n✅ ALL TESTS PASSED!" -ForegroundColor Green
    exit 0
} else {
    Write-Host "`n⚠️  SOME TESTS FAILED" -ForegroundColor Yellow
    exit 1
}
