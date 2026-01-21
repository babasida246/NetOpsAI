import { randomUUID } from 'node:crypto'
import type {
    AssetCategoryCreateInput,
    AssetCategoryRecord,
    AssetModelCreateInput,
    AssetModelRecord,
    CategorySpecDefInput,
    CategorySpecDefRecord,
    ICatalogRepo,
    ICategorySpecRepo,
    ICategorySpecVersionRepo
} from '@contracts/shared'

export class FakeCatalogRepo implements ICatalogRepo {
    categories: AssetCategoryRecord[] = []
    models: AssetModelRecord[] = []
    async listVendors() { return [] }
    async listLocations() { return [] }
    async listCategories() { return this.categories }
    async listModels() { return this.models }
    async searchModels(filters?: { categoryId?: string | null; specFilters?: Record<string, unknown> }) {
        if (!filters?.categoryId) return this.models
        return this.models.filter(model => model.categoryId === filters.categoryId)
    }
    async getLocationById() { return null }
    async getModelById(id: string) { return this.models.find(model => model.id === id) ?? null }
    async createVendor() { throw new Error('Not implemented') }
    async updateVendor() { throw new Error('Not implemented') }
    async deleteVendor() { throw new Error('Not implemented') }
    async createCategory(input: AssetCategoryCreateInput) {
        const record = { id: randomUUID(), name: input.name, createdAt: new Date() }
        this.categories.push(record)
        return record
    }
    async updateCategory() { throw new Error('Not implemented') }
    async deleteCategory() { throw new Error('Not implemented') }
    async createModel(input: AssetModelCreateInput) {
        const record: AssetModelRecord = {
            id: randomUUID(),
            categoryId: input.categoryId ?? null,
            specVersionId: input.specVersionId ?? null,
            vendorId: input.vendorId ?? null,
            brand: input.brand ?? null,
            model: input.model,
            spec: input.spec ?? {},
            createdAt: new Date()
        }
        this.models.push(record)
        return record
    }
    async updateModel() { throw new Error('Not implemented') }
    async deleteModel() { throw new Error('Not implemented') }
    async createLocation() { throw new Error('Not implemented') }
    async updateLocation() { throw new Error('Not implemented') }
    async deleteLocation() { throw new Error('Not implemented') }
}

export class FakeSpecVersionRepo implements ICategorySpecVersionRepo {
    versions: Array<{ id: string; categoryId: string; version: number; status: 'draft' | 'active' | 'retired'; createdAt: Date; createdBy?: string | null }> = []
    async listByCategory(categoryId: string) {
        return this.versions.filter(version => version.categoryId === categoryId)
    }
    async getActiveByCategory(categoryId: string) {
        return this.versions.find(version => version.categoryId === categoryId && version.status === 'active') ?? null
    }
    async getById(id: string) {
        return this.versions.find(version => version.id === id) ?? null
    }
    async getLatestVersionNumber(categoryId: string) {
        const versions = this.versions.filter(version => version.categoryId === categoryId)
        if (versions.length === 0) return 0
        return Math.max(...versions.map(version => version.version))
    }
    async create(categoryId: string, version: number, status: 'draft' | 'active' | 'retired', createdBy?: string | null) {
        const record = { id: randomUUID(), categoryId, version, status, createdBy: createdBy ?? null, createdAt: new Date() }
        this.versions.push(record)
        return record
    }
    async updateStatus(id: string, status: 'draft' | 'active' | 'retired') {
        const target = this.versions.find(version => version.id === id)
        if (!target) return null
        target.status = status
        return target
    }
    async retireOtherActive(categoryId: string, keepId: string) {
        let count = 0
        for (const version of this.versions) {
            if (version.categoryId === categoryId && version.id !== keepId && version.status === 'active') {
                version.status = 'retired'
                count += 1
            }
        }
        return count
    }
}

export class FakeSpecRepo implements ICategorySpecRepo {
    defs: CategorySpecDefRecord[] = []
    constructor(private catalogs: ICatalogRepo, private versions: ICategorySpecVersionRepo) { }
    async listByCategory(categoryId: string) {
        const active = await this.versions.getActiveByCategory(categoryId)
        if (!active) return []
        return this.defs.filter(def => def.versionId === active.id && def.isActive)
    }
    async listByVersion(versionId: string) {
        return this.defs.filter(def => def.versionId === versionId && def.isActive)
    }
    async bulkInsert(versionId: string, defs: CategorySpecDefInput[]) {
        const created = defs.map((def) => buildRecord(randomUUID(), versionId, def))
        this.defs.push(...created)
        return created
    }
    async create(input: CategorySpecDefInput & { versionId: string }) {
        const record = buildRecord(randomUUID(), input.versionId, input)
        this.defs.push(record)
        return record
    }
    async update() { return null }
    async softDelete() { return false }
    async withTransaction<T>(
        handler: (context: { catalogs: ICatalogRepo; specs: ICategorySpecRepo; versions: ICategorySpecVersionRepo }) => Promise<T>
    ): Promise<T> {
        return handler({ catalogs: this.catalogs, specs: this, versions: this.versions })
    }
}

function buildRecord(id: string, versionId: string, input: CategorySpecDefInput): CategorySpecDefRecord {
    return {
        id,
        versionId,
        key: input.key,
        label: input.label,
        fieldType: input.fieldType,
        unit: input.unit ?? null,
        required: input.required ?? false,
        enumValues: input.enumValues ?? null,
        pattern: input.pattern ?? null,
        minLen: input.minLen ?? null,
        maxLen: input.maxLen ?? null,
        minValue: input.minValue ?? null,
        maxValue: input.maxValue ?? null,
        stepValue: input.stepValue ?? null,
        precision: input.precision ?? null,
        scale: input.scale ?? null,
        normalize: input.normalize ?? null,
        defaultValue: input.defaultValue ?? null,
        helpText: input.helpText ?? null,
        sortOrder: input.sortOrder ?? 0,
        isActive: input.isActive ?? true,
        isReadonly: input.isReadonly ?? false,
        computedExpr: input.computedExpr ?? null,
        isSearchable: input.isSearchable ?? false,
        isFilterable: input.isFilterable ?? false,
        createdAt: new Date(),
        updatedAt: new Date()
    }
}
