/**
 * NetOps Lint Engine
 * 
 * Evaluates normalized configurations against rulepacks.
 * Supports:
 * - JSONPath matching
 * - Custom predicates for complex rules
 * - Severity levels (critical, high, medium, low, info)
 * - Waivable rules
 */

import type {
    NormalizedConfig,
    LintRule,
    LintFinding,
    LintSummary,
    LintSeverity,
    DeviceVendor,
    NormalizedFirewallPolicy
} from '@contracts/shared'

export interface LintResult {
    findings: LintFinding[]
    summary: LintSummary
    rulesEvaluated: number
    rulesPassed: number
    rulesFailed: number
    rulesSkipped: number
    durationMs: number
}

export interface LintContext {
    config: NormalizedConfig
    targetId: string
    targetType: 'device' | 'config_version' | 'change_set'
}

/**
 * Main lint engine
 */
export class LintEngine {
    private customPredicates: Map<string, CustomPredicate> = new Map()

    constructor() {
        // Register built-in custom predicates
        this.registerBuiltinPredicates()
    }

    /**
     * Evaluate a set of rules against a normalized config
     */
    async evaluate(rules: LintRule[], context: LintContext): Promise<LintResult> {
        const startTime = Date.now()
        const findings: LintFinding[] = []
        let rulesPassed = 0
        let rulesFailed = 0
        let rulesSkipped = 0
        let rulesEvaluated = 0

        for (const rule of rules) {
            if ((rule as any).enabled === false) {
                rulesSkipped++
                continue
            }
            // Check vendor scope
            const vendorScope = rule.vendorScope || []
            if (vendorScope.length > 0 && !vendorScope.includes(context.config.device.vendor)) {
                rulesSkipped++
                continue
            }

            try {
                const result = this.evaluateRule(rule, context)

                if ((result as any).skipped) {
                    rulesSkipped++
                    continue
                }

                rulesEvaluated++

                if (result.passed) {
                    rulesPassed++
                } else {
                    rulesFailed++
                    findings.push({
                        id: `finding-${Date.now()}-${Math.random().toString(36).substr(2, 8)}`,
                        ruleId: rule.id,
                        ruleName: (rule as any).name || rule.title,
                        severity: (rule as any).severity || 'low',
                        message: result.message || rule.description || (rule as any).name || rule.title,
                        path: result.path,
                        value: result.value,
                        remediation: (rule as any).remediation,
                        waived: false
                    })
                }
            } catch (error) {
                // Rule evaluation error - count as skipped
                rulesSkipped++
                console.error(`Error evaluating rule ${rule.id}:`, error)
            }
        }

        // Calculate summary
        const summary = this.calculateSummary(findings, rules.length)

        return {
            findings,
            summary,
            rulesEvaluated,
            rulesPassed,
            rulesFailed,
            rulesSkipped,
            durationMs: Date.now() - startTime
        }
    }

    /**
     * Evaluate a single rule (supports legacy and simplified rule shapes)
     */
    private evaluateRule(rule: any, context: LintContext): RuleResult {
        const type = rule.type || rule.match?.type
        if (!rule.enabled) return { passed: true, skipped: true } as any

        if (type === 'match') {
            const path = rule.path || rule.match?.path
            const condition = rule.condition || rule.match
            return this.evaluateMatch(path, condition, context.config)
        }

        if (type === 'custom') {
            const predicate = rule.customPredicate || rule.match?.predicate
            return this.evaluateCustomPredicate(predicate, context.config)
        }

        return { passed: true }
    }

