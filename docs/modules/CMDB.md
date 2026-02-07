# CMDB Module

> Configuration Management Database for IT services

## Overview

The CMDB (Configuration Management Database) module provides:
- Configuration Item (CI) management
- CI type definitions and schemas
- Relationship mapping
- Service catalog
- Impact analysis

## CMDB Dashboard

### URL
`/cmdb`

### Layout

```
┌────────────────────────────────────────────────────────────────┐
│  CMDB Dashboard                              [+ Add CI] [Map]  │
├────────────────────────────────────────────────────────────────┤
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐              │
│  │ Total   │ │Services │ │ Servers │ │Networks │              │
│  │  2,456  │ │   45    │ │   320   │ │   180   │              │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘              │
├────────────────────────────────────────────────────────────────┤
│  CI Type: [All Types ▼]  Status: [All ▼]  [🔍 Search...]      │
├────────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ CI Code    │ Name           │ Type    │ Status │ Service│  │
│  ├────────────┼────────────────┼─────────┼────────┼────────┤  │
│  │ CI-SRV-001 │ Web Server 01  │ Server  │ Active │ Portal │  │
│  │ CI-APP-001 │ Customer API   │ App     │ Active │ CRM    │  │
│  │ CI-DB-001  │ MySQL Primary  │ Database│ Active │ CRM    │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────┘
```

---

## Configuration Items (CIs)

### CI Form

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| CI Code | text | ✓ | Unique identifier |
| Name | text | ✓ | Display name |
| CI Type | select | ✓ | Type classification |
| Status | select | ✓ | Operational status |
| Environment | select | ✗ | Prod/Stage/Dev |
| Owner | select | ✗ | Responsible person |
| Location | select | ✗ | Physical location |
| Service | select | ✗ | Related service |

### CI Types

| Type | Description | Examples |
|------|-------------|----------|
| Server | Physical/virtual servers | Web, App, DB servers |
| Application | Software applications | APIs, Services |
| Database | Database instances | MySQL, PostgreSQL |
| Network | Network devices | Switches, Routers |
| Storage | Storage systems | NAS, SAN |
| Service | Business services | Email, CRM |

### CI Status

| Status | Description |
|--------|-------------|
| Planning | Not yet implemented |
| Active | Operational |
| Maintenance | Under maintenance |
| Degraded | Reduced capacity |
| Inactive | Temporarily disabled |
| Retired | Decommissioned |

---

## CI Types & Schemas

### URL
`/cmdb` → CI Types tab

### CI Type Definition

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Code | text | ✓ | Type code (SRV, APP, etc.) |
| Name | text | ✓ | Display name |
| Description | textarea | ✗ | Type description |
| Parent Type | select | ✗ | Inheritance |
| Icon | select | ✗ | Display icon |

### Schema Versioning

Each CI type can have multiple schema versions:

```
CI Type: Server
├── Version 1.0 (Archived)
│   └── Fields: hostname, ip, os
├── Version 2.0 (Active)
│   └── Fields: hostname, ip, os, cpu, ram, storage
└── Version 3.0 (Draft)
    └── Fields: hostname, ip, os, cpu, ram, storage, tags
```

### Schema Fields

| Property | Type | Description |
|----------|------|-------------|
| Field Name | text | Internal name |
| Label | text | Display label |
| Data Type | select | string/number/boolean/date |
| Required | boolean | Mandatory field |
| Default Value | text | Default value |
| Validation | regex | Validation pattern |
| Display Order | number | Form order |

**Example Schema:**
```json
{
  "ciType": "Server",
  "version": "2.0",
  "fields": [
    {
      "name": "hostname",
      "label": "Hostname",
      "type": "string",
      "required": true
    },
    {
      "name": "ip_address",
      "label": "IP Address",
      "type": "string",
      "required": true,
      "validation": "^\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}$"
    },
    {
      "name": "os",
      "label": "Operating System",
      "type": "enum",
      "options": ["Ubuntu", "CentOS", "Windows Server"]
    },
    {
      "name": "cpu_cores",
      "label": "CPU Cores",
      "type": "number"
    },
    {
      "name": "ram_gb",
      "label": "RAM (GB)",
      "type": "number"
    }
  ]
}
```

---

## Relationships

### Relationship Types

| Type | Description | Example |
|------|-------------|---------|
| Depends On | CI depends on another | App → Database |
| Runs On | CI runs on another | Service → Server |
| Connected To | Network connection | Server → Switch |
| Backup Of | Backup relationship | Replica → Primary |
| Part Of | Component relationship | Module → Application |

