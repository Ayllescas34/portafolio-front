import { HttpErrorResponse } from '@angular/common/http';
import type { ApiErrorBody, ApiErrorDetail } from '../models/api.models';

/** Normalized error used by every component (never a raw HttpErrorResponse). */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly code: string,
    readonly details: ApiErrorDetail[] = [],
  ) {
    super(message);
    this.name = 'ApiError';
  }

  /** Field -> first message, ready to show next to form controls. */
  get fieldErrors(): Record<string, string> {
    return Object.fromEntries(this.details.map((d) => [d.field, d.errors[0] ?? '']));
  }

  static from(error: unknown): ApiError {
    if (error instanceof ApiError) return error;
    if (error instanceof HttpErrorResponse) {
      if (error.status === 0) {
        return new ApiError(0, 'No hay conexión con el servidor. Verifica que la API esté en ejecución.', 'NETWORK_ERROR');
      }
      const body = error.error as Partial<ApiErrorBody> | null;
      if (body?.error) {
        return new ApiError(error.status, body.error.message, body.error.code, body.error.details ?? []);
      }
      return new ApiError(error.status, 'Ocurrió un error inesperado. Intenta de nuevo.', 'HTTP_ERROR');
    }
    return new ApiError(-1, 'Ocurrió un error inesperado. Intenta de nuevo.', 'UNKNOWN');
  }
}
