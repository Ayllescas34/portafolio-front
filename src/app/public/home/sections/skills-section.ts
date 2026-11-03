import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { I18nService } from '../../../core/i18n/i18n.service';
import { IconComponent } from '../../../shared/ui/icon';
import { RevealDirective } from '../../../shared/ui/reveal.directive';
import { PortfolioStore } from '../../data/portfolio.store';

/** Skills grouped by category. Qualitative only: no percentage bars. */
@Component({
  selector: 'app-skills-section',
  imports: [IconComponent, RevealDirective],
  template: `
    <section id="habilidades" class="section" aria-labelledby="skills-title">
      <div class="container">
        <header class="section-header" appReveal>
          <p class="eyebrow">{{ t().skills.eyebrow }}</p>
          <h2 id="skills-title" class="section-title">{{ t().skills.title }}</h2>
          <p class="lead">{{ t().skills.lead }}</p>
        </header>
        <div class="grid">
          @for (category of categories(); track category.id) {
            <article class="card category" appReveal>
              <h3>{{ category.name }}</h3>
              @if (category.description) {
                <p class="muted">{{ category.description }}</p>
              }
              <ul class="chip-list">
                @for (skill of category.skills; track skill.id) {
                  <li class="chip" [class.chip-accent]="skill.isFeatured" [attr.title]="skill.description">
                    @if (skill.isFeatured) {
                      <app-icon name="star" [size]="13" />
                      <span class="visually-hidden">{{ t().skills.featured }}:</span>
                    }
                    {{ skill.name }}
                    @if (skill.proficiencyLabel) {
                      <span class="level">· {{ skill.proficiencyLabel }}</span>
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
  styles: `
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1rem; }
    .category { padding: 1.35rem 1.4rem 1.5rem; }
    h3 { margin-bottom: 0.9rem; font-size: 1.05rem; font-family: var(--font-mono); font-weight: 500; letter-spacing: 0; color: var(--text); }
    .muted { font-size: 0.9rem; }
    .chip { font-size: 0.86rem; color: var(--text); }
    .chip-accent { color: var(--accent); }
    .level { color: var(--text-faint); }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SkillsSectionComponent {
  private readonly store = inject(PortfolioStore);
  protected readonly t = inject(I18nService).t;
  protected readonly categories = computed(() => this.store.portfolio()?.skillCategories ?? []);
}
