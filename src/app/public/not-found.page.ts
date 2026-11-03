import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { I18nService } from '../core/i18n/i18n.service';
import { SeoService } from '../core/seo/seo.service';

@Component({
  selector: 'app-not-found-page',
  imports: [RouterLink],
  template: `
    <div class="container page">
      <p class="code mono" aria-hidden="true">404</p>
      <h1>{{ t().notFound.title }}</h1>
      <p class="muted">{{ t().notFound.body }}</p>
      <a class="btn btn-primary" routerLink="/">{{ t().notFound.home }}</a>
    </div>
  `,
  styles: `
    .page { min-height: 65vh; display: grid; place-content: center; justify-items: center; text-align: center; gap: 0.5rem; }
    .code { margin: 0; font-size: 4rem; color: var(--accent); line-height: 1; }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotFoundPage {
  protected readonly t = inject(I18nService).t;

  constructor() {
    inject(SeoService).set({ title: this.t().notFound.title, description: this.t().notFound.body, noIndex: true });
  }
}
