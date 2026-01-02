# Gateway API v2.0.0

A clean, standardized REST API built with Fastify and TypeScript.

## Features

- 🚀 **Fastify v5** - High-performance web framework
- 📖 **OpenAPI/Swagger** - Auto-generated API documentation
- 🔐 **JWT Authentication** - Access & refresh tokens with session management
- 🛡️ **Security** - CORS, Helmet, Rate limiting
- ✅ **Validation** - Zod schemas with type safety
- 📊 **Health Checks** - Kubernetes-ready probes
- 🧪 **Testing** - Vitest with 82+ test cases

## API Endpoints

### Health
- `GET /health` - Full health status
- `GET /health/ready` - Readiness probe
- `GET /health/live` - Liveness probe

### Authentication
- `POST /auth/login` - User login
- `POST /auth/register` - User registration
- `POST /auth/refresh` - Refresh access token
- `POST /auth/logout` - Logout
- `GET /auth/me` - Get current user
- `POST /auth/change-password` - Change password

### Chat
- `POST /chat/completions` - Create chat completion (OpenAI compatible)
- `GET /chat/models` - List available models
- `GET /models` - List models (alias)

### Conversations
- `GET /conversations` - List conversations
- `POST /conversations` - Create conversation
- `GET /conversations/:id` - Get conversation
- `PATCH /conversations/:id` - Update conversation
- `DELETE /conversations/:id` - Delete conversation
- `GET /conversations/:id/messages` - List messages
- `POST /conversations/:id/messages` - Create message

### Admin (Admin/Super Admin only)
- `GET /admin/users` - List users
- `POST /admin/users` - Create user
- `GET /admin/users/:id` - Get user
- `PATCH /admin/users/:id` - Update user
- `DELETE /admin/users/:id` - Delete user (Super Admin)
- `POST /admin/users/:id/reset-password` - Reset password
- `GET /admin/stats` - System statistics
- `GET /admin/audit-logs` - Audit logs

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 10+
- PostgreSQL 15+
- Redis 7+

### Environment Variables

```env
NODE_ENV=development
PORT=3000
HOST=0.0.0.0

DATABASE_URL=postgresql://user:pass@localhost:5432/gateway
REDIS_URL=redis://localhost:6379

JWT_ACCESS_SECRET=your-access-secret-key-min-32-chars
JWT_REFRESH_SECRET=your-refresh-secret-key-min-32-chars
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

OPENROUTER_API_KEY=your-openrouter-api-key
LOG_LEVEL=info
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW_MS=60000
```

### Development

```bash
# Install dependencies
pnpm install

# Run development server
pnpm dev

# Run tests
pnpm test

# Run tests with coverage
pnpm test:coverage

# Type check
pnpm typecheck

# Build
pnpm build
```

### API Documentation

Once running, access Swagger UI at: http://localhost:3000/docs

## Project Structure

```
src/
├── config/           # Environment configuration
├── modules/          # Feature modules
│   ├── admin/        # Admin management
│   ├── auth/         # Authentication
│   ├── chat/         # Chat completions
│   ├── conversations/# Conversation management
│   └── health/       # Health checks
├── shared/           # Shared utilities
│   ├── errors/       # HTTP error classes
│   ├── middleware/   # Express middleware
│   ├── schemas/      # Common Zod schemas
│   └── utils/        # Helper functions
├── app.ts            # Fastify app setup
└── main.ts           # Entry point

tests/
├── modules/          # Module tests
├── schemas/          # Schema validation tests
├── shared/           # Shared utilities tests
├── setup.ts          # Test setup
└── utils.ts          # Test utilities
```

## Security

- JWT tokens with configurable expiration
- Bcrypt password hashing (12 rounds)
- Rate limiting per IP
- Security headers via Helmet
- Role-based access control (user/admin/super_admin)
- Session tracking in Redis

## Error Handling

All errors follow a standardized format:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message",
    "details": {}
  },
  "requestId": "uuid"
}
```

HTTP Status Codes:
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `409` - Conflict
- `422` - Validation Error
- `429` - Too Many Requests
- `500` - Internal Server Error
- `503` - Service Unavailable

## License

MIT
