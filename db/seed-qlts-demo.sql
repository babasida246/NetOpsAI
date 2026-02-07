-- Seed data for QLTS simplified workflow demo
-- Idempotent seed aligned with current schema

-- Update inventory tracking data by category
UPDATE asset_models
SET
    min_stock_qty = 10,
    current_stock_qty = 3,
    avg_daily_consumption = 0.5,
    avg_weekly_consumption = 3.5,
    lead_time_days = 7,
    updated_at = NOW()
WHERE category_id IN (
    SELECT id FROM asset_categories WHERE name IN ('Laptop', 'Desktop')
);

UPDATE asset_models
SET
    min_stock_qty = 8,
    current_stock_qty = 2,
    avg_daily_consumption = 0.2,
    avg_weekly_consumption = 1.4,
    lead_time_days = 10,
    updated_at = NOW()
WHERE category_id IN (
    SELECT id FROM asset_categories WHERE name IN ('Server', 'Firewall')
);

-- Clear previous seed consumption logs
DELETE FROM asset_consumption_logs
WHERE note = 'seed-qlts-demo';

-- Add consumption logs for the last 30 days
INSERT INTO asset_consumption_logs (
    model_id,
    consumption_date,
    quantity,
    reason,
    note,
    created_by,
    created_at
)
SELECT
    m.id,
    CURRENT_DATE - (floor(random() * 30))::int,
    floor(random() * 3 + 1)::int,
    'issued',
    'seed-qlts-demo',
    'seed-admin',
    NOW()
FROM asset_models m
WHERE m.min_stock_qty IS NOT NULL
  AND random() < 0.3
LIMIT 50;

-- Sample Purchase Plan (Draft)
DO $$
DECLARE
    plan_id uuid := '11000000-0000-0000-0000-000000000001';
    line_counter int := 1;
    model_rec record;
    unit_cost numeric;
BEGIN
    INSERT INTO purchase_plan_docs (
        id, doc_no, doc_date, fiscal_year,
        org_unit_name, title, description,
        total_estimated_cost, currency, status, created_by
    ) VALUES (
        plan_id,
        'PP-2024-0001',
        CURRENT_DATE,
        2024,
        'Phong IT',
        'Ke hoach bo sung thiet bi 2024',
        'Bo sung thiet bi theo ke hoach nam 2024',
        0,
        'VND',
        'draft',
        '00000000-0000-0000-0000-000000000001'
    )
    ON CONFLICT (doc_no) DO UPDATE SET
        doc_date = EXCLUDED.doc_date,
        fiscal_year = EXCLUDED.fiscal_year,
        org_unit_name = EXCLUDED.org_unit_name,
        title = EXCLUDED.title,
        description = EXCLUDED.description,
        total_estimated_cost = EXCLUDED.total_estimated_cost,
        currency = EXCLUDED.currency,
        status = EXCLUDED.status,
        created_by = EXCLUDED.created_by,
        updated_at = NOW();

    DELETE FROM purchase_plan_lines WHERE doc_id = plan_id;

    FOR model_rec IN (
        SELECT
            m.id,
            m.model,
            m.category_id,
            m.current_stock_qty,
            m.min_stock_qty,
            m.avg_daily_consumption,
            GREATEST(
                m.min_stock_qty - COALESCE(m.current_stock_qty, 0),
                CEIL(COALESCE(m.avg_daily_consumption, 1) * COALESCE(m.lead_time_days, 7) * 2)
            ) AS suggested_qty,
            CASE
                WHEN COALESCE(m.current_stock_qty, 0) <= 1 THEN 'high'
                WHEN COALESCE(m.current_stock_qty, 0) <= 3 THEN 'medium'
                ELSE 'low'
            END AS priority
        FROM asset_models m
        WHERE m.min_stock_qty IS NOT NULL
          AND COALESCE(m.current_stock_qty, 0) < m.min_stock_qty
        LIMIT 10
    ) LOOP
        unit_cost := 20000000 + floor(random() * 10000000);

        INSERT INTO purchase_plan_lines (
            doc_id, line_no, model_id, category_id,
            item_description, quantity, unit,
            estimated_unit_cost, estimated_total_cost,
            suggestion_reason, current_stock, min_stock, avg_consumption,
            priority
        ) VALUES (
            plan_id,
            line_counter,
            model_rec.id,
            model_rec.category_id,
            model_rec.model,
            model_rec.suggested_qty,
            'cai',
            unit_cost,
            model_rec.suggested_qty * unit_cost,
            'low_stock',
            model_rec.current_stock_qty,
            model_rec.min_stock_qty,
            model_rec.avg_daily_consumption,
            model_rec.priority
        );

        line_counter := line_counter + 1;
    END LOOP;

    UPDATE purchase_plan_docs
    SET total_estimated_cost = (
        SELECT COALESCE(SUM(estimated_total_cost), 0)
        FROM purchase_plan_lines
        WHERE doc_id = plan_id
    )
    WHERE id = plan_id;
