-- ============================================================================
-- NetOpsAI Gateway - Complete Seed Data Script
-- Comprehensive test data for inventory system
-- ============================================================================

-- ============================================================================
-- PART 1: BASE UOM AND CURRENCY DATA
-- ============================================================================

-- Insert Base UOMs
INSERT INTO uoms
    (id, code, name, uom_type, symbol, is_base, is_active)
VALUES
    ('11111111-0000-0000-0000-000000000001', 'EA', 'Each', 'EACH', 'ea', true, true),
    ('11111111-0000-0000-0000-000000000002', 'PC', 'Piece', 'QUANTITY', 'pc', true, true),
    ('11111111-0000-0000-0000-000000000003', 'BOX', 'Box', 'QUANTITY', 'box', false, true),
    ('11111111-0000-0000-0000-000000000004', 'CS', 'Case', 'QUANTITY', 'cs', false, true),
    ('11111111-0000-0000-0000-000000000005', 'KG', 'Kilogram', 'WEIGHT', 'kg', true, true),
    ('11111111-0000-0000-0000-000000000006', 'G', 'Gram', 'WEIGHT', 'g', false, true),
    ('11111111-0000-0000-0000-000000000007', 'LB', 'Pound', 'WEIGHT', 'lb', false, true),
    ('11111111-0000-0000-0000-000000000008', 'L', 'Liter', 'VOLUME', 'L', true, true),
    ('11111111-0000-0000-0000-000000000009', 'ML', 'Milliliter', 'VOLUME', 'ml', false, true),
    ('11111111-0000-0000-0000-00000000000A', 'GAL', 'Gallon', 'VOLUME', 'gal', false, true),
    ('11111111-0000-0000-0000-00000000000B', 'M', 'Meter', 'LENGTH', 'm', true, true),
    ('11111111-0000-0000-0000-00000000000C', 'CM', 'Centimeter', 'LENGTH', 'cm', false, true),
    ('11111111-0000-0000-0000-00000000000D', 'FT', 'Foot', 'LENGTH', 'ft', false, true)
ON CONFLICT
(code) DO NOTHING;

-- Update UOM conversions
UPDATE uoms SET base_uom_id = '11111111-0000-0000-0000-000000000003', conversion_factor = 12 WHERE code = 'BOX';
UPDATE uoms SET base_uom_id = '11111111-0000-0000-0000-000000000003', conversion_factor = 24 WHERE code = 'CS';
UPDATE uoms SET base_uom_id = '11111111-0000-0000-0000-000000000005', conversion_factor = 0.001 WHERE code = 'G';
UPDATE uoms SET base_uom_id = '11111111-0000-0000-0000-000000000005', conversion_factor = 0.453592 WHERE code = 'LB';
UPDATE uoms SET base_uom_id = '11111111-0000-0000-0000-000000000008', conversion_factor = 0.001 WHERE code = 'ML';
UPDATE uoms SET base_uom_id = '11111111-0000-0000-0000-000000000008', conversion_factor = 3.78541 WHERE code = 'GAL';
UPDATE uoms SET base_uom_id = '11111111-0000-0000-0000-00000000000B', conversion_factor = 0.01 WHERE code = 'CM';
UPDATE uoms SET base_uom_id = '11111111-0000-0000-0000-00000000000B', conversion_factor = 0.3048 WHERE code = 'FT';

-- Insert Currencies
INSERT INTO currencies
    (id, code, name, symbol, decimal_places, is_base, is_active)
VALUES
    ('22222222-0000-0000-0000-000000000001', 'USD', 'US Dollar', '$', 2, true, true),
    ('22222222-0000-0000-0000-000000000002', 'EUR', 'Euro', '€', 2, false, true),
    ('22222222-0000-0000-0000-000000000003', 'GBP', 'British Pound', '£', 2, false, true),
    ('22222222-0000-0000-0000-000000000004', 'VND', 'Vietnamese Dong', '₫', 0, false, true),
    ('22222222-0000-0000-0000-000000000005', 'JPY', 'Japanese Yen', '¥', 0, false, true),
    ('22222222-0000-0000-0000-000000000006', 'CNY', 'Chinese Yuan', '¥', 2, false, true)
ON CONFLICT
(code) DO NOTHING;

-- Insert FX Rates (current rates as of 2026-01-16)
INSERT INTO fx_rates
    (from_currency_id, to_currency_id, rate, effective_date, is_active)
