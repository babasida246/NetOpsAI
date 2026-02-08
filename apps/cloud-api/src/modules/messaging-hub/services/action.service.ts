import { v4 as uuidv4 } from 'uuid'
import type { ActionSpec, OutboundEnvelope } from '../contracts.js'
import type { PendingActionRepository } from '../repositories/pending-action.repository.js'
import type { UserRepository } from '../repositories/user.repository.js'
import type { AdminRepository } from '../../admin/admin.repository.js'
import type { ToolRegistry } from '@tools/registry'
import { requiresConfirm } from './policy-engine.js'

export class ActionService {
    constructor(
        private pendingRepo: PendingActionRepository,
        private userRepo: UserRepository,
        private adminRepo: AdminRepository,
        private toolRegistry: ToolRegistry
    ) { }

    async handleActionClick(input: {
        actionId: string
        externalUserId: string
        externalChatId: string
        userText?: string
    }): Promise<OutboundEnvelope[]> {
        const pending = await this.pendingRepo.findById(input.actionId)
        if (!pending) {
            return [this.errorEnvelope('Action not found', input.actionId)]
        }

        const now = new Date()
        if (new Date(pending.expiresAt).getTime() < now.getTime()) {
            await this.pendingRepo.updateStatus(pending.actionId, 'expired')
            return [this.errorEnvelope('Action expired', pending.actionId, pending)]
        }

        if (pending.status !== 'pending') {
            return [this.errorEnvelope(`Action already ${pending.status}`, pending.actionId, pending)]
        }

        const wildcardUser = pending.externalUserId === 'any'
        if (input.externalUserId !== 'internal' && !wildcardUser &&
            (pending.externalUserId !== input.externalUserId || pending.externalChatId !== input.externalChatId)) {
            return [this.errorEnvelope('Action does not belong to this chat', pending.actionId, pending)]
        }

        const userId = typeof pending.payload?.userId === 'string' ? pending.payload.userId : undefined
        const user = userId ? await this.userRepo.findById(userId) : null

        const userRole = user?.role || 'operator'

        if (!this.hasActionRole(userRole)) {
            return [this.errorEnvelope('Insufficient permissions', pending.actionId, pending)]
        }

        if (pending.requiresReason && !input.userText) {
            return [this.errorEnvelope('Reason required', pending.actionId, pending)]
        }

        const actionKind = pending.actionKind

        if (actionKind === 'CANCEL') {
            await this.pendingRepo.updateStatus(pending.actionId, 'cancelled', input.userText)
            await this.audit('action_cancel', pending, userRole, input.userText)
            return [this.resultEnvelope('Action cancelled', pending)]
        }

        if (actionKind === 'MUTE') {
            await this.pendingRepo.updateStatus(pending.actionId, 'executed', input.userText)
            await this.audit('action_mute', pending, userRole, input.userText)
            return [this.resultEnvelope('Alert muted', pending)]
        }

        if (actionKind === 'ACK') {
            await this.pendingRepo.updateStatus(pending.actionId, 'executed', input.userText)
            await this.audit('action_ack', pending, userRole, input.userText)
            return [this.resultEnvelope('Alert acknowledged', pending)]
        }

        const toolName = String((pending.payload || {}).toolName || '')
        const toolParams: Record<string, unknown> = { ...((pending.payload || {}).params || {}) }
        const summary = String((pending.payload || {}).summary || `Run ${toolName}`)
        const plan = String((pending.payload || {}).plan || 'Execute the tool as requested.')
        const risk = String((pending.payload || {}).risk || 'Standard')
        const blastRadius = Number((pending.payload || {}).blastRadius || 1)
        const rollbackPlan = String((pending.payload || {}).rollbackPlan || 'Rollback not required for dry-run.')

        if (actionKind === 'RUN' && requiresConfirm(toolName, pending.payload || {})) {
            await this.pendingRepo.updateStatus(pending.actionId, 'confirmed', input.userText)
            return [this.buildConfirmRequest(pending, summary, plan, risk, blastRadius, rollbackPlan)]
        }

        if (actionKind === 'DRY_RUN') {
            toolParams.dryRun = true
        }

        if (!toolName) {
            await this.pendingRepo.updateStatus(pending.actionId, 'cancelled', 'Missing toolName')
            return [this.errorEnvelope('Tool name missing', pending.actionId, pending)]
        }

        await this.pendingRepo.updateStatus(pending.actionId, 'confirmed', input.userText)

        const progress = this.progressEnvelope(`Running ${toolName}...`, pending)

        try {
            const result = await this.toolRegistry.invoke(toolName, toolParams, {
                userId: String((pending.payload || {}).userId || ''),
                role: userRole,
                correlationId: pending.correlationId,
                logger: undefined
            })

            await this.pendingRepo.updateStatus(pending.actionId, 'executed', input.userText)
            await this.audit('action_execute', pending, userRole, input.userText)

            return [
                progress,
                this.resultEnvelope(`Done: ${toolName}`, pending, {
                    toolName,
                    result
                })
            ]
        } catch (error: any) {
            await this.pendingRepo.updateStatus(pending.actionId, 'executed', input.userText)
            await this.audit('action_failed', pending, userRole, input.userText, error?.message)

            return [
                progress,
                this.errorEnvelope(error?.message || 'Tool execution failed', pending.actionId, pending)
            ]
        }
    }