END $$;

-- Sample Purchase Plan (Submitted & Approved)
DO $$
DECLARE
    plan_id uuid := '11000000-0000-0000-0000-000000000002';
BEGIN
    INSERT INTO purchase_plan_docs (
        id, doc_no, doc_date, fiscal_year,
        org_unit_name, title, description,
        total_estimated_cost, currency,
        status, created_by, submitted_by, submitted_at,
        approved_by, approved_at
    ) VALUES (
        plan_id,
        'PP-2024-0002',
        CURRENT_DATE - INTERVAL '5 days',
        2024,
        'Phong Ke toan',
        'Mua sam thiet bi van phong Q1/2024',
        'Ke hoach mua sam thiet bi van phong',
        50000000,
        'VND',
        'approved',
        '00000000-0000-0000-0000-000000000001',
        '00000000-0000-0000-0000-000000000001',
        CURRENT_DATE - INTERVAL '4 days',
        '00000000-0000-0000-0000-000000000002',
        CURRENT_DATE - INTERVAL '3 days'
    )
    ON CONFLICT (doc_no) DO UPDATE SET
        doc_date = EXCLUDED.doc_date,
        fiscal_year = EXCLUDED.fiscal_year,
        org_unit_name = EXCLUDED.org_unit_name,
        title = EXCLUDED.title,
        description = EXCLUDED.description,
        total_estimated_cost = EXCLUDED.total_estimated_cost,
        currency = EXCLUDED.currency,
        status = EXCLUDED.status,
        created_by = EXCLUDED.created_by,
        submitted_by = EXCLUDED.submitted_by,
        submitted_at = EXCLUDED.submitted_at,
        approved_by = EXCLUDED.approved_by,
        approved_at = EXCLUDED.approved_at,
        updated_at = NOW();

    DELETE FROM purchase_plan_lines WHERE doc_id = plan_id;

    INSERT INTO purchase_plan_lines (
        doc_id, line_no, item_description, quantity, unit,
        estimated_unit_cost, estimated_total_cost
    ) VALUES
        (plan_id, 1, 'May in laser Canon LBP3300', 2, 'cai', 15000000, 30000000),
        (plan_id, 2, 'May scan Fujitsu fi-7160', 1, 'cai', 20000000, 20000000),
        (plan_id, 3, 'Ban lam viec 1m6', 5, 'cai', 3000000, 15000000)
    ON CONFLICT (doc_id, line_no) DO UPDATE SET
        item_description = EXCLUDED.item_description,
        quantity = EXCLUDED.quantity,
        unit = EXCLUDED.unit,
        estimated_unit_cost = EXCLUDED.estimated_unit_cost,
        estimated_total_cost = EXCLUDED.estimated_total_cost;

    INSERT INTO approvals (
        id, entity_type, entity_id, step_no,
        approver_id, approver_name, decision,
        decided_at, created_at
    ) VALUES (
        '11000000-0000-0000-0000-000000000101',
        'purchase_plan',
        plan_id,
        1,
        '00000000-0000-0000-0000-000000000002',
        'Finance Manager',
        'approved',
        CURRENT_DATE - INTERVAL '3 days',
        NOW()
    )
    ON CONFLICT (entity_type, entity_id, step_no) DO UPDATE SET
        approver_id = EXCLUDED.approver_id,
        approver_name = EXCLUDED.approver_name,
        decision = EXCLUDED.decision,
        decided_at = EXCLUDED.decided_at,
        created_at = EXCLUDED.created_at;
END $$;

-- Sample Asset Increase (Draft)
DO $$
DECLARE
    draft_doc_id uuid := '11000000-0000-0000-0000-000000000003';
    laptop_model_id uuid;
    laptop_category_id uuid;
