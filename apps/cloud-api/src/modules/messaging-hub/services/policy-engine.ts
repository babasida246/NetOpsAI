const DEFAULT_DANGEROUS_TOOLS = new Set([
    'push_mikrotik_config_ssh',
    'diff_mikrotik_running_config',
    'generate_mikrotik_full_config'
])

export function requiresConfirm(toolName?: string, payload?: Record<string, unknown>): boolean {
    if (!toolName) return false
    if (payload && payload.requiresConfirm === true) return true
    if (payload && typeof payload.blastRadius === 'number' && payload.blastRadius > 1) return true
    return DEFAULT_DANGEROUS_TOOLS.has(toolName)
}
