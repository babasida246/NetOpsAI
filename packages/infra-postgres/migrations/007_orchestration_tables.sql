-- Migration: 007_orchestration_tables.sql
-- Description: Orchestration run and node tables for multi-layer NetOps pipeline
-- Created: 2025-12-25

BEGIN;

-- Enum for orchestration status
DO $$ BEGIN
    CREATE TYPE orchestration_status AS ENUM (
        'pending',
        'running',
        'awaiting_approval',
        'approved',
        'rejected',
        'deploying',
        'deployed',
        'rolled_back',
        'failed',
        'cancelled'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Enum for orchestration layer
DO $$ BEGIN
    CREATE TYPE orchestration_layer AS ENUM (
        'L0_intake',
        'L1_context',
        'L2_deterministic',
        'L3_planner',
        'L4_expert',
        'L5_verification',
        'L6_judge',
        'L7_deploy'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Enum for node status
DO $$ BEGIN
    CREATE TYPE node_status AS ENUM (
        'pending',
        'running',
        'completed',
        'failed',
        'skipped'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ====================
-- ORCHESTRATION RUNS
-- ====================
-- Master record for each orchestration pipeline execution
CREATE TABLE IF NOT EXISTS net_orchestration_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Link to change request (optional - can be created during orchestration)
    change_request_id UUID REFERENCES net_change_requests(id) ON DELETE SET NULL,
    
    -- Intent and scope
    intent TEXT NOT NULL,                           -- User's natural language intent
    intent_params JSONB DEFAULT '{}',               -- Structured intent parameters
    scope JSONB NOT NULL,                           -- Resolved scope: { deviceIds, sites, roles, vendors }
    
    -- Context pack (cached, redacted)
    context_pack JSONB,                             -- NetOpsContextPack snapshot
    context_pack_hash TEXT,                         -- SHA-256 of context pack for cache invalidation
    context_pack_tokens INTEGER,                    -- Estimated token count
    
    -- Status tracking
    status orchestration_status NOT NULL DEFAULT 'pending',
    current_layer orchestration_layer DEFAULT 'L0_intake',
    
    -- Risk and approvals
    risk_level TEXT CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
    required_approvals INTEGER DEFAULT 1,
    received_approvals INTEGER DEFAULT 0,
    
    -- Gating flags
    has_verify_plan BOOLEAN DEFAULT FALSE,
    has_rollback_plan BOOLEAN DEFAULT FALSE,
    has_critical_findings BOOLEAN DEFAULT FALSE,
    critical_findings_waived BOOLEAN DEFAULT FALSE,
    deploy_enabled BOOLEAN DEFAULT TRUE,           -- Feature flag override
    
    -- LLM outputs (stored redacted)
    planner_output JSONB,                          -- TaskGraph from Planner LLM
    expert_output JSONB,                           -- Generated configs from Expert LLM
    judge_output JSONB,                            -- PolicyJudge verdict
    
    -- Timing
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Audit
    created_by UUID NOT NULL,
    
    -- Error handling
    error_message TEXT,
    error_details JSONB
);

-- ====================
-- ORCHESTRATION NODES
-- ====================
-- Individual step/task within an orchestration run
CREATE TABLE IF NOT EXISTS net_orchestration_nodes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id UUID NOT NULL REFERENCES net_orchestration_runs(id) ON DELETE CASCADE,
    
    -- Node identity
    node_type TEXT NOT NULL,                        -- 'intake', 'context', 'lint', 'plan', 'generate', 'verify', 'judge', 'deploy', etc.
    layer orchestration_layer NOT NULL,
    sequence_num INTEGER NOT NULL,                  -- Order within the run
    
    -- Dependencies (DAG)
    depends_on UUID[],                              -- Array of node IDs this depends on
    
    -- Execution
    status node_status NOT NULL DEFAULT 'pending',
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    duration_ms INTEGER,
    
    -- Input/Output (redacted for LLM nodes)
    input_summary JSONB,                            -- Summary of inputs (never raw secrets)
    output_summary JSONB,                           -- Summary of outputs
    
    -- LLM-specific fields
    model_used TEXT,                                -- e.g., 'gpt-4o-mini', 'claude-3-5-sonnet'
    model_tier TEXT CHECK (model_tier IN ('cheap', 'strong')),
    prompt_tokens INTEGER,
    completion_tokens INTEGER,
    llm_latency_ms INTEGER,
    retry_count INTEGER DEFAULT 0,
    
    -- Error handling
    error_message TEXT,
    error_code TEXT,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ====================
-- INDEXES
-- ====================

-- Orchestration runs indexes
CREATE INDEX IF NOT EXISTS idx_orch_runs_change_request ON net_orchestration_runs(change_request_id);
CREATE INDEX IF NOT EXISTS idx_orch_runs_status ON net_orchestration_runs(status);
CREATE INDEX IF NOT EXISTS idx_orch_runs_created_by ON net_orchestration_runs(created_by);
CREATE INDEX IF NOT EXISTS idx_orch_runs_created_at ON net_orchestration_runs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orch_runs_current_layer ON net_orchestration_runs(current_layer);

-- Orchestration nodes indexes
CREATE INDEX IF NOT EXISTS idx_orch_nodes_run_id ON net_orchestration_nodes(run_id);
CREATE INDEX IF NOT EXISTS idx_orch_nodes_status ON net_orchestration_nodes(status);
CREATE INDEX IF NOT EXISTS idx_orch_nodes_layer ON net_orchestration_nodes(layer);
CREATE INDEX IF NOT EXISTS idx_orch_nodes_type ON net_orchestration_nodes(node_type);
CREATE INDEX IF NOT EXISTS idx_orch_nodes_sequence ON net_orchestration_nodes(run_id, sequence_num);

-- ====================
-- TRIGGERS
-- ====================

-- Auto-update updated_at for runs
CREATE OR REPLACE FUNCTION update_orch_runs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_orch_runs_updated_at ON net_orchestration_runs;
CREATE TRIGGER trg_orch_runs_updated_at
    BEFORE UPDATE ON net_orchestration_runs
    FOR EACH ROW
    EXECUTE FUNCTION update_orch_runs_updated_at();

-- Auto-update updated_at for nodes
CREATE OR REPLACE FUNCTION update_orch_nodes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_orch_nodes_updated_at ON net_orchestration_nodes;
CREATE TRIGGER trg_orch_nodes_updated_at
    BEFORE UPDATE ON net_orchestration_nodes
    FOR EACH ROW
    EXECUTE FUNCTION update_orch_nodes_updated_at();

-- ====================
-- COMMENTS
-- ====================

COMMENT ON TABLE net_orchestration_runs IS 'Master record for multi-layer orchestration pipeline executions';
COMMENT ON TABLE net_orchestration_nodes IS 'Individual steps/tasks within an orchestration run (forms a DAG)';

COMMENT ON COLUMN net_orchestration_runs.context_pack IS 'Cached, redacted NetOpsContextPack for LLM consumption';
COMMENT ON COLUMN net_orchestration_runs.context_pack_hash IS 'SHA-256 hash for cache invalidation';
COMMENT ON COLUMN net_orchestration_runs.planner_output IS 'TaskGraph JSON from L3 Planner LLM (redacted)';
COMMENT ON COLUMN net_orchestration_runs.expert_output IS 'Generated configs from L4 Expert LLM (redacted)';
COMMENT ON COLUMN net_orchestration_runs.judge_output IS 'Policy verdict from L6 Judge LLM';

COMMENT ON COLUMN net_orchestration_nodes.depends_on IS 'Array of node UUIDs this node depends on (DAG edges)';
COMMENT ON COLUMN net_orchestration_nodes.model_tier IS 'cheap=fast/cheap model, strong=capable/expensive model';

COMMIT;
