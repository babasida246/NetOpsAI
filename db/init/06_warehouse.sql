-- ============================================================================
-- 06_warehouse.sql - Warehouses, Spare Parts, Stock Management
-- ============================================================================

-- Warehouses
CREATE TABLE IF NOT EXISTS public.warehouses (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    location_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT warehouses_pkey PRIMARY KEY (id),
    CONSTRAINT warehouses_code_key UNIQUE (code),
    CONSTRAINT warehouses_location_id_fkey FOREIGN KEY (location_id) REFERENCES public.locations(id) ON DELETE SET NULL
);

-- Spare Parts
CREATE TABLE IF NOT EXISTS public.spare_parts (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    part_code text NOT NULL,
    name text NOT NULL,
    category text,
    uom text DEFAULT 'pcs'::text,
    manufacturer text,
    model text,
    spec jsonb DEFAULT '{}'::jsonb,
    min_level integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT spare_parts_pkey PRIMARY KEY (id),
    CONSTRAINT spare_parts_part_code_key UNIQUE (part_code)
);

-- Spare Part Stock
CREATE TABLE IF NOT EXISTS public.spare_part_stock (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    warehouse_id uuid NOT NULL,
    part_id uuid NOT NULL,
    on_hand integer DEFAULT 0 NOT NULL,
    reserved integer DEFAULT 0 NOT NULL,
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT spare_part_stock_pkey PRIMARY KEY (id),
    CONSTRAINT spare_part_stock_warehouse_id_part_id_key UNIQUE (warehouse_id, part_id),
    CONSTRAINT spare_part_stock_warehouse_id_fkey FOREIGN KEY (warehouse_id) REFERENCES public.warehouses(id) ON DELETE CASCADE,
    CONSTRAINT spare_part_stock_part_id_fkey FOREIGN KEY (part_id) REFERENCES public.spare_parts(id) ON DELETE CASCADE
);

-- Spare Part Movements
CREATE TABLE IF NOT EXISTS public.spare_part_movements (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    warehouse_id uuid NOT NULL,
    part_id uuid NOT NULL,
    movement_type text NOT NULL,
    qty integer NOT NULL,
    unit_cost numeric(12,2),
    ref_type text,
    ref_id uuid,
    actor_user_id text,
    correlation_id text,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT spare_part_movements_pkey PRIMARY KEY (id),
    CONSTRAINT spare_part_movements_movement_type_check CHECK ((movement_type = ANY (ARRAY['in'::text, 'out'::text, 'adjust_in'::text, 'adjust_out'::text, 'transfer_in'::text, 'transfer_out'::text, 'reserve'::text, 'release'::text]))),
    CONSTRAINT spare_part_movements_qty_check CHECK ((qty > 0)),
    CONSTRAINT spare_part_movements_warehouse_id_fkey FOREIGN KEY (warehouse_id) REFERENCES public.warehouses(id) ON DELETE CASCADE,
    CONSTRAINT spare_part_movements_part_id_fkey FOREIGN KEY (part_id) REFERENCES public.spare_parts(id) ON DELETE CASCADE
);

-- Stock Documents
CREATE TABLE IF NOT EXISTS public.stock_documents (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    doc_type text NOT NULL,
    code text NOT NULL,
    status text NOT NULL,
    warehouse_id uuid,
    target_warehouse_id uuid,
    doc_date date DEFAULT CURRENT_DATE NOT NULL,
    ref_type text,
    ref_id uuid,
    note text,
    created_by text,
    approved_by text,
    correlation_id text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT stock_documents_pkey PRIMARY KEY (id),
    CONSTRAINT stock_documents_code_key UNIQUE (code),
    CONSTRAINT stock_documents_doc_type_check CHECK ((doc_type = ANY (ARRAY['receipt'::text, 'issue'::text, 'adjust'::text, 'transfer'::text]))),
    CONSTRAINT stock_documents_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'posted'::text, 'canceled'::text]))),
    CONSTRAINT stock_documents_warehouse_id_fkey FOREIGN KEY (warehouse_id) REFERENCES public.warehouses(id) ON DELETE SET NULL,
    CONSTRAINT stock_documents_target_warehouse_id_fkey FOREIGN KEY (target_warehouse_id) REFERENCES public.warehouses(id) ON DELETE SET NULL
);

-- Stock Document Lines
CREATE TABLE IF NOT EXISTS public.stock_document_lines (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    document_id uuid NOT NULL,
    part_id uuid NOT NULL,
    qty integer NOT NULL,
    unit_cost numeric(12,2),
    serial_no text,
    note text,
    adjust_direction text,
    CONSTRAINT stock_document_lines_pkey PRIMARY KEY (id),
    CONSTRAINT stock_document_lines_adjust_direction_check CHECK (((adjust_direction IS NULL) OR (adjust_direction = ANY (ARRAY['plus'::text, 'minus'::text])))),
    CONSTRAINT stock_document_lines_qty_check CHECK ((qty > 0)),
    CONSTRAINT stock_document_lines_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.stock_documents(id) ON DELETE CASCADE,
    CONSTRAINT stock_document_lines_part_id_fkey FOREIGN KEY (part_id) REFERENCES public.spare_parts(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_warehouses_code ON public.warehouses USING btree (code);
CREATE INDEX IF NOT EXISTS idx_warehouses_location ON public.warehouses USING btree (location_id);
CREATE INDEX IF NOT EXISTS idx_spare_parts_code ON public.spare_parts USING btree (part_code);
CREATE INDEX IF NOT EXISTS idx_spare_parts_name ON public.spare_parts USING btree (name);
CREATE INDEX IF NOT EXISTS idx_spare_part_stock_lookup ON public.spare_part_stock USING btree (warehouse_id, part_id);
CREATE INDEX IF NOT EXISTS idx_spare_part_movements_warehouse ON public.spare_part_movements USING btree (warehouse_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_spare_part_movements_part ON public.spare_part_movements USING btree (part_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stock_documents_status ON public.stock_documents USING btree (status, doc_date DESC);
CREATE INDEX IF NOT EXISTS idx_stock_document_lines_doc ON public.stock_document_lines USING btree (document_id);
