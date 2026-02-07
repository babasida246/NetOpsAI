#!/usr/bin/env node

import { Command } from 'commander'
import { statusCommand } from './commands/status.js'
import { seedCommand } from './commands/seed.js'
import { diagramFirewallCommand } from './commands/diagram-firewall.js'

const program = new Command()

program
    .name('gateway-cli')
    .description('NetOpsAI CLI')
    .version('1.0.0')

program
    .command('status')
    .description('Check system status')
    .action(statusCommand)

program
    .command('seed')
    .description('Seed database with model configs')
    .action(seedCommand)

const diagram = program
    .command('diagram')
    .description('Generate diagrams from network configurations (Mermaid output)')

diagram
    .command('firewall')
    .description('Generate firewall logic diagrams (MikroTik/FortiGate)')
    .requiredOption('--vendor <mikrotik|fortigate>', 'Firewall vendor')
    .option('--file <path>', 'Input file (CLI output/config text)')
    .option('--ssh <host>', 'SSH host (collect via allowlisted commands)')
    .option('--user <username>', 'SSH username')
    .option('--pass <password>', 'SSH password')
    .option('--key <path>', 'SSH private key path')
    .option('--view <pipeline|chain|map|all>', 'Diagram view', 'all')
    .option('--format <md|mmd|json>', 'Output format', 'md')
    .option('--out <path>', 'Write output to a file (default: stdout)')
    .option('--max-rules-per-chain <n>', 'Collapse chains after N rules (diagram only)')
    .option('--no-mask-sensitive', 'Do not mask IPs/hostnames in output')
    .action(async (opts) => {
        // Commander converts `--no-mask-sensitive` into `maskSensitive=false`.
        await diagramFirewallCommand(opts)
    })

program.parse()

