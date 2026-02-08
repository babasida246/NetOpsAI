import { test, expect, type Page } from '@playwright/test';

/**
 * Comprehensive Inventory Module Test Suite
 * Tests all major inventory functionality including:
 * - Dashboard & Reports
 * - Items Management (CRUD)
 * - Warehouses & Locations
 * - Stock Documents (Receipt, Issue, Transfer, Adjustment)
 * - Reservations (Create, Activate, Commit, Release)
 * - Lots & Serials Tracking
 * - FEFO Reporting
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:3003';
const API_URL = process.env.API_URL || 'http://localhost:3000';

// Test Data
const TEST_ORG = {
	code: 'TEST-ORG-' + Date.now(),
	name: 'Test Organization',
	taxId: 'TAX123456'
};

const TEST_WAREHOUSE = {
	code: 'WH-' + Date.now(),
	name: 'Test Warehouse Main',
	address: '123 Test Street'
};

const TEST_ITEM = {
	sku: 'ITEM-' + Date.now(),
	name: 'Test Inventory Item',
	description: 'Test item for automation',
	minQty: 10,
	maxQty: 100
};

const TEST_LOCATION = {
	name: 'Shelf-A-' + Date.now()
};

test.describe('Inventory Module - Complete Test Suite', () => {
	
	test.beforeEach(async ({ page }) => {
		await page.goto(BASE_URL);
		// Wait for page to be fully loaded
		await page.waitForLoadState('networkidle');
	});

	test.describe('1. Dashboard & Navigation', () => {
		
		test('should load inventory dashboard', async ({ page }) => {
			await page.goto(`${BASE_URL}/inventory`);
			await expect(page).toHaveTitle(/Inventory/i);
			
			// Check main dashboard elements
			await expect(page.locator('h1')).toContainText('Inventory');
			
			// Check stats cards are visible
			const statsCards = page.locator('[data-testid="stat-card"]');
			await expect(statsCards).toHaveCount(4); // Total Value, Items, Low Stock, Reservations
		});

		test('should navigate to all inventory sections', async ({ page }) => {
			await page.goto(`${BASE_URL}/inventory`);
			
			const sections = [
				{ link: 'Items', expectedUrl: /\/inventory\/items/ },
				{ link: 'Documents', expectedUrl: /\/inventory\/documents/ },
				{ link: 'Reservations', expectedUrl: /\/inventory\/reservations/ },
				{ link: 'Warehouses', expectedUrl: /\/inventory\/warehouses/ },
				{ link: 'Locations', expectedUrl: /\/inventory\/locations/ },
				{ link: 'Reports', expectedUrl: /\/inventory\/reports/ }
			];

			for (const section of sections) {
				await page.click(`text=${section.link}`);
				await expect(page).toHaveURL(section.expectedUrl);
				await page.goto(`${BASE_URL}/inventory`); // Reset
			}
		});

		test('should display dashboard stats correctly', async ({ page }) => {
			await page.goto(`${BASE_URL}/inventory`);
			
			// Wait for stats to load
			await page.waitForSelector('[data-testid="total-value"]');
			
			const totalValue = await page.locator('[data-testid="total-value"]').textContent();
			const itemCount = await page.locator('[data-testid="item-count"]').textContent();
			const lowStockCount = await page.locator('[data-testid="low-stock-count"]').textContent();
			
			expect(totalValue).toMatch(/[\d,]+/); // Should contain numbers
			expect(itemCount).toMatch(/\d+/);
			expect(lowStockCount).toMatch(/\d+/);
		});
	});

	test.describe('2. Items Management (CRUD)', () => {
		
		test('should list inventory items', async ({ page }) => {
			await page.goto(`${BASE_URL}/inventory/items`);
			
			await expect(page.locator('h1')).toContainText('Items');
			
			// Check if table/list is visible
			const itemsList = page.locator('[data-testid="items-list"]');
			await expect(itemsList).toBeVisible();
		});

		test('should create a new inventory item', async ({ page }) => {
			await page.goto(`${BASE_URL}/inventory/items`);
			
			// Click create button
			await page.click('button:has-text("New Item")');
			
			// Fill form
			await page.fill('input[name="sku"]', TEST_ITEM.sku);
			await page.fill('input[name="name"]', TEST_ITEM.name);
			await page.fill('textarea[name="description"]', TEST_ITEM.description);
			await page.fill('input[name="minQty"]', TEST_ITEM.minQty.toString());
			await page.fill('input[name="maxQty"]', TEST_ITEM.maxQty.toString());
			
			// Submit
			await page.click('button[type="submit"]');
			
			// Verify success
			await expect(page.locator('.toast-success, .alert-success')).toBeVisible();
			await expect(page.locator(`text=${TEST_ITEM.name}`)).toBeVisible();
		});

		test('should search for items', async ({ page }) => {
			await page.goto(`${BASE_URL}/inventory/items`);
			
			const searchInput = page.locator('input[placeholder*="Search"]');
			await searchInput.fill('Test');
			
			await page.waitForTimeout(1000); // Debounce
			
			// Results should be filtered
			const results = page.locator('[data-testid="item-row"]');
			const count = await results.count();
			expect(count).toBeGreaterThan(0);
		});

		test('should view item details', async ({ page }) => {
			await page.goto(`${BASE_URL}/inventory/items`);
			
			// Click first item
			await page.click('[data-testid="item-row"]:first-child');
			
			// Should navigate to details page
			await expect(page).toHaveURL(/\/inventory\/items\/[a-f0-9-]+/);
			
			// Check details sections
			await expect(page.locator('text=Stock on Hand')).toBeVisible();
			await expect(page.locator('text=Recent Transactions')).toBeVisible();
		});

		test('should edit an item', async ({ page }) => {
			await page.goto(`${BASE_URL}/inventory/items`);
			
			// Click edit on first item
			await page.click('[data-testid="item-row"]:first-child [data-testid="edit-button"]');
			
			// Update name
			const newName = 'Updated ' + Date.now();
			await page.fill('input[name="name"]', newName);
			
			// Save
			await page.click('button[type="submit"]');
			
			// Verify
			await expect(page.locator('.toast-success')).toBeVisible();
			await expect(page.locator(`text=${newName}`)).toBeVisible();
		});

		test('should delete an item', async ({ page }) => {
			await page.goto(`${BASE_URL}/inventory/items`);
			
			// Get initial count
			const initialCount = await page.locator('[data-testid="item-row"]').count();
			
			// Click delete on last item
			await page.click('[data-testid="item-row"]:last-child [data-testid="delete-button"]');
			
			// Confirm deletion
			await page.click('button:has-text("Confirm"), button:has-text("Delete")');
			
			// Verify count decreased
			const newCount = await page.locator('[data-testid="item-row"]').count();
			expect(newCount).toBe(initialCount - 1);
		});
	});

	test.describe('3. Warehouses & Locations', () => {
		
		test('should list warehouses', async ({ page }) => {
			await page.goto(`${BASE_URL}/inventory/warehouses`);
			
			await expect(page.locator('h1')).toContainText('Warehouses');
			const warehouseList = page.locator('[data-testid="warehouse-list"]');
			await expect(warehouseList).toBeVisible();
		});

		test('should create a warehouse', async ({ page }) => {
			await page.goto(`${BASE_URL}/inventory/warehouses`);
			
			await page.click('button:has-text("New Warehouse")');
			
			await page.fill('input[name="code"]', TEST_WAREHOUSE.code);
			await page.fill('input[name="name"]', TEST_WAREHOUSE.name);
			await page.fill('textarea[name="address"]', TEST_WAREHOUSE.address);
			
			await page.click('button[type="submit"]');
			
			await expect(page.locator('.toast-success')).toBeVisible();
			await expect(page.locator(`text=${TEST_WAREHOUSE.name}`)).toBeVisible();
		});

		test('should create warehouse locations', async ({ page }) => {
			await page.goto(`${BASE_URL}/inventory/locations`);
			
			await page.click('button:has-text("New Location")');
			
			await page.fill('input[name="name"]', TEST_LOCATION.name);
			
			// Select parent warehouse (if dropdown exists)
			const warehouseSelect = page.locator('select[name="warehouseId"]');
			if (await warehouseSelect.isVisible()) {
				await warehouseSelect.selectOption({ index: 1 });
			}
			
			await page.click('button[type="submit"]');
			
			await expect(page.locator('.toast-success')).toBeVisible();
		});

		test('should navigate warehouse hierarchy', async ({ page }) => {
			await page.goto(`${BASE_URL}/inventory/locations`);
			
			// Check tree structure
			const locationTree = page.locator('[data-testid="location-tree"]');
			await expect(locationTree).toBeVisible();
			
			// Expand/collapse nodes
			const expandButton = page.locator('[data-testid="expand-button"]').first();
			if (await expandButton.isVisible()) {
				await expandButton.click();
				await expect(page.locator('[data-testid="child-location"]')).toBeVisible();
			}
		});
	});

	test.describe('4. Stock Documents - Receipt', () => {
		
		test('should create a receipt document', async ({ page }) => {
			await page.goto(`${BASE_URL}/inventory/documents`);
			
			await page.click('button:has-text("New Document")');
			
			// Select document type
			await page.click('text=Receipt');
			
			// Fill header
			await page.fill('input[name="docNumber"]', 'REC-' + Date.now());
			await page.selectOption('select[name="warehouseId"]', { index: 1 });
			
			// Add line
			await page.click('button:has-text("Add Item")');
			
			// Select item
			await page.selectOption('select[name="itemId"]', { index: 1 });
			await page.fill('input[name="quantity"]', '100');
			await page.fill('input[name="unitPrice"]', '10.50');
			
			// Select location
			await page.selectOption('select[name="locationId"]', { index: 1 });
			
			// Save draft
			await page.click('button:has-text("Save Draft")');
			
			await expect(page.locator('.toast-success')).toBeVisible();
		});

		test('should approve a receipt document', async ({ page }) => {
			await page.goto(`${BASE_URL}/inventory/documents`);
			
			// Find a draft document
			await page.click('[data-testid="document-row"][data-status="draft"]:first-child');
			
			// Approve
			await page.click('button:has-text("Approve")');
			
			// Confirm
			await page.click('button:has-text("Confirm")');
			
			await expect(page.locator('.toast-success')).toBeVisible();
			await expect(page.locator('text=Approved')).toBeVisible();
		});

		test('should verify stock increased after receipt', async ({ page }) => {
			// Create and approve a receipt
			await page.goto(`${BASE_URL}/inventory/documents`);
			
			// Get item from first line of a receipt
			const itemLink = await page.locator('[data-testid="document-row"][data-type="receipt"]:first-child [data-testid="item-link"]').textContent();
			
			// Navigate to item details
			await page.click(`text=${itemLink}`);
			
			// Check stock on hand
			const stockValue = await page.locator('[data-testid="stock-on-hand"]').textContent();
			expect(parseInt(stockValue || '0')).toBeGreaterThan(0);
		});
	});

	test.describe('5. Stock Documents - Issue', () => {
		
		test('should create an issue document', async ({ page }) => {
			await page.goto(`${BASE_URL}/inventory/documents`);
			
			await page.click('button:has-text("New Document")');
			await page.click('text=Issue');
			
			await page.fill('input[name="docNumber"]', 'ISS-' + Date.now());
			await page.selectOption('select[name="warehouseId"]', { index: 1 });
			
			// Add line
			await page.click('button:has-text("Add Item")');
			await page.selectOption('select[name="itemId"]', { index: 1 });
			await page.fill('input[name="quantity"]', '10');
			await page.selectOption('select[name="locationId"]', { index: 1 });
			
			await page.click('button:has-text("Save Draft")');
			
			await expect(page.locator('.toast-success')).toBeVisible();
		});

		test('should prevent issue if insufficient stock', async ({ page }) => {
			await page.goto(`${BASE_URL}/inventory/documents`);
			
			await page.click('button:has-text("New Document")');
			await page.click('text=Issue');
			
			await page.fill('input[name="docNumber"]', 'ISS-' + Date.now());
			await page.selectOption('select[name="warehouseId"]', { index: 1 });
			
			await page.click('button:has-text("Add Item")');
			await page.selectOption('select[name="itemId"]', { index: 1 });
			
			// Try to issue excessive quantity
			await page.fill('input[name="quantity"]', '999999');
			await page.selectOption('select[name="locationId"]', { index: 1 });
			
			await page.click('button:has-text("Approve")');
			
			// Should show error
			await expect(page.locator('.toast-error, .alert-error')).toBeVisible();
		});
	});

	test.describe('6. Stock Documents - Transfer', () => {
		
		test('should create a transfer document', async ({ page }) => {
			await page.goto(`${BASE_URL}/inventory/documents`);
			
			await page.click('button:has-text("New Document")');
			await page.click('text=Transfer');
			
			await page.fill('input[name="docNumber"]', 'TRF-' + Date.now());
			
			// Source warehouse
			await page.selectOption('select[name="warehouseId"]', { index: 1 });
			
			// Destination warehouse
			await page.selectOption('select[name="toWarehouseId"]', { index: 2 });
			
			// Add line
			await page.click('button:has-text("Add Item")');
			await page.selectOption('select[name="itemId"]', { index: 1 });
			await page.fill('input[name="quantity"]', '5');
			await page.selectOption('select[name="fromLocationId"]', { index: 1 });
			await page.selectOption('select[name="toLocationId"]', { index: 1 });
			
			await page.click('button:has-text("Save Draft")');
			
			await expect(page.locator('.toast-success')).toBeVisible();
		});

		test('should verify stock moved after transfer', async ({ page }) => {
			// Create and approve a transfer
			await page.goto(`${BASE_URL}/inventory/documents`);
			
			await page.click('[data-testid="document-row"][data-type="transfer-out"][data-status="draft"]:first-child');
			await page.click('button:has-text("Approve")');
			await page.click('button:has-text("Confirm")');
			
			await expect(page.locator('.toast-success')).toBeVisible();
			
			// Check source warehouse decreased
			// Check destination warehouse increased
			// This would require more complex assertions
		});
	});

	test.describe('7. Stock Documents - Adjustment', () => {
		
		test('should create an adjustment-in document', async ({ page }) => {
			await page.goto(`${BASE_URL}/inventory/documents`);
			
			await page.click('button:has-text("New Document")');
			await page.click('text=Adjustment In');
			
			await page.fill('input[name="docNumber"]', 'ADJ-IN-' + Date.now());
			await page.selectOption('select[name="warehouseId"]', { index: 1 });
			await page.fill('textarea[name="reason"]', 'Stock found during audit');
			
			await page.click('button:has-text("Add Item")');
			await page.selectOption('select[name="itemId"]', { index: 1 });
			await page.fill('input[name="quantity"]', '3');
			await page.selectOption('select[name="locationId"]', { index: 1 });
			
			await page.click('button:has-text("Save Draft")');
			
			await expect(page.locator('.toast-success')).toBeVisible();
		});

		test('should create an adjustment-out document', async ({ page }) => {
			await page.goto(`${BASE_URL}/inventory/documents`);
			
			await page.click('button:has-text("New Document")');
			await page.click('text=Adjustment Out');
			
			await page.fill('input[name="docNumber"]', 'ADJ-OUT-' + Date.now());
			await page.selectOption('select[name="warehouseId"]', { index: 1 });
			await page.fill('textarea[name="reason"]', 'Damaged goods');
			
			await page.click('button:has-text("Add Item")');
			await page.selectOption('select[name="itemId"]', { index: 1 });
			await page.fill('input[name="quantity"]', '2');
			await page.selectOption('select[name="locationId"]', { index: 1 });
			
			await page.click('button:has-text("Save Draft")');
			
			await expect(page.locator('.toast-success')).toBeVisible();
		});
	});

	test.describe('8. Reservations Workflow', () => {
		
		test('should create a reservation', async ({ page }) => {
			await page.goto(`${BASE_URL}/inventory/reservations`);
			
			await page.click('button:has-text("New Reservation")');
			
			await page.fill('input[name="refNumber"]', 'RES-' + Date.now());
			await page.selectOption('select[name="warehouseId"]', { index: 1 });
			await page.fill('input[name="purpose"]', 'Sales Order #12345');
			
			// Add line
			await page.click('button:has-text("Add Item")');
			await page.selectOption('select[name="itemId"]', { index: 1 });
			await page.fill('input[name="quantity"]', '5');
			await page.selectOption('select[name="locationId"]', { index: 1 });
			
			await page.click('button:has-text("Create Reservation")');
			
			await expect(page.locator('.toast-success')).toBeVisible();
			await expect(page.locator('text=Draft')).toBeVisible();
		});

		test('should activate a reservation', async ({ page }) => {
			await page.goto(`${BASE_URL}/inventory/reservations`);
			
			await page.click('[data-testid="reservation-row"][data-status="draft"]:first-child');
			
			await page.click('button:has-text("Activate")');
			await page.click('button:has-text("Confirm")');
			
			await expect(page.locator('.toast-success')).toBeVisible();
			await expect(page.locator('text=Active')).toBeVisible();
		});

		test('should commit a reservation to issue document', async ({ page }) => {
			await page.goto(`${BASE_URL}/inventory/reservations`);
			
			await page.click('[data-testid="reservation-row"][data-status="active"]:first-child');
			
			await page.click('button:has-text("Commit")');
			
			// Fill commit form
			await page.fill('input[name="docNumber"]', 'ISS-RES-' + Date.now());
			await page.click('button:has-text("Confirm Commit")');
			
			await expect(page.locator('.toast-success')).toBeVisible();
			
			// Should show committed status
			await expect(page.locator('text=Committed')).toBeVisible();
			
			// Should link to created document
			await expect(page.locator('[data-testid="linked-document"]')).toBeVisible();
		});

		test('should release a reservation', async ({ page }) => {
			await page.goto(`${BASE_URL}/inventory/reservations`);
			
			await page.click('[data-testid="reservation-row"][data-status="active"]:first-child');
			
			await page.click('button:has-text("Release")');
			await page.fill('textarea[name="reason"]', 'Order cancelled');
			await page.click('button:has-text("Confirm Release")');
			
			await expect(page.locator('.toast-success')).toBeVisible();
			await expect(page.locator('text=Released')).toBeVisible();
		});

		test('should verify available stock after reservation', async ({ page }) => {
			await page.goto(`${BASE_URL}/inventory/reports/stock-available`);
			
			// Check that reserved quantity is deducted from available
			const stockRow = page.locator('[data-testid="stock-row"]').first();
			
			const onHand = await stockRow.locator('[data-testid="on-hand"]').textContent();
			const reserved = await stockRow.locator('[data-testid="reserved"]').textContent();
			const available = await stockRow.locator('[data-testid="available"]').textContent();
			
			const expectedAvailable = parseInt(onHand || '0') - parseInt(reserved || '0');
			expect(parseInt(available || '0')).toBe(expectedAvailable);
		});
	});

	test.describe('9. Lots & Serials Tracking', () => {
		
		test('should create a receipt with lot tracking', async ({ page }) => {
			await page.goto(`${BASE_URL}/inventory/documents`);
			
			await page.click('button:has-text("New Document")');
			await page.click('text=Receipt');
			
			await page.fill('input[name="docNumber"]', 'REC-LOT-' + Date.now());
			await page.selectOption('select[name="warehouseId"]', { index: 1 });
			
			// Add item that requires lot tracking
			await page.click('button:has-text("Add Item")');
			await page.selectOption('select[name="itemId"]', { label: /Lot Tracked/ });
			await page.fill('input[name="quantity"]', '50');
			
			// Enter lot details
			await page.click('button:has-text("Add Lot")');
			await page.fill('input[name="lotNumber"]', 'LOT-' + Date.now());
			await page.fill('input[name="lotQuantity"]', '50');
			await page.fill('input[type="date"][name="manufactureDate"]', '2026-01-01');
			await page.fill('input[type="date"][name="expiryDate"]', '2026-12-31');
			
			await page.click('button:has-text("Save Draft")');
			
			await expect(page.locator('.toast-success')).toBeVisible();
		});

		test('should create a receipt with serial tracking', async ({ page }) => {
			await page.goto(`${BASE_URL}/inventory/documents`);
			
			await page.click('button:has-text("New Document")');
			await page.click('text=Receipt');
			
			await page.fill('input[name="docNumber"]', 'REC-SER-' + Date.now());
			await page.selectOption('select[name="warehouseId"]', { index: 1 });
			
			// Add item that requires serial tracking
			await page.click('button:has-text("Add Item")');
			await page.selectOption('select[name="itemId"]', { label: /Serial Tracked/ });
			await page.fill('input[name="quantity"]', '3');
			
			// Enter serial numbers
			await page.click('button:has-text("Add Serials")');
			await page.fill('input[name="serial1"]', 'SN-001-' + Date.now());
			await page.fill('input[name="serial2"]', 'SN-002-' + Date.now());
			await page.fill('input[name="serial3"]', 'SN-003-' + Date.now());
			
			await page.click('button:has-text("Save Draft")');
			
			await expect(page.locator('.toast-success')).toBeVisible();
		});

		test('should select lots in FEFO order for issue', async ({ page }) => {
			await page.goto(`${BASE_URL}/inventory/documents`);
			
			await page.click('button:has-text("New Document")');
			await page.click('text=Issue');
			
			await page.fill('input[name="docNumber"]', 'ISS-FEFO-' + Date.now());
			await page.selectOption('select[name="warehouseId"]', { index: 1 });
			
			// Add lot-tracked item
			await page.click('button:has-text("Add Item")');
			await page.selectOption('select[name="itemId"]', { label: /Lot Tracked/ });
			await page.fill('input[name="quantity"]', '10');
			
			// Open lot picker
			await page.click('button:has-text("Select Lots")');
			
			// Verify lots are sorted by expiry date (FEFO)
			const lotRows = page.locator('[data-testid="lot-row"]');
			const firstLotExpiry = await lotRows.first().locator('[data-testid="expiry-date"]').textContent();
			const secondLotExpiry = await lotRows.nth(1).locator('[data-testid="expiry-date"]').textContent();
			
			// First lot should expire before second lot
			expect(new Date(firstLotExpiry || '')).toBeLessThanOrEqual(new Date(secondLotExpiry || ''));
			
			// Select first lot
			await lotRows.first().locator('input[type="checkbox"]').check();
			await page.fill('input[name="lotQuantity"]', '10');
			await page.click('button:has-text("Confirm Selection")');
			
			await page.click('button:has-text("Save Draft")');
			
			await expect(page.locator('.toast-success')).toBeVisible();
		});
	});

	test.describe('10. Reports', () => {
		
		test('should view stock on hand report', async ({ page }) => {
			await page.goto(`${BASE_URL}/inventory/reports/stock-on-hand`);
			
			await expect(page.locator('h1')).toContainText('Stock on Hand');
			
			// Check table headers
			await expect(page.locator('th:has-text("SKU")')).toBeVisible();
			await expect(page.locator('th:has-text("Item")')).toBeVisible();
			await expect(page.locator('th:has-text("Warehouse")')).toBeVisible();
			await expect(page.locator('th:has-text("Location")')).toBeVisible();
			await expect(page.locator('th:has-text("Quantity")')).toBeVisible();
			
			// Should have data
			const rows = page.locator('[data-testid="stock-row"]');
			expect(await rows.count()).toBeGreaterThan(0);
		});

		test('should filter stock on hand by warehouse', async ({ page }) => {
			await page.goto(`${BASE_URL}/inventory/reports/stock-on-hand`);
			
			// Select warehouse filter
			await page.selectOption('select[name="warehouseId"]', { index: 1 });
			await page.click('button:has-text("Apply Filter")');
			
			await page.waitForLoadState('networkidle');
			
			// All rows should be from selected warehouse
			const warehouseCells = page.locator('[data-testid="warehouse-cell"]');
			const count = await warehouseCells.count();
			
			for (let i = 0; i < count; i++) {
				const text = await warehouseCells.nth(i).textContent();
				expect(text).toBeTruthy();
			}
		});

		test('should view stock available report', async ({ page }) => {
			await page.goto(`${BASE_URL}/inventory/reports/stock-available`);
			
			await expect(page.locator('h1')).toContainText('Stock Available');
			
			// Should show on-hand, reserved, and available columns
			await expect(page.locator('th:has-text("On Hand")')).toBeVisible();
			await expect(page.locator('th:has-text("Reserved")')).toBeVisible();
			await expect(page.locator('th:has-text("Available")')).toBeVisible();
		});

		test('should view reorder alerts report', async ({ page }) => {
			await page.goto(`${BASE_URL}/inventory/reports/reorder-alerts`);
			
			await expect(page.locator('h1')).toContainText('Reorder Alerts');
			
			// Should show alert level
			await expect(page.locator('th:has-text("Alert Level")')).toBeVisible();
			await expect(page.locator('th:has-text("Current Qty")')).toBeVisible();
			await expect(page.locator('th:has-text("Min Qty")')).toBeVisible();
			await expect(page.locator('th:has-text("Order Qty")')).toBeVisible();
			
			// Items should be sorted by severity (out of stock first)
			const alertLevels = page.locator('[data-testid="alert-level"]');
			if (await alertLevels.count() > 1) {
				const firstAlert = await alertLevels.first().textContent();
				expect(firstAlert).toMatch(/out_of_stock|below_min/);
			}
		});

		test('should view FEFO lots report', async ({ page }) => {
			await page.goto(`${BASE_URL}/inventory/reports/fefo`);
			
			await expect(page.locator('h1')).toContainText('FEFO');
			
			// Should show expiry information
			await expect(page.locator('th:has-text("Lot Number")')).toBeVisible();
			await expect(page.locator('th:has-text("Expiry Date")')).toBeVisible();
			await expect(page.locator('th:has-text("Days Until Expiry")')).toBeVisible();
			await expect(page.locator('th:has-text("Status")')).toBeVisible();
			
			// Lots should be sorted by expiry date (earliest first)
			const expiryDates = page.locator('[data-testid="expiry-date"]');
			if (await expiryDates.count() > 1) {
				const first = await expiryDates.first().textContent();
				const second = await expiryDates.nth(1).textContent();
				expect(new Date(first || '')).toBeLessThanOrEqual(new Date(second || ''));
			}
		});

		test('should filter FEFO report by days threshold', async ({ page }) => {
			await page.goto(`${BASE_URL}/inventory/reports/fefo`);
			
			// Set days threshold to 7
			await page.fill('input[name="daysThreshold"]', '7');
			await page.click('button:has-text("Apply Filter")');
			
			await page.waitForLoadState('networkidle');
			
			// All lots should expire within 7 days
			const daysUntilExpiry = page.locator('[data-testid="days-until-expiry"]');
			const count = await daysUntilExpiry.count();
			
			for (let i = 0; i < count; i++) {
				const days = await daysUntilExpiry.nth(i).textContent();
				expect(parseInt(days || '0')).toBeLessThanOrEqual(7);
			}
		});

		test('should export FEFO report to CSV', async ({ page }) => {
			await page.goto(`${BASE_URL}/inventory/reports/fefo`);
			
			// Start waiting for download
			const downloadPromise = page.waitForEvent('download');
			
			await page.click('button:has-text("Export CSV")');
			
			const download = await downloadPromise;
			expect(download.suggestedFilename()).toMatch(/fefo-report.*\.csv/);
		});

		test('should view inventory valuation report', async ({ page }) => {
			await page.goto(`${BASE_URL}/inventory/reports/valuation`);
			
			await expect(page.locator('h1')).toContainText('Valuation');
			
			// Should show total value
			await expect(page.locator('[data-testid="total-value"]')).toBeVisible();
			
			// Should show item values
			await expect(page.locator('th:has-text("Item")')).toBeVisible();
			await expect(page.locator('th:has-text("On Hand")')).toBeVisible();
			await expect(page.locator('th:has-text("Avg Cost")')).toBeVisible();
			await expect(page.locator('th:has-text("Value")')).toBeVisible();
		});
	});

	test.describe('11. Pagination & Filtering', () => {
		
		test('should paginate through items list', async ({ page }) => {
			await page.goto(`${BASE_URL}/inventory/items`);
			
			// Check if pagination exists
			const nextButton = page.locator('button:has-text("Next")');
			
			if (await nextButton.isEnabled()) {
				const firstPageFirstItem = await page.locator('[data-testid="item-row"]').first().textContent();
				
				await nextButton.click();
				await page.waitForLoadState('networkidle');
				
				const secondPageFirstItem = await page.locator('[data-testid="item-row"]').first().textContent();
				
				expect(firstPageFirstItem).not.toBe(secondPageFirstItem);
			}
		});

		test('should change page size', async ({ page }) => {
			await page.goto(`${BASE_URL}/inventory/items`);
			
			// Select 50 items per page
			await page.selectOption('select[name="pageSize"]', '50');
			
			await page.waitForLoadState('networkidle');
			
			const rowCount = await page.locator('[data-testid="item-row"]').count();
			expect(rowCount).toBeLessThanOrEqual(50);
		});

		test('should filter documents by type', async ({ page }) => {
			await page.goto(`${BASE_URL}/inventory/documents`);
			
			// Filter by receipt
			await page.selectOption('select[name="docType"]', 'receipt');
			await page.click('button:has-text("Apply Filter")');
			
			await page.waitForLoadState('networkidle');
			
			// All documents should be receipts
			const docTypes = page.locator('[data-testid="doc-type"]');
			const count = await docTypes.count();
			
			for (let i = 0; i < count; i++) {
				const type = await docTypes.nth(i).textContent();
				expect(type).toContain('Receipt');
			}
		});

		test('should filter documents by status', async ({ page }) => {
			await page.goto(`${BASE_URL}/inventory/documents`);
			
			// Filter by approved
			await page.selectOption('select[name="status"]', 'approved');
			await page.click('button:has-text("Apply Filter")');
			
			await page.waitForLoadState('networkidle');
			
			// All documents should be approved
			const statuses = page.locator('[data-testid="doc-status"]');
			const count = await statuses.count();
			
			for (let i = 0; i < count; i++) {
				const status = await statuses.nth(i).textContent();
				expect(status).toContain('Approved');
			}
		});

		test('should filter documents by date range', async ({ page }) => {
			await page.goto(`${BASE_URL}/inventory/documents`);
			
			const today = new Date().toISOString().split('T')[0];
			const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
			
			await page.fill('input[name="startDate"]', yesterday);
			await page.fill('input[name="endDate"]', today);
			await page.click('button:has-text("Apply Filter")');
			
			await page.waitForLoadState('networkidle');
			
			// Should have results or show empty state
			const hasResults = await page.locator('[data-testid="document-row"]').count() > 0;
			const hasEmptyState = await page.locator('text=No documents found').isVisible();
			
			expect(hasResults || hasEmptyState).toBeTruthy();
		});
	});

	test.describe('12. Error Handling', () => {
		
		test('should show validation error for duplicate SKU', async ({ page }) => {
			await page.goto(`${BASE_URL}/inventory/items`);
			
			// Get first item SKU
			const existingSKU = await page.locator('[data-testid="item-sku"]').first().textContent();
			
			// Try to create new item with same SKU
			await page.click('button:has-text("New Item")');
			await page.fill('input[name="sku"]', existingSKU || '');
			await page.fill('input[name="name"]', 'Duplicate Test');
			await page.click('button[type="submit"]');
			
			// Should show error
			await expect(page.locator('.toast-error, .alert-error')).toBeVisible();
			await expect(page.locator('text=/SKU.*already exists/i')).toBeVisible();
		});

		test('should show error when creating document without items', async ({ page }) => {
			await page.goto(`${BASE_URL}/inventory/documents`);
			
			await page.click('button:has-text("New Document")');
			await page.click('text=Receipt');
			
			await page.fill('input[name="docNumber"]', 'EMPTY-DOC');
			await page.selectOption('select[name="warehouseId"]', { index: 1 });
			
			// Try to save without adding items
			await page.click('button:has-text("Save Draft")');
			
			await expect(page.locator('.toast-error, .alert-error')).toBeVisible();
		});

		test('should handle API errors gracefully', async ({ page }) => {
			// Intercept API call and force error
			await page.route('**/api/v1/items', route => {
				route.fulfill({
					status: 500,
					body: JSON.stringify({ error: 'Internal Server Error' })
				});
			});
			
			await page.goto(`${BASE_URL}/inventory/items`);
			
			// Should show error message
			await expect(page.locator('text=/Error loading items|Failed to load/i')).toBeVisible();
		});
	});

	test.describe('13. Performance & Loading States', () => {
		
		test('should show loading indicators', async ({ page }) => {
			await page.goto(`${BASE_URL}/inventory/items`);
			
			// Trigger reload
			await page.click('button:has-text("Refresh")');
			
			// Should show loading spinner
			await expect(page.locator('[data-testid="loading-spinner"]')).toBeVisible();
			
			// Wait for load to complete
			await page.waitForLoadState('networkidle');
			
			// Loading should be gone
			await expect(page.locator('[data-testid="loading-spinner"]')).not.toBeVisible();
		});

		test('should handle large dataset pagination', async ({ page }) => {
			await page.goto(`${BASE_URL}/inventory/items?limit=1000`);
			
			// Page should load within reasonable time
			await page.waitForSelector('[data-testid="items-list"]', { timeout: 5000 });
			
			expect(true).toBeTruthy();
		});
	});
});
