/**
 * Context Builder
 * Builds token-efficient NetOpsContextPack for LLM consumption
 */

import type { Pool } from 'pg'
import { createHash } from 'crypto'
import type {
    NetOpsContextPack,
    OrchestrationScope,
    PromptHistoryEntry,
    ChangeHistoryEntry,
    NetworkSnapshot,
    DeviceContextEntry,
    PolicyContextEntry,
    SourceReference,
    RiskLevel
} from './types.js'

// ====================
// CONFIGURATION
// ====================

const CONTEXT_CONFIG = {
    // Token budgets (approximate)
    maxTotalTokens: 8000,
    maxPromptHistoryTokens: 1500,
    maxChangeHistoryTokens: 1000,
    maxNetworkSnapshotTokens: 500,
    maxDevicesContextTokens: 3000,
    maxPolicyContextTokens: 1500,
    maxSourceRefsTokens: 500,

    // Limits
    maxPromptHistoryEntries: 10,
    maxChangeHistoryEntries: 20,
    maxDevicesInContext: 50,
    maxRulesPerPack: 100,
    maxSourceRefs: 30,

    // Cache TTL (ms)
    cacheTTL: 5 * 60 * 1000, // 5 minutes

    // Token estimation (chars per token, rough)
    charsPerToken: 4
}

// ====================
// SCOPE RESOLVER
// ====================

export interface ScopeResolverOptions {
    intent: string
    intentParams?: Record<string, unknown>
    explicitScope?: Partial<OrchestrationScope>
}

/**
 * Resolve scope from intent and explicit parameters
 * Deterministic - no LLM calls
 */
export async function resolveScope(
    db: Pool,
    options: ScopeResolverOptions
): Promise<OrchestrationScope> {
    const scope: OrchestrationScope = {
        deviceIds: [],
        sites: [],
        roles: [],
        vendors: [],
        tags: []
    }

    // 1. Apply explicit scope if provided
    if (options.explicitScope) {
        if (options.explicitScope.deviceIds?.length) {
            scope.deviceIds = options.explicitScope.deviceIds
        }
        if (options.explicitScope.sites?.length) {
            scope.sites = options.explicitScope.sites
        }
        if (options.explicitScope.roles?.length) {
            scope.roles = options.explicitScope.roles
        }
        if (options.explicitScope.vendors?.length) {
            scope.vendors = options.explicitScope.vendors
        }
        if (options.explicitScope.tags?.length) {
            scope.tags = options.explicitScope.tags
        }
    }

    // 2. Extract scope from intent params
    const params = options.intentParams || {}

    if (params.deviceIds && Array.isArray(params.deviceIds)) {
        scope.deviceIds = [...new Set([...scope.deviceIds, ...params.deviceIds as string[]])]
    }
    if (params.deviceId && typeof params.deviceId === 'string') {
        scope.deviceIds = [...new Set([...scope.deviceIds, params.deviceId])]
    }
    if (params.site && typeof params.site === 'string') {
        scope.sites = [...new Set([...scope.sites, params.site])]
    }
    if (params.sites && Array.isArray(params.sites)) {
        scope.sites = [...new Set([...scope.sites, ...params.sites as string[]])]
    }
    if (params.vendor && typeof params.vendor === 'string') {
        scope.vendors = [...new Set([...scope.vendors, params.vendor])]
    }
    if (params.role && typeof params.role === 'string') {
        scope.roles = [...new Set([...scope.roles, params.role])]
    }

    // 3. If no explicit devices but have filters, resolve device IDs
    if (scope.deviceIds.length === 0 && (scope.sites.length || scope.roles.length || scope.vendors.length || scope.tags.length)) {
        const conditions: string[] = ['status = $1']
        const params: unknown[] = ['active']
        let idx = 2

        if (scope.sites.length) {
            conditions.push(`site = ANY($${idx++})`)
            params.push(scope.sites)
        }
        if (scope.roles.length) {
            conditions.push(`role = ANY($${idx++})`)
            params.push(scope.roles)
        }
        if (scope.vendors.length) {
            conditions.push(`vendor = ANY($${idx++})`)
            params.push(scope.vendors)
        }
        if (scope.tags.length) {
            conditions.push(`tags ?| $${idx++}`)
            params.push(scope.tags)
        }

        const result = await db.query(
            `SELECT id FROM net_devices WHERE ${conditions.join(' AND ')} LIMIT 100`,
            params
        )
        scope.deviceIds = result.rows.map(r => r.id)
    }

    return scope
}

