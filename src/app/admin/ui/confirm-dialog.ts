import { ChangeDetectionStrategy, Component, effect, ElementRef, inject, Injectable, signal, viewChild } from '@angular/core';
import { IconComponent } from '../../shared/ui/icon';

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  danger?: boolean;
}

interface PendingConfirm extends ConfirmOptions {
  resolve: (value: boolean) => void;
}

/** `await confirm.ask({...})` resolves true only when the user confirms. */
@Injectable({ providedIn: 'root' })
export class ConfirmService {
  readonly pending = signal<PendingConfirm | null>(null);

  ask(options: ConfirmOptions): Promise<boolean> {
    this.pending()?.resolve(false);
    return new Promise((resolve) => this.pending.set({ ...options, resolve }));
  }

  settle(value: boolean): void {
    this.pending()?.resolve(value);
    this.pending.set(null);
  }
}

/** Native <dialog>: modal, focus-trapped and closable with Escape. */
@Component({
  selector: 'app-confirm-dialog',
  imports: [IconComponent],
  template: `
    <dialog #dialog class="dialog" aria-labelledby="confirm-title" aria-describedby="confirm-message" (close)="onClose()">
      @if (service.pending(); as p) {
        <form method="dialog">
          <div class="head">
            <app-icon [name]="p.danger ? 'alert' : 'check'" [class.danger]="p.danger" />
            <h2 id="confirm-title">{{ p.title }}</h2>
          </div>
          <p id="confirm-message">{{ p.message }}</p>
          <div class="actions">
            <!-- First focusable element: <dialog> focuses it, so the safe action is the default. -->
            <button type="submit" value="cancel" class="btn">Cancelar</button>
            <button type="submit" value="confirm" class="btn" [class.btn-danger]="p.danger" [class.btn-primary]="!p.danger">
              {{ p.confirmText ?? 'Confirmar' }}
            </button>
          </div>
        </form>
      }
    </dialog>
  `,
  styles: `
    .dialog { width: min(440px, calc(100vw - 2rem)); padding: 1.5rem; border: 1px solid var(--border-strong); border-radius: var(--radius-lg); background: var(--surface); color: var(--text); box-shadow: var(--shadow); }
    .dialog::backdrop { background: rgb(5 8 14 / 0.6); backdrop-filter: blur(2px); }
    .head { display: flex; align-items: center; gap: 0.6rem; margin-bottom: 0.5rem; }
    h2 { margin: 0; font-size: 1.15rem; }
    .danger { color: var(--danger); }
    p { color: var(--text-muted); }
    .actions { display: flex; justify-content: flex-end; gap: 0.6rem; margin-top: 1.25rem; }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfirmDialogComponent {
  protected readonly service = inject(ConfirmService);
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  constructor() {
    effect(() => {
      const dialog = this.dialog().nativeElement;
      if (this.service.pending() && !dialog.open) dialog.showModal();
    });
  }

  protected onClose(): void {
    this.service.settle(this.dialog().nativeElement.returnValue === 'confirm');
    this.dialog().nativeElement.returnValue = '';
  }
}
