-- Tenant and Feature Entitlements

CREATE TABLE
IF NOT EXISTS tenants
(
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4
(),
    code VARCHAR
(50) NOT NULL UNIQUE,
    name VARCHAR
(200) NOT NULL,
    status VARCHAR
(20) NOT NULL DEFAULT 'active' CHECK
(status IN
('active', 'suspended')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW
(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW
()
);

ALTER TABLE users ADD COLUMN
IF NOT EXISTS tenant_id UUID REFERENCES tenants
(id);
CREATE INDEX
IF NOT EXISTS idx_users_tenant_id ON users
(tenant_id);

CREATE TABLE
IF NOT EXISTS tenant_members
(
    tenant_id UUID NOT NULL REFERENCES tenants
(id) ON
DELETE CASCADE,
    user_id UUID
NOT NULL REFERENCES users
(id) ON
DELETE CASCADE,
    role VARCHAR(20)
NOT NULL CHECK
(role IN
('admin', 'operator', 'viewer')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW
(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW
(),
    PRIMARY KEY
(tenant_id, user_id)
);

CREATE TABLE
IF NOT EXISTS feature_catalog
(
    feature_key VARCHAR
(100) PRIMARY KEY,
    name VARCHAR
(200) NOT NULL,
    description TEXT,
    tier VARCHAR
(20) NOT NULL,
    is_core BOOLEAN NOT NULL DEFAULT false
);

CREATE TABLE
IF NOT EXISTS plans
(
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4
(),
    code VARCHAR
(50) NOT NULL UNIQUE,
    name VARCHAR
(200) NOT NULL,
    tier VARCHAR
(20) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW
(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW
()
);

CREATE TABLE
IF NOT EXISTS plan_features
(
    plan_id UUID NOT NULL REFERENCES plans
(id) ON
DELETE CASCADE,
    feature_key VARCHAR(100)
NOT NULL REFERENCES feature_catalog
(feature_key) ON
DELETE CASCADE,
    PRIMARY KEY (plan_id, feature_key)
);

CREATE TABLE
IF NOT EXISTS tenant_subscriptions
(
    tenant_id UUID NOT NULL REFERENCES tenants
(id) ON
DELETE CASCADE,
    plan_id UUID
NOT NULL REFERENCES plans
(id) ON
DELETE RESTRICT,
    status VARCHAR(20)
NOT NULL DEFAULT 'active' CHECK
(status IN
('active', 'paused', 'expired')),
    starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW
(),
    ends_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW
(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW
(),
    PRIMARY KEY
(tenant_id)
);

CREATE TABLE
IF NOT EXISTS tenant_addons
(
    tenant_id UUID NOT NULL REFERENCES tenants
(id) ON
DELETE CASCADE,
    feature_key VARCHAR(100)
NOT NULL REFERENCES feature_catalog
(feature_key) ON
DELETE CASCADE,
    status VARCHAR(20)
NOT NULL DEFAULT 'active' CHECK
(status IN
('active', 'paused')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW
(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW
(),
    PRIMARY KEY
(tenant_id, feature_key)
);

CREATE TABLE
IF NOT EXISTS tenant_limits
(
    tenant_id UUID PRIMARY KEY REFERENCES tenants
(id) ON
DELETE CASCADE,
    limits JSONB
NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW
()
);

CREATE TABLE
IF NOT EXISTS entitlement_tokens
(
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4
(),
    tenant_id UUID NOT NULL REFERENCES tenants
(id) ON
DELETE CASCADE,
    token TEXT
NOT NULL,
    issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW
(),
    expires_at TIMESTAMPTZ NOT NULL,
    created_by UUID REFERENCES users
(id) ON
DELETE
SET NULL
);

INSERT INTO tenants
    (code, name)
VALUES
    ('default', 'Default Tenant')
ON CONFLICT
(code) DO NOTHING;

UPDATE users
SET tenant_id = (SELECT id
FROM tenants
WHERE code = 'default' LIMIT 1
)
WHERE tenant_id IS NULL;

INSERT INTO tenant_members
    (tenant_id, user_id, role)
SELECT t.id, u.id, 'admin'
FROM tenants t
    JOIN users u ON u.tenant_id = t.id
ON CONFLICT
(tenant_id, user_id) DO NOTHING;

INSERT INTO feature_catalog
    (feature_key, name, description, tier, is_core)
VALUES
    ('asset.core', 'Asset Core', 'Asset CRUD and lifecycle', 'core', true),
    ('cmdb.core', 'CMDB Core', 'CI management and relationships', 'core', true),
    ('warehouse.core', 'Warehouse Core', 'Stock and movements', 'core', true),
    ('maintenance.core', 'Maintenance Core', 'Tickets and work orders', 'core', true),
    ('chat.core', 'Chat Core', 'Chat interface and history', 'core', true),
    ('asset.depreciation', 'Asset Depreciation', 'Straight-line depreciation', 'pro', false),
    ('asset.audit', 'Asset Audit', 'Audit sessions and discrepancies', 'pro', false),
    ('cmdb.impact', 'CMDB Impact', 'Impact analysis', 'pro', false),
    ('integration.zabbix', 'Zabbix Integration', 'Zabbix connector', 'pro', false),
    ('workflow.engine', 'Workflow Engine', 'Workflow rules and actions', 'pro', false),
    ('netops.backup', 'NetOps Backup', 'Config backup', 'netops', false),
    ('netops.compliance', 'NetOps Compliance', 'Config drift checks', 'netops', false),
    ('netops.topology', 'NetOps Topology', 'Topology discovery', 'netops', false),
    ('netops.push_config', 'NetOps Push Config', 'Config push', 'netops', false),
    ('sam.catalog', 'SAM Catalog', 'License catalog', 'sam', false),
    ('sam.allocation', 'SAM Allocation', 'License allocation', 'sam', false),
    ('sam.reconcile', 'SAM Reconcile', 'Reconciliation workflow', 'sam', false),
    ('sam.usage_metering', 'SAM Usage Metering', 'Usage metering', 'sam', false),
    ('sam.renewals', 'SAM Renewals', 'Renewal reminders', 'sam', false),
    ('ai.multi_provider', 'AI Multi Provider', 'Multiple providers', 'ai', false),
    ('ai.routing', 'AI Routing', 'Routing and tiering', 'ai', false),
    ('ai.tools', 'AI Tools', 'Tool registry invocation', 'ai', false),
    ('ai.cost_control', 'AI Cost Control', 'Budgets and limits', 'ai', false)
ON CONFLICT
(feature_key) DO NOTHING;

INSERT INTO plans
    (code, name, tier)
VALUES
    ('basic', 'Basic', 'core'),
    ('pro', 'Pro', 'pro'),
    ('enterprise', 'Enterprise', 'ent')
ON CONFLICT
(code) DO NOTHING;

INSERT INTO plan_features
    (plan_id, feature_key)
SELECT p.id, f.feature_key
FROM plans p
    JOIN feature_catalog f ON f.tier = 'core'
WHERE p.code IN ('basic', 'pro', 'enterprise')
ON CONFLICT DO NOTHING;

INSERT INTO plan_features
    (plan_id, feature_key)
SELECT p.id, f.feature_key
FROM plans p
    JOIN feature_catalog f ON f.tier IN ('pro', 'ai')
WHERE p.code IN ('pro', 'enterprise')
ON CONFLICT DO NOTHING;

INSERT INTO plan_features
    (plan_id, feature_key)
SELECT p.id, f.feature_key
FROM plans p
    JOIN feature_catalog f ON f.tier IN ('netops', 'sam')
WHERE p.code = 'enterprise'
ON CONFLICT DO NOTHING;

INSERT INTO tenant_subscriptions
    (tenant_id, plan_id)
SELECT t.id, p.id
FROM tenants t
    JOIN plans p ON p.code = 'basic'
ON CONFLICT
(tenant_id) DO NOTHING;

INSERT INTO tenant_limits
    (tenant_id, limits)
SELECT t.id, '{"seats": 5, "assets": 500, "devices": 100, "toolCalls": 1000}'
::jsonb
FROM tenants t
ON CONFLICT
(tenant_id) DO NOTHING;
