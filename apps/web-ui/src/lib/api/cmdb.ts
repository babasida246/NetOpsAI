import { API_BASE, apiJson } from './httpClient'
import { getAssetHeaders } from './assets'

export type CmdbType = { id: string; code: string; name: string; description?: string | null; createdAt?: string }
export type CmdbVersion = { id: string; typeId: string; version: number; status: 'draft' | 'active' | 'retired'; createdBy?: string | null; createdAt?: string }
export type CmdbAttrDef = {
    id: string
    versionId: string
    key: string
    label: string
    fieldType: string
    required: boolean
    unit?: string | null
    enumValues?: string[] | null
    pattern?: string | null
    minValue?: number | null
    maxValue?: number | null
    stepValue?: number | null
    minLen?: number | null
    maxLen?: number | null
    defaultValue?: unknown
    isSearchable: boolean
    isFilterable: boolean
    sortOrder: number
    isActive: boolean
}
export type CiRecord = {
    id: string
    typeId: string
    name: string
    ciCode: string
    status: string
    environment: string
    assetId?: string | null
    locationId?: string | null
    ownerTeam?: string | null
    notes?: string | null
    createdAt?: string
    updatedAt?: string
}
export type CiDetail = {
    ci: CiRecord
    attributes: Array<{ key: string; value?: unknown }>
    schema: CmdbAttrDef[]
    version: CmdbVersion
}
export type RelationshipRecord = {
    id: string
    relTypeId: string
    fromCiId: string
    toCiId: string
    status: string
    sinceDate?: string | null
    note?: string | null
    createdAt?: string
}
export type RelationshipTypeRecord = {
    id: string
    code: string
    name: string
    reverseName?: string | null
    allowedFromTypeId?: string | null
    allowedToTypeId?: string | null
}
export type CiGraph = { nodes: CiRecord[]; edges: RelationshipRecord[] }
export type CmdbServiceRecord = { id: string; code: string; name: string; criticality?: string | null; owner?: string | null; sla?: string | null; status?: string | null; createdAt?: string }
export type CmdbServiceMember = { id: string; serviceId: string; ciId: string; role?: string | null; createdAt?: string }

type ApiResponse<T> = { data: T; meta?: { total?: number; page?: number; limit?: number; warnings?: unknown[]; defs?: CmdbAttrDef[] } }

export async function listCmdbTypes(): Promise<ApiResponse<CmdbType[]>> {
    return apiJson<ApiResponse<CmdbType[]>>(`${API_BASE}/v1/cmdb/types`, { headers: getAssetHeaders() })
}

export async function createCmdbType(input: { code: string; name: string; description?: string | null }): Promise<ApiResponse<CmdbType>> {
    return apiJson<ApiResponse<CmdbType>>(`${API_BASE}/v1/cmdb/types`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAssetHeaders() },
        body: JSON.stringify(input)
    })
}

export async function listTypeVersions(typeId: string): Promise<ApiResponse<CmdbVersion[]>> {
    return apiJson<ApiResponse<CmdbVersion[]>>(`${API_BASE}/v1/cmdb/types/${typeId}/versions`, { headers: getAssetHeaders() })
}

export async function createTypeDraftVersion(typeId: string): Promise<ApiResponse<{ version: CmdbVersion; defs?: CmdbAttrDef[] }>> {
    return apiJson<ApiResponse<{ version: CmdbVersion; defs?: CmdbAttrDef[] }>>(`${API_BASE}/v1/cmdb/types/${typeId}/versions`, {
        method: 'POST',
        headers: getAssetHeaders()
    })
}

export async function publishTypeVersion(versionId: string): Promise<ApiResponse<{ version: CmdbVersion; warnings?: unknown[] }>> {
    return apiJson<ApiResponse<{ version: CmdbVersion; warnings?: unknown[] }>>(`${API_BASE}/v1/cmdb/versions/${versionId}/publish`, {
        method: 'POST',
        headers: getAssetHeaders()
    })
}

export async function listAttrDefs(versionId: string): Promise<ApiResponse<CmdbAttrDef[]>> {
    return apiJson<ApiResponse<CmdbAttrDef[]>>(`${API_BASE}/v1/cmdb/versions/${versionId}/attr-defs`, { headers: getAssetHeaders() })
}

export async function createAttrDef(versionId: string, input: Partial<CmdbAttrDef> & { key: string; label: string; fieldType: string }): Promise<ApiResponse<CmdbAttrDef>> {
    return apiJson<ApiResponse<CmdbAttrDef>>(`${API_BASE}/v1/cmdb/versions/${versionId}/attr-defs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAssetHeaders() },
        body: JSON.stringify(input)
    })
}

export async function updateAttrDef(id: string, patch: Partial<CmdbAttrDef>): Promise<ApiResponse<CmdbAttrDef>> {
    return apiJson<ApiResponse<CmdbAttrDef>>(`${API_BASE}/v1/cmdb/attr-defs/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAssetHeaders() },
        body: JSON.stringify(patch)
    })
}

export async function deleteAttrDef(id: string): Promise<ApiResponse<{ id: string }>> {
    return apiJson<ApiResponse<{ id: string }>>(`${API_BASE}/v1/cmdb/attr-defs/${id}`, {
        method: 'DELETE',
        headers: getAssetHeaders()
    })
}

export async function listCis(params: { q?: string; status?: string; environment?: string; typeId?: string; page?: number; limit?: number }): Promise<ApiResponse<CiRecord[]>> {
    const query = new URLSearchParams()
    if (params.q) query.set('q', params.q)
    if (params.status) query.set('status', params.status)
    if (params.environment) query.set('environment', params.environment)
    if (params.typeId) query.set('typeId', params.typeId)
    if (params.page) query.set('page', String(params.page))
    if (params.limit) query.set('limit', String(params.limit))
    const suffix = query.toString() ? `?${query.toString()}` : ''
    return apiJson<ApiResponse<CiRecord[]>>(`${API_BASE}/v1/cmdb/cis${suffix}`, { headers: getAssetHeaders() })
}

