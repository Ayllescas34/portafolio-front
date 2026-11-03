import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';
import { expect, login, test } from './fixtures';

const RULES = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'];
const PUBLIC_PAGES = ['/', '/cv', '/proyectos/portafolio-profesional', '/admin/login'];

async function audit(page: Page, path: string): Promise<void> {
  await page.goto(path);
  await page.waitForLoadState('networkidle');
  const { violations } = await new AxeBuilder({ page }).withTags(RULES).analyze();
  const found = violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`);
  expect(found, `Infracciones en ${path}`).toEqual([]);
}

test.describe('Accesibilidad (axe)', () => {
  test.use({ contextOptions: { reducedMotion: 'reduce' } });

  for (const theme of ['dark', 'light']) {
    test(`sitio público en tema ${theme}`, async ({ page, allowHttpErrors }) => {
      allowHttpErrors(/\/api\/auth\/me/);
      await page.addInitScript((value) => localStorage.setItem('portfolio.theme', value), theme);
      for (const path of PUBLIC_PAGES) await audit(page, path);
    });

    test(`panel administrativo en tema ${theme}`, async ({ page, allowHttpErrors }) => {
      test.setTimeout(150_000);
      allowHttpErrors(/\/api\/auth\/me/);
      await page.addInitScript((value) => localStorage.setItem('portfolio.theme', value), theme);
      await login(page);

      const nav = page.getByRole('navigation', { name: 'Administración' }).getByRole('link');
      const paths = await nav.evaluateAll((links) => links.map((link) => link.getAttribute('href') ?? ''));
      for (const path of new Set(paths)) {
        await audit(page, path);
        const create = page.getByRole('link', { name: /^Nuev[oa]/ }).first();
        if (await create.count()) {
          const form = await create.getAttribute('href');
          if (form) await audit(page, form);
        }
      }
    });
  }
});
