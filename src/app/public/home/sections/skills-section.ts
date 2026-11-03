import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { I18nService } from '../../../core/i18n/i18n.service';
import { RevealDirective } from '../../../shared/ui/reveal.directive';
import { PortfolioStore } from '../../data/portfolio.store';

/**
 * "Capacidades": the end-to-end delivery flow (from the DELIVERY_STAGE
 * highlights) followed by skills grouped by professional area. Qualitative
 * only: no percentages or progress bars.
 */
@Component({
  selector: 'app-skills-section',
  imports: [RevealDirective],
  template: `
    <section id="capacidades" class="section" aria-labelledby="capabilities-title">
      <div class="container">
        <header class="section-header" appReveal>
          <p class="eyebrow">{{ t().skills.eyebrow }}</p>
          <h2 id="capabilities-title" class="section-title">{{ t().delivery.title }}</h2>
          <p class="lead">{{ t().delivery.lead }}</p>
        </header>

        @if (stages().length) {
          <ol class="flow" [attr.aria-label]="t().delivery.title" appReveal>
            @for (stage of stages(); track stage.id; let i = $index) {
              <li class="stage">
                <span class="step tabular" aria-hidden="true">{{ i + 1 }}</span>
                <h3>
                  <span class="visually-hidden">{{ t().delivery.step }} {{ i + 1 }}:</span>
                  {{ stage.title }}
                </h3>
                <p>{{ stage.description }}</p>
              </li>
            }
          </ol>
        }

        <div class="areas-header" appReveal>
          <h3 class="subtitle">{{ t().skills.title }}</h3>
          <p class="muted">{{ t().skills.lead }}</p>
        </div>
        <div class="areas">
          @for (area of areas(); track area.id) {
            <article class="area" appReveal>
              <h4>{{ area.name }}</h4>
              @if (area.description) {
                <p class="area-description">{{ area.description }}</p>
              }
              <ul class="skills">
                @for (skill of area.skills; track skill.id) {
                  <li [class.featured]="skill.isFeatured">
                    <span class="skill-name">{{ skill.name }}</span>
                    @if (skill.isFeatured) {
                      <span class="visually-hidden">({{ t().skills.featured }})</span>
                    }
                    @if (skill.description) {
                      <span class="skill-note">{{ skill.description }}</span>
                    }
                    @if (skill.proficiencyLabel) {
                      <span class="skill-note">{{ skill.proficiencyLabel }}</span>
                    }
                  </li>
                }
              </ul>
            </article>
          }
        </div>
      </div>
    </section>
  `,
  styleUrl: './skills-section.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SkillsSectionComponent {
  private readonly store = inject(PortfolioStore);
  protected readonly t = inject(I18nService).t;
  protected readonly areas = computed(() => this.store.portfolio()?.skillCategories ?? []);
  protected readonly stages = computed(() =>
    (this.store.portfolio()?.highlights ?? []).filter((h) => h.kind === 'DELIVERY_STAGE'),
  );
}
