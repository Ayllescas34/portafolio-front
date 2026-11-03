// Viewport-sized screenshot of one element/section for close inspection.
//   node e2e/tools/viewport-shot.mjs <out.png> <width> <height> [selector] [theme] [path]
import { chromium } from '@playwright/test';

const [out, width = '1440', height = '900', rawSelector = '-', theme = 'dark', path = '/'] = process.argv.slice(2);
// "-" means "no selector" (some shells drop empty arguments).
const selector = rawSelector === '-' ? '' : rawSelector;
const browser = await chromium.launch({ channel: 'chrome', args: ['--enable-unsafe-swiftshader'] });
const context = await browser.newContext({ viewport: { width: +width, height: +height }, colorScheme: theme });
const page = await context.newPage();
await page.addInitScript((t) => localStorage.setItem('portfolio.theme', t), theme);
await page.goto((process.env.BASE_URL ?? 'http://localhost:4200') + path, { waitUntil: 'networkidle' });
await page.evaluate(() => document.querySelectorAll('.reveal').forEach((el) => el.classList.add('is-visible')));
if (selector) await page.locator(selector).first().scrollIntoViewIfNeeded();
await page.waitForTimeout(1500);
const info = await page.evaluate(() => ({
  mode: document.querySelector('app-hero-scene .scene')?.getAttribute('data-mode'),
  canvas: !!document.querySelector('app-hero-scene canvas'),
}));
console.log(JSON.stringify(info));
await (selector ? page.locator(selector).first().screenshot({ path: out }) : page.screenshot({ path: out }));
await browser.close();
