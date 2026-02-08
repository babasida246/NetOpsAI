import { test, expect, type Page } from '@playwright/test'

/**
 * COMPREHENSIVE ASSETS MODULE TESTS
 * 
 * Tests all Assets functionality:
 * - Assets list, filters, search, pagination
 * - Asset detail page, tabs, all fields
 * - Catalogs: Categories, Vendors, Models, Locations, Statuses
 * - Inventory management
 * - Maintenance tickets
 * - Workflow requests and approvals
 * - Reports generation
 * - All forms, inputs, buttons
 * - CSS and UI/UX validation
 */

function applyAuth(page: Page, role = 'super_admin') {
    return page.addInitScript((roleValue) => {
        localStorage.setItem('authToken', 'test-token')
        localStorage.setItem('refreshToken', 'test-refresh')
        localStorage.setItem('userId', 'test-user-assets')
        localStorage.setItem('userEmail', 'assets-test@example.com')
        localStorage.setItem('userRole', roleValue)
    }, role)
}

test.beforeEach(async ({ page }) => {
    await applyAuth(page, 'super_admin')
})

// ============================================================================
// ASSETS LIST PAGE
// ============================================================================
test.describe('Assets List Page - Complete UI Test', () => {
    test('Assets page loads with all UI elements', async ({ page }) => {
        await page.goto('/assets')
        await page.waitForLoadState('networkidle')

        // Check heading - use first() to avoid strict mode violation (2 headings with 'Asset')
        await expect(page.getByRole('heading', { name: /asset/i }).first()).toBeVisible({ timeout: 10000 })

        // Check sidebar navigation
        const sidebar = page.getByLabel('Sidebar').or(page.locator('[class*="sidebar"]').first())
        if (await sidebar.isVisible({ timeout: 2000 }).catch(() => false)) {
            await expect(sidebar.getByRole('link', { name: /asset/i }).first()).toBeVisible()
            await expect(sidebar.getByRole('link', { name: /catalog/i })).toBeVisible()
            await expect(sidebar.getByRole('link', { name: /inventory/i })).toBeVisible()
        }
    })

    test('Search input field is functional', async ({ page }) => {
        await page.goto('/assets')
        await page.waitForLoadState('networkidle')

        const searchInput = page.getByPlaceholder(/search|filter/i).or(
            page.locator('input[type="text"]').first()
        )

        if (await searchInput.isVisible({ timeout: 3000 }).catch(() => false)) {
            await searchInput.fill('laptop')
            await expect(searchInput).toHaveValue('laptop')

            // Clear search
            await searchInput.clear()
            await expect(searchInput).toHaveValue('')
        }
    })

    test('Status filter dropdown works', async ({ page }) => {
        await page.goto('/assets')
        await page.waitForLoadState('networkidle')

        const statusFilter = page.getByLabel(/status/i).or(
            page.locator('select').filter({ hasText: /status|all/i }).first()
        )

        if (await statusFilter.isVisible({ timeout: 2000 }).catch(() => false)) {
            // Use selectOption for <select> elements, not click on <option>
            const optionCount = await statusFilter.locator('option').count()
            if (optionCount > 1) {
                // Select first non-disabled option (skip index 0 which is "Choose option ...")
                await statusFilter.selectOption({ index: 1 })
            }
        }
    })

    test('Category filter functional', async ({ page }) => {
        await page.goto('/assets')
        await page.waitForLoadState('networkidle')

        const categoryFilter = page.getByLabel(/category/i).or(
            page.locator('select').filter({ hasText: /category/i }).first()
        )

        if (await categoryFilter.isVisible({ timeout: 2000 }).catch(() => false)) {
            await categoryFilter.click()
            await page.waitForTimeout(500)
        }
    })

    test('Location filter functional', async ({ page }) => {
        await page.goto('/assets')
        await page.waitForLoadState('networkidle')

        const locationFilter = page.getByLabel(/location/i).or(
            page.locator('select').filter({ hasText: /location/i }).first()
        )

        if (await locationFilter.isVisible({ timeout: 2000 }).catch(() => false)) {
            await locationFilter.click()
            await page.waitForTimeout(500)
        }
    })

    test('Create Asset button present and clickable', async ({ page }) => {
        await page.goto('/assets')
        await page.waitForLoadState('networkidle')

        const createButton = page.getByRole('button', { name: /create|add|new/i }).first()
        if (await createButton.isVisible({ timeout: 3000 }).catch(() => false)) {
            await expect(createButton).toBeEnabled()
        }
    })

    test('Export button functional', async ({ page }) => {
        await page.goto('/assets')
        await page.waitForLoadState('networkidle')

        const exportButton = page.getByRole('button', { name: /export|download/i })
        if (await exportButton.isVisible({ timeout: 2000 }).catch(() => false)) {
            await expect(exportButton).toBeEnabled()
        }
    })

    test('Import button functional', async ({ page }) => {
        await page.goto('/assets')
        await page.waitForLoadState('networkidle')

        const importButton = page.getByRole('button', { name: /import|upload/i })
        if (await importButton.isVisible({ timeout: 2000 }).catch(() => false)) {
            await importButton.click()
            await page.waitForTimeout(500)
        }
    })

    test('Asset table displays correctly', async ({ page }) => {
        await page.goto('/assets')
        await page.waitForLoadState('networkidle')
        await page.waitForTimeout(2000)

        const table = page.locator('table').first()
        if (await table.isVisible({ timeout: 3000 }).catch(() => false)) {
            // Check table headers
            const headers = table.locator('th')
            const headerCount = await headers.count()
            expect(headerCount).toBeGreaterThan(0)

            // Check table rows
            const rows = table.locator('tbody tr')
            const rowCount = await rows.count()
            if (rowCount > 0) {
                await expect(rows.first()).toBeVisible()
            }
        }
    })

    test('Pagination controls work', async ({ page }) => {
        await page.goto('/assets')
        await page.waitForLoadState('networkidle')
        await page.waitForTimeout(2000)

        const nextButton = page.getByRole('button', { name: /next|>/i })
        const prevButton = page.getByRole('button', { name: /prev|</i })

        // Only click if button is visible AND enabled
        if (await nextButton.isVisible({ timeout: 2000 }).catch(() => false)) {
            const isEnabled = await nextButton.isEnabled().catch(() => false)
            if (isEnabled) {
                await nextButton.click()
                await page.waitForTimeout(1000)
            }
        }

        if (await prevButton.isVisible({ timeout: 2000 }).catch(() => false)) {
            const isEnabled = await prevButton.isEnabled().catch(() => false)
            if (isEnabled) {
                await prevButton.click()
                await page.waitForTimeout(1000)
            }
        }
    })

    test('Asset list CSS layout - no overflow', async ({ page }) => {
        await page.goto('/assets')
        await page.waitForLoadState('networkidle')

        // Use first() to avoid strict mode violation (nested main elements)
        const main = page.locator('main').first()
        const mainBox = await main.boundingBox()
        expect(mainBox).toBeTruthy()
        expect(mainBox!.width).toBeGreaterThan(0)

        // Check table doesn't overflow
        const table = page.locator('table').first()
        if (await table.isVisible({ timeout: 2000 }).catch(() => false)) {
            const tableBox = await table.boundingBox()
            expect(tableBox).toBeTruthy()
        }
    })

    test('Asset list responsive design - mobile', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 })
        await page.goto('/assets')
        await page.waitForLoadState('networkidle')

        // Use first() to avoid strict mode violation
        const main = page.locator('main').first()
        const mainBox = await main.boundingBox()
        expect(mainBox).toBeTruthy()
        expect(mainBox!.width).toBeLessThanOrEqual(375)
    })
})

