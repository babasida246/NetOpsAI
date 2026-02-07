// NetOps API Client
import type {
    Device,
    ConfigVersion,
    Rulepack,
    LintRun,
    ChangeRequest,
    ChangeSet,
    Approval,
    DeviceFilter,
    ChangeFilter
} from '../types';
import { API_BASE } from '$lib/api/httpClient';

class NetOpsApiError extends Error {
    constructor(
        message: string,
        public details?: string,
        public status?: number
    ) {
        super(message);
        this.name = 'NetOpsApiError';
    }
}

const pick = <T>(obj: Record<string, any> | null | undefined, ...keys: string[]): T | undefined => {
    if (!obj) return undefined;
    for (const key of keys) {
        const value = obj[key];
        if (value !== undefined && value !== null) return value as T;
    }
    return undefined;
};

const toIsoString = (value: unknown): string | undefined => {
    if (!value) return undefined;
    const date = value instanceof Date ? value : new Date(value as string);
    if (Number.isNaN(date.getTime())) return undefined;
    return date.toISOString();
};

const toRiskTier = (riskLevel?: string): ChangeRequest['risk_tier'] | undefined => {
    if (!riskLevel) return undefined;
    if (riskLevel === 'medium') return 'med';
    if (riskLevel === 'critical') return 'high';
    return riskLevel as ChangeRequest['risk_tier'];
};

const toRiskLevel = (riskTier?: ChangeFilter['risk_tier']): string | undefined => {
    if (!riskTier) return undefined;
    if (riskTier === 'med') return 'medium';
    return riskTier;
};

const normalizeTags = (tags: unknown): Record<string, unknown> => {
    if (!tags) return {};
    if (Array.isArray(tags)) {
        return tags.reduce<Record<string, unknown>>((acc, tag) => {
            if (typeof tag === 'string') acc[tag] = true;
            return acc;
        }, {});
    }
    if (typeof tags === 'object') {
        return tags as Record<string, unknown>;
    }
    return {};
};

const mapDevice = (device: Record<string, any>): Device => ({
    id: pick<string>(device, 'id') || '',
    name: pick<string>(device, 'name') || '',
    vendor: (pick<string>(device, 'vendor') || 'cisco') as Device['vendor'],
    model: pick<string>(device, 'model'),
    os_version: pick<string>(device, 'osVersion', 'os_version'),
    site: pick<string>(device, 'site'),
    role: pick<string>(device, 'role') as Device['role'] | undefined,
    mgmt_ip: pick<string>(device, 'mgmtIp', 'mgmt_ip') || '',
    tags: normalizeTags(pick(device, 'tags')),
    created_at: toIsoString(pick(device, 'createdAt', 'created_at')) || '',
    updated_at: toIsoString(pick(device, 'updatedAt', 'updated_at')),
    last_config_snapshot: toIsoString(pick(device, 'lastSeenAt', 'last_config_snapshot'))
});

const mapConfigVersion = (config: Record<string, any>): ConfigVersion => ({
    id: pick<string>(config, 'id') || '',
    device_id: pick<string>(config, 'deviceId', 'device_id') || '',
    raw_config: pick<string>(config, 'rawConfig', 'raw_config') || '',
    source: pick<string>(config, 'source') as ConfigVersion['source'],
    checksum: pick<string>(config, 'checksum', 'configHash', 'config_hash') || '',
    collected_at: toIsoString(pick(config, 'collectedAt', 'collected_at')) || '',
    created_by: pick<string>(config, 'createdBy', 'created_by'),
    note: pick<string>(config, 'note'),
    normalized_config: pick<ConfigVersion['normalized_config']>(config, 'normalizedConfig', 'normalized_config')
});

const mapRulepack = (rulepack: Record<string, any>): Rulepack => ({
    id: pick<string>(rulepack, 'id') || '',
    name: pick<string>(rulepack, 'name') || '',
    version: pick<string>(rulepack, 'version') || '',
    vendor_scope: pick<string[]>(rulepack, 'vendorScope')?.[0] as Rulepack['vendor_scope'],
    rules: (pick<Rulepack['rules']>(rulepack, 'rules') || []) as Rulepack['rules'],
    active: !!pick(rulepack, 'isActive', 'active'),
    created_at: toIsoString(pick(rulepack, 'createdAt', 'created_at')) || ''
});

