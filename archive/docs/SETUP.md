# Setup & Installation Guide

## System Requirements

### Minimum
- **CPU**: 2 cores
- **RAM**: 4GB
- **Disk**: 10GB
- **Node.js**: >= 18.0.0
- **pnpm**: >= 8.0.0

### Recommended
- **CPU**: 4+ cores
- **RAM**: 8GB+
- **Disk**: 50GB+
- **Node.js**: >= 20.0.0

## Installation Steps

### 1. Clone Repository

```bash
git clone https://github.com/NetOpsAI/gateway.git
cd gateway
```

### 2. Install Node Dependencies

```bash
# Install pnpm if not already installed
npm install -g pnpm

# Install all dependencies
pnpm install
```

### 3. Setup Environment Variables

```bash
# Copy example config
cp .env.example .env

# Edit with your values
nano .env
```

Required variables:
- `OPENROUTER_API_KEY`: Get from https://openrouter.ai/keys
- `DATABASE_URL`: PostgreSQL connection string
- `REDIS_URL`: Redis connection string

### 4. Setup Services (Docker)

```bash
# Create docker-compose.yml
cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
      POSTGRES_DB: netopsai_gateway
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
  redis_data:
EOF

# Start services
docker-compose up -d

# Wait for services to be healthy
docker-compose exec postgres pg_isready -U postgres
docker-compose exec redis redis-cli ping
```

### Alternative: Manual Setup

#### PostgreSQL (Windows)

```bash
# Download from https://www.postgresql.org/download/windows/
# Run installer, remember password
# Create database
psql -U postgres -c "CREATE DATABASE netopsai_gateway;"
```

#### PostgreSQL (macOS)

```bash
# Using Homebrew
brew install postgresql@15

# Start service
brew services start postgresql@15

# Create database
createdb netopsai_gateway
```

#### PostgreSQL (Linux)

```bash
# Ubuntu/Debian
sudo apt-get install postgresql postgresql-contrib

# Start service
sudo systemctl start postgresql

# Create database
sudo -u postgres createdb netopsai_gateway
```

#### Redis (Windows)

Download from: https://github.com/microsoftarchive/redis/releases

#### Redis (macOS)

```bash
# Using Homebrew
brew install redis

# Start service
brew services start redis
```

#### Redis (Linux)

```bash
# Ubuntu/Debian
sudo apt-get install redis-server

# Start service
sudo systemctl start redis-server
```

### 5. Build All Packages

```bash
# Build everything
pnpm build

# This runs:
# - TypeScript compilation
# - ESM bundling with tsup
# - Type declaration generation
```

### 6. Initialize Database

```bash
# Create tables and indexes
psql -h localhost -U postgres -d netopsai_gateway < packages/infra-postgres/src/schema.sql

# Seed model configurations
pnpm --filter gateway-cli dev seed
```

### 7. Verify Installation

```bash
# Check Postgres
psql -h localhost -U postgres -d netopsai_gateway -c "SELECT COUNT(*) FROM model_configs;"

# Check Redis
redis-cli ping
# Should return: PONG

# Check CLI
pnpm --filter gateway-cli dev status

# Should output:
# ✓ Postgres: Connected
# ✓ Redis: Connected
# ✓ OpenRouter API Key: Configured
# Status check complete!
```

## Development Setup

### VS Code Extensions (Recommended)

```
- ESLint
- Prettier
- TypeScript Vue Plugin
- ES7+ snippets
- Thunder Client (for API testing)
```

### Pre-commit Hooks

```bash
# Install husky
pnpm add -D husky

# Setup hooks
npx husky install

# Add lint-staged
pnpm add -D lint-staged

# Create .husky/pre-commit
npx husky add .husky/pre-commit "pnpm lint-staged"
```

### IDE Configuration

Create `.vscode/settings.json`:

```json
{
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.formatOnSave": true,
  "[typescript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "typescript.tsdk": "node_modules/typescript/lib",
  "typescript.enablePromptUseWorkspaceTsdk": true,
  "search.exclude": {
    "**/node_modules": true,
    "**/dist": true,
    "pnpm-lock.yaml": true
  }
}
```

