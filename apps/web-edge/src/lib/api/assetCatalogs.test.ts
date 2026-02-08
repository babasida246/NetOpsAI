import { describe, it, expect, vi, beforeEach } from 'vitest'

const { apiJsonMock } = vi.hoisted(() => ({
    apiJsonMock: vi.fn()
}))

vi.mock('./httpClient', () => ({
    API_BASE: 'http://example.test',
    apiJson: apiJsonMock
}))

vi.mock('./assets', () => ({
    getAssetHeaders: () => ({ 'x-user-id': 'tester' })
}))

describe('assetCatalogs api', () => {
    beforeEach(() => {
        apiJsonMock.mockReset()
    })

    it('calls catalogs endpoint', async () => {
        const { getAssetCatalogs } = await import('./assetCatalogs')
        const { API_BASE } = await import('./httpClient')
        await getAssetCatalogs()
        expect(apiJsonMock).toHaveBeenCalledWith(`${API_BASE}/v1/assets/catalogs`, expect.any(Object))
    })
})
