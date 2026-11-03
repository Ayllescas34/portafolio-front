import { ChangeDetectionStrategy, Component, computed, effect, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { I18nService } from '../../core/i18n/i18n.service';
import { SeoService } from '../../core/seo/seo.service';
import { formatDate, PeriodPipe } from '../../shared/pipes/period';
import { AsyncStateComponent } from '../../shared/ui/async-state';
import { IconComponent } from '../../shared/ui/icon';
import { PortfolioStore } from '../data/portfolio.store';

/**
 * Structured CV built from the same API data. Print styles turn it into a
 * clean one/two-page Letter document ("Imprimir / Guardar PDF"). The private
 * source PDF is never served.
 */
@Component({
  selector: 'app-resume-page',
  imports: [RouterLink, IconComponent, AsyncStateComponent, PeriodPipe],
  templateUrl: './resume.page.html',
  styleUrl: './resume.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResumePage {
  protected readonly store = inject(PortfolioStore);
  private readonly i18n = inject(I18nService);
  protected readonly t = this.i18n.t;
  protected readonly p = this.store.portfolio;

  protected readonly updated = computed(() => {
    const date = this.p()?.profile.updatedAt;
    return date ? formatDate(date, 'MONTH', this.i18n.intlLocale) : '';
  });

  constructor() {
    const seo = inject(SeoService);
    effect(() => {
      const portfolio = this.p();
      if (!portfolio) return;
      seo.set({
        title: `${this.t().resume.title} · ${portfolio.profile.fullName}`,
        description: portfolio.profile.shortBio,
        type: 'profile',
      });
    });
  }

  print(): void {
    window.print();
  }
}
