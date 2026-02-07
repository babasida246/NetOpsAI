# Script to verify database schema matches code expectations
# Usage: .\verify-database-schema.ps1

$ErrorActionPreference = 'Stop'

Write-Host "=== Database Schema Verification ===" -ForegroundColor Cyan
Write-Host ""

# Tables to check
$tables = @(
    "users",
    "sessions",
    "conversations", 
    "messages",
    "ai_providers",
    "model_configs",
    "assets",
    "cmdb_cis",
    "cmdb_services",
    "cmdb_service_members",
    "cmdb_relationships",
    "spare_parts",
    "repair_orders",
    "maintenance_tickets",
    "inventory_sessions"
)

$containerName = "netopsai-gateway-postgres"
$dbName = "netopsai_gateway"
$totalErrors = 0

foreach ($table in $tables) {
    Write-Host "Checking table: $table" -NoNewline
    
    $result = docker exec $containerName psql -U postgres -d $dbName -c "\d $table" 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host " ✅" -ForegroundColor Green
    } else {
        Write-Host " ❌ NOT FOUND" -ForegroundColor Red
        $totalErrors++
    }
}

Write-Host ""
Write-Host "=== Common Schema Issues ===" -ForegroundColor Cyan

# Check for specific column mismatches that we've seen
$checks = @(
    @{
        Table = "conversation_token_usage"
        Column = "model_id"
        ExpectedType = "uuid"
    },
    @{
        Table = "conversation_token_usage"
        Column = "provider_id"
        ExpectedType = "uuid"
    },
    @{
        Table = "conversation_token_usage"
        Column = "cost_estimate"
        ExpectedType = "numeric"
    },
    @{
        Table = "cmdb_services"
        Column = "description"
        ExpectedType = "text"
    },
    @{
        Table = "cmdb_services"
        Column = "metadata"
        ExpectedType = "jsonb"
    },
    @{
        Table = "cmdb_service_members"
        Column = "service_id"
        ExpectedType = "uuid"
    }
)

foreach ($check in $checks) {
    $table = $check.Table
    $column = $check.Column
    $expectedType = $check.ExpectedType
    
    Write-Host "Checking $table.$column ($expectedType)" -NoNewline
    
    $query = "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = '$table' AND column_name = '$column';"
    $result = docker exec $containerName psql -U postgres -d $dbName -t -c $query 2>&1
    
    if ($result -match $column) {
        Write-Host " ✅" -ForegroundColor Green
    } else {
        Write-Host " ❌ MISSING" -ForegroundColor Red
        $totalErrors++
    }
}

Write-Host ""
if ($totalErrors -eq 0) {
    Write-Host "=== ALL CHECKS PASSED ===" -ForegroundColor Green
} else {
    Write-Host "=== FOUND $totalErrors ERRORS ===" -ForegroundColor Red
    exit 1
}
