import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiError } from '../../core/http/api-error';
import type { PageMeta } from '../../core/models/api.models';
import { ToastService } from '../../core/ui/toast.service';
import { formatDate } from '../../shared/pipes/period';
import { AsyncStateComponent } from '../../shared/ui/async-state';
import { IconComponent } from '../../shared/ui/icon';
import { AdminApiService } from '../data/admin-api.service';
import { LookupService } from '../data/lookup.service';
import type { AdminRecord, ColumnDef, ResourceConfig } from '../resources/resource.types';
import { ConfirmService } from '../ui/confirm-dialog';

@Component({
  selector: 'app-resource-list-page',
  imports: [RouterLink, IconComponent, AsyncStateComponent],
  templateUrl: './resource-list.page.html',
  styleUrl: './resource-list.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResourceListPage {
  /** Provided through route data. */
  readonly resource = input.required<ResourceConfig>();

  private readonly api = inject(AdminApiService);
  private readonly toasts = inject(ToastService);
  private readonly confirm = inject(ConfirmService);
  private readonly lookups = inject(LookupService);

  readonly items = signal<AdminRecord[]>([]);
  readonly meta = signal<PageMeta | null>(null);
  readonly state = signal<'loading' | 'ready' | 'error'>('loading');
  readonly errorText = signal('');
  readonly busyId = signal<string | null>(null);

  readonly search = signal('');
  readonly published = signal<'all' | 'true' | 'false'>('all');
  readonly page = signal(1);
  private searchTimer?: ReturnType<typeof setTimeout>;
  private request = 0;

  /** Reordering only makes sense on the full, unfiltered list. */
  readonly canReorder = computed(
    () => !!this.resource().orderable && !this.search() && this.published() === 'all' && (this.meta()?.totalPages ?? 1) === 1,
  );

  constructor() {
    effect(() => {
      this.resource();
      untracked(() => {
        this.search.set('');
        this.published.set('all');
        this.page.set(1);
        void this.load();
      });
    });
  }

  async load(): Promise<void> {
    const id = ++this.request;
    this.state.set('loading');
    try {
      const res = await this.api.list(this.resource().endpoint, {
        page: this.page(),
        // Orderable lists are short: load them whole so they can be reordered.
        pageSize: this.resource().orderable ? 100 : 20,
        search: this.search() || undefined,
        isPublished: this.published() === 'all' ? undefined : this.published() === 'true',
      });
      if (id !== this.request) return;
      this.items.set(res.data);
      this.meta.set(res.meta);
      this.state.set('ready');
    } catch (error) {
      if (id !== this.request) return;
      this.errorText.set(ApiError.from(error).message);
      this.state.set('error');
    }
  }

  onSearch(value: string): void {
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => {
      this.search.set(value.trim());
      this.page.set(1);
      void this.load();
    }, 300);
  }

  onPublishedFilter(value: string): void {
    this.published.set(value as 'all' | 'true' | 'false');
    this.page.set(1);
    void this.load();
  }

  goTo(page: number): void {
    this.page.set(page);
    void this.load();
  }

  async togglePublished(item: AdminRecord): Promise<void> {
    const id = item.id!;
    const next = !item['isPublished'];
    this.busyId.set(id);
    try {
      await this.api.update(this.resource().endpoint, id, { isPublished: next });
      this.items.update((list) => list.map((i) => (i.id === id ? { ...i, isPublished: next } : i)));
      this.toasts.success(next ? 'Publicado en el sitio.' : 'Ocultado del sitio público.');
    } catch (error) {
      this.toasts.error(ApiError.from(error).message);
    } finally {
      this.busyId.set(null);
    }
  }

  async move(index: number, delta: -1 | 1): Promise<void> {
    const list = [...this.items()];
    const target = index + delta;
    if (target < 0 || target >= list.length) return;
    [list[index], list[target]] = [list[target], list[index]];
    const previous = this.items();
    this.items.set(list); // optimistic
    try {
      await this.api.reorder(this.resource().endpoint, list.map((i) => i.id!));
      this.toasts.success('Orden actualizado.');
      queueMicrotask(() => document.getElementById(`move-${delta < 0 ? 'up' : 'down'}-${list[target].id}`)?.focus());
    } catch (error) {
      this.items.set(previous);
      this.toasts.error(ApiError.from(error).message);
    }
  }

  async remove(item: AdminRecord): Promise<void> {
    const resource = this.resource();
    const ok = await this.confirm.ask({
      title: `Eliminar ${resource.singular}`,
      message: `"${resource.primary(item)}" se eliminará de forma permanente. Esta acción no se puede deshacer.`,
      confirmText: 'Eliminar',
      danger: true,
    });
    if (!ok) return;
    this.busyId.set(item.id!);
    try {
      await this.api.remove(resource.endpoint, item.id!);
      this.toasts.success(`${capitalize(resource.singular)} eliminado.`);
      if (resource.endpoint === 'technologies' || resource.endpoint === 'skill-categories') this.lookups.invalidate();
      await this.load();
    } catch (error) {
      this.toasts.error(ApiError.from(error).message);
    } finally {
      this.busyId.set(null);
    }
  }

  cell(item: AdminRecord, column: ColumnDef): string {
    const value = item[column.key];
    switch (column.kind) {
      case 'date':
        return typeof value === 'string' ? formatDate(value, 'MONTH') : '—';
      case 'boolean':
        return value ? 'Sí' : '—';
      case 'enum':
        return column.options?.find((o) => o.value === value)?.label ?? '—';
      default:
        return value === null || value === undefined || value === '' ? '—' : String(value);
    }
  }
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
