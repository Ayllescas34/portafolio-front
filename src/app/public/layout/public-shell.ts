import { ChangeDetectionStrategy, Component, computed, effect, HostListener, inject, signal } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { I18nService } from '../../core/i18n/i18n.service';
import { ThemeService } from '../../core/ui/theme.service';
import { IconComponent, IconName } from '../../shared/ui/icon';
import { ToastsComponent } from '../../shared/ui/toasts';
import { PortfolioStore } from '../data/portfolio.store';
import { SiteHeaderComponent } from './site-header';

const SOCIAL_ICONS: Record<string, IconName> = { GITHUB: 'github', LINKEDIN: 'linkedin', WEBSITE: 'globe' };

@Component({
  selector: 'app-public-shell',
  imports: [RouterOutlet, RouterLink, SiteHeaderComponent, ToastsComponent, IconComponent],
  template: `
    <a class="skip-link" href="#contenido">{{ t().nav.skip }}</a>
    <app-site-header />
    <main id="contenido" tabindex="-1">
      <router-outlet />
    </main>
    <footer class="footer no-print">
      <div class="container footer-inner">
        <div>
          <p class="footer-name">{{ profile()?.fullName }}</p>
          <p class="muted">{{ profile()?.professionalTitle }}</p>
        </div>
        <ul class="footer-links">
          @if (profile()?.publicEmail; as email) {
            <li>
              <a [href]="'mailto:' + email"><app-icon name="mail" [size]="18" />{{ email }}</a>
            </li>
          }
          @for (link of socialLinks(); track link.id) {
            <li>
              <a [href]="link.url" target="_blank" rel="noopener noreferrer">
                <app-icon [name]="icon(link.platform)" [size]="18" />{{ link.label }}
                <span class="visually-hidden">(se abre en una pestaña nueva)</span>
              </a>
            </li>
          }
          <li>
            <a routerLink="/cv"><app-icon name="printer" [size]="18" />{{ t().nav.resume }}</a>
          </li>
        </ul>
      </div>
      <div class="container footer-meta">
        <span>© {{ year }} {{ profile()?.fullName }}</span>
        <span>{{ t().footer.builtWith }}</span>
      </div>
    </footer>
    @if (showTop()) {
      <button type="button" class="to-top no-print" [attr.aria-label]="t().hero.backToTop" (click)="backToTop()">
        <app-icon name="arrow-up" [size]="22" />
      </button>
    }
    <app-toasts />
  `,
  styles: `
    main { outline: none; }
    /* Keeps the footer below the fold until the content arrives, so it never jumps. */
    @media screen { main { min-height: calc(100dvh - var(--header-h)); } }
    .to-top { position: fixed; right: clamp(1rem, 3vw, 2.5rem); bottom: 1.5rem; z-index: 40; display: grid; place-items: center; width: 48px; height: 48px; border: 1px solid var(--border-strong); border-radius: var(--radius-sm); background: var(--surface); color: var(--accent-2); box-shadow: var(--shadow); cursor: pointer; transition: border-color var(--dur) var(--ease); }
    .to-top:hover { border-color: var(--accent-2); }
    .footer { border-top: 1px solid var(--border); background: var(--bg-elevated); padding-block: 2.5rem 1.5rem; }
    .footer-inner { display: flex; flex-wrap: wrap; gap: 1.5rem 3rem; justify-content: space-between; align-items: flex-start; }
    .footer-name { margin: 0; font-weight: 650; font-size: 1.05rem; }
    .footer-inner .muted { margin: 0; }
    .footer-links { display: flex; flex-wrap: wrap; gap: 0.5rem 1.25rem; margin: 0; padding: 0; list-style: none; }
    .footer-links a { display: inline-flex; align-items: center; gap: 0.45rem; color: var(--text-muted); text-decoration: none; font-size: 0.92rem; }
    .footer-links a:hover { color: var(--text); }
    .footer-meta { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 0.5rem; margin-top: 2rem; padding-top: 1.25rem; border-top: 1px solid var(--border); color: var(--text-faint); font-size: 0.82rem; }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PublicShellComponent {
  private readonly store = inject(PortfolioStore);
  protected readonly t = inject(I18nService).t;
  protected readonly profile = this.store.profile;
  protected readonly socialLinks = computed(() => this.store.portfolio()?.socialLinks ?? []);
  protected readonly year = new Date().getFullYear();
  protected readonly showTop = signal(false);

  @HostListener('window:scroll')
  onScroll(): void {
    this.showTop.set(window.scrollY > 600);
  }

  protected backToTop(): void {
    window.scrollTo({ top: 0 });
    document.getElementById('contenido')?.focus({ preventScroll: true });
  }

  constructor() {
    void this.store.load();
    // Default theme configured in the admin panel (the visitor's own choice still wins).
    const theme = inject(ThemeService);
    effect(() => {
      const preference = this.store.portfolio()?.site.defaultTheme;
      if (preference) theme.useSiteDefault(preference);
    });
  }

  protected icon(platform: string): IconName {
    return SOCIAL_ICONS[platform] ?? 'link';
  }
}
