import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { SessionStore } from '../../core/auth/session.store';
import { SeoService } from '../../core/seo/seo.service';
import { ThemeService } from '../../core/ui/theme.service';
import { IconComponent, IconName } from '../../shared/ui/icon';
import { ToastsComponent } from '../../shared/ui/toasts';
import { resourceByKey } from '../resources/resources';
import { ConfirmDialogComponent } from '../ui/confirm-dialog';

interface NavItem {
  path: string;
  label: string;
  icon: IconName;
}

const nav = (key: string): NavItem => {
  const r = resourceByKey(key);
  return { path: `/admin/${r.key}`, label: r.title, icon: r.icon };
};

const NAV: { title: string; items: NavItem[] }[] = [
  {
    title: 'General',
    items: [
      { path: '/admin', label: 'Panel', icon: 'grid' },
      { path: '/admin/mensajes', label: 'Mensajes', icon: 'inbox' },
    ],
  },
  { title: 'Perfil', items: [nav('perfil'), nav('destacados'), nav('redes'), nav('configuracion')] },
  { title: 'Trayectoria', items: [nav('experiencia'), nav('educacion'), nav('certificaciones')] },
  { title: 'Capacidades', items: [nav('categorias'), nav('habilidades'), nav('tecnologias')] },
  { title: 'Trabajo', items: [nav('proyectos')] },
];

@Component({
  selector: 'app-admin-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, IconComponent, ToastsComponent, ConfirmDialogComponent],
  templateUrl: './admin-shell.html',
  styleUrl: './admin-shell.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminShellComponent {
  protected readonly session = inject(SessionStore);
  protected readonly theme = inject(ThemeService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  protected readonly nav = NAV;
  readonly menuOpen = signal(false);

  constructor() {
    inject(SeoService).set({ title: 'Administración del portafolio', description: 'Panel administrativo', noIndex: true });
    this.router.events
      .pipe(
        filter((e) => e instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.menuOpen.set(false));
  }

  async logout(): Promise<void> {
    try {
      await this.auth.logout();
    } finally {
      await this.router.navigate(['/admin/login']);
    }
  }
}
