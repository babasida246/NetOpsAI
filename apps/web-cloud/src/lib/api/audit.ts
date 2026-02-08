import { API_BASE, apiJson, requireAccessToken } from './httpClient'

export type AuditLogEntry = {
  id: string
  userId: string | null
  action: string
  resource: string
  resourceId: string | null
  details: Record<string, unknown> | null
  ipAddress: string | null
  userAgent: string | null
  createdAt: string
}

export type AuditListResponse = {
  data: AuditLogEntry[]
  meta?: {
    page?: number
    limit?: number
    total?: number
  }
}

export type AuditListParams = {
  page?: number
  limit?: number
  userId?: string
  action?: string
  resource?: string
  resourceId?: string
  q?: string
  startDate?: string
  endDate?: string
}

const authJson = <T>(input: string, init?: RequestInit) => {
  requireAccessToken()
  return apiJson<T>(input, init)
}

export async function listAuditLogs(params: AuditListParams = {}): Promise<AuditListResponse> {
  const search = new URLSearchParams()
  if (params.page) search.set('page', String(params.page))
  if (params.limit) search.set('limit', String(params.limit))
  if (params.userId) search.set('userId', params.userId)
  if (params.action) search.set('action', params.action)
  if (params.resource) search.set('resource', params.resource)
  if (params.resourceId) search.set('resourceId', params.resourceId)
  if (params.q) search.set('q', params.q)
  if (params.startDate) search.set('startDate', params.startDate)
  if (params.endDate) search.set('endDate', params.endDate)

  const query = search.toString()
  return authJson<AuditListResponse>(`${API_BASE}/v1/audit${query ? `?${query}` : ''}`)
}

export async function getAuditLogById(id: string): Promise<{ data: AuditLogEntry }> {
  return authJson<{ data: AuditLogEntry }>(`${API_BASE}/v1/audit/${id}`)
}