const mapLintRun = (lintRun: Record<string, any>): LintRun => {
    const summary = pick<Record<string, any>>(lintRun, 'summary') || {};
    return {
        id: pick<string>(lintRun, 'id') || '',
        target_type: pick<string>(lintRun, 'targetType', 'target_type') as LintRun['target_type'],
        target_id: pick<string>(lintRun, 'targetId', 'target_id') || '',
        rulepack_id: pick<string>(lintRun, 'rulepackId', 'rulepack_id') || '',
        findings: (pick<LintRun['findings']>(lintRun, 'findings') || []) as LintRun['findings'],
        summary: {
            total: summary.total ?? 0,
            critical: summary.critical ?? 0,
            high: summary.high ?? 0,
            med: summary.med ?? summary.medium ?? 0,
            low: summary.low ?? 0
        },
        status: (pick<string>(lintRun, 'status') || 'completed') as LintRun['status'],
        run_at: toIsoString(pick(lintRun, 'runAt', 'run_at', 'completedAt', 'createdAt', 'created_at')) || ''
    };
};

const mapChangeRequest = (change: Record<string, any>): ChangeRequest => ({
    id: pick<string>(change, 'id') || '',
    title: pick<string>(change, 'title') || '',
    status: pick<string>(change, 'status') as ChangeRequest['status'],
    intent_type: pick<string>(change, 'intentType', 'intent_type') || '',
    params: (pick<Record<string, unknown>>(change, 'intentParams', 'intent_params', 'params') || {}) as ChangeRequest['params'],
    device_scope: (pick<string[]>(change, 'deviceScope', 'device_scope') || []) as ChangeRequest['device_scope'],
    risk_tier: toRiskTier(pick<string>(change, 'riskLevel', 'risk_tier')) || 'low',
    created_by: pick<string>(change, 'createdBy', 'created_by') || '',
    created_at: toIsoString(pick(change, 'createdAt', 'created_at')) || '',
    updated_at: toIsoString(pick(change, 'updatedAt', 'updated_at'))
});

const mapChangeSet = (changeSet: Record<string, any>): ChangeSet => ({
    device_id: pick<string>(changeSet, 'deviceId', 'device_id') || '',
    candidate_config: pick<string>(changeSet, 'candidateConfig', 'candidate_config') || '',
    diff: pick<string>(changeSet, 'diffPreview', 'diff') || '',
    precheck_steps: (pick<ChangeSet['precheck_steps']>(changeSet, 'precheckSteps', 'precheck_steps') || []) as ChangeSet['precheck_steps'],
    apply_steps: (pick<ChangeSet['apply_steps']>(changeSet, 'applySteps', 'apply_steps') || []) as ChangeSet['apply_steps'],
    postcheck_steps: (pick<ChangeSet['postcheck_steps']>(changeSet, 'postcheckSteps', 'postcheck_steps') || []) as ChangeSet['postcheck_steps'],
    rollback_plan: (pick<ChangeSet['rollback_plan']>(changeSet, 'rollbackPlan', 'rollback_plan') || []) as ChangeSet['rollback_plan'],
    lint_run_id: pick<string>(changeSet, 'lintRunId', 'lint_run_id')
});

async function fetchApi<T>(
    endpoint: string,
    options: RequestInit = {}
): Promise<T> {
    try {
        const response = await fetch(`${API_BASE}${endpoint}`, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            credentials: 'include'
        });

        if (!response.ok) {
            let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
            let details: string | undefined;

            try {
                const errorData = await response.json();
                errorMessage = errorData.message || errorMessage;
                details = errorData.details || errorData.error;
            } catch {
                // Response wasn't JSON
            }

            throw new NetOpsApiError(errorMessage, details, response.status);
        }

        const data = await response.json();
        return data as T;
    } catch (error) {
        if (error instanceof NetOpsApiError) {
            throw error;
        }
        throw new NetOpsApiError(
            error instanceof Error ? error.message : 'Network error',
            undefined,
            0
        );
    }
}