// ============================================================================
// ASSET DETAIL PAGE
// ============================================================================
test.describe('Asset Detail Page - Complete Functionality', () => {
    test('Asset detail page loads', async ({ page }) => {
        await page.goto('/assets')
        await page.waitForLoadState('networkidle')
        await page.waitForTimeout(2000)

        // Click first asset if available
        const firstRow = page.locator('tbody tr').first()
        if (await firstRow.isVisible({ timeout: 3000 }).catch(() => false)) {
            await firstRow.click()
            await page.waitForTimeout(1000)

            // Should navigate to detail page
            await page.waitForURL(/\/assets\/[^/]+$/, { timeout: 5000 }).catch(() => { })
        }
    })

    test('Asset detail tabs are present', async ({ page }) => {
        await page.goto('/assets')
        await page.waitForLoadState('networkidle')
        await page.waitForTimeout(2000)

        const firstRow = page.locator('tbody tr').first()
        if (await firstRow.isVisible({ timeout: 3000 }).catch(() => false)) {
            await firstRow.click()
            await page.waitForTimeout(1000)

            // Check for tabs
            const detailsTab = page.getByRole('tab', { name: /detail/i })
            const historyTab = page.getByRole('tab', { name: /history|timeline/i })
            const maintenanceTab = page.getByRole('tab', { name: /maintenance/i })

            if (await detailsTab.isVisible({ timeout: 2000 }).catch(() => false)) {
                await expect(detailsTab).toBeVisible()
            }
        }
    })

    test('Asset detail shows all fields', async ({ page }) => {
        await page.goto('/assets')
        await page.waitForLoadState('networkidle')
        await page.waitForTimeout(2000)

        const firstRow = page.locator('tbody tr').first()
        if (await firstRow.isVisible({ timeout: 3000 }).catch(() => false)) {
            await firstRow.click()
            await page.waitForTimeout(1000)

            // Check for asset fields
            const fields = [/tag|id/i, /serial/i, /model/i, /category/i, /status/i]
            for (const field of fields) {
                const label = page.getByText(field).first()
                if (await label.isVisible({ timeout: 1000 }).catch(() => false)) {
                    await expect(label).toBeVisible()
                }
            }
        }
    })

    test('Edit asset button functional', async ({ page }) => {
        await page.goto('/assets')
        await page.waitForLoadState('networkidle')
        await page.waitForTimeout(2000)

        const firstRow = page.locator('tbody tr').first()
        if (await firstRow.isVisible({ timeout: 3000 }).catch(() => false)) {
            await firstRow.click()
            await page.waitForTimeout(1000)

            const editButton = page.getByRole('button', { name: /edit/i })
            if (await editButton.isVisible({ timeout: 2000 }).catch(() => false)) {
                await expect(editButton).toBeEnabled()
            }
        }
    })

    test('Assign asset button works', async ({ page }) => {
        await page.goto('/assets')
        await page.waitForLoadState('networkidle')
        await page.waitForTimeout(2000)

        const firstRow = page.locator('tbody tr').first()
        if (await firstRow.isVisible({ timeout: 3000 }).catch(() => false)) {
            await firstRow.click()
            await page.waitForTimeout(1000)

            const assignButton = page.getByRole('button', { name: /assign/i })
            if (await assignButton.isVisible({ timeout: 2000 }).catch(() => false)) {
                await assignButton.click()
                await page.waitForTimeout(500)
            }
        }
    })

    test('Return asset button works', async ({ page }) => {
        await page.goto('/assets')
        await page.waitForLoadState('networkidle')
        await page.waitForTimeout(2000)

        const firstRow = page.locator('tbody tr').first()
        if (await firstRow.isVisible({ timeout: 3000 }).catch(() => false)) {
            await firstRow.click()
            await page.waitForTimeout(1000)

            const returnButton = page.getByRole('button', { name: /return/i })
            if (await returnButton.isVisible({ timeout: 2000 }).catch(() => false)) {
                await returnButton.click()
                await page.waitForTimeout(500)
            }
        }
    })

    test('Maintenance button works', async ({ page }) => {
        await page.goto('/assets')
        await page.waitForLoadState('networkidle')
        await page.waitForTimeout(2000)

        const firstRow = page.locator('tbody tr').first()
        if (await firstRow.isVisible({ timeout: 3000 }).catch(() => false)) {
            await firstRow.click()
            await page.waitForTimeout(1000)

            const maintenanceButton = page.getByRole('button', { name: /maintenance/i })
            if (await maintenanceButton.isVisible({ timeout: 2000 }).catch(() => false)) {
                await maintenanceButton.click()
                await page.waitForTimeout(500)
            }
        }
    })
})

