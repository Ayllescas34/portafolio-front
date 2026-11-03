import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { I18nService } from '../../../core/i18n/i18n.service';
import type { HighlightKind } from '../../../core/models/api.models';
import { RevealDirective } from '../../../shared/ui/reveal.directive';
import { PortfolioStore } from '../../data/portfolio.store';

/** Delivery stages have their own section; this one shows how I work and what I bring. */
const ORDER: Exclude<HighlightKind, 'DELIVERY_STAGE'>[] = ['WORK_STYLE', 'VALUE', 'INTEREST'];

@Component({
  selector: 'app-about-section',
  imports: [RevealDirective],
  template: `
    <section id="perfil" class="section" aria-labelledby="about-title">
      <div class="container layout">
        <div class="intro" appReveal>
          <p class="eyebrow">{{ t().about.eyebrow }}</p>
          <h2 id="about-title" class="section-title">{{ t().about.title }}</h2>
          @for (paragraph of paragraphs(); track $index) {
            <p class="paragraph">{{ paragraph }}</p>
          }
        </div>

        <div class="groups">
          @for (group of groups(); track group.kind) {
            <div class="group" appReveal>
              <h3 class="group-title">{{ t().about[group.kind] }}</h3>
              <dl>
                @for (item of group.items; track item.id) {
                  <div class="item">
                    <dt>{{ item.title }}</dt>
                    <dd>{{ item.description }}</dd>
                  </div>
                }
              </dl>
            </div>
          }
        </div>
      </div>
    </section>
  `,
  styles: `
    .layout { display: grid; grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr); gap: clamp(2rem, 6vw, 5rem); align-items: start; }
    .paragraph { max-width: var(--measure); color: var(--text-muted); font-size: 1.04rem; }
    .paragraph:first-of-type { color: var(--text); }
    .groups { display: grid; gap: 2.25rem; padding-top: 0.4rem; }
    .group-title { margin-bottom: 0.25rem; font-size: 0.78rem; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; color: var(--text-faint); }
    dl { margin: 0; }
    .item { padding: 1rem 0; border-bottom: 1px solid var(--border); }
    .item:last-child { border-bottom: 0; }
    dt { margin-bottom: 0.25rem; font-weight: 600; }
    dd { margin: 0; color: var(--text-muted); font-size: 0.95rem; }
    @media (max-width: 900px) { .layout { grid-template-columns: minmax(0, 1fr); } }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AboutSectionComponent {
  private readonly store = inject(PortfolioStore);
  protected readonly t = inject(I18nService).t;

  protected readonly paragraphs = computed(() =>
    (this.store.profile()?.longBio ?? '')
      .split(/\n{2,}/)
      .map((p) => p.trim())
      .filter(Boolean),
  );

  protected readonly groups = computed(() => {
    const highlights = this.store.portfolio()?.highlights ?? [];
    return ORDER.map((kind) => ({ kind, items: highlights.filter((h) => h.kind === kind) })).filter(
      (g) => g.items.length > 0,
    );
  });
}
