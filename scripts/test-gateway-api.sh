#!/bin/bash
# Gateway API - Quick Test Script

API_URL="http://localhost:3000"
USER_ID="test-user-$(date +%s)"
FAILED=0

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🧪 Testing Gateway API..."
echo "API URL: $API_URL"
echo "User ID: $USER_ID"
echo "=========================================="

# Test 1: Health Check
echo -e "\n${YELLOW}[1/8]${NC} Testing health endpoint..."
HEALTH_RESPONSE=$(curl -s $API_URL/health)
if echo $HEALTH_RESPONSE | jq -e '.status == "healthy"' > /dev/null 2>&1; then
  echo -e "${GREEN}✓${NC} Health check passed"
else
  echo -e "${RED}✗${NC} Health check failed"
  echo $HEALTH_RESPONSE
  FAILED=$((FAILED + 1))
fi

# Test 2: List Models
echo -e "\n${YELLOW}[2/8]${NC} Testing list models..."
MODELS_RESPONSE=$(curl -s $API_URL/v1/models/available)
if echo $MODELS_RESPONSE | jq -e '.models | length > 0' > /dev/null 2>&1; then
  echo -e "${GREEN}✓${NC} List models passed"
  echo "  Models available: $(echo $MODELS_RESPONSE | jq '.models | length')"
else
  echo -e "${RED}✗${NC} List models failed"
  echo $MODELS_RESPONSE
  FAILED=$((FAILED + 1))
fi

# Test 3: Create Conversation
echo -e "\n${YELLOW}[3/8]${NC} Creating conversation..."
CONV_RESPONSE=$(curl -s -X POST $API_URL/v1/conversations \
  -H "Content-Type: application/json" \
  -H "x-user-id: $USER_ID" \
  -d '{
    "title": "Test Conversation - Gateway API",
    "modelId": "mistralai/mistral-7b-instruct:free",
    "temperature": 0.7,
    "maxLayers": 3
  }')

CONV_ID=$(echo $CONV_RESPONSE | jq -r '.id')
if [ "$CONV_ID" != "null" ] && [ -n "$CONV_ID" ]; then
  echo -e "${GREEN}✓${NC} Conversation created"
  echo "  ID: $CONV_ID"
else
  echo -e "${RED}✗${NC} Failed to create conversation"
  echo $CONV_RESPONSE
  FAILED=$((FAILED + 1))
  exit 1
fi

# Test 4: List Conversations
echo -e "\n${YELLOW}[4/8]${NC} Listing conversations..."
LIST_CONV_RESPONSE=$(curl -s "$API_URL/v1/conversations?limit=10&offset=0" \
  -H "x-user-id: $USER_ID")
if echo $LIST_CONV_RESPONSE | jq -e '.conversations | length > 0' > /dev/null 2>&1; then
  echo -e "${GREEN}✓${NC} List conversations passed"
  echo "  Total: $(echo $LIST_CONV_RESPONSE | jq '.total')"
else
  echo -e "${RED}✗${NC} List conversations failed"
  echo $LIST_CONV_RESPONSE
  FAILED=$((FAILED + 1))
fi

# Test 5: Send Message
echo -e "\n${YELLOW}[5/8]${NC} Sending message..."
MSG_RESPONSE=$(curl -s -X POST $API_URL/v1/conversations/$CONV_ID/messages \
  -H "Content-Type: application/json" \
  -H "x-user-id: $USER_ID" \
  -d '{
    "content": "What is 2+2?",
    "temperature": 0.7
  }')

if echo $MSG_RESPONSE | jq -e '.userMessage and .assistantMessage' > /dev/null 2>&1; then
  echo -e "${GREEN}✓${NC} Message sent successfully"
  echo "  User message: $(echo $MSG_RESPONSE | jq -r '.userMessage.content' | cut -c1-50)..."
  echo "  AI response: $(echo $MSG_RESPONSE | jq -r '.assistantMessage.content' | cut -c1-80)..."
  echo "  Tokens: $(echo $MSG_RESPONSE | jq -r '.usage.totalTokens')"
else
  echo -e "${RED}✗${NC} Failed to send message"
  echo $MSG_RESPONSE
  FAILED=$((FAILED + 1))
fi

# Test 6: List Messages
echo -e "\n${YELLOW}[6/8]${NC} Listing messages..."
LIST_MSG_RESPONSE=$(curl -s "$API_URL/v1/conversations/$CONV_ID/messages?limit=20&offset=0" \
  -H "x-user-id: $USER_ID")
if echo $LIST_MSG_RESPONSE | jq -e '.messages | length >= 2' > /dev/null 2>&1; then
  echo -e "${GREEN}✓${NC} List messages passed"
  echo "  Total messages: $(echo $LIST_MSG_RESPONSE | jq '.total')"
else
  echo -e "${RED}✗${NC} List messages failed"
  echo $LIST_MSG_RESPONSE
  FAILED=$((FAILED + 1))
fi

# Test 7: Update Conversation
echo -e "\n${YELLOW}[7/8]${NC} Updating conversation title..."
UPDATE_RESPONSE=$(curl -s -X PATCH $API_URL/v1/conversations/$CONV_ID \
  -H "Content-Type: application/json" \
  -H "x-user-id: $USER_ID" \
  -d '{"title": "Updated Test Conversation"}')

if echo $UPDATE_RESPONSE | jq -e '.title == "Updated Test Conversation"' > /dev/null 2>&1; then
  echo -e "${GREEN}✓${NC} Update conversation passed"
else
  echo -e "${RED}✗${NC} Update conversation failed"
  echo $UPDATE_RESPONSE
  FAILED=$((FAILED + 1))
fi

# Test 8: Delete Conversation
echo -e "\n${YELLOW}[8/8]${NC} Deleting conversation..."
DELETE_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X DELETE $API_URL/v1/conversations/$CONV_ID \
  -H "x-user-id: $USER_ID")

if [ "$DELETE_STATUS" == "204" ] || [ "$DELETE_STATUS" == "200" ]; then
  echo -e "${GREEN}✓${NC} Delete conversation passed"
else
  echo -e "${RED}✗${NC} Delete conversation failed (HTTP $DELETE_STATUS)"
  FAILED=$((FAILED + 1))
fi

# Summary
echo ""
echo "=========================================="
if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}✅ All tests passed!${NC}"
  exit 0
else
  echo -e "${RED}❌ $FAILED test(s) failed${NC}"
  exit 1
fi