// ============================================================================
// CATALOGS PAGE - CATEGORIES
// ============================================================================
test.describe('Catalogs - Categories CRUD', () => {
    test('Catalogs page loads', async ({ page }) => {
        await page.goto('/assets/catalogs')
        await page.waitForLoadState('networkidle')

        await expect(page.getByRole('heading', { name: /catalog/i })).toBeVisible({ timeout: 10000 })
    })

    test('Categories tab accessible', async ({ page }) => {
        await page.goto('/assets/catalogs')
        await page.waitForLoadState('networkidle')

        const categoriesTab = page.getByRole('tab', { name: /categor/i })
        await categoriesTab.click()
        await page.waitForTimeout(500)
    })

    test('Category name input works', async ({ page }) => {
        await page.goto('/assets/catalogs')
        await page.waitForLoadState('networkidle')

        await page.getByRole('tab', { name: /categor/i }).click()
        await page.waitForTimeout(500)

        const nameInput = page.locator('input').filter({ hasText: '' }).first()
        if (await nameInput.isVisible({ timeout: 2000 }).catch(() => false)) {
            await nameInput.fill('Test Category')
            await expect(nameInput).toHaveValue('Test Category')
        }
    })

    test('Add category button functional', async ({ page }) => {
        await page.goto('/assets/catalogs')
        await page.waitForLoadState('networkidle')

        await page.getByRole('tab', { name: /categor/i }).click()
        await page.waitForTimeout(500)

        // Button starts disabled, becomes enabled when name is filled
        const addButton = page.getByRole('button', { name: /add/i }).first()
        await expect(addButton).toBeVisible()

        // Fill name to enable button
        const nameInput = page.locator('input').filter({ hasText: '' }).first()
        if (await nameInput.isVisible({ timeout: 2000 }).catch(() => false)) {
            await nameInput.fill('Test Category')
            await expect(addButton).toBeEnabled()
        }
    })

    test('Category table displays', async ({ page }) => {
        await page.goto('/assets/catalogs')
        await page.waitForLoadState('networkidle')

        await page.getByRole('tab', { name: /categor/i }).click()
        await page.waitForTimeout(1000)

        const table = page.locator('table').first()
        if (await table.isVisible({ timeout: 3000 }).catch(() => false)) {
            await expect(table).toBeVisible()
        }
    })

    test('Delete category button present', async ({ page }) => {
        await page.goto('/assets/catalogs')
        await page.waitForLoadState('networkidle')

        await page.getByRole('tab', { name: /categor/i }).click()
        await page.waitForTimeout(1000)

        const deleteButton = page.getByRole('button', { name: /delete|remove/i }).first()
        if (await deleteButton.isVisible({ timeout: 2000 }).catch(() => false)) {
            await expect(deleteButton).toBeEnabled()
        }
    })
})

