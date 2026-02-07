# Docker Deployment Guide

> Deploy IT Service Hub with Docker

## Prerequisites

- Docker 24.x or higher
- Docker Compose 2.x or higher
- 4GB RAM minimum
- 20GB disk space

---

## Quick Start

### Production Deployment

```bash
# Clone repository
git clone https://github.com/your-org/it-service-hub.git
cd it-service-hub

# Create environment file
cp .env.example .env

# Edit configuration
nano .env

# Start services
docker-compose up -d

# Check status
docker-compose ps
```

---

## Configuration

### Environment Variables

Create `.env` file in project root:

```bash
# ===========================================
# Database Configuration
# ===========================================
POSTGRES_HOST=db
POSTGRES_PORT=5432
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_secure_password
POSTGRES_DB=gateway

# ===========================================
# Redis Configuration
# ===========================================
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password

# ===========================================
# JWT Configuration
# ===========================================
JWT_SECRET=your_very_long_random_secret_key_at_least_32_chars
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# ===========================================
# AI Providers (Optional)
# ===========================================
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...

# ===========================================
# Application Settings
# ===========================================
NODE_ENV=production
LOG_LEVEL=info
```

### docker-compose.yml

```yaml
version: '3.8'

services:
  # PostgreSQL Database
  db:
    image: postgres:15-alpine
    restart: unless-stopped
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./db/init:/docker-entrypoint-initdb.d:ro
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Redis Cache
  redis:
    image: redis:7-alpine
    restart: unless-stopped
    command: redis-server --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "-a", "${REDIS_PASSWORD}", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Gateway API
  gateway-api:
    build:
      context: .
      dockerfile: apps/api/Dockerfile
    restart: unless-stopped
    environment:
      NODE_ENV: production
      DATABASE_URL: postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@db:5432/${POSTGRES_DB}
      REDIS_URL: redis://:${REDIS_PASSWORD}@redis:6379
      JWT_SECRET: ${JWT_SECRET}
      JWT_EXPIRES_IN: ${JWT_EXPIRES_IN}
      JWT_REFRESH_EXPIRES_IN: ${JWT_REFRESH_EXPIRES_IN}
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "wget", "-q", "--spider", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  # Gateway MCP (AI Chat)
  gateway-mcp:
    build:
      context: .
      dockerfile: apps/gateway-mcp/Dockerfile
    restart: unless-stopped
    environment:
      NODE_ENV: production
      REDIS_URL: redis://:${REDIS_PASSWORD}@redis:6379
      OPENAI_API_KEY: ${OPENAI_API_KEY}
      ANTHROPIC_API_KEY: ${ANTHROPIC_API_KEY}
    depends_on:
      redis:
        condition: service_healthy

  # Web UI
  web-ui:
    build:
      context: .
      dockerfile: apps/web-ui/Dockerfile
    restart: unless-stopped
    environment:
      PUBLIC_API_URL: http://gateway-api:3000
    depends_on:
      gateway-api:
        condition: service_healthy

  # Nginx Reverse Proxy
  nginx:
    image: nginx:alpine
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./docker/nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./docker/nginx/ssl:/etc/nginx/ssl:ro
    depends_on:
      - web-ui
      - gateway-api
      - gateway-mcp

volumes:
  postgres_data:
  redis_data:
```

---

## Nginx Configuration

### docker/nginx/nginx.conf

```nginx
events {
    worker_connections 1024;
}

http {
    upstream web-ui {
        server web-ui:8080;
    }

    upstream api {
        server gateway-api:3000;
    }

    upstream mcp {
        server gateway-mcp:3001;
    }

    server {
        listen 80;
        server_name _;

        # Redirect to HTTPS (uncomment for production)
        # return 301 https://$host$request_uri;

        location / {
            proxy_pass http://web-ui;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_cache_bypass $http_upgrade;
        }

        location /api/ {
            proxy_pass http://api/;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        location /mcp/ {
            proxy_pass http://mcp/;
            proxy_http_version 1.1;
            proxy_set_header Connection '';
            proxy_buffering off;
            proxy_cache off;
            chunked_transfer_encoding off;
            # SSE support
            proxy_read_timeout 86400s;
        }
    }

    # HTTPS configuration (uncomment for production)
    # server {
    #     listen 443 ssl http2;
    #     server_name your-domain.com;
    #
    #     ssl_certificate /etc/nginx/ssl/cert.pem;
    #     ssl_certificate_key /etc/nginx/ssl/key.pem;
    #
    #     # ... same location blocks as above
    # }
}
```

