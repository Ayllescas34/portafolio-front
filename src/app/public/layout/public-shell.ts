import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { I18nService } from '../../core/i18n/i18n.service';
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
        <span class="mono">{{ t().footer.builtWith }}</span>
      </div>
    </footer>
    <app-toasts />
  `,
  styles: `
    main { outline: none; }
    .footer { border-top: 1px solid var(--border); background: var(--bg-elevated); padding-block: 2.5rem 1.5rem; }
    .footer-inner { display: flex; flex-wrap: wrap; gap: 1.5rem 3rem; justify-content: space-between; align-items: flex-start; }
    .footer-name { margin: 0; font-family: var(--font-display); font-weight: 600; font-size: 1.1rem; }
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

  constructor() {
    void this.store.load();
  }

  protected icon(platform: string): IconName {
    return SOCIAL_ICONS[platform] ?? 'link';
  }
}
