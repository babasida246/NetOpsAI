/**
 * Base Page Object class for shared functionality
 */
import { type Page, type Locator, expect } from '@playwright/test';

export abstract class BasePage {
    readonly page: Page;

    constructor(page: Page) {
        this.page = page;
    }

    /**
     * Get element by data-testid
     */
    getByTestId(testId: string): Locator {
        return this.page.locator(`[data-testid="${testId}"]`);
    }

    /**
     * Wait for page to be fully loaded
     */
    async waitForPageLoad(): Promise<void> {
        await this.page.waitForLoadState('networkidle');
    }

    /**
     * Wait for element to be visible
     */
    async waitForVisible(testId: string, timeout = 10000): Promise<void> {
        await expect(this.getByTestId(testId)).toBeVisible({ timeout });
    }

    /**
     * Wait for element to be hidden
     */
    async waitForHidden(testId: string, timeout = 10000): Promise<void> {
        await expect(this.getByTestId(testId)).toBeHidden({ timeout });
    }

    /**
     * Click element by data-testid
     */
    async clickByTestId(testId: string): Promise<void> {
        await this.getByTestId(testId).click();
    }

    /**
     * Fill input by data-testid
     */
    async fillByTestId(testId: string, value: string): Promise<void> {
        await this.getByTestId(testId).fill(value);
    }

    /**
     * Check if element exists
     */
    async elementExists(testId: string): Promise<boolean> {
        return (await this.getByTestId(testId).count()) > 0;
    }

    /**
     * Get current URL
     */
    getCurrentUrl(): string {
        return this.page.url();
    }

    /**
     * Navigate to a path
     */
    async goto(path: string): Promise<void> {
        await this.page.goto(path);
        await this.waitForPageLoad();
    }
}