    /**
     * JSONPath-based evaluation
     */
    private evaluateJsonPath(match: LintRule['match'], config: NormalizedConfig): RuleResult {
        const { path, operator, value } = match
        if (!path) return { passed: true }

        const actualValue = this.getValueByPath(config, path)

        switch (operator) {
            case 'equals':
                return {
                    passed: actualValue === value,
                    path,
                    value: actualValue,
                    message: `Expected ${path} to equal ${value}, got ${actualValue}`
                }

            case 'not_equals':
                return {
                    passed: actualValue !== value,
                    path,
                    value: actualValue,
                    message: `Expected ${path} to not equal ${value}`
                }

            case 'contains':
                return {
                    passed: Array.isArray(actualValue)
                        ? actualValue.includes(value)
                        : String(actualValue).includes(String(value)),
                    path,
                    value: actualValue,
                    message: `Expected ${path} to contain ${value}`
                }

            case 'not_contains':
                return {
                    passed: Array.isArray(actualValue)
                        ? !actualValue.includes(value)
                        : !String(actualValue).includes(String(value)),
                    path,
                    value: actualValue,
                    message: `Expected ${path} to not contain ${value}`
                }

            case 'not_empty':
                return {
                    passed: this.isNotEmpty(actualValue),
                    path,
                    value: actualValue,
                    message: `Expected ${path} to not be empty`
                }

            case 'empty':
                return {
                    passed: !this.isNotEmpty(actualValue),
                    path,
                    value: actualValue,
                    message: `Expected ${path} to be empty`
                }

            case 'exists':
                return {
                    passed: actualValue !== undefined && actualValue !== null,
                    path,
                    value: actualValue,
                    message: `Expected ${path} to exist`
                }

            case 'matches':
                if (!value || typeof value !== 'string') return { passed: true }
                return {
                    passed: new RegExp(value).test(String(actualValue)),
                    path,
                    value: actualValue,
                    message: `Expected ${path} to match pattern ${value}`
                }

            default:
                return { passed: true }
        }
    }

    /**
     * Get value from config using simplified JSONPath
     */
    private getValueByPath(obj: unknown, path: string): unknown {
        // Remove leading $. if present
        const cleanPath = path.replace(/^\$\.?/, '')
        const parts = cleanPath.split('.')

        let current: unknown = obj

        for (const part of parts) {
            if (current === null || current === undefined) {
                return undefined
            }

            // Handle array notation like [0] or [*]
            const arrayMatch = part.match(/^(\w+)\[(\d+|\*)\]$/)
            if (arrayMatch) {
                const [, key, index] = arrayMatch
                current = (current as Record<string, unknown>)[key]

                if (Array.isArray(current)) {
                    if (index === '*') {
                        // Return all elements
                        return current
                    } else {
                        current = current[parseInt(index, 10)]
                    }
                }
            } else {
                current = (current as Record<string, unknown>)[part]
            }
        }

        return current
    }

    /**
     * Regex-based evaluation
     */
    private evaluateRegex(match: LintRule['match'], config: NormalizedConfig): RuleResult {
        // For regex, we'd typically evaluate against raw config
        // In normalized context, this is less useful
        return { passed: true }
    }

    private evaluateMatch(path: string | undefined, condition: any, config: any): RuleResult {
        if (!path || !condition) return { passed: true }
        const value = this.getValueByPath(config, path)
        const operator = condition.operator || condition.op
        const expected = condition.value

        switch (operator) {
            case 'equals':
                return { passed: value === expected, path, value, message: `Expected ${path} to equal ${expected}` }
            case 'notEquals':
                return { passed: value !== expected, path, value, message: `Expected ${path} to not equal ${expected}` }
            case 'greaterThan':
                return { passed: Number(value) > Number(expected), path, value, message: `Expected ${path} > ${expected}` }
            case 'contains':
                return {
                    passed: Array.isArray(value) ? value.includes(expected) : String(value).includes(String(expected)),
                    path,
                    value,
                    message: `Expected ${path} to contain ${expected}`
                }
            case 'exists':
                return { passed: value !== undefined && value !== null && value !== '', path, value, message: `Expected ${path} to exist` }
            case 'notExists':
                return { passed: value === undefined || value === null || value === '', path, value, message: `Expected ${path} to not exist` }
            case 'notEmpty':
                return { passed: this.isNotEmpty(value), path, value, message: `Expected ${path} to not be empty` }
            default:
                return { passed: true }
        }
    }

    private evaluateCustomPredicate(predicate: string | undefined, config: NormalizedConfig): RuleResult {
        if (!predicate) return { passed: true }
        const predicateFn = this.customPredicates.get(predicate)
        if (!predicateFn) {
            return { passed: true }
        }
        return predicateFn(config)
    }

    /**
     * Custom predicate evaluation
     */
    private evaluateCustom(match: LintRule['match'], config: NormalizedConfig): RuleResult {
        const { predicate } = match
        if (!predicate) return { passed: true }

        const predicateFn = this.customPredicates.get(predicate)
        if (!predicateFn) {
            console.warn(`Unknown custom predicate: ${predicate}`)
            return { passed: true }
        }

        return predicateFn(config)
    }

