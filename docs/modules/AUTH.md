# Authentication Module

> User authentication, authorization, and session management

## Overview

The Authentication module provides:
- User registration and login
- JWT-based authentication
- Session management
- Role-based access control
- Password management

## Setup Wizard

First-time system configuration is done through the Setup Wizard.

### Accessing Setup Wizard

Navigate to: `http://localhost:5173/setup`

The wizard will only appear if the system has not been configured yet.

### Step 1: Database Check

Verifies database connection and initializes required tables.

![Database Check](./images/setup-step1.png)

**Actions:**
- Tests PostgreSQL connection
- Creates system tables if needed
- Reports table creation status

### Step 2: Create Admin Account

Creates the first administrator account.

**Form Fields:**

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| Email | email | ✓ | Valid email format |
| First Name | text | ✓ | 2-50 characters |
| Last Name | text | ✓ | 2-50 characters |
| Password | password | ✓ | Min 8 chars, 1 uppercase, 1 number |
| Confirm Password | password | ✓ | Must match password |
| Phone | text | ✗ | Optional |

### Step 3: System Settings

Configure basic system settings.

**Form Fields:**

| Field | Type | Options | Default |
|-------|------|---------|---------|
| Company Name | text | - | - |
| Language | select | Vietnamese, English | Vietnamese |
| Timezone | select | Asia/Ho_Chi_Minh, etc. | Asia/Ho_Chi_Minh |
| Currency | select | VND, USD | VND |

### Step 4: AI Providers

Configure AI provider API keys (optional, can be done later).

**Supported Providers:**

| Provider | API Key Format |
|----------|---------------|
| OpenRouter | sk-or-v1-... |
| OpenAI | sk-... |
| Anthropic | sk-ant-... |

### Step 5: Seed Data

Optionally load demo data for testing.

**Options:**
- [ ] Load sample assets
- [ ] Load sample vendors
- [ ] Load sample locations
- [ ] Load demo conversations

### Step 6: Complete

Finalize setup and redirect to login.

---

## Login Page

### URL
`/login`

### Form Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Email | email | ✓ | User email address |
| Password | password | ✓ | User password |
| Remember Me | checkbox | ✗ | Extend session duration |

### Behavior

1. User enters credentials
2. System validates against database
3. On success:
   - Access token stored in localStorage
   - Refresh token stored in localStorage
   - Redirect to previous page or `/chat`
4. On failure:
   - Display error message
   - Track failed attempts

### Error Messages

| Code | Message | Description |
|------|---------|-------------|
| 401 | Invalid credentials | Wrong email or password |
| 422 | Invalid email format | Email validation failed |
| 423 | Account locked | Too many failed attempts |
| 500 | Server error | Internal error |

---

## Logout

### URL
`/logout`

### Behavior

1. Clears all localStorage tokens
2. Invalidates server session
3. Redirects to `/login`

---

## Password Management

### Change Password

Available in user profile settings.

**Form Fields:**

| Field | Required | Validation |
|-------|----------|------------|
| Current Password | ✓ | Must match existing |
| New Password | ✓ | Min 8 chars, complexity rules |
| Confirm New Password | ✓ | Must match new password |

### Password Reset (Admin)

Administrators can reset user passwords:

1. Navigate to Admin → Users
2. Select user
3. Click "Reset Password"
4. System sends reset link via email

---

## Session Management

### Token Types

| Type | Storage | Expiry | Purpose |
|------|---------|--------|---------|
| Access Token | localStorage | 15 min | API authentication |
| Refresh Token | localStorage | 7 days | Token renewal |

### Token Refresh

Automatic refresh when:
- Access token expires
- API returns 401 status
- Valid refresh token exists

### Session Timeout

- Default: 30 minutes of inactivity
- Configurable in system settings
- Warning shown 5 minutes before expiry

---

## Role-Based Access Control

### Roles

| Role | Level | Description |
|------|-------|-------------|
| admin | 100 | Full system access |
| manager | 75 | Department management |
| operator | 50 | Daily operations |
| viewer | 25 | Read-only access |
| user | 10 | Basic access |

### Permissions

| Permission | admin | manager | operator | viewer |
|------------|-------|---------|----------|--------|
| View Dashboard | ✓ | ✓ | ✓ | ✓ |
| Use Chat | ✓ | ✓ | ✓ | ✓ |
| Manage Assets | ✓ | ✓ | ✓ | ✗ |
| Create Reports | ✓ | ✓ | ✓ | ✗ |
| Manage Users | ✓ | ✓ | ✗ | ✗ |
| System Settings | ✓ | ✗ | ✗ | ✗ |
| Setup Wizard | ✓ | ✗ | ✗ | ✗ |

---

## API Endpoints

### Login

```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "admin@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGc...",
    "refreshToken": "eyJhbGc...",
    "user": {
      "id": "uuid",
      "email": "admin@example.com",
      "name": "Admin User",
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
  "refreshToken": "eyJhbGc..."
}
```

### Logout

```http
POST /api/v1/auth/logout
Authorization: Bearer {accessToken}
```

### Get Current User

```http
GET /api/v1/auth/me
Authorization: Bearer {accessToken}
```

---

## Security Best Practices

1. **Strong Passwords**: Enforce complexity requirements
2. **Token Storage**: Use httpOnly cookies in production
3. **Rate Limiting**: Protect against brute force
4. **HTTPS**: Always use TLS in production
5. **Audit Logging**: Track all authentication events

## Related

- [Chat Module](./CHAT.md) - AI chat requires authentication
- [Admin Module](./ADMIN.md) - User management
- [API Reference](../api/AUTH-API.md) - Full API docs
