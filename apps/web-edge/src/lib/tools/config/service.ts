import { API_BASE, apiJsonData } from '$lib/api/httpClient'
import { diffCommands } from './diff'
import { lintConfig as lintLocal } from './lint'
import { renderConfig } from './mock'
import type { CanonicalConfig, ConfigPipelineResult, LintFinding, PushResult, RenderResult, Vendor } from './types'

const TOOLING_BASE = `${API_BASE}/netops/tools`;

type ApiRenderResponse = RenderResult & { lintFindings?: LintFinding[] }

type PushPayload = {
    deviceId: string
    sessionId?: string
    vendor: Vendor
    config: CanonicalConfig
    commands: string[]
    verifyCommands: string[]
    rollbackCommands: string[]
}

export async function generateConfigPipeline(config: CanonicalConfig, vendor: Vendor): Promise<ConfigPipelineResult> {
    try {
        const payload = await apiJsonData<ApiRenderResponse>(`${TOOLING_BASE}/config/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ vendor, config })
        })
        return {
            commands: payload.commands,
            sections: payload.sections,
            verifyCommands: payload.verifyCommands,
            rollbackCommands: payload.rollbackCommands,
            lintFindings: payload.lintFindings ?? []
        }
    } catch {
        const render = renderConfig(config, vendor)
        return {
            ...render,
            lintFindings: lintLocal(config, vendor)
        }
    }
}

export async function lintConfig(config: CanonicalConfig, vendor: Vendor): Promise<LintFinding[]> {
    try {
        const payload = await apiJsonData<{ findings: LintFinding[] }>(`${TOOLING_BASE}/config/lint`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ vendor, config })
        })
        return payload.findings ?? []
    } catch {
        return lintLocal(config, vendor)
    }
}

export async function diffConfig(previous: string[], next: string[]): Promise<string> {
    return diffCommands(previous, next)
}

export async function pushConfig(payload: PushPayload): Promise<PushResult> {
    try {
        return await apiJsonData<PushResult>(`${TOOLING_BASE}/config/push`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })
    } catch {
        return {
            status: 'partial',
            details: ['Backend push unavailable. Run through SSH panel using generated commands.']
        }
    }
}
