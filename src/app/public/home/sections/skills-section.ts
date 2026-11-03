import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { I18nService } from '../../../core/i18n/i18n.service';
import { IconComponent, IconName } from '../../../shared/ui/icon';
import { RevealDirective } from '../../../shared/ui/reveal.directive';
import { PortfolioStore } from '../../data/portfolio.store';

const AREA_ICONS: Record<string, IconName> = {
  frontend: 'monitor',
  backend: 'server',
  'bases-de-datos': 'database',
  'calidad-y-pruebas': 'shield',
  'devops-y-despliegue': 'rocket',
  'arquitectura-y-practicas': 'layers',
  'competencias-complementarias': 'puzzle',
};

/**
 * "Capacidades": the end-to-end delivery flow (from the DELIVERY_STAGE
 * highlights) followed by a bordered grid of professional areas. Qualitative
 * only: no percentages or progress bars.
 */
@Component({
  selector: 'app-skills-section',
  imports: [RevealDirective, IconComponent],
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
                <span class="step" aria-hidden="true">{{ i + 1 }}</span>
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
        <div class="areas" appReveal>
          @for (area of areas(); track area.id) {
            <article class="area">
              <div class="area-head">
                <app-icon [name]="area.icon" [size]="38" />
                <h4><span class="mark">{{ area.first }}</span> {{ area.rest }}</h4>
              </div>
              <span class="tag" aria-hidden="true">&lt;{{ area.slug }}&gt;</span>
              <div class="area-body">
                @if (area.description) {
                  <p class="area-description">{{ area.description }}</p>
                }
                <ul class="skills">
                  @for (skill of area.skills; track skill.id) {
                    <li [class.featured]="skill.isFeatured">
                      <span>{{ skill.name }}</span>
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
              </div>
              <span class="tag" aria-hidden="true">&lt;/{{ area.slug }}&gt;</span>
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
  protected readonly areas = computed(() =>
    (this.store.portfolio()?.skillCategories ?? []).map((category) => {
      const [first, ...rest] = category.name.split(' ');
      return { ...category, first, rest: rest.join(' '), icon: AREA_ICONS[category.slug] ?? 'code' };
    }),
  );
  protected readonly stages = computed(() =>
    (this.store.portfolio()?.highlights ?? []).filter((h) => h.kind === 'DELIVERY_STAGE'),
  );
}