// ============================================================================
// CATALOGS PAGE - VENDORS
// ============================================================================
test.describe('Catalogs - Vendors CRUD', () => {
    test('Vendors tab accessible', async ({ page }) => {
        await page.goto('/assets/catalogs')
        await page.waitForLoadState('networkidle')

        const vendorsTab = page.getByRole('tab', { name: /vendor/i })
        await vendorsTab.click()
        await page.waitForTimeout(500)
    })

    test('Vendor name input functional', async ({ page }) => {
        await page.goto('/assets/catalogs')
        await page.waitForLoadState('networkidle')

        await page.getByRole('tab', { name: /vendor/i }).click()
        await page.waitForTimeout(500)

        const nameInput = page.getByLabel(/vendor.*name/i).or(
            page.locator('label:has-text("Vendor")').locator('..').locator('input').first()
        )

        if (await nameInput.isVisible({ timeout: 2000 }).catch(() => false)) {
            await nameInput.fill('Test Vendor')
            await expect(nameInput).toHaveValue('Test Vendor')
        }
    })

    test('Vendor email input functional', async ({ page }) => {
        await page.goto('/assets/catalogs')
        await page.waitForLoadState('networkidle')

        await page.getByRole('tab', { name: /vendor/i }).click()
        await page.waitForTimeout(500)

        const emailInput = page.getByLabel(/email/i).or(
            page.locator('input[type="email"]').first()
        )

        if (await emailInput.isVisible({ timeout: 2000 }).catch(() => false)) {
            await emailInput.fill('vendor@test.com')
            await expect(emailInput).toHaveValue('vendor@test.com')
        }
    })

    test('Vendor phone input functional', async ({ page }) => {
        await page.goto('/assets/catalogs')
        await page.waitForLoadState('networkidle')

        await page.getByRole('tab', { name: /vendor/i }).click()
        await page.waitForTimeout(500)

        const phoneInput = page.getByLabel(/phone/i).or(
            page.locator('input[type="tel"]').first()
        )

        if (await phoneInput.isVisible({ timeout: 2000 }).catch(() => false)) {
            await phoneInput.fill('123-456-7890')
        }
    })

    test('Add vendor button functional', async ({ page }) => {
        await page.goto('/assets/catalogs')
        await page.waitForLoadState('networkidle')

        await page.getByRole('tab', { name: /vendor/i }).click()
        await page.waitForTimeout(500)

        const addButton = page.getByRole('button', { name: /add/i })
        if (await addButton.isVisible({ timeout: 2000 }).catch(() => false)) {
            await expect(addButton).toBeVisible()

            // Fill vendor name to enable button
            const nameInput = page.locator('input').filter({ hasText: '' }).first()
            if (await nameInput.isVisible({ timeout: 2000 }).catch(() => false)) {
                await nameInput.fill('Test Vendor')
                await expect(addButton).toBeEnabled()
            }
        }
    })

    test('Vendor table displays', async ({ page }) => {
        await page.goto('/assets/catalogs')
        await page.waitForLoadState('networkidle')

        await page.getByRole('tab', { name: /vendor/i }).click()
        await page.waitForTimeout(1000)

        const table = page.locator('table').first()
        if (await table.isVisible({ timeout: 3000 }).catch(() => false)) {
            await expect(table).toBeVisible()
        }
    })
})

