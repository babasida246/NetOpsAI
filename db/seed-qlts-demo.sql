-- Seed data for QLTS simplified workflow demo
-- This script adds sample data for purchase planning and asset increase workflow

-- Add inventory tracking data to existing asset models
UPDATE asset_models SET
    min_stock_qty = 10,
    current_stock_qty = 3,
    avg_daily_consumption = 0.5,
    avg_weekly_consumption = 3.5,
    lead_time_days = 7,
    updated_at = NOW()
WHERE name LIKE '%Laptop%' OR name LIKE '%Desktop%';

UPDATE asset_models SET
    min_stock_qty = 50,
    current_stock_qty = 15,
    avg_daily_consumption = 2.0,
    avg_weekly_consumption = 14.0,
    lead_time_days = 3,
    updated_at = NOW()
WHERE name LIKE '%Monitor%' OR name LIKE '%Screen%';

UPDATE asset_models SET
    min_stock_qty = 20,
    current_stock_qty = 5,
    avg_daily_consumption = 1.0,
    avg_weekly_consumption = 7.0,
    lead_time_days = 5,
    updated_at = NOW()
WHERE name LIKE '%Keyboard%' OR name LIKE '%Mouse%';

-- Add consumption logs for the last 30 days
INSERT INTO asset_consumption_logs (model_id, quantity, consumed_by, consumed_at, note)
SELECT 
    m.id,
    floor(random() * 3 + 1)::int,
    '00000000-0000-0000-0000-000000000001',
    CURRENT_DATE - (floor(random() * 30))::int,
    'Daily usage tracking'
FROM asset_models m
WHERE m.min_stock_qty IS NOT NULL
    AND random() < 0.3
LIMIT 50;

-- Sample Purchase Plan (Draft)
DO $$
DECLARE
    plan_id uuid := gen_random_uuid();
    line_counter int := 1;
    model_rec record;
BEGIN
    -- Create purchase plan header
    INSERT INTO purchase_plan_docs (
        id, doc_no, doc_date, fiscal_year,
        org_unit_name, required_by_date, purpose,
        total_cost, currency, status, created_by
    ) VALUES (
        plan_id,
        'PP-2024-0001',
        CURRENT_DATE,
        2024,
        'Phòng IT',
        CURRENT_DATE + INTERVAL '30 days',
        'Bổ sung thiết bị cho phòng IT theo kế hoạch năm 2024',
        0, -- Will be updated after adding lines
        'VND',
        'draft',
        '00000000-0000-0000-0000-000000000001'
    );

    -- Add lines from models needing purchase
    FOR model_rec IN (
        SELECT 
            m.id,
            m.name,
            m.category_id,
            GREATEST(
                m.min_stock_qty - COALESCE(m.current_stock_qty, 0),
                CEIL(COALESCE(m.avg_daily_consumption, 1) * COALESCE(m.lead_time_days, 7) * 2)
            ) as suggested_qty,
            CASE 
                WHEN COALESCE(m.current_stock_qty, 0) <= 3 THEN 'critical'
                WHEN COALESCE(m.current_stock_qty, 0) <= 7 THEN 'high'
                WHEN COALESCE(m.current_stock_qty, 0) <= 14 THEN 'medium'
                ELSE 'low'
            END as priority
        FROM asset_models m
        WHERE m.min_stock_qty IS NOT NULL
            AND COALESCE(m.current_stock_qty, 0) < m.min_stock_qty
        LIMIT 10
    ) LOOP
        INSERT INTO purchase_plan_lines (
            doc_id, line_no, model_id, model_name, category_id,
            quantity, unit, estimated_cost,
            suggestion_reason, current_stock, min_stock, priority
        ) VALUES (
            plan_id,
            line_counter,
            model_rec.id,
            model_rec.name,
            model_rec.category_id,
            model_rec.suggested_qty,
            'cái',
            20000000 + floor(random() * 10000000),
            'Tồn kho dưới mức tối thiểu',
            (SELECT current_stock_qty FROM asset_models WHERE id = model_rec.id),
            (SELECT min_stock_qty FROM asset_models WHERE id = model_rec.id),
            model_rec.priority
        );
        
        line_counter := line_counter + 1;
    END LOOP;

    -- Update total cost
    UPDATE purchase_plan_docs
    SET total_cost = (
        SELECT COALESCE(SUM(quantity * estimated_cost), 0)
        FROM purchase_plan_lines
        WHERE doc_id = plan_id
    )
    WHERE id = plan_id;
