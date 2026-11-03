import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { I18nService } from '../../../core/i18n/i18n.service';
import { PeriodPipe } from '../../../shared/pipes/period';
import { IconComponent } from '../../../shared/ui/icon';
import { RevealDirective } from '../../../shared/ui/reveal.directive';
import { PortfolioStore } from '../../data/portfolio.store';

@Component({
  selector: 'app-education-section',
  imports: [PeriodPipe, IconComponent, RevealDirective],
  template: `
    @if (education().length || certifications().length) {
      <section id="educacion" class="section" aria-labelledby="education-title">
        <div class="container">
          <header class="section-header" appReveal>
            <p class="eyebrow">{{ t().education.eyebrow }}</p>
            <h2 id="education-title" class="section-title">{{ t().education.title }}</h2>
          </header>

          <ul class="grid">
            @for (item of education(); track item.id) {
              <li class="card entry" appReveal>
                <app-icon name="graduation" [size]="26" class="icon" />
                <div>
                  <h3>{{ item.program }}</h3>
                  <p class="institution">{{ item.institution }}</p>
                  <p class="meta">
                    @if (item.startDate || item.endDate) {
                      <span class="mono">{{ item | period }}</span>
                    }
                    <span class="badge" [class.badge-live]="item.status === 'IN_PROGRESS'">
                      {{ t().enums.educationStatus[item.status] }}
                    </span>
                  </p>
                  @if (item.degree) {
                    <p class="muted">{{ item.degree }}</p>
                  }
                  @if (item.description) {
                    <p class="muted">{{ item.description }}</p>
                  }
                </div>
              </li>
            }
          </ul>

          @if (certifications().length) {
            <h3 class="sub" appReveal>{{ t().certifications.title }}</h3>
            <ul class="grid">
              @for (cert of certifications(); track cert.id) {
                <li class="card entry" appReveal>
                  <app-icon name="award" [size]="26" class="icon" />
                  <div>
                    <h4>{{ cert.name }}</h4>
                    <p class="institution">{{ cert.issuer }}</p>
                    @if (cert.issueDate) {
                      <p class="meta mono">
                        {{ { startDate: cert.issueDate, endDate: null, datePrecision: cert.datePrecision } | period }}
                      </p>
                    }
                    @if (cert.description) {
                      <p class="muted">{{ cert.description }}</p>
                    }
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
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1rem; margin: 0; padding: 0; list-style: none; }
    .entry { display: flex; gap: 1rem; padding: 1.35rem 1.4rem; }
    .icon { color: var(--accent); margin-top: 0.15rem; }
    h3, h4 { margin-bottom: 0.2rem; font-size: 1.1rem; }
    .institution { margin-bottom: 0.5rem; font-weight: 500; color: var(--text-muted); }
    .meta { display: flex; flex-wrap: wrap; align-items: center; gap: 0.6rem; margin-bottom: 0.4rem; font-size: 0.85rem; }
    .muted { margin: 0; font-size: 0.92rem; }
    .sub { margin: 3rem 0 1.25rem; font-size: 1.3rem; }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EducationSectionComponent {
  private readonly store = inject(PortfolioStore);
  protected readonly t = inject(I18nService).t;
  protected readonly education = computed(() => this.store.portfolio()?.education ?? []);
  protected readonly certifications = computed(() => this.store.portfolio()?.certifications ?? []);
}
