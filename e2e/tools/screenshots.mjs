// Visual review helper (not a test): full-page screenshots at the main
// breakpoints, written outside the repository.
//   node e2e/tools/screenshots.mjs <outDir> [baseUrl]
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const [outDir, baseUrl = 'http://localhost:4200'] = process.argv.slice(2);
if (!outDir) throw new Error('Uso: node e2e/tools/screenshots.mjs <carpeta-salida> [url]');
mkdirSync(outDir, { recursive: true });

const viewports = [
  ['desktop-1440', 1440, 900],
  ['laptop-1024', 1024, 768],
  ['tablet-768', 768, 1024],
  ['phone-390', 390, 844],
  ['phone-360', 360, 740],
];
const pages = (process.env.PAGES ?? '/').split(',');
const themes = (process.env.THEMES ?? 'dark').split(',');

const browser = await chromium.launch({ channel: 'chrome' });
for (const theme of themes) {
  for (const [name, width, height] of viewports) {
    const context = await browser.newContext({ viewport: { width, height }, colorScheme: theme, deviceScaleFactor: 1 });
    const page = await context.newPage();
    const errors = [];
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    await page.addInitScript((t) => localStorage.setItem('portfolio.theme', t), theme);
    for (const path of pages) {
      await page.goto(baseUrl + path, { waitUntil: 'networkidle' });
      // Reveal everything (no scroll-triggered animation in a static capture).
      await page.evaluate(() => document.querySelectorAll('.reveal').forEach((el) => el.classList.add('is-visible')));
      await page.waitForTimeout(600);
      const slug = path === '/' ? 'home' : path.replace(/\W+/g, '-').replace(/^-|-$/g, '');
      await page.screenshot({ path: join(outDir, `${slug}-${name}-${theme}.png`), fullPage: true });
    }
    if (errors.length) console.log(`[${name}/${theme}] errores de consola:`, errors);
    await context.close();
  }
}
await browser.close();
console.log('Capturas en', outDir);
