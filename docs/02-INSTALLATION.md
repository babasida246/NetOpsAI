# Installation Guide

> Detailed installation instructions for NetOpsAI Gateway

## System Requirements

### Minimum Requirements

| Component | Specification |
|-----------|--------------|
| CPU | 2 cores |
| RAM | 4 GB |
| Storage | 20 GB SSD |
| OS | Windows 10+, Ubuntu 20.04+, macOS 12+ |

### Recommended for Production

| Component | Specification |
|-----------|--------------|
| CPU | 4+ cores |
| RAM | 8+ GB |
| Storage | 100 GB SSD |
| OS | Ubuntu 22.04 LTS |

## Software Dependencies

### Required

| Software | Version | Purpose |
|----------|---------|---------|
| Docker | 24+ | Container runtime |
| Docker Compose | 2.20+ | Container orchestration |

### For Development

| Software | Version | Purpose |
|----------|---------|---------|
| Node.js | 20+ | JavaScript runtime |
| pnpm | 8+ | Package manager |
| Git | 2.40+ | Version control |

## Docker Installation

### Windows

1. Download [Docker Desktop for Windows](https://www.docker.com/products/docker-desktop/)
2. Run installer and follow prompts
3. Enable WSL 2 backend when prompted
4. Restart computer
5. Verify installation:
   ```powershell
   docker --version
   docker-compose --version
   ```

### macOS

1. Download [Docker Desktop for Mac](https://www.docker.com/products/docker-desktop/)
2. Drag to Applications folder
3. Open Docker Desktop
4. Verify installation:
   ```bash
   docker --version
   docker-compose --version
   ```

### Ubuntu/Debian

```bash
# Update packages
sudo apt update

# Install prerequisites
sudo apt install -y apt-transport-https ca-certificates curl software-properties-common

# Add Docker GPG key
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# Add Docker repository
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Add user to docker group
sudo usermod -aG docker $USER

# Verify
docker --version
docker compose version
```

## Project Installation

### Step 1: Clone Repository

```bash
git clone https://github.com/your-org/netopsai-gateway.git
cd netopsai-gateway
```

### Step 2: Environment Configuration

```bash
# Create environment file
cp .env.example .env
```

Edit `.env` with your settings:

```env
# ============================================
# DATABASE
# ============================================
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your-secure-password
POSTGRES_DB=netopsai_gateway
DATABASE_URL=postgresql://postgres:your-secure-password@postgres:5432/netopsai_gateway

# ============================================
# REDIS
# ============================================
REDIS_URL=redis://redis:6379

# ============================================
# JWT SECRETS (Generate secure random strings)
# ============================================
JWT_ACCESS_SECRET=generate-a-secure-random-string-here
JWT_REFRESH_SECRET=generate-another-secure-random-string

# ============================================
# API CONFIGURATION
# ============================================
API_PORT=3000
API_HOST=0.0.0.0
NODE_ENV=production

# ============================================
# WEB UI
# ============================================
VITE_API_URL=http://localhost:3000

# ============================================
# AI PROVIDERS (Optional - configure in Setup Wizard)
# ============================================
OPENROUTER_API_KEY=
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
```

### Step 3: Build Docker Images

```bash
# Build all images
docker-compose build

# Or build specific service
docker-compose build gateway-api
```

### Step 4: Start Services

```bash
# Start all services in background
docker-compose up -d

# View logs
docker-compose logs -f
```

### Step 5: Verify Installation

```bash
# Check all services are running
docker-compose ps

# Expected output:
# NAME                      STATUS
# netopsai-gateway-api      running (healthy)
# netopsai-gateway-postgres running (healthy)
# netopsai-gateway-redis    running (healthy)
# netopsai-gateway-web-ui   running
```

### Step 6: Run Setup Wizard

1. Open browser: http://localhost:5173/setup
2. Complete the 6-step wizard
3. Login with your admin credentials

## Service Ports

| Service | Port | Description |
|---------|------|-------------|
| Web UI | 5173 | Main web interface |
| API | 3000 | REST API server |
| PostgreSQL | 5432 | Database |
| Redis | 6379 | Cache |
| pgAdmin | 5050 | Database admin (optional) |
| RedisInsight | 5540 | Redis admin (optional) |

## Data Persistence

Docker volumes for persistent data:

| Volume | Path | Purpose |
|--------|------|---------|
| postgres_data | /var/lib/postgresql/data | Database files |
| redis_data | /data | Redis persistence |
| logs | ./logs | Application logs |

## Upgrading

### Standard Upgrade

```bash
# Pull latest code
git pull origin main

# Rebuild images
docker-compose build

# Restart services
docker-compose up -d
```

### Database Migrations

```bash
# Migrations run automatically on startup
# Or manually:
docker-compose exec gateway-api pnpm run migrate
```

## Uninstallation

### Keep Data

```bash
docker-compose down
```

### Remove Everything

```bash
# Stop and remove containers, networks, volumes
docker-compose down -v

# Remove images
docker-compose down --rmi all
```

## Next Steps

- [Configuration Guide](./03-CONFIGURATION.md)
- [Setup Wizard Details](./modules/AUTH.md#setup-wizard)
- [API Documentation](./api/OVERVIEW.md)
