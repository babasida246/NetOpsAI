/**
 * Layout Page Object - for header, sidebar, navigation
 */
import { type Page, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class LayoutPage extends BasePage {
    readonly selectors = {
        header: 'layout-header',
        logo: 'layout-logo',
        navChat: 'nav-chat',
        navStats: 'nav-stats',
        navModels: 'nav-models',
        navTools: 'nav-tools',
        navAssets: 'nav-assets',
        navNetops: 'nav-netops',
        navAdmin: 'nav-admin',
        languageSwitcher: 'language-switcher',
        userEmail: 'user-email',
        logoutButton: 'logout-button',
        loginButton: 'login-button',
        versionBadge: 'version-badge'
    };

    readonly navItems = [
        { href: '/chat', label: 'Chat' },
        { href: '/stats', label: 'Stats' },
        { href: '/models', label: 'Models' },
        { href: '/tools', label: 'Tools' },
        { href: '/assets', label: 'Assets' },
        { href: '/netops/devices', label: 'NetOps' }
    ];

    constructor(page: Page) {
        super(page);
    }

    /**
     * Check if header is visible
     */
    async isHeaderVisible(): Promise<boolean> {
        const header = this.page.locator('header');
        return await header.isVisible();
    }

    /**
     * Navigate using nav link
     */
    async navigateTo(label: string): Promise<void> {
        const link = this.page.locator(`nav a:has-text("${label}")`);
        await link.click();
        await this.waitForPageLoad();
    }

    /**
     * Get current nav active item
     */
    async getActiveNavItem(): Promise<string | null> {
        const activeLink = this.page.locator('nav a.bg-blue-100, nav a[class*="bg-blue"]');
        if (await activeLink.count() > 0) {
            return await activeLink.first().textContent();
        }
        return null;
    }

    /**
     * Click logo to go home
     */
    async clickLogo(): Promise<void> {
        const logo = this.page.locator('header a').first();
        await logo.click();
        await this.waitForPageLoad();
    }

    /**
     * Get user email from header
     */
    async getUserEmail(): Promise<string | null> {
        const emailSpan = this.page.locator('header span:has-text("@")');
        if (await emailSpan.count() > 0) {
            return await emailSpan.textContent();
        }
        return null;
    }

    /**
     * Logout
     */
    async logout(): Promise<void> {
        const logoutBtn = this.page.locator('a[href="/logout"]');
        await logoutBtn.click();
        await this.waitForPageLoad();
    }

    /**
     * Check if user is logged in
     */
    async isLoggedIn(): Promise<boolean> {
        const logoutBtn = this.page.locator('a[href="/logout"]');
        return await logoutBtn.isVisible();
    }

    /**
     * Switch language
     */
    async switchLanguage(lang: 'en' | 'vi'): Promise<void> {
        const select = this.page.locator('select[aria-label*="language"], .language-switcher select');
        await select.selectOption(lang);
        await this.page.waitForTimeout(500);
    }

    /**
     * Get all nav links
     */
    async getAllNavLinks(): Promise<string[]> {
        const links = this.page.locator('nav a');
        const count = await links.count();
        const hrefs: string[] = [];
        for (let i = 0; i < count; i++) {
            const href = await links.nth(i).getAttribute('href');
            if (href) hrefs.push(href);
        }
        return hrefs;
    }
}
