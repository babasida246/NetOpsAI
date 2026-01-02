# API Reference

Complete REST API documentation for MCP Server Gateway.

## Base URL

```
Development: http://localhost:3000
Production: https://api.mcp-server.example.com
```

## Authentication

All endpoints require authentication via `x-user-id` header:

```bash
curl -H "x-user-id: user123" http://localhost:3000/v1/conversations
```

Future versions will support API Key authentication:

```bash
curl -H "Authorization: Bearer sk_..." http://localhost:3000/v1/conversations
```

## Common Response Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request - Invalid input |
| 401 | Unauthorized - Missing/invalid auth |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found |
| 429 | Too Many Requests - Rate limited |
| 500 | Internal Server Error |

## Error Response Format

```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {
    "field": "validation error"
  }
}
```

---

## Conversations

### Create Conversation

**POST** `/v1/conversations`

Create a new conversation.

#### Request Body

```json
{
  "title": "My Conversation" // Optional, defaults to "New Conversation"
}
```

#### Response (201)

```json
{
  "id": "conv_abc123",
  "userId": "user123",
  "title": "My Conversation",
  "archived": false,
  "pinned": false,
  "createdAt": "2024-12-24T10:00:00Z",
  "updatedAt": "2024-12-24T10:00:00Z"
}
```

#### Example

```bash
curl -X POST http://localhost:3000/v1/conversations \
  -H "Content-Type: application/json" \
  -H "x-user-id: user123" \
  -d '{"title": "AI Discussion"}'
```

---

### List Conversations

**GET** `/v1/conversations`

Get all conversations for the authenticated user.

#### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| limit | integer | 50 | Max conversations to return (1-100) |
| offset | integer | 0 | Pagination offset |
| archived | boolean | false | Include archived conversations |

#### Response (200)

```json
{
  "conversations": [
    {
      "id": "conv_abc123",
      "userId": "user123",
      "title": "My Conversation",
      "archived": false,
      "pinned": false,
      "createdAt": "2024-12-24T10:00:00Z",
      "updatedAt": "2024-12-24T10:00:00Z"
    }
  ],
  "total": 1,
  "limit": 50,
  "offset": 0
}
```

#### Example

```bash
curl http://localhost:3000/v1/conversations?limit=10 \
  -H "x-user-id: user123"
```

---

### Get Conversation

**GET** `/v1/conversations/:id`

Get a specific conversation by ID.

#### Response (200)

```json
{
  "id": "conv_abc123",
  "userId": "user123",
  "title": "My Conversation",
  "archived": false,
  "pinned": false,
  "createdAt": "2024-12-24T10:00:00Z",
  "updatedAt": "2024-12-24T10:00:00Z"
}
```

#### Example

```bash
curl http://localhost:3000/v1/conversations/conv_abc123 \
  -H "x-user-id: user123"
```

---

### Update Conversation

**PATCH** `/v1/conversations/:id`

Update conversation properties.

#### Request Body

```json
{
  "title": "Updated Title",     // Optional
  "archived": true,              // Optional
  "pinned": true                 // Optional
}
```

#### Response (200)

```json
{
  "id": "conv_abc123",
  "userId": "user123",
  "title": "Updated Title",
  "archived": true,
  "pinned": true,
  "updatedAt": "2024-12-24T11:00:00Z"
}
```

#### Example

```bash
curl -X PATCH http://localhost:3000/v1/conversations/conv_abc123 \
  -H "Content-Type: application/json" \
  -H "x-user-id: user123" \
  -d '{"title": "New Title"}'
```

---

### Delete Conversation

**DELETE** `/v1/conversations/:id`

Delete a conversation and all its messages.

#### Response (204)

No content

#### Example

```bash
curl -X DELETE http://localhost:3000/v1/conversations/conv_abc123 \
  -H "x-user-id: user123"
```

---

## Messages

### Send Message

**POST** `/v1/conversations/:conversationId/messages`

Send a message and get LLM response.

#### Request Body

```json
{
  "content": "Explain quantum computing",  // Required
  "model": "gpt-4",                        // Optional
  "temperature": 0.7,                      // Optional (0.0-2.0)
  "maxTokens": 1000,                       // Optional
  "importance": "medium",                  // Optional: low, medium, high, critical
  "tools": ["calculator", "web_search"]    // Optional
}
```

#### Response (200)

