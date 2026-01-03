import type { PlaywrightTestConfig } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CI = !!process.env.CI;
const baseURL = process.env.E2E_BASE_URL || 'http://localhost:3003';

const config: PlaywrightTestConfig = {
  testDir: path.join(__dirname, 'specs'),
  outputDir: path.join(__dirname, 'artifacts'),
  timeout: 60_000,
  expect: { timeout: 10_000 },
  retries: CI ? 2 : 0,
  workers: CI ? 2 : undefined,
  use: {
    baseURL,
    headless: true,
    actionTimeout: 10_000,
    navigationTimeout: 20_000,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
    storageState: path.join(__dirname, '.auth/state.json'),
  },
  reporter: [
    ['list'],
    ['html', { outputFolder: path.join(__dirname, 'reports', 'html') }],
    ['junit', { outputFile: path.join(__dirname, 'reports', 'junit.xml') }],
  ],
  globalSetup: path.join(__dirname, 'global-setup.ts'),
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' },
    },
  ],
};

export default config;
