-- ============================================================================
-- 03_asset_categories.sql - Asset Categories, Spec Versions, and Definitions
-- ============================================================================

-- Asset Categories
CREATE TABLE IF NOT EXISTS public.asset_categories (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying(255) NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT asset_categories_pkey PRIMARY KEY (id)
);

-- Asset Category Spec Versions
CREATE TABLE IF NOT EXISTS public.asset_category_spec_versions (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    category_id uuid NOT NULL,
    version integer NOT NULL,
    status text NOT NULL,
    created_by text,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT asset_category_spec_versions_pkey PRIMARY KEY (id),
    CONSTRAINT asset_category_spec_versions_category_id_version_key UNIQUE (category_id, version),
    CONSTRAINT asset_category_spec_versions_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'active'::text, 'retired'::text]))),
    CONSTRAINT asset_category_spec_versions_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.asset_categories(id) ON DELETE CASCADE
);

-- Asset Category Spec Definitions
CREATE TABLE IF NOT EXISTS public.asset_category_spec_definitions (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    spec_version_id uuid NOT NULL,
    key text NOT NULL,
    label text NOT NULL,
    field_type text NOT NULL,
    unit text,
    required boolean DEFAULT false NOT NULL,
    enum_values jsonb,
    pattern text,
    min_len integer,
    max_len integer,
    min_value numeric,
    max_value numeric,
    step_value numeric,
    "precision" integer,
    scale integer,
    "normalize" text,
    default_value jsonb,
    help_text text,
    sort_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    is_readonly boolean DEFAULT false NOT NULL,
    computed_expr text,
    is_searchable boolean DEFAULT false NOT NULL,
    is_filterable boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT pk_asset_category_spec_definitions PRIMARY KEY (id),
    CONSTRAINT uq_asset_category_spec_definitions__spec_version_id__key UNIQUE (spec_version_id, key),
    CONSTRAINT asset_category_spec_definitions_field_type_check CHECK ((field_type = ANY (ARRAY['string'::text, 'number'::text, 'boolean'::text, 'enum'::text, 'date'::text, 'ip'::text, 'mac'::text, 'hostname'::text, 'cidr'::text, 'port'::text, 'regex'::text, 'json'::text, 'multi_enum'::text]))),
    CONSTRAINT fk_asset_category_spec_definitions__asset_category_spec_versions__spec_version_id FOREIGN KEY (spec_version_id) REFERENCES public.asset_category_spec_versions(id) ON DELETE CASCADE
);

-- Asset Models
CREATE TABLE IF NOT EXISTS public.asset_models (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    category_id uuid,
    category_spec_version_id uuid,
    vendor_id uuid,
    brand character varying(255),
    model character varying(255) NOT NULL,
    spec jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT asset_models_pkey PRIMARY KEY (id),
    CONSTRAINT asset_models_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.asset_categories(id) ON DELETE SET NULL,
    CONSTRAINT fk_asset_models__asset_category_spec_versions__category_spec_version_id FOREIGN KEY (category_spec_version_id) REFERENCES public.asset_category_spec_versions(id) ON DELETE SET NULL,
    CONSTRAINT asset_models_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.vendors(id) ON DELETE SET NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_asset_categories_name ON public.asset_categories USING btree (name);
CREATE INDEX IF NOT EXISTS idx_spec_versions_category_status ON public.asset_category_spec_versions USING btree (category_id, status);
CREATE INDEX IF NOT EXISTS ix_asset_category_spec_definitions__spec_version_id__sort_order ON public.asset_category_spec_definitions USING btree (spec_version_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_asset_models_category_id ON public.asset_models USING btree (category_id);
CREATE INDEX IF NOT EXISTS idx_asset_models_vendor_id ON public.asset_models USING btree (vendor_id);
CREATE INDEX IF NOT EXISTS idx_asset_models_spec_gin ON public.asset_models USING gin (spec);
CREATE INDEX IF NOT EXISTS ix_asset_models__category_spec_version_id ON public.asset_models USING btree (category_spec_version_id);
