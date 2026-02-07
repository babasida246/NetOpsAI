-- Migration: NetOps tables for NetSecOps Copilot
-- Date: 2024-12-25
-- Description: Add network operations tables for device inventory, configuration management, 
--              compliance checks, and change workflows

-- ====================
-- DEVICE INVENTORY
-- ====================

-- Network devices (routers, switches, firewalls)
CREATE TABLE IF NOT EXISTS net_devices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    hostname VARCHAR(255) NOT NULL,
    vendor VARCHAR(50) NOT NULL CHECK (vendor IN ('cisco', 'mikrotik', 'fortigate', 'generic')),
    model VARCHAR(100),
    os_version VARCHAR(100),
    mgmt_ip INET NOT NULL,
    site VARCHAR(100),
    role VARCHAR(50) CHECK (role IN ('core', 'distribution', 'access', 'edge', 'firewall', 'wan', 'datacenter', 'branch')),
    tags JSONB DEFAULT '[]',
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'maintenance', 'decommissioned', 'unreachable')),
    last_seen_at TIMESTAMPTZ,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_net_devices_vendor ON net_devices(vendor);
CREATE INDEX idx_net_devices_site ON net_devices(site);
CREATE INDEX idx_net_devices_role ON net_devices(role);
CREATE INDEX idx_net_devices_status ON net_devices(status);
CREATE INDEX idx_net_devices_mgmt_ip ON net_devices(mgmt_ip);
CREATE UNIQUE INDEX idx_net_devices_hostname_unique ON net_devices(hostname, site) WHERE status != 'decommissioned';

-- Device credential references (NEVER store plain credentials!)
CREATE TABLE IF NOT EXISTS net_device_credentials_ref (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    device_id UUID NOT NULL REFERENCES net_devices(id) ON DELETE CASCADE,
    credential_type VARCHAR(50) NOT NULL CHECK (credential_type IN ('ssh', 'api', 'snmp', 'telnet')),
    vault_ref VARCHAR(500) NOT NULL, -- Reference to external vault (e.g., "vault:secret/netops/device-123/ssh")
    username_hint VARCHAR(100), -- Non-sensitive hint for display
    priority INT DEFAULT 0, -- Higher = try first
    is_active BOOLEAN DEFAULT true,
    last_used_at TIMESTAMPTZ,
    last_success_at TIMESTAMPTZ,
    failure_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_net_device_creds_device ON net_device_credentials_ref(device_id, credential_type);
CREATE INDEX idx_net_device_creds_active ON net_device_credentials_ref(device_id, is_active) WHERE is_active = true;

-- Device facts (discovered info)
CREATE TABLE IF NOT EXISTS net_device_facts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    device_id UUID NOT NULL REFERENCES net_devices(id) ON DELETE CASCADE,
    facts JSONB NOT NULL, -- { hostname, serial_number, uptime, interfaces: [...], memory, cpu, etc. }
    collected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    collector_version VARCHAR(50),
    collection_duration_ms INT,
    raw_output TEXT -- Original command output (redacted)
);

CREATE INDEX idx_net_device_facts_device ON net_device_facts(device_id, collected_at DESC);

-- ====================
-- CONFIGURATION MANAGEMENT
-- ====================

-- Configuration versions (snapshots)
CREATE TABLE IF NOT EXISTS net_config_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    device_id UUID NOT NULL REFERENCES net_devices(id) ON DELETE CASCADE,
    config_type VARCHAR(50) NOT NULL DEFAULT 'running' CHECK (config_type IN ('running', 'startup', 'candidate', 'generated', 'rollback')),
    raw_config TEXT NOT NULL, -- Redacted config content
    config_hash VARCHAR(64) NOT NULL, -- SHA-256 for change detection
    normalized_config JSONB, -- Parsed & normalized (NormalizedConfig v1)
    parser_version VARCHAR(20),
    parse_errors JSONB, -- Any parsing warnings/errors
    file_size_bytes INT,
    line_count INT,
    collected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    collected_by UUID REFERENCES users(id),
    source VARCHAR(50) DEFAULT 'pull' CHECK (source IN ('pull', 'upload', 'generated', 'rollback')),
    parent_version_id UUID REFERENCES net_config_versions(id), -- For tracking lineage
    metadata JSONB DEFAULT '{}'
);

CREATE INDEX idx_net_config_versions_device ON net_config_versions(device_id, collected_at DESC);
CREATE INDEX idx_net_config_versions_hash ON net_config_versions(config_hash);
CREATE INDEX idx_net_config_versions_type ON net_config_versions(device_id, config_type);

