export type ChannelType = 'telegram' | 'discord' | 'email' | 'internal'

export type EnvelopeType =
    | 'ALERT'
    | 'SUGGESTION'
    | 'CONFIRM_REQUEST'
    | 'PROGRESS'
    | 'RESULT'
    | 'ERROR'
    | 'FYI'

export type Severity = 'info' | 'warning' | 'critical'

export type ActionKind =
    | 'ACK'
    | 'RUN'
    | 'DRY_RUN'
    | 'EDIT_PARAMS'
    | 'CONFIRM'
    | 'CONFIRM_WITH_REASON'
    | 'CANCEL'
    | 'MUTE'

export interface ActionSpec {
    actionId: string
    label: string
    kind: ActionKind
    style?: 'primary' | 'danger' | 'secondary'
    payload?: Record<string, unknown>
    expiresAt: string
    requiresReason?: boolean
}

export interface OutboundTarget {
    channelType: Exclude<ChannelType, 'internal'> | 'internal'
    chatId?: string
    channelId?: string
    email?: string
    threadId?: string
    replyToExternalMessageId?: string
}

export interface OutboundEnvelope {
    type: EnvelopeType
    severity: Severity
    conversationId: string
    correlationId: string
    dedupKey?: string
    target: OutboundTarget
    text: string
    actions?: ActionSpec[]
    meta?: {
        provider?: string
        model?: string
        cost?: number
        toolName?: string
        latencyMs?: number
        tags?: string[]
    }
}

export interface InboundEvent {
    channelType: 'telegram' | 'discord'
    externalEventId: string
    externalUserId: string
    externalChatId: string
    text?: string
    replyToExternalMessageId?: string
    actionClick?: {
        actionId: string
        userText?: string
    }
    timestamp: string
    raw: Record<string, unknown>
}

export interface AlertEvent {
    type: string
    severity: Severity
    text: string
    dedupKey?: string
    actions?: ActionSpec[]
    tags?: string[]
}
