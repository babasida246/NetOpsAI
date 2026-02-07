-- Seed sample data for Asset Management module
-- Usage:
--   docker cp db/seed-assets-management.sql netopsai-gateway-postgres:/tmp/
--   docker exec -i netopsai-gateway-postgres psql -U postgres -d netopsai_gateway -f /tmp/seed-assets-management.sql

BEGIN;

INSERT INTO vendors (id, name, tax_code, phone, email, address, created_at) VALUES
    ('aa100000-0000-0000-0000-000000000001', 'Dell Technologies', 'US-DEL-001', '+1-800-999-3355', 'procurement@dell.local', 'Round Rock, TX, USA', NOW()),
    ('aa100000-0000-0000-0000-000000000002', 'HP Inc', 'US-HP-001', '+1-650-857-1501', 'procurement@hp.local', 'Palo Alto, CA, USA', NOW()),
    ('aa100000-0000-0000-0000-000000000003', 'Cisco Systems', 'US-CIS-001', '+1-408-526-4000', 'procurement@cisco.local', 'San Jose, CA, USA', NOW()),
    ('aa100000-0000-0000-0000-000000000004', 'Fortinet', 'US-FORT-001', '+1-408-235-7700', 'procurement@fortinet.local', 'Sunnyvale, CA, USA', NOW())
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    tax_code = EXCLUDED.tax_code,
    phone = EXCLUDED.phone,
    email = EXCLUDED.email,
    address = EXCLUDED.address;

INSERT INTO asset_categories (id, name, created_at) VALUES
    ('bb100000-0000-0000-0000-000000000001', 'Laptop', NOW()),
    ('bb100000-0000-0000-0000-000000000002', 'Desktop', NOW()),
    ('bb100000-0000-0000-0000-000000000003', 'Server', NOW()),
    ('bb100000-0000-0000-0000-000000000004', 'Firewall', NOW())
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name;

INSERT INTO locations (id, name, parent_id, path, created_at) VALUES
    ('cc100000-0000-0000-0000-000000000001', 'HQ', NULL, '/HQ', NOW()),
    ('cc100000-0000-0000-0000-000000000002', 'HQ Floor 1', 'cc100000-0000-0000-0000-000000000001', '/HQ/Floor-1', NOW()),
    ('cc100000-0000-0000-0000-000000000003', 'HQ Floor 2', 'cc100000-0000-0000-0000-000000000001', '/HQ/Floor-2', NOW()),
    ('cc100000-0000-0000-0000-000000000004', 'HQ Data Center', 'cc100000-0000-0000-0000-000000000001', '/HQ/Data-Center', NOW())
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    parent_id = EXCLUDED.parent_id,
    path = EXCLUDED.path;

INSERT INTO asset_models (id, category_id, vendor_id, brand, model, spec, created_at) VALUES
    ('dd100000-0000-0000-0000-000000000001', 'bb100000-0000-0000-0000-000000000001', 'aa100000-0000-0000-0000-000000000001', 'Dell', 'Latitude 7440', '{"cpu":"i7","ram":"16GB","storage":"512GB SSD"}'::jsonb, NOW()),
    ('dd100000-0000-0000-0000-000000000002', 'bb100000-0000-0000-0000-000000000001', 'aa100000-0000-0000-0000-000000000002', 'HP', 'EliteBook 840 G10', '{"cpu":"i7","ram":"16GB","storage":"512GB SSD"}'::jsonb, NOW()),
    ('dd100000-0000-0000-0000-000000000003', 'bb100000-0000-0000-0000-000000000003', 'aa100000-0000-0000-0000-000000000002', 'HP', 'ProLiant DL380 Gen10', '{"cpu":"Xeon","ram":"128GB","storage":"4x1.92TB"}'::jsonb, NOW()),
    ('dd100000-0000-0000-0000-000000000004', 'bb100000-0000-0000-0000-000000000004', 'aa100000-0000-0000-0000-000000000004', 'Fortinet', 'FortiGate 100F', '{"throughput":"20Gbps","firmware":"7.2.x"}'::jsonb, NOW())
ON CONFLICT (id) DO UPDATE SET
    category_id = EXCLUDED.category_id,
    vendor_id = EXCLUDED.vendor_id,
    brand = EXCLUDED.brand,
    model = EXCLUDED.model,
    spec = EXCLUDED.spec;

