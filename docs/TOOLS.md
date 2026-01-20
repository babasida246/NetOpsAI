# Tools Registry

Guide for using and creating tools in NetOpsAI Gateway.

## Table of Contents

- [Overview](#overview)
- [Tool Registry](#tool-registry)
- [Using Tools](#using-tools)
- [Built-in Tools](#built-in-tools)
- [Creating New Tools](#creating-new-tools)
- [Schema Validation](#schema-validation)
- [Execution Strategies](#execution-strategies)
- [Security & Permissions](#security--permissions)

---

## Overview

The Tool Registry provides a mechanism for:

- **AI Tool Calling** – LLM models can invoke tools during conversations
- **Schema Validation** – AJV-based JSON Schema validation
- **Timeout & Retry** – Configurable execution strategies
- **Permission Control** – Role-based tool access

Location: `packages/tools/src/ToolRegistry.ts`

---

## Tool Registry

### Architecture

```
ToolRegistry
├── register(tool)     → Add tool definition
├── get(name)          → Get tool by name
├── list()             → List all tools
├── invoke(name, args) → Execute tool
└── getExecutionStats() → Get stats
```

### Tool Definition Interface

```typescript
interface ToolDefinition {
  name: string                           // Unique tool name
  description?: string                   // Tool description for LLM
  inputSchema?: JSONSchema               // Input validation schema
  outputSchema?: JSONSchema              // Output validation schema
  execute: (args: any, ctx: ToolContext) => Promise<any>
  strategy?: 'retry' | 'fail-fast' | 'best-effort'
  timeout?: number                       // ms, default 30000
  requiresAuth?: boolean                 // Require authenticated user
  requiredRole?: string                  // Required user role
}

interface ToolContext {
  userId: string
  correlationId: string
  logger?: any
}
```

---

## Using Tools

### In Chat Conversations

Tools are automatically available when using function-capable models:

```json
POST /api/chat/messages
{
  "message": "What's the current CPU usage on server-01?",
  "model": "openai/gpt-4o"
}
```

The LLM will:
1. Analyze the request
2. Decide to call `get_device_metrics` tool
3. Execute the tool via ToolRegistry
4. Return results in the response

### Direct Tool Invocation

```typescript
import { ToolRegistry } from '@tools/registry'

const registry = new ToolRegistry()

const result = await registry.invoke(
  'get_device_status',
  { deviceId: 'router-01' },
  { userId: 'user-123', correlationId: 'req-456' }
)
```

---

## Built-in Tools

### Network Operations

| Tool | Description |
|------|-------------|
| `get_device_status` | Get device status from Zabbix |
| `get_device_interfaces` | List device network interfaces |
| `get_device_metrics` | Get performance metrics |
| `backup_device_config` | Backup device configuration |
| `apply_config_change` | Apply configuration change |

### Asset Management

| Tool | Description |
|------|-------------|
| `search_assets` | Search assets by criteria |
| `get_asset_details` | Get detailed asset info |
| `update_asset_status` | Update asset status |
| `create_maintenance_ticket` | Create new ticket |

### SQL Operations

| Tool | Description |
|------|-------------|
| `execute_readonly_query` | Run SELECT queries |
| `get_table_schema` | Get table structure |

### Log Operations

| Tool | Description |
|------|-------------|
| `search_logs` | Search logs by pattern |
| `aggregate_logs` | Get log statistics |

---

## Creating New Tools

### Step 1: Define the Tool

Create a new file in `packages/tools/src/tools/`:

```typescript
// packages/tools/src/tools/my-tool.ts
import type { ToolDefinition, ToolContext } from '../ToolRegistry.js'

export const myTool: ToolDefinition = {
  name: 'my_custom_tool',
  description: 'Description for LLM to understand when to use this tool',
  
  inputSchema: {
    type: 'object',
    properties: {
      query: { type: 'string', minLength: 1 },
      limit: { type: 'integer', minimum: 1, maximum: 100, default: 10 }
    },
    required: ['query'],
    additionalProperties: false
  },
  
  outputSchema: {
    type: 'object',
    properties: {
      results: { type: 'array', items: { type: 'object' } },
      total: { type: 'integer' }
    }
  },
  
  strategy: 'fail-fast',
  timeout: 10000,
  requiresAuth: true,
  requiredRole: 'user',
  
  async execute(args: { query: string; limit?: number }, ctx: ToolContext) {
    const { query, limit = 10 } = args
    
    // Your tool logic here
    ctx.logger?.info({ query, limit }, 'Executing my_custom_tool')
    
    const results = await someService.search(query, limit)
    
    return {
      results,
      total: results.length
    }
  }
}
```

### Step 2: Register the Tool

In `packages/tools/src/index.ts`:

```typescript
import { ToolRegistry } from './ToolRegistry.js'
import { myTool } from './tools/my-tool.js'

const registry = new ToolRegistry()

// Register built-in tools
registry.register(myTool)

export { registry, ToolRegistry }
```

### Step 3: Test the Tool

```typescript
// packages/tools/src/tools/my-tool.test.ts
import { describe, it, expect } from 'vitest'
import { ToolRegistry } from '../ToolRegistry.js'
import { myTool } from './my-tool.js'

describe('myTool', () => {
  it('should execute with valid input', async () => {
    const registry = new ToolRegistry()
    registry.register(myTool)
    
    const result = await registry.invoke(
      'my_custom_tool',
      { query: 'test', limit: 5 },
      { userId: 'test-user', correlationId: 'test-123' }
    )
    
    expect(result.success).toBe(true)
    expect(result.output.results).toBeDefined()
  })
  
  it('should reject invalid input', async () => {
    const registry = new ToolRegistry()
    registry.register(myTool)
    
    await expect(
      registry.invoke('my_custom_tool', { query: '' }, { userId: 'test', correlationId: 'test' })
    ).rejects.toThrow('Invalid tool arguments')
  })
})
```

---

## Schema Validation

The ToolRegistry uses AJV for JSON Schema validation:

### Supported Validation Features

```json
{
  "type": "object",
  "properties": {
    "name": { 
      "type": "string", 
      "minLength": 1, 
      "maxLength": 100 
    },
    "count": { 
      "type": "integer", 
      "minimum": 0, 
      "maximum": 1000 
    },
    "email": { 
      "type": "string", 
      "format": "email" 
    },
    "ip": { 
      "type": "string", 
      "format": "ipv4" 
    },
    "status": { 
      "type": "string", 
      "enum": ["active", "inactive", "pending"] 
    },
    "tags": { 
      "type": "array", 
      "items": { "type": "string" },
      "uniqueItems": true
    }
  },
  "required": ["name"],
  "additionalProperties": false
}
```

### AJV Formats Available

- `email`
- `uri`
- `uuid`
- `date`
- `date-time`
- `ipv4`
- `ipv6`
- `hostname`
- `regex`

---

## Execution Strategies

### fail-fast (default)

Throws error immediately on failure. Use for critical operations.

```typescript
{
  strategy: 'fail-fast',
  execute: async (args) => {
    // If this throws, caller gets the error
    return await criticalOperation(args)
  }
}
```

### retry

Automatically retry on transient failures (not yet implemented, planned).

```typescript
{
  strategy: 'retry',
  retryCount: 3,
  retryDelay: 1000
}
```

### best-effort

Returns partial result on failure instead of throwing.

```typescript
{
  strategy: 'best-effort',
  execute: async (args) => {
    // On error, returns { success: false, error: "message" }
    return await nonCriticalOperation(args)
  }
}
```

---

## Security & Permissions

### Authentication

```typescript
{
  requiresAuth: true,
  execute: async (args, ctx) => {
    // ctx.userId is guaranteed to exist
    const user = await getUser(ctx.userId)
    return doSomething(user, args)
  }
}
```

### Role-Based Access

```typescript
{
  requiresAuth: true,
  requiredRole: 'admin',
  execute: async (args, ctx) => {
    // Only admin users can execute
    return adminOnlyOperation(args)
  }
}
```

### Available Roles

| Role | Access Level |
|------|--------------|
| `user` | Basic tools |
| `admin` | Admin tools + user tools |
| `super_admin` | All tools |

### Audit Logging

Tool executions are logged for auditing:

```typescript
{
  execute: async (args, ctx) => {
    ctx.logger?.info({ 
      tool: 'sensitive_tool',
      userId: ctx.userId,
      correlationId: ctx.correlationId,
      args: sanitize(args)
    }, 'Tool executed')
    
    return result
  }
}
```

---

## Execution Stats

Get tool execution statistics:

```typescript
const stats = registry.getExecutionStats()
// {
//   "my_custom_tool": { total: 100, success: 95, failure: 5 },
//   "get_device_status": { total: 50, success: 48, failure: 2 }
// }
```

---

## Next Steps

- 📡 [MCP Servers](MCP_SERVERS.md) – Protocol servers
- 🔌 [API Reference](API.md) – REST endpoints
- 🏗️ [Architecture](ARCHITECTURE.md) – System design
