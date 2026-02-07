-- ============================================================================
-- 07_repair_orders.sql - Repair Orders and Parts
-- ============================================================================

-- Repair Orders
CREATE TABLE IF NOT EXISTS public.repair_orders (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    asset_id uuid NOT NULL,
    code text NOT NULL,
    title text NOT NULL,
    description text,
    severity text NOT NULL,
    status text NOT NULL,
    opened_at timestamp with time zone DEFAULT now() NOT NULL,
    closed_at timestamp with time zone,
    diagnosis text,
    resolution text,
    repair_type text NOT NULL,
    technician_name text,
    vendor_id uuid,
    labor_cost numeric(12,2) DEFAULT 0,
    parts_cost numeric(12,2) DEFAULT 0,
    downtime_minutes integer,
    created_by text,
    correlation_id text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT repair_orders_pkey PRIMARY KEY (id),
    CONSTRAINT repair_orders_code_key UNIQUE (code),
    CONSTRAINT repair_orders_repair_type_check CHECK ((repair_type = ANY (ARRAY['internal'::text, 'vendor'::text]))),
    CONSTRAINT repair_orders_severity_check CHECK ((severity = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'critical'::text]))),
    CONSTRAINT repair_orders_status_check CHECK ((status = ANY (ARRAY['open'::text, 'diagnosing'::text, 'waiting_parts'::text, 'repaired'::text, 'closed'::text, 'canceled'::text]))),
    CONSTRAINT repair_orders_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES public.assets(id) ON DELETE CASCADE,
    CONSTRAINT repair_orders_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.vendors(id) ON DELETE SET NULL
);

-- Repair Order Parts
CREATE TABLE IF NOT EXISTS public.repair_order_parts (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    repair_order_id uuid NOT NULL,
    part_id uuid,
    part_name text,
    warehouse_id uuid,
    action text NOT NULL,
    qty integer NOT NULL,
    unit_cost numeric(12,2),
    serial_no text,
    note text,
    stock_document_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT repair_order_parts_pkey PRIMARY KEY (id),
    CONSTRAINT repair_order_parts_action_check CHECK ((action = ANY (ARRAY['replace'::text, 'add'::text, 'remove'::text, 'upgrade'::text]))),
    CONSTRAINT repair_order_parts_qty_check CHECK ((qty > 0)),
    CONSTRAINT repair_order_parts_repair_order_id_fkey FOREIGN KEY (repair_order_id) REFERENCES public.repair_orders(id) ON DELETE CASCADE,
    CONSTRAINT repair_order_parts_part_id_fkey FOREIGN KEY (part_id) REFERENCES public.spare_parts(id) ON DELETE SET NULL,
    CONSTRAINT repair_order_parts_warehouse_id_fkey FOREIGN KEY (warehouse_id) REFERENCES public.warehouses(id) ON DELETE SET NULL,
    CONSTRAINT repair_order_parts_stock_document_id_fkey FOREIGN KEY (stock_document_id) REFERENCES public.stock_documents(id) ON DELETE SET NULL
);

-- Attachments (shared for multiple entity types)
CREATE TABLE IF NOT EXISTS public.attachments (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    entity_type text NOT NULL,
    entity_id uuid NOT NULL,
    file_name text NOT NULL,
    mime_type text NOT NULL,
    storage_key text NOT NULL,
    size_bytes bigint,
    version integer DEFAULT 1 NOT NULL,
    uploaded_by text,
    correlation_id text,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT attachments_pkey PRIMARY KEY (id),
    CONSTRAINT attachments_entity_type_check CHECK ((entity_type = ANY (ARRAY['repair_order'::text, 'stock_document'::text])))
);

-- Operations Events
CREATE TABLE IF NOT EXISTS public.ops_events (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    entity_type text NOT NULL,
    entity_id uuid NOT NULL,
    event_type text NOT NULL,
    payload jsonb DEFAULT '{}'::jsonb,
    actor_user_id text,
    correlation_id text,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT ops_events_pkey PRIMARY KEY (id),
    CONSTRAINT ops_events_entity_type_check CHECK ((entity_type = ANY (ARRAY['repair_order'::text, 'stock_document'::text, 'spare_part'::text, 'warehouse'::text, 'asset_category'::text, 'cmdb_ci'::text, 'cmdb_rel'::text, 'cmdb_service'::text, 'cmdb_type'::text, 'cmdb_schema'::text])))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_repair_orders_asset ON public.repair_orders USING btree (asset_id, opened_at DESC);
CREATE INDEX IF NOT EXISTS idx_repair_orders_status ON public.repair_orders USING btree (status, opened_at DESC);
CREATE INDEX IF NOT EXISTS idx_repair_order_parts_order ON public.repair_order_parts USING btree (repair_order_id, created_at);
CREATE INDEX IF NOT EXISTS idx_attachments_entity ON public.attachments USING btree (entity_type, entity_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ops_events_entity ON public.ops_events USING btree (entity_type, entity_id, created_at DESC);