INSERT INTO assets (
    id, asset_code, model_id, serial_no, mac_address, mgmt_ip, hostname, vlan_id,
    switch_name, switch_port, location_id, status, purchase_date, warranty_end,
    vendor_id, notes, created_at, updated_at
) VALUES
    ('ee100000-0000-0000-0000-000000000001', 'AST-LAP-0001', 'dd100000-0000-0000-0000-000000000001', 'DL7440-001', '00:25:96:ff:aa:01', NULL, 'lap-ops-001', 20, 'sw-core-01', 'Gi1/0/11', 'cc100000-0000-0000-0000-000000000002', 'in_use', CURRENT_DATE - 360, CURRENT_DATE + 30, 'aa100000-0000-0000-0000-000000000001', 'seed-assets-management-v1: assigned laptop', NOW(), NOW()),
    ('ee100000-0000-0000-0000-000000000002', 'AST-LAP-0002', 'dd100000-0000-0000-0000-000000000001', 'DL7440-002', '00:25:96:ff:aa:02', NULL, 'lap-spare-001', NULL, NULL, NULL, 'cc100000-0000-0000-0000-000000000002', 'in_stock', CURRENT_DATE - 180, CURRENT_DATE + 700, 'aa100000-0000-0000-0000-000000000001', 'seed-assets-management-v1: spare laptop', NOW(), NOW()),
    ('ee100000-0000-0000-0000-000000000003', 'AST-LAP-0003', 'dd100000-0000-0000-0000-000000000002', 'HP840-003', '10:6f:d9:88:00:03', NULL, 'lap-fin-003', 30, 'sw-core-01', 'Gi1/0/14', 'cc100000-0000-0000-0000-000000000003', 'in_use', CURRENT_DATE - 450, CURRENT_DATE + 300, 'aa100000-0000-0000-0000-000000000002', 'seed-assets-management-v1: finance laptop', NOW(), NOW()),
    ('ee100000-0000-0000-0000-000000000004', 'AST-SRV-0001', 'dd100000-0000-0000-0000-000000000003', 'DL380-001', '00:1a:11:aa:00:01', '10.10.0.11', 'srv-auth-01', 110, 'sw-core-01', 'Gi1/0/45', 'cc100000-0000-0000-0000-000000000004', 'in_use', CURRENT_DATE - 900, CURRENT_DATE + 500, 'aa100000-0000-0000-0000-000000000002', 'seed-assets-management-v1: production server', NOW(), NOW()),
    ('ee100000-0000-0000-0000-000000000005', 'AST-SRV-0002', 'dd100000-0000-0000-0000-000000000003', 'DL380-002', '00:1a:11:aa:00:02', '10.10.0.12', 'srv-spare-02', 110, 'sw-core-01', 'Gi1/0/46', 'cc100000-0000-0000-0000-000000000004', 'in_stock', CURRENT_DATE - 400, CURRENT_DATE + 800, 'aa100000-0000-0000-0000-000000000002', 'seed-assets-management-v1: spare server', NOW(), NOW()),
    ('ee100000-0000-0000-0000-000000000006', 'AST-FW-0001', 'dd100000-0000-0000-0000-000000000004', 'FG100F-001', '00:09:0f:20:00:01', '10.10.1.1', 'fw-edge-01', 1, NULL, NULL, 'cc100000-0000-0000-0000-000000000004', 'in_repair', CURRENT_DATE - 1200, CURRENT_DATE + 120, 'aa100000-0000-0000-0000-000000000004', 'seed-assets-management-v1: under maintenance', NOW(), NOW()),
    ('ee100000-0000-0000-0000-000000000007', 'AST-LAP-0004', 'dd100000-0000-0000-0000-000000000002', 'HP840-004', '10:6f:d9:88:00:04', NULL, 'lap-legacy-004', NULL, NULL, NULL, 'cc100000-0000-0000-0000-000000000003', 'retired', CURRENT_DATE - 1900, CURRENT_DATE - 500, 'aa100000-0000-0000-0000-000000000002', 'seed-assets-management-v1: retired asset', NOW(), NOW()),
    ('ee100000-0000-0000-0000-000000000008', 'AST-LAP-0005', 'dd100000-0000-0000-0000-000000000001', 'DL7440-005', '00:25:96:ff:aa:05', NULL, 'lap-lost-005', NULL, NULL, NULL, NULL, 'lost', CURRENT_DATE - 420, CURRENT_DATE + 600, 'aa100000-0000-0000-0000-000000000001', 'seed-assets-management-v1: marked lost', NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
    asset_code = EXCLUDED.asset_code,
    model_id = EXCLUDED.model_id,
    serial_no = EXCLUDED.serial_no,
    mac_address = EXCLUDED.mac_address,
    mgmt_ip = EXCLUDED.mgmt_ip,
    hostname = EXCLUDED.hostname,
    vlan_id = EXCLUDED.vlan_id,
    switch_name = EXCLUDED.switch_name,
    switch_port = EXCLUDED.switch_port,
    location_id = EXCLUDED.location_id,
    status = EXCLUDED.status,
    purchase_date = EXCLUDED.purchase_date,
    warranty_end = EXCLUDED.warranty_end,
    vendor_id = EXCLUDED.vendor_id,
    notes = EXCLUDED.notes,
    updated_at = NOW();

INSERT INTO asset_assignments (
    id, asset_id, assignee_type, assignee_id, assignee_name, assigned_at, returned_at, note
) VALUES
    ('ff100000-0000-0000-0000-000000000001', 'ee100000-0000-0000-0000-000000000001', 'person', 'EMP-001', 'Alex Carter', NOW() - INTERVAL '120 days', NULL, 'seed-assets-management-v1: active assignment'),
    ('ff100000-0000-0000-0000-000000000002', 'ee100000-0000-0000-0000-000000000003', 'person', 'EMP-002', 'Taylor Morgan', NOW() - INTERVAL '90 days', NULL, 'seed-assets-management-v1: active assignment'),
    ('ff100000-0000-0000-0000-000000000003', 'ee100000-0000-0000-0000-000000000004', 'system', 'SYS-AUTH', 'Authentication Cluster', NOW() - INTERVAL '300 days', NULL, 'seed-assets-management-v1: system assignment')
ON CONFLICT (id) DO UPDATE SET
    asset_id = EXCLUDED.asset_id,
    assignee_type = EXCLUDED.assignee_type,
    assignee_id = EXCLUDED.assignee_id,
    assignee_name = EXCLUDED.assignee_name,
    assigned_at = EXCLUDED.assigned_at,
    returned_at = EXCLUDED.returned_at,
    note = EXCLUDED.note;

INSERT INTO asset_events (
    id, asset_id, event_type, payload, actor_user_id, correlation_id, created_at
) VALUES
    ('aa200000-0000-0000-0000-000000000001', 'ee100000-0000-0000-0000-000000000001', 'asset_assigned', '{"assigneeId":"EMP-001"}'::jsonb, 'seed-admin', 'seed-assets-management-v1', NOW() - INTERVAL '120 days'),
    ('aa200000-0000-0000-0000-000000000002', 'ee100000-0000-0000-0000-000000000006', 'status_changed', '{"from":"in_use","to":"in_repair"}'::jsonb, 'seed-admin', 'seed-assets-management-v1', NOW() - INTERVAL '14 days'),
    ('aa200000-0000-0000-0000-000000000003', 'ee100000-0000-0000-0000-000000000008', 'status_changed', '{"from":"in_use","to":"lost"}'::jsonb, 'seed-admin', 'seed-assets-management-v1', NOW() - INTERVAL '30 days')
ON CONFLICT (id) DO UPDATE SET
    asset_id = EXCLUDED.asset_id,
    event_type = EXCLUDED.event_type,
    payload = EXCLUDED.payload,
    actor_user_id = EXCLUDED.actor_user_id,
    correlation_id = EXCLUDED.correlation_id,
    created_at = EXCLUDED.created_at;

INSERT INTO maintenance_tickets (
    id, asset_id, title, severity, status, opened_at, closed_at, diagnosis, resolution, created_by, correlation_id
) VALUES
    ('bb200000-0000-0000-0000-000000000001', 'ee100000-0000-0000-0000-000000000006', 'Packet loss on WAN interface', 'high', 'open', NOW() - INTERVAL '14 days', NULL, 'Suspected transceiver issue', NULL, 'it.asset.manager', 'seed-assets-management-v1'),
    ('bb200000-0000-0000-0000-000000000002', 'ee100000-0000-0000-0000-000000000003', 'Keyboard replacement', 'low', 'closed', NOW() - INTERVAL '45 days', NOW() - INTERVAL '40 days', 'Two keys failed', 'Keyboard replaced', 'it.helpdesk', 'seed-assets-management-v1')
ON CONFLICT (id) DO UPDATE SET
    asset_id = EXCLUDED.asset_id,
    title = EXCLUDED.title,
    severity = EXCLUDED.severity,
    status = EXCLUDED.status,
    opened_at = EXCLUDED.opened_at,
    closed_at = EXCLUDED.closed_at,
    diagnosis = EXCLUDED.diagnosis,
    resolution = EXCLUDED.resolution,
    created_by = EXCLUDED.created_by,
    correlation_id = EXCLUDED.correlation_id;

INSERT INTO workflow_requests (
    id, request_type, asset_id, from_dept, to_dept, requested_by, approved_by,
    status, payload, created_at, updated_at, correlation_id
) VALUES
    ('cc200000-0000-0000-0000-000000000001', 'assign', 'ee100000-0000-0000-0000-000000000002', 'IT Warehouse', 'People Operations', 'request.user.001', NULL, 'submitted', '{"reason":"New employee onboarding"}'::jsonb, NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day', 'seed-assets-management-v1'),
    ('cc200000-0000-0000-0000-000000000002', 'repair', 'ee100000-0000-0000-0000-000000000006', 'Network Operations', 'Repair Center', 'noc.user', 'it.asset.manager', 'in_progress', '{"ticketRef":"bb200000-0000-0000-0000-000000000001"}'::jsonb, NOW() - INTERVAL '14 days', NOW() - INTERVAL '13 days', 'seed-assets-management-v1')
ON CONFLICT (id) DO UPDATE SET
    request_type = EXCLUDED.request_type,
    asset_id = EXCLUDED.asset_id,
    from_dept = EXCLUDED.from_dept,
    to_dept = EXCLUDED.to_dept,
    requested_by = EXCLUDED.requested_by,
    approved_by = EXCLUDED.approved_by,
    status = EXCLUDED.status,
    payload = EXCLUDED.payload,
    created_at = EXCLUDED.created_at,
    updated_at = EXCLUDED.updated_at,
    correlation_id = EXCLUDED.correlation_id;

INSERT INTO reminders (
    id, reminder_type, asset_id, due_at, status, channel, created_at, sent_at, correlation_id
) VALUES
    ('dd200000-0000-0000-0000-000000000001', 'warranty_expiring', 'ee100000-0000-0000-0000-000000000001', NOW() + INTERVAL '20 days', 'pending', 'ui', NOW() - INTERVAL '2 days', NULL, 'seed-assets-management-v1'),
    ('dd200000-0000-0000-0000-000000000002', 'maintenance_due', 'ee100000-0000-0000-0000-000000000006', NOW() + INTERVAL '7 days', 'pending', 'ui', NOW() - INTERVAL '1 day', NULL, 'seed-assets-management-v1'),
    ('dd200000-0000-0000-0000-000000000003', 'maintenance_due', 'ee100000-0000-0000-0000-000000000003', NOW() - INTERVAL '5 days', 'sent', 'email', NOW() - INTERVAL '8 days', NOW() - INTERVAL '5 days', 'seed-assets-management-v1')
ON CONFLICT (id) DO UPDATE SET
    reminder_type = EXCLUDED.reminder_type,
    asset_id = EXCLUDED.asset_id,
    due_at = EXCLUDED.due_at,
    status = EXCLUDED.status,
    channel = EXCLUDED.channel,
    created_at = EXCLUDED.created_at,
    sent_at = EXCLUDED.sent_at,
    correlation_id = EXCLUDED.correlation_id;

INSERT INTO inventory_sessions (
    id, name, location_id, status, started_at, closed_at, created_by, correlation_id, created_at
) VALUES
    ('ee200000-0000-0000-0000-000000000001', 'INV-Q1-DC', 'cc100000-0000-0000-0000-000000000004', 'in_progress', NOW() - INTERVAL '2 days', NULL, 'it.asset.manager', 'seed-assets-management-v1', NOW() - INTERVAL '2 days')
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    location_id = EXCLUDED.location_id,
    status = EXCLUDED.status,
    started_at = EXCLUDED.started_at,
    closed_at = EXCLUDED.closed_at,
    created_by = EXCLUDED.created_by,
    correlation_id = EXCLUDED.correlation_id,
    created_at = EXCLUDED.created_at;

INSERT INTO inventory_items (
    id, session_id, asset_id, expected_location_id, scanned_location_id, scanned_at, status, note
) VALUES
    ('ff200000-0000-0000-0000-000000000001', 'ee200000-0000-0000-0000-000000000001', 'ee100000-0000-0000-0000-000000000004', 'cc100000-0000-0000-0000-000000000004', 'cc100000-0000-0000-0000-000000000004', NOW() - INTERVAL '2 days', 'found', 'seed-assets-management-v1: rack A1'),
    ('ff200000-0000-0000-0000-000000000002', 'ee200000-0000-0000-0000-000000000001', 'ee100000-0000-0000-0000-000000000005', 'cc100000-0000-0000-0000-000000000004', 'cc100000-0000-0000-0000-000000000004', NOW() - INTERVAL '2 days', 'found', 'seed-assets-management-v1: rack A2'),
    ('ff200000-0000-0000-0000-000000000003', 'ee200000-0000-0000-0000-000000000001', 'ee100000-0000-0000-0000-000000000006', 'cc100000-0000-0000-0000-000000000004', NULL, NULL, 'missing', 'seed-assets-management-v1: in repair lab')
ON CONFLICT (id) DO UPDATE SET
    session_id = EXCLUDED.session_id,
    asset_id = EXCLUDED.asset_id,
    expected_location_id = EXCLUDED.expected_location_id,
    scanned_location_id = EXCLUDED.scanned_location_id,
    scanned_at = EXCLUDED.scanned_at,
    status = EXCLUDED.status,
    note = EXCLUDED.note;

COMMIT;
