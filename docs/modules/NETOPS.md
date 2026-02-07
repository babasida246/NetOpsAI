# Network Operations Module

> Network device management and configuration control

## Overview

The Network Operations (NetOps) module provides:
- Network device inventory
- Configuration management
- Configuration backup/restore
- Change tracking
- Compliance checking

---

## Network Dashboard

### URL
`/network`

### Layout

```
┌────────────────────────────────────────────────────────────────┐
│  Network Operations                        [+ Add Device] [🔄] │
├────────────────────────────────────────────────────────────────┤
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐              │
│  │ Total   │ │ Online  │ │ Offline │ │ Warning │              │
│  │   180   │ │   172   │ │    5    │ │    3    │              │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘              │
├────────────────────────────────────────────────────────────────┤
│  Type: [All ▼]  Vendor: [All ▼]  Status: [All ▼]  [🔍 Search] │
├────────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Hostname   │ IP Address   │ Type   │ Vendor │ Status    │  │
│  ├────────────┼──────────────┼────────┼────────┼───────────┤  │
│  │ SW-CORE-01 │ 10.0.0.1     │ Switch │ Cisco  │ 🟢 Online │  │
│  │ RT-EDGE-01 │ 10.0.0.254   │ Router │ Juniper│ 🟢 Online │  │
│  │ FW-DMZ-01  │ 10.0.1.1     │ FW     │ Palo   │ 🟡 Warning│  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────┘
```

---

## Network Devices

### Device Registration Form

**URL:** `/network/devices/new`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Hostname | text | ✓ | Device hostname |
| IP Address | text | ✓ | Management IP |
| Device Type | select | ✓ | Router/Switch/Firewall |
| Vendor | select | ✓ | Manufacturer |
| Model | text | ✗ | Device model |
| Serial Number | text | ✗ | Serial number |
| Firmware Version | text | ✗ | Current firmware |
| Location | select | ✗ | Physical location |
| Rack/Unit | text | ✗ | Rack position |
| Console Port | text | ✗ | Console access |
| Notes | textarea | ✗ | Additional notes |

### Device Types

| Type | Icon | Description |
|------|------|-------------|
| Router | 🔀 | Layer 3 routing devices |
| Switch | 🔗 | Layer 2/3 switches |
| Firewall | 🛡️ | Security appliances |
| Access Point | 📶 | Wireless access points |
| Load Balancer | ⚖️ | Traffic distribution |
| VPN Gateway | 🔐 | VPN concentrators |

### Vendor Support

| Vendor | Config Type | Supported Features |
|--------|-------------|-------------------|
| Cisco IOS | CLI | Backup, Compare, Deploy |
| Cisco NX-OS | CLI | Backup, Compare, Deploy |
| Juniper JunOS | XML | Backup, Compare |
| Palo Alto | API | Backup, Compare |
| Fortinet | CLI | Backup, Compare |
| Arista EOS | CLI | Backup, Compare |

---

## Device Detail Page

### URL
`/network/devices/{id}`

### Tabs

| Tab | Content |
|-----|---------|
| Overview | Device information, status, interfaces |
| Configurations | Config versions, diff view |
| Changes | Change history |
| Compliance | Policy check results |
| Monitoring | Metrics graphs |

### Overview Tab

```
┌────────────────────────────────────────────────────────────────┐
│  SW-CORE-01                          🟢 Online    [Edit] [📥]  │
├────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────┐ ┌─────────────────────────────┐   │
│  │ Device Information      │ │ Connection Status           │   │
│  │ IP: 10.0.0.1           │ │ Last Seen: 2 minutes ago   │   │
│  │ Type: Switch           │ │ Uptime: 45 days            │   │
│  │ Vendor: Cisco          │ │ SSH: ✓ Connected           │   │
│  │ Model: Catalyst 9300   │ │ SNMP: ✓ Available          │   │
│  │ Serial: FCW2145G001    │ │ API: ✗ Not configured      │   │
│  │ Firmware: 17.6.3       │ │                             │   │
│  └─────────────────────────┘ └─────────────────────────────┘   │
│                                                                │
│  Interfaces (48 ports)                                        │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Port  │ Status │ Speed   │ VLAN │ Description           │  │
│  ├───────┼────────┼─────────┼──────┼───────────────────────┤  │
│  │ Gi1/1 │ 🟢 Up  │ 1 Gbps  │ 100  │ Server 01 eth0        │  │
│  │ Gi1/2 │ 🟢 Up  │ 1 Gbps  │ 100  │ Server 02 eth0        │  │
│  │ Gi1/3 │ ⚪ Down │ -       │ 1    │ Available             │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────┘
```