// ====================
// CONFIG DIGEST
// ====================

export interface ConfigDigest {
    deviceId: string
    hostname: string
    vendor: string
    sections: string[]
    interfaceCount: number
    vlanCount: number
    aclCount: number
    routeCount: number
    hash: string
}

/**
 * Compute deterministic config digest for a device
 */
export async function computeConfigDigest(
    db: Pool,
    deviceId: string
): Promise<ConfigDigest | null> {
    // Get latest config
    const result = await db.query(
        `SELECT cv.normalized_config, d.hostname, d.vendor
         FROM net_config_versions cv
         JOIN net_devices d ON d.id = cv.device_id
         WHERE cv.device_id = $1
         ORDER BY cv.collected_at DESC
         LIMIT 1`,
        [deviceId]
    )

    if (result.rows.length === 0) {
        return null
    }

    const { normalized_config, hostname, vendor } = result.rows[0]

    if (!normalized_config) {
        return {
            deviceId,
            hostname,
            vendor,
            sections: [],
            interfaceCount: 0,
            vlanCount: 0,
            aclCount: 0,
            routeCount: 0,
            hash: 'no-config'
        }
    }

    const config = normalized_config

    // Extract counts from normalized config
    const interfaceCount = Array.isArray(config.interfaces) ? config.interfaces.length : 0
    const vlanCount = Array.isArray(config.vlans) ? config.vlans.length : 0
    const aclCount = config.security?.acls ? config.security.acls.length : 0
    const routeCount = (config.routing?.static?.length || 0) +
        (config.routing?.ospf?.length || 0) +
        (config.routing?.bgp?.length || 0)

    // Identify present sections
    const sections: string[] = []
    if (interfaceCount > 0) sections.push('interfaces')
    if (vlanCount > 0) sections.push('vlans')
    if (aclCount > 0) sections.push('acls')
    if (routeCount > 0) sections.push('routing')
    if (config.security?.users?.length) sections.push('users')
    if (config.security?.aaa) sections.push('aaa')
    if (config.mgmt?.ssh) sections.push('ssh')
    if (config.mgmt?.snmp) sections.push('snmp')
    if (config.mgmt?.ntp) sections.push('ntp')
    if (config.mgmt?.logging) sections.push('logging')

    // Compute deterministic hash
    const hashInput = JSON.stringify({
        hostname,
        vendor,
        interfaceCount,
        vlanCount,
        aclCount,
        routeCount,
        sections: sections.sort()
    })
    const hash = createHash('sha256').update(hashInput).digest('hex').substring(0, 16)

    return {
        deviceId,
        hostname,
        vendor,
        sections,
        interfaceCount,
        vlanCount,
        aclCount,
        routeCount,
        hash
    }
}

/**
 * Compute delta digest between two config states
 */
export function computeDeltaDigest(
    before: ConfigDigest | null,
    after: ConfigDigest | null
): string {
    if (!before && !after) return 'no-change'
    if (!before) return 'new-config'
    if (!after) return 'removed-config'
    if (before.hash === after.hash) return 'no-change'

    const changes: string[] = []

    if (before.interfaceCount !== after.interfaceCount) {
        changes.push(`interfaces:${before.interfaceCount}→${after.interfaceCount}`)
    }
    if (before.vlanCount !== after.vlanCount) {
        changes.push(`vlans:${before.vlanCount}→${after.vlanCount}`)
    }
    if (before.aclCount !== after.aclCount) {
        changes.push(`acls:${before.aclCount}→${after.aclCount}`)
    }
    if (before.routeCount !== after.routeCount) {
        changes.push(`routes:${before.routeCount}→${after.routeCount}`)
    }

    const addedSections = after.sections.filter(s => !before.sections.includes(s))
    const removedSections = before.sections.filter(s => !after.sections.includes(s))

    if (addedSections.length) {
        changes.push(`+sections:[${addedSections.join(',')}]`)
    }
    if (removedSections.length) {
        changes.push(`-sections:[${removedSections.join(',')}]`)
    }

    return changes.length ? changes.join(';') : 'modified'
}

