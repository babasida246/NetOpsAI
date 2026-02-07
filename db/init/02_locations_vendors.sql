-- ============================================================================
-- 02_locations_vendors.sql - Locations and Vendors
-- ============================================================================

-- Locations table
CREATE TABLE IF NOT EXISTS public.locations (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying(255) NOT NULL,
    parent_id uuid,
    path text DEFAULT '/'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT locations_pkey PRIMARY KEY (id),
    CONSTRAINT locations_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.locations(id) ON DELETE SET NULL
);

-- Vendors table
CREATE TABLE IF NOT EXISTS public.vendors (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying(255) NOT NULL,
    tax_code character varying(100),
    phone character varying(50),
    email character varying(255),
    address text,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT vendors_pkey PRIMARY KEY (id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_locations_parent_id ON public.locations USING btree (parent_id);
CREATE INDEX IF NOT EXISTS idx_locations_path ON public.locations USING btree (path);
CREATE INDEX IF NOT EXISTS idx_vendors_name ON public.vendors USING btree (name);