    /**
     * Register built-in custom predicates
     */
    private registerBuiltinPredicates(): void {
        // SNMP community not default
        this.customPredicates.set('snmp_community_not_default', (config) => {
            // We can't check actual community strings (they're redacted)
            // But we can check if SNMP is enabled without v3
            if (!config.mgmt.snmp.enabled) {
                return { passed: true }
            }

            // If using v3 with users, that's acceptable
            if (config.mgmt.snmp.version === 'v3' && config.mgmt.snmp.users?.length) {
                return { passed: true }
            }

            // For v1/v2c, we assume communities need to be reviewed
            // (actual community check happens during config upload with redaction warnings)
            return {
                passed: config.mgmt.snmp.version === 'v3',
                message: 'SNMP v1/v2c detected - ensure non-default community strings are used',
                path: '$.mgmt.snmp'
            }
        })

        // FortiGate any-any has logging
        this.customPredicates.set('fortigate_any_any_has_logging', (config) => {
            if (config.device.vendor !== 'fortigate') {
                return { passed: true }
            }

            const violations: string[] = []

            for (const policy of config.security.firewallPolicies) {
                if (this.isAnyAnyPolicy(policy) && !policy.log) {
                    violations.push(`Policy ${policy.id}: any-any without logging`)
                }
            }

            return {
                passed: violations.length === 0,
                message: violations.join('; '),
                value: violations
            }
        })

        // FortiGate accept-all restricted
        this.customPredicates.set('fortigate_accept_all_restricted', (config) => {
            if (config.device.vendor !== 'fortigate') {
                return { passed: true }
            }

            const violations: string[] = []

            for (const policy of config.security.firewallPolicies) {
                if (policy.action === 'accept' && this.isOverlyPermissive(policy)) {
                    violations.push(`Policy ${policy.id}: accept policy is overly permissive`)
                }
            }

            return {
                passed: violations.length === 0,
                message: violations.join('; '),
                value: violations
            }
        })

        // NAT overlap detection
        this.customPredicates.set('nat_no_overlap', (config) => {
            // Simplified overlap detection
            const natRules = config.security.natRules
            const violations: string[] = []

            for (let i = 0; i < natRules.length; i++) {
                for (let j = i + 1; j < natRules.length; j++) {
                    if (this.natRulesOverlap(natRules[i], natRules[j])) {
                        violations.push(`NAT rules ${natRules[i].id} and ${natRules[j].id} may overlap`)
                    }
                }
            }

            return {
                passed: violations.length === 0,
                message: violations.join('; '),
                value: violations
            }
        })

        // VPN strong crypto
        this.customPredicates.set('vpn_strong_crypto', (config) => {
            const weakCrypto = ['des', '3des', 'md5']
            const violations: string[] = []

            for (const tunnel of config.security.vpnTunnels) {
                const phase1Enc = tunnel.phase1?.encryption || []
                const phase1Hash = tunnel.phase1?.hash || []

                for (const enc of phase1Enc) {
                    if (weakCrypto.some(w => enc.toLowerCase().includes(w))) {
                        violations.push(`VPN ${tunnel.name}: weak encryption ${enc}`)
                    }
                }

                for (const hash of phase1Hash) {
                    if (weakCrypto.some(w => hash.toLowerCase().includes(w))) {
                        violations.push(`VPN ${tunnel.name}: weak hash ${hash}`)
                    }
                }
            }

            return {
                passed: violations.length === 0,
                message: violations.join('; '),
                value: violations
            }
        })

        // Cisco enable encrypted
        this.customPredicates.set('cisco_enable_encrypted', (config) => {
            // This would need raw config access
            // In normalized form, we can't directly check this
            // Return passed with warning
            if (config.device.vendor !== 'cisco') {
                return { passed: true }
            }

            return {
                passed: true,
                message: 'Enable secret encryption check requires raw config analysis'
            }
        })

        this.customPredicates.set('noVlan1Traffic', (config) => {
            const hasVlan1 = (config.interfaces || []).some((iface: any) => iface.vlan === 1 || iface.accessVlan === 1)
            return { passed: !hasVlan1, message: hasVlan1 ? 'Interface uses VLAN 1' : undefined }
        })

        this.customPredicates.set('sshEnabled', (config) => {
            const enabled = config.mgmt?.ssh?.enabled === true
            return { passed: enabled, message: enabled ? undefined : 'SSH not enabled' }
        })

        this.customPredicates.set('snmpV3Only', (config) => {
            const version = config.mgmt?.snmp?.version
            return { passed: version === 'v3', message: version === 'v3' ? undefined : 'SNMP not v3' }
        })

        this.customPredicates.set('multipleNtpServers', (config) => {
            const count = config.mgmt?.ntp?.servers?.length || 0
            return { passed: count >= 2, message: `NTP servers: ${count}` }
        })

        this.customPredicates.set('aclHasExplicitDeny', (config) => {
            const acls = config.security?.acls || []
            const missing = acls.filter((acl: any) => {
                if (!acl.entries?.length) return true
                const last = acl.entries[acl.entries.length - 1]
                return !(last.action === 'deny' || last.action === 'drop')
            })
            return { passed: missing.length === 0, message: missing.length ? 'ACL missing explicit deny' : undefined }
        })
    }

