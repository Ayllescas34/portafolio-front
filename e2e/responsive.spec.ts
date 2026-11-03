import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';

const pages = ['/', '/cv', '/proyectos/portafolio-profesional', '/admin/login'];

/**
 * Elements whose box ends beyond the viewport. Checking only the document's
 * scroll width is not enough: an `overflow: hidden` ancestor can hide
 * content that is cut off. The decorative 3D layer is excluded on purpose.
 */
async function offscreenElements(page: Page): Promise<string[]> {
  return page.evaluate(() =>
    [...document.querySelectorAll('body *')]
      .filter((el) => {
        const rect = el.getBoundingClientRect();
        const hiddenMenu = el.closest('#site-nav') && getComputedStyle(el.closest('#site-nav')!).visibility === 'hidden';
        return rect.width > 0 && rect.right > window.innerWidth + 1 && !el.closest('.hero-visual, .skip-link, .hp') && !hiddenMenu;
      })
      .map((el) => `${el.tagName.toLowerCase()}.${String(el.className)}`),
  );
}

test.describe('Móvil', () => {
  for (const path of pages) {
    test(`sin contenido fuera de pantalla en ${path}`, async ({ page, allowHttpErrors }) => {
      allowHttpErrors(/\/api\/auth\/me/);
      await page.goto(path);
      await page.waitForLoadState('networkidle');
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow).toBeLessThanOrEqual(0);
      expect(await offscreenElements(page)).toEqual([]);
    });
  }

  test('el menú móvil es accesible por teclado', async ({ page }) => {
    await page.goto('/');
    const toggle = page.getByRole('button', { name: 'Menú' });
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await toggle.click();
    await expect(page.getByRole('button', { name: 'Cerrar menú' })).toHaveAttribute('aria-expanded', 'true');
    await page.getByRole('navigation', { name: 'Navegación principal' }).getByRole('link', { name: 'Proyectos' }).click();
    await expect(page).toHaveURL(/#proyectos$/);
    await expect(page.getByRole('button', { name: 'Menú' })).toHaveAttribute('aria-expanded', 'false');

    await page.getByRole('button', { name: 'Menú' }).click();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('button', { name: 'Menú' })).toBeFocused();
  });
});
