# NetOpsAI - Stop Edge Services Script

Write-Host "🏢 Stopping NetOpsAI Edge Services..." -ForegroundColor Cyan

docker-compose -f docker-compose.edge.data.yml -f docker-compose.edge.app.yml down

Write-Host "✅ Edge Services stopped successfully!" -ForegroundColor Green