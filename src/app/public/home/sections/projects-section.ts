import { Location } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { I18nService } from '../../../core/i18n/i18n.service';
import { ApiError } from '../../../core/http/api-error';
import type { ProjectCategory } from '../../../core/models/api.models';
import type { Project } from '../../../core/models/portfolio.models';
import { AsyncStateComponent } from '../../../shared/ui/async-state';
import { ProjectCardComponent } from '../../../shared/ui/project-card';
import { RevealDirective } from '../../../shared/ui/reveal.directive';
import { PortfolioStore } from '../../data/portfolio.store';

/**
 * Projects with technology / category filters. Filtering is done by the API
 * (/api/public/projects) and mirrored in the URL (?tecnologia=…&categoria=…)
 * without triggering a navigation, so the page never jumps.
 */
@Component({
  selector: 'app-projects-section',
  imports: [ProjectCardComponent, AsyncStateComponent, RevealDirective],
  template: `
    <section id="proyectos" class="section" aria-labelledby="projects-title">
      <div class="container">
        <header class="section-header" appReveal>
          <p class="eyebrow">{{ t().projects.eyebrow }}</p>
          <h2 id="projects-title" class="section-title">{{ t().projects.title }}</h2>
        </header>

        @if (allProjects().length === 0) {
          <p class="muted">{{ t().projects.none }}</p>
        } @else {
          @if (featured(); as featured) {
            <div class="featured" appReveal>
              <p class="eyebrow">{{ t().projects.featured }}</p>
              <app-project-card [project]="featured" variant="featured" />
            </div>
          }

          <div class="filters" role="group" [attr.aria-label]="t().projects.filterByTech">
            <button type="button" class="filter" [attr.aria-pressed]="!technology()" (click)="setTechnology(null)">
              {{ t().projects.all }}
            </button>
            @for (tech of filterOptions().technologies; track tech.slug) {
              <button
                type="button"
                class="filter"
                [attr.aria-pressed]="technology() === tech.slug"
                (click)="setTechnology(tech.slug)"
              >
                {{ tech.name }} <span class="count">{{ tech.count }}</span>
              </button>
            }
          </div>
          @if (filterOptions().categories.length > 1) {
            <div class="filters" role="group" [attr.aria-label]="t().projects.filterByCategory">
              @for (category of filterOptions().categories; track category.value) {
                <button
                  type="button"
                  class="filter filter-category"
                  [attr.aria-pressed]="categoryFilter() === category.value"
                  (click)="setCategory(categoryFilter() === category.value ? null : category.value)"
                >
                  {{ t().enums.projectCategory[category.value] }}
                </button>
              }
            </div>
          }

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
  readonly categoryFilter = signal<ProjectCategory | null>(null);
  readonly state = signal<'ready' | 'loading' | 'error'>('ready');
  private readonly filtered = signal<Project[] | null>(null);
  protected readonly errorText = signal('');
  private request = 0;

  protected readonly allProjects = computed(() => this.store.portfolio()?.projects ?? []);
  protected readonly featured = computed(() => this.store.featuredProject());
  protected readonly filterOptions = computed(
    () => this.store.portfolio()?.projectFilters ?? { technologies: [], categories: [] },
  );
  readonly isFiltering = computed(() => !!this.technology() || !!this.categoryFilter());
  /** Unfiltered, the featured project is already shown above the grid. */
  readonly projects = computed(
    () => this.filtered() ?? this.allProjects().filter((p) => p.id !== this.featured()?.id),
  );

  constructor() {
    const query = inject(ActivatedRoute).snapshot.queryParamMap;
    const tech = query.get('tecnologia');
    const category = query.get('categoria') as ProjectCategory | null;
    if (tech || category) {
      this.technology.set(tech);
      this.categoryFilter.set(category);
      void this.refresh();
    }
  }

  setTechnology(slug: string | null): void {
    this.technology.set(slug);
    void this.refresh();
  }

  setCategory(category: ProjectCategory | null): void {
    this.categoryFilter.set(category);
    void this.refresh();
  }

  clear(): void {
    this.technology.set(null);
    this.categoryFilter.set(null);
    void this.refresh();
  }

  async refresh(): Promise<void> {
    this.syncUrl();
    const technology = this.technology();
    const category = this.categoryFilter();
    if (!technology && !category) {
      this.filtered.set(null);
      this.state.set('ready');
      return;
    }
    const id = ++this.request; // ignore responses that arrive out of order
    this.state.set('loading');
    try {
      const result = await this.store.projects({ technology, category });
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
    if (this.technology()) params.set('tecnologia', this.technology()!);
    if (this.categoryFilter()) params.set('categoria', this.categoryFilter()!);
    this.location.replaceState(this.location.path().split('?')[0].split('#')[0] || '/', params.toString());
  }
}
