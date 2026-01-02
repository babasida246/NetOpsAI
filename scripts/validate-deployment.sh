#!/bin/bash

set -e

echo "🔍 Phase 6: Pre-Deployment Validation"
echo "======================================"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track failures
FAILED=0

validate_step() {
    local step_name=$1
    local command=$2
    
    echo -n "Checking $step_name... "
    if eval "$command" > /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC}"
    else
        echo -e "${RED}✗${NC}"
        FAILED=$((FAILED + 1))
    fi
}

echo ""
echo "📦 Phase 1: Domain Layer"
validate_step "Domain package exists" "test -d packages/domain"
validate_step "Domain builds" "cd packages/domain && pnpm build"
validate_step "Domain tests pass" "cd packages/domain && pnpm test --run"

echo ""
echo "🎯 Phase 2: Application Layer"
validate_step "Application package exists" "test -d packages/application"
validate_step "Contracts package exists" "test -d packages/contracts"
validate_step "Application builds" "cd packages/application && pnpm build"
validate_step "Application tests pass" "cd packages/application && pnpm test --run"

echo ""
echo "🔌 Phase 3: Infrastructure Layer"
validate_step "Postgres package exists" "test -d packages/infra-postgres"
validate_step "Redis package exists" "test -d packages/infra-redis"
validate_step "Providers package exists" "test -d packages/providers"
validate_step "Infrastructure builds" "cd packages/infra-postgres && pnpm build"

echo ""
echo "🌐 Phase 4: Presentation Layer"
validate_step "API app exists" "test -d apps/gateway-api"
validate_step "MCP app exists" "test -d apps/gateway-mcp"
validate_step "CLI app exists" "test -d apps/gateway-cli"
validate_step "API builds" "cd apps/gateway-api && pnpm build"

echo ""
echo "🛠️ Phase 5: MCP Servers & Tools"
validate_step "Tools package exists" "test -d packages/tools"
validate_step "Log aggregator exists" "test -d packages/mcp-servers/core/log-aggregator"
validate_step "SQL ops exists" "test -d packages/mcp-servers/core/sql-ops"
validate_step "Tools build" "cd packages/tools && pnpm build"

echo ""
echo "🔧 Essential Files"
validate_step "Root package.json" "test -f package.json"
validate_step "pnpm-workspace.yaml" "test -f pnpm-workspace.yaml"
validate_step "tsconfig.base.json" "test -f tsconfig.base.json"
validate_step ".env.example exists" "test -f .env.example"
validate_step "Docker support" "command -v docker"
validate_step "Docker Compose support" "command -v docker-compose || command -v docker compose"

echo ""
echo "======================================"
if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ All validations passed! Ready for deployment.${NC}"
    exit 0
else
    echo -e "${RED}❌ $FAILED validation(s) failed. Fix issues before deploying.${NC}"
    exit 1
fi
