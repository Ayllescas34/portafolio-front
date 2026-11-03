import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { I18nService } from '../../../core/i18n/i18n.service';
import { formatDuration, PeriodPipe } from '../../../shared/pipes/period';
import { RevealDirective } from '../../../shared/ui/reveal.directive';
import { PortfolioStore } from '../../data/portfolio.store';

@Component({
  selector: 'app-experience-section',
  imports: [PeriodPipe, RevealDirective],
  template: `
    <section id="experiencia" class="section section-band" aria-labelledby="experience-title">
      <div class="container">
        <header class="section-header" appReveal>
          <p class="eyebrow">{{ t().experience.eyebrow }}</p>
          <h2 id="experience-title" class="section-title">{{ t().experience.title }}</h2>
        </header>

        @if (items().length) {
          <ol class="timeline">
            @for (item of items(); track item.id) {
              <li class="entry" [class.current]="item.isCurrent" appReveal>
                <div class="when">
                  <span class="period tabular">{{ item | period }}</span>
                  <span class="duration">{{ item.duration }}</span>
                </div>
                <article class="body">
                  <div class="title-row">
                    <h3>{{ item.position }}</h3>
                    @if (item.isCurrent) {
                      <span class="badge badge-live">{{ t().experience.current }}</span>
                    }
                  </div>
                  <p class="company">
                    {{ item.company }}
                    @if (item.location) {
                      <span> · {{ item.location }}</span>
                    }
                  </p>
                  @if (item.employmentType || item.workMode) {
                    <ul class="chip-list meta">
                      @if (item.employmentType) {
                        <li class="chip">{{ t().enums.employmentType[item.employmentType] }}</li>
                      }
                      @if (item.workMode) {
                        <li class="chip">{{ t().enums.workMode[item.workMode] }}</li>
                      }
                    </ul>
                  }

                  @if (item.summary) {
                    <p class="summary">{{ item.summary }}</p>
                  }
                  @if (item.responsibilities.length) {
                    <h4 class="label">{{ t().experience.responsibilities }}</h4>
                    <ul class="bullets" [class.single]="item.responsibilities.length < 4">
                      @for (line of item.responsibilities; track $index) {
                        <li>{{ line }}</li>
                      }
                    </ul>
                  }
                  @if (item.achievements.length) {
                    <h4 class="label">{{ t().experience.achievements }}</h4>
                    <ul class="bullets single">
                      @for (line of item.achievements; track $index) {
                        <li>{{ line }}</li>
                      }
                    </ul>
                  }
                  @if (item.technologies.length) {
                    <h4 class="visually-hidden">{{ t().experience.technologies }}</h4>
                    <ul class="chip-list">
                      @for (tech of item.technologies; track tech.id) {
                        <li class="chip">{{ tech.name }}</li>
                      }
                    </ul>
                  }
                </article>
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
