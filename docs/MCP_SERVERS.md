# MCP Servers

Model Context Protocol (MCP) server implementations for specialized integrations.

## Table of Contents

- [Overview](#overview)
- [Available MCP Servers](#available-mcp-servers)
- [Log Aggregator](#log-aggregator)
- [SQL Operations](#sql-operations)
- [Network Change](#network-change)
- [Asset Inventory](#asset-inventory)
- [FortiGate](#fortigate)
- [Zabbix](#zabbix)
- [Creating MCP Servers](#creating-mcp-servers)

---

## Overview

MCP Servers provide specialized functionality through the Model Context Protocol:

- **Standardized Interface** – Consistent tool/resource exposure
- **Isolated Execution** – Separate process for each server
- **Permission Model** – Role-based access control
- **Schema Validation** – Type-safe inputs/outputs

Location: `packages/mcp-servers/core/`

### Architecture

```
                    ┌─────────────────┐
                    │   MCP Gateway   │
                    │  (gateway-mcp)  │
                    └────────┬────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
┌───────┴───────┐   ┌────────┴────────┐   ┌──────┴──────┐
│ Log Aggregator│   │   SQL Ops       │   │   NetChange │
│               │   │                 │   │             │
│ - search_logs │   │ - execute_query │   │ - apply_cfg │
│ - tail_logs   │   │ - get_schema    │   │ - rollback  │
└───────────────┘   └─────────────────┘   └─────────────┘
```

---

## Available MCP Servers

| Server | Path | Purpose |
|--------|------|---------|
| `log-aggregator` | `mcp-servers/core/log-aggregator` | Log search and aggregation |
| `sql-ops` | `mcp-servers/core/sql-ops` | SQL query execution |
| `network-change` | `mcp-servers/core/network-change` | Network configuration |
| `asset-inventory` | `mcp-servers/core/asset-inventory` | Asset management |
| `fortigate` | `mcp-servers/core/fortigate` | FortiGate firewall |
| `zabbix` | `mcp-servers/core/zabbix` | Zabbix monitoring |
| `syslog` | `mcp-servers/core/syslog` | Syslog receiver |
| `config-validator` | `mcp-servers/core/config-validator` | Config validation |
| `compliance-doc` | `mcp-servers/core/compliance-doc` | Compliance docs |

---

## Log Aggregator

Search and aggregate logs from various sources.

### Tools

#### `search_logs`

Search logs by pattern, time range, and source.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "query": { "type": "string", "description": "Search pattern" },
    "source": { "type": "string", "description": "Log source filter" },
    "level": { 
      "type": "string", 
      "enum": ["debug", "info", "warn", "error"] 
    },
    "startTime": { "type": "string", "format": "date-time" },
    "endTime": { "type": "string", "format": "date-time" },
    "limit": { "type": "integer", "default": 100 }
  },
  "required": ["query"]
}
```

**Example:**
```json
{
  "query": "error",
  "source": "api",
  "level": "error",
  "startTime": "2025-01-20T00:00:00Z",
  "limit": 50
}
```

#### `aggregate_logs`

Get log statistics and counts.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "groupBy": { 
      "type": "string", 
      "enum": ["level", "source", "hour", "day"] 
    },
    "startTime": { "type": "string", "format": "date-time" },
    "endTime": { "type": "string", "format": "date-time" }
  },
  "required": ["groupBy"]
}
```

---

## SQL Operations

Execute safe SQL queries against the database.

### Tools

#### `execute_readonly_query`

Execute SELECT queries (read-only).

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "query": { "type": "string", "description": "SQL SELECT query" },
    "params": { "type": "array", "description": "Query parameters" },
    "limit": { "type": "integer", "default": 100, "maximum": 1000 }
  },
  "required": ["query"]
}
```

**Example:**
```json
{
  "query": "SELECT * FROM assets WHERE status = $1 LIMIT $2",
  "params": ["in_use", 10]
}
```

**Security:**
- Only SELECT statements allowed
- Query timeout enforced
- Result set limited
- Requires admin role

#### `get_table_schema`

Get table structure information.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "tableName": { "type": "string" }
  },
  "required": ["tableName"]
}
```

**Output:**
```json
{
  "columns": [
    { "name": "id", "type": "uuid", "nullable": false },
    { "name": "name", "type": "varchar", "nullable": false },
    { "name": "created_at", "type": "timestamptz", "nullable": true }
  ],
  "indexes": ["idx_assets_status"]
}
```

---

## Network Change

Apply and manage network configuration changes.

### Tools

#### `backup_config`

Backup current device configuration.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "deviceId": { "type": "string" },
    "description": { "type": "string" }
  },
  "required": ["deviceId"]
}
```

#### `apply_config_change`

Apply configuration change to device.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "deviceId": { "type": "string" },
    "changeType": { 
      "type": "string",
      "enum": ["interface", "routing", "acl", "vlan", "other"]
    },
    "commands": { 
      "type": "array", 
      "items": { "type": "string" }
    },
    "backupFirst": { "type": "boolean", "default": true }
  },
  "required": ["deviceId", "changeType", "commands"]
}
```

**Example:**
```json
{
  "deviceId": "router-01",
  "changeType": "interface",
  "commands": [
    "interface GigabitEthernet0/1",
    "description Uplink to Core",
    "ip address 10.0.0.1 255.255.255.0",
    "no shutdown"
  ],
  "backupFirst": true
}
```

#### `rollback_config`

Rollback to previous configuration.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "deviceId": { "type": "string" },
    "versionId": { "type": "string", "description": "Version to rollback to" }
  },
  "required": ["deviceId"]
}
```

### Permission Model

| Tool | Required Role | Side Effects |
|------|---------------|--------------|
| `backup_config` | user | None (read) |
| `apply_config_change` | admin | Yes (write) |
| `rollback_config` | admin | Yes (write) |

---

## Asset Inventory

Manage IT assets and inventory.

### Tools

#### `search_assets`

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "query": { "type": "string" },
    "status": { "type": "string" },
    "categoryId": { "type": "string", "format": "uuid" },
    "locationId": { "type": "string", "format": "uuid" },
    "limit": { "type": "integer", "default": 20 }
  }
}
```

#### `get_asset_details`

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "assetId": { "type": "string", "format": "uuid" }
  },
  "required": ["assetId"]
}
```

#### `update_asset_status`

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "assetId": { "type": "string", "format": "uuid" },
    "status": {
      "type": "string",
      "enum": ["in_stock", "in_use", "in_repair", "retired", "disposed", "lost"]
    },
    "note": { "type": "string" }
  },
  "required": ["assetId", "status"]
}
```