    private buildConfirmRequest(
        pending: any,
        summary: string,
        plan: string,
        risk: string,
        blastRadius: number,
        rollbackPlan: string
    ): OutboundEnvelope {
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString()

        const actions: ActionSpec[] = [
            {
                actionId: uuidv4(),
                label: 'Confirm',
                kind: 'CONFIRM',
                style: 'primary',
                expiresAt,
                payload: pending.payload
            },
            {
                actionId: uuidv4(),
                label: 'Confirm + Reason',
                kind: 'CONFIRM_WITH_REASON',
                style: 'secondary',
                expiresAt,
                requiresReason: true,
                payload: pending.payload
            },
            {
                actionId: uuidv4(),
                label: 'Dry-run',
                kind: 'DRY_RUN',
                style: 'secondary',
                expiresAt,
                payload: { ...pending.payload, params: { ...(pending.payload?.params || {}), dryRun: true } }
            },
            {
                actionId: uuidv4(),
                label: 'Cancel',
                kind: 'CANCEL',
                style: 'danger',
                expiresAt
            }
        ]

        const text = [
            'CONFIRMATION REQUIRED',
            `Summary: ${summary}`,
            `Plan: ${plan}`,
            `Risk: ${risk}`,
            `Blast radius: ${blastRadius}`,
            `Rollback: ${rollbackPlan}`
        ].join('\n')

        return {
            type: 'CONFIRM_REQUEST',
            severity: 'warning',
            conversationId: pending.conversationId,
            correlationId: pending.correlationId,
            target: {
                channelType: 'internal',
                chatId: pending.externalChatId
            },
            text,
            actions
        }
    }

    private progressEnvelope(text: string, pending: any): OutboundEnvelope {
        return {
            type: 'PROGRESS',
            severity: 'info',
            conversationId: pending.conversationId,
            correlationId: pending.correlationId,
            target: {
                channelType: 'internal',
                chatId: pending.externalChatId
            },
            text
        }
    }

    private resultEnvelope(text: string, pending: any, meta?: Record<string, unknown>): OutboundEnvelope {
        return {
            type: 'RESULT',
            severity: 'info',
            conversationId: pending.conversationId,
            correlationId: pending.correlationId,
            target: {
                channelType: 'internal',
                chatId: pending.externalChatId
            },
            text,
            meta
        }
    }

    private errorEnvelope(text: string, actionId: string, pending?: any): OutboundEnvelope {
        return {
            type: 'ERROR',
            severity: 'warning',
            conversationId: pending?.conversationId || 'unknown',
            correlationId: pending?.correlationId || actionId,
            target: {
                channelType: 'internal',
                chatId: pending?.externalChatId
            },
            text
        }
    }

    private hasActionRole(role: string): boolean {
        return ['operator', 'admin', 'super_admin', 'netops_admin', 'netops_operator', 'it_asset_manager'].includes(role)
    }

    private async audit(
        action: string,
        pending: any,
        userRole: string,
        reason?: string,
        error?: string
    ): Promise<void> {
        await this.adminRepo.createAuditLog({
            userId: pending.payload?.userId,
            action,
            resource: 'chatops',
            resourceId: pending.actionId,
            details: {
                actionKind: pending.actionKind,
                toolName: pending.payload?.toolName,
                correlationId: pending.correlationId,
                role: userRole,
                reason,
                error
            }
        })
    }
}
