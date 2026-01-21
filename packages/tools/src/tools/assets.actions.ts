import type { ToolDefinition, ToolContext } from '../ToolRegistry.js'

const API_BASE_URL = process.env.ASSET_API_BASE_URL
    ?? process.env.API_BASE_URL
    ?? 'http://localhost:3000'

const WRITE_ROLES = ['it_asset_manager', 'admin', 'super_admin']

function buildHeaders(context: ToolContext): Headers {
    const headers = new Headers()
    headers.set('x-user-id', context.userId)
    headers.set('x-correlation-id', context.correlationId)
    const role = (context as ToolContext & { role?: string }).role
    if (role) {
        headers.set('x-user-role', role)
    }
    return headers
}

function assertRole(context: ToolContext): void {
    const role = (context as ToolContext & { role?: string }).role
    if (role && !WRITE_ROLES.includes(role)) {
        throw new Error('Forbidden')
    }
}

async function apiPost(path: string, body: unknown, context: ToolContext): Promise<unknown> {
    const headers = buildHeaders(context)
    headers.set('Content-Type', 'application/json')
    const response = await fetch(`${API_BASE_URL}${path}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
    })
    if (!response.ok) {
        throw new Error(await response.text())
    }
    return response.json()
}

export const createAssetTool: ToolDefinition = {
    name: 'create_asset',
    description: 'Create a new IT asset',
    inputSchema: {
        type: 'object',
        properties: {
            assetCode: { type: 'string' },
            modelId: { type: 'string' },
            status: { type: 'string' },
            vendorId: { type: 'string' },
            locationId: { type: 'string' },
            serialNo: { type: 'string' },
            macAddress: { type: 'string' },
            mgmtIp: { type: 'string' },
            hostname: { type: 'string' },
            vlanId: { type: 'number' },
            switchName: { type: 'string' },
            switchPort: { type: 'string' },
            purchaseDate: { type: 'string' },
            warrantyEnd: { type: 'string' },
            notes: { type: 'string' }
        },
        required: ['assetCode', 'modelId'],
        additionalProperties: false
    },
    requiresAuth: true,
    requiredRole: 'it_asset_manager',
    async execute(args: {
        assetCode: string
        modelId: string
        status?: string
        vendorId?: string
        locationId?: string
        serialNo?: string
        macAddress?: string
        mgmtIp?: string
        hostname?: string
        vlanId?: number
        switchName?: string
        switchPort?: string
        purchaseDate?: string
        warrantyEnd?: string
        notes?: string
    }, context: ToolContext) {
        assertRole(context)
        return apiPost('/v1/assets', args, context)
    }
}

export const assignAssetTool: ToolDefinition = {
    name: 'assign_asset',
    description: 'Assign an asset to a person, department, or system',
    inputSchema: {
        type: 'object',
        properties: {
            assetId: { type: 'string' },
            assigneeType: { type: 'string' },
            assigneeId: { type: 'string' },
            assigneeName: { type: 'string' },
            assignedAt: { type: 'string' },
            note: { type: 'string' }
        },
        required: ['assetId', 'assigneeType', 'assigneeId', 'assigneeName'],
        additionalProperties: false
    },
    requiresAuth: true,
    requiredRole: 'it_asset_manager',
    async execute(args: {
        assetId: string
        assigneeType: string
        assigneeId: string
        assigneeName: string
        assignedAt?: string
        note?: string
    }, context: ToolContext) {
        assertRole(context)
        const { assetId, ...payload } = args
        return apiPost(`/v1/assets/${encodeURIComponent(assetId)}/assign`, payload, context)
    }
}

export const openMaintenanceTicketTool: ToolDefinition = {
    name: 'open_maintenance_ticket',
    description: 'Open a maintenance ticket for an asset',
    inputSchema: {
        type: 'object',
        properties: {
            assetId: { type: 'string' },
            title: { type: 'string' },
            severity: { type: 'string' },
            diagnosis: { type: 'string' },
            resolution: { type: 'string' }
        },
        required: ['assetId', 'title', 'severity'],
        additionalProperties: false
    },
    requiresAuth: true,
    requiredRole: 'it_asset_manager',
    async execute(args: {
        assetId: string
        title: string
        severity: string
        diagnosis?: string
        resolution?: string
    }, context: ToolContext) {
        assertRole(context)
        return apiPost('/v1/maintenance', args, context)
    }
}

export const createMaintenanceTicketTool = openMaintenanceTicketTool

export const createInventorySessionTool: ToolDefinition = {
    name: 'create_inventory_session',
    description: 'Create a new inventory session',
    inputSchema: {
        type: 'object',
        properties: {
            name: { type: 'string' },
            locationId: { type: 'string' },
            startedAt: { type: 'string' },
            status: { type: 'string' }
        },
        required: ['name'],
        additionalProperties: false
    },
    requiresAuth: true,
    requiredRole: 'it_asset_manager',
    async execute(args: {
        name: string
        locationId?: string
        startedAt?: string
        status?: string
    }, context: ToolContext) {
        assertRole(context)
        return apiPost('/v1/inventory/sessions', args, context)
    }
}

export const scanInventoryAssetTool: ToolDefinition = {
    name: 'scan_inventory_asset',
    description: 'Scan an asset during an inventory session',
    inputSchema: {
        type: 'object',
        properties: {
            sessionId: { type: 'string' },
            assetId: { type: 'string' },
            assetCode: { type: 'string' },
            scannedLocationId: { type: 'string' },
            note: { type: 'string' }
        },
        required: ['sessionId'],
        anyOf: [{ required: ['assetId'] }, { required: ['assetCode'] }],
        additionalProperties: false
    },
    requiresAuth: true,
    requiredRole: 'it_asset_manager',
    async execute(args: {
        sessionId: string
        assetId?: string
        assetCode?: string
        scannedLocationId?: string
        note?: string
    }, context: ToolContext) {
        assertRole(context)
        const { sessionId, ...payload } = args
        return apiPost(`/v1/inventory/sessions/${encodeURIComponent(sessionId)}/scan`, payload, context)
    }
}

export const submitWorkflowRequestTool: ToolDefinition = {
    name: 'submit_workflow_request',
    description: 'Submit a workflow request for asset operations',
    inputSchema: {
        type: 'object',
        properties: {
            requestType: { type: 'string' },
            assetId: { type: 'string' },
            fromDept: { type: 'string' },
            toDept: { type: 'string' },
            payload: { type: 'object' }
        },
        required: ['requestType'],
        additionalProperties: false
    },
    requiresAuth: true,
    requiredRole: 'it_asset_manager',
    async execute(args: {
        requestType: string
        assetId?: string
        fromDept?: string
        toDept?: string
        payload?: Record<string, unknown>
    }, context: ToolContext) {
        assertRole(context)
        return apiPost('/v1/workflows', args, context)
    }
}
