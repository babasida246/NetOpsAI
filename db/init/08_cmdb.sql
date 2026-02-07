-- ============================================================================
-- 08_cmdb.sql - Configuration Management Database
-- ============================================================================

-- CMDB CI Types
CREATE TABLE
IF NOT EXISTS public.cmdb_ci_types
(
    id uuid DEFAULT public.uuid_generate_v4
() NOT NULL,
    code character varying
(50) NOT NULL,
    name character varying
(255) NOT NULL,
    description text,
    created_at timestamp
with time zone DEFAULT now
(),
    CONSTRAINT cmdb_ci_types_pkey PRIMARY KEY
(id),
    CONSTRAINT cmdb_ci_types_code_key UNIQUE
(code)
);

-- CMDB CI Type Versions
CREATE TABLE
IF NOT EXISTS public.cmdb_ci_type_versions
(
    id uuid DEFAULT public.uuid_generate_v4
() NOT NULL,
    type_id uuid NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    status character varying
(20) DEFAULT 'draft'::character varying,
    created_by character varying
(255),
    created_at timestamp
with time zone DEFAULT now
(),
    CONSTRAINT cmdb_ci_type_versions_pkey PRIMARY KEY
(id),
    CONSTRAINT cmdb_ci_type_versions_type_id_version_key UNIQUE
(type_id, version),
    CONSTRAINT cmdb_ci_type_versions_status_check CHECK
(((status)::text = ANY
((ARRAY['draft'::character varying, 'active'::character varying, 'deprecated'::character varying])::text[]))),
    CONSTRAINT positive_version CHECK
((version > 0)),
    CONSTRAINT cmdb_ci_type_versions_type_id_fkey FOREIGN KEY
(type_id) REFERENCES public.cmdb_ci_types
(id) ON
DELETE CASCADE
);

-- CMDB CI Schemas
CREATE TABLE
IF NOT EXISTS public.cmdb_ci_schemas
(
    id uuid DEFAULT public.uuid_generate_v4
() NOT NULL,
    ci_type_version_id uuid NOT NULL,
    attribute_key character varying
(100) NOT NULL,
    attribute_label character varying
(255) NOT NULL,
    data_type character varying
(50) NOT NULL,
    is_required boolean DEFAULT false,
    is_indexed boolean DEFAULT false,
    default_value jsonb,
    validation_rules jsonb DEFAULT '{}'::jsonb,
    display_order integer DEFAULT 0,
    created_at timestamp
with time zone DEFAULT now
(),
    CONSTRAINT cmdb_ci_schemas_pkey PRIMARY KEY
(id),
    CONSTRAINT uq_cmdb_ci_schemas__ci_type_version_id__attribute_key UNIQUE
(ci_type_version_id, attribute_key),
    CONSTRAINT cmdb_ci_schemas_data_type_check CHECK
(((data_type)::text = ANY
((ARRAY['text'::character varying, 'number'::character varying, 'boolean'::character varying, 'date'::character varying, 'datetime'::character varying, 'json'::character varying, 'url'::character varying, 'email'::character varying, 'select'::character varying, 'multi_select'::character varying])::text[]))),
    CONSTRAINT fk_cmdb_ci_schemas__cmdb_ci_type_versions__ci_type_version_id FOREIGN KEY
(ci_type_version_id) REFERENCES public.cmdb_ci_type_versions
(id) ON
DELETE CASCADE
);

-- CMDB CIs (Configuration Items)
CREATE TABLE
IF NOT EXISTS public.cmdb_cis
(
    id uuid DEFAULT public.uuid_generate_v4
() NOT NULL,
    type_id uuid NOT NULL,
    asset_id uuid,
    location_id uuid,
    name character varying
(255) NOT NULL,
    ci_code character varying
(100),
    status character varying
(50) DEFAULT 'active'::character varying,
    environment character varying
(50) DEFAULT 'prod'::character varying,
    owner_team character varying
(255),
    notes text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp
with time zone DEFAULT now
(),
    updated_at timestamp
with time zone DEFAULT now
(),
    CONSTRAINT cmdb_cis_pkey PRIMARY KEY
(id),
    CONSTRAINT cmdb_cis_ci_code_key UNIQUE
(ci_code),
    CONSTRAINT cmdb_cis_environment_check CHECK
(((environment)::text = ANY
((ARRAY['dev'::character varying, 'test'::character varying, 'staging'::character varying, 'prod'::character varying])::text[]))),
    CONSTRAINT cmdb_cis_status_check CHECK
(((status)::text = ANY
((ARRAY['active'::character varying, 'inactive'::character varying, 'decommissioned'::character varying, 'maintenance'::character varying])::text[]))),
    CONSTRAINT cmdb_cis_type_id_fkey FOREIGN KEY
(type_id) REFERENCES public.cmdb_ci_types
(id) ON
DELETE RESTRICT,
    CONSTRAINT cmdb_cis_asset_id_fkey FOREIGN KEY
(asset_id) REFERENCES public.assets
(id) ON
DELETE
SET NULL
,
    CONSTRAINT cmdb_cis_location_id_fkey FOREIGN KEY
(location_id) REFERENCES public.locations
(id) ON
DELETE
SET NULL
);