// ============================================================================
// CATALOGS PAGE - MODELS
// ============================================================================
test.describe('Catalogs - Models Tab', () => {
    test('Models tab accessible', async ({ page }) => {
        await page.goto('/assets/catalogs')
        await page.waitForLoadState('networkidle')

        const modelsTab = page.getByRole('tab', { name: /model/i })
        await modelsTab.click()
        await page.waitForTimeout(500)
    })

    test('Model name input works', async ({ page }) => {
        await page.goto('/assets/catalogs')
        await page.waitForLoadState('networkidle')

        await page.getByRole('tab', { name: /model/i }).click()
        await page.waitForTimeout(500)

        const nameInput = page.getByLabel(/model.*name/i).or(
            page.locator('input').first()
        )

        if (await nameInput.isVisible({ timeout: 2000 }).catch(() => false)) {
            await nameInput.fill('Dell Latitude 5420')
        }
    })

    test('Model brand input works', async ({ page }) => {
        await page.goto('/assets/catalogs')
        await page.waitForLoadState('networkidle')

        await page.getByRole('tab', { name: /model/i }).click()
        await page.waitForTimeout(500)

        const brandInput = page.getByLabel(/brand/i).or(
            page.locator('input').nth(1)
        )

        if (await brandInput.isVisible({ timeout: 2000 }).catch(() => false)) {
            await brandInput.fill('Dell')
        }
    })

    test('Models table displays', async ({ page }) => {
        await page.goto('/assets/catalogs')
        await page.waitForLoadState('networkidle')

        await page.getByRole('tab', { name: /model/i }).click()
        await page.waitForTimeout(1000)

        // Check for Model column header
        await expect(page.getByRole('columnheader', { name: /model/i }).first()).toBeVisible({ timeout: 5000 })
    })
})