-- ====================
-- COMPLIANCE & LINTING
-- ====================

-- Rulepacks (collections of lint rules)
CREATE TABLE IF NOT EXISTS net_rulepacks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    version VARCHAR(20) NOT NULL DEFAULT '1.0.0',
    description TEXT,
    vendor_scope VARCHAR(50)[] DEFAULT '{}', -- Empty = all vendors
    is_active BOOLEAN DEFAULT false,
    is_builtin BOOLEAN DEFAULT false, -- System-provided rules
    rules JSONB NOT NULL, -- Array of rule definitions
    rule_count INT GENERATED ALWAYS AS (jsonb_array_length(rules)) STORED,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    activated_at TIMESTAMPTZ
);

CREATE INDEX idx_net_rulepacks_active ON net_rulepacks(is_active) WHERE is_active = true;
CREATE UNIQUE INDEX idx_net_rulepacks_name_version ON net_rulepacks(name, version);

-- Lint runs (compliance check executions)
CREATE TABLE IF NOT EXISTS net_lint_runs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    target_type VARCHAR(50) NOT NULL CHECK (target_type IN ('device', 'config_version', 'change_set')),
    target_id UUID NOT NULL, -- References device, config_version, or change_set
    rulepack_id UUID NOT NULL REFERENCES net_rulepacks(id),
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
    findings JSONB DEFAULT '[]', -- Array of { rule_id, severity, message, path, line, remediation }
    summary JSONB, -- { critical: 0, high: 0, medium: 0, low: 0, info: 0, waived: 0 }
    rules_evaluated INT DEFAULT 0,
    rules_passed INT DEFAULT 0,
    rules_failed INT DEFAULT 0,
    rules_skipped INT DEFAULT 0,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    duration_ms INT,
    triggered_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_net_lint_runs_target ON net_lint_runs(target_type, target_id);
CREATE INDEX idx_net_lint_runs_status ON net_lint_runs(status, created_at DESC);

-- ====================
-- CHANGE MANAGEMENT
-- ====================

-- Change requests (workflow container)
CREATE TABLE IF NOT EXISTS net_change_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    intent_type VARCHAR(50) CHECK (intent_type IN ('vlan_trunk', 'firewall_policy', 'nat_rule', 'routing', 'acl', 'interface', 'custom')),
    intent_params JSONB, -- Wizard input parameters
    device_scope UUID[] NOT NULL, -- Array of device IDs
    status VARCHAR(30) NOT NULL DEFAULT 'draft' CHECK (status IN (
        'draft',           -- Initial creation
        'planned',         -- Analysis complete
        'candidate_ready', -- Config generated
        'verified',        -- Pre-checks passed
        'waiting_approval',-- Submitted for approval
        'approved',        -- Approved, ready to deploy
        'rejected',        -- Approval denied
        'deploying',       -- Deployment in progress
        'deployed',        -- Deployment complete
        'verified_post',   -- Post-checks passed
        'failed',          -- Deployment or verification failed
        'rolled_back',     -- Rollback executed
        'closed'           -- Workflow complete
    )),
    risk_level VARCHAR(20) DEFAULT 'medium' CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
    required_approvals INT DEFAULT 1,
    lint_blocking BOOLEAN DEFAULT true, -- Block if critical lint findings
    rollback_plan TEXT,
    pre_check_commands JSONB, -- Commands to run before deployment
    post_check_commands JSONB, -- Commands to run after deployment
    created_by UUID NOT NULL REFERENCES users(id),
    assigned_to UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    planned_at TIMESTAMPTZ,
    submitted_at TIMESTAMPTZ,
    approved_at TIMESTAMPTZ,
    deployed_at TIMESTAMPTZ,
    closed_at TIMESTAMPTZ
);

CREATE INDEX idx_net_change_requests_status ON net_change_requests(status, created_at DESC);
CREATE INDEX idx_net_change_requests_created_by ON net_change_requests(created_by);
CREATE INDEX idx_net_change_requests_assigned ON net_change_requests(assigned_to) WHERE assigned_to IS NOT NULL;