// ====================
// CONTEXT PACK BUILDER
// ====================

export interface BuildContextPackOptions {
    scope: OrchestrationScope
    intent: string
    conversationId?: string
    includePromptHistory?: boolean
}

/**
 * Build complete NetOpsContextPack
 */
export async function buildContextPack(
    db: Pool,
    options: BuildContextPackOptions
): Promise<NetOpsContextPack> {
    const now = new Date()
    const expiresAt = new Date(now.getTime() + CONTEXT_CONFIG.cacheTTL)

    // Build all sections in parallel
    const [
        promptHistory,
        changeHistory,
        networkSnapshot,
        devicesContext,
        policyContext
    ] = await Promise.all([
        options.includePromptHistory !== false
            ? buildPromptHistory(db, options.conversationId)
            : Promise.resolve([]),
        buildChangeHistory(db, options.scope),
        buildNetworkSnapshot(db),
        buildDevicesContext(db, options.scope),
        buildPolicyContext(db, options.scope)
    ])

    // Build source refs from devices and policies
    const sourceRefs = buildSourceRefs(devicesContext, policyContext)

    // Estimate tokens
    const tokenEstimates = estimateTokens({
        promptHistory,
        changeHistory,
        networkSnapshot,
        devicesContext,
        policyContext,
        sourceRefs
    })

    // Compute hash for cache invalidation
    const hashInput = JSON.stringify({
        scope: options.scope,
        networkSnapshot,
        devicesContextIds: devicesContext.map(d => d.id),
        policyContextIds: policyContext.map(p => p.id)
    })
    const hash = createHash('sha256').update(hashInput).digest('hex')

    return {
        version: 'v1',
        generatedAt: now,
        expiresAt,
        hash,
        promptHistory,
        changeHistory,
        networkSnapshot,
        devicesContext,
        policyContext,
        sourceRefs,
        tokenEstimates
    }
}

// ====================
// SECTION BUILDERS
// ====================

async function buildPromptHistory(
    db: Pool,
    conversationId?: string
): Promise<PromptHistoryEntry[]> {
    if (!conversationId) return []

    // Query recent messages from conversation
    const result = await db.query(
        `SELECT role, content, created_at
         FROM messages
         WHERE conversation_id = $1
         ORDER BY created_at DESC
         LIMIT $2`,
        [conversationId, CONTEXT_CONFIG.maxPromptHistoryEntries]
    )

    return result.rows.reverse().map(row => ({
        timestamp: row.created_at,
        role: row.role as 'user' | 'assistant',
        content: truncateString(row.content, 500),
        wasSuccessful: true
    }))
}

async function buildChangeHistory(
    db: Pool,
    scope: OrchestrationScope
): Promise<ChangeHistoryEntry[]> {
    const conditions: string[] = ['1=1']
    const params: unknown[] = []
    let idx = 1

    // Filter by scope if devices specified
    if (scope.deviceIds.length > 0) {
        conditions.push(`EXISTS (
            SELECT 1 FROM net_change_sets cs
            WHERE cs.change_request_id = cr.id
            AND cs.device_id = ANY($${idx++})
        )`)
        params.push(scope.deviceIds)
    }

    const result = await db.query(
        `SELECT cr.id, cr.title, cr.status, cr.risk_level,
                cr.created_at, cr.completed_at,
                (SELECT COUNT(*) FROM net_change_sets cs WHERE cs.change_request_id = cr.id) as device_count
         FROM net_change_requests cr
         WHERE ${conditions.join(' AND ')}
         ORDER BY cr.created_at DESC
         LIMIT $${idx}`,
        [...params, CONTEXT_CONFIG.maxChangeHistoryEntries]
    )

    return result.rows.map(row => ({
        changeId: row.id,
        title: row.title,
        status: row.status,
        riskLevel: (row.risk_level || 'medium') as RiskLevel,
        affectedDevices: parseInt(row.device_count, 10),
        createdAt: row.created_at,
        completedAt: row.completed_at,
        outcome: mapStatusToOutcome(row.status)
    }))
}

