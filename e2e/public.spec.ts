import { expect, test } from './fixtures';

test.describe('Portafolio público', () => {
  test('el reclutador entiende el perfil en la primera pantalla', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1, name: 'Alejandro Flores Yllescas' })).toBeVisible();
    await expect(page.getByText('Analista Programador · Desarrollo backend').first()).toBeVisible();
    const summary = page.getByLabel('En resumen');
    await expect(summary).toContainText('Analista Programador');
    await expect(summary).toContainText('Canella');
    await expect(summary).toContainText('NestJS');
    await expect(page).toHaveTitle(/Alejandro Flores Yllescas/);
    // Private CV data never reaches the public page.
    await expect(page.locator('body')).not.toContainText('0000-0000');
    await expect(page.locator('body')).not.toContainText('[dato privado]');
    await expect(page.locator('body')).not.toContainText('[dato privado]');
  });

  test('la navegación lleva a cada sección y la marca como activa', async ({ page }) => {
    await page.goto('/');
    const nav = page.getByRole('navigation', { name: 'Navegación principal' });
    for (const [label, id] of [
      ['Experiencia', 'experiencia'],
      ['Habilidades', 'habilidades'],
      ['Proyectos', 'proyectos'],
      ['Contacto', 'contacto'],
    ] as const) {
      await nav.getByRole('link', { name: label }).click();
      await expect(page).toHaveURL(new RegExp(`#${id}$`));
      await expect(page.locator(`#${id}`)).toBeInViewport();
    }
    await expect(page.locator('#experiencia')).toContainText('Municipalidad de Antigua Guatemala');
    await expect(page.locator('#habilidades')).not.toContainText('%');
  });

  test('filtra proyectos y abre el detalle', async ({ page }) => {
    await page.goto('/#proyectos');
    const section = page.locator('#proyectos');
    await expect(section.getByText('Proyecto destacado')).toBeVisible();
    await section.getByRole('button', { name: /^NestJS/ }).click();
    await expect(section.getByRole('button', { name: /^NestJS/ })).toHaveAttribute('aria-pressed', 'true');
    await expect(section.getByRole('status')).toContainText('1 proyecto');
    await expect(page).toHaveURL(/tecnologia=nestjs/);
    await section.getByRole('button', { name: 'Quitar filtros' }).click();
    await expect(page).not.toHaveURL(/tecnologia=/);

    await section.getByRole('link', { name: 'Portafolio profesional e interactivo' }).first().click();
    await expect(page).toHaveURL(/\/proyectos\/portafolio-profesional$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Portafolio profesional e interactivo' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Problema' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Solución' })).toBeVisible();
  });

  test('un proyecto no publicado no es accesible', async ({ page, allowHttpErrors }) => {
    allowHttpErrors(/\/api\/public\/projects\/control-de-gastos/);
    await page.goto('/proyectos/control-de-gastos');
    await expect(page.getByRole('heading', { name: 'El proyecto no existe o no está publicado.' })).toBeVisible();
  });

  test('la hoja de vida es imprimible', async ({ page }) => {
    await page.goto('/cv');
    await expect(page.getByRole('heading', { level: 1, name: 'Alejandro Flores Yllescas' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Imprimir / Guardar PDF' })).toBeVisible();
    await page.emulateMedia({ media: 'print' });
    await expect(page.getByRole('button', { name: 'Imprimir / Guardar PDF' })).toBeHidden();
    await expect(page.locator('app-site-header')).toBeHidden();
    await expect(page.locator('footer.footer')).toBeHidden();
    await expect(page.locator('.sheet')).toContainText('Perito en Computación');
  });

  test('envía el formulario de contacto local con validación', async ({ page }) => {
    await page.goto('/#contacto');
    const form = page.locator('#contacto form');
    await form.getByRole('button', { name: 'Enviar mensaje' }).click();
    await expect(form.getByText('Este campo es obligatorio.').first()).toBeVisible();
    await expect(page.getByLabel('Nombre')).toBeFocused();

    await page.getByLabel('Nombre').fill('Reclutadora E2E');
    await page.getByLabel('Correo electrónico').fill('reclutadora@example.com');
    await page.getByLabel('Asunto').fill('Oportunidad de prueba');
    await page.getByLabel('Mensaje').fill('Este es un mensaje enviado por la prueba end-to-end.');
    await form.getByRole('button', { name: 'Enviar mensaje' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Tu mensaje fue recibido' })).toBeVisible();
  });

  test('accesibilidad básica: skip link, nombres accesibles y textos alternativos', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('Tab');
    const skip = page.getByRole('link', { name: 'Saltar al contenido' });
    await expect(skip).toBeFocused();
    await expect(skip).toBeInViewport();

    const unnamedButtons = await page
      .locator('button')
      .evaluateAll((buttons) => buttons.filter((b) => !(b.getAttribute('aria-label') || b.textContent?.trim())).length);
    expect(unnamedButtons).toBe(0);
    expect(await page.locator('img:not([alt])').count()).toBe(0);
    await expect(page.locator('h1')).toHaveCount(1);
  });

  test('respeta prefers-reduced-motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    // Content is shown immediately (no reveal transition) and the hero remains readable.
    await expect(page.locator('.reveal').first()).toHaveCSS('opacity', '1');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('página 404 para rutas desconocidas', async ({ page }) => {
    await page.goto('/no-existe');
    await expect(page.getByRole('heading', { name: 'Página no encontrada' })).toBeVisible();
  });
});