BEGIN
    SELECT id, category_id INTO laptop_model_id, laptop_category_id
    FROM asset_models
    WHERE model ILIKE '%Laptop%'
    LIMIT 1;

    INSERT INTO asset_increase_docs (
        id, doc_no, doc_date, increase_type,
        org_unit_name, vendor_name, invoice_no, invoice_date,
        total_cost, currency, status, created_by
    ) VALUES (
        draft_doc_id,
        'AI-2024-0001',
        CURRENT_DATE,
        'purchase',
        'Phong IT',
        'Cong ty TNHH Cong nghe ABC',
        'HD-2024-001',
        CURRENT_DATE - INTERVAL '2 days',
        75000000,
        'VND',
        'draft',
        '00000000-0000-0000-0000-000000000001'
    )
    ON CONFLICT (doc_no) DO UPDATE SET
        doc_date = EXCLUDED.doc_date,
        increase_type = EXCLUDED.increase_type,
        org_unit_name = EXCLUDED.org_unit_name,
        vendor_name = EXCLUDED.vendor_name,
        invoice_no = EXCLUDED.invoice_no,
        invoice_date = EXCLUDED.invoice_date,
        total_cost = EXCLUDED.total_cost,
        currency = EXCLUDED.currency,
        status = EXCLUDED.status,
        created_by = EXCLUDED.created_by,
        updated_at = NOW();

    DELETE FROM asset_increase_lines WHERE doc_id = draft_doc_id;

    INSERT INTO asset_increase_lines (
        doc_id, line_no, asset_code, asset_name,
        category_id, model_id, serial_number,
        quantity, unit, original_cost, current_value,
        location_name, custodian_name, acquisition_date
    ) VALUES
        (draft_doc_id, 1, 'LT-2024-DRAFT-001', 'Laptop Dell Latitude 5520',
         laptop_category_id, laptop_model_id, 'SN-DRAFT-001',
         3, 'cai', 25000000, 25000000,
         'Phong IT - Tang 3', 'Nguyen Van A', CURRENT_DATE),
        (draft_doc_id, 2, 'MON-2024-DRAFT-001', 'Man hinh LG 24 inch',
         laptop_category_id, laptop_model_id, 'SN-DRAFT-002',
         5, 'cai', 5000000, 5000000,
         'Phong IT - Tang 3', 'Tran Thi B', CURRENT_DATE)
    ON CONFLICT (doc_id, line_no) DO UPDATE SET
        asset_code = EXCLUDED.asset_code,
        asset_name = EXCLUDED.asset_name,
        category_id = EXCLUDED.category_id,
        model_id = EXCLUDED.model_id,
        serial_number = EXCLUDED.serial_number,
        quantity = EXCLUDED.quantity,
        unit = EXCLUDED.unit,
        original_cost = EXCLUDED.original_cost,
        current_value = EXCLUDED.current_value,
        location_name = EXCLUDED.location_name,
        custodian_name = EXCLUDED.custodian_name,
        acquisition_date = EXCLUDED.acquisition_date;
END $$;

-- Sample Asset Increase (Posted - creates actual assets)
DO $$
DECLARE
    posted_doc_id uuid := '11000000-0000-0000-0000-000000000004';
    line1_id uuid := '11000000-0000-0000-0000-000000000201';
    line2_id uuid := '11000000-0000-0000-0000-000000000202';
    asset1_id uuid := '11000000-0000-0000-0000-000000000301';
    asset2_id uuid := '11000000-0000-0000-0000-000000000302';
    laptop_model_id uuid;
    laptop_category_id uuid;
    model_vendor_id uuid;
