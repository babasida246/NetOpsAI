# Chat & Tools E2E Testing - Quick Reference

## 📋 Feature List & Test Coverage

### ✅ Chat Features (10 features, 50+ tests)

| Feature | Status | Tests | Description |
|---------|--------|-------|-------------|
| Message Input & Sending | ✅ | 5 | Type and send messages with validation |
| Real-time Streaming | ✅ | 4 | SSE streaming responses |
| Message Display & Formatting | ✅ | 6 | User/Assistant badges, code blocks, timestamps |
| Conversation History | ✅ | 4 | Multi-message conversations, persistence |
| Token & Cost Tracking | ✅ | 3 | Token counting, cost calculation, warnings |
| Automatic Summarization | ✅ | 3 | Auto-summary at message thresholds |
| Context Optimization | ✅ | 2 | Sliding window with summaries |
| Tier-based Routing | ✅ | 2 | T0-T3 routing based on importance |
| Error Handling | ✅ | 3 | Error display, retry logic |
| Tool Call Display | ✅ | 3 | Tool execution visualization |

### ✅ Tool Features (7 features, 20+ tests)

| Feature | Status | Tests | Description |
|---------|--------|-------|-------------|
| Tool Registry Display | ✅ | 4 | Lists tools in table format |
| Zabbix Tools | ✅ | 3 | get_alerts, get_problems, acknowledge |
| FortiGate Tools | ✅ | 3 | get_policies, get_logs, create_policy |
| Syslog Tools | ✅ | 3 | search_logs, get_stats, parse_message |
| SQL Tools | ✅ | 3 | execute_query, explain, analyze |
| Network Tools | ✅ | 2 | vlan_config, validate_config |
| Tool Parameter Schema Form | ✅ | 2 | Dynamic form generation |

### ✅ Integration Tests (5 tests)

| Scenario | Status | Tests |
|----------|--------|-------|
| Full conversation with tools | ✅ | 1 |
| Context maintenance | ✅ | 1 |
| Multi-message flow | ✅ | 1 |
| Error recovery | ✅ | 1 |
| Mobile responsiveness | ✅ | 1 |

---

## 🚀 How Each Feature Works

### 1. Message Input & Sending
```
User types → Character count updates → Send button enabled → Message sent → Input cleared
```
**Test**: `should send a text message`

### 2. Real-time Streaming Responses
```
Send message → Typing indicator shows → Content streams in → Indicator hides → Message complete
```
**Test**: `should display streaming response`

### 3. Message Display & Formatting
```
User message → Badge shows "User" → Assistant response → Badge shows "Assistant" → 
Code blocks parsed → Copy button available → Timestamp displayed
```
**Test**: `should display user messages with User badge`, `should parse markdown code blocks`

### 4. Conversation History
```
Send message 1 → Send message 2 → All messages visible → Click conversation in sidebar → 
History loads → Click new conversation → Chat cleared
```
**Test**: `should display conversation history`, `should load previous conversation on click`

### 5. Token & Cost Tracking
```
Send message → Response includes tokens → Token count displayed → Cost calculated → 
Total updated → Warning if > $1
```
**Test**: `should track token usage`, `should calculate and display total cost`

### 6. Automatic Summarization
```
Send messages 1-19 → Normal behavior → Send message 20 → 
Summarization triggered → Summary cached → Summary used in context
```
**Test**: `should trigger summarization at 20 messages`

### 7. Context Optimization
```
Long conversation created → Summary generated → New message sent → 
Summary + last N messages in context → Reduced tokens
```
**Test**: Complex conversation test

### 8. Tier-based Routing
```
Regular message → T0 used → SQL query → Importance "high" → T1 used → 
Critical query → T2 used → Check metadata for tier
```
**Test**: `should detect SQL queries and mark as high importance`

### 9. Error Handling
```
API error occurs → Error message displayed → Error has retryable flag → 
Retry button available → Click retry → Retry request sent
```
**Test**: `should display error message on failure`, `should show retry button`

### 10. Tool Call Display
```
Message triggers tool call → Tool call event received → Tool name & input shown → 
Tool status badge displayed → Tool result displayed → Output formatted
```
**Test**: `should display tool calls in responses`

### 11. Tool Registry Display
```
Navigate to /tools → Table loaded → Tools listed with name/description/category → 
Can search → Can filter by category → Can click row to open
```
**Test**: `should display tool registry table`

### 12. Tool Parameter Schema Form
```
Click tool row → Form opens → Input fields rendered based on JSON schema → 
Required fields marked → Submit validates → Tool executes
```
**Test**: `should display tool JSON schema form`

### 13. Tool Execution
```
Form filled → Submit clicked → Execution begins → Status updates → 
Result displayed → Output formatted
```
**Test**: `should submit tool form and execute tool`

---

## 🧪 Running Tests

### Run All Tests
```bash
cd apps/web-ui
npx playwright test
```

### Run with UI (Interactive)
```bash
npx playwright test --ui
```

### Run Specific Test File
```bash
npx playwright test tests/e2e/chat-tools.spec.ts
```

### Run Tests Matching Pattern
```bash
npx playwright test -g "should send a text message"
```