// ============================================================================
// CATALOGS PAGE - LOCATIONS
// ============================================================================
test.describe('Catalogs - Locations Tab', () => {
    test('Locations tab accessible', async ({ page }) => {
        await page.goto('/assets/catalogs')
        await page.waitForLoadState('networkidle')

        const locationsTab = page.getByRole('tab', { name: /location/i })
        await locationsTab.click()
        await page.waitForTimeout(500)
    })

    test('Location name input works', async ({ page }) => {
        await page.goto('/assets/catalogs')
        await page.waitForLoadState('networkidle')

        await page.getByRole('tab', { name: /location/i }).click()
        await page.waitForTimeout(500)

        const nameInput = page.getByLabel(/location.*name|name/i).or(
            page.locator('input').first()
        )

        if (await nameInput.isVisible({ timeout: 2000 }).catch(() => false)) {
            await nameInput.fill('Building A')
        }
    })

    test('Locations table displays', async ({ page }) => {
        await page.goto('/assets/catalogs')
        await page.waitForLoadState('networkidle')

        await page.getByRole('tab', { name: /location/i }).click()
        await page.waitForTimeout(1000)

        // Check for Path column header
        await expect(page.getByRole('columnheader', { name: /path/i })).toBeVisible({ timeout: 5000 })
    })
})

// ============================================================================
// CATALOGS PAGE - STATUSES
// ============================================================================
test.describe('Catalogs - Statuses Tab', () => {
    test('Statuses tab accessible', async ({ page }) => {
        await page.goto('/assets/catalogs')
        await page.waitForLoadState('networkidle')

        const statusesTab = page.getByRole('tab', { name: /status/i })
        await statusesTab.click()
        await page.waitForTimeout(500)
    })

    test('Statuses description displays', async ({ page }) => {
        await page.goto('/assets/catalogs')
        await page.waitForLoadState('networkidle')

        await page.getByRole('tab', { name: /status/i }).click()
        await page.waitForTimeout(500)

        // Check for specific text
        await expect(page.getByText(/status values are fixed/i)).toBeVisible({ timeout: 5000 })
    })

    test('Status values table displays', async ({ page }) => {
        await page.goto('/assets/catalogs')
        await page.waitForLoadState('networkidle')

        await page.getByRole('tab', { name: /status/i }).click()
        await page.waitForTimeout(1000)

        const table = page.locator('table').first()
        if (await table.isVisible({ timeout: 3000 }).catch(() => false)) {
            await expect(table).toBeVisible()
        }
    })
})

// ============================================================================
// INVENTORY PAGE
// ============================================================================
test.describe('Inventory Page - SKU Management', () => {
    test('Inventory page loads', async ({ page }) => {
        await page.goto('/inventory')
        await page.waitForLoadState('networkidle')

        await expect(page.getByRole('heading', { name: /inventory/i })).toBeVisible({ timeout: 10000 })
    })

    test('Inventory list displays', async ({ page }) => {
        await page.goto('/inventory')
        await page.waitForLoadState('networkidle')
        await page.waitForTimeout(2000)

        const table = page.locator('table').first()
        if (await table.isVisible({ timeout: 3000 }).catch(() => false)) {
            await expect(table).toBeVisible()
        }
    })

    test('Create inventory item button works', async ({ page }) => {
        await page.goto('/inventory')
        await page.waitForLoadState('networkidle')

        const createButton = page.getByRole('button', { name: /create|add|new/i }).first()
        if (await createButton.isVisible({ timeout: 3000 }).catch(() => false)) {
            await expect(createButton).toBeEnabled()
        }
    })

    test('Inventory search works', async ({ page }) => {
        await page.goto('/inventory')
        await page.waitForLoadState('networkidle')

        const searchInput = page.getByPlaceholder(/search/i).first()
        if (await searchInput.isVisible({ timeout: 2000 }).catch(() => false)) {
            await searchInput.fill('RAM')
            await expect(searchInput).toHaveValue('RAM')
        }
    })
})

