# NetOpsAI - Smoke Test Script (Windows PowerShell)
# Usage: .\scripts\smoke-test.ps1

param(
    [string]$ApiUrl = "http://localhost:3000",
    [int]$MaxRetries = 3,
    [int]$RetryDelay = 2
)

Write-Host "🧪 Running smoke tests..." -ForegroundColor Cyan
Write-Host "API URL: $ApiUrl"
Write-Host ""

$Failed = 0

function Test-Endpoint {
    param(
        [string]$Name,
        [string]$Url,
        [int]$Expected = 200
    )
    
    Write-Host -NoNewline "Testing $Name... "
    
    for ($i = 1; $i -le $MaxRetries; $i++) {
        try {
            $Response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 10 -ErrorAction Stop
            if ($Response.StatusCode -eq $Expected) {
                Write-Host "✓" -ForegroundColor Green
                return $true
            }
        }
        catch {
            if ($i -lt $MaxRetries) {
                Start-Sleep -Seconds $RetryDelay
            }
        }
    }
    
    Write-Host "✗" -ForegroundColor Red
    return $false
}

# Test 1: Health endpoint
if (-not (Test-Endpoint "health endpoint" "$ApiUrl/health")) {
    $Failed++
}

# Test 2: Ready endpoint
if (-not (Test-Endpoint "ready endpoint" "$ApiUrl/health/ready")) {
    $Failed++
}

# Test 3: API v1 tools (may return 401 if auth required)
Write-Host -NoNewline "Testing API tools endpoint... "
try {
    $Response = Invoke-WebRequest -Uri "$ApiUrl/v1/tools" -UseBasicParsing -TimeoutSec 10 -ErrorAction Stop
    Write-Host "✓" -ForegroundColor Green
}
catch {
    if ($_.Exception.Response.StatusCode -eq 401) {
        Write-Host "⚠ (auth required)" -ForegroundColor Yellow
    }
    else {
        Write-Host "✗" -ForegroundColor Red
        $Failed++
    }
}

# Test 4: Health response body
Write-Host -NoNewline "Testing health response body... "
try {
    $HealthResponse = Invoke-RestMethod -Uri "$ApiUrl/health" -TimeoutSec 10 -ErrorAction Stop
    if ($HealthResponse.status) {
        Write-Host "✓" -ForegroundColor Green
    }
    else {
        Write-Host "✗ (invalid response)" -ForegroundColor Red
        $Failed++
    }
}
catch {
    Write-Host "✗" -ForegroundColor Red
    $Failed++
}

Write-Host ""
Write-Host "======================================"
if ($Failed -eq 0) {
    Write-Host "✅ All smoke tests passed" -ForegroundColor Green
    exit 0
}
else {
    Write-Host "❌ $Failed smoke test(s) failed" -ForegroundColor Red
    exit 1
}

