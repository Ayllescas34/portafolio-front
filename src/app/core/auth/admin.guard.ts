import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

/** Protects /admin/**: unauthenticated visitors go to the login page. */
export const adminGuard: CanActivateFn = async (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (await auth.restore()) return true;
  return router.createUrlTree(['/admin/login'], { queryParams: { returnUrl: state.url } });
};

/** Keeps an authenticated admin away from the login form. */
export const guestGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return (await auth.restore()) ? router.createUrlTree(['/admin']) : true;
};
