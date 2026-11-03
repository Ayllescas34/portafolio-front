import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { SessionStore } from '../auth/session.store';
import { ApiError } from './api-error';

/**
 * Same-origin API calls carry the httpOnly session cookie. The token is never
 * readable from JavaScript, so this interceptor only opts requests into
 * credentials and normalizes errors.
 */
export const apiInterceptor: HttpInterceptorFn = (req, next) => {
  const isApi = req.url.startsWith('/api/');
  const request = isApi ? req.clone({ withCredentials: true }) : req;
  return next(request).pipe(catchError((error: unknown) => throwError(() => ApiError.from(error))));
};

/**
 * When an admin request answers 401 the session expired or was revoked:
 * clear local state and send the user to the login page, keeping the
 * destination to return after signing in.
 */
export const sessionExpiryInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const session = inject(SessionStore);
  return next(req).pipe(
    catchError((error: unknown) => {
      const status = error instanceof ApiError ? error.status : error instanceof HttpErrorResponse ? error.status : 0;
      if (status === 401 && req.url.startsWith('/api/admin/')) {
        session.clear();
        void router.navigate(['/admin/login'], {
          queryParams: { returnUrl: router.url, expired: 1 },
        });
      }
      return throwError(() => error);
    }),
  );
};
