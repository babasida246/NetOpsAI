import type { FirewallIR, RuleIR } from '../types.js'

const IPV4_WITH_OPTIONAL_CIDR = /\b(\d{1,3}\.){3}\d{1,3}(\/\d{1,2})?\b/g

function maskIpv4(value: string): string {
    const match = value.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})(\/\d{1,2})?$/)
    if (!match) return value
    const [, a, b, c, , cidr] = match
    return `${a}.${b}.${c}.x${cidr ?? ''}`
}

export function maskSensitiveText(input: string): string {
    return input.replace(IPV4_WITH_OPTIONAL_CIDR, (m) => maskIpv4(m))
}

function maskList(list?: string[]): string[] | undefined {
    if (!list) return undefined
    return list.map((v) => maskSensitiveText(v))
}

function maskRule(rule: RuleIR): RuleIR {
    return {
        ...rule,
        srcIntf: maskList(rule.srcIntf),
        dstIntf: maskList(rule.dstIntf),
        srcAddr: maskList(rule.srcAddr),
        dstAddr: maskList(rule.dstAddr),
        service: maskList(rule.service),
        schedule: rule.schedule ? maskSensitiveText(rule.schedule) : rule.schedule,
        comment: rule.comment ? maskSensitiveText(rule.comment) : rule.comment,
        nat: rule.nat
            ? {
                  ...rule.nat,
                  toAddr: rule.nat.toAddr ? maskSensitiveText(rule.nat.toAddr) : rule.nat.toAddr,
                  toPort: rule.nat.toPort ? maskSensitiveText(rule.nat.toPort) : rule.nat.toPort
              }
            : rule.nat
    }
}

export function maskFirewallIR(ir: FirewallIR): FirewallIR {
    return {
        ...ir,
        objects: {
            addresses: ir.objects.addresses.map((a) => ({
                ...a,
                value: a.value ? maskSensitiveText(a.value) : a.value
            })),
            addressGroups: ir.objects.addressGroups.map((g) => ({
                ...g,
                members: g.members.map((m) => maskSensitiveText(m))
            })),
            services: ir.objects.services.map((s) => ({ ...s, ports: s.ports ? maskSensitiveText(s.ports) : s.ports })),
            serviceGroups: ir.objects.serviceGroups.map((g) => ({ ...g, members: g.members.map((m) => maskSensitiveText(m)) }))
        },
        chains: ir.chains.map((c) => ({
            ...c,
            id: maskSensitiveText(c.id),
            rules: c.rules.map(maskRule)
        })),
        warnings: ir.warnings.map(maskSensitiveText)
    }
}

