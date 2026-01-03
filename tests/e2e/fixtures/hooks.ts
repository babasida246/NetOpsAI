import { test as base, type Page, type Request } from '@playwright/test';

type ExtendedFixtures = {
  pageWithMonitors: Page;
};

const severeConsolePatterns = [/error/i, /uncaught/i];

export const test = base.extend<ExtendedFixtures>({
  pageWithMonitors: async ({ page }, use) => {
    const errors: Array<{ type: string; message: string }> = [];
    const badResponses: Array<{ url: string; status: number }> = [];

    page.on('console', msg => {
      const type = msg.type();
      const text = msg.text();
      if (type === 'error' || severeConsolePatterns.some(r => r.test(text))) {
        errors.push({ type, message: text });
      }
    });

    page.on('pageerror', err => {
      errors.push({ type: 'pageerror', message: err.message });
    });

    page.on('response', resp => {
      const status = resp.status();
      if (status >= 500 || status === 401) {
        badResponses.push({ url: resp.url(), status });
      }
    });

    await use(page);

    if (errors.length) {
      throw new Error(`Console/Page errors:\n${JSON.stringify(errors, null, 2)}`);
    }
    if (badResponses.length) {
      throw new Error(`Unexpected HTTP errors:\n${JSON.stringify(badResponses, null, 2)}`);
    }
  },
});

export const expect = test.expect;
