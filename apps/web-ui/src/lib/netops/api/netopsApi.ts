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

const API_BASE = '/api';

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
        return fetchApi<Device[]>(`/netops/devices${query ? `?${query}` : ''}`);
    },

    async get(id: string): Promise<Device> {
        return fetchApi<Device>(`/netops/devices/${id}`);
    },

    async create(device: Omit<Device, 'id' | 'created_at' | 'updated_at'>): Promise<Device> {
        return fetchApi<Device>('/netops/devices', {
            method: 'POST',
            body: JSON.stringify(device)
        });
    },

    async update(id: string, updates: Partial<Device>): Promise<Device> {
        return fetchApi<Device>(`/netops/devices/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(updates)
        });
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
        return fetchApi<ConfigVersion>(`/netops/devices/${id}/pull-config`, {
            method: 'POST'
        });
    },

    async getConfigs(id: string): Promise<ConfigVersion[]> {
        return fetchApi<ConfigVersion[]>(`/netops/devices/${id}/configs`);
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
        return fetchApi<ConfigVersion>(`/netops/configs/${id}`);
    },

    async getRaw(id: string): Promise<string> {
        const response = await fetch(`${API_BASE}/netops/configs/${id}/raw`, {
            credentials: 'include'
        });
        return response.text();
    },

    async parseNormalize(id: string): Promise<ConfigVersion> {
        return fetchApi<ConfigVersion>(`/netops/configs/${id}/parse-normalize`, {
            method: 'POST'
        });
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
        return fetchApi<Rulepack[]>('/netops/rulepacks');
    },

    async get(id: string): Promise<Rulepack> {
        return fetchApi<Rulepack>(`/netops/rulepacks/${id}`);
    },

    async create(rulepack: Omit<Rulepack, 'id' | 'created_at'>): Promise<Rulepack> {
        return fetchApi<Rulepack>('/netops/rulepacks', {
            method: 'POST',
            body: JSON.stringify(rulepack)
        });
    },

    async activate(id: string): Promise<Rulepack> {
        return fetchApi<Rulepack>(`/netops/rulepacks/${id}/activate`, {
            method: 'POST'
        });
    }
};

// Lint API
export const lintApi = {
    async run(targetType: 'config_version' | 'change_candidate', targetId: string, rulepackId: string): Promise<LintRun> {
        return fetchApi<LintRun>('/netops/lint/run', {
            method: 'POST',
            body: JSON.stringify({ targetType, targetId, rulepackId })
        });
    },

    async get(id: string): Promise<LintRun> {
        return fetchApi<LintRun>(`/netops/lint/runs/${id}`);
    },

    async getHistory(targetType: string, targetId: string): Promise<LintRun[]> {
        return fetchApi<LintRun[]>(`/netops/lint/history?targetType=${targetType}&targetId=${targetId}`);
    }
};

// Changes API
export const changesApi = {
    async list(filter?: ChangeFilter): Promise<ChangeRequest[]> {
        const params = new URLSearchParams();
        if (filter?.status) params.set('status', filter.status);
        if (filter?.risk_tier) params.set('risk_tier', filter.risk_tier);
        if (filter?.search) params.set('search', filter.search);

        const query = params.toString();
        return fetchApi<ChangeRequest[]>(`/netops/changes${query ? `?${query}` : ''}`);
    },

    async get(id: string): Promise<ChangeRequest & { changeSets?: ChangeSet[] }> {
        return fetchApi(`/netops/changes/${id}`);
    },

    async create(change: Omit<ChangeRequest, 'id' | 'created_at' | 'updated_at' | 'status'>): Promise<ChangeRequest> {
        return fetchApi<ChangeRequest>('/netops/changes', {
            method: 'POST',
            body: JSON.stringify(change)
        });
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
