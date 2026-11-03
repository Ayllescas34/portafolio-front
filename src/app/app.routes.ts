import { Routes } from '@angular/router';
import { PublicShellComponent } from './public/layout/public-shell';

export const routes: Routes = [
  {
    path: '',
    component: PublicShellComponent,
    children: [
      { path: '', loadComponent: () => import('./public/home/home.page').then((m) => m.HomePage) },
      {
        path: 'proyectos/:slug',
        loadComponent: () => import('./public/project-detail/project-detail.page').then((m) => m.ProjectDetailPage),
      },
      { path: 'cv', loadComponent: () => import('./public/resume/resume.page').then((m) => m.ResumePage) },
    ],
  },
  // The admin area is a separate, lazily loaded bundle.
  { path: 'admin', loadChildren: () => import('./admin/admin.routes').then((m) => m.ADMIN_ROUTES) },
  {
    path: '**',
    component: PublicShellComponent,
    children: [{ path: '', loadComponent: () => import('./public/not-found.page').then((m) => m.NotFoundPage) }],
  },
];
