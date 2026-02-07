-- Gateway API Database Schema Extension: Drivers & Documents Management
-- This migration is idempotent and safe to run multiple times.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ====================
-- Drivers
-- ====================

CREATE TABLE IF NOT EXISTS drivers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parent_id UUID REFERENCES drivers(id) ON DELETE SET NULL,

    vendor TEXT NOT NULL,
    device_type TEXT NOT NULL DEFAULT 'other',
    model TEXT NOT NULL,
    component TEXT NOT NULL DEFAULT 'other',

    os TEXT NOT NULL DEFAULT 'other',
    os_version TEXT,
    arch TEXT NOT NULL DEFAULT 'x64',

    version TEXT NOT NULL,
    release_date DATE,

    support_status TEXT NOT NULL DEFAULT 'supported'
        CHECK (support_status IN ('supported', 'deprecated', 'blocked')),
    risk_level TEXT NOT NULL DEFAULT 'low'
        CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),

    compatibility_notes TEXT,

    -- File metadata (single primary artifact per driver version)
    storage_key TEXT,
    filename TEXT,
    size_bytes BIGINT,
    mime_type TEXT,
    sha256 TEXT,
    sha1 TEXT,

    signed BOOLEAN NOT NULL DEFAULT false,
    signature_info JSONB,

    -- Install/detect metadata
    silent_install_cmd TEXT,
    silent_uninstall_cmd TEXT,
    detect_rules JSONB,

    -- Approval workflow
    approval_status TEXT NOT NULL DEFAULT 'draft'
        CHECK (approval_status IN ('draft', 'pending', 'approved', 'rejected')),
    requested_by UUID REFERENCES users(id) ON DELETE SET NULL,
    approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ,
    approval_reason TEXT,

    tags TEXT[] NOT NULL DEFAULT '{}'::TEXT[],

    vendor_url TEXT,
    release_notes_url TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure required columns exist for older schemas
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS parent_id UUID;
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS vendor TEXT;
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS device_type TEXT DEFAULT 'other';
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS model TEXT;
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS component TEXT DEFAULT 'other';
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS os TEXT DEFAULT 'other';
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS os_version TEXT;
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS arch TEXT DEFAULT 'x64';
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS version TEXT;
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS release_date DATE;
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS support_status TEXT DEFAULT 'supported';
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS risk_level TEXT DEFAULT 'low';
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS compatibility_notes TEXT;
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS storage_key TEXT;
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS filename TEXT;
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS size_bytes BIGINT;
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS mime_type TEXT;
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS sha256 TEXT;
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS sha1 TEXT;
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS signed BOOLEAN DEFAULT false;
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS signature_info JSONB;
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS silent_install_cmd TEXT;
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS silent_uninstall_cmd TEXT;
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS detect_rules JSONB;
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'draft';
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS requested_by UUID;
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS approved_by UUID;
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS approval_reason TEXT;
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}'::TEXT[];
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS vendor_url TEXT;
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS release_notes_url TEXT;
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE UNIQUE INDEX IF NOT EXISTS idx_drivers_identity_unique
    ON drivers (vendor, model, component, os, arch, version);
CREATE INDEX IF NOT EXISTS idx_drivers_vendor_model ON drivers (vendor, model);
CREATE INDEX IF NOT EXISTS idx_drivers_os_arch ON drivers (os, arch);
CREATE INDEX IF NOT EXISTS idx_drivers_component ON drivers (component);
CREATE INDEX IF NOT EXISTS idx_drivers_approval_status ON drivers (approval_status);
CREATE INDEX IF NOT EXISTS idx_drivers_support_status ON drivers (support_status);
CREATE INDEX IF NOT EXISTS idx_drivers_risk_level ON drivers (risk_level);
CREATE INDEX IF NOT EXISTS idx_drivers_updated_at ON drivers (updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_drivers_tags_gin ON drivers USING GIN (tags);

-- ====================
-- Documents
-- ====================

CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parent_id UUID REFERENCES documents(id) ON DELETE SET NULL,

    type TEXT NOT NULL DEFAULT 'other',
    title TEXT NOT NULL,
    summary TEXT,

    content_type TEXT NOT NULL DEFAULT 'file'
        CHECK (content_type IN ('file', 'markdown', 'link')),
    markdown TEXT,
    external_url TEXT,

    visibility TEXT NOT NULL DEFAULT 'team'
        CHECK (visibility IN ('private', 'team', 'department', 'org')),

    approval_status TEXT NOT NULL DEFAULT 'draft'
        CHECK (approval_status IN ('draft', 'pending', 'approved', 'rejected')),
    approval_reason TEXT,
    requested_by UUID REFERENCES users(id) ON DELETE SET NULL,
    approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ,

    version TEXT NOT NULL DEFAULT '1',

    tags TEXT[] NOT NULL DEFAULT '{}'::TEXT[],

    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE documents ADD COLUMN IF NOT EXISTS parent_id UUID;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'other';
ALTER TABLE documents ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS summary TEXT;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS content_type TEXT DEFAULT 'file';
ALTER TABLE documents ADD COLUMN IF NOT EXISTS markdown TEXT;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS external_url TEXT;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'team';
ALTER TABLE documents ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'draft';
ALTER TABLE documents ADD COLUMN IF NOT EXISTS approval_reason TEXT;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS requested_by UUID;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS approved_by UUID;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS version TEXT DEFAULT '1';
ALTER TABLE documents ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}'::TEXT[];
ALTER TABLE documents ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS updated_by UUID;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE documents ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_documents_type ON documents (type);
CREATE INDEX IF NOT EXISTS idx_documents_visibility ON documents (visibility);
CREATE INDEX IF NOT EXISTS idx_documents_approval_status ON documents (approval_status);
CREATE INDEX IF NOT EXISTS idx_documents_updated_at ON documents (updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_documents_tags_gin ON documents USING GIN (tags);

-- Attachments for documents (0..n files)
CREATE TABLE IF NOT EXISTS document_files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    storage_key TEXT NOT NULL,
    filename TEXT NOT NULL,
    sha256 TEXT,
    size_bytes BIGINT,
    mime_type TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_document_files_document_id ON document_files (document_id);
CREATE INDEX IF NOT EXISTS idx_document_files_storage_key ON document_files (storage_key);

-- Relations for scope (asset/model/site/service)
CREATE TABLE IF NOT EXISTS document_relations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    relation_type TEXT NOT NULL CHECK (relation_type IN ('asset', 'model', 'site', 'service')),
    relation_id TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_document_relations_document_id ON document_relations (document_id);
CREATE INDEX IF NOT EXISTS idx_document_relations_type_id ON document_relations (relation_type, relation_id);

-- Updated-at triggers for new tables (re-uses update_updated_at_column() created in 001_initial_schema.sql)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
        DROP TRIGGER IF EXISTS update_drivers_updated_at ON drivers;
        CREATE TRIGGER update_drivers_updated_at
            BEFORE UPDATE ON drivers
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();

        DROP TRIGGER IF EXISTS update_documents_updated_at ON documents;
        CREATE TRIGGER update_documents_updated_at
            BEFORE UPDATE ON documents
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

