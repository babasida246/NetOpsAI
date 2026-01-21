import { describe, it, expect, vi } from 'vitest'
import { StockDocumentService } from './StockDocumentService.js'
import type {
    IOpsEventRepo,
    IStockDocumentRepo,
    IStockRepo,
    IMovementRepo,
    IWarehouseUnitOfWork,
    StockDocumentRecord
} from '@contracts/shared'

describe('StockDocumentService', () => {
    it('creates documents and lines', async () => {
        const doc: StockDocumentRecord = {
            id: 'doc-1',
            docType: 'receipt',
            code: 'SD-001',
            status: 'draft',
            docDate: '2025-01-01',
            createdAt: new Date(),
            updatedAt: new Date()
        }
        const documents: IStockDocumentRepo = {
            create: vi.fn().mockResolvedValue(doc),
            update: vi.fn(),
            getById: vi.fn(),
            list: vi.fn(),
            listLines: vi.fn(),
            replaceLines: vi.fn().mockResolvedValue([]),
            setStatus: vi.fn()
        }
        const stock = { get: vi.fn(), upsert: vi.fn(), listView: vi.fn() } as unknown as IStockRepo
        const movements = { addMany: vi.fn(), list: vi.fn() } as unknown as IMovementRepo
        const unitOfWork = { withTransaction: vi.fn() } as unknown as IWarehouseUnitOfWork
        const opsEvents = { append: vi.fn() } as unknown as IOpsEventRepo

        const service = new StockDocumentService(documents, stock, movements, unitOfWork, opsEvents)
        const ctx = { userId: 'user-1', correlationId: 'corr-1' }

        const result = await service.createDocument({ docType: 'receipt', code: 'SD-001' }, [], ctx)
        expect(documents.create).toHaveBeenCalled()
        expect(result.document.code).toBe('SD-001')
    })
})
