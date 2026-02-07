import { API_BASE, apiJsonData } from '$lib/api/httpClient'
import type { Vendor } from '../config/types'
import type {
    ApprovalRequest,
    ConnectivityPlan,
    FieldKitAuditEvent,
    FieldNote,
    FieldScenario,
    PlaybookRun,
    QuickCheckSnapshot,
    Snapshot,
    Snippet,
    VisualizerData
} from './types'
import {
    addNote as addNoteMock,
    captureSnapshot as captureSnapshotMock,
    generateConnectivityPlan as generateConnectivityPlanMock,
    generatePlaybook as generatePlaybookMock,
    getVisualizer as getVisualizerMock,
    listApprovals as listApprovalsMock,
    listAudits as listAuditsMock,
    listNotes as listNotesMock,
    listPlaybooks as listPlaybooksMock,
    listQuickChecks as listQuickChecksMock,
    listSnippets as listSnippetsMock,
    listSnapshots as listSnapshotsMock,
    recordAudit as recordAuditMock,
    requestApproval as requestApprovalMock,
    runQuickCheck as runQuickCheckMock
} from './mock'

const FIELD_BASE = `${API_BASE}/netops/field`

export async function runQuickCheck(input: { deviceId: string; vendor: Vendor; ticketId?: string }): Promise<QuickCheckSnapshot> {
    try {
        return await apiJsonData<QuickCheckSnapshot>(`${FIELD_BASE}/quick-check/run`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(input)
        })
    } catch {
        return runQuickCheckMock(input)
    }
}

export async function listQuickChecks(deviceId: string): Promise<QuickCheckSnapshot[]> {
    try {
        return await apiJsonData<QuickCheckSnapshot[]>(`${FIELD_BASE}/quick-check?deviceId=${deviceId}`)
    } catch {
        return listQuickChecksMock(deviceId)
    }
}

export async function generatePlaybook(input: { scenario: FieldScenario; vendor: Vendor; deviceId: string }): Promise<PlaybookRun> {
    try {
        return await apiJsonData<PlaybookRun>(`${FIELD_BASE}/playbook/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(input)
        })
    } catch {
        return generatePlaybookMock(input)
    }
}

export async function listPlaybooks(deviceId: string): Promise<PlaybookRun[]> {
    try {
        return await apiJsonData<PlaybookRun[]>(`${FIELD_BASE}/playbook?deviceId=${deviceId}`)
    } catch {
        return listPlaybooksMock(deviceId)
    }
}

export async function listSnippets(): Promise<Snippet[]> {
    try {
        return await apiJsonData<Snippet[]>(`${FIELD_BASE}/snippets`)
    } catch {
        return listSnippetsMock()
    }
}

export async function getVisualizer(deviceId: string): Promise<VisualizerData> {
    try {
        return await apiJsonData<VisualizerData>(`${FIELD_BASE}/visualizer?deviceId=${deviceId}`)
    } catch {
        return getVisualizerMock(deviceId)
    }
}

export async function captureSnapshot(input: { deviceId: string; quickCheckId?: string; notes?: string; ticketId?: string }): Promise<Snapshot> {
    try {
        return await apiJsonData<Snapshot>(`${FIELD_BASE}/snapshot/capture`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(input)
        })
    } catch {
        return captureSnapshotMock(input)
    }
}

export async function listSnapshots(deviceId: string): Promise<Snapshot[]> {
    try {
        return await apiJsonData<Snapshot[]>(`${FIELD_BASE}/snapshot?deviceId=${deviceId}`)
    } catch {
        return listSnapshotsMock(deviceId)
    }
}

export async function generateConnectivityPlan(input: { deviceId: string; vendor: Vendor }): Promise<ConnectivityPlan> {
    try {
        return await apiJsonData<ConnectivityPlan>(`${FIELD_BASE}/connectivity/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(input)
        })
    } catch {
        return generateConnectivityPlanMock(input)
    }
}

export async function listNotes(deviceId: string): Promise<FieldNote[]> {
    try {
        return await apiJsonData<FieldNote[]>(`${FIELD_BASE}/notes?deviceId=${deviceId}`)
    } catch {
        return listNotesMock(deviceId)
    }
}

export async function addNote(input: { deviceId: string; author: string; message: string; attachments?: string[]; ticketId?: string }): Promise<FieldNote> {
    try {
        return await apiJsonData<FieldNote>(`${FIELD_BASE}/notes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(input)
        })
    } catch {
        return addNoteMock(input)
    }
}

export async function requestApproval(input: { deviceId: string; requestedBy: string; reason: string; ticketId?: string }): Promise<ApprovalRequest> {
    try {
        return await apiJsonData<ApprovalRequest>(`${FIELD_BASE}/approvals`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(input)
        })
    } catch {
        return requestApprovalMock(input)
    }
}

export async function listApprovals(deviceId: string): Promise<ApprovalRequest[]> {
    try {
        return await apiJsonData<ApprovalRequest[]>(`${FIELD_BASE}/approvals?deviceId=${deviceId}`)
    } catch {
        return listApprovalsMock(deviceId)
    }
}

export async function recordAudit(event: Omit<FieldKitAuditEvent, 'id' | 'createdAt'>): Promise<FieldKitAuditEvent> {
    try {
        return await apiJsonData<FieldKitAuditEvent>(`${FIELD_BASE}/audit`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(event)
        })
    } catch {
        return recordAuditMock(event)
    }
}

export async function listAudits(deviceId: string): Promise<FieldKitAuditEvent[]> {
    try {
        return await apiJsonData<FieldKitAuditEvent[]>(`${FIELD_BASE}/audit?deviceId=${deviceId}`)
    } catch {
        return listAuditsMock(deviceId)
    }
}