export async function createCi(input: { typeId: string; name: string; ciCode: string; status?: string; environment?: string; attributes?: Record<string, unknown> }): Promise<ApiResponse<CiDetail>> {
    return apiJson<ApiResponse<CiDetail>>(`${API_BASE}/v1/cmdb/cis`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAssetHeaders() },
        body: JSON.stringify(input)
    })
}

export async function getCiDetail(id: string): Promise<ApiResponse<CiDetail>> {
    return apiJson<ApiResponse<CiDetail>>(`${API_BASE}/v1/cmdb/cis/${id}`, { headers: getAssetHeaders() })
}

export async function updateCi(id: string, patch: Partial<{ name: string; status: string; environment: string; notes: string; attributes: Record<string, unknown> }>): Promise<ApiResponse<CiDetail>> {
    return apiJson<ApiResponse<CiDetail>>(`${API_BASE}/v1/cmdb/cis/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAssetHeaders() },
        body: JSON.stringify(patch)
    })
}

export async function getCiGraph(id: string, params?: { depth?: number; direction?: 'upstream' | 'downstream' | 'both' }): Promise<ApiResponse<CiGraph>> {
    const query = new URLSearchParams()
    if (params?.depth) query.set('depth', String(params.depth))
    if (params?.direction) query.set('direction', params.direction)
    const suffix = query.toString() ? `?${query.toString()}` : ''
    return apiJson<ApiResponse<CiGraph>>(`${API_BASE}/v1/cmdb/cis/${id}/graph${suffix}`, { headers: getAssetHeaders() })
}

export async function createRelationship(input: { relTypeId: string; fromCiId: string; toCiId: string; note?: string | null }): Promise<ApiResponse<RelationshipRecord>> {
    return apiJson<ApiResponse<RelationshipRecord>>(`${API_BASE}/v1/cmdb/relationships`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAssetHeaders() },
        body: JSON.stringify(input)
    })
}

export async function listRelationshipTypes(): Promise<ApiResponse<RelationshipTypeRecord[]>> {
    return apiJson<ApiResponse<RelationshipTypeRecord[]>>(`${API_BASE}/v1/cmdb/relationship-types`, {
        headers: getAssetHeaders()
    })
}

export async function createRelationshipType(input: { code: string; name: string; reverseName?: string | null; allowedFromTypeId?: string | null; allowedToTypeId?: string | null }): Promise<ApiResponse<RelationshipTypeRecord>> {
    return apiJson<ApiResponse<RelationshipTypeRecord>>(`${API_BASE}/v1/cmdb/relationship-types`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAssetHeaders() },
        body: JSON.stringify(input)
    })
}

export async function listServices(params: { q?: string; page?: number; limit?: number }): Promise<ApiResponse<CmdbServiceRecord[]>> {
    const query = new URLSearchParams()
    if (params.q) query.set('q', params.q)
    if (params.page) query.set('page', String(params.page))
    if (params.limit) query.set('limit', String(params.limit))
    const suffix = query.toString() ? `?${query.toString()}` : ''
    return apiJson<ApiResponse<CmdbServiceRecord[]>>(`${API_BASE}/v1/cmdb/services${suffix}`, { headers: getAssetHeaders() })
}

export async function createService(input: { code: string; name: string; criticality?: string | null }): Promise<ApiResponse<CmdbServiceRecord>> {
    return apiJson<ApiResponse<CmdbServiceRecord>>(`${API_BASE}/v1/cmdb/services`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAssetHeaders() },
        body: JSON.stringify(input)
    })
}

export async function getServiceDetail(id: string): Promise<ApiResponse<{ service: CmdbServiceRecord; members: CmdbServiceMember[] }>> {
    return apiJson<ApiResponse<{ service: CmdbServiceRecord; members: CmdbServiceMember[] }>>(`${API_BASE}/v1/cmdb/services/${id}`, { headers: getAssetHeaders() })
}

export async function updateService(id: string, patch: Partial<CmdbServiceRecord>): Promise<ApiResponse<CmdbServiceRecord>> {
    return apiJson<ApiResponse<CmdbServiceRecord>>(`${API_BASE}/v1/cmdb/services/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAssetHeaders() },
        body: JSON.stringify(patch)
    })
}

export async function addServiceMember(id: string, input: { ciId: string; role?: string | null }): Promise<ApiResponse<CmdbServiceMember>> {
    return apiJson<ApiResponse<CmdbServiceMember>>(`${API_BASE}/v1/cmdb/services/${id}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAssetHeaders() },
        body: JSON.stringify(input)
    })
}

export async function removeServiceMember(serviceId: string, memberId: string): Promise<ApiResponse<{ memberId: string }>> {
    return apiJson<ApiResponse<{ memberId: string }>>(`${API_BASE}/v1/cmdb/services/${serviceId}/members/${memberId}`, {
        method: 'DELETE',
        headers: getAssetHeaders()
    })
}

export async function getServiceImpact(serviceId: string, params?: { depth?: number; direction?: 'upstream' | 'downstream' | 'both' }): Promise<ApiResponse<CiGraph>> {
    const query = new URLSearchParams()
    if (params?.depth) query.set('depth', String(params.depth))
    if (params?.direction) query.set('direction', params.direction)
    const suffix = query.toString() ? `?${query.toString()}` : ''
    return apiJson<ApiResponse<CiGraph>>(`${API_BASE}/v1/cmdb/services/${serviceId}/impact${suffix}`, { headers: getAssetHeaders() })
}
