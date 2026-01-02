#!/bin/bash

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}🔄 Rolling back to previous version...${NC}"
echo ""

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_ROOT"

# Step 1: Stop current version
echo "Step 1: Stopping current containers..."
docker-compose down

# Step 2: Restore previous version (if using git)
if git rev-parse --git-dir > /dev/null 2>&1; then
    echo ""
    echo "Step 2: Git history (last 5 commits):"
    git log --oneline -5
    echo ""
    read -p "Rollback to previous commit (HEAD~1)? [y/N] " confirm
    if [ "$confirm" = "y" ] || [ "$confirm" = "Y" ]; then
        git checkout HEAD~1
        echo "Rolled back to previous commit"
    else
        echo "Skipping git rollback"
    fi
fi

# Step 3: Rebuild and restart
echo ""
echo "Step 3: Rebuilding containers..."
docker-compose build

echo ""
echo "Step 4: Starting containers..."
docker-compose up -d

echo ""
echo "Step 5: Waiting for services..."
sleep 10

# Check status
docker-compose ps

echo ""
echo -e "${GREEN}✅ Rollback completed${NC}"
echo ""
echo "⚠️  Remember to verify the system is working:"
echo "  - Check health: curl http://localhost:3000/health"
echo "  - Check logs: docker-compose logs -f"
echo "  - Run smoke tests: ./scripts/smoke-test.sh"