---

## Configuration Management

### Configurations Tab

#### Configuration Versions

```
┌────────────────────────────────────────────────────────────────┐
│  Configuration History                        [📥 Backup Now]  │
├────────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ ☐ │ Version   │ Date       │ Type    │ Changes │ User   │  │
│  ├───┼───────────┼────────────┼─────────┼─────────┼────────┤  │
│  │ ☑ │ v1.0.45   │ 2024-01-15 │ Auto    │ +12 -3  │ System │  │
│  │ ☑ │ v1.0.44   │ 2024-01-14 │ Manual  │ +5 -2   │ admin  │  │
│  │ ☐ │ v1.0.43   │ 2024-01-10 │ Auto    │ +0 -0   │ System │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                │
│  [Compare Selected] [Restore...] [Export]                      │
└────────────────────────────────────────────────────────────────┘
```

#### Configuration Diff View

```
┌────────────────────────────────────────────────────────────────┐
│  Compare: v1.0.44 ← → v1.0.45                                  │
├────────────────────────────────────────────────────────────────┤
│  interface GigabitEthernet1/5                                  │
│   description Server Farm                                      │
│-  switchport access vlan 100                                   │
│+  switchport access vlan 200                                   │
│   switchport mode access                                       │
│   spanning-tree portfast                                       │
│                                                                │
│  interface GigabitEthernet1/6                                  │
│+  description New Server                                       │
│+  switchport access vlan 200                                   │
│+  switchport mode access                                       │
└────────────────────────────────────────────────────────────────┘
```

### Backup Configuration

| Option | Description |
|--------|-------------|
| Manual Backup | Click "Backup Now" button |
| Scheduled | Set auto-backup schedule |
| On Change | Backup when config changes detected |

**Schedule Options:**
- Hourly
- Daily (specify time)
- Weekly (specify day/time)
- Custom cron expression

### Configuration Restore

1. Select configuration version
2. Click "Restore..."
3. Review changes (diff view)
4. Confirm restoration
5. Monitor deployment

⚠️ **Warning**: Restore requires approval for production devices

---

## Configuration Changes

### Change Request Form

**URL:** `/network/changes/new`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Title | text | ✓ | Change summary |
| Device(s) | multi-select | ✓ | Target devices |
| Change Type | select | ✓ | Standard/Normal/Emergency |
| Priority | select | ✓ | Low/Medium/High/Critical |
| Description | textarea | ✓ | Detailed description |
| Scheduled Date | datetime | ✗ | Planned execution time |
| Rollback Plan | textarea | ✓ | How to undo changes |
| Config Template | select | ✗ | Pre-defined template |
| Custom Config | code | ✗ | Configuration commands |

### Change Types

| Type | Description | Approval |
|------|-------------|----------|
| Standard | Pre-approved routine changes | Auto-approved |
| Normal | Regular changes | Manager approval |
| Emergency | Critical fixes | Post-approval |

### Change Workflow

```
┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐
│  Draft   │──▶│ Pending  │──▶│ Approved │──▶│ Scheduled│
└──────────┘   │ Approval │   └──────────┘   └────┬─────┘
               └──────────┘         │             │
                    │               │             ▼
                    ▼               │       ┌──────────┐
              ┌──────────┐          │       │Executing │
              │ Rejected │          │       └────┬─────┘
              └──────────┘          │            │
                                    ▼            ▼
                              ┌──────────┐ ┌──────────┐
                              │ Canceled │ │ Complete │
                              └──────────┘ └──────────┘
```

### Change History

Track all configuration changes:

| Change | Device | Date | User | Status |
|--------|--------|------|------|--------|
| VLAN Update | SW-CORE-01 | 2024-01-15 | admin | Success |
| ACL Update | FW-DMZ-01 | 2024-01-14 | netops | Success |
| Port Config | SW-ACC-05 | 2024-01-13 | admin | Rolled Back |

---

## Config Templates

### URL
`/network/templates`

### Template Definition

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Template Name | text | ✓ | Display name |
| Device Types | multi-select | ✓ | Applicable device types |
| Vendors | multi-select | ✓ | Applicable vendors |
| Description | textarea | ✗ | Template description |
| Variables | list | ✗ | Template variables |
| Template Content | code | ✓ | Configuration template |

