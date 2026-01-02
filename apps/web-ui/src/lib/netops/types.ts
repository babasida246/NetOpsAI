// NetOps TypeScript Types
export type Vendor = 'cisco' | 'mikrotik' | 'fortigate';
export type DeviceRole = 'core' | 'distribution' | 'access' | 'edge' | 'firewall' | 'wan';
export type ChangeStatus =
    | 'draft'
    | 'planned'
    | 'candidate_ready'
    | 'verified'
    | 'waiting_approval'
    | 'approved'
    | 'deploying'
    | 'deployed'
    | 'verified_post'
    | 'closed'
    | 'rejected'
    | 'failed'
    | 'rolled_back'
    | 'needs_fix';

export type RiskTier = 'low' | 'med' | 'high';
export type Severity = 'low' | 'med' | 'high' | 'critical';

export interface Device {
    id: string;
    name: string;
    vendor: Vendor;
    model?: string;
    os_version?: string;
    site?: string;
    role?: DeviceRole;
    mgmt_ip: string;
    tags?: Record<string, unknown>;
    created_at: string;
    updated_at?: string;
    last_config_snapshot?: string;
}

export interface ConfigVersion {
    id: string;
    device_id: string;
    raw_config: string;
    source: 'upload' | 'pull' | 'generated';
    checksum: string;
    collected_at: string;
    created_by?: string;
    note?: string;
    normalized_config?: NormalizedConfig;
}

export interface NormalizedConfig {
    schemaVersion: 'v1';
    device: {
        hostname: string;
        vendor: Vendor;
        model?: string;
        osVersion?: string;
    };
    interfaces: Array<{
        name: string;
        description?: string;
        status: 'up' | 'down' | 'admin-down';
        mode: 'access' | 'trunk' | 'routed' | 'hybrid';
        vlan?: number;
        trunkAllowedVlans?: number[];
        ipv4?: string;
        ipv4Mask?: string;
        ipv6?: string;
    }>;
    vlans: Array<{
        id: number;
        name?: string;
        description?: string;
    }>;
    routing: {
        static: Array<{ network: string; nextHop: string; interface?: string }>;
        ospf: Array<{ processId: number; routerId?: string; networks: string[] }>;
        bgp: Array<{ asn: number; routerId?: string; neighbors: Array<Record<string, unknown>> }>;
    };
    security: {
        acls: Array<{
            name: string;
            type?: 'standard' | 'extended';
            entries: Array<{
                seq?: number;
                action: 'permit' | 'deny';
                protocol?: string;
                src?: string;
                dst?: string;
                srcPort?: number;
                dstPort?: number;
                log?: boolean;
            }>;
        }>;
        users: Array<{
            name: string;
            privilege?: number;
            role?: string;
            sshKey?: boolean;
        }>;
        aaa?: { tacacs?: Record<string, unknown>; radius?: Record<string, unknown> };
    };
    mgmt: {
        ssh?: { enabled: boolean; version?: number; timeout?: number };
        snmp?: { enabled: boolean; version?: string; communities?: string[] };
        ntp?: { servers: string[]; timezone?: string };
        logging?: { servers: string[]; level?: string };
    };
}

export interface Rulepack {
    id: string;
    name: string;
    version: string;
    vendor_scope?: Vendor;
    rules: Rule[];
    active: boolean;
    created_at: string;
}

export interface Rule {
    id: string;
    name: string;
    description: string;
    severity: Severity;
    type: 'match' | 'custom';
    path?: string;
    condition?: {
        operator: string;
        value: unknown;
    };
    customPredicate?: string;
}

export interface LintRun {
    id: string;
    target_type: 'config_version' | 'change_candidate';
    target_id: string;
    rulepack_id: string;
    findings: LintFinding[];
    summary: {
        total: number;
        critical: number;
        high: number;
        med: number;
        low: number;
    };
    status: 'completed' | 'failed';
    run_at: string;
}

export interface LintFinding {
    rule_id: string;
    rule_name: string;
    severity: Severity;
    message: string;
    path?: string;
    line?: number;
}

export interface ChangeRequest {
    id: string;
    title: string;
    status: ChangeStatus;
    intent_type: string;
    params: Record<string, unknown>;
    device_scope: string[];
    risk_tier: RiskTier;
    created_by: string;
    created_at: string;
    updated_at?: string;
}

export interface ChangeSet {
    device_id: string;
    candidate_config: string;
    diff: string;
    precheck_steps: Step[];
    apply_steps: Step[];
    postcheck_steps: Step[];
    rollback_plan: Step[];
    lint_run_id?: string;
}

export interface Step {
    id: string;
    description: string;
    command?: string;
    expected_output?: string;
    status?: 'pending' | 'running' | 'success' | 'failed';
}

export interface Approval {
    id: string;
    change_id: string;
    judge_decision: 'approve' | 'reject' | 'needs_fix';
    reasons: string[];
    required_fixes?: string[];
    approved_by?: string;
    approved_at?: string;
}

export interface DeviceFilter {
    vendor?: Vendor;
    site?: string;
    role?: DeviceRole;
    search?: string;
}

export interface ChangeFilter {
    status?: ChangeStatus;
    risk_tier?: RiskTier;
    search?: string;
}
