import { readFile, writeFile } from 'node:fs/promises'
import { ToolRegistry, generateFirewallMermaidTool } from '@tools/registry'

type Vendor = 'mikrotik' | 'fortigate'

type Options = {
    vendor: Vendor
    file?: string
    ssh?: string
    user?: string
    pass?: string
    key?: string
    view?: 'pipeline' | 'chain' | 'map' | 'all'
    out?: string
    format?: 'md' | 'mmd' | 'json'
    maxRulesPerChain?: string
    maskSensitive?: boolean
}

function buildMarkdown(result: any): string {
    const chunks: string[] = []
    chunks.push('# Firewall Logic Diagrams')
    chunks.push('')

    if (result.mermaid?.pipeline) {
        chunks.push('## Pipeline')
        chunks.push('```mermaid')
        chunks.push(result.mermaid.pipeline)
        chunks.push('```')
        chunks.push('')
    }

    if (result.mermaid?.chains) {
        chunks.push('## Chains')
        for (const [id, diagram] of Object.entries(result.mermaid.chains)) {
            chunks.push(`### ${id}`)
            chunks.push('```mermaid')
            chunks.push(String(diagram))
            chunks.push('```')
            chunks.push('')
        }
    }

    if (result.mermaid?.map) {
        chunks.push('## Map')
        chunks.push('```mermaid')
        chunks.push(result.mermaid.map)
        chunks.push('```')
        chunks.push('')
    }

    if (result.validation?.warnings?.length) {
        chunks.push('## Warnings')
        for (const w of result.validation.warnings) chunks.push(`- ${w}`)
        chunks.push('')
    }

    if (result.validation?.errors?.length) {
        chunks.push('## Errors')
        for (const e of result.validation.errors) chunks.push(`- ${e}`)
        chunks.push('')
    }

    return chunks.join('\n')
}

function buildMermaidOnly(result: any): string {
    const chunks: string[] = []
    if (result.mermaid?.pipeline) {
        chunks.push('%% pipeline')
        chunks.push(result.mermaid.pipeline)
        chunks.push('')
    }
    if (result.mermaid?.chains) {
        for (const [id, diagram] of Object.entries(result.mermaid.chains)) {
            chunks.push(`%% chain: ${id}`)
            chunks.push(String(diagram))
            chunks.push('')
        }
    }
    if (result.mermaid?.map) {
        chunks.push('%% map')
        chunks.push(result.mermaid.map)
        chunks.push('')
    }
    return chunks.join('\n').trimEnd()
}

export async function diagramFirewallCommand(options: Options) {
    const vendor = options.vendor

    const view = options.view ?? 'all'
    const views = view === 'all' ? undefined : ([view] as any)

    const maxRulesPerChain = options.maxRulesPerChain ? Number(options.maxRulesPerChain) : undefined
    const maskSensitive = options.maskSensitive !== false

    const source =
        options.file
            ? { type: 'file' as const, file: { text: await readFile(options.file, 'utf8'), filename: options.file } }
            : {
                  type: 'ssh' as const,
                  ssh: {
                      host: options.ssh ?? '',
                      username: options.user ?? '',
                      password: options.pass,
                      privateKeyPath: options.key
                  }
              }

    if (source.type === 'ssh' && (!source.ssh.host || !source.ssh.username || (!source.ssh.password && !source.ssh.privateKeyPath))) {
        throw new Error('SSH mode requires --ssh <host> --user <username> and either --pass <password> or --key <path>')
    }

    const input = {
        vendor,
        source,
        views,
        options: {
            includeIR: true,
            includeRawBundle: false,
            maxRulesPerChain,
            maskSensitive
        }
    }

    const registry = new ToolRegistry()
    registry.register(generateFirewallMermaidTool)

    const result = await registry.invoke(generateFirewallMermaidTool.name, input, {
        userId: 'gateway-cli',
        role: 'admin',
        correlationId: `cli-${Date.now()}`
    })

    const output = result.output

    const format = options.format ?? 'md'
    const text =
        format === 'json'
            ? JSON.stringify(output, null, 2)
            : format === 'mmd'
                ? buildMermaidOnly(output)
                : buildMarkdown(output)

    if (options.out) {
        await writeFile(options.out, text, 'utf8')
    } else {
        console.log(text)
    }
}

