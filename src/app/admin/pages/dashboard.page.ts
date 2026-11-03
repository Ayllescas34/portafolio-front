import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SessionStore } from '../../core/auth/session.store';
import { IconComponent } from '../../shared/ui/icon';
import { AdminApiService } from '../data/admin-api.service';
import { RESOURCES } from '../resources/resources';
import type { ResourceConfig } from '../resources/resource.types';

interface Tile {
  resource: ResourceConfig;
  total: number | null;
  drafts: number | null;
}

@Component({
  selector: 'app-dashboard-page',
  imports: [RouterLink, IconComponent],
  template: `
    <header class="page-head">
      <div>
        <h1>Hola, {{ session.admin()?.name }}</h1>
        <p class="muted">Resumen del contenido del portafolio.</p>
      </div>
      <a class="btn btn-sm" href="/" target="_blank" rel="noopener"><app-icon name="external" [size]="16" />Ver sitio público</a>
    </header>

    <a class="card inbox" routerLink="/admin/mensajes">
      <app-icon name="inbox" [size]="28" />
      <div>
        <strong>{{ unread() ?? '…' }} {{ unread() === 1 ? 'mensaje nuevo' : 'mensajes nuevos' }}</strong>
        <span class="muted">Revisa los mensajes recibidos desde el formulario de contacto.</span>
      </div>
      <app-icon name="arrow-right" />
    </a>

    <ul class="tiles">
      @for (tile of tiles(); track tile.resource.key) {
        <li>
          <a class="card tile" [routerLink]="['/admin', tile.resource.key]">
            <app-icon [name]="tile.resource.icon" />
            <span class="name">{{ tile.resource.title }}</span>
            <span class="total">{{ tile.total ?? '…' }}</span>
            @if (tile.drafts) {
              <span class="drafts">{{ tile.drafts }} oculto{{ tile.drafts === 1 ? '' : 's' }}</span>
            }
          </a>
        </li>
      }
    </ul>
  `,
  styles: `
    .inbox { display: flex; align-items: center; gap: 1rem; padding: 1.1rem 1.25rem; margin-bottom: 1.5rem; color: var(--text); text-decoration: none; }
    .inbox app-icon:first-child { color: var(--accent); }
    .inbox div { display: grid; flex: 1; }
    .inbox:hover { border-color: var(--border-strong); }
    .tiles { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 0.75rem; margin: 0; padding: 0; list-style: none; }
    .tile { display: grid; grid-template-columns: auto 1fr; align-items: center; gap: 0.25rem 0.75rem; padding: 1rem 1.1rem; color: var(--text); text-decoration: none; border-radius: var(--radius); }
    .tile:hover { border-color: var(--border-strong); }
    .tile app-icon { grid-row: span 2; color: var(--text-faint); }
    .name { font-weight: 600; }
    .total { font-family: var(--font-display); font-size: 1.5rem; line-height: 1.1; }
    .drafts { grid-column: 2; font-size: 0.82rem; color: var(--warning); }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardPage {
  protected readonly session = inject(SessionStore);
  private readonly api = inject(AdminApiService);

  readonly unread = signal<number | null>(null);
  readonly tiles = signal<Tile[]>(
    RESOURCES.filter((r) => !r.singleton).map((resource) => ({ resource, total: null, drafts: null })),
  );

  constructor() {
    void this.load();
  }

  private async load(): Promise<void> {
    const [unread, ...counts] = await Promise.allSettled([
      this.api.get<{ count: number }>('contact-messages', 'unread-count'),
      ...this.tiles().map(async ({ resource }) => {
        const all = await this.api.list(resource.endpoint, { pageSize: 1 });
        const drafts = resource.publishable
          ? (await this.api.list(resource.endpoint, { pageSize: 1, isPublished: false })).meta.total
          : null;
        return { total: all.meta.total, drafts };
      }),
    ]);
    if (unread.status === 'fulfilled') this.unread.set(unread.value.count);
    this.tiles.update((tiles) =>
      tiles.map((tile, i) => {
        const result = counts[i];
        return result.status === 'fulfilled' ? { ...tile, ...result.value } : tile;
      }),
    );
  }
}
