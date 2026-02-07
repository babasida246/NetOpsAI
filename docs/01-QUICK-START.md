# Quick Start Guide

> Get NetOpsAI Gateway running in 5 minutes

## Prerequisites

- **Docker Desktop** (recommended) or:
  - Node.js 20+
  - pnpm 8+
  - PostgreSQL 15+
  - Redis 7+

## Option 1: Docker (Recommended)

### Step 1: Clone Repository

```bash
git clone https://github.com/your-org/netopsai-gateway.git
cd netopsai-gateway
```

### Step 2: Configure Environment

```bash
# Copy example environment file
cp .env.example .env

# Edit with your settings (optional for development)
```

### Step 3: Start Services

```bash
# Build and start all containers
docker-compose up -d

# Check status
docker-compose ps
```

### Step 4: Access the Application

| Service | URL | Description |
|---------|-----|-------------|
| Web UI | http://localhost:5173 | Main web interface |
| API | http://localhost:3000 | REST API |
| pgAdmin | http://localhost:5050 | Database admin |
| RedisInsight | http://localhost:5540 | Redis admin |

### Step 5: Run Setup Wizard

1. Open http://localhost:5173/setup
2. Follow the 6-step setup wizard:
   - Database initialization
   - Create admin account
   - System settings
   - AI provider configuration
   - Seed data (optional)
   - Complete setup

## Option 2: Local Development

### Step 1: Install Dependencies

```bash
# Install pnpm globally
npm install -g pnpm

# Install project dependencies
pnpm install
```

### Step 2: Setup Database

```bash
# Start PostgreSQL and Redis via Docker
docker-compose up -d postgres redis

# Or use local installations
```

### Step 3: Configure Environment

Create `.env` file in project root:

```env
# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/netopsai_gateway
REDIS_URL=redis://localhost:6379

# JWT
JWT_ACCESS_SECRET=your-access-secret-key
JWT_REFRESH_SECRET=your-refresh-secret-key

# API
API_PORT=3000
API_HOST=0.0.0.0
```

### Step 4: Build & Run

```bash
# Build all packages
pnpm build:all

# Start development servers
pnpm dev
```

## First Login

After setup wizard completion:

1. Navigate to http://localhost:5173/login
2. Enter the admin credentials you created during setup
3. You'll be redirected to the main dashboard

## Next Steps

- [Configuration Guide](./03-CONFIGURATION.md) - Advanced configuration
- [User Guide](./modules/AUTH.md) - Learn about authentication
- [Chat & AI](./modules/CHAT.md) - Start using AI features

## Troubleshooting

### Docker Issues

```bash
# View logs
docker-compose logs -f

# Restart services
docker-compose restart

# Full rebuild
docker-compose down -v
docker-compose up --build -d
```

### Database Connection

```bash
# Check PostgreSQL status
docker-compose exec postgres pg_isready

# Check Redis status
docker-compose exec redis redis-cli ping
```

### Port Conflicts

If ports are in use, modify `docker-compose.yml`:

```yaml
services:
  web-ui:
    ports:
      - "8080:5173"  # Change 5173 to 8080
```

## Support

Having issues? Check:
- [Installation Guide](./02-INSTALLATION.md) for detailed setup
- [GitHub Issues](https://github.com/your-org/netopsai/issues) for known problems
