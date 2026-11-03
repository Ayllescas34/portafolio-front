import { Location } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { I18nService } from '../../../core/i18n/i18n.service';
import { ApiError } from '../../../core/http/api-error';
import type { ProjectKind } from '../../../core/models/api.models';
import type { Project } from '../../../core/models/portfolio.models';
import { AsyncStateComponent } from '../../../shared/ui/async-state';
import { ProjectCardComponent } from '../../../shared/ui/project-card';
import { RevealDirective } from '../../../shared/ui/reveal.directive';
import { PortfolioStore } from '../../data/portfolio.store';

const KINDS: ProjectKind[] = ['PROFESSIONAL', 'PERSONAL', 'ACADEMIC', 'DEMO'];

/**
 * Projects as case studies, filterable by kind and technology. Filtering is
 * done by the API (/api/public/projects) and mirrored in the URL
 * (?tipo=…&tecnologia=…) without triggering a navigation, so the page never jumps.
 */
@Component({
  selector: 'app-projects-section',
  imports: [ProjectCardComponent, AsyncStateComponent, RevealDirective],
  template: `
    <section id="proyectos" class="section section-band" aria-labelledby="projects-title">
      <div class="container">
        <header class="section-header" appReveal>
          <p class="eyebrow">{{ t().projects.eyebrow }}</p>
          <h2 id="projects-title" class="section-title">{{ t().projects.title }}</h2>
          <p class="lead">{{ t().projects.lead }}</p>
        </header>

        @if (allProjects().length === 0) {
          <p class="muted">{{ t().projects.none }}</p>
        } @else {
          @if (featured(); as featured) {
            <div class="featured" appReveal>
              <p class="featured-label">{{ t().projects.featured }}</p>
              <app-project-card [project]="featured" variant="featured" />
            </div>
          }

          <div class="toolbar">
            @if (filterOptions().kinds.length > 1) {
              <div class="filters" role="group" [attr.aria-label]="t().projects.filterByKind">
                <span class="filter-label" aria-hidden="true">{{ t().projects.filterBy }}</span>
                <button type="button" class="filter" [attr.aria-pressed]="!kind()" (click)="setKind(null)">
                  {{ t().projects.all }} <sup class="count">{{ allProjects().length }}</sup>
                </button>
                @for (option of kindOptions(); track option.value) {
                  <button
                    type="button"
                    class="filter"
                    [attr.aria-pressed]="kind() === option.value"
                    (click)="setKind(option.value)"
                  >
                    {{ t().enums.projectKind[option.value] }} <sup class="count">{{ option.count }}</sup>
                  </button>
                }
              </div>
            }
            <div class="filters" role="group" [attr.aria-label]="t().projects.filterByTech">
              @for (tech of filterOptions().technologies; track tech.slug) {
                <button
                  type="button"
                  class="filter filter-tech"
                  [attr.aria-pressed]="technology() === tech.slug"
                  (click)="setTechnology(technology() === tech.slug ? null : tech.slug)"
                >
                  {{ tech.name }}
                </button>
              }
            </div>
          </div>

          <p class="results" role="status" aria-live="polite">
            @if (isFiltering()) {
              {{ t().projects.results(projects().length) }}
              <button type="button" class="btn btn-ghost btn-sm" (click)="clear()">{{ t().projects.clear }}</button>
            }
          </p>

          @if (state() === 'error') {
            <app-async-state state="error" [errorText]="errorText()" (retry)="refresh()" />
          } @else if (projects().length === 0 && isFiltering()) {
            <app-async-state state="empty" [emptyText]="t().projects.empty" />
          } @else if (projects().length > 0) {
            <ul class="grid" [class.busy]="state() === 'loading'" [attr.aria-busy]="state() === 'loading'">
              @for (project of projects(); track project.id) {
                <li><app-project-card [project]="project" /></li>
              }
            </ul>
          }
        }
      </div>
    </section>
  `,
  styleUrl: './projects-section.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectsSectionComponent {
  private readonly store = inject(PortfolioStore);
  private readonly location = inject(Location);
  protected readonly t = inject(I18nService).t;

  readonly technology = signal<string | null>(null);
  readonly kind = signal<ProjectKind | null>(null);
  readonly state = signal<'ready' | 'loading' | 'error'>('ready');
  private readonly filtered = signal<Project[] | null>(null);
  protected readonly errorText = signal('');
  private request = 0;

  protected readonly allProjects = computed(() => this.store.portfolio()?.projects ?? []);
  protected readonly featured = computed(() => this.store.featuredProject());
  protected readonly filterOptions = computed(
    () => this.store.portfolio()?.projectFilters ?? { technologies: [], categories: [], kinds: [] },
  );
  /** Kinds in a stable, meaningful order (professional first). */
  protected readonly kindOptions = computed(() =>
    [...this.filterOptions().kinds].sort((a, b) => KINDS.indexOf(a.value) - KINDS.indexOf(b.value)),
  );
  readonly isFiltering = computed(() => !!this.technology() || !!this.kind());
  /** Unfiltered, the featured project is already shown above the grid. */
  readonly projects = computed(
    () => this.filtered() ?? this.allProjects().filter((p) => p.id !== this.featured()?.id),
  );

  constructor() {
    const query = inject(ActivatedRoute).snapshot.queryParamMap;
    const tech = query.get('tecnologia');
    const kind = query.get('tipo') as ProjectKind | null;
    if (tech || (kind && KINDS.includes(kind))) {
      this.technology.set(tech);
      this.kind.set(kind && KINDS.includes(kind) ? kind : null);
      void this.refresh();
    }
  }

  setTechnology(slug: string | null): void {
    this.technology.set(slug);
    void this.refresh();
  }

  setKind(kind: ProjectKind | null): void {
    this.kind.set(kind);
    void this.refresh();
  }

  clear(): void {
    this.technology.set(null);
    this.kind.set(null);
    void this.refresh();
  }

  async refresh(): Promise<void> {
    this.syncUrl();
    const technology = this.technology();
    const kind = this.kind();
    if (!technology && !kind) {
      this.filtered.set(null);
      this.state.set('ready');
      return;
    }
    const id = ++this.request; // ignore responses that arrive out of order
    this.state.set('loading');
    try {
      const result = await this.store.projects({ technology, kind });
      if (id !== this.request) return;
      this.filtered.set(result);
      this.state.set('ready');
    } catch (error) {
      if (id !== this.request) return;
      this.errorText.set(ApiError.from(error).message);
      this.state.set('error');
    }
  }

  private syncUrl(): void {
    const params = new URLSearchParams();
    if (this.kind()) params.set('tipo', this.kind()!);
    if (this.technology()) params.set('tecnologia', this.technology()!);
    this.location.replaceState(this.location.path().split('?')[0].split('#')[0] || '/', params.toString());
  }
}