async function buildNetworkSnapshot(db: Pool): Promise<NetworkSnapshot> {
    // Get device counts by various dimensions
    const [
        totalResult,
        byVendorResult,
        bySiteResult,
        byRoleResult,
        byStatusResult,
        recentConfigsResult,
        activeChangesResult,
        pendingApprovalsResult
    ] = await Promise.all([
        db.query('SELECT COUNT(*) as count FROM net_devices'),
        db.query('SELECT vendor, COUNT(*) as count FROM net_devices GROUP BY vendor'),
        db.query('SELECT site, COUNT(*) as count FROM net_devices WHERE site IS NOT NULL GROUP BY site'),
        db.query('SELECT role, COUNT(*) as count FROM net_devices WHERE role IS NOT NULL GROUP BY role'),
        db.query('SELECT status, COUNT(*) as count FROM net_devices GROUP BY status'),
        db.query(`SELECT COUNT(*) as count FROM net_config_versions 
                  WHERE collected_at > NOW() - INTERVAL '24 hours'`),
        db.query(`SELECT COUNT(*) as count FROM net_change_requests 
                  WHERE status IN ('pending', 'in_progress', 'awaiting_approval')`),
        db.query(`SELECT COUNT(*) as count FROM net_change_requests 
                  WHERE status = 'awaiting_approval'`)
    ])

    return {
        totalDevices: parseInt(totalResult.rows[0].count, 10),
        devicesByVendor: Object.fromEntries(byVendorResult.rows.map(r => [r.vendor, parseInt(r.count, 10)])),
        devicesBySite: Object.fromEntries(bySiteResult.rows.map(r => [r.site, parseInt(r.count, 10)])),
        devicesByRole: Object.fromEntries(byRoleResult.rows.map(r => [r.role, parseInt(r.count, 10)])),
        devicesByStatus: Object.fromEntries(byStatusResult.rows.map(r => [r.status, parseInt(r.count, 10)])),
        recentConfigChanges: parseInt(recentConfigsResult.rows[0].count, 10),
        activeChanges: parseInt(activeChangesResult.rows[0].count, 10),
        pendingApprovals: parseInt(pendingApprovalsResult.rows[0].count, 10)
    }
}

async function buildDevicesContext(
    db: Pool,
    scope: OrchestrationScope
): Promise<DeviceContextEntry[]> {
    const conditions: string[] = ['1=1']
    const params: unknown[] = []
    let idx = 1

    if (scope.deviceIds.length > 0) {
        conditions.push(`d.id = ANY($${idx++})`)
        params.push(scope.deviceIds)
    } else {
        // Apply filters
        if (scope.sites.length) {
            conditions.push(`d.site = ANY($${idx++})`)
            params.push(scope.sites)
        }
        if (scope.roles.length) {
            conditions.push(`d.role = ANY($${idx++})`)
            params.push(scope.roles)
        }
        if (scope.vendors.length) {
            conditions.push(`d.vendor = ANY($${idx++})`)
            params.push(scope.vendors)
        }
    }

    const result = await db.query(
        `SELECT d.id, d.name, d.hostname, d.vendor, d.role, d.site, d.status,
                (SELECT cv.collected_at FROM net_config_versions cv 
                 WHERE cv.device_id = d.id ORDER BY cv.collected_at DESC LIMIT 1) as last_config_at
         FROM net_devices d
         WHERE ${conditions.join(' AND ')}
         ORDER BY d.name
         LIMIT $${idx}`,
        [...params, CONTEXT_CONFIG.maxDevicesInContext]
    )

    // Compute digests for each device
    const entries: DeviceContextEntry[] = []
    for (const row of result.rows) {
        const digest = await computeConfigDigest(db, row.id)
        entries.push({
            id: row.id,
            name: row.name,
            hostname: row.hostname,
            vendor: row.vendor,
            role: row.role || 'unknown',
            site: row.site || 'unknown',
            status: row.status,
            lastConfigAt: row.last_config_at,
            configDigest: digest?.hash || null
        })
    }

    return entries
}

