import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { ToolRegistry } from '../ToolRegistry.js'
import {
    searchAssetsTool,
    getAssetDetailTool,
    assetTimelineTool,
    listWarrantyExpiringTool
} from './assets.js'
import type { ToolContext } from '../ToolRegistry.js'

describe('asset tools', () => {
    let registry: ToolRegistry
    const baseContext: ToolContext = { userId: 'user-1', correlationId: 'corr-1' }

    beforeEach(() => {
        registry = new ToolRegistry()
        registry.register(searchAssetsTool)
        registry.register(getAssetDetailTool)
        registry.register(assetTimelineTool)
        registry.register(listWarrantyExpiringTool)

        vi.stubGlobal('fetch', vi.fn(async () => {
            return new Response(JSON.stringify({ data: [] }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            })
        }))
    })

    afterEach(() => {
        vi.unstubAllGlobals()
    })

    it('rejects invalid args', async () => {
        await expect(registry.invoke('get_asset_detail', {}, baseContext)).rejects.toThrow()
    })

    it('executes search tool', async () => {
        const result = await registry.invoke('search_assets', { query: 'asset' }, baseContext)
        expect(result.success).toBe(true)
    })

    it('lists warranty expiring assets', async () => {
        const result = await registry.invoke('list_warranty_expiring', {
            warrantyExpiringDays: 30
        }, baseContext)
        expect(result.success).toBe(true)
    })
})
