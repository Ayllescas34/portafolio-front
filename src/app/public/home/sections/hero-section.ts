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
      <section id="inicio" class="hero" aria-labelledby="hero-title">
        <div class="hero-backdrop" aria-hidden="true"></div>
        <div class="hero-visual"><app-hero-scene /></div>

        <div class="container hero-inner">
          <div class="hero-copy">
            <p class="eyebrow">{{ profile.professionalTitle }}</p>
            <h1 id="hero-title">{{ profile.fullName }}</h1>
            <p class="hero-bio">{{ profile.shortBio }}</p>

            <div class="cta">
              <a class="btn btn-primary" routerLink="/" fragment="proyectos">
                {{ t().hero.viewProjects }}<app-icon name="arrow-right" />
              </a>
              <a class="btn" routerLink="/" fragment="experiencia">{{ t().hero.viewExperience }}</a>
              <a class="btn btn-ghost" routerLink="/cv"><app-icon name="printer" />{{ t().hero.viewResume }}</a>
              @if (profile.cvFileUrl) {
                <a class="btn btn-ghost" [href]="profile.cvFileUrl" download>
                  <app-icon name="download" />{{ t().hero.downloadCv }}
                </a>
              }
            </div>
          </div>

          <dl class="summary card" [attr.aria-label]="t().hero.summary">
            @if (current(); as current) {
              <div class="summary-item">
                <dt><app-icon name="briefcase" [size]="16" />{{ t().hero.currently }}</dt>
                <dd>
                  <strong>{{ current.position }}</strong> {{ t().hero.at }} {{ current.company }}
                  <span class="badge badge-live">{{ t().experience.present }}</span>
                </dd>
              </div>
            }
            @if (since(); as since) {
              <div class="summary-item">
                <dt><app-icon name="layers" [size]="16" />{{ t().hero.since }}</dt>
                <dd>{{ since }}</dd>
              </div>
            }
            @if (profile.location) {
              <div class="summary-item">
                <dt><app-icon name="map-pin" [size]="16" />{{ t().hero.based }}</dt>
                <dd>{{ profile.location }}</dd>
              </div>
            }
            @if (profile.publicEmail) {
              <div class="summary-item">
                <dt><app-icon name="mail" [size]="16" />{{ t().hero.contact }}</dt>
                <dd><a [href]="'mailto:' + profile.publicEmail">{{ profile.publicEmail }}</a></dd>
              </div>
            }
            @if (stack().length) {
              <div class="summary-item summary-stack">
                <dt><app-icon name="code" [size]="16" />{{ t().hero.stack }}</dt>
                <dd>
                  <ul class="chip-list">
                    @for (skill of stack(); track skill.id) {
                      <li class="chip chip-accent">{{ skill.name }}</li>
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
  protected readonly stack = computed(() => this.store.featuredSkills().slice(0, 8));
  protected readonly since = computed(() => {
    const start = this.store.careerStart();
    return start ? formatDate(start, 'MONTH', this.i18n.intlLocale) : null;
  });
}
