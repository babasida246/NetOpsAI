/**
 * Asset Catalogs Module
 * 
 * Manages asset categories, vendors, models, locations, and spec definitions.
 */
import { API_BASE, apiJson, buildQuery, getAssetHeaders } from '../../core/http-client'
import type { ApiResponse } from '../../core/types'

// ============================================================================
// Types
// ============================================================================

export type Vendor = {
    id: string
    name: string
    taxCode?: string | null
    phone?: string | null
    email?: string | null
    address?: string | null
}

export type Location = {
    id: string
    name: string
    parentId?: string | null
    path: string
}

export type AssetCategory = {
    id: string
    name: string
}

export type AssetModel = {
    id: string
    model: string
    brand?: string | null
    categoryId?: string | null
    specVersionId?: string | null
    vendorId?: string | null
    spec: Record<string, unknown>
}

export type SpecFieldType = 'string' | 'number' | 'boolean' | 'enum' | 'date' | 'ip' | 'mac' | 'hostname' | 'cidr' | 'port' | 'regex' | 'json' | 'multi_enum'
export type NormalizeMode = 'trim' | 'upper' | 'lower'
export type SpecVersionStatus = 'draft' | 'active' | 'retired'

export type CategorySpecVersion = {
    id: string
    categoryId: string
    version: number
    status: SpecVersionStatus
    createdBy?: string | null
    createdAt?: string
}

export type CategorySpecDef = {
    id: string
    versionId: string
    key: string
    label: string
    fieldType: SpecFieldType
    unit?: string | null
    required: boolean
    enumValues?: string[] | null
    pattern?: string | null
    minLen?: number | null
    maxLen?: number | null
    minValue?: number | null
    maxValue?: number | null
    stepValue?: number | null
    precision?: number | null
    scale?: number | null
    normalize?: NormalizeMode | null
    defaultValue?: unknown
    helpText?: string | null
    sortOrder: number
    isActive: boolean
    isReadonly: boolean
    computedExpr?: string | null
    isSearchable: boolean
    isFilterable: boolean
    createdAt?: string
    updatedAt?: string
}

export type Catalogs = {
    categories: AssetCategory[]
    locations: Location[]
    vendors: Vendor[]
    models: AssetModel[]
}

export type VendorInput = {
    name: string
    taxCode?: string | null
    phone?: string | null
    email?: string | null
    address?: string | null
}

export type CategoryInput = { name: string }

export type ModelInput = {
    model: string
    brand?: string | null
    categoryId?: string | null
    specVersionId?: string | null
    vendorId?: string | null
    spec?: Record<string, unknown> | null
}

export type LocationInput = {
    name: string
    parentId?: string | null
}

export type CategorySpecDefInput = {
    key: string
    label: string
    fieldType: SpecFieldType
    unit?: string | null
    required?: boolean
    enumValues?: string[] | null
    pattern?: string | null
    minLen?: number | null
    maxLen?: number | null
    minValue?: number | null
    maxValue?: number | null
    stepValue?: number | null
    precision?: number | null
    scale?: number | null
    normalize?: NormalizeMode | null
    defaultValue?: unknown
    helpText?: string | null
    sortOrder?: number
    isActive?: boolean
    isReadonly?: boolean
    computedExpr?: string | null
    isSearchable?: boolean
    isFilterable?: boolean
}

// ============================================================================
// Catalogs API
// ============================================================================

export async function getAssetCatalogs(): Promise<ApiResponse<Catalogs>> {
    return apiJson<ApiResponse<Catalogs>>(`${API_BASE}/v1/assets/catalogs`, {
        headers: getAssetHeaders()
    })
}

// ============================================================================
// Categories API
// ============================================================================

export async function createCategory(input: CategoryInput): Promise<ApiResponse<{ category: AssetCategory; versionId: string; specDefs?: CategorySpecDef[] }>> {
    return apiJson<ApiResponse<{ category: AssetCategory; versionId: string; specDefs?: CategorySpecDef[] }>>(`${API_BASE}/v1/asset-categories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAssetHeaders() },
        body: JSON.stringify(input)
    })
}

export async function updateCategory(id: string, patch: Partial<CategoryInput>): Promise<ApiResponse<AssetCategory>> {
    return apiJson<ApiResponse<AssetCategory>>(`${API_BASE}/v1/assets/catalogs/categories/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAssetHeaders() },
        body: JSON.stringify(patch)
    })
}

export async function deleteCategory(id: string): Promise<ApiResponse<{ id: string }>> {
    return apiJson<ApiResponse<{ id: string }>>(`${API_BASE}/v1/assets/catalogs/categories/${id}`, {
        method: 'DELETE',
        headers: { ...getAssetHeaders() }
    })
}

// ============================================================================
// Category Spec Versions API
// ============================================================================

export async function getCategorySpecDefs(categoryId: string): Promise<ApiResponse<CategorySpecDef[]>> {
    return apiJson<ApiResponse<CategorySpecDef[]>>(`${API_BASE}/v1/asset-categories/${categoryId}/spec-defs`, {
        headers: { ...getAssetHeaders() }
    })
}

