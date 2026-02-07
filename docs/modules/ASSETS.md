# Asset Management Module

> Complete IT asset lifecycle management

## Overview

The Asset Management module provides:
- Asset registration and tracking
- Lifecycle management
- Assignment and checkout
- Maintenance scheduling
- Depreciation calculation
- Reporting and analytics

## Asset Dashboard

### URL
`/assets`

### Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  Assets Dashboard                        [+ Add Asset] [Import] │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐   │
│  │ Total   │ │ Active  │ │ In Use  │ │ Repair  │ │ Retired │   │
│  │  1,245  │ │   892   │ │   756   │ │   45    │ │   162   │   │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘   │
├─────────────────────────────────────────────────────────────────┤
│  Filter: [Category ▼] [Status ▼] [Location ▼] [🔍 Search...]   │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Asset Tag │ Name        │ Category │ Status │ Location  │   │
│  ├───────────┼─────────────┼──────────┼────────┼───────────┤   │
│  │ AST-0001  │ Dell XPS 15 │ Laptop   │ In Use │ HQ-Floor3 │   │
│  │ AST-0002  │ HP ProDesk  │ Desktop  │ Active │ HQ-Floor2 │   │
│  │ AST-0003  │ Cisco 2960  │ Switch   │ Active │ DC-Rack1  │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                         [< 1 2 3 4 5 ... 50 >]  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Asset Registration

### URL
`/assets/new`

### Basic Information Form

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Asset Tag | text | ✓ | Unique identifier (auto-generated) |
| Name | text | ✓ | Asset display name |
| Category | select | ✓ | Asset category |
| Model | select | ✓ | Product model |
| Serial Number | text | ✗ | Manufacturer serial |
| Status | select | ✓ | Current status |

### Category Selection

| Category | Examples |
|----------|----------|
| Laptop | MacBook, ThinkPad, XPS |
| Desktop | OptiPlex, ProDesk, iMac |
| Server | PowerEdge, ProLiant |
| Network | Switch, Router, Firewall |
| Printer | LaserJet, WorkCentre |
| Mobile | iPhone, iPad, Tablet |
| Other | Projector, UPS, etc. |

### Purchase Information

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Purchase Date | date | ✗ | Date of purchase |
| Purchase Cost | number | ✗ | Original cost |
| Vendor | select | ✗ | Supplier/vendor |
| Invoice Number | text | ✗ | Purchase invoice |
| Warranty End | date | ✗ | Warranty expiry |

### Location Information

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Location | select | ✗ | Physical location |
| Department | select | ✗ | Assigned department |
| Assigned To | select | ✗ | User assignment |

### Custom Specifications

Dynamic fields based on category:

**Laptop/Desktop:**
| Field | Type | Example |
|-------|------|---------|
| CPU | text | Intel Core i7-12700H |
| RAM | text | 32GB DDR5 |
| Storage | text | 1TB NVMe SSD |
| Display | text | 15.6" FHD |

**Network Equipment:**
| Field | Type | Example |
|-------|------|---------|
| Ports | number | 48 |
| Management IP | text | 192.168.1.1 |
| Firmware | text | v15.2.4 |

---

## Asset Detail View

### URL
`/assets/{id}`

### Tabs

| Tab | Content |
|-----|---------|
| Overview | Basic info, status, location |
| Specifications | Technical details |
| History | Event timeline |
| Assignments | User assignments |
| Maintenance | Repair records |
| Attachments | Documents, images |

### Actions

| Action | Description |
|--------|-------------|
| Edit | Modify asset details |
| Assign | Assign to user |
| Check Out | Temporary checkout |
| Schedule Maintenance | Create maintenance ticket |
| Retire | Mark as retired |
| Delete | Remove asset |

---

## Asset Status Lifecycle

```
┌─────────┐     ┌─────────┐     ┌─────────┐
│  New    │────▶│ Active  │────▶│ In Use  │
└─────────┘     └────┬────┘     └────┬────┘
                     │               │
                     ▼               ▼
              ┌─────────┐     ┌─────────┐
              │ Storage │     │ Repair  │
              └────┬────┘     └────┬────┘
                   │               │
                   ▼               ▼
              ┌─────────────────────────┐
              │        Retired          │
              └───────────┬─────────────┘
                          │
                          ▼
              ┌─────────────────────────┐
              │        Disposed         │
              └─────────────────────────┘
```

### Status Definitions