### Relationship Map

```
                    ┌──────────┐
                    │  CRM     │
                    │ Service  │
                    └────┬─────┘
                         │ consists of
          ┌──────────────┼──────────────┐
          ▼              ▼              ▼
    ┌──────────┐  ┌──────────┐  ┌──────────┐
    │ CRM API  │  │ CRM Web  │  │ CRM DB   │
    └────┬─────┘  └────┬─────┘  └────┬─────┘
         │             │              │
         │ runs on     │ runs on      │ runs on
         ▼             ▼              ▼
    ┌──────────┐  ┌──────────┐  ┌──────────┐
    │ App Srv 1│  │ Web Srv 1│  │ DB Srv 1 │
    └──────────┘  └──────────┘  └──────────┘
```

### Creating Relationships

1. Open CI detail page
2. Navigate to "Relationships" tab
3. Click "Add Relationship"
4. Select relationship type
5. Choose target CI
6. Add optional notes

---

## Services

### URL
`/cmdb` → Services tab

### Service Definition

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Service Code | text | ✓ | Unique code |
| Name | text | ✓ | Service name |
| Description | textarea | ✗ | Service description |
| Owner | select | ✗ | Service owner |
| Criticality | select | ✓ | Business criticality |
| Status | select | ✓ | Service status |
| SLA | select | ✗ | SLA agreement |

### Service Criticality

| Level | Description | RTO |
|-------|-------------|-----|
| Critical | Core business | < 1 hour |
| High | Important | < 4 hours |
| Medium | Standard | < 24 hours |
| Low | Non-essential | Best effort |

### Service-CI Mapping

Map CIs to services for impact analysis:

```
Service: Email System
├── Primary Components
│   ├── Mail Server 1 (Active)
│   ├── Mail Server 2 (Active)
│   └── Mail Database (Active)
└── Supporting Components
    ├── Load Balancer (Active)
    ├── DNS Server (Active)
    └── Storage Array (Active)
```

---

## Impact Analysis

### What-If Analysis

Simulate impact of CI changes:

1. Select CI to modify/retire
2. Click "Analyze Impact"
3. View affected services
4. Review dependent CIs
5. Generate impact report

### Impact Report

```
┌────────────────────────────────────────────────────────────┐
│ Impact Analysis: Retiring DB-SRV-001                       │
├────────────────────────────────────────────────────────────┤
│ Directly Affected Services: 3                              │
│ ├── CRM System (Critical) ⚠️                               │
│ ├── Reporting Service (High)                               │
│ └── Analytics Dashboard (Medium)                           │
│                                                            │
│ Indirectly Affected CIs: 12                                │
│ ├── CRM API (depends on)                                   │
│ ├── CRM Web (depends on)                                   │
│ └── ... 10 more                                            │
│                                                            │
│ Estimated Impact: HIGH                                     │
│ Recommended: Schedule maintenance window                   │
└────────────────────────────────────────────────────────────┘
```

---

## API Endpoints

### List CIs
```http
GET /api/v1/cmdb/cis?type=server&status=active
Authorization: Bearer {token}
```

### Create CI
```http
POST /api/v1/cmdb/cis
Authorization: Bearer {token}
Content-Type: application/json

{
  "ci_code": "CI-SRV-001",
  "name": "Web Server 01",
  "ci_type_id": "uuid",
  "status": "active",
  "attributes": {
    "hostname": "web01.example.com",
    "ip_address": "192.168.1.10",
    "os": "Ubuntu 22.04"
  }
}
```

### Create Relationship
```http
POST /api/v1/cmdb/relationships
Authorization: Bearer {token}
Content-Type: application/json

{
  "from_ci_id": "uuid",
  "to_ci_id": "uuid",
  "relationship_type": "depends_on",
  "notes": "Primary database connection"
}
```

---

## Best Practices

1. **Consistent Naming**: Use standard naming conventions
2. **Complete Relationships**: Map all dependencies
3. **Regular Audits**: Verify CI accuracy monthly
4. **Version Control**: Use schema versioning
5. **Service Mapping**: Link CIs to business services

## Related Modules

- [Assets](./ASSETS.md) - Physical assets linked to CIs
- [Network Operations](./NETOPS.md) - Network device CIs
- [Maintenance](./MAINTENANCE.md) - CI maintenance
