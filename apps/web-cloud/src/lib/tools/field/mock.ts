import type {
    ApprovalRequest,
    ConnectivityPlan,
    ConnectivityHop,
    FieldKitAuditEvent,
    FieldNote,
    FieldScenario,
    PlaybookRun,
    PlaybookStep,
    QuickCheckSnapshot,
    Snapshot,
    Snippet,
    VisualPort,
    VisualizerData
} from './types'
import type { Vendor } from '../config/types'

type FieldKitStore = {
    quickChecks: QuickCheckSnapshot[]
    playbooks: PlaybookRun[]
    snapshots: Snapshot[]
    notes: FieldNote[]
    approvals: ApprovalRequest[]
    audits: FieldKitAuditEvent[]
}

const STORE_KEY = 'fieldKitStore'
let memoryStore: FieldKitStore | null = null

function nowIso(): string {
    return new Date().toISOString()
}

function createId(prefix: string): string {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
        return `${prefix}_${crypto.randomUUID()}`
    }
    return `${prefix}_${Math.random().toString(36).slice(2)}`
}

function hash(value: string): number {
    let total = 0
    for (let i = 0; i < value.length; i += 1) {
        total = (total << 5) - total + value.charCodeAt(i)
        total |= 0
    }
    return Math.abs(total)
}

function loadStore(): FieldKitStore {
    if (memoryStore) return memoryStore
    const empty: FieldKitStore = {
        quickChecks: [],
        playbooks: [],
        snapshots: [],
        notes: [],
        approvals: [],
        audits: []
    }

    if (typeof window === 'undefined') {
        memoryStore = empty
        return empty
    }

    try {
        const raw = window.localStorage.getItem(STORE_KEY)
        if (!raw) {
            memoryStore = empty
            return empty
        }
        const parsed = JSON.parse(raw) as FieldKitStore
        memoryStore = { ...empty, ...parsed }
        return memoryStore
    } catch {
        memoryStore = empty
        return empty
    }
}

function saveStore(store: FieldKitStore): void {
    memoryStore = store
    if (typeof window === 'undefined') return
    window.localStorage.setItem(STORE_KEY, JSON.stringify(store))
}

export function recordAudit(event: Omit<FieldKitAuditEvent, 'id' | 'createdAt'>): FieldKitAuditEvent {
    const store = loadStore()
    const entry: FieldKitAuditEvent = {
        id: createId('audit'),
        createdAt: nowIso(),
        ...event
    }
    store.audits.unshift(entry)
    saveStore(store)
    return entry
}

export function listAudits(deviceId?: string): FieldKitAuditEvent[] {
    const store = loadStore()
    if (!deviceId) return store.audits
    return store.audits.filter((entry) => entry.deviceId === deviceId)
}

export function runQuickCheck(input: { deviceId: string; vendor: Vendor; ticketId?: string }): QuickCheckSnapshot {
    const store = loadStore()
    const seed = hash(input.deviceId + input.vendor)
    const itemTemplates = [
        { id: 'ping-gw', title: 'Ping gateway', command: 'ping <gateway> count 3' },
        { id: 'dns', title: 'DNS resolve', command: 'nslookup example.com' },
        { id: 'ntp', title: 'NTP sync', command: 'show ntp status' },
        { id: 'cpu', title: 'CPU / RAM', command: 'show system resources' },
        { id: 'if', title: 'Interface status', command: 'show interface status' },
        { id: 'clock', title: 'Clock / uptime', command: 'show clock' }
    ]

    const failIndex = seed % itemTemplates.length
    const warnIndex = (seed + 2) % itemTemplates.length

    const items = itemTemplates.map((item, index) => {
        let status: 'pass' | 'fail' | 'warn' = 'pass'
        if (index === failIndex && seed % 5 === 0) status = 'fail'
        if (index === warnIndex && status !== 'fail') status = 'warn'

        return {
            ...item,
            status,
            output:
                status === 'pass'
                    ? 'OK'
                    : status === 'warn'
                      ? 'Warning detected, verify on device'
                      : 'Failed - check connectivity'
        }
    })

    const snapshot: QuickCheckSnapshot = {
        id: createId('quick'),
        deviceId: input.deviceId,
        vendor: input.vendor,
        createdAt: nowIso(),
        ticketId: input.ticketId,
        items,
        overallStatus: items.some((item) => item.status === 'fail') ? 'fail' : 'pass'
    }

    store.quickChecks.unshift(snapshot)
    saveStore(store)
    return snapshot
}

