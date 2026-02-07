import type { RenderResult, Vendor } from './types'

export type PlaybookType = 'bootstrap' | 'hardening' | 'maintenance' | 'rollback'

export type PlaybookBlock = {
    id: string
    title: string
    commands: string[]
}

const commentPrefix = (vendor: Vendor) => (vendor === 'cisco' ? '!' : '#')

export function buildPlaybook(result: RenderResult, vendor: Vendor, type: PlaybookType): PlaybookBlock[] {
    const prefix = commentPrefix(vendor)

    const precheck: PlaybookBlock = {
        id: 'precheck',
        title: 'Pre-check',
        commands: [`${prefix} Pre-check`, ...result.verifyCommands]
    }

    const apply: PlaybookBlock = {
        id: 'apply',
        title: 'Apply config',
        commands: [`${prefix} Apply configuration`, ...result.commands]
    }

    const verify: PlaybookBlock = {
        id: 'verify',
        title: 'Verify',
        commands: [`${prefix} Verify configuration`, ...result.verifyCommands]
    }

    const save: PlaybookBlock = {
        id: 'save',
        title: 'Save/Commit',
        commands: vendor === 'cisco'
            ? [`${prefix} Save config`, 'write memory']
            : [`${prefix} Save config`, '/system backup save name=before-change']
    }

    const rollback: PlaybookBlock = {
        id: 'rollback',
        title: 'Rollback',
        commands: [`${prefix} Rollback plan`, ...result.rollbackCommands]
    }

    if (type === 'rollback') {
        return [rollback, verify]
    }

    if (type === 'maintenance') {
        return [precheck, apply, verify, save]
    }

    if (type === 'hardening') {
        return [precheck, apply, verify, save]
    }

    return [precheck, apply, verify, save]
}
