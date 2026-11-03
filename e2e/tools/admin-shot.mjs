// Screenshots of admin pages for visual review (not a test). Credentials come
// from the environment (ADMIN_EMAIL / ADMIN_PASSWORD); nothing is printed.
//   node e2e/tools/admin-shot.mjs <outDir> <path> [<path> ...]
import { chromium } from '@playwright/test';
import { join } from 'node:path';

const [outDir, ...paths] = process.argv.slice(2);
const base = process.env.BASE_URL ?? 'http://localhost:4200';
const browser = await chromium.launch({ channel: 'chrome' });
const page = await (await browser.newContext({ viewport: { width: 1440, height: 1000 } })).newPage();
await page.goto(`${base}/admin/login`);
await page.getByLabel('Correo').fill(process.env.ADMIN_EMAIL);
await page.getByLabel('Contraseña', { exact: true }).fill(process.env.ADMIN_PASSWORD);
await page.getByRole('button', { name: 'Iniciar sesión' }).click();
await page.waitForURL('**/admin');
for (const [i, path] of paths.entries()) {
  await page.goto(base + path, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  await page.screenshot({ path: join(outDir, `admin-${i}.png`), fullPage: false });
}
await page.getByRole('button', { name: 'Cerrar sesión' }).click();
await browser.close();
console.log('ok');
