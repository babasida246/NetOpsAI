/**
 * Lint Engine Unit Tests
 */
import { describe, it, expect } from 'vitest'
import { lintEngine, LintEngine } from '../src/lint/engine.js'
import type { NormalizedConfig, LintRule } from '@contracts/shared'

describe('LintEngine', () => {
    // Sample normalized config for testing
    const sampleConfig: NormalizedConfig = {
        schemaVersion: 'v1',
        device: {
            hostname: 'test-router',
            vendor: 'cisco',
            model: 'ISR4331',
            osVersion: '17.3.1'
        },
        interfaces: [
            {
                name: 'GigabitEthernet0/0',
                description: 'WAN Interface',
                status: 'up',
                mode: 'routed',
                ipv4: '203.0.113.1',
                ipv4Mask: '255.255.255.0'
            },
            {
                name: 'GigabitEthernet0/1',
                status: 'up',
                mode: 'access',
                vlan: 10
            }
        ],
        vlans: [
            { id: 1, name: 'default' },
            { id: 10, name: 'Management' },
            { id: 20, name: 'Users' }
        ],
        routing: {
            static: [
                { network: '0.0.0.0/0', nextHop: '203.0.113.254' },
                { network: '10.0.0.0/8', nextHop: '192.168.1.254' }
            ],
            ospf: [],
            bgp: []
        },
        security: {
            acls: [
                {
                    name: 'INGRESS-ACL',
                    entries: [
                        { seq: 10, action: 'permit', protocol: 'tcp', src: 'any', dst: 'any', dstPort: 22 },
                        { seq: 20, action: 'deny', protocol: 'ip', src: 'any', dst: 'any', log: true }
                    ]
                }
            ],
            users: [
                { name: 'admin', privilege: 15 },
                { name: 'netops', privilege: 10, role: 'network-admin' }
            ],
            aaa: null
        },
        mgmt: {
            ssh: { enabled: true, version: 2, timeout: 60 },
            snmp: { enabled: true, version: 'v3' },
            ntp: { servers: ['10.0.0.100', '10.0.0.101'], timezone: 'UTC' },
            logging: { servers: ['10.0.0.200'], level: 'informational' }
        }
    }

    const testContext = {
        config: sampleConfig,
        targetId: 'test-001',
        targetType: 'config_version' as const
    }

    describe('Rule Evaluation', () => {
        it('should evaluate existence rule (pass)', async () => {
            const rules: LintRule[] = [{
                id: 'TEST-001',
                name: 'Hostname Required',
                description: 'Device must have a hostname',
                severity: 'critical',
                enabled: true,
                type: 'match',
                path: '$.device.hostname',
                condition: { operator: 'exists' }
            }]

            const result = await lintEngine.evaluate(rules, testContext)

            expect(result.rulesPassed).toBe(1)
            expect(result.rulesFailed).toBe(0)
            expect(result.summary.passed).toBe(true)
        })

        it('should evaluate existence rule (fail)', async () => {
            const configWithoutHostname: NormalizedConfig = {
                ...sampleConfig,
                device: { ...sampleConfig.device, hostname: '' }
            }

            const rules: LintRule[] = [{
                id: 'TEST-002',
                name: 'Hostname Required',
                description: 'Device must have a hostname',
                severity: 'critical',
                enabled: true,
                type: 'match',
                path: '$.device.hostname',
                condition: { operator: 'notEmpty' }
            }]

            const result = await lintEngine.evaluate(rules, {
                ...testContext,
                config: configWithoutHostname
            })

            expect(result.rulesFailed).toBe(1)
            expect(result.summary.passed).toBe(false)
            expect(result.summary.critical).toBe(1)
        })

        it('should evaluate equals condition', async () => {
            const rules: LintRule[] = [{
                id: 'TEST-003',
                name: 'SSH Version Check',
                description: 'SSH must be version 2',
                severity: 'high',
                enabled: true,
                type: 'match',
                path: '$.mgmt.ssh.version',
                condition: { operator: 'equals', value: 2 }
            }]

            const result = await lintEngine.evaluate(rules, testContext)

            expect(result.rulesPassed).toBe(1)
        })

        it('should evaluate notEquals condition', async () => {
            const rules: LintRule[] = [{
                id: 'TEST-004',
                name: 'No SSHv1',
                description: 'SSH version must not be 1',
                severity: 'critical',
                enabled: true,
                type: 'match',
                path: '$.mgmt.ssh.version',
                condition: { operator: 'notEquals', value: 1 }
            }]

            const result = await lintEngine.evaluate(rules, testContext)

            expect(result.rulesPassed).toBe(1)
        })

        it('should evaluate greaterThan condition', async () => {
            const rules: LintRule[] = [{
                id: 'TEST-005',
                name: 'Multiple NTP Servers',
                description: 'Must have at least 2 NTP servers',
                severity: 'medium',
                enabled: true,
                type: 'match',
                path: '$.mgmt.ntp.servers.length',
                condition: { operator: 'greaterThan', value: 1 }
            }]

            const result = await lintEngine.evaluate(rules, testContext)

            expect(result.rulesPassed).toBe(1)
        })

        it('should evaluate contains condition', async () => {
            const rules: LintRule[] = [{
                id: 'TEST-006',
                name: 'SNMPv3 Required',
                description: 'SNMP must be version 3',
                severity: 'high',
                enabled: true,
                type: 'match',
                path: '$.mgmt.snmp.version',
                condition: { operator: 'contains', value: '3' }
            }]

            const result = await lintEngine.evaluate(rules, testContext)

            expect(result.rulesPassed).toBe(1)
        })
    })

    describe('Custom Predicates (SEC/MGT/ACC rules)', () => {
        it('should evaluate SEC-001 (no VLAN 1 traffic)', async () => {
            const rules: LintRule[] = [{
                id: 'SEC-001',
                name: 'No VLAN 1 Traffic',
                description: 'Interfaces should not use default VLAN 1',
                severity: 'medium',
                enabled: true,
                type: 'custom',
                customPredicate: 'noVlan1Traffic'
            }]

            const result = await lintEngine.evaluate(rules, testContext)

            // Should pass because no interfaces have vlan: 1
            expect(result.rulesPassed).toBe(1)
        })

        it('should fail SEC-001 with VLAN 1 access port', async () => {
            const configWithVlan1: NormalizedConfig = {
                ...sampleConfig,
                interfaces: [
                    ...sampleConfig.interfaces,
                    { name: 'Gi0/2', status: 'up', mode: 'access', vlan: 1 }
                ]
            }

            const rules: LintRule[] = [{
                id: 'SEC-001',
                name: 'No VLAN 1 Traffic',
                description: 'Interfaces should not use default VLAN 1',
                severity: 'medium',
                enabled: true,
                type: 'custom',
                customPredicate: 'noVlan1Traffic'
            }]

            const result = await lintEngine.evaluate(rules, {
                ...testContext,
                config: configWithVlan1
            })

            expect(result.rulesFailed).toBe(1)
        })

        it('should evaluate MGT-001 (SSH enabled)', async () => {
            const rules: LintRule[] = [{
                id: 'MGT-001',
                name: 'SSH Enabled',
                description: 'SSH must be enabled for management',
                severity: 'high',
                enabled: true,
                type: 'custom',
                customPredicate: 'sshEnabled'
            }]

            const result = await lintEngine.evaluate(rules, testContext)

            expect(result.rulesPassed).toBe(1)
        })

        it('should evaluate MGT-002 (SNMPv3 only)', async () => {
            const rules: LintRule[] = [{
                id: 'MGT-002',
                name: 'SNMPv3 Only',
                description: 'SNMP must use version 3',
                severity: 'high',
                enabled: true,
                type: 'custom',
                customPredicate: 'snmpV3Only'
            }]

            const result = await lintEngine.evaluate(rules, testContext)

            expect(result.rulesPassed).toBe(1)
        })

        it('should fail MGT-002 with SNMPv2', async () => {
            const configWithSnmpV2: NormalizedConfig = {
                ...sampleConfig,
                mgmt: {
                    ...sampleConfig.mgmt,
                    snmp: { enabled: true, version: 'v2c' }
                }
            }

            const rules: LintRule[] = [{
                id: 'MGT-002',
                name: 'SNMPv3 Only',
                description: 'SNMP must use version 3',
                severity: 'high',
                enabled: true,
                type: 'custom',
                customPredicate: 'snmpV3Only'
            }]

            const result = await lintEngine.evaluate(rules, {
                ...testContext,
                config: configWithSnmpV2
            })

            expect(result.rulesFailed).toBe(1)
        })

        it('should evaluate MGT-003 (multiple NTP servers)', async () => {
            const rules: LintRule[] = [{
                id: 'MGT-003',
                name: 'Multiple NTP Servers',
                description: 'At least 2 NTP servers required',
                severity: 'medium',
                enabled: true,
                type: 'custom',
                customPredicate: 'multipleNtpServers'
            }]

            const result = await lintEngine.evaluate(rules, testContext)

            expect(result.rulesPassed).toBe(1)
        })

        it('should evaluate ACC-001 (ACL has explicit deny)', async () => {
            const rules: LintRule[] = [{
                id: 'ACC-001',
                name: 'Explicit Deny',
                description: 'ACLs must have explicit deny at end',
                severity: 'medium',
                enabled: true,
                type: 'custom',
                customPredicate: 'aclHasExplicitDeny'
            }]

            const result = await lintEngine.evaluate(rules, testContext)

            expect(result.rulesPassed).toBe(1)
        })
    })

    describe('Disabled Rules', () => {
        it('should skip disabled rules', async () => {
            const rules: LintRule[] = [{
                id: 'SKIP-001',
                name: 'Disabled Rule',
                description: 'This rule is disabled',
                severity: 'critical',
                enabled: false,
                type: 'match',
                path: '$.device.hostname',
                condition: { operator: 'notExists' }
            }]

            const result = await lintEngine.evaluate(rules, testContext)

            expect(result.rulesSkipped).toBe(1)
            expect(result.rulesEvaluated).toBe(0)
        })
    })

    describe('Result Summary', () => {
        it('should calculate correct summary counts', async () => {
            const rules: LintRule[] = [
                {
                    id: 'CRIT-001',
                    name: 'Critical Fail',
                    severity: 'critical',
                    enabled: true,
                    type: 'match',
                    path: '$.nonexistent',
                    condition: { operator: 'exists' }
                },
                {
                    id: 'HIGH-001',
                    name: 'High Pass',
                    severity: 'high',
                    enabled: true,
                    type: 'match',
                    path: '$.device.hostname',
                    condition: { operator: 'exists' }
                },
                {
                    id: 'MED-001',
                    name: 'Medium Pass',
                    severity: 'medium',
                    enabled: true,
                    type: 'match',
                    path: '$.mgmt.ssh.enabled',
                    condition: { operator: 'equals', value: true }
                }
            ]

            const result = await lintEngine.evaluate(rules, testContext)

            expect(result.summary.total).toBe(3)
            expect(result.summary.critical).toBe(1)
            expect(result.summary.high).toBe(0)
            expect(result.summary.medium).toBe(0)
            expect(result.summary.passed).toBe(false)
            expect(result.rulesPassed).toBe(2)
            expect(result.rulesFailed).toBe(1)
        })

        it('should include findings with correct details', async () => {
            const rules: LintRule[] = [{
                id: 'FIND-001',
                name: 'Finding Test',
                description: 'Test finding details',
                severity: 'high',
                enabled: true,
                type: 'match',
                path: '$.nonexistent.path',
                condition: { operator: 'exists' }
            }]

            const result = await lintEngine.evaluate(rules, testContext)

            expect(result.findings.length).toBe(1)
            expect(result.findings[0].ruleId).toBe('FIND-001')
            expect(result.findings[0].severity).toBe('high')
            expect(result.findings[0].message).toContain('Finding Test')
        })

        it('should measure duration', async () => {
            const rules: LintRule[] = [{
                id: 'TIME-001',
                name: 'Timing Test',
                severity: 'low',
                enabled: true,
                type: 'match',
                path: '$.device',
                condition: { operator: 'exists' }
            }]

            const result = await lintEngine.evaluate(rules, testContext)

            expect(result.durationMs).toBeGreaterThanOrEqual(0)
        })
    })

    describe('Multiple Rules', () => {
        it('should evaluate all rules in a rulepack', async () => {
            // Sample of the 10 baseline rules
            const baselineRules: LintRule[] = [
                {
                    id: 'SEC-001',
                    name: 'No VLAN 1 Traffic',
                    severity: 'medium',
                    enabled: true,
                    type: 'custom',
                    customPredicate: 'noVlan1Traffic'
                },
                {
                    id: 'SEC-002',
                    name: 'SSH Version 2',
                    severity: 'high',
                    enabled: true,
                    type: 'match',
                    path: '$.mgmt.ssh.version',
                    condition: { operator: 'equals', value: 2 }
                },
                {
                    id: 'MGT-001',
                    name: 'SSH Enabled',
                    severity: 'high',
                    enabled: true,
                    type: 'custom',
                    customPredicate: 'sshEnabled'
                },
                {
                    id: 'MGT-002',
                    name: 'SNMPv3',
                    severity: 'high',
                    enabled: true,
                    type: 'custom',
                    customPredicate: 'snmpV3Only'
                },
                {
                    id: 'MGT-003',
                    name: 'Multiple NTP',
                    severity: 'medium',
                    enabled: true,
                    type: 'custom',
                    customPredicate: 'multipleNtpServers'
                }
            ]

            const result = await lintEngine.evaluate(baselineRules, testContext)

            expect(result.rulesEvaluated).toBe(5)
            expect(result.summary.passed).toBe(true)
        })
    })
})
