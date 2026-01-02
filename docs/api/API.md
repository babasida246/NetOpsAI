# API Documentation

## Overview

NetOpsAI cung cấp hai phiên bản API:

1. **v1** - OpenAI Compatible (cho integration dễ dàng)
2. **v2** - Native API (với escalation tự động)

## Base URL

```
http://localhost:3000
```

## Authentication

Hiện tại sử dụng user header:

```
x-user-id: user-123
```

## Common Headers

```
x-correlation-id: uuid  # Optional, auto-generated if missing
x-user-id: user-id      # Required for tracking
Content-Type: application/json
```

## Response Format

### Success Response (v1)

```json
{
  "id": "chatcmpl-abc123",
  "object": "chat.completion",
  "created": 1703078400,
  "model": "mistralai/devstral-2512:free",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "Response content"
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 10,
    "completion_tokens": 20,
    "total_tokens": 30
  },
  "metadata": {
    "tier_used": 0,
    "escalated": false,
    "quality_score": 0.95,
    "cost_usd": 0
  }
}
```

### Success Response (v2)

```json
{
  "id": "conv-xyz789",
  "content": "Response content",
  "finish_reason": "stop",
  "usage": {
    "promptTokens": 10,
    "completionTokens": 20,
    "totalTokens": 30,
    "totalCost": 0
  },
  "metadata": {
    "tier_used": 0,
    "escalated": false,
    "quality_score": 0.95
  }
}
```

### Error Response

```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Rate limit exceeded. Try again later.",
    "correlationId": "uuid-123",
    "details": {}
  }
}
```

## Endpoints

### Health Checks

#### GET /health

Kiểm tra sức khỏe hệ thống.

**Response:**
```json
{
  "status": "healthy",
  "checks": {
    "postgres": true,
    "redis": true
  },
  "timestamp": "2024-12-20T10:00:00.000Z"
}
```

**Status Codes:**
- `200` - Healthy
- `503` - Unhealthy

---

#### GET /health/ready

Readiness probe (Kubernetes).

**Response:**
```json
{
  "ready": true
}
```

---

#### GET /health/live

Liveness probe (Kubernetes).

**Response:**
```json
{
  "live": true
}
```

---

### v1 API - OpenAI Compatible

#### POST /v1/chat/completions

OpenAI-compatible chat completion endpoint.

**Request Body:**
```json
{
  "messages": [
    {
      "role": "system",
      "content": "You are a helpful assistant"
    },
    {
      "role": "user",
      "content": "What is 2+2?"
    }
  ],
  "model": "mistralai/devstral-2512:free",
  "temperature": 0.7,
  "max_tokens": 1000,
  "stream": false
}
```

**Parameters:**
- `messages` (required, array) - Message history
  - `role` (required, string) - "user", "assistant", "system"
  - `content` (required, string) - Message content
- `model` (optional, string) - Model to use (auto-selected if omitted)
- `temperature` (optional, number, 0-2) - Randomness, default: 0.7
- `max_tokens` (optional, number) - Max response length
- `stream` (optional, boolean) - Enable streaming, default: false

**Response:**
```json
{
  "id": "chatcmpl-abc123",
  "object": "chat.completion",
  "created": 1703078400,
  "model": "mistralai/devstral-2512:free",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "2+2 equals 4"
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 10,
    "completion_tokens": 5,
    "total_tokens": 15
  },
  "metadata": {
    "tier_used": 0,
    "escalated": false,
    "quality_score": 0.95,
    "cost_usd": 0
  }
}
```

**Example cURL:**
```bash
curl -X POST http://localhost:3000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "x-user-id: user-1" \
  -d '{
    "messages": [{"role": "user", "content": "Hello"}]
  }'
```

**Status Codes:**
- `200` - Success
- `400` - Invalid request
- `401` - Unauthorized
- `403` - Forbidden (rate limit, budget exceeded)
- `500` - Server error

---

### v2 API - Native with Escalation

#### POST /v2/chat

Native API endpoint with automatic quality-based escalation.

**Request Body:**
```json
{
  "messages": [
    {
      "role": "user",
      "content": "Analyze this SQL issue..."
    }
  ],
  "importance": "high",
  "department": "IT"
}
```

**Parameters:**
- `messages` (required, array) - Message history
  - `role` (required, string) - "user", "assistant", "system"
  - `content` (required, string) - Message content
- `importance` (optional, string) - "low", "medium", "high", "critical" (affects tier selection)
- `department` (optional, string) - Department for tracking

**Response:**
```json
{
  "id": "conv-xyz789",
  "content": "Here's the analysis of your SQL issue...",
  "finish_reason": "stop",
  "usage": {
    "promptTokens": 50,
    "completionTokens": 200,
    "totalTokens": 250,
    "totalCost": 0
  },
  "metadata": {
    "tier_used": 2,
    "escalated": true,
    "quality_score": 0.92
  }
}
```

**Importance Mapping:**
- `low` - T0 (free models)
- `medium` - T0 → escalate if needed
- `high` - T1+ (escalate to better model)
- `critical` - T2+ (use best available model)

**Example cURL:**
```bash
curl -X POST http://localhost:3000/v2/chat \
  -H "Content-Type: application/json" \
  -H "x-user-id: doctor-1" \
  -d '{
    "messages": [
      {"role": "user", "content": "Complex query"}
    ],
    "importance": "high"
  }'
```

