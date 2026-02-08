# NetOpsAI - Edge Services Startup Script
# Starts all edge services including data and app tiers with pgAdmin and RedisInsight

Write-Host "🏢 Starting NetOpsAI Edge Services..." -ForegroundColor Cyan

# Stop any existing edge services
Write-Host "📦 Stopping existing Edge services..." -ForegroundColor Yellow
docker-compose -f docker-compose.edge.data.yml -f docker-compose.edge.app.yml down

# Start Edge data services first
Write-Host "💾 Starting Edge Data services..." -ForegroundColor Green
docker-compose -f docker-compose.edge.data.yml up -d

# Wait for data services to be ready
Write-Host "⏳ Waiting for Edge data services..." -ForegroundColor Blue
Start-Sleep -Seconds 10

# Start Edge app services
Write-Host "🚀 Starting Edge App services..." -ForegroundColor Green  
docker-compose -f docker-compose.edge.app.yml up -d

# Wait for all services to be healthy
Write-Host "⏳ Waiting for services to be ready..." -ForegroundColor Blue
Start-Sleep -Seconds 15

# Check service status
Write-Host "📊 Edge Services Status:" -ForegroundColor Cyan
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" --filter "label=com.NetOpsAI.edge.service"

Write-Host ""
Write-Host "🎯 Edge Services URLs:" -ForegroundColor Green
Write-Host "   - Edge API.........: http://localhost:3002" -ForegroundColor White
Write-Host "   - Edge Web UI......: http://localhost:5174" -ForegroundColor White
Write-Host "   - Edge PostgreSQL..: localhost:5433" -ForegroundColor White
Write-Host "   - Edge Redis.......: localhost:6380" -ForegroundColor White
Write-Host "   - Edge pgAdmin.....: http://localhost:5051" -ForegroundColor Yellow
Write-Host "   - Edge RedisInsight: http://localhost:5541" -ForegroundColor Yellow
Write-Host ""
Write-Host "✅ Edge Services startup complete!" -ForegroundColor Green