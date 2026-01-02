import type { ToolDefinition } from '@tools/registry'

export const summarizeLogsTool: ToolDefinition = {
    name: 'summarize_logs',
    description: 'Analyze and summarize log patterns',
    inputSchema: {
        type: 'object',
        properties: {
            logs: {
                type: 'array',
                description: 'Array of log entries to summarize'
            },
            focusOn: {
                type: 'string',
                enum: ['errors', 'warnings', 'patterns'],
                default: 'patterns'
            }
        },
        required: ['logs']
    },
    async execute(args: {
        logs: Array<{ message: string; severity: string; timestamp: string }>
        focusOn?: string
    }) {
        const logs = args.logs

        // Count by severity
        const bySeverity: Record<string, number> = {}
        for (const log of logs) {
            bySeverity[log.severity] = (bySeverity[log.severity] || 0) + 1
        }

        // Pattern detection (simple keyword grouping)
        const patterns: Record<string, { count: number; examples: string[] }> = {}

        for (const log of logs) {
            const normalized = normalizeMessage(log.message)
            if (!patterns[normalized]) {
                patterns[normalized] = { count: 0, examples: [] }
            }
            patterns[normalized].count++
            if (patterns[normalized].examples.length < 3) {
                patterns[normalized].examples.push(log.message)
            }
        }

        // Top patterns
        const topPatterns = Object.entries(patterns)
            .sort((a, b) => b[1].count - a[1].count)
            .slice(0, 5)
            .map(([pattern, data]) => ({
                pattern,
                count: data.count,
                percentage: ((data.count / logs.length) * 100).toFixed(1) + '%',
                examples: data.examples
            }))

        // Top issues (errors/criticals)
        const topIssues = logs
            .filter(l => l.severity === 'error' || l.severity === 'critical')
            .slice(0, 5)
            .map(l => ({
                severity: l.severity,
                message: l.message,
                timestamp: l.timestamp
            }))

        return {
            summary: {
                totalLogs: logs.length,
                severityBreakdown: bySeverity,
                timeRange: {
                    start: logs[0]?.timestamp,
                    end: logs[logs.length - 1]?.timestamp
                }
            },
            topPatterns,
            topIssues,
            recommendations: generateRecommendations(topIssues)
        }
    },
    strategy: 'best-effort',
    timeout: 10000
}

function normalizeMessage(message: string): string {
    return message
        .replace(/\d+/g, 'N')
        .replace(/\d+\.\d+\.\d+\.\d+/g, 'IP')
        .toLowerCase()
        .trim()
}

function generateRecommendations(issues: any[]): string[] {
    const recommendations: string[] = []

    for (const issue of issues) {
        if (issue.message.includes('connection')) {
            recommendations.push('Check network connectivity and firewall rules')
        }
        if (issue.message.includes('timeout')) {
            recommendations.push('Investigate service response times and resource usage')
        }
        if (issue.message.includes('disk')) {
            recommendations.push('Check disk space and consider cleanup or expansion')
        }
    }

    return [...new Set(recommendations)] // Unique
}
