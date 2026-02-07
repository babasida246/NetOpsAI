# API Reference

> REST API documentation for IT Service Hub

## Overview

The IT Service Hub provides a REST API for all functionality. The API follows RESTful conventions with JSON request/response bodies.

### Base URL

```
Production: https://your-domain.com/api/v1
Development: http://localhost:3000/api/v1
```

### Authentication

All API endpoints (except `/auth/login` and `/setup/*`) require authentication via JWT Bearer token.

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Response Format

**Success Response:**
```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

**Error Response:**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      { "field": "email", "message": "Invalid email format" }
    ]
  }
}
```

### HTTP Status Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 201 | Created |
| 204 | No Content |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 422 | Validation Error |
| 500 | Server Error |

---

## API Modules

### Authentication & Users

- [POST /auth/login](#login)
- [POST /auth/refresh](#refresh-token)
- [POST /auth/logout](#logout)
- [GET /users/me](#current-user)
- [PUT /users/me/password](#change-password)

### Setup (First-time configuration)

- [GET /setup/status](#setup-status)
- [POST /setup/admin](#create-admin)
- [POST /setup/complete](#complete-setup)

### Assets

- [GET /assets](#list-assets)
- [POST /assets](#create-asset)
- [GET /assets/:id](#get-asset)
- [PUT /assets/:id](#update-asset)
- [DELETE /assets/:id](#delete-asset)

### Categories

- [GET /categories](#list-categories)
- [POST /categories](#create-category)
- [PUT /categories/:id](#update-category)

### Models

- [GET /models](#list-models)
- [POST /models](#create-model)

### Vendors

- [GET /vendors](#list-vendors)
- [POST /vendors](#create-vendor)

### Locations

- [GET /locations](#list-locations)
- [POST /locations](#create-location)

### CMDB

- [GET /cmdb/cis](#list-cis)
- [POST /cmdb/cis](#create-ci)
- [GET /cmdb/ci-types](#list-ci-types)
- [POST /cmdb/relationships](#create-relationship)

### Warehouse

- [GET /warehouse/parts](#list-parts)
- [POST /warehouse/parts](#create-part)
- [POST /warehouse/stock-in](#stock-in)
- [POST /warehouse/stock-out](#stock-out)

### Maintenance

- [GET /maintenance/tickets](#list-tickets)
- [POST /maintenance/tickets](#create-ticket)
- [POST /maintenance/tickets/:id/assign](#assign-ticket)
- [POST /maintenance/tickets/:id/complete](#complete-ticket)

### QLTS

- [GET /qlts/purchase-plans](#list-plans)
- [POST /qlts/purchase-plans](#create-plan)
- [GET /qlts/asset-increases](#list-increases)
- [POST /qlts/asset-increases](#create-increase)

### Chat

- [GET /chat/conversations](#list-conversations)
- [POST /chat/conversations](#create-conversation)
- [POST /chat/conversations/:id/messages](#send-message)
- [GET /chat/usage](#token-usage)

### Network

- [GET /network/devices](#list-devices)
- [POST /network/devices](#create-device)
- [POST /network/devices/:id/backup](#backup-config)

---

## Authentication Endpoints

### Login

```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
    "expiresIn": 900,
    "user": {
      "id": "uuid",
      "username": "admin",
      "email": "admin@example.com",
      "fullName": "Administrator",
      "role": "admin"
    }
  }
}
```

### Refresh Token

```http
POST /api/v1/auth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

### Logout

```http
POST /api/v1/auth/logout
Authorization: Bearer {token}
```

### Current User

```http
GET /api/v1/users/me
Authorization: Bearer {token}
```

### Change Password

```http
PUT /api/v1/users/me/password
Authorization: Bearer {token}
Content-Type: application/json

{
  "currentPassword": "oldpassword",
  "newPassword": "newpassword123"
}
```

---

## Setup Endpoints

### Setup Status

```http
GET /api/v1/setup/status
```

**Response:**
```json
{
  "success": true,
  "data": {
    "isCompleted": false,
    "hasAdmin": false,
    "hasDatabase": true
  }
}
```

### Create Admin

```http
POST /api/v1/setup/admin
Content-Type: application/json

{
  "username": "admin",
  "email": "admin@example.com",
  "password": "securepassword",
  "fullName": "System Administrator"
}
```

### Complete Setup

```http
POST /api/v1/setup/complete
Content-Type: application/json

{
  "systemName": "IT Service Hub",
  "timezone": "Asia/Ho_Chi_Minh",
  "locale": "vi"
}
```

---

## Assets Endpoints

### List Assets

```http
GET /api/v1/assets?page=1&limit=20&category_id=uuid&status=active
Authorization: Bearer {token}
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| page | number | Page number (default: 1) |
| limit | number | Items per page (default: 20) |
| search | string | Search in name, code |
| category_id | uuid | Filter by category |
| status | string | Filter by status |
| location_id | uuid | Filter by location |
| assigned_to | uuid | Filter by assignee |

### Create Asset

```http
POST /api/v1/assets
Authorization: Bearer {token}
Content-Type: application/json

{
  "code": "PC-IT-0001",
  "name": "Dell OptiPlex 7020",
  "category_id": "uuid",
  "model_id": "uuid",
  "vendor_id": "uuid",
  "serial_number": "ABC12345",
  "purchase_date": "2024-01-15",
  "purchase_price": 15000000,
  "location_id": "uuid",
  "assigned_to": "uuid",
  "status": "active",
  "specifications": {
    "cpu": "Intel Core i5",
    "ram": "16GB",
    "storage": "512GB SSD"
  }
}
```

### Get Asset

```http
GET /api/v1/assets/{id}
Authorization: Bearer {token}
```

### Update Asset

```http
PUT /api/v1/assets/{id}
Authorization: Bearer {token}
Content-Type: application/json

{
  "status": "maintenance",
  "location_id": "new-uuid"
}
```

### Delete Asset

```http
DELETE /api/v1/assets/{id}
Authorization: Bearer {token}
```

---

## Categories Endpoints

### List Categories

```http
GET /api/v1/categories?parent_id=uuid
Authorization: Bearer {token}
```

### Create Category

```http
POST /api/v1/categories
Authorization: Bearer {token}
Content-Type: application/json

{
  "code": "IT-PC",
  "name": "Personal Computer",
  "parent_id": "uuid",
  "description": "Desktop and laptop computers",
  "depreciation_years": 3
}
```

---

## Vendors Endpoints

### List Vendors

```http
GET /api/v1/vendors?type=supplier
Authorization: Bearer {token}
```

### Create Vendor

```http
POST /api/v1/vendors
Authorization: Bearer {token}
Content-Type: application/json

{
  "code": "VD-001",
  "name": "Dell Vietnam",
  "type": "both",
  "contact_name": "Nguyen Van A",
  "phone": "028-1234-5678",
  "email": "sales@dell.com.vn",
  "address": "123 ABC Street, District 1, HCMC"
}
```

---

## Chat Endpoints

### List Conversations

```http
GET /api/v1/chat/conversations?page=1&limit=20
Authorization: Bearer {token}
```

### Create Conversation

```http
POST /api/v1/chat/conversations
Authorization: Bearer {token}
Content-Type: application/json

{
  "title": "New conversation"
}
```

### Send Message

```http
POST /api/v1/chat/conversations/{id}/messages
Authorization: Bearer {token}
Content-Type: application/json

{
  "content": "How do I create a new asset?",
  "provider": "openai"
}
```

**Response (streamed):**
```
data: {"type": "chunk", "content": "To create"}
data: {"type": "chunk", "content": " a new asset"}
data: {"type": "chunk", "content": ", navigate to..."}
data: {"type": "done", "usage": {"prompt_tokens": 50, "completion_tokens": 120}}
```

### Token Usage

```http
GET /api/v1/chat/usage?period=month
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "period": "2024-01",
    "totalTokens": 125000,
    "promptTokens": 45000,
    "completionTokens": 80000,
    "estimatedCost": 2.50,
    "byProvider": {
      "openai": { "tokens": 100000, "cost": 2.00 },
      "anthropic": { "tokens": 25000, "cost": 0.50 }
    }
  }
}
```

---

## Pagination

All list endpoints support pagination:

```http
GET /api/v1/assets?page=2&limit=50
```

**Response meta:**
```json
{
  "meta": {
    "page": 2,
    "limit": 50,
    "total": 245,
    "totalPages": 5,
    "hasNext": true,
    "hasPrev": true
  }
}
```

---

## Filtering

Use query parameters for filtering:

```http
GET /api/v1/assets?status=active&category_id=uuid&created_after=2024-01-01
```

**Common filter operators:**

| Suffix | Description | Example |
|--------|-------------|---------|
| (none) | Equals | `status=active` |
| _ne | Not equals | `status_ne=retired` |
| _gt | Greater than | `price_gt=1000000` |
| _gte | Greater or equal | `date_gte=2024-01-01` |
| _lt | Less than | `price_lt=5000000` |
| _lte | Less or equal | `date_lte=2024-12-31` |
| _in | In list | `status_in=active,maintenance` |
| _like | Contains | `name_like=Dell` |

---

## Sorting

Use `sort` parameter:

```http
GET /api/v1/assets?sort=created_at:desc,name:asc
```

---

## Rate Limiting

API requests are rate limited:

| Endpoint | Limit |
|----------|-------|
| /auth/login | 5 req/min |
| /chat/* | 60 req/min |
| Other | 100 req/min |

**Rate limit headers:**
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1706234400
```

---

## Error Codes

| Code | Description |
|------|-------------|
| AUTH_REQUIRED | Authentication required |
| AUTH_INVALID | Invalid credentials |
| TOKEN_EXPIRED | Token has expired |
| ACCESS_DENIED | Permission denied |
| NOT_FOUND | Resource not found |
| VALIDATION_ERROR | Input validation failed |
| DUPLICATE_ENTRY | Unique constraint violation |
| SERVER_ERROR | Internal server error |

---

## Webhooks

Configure webhooks for real-time notifications:

```http
POST /api/v1/webhooks
Authorization: Bearer {token}
Content-Type: application/json

{
  "url": "https://your-app.com/webhook",
  "events": ["asset.created", "ticket.completed"],
  "secret": "your-webhook-secret"
}
```

**Webhook payload:**
```json
{
  "event": "asset.created",
  "timestamp": "2024-01-25T14:30:00Z",
  "data": {
    "id": "uuid",
    "code": "PC-IT-0001",
    "name": "Dell OptiPlex 7020"
  }
}
```

---

## SDK & Libraries

Coming soon:
- JavaScript/TypeScript SDK
- Python SDK
- CLI Tool