export async function getCategorySpecVersions(categoryId: string): Promise<ApiResponse<CategorySpecVersion[]>> {
    return apiJson<ApiResponse<CategorySpecVersion[]>>(`${API_BASE}/v1/asset-categories/${categoryId}/spec-versions`, {
        headers: { ...getAssetHeaders() }
    })
}

export async function createCategorySpecVersion(categoryId: string): Promise<ApiResponse<{ version: CategorySpecVersion; specDefs: CategorySpecDef[] }>> {
    return apiJson<ApiResponse<{ version: CategorySpecVersion; specDefs: CategorySpecDef[] }>>(`${API_BASE}/v1/asset-categories/${categoryId}/spec-versions`, {
        method: 'POST',
        headers: { ...getAssetHeaders() }
    })
}

export async function publishSpecVersion(versionId: string): Promise<ApiResponse<CategorySpecVersion>> {
    return apiJson<ApiResponse<CategorySpecVersion>>(`${API_BASE}/v1/asset-categories/spec-versions/${versionId}/publish`, {
        method: 'POST',
        headers: { ...getAssetHeaders() }
    })
}

export async function createSpecDef(versionId: string, input: CategorySpecDefInput): Promise<ApiResponse<CategorySpecDef>> {
    return apiJson<ApiResponse<CategorySpecDef>>(`${API_BASE}/v1/asset-categories/spec-versions/${versionId}/defs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAssetHeaders() },
        body: JSON.stringify(input)
    })
}

export async function updateSpecDef(defId: string, patch: Partial<CategorySpecDefInput>): Promise<ApiResponse<CategorySpecDef>> {
    return apiJson<ApiResponse<CategorySpecDef>>(`${API_BASE}/v1/asset-categories/spec-defs/${defId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAssetHeaders() },
        body: JSON.stringify(patch)
    })
}

export async function deleteSpecDef(defId: string): Promise<ApiResponse<{ id: string }>> {
    return apiJson<ApiResponse<{ id: string }>>(`${API_BASE}/v1/asset-categories/spec-defs/${defId}`, {
        method: 'DELETE',
        headers: { ...getAssetHeaders() }
    })
}

// ============================================================================
// Vendors API
// ============================================================================

export async function createVendor(input: VendorInput): Promise<ApiResponse<Vendor>> {
    return apiJson<ApiResponse<Vendor>>(`${API_BASE}/v1/assets/catalogs/vendors`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAssetHeaders() },
        body: JSON.stringify(input)
    })
}

export async function updateVendor(id: string, patch: Partial<VendorInput>): Promise<ApiResponse<Vendor>> {
    return apiJson<ApiResponse<Vendor>>(`${API_BASE}/v1/assets/catalogs/vendors/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAssetHeaders() },
        body: JSON.stringify(patch)
    })
}

export async function deleteVendor(id: string): Promise<ApiResponse<{ id: string }>> {
    return apiJson<ApiResponse<{ id: string }>>(`${API_BASE}/v1/assets/catalogs/vendors/${id}`, {
        method: 'DELETE',
        headers: { ...getAssetHeaders() }
    })
}

// ============================================================================
// Models API
// ============================================================================

export async function createModel(input: ModelInput): Promise<ApiResponse<AssetModel>> {
    return apiJson<ApiResponse<AssetModel>>(`${API_BASE}/v1/assets/catalogs/models`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAssetHeaders() },
        body: JSON.stringify(input)
    })
}

export async function updateModel(id: string, patch: Partial<ModelInput>): Promise<ApiResponse<AssetModel>> {
    return apiJson<ApiResponse<AssetModel>>(`${API_BASE}/v1/assets/catalogs/models/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAssetHeaders() },
        body: JSON.stringify(patch)
    })
}

export async function deleteModel(id: string): Promise<ApiResponse<{ id: string }>> {
    return apiJson<ApiResponse<{ id: string }>>(`${API_BASE}/v1/assets/catalogs/models/${id}`, {
        method: 'DELETE',
        headers: { ...getAssetHeaders() }
    })
}

// ============================================================================
// Locations API
// ============================================================================

export async function createLocation(input: LocationInput): Promise<ApiResponse<Location>> {
    return apiJson<ApiResponse<Location>>(`${API_BASE}/v1/assets/catalogs/locations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAssetHeaders() },
        body: JSON.stringify(input)
    })
}

export async function updateLocation(id: string, patch: Partial<LocationInput>): Promise<ApiResponse<Location>> {
    return apiJson<ApiResponse<Location>>(`${API_BASE}/v1/assets/catalogs/locations/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAssetHeaders() },
        body: JSON.stringify(patch)
    })
}

export async function deleteLocation(id: string): Promise<ApiResponse<{ id: string }>> {
    return apiJson<ApiResponse<{ id: string }>>(`${API_BASE}/v1/assets/catalogs/locations/${id}`, {
        method: 'DELETE',
        headers: { ...getAssetHeaders() }
    })
}