export function listQuickChecks(deviceId: string): QuickCheckSnapshot[] {
    const store = loadStore()
    return store.quickChecks.filter((item) => item.deviceId === deviceId)
}

export function generatePlaybook(input: { scenario: FieldScenario; vendor: Vendor; deviceId: string }): PlaybookRun {
    const commandsByVendor = {
        mikrotik: {
            interface: ['/interface print', '/interface ethernet print detail'],
            routing: ['/ip route print', '/ip arp print'],
            vlan: ['/interface vlan print', '/interface bridge vlan print'],
            firewall: ['/ip firewall filter print'],
            system: ['/system resource print', '/system clock print']
        },
        cisco: {
            interface: ['show interface status', 'show ip interface brief'],
            routing: ['show ip route', 'show ip arp'],
            vlan: ['show vlan brief', 'show interface trunk'],
            firewall: ['show access-lists'],
            system: ['show processes cpu', 'show clock']
        }
    }

    const vendorCommands = input.vendor === 'cisco' ? commandsByVendor.cisco : commandsByVendor.mikrotik

    const steps: PlaybookStep[] = [
        {
            id: 'step-1',
            title: 'Check interface health',
            commands: vendorCommands.interface.map((cmd) => ({ command: cmd, readOnly: true, risk: 'low' })),
            status: 'pending' as const
        },
        {
            id: 'step-2',
            title: 'Verify routing + ARP tables',
            commands: vendorCommands.routing.map((cmd) => ({ command: cmd, readOnly: true, risk: 'low' })),
            status: 'pending' as const
        },
        {
            id: 'step-3',
            title: 'Inspect VLAN mapping',
            commands: vendorCommands.vlan.map((cmd) => ({ command: cmd, readOnly: true, risk: 'low' })),
            status: 'pending' as const
        },
        {
            id: 'step-4',
            title: 'Check firewall counters',
            commands: vendorCommands.firewall.map((cmd) => ({ command: cmd, readOnly: true, risk: 'medium' })),
            status: 'pending' as const
        },
        {
            id: 'step-5',
            title: 'System load + clock',
            commands: vendorCommands.system.map((cmd) => ({ command: cmd, readOnly: true, risk: 'low' })),
            status: 'pending' as const
        }
    ]

    if (input.scenario === 'loop') {
        steps.unshift({
            id: 'loop-guard',
            title: 'Loop detection check',
            commands: [{ command: input.vendor === 'cisco' ? 'show spanning-tree' : '/interface bridge host print', readOnly: true, risk: 'medium' }],
            status: 'pending' as const,
            requiresConfirm: true
        })
    }

    const playbook: PlaybookRun = {
        id: createId('playbook'),
        scenario: input.scenario,
        vendor: input.vendor,
        deviceId: input.deviceId,
        createdAt: nowIso(),
        steps
    }

    const store = loadStore()
    store.playbooks.unshift(playbook)
    saveStore(store)
    return playbook
}

export function listPlaybooks(deviceId: string): PlaybookRun[] {
    const store = loadStore()
    return store.playbooks.filter((item) => item.deviceId === deviceId)
}

export function listSnippets(): Snippet[] {
    return [
        {
            id: 'show-interface',
            title: 'Show interface summary',
            description: 'Quick interface status check',
            vendor: 'any',
            command: 'show interface status',
            risk: 'low'
        },
        {
            id: 'show-vlan',
            title: 'Show VLANs',
            description: 'Inspect VLAN database and trunking',
            vendor: 'any',
            command: 'show vlan brief',
            risk: 'low'
        },
        {
            id: 'show-route',
            title: 'Show routing table',
            description: 'Check routes and next-hop',
            vendor: 'any',
            command: 'show ip route',
            risk: 'low'
        },
        {
            id: 'firewall-counters',
            title: 'Firewall counters',
            description: 'Inspect firewall hit counts',
            vendor: 'any',
            command: 'show access-lists',
            risk: 'medium'
        },
        {
            id: 'reload',
            title: 'Reload device (restricted)',
            description: 'Dangerous - requires approval',
            vendor: 'any',
            command: 'reload',
            risk: 'high'
        }
    ]
}