-- CMDB CI Attribute Values
CREATE TABLE
IF NOT EXISTS public.cmdb_ci_attribute_values
(
    id uuid DEFAULT public.uuid_generate_v4
() NOT NULL,
    ci_id uuid NOT NULL,
    schema_id uuid NOT NULL,
    attribute_key character varying
(100) NOT NULL,
    value jsonb NOT NULL,
    created_at timestamp
with time zone DEFAULT now
(),
    updated_at timestamp
with time zone DEFAULT now
(),
    CONSTRAINT pk_cmdb_ci_attribute_values PRIMARY KEY
(id),
    CONSTRAINT cmdb_ci_attribute_values_ci_id_attribute_key_key UNIQUE
(ci_id, attribute_key),
    CONSTRAINT fk_cmdb_ci_attribute_values__cmdb_cis__ci_id FOREIGN KEY
(ci_id) REFERENCES public.cmdb_cis
(id) ON
DELETE CASCADE
);

-- CMDB Relationship Types
CREATE TABLE
IF NOT EXISTS public.cmdb_relationship_types
(
    id uuid DEFAULT public.uuid_generate_v4
() NOT NULL,
    code character varying
(50) NOT NULL,
    name character varying
(255) NOT NULL,
    reverse_name character varying
(255),
    allowed_from_type_id uuid,
    allowed_to_type_id uuid,
    created_at timestamp
with time zone DEFAULT now
(),
    CONSTRAINT cmdb_relationship_types_pkey PRIMARY KEY
(id),
    CONSTRAINT cmdb_relationship_types_code_key UNIQUE
(code),
    CONSTRAINT cmdb_relationship_types_allowed_from_type_id_fkey FOREIGN KEY
(allowed_from_type_id) REFERENCES public.cmdb_ci_types
(id) ON
DELETE
SET NULL
,
    CONSTRAINT cmdb_relationship_types_allowed_to_type_id_fkey FOREIGN KEY
(allowed_to_type_id) REFERENCES public.cmdb_ci_types
(id) ON
DELETE
SET NULL
);

-- CMDB Relationships
CREATE TABLE
IF NOT EXISTS public.cmdb_relationships
(
    id uuid DEFAULT public.uuid_generate_v4
() NOT NULL,
    type_id uuid NOT NULL,
    from_ci_id uuid NOT NULL,
    to_ci_id uuid NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp
with time zone DEFAULT now
(),
    CONSTRAINT cmdb_relationships_pkey PRIMARY KEY
(id),
    CONSTRAINT cmdb_relationships_type_id_from_ci_id_to_ci_id_key UNIQUE
(type_id, from_ci_id, to_ci_id),
    CONSTRAINT no_self_relationship CHECK
((from_ci_id <> to_ci_id)),
    CONSTRAINT cmdb_relationships_type_id_fkey FOREIGN KEY
(type_id) REFERENCES public.cmdb_relationship_types
(id) ON
DELETE RESTRICT,
    CONSTRAINT cmdb_relationships_from_ci_id_fkey FOREIGN KEY
(from_ci_id) REFERENCES public.cmdb_cis
(id) ON
DELETE CASCADE,
    CONSTRAINT cmdb_relationships_to_ci_id_fkey FOREIGN KEY
(to_ci_id) REFERENCES public.cmdb_cis
(id) ON
DELETE CASCADE
);

-- CMDB Services
CREATE TABLE
IF NOT EXISTS public.cmdb_services
(
    id uuid DEFAULT public.uuid_generate_v4
() NOT NULL,
    code character varying
(50) NOT NULL,
    name character varying
(255) NOT NULL,
    description text,
    criticality character varying
(20) DEFAULT 'normal'::character varying,
    owner character varying
(255),
    sla jsonb DEFAULT '{}'::jsonb,
    status character varying
(50) DEFAULT 'active'::character varying,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp
with time zone DEFAULT now
(),
    updated_at timestamp
with time zone DEFAULT now
(),
    CONSTRAINT cmdb_services_pkey PRIMARY KEY
(id),
    CONSTRAINT cmdb_services_code_key UNIQUE
(code),
    CONSTRAINT cmdb_services_criticality_check CHECK
(((criticality)::text = ANY
((ARRAY['low'::character varying, 'normal'::character varying, 'high'::character varying, 'critical'::character varying])::text[])))
);

