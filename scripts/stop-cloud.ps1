# NetOpsAI - Stop Cloud Services Script

Write-Host "🌐 Stopping NetOpsAI Cloud Services..." -ForegroundColor Cyan

docker-compose -f docker-compose.cloud.yml down

Write-Host "✅ Cloud Services stopped successfully!" -ForegroundColor Green