END $$;

-- Sample Purchase Plan (Submitted & Approved)
DO $$
DECLARE
    plan_id uuid := gen_random_uuid();
    approval_id uuid := gen_random_uuid();
BEGIN
    INSERT INTO purchase_plan_docs (
        id, doc_no, doc_date, fiscal_year,
        org_unit_name, purpose, total_cost, currency,
        status, created_by, submitted_by, submitted_at,
        approved_by, approved_at
    ) VALUES (
        plan_id,
        'PP-2024-0002',
        CURRENT_DATE - INTERVAL '5 days',
        2024,
        'Phòng Kế toán',
        'Mua sắm thiết bị văn phòng Q1/2024',
        50000000,
        'VND',
        'approved',
        '00000000-0000-0000-0000-000000000001',
        '00000000-0000-0000-0000-000000000001',
        CURRENT_DATE - INTERVAL '4 days',
        '00000000-0000-0000-0000-000000000002',
        CURRENT_DATE - INTERVAL '3 days'
    );

    INSERT INTO purchase_plan_lines (
        doc_id, line_no, model_name, quantity, unit, estimated_cost
    ) VALUES 
        (plan_id, 1, 'Máy in laser Canon LBP3300', 2, 'cái', 15000000),
        (plan_id, 2, 'Máy scan Fujitsu fi-7160', 1, 'cái', 20000000),
        (plan_id, 3, 'Bàn làm việc 1m6', 5, 'cái', 3000000);

    -- Approval record
    INSERT INTO approvals (
        id, entity_type, entity_id, step_no,
        approver_user_id, required_at, decision,
        decided_by, decided_at
    ) VALUES (
        approval_id,
        'purchase_plan',
        plan_id,
        1,
        '00000000-0000-0000-0000-000000000002',
        CURRENT_DATE - INTERVAL '4 days',
        'approved',
        '00000000-0000-0000-0000-000000000002',
        CURRENT_DATE - INTERVAL '3 days'
    );
END $$;

-- Sample Asset Increase (Draft)
DO $$
DECLARE
    doc_id uuid := gen_random_uuid();
BEGIN
    INSERT INTO asset_increase_docs (
        id, doc_no, doc_date, increase_type,
        org_unit_name, vendor_name, invoice_no, invoice_date,
        total_cost, currency, status, created_by
    ) VALUES (
        doc_id,
        'AI-2024-0001',
        CURRENT_DATE,
        'purchase',
        'Phòng IT',
        'Công ty TNHH Công nghệ ABC',
        'HD-2024-001',
        CURRENT_DATE - INTERVAL '2 days',
        75000000,
        'VND',
        'draft',
        '00000000-0000-0000-0000-000000000001'
    );

    INSERT INTO asset_increase_lines (
        doc_id, line_no, asset_name, quantity, unit,
        original_cost, current_value, location_name,
        custodian_name, acquisition_date
    ) VALUES 
        (doc_id, 1, 'Laptop Dell Latitude 5520', 3, 'cái', 25000000, 25000000, 'Phòng IT - Tầng 3', 'Nguyễn Văn A', CURRENT_DATE),
        (doc_id, 2, 'Màn hình LG 24 inch', 5, 'cái', 5000000, 5000000, 'Phòng IT - Tầng 3', 'Trần Thị B', CURRENT_DATE);
