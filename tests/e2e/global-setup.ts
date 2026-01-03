import { chromium, expect, type FullConfig } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default async function globalSetup(config: FullConfig) {
  const storageState = path.join(__dirname, '.auth/state.json');
  const baseURL = process.env.E2E_BASE_URL || 'http://localhost:3003';
  const email = process.env.E2E_USER || process.env.ADMIN_EMAIL || 'admin@example.com';
  const password = process.env.E2E_PASS || process.env.ADMIN_PASSWORD || 'ChangeMe123!';

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  try {
    await page.goto(`${baseURL}/login`, { waitUntil: 'networkidle' });
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', password);
    await Promise.all([
      page.waitForNavigation({ url: /chat/i, waitUntil: 'networkidle' }),
      page.click('button:has-text("Login")'),
    ]);
    // sanity: ensure token exists
    const token = await page.evaluate(() => localStorage.getItem('authToken'));
    expect(token, 'auth token should be stored after login').toBeTruthy();
    await page.context().storageState({ path: storageState });
  } catch (err) {
    console.warn('⚠️  Global setup login failed; saving empty state. Error:', err);
    await page.context().storageState({ path: storageState });
  } finally {
    await browser.close();
  }
}