| Status | Description |
|--------|-------------|
| New | Newly registered, not yet deployed |
| Active | Available for assignment |
| In Use | Assigned to user/location |
| Storage | In warehouse/storage |
| Repair | Under maintenance |
| Retired | End of life, not in use |
| Disposed | Physically disposed |

---

## Asset Categories

### URL
`/assets/catalogs`

### Category Management

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Name | text | ✓ | Category name |
| Code | text | ✓ | Short code (e.g., LPT) |
| Parent | select | ✗ | Parent category |
| Description | textarea | ✗ | Category description |
| Icon | select | ✗ | Display icon |

### Specification Templates

Define custom fields for each category:

```json
{
  "category": "Laptop",
  "specifications": [
    {"name": "cpu", "label": "Processor", "type": "text", "required": true},
    {"name": "ram", "label": "Memory", "type": "text", "required": true},
    {"name": "storage", "label": "Storage", "type": "text", "required": true},
    {"name": "display", "label": "Display", "type": "text", "required": false},
    {"name": "battery", "label": "Battery", "type": "text", "required": false}
  ]
}
```

---

## Asset Models

### URL
`/assets/catalogs` → Models tab

### Model Information

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Model Name | text | ✓ | Product model name |
| Model Number | text | ✗ | Manufacturer model # |
| Category | select | ✓ | Asset category |
| Vendor | select | ✓ | Manufacturer |
| Description | textarea | ✗ | Model description |
| Default Specs | json | ✗ | Default specifications |

---

## Vendors

### URL
`/assets/catalogs` → Vendors tab

### Vendor Information

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Name | text | ✓ | Company name |
| Code | text | ✓ | Short code |
| Type | select | ✓ | Manufacturer/Reseller/Service |
| Contact Name | text | ✗ | Primary contact |
| Email | email | ✗ | Contact email |
| Phone | text | ✗ | Contact phone |
| Address | textarea | ✗ | Physical address |
| Website | url | ✗ | Company website |

---

## Locations

### URL
`/assets/catalogs` → Locations tab

### Location Hierarchy

```
Company HQ
├── Building A
│   ├── Floor 1
│   │   ├── Room 101
│   │   └── Room 102
│   └── Floor 2
└── Data Center
    ├── Rack Row A
    │   ├── Rack 1
    │   └── Rack 2
    └── Rack Row B
```

### Location Form

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Name | text | ✓ | Location name |
| Code | text | ✓ | Short code |
| Parent | select | ✗ | Parent location |
| Type | select | ✓ | Building/Floor/Room/Rack |
| Address | textarea | ✗ | Physical address |
| Capacity | number | ✗ | Max assets |

---

## Import/Export

### Import Assets

**URL:** `/assets` → Import button

**Supported Formats:**
- CSV (Comma Separated)
- XLSX (Excel)
- JSON

**CSV Template:**
```csv
asset_tag,name,category,model,serial_number,status,location,purchase_date,purchase_cost
AST-0001,Dell XPS 15,Laptop,XPS 15 9530,SN12345,active,HQ-Floor1,2024-01-15,1500
```

### Export Assets

**Options:**
- All assets
- Filtered results
- Selected assets

**Formats:**
- CSV
- Excel (XLSX)
- PDF Report

---

## Reports

### Available Reports

| Report | Description |
|--------|-------------|
| Asset Inventory | Full asset list |
| By Category | Assets grouped by category |
| By Location | Assets by location |
| By Status | Assets by status |
| Warranty Expiring | Assets with expiring warranty |
| Depreciation | Asset depreciation report |

### Warranty Alerts

Automatic alerts for:
- Warranty expiring in 30 days
- Warranty expiring in 90 days
- Expired warranties

---

## API Endpoints

### List Assets
```http
GET /api/v1/assets?page=1&limit=20&status=active
Authorization: Bearer {token}
```

### Create Asset
```http
POST /api/v1/assets
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "Dell XPS 15",
  "category_id": "uuid",
  "model_id": "uuid",
  "serial_number": "SN12345",
  "status": "active"
}
```

### Update Asset
```http
PUT /api/v1/assets/{id}
Authorization: Bearer {token}
Content-Type: application/json

{
  "status": "in_use",
  "assigned_to": "user_uuid"
}
```

### Delete Asset
```http
DELETE /api/v1/assets/{id}
Authorization: Bearer {token}
```

---

## Related Modules

- [CMDB](./CMDB.md) - Configuration items
- [Warehouse](./WAREHOUSE.md) - Spare parts
- [QLTS](./QLTS.md) - Purchase workflows
- [Maintenance](./MAINTENANCE.md) - Repair orders
