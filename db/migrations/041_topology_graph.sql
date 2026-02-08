-- Topology graph tables
CREATE TABLE
IF NOT EXISTS topology_nodes
(
    id UUID PRIMARY KEY DEFAULT gen_random_uuid
(),
    kind TEXT NOT NULL,
    hostname TEXT,
    mgmt_ip INET,
    vendor TEXT,
    model TEXT,
    site TEXT,
    zone TEXT,
    first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW
(),
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW
()
);

CREATE UNIQUE INDEX
IF NOT EXISTS topology_nodes_mgmt_ip_key
    ON topology_nodes
(mgmt_ip)
    WHERE mgmt_ip IS NOT NULL;

CREATE TABLE
IF NOT EXISTS topology_ports
(
    id UUID PRIMARY KEY DEFAULT gen_random_uuid
(),
    node_id UUID REFERENCES topology_nodes
(id) ON
DELETE CASCADE,
    if_name TEXT
NOT NULL,
    if_index INTEGER,
    mac TEXT,
    speed BIGINT,
    extra JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW
(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW
(),
    UNIQUE
(node_id, if_name)
);

CREATE TABLE
IF NOT EXISTS topology_edges
(
    id UUID PRIMARY KEY DEFAULT gen_random_uuid
(),
    a_node_id UUID REFERENCES topology_nodes
(id) ON
DELETE CASCADE,
    a_port TEXT
NOT NULL,
    b_node_id UUID REFERENCES topology_nodes
(id) ON
DELETE CASCADE,
    b_port TEXT,
    evidence JSONB
NOT NULL DEFAULT '[]'::jsonb,
    confidence INTEGER NOT NULL DEFAULT 0,
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW
(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW
(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW
(),
    UNIQUE
(a_node_id, a_port, b_node_id, b_port)
);
