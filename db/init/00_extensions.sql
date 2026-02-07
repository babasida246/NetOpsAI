-- ============================================================================
-- 00_extensions.sql - PostgreSQL Extensions
-- ============================================================================
-- Run this first to enable required extensions

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';

-- Set defaults
SET default_tablespace = '';
SET default_table_access_method = heap;
