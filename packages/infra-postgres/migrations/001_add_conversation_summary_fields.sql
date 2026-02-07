-- Migration: 001_add_conversation_summary_fields.sql
-- Description: Add fields to support conversation summarization
-- Author: System
-- Date: 2025-12-21

ALTER TABLE conversations 
ADD COLUMN
IF NOT EXISTS summary_checkpoint INTEGER DEFAULT 0,
ADD COLUMN
IF NOT EXISTS last_message_at TIMESTAMP DEFAULT NOW
(),
ADD COLUMN
IF NOT EXISTS message_count INTEGER DEFAULT 0;

-- Add indexes for performance
CREATE INDEX
IF NOT EXISTS idx_conversations_last_message ON conversations
(last_message_at DESC);
CREATE INDEX
IF NOT EXISTS idx_conversations_message_count ON conversations
(message_count);
CREATE INDEX
IF NOT EXISTS idx_conversations_summary_checkpoint ON conversations
(summary_checkpoint);

-- Add comment
COMMENT ON COLUMN conversations.summary_checkpoint IS 'Number of messages that have been summarized';
COMMENT ON COLUMN conversations.last_message_at IS 'Timestamp of the last message in this conversation';
COMMENT ON COLUMN conversations.message_count IS 'Total number of messages in this conversation';
