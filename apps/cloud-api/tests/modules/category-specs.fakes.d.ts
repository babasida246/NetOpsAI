import type { AssetCategoryCreateInput, AssetCategoryRecord, AssetModelCreateInput, AssetModelRecord, CategorySpecDefInput, CategorySpecDefRecord, ICatalogRepo, ICategorySpecRepo, ICategorySpecVersionRepo } from '@contracts/shared';
export declare class FakeCatalogRepo implements ICatalogRepo {
    categories: AssetCategoryRecord[];
    models: AssetModelRecord[];
    listVendors(): Promise<never[]>;
    listLocations(): Promise<never[]>;
    listCategories(): Promise<AssetCategoryRecord[]>;
    listModels(): Promise<AssetModelRecord[]>;
    searchModels(filters?: {
        categoryId?: string | null;
        specFilters?: Record<string, unknown>;
    }): Promise<AssetModelRecord[]>;
    getLocationById(): Promise<null>;
    getModelById(id: string): Promise<AssetModelRecord | null>;
    createVendor(): Promise<void>;
    updateVendor(): Promise<void>;
    deleteVendor(): Promise<void>;
    createCategory(input: AssetCategoryCreateInput): Promise<{
        id: `${string}-${string}-${string}-${string}-${string}`;
        name: string;
        createdAt: Date;
    }>;
    updateCategory(): Promise<void>;
    deleteCategory(): Promise<void>;
    createModel(input: AssetModelCreateInput): Promise<AssetModelRecord>;
    updateModel(): Promise<void>;
    deleteModel(): Promise<void>;
    createLocation(): Promise<void>;
    updateLocation(): Promise<void>;
    deleteLocation(): Promise<void>;
}
export declare class FakeSpecVersionRepo implements ICategorySpecVersionRepo {
    versions: Array<{
        id: string;
        categoryId: string;
        version: number;
        status: 'draft' | 'active' | 'retired';
        createdAt: Date;
        createdBy?: string | null;
    }>;
    listByCategory(categoryId: string): Promise<{
        id: string;
        categoryId: string;
        version: number;
        status: "draft" | "active" | "retired";
        createdAt: Date;
        createdBy?: string | null;
    }[]>;
    getActiveByCategory(categoryId: string): Promise<{
        id: string;
        categoryId: string;
        version: number;
        status: "draft" | "active" | "retired";
        createdAt: Date;
        createdBy?: string | null;
    } | null>;
    getById(id: string): Promise<{
        id: string;
        categoryId: string;
        version: number;
        status: "draft" | "active" | "retired";
        createdAt: Date;
        createdBy?: string | null;
    } | null>;
    getLatestVersionNumber(categoryId: string): Promise<number>;
    create(categoryId: string, version: number, status: 'draft' | 'active' | 'retired', createdBy?: string | null): Promise<{
        id: `${string}-${string}-${string}-${string}-${string}`;
        categoryId: string;
        version: number;
        status: "active" | "retired" | "draft";
        createdBy: string | null;
        createdAt: Date;
    }>;
    updateStatus(id: string, status: 'draft' | 'active' | 'retired'): Promise<{
        id: string;
        categoryId: string;
        version: number;
        status: "draft" | "active" | "retired";
        createdAt: Date;
        createdBy?: string | null;
    } | null>;
    retireOtherActive(categoryId: string, keepId: string): Promise<number>;
}
export declare class FakeSpecRepo implements ICategorySpecRepo {
    private catalogs;
    private versions;
    defs: CategorySpecDefRecord[];
    constructor(catalogs: ICatalogRepo, versions: ICategorySpecVersionRepo);
    listByCategory(categoryId: string): Promise<CategorySpecDefRecord[]>;
    listByVersion(versionId: string): Promise<CategorySpecDefRecord[]>;
    bulkInsert(versionId: string, defs: CategorySpecDefInput[]): Promise<CategorySpecDefRecord[]>;
    create(input: CategorySpecDefInput & {
        versionId: string;
    }): Promise<CategorySpecDefRecord>;
    update(): Promise<null>;
    softDelete(): Promise<boolean>;
    withTransaction<T>(handler: (context: {
        catalogs: ICatalogRepo;
        specs: ICategorySpecRepo;
        versions: ICategorySpecVersionRepo;
    }) => Promise<T>): Promise<T>;
}
//# sourceMappingURL=category-specs.fakes.d.ts.map