import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ToastService } from '../../core/ui/toast.service';
import { IconComponent } from './icon';

@Component({
  selector: 'app-toasts',
  imports: [IconComponent],
  template: `
    <div class="toasts" aria-live="polite" aria-atomic="false">
      @for (toast of toasts.toasts(); track toast.id) {
        <div class="toast" [class]="'toast toast-' + toast.kind" [attr.role]="toast.kind === 'error' ? 'alert' : 'status'">
          <app-icon [name]="toast.kind === 'error' ? 'alert' : 'check'" />
          <span>{{ toast.message }}</span>
          <button type="button" class="btn btn-ghost btn-sm btn-icon" (click)="toasts.dismiss(toast.id)" aria-label="Cerrar aviso">
            <app-icon name="close" [size]="16" />
          </button>
        </div>
      }
    </div>
  `,
  styles: `
    .toasts {
      position: fixed;
      right: 1rem;
      bottom: 1rem;
      z-index: 80;
      display: grid;
      gap: 0.5rem;
      width: min(380px, calc(100vw - 2rem));
    }
    .toast {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      padding: 0.5rem 0.5rem 0.5rem 0.9rem;
      border: 1px solid var(--border-strong);
      border-radius: var(--radius);
      background: var(--surface-2);
      box-shadow: var(--shadow);
      font-size: 0.92rem;
      animation: enter 220ms var(--ease);
    }
    .toast span { flex: 1; }
    .toast-success app-icon { color: var(--success); }
    .toast-error { border-color: var(--danger); }
    .toast-error app-icon:first-child { color: var(--danger); }
    @keyframes enter { from { opacity: 0; transform: translateY(8px); } }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ToastsComponent {
  protected readonly toasts = inject(ToastService);
}