### Template Variables

Define variables for reusable templates:

```yaml
variables:
  - name: vlan_id
    label: VLAN ID
    type: number
    required: true
    validation: "^[1-9][0-9]{0,3}$"
    
  - name: description
    label: Port Description
    type: string
    required: true
    max_length: 64
    
  - name: shutdown
    label: Shutdown Port
    type: boolean
    default: false
```

### Template Example

```cisco
! Template: Access Port Configuration
interface {{interface_name}}
 description {{description}}
 switchport mode access
 switchport access vlan {{vlan_id}}
 spanning-tree portfast
{% if voice_vlan %}
 switchport voice vlan {{voice_vlan}}
{% endif %}
{% if shutdown %}
 shutdown
{% else %}
 no shutdown
{% endif %}
```

---

## Compliance

### Compliance Rules

**URL:** `/network/compliance`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Rule Name | text | ✓ | Rule identifier |
| Description | textarea | ✓ | What this rule checks |
| Severity | select | ✓ | Critical/High/Medium/Low |
| Device Types | multi-select | ✓ | Apply to devices |
| Rule Type | select | ✓ | Contains/NotContains/Regex |
| Pattern | text | ✓ | Search pattern |

### Example Rules

| Rule | Type | Pattern | Severity |
|------|------|---------|----------|
| No Telnet | NotContains | `transport input telnet` | Critical |
| SSH v2 Only | Contains | `ip ssh version 2` | High |
| NTP Configured | Contains | `ntp server` | Medium |
| SNMP v3 | Regex | `snmp-server group.*v3` | High |

### Compliance Report

```
┌────────────────────────────────────────────────────────────────┐
│  Compliance Report - January 2024                              │
├────────────────────────────────────────────────────────────────┤
│  Overall Score: 87%                                            │
│                                                                │
│  ┌────────────────────────────────────────────────────────┐   │
│  │ Rule               │ Compliant │ Non-Compliant│ Score │   │
│  ├────────────────────┼───────────┼──────────────┼───────┤   │
│  │ No Telnet          │ 175       │ 5            │ 97%   │   │
│  │ SSH v2 Only        │ 180       │ 0            │ 100%  │   │
│  │ NTP Configured     │ 165       │ 15           │ 92%   │   │
│  │ SNMP v3            │ 140       │ 40           │ 78%   │   │
│  └────────────────────────────────────────────────────────┘   │
│                                                                │
│  Non-Compliant Devices:                                        │
│  • SW-ACC-15: No Telnet, SNMP v3                               │
│  • SW-ACC-22: SNMP v3                                          │
│  • RT-BRANCH-03: NTP, SNMP v3                                  │
└────────────────────────────────────────────────────────────────┘
```

---

## API Endpoints

### List Devices
```http
GET /api/v1/network/devices?type=switch&vendor=cisco
Authorization: Bearer {token}
```

### Backup Config
```http
POST /api/v1/network/devices/{id}/backup
Authorization: Bearer {token}
```

### Get Config
```http
GET /api/v1/network/devices/{id}/configs/{version}
Authorization: Bearer {token}
```

### Compare Configs
```http
GET /api/v1/network/devices/{id}/configs/compare?v1=1.0.44&v2=1.0.45
Authorization: Bearer {token}
```

### Deploy Config
```http
POST /api/v1/network/devices/{id}/deploy
Authorization: Bearer {token}
Content-Type: application/json

{
  "config": "interface Gi1/5\n description New Server\n...",
  "change_id": "uuid"
}
```

### Run Compliance Check
```http
POST /api/v1/network/compliance/check
Authorization: Bearer {token}
Content-Type: application/json

{
  "device_ids": ["uuid1", "uuid2"],
  "rule_ids": ["uuid3", "uuid4"]
}
```

---

## Best Practices

1. **Regular Backups**: Enable auto-backup for all devices
2. **Change Control**: Always use change requests
3. **Template Usage**: Use templates for consistency
4. **Compliance Checks**: Run weekly compliance scans
5. **Version Control**: Keep config history for audit

## Related Modules

- [CMDB](./CMDB.md) - Device CI records
- [Maintenance](./MAINTENANCE.md) - Device maintenance
- [Assets](./ASSETS.md) - Physical asset tracking
