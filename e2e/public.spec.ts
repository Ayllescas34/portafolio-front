import { expect, test } from './fixtures';

test.describe('Portafolio público', () => {
  test('el reclutador entiende el perfil en la primera pantalla', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1, name: 'Alejandro Flores Yllescas' })).toBeVisible();
    await expect(page.locator('.hero .role')).toHaveText('Analista Programador Full Stack');
    await expect(page.locator('.hero .tagline')).toContainText('.NET 8');
    const summary = page.getByLabel('En resumen');
    await expect(summary).toContainText('Analista Programador · Canella');
    await expect(summary).toContainText('.NET 8');
    await expect(summary).toContainText('OpenShift');
    await expect(page).toHaveTitle('Alejandro Flores Yllescas | Analista Programador Full Stack');
    for (const name of ['Ver experiencia', 'Ver proyectos', 'Contactar']) {
      await expect(page.getByRole('link', { name })).toBeVisible();
    }
    // The phone stays hidden until the owner chooses to publish it.
    await expect(page.locator('a[href^="tel:"]')).toHaveCount(0);
    await expect(page.locator('#formacion')).toContainText('Finalizando el cuarto semestre.');
  });

  test('el logo y el menú caben completos en pantallas de laptop', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    for (const width of [1121, 1280, 1366, 1440]) {
      await page.setViewportSize({ width, height: 800 });
      const fits = await page.evaluate(() => {
        const logo = document.querySelector<HTMLElement>('.logo')!;
        const bar = document.querySelector<HTMLElement>('.bar')!;
        return logo.scrollWidth <= logo.clientWidth && bar.scrollWidth <= bar.clientWidth;
      });
      expect(fits, `Encabezado a ${width}px`).toBe(true);
    }
  });

  test('publica metadatos y datos estructurados Person', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toBeVisible();
    const data = JSON.parse((await page.locator('#structured-data').textContent()) ?? '{}');
    expect(data).toMatchObject({
      '@type': 'Person',
      name: 'Alejandro Flores Yllescas',
      jobTitle: 'Analista Programador Full Stack',
      worksFor: { name: 'Canella' },
    });
    await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /\.NET 8/);
  });

  test('la escena 3D es un fondo decorativo que no interfiere con el contenido', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    const scene = page.locator('app-hero-scene .scene');
    await expect(scene).toHaveAttribute('data-mode', /webgl|fallback/);
    await expect(scene).toHaveAttribute('aria-hidden', 'true');
    await expect(page.locator('app-hero-scene')).toHaveCSS('pointer-events', 'none');
    // The primary action stays clickable on top of the scene.
    await page.getByRole('link', { name: 'Ver experiencia' }).click();
    await expect(page).toHaveURL(/#experiencia$/);
  });

  test('la experiencia es un acordeón con el puesto actual abierto', async ({ page }) => {
    await page.goto('/#experiencia');
    const items = page.locator('#experiencia details');
    await expect(items).toHaveCount(4);
    await expect(items.nth(0)).toHaveAttribute('open', '');
    await expect(items.nth(1)).not.toHaveAttribute('open', '');
    await items.nth(1).locator('summary').click();
    await expect(items.nth(1).getByText('Gestión y diseño de bases de datos')).toBeVisible();
  });

  test('el botón de volver arriba aparece al desplazarse', async ({ page }) => {
    await page.goto('/');
    const button = page.getByRole('button', { name: 'Volver arriba' });
    await expect(button).toHaveCount(0);
    await page.evaluate(() => window.scrollTo({ top: 1500, behavior: 'instant' }));
    await button.click();
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeLessThan(50);
  });

  test('la navegación lleva a cada sección y la marca como activa', async ({ page }) => {
    await page.goto('/');
    const nav = page.getByRole('navigation', { name: 'Navegación principal' });
    for (const [label, id] of [
      ['Perfil', 'perfil'],
      ['Experiencia', 'experiencia'],
      ['Capacidades', 'capacidades'],
      ['Proyectos', 'proyectos'],
      ['Formación', 'formacion'],
      ['Contacto', 'contacto'],
    ] as const) {
      await nav.getByRole('link', { name: label }).click();
      await expect(page).toHaveURL(new RegExp(`#${id}$`));
      await expect(page.locator(`#${id}`)).toBeInViewport();
    }
    await expect(page.locator('#experiencia')).toContainText('Participación en migraciones de aplicaciones hacia .NET 8.');
    await expect(page.locator('#experiencia')).toContainText('Municipalidad de Antigua Guatemala');
  });

  test('muestra el flujo del desarrollo al despliegue y capacidades sin porcentajes', async ({ page }) => {
    await page.goto('/#capacidades');
    const flow = page.getByRole('list', { name: 'Del desarrollo al despliegue' });
    await expect(flow.getByRole('listitem')).toHaveCount(7);
    await expect(flow).toContainText('Despliegue y validación');
    const section = page.locator('#capacidades');
    for (const area of ['Desarrollo frontend', 'Desarrollo backend', 'Bases de datos', 'Calidad y pruebas', 'DevOps y despliegue']) {
      await expect(section.getByRole('heading', { name: area, exact: true, level: 4 })).toBeVisible();
    }
    await expect(section).not.toContainText('%');
  });

  test('filtra proyectos y abre el detalle de un caso', async ({ page }) => {
    await page.goto('/#proyectos');
    const section = page.locator('#proyectos');
    await expect(section.getByText('Caso destacado')).toBeVisible();
    await expect(section.locator('div.featured')).toContainText('Modernización de aplicaciones empresariales');

    await section.getByRole('button', { name: 'NestJS' }).click();
    await expect(section.getByRole('button', { name: 'NestJS' })).toHaveAttribute('aria-pressed', 'true');
    await expect(section.getByRole('status')).toContainText('1 proyecto');
    await expect(page).toHaveURL(/tecnologia=nestjs/);
    await section.getByRole('button', { name: 'Quitar filtros' }).click();
    await expect(page).not.toHaveURL(/tecnologia=/);

    await section.getByRole('link', { name: 'Portafolio profesional e interactivo' }).first().click();
    await expect(page).toHaveURL(/\/proyectos\/portafolio-profesional$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Portafolio profesional e interactivo' })).toBeVisible();
    for (const heading of ['Contexto', 'Problema', 'Solución', 'Arquitectura general', 'Resultado']) {
      await expect(page.getByRole('heading', { name: heading })).toBeVisible();
    }
  });

  test('el caso profesional aclara que no revela información confidencial', async ({ page }) => {
    await page.goto('/proyectos/modernizacion-aplicaciones-empresariales');
    await expect(page.getByText('Caso profesional').first()).toBeVisible();
    await expect(page.getByText(/Por confidencialidad no se muestran/)).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Mi participación' })).toBeVisible();
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
    const sheet = page.locator('.sheet');
    await expect(sheet).toContainText('Analista Programador Full Stack');
    await expect(sheet).toContainText('Perito en Computación');
    await expect(sheet).toContainText('OpenShift');
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
    await expect(page.getByRole('status').filter({ hasText: 'Su mensaje fue recibido' })).toBeVisible();
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
