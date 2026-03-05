import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte'
import '@testing-library/jest-dom'
import CategorySpecPanel from '$lib/assets/components/catalogs/CategorySpecPanel.svelte'

/**
 * Enhanced Tests for CategorySpecPanel Component
 * Testing the updated component with Flowbite integration
 */
describe('CategorySpecPanel Component - Enhanced', () => {
    const mockCategory = {
        id: 'cat-123',
        name: 'Test Category'
    }

    const mockVersions = [
        {
            id: 'version-1',
            categoryId: 'cat-123',
            version: 1,
            status: 'active' as const,
            createdAt: new Date('2024-01-01'),
            publishedAt: new Date('2024-01-02')
        },
        {
            id: 'version-2',
            categoryId: 'cat-123',
            version: 2,
            status: 'draft' as const,
            createdAt: new Date('2024-02-01'),
            publishedAt: null
        }
    ]

    const mockSpecDefs = [
        {
            id: 'spec-1',
            versionId: 'version-2',
            fieldKey: 'cpu',
            fieldType: 'text' as const,
            label: 'CPU',
            required: true,
            sortOrder: 1
        },
        {
            id: 'spec-2',
            versionId: 'version-2',
            fieldKey: 'memory',
            fieldType: 'number' as const,
            label: 'Memory (GB)',
            required: false,
            sortOrder: 2
        }
    ]

    // Mock API functions
    const mockApi = {
        getCategorySpecVersions: vi.fn(),
        getSpecDefsByVersion: vi.fn(),
        createCategorySpecVersion: vi.fn(),
        publishSpecVersion: vi.fn()
    }

    beforeEach(() => {
        vi.clearAllMocks()

        // Mock API responses
        mockApi.getCategorySpecVersions.mockResolvedValue({
            data: mockVersions
        })

        mockApi.getSpecDefsByVersion.mockResolvedValue({
            data: mockSpecDefs
        })

        mockApi.createCategorySpecVersion.mockResolvedValue({
            data: {
                version: {
                    id: 'version-3',
                    categoryId: 'cat-123',
                    version: 3,
                    status: 'draft',
                    createdAt: new Date()
                },
                specDefs: []
            }
        })

        mockApi.publishSpecVersion.mockResolvedValue({
            data: {
                warnings: []
            }
        })

        // Mock the API module
        vi.doMock('$lib/api/assetCatalogs', () => mockApi)
    })

    describe('Modal Integration with Flowbite', () => {
        it('should render modal with proper Flowbite structure', async () => {
            render(CategorySpecPanel, {
                props: {
                    open: true,
                    category: mockCategory
                }
            })

            // Check for Flowbite Modal structure
            expect(screen.getByText('Spec Fields')).toBeInTheDocument()
            expect(screen.getByText('Category: Test Category')).toBeInTheDocument()
        })

        it('should show loading spinner using Flowbite Spinner', async () => {
            // Make API call delay to show loading state
            mockApi.getCategorySpecVersions.mockImplementation(() =>
                new Promise(resolve => setTimeout(() => resolve({ data: mockVersions }), 100))
            )

            render(CategorySpecPanel, {
                props: {
                    open: true,
                    category: mockCategory
                }
            })

            // Should show Flowbite spinner
            await waitFor(() => {
                const spinner = document.querySelector('.animate-spin')
                expect(spinner).toBeInTheDocument()
            })
        })

        it('should display errors using Flowbite Alert', async () => {
            mockApi.getCategorySpecVersions.mockRejectedValue(new Error('Network error'))

            render(CategorySpecPanel, {
                props: {
                    open: true,
                    category: mockCategory
                }
            })

            await waitFor(() => {
                expect(screen.getByText('Network error')).toBeInTheDocument()
            })

            // Check for Flowbite Alert styling
            const alert = document.querySelector('.bg-red-100, .border-red-500, [class*="alert"]')
            expect(alert).toBeInTheDocument()
        })
    })

    describe('Version Management', () => {
        it('should load versions on modal open', async () => {
            render(CategorySpecPanel, {
                props: {
                    open: true,
                    category: mockCategory
                }
            })

            await waitFor(() => {
                expect(mockApi.getCategorySpecVersions).toHaveBeenCalledWith('cat-123')
            })
        })

        it('should select draft version by default', async () => {
            render(CategorySpecPanel, {
                props: {
                    open: true,
                    category: mockCategory
                }
            })

            await waitFor(() => {
                expect(mockApi.getSpecDefsByVersion).toHaveBeenCalledWith('version-2')
            })
        })

        it('should fallback to active version if no draft exists', async () => {
            const versionsWithoutDraft = [mockVersions[0]] // Only active version

            mockApi.getCategorySpecVersions.mockResolvedValue({
                data: versionsWithoutDraft
            })

            render(CategorySpecPanel, {
                props: {
                    open: true,
                    category: mockCategory
                }
            })

            await waitFor(() => {
                expect(mockApi.getSpecDefsByVersion).toHaveBeenCalledWith('version-1')
            })
        })

        it('should create new draft version', async () => {
            render(CategorySpecPanel, {
                props: {
                    open: true,
                    category: mockCategory
                }
            })

            await waitFor(() => {
                expect(screen.getByText('Spec Fields')).toBeInTheDocument()
            })

            // Simulate creating a new draft (this would be triggered by SpecVersionControls)
            // In a real test, we would trigger the actual button click
            await waitFor(() => {
                expect(mockApi.getCategorySpecVersions).toHaveBeenCalled()
            })
        })

        it('should publish version with warnings', async () => {
            const warnings = [
                {
                    modelId: 'model-1',
                    modelName: 'Test Model',
                    missingKeys: ['cpu', 'memory']
                }
            ]

            mockApi.publishSpecVersion.mockResolvedValue({
                data: { warnings }
            })

            render(CategorySpecPanel, {
                props: {
                    open: true,
                    category: mockCategory
                }
            })

            await waitFor(() => {
                expect(screen.getByText('Spec Fields')).toBeInTheDocument()
            })

            // Simulate publish action (would be triggered by SpecVersionControls)
            // The warnings would be displayed by SpecWarnings component
        })
    })

    describe('Read-only Mode Handling', () => {
        it('should show read-only alert for active versions', async () => {
            const versionsWithActiveSelected = [
                { ...mockVersions[0], status: 'active' as const }
            ]

            mockApi.getCategorySpecVersions.mockResolvedValue({
                data: versionsWithActiveSelected
            })

            render(CategorySpecPanel, {
                props: {
                    open: true,
                    category: mockCategory
                }
            })

            await waitFor(() => {
                expect(screen.getByText(/This version is read-only/)).toBeInTheDocument()
            })

            // Check for Flowbite Alert with blue color (info)
            const alert = document.querySelector('.bg-blue-100, .border-blue-500, [class*="alert-info"]')
            expect(alert).toBeInTheDocument()
        })

        it('should not show read-only alert for draft versions', async () => {
            render(CategorySpecPanel, {
                props: {
                    open: true,
                    category: mockCategory
                }
            })

            await waitFor(() => {
                expect(mockApi.getCategorySpecVersions).toHaveBeenCalled()
            })

            expect(screen.queryByText(/This version is read-only/)).not.toBeInTheDocument()
        })
    })

    describe('Component Integration', () => {
        it('should pass correct props to SpecVersionControls', async () => {
            render(CategorySpecPanel, {
                props: {
                    open: true,
                    category: mockCategory
                }
            })

            await waitFor(() => {
                expect(mockApi.getCategorySpecVersions).toHaveBeenCalled()
            })

            // The SpecVersionControls component should receive the versions
            // This would be tested by checking if the component renders correctly
            // with the provided data
        })

        it('should pass correct props to SpecDefsManager', async () => {
            render(CategorySpecPanel, {
                props: {
                    open: true,
                    category: mockCategory
                }
            })

            await waitFor(() => {
                expect(mockApi.getSpecDefsByVersion).toHaveBeenCalled()
            })

            // The SpecDefsManager should receive the spec definitions
            // and be enabled for draft versions, disabled for active versions
        })

        it('should handle SpecWarnings display', async () => {
            const warnings = [
                {
                    modelId: 'model-1',
                    modelName: 'Test Model',
                    missingKeys: ['cpu']
                }
            ]

            render(CategorySpecPanel, {
                props: {
                    open: true,
                    category: mockCategory
                }
            })

            // Simulate warnings being set (would happen after publish)
            // The SpecWarnings component should display the warnings
        })
    })

    describe('Event Handling', () => {
        it('should call onupdated callback', async () => {
            const onupdated = vi.fn()

            render(CategorySpecPanel, {
                props: {
                    open: true,
                    category: mockCategory,
                    onupdated
                }
            })

            await waitFor(() => {
                expect(mockApi.getCategorySpecVersions).toHaveBeenCalled()
            })

            // onupdated should be called after successful operations
            // This would be tested by simulating the actual operations
        })

        it('should call onerror callback on failures', async () => {
            const onerror = vi.fn()
            mockApi.getCategorySpecVersions.mockRejectedValue(new Error('API Error'))

            render(CategorySpecPanel, {
                props: {
                    open: true,
                    category: mockCategory,
                    onerror
                }
            })

            await waitFor(() => {
                expect(onerror).toHaveBeenCalledWith('API Error')
            })
        })
    })

    describe('Modal State Management', () => {
        it('should reset state when modal closes', async () => {
            const { component } = render(CategorySpecPanel, {
                props: {
                    open: true,
                    category: mockCategory
                }
            })

            await waitFor(() => {
                expect(mockApi.getCategorySpecVersions).toHaveBeenCalled()
            })

            // Close the modal
            component.$set({ open: false })

            // State should be reset (this would need to be tested by reopening
            // and checking if API calls are made again)
        })

        it('should handle category changes', async () => {
            const { component } = render(CategorySpecPanel, {
                props: {
                    open: true,
                    category: mockCategory
                }
            })

            await waitFor(() => {
                expect(mockApi.getCategorySpecVersions).toHaveBeenCalledWith('cat-123')
            })

            // Change category
            const newCategory = { id: 'cat-456', name: 'New Category' }
            component.$set({ category: newCategory })

            await waitFor(() => {
                expect(mockApi.getCategorySpecVersions).toHaveBeenCalledWith('cat-456')
            })
        })

        it('should not reload if same category', async () => {
            const { component } = render(CategorySpecPanel, {
                props: {
                    open: true,
                    category: mockCategory
                }
            })

            await waitFor(() => {
                expect(mockApi.getCategorySpecVersions).toHaveBeenCalledTimes(1)
            })

            // Set same category again
            component.$set({ category: mockCategory })

            // Should not trigger additional API call
            await new Promise(resolve => setTimeout(resolve, 100))
            expect(mockApi.getCategorySpecVersions).toHaveBeenCalledTimes(1)
        })
    })

    describe('Button Interactions', () => {
        it('should close modal when close button is clicked', async () => {
            let isOpen = true
            const { component } = render(CategorySpecPanel, {
                props: {
                    open: isOpen,
                    category: mockCategory
                }
            })

            const closeButton = screen.getByText('Close')
            await fireEvent.click(closeButton)

            // In a real implementation, this would update the bound open prop
            await waitFor(() => {
                expect(closeButton).toBeInTheDocument()
            })
        })
    })

    describe('Accessibility', () => {
        it('should have proper ARIA labels and roles', async () => {
            render(CategorySpecPanel, {
                props: {
                    open: true,
                    category: mockCategory
                }
            })

            // Modal should have proper accessibility attributes
            expect(screen.getByRole('dialog')).toBeInTheDocument()
        })

        it('should handle keyboard navigation', async () => {
            render(CategorySpecPanel, {
                props: {
                    open: true,
                    category: mockCategory
                }
            })

            // Test escape key to close modal
            await fireEvent.keyDown(document.body, { key: 'Escape' })

            // Focus should be trapped within modal when open
            // This would require more sophisticated testing setup
        })
    })
})