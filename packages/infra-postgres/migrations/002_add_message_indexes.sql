-- Migration: 002_add_message_indexes.sql
-- Description: Add indexes to optimize message queries
-- Author: System
-- Date: 2025-12-21

-- Index for querying messages by conversation (most common query)
CREATE INDEX
IF NOT EXISTS idx_messages_conversation_id ON messages
(conversation_id);

-- Index for sorting messages by creation time (descending)
CREATE INDEX
IF NOT EXISTS idx_messages_created_at ON messages
(created_at DESC);

-- Index for filtering messages by role
CREATE INDEX
IF NOT EXISTS idx_messages_role ON messages
(role);

-- Composite index for conversation + created_at (common query pattern)
CREATE INDEX
IF NOT EXISTS idx_messages_conversation_created ON messages
(conversation_id, created_at DESC);

-- Index for full-text search on message content (if needed)
-- CREATE INDEX IF NOT EXISTS idx_messages_content_search ON messages USING GIN(to_tsvector('english', content));
