import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { I18nService } from '../../../core/i18n/i18n.service';
import type { HighlightKind } from '../../../core/models/api.models';
import { RevealDirective } from '../../../shared/ui/reveal.directive';
import { PortfolioStore } from '../../data/portfolio.store';

const ORDER: HighlightKind[] = ['WORK_STYLE', 'VALUE', 'INTEREST'];

@Component({
  selector: 'app-about-section',
  imports: [RevealDirective],
  template: `
    <section id="sobre-mi" class="section" aria-labelledby="about-title">
      <div class="container about">
        <header class="section-header" appReveal>
          <p class="eyebrow">{{ t().about.eyebrow }}</p>
          <h2 id="about-title" class="section-title">{{ t().about.title }}</h2>
          @for (paragraph of paragraphs(); track $index) {
            <p class="lead">{{ paragraph }}</p>
          }
        </header>

        <div class="groups">
          @for (group of groups(); track group.kind) {
            <div class="group" appReveal>
              <h3 class="group-title mono">{{ t().about[group.kind] }}</h3>
              <ul>
                @for (item of group.items; track item.id) {
                  <li class="card item">
                    <h4>{{ item.title }}</h4>
                    <p>{{ item.description }}</p>
                  </li>
                }
              </ul>
            </div>
          }
        </div>
      </div>
    </section>
  `,
  styles: `
    .groups { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 2rem; }
    .group-title { margin-bottom: 1rem; font-size: 0.8rem; font-weight: 500; letter-spacing: 0.08em; text-transform: uppercase; color: var(--text-faint); }
    ul { display: grid; gap: 1rem; margin: 0; padding: 0; list-style: none; }
    .item { padding: 1.25rem 1.35rem; transition: border-color var(--dur) var(--ease), transform var(--dur) var(--ease); }
    .item:hover { border-color: var(--border-strong); transform: translateY(-2px); }
    h4 { margin-bottom: 0.35rem; font-size: 1.08rem; }
    .item p { margin: 0; color: var(--text-muted); }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AboutSectionComponent {
  private readonly store = inject(PortfolioStore);
  protected readonly t = inject(I18nService).t;

  protected readonly paragraphs = computed(() =>
    (this.store.profile()?.longBio ?? '').split(/\n{2,}/).map((p) => p.trim()).filter(Boolean),
  );

  protected readonly groups = computed(() => {
    const highlights = this.store.portfolio()?.highlights ?? [];
    return ORDER.map((kind) => ({ kind, items: highlights.filter((h) => h.kind === kind) })).filter(
      (g) => g.items.length > 0,
    );
  });
}
