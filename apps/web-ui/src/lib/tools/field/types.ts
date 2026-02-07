import type { Vendor } from '../config/types'

export type FieldScenario = 'loss' | 'loop' | 'packet-loss' | 'slow'
export type FieldSeverity = 'low' | 'medium' | 'high'
export type FieldStepStatus = 'pending' | 'running' | 'done' | 'blocked' | 'failed'

export type FieldCommand = {
    command: string
    description?: string
    readOnly?: boolean
    risk?: FieldSeverity
}

export type QuickCheckItem = {
    id: string
    title: string
    command: string
    status: 'pass' | 'fail' | 'warn'
    output: string
}

export type QuickCheckSnapshot = {
    id: string
    deviceId: string
    vendor: Vendor
    createdAt: string
    ticketId?: string
    items: QuickCheckItem[]
    overallStatus: 'pass' | 'fail'
}

export type PlaybookStep = {
    id: string
    title: string
    commands: FieldCommand[]
    status: FieldStepStatus
    requiresConfirm?: boolean
    output?: string[]
}

export type PlaybookRun = {
    id: string
    scenario: FieldScenario
    vendor: Vendor
    deviceId: string
    createdAt: string
    steps: PlaybookStep[]
}

export type Snippet = {
    id: string
    title: string
    description: string
    vendor: Vendor | 'any'
    command: string
    risk: FieldSeverity
}

export type VisualPort = {
    id: string
    name: string
    mode: 'access' | 'trunk'
    vlan?: number
    status: 'up' | 'down'
    connectedTo?: string
}

export type VisualizerData = {
    deviceId: string
    updatedAt: string
    ports: VisualPort[]
    vlans: { id: number; name: string }[]
}

export type SnapshotArtifact = {
    config?: string
    diff?: string
    quickCheckId?: string
    logs?: string
}

export type Snapshot = {
    id: string
    deviceId: string
    createdAt: string
    summary: string
    artifacts: SnapshotArtifact
}

export type ConnectivityHop = {
    id: string
    label: string
    commands: FieldCommand[]
    status: FieldStepStatus
    output?: string[]
}

export type ConnectivityPlan = {
    id: string
    deviceId: string
    vendor: Vendor
    createdAt: string
    hops: ConnectivityHop[]
}

export type FieldNote = {
    id: string
    deviceId: string
    author: string
    message: string
    createdAt: string
    attachments?: string[]
}

export type ApprovalRequest = {
    id: string
    deviceId: string
    requestedBy: string
    reason: string
    status: 'pending' | 'approved' | 'rejected'
    createdAt: string
    resolvedAt?: string
    approver?: string
}

export type FieldKitAuditEvent = {
    id: string
    deviceId: string
    ticketId?: string
    type:
        | 'FIELD_QUICK_CHECK_RUN'
        | 'FIELD_PLAYBOOK_STEP_RUN'
        | 'FIELD_SNIPPET_EXEC'
        | 'FIELD_CONFIG_PUSH'
        | 'FIELD_SNAPSHOT_CAPTURE'
        | 'FIELD_NOTE_ADD'
        | 'FIELD_APPROVAL_REQUEST'
    createdAt: string
    actor: string
    detail: string
}
