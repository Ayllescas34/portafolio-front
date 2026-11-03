import { inject } from '@angular/core';
import { CanDeactivateFn, Routes } from '@angular/router';
import { adminGuard, guestGuard } from '../core/auth/admin.guard';
import { AdminShellComponent } from './layout/admin-shell';
import type { ResourceFormPage } from './pages/resource-form.page';
import { RESOURCES } from './resources/resources';
import { ConfirmService } from './ui/confirm-dialog';

const loadForm = () => import('./pages/resource-form.page').then((m) => m.ResourceFormPage);
const loadList = () => import('./pages/resource-list.page').then((m) => m.ResourceListPage);

/** Asks before leaving a form with unsaved changes. */
const unsavedChanges: CanDeactivateFn<ResourceFormPage> = (page) =>
  !page.hasUnsavedChanges() ||
  inject(ConfirmService).ask({
    title: 'Cambios sin guardar',
    message: 'Si sales ahora perderás los cambios de este formulario.',
    confirmText: 'Salir sin guardar',
    danger: true,
  });

/** One list + form pair per resource, generated from the resource definitions. */
const resourceRoutes: Routes = RESOURCES.flatMap((resource) =>
  resource.singleton
    ? [{ path: resource.key, loadComponent: loadForm, data: { resource }, canDeactivate: [unsavedChanges], title: resource.title }]
    : [
        { path: resource.key, loadComponent: loadList, data: { resource }, title: resource.title },
        { path: `${resource.key}/:id`, loadComponent: loadForm, data: { resource }, canDeactivate: [unsavedChanges], title: resource.title },
      ],
);

export const ADMIN_ROUTES: Routes = [
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () => import('./pages/login.page').then((m) => m.LoginPage),
    title: 'Iniciar sesión · Administración',
  },
  {
    path: '',
    component: AdminShellComponent,
    canActivate: [adminGuard],
    canActivateChild: [adminGuard],
    children: [
      { path: '', loadComponent: () => import('./pages/dashboard.page').then((m) => m.DashboardPage), title: 'Panel · Administración' },
      { path: 'mensajes', loadComponent: () => import('./pages/messages.page').then((m) => m.MessagesPage), title: 'Mensajes · Administración' },
      { path: 'cuenta', loadComponent: () => import('./pages/account.page').then((m) => m.AccountPage), title: 'Cuenta · Administración' },
      ...resourceRoutes,
    ],
  },
];
