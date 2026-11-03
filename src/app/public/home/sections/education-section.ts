import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { I18nService } from '../../../core/i18n/i18n.service';
import { PeriodPipe } from '../../../shared/pipes/period';
import { RevealDirective } from '../../../shared/ui/reveal.directive';
import { PortfolioStore } from '../../data/portfolio.store';

@Component({
  selector: 'app-education-section',
  imports: [PeriodPipe, RevealDirective],
  template: `
    @if (education().length || certifications().length) {
      <section id="formacion" class="section" aria-labelledby="education-title">
        <div class="container">
          <header class="section-header" appReveal>
            <p class="eyebrow">{{ t().education.eyebrow }}</p>
            <h2 id="education-title" class="section-title">{{ t().education.title }}</h2>
          </header>

          <ul class="rows">
            @for (item of education(); track item.id) {
              <li class="row" appReveal>
                <div class="when tabular">
                  @if (item.startDate || item.endDate) {
                    {{ item | period }}
                  }
                </div>
                <div>
                  <h3>{{ item.program }}</h3>
                  <p class="institution">{{ item.institution }}</p>
                  @if (item.degree) {
                    <p class="muted">{{ item.degree }}</p>
                  }
                  @if (item.description) {
                    <p class="muted">{{ item.description }}</p>
                  }
                </div>
                <div class="status">
                  <span class="badge" [class.badge-live]="item.status === 'IN_PROGRESS'">
                    {{ t().enums.educationStatus[item.status] }}
                  </span>
                </div>
              </li>
            }
          </ul>

          @if (certifications().length) {
            <h3 class="sub" appReveal>{{ t().certifications.title }}</h3>
            <ul class="rows">
              @for (cert of certifications(); track cert.id) {
                <li class="row" appReveal>
                  <div class="when tabular">
                    @if (cert.issueDate) {
                      {{ { startDate: cert.issueDate, endDate: null, datePrecision: cert.datePrecision } | period }}
                    }
                  </div>
                  <div>
                    <h3>{{ cert.name }}</h3>
                    <p class="institution">{{ cert.issuer }}</p>
                    @if (cert.description) {
                      <p class="muted">{{ cert.description }}</p>
                    }
                  </div>
                  <div class="status">
                    @if (cert.credentialUrl) {
                      <a [href]="cert.credentialUrl" target="_blank" rel="noopener noreferrer">
                        {{ t().certifications.credential }}
                        <span class="visually-hidden">: {{ cert.name }} (se abre en una pestaña nueva)</span>
                      </a>
                    }
                  </div>
                </li>
              }
            </ul>
          }
        </div>
      </section>
    }
  `,
  styles: `
    .rows { margin: 0; padding: 0; list-style: none; }
    .row { display: grid; grid-template-columns: 200px minmax(0, 1fr) auto; gap: 0.5rem 2rem; align-items: start; padding: 1.5rem 0; border-top: 1px solid var(--border); }
    .row:last-child { border-bottom: 1px solid var(--border); }
    .when { font-size: 0.92rem; font-weight: 600; text-transform: capitalize; }
    h3 { margin: 0 0 0.2rem; font-size: 1.1rem; }
    .institution { margin: 0; color: var(--text-muted); }
    .muted { margin: 0.35rem 0 0; font-size: 0.92rem; }
    .sub { margin: 3rem 0 1rem; font-size: 1.25rem; }
    @media (max-width: 760px) {
      .row { grid-template-columns: minmax(0, 1fr); }
      .status { order: -1; }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EducationSectionComponent {
  private readonly store = inject(PortfolioStore);
  protected readonly t = inject(I18nService).t;
  protected readonly education = computed(() => this.store.portfolio()?.education ?? []);
  protected readonly certifications = computed(() => this.store.portfolio()?.certifications ?? []);
}
