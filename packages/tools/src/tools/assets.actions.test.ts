import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { ToolRegistry } from '../ToolRegistry.js'
import {
    assignAssetTool,
    createAssetTool,
    createInventorySessionTool,
    openMaintenanceTicketTool,
    scanInventoryAssetTool,
    submitWorkflowRequestTool
} from './assets.actions.js'
import type { ToolContext } from '../ToolRegistry.js'

describe('asset action tools', () => {
    let registry: ToolRegistry
    const baseContext: ToolContext = { userId: 'user-1', correlationId: 'corr-1' }

    beforeEach(() => {
        registry = new ToolRegistry()
        registry.register(createAssetTool)
        registry.register(assignAssetTool)
        registry.register(openMaintenanceTicketTool)
        registry.register(createInventorySessionTool)
        registry.register(scanInventoryAssetTool)
        registry.register(submitWorkflowRequestTool)

        vi.stubGlobal('fetch', vi.fn(async () => {
            return new Response(JSON.stringify({ data: {} }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            })
        }))
    })

    afterEach(() => {
        vi.unstubAllGlobals()
    })

    it('rejects invalid scan args', async () => {
        await expect(registry.invoke('scan_inventory_asset', { sessionId: 'sess-1' }, baseContext)).rejects.toThrow()
    })

    it('creates assets with manager role', async () => {
        const managerContext = { ...baseContext, role: 'it_asset_manager' } as ToolContext & { role: string }
        const result = await registry.invoke('create_asset', {
            assetCode: 'ASSET-1',
            modelId: 'model-1'
        }, managerContext)
        expect(result.success).toBe(true)
    })
})
