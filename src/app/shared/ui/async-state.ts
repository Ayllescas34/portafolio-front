import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { IconComponent } from './icon';

/** Shared loading / error / empty presentation with an accessible status. */
@Component({
  selector: 'app-async-state',
  imports: [IconComponent],
  template: `
    @switch (state()) {
      @case ('loading') {
        <div class="state" role="status" aria-live="polite">
          <span class="spinner" aria-hidden="true"></span>
          <span>{{ loadingText() }}</span>
        </div>
      }
      @case ('error') {
        <div class="state state-error" role="alert">
          <app-icon name="alert" />
          <span>{{ errorText() }}</span>
          @if (retryText()) {
            <button type="button" class="btn btn-sm" (click)="retry.emit()">{{ retryText() }}</button>
          }
        </div>
      }
      @case ('empty') {
        <p class="state state-empty">{{ emptyText() }}</p>
      }
    }
  `,
  styles: `
    .state {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: center;
      gap: 0.75rem;
      padding: 2.5rem 1rem;
      color: var(--text-muted);
      text-align: center;
    }
    .state-error { color: var(--danger); }
    .state-empty { margin: 0; border: 1px dashed var(--border); border-radius: var(--radius); }
    .spinner {
      width: 18px;
      height: 18px;
      border: 2px solid var(--border-strong);
      border-top-color: var(--accent);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AsyncStateComponent {
  readonly state = input.required<'loading' | 'error' | 'empty' | 'ready' | 'idle'>();
  readonly loadingText = input('Cargando…');
  readonly errorText = input('No se pudo cargar la información.');
  readonly emptyText = input('No hay elementos.');
  readonly retryText = input<string | null>('Reintentar');
  readonly retry = output<void>();
}