```json
{
  "id": "msg_xyz789",
  "conversationId": "conv_abc123",
  "role": "assistant",
  "content": "Quantum computing uses quantum mechanics...",
  "model": "gpt-4",
  "tier": 2,
  "tokens": {
    "input": 15,
    "output": 120,
    "total": 135
  },
  "cost": 0.00405,
  "createdAt": "2024-12-24T10:05:00Z"
}
```

#### Example

```bash
curl -X POST http://localhost:3000/v1/conversations/conv_abc123/messages \
  -H "Content-Type: application/json" \
  -H "x-user-id: user123" \
  -d '{
    "content": "What is machine learning?",
    "temperature": 0.7
  }'
```

---

### List Messages

**GET** `/v1/conversations/:conversationId/messages`

Get all messages in a conversation.

#### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| limit | integer | 50 | Max messages to return |
| offset | integer | 0 | Pagination offset |

#### Response (200)

```json
{
  "messages": [
    {
      "id": "msg_xyz789",
      "conversationId": "conv_abc123",
      "role": "user",
      "content": "Explain quantum computing",
      "createdAt": "2024-12-24T10:05:00Z"
    },
    {
      "id": "msg_def456",
      "conversationId": "conv_abc123",
      "role": "assistant",
      "content": "Quantum computing uses...",
      "model": "gpt-4",
      "tokens": {
        "input": 15,
        "output": 120,
        "total": 135
      },
      "cost": 0.00405,
      "createdAt": "2024-12-24T10:05:01Z"
    }
  ],
  "total": 2,
  "limit": 50,
  "offset": 0
}
```

---

### Stream Message (SSE)

**GET** `/v1/conversations/:conversationId/messages/:messageId/stream`

Stream message response using Server-Sent Events.

#### Response

```
event: token
data: {"content": "Quantum"}

event: token
data: {"content": " computing"}

event: done
data: {"model": "gpt-4", "tokens": 135, "cost": 0.00405}
```

#### Example

```bash
curl -N http://localhost:3000/v1/conversations/conv_abc123/messages/msg_xyz789/stream \
  -H "x-user-id: user123"
```

---

## Models

### List Available Models

**GET** `/v1/models/available`

Get all models available to the user based on their tier.

#### Response (200)

```json
{
  "models": [
    {
      "id": "gpt-4",
      "name": "GPT-4",
      "provider": "openai",
      "tier": 2,
      "maxTokens": 8192,
      "costPer1kTokens": {
        "input": 0.03,
        "output": 0.06
      },
      "capabilities": ["chat", "function-calling", "vision"]
    }
  ],
  "tiers": [
    {
      "tier": 0,
      "name": "Free",
      "models": ["gemini-flash", "mistral-small"]
    },
    {
      "tier": 1,
      "name": "Standard",
      "models": ["gpt-3.5-turbo", "claude-haiku"]
    }
  ]
}
```

---

### Get Model Details

**GET** `/v1/models/:modelId`

Get detailed information about a specific model.

#### Response (200)

```json
{
  "id": "gpt-4",
  "name": "GPT-4",
  "provider": "openai",
  "tier": 2,
  "maxTokens": 8192,
  "contextWindow": 8192,
  "costPer1kTokens": {
    "input": 0.03,
    "output": 0.06
  },
  "capabilities": ["chat", "function-calling", "vision"],
  "description": "Most capable GPT-4 model",
  "releaseDate": "2023-03-14"
}
```

---

## Rate Limits

Rate limits are enforced per user per tier:

| Tier | Requests/Minute | Requests/Hour | Daily Tokens |
|------|-----------------|---------------|--------------|
| Free (0) | 5 | 50 | 50,000 |
| Standard (1) | 20 | 200 | 200,000 |
| Advanced (2) | 60 | 1000 | 1,000,000 |
| Premium (3) | Unlimited | Unlimited | Unlimited |

Rate limit headers are included in all responses:

```
X-RateLimit-Limit: 20
X-RateLimit-Remaining: 15
X-RateLimit-Reset: 1640000000
```

---

## Webhooks (Coming Soon)

Subscribe to events:

- `conversation.created`
- `message.created`
- `message.completed`
- `tier.escalated`
- `rate_limit.exceeded`

---

## SDKs

Official SDKs available:

- **Node.js**: `npm install @mcp-server/sdk`
- **Python**: `pip install mcp-server-sdk`
- **Go**: `go get github.com/mcp-server/sdk-go`

---

## Postman Collection

Import the Postman collection for easy testing:

```bash
curl https://api.mcp-server.example.com/postman/collection.json > mcp-server.postman.json
```

---

**Next**: See [WebSocket API](./WEBSOCKET.md) for real-time communication.
