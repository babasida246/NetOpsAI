#!/bin/bash

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

# Configuration
API_URL=${API_URL:-http://localhost:3000}
MAX_RETRIES=${MAX_RETRIES:-3}
RETRY_DELAY=${RETRY_DELAY:-2}

echo "🧪 Running smoke tests..."
echo "API URL: $API_URL"
echo ""

FAILED=0

run_test() {
    local test_name=$1
    local url=$2
    local expected=${3:-200}
    
    echo -n "Testing $test_name... "
    
    for i in $(seq 1 $MAX_RETRIES); do
        HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$url" 2>/dev/null || echo "000")
        
        if [ "$HTTP_CODE" = "$expected" ]; then
            echo -e "${GREEN}✓${NC} (HTTP $HTTP_CODE)"
            return 0
        fi
        
        if [ $i -lt $MAX_RETRIES ]; then
            sleep $RETRY_DELAY
        fi
    done
    
    echo -e "${RED}✗${NC} (HTTP $HTTP_CODE, expected $expected)"
    FAILED=$((FAILED + 1))
    return 1
}

# Test 1: Health endpoint
run_test "health endpoint" "$API_URL/health"

# Test 2: Ready endpoint
run_test "ready endpoint" "$API_URL/health/ready"

# Test 3: API v1 availability
run_test "API v1 endpoint" "$API_URL/v1/tools" || true

# Test 4: Check health response body
echo -n "Testing health response body... "
HEALTH_RESPONSE=$(curl -s "$API_URL/health" 2>/dev/null || echo "{}")

if echo "$HEALTH_RESPONSE" | grep -q '"status"'; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}✗${NC} (invalid response)"
    FAILED=$((FAILED + 1))
fi

# Test 5: Database connectivity (via health)
echo -n "Testing database connectivity... "
if echo "$HEALTH_RESPONSE" | grep -q '"postgres":true\|"database":"connected"'; then
    echo -e "${GREEN}✓${NC}"
else
    if echo "$HEALTH_RESPONSE" | grep -q '"postgres"\|"database"'; then
        echo -e "${RED}✗${NC} (database not connected)"
        FAILED=$((FAILED + 1))
    else
        echo "⚠ (not in health response, skipped)"
    fi
fi

# Test 6: Redis connectivity (via health)
echo -n "Testing Redis connectivity... "
if echo "$HEALTH_RESPONSE" | grep -q '"redis":true\|"cache":"connected"'; then
    echo -e "${GREEN}✓${NC}"
else
    if echo "$HEALTH_RESPONSE" | grep -q '"redis"\|"cache"'; then
        echo -e "${RED}✗${NC} (redis not connected)"
        FAILED=$((FAILED + 1))
    else
        echo "⚠ (not in health response, skipped)"
    fi
fi

echo ""
echo "======================================"
if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ All smoke tests passed${NC}"
    exit 0
else
    echo -e "${RED}❌ $FAILED smoke test(s) failed${NC}"
    exit 1
fi
