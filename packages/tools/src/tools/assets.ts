import type { ToolDefinition, ToolContext } from '../ToolRegistry.js'

const API_BASE_URL = process.env.ASSET_API_BASE_URL
    ?? process.env.API_BASE_URL
    ?? 'http://localhost:3000'

function buildQuery(params: Record<string, string | number | undefined>): string {
    const entries = Object.entries(params).filter(([, value]) => value !== undefined && value !== '')
    if (entries.length === 0) return ''
    const query = entries
        .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
        .join('&')
    return `?${query}`
}

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

async function apiGet(path: string, context: ToolContext): Promise<unknown> {
    const response = await fetch(`${API_BASE_URL}${path}`, { headers: buildHeaders(context) })
    if (!response.ok) {
        throw new Error(await response.text())
    }
    return response.json()
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

export const searchAssetsTool: ToolDefinition = {
    name: 'search_assets',
    description: 'Search assets with filters and pagination',
    inputSchema: {
        type: 'object',
        properties: {
            query: { type: 'string' },
            status: { type: 'string' },
            categoryId: { type: 'string' },
            modelId: { type: 'string' },
            vendorId: { type: 'string' },
            locationId: { type: 'string' },
            warrantyExpiringDays: { type: 'number' },
            page: { type: 'number' },
            limit: { type: 'number' },
            sort: { type: 'string' }
        },
        additionalProperties: false
    },
    requiresAuth: true,
    async execute(args: {
        query?: string
        status?: string
        categoryId?: string
        modelId?: string
        vendorId?: string
        locationId?: string
        warrantyExpiringDays?: number
        page?: number
        limit?: number
        sort?: string
    }, context: ToolContext) {
        const query = buildQuery(args)
        return apiGet(`/v1/assets${query}`, context)
    }
}

export const getAssetDetailTool: ToolDefinition = {
    name: 'get_asset_detail',
    description: 'Get asset detail with assignments and maintenance',
    inputSchema: {
        type: 'object',
        properties: {
            assetId: { type: 'string' }
        },
        required: ['assetId'],
        additionalProperties: false
    },
    requiresAuth: true,
    async execute(args: { assetId: string }, context: ToolContext) {
        return apiGet(`/v1/assets/${encodeURIComponent(args.assetId)}`, context)
    }
}

export const assetTimelineTool: ToolDefinition = {
    name: 'asset_timeline',
    description: 'Get asset timeline events',
    inputSchema: {
        type: 'object',
        properties: {
            assetId: { type: 'string' },
            page: { type: 'number' },
            limit: { type: 'number' }
        },
        required: ['assetId'],
        additionalProperties: false
    },
    requiresAuth: true,
    async execute(args: { assetId: string; page?: number; limit?: number }, context: ToolContext) {
        const query = buildQuery({ page: args.page, limit: args.limit })
        return apiGet(`/v1/assets/${encodeURIComponent(args.assetId)}/timeline${query}`, context)
    }
}

export const listWarrantyExpiringTool: ToolDefinition = {
    name: 'list_warranty_expiring',
    description: 'List assets with warranty expiring within a number of days',
    inputSchema: {
        type: 'object',
        properties: {
            warrantyExpiringDays: { type: 'number' },
            page: { type: 'number' },
            limit: { type: 'number' }
        },
        required: ['warrantyExpiringDays'],
        additionalProperties: false
    },
    requiresAuth: true,
    async execute(args: { warrantyExpiringDays: number; page?: number; limit?: number }, context: ToolContext) {
        const query = buildQuery({
            warrantyExpiringDays: args.warrantyExpiringDays,
            page: args.page,
            limit: args.limit
        })
        return apiGet(`/v1/assets${query}`, context)
    }
}