END $$;

-- Sample Asset Increase (Posted - creates actual assets)
DO $$
DECLARE
    doc_id uuid := gen_random_uuid();
    line1_id uuid := gen_random_uuid();
    line2_id uuid := gen_random_uuid();
    asset1_id uuid := gen_random_uuid();
    asset2_id uuid := gen_random_uuid();
    laptop_model_id uuid;
    laptop_category_id uuid;
BEGIN
    -- Get a laptop model
    SELECT id, category_id INTO laptop_model_id, laptop_category_id
    FROM asset_models 
    WHERE name LIKE '%Laptop%' 
    LIMIT 1;

    INSERT INTO asset_increase_docs (
        id, doc_no, doc_date, increase_type,
        org_unit_name, vendor_name, invoice_no, invoice_date,
        total_cost, currency, status, created_by,
        submitted_by, submitted_at, approved_by, approved_at,
        posted_by, posted_at
    ) VALUES (
        doc_id,
        'AI-2024-0002',
        CURRENT_DATE - INTERVAL '10 days',
        'purchase',
        'Phòng Kế toán',
        'Công ty CP Thiết bị văn phòng XYZ',
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
    );

    INSERT INTO asset_increase_lines (
        id, doc_id, line_no, asset_code, asset_name,
        category_id, model_id, serial_number,
        quantity, unit, original_cost, current_value,
        location_name, custodian_name,
        acquisition_date, in_service_date,
        asset_id
    ) VALUES 
        (line1_id, doc_id, 1, 'LT-2024-001', 'Laptop HP ProBook 450 G9',
         laptop_category_id, laptop_model_id, 'SN12345678',
         1, 'cái', 20000000, 20000000,
         'Phòng Kế toán - Tầng 2', 'Phạm Văn C',
         CURRENT_DATE - INTERVAL '10 days', CURRENT_DATE - INTERVAL '7 days',
         asset1_id),
        (line2_id, doc_id, 2, 'LT-2024-002', 'Laptop HP ProBook 450 G9',
         laptop_category_id, laptop_model_id, 'SN87654321',
         1, 'cái', 20000000, 20000000,
         'Phòng Kế toán - Tầng 2', 'Lê Thị D',
         CURRENT_DATE - INTERVAL '10 days', CURRENT_DATE - INTERVAL '7 days',
         asset2_id);

    -- Create actual assets
    INSERT INTO assets (
        id, code, name, category_id, model_id,
        serial_number, original_cost, current_value,
        acquisition_date, in_service_date, status,
        location_id, custodian_id, created_by,
        ref_doc_type, source_doc_id, source_doc_no
    ) VALUES 
        (asset1_id, 'LT-2024-001', 'Laptop HP ProBook 450 G9',
         laptop_category_id, laptop_model_id, 'SN12345678',
         20000000, 20000000,
         CURRENT_DATE - INTERVAL '10 days', CURRENT_DATE - INTERVAL '7 days',
         'active', NULL, NULL,
         '00000000-0000-0000-0000-000000000001',
         'asset_increase', doc_id, 'AI-2024-0002'),
        (asset2_id, 'LT-2024-002', 'Laptop HP ProBook 450 G9',
         laptop_category_id, laptop_model_id, 'SN87654321',
         20000000, 20000000,
         CURRENT_DATE - INTERVAL '10 days', CURRENT_DATE - INTERVAL '7 days',
         'active', NULL, NULL,
         '00000000-0000-0000-0000-000000000001',
         'asset_increase', doc_id, 'AI-2024-0002');

    -- Update model stock
    UPDATE asset_models
    SET current_stock_qty = COALESCE(current_stock_qty, 0) + 2
    WHERE id = laptop_model_id;
END $$;

COMMENT ON SCRIPT IS 'QLTS seed data: Adds sample purchase plans, asset increase docs, consumption logs, and inventory tracking for demo';
