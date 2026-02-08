import type { CanonicalConfig, LintFinding, Vendor } from './types'

function push(findings: LintFinding[], finding: LintFinding) {
    findings.push(finding)
}

export function lintConfig(config: CanonicalConfig, vendor: Vendor): LintFinding[] {
    const findings: LintFinding[] = []
    if (!config.hostname) {
        push(findings, {
            id: 'hostname.required',
            severity: 'error',
            field: 'hostname',
            message: 'Hostname is required.'
        })
    }

    if (vendor === 'cisco') {
        if (!config.services.ssh.enabled) {
            push(findings, {
                id: 'cisco.ssh.disabled',
                severity: 'error',
                field: 'services.ssh',
                message: 'SSH must be enabled on Cisco IOS.',
                suggestion: 'Enable SSH and enforce v2.'
            })
        }
        if (config.services.ssh.version !== 2) {
            push(findings, {
                id: 'cisco.ssh.version',
                severity: 'error',
                field: 'services.ssh.version',
                message: 'Cisco requires SSH v2.',
                suggestion: 'Set SSH version to 2.'
            })
        }
        if (!config.firewall.enabled) {
            push(findings, {
                id: 'cisco.firewall.baseline',
                severity: 'warn',
                field: 'firewall.enabled',
                message: 'Baseline ACL rules are recommended.',
                suggestion: 'Enable baseline firewall settings.'
            })
        }
    }

    if (vendor === 'mikrotik') {
        if (!config.services.ssh.enabled) {
            push(findings, {
                id: 'mikrotik.ssh.disabled',
                severity: 'error',
                field: 'services.ssh',
                message: 'SSH service should be enabled on RouterOS.'
            })
        }
        if (!config.firewall.enabled) {
            push(findings, {
                id: 'mikrotik.firewall.baseline',
                severity: 'error',
                field: 'firewall.enabled',
                message: 'RouterOS requires baseline firewall input rules.'
            })
        }
    }

    if (config.services.ntpServers.length === 0) {
        push(findings, {
            id: 'services.ntp',
            severity: 'warn',
            field: 'services.ntpServers',
            message: 'No NTP servers defined.',
            suggestion: 'Provide at least one NTP server.'
        })
    }

    if (config.services.syslogServers.length === 0) {
        push(findings, {
            id: 'services.syslog',
            severity: 'info',
            field: 'services.syslogServers',
            message: 'No syslog servers configured.',
            suggestion: 'Configure remote syslog for audit trail.'
        })
    }

    if (config.services.snmpVersion === 'v3' && (!config.services.snmpV3Users || config.services.snmpV3Users.length === 0)) {
        push(findings, {
            id: 'services.snmp.v3.users',
            severity: 'warn',
            field: 'services.snmpV3Users',
            message: 'SNMP v3 enabled without any users.',
            suggestion: 'Add SNMPv3 users for secure polling.'
        })
    }

    if (config.nat.rules.length > 0 && !config.firewall.enabled) {
        push(findings, {
            id: 'nat.firewall.baseline',
            severity: 'warn',
            field: 'firewall.enabled',
            message: 'NAT rules without baseline firewall can expose services.',
            suggestion: 'Enable baseline firewall rules.'
        })
    }

    if (config.vlans.length === 0) {
        push(findings, {
            id: 'vlans.empty',
            severity: 'info',
            field: 'vlans',
            message: 'No VLANs defined. Ensure this is intentional.'
        })
    }

    return findings
}
