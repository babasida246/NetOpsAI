# API Reference

Complete REST API documentation for NetOpsAI Gateway.

## Table of Contents

- [Overview](#overview)
- [Authentication](#authentication)
- [Error Handling](#error-handling)
- [Health](#health)
- [Chat & Completions](#chat--completions)
- [Models & Providers](#models--providers)
- [Orchestration](#orchestration)
- [Conversations](#conversations)
- [Stats & Usage](#stats--usage)
- [Assets](#assets)
- [CMDB](#cmdb)
- [Warehouse & Maintenance](#warehouse--maintenance)
- [Admin](#admin)
- [NetOps](#netops)

---

## Overview

### Base URL

```
Development: http://localhost:3000
Production:  https://api.netopsai.local
```

### API Documentation

Interactive Swagger UI available at: `/docs`

### Content Type

All requests and responses use JSON:

```http
Content-Type: application/json
Accept: application/json
```

### Request ID

Every request gets a unique correlation ID:

```http
X-Request-Id: uuid
```

---

## Authentication

### Login

```http
POST /api/auth/login
```

**Request:**
```json
{
  "email": "admin@example.com",
  "password": "your-password"
}
```

**Response:**
```json
{
  "accessToken": "eyJhbG...",
  "refreshToken": "eyJhbG...",
  "expiresIn": 86400,
  "user": {
    "id": "uuid",
    "email": "admin@example.com",
    "name": "Admin User",
    "role": "admin"
  }
}
```

### Refresh Token

```http
POST /api/auth/refresh
Authorization: Bearer {refreshToken}
```

### Logout

```http
POST /api/auth/logout
Authorization: Bearer {accessToken}
```

### Get Current User

```http
GET /api/auth/me
Authorization: Bearer {accessToken}
```

### Using Authentication

Include the access token in all authenticated requests:

```http
Authorization: Bearer {accessToken}
```

---

## Error Handling

### Error Response Format

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request parameters",
    "details": {
      "field": "email",
      "issue": "Invalid email format"
    }
  },
  "requestId": "uuid"
}
```

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `UNAUTHORIZED` | 401 | Missing or invalid token |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `VALIDATION_ERROR` | 400 | Invalid request body/params |
| `CONFLICT` | 409 | Resource already exists |
| `RATE_LIMITED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Server error |

---

## Health

### Health Check

```http
GET /health
```

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-01-20T10:00:00.000Z",
  "services": {
    "database": "healthy",
    "redis": "healthy"
  }
}
```

### Readiness Check

```http
GET /health/ready
```

### Liveness Check

```http
GET /health/live
```

---

## Chat & Completions

### Send Message

```http
POST /api/chat/messages
Authorization: Bearer {token}
```

**Request:**
```json
{
  "message": "Hello, how can I help with network troubleshooting?",
  "model": "openai/gpt-4o-mini",
  "conversationId": "uuid (optional)",
  "temperature": 0.7,
  "maxTokens": 4096,
  "systemPrompt": "You are a network operations assistant."
}
```

**Response:**
```json
{
  "message": "I can help you with...",
  "conversationId": "uuid",
  "model": "openai/gpt-4o-mini",
  "provider": "openrouter",
  "usage": {
    "promptTokens": 50,
    "completionTokens": 150,
    "totalTokens": 200,
    "estimatedCost": 0.0003
  },
  "latencyMs": 1200
}
```

### Chat Completions (OpenAI Compatible)

```http
POST /api/completions
Authorization: Bearer {token}
```

**Request:**
```json
{
  "model": "openai/gpt-4o",
  "messages": [
    { "role": "system", "content": "You are a helpful assistant." },
    { "role": "user", "content": "Explain network subnetting." }
  ],
  "temperature": 0.7,
  "maxTokens": 2048,
  "stream": false
}
```

**Response:**
```json
{
  "id": "chatcmpl-xxx",
  "object": "chat.completion",
  "created": 1700000000,
  "model": "openai/gpt-4o",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "Network subnetting is..."
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 20,
    "completion_tokens": 100,
    "total_tokens": 120
  }
}
```

---

## Models & Providers

### List Models

```http
GET /api/models
Authorization: Bearer {token}
```

**Response:**
```json
{
  "data": [
    {
      "id": "openai/gpt-4o",
      "provider": "openrouter",
      "tier": 2,
      "contextWindow": 128000,
      "maxTokens": 4096,
      "costPer1kInput": 0.005,
      "costPer1kOutput": 0.015,
      "enabled": true,
      "supportsStreaming": true,
      "supportsFunctions": true,
      "supportsVision": true
    }
  ]
}
```

### Get Model

```http
GET /api/models/{id}
```

### Create Model

```http
POST /api/models
Authorization: Bearer {token}
```

### Update Model

```http
PUT /api/models/{id}
Authorization: Bearer {token}
```

### Delete Model

```http
DELETE /api/models/{id}
Authorization: Bearer {token}
```

### List Providers

```http
GET /api/providers
Authorization: Bearer {token}
```

### Provider Health Check

```http
GET /api/providers/{id}/health
Authorization: Bearer {token}
```

### OpenRouter Credits

```http
GET /api/providers/openrouter/credits
Authorization: Bearer {token}
```

### Import Model from OpenRouter

```http
POST /api/providers/openrouter/import-model
Authorization: Bearer {token}
```

**Request:**
```json
{
  "modelId": "anthropic/claude-3-opus",
  "priority": 100
}
```

---

## Orchestration

### List Orchestration Rules

```http
GET /api/orchestration
Authorization: Bearer {token}
```

### Create Rule

```http
POST /api/orchestration
Authorization: Bearer {token}
```

**Request:**
```json
{
  "name": "High Quality Fallback",
  "strategy": "fallback",
  "modelSequence": ["openai/gpt-4o", "anthropic/claude-3-opus"],
  "conditions": { "minTokens": 100 },
  "enabled": true,
  "priority": 100
}
```

### Update Rule

```http
PUT /api/orchestration/{id}
Authorization: Bearer {token}
```

### Delete Rule

```http
DELETE /api/orchestration/{id}
Authorization: Bearer {token}
```

---

## Conversations

### List Conversations

```http
GET /api/conversations?limit=20&offset=0
Authorization: Bearer {token}
```

### Get Conversation

```http
GET /api/conversations/{id}
Authorization: Bearer {token}
```

### Create Conversation

```http
POST /api/conversations
Authorization: Bearer {token}
```

**Request:**
```json
{
  "title": "Network Troubleshooting Session",
  "model": "openai/gpt-4o-mini"
}
```

### Update Conversation

```http
PUT /api/conversations/{id}
Authorization: Bearer {token}
```

### Delete Conversation

```http
DELETE /api/conversations/{id}
Authorization: Bearer {token}
```

### List Messages

```http
GET /api/conversations/{id}/messages?limit=50
Authorization: Bearer {token}
```

---

## Stats & Usage

### User Stats

```http
GET /api/stats/chat/user?startDate=2025-01-01&endDate=2025-01-31
Authorization: Bearer {token}
```

### Daily Stats

```http
GET /api/stats/chat/daily?days=30
Authorization: Bearer {token}
```

### Conversation Stats

```http
GET /api/stats/chat/conversations/{id}
Authorization: Bearer {token}
```

### Model Performance

```http
GET /api/models/{id}/performance?days=30
Authorization: Bearer {token}
```

### Model Usage History

```http
GET /api/models/{id}/history?days=30
Authorization: Bearer {token}
```

---

## Assets

### List Assets

```http
GET /api/v1/assets?page=1&pageSize=20&status=in_use
Authorization: Bearer {token}
```

**Query Parameters:**
- `page` - Page number (default: 1)
- `pageSize` - Items per page (default: 20, max: 100)
- `status` - Filter by status: in_stock, in_use, in_repair, retired, disposed, lost
- `locationId` - Filter by location UUID
- `categoryId` - Filter by category UUID
- `search` - Search in asset_code, serial_no, hostname

### Get Asset

```http
GET /api/v1/assets/{id}
Authorization: Bearer {token}
```

### Create Asset

```http
POST /api/v1/assets
Authorization: Bearer {token}
```

**Request:**
```json
{
  "assetCode": "SRV-001",
  "modelId": "uuid",
  "serialNo": "ABC123",
  "macAddress": "00:11:22:33:44:55",
  "mgmtIp": "192.168.1.100",
  "hostname": "server-01",
  "locationId": "uuid",
  "status": "in_stock",
  "purchaseDate": "2025-01-01",
  "warrantyEnd": "2028-01-01"
}
```

### Update Asset

```http
PUT /api/v1/assets/{id}
Authorization: Bearer {token}
```

### Delete Asset

```http
DELETE /api/v1/assets/{id}
Authorization: Bearer {token}
```

### Import Assets (CSV/Excel)

```http
POST /api/v1/assets/import
Content-Type: multipart/form-data
Authorization: Bearer {token}
```

### Catalogs

```http
GET /api/v1/categories
GET /api/v1/vendors
GET /api/v1/models
GET /api/v1/locations
```

### Category Spec Versions

```http
GET /api/v1/category-specs/{categoryId}/versions
POST /api/v1/category-specs/{categoryId}/versions
```

---

## CMDB

### List CI Types

```http
GET /api/v1/cmdb/types
Authorization: Bearer {token}
```

### List CIs

```http
GET /api/v1/cmdb/cis?typeId=uuid&status=active
Authorization: Bearer {token}
```

### Create CI

```http
POST /api/v1/cmdb/cis
Authorization: Bearer {token}
```

### List Relationships

```http
GET /api/v1/cmdb/relationships?ciId=uuid
Authorization: Bearer {token}
```

### Services

```http
GET /api/v1/cmdb/services
POST /api/v1/cmdb/services
GET /api/v1/cmdb/services/{id}/members
```

---

## Warehouse & Maintenance

### Warehouses

```http
GET /api/v1/warehouse/warehouses
POST /api/v1/warehouse/warehouses
```

### Spare Parts

```http
GET /api/v1/warehouse/parts
POST /api/v1/warehouse/parts
```

### Stock

```http
GET /api/v1/warehouse/stock?warehouseId=uuid
```

### Stock Documents

```http
GET /api/v1/warehouse/documents
POST /api/v1/warehouse/documents
POST /api/v1/warehouse/documents/{id}/post
```

### Repair Orders

```http
GET /api/v1/maintenance
POST /api/v1/maintenance
PUT /api/v1/maintenance/{id}
```

### Inventory Sessions

```http
GET /api/v1/inventory
POST /api/v1/inventory
POST /api/v1/inventory/{id}/start
POST /api/v1/inventory/{id}/close
```

---

## Admin

### List Users

```http
GET /api/admin/users
Authorization: Bearer {token}
```

### Create User

```http
POST /api/admin/users
Authorization: Bearer {token}
```

**Request:**
```json
{
  "email": "user@example.com",
  "name": "New User",
  "password": "SecurePass123!",
  "role": "user"
}
```

### Update User

```http
PUT /api/admin/users/{id}
Authorization: Bearer {token}
```

### Delete User

```http
DELETE /api/admin/users/{id}
Authorization: Bearer {token}
```

### Reset Password

```http
POST /api/admin/users/{id}/reset-password
Authorization: Bearer {token}
```

### Audit Logs

```http
GET /api/admin/audit-logs?limit=100&action=login
Authorization: Bearer {token}
```

---

## NetOps

### Devices

```http
GET /api/netops/devices
POST /api/netops/devices
GET /api/netops/devices/{id}
```

### Changes

```http
GET /api/netops/changes
POST /api/netops/changes
GET /api/netops/changes/{id}
```

### Rulepacks

```http
GET /api/netops/rulepacks
POST /api/netops/rulepacks
```

### Configs

```http
GET /api/netops/configs/{deviceId}
GET /api/netops/configs/{deviceId}/versions/{versionId}
```

---

## OpenAPI/Swagger

Full OpenAPI specification available at:

```http
GET /docs/json
```

Swagger UI:

```
http://localhost:3000/docs
```

---

## Rate Limiting

When enabled, rate limits apply:

- Default: 100 requests per minute per user
- Headers returned:
  - `X-RateLimit-Limit`
  - `X-RateLimit-Remaining`
  - `X-RateLimit-Reset`

---

## Next Steps

- 🛠️ [Tools Guide](TOOLS.md)
- 📡 [MCP Servers](MCP_SERVERS.md)
- 🚀 [Deployment](DEPLOYMENT.md)
