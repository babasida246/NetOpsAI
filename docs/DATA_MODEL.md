# Data Model

Complete PostgreSQL schema documentation for NetOpsAI Gateway.

## Table of Contents

- [Overview](#overview)
- [Core Tables](#core-tables)
- [Asset Management](#asset-management)
- [CMDB](#cmdb)
- [Warehouse & Maintenance](#warehouse--maintenance)
- [Entity Relationship Diagram](#entity-relationship-diagram)
- [Indexes](#indexes)
- [Redis Cache Strategy](#redis-cache-strategy)
- [Migration Strategy](#migration-strategy)

---

## Overview

The database uses PostgreSQL 15+ with:

- **UUID primary keys** – `uuid_generate_v4()`
- **JSONB** for flexible metadata
- **Timestamptz** for all datetime fields
- **Cascading deletes** where appropriate
- **Check constraints** for enum validation

Schema location: `packages/infra-postgres/src/schema.sql`

---

## Core Tables

### Users & Sessions

```sql
-- Users: Application users
users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  username VARCHAR(255) UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'user',     -- user, admin, super_admin
  is_active BOOLEAN DEFAULT true,
  tier VARCHAR(50) DEFAULT 'free',
  status VARCHAR(20) DEFAULT 'active',
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)

-- Sessions: JWT session tracking
sessions (
  id UUID PRIMARY KEY,
  user_id UUID → users(id),
  token VARCHAR(500) UNIQUE NOT NULL,
  refresh_token VARCHAR(500) UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  refresh_expires_at TIMESTAMPTZ NOT NULL,
  ip_address VARCHAR(45),
  user_agent TEXT,
  is_revoked BOOLEAN DEFAULT false,
  last_activity_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ
)
```

### Conversations & Messages

```sql
-- Conversations: Chat threads
conversations (
  id UUID PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  title VARCHAR(255) NOT NULL,
  model VARCHAR(255) DEFAULT 'openai/gpt-4o-mini',
  status VARCHAR(20) DEFAULT 'active',
  message_count INT DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)

-- Messages: Individual messages
messages (
  id UUID PRIMARY KEY,
  conversation_id UUID → conversations(id) CASCADE,
  role VARCHAR(20) NOT NULL,  -- user, assistant, system, tool
  content TEXT NOT NULL,
  model VARCHAR(255),
  provider VARCHAR(50),
  prompt_tokens INT DEFAULT 0,
  completion_tokens INT DEFAULT 0,
  cost DECIMAL(12,4),
  latency_ms INT,
  metadata JSONB DEFAULT '{}',
  tool_calls JSONB,
  tool_call_id VARCHAR(255),
  token_count INT DEFAULT 0,
  created_at TIMESTAMPTZ
)
```

### Model Configuration

```sql
-- AI Model configurations
model_configs (
  id VARCHAR(100) PRIMARY KEY,  -- e.g., 'openai/gpt-4o'
  provider VARCHAR(50) NOT NULL,
  tier INT NOT NULL CHECK (0-3),
  context_window INT,
  max_tokens INT,
  cost_per_1k_input DECIMAL(10,6),
  cost_per_1k_output DECIMAL(10,6),
  capabilities JSONB DEFAULT '{}',
  enabled BOOLEAN DEFAULT true,
  supports_streaming BOOLEAN DEFAULT false,
  supports_functions BOOLEAN DEFAULT false,
  supports_vision BOOLEAN DEFAULT false,
  description TEXT,
  priority INT DEFAULT 100,
  status VARCHAR(20) DEFAULT 'active',
  display_name VARCHAR(255),
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)

-- AI Providers
ai_providers (
  id VARCHAR(100) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  api_endpoint TEXT,
  auth_type VARCHAR(50),
  api_key TEXT,  -- encrypted
  capabilities JSONB DEFAULT '{}',
  status VARCHAR(20) DEFAULT 'active',
  rate_limit_per_minute INT,
  credits_remaining DECIMAL(12,4),
  tokens_used BIGINT,
  last_usage_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)

-- Orchestration rules
orchestration_rules (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  strategy VARCHAR(50) NOT NULL,
  model_sequence JSONB NOT NULL,
  conditions JSONB DEFAULT '{}',
  enabled BOOLEAN DEFAULT true,
  priority INT DEFAULT 100,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
```

### Usage & Audit

```sql
-- Usage logs
usage_logs (
  id UUID PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  model_id VARCHAR(100),
  tier INT NOT NULL,
  prompt_tokens INT,
  completion_tokens INT,
  total_tokens INT,
  total_cost DECIMAL(10,6),
  quality_score DECIMAL(3,2),
  escalated BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ
)

-- Audit logs
audit_logs (
  id UUID PRIMARY KEY,
  correlation_id VARCHAR(100),
  user_id VARCHAR(255),
  action VARCHAR(100) NOT NULL,
  resource VARCHAR(255),
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ
)

-- User token stats (daily aggregates)
user_token_stats (
  user_id VARCHAR(255),
  date DATE,
  model VARCHAR(150),
  provider VARCHAR(100),
  total_tokens INT DEFAULT 0,
  total_cost DECIMAL(12,6) DEFAULT 0,
  message_count INT DEFAULT 0,
  conversation_count INT DEFAULT 0,
  PRIMARY KEY (user_id, date, model, provider)
)
```

---

## Asset Management

### Core Asset Tables

```sql
-- Vendors
vendors (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  tax_code VARCHAR(100),
  phone VARCHAR(50),
  email VARCHAR(255),
  address TEXT,
  created_at TIMESTAMPTZ
)

-- Locations (hierarchical)
locations (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  parent_id UUID → locations(id) SET NULL,
  path TEXT NOT NULL DEFAULT '/',
  created_at TIMESTAMPTZ
)

-- Asset categories
asset_categories (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ
)

-- Category spec versions (versioned schemas)
asset_category_spec_versions (
  id UUID PRIMARY KEY,
  category_id UUID → asset_categories(id) CASCADE,
  version INT NOT NULL,
  status TEXT NOT NULL,  -- draft, active, retired
  created_by TEXT,
  created_at TIMESTAMPTZ,
  UNIQUE (category_id, version)
)

-- Category spec definitions (field definitions)
asset_category_spec_defs (
  id UUID PRIMARY KEY,
  version_id UUID → asset_category_spec_versions(id) CASCADE,
  key TEXT NOT NULL,
  label TEXT NOT NULL,
  field_type TEXT NOT NULL,  -- string, number, boolean, enum, date, ip, mac, etc.
  unit TEXT,
  required BOOLEAN DEFAULT false,
  enum_values JSONB,
  pattern TEXT,
  min_len INT, max_len INT,
  min_value NUMERIC, max_value NUMERIC,
  step_value NUMERIC,
  precision INT, scale INT,
  default_value JSONB,
  help_text TEXT,
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  is_readonly BOOLEAN DEFAULT false,
  is_searchable BOOLEAN DEFAULT false,
  is_filterable BOOLEAN DEFAULT false,
  UNIQUE (version_id, key)
)

-- Asset models (product models)
asset_models (
  id UUID PRIMARY KEY,
  category_id UUID → asset_categories(id) SET NULL,
  spec_version_id UUID → asset_category_spec_versions(id) SET NULL,
  vendor_id UUID → vendors(id) SET NULL,
  brand VARCHAR(255),
  model VARCHAR(255) NOT NULL,
  spec JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ
)

-- Assets (individual items)
assets (
  id UUID PRIMARY KEY,
  asset_code VARCHAR(100) UNIQUE NOT NULL,
  model_id UUID → asset_models(id) SET NULL,
  serial_no VARCHAR(255),
  mac_address VARCHAR(50),
  mgmt_ip INET,
  hostname VARCHAR(255),
  vlan_id INT,
  switch_name VARCHAR(255),
  switch_port VARCHAR(100),
  location_id UUID → locations(id) SET NULL,
  status VARCHAR(20) DEFAULT 'in_stock',  -- in_stock, in_use, in_repair, retired, disposed, lost
  purchase_date DATE,
  warranty_end DATE,
  vendor_id UUID → vendors(id) SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)

-- Asset assignments
asset_assignments (
  id UUID PRIMARY KEY,
  asset_id UUID → assets(id) CASCADE,
  assignee_type VARCHAR(20) NOT NULL,  -- person, department, system
  assignee_id VARCHAR(255) NOT NULL,
  assignee_name VARCHAR(255) NOT NULL,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  returned_at TIMESTAMPTZ,
  note TEXT
)

-- Asset events (audit trail)
asset_events (
  id UUID PRIMARY KEY,
  asset_id UUID → assets(id) CASCADE,
  event_type VARCHAR(50) NOT NULL,
  payload JSONB DEFAULT '{}',
  actor_user_id VARCHAR(255),
  correlation_id VARCHAR(100),
  created_at TIMESTAMPTZ
)

-- Asset attachments
asset_attachments (
  id UUID PRIMARY KEY,
  asset_id UUID → assets(id) CASCADE,
  file_name TEXT,
  mime_type TEXT,
  storage_key TEXT,
  size_bytes BIGINT,
  version INT NOT NULL,
  uploaded_by TEXT,
  correlation_id TEXT,
  created_at TIMESTAMPTZ
)
```

### Inventory

```sql
-- Inventory sessions
inventory_sessions (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  location_id UUID → locations(id) SET NULL,
  status TEXT NOT NULL,  -- draft, in_progress, closed, canceled
  started_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  created_by TEXT,
  correlation_id TEXT,
  created_at TIMESTAMPTZ
)

-- Inventory items
inventory_items (
  id UUID PRIMARY KEY,
  session_id UUID → inventory_sessions(id) CASCADE,
  asset_id UUID → assets(id) SET NULL,
  expected_location_id UUID → locations(id) SET NULL,
  scanned_location_id UUID → locations(id) SET NULL,
  scanned_at TIMESTAMPTZ,
  status TEXT NOT NULL,  -- found, missing, moved, unknown
  note TEXT
)
```

### Workflow

```sql
-- Workflow requests
workflow_requests (
  id UUID PRIMARY KEY,
  request_type TEXT NOT NULL,  -- assign, return, move, repair, dispose
  asset_id UUID → assets(id) SET NULL,
  from_dept TEXT,
  to_dept TEXT,
  requested_by TEXT,
  approved_by TEXT,
  status TEXT NOT NULL,  -- submitted, approved, rejected, in_progress, done, canceled
  payload JSONB DEFAULT '{}',
  correlation_id TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)

-- Reminders
reminders (
  id UUID PRIMARY KEY,
  reminder_type TEXT NOT NULL,  -- warranty_expiring, maintenance_due
  asset_id UUID → assets(id) CASCADE,
  due_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL,  -- pending, sent, canceled
  channel TEXT DEFAULT 'ui',
  sent_at TIMESTAMPTZ,
  correlation_id TEXT,
  created_at TIMESTAMPTZ
)

-- Maintenance tickets
maintenance_tickets (
  id UUID PRIMARY KEY,
  asset_id UUID → assets(id) CASCADE,
  title VARCHAR(255) NOT NULL,
  severity VARCHAR(20) NOT NULL,  -- low, medium, high, critical
  status VARCHAR(20) DEFAULT 'open',  -- open, in_progress, closed, canceled
  opened_at TIMESTAMPTZ DEFAULT NOW(),
  closed_at TIMESTAMPTZ,
  diagnosis TEXT,
  resolution TEXT,
  created_by VARCHAR(255),
  correlation_id VARCHAR(100)
)
```

---

## CMDB

```sql
-- CI Types
cmdb_ci_types (
  id UUID PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ
)

-- CI Type versions
cmdb_ci_type_versions (
  id UUID PRIMARY KEY,
  type_id UUID → cmdb_ci_types(id) CASCADE,
  version INT NOT NULL,
  status TEXT NOT NULL,  -- draft, active, retired
  created_by TEXT,
  created_at TIMESTAMPTZ,
  UNIQUE (type_id, version)
)

-- CI Type attribute definitions
cmdb_ci_type_attr_defs (
  id UUID PRIMARY KEY,
  version_id UUID → cmdb_ci_type_versions(id) CASCADE,
  key TEXT NOT NULL,
  label TEXT NOT NULL,
  field_type TEXT NOT NULL,
  required BOOLEAN DEFAULT false,
  -- ... similar to asset_category_spec_defs
  UNIQUE (version_id, key)
)

-- Configuration Items
cmdb_cis (
  id UUID PRIMARY KEY,
  type_id UUID → cmdb_ci_types(id) RESTRICT,
  name TEXT NOT NULL,
  ci_code TEXT UNIQUE NOT NULL,
  status TEXT DEFAULT 'active',  -- active, planned, maintenance, retired
  environment TEXT DEFAULT 'prod',  -- prod, uat, dev
  asset_id UUID → assets(id) SET NULL,
  location_id UUID → locations(id) SET NULL,
  owner_team TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)

-- CI attribute values
cmdb_ci_attr_values (
  id UUID PRIMARY KEY,
  ci_id UUID → cmdb_cis(id) CASCADE,
  version_id UUID → cmdb_ci_type_versions(id) RESTRICT,
  key TEXT NOT NULL,
  value JSONB,
  updated_at TIMESTAMPTZ,
  UNIQUE (ci_id, key)
)

-- Relationship types
cmdb_relationship_types (
  id UUID PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  reverse_name TEXT,
  allowed_from_type_id UUID → cmdb_ci_types(id) SET NULL,
  allowed_to_type_id UUID → cmdb_ci_types(id) SET NULL
)

-- CI Relationships
cmdb_relationships (
  id UUID PRIMARY KEY,
  rel_type_id UUID → cmdb_relationship_types(id) CASCADE,
  from_ci_id UUID → cmdb_cis(id) CASCADE,
  to_ci_id UUID → cmdb_cis(id) CASCADE,
  status TEXT DEFAULT 'active',  -- active, retired
  since_date DATE,
  note TEXT,
  created_at TIMESTAMPTZ
)

-- Services
cmdb_services (
  id UUID PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  criticality TEXT,
  owner TEXT,
  sla TEXT,
  status TEXT,
  created_at TIMESTAMPTZ
)

-- Service members
cmdb_service_members (
  id UUID PRIMARY KEY,
  service_id UUID → cmdb_services(id) CASCADE,
  ci_id UUID → cmdb_cis(id) CASCADE,
  role TEXT,
  created_at TIMESTAMPTZ
)
```

---

## Warehouse & Maintenance

```sql
-- Warehouses
warehouses (
  id UUID PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  location_id UUID → locations(id) SET NULL,
  created_at TIMESTAMPTZ
)

-- Spare parts
spare_parts (
  id UUID PRIMARY KEY,
  part_code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  category TEXT,
  uom TEXT DEFAULT 'pcs',
  manufacturer TEXT,
  model TEXT,
  spec JSONB DEFAULT '{}',
  min_level INT DEFAULT 0,
  created_at TIMESTAMPTZ
)

-- Spare part stock
spare_part_stock (
  id UUID PRIMARY KEY,
  warehouse_id UUID → warehouses(id) CASCADE,
  part_id UUID → spare_parts(id) CASCADE,
  on_hand INT DEFAULT 0,
  reserved INT DEFAULT 0,
  updated_at TIMESTAMPTZ,
  UNIQUE (warehouse_id, part_id)
)

-- Stock documents
stock_documents (
  id UUID PRIMARY KEY,
  doc_type TEXT NOT NULL,  -- receipt, issue, adjust, transfer
  code TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL,  -- draft, posted, canceled
  warehouse_id UUID → warehouses(id) SET NULL,
  target_warehouse_id UUID → warehouses(id) SET NULL,
  doc_date DATE DEFAULT CURRENT_DATE,
  ref_type TEXT,
  ref_id UUID,
  note TEXT,
  created_by TEXT,
  approved_by TEXT,
  correlation_id TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)

-- Stock document lines
stock_document_lines (
  id UUID PRIMARY KEY,
  document_id UUID → stock_documents(id) CASCADE,
  part_id UUID → spare_parts(id),
  qty INT NOT NULL CHECK (qty > 0),
  unit_cost NUMERIC(12,2),
  serial_no TEXT,
  note TEXT,
  adjust_direction TEXT  -- plus, minus
)

-- Spare part movements
spare_part_movements (
  id UUID PRIMARY KEY,
  warehouse_id UUID → warehouses(id) CASCADE,
  part_id UUID → spare_parts(id) CASCADE,
  movement_type TEXT NOT NULL,  -- in, out, adjust_in, adjust_out, transfer_in, transfer_out, reserve, release
  qty INT NOT NULL CHECK (qty > 0),
  unit_cost NUMERIC(12,2),
  ref_type TEXT,
  ref_id UUID,
  actor_user_id TEXT,
  correlation_id TEXT,
  created_at TIMESTAMPTZ
)

-- Repair orders
repair_orders (
  id UUID PRIMARY KEY,
  asset_id UUID → assets(id) CASCADE,
  ci_id UUID → cmdb_cis(id) SET NULL,
  code TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  severity TEXT NOT NULL,  -- low, medium, high, critical
  status TEXT NOT NULL,  -- open, diagnosing, waiting_parts, repaired, closed, canceled
  opened_at TIMESTAMPTZ DEFAULT NOW(),
  closed_at TIMESTAMPTZ,
  diagnosis TEXT,
  resolution TEXT,
  repair_type TEXT NOT NULL,  -- internal, vendor
  technician_name TEXT,
  vendor_id UUID → vendors(id) SET NULL,
  labor_cost NUMERIC(12,2) DEFAULT 0,
  parts_cost NUMERIC(12,2) DEFAULT 0,
  downtime_minutes INT,
  created_by TEXT,
  correlation_id TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)

-- Repair order parts
repair_order_parts (
  id UUID PRIMARY KEY,
  repair_order_id UUID → repair_orders(id) CASCADE,
  part_id UUID → spare_parts(id) SET NULL,
  part_name TEXT,
  warehouse_id UUID → warehouses(id) SET NULL,
  action TEXT NOT NULL,  -- replace, add, remove, upgrade
  qty INT NOT NULL CHECK (qty > 0),
  unit_cost NUMERIC(12,2),
  serial_no TEXT,
  note TEXT,
  stock_document_id UUID → stock_documents(id) SET NULL,
  created_at TIMESTAMPTZ
)

-- Generic attachments
attachments (
  id UUID PRIMARY KEY,
  entity_type TEXT NOT NULL,  -- repair_order, stock_document
  entity_id UUID NOT NULL,
  file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  storage_key TEXT NOT NULL,
  size_bytes BIGINT,
  version INT DEFAULT 1,
  uploaded_by TEXT,
  correlation_id TEXT,
  created_at TIMESTAMPTZ
)

-- Ops events (audit trail)
ops_events (
  id UUID PRIMARY KEY,
  entity_type TEXT NOT NULL,  -- repair_order, stock_document, spare_part, etc.
  entity_id UUID NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB DEFAULT '{}',
  actor_user_id TEXT,
  correlation_id TEXT,
  created_at TIMESTAMPTZ
)
```

---

## Entity Relationship Diagram

```mermaid
erDiagram
    users ||--o{ sessions : has
    users ||--o{ conversations : owns
    conversations ||--o{ messages : contains
    
    vendors ||--o{ asset_models : supplies
    vendors ||--o{ assets : purchased_from
    
    locations ||--o{ locations : parent
    locations ||--o{ assets : located_at
    
    asset_categories ||--o{ asset_category_spec_versions : has
    asset_category_spec_versions ||--o{ asset_category_spec_defs : defines
    asset_categories ||--o{ asset_models : categorizes
    
    asset_models ||--o{ assets : instances
    
    assets ||--o{ asset_assignments : assigned
    assets ||--o{ asset_events : logs
    assets ||--o{ asset_attachments : files
    assets ||--o{ maintenance_tickets : tickets
    assets ||--o{ repair_orders : repairs
    assets ||--o{ inventory_items : inventoried
    assets ||--o{ cmdb_cis : linked
    
    inventory_sessions ||--o{ inventory_items : contains
    
    warehouses ||--o{ spare_part_stock : stores
    spare_parts ||--o{ spare_part_stock : stocked
    spare_parts ||--o{ spare_part_movements : movements
    
    stock_documents ||--o{ stock_document_lines : lines
    
    cmdb_ci_types ||--o{ cmdb_ci_type_versions : versions
    cmdb_ci_type_versions ||--o{ cmdb_ci_type_attr_defs : attributes
    cmdb_ci_types ||--o{ cmdb_cis : instances
    cmdb_cis ||--o{ cmdb_ci_attr_values : values
    cmdb_cis ||--o{ cmdb_relationships : from
    cmdb_cis ||--o{ cmdb_relationships : to
    cmdb_services ||--o{ cmdb_service_members : members
```

---

## Indexes

Key indexes for performance:

```sql
-- Users & Auth
idx_users_email ON users(email)
idx_sessions_token ON sessions(token)

-- Conversations
idx_conversations_user_id ON conversations(user_id)
idx_messages_conversation_id ON messages(conversation_id, created_at)

-- Assets
idx_assets_status ON assets(status)
idx_assets_location_id ON assets(location_id)
idx_assets_mgmt_ip ON assets(mgmt_ip)
idx_asset_events_asset ON asset_events(asset_id, created_at DESC)

-- CMDB
idx_cmdb_cis_type ON cmdb_cis(type_id)
idx_cmdb_cis_asset ON cmdb_cis(asset_id)
idx_cmdb_relationships_from ON cmdb_relationships(from_ci_id)

-- Warehouse
idx_spare_part_stock_lookup ON spare_part_stock(warehouse_id, part_id)
idx_stock_documents_status ON stock_documents(status, doc_date DESC)
idx_repair_orders_status ON repair_orders(status, opened_at DESC)
```

---

## Redis Cache Strategy

| Key Pattern | TTL | Purpose |
|-------------|-----|---------|
| `session:{token}` | 24h | User session data |
| `user:{id}` | 1h | User profile cache |
| `model:config:{id}` | 5m | Model configuration |
| `chat:context:{conv_id}` | 30m | Conversation context |
| `provider:credits:{id}` | 1m | Provider credit balance |
| `rate:limit:{user}:{window}` | 1m | Rate limiting counter |

---

## Migration Strategy

1. Schema changes go in `packages/infra-postgres/src/schema.sql`
2. Use `IF NOT EXISTS` / `ADD COLUMN IF NOT EXISTS` for idempotency
3. Run migrations on container startup
4. For breaking changes, create versioned migration files

```bash
# Apply schema
psql -U postgres -d netopsai_gateway -f packages/infra-postgres/src/schema.sql
```

---

## Next Steps

- 🔌 [API Reference](API.md)
- 🏗️ [Architecture](ARCHITECTURE.md)
- 🚀 [Deployment](DEPLOYMENT.md)
