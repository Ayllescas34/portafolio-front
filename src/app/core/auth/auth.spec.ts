import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, provideRouter, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { safeReturnUrl } from '../../admin/pages/login.page';
import { adminGuard, guestGuard } from './admin.guard';
import { AuthService } from './auth.service';
import { SessionStore } from './session.store';

const admin = { id: '1', name: 'Admin', email: 'admin@test.local' };

describe('AuthService', () => {
  let auth: AuthService;
  let session: SessionStore;
  let backend: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    auth = TestBed.inject(AuthService);
    session = TestBed.inject(SessionStore);
    backend = TestBed.inject(HttpTestingController);
  });

  afterEach(() => backend.verify());

  it('login stores the admin in memory (no token in JavaScript)', async () => {
    const promise = auth.login('admin@test.local', 'secret');
    const req = backend.expectOne('/api/auth/login');
    expect(req.request.body).toEqual({ email: 'admin@test.local', password: 'secret' });
    req.flush({ data: { admin, expiresAt: '2026-01-01T00:00:00Z' } });
    await promise;
    expect(session.admin()).toEqual(admin);
    expect(JSON.stringify(localStorage)).not.toContain('secret');
  });

  it('restore resolves the session once and caches the result', async () => {
    const first = auth.restore();
    backend.expectOne('/api/auth/me').flush({ data: admin });
    expect(await first).toBeTrue();
    expect(await auth.restore()).toBeTrue(); // no second request
  });

  it('restore marks the visitor anonymous on 401', async () => {
    const promise = auth.restore();
    backend.expectOne('/api/auth/me').flush({}, { status: 401, statusText: 'Unauthorized' });
    expect(await promise).toBeFalse();
    expect(session.status()).toBe('anonymous');
  });

  it('logout clears local state even if the server call fails', async () => {
    session.setAuthenticated(admin);
    const promise = auth.logout();
    backend.expectOne('/api/auth/logout').flush({}, { status: 500, statusText: 'Error' });
    await promise.catch(() => undefined);
    expect(session.isAuthenticated()).toBeFalse();
  });
});

describe('admin guards', () => {
  let restore: jasmine.Spy<() => Promise<boolean>>;

  beforeEach(() => {
    restore = jasmine.createSpy('restore');
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: AuthService, useValue: { restore } }],
    });
  });

  const run = (guard: typeof adminGuard, url = '/admin/proyectos') =>
    TestBed.runInInjectionContext(() =>
      guard({} as ActivatedRouteSnapshot, { url } as RouterStateSnapshot),
    ) as Promise<boolean | UrlTree>;

  it('lets an authenticated admin in', async () => {
    restore.and.resolveTo(true);
    expect(await run(adminGuard)).toBeTrue();
  });

  it('redirects anonymous visitors to login keeping the destination', async () => {
    restore.and.resolveTo(false);
    const result = await run(adminGuard);
    expect(TestBed.inject(Router).serializeUrl(result as UrlTree)).toBe('/admin/login?returnUrl=%2Fadmin%2Fproyectos');
  });

  it('keeps an authenticated admin away from the login page', async () => {
    restore.and.resolveTo(true);
    expect(TestBed.inject(Router).serializeUrl((await run(guestGuard)) as UrlTree)).toBe('/admin');
  });
});

describe('safeReturnUrl', () => {
  it('only accepts internal admin paths', () => {
    expect(safeReturnUrl('/admin/proyectos')).toBe('/admin/proyectos');
    expect(safeReturnUrl('/admin')).toBe('/admin');
    expect(safeReturnUrl('https://evil.example')).toBe('/admin');
    expect(safeReturnUrl('//evil.example/admin')).toBe('/admin');
    expect(safeReturnUrl('/cv')).toBe('/admin');
    expect(safeReturnUrl('/admin/login')).toBe('/admin');
    expect(safeReturnUrl(undefined)).toBe('/admin');
  });
});