**Status Codes:**
- `200` - Success
- `400` - Invalid request
- `403` - Budget exceeded
- `429` - Rate limit exceeded
- `500` - Server error

---

## Error Codes

### Client Errors (4xx)

| Code | Meaning |
|------|---------|
| `VALIDATION_ERROR` | Invalid request format |
| `RATE_LIMIT_EXCEEDED` | Too many requests |
| `BUDGET_EXCEEDED` | User budget limit exceeded |
| `UNAUTHORIZED_TOOL` | Tool not allowed |
| `INVALID_MESSAGE_FORMAT` | Message format is invalid |

### Server Errors (5xx)

| Code | Meaning |
|------|---------|
| `INTERNAL_ERROR` | Unexpected error |
| `SERVICE_UNAVAILABLE` | Service temporarily unavailable |
| `DATABASE_ERROR` | Database connection error |
| `LLM_ERROR` | LLM provider error |

---

## Rate Limiting

### Limits

Default configuration:
- **Per User**: 100 requests per 60 seconds
- **Budget**: $100 per user per month

### Headers

Response includes:
```
x-ratelimit-limit: 100
x-ratelimit-remaining: 95
x-ratelimit-reset: 1703078400
```

### Exceeded Response

```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Rate limit exceeded. Try again later.",
    "correlationId": "uuid-123"
  }
}
```

---

## Escalation Logic

### Escalation Flow

```
1. Request received
   ↓
2. Policy checks (budget, rate limit)
   ↓
3. Complexity detection
   ↓
4. Initial tier selection
   ↓
5. Execute with selected model
   ↓
6. Quality assessment
   ↓
7. If quality < threshold: Escalate → next tier
   ↓
8. Return response
```

### Quality Thresholds

| Tier | Threshold | Completeness | Consistency | Format | Confidence |
|------|-----------|--------------|-------------|--------|------------|
| T0 | 70% | 40% | 30% | 20% | 10% |
| T1 | 80% | 40% | 30% | 20% | 10% |
| T2 | 90% | 40% | 30% | 20% | 10% |
| T3 | 95% | 40% | 30% | 20% | 10% |

### Example Escalation

Request: "Analyze this complex query with 5 tables"

1. **T0 (Mistral)** → Quality: 65% < 70% → **Escalate**
2. **T1 (Llama)** → Quality: 78% < 80% → **Escalate**
3. **T2 (Gemini)** → Quality: 92% > 90% → **Accept**

Response includes: `"tier_used": 2, "escalated": true`

---

## Request Examples

### Simple Chat

```bash
curl -X POST http://localhost:3000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "x-user-id: user-1" \
  -d '{
    "messages": [
      {"role": "user", "content": "What time is it?"}
    ]
  }'
```

### With System Message

```bash
curl -X POST http://localhost:3000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "x-user-id: user-1" \
  -d '{
    "messages": [
      {
        "role": "system",
        "content": "You are a helpful IT support assistant"
      },
      {
        "role": "user",
        "content": "My database is slow, help!"
      }
    ]
  }'
```

### High Importance (v2)

```bash
curl -X POST http://localhost:3000/v2/chat \
  -H "Content-Type: application/json" \
  -H "x-user-id: admin-1" \
  -d '{
    "messages": [
      {"role": "user", "content": "Critical production issue"}
    ],
    "importance": "critical"
  }'
```

### With Correlation ID

```bash
curl -X POST http://localhost:3000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "x-user-id: user-1" \
  -H "x-correlation-id: req-abc-123" \
  -d '{
    "messages": [
      {"role": "user", "content": "Hello"}
    ]
  }'

# Response will include:
# "correlationId": "req-abc-123"
```

---

## Integration Examples

### Python

```python
import requests

url = "http://localhost:3000/v1/chat/completions"
headers = {
    "Content-Type": "application/json",
    "x-user-id": "user-1"
}

data = {
    "messages": [
        {"role": "user", "content": "Hello"}
    ]
}

response = requests.post(url, json=data, headers=headers)
print(response.json())
```

### JavaScript/Node.js

```javascript
const response = await fetch('http://localhost:3000/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-user-id': 'user-1'
  },
  body: JSON.stringify({
    messages: [
      { role: 'user', content: 'Hello' }
    ]
  })
});

const data = await response.json();
console.log(data);
```

### cURL with JSON file

```bash
cat > request.json << 'EOF'
{
  "messages": [
    {"role": "user", "content": "Hello"}
  ]
}
EOF

curl -X POST http://localhost:3000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "x-user-id: user-1" \
  -d @request.json
```

---

## Troubleshooting API

### "Invalid request" errors

Check:
1. JSON format is valid
2. All required fields present
3. Field types match specification

### "Rate limit exceeded"

Solution:
1. Wait before retrying
2. Check rate limit headers
3. Request quota increase if needed

### "Budget exceeded"

Solution:
1. Check budget info: `GET /v2/budget`
2. Wait for budget reset
3. Request budget increase

### Slow responses

Check:
1. Is it escalating? (check `metadata.escalated`)
2. Model quality threshold (may take extra requests)
3. Network latency
4. API provider status