VALUES
    ('22222222-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000002', 0.92, '2026-01-16', true),
    ('22222222-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000003', 0.79, '2026-01-16', true),
    ('22222222-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000004', 25000, '2026-01-16', true),
    ('22222222-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000005', 148, '2026-01-16', true),
    ('22222222-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000006', 7.25, '2026-01-16', true),
    -- Reverse rates
    ('22222222-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000001', 1.087, '2026-01-16', true),
    ('22222222-0000-0000-0000-000000000003', '22222222-0000-0000-0000-000000000001', 1.266, '2026-01-16', true),
    ('22222222-0000-0000-0000-000000000004', '22222222-0000-0000-0000-000000000001', 0.00004, '2026-01-16', true),
    ('22222222-0000-0000-0000-000000000005', '22222222-0000-0000-0000-000000000001', 0.00676, '2026-01-16', true),
    ('22222222-0000-0000-0000-000000000006', '22222222-0000-0000-0000-000000000001', 0.138, '2026-01-16', true)
ON CONFLICT
(from_currency_id, to_currency_id, effective_date) DO NOTHING;

-- ============================================================================
-- PART 2: ORGANIZATION AND WAREHOUSE DATA
-- ============================================================================

-- Insert Organizations
INSERT INTO organizations
    (id, code, name, address, contact_person, phone, email, is_active)
VALUES
    ('33333333-0000-0000-0000-000000000001', 'HQ', 'NetOpsAI Headquarters', '123 Tech Street, Silicon Valley, CA 94000', 'John Smith', '+1-555-0100', 'hq@netopsai.com', true),
    ('33333333-0000-0000-0000-000000000002', 'VN', 'NetOpsAI Vietnam', '456 Nguyen Hue, District 1, Ho Chi Minh City', 'Nguyen Van A', '+84-28-1234-5678', 'vietnam@netopsai.com', true),
    ('33333333-0000-0000-0000-000000000003', 'EU', 'NetOpsAI Europe', '789 Tech Avenue, London, UK', 'Jane Doe', '+44-20-1234-5678', 'europe@netopsai.com', true)
ON CONFLICT
(code) DO NOTHING;

-- Insert Warehouses
INSERT INTO warehouses
    (id, org_id, code, name, warehouse_type, address, manager_name, phone, is_active)
VALUES
    -- HQ Warehouses
    ('44444444-0000-0000-0000-000000000001', '33333333-0000-0000-0000-000000000001', 'HQ-MAIN', 'HQ Main Warehouse', 'STANDARD', '123 Tech Street, Building A', 'Bob Johnson', '+1-555-0101', true),
    ('44444444-0000-0000-0000-000000000002', '33333333-0000-0000-0000-000000000001', 'HQ-RMA', 'HQ Returns/RMA', 'RMA', '123 Tech Street, Building B', 'Alice Williams', '+1-555-0102', true),
    -- VN Warehouses
    ('44444444-0000-0000-0000-000000000003', '33333333-0000-0000-0000-000000000002', 'VN-HCM', 'Ho Chi Minh Warehouse', 'STANDARD', '456 Nguyen Hue, District 1', 'Tran Van B', '+84-28-2234-5678', true),
    ('44444444-0000-0000-0000-000000000004', '33333333-0000-0000-0000-000000000002', 'VN-HN', 'Hanoi Warehouse', 'STANDARD', '789 Ba Dinh, Hanoi', 'Le Thi C', '+84-24-3234-5678', true),
    -- EU Warehouses
    ('44444444-0000-0000-0000-000000000005', '33333333-0000-0000-0000-000000000003', 'EU-LON', 'London Warehouse', 'STANDARD', '789 Tech Avenue, London', 'David Brown', '+44-20-2234-5678', true)
ON CONFLICT
(org_id, code) DO NOTHING;

-- Insert Warehouse Locations
INSERT INTO warehouse_locations
    (warehouse_id, code, name, location_type, aisle, rack, shelf, bin, is_active)
