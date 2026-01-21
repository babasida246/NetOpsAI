# Database Migrations - Asset Catalog and Generic Inventory

This folder documents the generic inventory module built on top of an existing
asset catalog schema (categories, vendors, models, category specs).

The inventory tables optionally link to catalog tables, but the inventory module
is industry-agnostic and can be used without any asset-specific logic.

## Prerequisites

- PostgreSQL 12+ (tested with 14+)
- Extension: pgcrypto

## Migration order

Apply the inventory migrations in this order:

1. `db/migrations/003_inventory_core.sql`
2. `db/migrations/004_inventory_documents.sql`
3. `db/migrations/005_inventory_costing.sql`
4. `db/migrations/006_inventory_seed.sql` (optional, rerunnable)

If your catalog schema is not already present, apply it first using your existing
catalog migrations or schema file (see `packages/infra-postgres/src/schema.sql`).

### Example: psql

```bash
psql $DATABASE_URL -f db/migrations/003_inventory_core.sql
psql $DATABASE_URL -f db/migrations/004_inventory_documents.sql
psql $DATABASE_URL -f db/migrations/005_inventory_costing.sql
psql $DATABASE_URL -f db/migrations/006_inventory_seed.sql
```

### Example: Docker (psql in container)

```bash
cat db/migrations/003_inventory_core.sql | docker exec -i your-postgres psql -U postgres -d your_db
cat db/migrations/004_inventory_documents.sql | docker exec -i your-postgres psql -U postgres -d your_db
cat db/migrations/005_inventory_costing.sql | docker exec -i your-postgres psql -U postgres -d your_db
cat db/migrations/006_inventory_seed.sql | docker exec -i your-postgres psql -U postgres -d your_db
```

## Seed data (006_inventory_seed.sql)

The seed is rerunnable and removes only documents with `doc_no` starting with
`SEED-` before re-inserting demo data.

It creates:

- Organization: `DEMO`
- Warehouses: `MAIN`, `SECONDARY`
- Locations: `A1` (default), `A2` in MAIN; `A1` in SECONDARY
- Parties: `ACME_SUPPLIER` (supplier), `INTERNAL_TEAM` (internal)
- Items: `TONER`, `RIBBON` (lot+expiry), `RAM_8GB` (FIFO), `SSD_512` (serial)
- Documents:
  - `SEED-RCPT-001` (receipt)
  - `SEED-ISSUE-001` (issue)
  - `SEED-XFER-001` (transfer)
  - `SEED-STOCKTAKE-001` (stocktake)

## Core tables

- `organizations`, `warehouses`, `warehouse_locations`
- `parties` (supplier/customer/internal)
- `inventory_items` (SKU master, optional links to categories/vendors/models)
- `inventory_lots`, `inventory_serials`
- `inventory_documents`, `inventory_document_lines`, `inventory_line_serials`
- `inventory_ledger` (immutable movement history)
- `inventory_cost_layers` (FIFO), `inventory_avg_cost` (AVG)

## Functions and views

Functions:
- `sp_post_inventory_document(document_id uuid)`
- `sp_void_inventory_document(document_id uuid)`
- `fn_get_on_hand(warehouse_id, item_id, location_id, lot_id)`

Views:
- `vw_stock_on_hand` (warehouse/location/lot)
- `vw_stock_on_hand_item` (warehouse/item aggregate with valuation)
- `vw_reorder_alerts`
- `vw_item_movement` (ledger joined to documents)
- `vw_fefo_lots` (lot balances ordered by expiry)

## Usage examples

### 1) Create a receipt and post it

```sql
-- Create receipt header
INSERT INTO inventory_documents (
    org_id, doc_no, doc_type, status, target_warehouse_id, counterparty_id, note, created_by
) VALUES (
    (SELECT id FROM organizations WHERE code = 'DEMO'),
    'RCPT-2026-001',
    'RECEIPT',
    'draft',
    (SELECT id FROM warehouses WHERE code = 'MAIN' AND org_id = (SELECT id FROM organizations WHERE code = 'DEMO')),
    (SELECT id FROM parties WHERE code = 'ACME_SUPPLIER' AND party_type = 'supplier'),
    'Initial receipt',
    'seed_user'
) RETURNING id;

-- Add receipt lines (unit_cost is required for RECEIPT)
INSERT INTO inventory_document_lines (
    document_id, line_no, item_id, quantity, uom, unit_cost, target_location_id
) VALUES (
    'DOC_ID',
    1,
    (SELECT id FROM inventory_items WHERE sku = 'TONER' AND org_id = (SELECT id FROM organizations WHERE code = 'DEMO')),
    100, 'pcs', 5.00,
    (SELECT id FROM warehouse_locations WHERE code = 'A1'
        AND warehouse_id = (SELECT id FROM warehouses WHERE code = 'MAIN' AND org_id = (SELECT id FROM organizations WHERE code = 'DEMO')))
);

-- Post the document (creates ledger and cost layers/avg)
SELECT sp_post_inventory_document('DOC_ID');
```

### 2) Issue stock

```sql
INSERT INTO inventory_documents (
    org_id, doc_no, doc_type, status, source_warehouse_id, counterparty_id, note, created_by
) VALUES (
    (SELECT id FROM organizations WHERE code = 'DEMO'),
    'ISSUE-2026-001',
    'ISSUE',
    'draft',
    (SELECT id FROM warehouses WHERE code = 'MAIN' AND org_id = (SELECT id FROM organizations WHERE code = 'DEMO')),
    (SELECT id FROM parties WHERE code = 'INTERNAL_TEAM' AND party_type = 'internal'),
    'Issue to team',
    'seed_user'
) RETURNING id;

INSERT INTO inventory_document_lines (
    document_id, line_no, item_id, quantity, uom, source_location_id
) VALUES (
    'DOC_ID',
    1,
    (SELECT id FROM inventory_items WHERE sku = 'TONER' AND org_id = (SELECT id FROM organizations WHERE code = 'DEMO')),
    5, 'pcs',
    (SELECT id FROM warehouse_locations WHERE code = 'A1'
        AND warehouse_id = (SELECT id FROM warehouses WHERE code = 'MAIN' AND org_id = (SELECT id FROM organizations WHERE code = 'DEMO')))
);

SELECT sp_post_inventory_document('DOC_ID');
```

