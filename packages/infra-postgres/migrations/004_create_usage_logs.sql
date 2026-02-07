-- Create usage_logs table for request tracking and metrics
CREATE TABLE
IF NOT EXISTS usage_logs
(
    id SERIAL PRIMARY KEY,
    user_id VARCHAR
(255),
    conversation_id UUID,
    message_id UUID,
    model_id VARCHAR
(255),
    provider VARCHAR
(100),
    
    -- Request details
    endpoint VARCHAR
(255),
    method VARCHAR
(10),
    status_code INTEGER,
    
    -- Performance metrics
    latency_ms NUMERIC
(10, 2),
    
    -- Token usage
    prompt_tokens INTEGER DEFAULT 0,
    completion_tokens INTEGER DEFAULT 0,
    total_tokens INTEGER DEFAULT 0,
    
    -- Cost tracking
    cost NUMERIC
(12, 6) DEFAULT 0,
    
    -- Metadata
    tier INTEGER DEFAULT 0,
    quality_score NUMERIC
(3, 2),
    error_message TEXT,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW
(),
    
    -- Indexes for common queries
    CONSTRAINT usage_logs_status_code_check CHECK
(status_code >= 100 AND status_code < 600)
);

-- Create indexes for performance
CREATE INDEX
IF NOT EXISTS idx_usage_logs_user_id ON usage_logs
(user_id);
CREATE INDEX
IF NOT EXISTS idx_usage_logs_created_at ON usage_logs
(created_at DESC);
CREATE INDEX
IF NOT EXISTS idx_usage_logs_conversation_id ON usage_logs
(conversation_id);
CREATE INDEX
IF NOT EXISTS idx_usage_logs_status_code ON usage_logs
(status_code);
CREATE INDEX
IF NOT EXISTS idx_usage_logs_model_id ON usage_logs
(model_id);

-- Create composite index for metrics queries
CREATE INDEX
IF NOT EXISTS idx_usage_logs_metrics 
    ON usage_logs
(created_at DESC, status_code, latency_ms);

-- Add comment
COMMENT ON TABLE usage_logs IS 'Tracks API usage, performance metrics, and costs';