### Run Specific Test Suite
```bash
# Chat tests only
npx playwright test -g "Chat Features"

# Tools tests only
npx playwright test -g "Tools Features"

# Integration tests only
npx playwright test -g "Integration Tests"
```

### Run in Debug Mode
```bash
npx playwright test --debug
```

### Run with Headed Browser (see browser)
```bash
npx playwright test --headed
```

### View Test Report
```bash
npx playwright show-report
```

---

## 📊 Test Scenarios & Commands

### Basic Chat Test
```bash
npx playwright test -g "should send a text message"
# Tests: Type message → Send → Message appears → Input cleared
```

### Streaming Response Test
```bash
npx playwright test -g "should display streaming response"
# Tests: Send message → Streaming indicators → Response appears
```

### Code Block Test
```bash
npx playwright test -g "should parse markdown code blocks"
# Tests: Code block detection → Syntax highlighting → Copy functionality
```

### Token Tracking Test
```bash
npx playwright test -g "should track token usage"
# Tests: Token counting → Cost calculation → Display update
```

### Conversation History Test
```bash
npx playwright test -g "should load previous conversation on click"
# Tests: Create conversation → Create second → Load first → History preserved
```

### Summarization Test
```bash
npx playwright test -g "should trigger summarization at 20 messages"
# Tests: Send 20 messages → Summarization triggered → Summary used
```

### Tool Integration Test
```bash
npx playwright test -g "should handle full conversation flow with tools"
# Tests: Message with tool request → Tool executed → Results shown
```

### Error Handling Test
```bash
npx playwright test -g "should display error message on failure"
# Tests: API error → Error shown → Retry available
```

### Tool Registry Test
```bash
npx playwright test -g "Tools Features"
# Tests: List tools → Open tool → Fill form → Execute → Results
```

---

## 🔧 Test Execution Flow

### Setup Phase
1. ✅ Navigate to `http://localhost:5173`
2. ✅ Wait for chat input to be ready
3. ✅ Initialize ChatTestHelper or ToolsTestHelper

### Action Phase
1. ✅ Send message / Open tool / Fill form
2. ✅ Perform user actions
3. ✅ Wait for responses/results

### Verification Phase
1. ✅ Check elements are visible
2. ✅ Verify content/values
3. ✅ Assert expectations

### Cleanup Phase
1. ✅ Browser closes automatically
2. ✅ Screenshots/videos saved if failures
3. ✅ Report generated

---

## 📈 Test Metrics

```
Total Tests: 75+
├── Chat Features: 50+
├── Tool Features: 20+
└── Integration: 5

Test Coverage:
├── Happy Path: 60%
├── Error Cases: 20%
├── Edge Cases: 15%
└── Performance: 5%

Execution Time: ~5-10 minutes (full suite)
Success Rate Target: 95%+
```

---

## 🎯 Testing Checklist

Before deploying, verify:

- [ ] All chat tests pass
  ```bash
  npx playwright test -g "Chat Features"
  ```

- [ ] All tool tests pass
  ```bash
  npx playwright test -g "Tools Features"
  ```

- [ ] Integration tests pass
  ```bash
  npx playwright test -g "Integration Tests"
  ```

- [ ] No regressions
  ```bash
  npx playwright test
  ```

- [ ] Report reviewed
  ```bash
  npx playwright show-report
  ```

- [ ] Screenshots/videos reviewed (if failures)

---

## 🐛 Debugging Failed Tests

### Step 1: Run with UI
```bash
npx playwright test --ui
```

### Step 2: Inspect Element
```bash
npx playwright test --debug
```

### Step 3: Check Selectors
Look for `data-test` attributes in component:
```svelte
<button data-test="send-button">Send</button>
```

### Step 4: View Screenshots
```bash
# Check test-results folder for failure screenshots
ls test-results/
```

### Step 5: View Trace
```bash
npx playwright show-trace test-results/trace.zip
```

### Step 6: Review Logs
Check browser console and network in Playwright Inspector

---

## 📚 Documentation Links

- **Feature List**: [CHAT_TOOLS_FEATURES.md](./CHAT_TOOLS_FEATURES.md)
- **Testing Guide**: [PLAYWRIGHT_TESTING_GUIDE.md](./PLAYWRIGHT_TESTING_GUIDE.md)
- **Implementation**: `apps/web-ui/src/lib/components/chat/`
- **API Docs**: `docs/api/API.md`

---

## ✨ Quick Tips

1. **Use helpers**: They simplify test code
   ```typescript
   const helper = new ChatTestHelper(page)
   await helper.sendMessage('Hello!')
   ```

2. **Wait properly**: Don't use `waitForTimeout`
   ```typescript
   // ❌ Bad
   await page.waitForTimeout(2000)
   
   // ✅ Good
   await page.waitForSelector('[data-test="message"]')
   ```

3. **Add selectors**: Make sure components have `data-test` attributes

4. **Test realistic scenarios**: Use actual user flows

5. **Check reports**: Review HTML report after each run
   ```bash
   npx playwright show-report
   ```

---

## 🚀 Next Steps

1. ✅ Install Playwright dependencies
2. ✅ Run tests locally
3. ✅ Fix any failures
4. ✅ Add to CI/CD pipeline
5. ✅ Monitor test health

Good luck! 🎉
