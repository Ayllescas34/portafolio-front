import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { I18nService } from '../../../core/i18n/i18n.service';
import { formatDate } from '../../../shared/pipes/period';
import { IconComponent } from '../../../shared/ui/icon';
import { PortfolioStore } from '../../data/portfolio.store';
import { HeroSceneComponent } from '../../hero-scene/hero-scene';

@Component({
  selector: 'app-hero-section',
  imports: [RouterLink, IconComponent, HeroSceneComponent],
  template: `
    @if (profile(); as profile) {
      <section id="inicio" class="hero force-dark" aria-labelledby="hero-title">
        <app-hero-scene />
        <div class="veil" aria-hidden="true"></div>

        <div class="container hero-content">
          <h1 id="hero-title">{{ profile.fullName }}</h1>
          <p class="role">{{ profile.professionalTitle }}</p>
          <p class="statement">{{ profile.shortBio }}</p>
          @if (profile.tagline) {
            <p class="tagline">{{ profile.tagline }}</p>
          }

          <div class="cta">
            <a class="btn btn-primary" routerLink="/" fragment="experiencia">
              {{ t().hero.viewExperience }}<app-icon name="arrow-right" />
            </a>
            <a class="btn" routerLink="/" fragment="proyectos">{{ t().hero.viewProjects }}</a>
            <a class="btn btn-ghost" routerLink="/" fragment="contacto"><app-icon name="mail" />{{ t().hero.contact }}</a>
            @if (profile.cvFileUrl) {
              <a class="btn btn-ghost" [href]="profile.cvFileUrl" download>
                <app-icon name="download" />{{ t().hero.downloadCv }}
              </a>
            }
          </div>

          <dl class="facts" [attr.aria-label]="t().hero.summary">
            @if (current(); as current) {
              <div>
                <dt>{{ t().hero.currently }}</dt>
                <dd>{{ current.position }} {{ t().hero.at }} {{ current.company }}</dd>
              </div>
            }
            @if (since(); as since) {
              <div>
                <dt>{{ t().hero.since }}</dt>
                <dd class="since">{{ since }}</dd>
              </div>
            }
            @if (profile.location) {
              <div>
                <dt>{{ t().hero.based }}</dt>
                <dd>{{ profile.location }}</dd>
              </div>
            }
            @if (profile.publicEmail) {
              <div>
                <dt>{{ t().hero.email }}</dt>
                <dd><a [href]="'mailto:' + profile.publicEmail">{{ profile.publicEmail }}</a></dd>
              </div>
            }
            @if (stack().length) {
              <div class="facts-stack">
                <dt class="visually-hidden">{{ t().hero.stack }}</dt>
                <dd>
                  <ul class="stack">
                    @for (skill of stack(); track skill.id) {
                      <li>{{ skill.name }}</li>
                    }
                  </ul>
                </dd>
              </div>
            }
          </dl>
        </div>
      </section>
    }
  `,
  styleUrl: './hero-section.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeroSectionComponent {
  private readonly store = inject(PortfolioStore);
  private readonly i18n = inject(I18nService);
  protected readonly t = this.i18n.t;
  protected readonly profile = this.store.profile;
  protected readonly current = this.store.currentExperience;
  /** Technologies of the current role first, then featured skills (deduplicated by name). */
  protected readonly stack = computed(() => {
    const current = (this.current()?.technologies ?? []).map((t) => ({ id: t.id, name: t.name }));
    const featured = this.store.featuredSkills().map((s) => ({ id: s.id, name: s.name }));
    const seen = new Set<string>();
    return [...current, ...featured]
      .filter((item) => !seen.has(item.name.toLowerCase()) && seen.add(item.name.toLowerCase()))
      .slice(0, 9);
  });
  protected readonly since = computed(() => {
    const start = this.store.careerStart();
    return start ? formatDate(start, 'MONTH', this.i18n.intlLocale) : null;
  });
}
