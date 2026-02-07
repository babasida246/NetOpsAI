-- Add missing columns to usage_logs table for request metrics
ALTER TABLE usage_logs 
    ADD COLUMN IF NOT EXISTS status_code INTEGER,
    ADD COLUMN IF NOT EXISTS latency_ms NUMERIC(10, 2),
    ADD COLUMN IF NOT EXISTS endpoint VARCHAR(255),
    ADD COLUMN IF NOT EXISTS method VARCHAR(10),
    ADD COLUMN IF NOT EXISTS conversation_id UUID,
    ADD COLUMN IF NOT EXISTS message_id UUID,
    ADD COLUMN IF NOT EXISTS provider VARCHAR(100),
    ADD COLUMN IF NOT EXISTS error_message TEXT;

-- Add check constraint for status_code
ALTER TABLE usage_logs 
    DROP CONSTRAINT IF EXISTS usage_logs_status_code_check;
    
ALTER TABLE usage_logs 
    ADD CONSTRAINT usage_logs_status_code_check 
    CHECK (status_code IS NULL OR (status_code >= 100 AND status_code < 600));

-- Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_usage_logs_status_code ON usage_logs(status_code);
CREATE INDEX IF NOT EXISTS idx_usage_logs_latency_ms ON usage_logs(latency_ms);
CREATE INDEX IF NOT EXISTS idx_usage_logs_conversation_id ON usage_logs(conversation_id);

-- Create composite index for metrics queries
CREATE INDEX IF NOT EXISTS idx_usage_logs_metrics 
    ON usage_logs(created_at DESC, status_code, latency_ms)
    WHERE status_code IS NOT NULL;

COMMENT ON COLUMN usage_logs.status_code IS 'HTTP status code of the request';
COMMENT ON COLUMN usage_logs.latency_ms IS 'Request latency in milliseconds';