-- Change sets (per-device config changes within a change request)
CREATE TABLE IF NOT EXISTS net_change_sets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    change_request_id UUID NOT NULL REFERENCES net_change_requests(id) ON DELETE CASCADE,
    device_id UUID NOT NULL REFERENCES net_devices(id),
    sequence_order INT NOT NULL DEFAULT 0, -- Deployment order
    baseline_config_id UUID REFERENCES net_config_versions(id), -- Config before change
    candidate_config_id UUID REFERENCES net_config_versions(id), -- Generated config
    deployed_config_id UUID REFERENCES net_config_versions(id), -- Actual deployed config
    diff_summary JSONB, -- { lines_added, lines_removed, sections_changed: [...] }
    commands_to_apply TEXT[], -- Raw commands for deployment
    rollback_commands TEXT[], -- Commands to revert
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'ready', 'deploying', 'deployed', 'failed', 'rolled_back', 'skipped')),
    deploy_started_at TIMESTAMPTZ,
    deploy_completed_at TIMESTAMPTZ,
    deploy_output TEXT, -- Command output (redacted)
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_net_change_sets_request ON net_change_sets(change_request_id);
CREATE INDEX idx_net_change_sets_device ON net_change_sets(device_id);
CREATE UNIQUE INDEX idx_net_change_sets_unique ON net_change_sets(change_request_id, device_id);

-- Approvals
CREATE TABLE IF NOT EXISTS net_approvals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    change_request_id UUID NOT NULL REFERENCES net_change_requests(id) ON DELETE CASCADE,
    approver_id UUID NOT NULL REFERENCES users(id),
    decision VARCHAR(20) NOT NULL CHECK (decision IN ('approved', 'rejected', 'waived')),
    comments TEXT,
    waived_findings UUID[], -- Lint finding IDs that were waived
    decided_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_net_approvals_request ON net_approvals(change_request_id);
CREATE INDEX idx_net_approvals_approver ON net_approvals(approver_id);
CREATE UNIQUE INDEX idx_net_approvals_unique ON net_approvals(change_request_id, approver_id);

-- Deployments (execution records)
CREATE TABLE IF NOT EXISTS net_deployments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    change_request_id UUID NOT NULL REFERENCES net_change_requests(id),
    change_set_id UUID REFERENCES net_change_sets(id),
    device_id UUID NOT NULL REFERENCES net_devices(id),
    deployment_type VARCHAR(20) NOT NULL CHECK (deployment_type IN ('apply', 'rollback', 'dry_run')),
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'success', 'failed', 'timeout')),
    commands_executed TEXT[],
    output TEXT, -- Redacted output
    error_message TEXT,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    duration_ms INT,
    executed_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_net_deployments_request ON net_deployments(change_request_id);
CREATE INDEX idx_net_deployments_device ON net_deployments(device_id, created_at DESC);
CREATE INDEX idx_net_deployments_status ON net_deployments(status);

-- ====================
-- AUDIT TRAIL
-- ====================

-- NetOps-specific audit events (extends general audit_logs)
CREATE TABLE IF NOT EXISTS net_audit_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    correlation_id VARCHAR(100),
    event_type VARCHAR(50) NOT NULL, -- device.created, config.pulled, change.approved, etc.
    actor_id UUID REFERENCES users(id),
    actor_role VARCHAR(50),
    resource_type VARCHAR(50) NOT NULL, -- device, config, rulepack, change_request, etc.
    resource_id UUID NOT NULL,
    action VARCHAR(50) NOT NULL, -- create, update, delete, collect, parse, lint, approve, deploy, etc.
    details JSONB DEFAULT '{}', -- Event-specific data (REDACTED of secrets)
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_net_audit_events_correlation ON net_audit_events(correlation_id);
CREATE INDEX idx_net_audit_events_resource ON net_audit_events(resource_type, resource_id);
CREATE INDEX idx_net_audit_events_actor ON net_audit_events(actor_id, created_at DESC);
CREATE INDEX idx_net_audit_events_type ON net_audit_events(event_type, created_at DESC);

-- ====================
-- HELPER FUNCTIONS
-- ====================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_net_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
CREATE TRIGGER trg_net_devices_updated_at
    BEFORE UPDATE ON net_devices
    FOR EACH ROW EXECUTE FUNCTION update_net_updated_at();

CREATE TRIGGER trg_net_change_requests_updated_at
    BEFORE UPDATE ON net_change_requests
    FOR EACH ROW EXECUTE FUNCTION update_net_updated_at();

CREATE TRIGGER trg_net_change_sets_updated_at
    BEFORE UPDATE ON net_change_sets
    FOR EACH ROW EXECUTE FUNCTION update_net_updated_at();

CREATE TRIGGER trg_net_rulepacks_updated_at
    BEFORE UPDATE ON net_rulepacks
    FOR EACH ROW EXECUTE FUNCTION update_net_updated_at();

-- ====================
-- SEED DATA: Built-in Rulepack v1
-- ====================

