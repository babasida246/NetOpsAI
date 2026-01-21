import type { IStockRepo, StockViewFilters, StockViewPage } from '@contracts/shared'
import type { MaintenanceWarehouseContext } from './types.js'

export class StockService {
    constructor(private stock: IStockRepo) { }

    async listView(filters: StockViewFilters, _ctx: MaintenanceWarehouseContext): Promise<StockViewPage> {
        return await this.stock.listView(filters)
    }
}
