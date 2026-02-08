/**
 * Login Page Object
 */
import { type Page, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class LoginPage extends BasePage {
    readonly selectors = {
        emailInput: 'login-email-input',
        passwordInput: 'login-password-input',
        submitButton: 'login-submit-button',
        errorAlert: 'login-error-alert',
        logo: 'login-logo',
        title: 'login-title',
        form: 'login-form'
    };

    constructor(page: Page) {
        super(page);
    }

    /**
     * Navigate to login page
     */
    async navigate(): Promise<void> {
        await this.goto('/login');
    }

    /**
     * Fill login form
     */
    async fillCredentials(email: string, password: string): Promise<void> {
        await this.page.fill('#email', email);
        await this.page.dispatchEvent('#email', 'input');
        await this.page.fill('#password', password);
        await this.page.dispatchEvent('#password', 'input');
        // Wait for Svelte reactive state
        await this.page.waitForTimeout(100);
    }

    /**
     * Submit login form
     */
    async submit(): Promise<void> {
        const submitBtn = this.page.locator('button:has-text("Login"), button:has-text("Đăng nhập")');
        await submitBtn.click();
    }

    /**
     * Login with credentials
     */
    async login(email: string, password: string): Promise<void> {
        await this.fillCredentials(email, password);
        await this.submit();
    }

    /**
     * Check if login page is displayed
     */
    async isDisplayed(): Promise<boolean> {
        const title = this.page.locator('h1');
        await expect(title).toBeVisible({ timeout: 5000 });
        const text = await title.textContent();
        return text?.includes('Sign in') || text?.includes('Đăng nhập') || false;
    }

    /**
     * Get error message
     */
    async getErrorMessage(): Promise<string | null> {
        const alert = this.page.locator('[role="alert"], .alert');
        if (await alert.count() > 0) {
            return await alert.textContent();
        }
        return null;
    }

    /**
     * Check if submit button is disabled
     */
    async isSubmitDisabled(): Promise<boolean> {
        const btn = this.page.locator('button:has-text("Login"), button:has-text("Đăng nhập")');
        return await btn.isDisabled();
    }
}
