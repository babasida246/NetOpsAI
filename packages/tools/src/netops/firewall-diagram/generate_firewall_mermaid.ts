import type { ToolContext, ToolDefinition } from '../../ToolRegistry.js'
import type { FirewallIR, FirewallToolInput, FirewallVendor, SshCollectedBundle } from './types.js'
import { parseMikrotikFirewallFromText } from './parsers/mikrotik.js'
import { parseFortigateFirewallFromText } from './parsers/fortigate.js'
import { maskFirewallIR, maskSensitiveText } from './normalize/index.js'
import { renderPipeline } from './renderers/pipeline.js'
import { renderChain } from './renderers/chain.js'
import { renderMap } from './renderers/map.js'
import { collectFirewallViaSsh } from './ssh/collector.js'

type JSONSchema = Record<string, any>

const viewsEnum = ['pipeline', 'chain', 'map'] as const

export const generateFirewallMermaidSchema: JSONSchema = {
    type: 'object',
    additionalProperties: false,
    required: ['vendor', 'source'],
    properties: {
        vendor: { type: 'string', enum: ['mikrotik', 'fortigate'] },
        source: {
            type: 'object',
            additionalProperties: false,
            required: ['type'],
            properties: {
                type: { type: 'string', enum: ['file', 'ssh'] },
                file: {
                    type: 'object',
                    additionalProperties: false,
                    required: ['text'],
                    properties: {
                        text: { type: 'string', minLength: 1 },
                        filename: { type: 'string' }
                    }
                },
                ssh: {
                    type: 'object',
                    additionalProperties: false,
                    required: ['host', 'username'],
                    properties: {
                        host: { type: 'string', minLength: 1 },
                        port: { type: 'number', minimum: 1, maximum: 65535 },
                        username: { type: 'string', minLength: 1 },
                        password: { type: 'string' },
                        privateKey: { type: 'string' },
                        privateKeyPath: { type: 'string' },
                        passphrase: { type: 'string' },
                        vendorHints: { type: 'object', additionalProperties: true }
                    }
                }
            },
            allOf: [
                { if: { properties: { type: { const: 'file' } } }, then: { required: ['file'] } },
                { if: { properties: { type: { const: 'ssh' } } }, then: { required: ['ssh'] } }
            ]
        },
        views: { type: 'array', items: { type: 'string', enum: viewsEnum }, uniqueItems: true },
        options: {
            type: 'object',
            additionalProperties: false,
            properties: {
                includeIR: { type: 'boolean' },
                includeRawBundle: { type: 'boolean' },
                maxRulesPerChain: { type: 'number', minimum: 1, maximum: 500 },
                maskSensitive: { type: 'boolean' }
            }
        }
    }
}

type ToolOutput = {
    mermaid: { pipeline?: string; chains?: Record<string, string>; map?: string }
    ir?: FirewallIR
    rawBundle?: SshCollectedBundle
    validation: { errors: string[]; warnings: string[] }
    impact: { note: string; risk: 'low' | 'medium' | 'high' }
}

function defaultViews(): Array<'pipeline' | 'chain' | 'map'> {
    return ['pipeline', 'chain', 'map']
}

function parseByVendor(vendor: FirewallVendor, text: string): { ir: FirewallIR; errors: string[]; warnings: string[] } {
    if (vendor === 'mikrotik') return parseMikrotikFirewallFromText(text)
    return parseFortigateFirewallFromText(text)
}

function computeImpact(errors: string[], warnings: string[]): ToolOutput['impact'] {
    if (errors.length > 0) {
        return { note: 'Parsing failed. Mermaid output may be incomplete.', risk: 'high' }
    }
    if (warnings.length > 0) {
        return { note: 'Parsed with warnings. Review the diagram for completeness.', risk: 'medium' }
    }
    return { note: 'Read-only tool. No changes are applied to devices.', risk: 'low' }
}

function sanitizeBundle(bundle: SshCollectedBundle, maskSensitive: boolean): SshCollectedBundle {
    if (!maskSensitive) return bundle
    return {
        ...bundle,
        commands: bundle.commands.map((c) => ({
            ...c,
            // Never include secrets; only stdout/stderr are present. Still mask IP-ish content if requested.
            stdout: maskSensitiveText(c.stdout),
            stderr: c.stderr ? maskSensitiveText(c.stderr) : c.stderr
        }))
    }
}

export async function generateFirewallMermaid(args: FirewallToolInput, context?: ToolContext): Promise<ToolOutput> {
    const requestedViews = args.views && args.views.length > 0 ? args.views : defaultViews()
    const includeIR = args.options?.includeIR !== false
    const includeRawBundle = args.options?.includeRawBundle === true
    const maskSensitive = args.options?.maskSensitive !== false
    const maxRulesPerChain = args.options?.maxRulesPerChain

    let sourceText = ''
    let rawBundle: SshCollectedBundle | undefined

    if (args.source.type === 'file') {
        sourceText = args.source.file?.text ?? ''
    } else {
        const ssh = args.source.ssh
        if (!ssh) {
            return {
                mermaid: {},
                validation: { errors: ['Missing ssh connection settings.'], warnings: [] },
                impact: { note: 'Invalid input.', risk: 'high' }
            }
        }
        rawBundle = await collectFirewallViaSsh(args.vendor, ssh, context)
        // Join outputs with stable section markers for file-like parsing.
        sourceText = rawBundle.commands
            .map((c) => `# COMMAND: ${c.cmd}\n${c.stdout ?? ''}\n`)
            .join('\n')
    }

    const parsed = parseByVendor(args.vendor, sourceText)
    let ir = parsed.ir

    const warnings = [...parsed.warnings]
    if (args.source.type === 'ssh') {
        warnings.push('SSH collection was used. Ensure command outputs are complete for accurate diagrams.')
    }

    if (maskSensitive) {
        ir = maskFirewallIR(ir)
    }

    const mermaid: ToolOutput['mermaid'] = {}

    if (requestedViews.includes('pipeline')) {
        mermaid.pipeline = renderPipeline(ir)
    }
    if (requestedViews.includes('chain')) {
        const chains: Record<string, string> = {}
        for (const chain of ir.chains) {
            chains[chain.id] = renderChain(chain, { maxRulesPerChain })
        }
        mermaid.chains = chains
    }
    if (requestedViews.includes('map')) {
        mermaid.map = renderMap(ir)
    }

    const errors = parsed.errors
    const impact = computeImpact(errors, warnings)

    const output: ToolOutput = {
        mermaid,
        validation: { errors, warnings },
        impact
    }

    if (includeIR) output.ir = ir
    if (includeRawBundle && rawBundle) output.rawBundle = sanitizeBundle(rawBundle, maskSensitive)

    return output
}

export const generateFirewallMermaidTool: ToolDefinition = {
    name: 'generate_firewall_mermaid',
    description: 'Parse MikroTik/FortiGate firewall outputs into an IR and render Mermaid diagrams (pipeline/chain/map).',
    inputSchema: generateFirewallMermaidSchema,
    async execute(args: FirewallToolInput, context: ToolContext) {
        return generateFirewallMermaid(args, context)
    },
    strategy: 'fail-fast',
    timeout: 30000,
    requiresAuth: true,
    requiredRole: 'admin'
}