// Devices API
export const devicesApi = {
    async list(filter?: DeviceFilter): Promise<Device[]> {
        const params = new URLSearchParams();
        if (filter?.vendor) params.set('vendor', filter.vendor);
        if (filter?.site) params.set('site', filter.site);
        if (filter?.role) params.set('role', filter.role);
        if (filter?.search) params.set('search', filter.search);

        const query = params.toString();
        const response = await fetchApi<{ data: Record<string, any>[], total: number, limit: number }>(`/netops/devices${query ? `?${query}` : ''}`);
        return response.data.map(mapDevice);
    },

    async get(id: string): Promise<Device> {
        const response = await fetchApi<Record<string, any>>(`/netops/devices/${id}`);
        return mapDevice(response);
    },

    async create(device: Omit<Device, 'id' | 'created_at' | 'updated_at'>): Promise<Device> {
        const payload = {
            name: device.name,
            hostname: device.name,
            vendor: device.vendor,
            model: device.model,
            osVersion: device.os_version,
            site: device.site,
            role: device.role,
            mgmtIp: device.mgmt_ip,
            tags: Array.isArray(device.tags) ? device.tags : Object.keys(device.tags || {})
        };
        const response = await fetchApi<Record<string, any>>('/netops/devices', {
            method: 'POST',
            body: JSON.stringify(payload)
        });
        return mapDevice(response);
    },

    async update(id: string, updates: Partial<Device>): Promise<Device> {
        const payload = {
            name: updates.name,
            hostname: updates.name,
            vendor: updates.vendor,
            model: updates.model,
            osVersion: updates.os_version,
            site: updates.site,
            role: updates.role,
            mgmtIp: updates.mgmt_ip,
            tags: updates.tags ? (Array.isArray(updates.tags) ? updates.tags : Object.keys(updates.tags || {})) : undefined
        };
        const response = await fetchApi<Record<string, any>>(`/netops/devices/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(payload)
        });
        return mapDevice(response);
    },

    async delete(id: string): Promise<void> {
        await fetchApi<void>(`/netops/devices/${id}`, {
            method: 'DELETE'
        });
    },

    async importCsv(file: File): Promise<{ imported: number; errors: string[] }> {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch(`${API_BASE}/netops/devices/import`, {
            method: 'POST',
            body: formData,
            credentials: 'include'
        });

        if (!response.ok) {
            throw new NetOpsApiError(`Import failed: ${response.statusText}`);
        }

        return response.json();
    },

    async pullConfig(id: string): Promise<ConfigVersion> {
        const response = await fetchApi<Record<string, any>>(`/netops/devices/${id}/pull-config`, {
            method: 'POST'
        });
        return mapConfigVersion(response);
    },

    async getConfigs(id: string): Promise<ConfigVersion[]> {
        const response = await fetchApi<Record<string, any>[]>(`/netops/devices/${id}/configs`);
        return response.map(mapConfigVersion);
    },

    async collectFacts(id: string): Promise<Record<string, unknown>> {
        return fetchApi<Record<string, unknown>>(`/netops/devices/${id}/collect-facts`, {
            method: 'POST'
        });
    }
};

// Configs API
export const configsApi = {
    async get(id: string): Promise<ConfigVersion> {
        const response = await fetchApi<Record<string, any>>(`/netops/configs/${id}`);
        return mapConfigVersion(response);
    },

    async getRaw(id: string): Promise<string> {
        const response = await fetch(`${API_BASE}/netops/configs/${id}/raw`, {
            credentials: 'include'
        });
        return response.text();
    },

    async parseNormalize(id: string): Promise<ConfigVersion> {
        const response = await fetchApi<Record<string, any>>(`/netops/configs/${id}/parse-normalize`, {
            method: 'POST'
        });
        return mapConfigVersion(response);
    },

    async diff(id: string, compareWith: string): Promise<string> {
        const response = await fetch(
            `${API_BASE}/netops/configs/${id}/diff?compareWith=${compareWith}`,
            { credentials: 'include' }
        );
        return response.text();
    }
};

// Rulepacks API
export const rulepacksApi = {
    async list(): Promise<Rulepack[]> {
        const response = await fetchApi<Record<string, any>[]>('/netops/rulepacks');
        return response.map(mapRulepack);
    },

    async get(id: string): Promise<Rulepack> {
        const response = await fetchApi<Record<string, any>>(`/netops/rulepacks/${id}`);
        return mapRulepack(response);
    },

    async create(rulepack: Omit<Rulepack, 'id' | 'created_at'>): Promise<Rulepack> {
        const payload = {
            name: rulepack.name,
            version: rulepack.version,
            vendorScope: rulepack.vendor_scope ? [rulepack.vendor_scope] : [],
            rules: rulepack.rules
        };
        const response = await fetchApi<Record<string, any>>('/netops/rulepacks', {
            method: 'POST',
            body: JSON.stringify(payload)
        });
        return mapRulepack(response);
    },

    async activate(id: string): Promise<Rulepack> {
        const response = await fetchApi<Record<string, any>>(`/netops/rulepacks/${id}/activate`, {
            method: 'POST'
        });
        return mapRulepack(response);
    }
};

// Lint API
export const lintApi = {
    async run(targetType: 'config_version' | 'change_candidate', targetId: string, rulepackId: string): Promise<LintRun> {
        const normalizedTarget = targetType === 'change_candidate' ? 'change_set' : targetType;
        const response = await fetchApi<Record<string, any>>('/netops/lint/run', {
            method: 'POST',
            body: JSON.stringify({ targetType: normalizedTarget, targetId, rulepackId })
        });
        return mapLintRun(response);
    },

    async get(id: string): Promise<LintRun> {
        const response = await fetchApi<Record<string, any>>(`/netops/lint/runs/${id}`);
        return mapLintRun(response);
    },

    async getHistory(targetType: string, targetId: string): Promise<LintRun[]> {
        const normalizedTarget = targetType === 'change_candidate' ? 'change_set' : targetType;
        const response = await fetchApi<Record<string, any>[]>(`/netops/lint/history?targetType=${normalizedTarget}&targetId=${targetId}`);
        return response.map(mapLintRun);
    }
};

// Changes API
export const changesApi = {
    async list(filter?: ChangeFilter): Promise<ChangeRequest[]> {
        const params = new URLSearchParams();
        if (filter?.status) params.set('status', filter.status);
        if (filter?.risk_tier) params.set('riskLevel', toRiskLevel(filter.risk_tier) || filter.risk_tier);
        if (filter?.search) params.set('search', filter.search);

        const query = params.toString();
        const response = await fetchApi<{ data: Record<string, any>[], total: number }>(`/netops/changes${query ? `?${query}` : ''}`);
        return response.data.map(mapChangeRequest);
    },

    async get(id: string): Promise<ChangeRequest & { changeSets?: ChangeSet[] }> {
        const response = await fetchApi<Record<string, any>>(`/netops/changes/${id}`);
        const change = mapChangeRequest(response);
        const changeSetsRaw = pick<Record<string, any>[]>(response, 'changeSets', 'change_sets');
        return {
            ...change,
            changeSets: changeSetsRaw ? changeSetsRaw.map(mapChangeSet) : undefined
        };
    },

    async create(change: Omit<ChangeRequest, 'id' | 'created_at' | 'updated_at' | 'status'>): Promise<ChangeRequest> {
        const payload = {
            title: change.title,
            description: change.description,
            intentType: change.intent_type,
            intentParams: change.params,
            deviceScope: change.device_scope,
            riskLevel: toRiskLevel(change.risk_tier),
            requiredApprovals: 1,
            lintBlocking: true
        };
        const response = await fetchApi<Record<string, any>>('/netops/changes', {
            method: 'POST',
            body: JSON.stringify(payload)
        });
        return mapChangeRequest(response);
    },

    async plan(id: string): Promise<{ missing_info: string[]; task_graph: unknown }> {
        return fetchApi(`/netops/changes/${id}/plan`, {
            method: 'POST'
        });
    },

    async generate(id: string): Promise<{ changeSets: ChangeSet[] }> {
        return fetchApi(`/netops/changes/${id}/generate`, {
            method: 'POST'
        });
    },

    async verify(id: string): Promise<{ verify_plan: unknown; lint_summary: unknown }> {
        return fetchApi(`/netops/changes/${id}/verify`, {
            method: 'POST'
        });
    },

    async submitApproval(id: string): Promise<Approval> {
        return fetchApi<Approval>(`/netops/changes/${id}/submit-approval`, {
            method: 'POST'
        });
    },

    async approve(id: string): Promise<void> {
        await fetchApi(`/netops/changes/${id}/approve`, {
            method: 'POST'
        });
    },

    async reject(id: string, reason: string): Promise<void> {
        await fetchApi(`/netops/changes/${id}/reject`, {
            method: 'POST',
            body: JSON.stringify({ reason })
        });
    },

    async deploy(id: string): Promise<void> {
        await fetchApi(`/netops/changes/${id}/deploy`, {
            method: 'POST'
        });
    },

    async close(id: string): Promise<void> {
        await fetchApi(`/netops/changes/${id}/close`, {
            method: 'POST'
        });
    }
};

export { NetOpsApiError };
