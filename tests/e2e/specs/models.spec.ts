import { test, expect } from '../fixtures/hooks';

async function stubOptionalApis(page: any) {
  const okJson = (body: any) => ({ status: 200, body: JSON.stringify(body) });
  await page.route('**/chat/**', route => {
    const url = route.request().url();
    if (url.includes('/providers/openrouter') || url.includes('/admin/audit-logs') || url.includes('/admin/users')) {
      return route.fulfill(okJson({ data: [], meta: {} }));
    }
    if (url.includes('/chat/usage/logs')) {
      return route.fulfill(okJson({ data: [] }));
    }
    if (url.includes('/chat/stats/daily')) {
      return route.fulfill(okJson({ totalTokens: 0, totalCost: 0, totalMessages: 0, modelsUsed: 0 }));
    }
    if (url.includes('/chat/stats/user')) {
      return route.fulfill(okJson({ data: [] }));
    }
    if (url.includes('/chat/models/') && url.includes('/priority')) {
      return route.fulfill(okJson({ message: 'ok' }));
    }
    return route.continue();
  });
  await page.route('**/admin/**', route => route.fulfill(okJson({ data: [], meta: {} })));
}

test.describe('Models & Providers', () => {
  test.beforeEach(async ({ pageWithMonitors }) => {
    await stubOptionalApis(pageWithMonitors);
    await pageWithMonitors.goto('/models');
  });

  test('models table loads and priority buttons work', async ({ pageWithMonitors }) => {
    const page = pageWithMonitors;
    await expect(page.locator('table')).toBeVisible();
    const firstRow = page.locator('table tbody tr').first();
    await expect(firstRow).toContainText('/');
    const minus = firstRow.getByRole('button', { name: '-10' });
    await minus.click();
  });

  test('OpenRouter tab: fetch remote models & import validation', async ({ pageWithMonitors }) => {
    const page = pageWithMonitors;
    await page.click('text=OpenRouter');
    await expect(page.locator('text=OpenRouter Available Models')).toBeVisible();
    await page.click('button:has-text("Refresh")');
    await page.waitForTimeout(1000);
    const firstAdd = page.locator('table tbody tr button:has-text("Add")').first();
    if (await firstAdd.count()) {
      await firstAdd.click();
      // Intentionally submit without priority to ensure body is sent as object
      await page.click('button:has-text("Import")');
    }
  });
});
