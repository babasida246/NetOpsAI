-- Edge Connector Tables

CREATE TABLE
IF NOT EXISTS edge_nodes
(
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4
(),
    tenant_id UUID NOT NULL REFERENCES tenants
(id) ON
DELETE CASCADE,
    name VARCHAR(200)
NOT NULL,
    instance_fingerprint VARCHAR
(200) NOT NULL,
    status VARCHAR
(20) NOT NULL DEFAULT 'active' CHECK
(status IN
('active', 'suspended')),
    auth_token TEXT NOT NULL,
    policy_bundle JSONB NOT NULL DEFAULT '{}'::jsonb,
    last_seen_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW
(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW
(),
    UNIQUE
(tenant_id, instance_fingerprint)
);

CREATE INDEX
IF NOT EXISTS idx_edge_nodes_tenant_id ON edge_nodes
(tenant_id);

CREATE TABLE
IF NOT EXISTS edge_pairings
(
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4
(),
    tenant_id UUID NOT NULL REFERENCES tenants
(id) ON
DELETE CASCADE,
    pairing_code VARCHAR(20)
NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    consumed_at TIMESTAMPTZ,
    edge_node_id UUID REFERENCES edge_nodes
(id) ON
DELETE
SET NULL
,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW
()
);

CREATE INDEX
IF NOT EXISTS idx_edge_pairings_expires_at ON edge_pairings
(expires_at);

CREATE TABLE
IF NOT EXISTS edge_jobs
(
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4
(),
    tenant_id UUID NOT NULL REFERENCES tenants
(id) ON
DELETE CASCADE,
    edge_node_id UUID
NOT NULL REFERENCES edge_nodes
(id) ON
DELETE CASCADE,
    job_type VARCHAR(100)
NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    status VARCHAR
(20) NOT NULL DEFAULT 'queued' CHECK
(status IN
('queued', 'running', 'completed', 'failed', 'expired')),
    signature TEXT NOT NULL,
    nonce VARCHAR
(40) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW
(),
    expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX
IF NOT EXISTS idx_edge_jobs_node_id ON edge_jobs
(edge_node_id);
CREATE INDEX
IF NOT EXISTS idx_edge_jobs_status ON edge_jobs
(status);

CREATE TABLE
IF NOT EXISTS edge_job_results
(
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4
(),
    job_id UUID NOT NULL REFERENCES edge_jobs
(id) ON
DELETE CASCADE,
    status VARCHAR(20)
NOT NULL CHECK
(status IN
('success', 'failed')),
    output JSONB NOT NULL DEFAULT '{}'::jsonb,
    logs TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW
()
);