---

## Build and Deploy

### Build Images

```bash
# Build all images
docker-compose build

# Build specific service
docker-compose build gateway-api

# Build with no cache
docker-compose build --no-cache
```

### Deploy

```bash
# Start all services
docker-compose up -d

# Start specific service
docker-compose up -d gateway-api

# View logs
docker-compose logs -f

# View logs for specific service
docker-compose logs -f gateway-api
```

### Update

```bash
# Pull latest code
git pull

# Rebuild and restart
docker-compose build
docker-compose up -d
```

---

## Database Management

### Run Migrations

```bash
# Run migrations in running container
docker-compose exec gateway-api pnpm db:migrate
```

### Backup Database

```bash
# Create backup
docker-compose exec db pg_dump -U postgres gateway > backup_$(date +%Y%m%d).sql

# Restore from backup
docker-compose exec -T db psql -U postgres gateway < backup_20240125.sql
```

### Connect to Database

```bash
# psql shell
docker-compose exec db psql -U postgres -d gateway
```

---

## Monitoring

### Health Checks

```bash
# Check all services
docker-compose ps

# Check specific health
docker-compose exec gateway-api wget -q --spider http://localhost:3000/health
```

### View Logs

```bash
# All logs
docker-compose logs

# Follow logs
docker-compose logs -f

# Last 100 lines
docker-compose logs --tail=100

# Specific service
docker-compose logs -f gateway-api
```

### Resource Usage

```bash
# View container stats
docker stats

# View container processes
docker-compose top
```

---

## Troubleshooting

### Common Issues

**Container won't start:**
```bash
# Check logs
docker-compose logs gateway-api

# Check container status
docker-compose ps -a

# Restart service
docker-compose restart gateway-api
```

**Database connection error:**
```bash
# Check database is healthy
docker-compose exec db pg_isready

# Check environment variables
docker-compose exec gateway-api env | grep DATABASE
```

**Port conflict:**
```bash
# Find process using port
netstat -tulpn | grep 80

# Change port in docker-compose.yml
ports:
  - "8080:80"  # Use 8080 instead
```

### Reset Everything

```bash
# Stop and remove containers, networks, volumes
docker-compose down -v

# Remove all images
docker-compose down --rmi all

# Fresh start
docker-compose up -d --build
```

---

## SSL/TLS Setup

### Using Let's Encrypt

```bash
# Install certbot
apt-get install certbot

# Generate certificate
certbot certonly --standalone -d your-domain.com

# Copy certificates
cp /etc/letsencrypt/live/your-domain.com/fullchain.pem docker/nginx/ssl/cert.pem
cp /etc/letsencrypt/live/your-domain.com/privkey.pem docker/nginx/ssl/key.pem

# Update nginx.conf to use HTTPS
# Restart nginx
docker-compose restart nginx
```

### Auto-renewal

```bash
# Add cron job
echo "0 3 * * * certbot renew --quiet && docker-compose restart nginx" | crontab -
```

---

## Scaling

### Scale Services

```bash
# Scale API servers
docker-compose up -d --scale gateway-api=3
```

### Load Balancing

Update nginx.conf for multiple upstreams:

```nginx
upstream api {
    least_conn;
    server gateway-api-1:3000;
    server gateway-api-2:3000;
    server gateway-api-3:3000;
}
```

---

## Security Recommendations

1. **Change default passwords** in `.env`
2. **Enable HTTPS** in production
3. **Restrict ports** - only expose 80/443
4. **Regular updates** - keep images updated
5. **Backup data** - schedule regular backups
6. **Monitor logs** - set up log aggregation
7. **Network isolation** - use Docker networks

---

## Production Checklist

- [ ] Strong passwords configured
- [ ] SSL/TLS enabled
- [ ] Database backups scheduled
- [ ] Log rotation configured
- [ ] Monitoring set up
- [ ] Firewall rules applied
- [ ] Resource limits set
- [ ] Health checks working
