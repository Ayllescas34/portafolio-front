import { defineConfig, devices } from '@playwright/test';
import { randomBytes } from 'node:crypto';

// Throwaway admin for this run only. Set in the main process before workers
// and web servers start, so all of them share the same values.
process.env['E2E_ADMIN_EMAIL'] ??= 'e2e-admin@test.local';
process.env['E2E_ADMIN_PASSWORD'] ??= `e2e-${randomBytes(12).toString('hex')}-1`;

export default defineConfig({
  testDir: './e2e',
  // The suites share one database: run them in order, one worker.
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 30_000,
  expect: { timeout: 7_000 },
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  use: {
    baseURL: 'http://localhost:4300',
    // Uses the Chrome already installed on this machine (no browser download).
    channel: 'chrome',
    locale: 'es-GT',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], channel: 'chrome' }, testIgnore: /responsive/ },
    { name: 'mobile', use: { ...devices['Pixel 7'], channel: 'chrome' }, testMatch: /responsive/ },
  ],
  webServer: [
    {
      command: 'node ../backend/scripts/e2e-server.mjs',
      url: 'http://localhost:3100/api/health',
      reuseExistingServer: false,
      timeout: 180_000,
      stdout: 'ignore',
      stderr: 'pipe',
    },
    {
      command: 'npx ng serve --configuration e2e',
      url: 'http://localhost:4300',
      reuseExistingServer: false,
      timeout: 240_000,
      stdout: 'ignore',
      stderr: 'pipe',
    },
  ],
});