INSERT INTO net_rulepacks (id, name, version, description, vendor_scope, is_active, is_builtin, rules)
VALUES (
    'a0000000-0000-0000-0000-000000000001',
    'baseline-security-v1',
    '1.0.0',
    'Baseline security compliance rules for network devices',
    '{}', -- All vendors
    true,
    true,
    '[
        {
            "id": "SEC-001",
            "title": "Telnet must be disabled",
            "description": "Telnet transmits credentials in plaintext and must be disabled",
            "severity": "critical",
            "vendor_scope": [],
            "match": {
                "type": "jsonpath",
                "path": "$.mgmt.telnet.enabled",
                "operator": "equals",
                "value": false
            },
            "remediation": "Disable telnet and use SSH for management access",
            "waivable": false
        },
        {
            "id": "SEC-002",
            "title": "SSH must be enabled",
            "description": "SSH provides encrypted management access",
            "severity": "high",
            "vendor_scope": [],
            "match": {
                "type": "jsonpath",
                "path": "$.mgmt.ssh.enabled",
                "operator": "equals",
                "value": true
            },
            "remediation": "Enable SSH v2 for secure management access",
            "waivable": false
        },
        {
            "id": "SEC-003",
            "title": "SNMP community public/private forbidden",
            "description": "Default SNMP communities are well-known and insecure",
            "severity": "critical",
            "vendor_scope": [],
            "match": {
                "type": "custom",
                "predicate": "snmp_community_not_default"
            },
            "remediation": "Change SNMP community strings to complex, unique values",
            "waivable": false
        },
        {
            "id": "SEC-004",
            "title": "Syslog server must be configured",
            "description": "Centralized logging is required for security monitoring",
            "severity": "high",
            "vendor_scope": [],
            "match": {
                "type": "jsonpath",
                "path": "$.mgmt.syslog.servers",
                "operator": "not_empty"
            },
            "remediation": "Configure remote syslog server for centralized logging",
            "waivable": true
        },
        {
            "id": "SEC-005",
            "title": "NTP must be configured",
            "description": "Accurate time is critical for log correlation and certificates",
            "severity": "high",
            "vendor_scope": [],
            "match": {
                "type": "jsonpath",
                "path": "$.mgmt.ntp.servers",
                "operator": "not_empty"
            },
            "remediation": "Configure NTP servers for time synchronization",
            "waivable": true
        },
        {
            "id": "FW-001",
            "title": "FortiGate any-any policy must have logging",
            "description": "Overly permissive policies without logging are a security risk",
            "severity": "critical",
            "vendor_scope": ["fortigate"],
            "match": {
                "type": "custom",
                "predicate": "fortigate_any_any_has_logging"
            },
            "remediation": "Enable logging on all firewall policies, especially permissive ones",
            "waivable": false
        },
        {
            "id": "FW-002",
            "title": "FortiGate accept-all policy must be restricted",
            "description": "Policies accepting all traffic should have source/dest restrictions",
            "severity": "high",
            "vendor_scope": ["fortigate"],
            "match": {
                "type": "custom",
                "predicate": "fortigate_accept_all_restricted"
            },
            "remediation": "Add source/destination restrictions to accept policies",
            "waivable": true
        },
        {
            "id": "NAT-001",
            "title": "NAT overlap detection",
            "description": "Overlapping NAT rules can cause unpredictable behavior",
            "severity": "medium",
            "vendor_scope": [],
            "match": {
                "type": "custom",
                "predicate": "nat_no_overlap"
            },
            "remediation": "Review and consolidate overlapping NAT rules",
            "waivable": true
        },
        {
            "id": "VPN-001",
            "title": "Weak VPN proposals forbidden",
            "description": "DES, 3DES, MD5 are considered weak for VPN encryption",
            "severity": "high",
            "vendor_scope": [],
            "match": {
                "type": "custom",
                "predicate": "vpn_strong_crypto"
            },
            "remediation": "Use AES-256 with SHA-256 or stronger for VPN proposals",
            "waivable": false
        },
        {
            "id": "ACC-001",
            "title": "Enable secret must be encrypted",
            "description": "Enable password must use type 5 or higher encryption",
            "severity": "critical",
            "vendor_scope": ["cisco"],
            "match": {
                "type": "custom",
                "predicate": "cisco_enable_encrypted"
            },
            "remediation": "Use enable secret (type 5) instead of enable password",
            "waivable": false
        }
    ]'::jsonb
) ON CONFLICT (name, version) DO UPDATE SET
    rules = EXCLUDED.rules,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();
