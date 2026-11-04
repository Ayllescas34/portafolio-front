import { afterNextRender, ChangeDetectionStrategy, Component, DestroyRef, effect, ElementRef, inject } from '@angular/core';
import { I18nService } from '../../core/i18n/i18n.service';
import { SeoService } from '../../core/seo/seo.service';
import { AsyncStateComponent } from '../../shared/ui/async-state';
import { PortfolioStore } from '../data/portfolio.store';
import { SectionSpyService } from '../layout/section-spy.service';
import { AboutSectionComponent } from './sections/about-section';
import { ContactSectionComponent } from './sections/contact-section';
import { EducationSectionComponent } from './sections/education-section';
import { ExperienceSectionComponent } from './sections/experience-section';
import { HeroSectionComponent } from './sections/hero-section';
import { ProjectsSectionComponent } from './sections/projects-section';
import { SkillsSectionComponent } from './sections/skills-section';

@Component({
  selector: 'app-home-page',
  imports: [
    AsyncStateComponent,
    HeroSectionComponent,
    AboutSectionComponent,
    ExperienceSectionComponent,
    SkillsSectionComponent,
    ProjectsSectionComponent,
    EducationSectionComponent,
    ContactSectionComponent,
  ],
  template: `
    @switch (store.state()) {
      @case ('ready') {
        <app-hero-section />
        <app-about-section />
        <app-experience-section />
        <app-skills-section />
        <app-projects-section />
        <app-education-section />
        <app-contact-section />
      }
      @case ('error') {
        <div class="container placeholder">
          <app-async-state
            state="error"
            [errorText]="store.error()?.message ?? t().states.error"
            [retryText]="t().states.retry"
            (retry)="store.load(true)"
          />
        </div>
      }
      @default {
        <div class="hero-placeholder force-dark">
          <app-async-state state="loading" [loadingText]="t().states.loading" />
        </div>
      }
    }
  `,
  styles: `
    .placeholder { min-height: 60vh; display: grid; place-items: center; }
    .hero-placeholder {
      display: grid;
      place-items: center;
      min-height: 100dvh;
      margin-top: calc(-1 * var(--header-h));
      background: #0a101c;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomePage {
  protected readonly store = inject(PortfolioStore);
  protected readonly t = inject(I18nService).t;

  constructor() {
    const seo = inject(SeoService);
    const spy = inject(SectionSpyService);
    const host = inject(ElementRef<HTMLElement>).nativeElement as HTMLElement;

    effect(() => {
      const portfolio = this.store.portfolio();
      if (!portfolio) return;
      const { profile } = portfolio;
      // Keywords come from published content only (role, featured skills, technologies in use).
      const keywords = [
        profile.professionalTitle,
        ...this.store.featuredSkills().map((s) => s.name),
        ...portfolio.projectFilters.technologies.slice(0, 6).map((t) => t.name),
      ];
      seo.set({
        title: portfolio.site.siteTitle,
        description: portfolio.site.siteDescription,
        image: portfolio.site.ogImageUrl ?? profile.profileImageUrl,
        type: 'profile',
        keywords,
      });
      seo.setPerson({
        name: profile.fullName,
        jobTitle: profile.professionalTitle,
        description: profile.shortBio,
        email: profile.publicEmail,
        location: profile.location,
        worksFor: this.store.currentExperience()?.company ?? null,
        sameAs: portfolio.socialLinks.map((l) => l.url),
        knowsAbout: this.store.featuredSkills().map((s) => s.name),
        image: profile.profileImageUrl,
      });
    });

    // Observe sections once they are rendered (content arrives asynchronously).
    effect(() => {
      if (this.store.state() === 'ready') queueMicrotask(() => spy.observe(host));
    });
    afterNextRender(() => {
      if (this.store.state() === 'ready') spy.observe(host);
    });
    inject(DestroyRef).onDestroy(() => spy.disconnect());
  }
}
