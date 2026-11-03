import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { I18nService } from '../../core/i18n/i18n.service';
import { ApiError } from '../../core/http/api-error';
import type { Project } from '../../core/models/portfolio.models';
import { SeoService } from '../../core/seo/seo.service';
import { PeriodPipe } from '../../shared/pipes/period';
import { AsyncStateComponent } from '../../shared/ui/async-state';
import { IconComponent } from '../../shared/ui/icon';
import { PortfolioStore } from '../data/portfolio.store';

@Component({
  selector: 'app-project-detail-page',
  imports: [RouterLink, IconComponent, AsyncStateComponent, PeriodPipe],
  templateUrl: './project-detail.page.html',
  styleUrl: './project-detail.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectDetailPage {
  /** Bound from the route (:slug) via withComponentInputBinding. */
  readonly slug = input.required<string>();

  private readonly store = inject(PortfolioStore);
  private readonly seo = inject(SeoService);
  protected readonly t = inject(I18nService).t;

  readonly project = signal<Project | null>(null);

  /** Case-study narrative in reading order; empty fields are simply omitted. */
  protected readonly blocks = computed(() => {
    const p = this.project();
    if (!p) return [];
    const t = this.t().projects;
    return [
      [t.context, p.context],
      [t.problem, p.problem],
      [t.solution, p.solution],
      [t.architecture, p.architecture],
      [t.challenges, p.challenges],
      [t.outcome, p.outcome],
      ['', p.fullDescription],
    ]
      .filter((entry): entry is [string, string] => !!entry[1])
      .map(([title, text]) => ({ title, paragraphs: text.split(/\n{2,}/) }));
  });
  readonly state = signal<'loading' | 'ready' | 'error' | 'not-found'>('loading');
  protected readonly errorText = signal('');

  constructor() {
    effect(() => void this.load(this.slug()));
  }

  async load(slug: string): Promise<void> {
    this.state.set('loading');
    try {
      const project = await this.store.project(slug);
      this.project.set(project);
      this.state.set('ready');
      const owner = this.store.profile()?.fullName;
      this.seo.set({
        title: owner ? `${project.title} · ${owner}` : project.title,
        description: project.shortDescription,
        image: project.coverImageUrl,
        type: 'article',
      });
    } catch (error) {
      const apiError = ApiError.from(error);
      this.errorText.set(apiError.message);
      this.state.set(apiError.status === 404 ? 'not-found' : 'error');
      if (apiError.status === 404) {
        this.seo.set({ title: this.t().projects.notFound, description: this.t().projects.notFound, noIndex: true });
      }
    }
  }
}
