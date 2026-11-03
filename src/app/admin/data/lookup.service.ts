import { inject, Injectable, signal } from '@angular/core';
import { AdminApiService } from './admin-api.service';

export interface LookupItem {
  id: string;
  name: string;
}

/** Options for relation fields (technologies, skill categories), loaded on demand. */
@Injectable({ providedIn: 'root' })
export class LookupService {
  private readonly api = inject(AdminApiService);
  readonly technologies = signal<LookupItem[]>([]);
  readonly categories = signal<LookupItem[]>([]);
  private loading?: Promise<void>;

  ensureLoaded(): Promise<void> {
    this.loading ??= this.refresh().catch(() => {
      this.loading = undefined; // allow a retry on the next form
    });
    return this.loading;
  }

  async refresh(): Promise<void> {
    const [technologies, categories] = await Promise.all([
      this.api.list<LookupItem>('technologies', { pageSize: 100, sortBy: 'name' }),
      this.api.list<LookupItem>('skill-categories', { pageSize: 100 }),
    ]);
    this.technologies.set(technologies.data.map(({ id, name }) => ({ id, name })));
    this.categories.set(categories.data.map(({ id, name }) => ({ id, name })));
  }

  /** Called after creating/deleting technologies or categories. */
  invalidate(): void {
    this.loading = undefined;
  }
}