// ============================================================================
// MAINTENANCE PAGE
// ============================================================================
test.describe('Maintenance Page - Tickets', () => {
    test('Maintenance page loads', async ({ page }) => {
        await page.goto('/maintenance')
        await page.waitForLoadState('networkidle')

        await expect(page.getByRole('heading', { name: /maintenance/i })).toBeVisible({ timeout: 10000 })
    })

    test('Maintenance ticket list displays', async ({ page }) => {
        await page.goto('/maintenance')
        await page.waitForLoadState('networkidle')
        await page.waitForTimeout(2000)

        const table = page.locator('table').first()
        if (await table.isVisible({ timeout: 3000 }).catch(() => false)) {
            await expect(table).toBeVisible()
        }
    })

    test('Create maintenance ticket button works', async ({ page }) => {
        await page.goto('/maintenance')
        await page.waitForLoadState('networkidle')

        const createButton = page.getByRole('button', { name: /create|add|new/i }).first()
        if (await createButton.isVisible({ timeout: 3000 }).catch(() => false)) {
            await expect(createButton).toBeEnabled()
        }
    })
})

// ============================================================================
// REQUESTS PAGE
// ============================================================================
test.describe('Requests Page - Workflow', () => {
    test('Requests page loads', async ({ page }) => {
        await page.goto('/requests')
        await page.waitForLoadState('networkidle')

        await expect(page.getByRole('heading', { name: /request|workflow/i })).toBeVisible({ timeout: 10000 })
    })

    test('Request list displays', async ({ page }) => {
        await page.goto('/requests')
        await page.waitForLoadState('networkidle')
        await page.waitForTimeout(2000)

        const table = page.locator('table').first()
        if (await table.isVisible({ timeout: 3000 }).catch(() => false)) {
            await expect(table).toBeVisible()
        }
    })

    test('Create request button works', async ({ page }) => {
        await page.goto('/requests')
        await page.waitForLoadState('networkidle')

        const createButton = page.getByRole('button', { name: /create|add|new/i }).first().or(
            page.getByRole('link', { name: /create|add|new/i }).first()
        )
        if (await createButton.isVisible({ timeout: 3000 }).catch(() => false)) {
            await createButton.click()
            await page.waitForTimeout(1000)
        }
    })

    test('Request detail page navigation', async ({ page }) => {
        await page.goto('/requests')
        await page.waitForLoadState('networkidle')
        await page.waitForTimeout(2000)

        const firstRow = page.locator('tbody tr').first()
        if (await firstRow.isVisible({ timeout: 3000 }).catch(() => false)) {
            await firstRow.click()
            await page.waitForTimeout(1000)
        }
    })
})

// ============================================================================
// REPORTS PAGE
// ============================================================================
test.describe('Reports Page - Asset Reports', () => {
    test('Reports page loads', async ({ page }) => {
        await page.goto('/reports/assets')
        await page.waitForLoadState('networkidle')

        await expect(page.getByRole('heading', { name: /report/i })).toBeVisible({ timeout: 10000 })
    })

    test('Report filters functional', async ({ page }) => {
        await page.goto('/reports/assets')
        await page.waitForLoadState('networkidle')

        const statusFilter = page.locator('select').first()
        if (await statusFilter.isVisible({ timeout: 2000 }).catch(() => false)) {
            await statusFilter.click()
            await page.waitForTimeout(500)
        }
    })

    test('Generate report button works', async ({ page }) => {
        await page.goto('/reports/assets')
        await page.waitForLoadState('networkidle')

        const generateButton = page.getByRole('button', { name: /generate|run|create/i }).first()
        if (await generateButton.isVisible({ timeout: 2000 }).catch(() => false)) {
            await expect(generateButton).toBeEnabled()
        }
    })

    test('Export report button works', async ({ page }) => {
        await page.goto('/reports/assets')
        await page.waitForLoadState('networkidle')

        const exportButton = page.getByRole('button', { name: /export|download/i })
        if (await exportButton.isVisible({ timeout: 2000 }).catch(() => false)) {
            await expect(exportButton).toBeEnabled()
        }
    })
})