    /**
     * Check if policy is any-any
     */
    private isAnyAnyPolicy(policy: NormalizedFirewallPolicy): boolean {
        const isAnySrc = this.isAnyAddress(policy.srcAddr)
        const isAnyDst = this.isAnyAddress(policy.dstAddr)
        const isAnySvc = this.isAnyService(policy.service)

        return isAnySrc && isAnyDst && isAnySvc
    }

    /**
     * Check if policy is overly permissive
     */
    private isOverlyPermissive(policy: NormalizedFirewallPolicy): boolean {
        // Accept with any source AND any destination AND any service
        return this.isAnyAddress(policy.srcAddr) &&
            this.isAnyAddress(policy.dstAddr) &&
            this.isAnyService(policy.service)
    }

    private isAnyAddress(addr: string | string[]): boolean {
        if (Array.isArray(addr)) {
            return addr.some(a => this.isAnyAddress(a))
        }
        const lower = addr.toLowerCase()
        return lower === 'any' || lower === 'all' || lower === '0.0.0.0/0'
    }

    private isAnyService(service: string | string[]): boolean {
        if (Array.isArray(service)) {
            return service.some(s => this.isAnyService(s))
        }
        const lower = service.toLowerCase()
        return lower === 'any' || lower === 'all'
    }

    /**
     * Check if two NAT rules overlap (simplified)
     */
    private natRulesOverlap(a: NormalizedConfig['security']['natRules'][0], b: NormalizedConfig['security']['natRules'][0]): boolean {
        // Very simplified - same type and same addresses
        if (a.type !== b.type) return false

        if (a.type === 'dnat' && b.type === 'dnat') {
            return a.dstAddr === b.dstAddr && a.dstPort === b.dstPort
        }

        if (a.type === 'snat' && b.type === 'snat') {
            return a.srcAddr === b.srcAddr && a.translatedAddr === b.translatedAddr
        }

        return false
    }

    /**
     * Check if value is not empty
     */
    private isNotEmpty(value: unknown): boolean {
        if (value === undefined || value === null) return false
        if (typeof value === 'string') return value.length > 0
        if (Array.isArray(value)) return value.length > 0
        if (typeof value === 'object') return Object.keys(value).length > 0
        return true
    }

    /**
     * Calculate summary from findings
     */
    private calculateSummary(findings: LintFinding[], totalRules: number): LintSummary {
        const summary: LintSummary = {
            critical: 0,
            high: 0,
            medium: 0,
            low: 0,
            info: 0,
            waived: 0,
            total: totalRules,
            passed: true
        }

        for (const finding of findings) {
            if (finding.waived) {
                summary.waived++
            } else {
                summary[finding.severity]++
            }
        }

        // Failed if any critical or high (not waived)
        summary.passed = summary.critical === 0 && summary.high === 0

        return summary
    }

    /**
     * Register custom predicate
     */
    registerPredicate(name: string, fn: CustomPredicate): void {
        this.customPredicates.set(name, fn)
    }
}

// Types
interface RuleResult {
    passed: boolean
    message?: string
    path?: string
    value?: unknown
}

type CustomPredicate = (config: NormalizedConfig) => RuleResult

// Export singleton instance
export const lintEngine = new LintEngine()
