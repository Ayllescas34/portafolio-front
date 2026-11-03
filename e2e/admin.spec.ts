import { ADMIN, expect, login, test } from './fixtures';

const TITLE = `Proyecto temporal E2E ${Date.now()}`;
const EDITED = `${TITLE} (editado)`;

test.describe.serial('Panel administrativo', () => {
  test('las rutas protegidas redirigen al inicio de sesión', async ({ page, allowHttpErrors }) => {
    allowHttpErrors(/\/api\/auth\/me/);
    await page.goto('/admin/proyectos');
    await expect(page).toHaveURL(/\/admin\/login\?returnUrl=%2Fadmin%2Fproyectos/);
    await expect(page.getByRole('heading', { name: 'Administración' })).toBeVisible();
  });

  test('rechaza credenciales incorrectas', async ({ page, allowHttpErrors }) => {
    allowHttpErrors(/\/api\/auth\/(me|login)/);
    await page.goto('/admin/login');
    await page.getByLabel('Correo').fill(ADMIN.email);
    await page.getByLabel('Contraseña', { exact: true }).fill('contraseña-incorrecta-1');
    await page.getByRole('button', { name: 'Iniciar sesión' }).click();
    await expect(page.getByRole('alert')).toContainText('Correo o contraseña incorrectos');
  });

  test('crear, editar, publicar y eliminar un proyecto temporal', async ({ page, consoleErrors, allowHttpErrors }) => {
    allowHttpErrors(/\/api\/auth\/me|\/api\/public\/projects\/proyecto-temporal/);
    await login(page);

    // Create
    await page.getByRole('navigation', { name: 'Administración' }).getByRole('link', { name: 'Proyectos' }).click();
    await page.getByRole('link', { name: 'Nuevo proyecto' }).click();
    await page.getByLabel('Título', { exact: true }).fill(TITLE);
    await page.getByLabel('Descripción corta').fill('Registro creado por la prueba end-to-end.');
    await page.getByLabel('Problema').fill('Validar el flujo completo del panel.');
    await page.getByRole('group', { name: 'Tecnologías' }).getByLabel('Angular').check();
    await page.getByLabel('Publicado en el sitio').check();
    // Live preview reflects the form.
    await expect(page.getByLabel('Vista previa de la tarjeta pública')).toContainText(TITLE);
    await page.getByRole('button', { name: 'Guardar' }).click();
    await expect(page.getByText('Registro creado.')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Editar proyecto' })).toBeVisible();

    // Edit
    await page.getByLabel('Título', { exact: true }).fill(EDITED);
    await page.getByRole('button', { name: 'Guardar' }).click();
    await expect(page.getByText('Cambios guardados.')).toBeVisible();
    const slug = await page.getByLabel('Slug (URL)').inputValue();
    expect(slug).toMatch(/^proyecto-temporal-e2e-\d+$/);

    // Reflected on the public site
    const publicPage = await page.context().newPage();
    await publicPage.goto(`/proyectos/${slug}`);
    await expect(publicPage.getByRole('heading', { level: 1, name: EDITED })).toBeVisible();
    await publicPage.goto('/#proyectos');
    await expect(publicPage.locator('#proyectos')).toContainText(EDITED);

    // Hide it from the list and confirm it disappears publicly
    await page.goto('/admin/proyectos');
    const row = page.getByRole('listitem').filter({ hasText: EDITED });
    await row.getByRole('button', { name: `Ocultar ${EDITED}` }).click();
    await expect(page.getByText('Ocultado del sitio público.')).toBeVisible();
    await publicPage.goto(`/proyectos/${slug}`);
    await expect(publicPage.getByRole('heading', { name: 'El proyecto no existe o no está publicado.' })).toBeVisible();

    // Delete with confirmation (cancel first, then confirm)
    await row.getByRole('button', { name: `Eliminar ${EDITED}` }).click();
    const dialog = page.getByRole('dialog', { name: 'Eliminar proyecto' });
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Cancelar' }).click();
    await expect(row).toBeVisible();
    await row.getByRole('button', { name: `Eliminar ${EDITED}` }).click();
    await dialog.getByRole('button', { name: 'Eliminar' }).click();
    await expect(page.getByText('Proyecto eliminado.')).toBeVisible();
    await expect(page.getByRole('listitem').filter({ hasText: EDITED })).toHaveCount(0);
    expect(consoleErrors).toEqual([]);
  });

  test('muestra el mensaje recibido desde el formulario de contacto', async ({ page }) => {
    await login(page);
    await page.getByRole('link', { name: /mensaje/i }).first().click();
    await page.getByRole('tab', { name: 'Todos' }).click();
    await expect(page.getByText('Oportunidad de prueba').first()).toBeVisible();
  });

  test('cerrar sesión revoca el acceso a las rutas protegidas', async ({ page, allowHttpErrors }) => {
    allowHttpErrors(/\/api\/auth\/me/);
    await login(page);
    await page.getByRole('button', { name: 'Cerrar sesión' }).click();
    await expect(page).toHaveURL(/\/admin\/login/);
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/admin\/login/);
    const status = await page.request.get('/api/admin/projects');
    expect(status.status()).toBe(401);
  });
});
