# Database Scripts

This directory contains database initialization, seed, and management scripts for the NetOpsAI Gateway.

## Files

### Schema & Initialization
- **`init-complete.sql`** - Complete database schema (current production structure)
  - Generated from: `pg_dump --schema-only`
  - Use this to create a new database from scratch
- **`current-schema.sql`** - Latest schema export (same as init-complete.sql)

### Data Management
- **`seed-data.sql`** - Seed data for development/testing
  - Organizations, warehouses, locations, vendors, models, users, roles
- **`cleanup-test-data.sql`** - Remove E2E/test data from database
- **`cleanup-seed.sql`** - (Old) Cleanup script
- **`verify_inventory.sql`** - Verification queries for inventory data

### Migrations
- **`migrations/`** - Database migration files
  - See [migrations/README.md](migrations/README.md) for details
  - Only `007_cmdb_core.sql` is currently active
  - Files 003-006 are deprecated (`.deprecated` extension)

## Usage

### Initialize New Database

Using Docker:

```bash
# Copy schema to container
docker cp db/init-complete.sql netopsai-gateway-postgres:/tmp/

# Run initialization
docker exec -i netopsai-gateway-postgres psql -U postgres -d netopsai_gateway -f /tmp/init-complete.sql
```

Or direct psql:

```bash
psql -U postgres -d netopsai_gateway -f db/init-complete.sql
```

### Load Seed Data

```bash
# Copy to container
docker cp db/seed-data.sql netopsai-gateway-postgres:/tmp/

# Load data
docker exec -i netopsai-gateway-postgres psql -U postgres -d netopsai_gateway -f /tmp/seed-data.sql