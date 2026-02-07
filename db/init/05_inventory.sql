-- ============================================================================
-- 05_inventory.sql - Inventory Sessions and Items
-- ============================================================================

-- Inventory Sessions
CREATE TABLE
IF NOT EXISTS public.inventory_sessions
(
    id uuid DEFAULT public.uuid_generate_v4
() NOT NULL,
    name text NOT NULL,
    location_id uuid,
    status text NOT NULL,
    started_at timestamp
with time zone,
    closed_at timestamp
with time zone,
    created_by text,
    correlation_id text,
    created_at timestamp
with time zone DEFAULT now
(),
    CONSTRAINT inventory_sessions_pkey PRIMARY KEY
(id),
    CONSTRAINT inventory_sessions_status_check CHECK
((status = ANY
(ARRAY['draft'::text, 'in_progress'::text, 'closed'::text, 'canceled'::text]))),
    CONSTRAINT inventory_sessions_location_id_fkey FOREIGN KEY
(location_id) REFERENCES public.locations
(id) ON
DELETE
SET NULL
);

-- Inventory Items
CREATE TABLE
IF NOT EXISTS public.inventory_items
(
    id uuid DEFAULT public.uuid_generate_v4
() NOT NULL,
    session_id uuid NOT NULL,
    asset_id uuid,
    expected_location_id uuid,
    scanned_location_id uuid,
    scanned_at timestamp
with time zone,
    status text NOT NULL,
    note text,
    CONSTRAINT inventory_items_pkey PRIMARY KEY
(id),
    CONSTRAINT inventory_items_status_check CHECK
((status = ANY
(ARRAY['found'::text, 'missing'::text, 'moved'::text, 'unknown'::text]))),
    CONSTRAINT inventory_items_session_id_fkey FOREIGN KEY
(session_id) REFERENCES public.inventory_sessions
(id) ON
DELETE CASCADE,
    CONSTRAINT inventory_items_asset_id_fkey FOREIGN KEY
(asset_id) REFERENCES public.assets
(id) ON
DELETE
SET NULL
,
    CONSTRAINT inventory_items_expected_location_id_fkey FOREIGN KEY
(expected_location_id) REFERENCES public.locations
(id) ON
DELETE
SET NULL
,
    CONSTRAINT inventory_items_scanned_location_id_fkey FOREIGN KEY
(scanned_location_id) REFERENCES public.locations
(id) ON
DELETE
SET NULL
);

-- Indexes
CREATE INDEX
IF NOT EXISTS idx_inventory_sessions_status ON public.inventory_sessions USING btree
(status);
CREATE INDEX
IF NOT EXISTS idx_inventory_sessions_created ON public.inventory_sessions USING btree
(created_at DESC);
CREATE INDEX
IF NOT EXISTS idx_inventory_items_session ON public.inventory_items USING btree
(session_id);