VALUES
    -- HQ-MAIN locations
    ('44444444-0000-0000-0000-000000000001', 'A-01-01-01', 'Aisle A, Rack 1, Shelf 1, Bin 1', 'STORAGE', 'A', '01', '01', '01', true),
    ('44444444-0000-0000-0000-000000000001', 'A-01-01-02', 'Aisle A, Rack 1, Shelf 1, Bin 2', 'STORAGE', 'A', '01', '01', '02', true),
    ('44444444-0000-0000-0000-000000000001', 'A-01-02-01', 'Aisle A, Rack 1, Shelf 2, Bin 1', 'STORAGE', 'A', '01', '02', '01', true),
    ('44444444-0000-0000-0000-000000000001', 'B-01-01-01', 'Aisle B, Rack 1, Shelf 1, Bin 1', 'STORAGE', 'B', '01', '01', '01', true),
    ('44444444-0000-0000-0000-000000000001', 'RECV', 'Receiving Dock', 'RECEIVING', NULL, NULL, NULL, NULL, true),
    ('44444444-0000-0000-0000-000000000001', 'SHIP', 'Shipping Dock', 'SHIPPING', NULL, NULL, NULL, NULL, true),
    ('44444444-0000-0000-0000-000000000001', 'QC', 'Quality Control Area', 'QC', NULL, NULL, NULL, NULL, true),
    -- VN-HCM locations
    ('44444444-0000-0000-0000-000000000003', 'A-01-01-01', 'Kho A, Kệ 1, Tầng 1, Ngăn 1', 'STORAGE', 'A', '01', '01', '01', true),
    ('44444444-0000-0000-0000-000000000003', 'A-01-01-02', 'Kho A, Kệ 1, Tầng 1, Ngăn 2', 'STORAGE', 'A', '01', '01', '02', true),
    ('44444444-0000-0000-0000-000000000003', 'RECV', 'Khu Nhận Hàng', 'RECEIVING', NULL, NULL, NULL, NULL, true),
    ('44444444-0000-0000-0000-000000000003', 'SHIP', 'Khu Xuất Hàng', 'SHIPPING', NULL, NULL, NULL, NULL, true)
ON CONFLICT
(warehouse_id, code) DO NOTHING;

-- ============================================================================
-- PART 3: PARTIES (SUPPLIERS/CUSTOMERS)
-- ============================================================================

INSERT INTO parties
    (id, org_id, code, name, party_type, tax_id, address, contact_person, phone, email, credit_limit, payment_terms, is_active)
VALUES
    -- Suppliers for HQ
    ('55555555-0000-0000-0000-000000000001', '33333333-0000-0000-0000-000000000001', 'SUP001', 'Cisco Systems Inc', 'SUPPLIER', 'US-123456789', 'San Jose, CA, USA', 'Tom Anderson', '+1-408-526-4000', 'sales@cisco.com', 1000000, 30, true),
    ('55555555-0000-0000-0000-000000000002', '33333333-0000-0000-0000-000000000001', 'SUP002', 'Juniper Networks', 'SUPPLIER', 'US-987654321', 'Sunnyvale, CA, USA', 'Sarah Miller', '+1-408-745-2000', 'sales@juniper.net', 500000, 30, true),
    ('55555555-0000-0000-0000-000000000003', '33333333-0000-0000-0000-000000000001', 'SUP003', 'Fortinet Inc', 'SUPPLIER', 'US-555555555', 'Sunnyvale, CA, USA', 'Mike Davis', '+1-408-235-7700', 'sales@fortinet.com', 750000, 45, true),
    -- Customers for HQ
    ('55555555-0000-0000-0000-000000000004', '33333333-0000-0000-0000-000000000001', 'CUS001', 'ABC Corporation', 'CUSTOMER', 'US-111222333', 'New York, NY, USA', 'Emily Johnson', '+1-212-555-0100', 'purchasing@abc.com', 2000000, 60, true),
    ('55555555-0000-0000-0000-000000000005', '33333333-0000-0000-0000-000000000001', 'CUS002', 'XYZ Industries', 'CUSTOMER', 'US-444555666', 'Boston, MA, USA', 'Robert Wilson', '+1-617-555-0200', 'procurement@xyz.com', 1500000, 45, true),
    -- Suppliers for Vietnam
    ('55555555-0000-0000-0000-000000000006', '33333333-0000-0000-0000-000000000002', 'SUP-VN001', 'FPT Telecom', 'SUPPLIER', 'VN-0123456789', 'Hanoi, Vietnam', 'Nguyen Van D', '+84-24-7300-8000', 'sales@fpt.vn', 500000, 30, true),
    ('55555555-0000-0000-0000-000000000007', '33333333-0000-0000-0000-000000000002', 'SUP-VN002', 'Viettel Solutions', 'SUPPLIER', 'VN-9876543210', 'Ho Chi Minh, Vietnam', 'Tran Thi E', '+84-28-3930-0000', 'sales@viettel.vn', 300000, 15, true)
