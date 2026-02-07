-- Asset category spec definitions
CREATE TABLE IF NOT EXISTS asset_category_spec_defs
(
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id UUID NOT NULL REFERENCES asset_categories(id) ON DELETE CASCADE,
    key TEXT NOT NULL,
    label TEXT NOT NULL,
    field_type TEXT NOT NULL CHECK (field_type IN ('string','number','boolean','enum','date')),
    unit TEXT,
    required BOOLEAN NOT NULL DEFAULT false,
    enum_values JSONB,
    min_value NUMERIC,
    max_value NUMERIC,
    step_value NUMERIC,
    default_value JSONB,
    help_text TEXT,
    sort_order INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (category_id, key)
);

CREATE INDEX IF NOT EXISTS idx_category_spec_defs_category ON asset_category_spec_defs(category_id, sort_order);
