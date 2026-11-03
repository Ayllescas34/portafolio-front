import { ErrorHandler, inject, Injectable } from '@angular/core';
import { ApiError } from '../http/api-error';
import { ToastService } from '../ui/toast.service';

/**
 * Last line of defense for unexpected errors: logs them for developers and
 * shows a short, non-technical message instead of failing silently.
 * Handled API errors are shown by the component that made the request.
 */
@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  private readonly toasts = inject(ToastService);

  handleError(error: unknown): void {
    const cause = (error as { rejection?: unknown })?.rejection ?? error;
    if (cause instanceof ApiError) return;
    console.error(cause);
    this.toasts.error('Ocurrió un error inesperado. Si persiste, recarga la página.');
  }
}
