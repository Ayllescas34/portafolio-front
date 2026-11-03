import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiError } from '../../core/http/api-error';
import type { ApiResponse, ProjectCategory } from '../../core/models/api.models';
import type { ContactMessageInput, Portfolio, Project } from '../../core/models/portfolio.models';

type LoadState = 'idle' | 'loading' | 'ready' | 'error';

/**
 * Public content, loaded once per visit from /api/public/portfolio and shared
 * by every section. Nothing professional is hard-coded in the components.
 */
@Injectable({ providedIn: 'root' })
export class PortfolioStore {
  private readonly http = inject(HttpClient);

  readonly state = signal<LoadState>('idle');
  readonly error = signal<ApiError | null>(null);
  readonly portfolio = signal<Portfolio | null>(null);

  readonly profile = computed(() => this.portfolio()?.profile ?? null);
  readonly currentExperience = computed(() => this.portfolio()?.experiences.find((e) => e.isCurrent) ?? null);
  readonly featuredSkills = computed(() =>
    (this.portfolio()?.skillCategories ?? []).flatMap((c) => c.skills).filter((s) => s.isFeatured),
  );
  /** Earliest published experience start, for "Experiencia desde 2024". */
  readonly careerStart = computed(() => {
    const dates = (this.portfolio()?.experiences ?? []).map((e) => e.startDate).sort();
    return dates[0] ?? null;
  });
  readonly featuredProject = computed(() => this.portfolio()?.projects.find((p) => p.isFeatured) ?? null);

  private pending?: Promise<void>;

  /** Idempotent: concurrent callers share the same request. */
  load(force = false): Promise<void> {
    if (!force && (this.state() === 'ready' || this.pending)) return this.pending ?? Promise.resolve();
    this.state.set('loading');
    this.error.set(null);
    this.pending = firstValueFrom(this.http.get<ApiResponse<Portfolio>>('/api/public/portfolio'))
      .then((res) => {
        this.portfolio.set(res.data);
        this.state.set('ready');
      })
      .catch((error: unknown) => {
        this.error.set(ApiError.from(error));
        this.state.set('error');
      })
      .finally(() => (this.pending = undefined));
    return this.pending;
  }

  async projects(filters: { technology?: string | null; category?: ProjectCategory | null }): Promise<Project[]> {
    const params: Record<string, string> = {};
    if (filters.technology) params['technology'] = filters.technology;
    if (filters.category) params['category'] = filters.category;
    const res = await firstValueFrom(this.http.get<ApiResponse<Project[]>>('/api/public/projects', { params }));
    return res.data;
  }

  async project(slug: string): Promise<Project> {
    const res = await firstValueFrom(
      this.http.get<ApiResponse<Project>>(`/api/public/projects/${encodeURIComponent(slug)}`),
    );
    return res.data;
  }

  async sendMessage(input: ContactMessageInput): Promise<void> {
    await firstValueFrom(this.http.post('/api/public/contact', input));
  }
}
