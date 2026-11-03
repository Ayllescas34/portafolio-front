import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { I18nService } from '../../../core/i18n/i18n.service';
import { formatDuration, PeriodPipe } from '../../../shared/pipes/period';
import { RevealDirective } from '../../../shared/ui/reveal.directive';
import { PortfolioStore } from '../../data/portfolio.store';

/** Accordion built on native <details>: keyboard and screen-reader support included. */
@Component({
  selector: 'app-experience-section',
  imports: [PeriodPipe, RevealDirective],
  template: `
    <section id="experiencia" class="section section-band" aria-labelledby="experience-title">
      <div class="container narrow">
        <header class="section-header" appReveal>
          <p class="eyebrow">{{ t().experience.eyebrow }}</p>
          <h2 id="experience-title" class="section-title">{{ t().experience.title }}</h2>
        </header>

        @if (items().length) {
          <ol class="accordion">
            @for (item of items(); track item.id) {
              <li appReveal>
                <details [open]="item.isCurrent">
                  <summary>
                    <span class="title">
                      {{ item.position }} <span class="at">&#64;</span> {{ item.company }}
                      @if (item.isCurrent) {
                        <span class="current">{{ t().experience.current }}</span>
                      }
                    </span>
                    <span class="period">{{ item | period }}</span>
                    <span class="toggle" aria-hidden="true"></span>
                  </summary>
                  <article class="panel">
                    <p class="meta">
                      <span>{{ item.duration }}</span>
                      @if (item.location) {
                        <span>{{ item.location }}</span>
                      }
                      @if (item.employmentType) {
                        <span>{{ t().enums.employmentType[item.employmentType] }}</span>
                      }
                      @if (item.workMode) {
                        <span>{{ t().enums.workMode[item.workMode] }}</span>
                      }
                    </p>
                    @if (item.summary) {
                      <p class="summary">{{ item.summary }}</p>
                    }
                    @if (item.responsibilities.length) {
                      <h3 class="label">{{ t().experience.responsibilities }}</h3>
                      <ul class="bullets">
                        @for (line of item.responsibilities; track $index) {
                          <li>{{ line }}</li>
                        }
                      </ul>
                    }
                    @if (item.achievements.length) {
                      <h3 class="label">{{ t().experience.achievements }}</h3>
                      <ul class="bullets">
                        @for (line of item.achievements; track $index) {
                          <li>{{ line }}</li>
                        }
                      </ul>
                    }
                    @if (item.technologies.length) {
                      <h3 class="visually-hidden">{{ t().experience.technologies }}</h3>
                      <ul class="chip-list">
                        @for (tech of item.technologies; track tech.id) {
                          <li class="chip">{{ tech.name }}</li>
                        }
                      </ul>
                    }
                  </article>
                </details>
              </li>
            }
          </ol>
        } @else {
          <p class="muted">{{ t().experience.empty }}</p>
        }
      </div>
    </section>
  `,
  styleUrl: './experience-section.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExperienceSectionComponent {
  private readonly store = inject(PortfolioStore);
  protected readonly t = inject(I18nService).t;
  protected readonly items = computed(() =>
    (this.store.portfolio()?.experiences ?? []).map((e) => ({
      ...e,
      duration: formatDuration(e.startDate, e.isCurrent ? null : e.endDate),
    })),
  );
}
