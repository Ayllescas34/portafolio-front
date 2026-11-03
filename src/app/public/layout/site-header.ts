import { ChangeDetectionStrategy, Component, computed, ElementRef, HostListener, inject, signal, viewChild } from '@angular/core';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';
import { I18nService } from '../../core/i18n/i18n.service';
import { ThemeService } from '../../core/ui/theme.service';
import { IconComponent } from '../../shared/ui/icon';
import { PortfolioStore } from '../data/portfolio.store';
import { SectionId, SectionSpyService } from './section-spy.service';

@Component({
  selector: 'app-site-header',
  imports: [RouterLink, IconComponent],
  template: `
    <header class="header" [class.scrolled]="scrolled()">
      <div class="container bar">
        <a class="brand" routerLink="/" fragment="inicio" (click)="close()">
          <span class="brand-mark" aria-hidden="true">{{ initials() }}</span>
          <span class="brand-name">{{ name() }}</span>
        </a>

        <nav [attr.aria-label]="t().nav.main" class="nav" [class.open]="open()" id="site-nav">
          <ul>
            @for (link of links(); track link.id) {
              <li>
                <a
                  routerLink="/"
                  [fragment]="link.id"
                  [class.active]="spy.active() === link.id"
                  [attr.aria-current]="spy.active() === link.id ? 'location' : null"
                  (click)="close()"
                  >{{ link.label }}</a
                >
              </li>
            }
          </ul>
          <a class="btn btn-sm nav-resume" routerLink="/cv" (click)="close()">
            <app-icon name="printer" [size]="16" />{{ t().nav.resume }}
          </a>
        </nav>

        <div class="actions">
          <button
            type="button"
            class="btn btn-ghost btn-icon"
            (click)="theme.toggle()"
            [attr.aria-label]="theme.theme() === 'dark' ? t().theme.toLight : t().theme.toDark"
          >
            <app-icon [name]="theme.theme() === 'dark' ? 'sun' : 'moon'" />
          </button>
          <button
            #toggleButton
            type="button"
            class="btn btn-ghost btn-icon menu-toggle"
            aria-controls="site-nav"
            [attr.aria-expanded]="open()"
            [attr.aria-label]="open() ? t().nav.closeMenu : t().nav.menu"
            (click)="open.set(!open())"
          >
            <app-icon [name]="open() ? 'close' : 'menu'" />
          </button>
        </div>
      </div>
    </header>
  `,
  styleUrl: './site-header.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SiteHeaderComponent {
  protected readonly theme = inject(ThemeService);
  protected readonly spy = inject(SectionSpyService);
  private readonly store = inject(PortfolioStore);
  private readonly i18n = inject(I18nService);
  private readonly toggleButton = viewChild<ElementRef<HTMLButtonElement>>('toggleButton');
  protected readonly t = this.i18n.t;

  readonly open = signal(false);
  readonly scrolled = signal(false);

  protected readonly name = computed(() => this.store.profile()?.fullName ?? '');
  protected readonly initials = computed(() =>
    this.name()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0])
      .join(''),
  );

  protected readonly links = computed(() => {
    const nav = this.t().nav;
    const portfolio = this.store.portfolio();
    const all: { id: SectionId; label: string; show: boolean }[] = [
      { id: 'sobre-mi', label: nav.about, show: true },
      { id: 'experiencia', label: nav.experience, show: true },
      { id: 'habilidades', label: nav.skills, show: true },
      { id: 'proyectos', label: nav.projects, show: true },
      { id: 'educacion', label: nav.education, show: (portfolio?.education.length ?? 1) > 0 },
      { id: 'contacto', label: nav.contact, show: true },
    ];
    return all.filter((l) => l.show);
  });

  constructor() {
    // Close the mobile menu on every navigation.
    inject(Router)
      .events.pipe(
        filter((e) => e instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.open.set(false));
  }

  @HostListener('window:scroll')
  onScroll(): void {
    this.scrolled.set(window.scrollY > 8);
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (!this.open()) return;
    this.open.set(false);
    this.toggleButton()?.nativeElement.focus();
  }

  close(): void {
    this.open.set(false);
  }
}