async function buildPolicyContext(
    db: Pool,
    scope: OrchestrationScope
): Promise<PolicyContextEntry[]> {
    const conditions: string[] = ['1=1']
    const params: unknown[] = []
    let idx = 1

    // Filter by vendor if specified
    if (scope.vendors.length) {
        conditions.push(`(vendor = ANY($${idx++}) OR vendor = 'all')`)
        params.push(scope.vendors)
    }

    const result = await db.query(
        `SELECT id, name, vendor, rules
         FROM net_rulepacks
         WHERE ${conditions.join(' AND ')}
         ORDER BY name`,
        params
    )

    return result.rows.map(row => {
        const rules = row.rules || []
        const enabledRules = rules.filter((r: { enabled?: boolean }) => r.enabled !== false)
        const criticalRules = enabledRules.filter((r: { severity?: string }) => r.severity === 'critical')
        const highRules = enabledRules.filter((r: { severity?: string }) => r.severity === 'high')

        return {
            id: row.id,
            name: row.name,
            vendor: row.vendor,
            ruleCount: rules.length,
            enabledRules: enabledRules.length,
            criticalRules: criticalRules.length,
            highRules: highRules.length
        }
    })
}

function buildSourceRefs(
    devices: DeviceContextEntry[],
    policies: PolicyContextEntry[]
): SourceReference[] {
    const refs: SourceReference[] = []

    // Add device refs (prioritize by status)
    for (const device of devices.slice(0, CONTEXT_CONFIG.maxSourceRefs / 2)) {
        refs.push({
            type: 'device',
            id: device.id,
            label: `${device.name} (${device.vendor})`,
            relevanceScore: device.status === 'active' ? 1.0 : 0.5
        })
    }

    // Add policy refs
    for (const policy of policies.slice(0, CONTEXT_CONFIG.maxSourceRefs / 2)) {
        refs.push({
            type: 'rulepack',
            id: policy.id,
            label: `${policy.name} (${policy.enabledRules} rules)`,
            relevanceScore: policy.criticalRules > 0 ? 1.0 : 0.7
        })
    }

    return refs.slice(0, CONTEXT_CONFIG.maxSourceRefs)
}

// ====================
// UTILITIES
// ====================

function estimateTokens(pack: {
    promptHistory: PromptHistoryEntry[]
    changeHistory: ChangeHistoryEntry[]
    networkSnapshot: NetworkSnapshot
    devicesContext: DeviceContextEntry[]
    policyContext: PolicyContextEntry[]
    sourceRefs: SourceReference[]
}): NetOpsContextPack['tokenEstimates'] {
    const estimate = (obj: unknown) => Math.ceil(JSON.stringify(obj).length / CONTEXT_CONFIG.charsPerToken)

    return {
        total: 0, // Computed below
        promptHistory: estimate(pack.promptHistory),
        changeHistory: estimate(pack.changeHistory),
        networkSnapshot: estimate(pack.networkSnapshot),
        devicesContext: estimate(pack.devicesContext),
        policyContext: estimate(pack.policyContext),
        sourceRefs: estimate(pack.sourceRefs)
    }
}

function truncateString(str: string, maxLength: number): string {
    if (str.length <= maxLength) return str
    return str.substring(0, maxLength - 3) + '...'
}

function mapStatusToOutcome(status: string): 'success' | 'failed' | 'rolled_back' | 'pending' {
    switch (status) {
        case 'completed':
        case 'deployed':
            return 'success'
        case 'failed':
            return 'failed'
        case 'rolled_back':
            return 'rolled_back'
        default:
            return 'pending'
    }
}

// ====================
// CACHE
// ====================

const contextPackCache = new Map<string, { pack: NetOpsContextPack; expiresAt: number }>()

export function getCachedContextPack(cacheKey: string): NetOpsContextPack | null {
    const cached = contextPackCache.get(cacheKey)
    if (!cached) return null
    if (Date.now() > cached.expiresAt) {
        contextPackCache.delete(cacheKey)
        return null
    }
    return cached.pack
}

export function setCachedContextPack(cacheKey: string, pack: NetOpsContextPack): void {
    contextPackCache.set(cacheKey, {
        pack,
        expiresAt: Date.now() + CONTEXT_CONFIG.cacheTTL
    })
}

export function generateCacheKey(scope: OrchestrationScope): string {
    const input = JSON.stringify({
        deviceIds: scope.deviceIds.sort(),
        sites: scope.sites.sort(),
        roles: scope.roles.sort(),
        vendors: scope.vendors.sort(),
        tags: scope.tags.sort()
    })
    return createHash('sha256').update(input).digest('hex').substring(0, 16)
}

export function invalidateContextPackCache(): void {
    contextPackCache.clear()
}