---

## FortiGate

Integration with FortiGate firewalls.

### Environment Variables

```dotenv
FORTIGATE_API_URL=https://fortigate.local
FORTIGATE_API_TOKEN=your-token
```

### Tools

#### `get_firewall_policies`

List firewall policies.

#### `get_interface_status`

Get interface status and statistics.

#### `get_vpn_tunnels`

List VPN tunnel status.

#### `get_threat_logs`

Search threat/IPS logs.

---

## Zabbix

Integration with Zabbix monitoring.

### Environment Variables

```dotenv
ZABBIX_API_URL=http://zabbix.local/api_jsonrpc.php
ZABBIX_API_TOKEN=your-token
```

### Tools

#### `get_host_status`

Get host status from Zabbix.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "hostname": { "type": "string" }
  },
  "required": ["hostname"]
}
```

#### `get_host_problems`

Get active problems for a host.

#### `get_host_metrics`

Get performance metrics (CPU, memory, disk, etc.).

---

## Creating MCP Servers

### Step 1: Create Server Directory

```bash
mkdir packages/mcp-servers/core/my-server
cd packages/mcp-servers/core/my-server
```

### Step 2: Define Package

```json
// package.json
{
  "name": "mcp-my-server",
  "version": "1.0.0",
  "type": "module",
  "main": "dist/index.js",
  "scripts": {
    "build": "tsup src/index.ts --format esm",
    "dev": "tsx src/index.ts"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.0"
  }
}
```

### Step 3: Implement Server

```typescript
// src/index.ts
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'

const server = new Server({
  name: 'my-server',
  version: '1.0.0'
})

// Register tools
server.setRequestHandler('tools/list', async () => ({
  tools: [
    {
      name: 'my_tool',
      description: 'Description for LLM',
      inputSchema: {
        type: 'object',
        properties: {
          param: { type: 'string' }
        },
        required: ['param']
      }
    }
  ]
}))

server.setRequestHandler('tools/call', async (request) => {
  const { name, arguments: args } = request.params
  
  if (name === 'my_tool') {
    const result = await doSomething(args.param)
    return { content: [{ type: 'text', text: JSON.stringify(result) }] }
  }
  
  throw new Error(`Unknown tool: ${name}`)
})

// Start server
const transport = new StdioServerTransport()
await server.connect(transport)
```

### Step 4: Register in Gateway

Add to MCP gateway configuration in `apps/gateway-mcp/`:

```typescript
// Register the new server
const myServer = await spawn('node', ['packages/mcp-servers/core/my-server/dist/index.js'])
```

---

## Next Steps

- 🛠️ [Tools Guide](TOOLS.md) – Tool registry
- 🔌 [API Reference](API.md) – REST endpoints
- 🚀 [Deployment](DEPLOYMENT.md) – Production setup
