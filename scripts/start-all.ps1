# NetOpsAI - Start All Services Script
# Starts both Cloud and Edge services with management UIs

Write-Host "🌟 Starting NetOpsAI - Complete Platform..." -ForegroundColor Cyan

# Stop any existing services
Write-Host "📦 Stopping all existing services..." -ForegroundColor Yellow
docker-compose -f docker-compose.cloud.yml down
docker-compose -f docker-compose.edge.data.yml -f docker-compose.edge.app.yml down

Write-Host ""
Write-Host "🌐 Starting Cloud Services..." -ForegroundColor Green
# Start Cloud services
docker-compose -f docker-compose.cloud.yml up -d

Write-Host "⏳ Waiting for Cloud services to initialize..." -ForegroundColor Blue
Start-Sleep -Seconds 15

Write-Host ""  
Write-Host "🏢 Starting Edge Services..." -ForegroundColor Green
# Start Edge data services first
docker-compose -f docker-compose.edge.data.yml up -d

# Wait for data services
Start-Sleep -Seconds 10

# Start Edge app services
docker-compose -f docker-compose.edge.app.yml up -d

Write-Host "⏳ Waiting for Edge services to initialize..." -ForegroundColor Blue
Start-Sleep -Seconds 20

Write-Host ""
Write-Host "📊 All Services Status:" -ForegroundColor Cyan
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

Write-Host ""
Write-Host "🎯 NetOpsAI Platform URLs:" -ForegroundColor Green
Write-Host ""
Write-Host "  📍 CLOUD SERVICES:" -ForegroundColor Magenta
Write-Host "     - API...........: http://localhost:3000" -ForegroundColor White
Write-Host "     - Web UI........: http://localhost:5173" -ForegroundColor White
Write-Host "     - PostgreSQL....: localhost:5432" -ForegroundColor Gray
Write-Host "     - Redis.........: localhost:6379" -ForegroundColor Gray 
Write-Host "     - pgAdmin.......: http://localhost:5050" -ForegroundColor Yellow
Write-Host "     - RedisInsight..: http://localhost:5540" -ForegroundColor Yellow
Write-Host ""
Write-Host "  📍 EDGE SERVICES:" -ForegroundColor Blue
Write-Host "     - API...........: http://localhost:3002" -ForegroundColor White
Write-Host "     - Web UI........: http://localhost:5174" -ForegroundColor White
Write-Host "     - PostgreSQL....: localhost:5433" -ForegroundColor Gray
Write-Host "     - Redis.........: localhost:6380" -ForegroundColor Gray
Write-Host "     - pgAdmin.......: http://localhost:5051" -ForegroundColor Yellow
Write-Host "     - RedisInsight..: http://localhost:5541" -ForegroundColor Yellow
Write-Host ""
Write-Host "✅ Complete NetOpsAI Platform is ready!" -ForegroundColor Green
Write-Host "🎉 Access the management UIs for database administration" -ForegroundColor Cyan