export function getVisualizer(deviceId: string): VisualizerData {
    const seed = hash(deviceId)
    const ports: VisualPort[] = Array.from({ length: 6 }, (_, index) => {
        const status: VisualPort['status'] = (seed + index) % 3 === 0 ? 'down' : 'up'
        const mode: VisualPort['mode'] = index % 2 === 0 ? 'access' : 'trunk'
        return {
            id: `port-${index + 1}`,
            name: `Gi0/${index + 1}`,
            mode,
            vlan: mode === 'access' ? 10 + index : undefined,
            status,
            connectedTo: status === 'up' ? `SW-${index + 1}` : undefined
        }
    })

    return {
        deviceId,
        updatedAt: nowIso(),
        ports,
        vlans: [
            { id: 10, name: 'Users' },
            { id: 20, name: 'Voice' },
            { id: 30, name: 'Servers' }
        ]
    }
}

export function captureSnapshot(input: { deviceId: string; quickCheckId?: string; notes?: string }): Snapshot {
    const store = loadStore()
    const snapshot: Snapshot = {
        id: createId('snap'),
        deviceId: input.deviceId,
        createdAt: nowIso(),
        summary: input.notes || 'Field snapshot captured',
        artifacts: {
            quickCheckId: input.quickCheckId,
            config: 'mock-config-export',
            diff: 'mock-diff-baseline',
            logs: 'mock-log-output'
        }
    }
    store.snapshots.unshift(snapshot)
    saveStore(store)
    return snapshot
}

export function listSnapshots(deviceId: string): Snapshot[] {
    const store = loadStore()
    return store.snapshots.filter((item) => item.deviceId === deviceId)
}

export function generateConnectivityPlan(input: { deviceId: string; vendor: Vendor }): ConnectivityPlan {
    const hops: ConnectivityHop[] = [
        {
            id: 'endpoint',
            label: 'Endpoint ↔ Access switch',
            commands: [{ command: 'ping <endpoint> count 5', readOnly: true, risk: 'low' }],
            status: 'pending' as const
        },
        {
            id: 'access',
            label: 'Access ↔ Distribution',
            commands: [{ command: input.vendor === 'cisco' ? 'show interface trunk' : '/interface bridge port print', readOnly: true, risk: 'low' }],
            status: 'pending' as const
        },
        {
            id: 'dist',
            label: 'Distribution ↔ Router',
            commands: [{ command: input.vendor === 'cisco' ? 'show ip route' : '/ip route print', readOnly: true, risk: 'low' }],
            status: 'pending' as const
        },
        {
            id: 'router',
            label: 'Router ↔ ISP',
            commands: [{ command: input.vendor === 'cisco' ? 'ping <isp-gw> repeat 3' : 'ping <isp-gw> count 3', readOnly: true, risk: 'low' }],
            status: 'pending' as const
        }
    ]

    return {
        id: createId('connect'),
        deviceId: input.deviceId,
        vendor: input.vendor,
        createdAt: nowIso(),
        hops
    }
}

export function listNotes(deviceId: string): FieldNote[] {
    const store = loadStore()
    return store.notes.filter((note) => note.deviceId === deviceId)
}

export function addNote(input: { deviceId: string; author: string; message: string; attachments?: string[] }): FieldNote {
    const store = loadStore()
    const note: FieldNote = {
        id: createId('note'),
        deviceId: input.deviceId,
        author: input.author,
        message: input.message,
        attachments: input.attachments,
        createdAt: nowIso()
    }
    store.notes.unshift(note)
    saveStore(store)
    return note
}

export function requestApproval(input: { deviceId: string; requestedBy: string; reason: string }): ApprovalRequest {
    const store = loadStore()
    const approval: ApprovalRequest = {
        id: createId('approval'),
        deviceId: input.deviceId,
        requestedBy: input.requestedBy,
        reason: input.reason,
        status: 'pending',
        createdAt: nowIso()
    }
    store.approvals.unshift(approval)
    saveStore(store)
    return approval
}

export function listApprovals(deviceId: string): ApprovalRequest[] {
    const store = loadStore()
    return store.approvals.filter((approval) => approval.deviceId === deviceId)
}