ON CONFLICT
(org_id, code) DO NOTHING;

-- ============================================================================
-- PART 4: INVENTORY ITEMS
-- ============================================================================

INSERT INTO inventory_items
    (id, org_id, sku, name, description, item_type, base_uom_id, cost_method, track_lot, track_expiry, track_serial, shelf_life_days, min_stock_level, max_stock_level, safety_stock_level, reorder_point, reorder_qty, is_active)
VALUES
    -- Network Equipment (Serial Tracked)
    ('66666666-0000-0000-0000-000000000001', '33333333-0000-0000-0000-000000000001', 'NET-CSR-1000V', 'Cisco CSR 1000V Router', 'Virtual Cloud Services Router', 'FINISHED', '11111111-0000-0000-0000-000000000001', 'SPECIFIC_ID', false, false, true, 0, 5, 50, 10, 15, 20, true),
    ('66666666-0000-0000-0000-000000000002', '33333333-0000-0000-0000-000000000001', 'NET-CAT-9300', 'Catalyst 9300 Switch', '48-Port Gigabit Ethernet Switch', 'FINISHED', '11111111-0000-0000-0000-000000000001', 'SPECIFIC_ID', false, false, true, 0, 10, 100, 20, 30, 40, true),
    ('66666666-0000-0000-0000-000000000003', '33333333-0000-0000-0000-000000000001', 'NET-FG-100E', 'FortiGate 100E', 'Next-Gen Firewall Appliance', 'FINISHED', '11111111-0000-0000-0000-000000000001', 'SPECIFIC_ID', false, false, true, 0, 3, 30, 5, 8, 10, true),
    ('66666666-0000-0000-0000-000000000004', '33333333-0000-0000-0000-000000000001', 'NET-JNP-EX4300', 'Juniper EX4300 Switch', '48-Port Ethernet Switch', 'FINISHED', '11111111-0000-0000-0000-000000000001', 'SPECIFIC_ID', false, false, true, 0, 5, 40, 10, 12, 15, true),

    -- Cables and Accessories (Lot Tracked)
    ('66666666-0000-0000-0000-000000000005', '33333333-0000-0000-0000-000000000001', 'CBL-CAT6-3M', 'Cat6 Ethernet Cable 3m', 'Category 6 UTP Cable, Blue, 3 meters', 'RAW', '11111111-0000-0000-0000-000000000002', 'FIFO', true, false, false, 0, 100, 1000, 200, 300, 500, true),
    ('66666666-0000-0000-0000-000000000006', '33333333-0000-0000-0000-000000000001', 'CBL-FIBER-LC', 'Fiber LC-LC Cable 10m', 'Multi-mode fiber optic cable LC-LC, 10 meters', 'RAW', '11111111-0000-0000-0000-000000000002', 'FIFO', true, false, false, 0, 50, 500, 100, 150, 200, true),
    ('66666666-0000-0000-0000-000000000007', '33333333-0000-0000-0000-000000000001', 'ACC-RACK-1U', 'Rack Mount Kit 1U', 'Standard 19-inch rack mounting kit', 'CONSUMABLE', '11111111-0000-0000-0000-000000000001', 'WEIGHTED_AVG', false, false, false, 0, 20, 200, 40, 60, 80, true),
    ('66666666-0000-0000-0000-000000000008', '33333333-0000-0000-0000-000000000001', 'ACC-PWR-CORD', 'Power Cord C13-C14', 'IEC C13 to C14 Power Cord, 2m', 'CONSUMABLE', '11111111-0000-0000-0000-000000000002', 'WEIGHTED_AVG', false, false, false, 0, 50, 500, 100, 150, 200, true),

    -- Transceiver Modules (Serial Tracked with Expiry)
    ('66666666-0000-0000-0000-000000000009', '33333333-0000-0000-0000-000000000001', 'SFP-GLC-SX', 'Cisco SFP 1000BASE-SX', 'Gigabit SFP Transceiver, Multi-mode', 'FINISHED', '11111111-0000-0000-0000-000000000001', 'FIFO', true, true, true, 1825, 20, 200, 40, 60, 80, true),
    ('66666666-0000-0000-0000-000000000010', '33333333-0000-0000-0000-000000000001', 'SFP-GLC-LH', 'Cisco SFP 1000BASE-LH', 'Gigabit SFP Transceiver, Single-mode', 'FINISHED', '11111111-0000-0000-0000-000000000001', 'FIFO', true, true, true, 1825, 15, 150, 30, 45, 60, true),

    -- Consumables (Simple FIFO)
    ('66666666-0000-0000-0000-000000000011', '33333333-0000-0000-0000-000000000001', 'CONS-LABELS', 'Cable Labels Pack', '100pcs Cable identification labels', 'CONSUMABLE', '11111111-0000-0000-0000-000000000003', 'FIFO', false, false, false, 0, 10, 100, 20, 30, 40, true),
    ('66666666-0000-0000-0000-000000000012', '33333333-0000-0000-0000-000000000001', 'CONS-TIES', 'Cable Ties Pack', '100pcs Cable ties, assorted sizes', 'CONSUMABLE', '11111111-0000-0000-0000-000000000003', 'FIFO', false, false, false, 0, 20, 200, 40, 60, 80, true)
