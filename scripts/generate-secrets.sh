#!/bin/bash

echo "🔐 Generating secure secrets for production..."
echo ""

# Check for openssl
if ! command -v openssl &> /dev/null; then
    echo "❌ openssl is required but not installed"
    exit 1
fi

# Generate random passwords
PG_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-32)
REDIS_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-32)
JWT_SECRET=$(openssl rand -base64 64 | tr -d "=+/" | cut -c1-64)
ENCRYPTION_KEY=$(openssl rand -hex 32)
GRAFANA_PASSWORD=$(openssl rand -base64 16 | tr -d "=+/" | cut -c1-16)

echo "Generated secrets (save these securely):"
echo "========================================"
echo ""
echo "# Database"
echo "POSTGRES_PASSWORD=${PG_PASSWORD}"
echo ""
echo "# Redis"
echo "REDIS_PASSWORD=${REDIS_PASSWORD}"
echo ""
echo "# Security"
echo "JWT_SECRET=${JWT_SECRET}"
echo "ENCRYPTION_KEY=${ENCRYPTION_KEY}"
echo ""
echo "# Monitoring"
echo "GRAFANA_PASSWORD=${GRAFANA_PASSWORD}"
echo ""
echo "========================================"
echo ""
echo "⚠️  Copy these to your .env.production file"
echo "⚠️  NEVER commit these to git!"
echo ""
echo "To create .env.production:"
echo "  cp .env.production.example .env.production"
echo "  # Then paste the secrets above"
