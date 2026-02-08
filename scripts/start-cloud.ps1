# NetOpsAI - Cloud Services Startup Script
# Starts all cloud services including pgAdmin and RedisInsight

Write-Host "🌐 Starting NetOpsAI Cloud Services..." -ForegroundColor Cyan

# Stop any existing cloud services
Write-Host "📦 Stopping existing Cloud services..." -ForegroundColor Yellow
docker-compose -f docker-compose.cloud.yml down

# Start Cloud services  
Write-Host "🚀 Starting Cloud services..." -ForegroundColor Green
docker-compose -f docker-compose.cloud.yml up -d

# Wait for services to be healthy
Write-Host "⏳ Waiting for services to be ready..." -ForegroundColor Blue
Start-Sleep -Seconds 15

# Check service status
Write-Host "📊 Cloud Services Status:" -ForegroundColor Cyan
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" --filter "label=com.NetOpsAI.cloud.service"

Write-Host ""
Write-Host "🎯 Cloud Services URLs:" -ForegroundColor Green
Write-Host "   - Cloud API........: http://localhost:3000" -ForegroundColor White
Write-Host "   - Cloud Web UI.....: http://localhost:5173" -ForegroundColor White  
Write-Host "   - Cloud PostgreSQL.: localhost:5432" -ForegroundColor White
Write-Host "   - Cloud Redis......: localhost:6379" -ForegroundColor White
Write-Host "   - Cloud pgAdmin....: http://localhost:5050" -ForegroundColor Yellow
Write-Host "   - Cloud RedisInsight: http://localhost:5540" -ForegroundColor Yellow
Write-Host ""
Write-Host "✅ Cloud Services startup complete!"​ -ForegroundColor Green