### 3) Transfer between warehouses

```sql
INSERT INTO inventory_documents (
    org_id, doc_no, doc_type, status, source_warehouse_id, target_warehouse_id, note, created_by
) VALUES (
    (SELECT id FROM organizations WHERE code = 'DEMO'),
    'XFER-2026-001',
    'TRANSFER',
    'draft',
    (SELECT id FROM warehouses WHERE code = 'MAIN' AND org_id = (SELECT id FROM organizations WHERE code = 'DEMO')),
    (SELECT id FROM warehouses WHERE code = 'SECONDARY' AND org_id = (SELECT id FROM organizations WHERE code = 'DEMO')),
    'Rebalance stock',
    'seed_user'
) RETURNING id;

INSERT INTO inventory_document_lines (
    document_id, line_no, item_id, quantity, uom, source_location_id, target_location_id
) VALUES (
    'DOC_ID',
    1,
    (SELECT id FROM inventory_items WHERE sku = 'TONER' AND org_id = (SELECT id FROM organizations WHERE code = 'DEMO')),
    10, 'pcs',
    (SELECT id FROM warehouse_locations WHERE code = 'A1'
        AND warehouse_id = (SELECT id FROM warehouses WHERE code = 'MAIN' AND org_id = (SELECT id FROM organizations WHERE code = 'DEMO'))),
    (SELECT id FROM warehouse_locations WHERE code = 'A1'
        AND warehouse_id = (SELECT id FROM warehouses WHERE code = 'SECONDARY' AND org_id = (SELECT id FROM organizations WHERE code = 'DEMO')))
);

SELECT sp_post_inventory_document('DOC_ID');
```

### 4) Adjust or stocktake

```sql
-- ADJUST requires adjust_direction on lines
INSERT INTO inventory_documents (
    org_id, doc_no, doc_type, status, source_warehouse_id, note, created_by
) VALUES (
    (SELECT id FROM organizations WHERE code = 'DEMO'),
    'ADJ-2026-001',
    'ADJUST',
    'draft',
    (SELECT id FROM warehouses WHERE code = 'MAIN' AND org_id = (SELECT id FROM organizations WHERE code = 'DEMO')),
    'Manual adjustment',
    'seed_user'
) RETURNING id;

INSERT INTO inventory_document_lines (
    document_id, line_no, item_id, quantity, uom, source_location_id, adjust_direction
) VALUES (
    'DOC_ID',
    1,
    (SELECT id FROM inventory_items WHERE sku = 'TONER' AND org_id = (SELECT id FROM organizations WHERE code = 'DEMO')),
    2, 'pcs',
    (SELECT id FROM warehouse_locations WHERE code = 'A1'
        AND warehouse_id = (SELECT id FROM warehouses WHERE code = 'MAIN' AND org_id = (SELECT id FROM organizations WHERE code = 'DEMO'))),
    'plus'
);

SELECT sp_post_inventory_document('DOC_ID');

-- STOCKTAKE uses counted quantity (system diff is computed)
INSERT INTO inventory_documents (
    org_id, doc_no, doc_type, status, source_warehouse_id, note, created_by
) VALUES (
    (SELECT id FROM organizations WHERE code = 'DEMO'),
    'STK-2026-001',
    'STOCKTAKE',
    'draft',
    (SELECT id FROM warehouses WHERE code = 'MAIN' AND org_id = (SELECT id FROM organizations WHERE code = 'DEMO')),
    'Cycle count',
    'seed_user'
) RETURNING id;

INSERT INTO inventory_document_lines (
    document_id, line_no, item_id, quantity, uom, source_location_id
) VALUES (
    'DOC_ID',
    1,
    (SELECT id FROM inventory_items WHERE sku = 'TONER' AND org_id = (SELECT id FROM organizations WHERE code = 'DEMO')),
    50, 'pcs',
    (SELECT id FROM warehouse_locations WHERE code = 'A1'
        AND warehouse_id = (SELECT id FROM warehouses WHERE code = 'MAIN' AND org_id = (SELECT id FROM organizations WHERE code = 'DEMO')))
);

SELECT sp_post_inventory_document('DOC_ID');
```

### 5) FEFO lot picking

```sql
SELECT *
FROM vw_fefo_lots
WHERE sku = 'RIBBON'
ORDER BY expiry_date ASC NULLS LAST;
```

### 6) Stock and valuation

```sql
SELECT *
FROM vw_stock_on_hand_item
ORDER BY warehouse_code, sku;
```

### 7) Movement history

```sql
SELECT *
FROM vw_item_movement
WHERE sku = 'TONER'
ORDER BY posted_at DESC;
```

## Validation rules (high level)

- RECEIPT lines require `unit_cost`.
- ADJUST lines require `adjust_direction` = 'plus' or 'minus'.
- LOT tracked items require `lot_id`.
- EXPIRY tracked items require `expiry_date` (on line or on lot).
- SERIAL tracked items require one serial per unit in `inventory_line_serials`.

## Notes

- FIFO uses `inventory_cost_layers` and consumes oldest layers first.
- AVG uses `inventory_avg_cost` and updates the running weighted average.
- `sp_void_inventory_document` creates reversal ledger entries and best-effort cost adjustments.