ON CONFLICT
(org_id, sku) DO NOTHING;

-- Item UOM Conversions (for boxed items)
INSERT INTO item_uom_conversions
    (item_id, from_uom_id, to_uom_id, conversion_factor, is_purchase, is_sales, is_active)
VALUES
    -- Cables sold in boxes
    ('66666666-0000-0000-0000-000000000005', '11111111-0000-0000-0000-000000000003', '11111111-0000-0000-0000-000000000002', 100, true, true, true),
    -- BOX to PC (1 box = 100 pieces)
    ('66666666-0000-0000-0000-000000000006', '11111111-0000-0000-0000-000000000003', '11111111-0000-0000-0000-000000000002', 50, true, true, true),
    -- BOX to PC (1 box = 50 pieces)
    -- Consumables in boxes
    ('66666666-0000-0000-0000-000000000011', '11111111-0000-0000-0000-000000000004', '11111111-0000-0000-0000-000000000003', 10, true, true, true),
    -- CASE to BOX (1 case = 10 boxes)
    ('66666666-0000-0000-0000-000000000012', '11111111-0000-0000-0000-000000000004', '11111111-0000-0000-0000-000000000003', 12, true, true, true)
-- CASE to BOX (1 case = 12 boxes)
ON CONFLICT
(item_id, from_uom_id, to_uom_id) DO NOTHING;

-- ============================================================================
-- PART 5: USERS AND ROLES
-- ============================================================================

-- Insert Users (password: 'Password123!')
INSERT INTO app_users
    (id, username, email, password_hash, full_name, is_active)
VALUES
    ('77777777-0000-0000-0000-000000000001', 'admin', 'admin@netopsai.com', '$2a$10$8K1p/a0dL3LzAZb0xqxvMeS5NqZl8Z8lXjz8vqL5xY8hZ8Z8Z8Z8Z', 'System Administrator', true),
    ('77777777-0000-0000-0000-000000000002', 'john.smith', 'john.smith@netopsai.com', '$2a$10$8K1p/a0dL3LzAZb0xqxvMeS5NqZl8Z8lXjz8vqL5xY8hZ8Z8Z8Z8Z', 'John Smith', true),
    ('77777777-0000-0000-0000-000000000003', 'nguyen.vana', 'nguyen.vana@netopsai.com', '$2a$10$8K1p/a0dL3LzAZb0xqxvMeS5NqZl8Z8lXjz8vqL5xY8hZ8Z8Z8Z8Z', 'Nguyen Van A', true),
    ('77777777-0000-0000-0000-000000000004', 'jane.doe', 'jane.doe@netopsai.com', '$2a$10$8K1p/a0dL3LzAZb0xqxvMeS5NqZl8Z8lXjz8vqL5xY8hZ8Z8Z8Z8Z', 'Jane Doe', true),
    ('77777777-0000-0000-0000-000000000005', 'warehouse.user', 'warehouse@netopsai.com', '$2a$10$8K1p/a0dL3LzAZb0xqxvMeS5NqZl8Z8lXjz8vqL5xY8hZ8Z8Z8Z8Z', 'Warehouse Clerk', true)
