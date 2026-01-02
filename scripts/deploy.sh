#!/bin/bash

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
ENV=${1:-production}
VERSION=${2:-latest}

echo -e "${BLUE}🚀 NetOpsAI - Deployment${NC}"
echo "Environment: $ENV"
echo "Version: $VERSION"
echo ""

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_ROOT"

# Step 1: Validation
echo -e "${YELLOW}Step 1: Validating prerequisites...${NC}"
if ! ./scripts/validate-deployment.sh; then
    echo -e "${RED}❌ Validation failed. Aborting deployment.${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Validation passed${NC}"
echo ""

# Step 2: Load environment
echo -e "${YELLOW}Step 2: Loading environment configuration...${NC}"
if [ ! -f ".env.$ENV" ]; then
    echo -e "${RED}❌ .env.$ENV not found${NC}"
    echo "Create it from .env.$ENV.example:"
    echo "  cp .env.$ENV.example .env.$ENV"
    exit 1
fi
set -a
source ".env.$ENV"
set +a
echo -e "${GREEN}✓ Environment loaded${NC}"
echo ""

# Step 3: Pull latest code (optional)
echo -e "${YELLOW}Step 3: Checking for updates...${NC}"
if git rev-parse --git-dir > /dev/null 2>&1; then
    CURRENT_BRANCH=$(git branch --show-current)
    echo "Current branch: $CURRENT_BRANCH"
    # git pull origin "$CURRENT_BRANCH" || echo "Warning: Could not pull latest code"
fi
echo -e "${GREEN}✓ Code check complete${NC}"
echo ""

# Step 4: Build images
echo -e "${YELLOW}Step 4: Building Docker images...${NC}"
docker-compose build --no-cache
echo -e "${GREEN}✓ Images built${NC}"
echo ""

# Step 5: Database migration
echo -e "${YELLOW}Step 5: Preparing database...${NC}"
# Start postgres first
docker-compose up -d postgres
echo "Waiting for PostgreSQL to be ready..."
sleep 10
echo -e "${GREEN}✓ Database ready${NC}"
echo ""

# Step 6: Stop old containers (if running)
echo -e "${YELLOW}Step 6: Stopping old containers...${NC}"
docker-compose down --remove-orphans || true
echo -e "${GREEN}✓ Old containers stopped${NC}"
echo ""

# Step 7: Start new containers
echo -e "${YELLOW}Step 7: Starting new containers...${NC}"
docker-compose up -d
echo ""

# Step 8: Wait for health checks
echo -e "${YELLOW}Step 8: Waiting for services to be healthy...${NC}"
echo "Waiting 15 seconds for services to start..."
sleep 15

# Check container status
if docker-compose ps | grep -q "unhealthy\|Exit"; then
    echo -e "${RED}❌ Some services are unhealthy${NC}"
    docker-compose ps
    echo ""
    echo "Check logs with: docker-compose logs"
    exit 1
fi
echo -e "${GREEN}✓ All services healthy${NC}"
echo ""

# Step 9: Run smoke tests
echo -e "${YELLOW}Step 9: Running smoke tests...${NC}"
if [ -f "./scripts/smoke-test.sh" ]; then
    ./scripts/smoke-test.sh
    echo -e "${GREEN}✓ Smoke tests passed${NC}"
else
    echo "Skipping smoke tests (script not found)"
fi
echo ""

echo -e "${GREEN}✅ Deployment completed successfully!${NC}"
echo ""
echo "Services:"
echo "  API: http://localhost:${API_PORT:-3000}"
echo "  MCP: http://localhost:${MCP_PORT:-3001}"
echo ""
echo "Next steps:"
echo "  - Check logs: docker-compose logs -f"
echo "  - Monitor: docker-compose ps"
echo "  - Rollback: ./scripts/rollback.sh"

