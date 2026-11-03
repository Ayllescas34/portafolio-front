import { expect, test as base, type Page } from '@playwright/test';

export const ADMIN = {
  email: process.env['E2E_ADMIN_EMAIL']!,
  password: process.env['E2E_ADMIN_PASSWORD']!,
};

const EXPECTED_STATUS_LOG = /Failed to load resource: the server responded with a status of (400|401|404|429)/;

/**
 * Automatic guards for every test:
 *  - no unexpected console errors or uncaught exceptions;
 *  - no failed API responses, except the ones a test explicitly expects
 *    (registered with `allowHttpErrors(/pattern/)`).
 */
export const test = base.extend<{ consoleErrors: string[]; allowHttpErrors: (pattern: RegExp) => void }>({
  consoleErrors: [
    async ({ page }, use) => {
      const errors: string[] = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error' && !EXPECTED_STATUS_LOG.test(msg.text())) errors.push(msg.text());
      });
      page.on('pageerror', (err) => errors.push(err.message));
      await use(errors);
      expect(errors, 'Errores de consola').toEqual([]);
    },
    { auto: true },
  ],
  allowHttpErrors: [
    async ({ page }, use) => {
      const allowed: RegExp[] = [];
      const failures: string[] = [];
      page.on('response', (res) => {
        if (!res.url().includes('/api/') || res.status() < 400) return;
        if (res.status() >= 500 || !allowed.some((p) => p.test(res.url()))) failures.push(`${res.status()} ${res.url()}`);
      });
      await use((pattern) => allowed.push(pattern));
      expect(failures, 'Errores de red inesperados').toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };

export async function login(page: Page): Promise<void> {
  await page.goto('/admin/login');
  await page.getByLabel('Correo').fill(ADMIN.email);
  await page.getByLabel('Contraseña', { exact: true }).fill(ADMIN.password);
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();
  await expect(page.getByRole('heading', { level: 1, name: /Hola/ })).toBeVisible();
}
