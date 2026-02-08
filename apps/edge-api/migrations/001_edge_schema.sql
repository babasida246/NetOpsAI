CREATE TABLE IF NOT EXISTS edge_state (
    id INTEGER PRIMARY KEY,
    edge_id TEXT NOT NULL,
    auth_token_enc BYTEA NOT NULL,
    policy_bundle JSONB NOT NULL,
    paired_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS edge_connectors (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    config JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS edge_jobs (
    id TEXT PRIMARY KEY,
    job_type TEXT NOT NULL,
    payload JSONB NOT NULL,
    signature TEXT NOT NULL,
    nonce TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL DEFAULT 'received',
    received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processed_at TIMESTAMPTZ,
    result JSONB,
    error TEXT
);

CREATE INDEX IF NOT EXISTS idx_edge_jobs_status ON edge_jobs (status);
CREATE INDEX IF NOT EXISTS idx_edge_jobs_received_at ON edge_jobs (received_at);