BEGIN
    SELECT id, category_id, vendor_id
    INTO laptop_model_id, laptop_category_id, model_vendor_id
    FROM asset_models
    WHERE model ILIKE '%Laptop%'
    LIMIT 1;

    IF laptop_model_id IS NULL THEN
        RETURN;
    END IF;

    INSERT INTO asset_increase_docs (
        id, doc_no, doc_date, increase_type,
        org_unit_name, vendor_id, vendor_name, invoice_no, invoice_date,
        total_cost, currency, status, created_by,
        submitted_by, submitted_at, approved_by, approved_at,
        posted_by, posted_at
    ) VALUES (
        posted_doc_id,
        'AI-2024-0002',
        CURRENT_DATE - INTERVAL '10 days',
        'purchase',
        'Phong Ke toan',
        model_vendor_id,
        'Cong ty CP Thiet bi van phong XYZ',
        'HD-2024-002',
        CURRENT_DATE - INTERVAL '12 days',
        30000000,
        'VND',
        'posted',
        '00000000-0000-0000-0000-000000000001',
        '00000000-0000-0000-0000-000000000001',
        CURRENT_DATE - INTERVAL '9 days',
        '00000000-0000-0000-0000-000000000002',
        CURRENT_DATE - INTERVAL '8 days',
        '00000000-0000-0000-0000-000000000001',
        CURRENT_DATE - INTERVAL '7 days'
    )
    ON CONFLICT (doc_no) DO UPDATE SET
        doc_date = EXCLUDED.doc_date,
        increase_type = EXCLUDED.increase_type,
        org_unit_name = EXCLUDED.org_unit_name,
        vendor_id = EXCLUDED.vendor_id,
        vendor_name = EXCLUDED.vendor_name,
        invoice_no = EXCLUDED.invoice_no,
        invoice_date = EXCLUDED.invoice_date,
        total_cost = EXCLUDED.total_cost,
        currency = EXCLUDED.currency,
        status = EXCLUDED.status,
        created_by = EXCLUDED.created_by,
        submitted_by = EXCLUDED.submitted_by,
        submitted_at = EXCLUDED.submitted_at,
        approved_by = EXCLUDED.approved_by,
        approved_at = EXCLUDED.approved_at,
        posted_by = EXCLUDED.posted_by,
        posted_at = EXCLUDED.posted_at,
        updated_at = NOW();

    DELETE FROM asset_increase_lines WHERE doc_id = posted_doc_id;

    INSERT INTO asset_increase_lines (
        id, doc_id, line_no, asset_code, asset_name,
        category_id, model_id, serial_number,
        quantity, unit, original_cost, current_value,
        location_name, custodian_name,
        acquisition_date, in_service_date,
        asset_id
    ) VALUES
        (line1_id, posted_doc_id, 1, 'LT-2024-001', 'Laptop HP ProBook 450 G9',
         laptop_category_id, laptop_model_id, 'SN12345678',
         1, 'cai', 20000000, 20000000,
         'Phong Ke toan - Tang 2', 'Pham Van C',
         CURRENT_DATE - INTERVAL '10 days', CURRENT_DATE - INTERVAL '7 days',
         asset1_id),
        (line2_id, posted_doc_id, 2, 'LT-2024-002', 'Laptop HP ProBook 450 G9',
         laptop_category_id, laptop_model_id, 'SN87654321',
         1, 'cai', 20000000, 20000000,
         'Phong Ke toan - Tang 2', 'Le Thi D',
         CURRENT_DATE - INTERVAL '10 days', CURRENT_DATE - INTERVAL '7 days',
         asset2_id)
    ON CONFLICT (doc_id, line_no) DO UPDATE SET
        asset_code = EXCLUDED.asset_code,
        asset_name = EXCLUDED.asset_name,
        category_id = EXCLUDED.category_id,
        model_id = EXCLUDED.model_id,
        serial_number = EXCLUDED.serial_number,
        quantity = EXCLUDED.quantity,
        unit = EXCLUDED.unit,
        original_cost = EXCLUDED.original_cost,
        current_value = EXCLUDED.current_value,
        location_name = EXCLUDED.location_name,
        custodian_name = EXCLUDED.custodian_name,
        acquisition_date = EXCLUDED.acquisition_date,
        in_service_date = EXCLUDED.in_service_date,
        asset_id = EXCLUDED.asset_id;

    INSERT INTO assets (
        id, asset_code, model_id, serial_no, status,
        purchase_date, vendor_id, notes
    ) VALUES
        (asset1_id, 'LT-2024-001', laptop_model_id, 'SN12345678', 'in_use',
         CURRENT_DATE - INTERVAL '10 days', model_vendor_id, 'seed-qlts-demo: posted asset'),
        (asset2_id, 'LT-2024-002', laptop_model_id, 'SN87654321', 'in_use',
         CURRENT_DATE - INTERVAL '10 days', model_vendor_id, 'seed-qlts-demo: posted asset')
    ON CONFLICT (asset_code) DO UPDATE SET
        model_id = EXCLUDED.model_id,
        serial_no = EXCLUDED.serial_no,
        status = EXCLUDED.status,
        purchase_date = EXCLUDED.purchase_date,
        vendor_id = EXCLUDED.vendor_id,
        notes = EXCLUDED.notes,
        updated_at = NOW();
END $$;

COMMENT ON SCRIPT IS 'QLTS seed data: purchase plans, asset increase docs, and inventory tracking demo';