-- CMDB Service CIs
CREATE TABLE
IF NOT EXISTS public.cmdb_service_cis
(
    id uuid DEFAULT public.uuid_generate_v4
() NOT NULL,
    service_id uuid NOT NULL,
    ci_id uuid NOT NULL,
    dependency_type character varying
(50) DEFAULT 'uses'::character varying,
    created_at timestamp
with time zone DEFAULT now
(),
    CONSTRAINT cmdb_service_cis_pkey PRIMARY KEY
(id),
    CONSTRAINT cmdb_service_cis_service_id_ci_id_key UNIQUE
(service_id, ci_id),
    CONSTRAINT cmdb_service_cis_service_id_fkey FOREIGN KEY
(service_id) REFERENCES public.cmdb_services
(id) ON
DELETE CASCADE,
    CONSTRAINT cmdb_service_cis_ci_id_fkey FOREIGN KEY
(ci_id) REFERENCES public.cmdb_cis
(id) ON
DELETE CASCADE
);

-- Indexes
CREATE INDEX
IF NOT EXISTS idx_cmdb_ci_types_code ON public.cmdb_ci_types USING btree
(code);
CREATE INDEX
IF NOT EXISTS idx_ci_type_versions_type ON public.cmdb_ci_type_versions USING btree
(type_id);
CREATE INDEX
IF NOT EXISTS idx_ci_type_versions_status ON public.cmdb_ci_type_versions USING btree
(type_id, status) WHERE
((status)::text = 'active'::text);
CREATE INDEX
IF NOT EXISTS ix_cmdb_ci_schemas__ci_type_version_id ON public.cmdb_ci_schemas USING btree
(ci_type_version_id);
CREATE INDEX
IF NOT EXISTS ix_cmdb_ci_schemas__ci_type_version_id__display_order ON public.cmdb_ci_schemas USING btree
(ci_type_version_id, display_order);
CREATE INDEX
IF NOT EXISTS idx_cis_type ON public.cmdb_cis USING btree
(type_id);
CREATE INDEX
IF NOT EXISTS idx_cis_asset ON public.cmdb_cis USING btree
(asset_id);
CREATE INDEX
IF NOT EXISTS idx_cis_location ON public.cmdb_cis USING btree
(location_id);
CREATE INDEX
IF NOT EXISTS idx_cis_ci_code ON public.cmdb_cis USING btree
(ci_code);
CREATE INDEX
IF NOT EXISTS idx_cis_name ON public.cmdb_cis USING btree
(name);
CREATE INDEX
IF NOT EXISTS idx_cis_status ON public.cmdb_cis USING btree
(status);
CREATE INDEX
IF NOT EXISTS idx_cis_environment ON public.cmdb_cis USING btree
(environment);
CREATE INDEX
IF NOT EXISTS idx_cis_metadata ON public.cmdb_cis USING gin
(metadata);
CREATE INDEX
IF NOT EXISTS ix_cmdb_ci_attribute_values__ci_id ON public.cmdb_ci_attribute_values USING btree
(ci_id);
CREATE INDEX
IF NOT EXISTS ix_cmdb_ci_attribute_values__schema_id ON public.cmdb_ci_attribute_values USING btree
(schema_id);
CREATE INDEX
IF NOT EXISTS ix_cmdb_ci_attribute_values__attribute_key ON public.cmdb_ci_attribute_values USING btree
(attribute_key);
CREATE INDEX
IF NOT EXISTS ix_cmdb_ci_attribute_values__value ON public.cmdb_ci_attribute_values USING gin
(value);
CREATE INDEX
IF NOT EXISTS idx_rel_types_code ON public.cmdb_relationship_types USING btree
(code);
CREATE INDEX
IF NOT EXISTS idx_rel_types_from ON public.cmdb_relationship_types USING btree
(allowed_from_type_id);
CREATE INDEX
IF NOT EXISTS idx_rel_types_to ON public.cmdb_relationship_types USING btree
(allowed_to_type_id);
CREATE INDEX
IF NOT EXISTS idx_relationships_type ON public.cmdb_relationships USING btree
(type_id);
CREATE INDEX
IF NOT EXISTS idx_relationships_from ON public.cmdb_relationships USING btree
(from_ci_id);
CREATE INDEX
IF NOT EXISTS idx_relationships_to ON public.cmdb_relationships USING btree
(to_ci_id);
CREATE INDEX
IF NOT EXISTS idx_relationships_metadata ON public.cmdb_relationships USING gin
(metadata);
CREATE INDEX
IF NOT EXISTS idx_services_code ON public.cmdb_services USING btree
(code);
CREATE INDEX
IF NOT EXISTS idx_services_criticality ON public.cmdb_services USING btree
(criticality);
CREATE INDEX
IF NOT EXISTS idx_services_status ON public.cmdb_services USING btree
(status);
CREATE INDEX
IF NOT EXISTS idx_services_metadata ON public.cmdb_services USING gin
(metadata);
CREATE INDEX
IF NOT EXISTS idx_service_cis_service ON public.cmdb_service_cis USING btree
(service_id);
CREATE INDEX
IF NOT EXISTS idx_service_cis_ci ON public.cmdb_service_cis USING btree
(ci_id);