## First Run

### Start Development Server

```bash
# Terminal 1: Start API
cd apps/gateway-api
pnpm dev

# Should output:
# Initializing container...
# Postgres connected
# Redis connected
# Container initialized successfully
# Server listening on http://0.0.0.0:3000
```

### Test API

```bash
# Terminal 2: Test endpoint
curl http://localhost:3000/health

# Response:
# {
#   "status": "healthy",
#   "checks": {
#     "postgres": true,
#     "redis": true
#   },
#   "timestamp": "2024-12-20T10:00:00.000Z"
# }
```

### First Chat Request

```bash
curl -X POST http://localhost:3000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "x-user-id: test-user" \
  -d '{
    "messages": [
      {
        "role": "user",
        "content": "Say hello in exactly 3 words"
      }
    ]
  }'
```

## Troubleshooting Installation

### Port Already in Use

```bash
# Find process using port
lsof -i :3000

# Kill process
kill -9 <PID>

# Or use different port
PORT=3001 pnpm --filter gateway-api dev
```

### Module Not Found Errors

```bash
# Reinstall dependencies
rm -rf node_modules
pnpm install

# Rebuild
pnpm build

# Clear cache
pnpm store prune
```

### Database Connection Failed

```bash
# Check if Postgres is running
psql --version

# Test connection
psql -h localhost -U postgres -d netopsai_gateway -c "SELECT 1"

# If fails, check:
# 1. Postgres is running
# 2. DATABASE_URL is correct
# 3. Database exists: psql -l
```

### Redis Connection Failed

```bash
# Check if Redis is running
redis-cli ping

# If fails:
# 1. Check service is running
# 2. Check REDIS_URL in .env
# 3. Test with redis-cli -u <url>
```

### OpenRouter API Key Not Working

```bash
# Verify key format
# Keys start with: sk-or-v1-

# Test API
curl https://openrouter.ai/api/v1/models \
  -H "Authorization: Bearer YOUR_KEY"

# Common issues:
# - Key is for wrong account
# - Key has limited quota
# - Key is expired
```

## Production Deployment

### Build for Production

```bash
# Build all packages
pnpm build --prod

# Build specific app
pnpm --filter @apps/gateway-api build
```

### Environment Setup

```bash
# Create .env.production
NODE_ENV=production
PORT=3000
LOG_LEVEL=info

DATABASE_URL=postgresql://user:password@prod-db:5432/netopsai_gateway
REDIS_URL=redis://prod-redis:6379

OPENROUTER_API_KEY=sk-or-v1-PRODUCTION-KEY
```

### Run Server

```bash
# Start production server
NODE_ENV=production pnpm --filter gateway-api start

# Or with PM2
pm2 start dist/server.js --name "netopsai-gateway"
```

### Monitor Logs

```bash
# View real-time logs
pm2 logs netopsai-gateway

# View logs with specific format
pm2 logs netopsai-gateway --format=json
```

## Backup & Recovery

### Database Backup

```bash
# Full backup
pg_dump netopsai_gateway > backup.sql

# Compressed backup
pg_dump netopsai_gateway | gzip > backup.sql.gz

# Restore
psql netopsai_gateway < backup.sql
```

### Redis Backup

```bash
# Manual snapshot
redis-cli BGSAVE

# Backup RDB file
cp /var/lib/redis/dump.rdb ./redis-backup.rdb
```

## Upgrade Guide

### From Phase 3 to Phase 4

```bash
# 1. Backup database
pg_dump netopsai_gateway > backup-phase3.sql

# 2. Pull latest code
git pull origin main

# 3. Install new dependencies
pnpm install

# 4. Rebuild
pnpm build

# 5. Seed new models
pnpm --filter gateway-cli dev seed

# 6. Test
pnpm test

# 7. Restart
pnpm --filter gateway-api start
```

## Getting Help

- Check logs: `pnpm --filter gateway-api dev 2>&1 | grep -i error`
- Review docs: See `docs/` folder
- Check GitHub Issues
- Contact DevOps team