ON CONFLICT
(username) DO NOTHING;

-- Insert Roles
INSERT INTO app_roles
    (id, code, name, description, permissions, is_active)
VALUES
    ('88888888-0000-0000-0000-000000000001', 'SUPER_ADMIN', 'Super Administrator', 'Full system access',
        '["*"]'
::jsonb, true),
('88888888-0000-0000-0000-000000000002', 'WAREHOUSE_MANAGER', 'Warehouse Manager', 'Manage warehouse operations', 
 '["item.view", "item.create", "item.edit", "document.view", "document.create", "document.approve", "document.post", "reservation.view", "reservation.create", "reservation.activate", "reservation.commit", "report.view"]'::jsonb, true),
('88888888-0000-0000-0000-000000000003', 'WAREHOUSE_CLERK', 'Warehouse Clerk', 'Basic warehouse operations', 
 '["item.view", "document.view", "document.create", "reservation.view", "reservation.create"]'::jsonb, true),
('88888888-0000-0000-0000-000000000004', 'INVENTORY_VIEWER', 'Inventory Viewer', 'View-only access', 
 '["item.view", "document.view", "reservation.view", "report.view"]'::jsonb, true)
ON CONFLICT
(code) DO NOTHING;

-- Assign Roles to Users
INSERT INTO user_role_grants
    (user_id, role_id, org_id, warehouse_id, granted_by, is_active)
VALUES
    -- Admin - all orgs/warehouses
    ('77777777-0000-0000-0000-000000000001', '88888888-0000-0000-0000-000000000001', NULL, NULL, '77777777-0000-0000-0000-000000000001', true),
    -- John Smith - HQ Warehouse Manager
    ('77777777-0000-0000-0000-000000000002', '88888888-0000-0000-0000-000000000002', '33333333-0000-0000-0000-000000000001', '44444444-0000-0000-0000-000000000001', '77777777-0000-0000-0000-000000000001', true),
    -- Nguyen Van A - VN Warehouse Manager
    ('77777777-0000-0000-0000-000000000003', '88888888-0000-0000-0000-000000000002', '33333333-0000-0000-0000-000000000002', '44444444-0000-0000-0000-000000000003', '77777777-0000-0000-0000-000000000001', true),
    -- Jane Doe - EU Warehouse Manager
    ('77777777-0000-0000-0000-000000000004', '88888888-0000-0000-0000-000000000002', '33333333-0000-0000-0000-000000000003', '44444444-0000-0000-0000-000000000005', '77777777-0000-0000-0000-000000000001', true),
    -- Warehouse User - HQ Clerk
    ('77777777-0000-0000-0000-000000000005', '88888888-0000-0000-0000-000000000003', '33333333-0000-0000-0000-000000000001', '44444444-0000-0000-0000-000000000001', '77777777-0000-0000-0000-000000000001', true)
ON CONFLICT
(user_id, role_id, COALESCE
(org_id, '00000000-0000-0000-0000-000000000000'::UUID), COALESCE
(warehouse_id, '00000000-0000-0000-0000-000000000000'::UUID)) DO NOTHING;

-- ============================================================================
-- SEED DATA COMPLETE
-- ============================================================================

-- ============================================================================
-- CMDB SEED DATA (from 007_cmdb_core.sql)
-- ============================================================================

-- Seed Data: Default CI Types
INSERT INTO cmdb_ci_types
    (code, name, description)
VALUES
    ('server', 'Server', 'Physical or virtual server'),
    ('network_device', 'Network Device', 'Routers, switches, firewalls'),
    ('storage', 'Storage', 'Storage arrays and systems'),
    ('database', 'Database', 'Database instances'),
    ('application', 'Application', 'Software applications'),
    ('service', 'Service', 'IT services')
ON CONFLICT
(code) DO NOTHING;

-- Seed Data: Default Relationship Types
INSERT INTO cmdb_relationship_types
    (code, name, reverse_name)
VALUES
    ('runs_on', 'Runs On', 'Hosts'),
    ('depends_on', 'Depends On', 'Supports'),
    ('connects_to', 'Connects To', 'Connected From'),
    ('part_of', 'Part Of', 'Contains'),
    ('managed_by', 'Managed By', 'Manages')
ON CONFLICT
(code) DO NOTHING;
