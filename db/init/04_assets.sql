-- ============================================================================
-- 04_assets.sql - Assets and Related Tables
-- ============================================================================

-- Assets table
CREATE TABLE IF NOT EXISTS public.assets (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    asset_code character varying(100) NOT NULL,
    model_id uuid NOT NULL,
    serial_no character varying(255),
    mac_address character varying(50),
    mgmt_ip inet,
    hostname character varying(255),
    vlan_id integer,
    switch_name character varying(255),
    switch_port character varying(100),
    location_id uuid,
    status character varying(20) DEFAULT 'in_stock'::character varying NOT NULL,
    purchase_date date,
    warranty_end date,
    vendor_id uuid,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT assets_pkey PRIMARY KEY (id),
    CONSTRAINT assets_asset_code_key UNIQUE (asset_code),
    CONSTRAINT assets_status_check CHECK (((status)::text = ANY ((ARRAY['in_stock'::character varying, 'in_use'::character varying, 'in_repair'::character varying, 'retired'::character varying, 'disposed'::character varying, 'lost'::character varying])::text[]))),
    CONSTRAINT assets_location_id_fkey FOREIGN KEY (location_id) REFERENCES public.locations(id) ON DELETE SET NULL,
    CONSTRAINT assets_model_id_fkey FOREIGN KEY (model_id) REFERENCES public.asset_models(id) ON DELETE SET NULL,
    CONSTRAINT assets_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.vendors(id) ON DELETE SET NULL
);

-- Asset Assignments
CREATE TABLE IF NOT EXISTS public.asset_assignments (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    asset_id uuid NOT NULL,
    assignee_type character varying(20) NOT NULL,
    assignee_id character varying(255) NOT NULL,
    assignee_name character varying(255) NOT NULL,
    assigned_at timestamp with time zone DEFAULT now() NOT NULL,
    returned_at timestamp with time zone,
    note text,
    CONSTRAINT asset_assignments_pkey PRIMARY KEY (id),
    CONSTRAINT asset_assignments_assignee_type_check CHECK (((assignee_type)::text = ANY ((ARRAY['person'::character varying, 'department'::character varying, 'system'::character varying])::text[]))),
    CONSTRAINT asset_assignments_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES public.assets(id) ON DELETE CASCADE
);

-- Asset Attachments
CREATE TABLE IF NOT EXISTS public.asset_attachments (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    asset_id uuid NOT NULL,
    file_name text,
    mime_type text,
    storage_key text,
    size_bytes bigint,
    version integer NOT NULL,
    uploaded_by text,
    correlation_id text,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT asset_attachments_pkey PRIMARY KEY (id),
    CONSTRAINT asset_attachments_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES public.assets(id) ON DELETE CASCADE
);

-- Asset Events
CREATE TABLE IF NOT EXISTS public.asset_events (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    asset_id uuid NOT NULL,
    event_type character varying(50) NOT NULL,
    payload jsonb DEFAULT '{}'::jsonb,
    actor_user_id character varying(255),
    correlation_id character varying(100),
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT asset_events_pkey PRIMARY KEY (id),
    CONSTRAINT asset_events_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES public.assets(id) ON DELETE CASCADE
);

-- Maintenance Tickets
CREATE TABLE IF NOT EXISTS public.maintenance_tickets (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    asset_id uuid NOT NULL,
    title character varying(255) NOT NULL,
    severity character varying(20) NOT NULL,
    status character varying(20) DEFAULT 'open'::character varying NOT NULL,
    opened_at timestamp with time zone DEFAULT now() NOT NULL,
    closed_at timestamp with time zone,
    diagnosis text,
    resolution text,
    created_by character varying(255),
    correlation_id character varying(100),
    CONSTRAINT maintenance_tickets_pkey PRIMARY KEY (id),
    CONSTRAINT maintenance_tickets_severity_check CHECK (((severity)::text = ANY ((ARRAY['low'::character varying, 'medium'::character varying, 'high'::character varying, 'critical'::character varying])::text[]))),
    CONSTRAINT maintenance_tickets_status_check CHECK (((status)::text = ANY ((ARRAY['open'::character varying, 'in_progress'::character varying, 'closed'::character varying, 'canceled'::character varying])::text[]))),
    CONSTRAINT maintenance_tickets_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES public.assets(id) ON DELETE CASCADE
);

-- Workflow Requests
CREATE TABLE IF NOT EXISTS public.workflow_requests (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    request_type text NOT NULL,
    asset_id uuid,
    from_dept text,
    to_dept text,
    requested_by text,
    approved_by text,
    status text NOT NULL,
    payload jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    correlation_id text,
    CONSTRAINT workflow_requests_pkey PRIMARY KEY (id),
    CONSTRAINT workflow_requests_request_type_check CHECK ((request_type = ANY (ARRAY['assign'::text, 'return'::text, 'move'::text, 'repair'::text, 'dispose'::text]))),
    CONSTRAINT workflow_requests_status_check CHECK ((status = ANY (ARRAY['submitted'::text, 'approved'::text, 'rejected'::text, 'in_progress'::text, 'done'::text, 'canceled'::text]))),
    CONSTRAINT workflow_requests_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES public.assets(id) ON DELETE SET NULL
);

-- Reminders
CREATE TABLE IF NOT EXISTS public.reminders (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    reminder_type text NOT NULL,
    asset_id uuid,
    due_at timestamp with time zone NOT NULL,
    status text NOT NULL,
    channel text DEFAULT 'ui'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    sent_at timestamp with time zone,
    correlation_id text,
    CONSTRAINT reminders_pkey PRIMARY KEY (id),
    CONSTRAINT reminders_reminder_type_check CHECK ((reminder_type = ANY (ARRAY['warranty_expiring'::text, 'maintenance_due'::text]))),
    CONSTRAINT reminders_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'sent'::text, 'canceled'::text]))),
    CONSTRAINT reminders_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES public.assets(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_assets_status ON public.assets USING btree (status);
CREATE INDEX IF NOT EXISTS idx_assets_location_id ON public.assets USING btree (location_id);
CREATE INDEX IF NOT EXISTS idx_assets_mgmt_ip ON public.assets USING btree (mgmt_ip);
CREATE INDEX IF NOT EXISTS idx_assets_warranty_end ON public.assets USING btree (warranty_end);
CREATE INDEX IF NOT EXISTS idx_asset_assignments_asset ON public.asset_assignments USING btree (asset_id, assigned_at DESC);
CREATE INDEX IF NOT EXISTS idx_asset_attachments_asset ON public.asset_attachments USING btree (asset_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_asset_events_asset ON public.asset_events USING btree (asset_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_maintenance_tickets_asset ON public.maintenance_tickets USING btree (asset_id, opened_at DESC);
CREATE INDEX IF NOT EXISTS idx_workflow_requests_status ON public.workflow_requests USING btree (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reminders_status ON public.reminders USING btree (status, due_at);
