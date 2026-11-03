import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { SessionStore } from '../auth/session.store';
import { ApiError } from './api-error';
import { apiInterceptor, sessionExpiryInterceptor } from './interceptors';

describe('HTTP interceptors', () => {
  let http: HttpClient;
  let backend: HttpTestingController;
  let router: jasmine.SpyObj<Router>;
  let session: SessionStore;

  beforeEach(() => {
    router = jasmine.createSpyObj<Router>('Router', ['navigate'], { url: '/admin/proyectos' });
    router.navigate.and.resolveTo(true);
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([sessionExpiryInterceptor, apiInterceptor])),
        provideHttpClientTesting(),
        { provide: Router, useValue: router },
      ],
    });
    http = TestBed.inject(HttpClient);
    backend = TestBed.inject(HttpTestingController);
    session = TestBed.inject(SessionStore);
    session.setAuthenticated({ id: '1', name: 'Admin', email: 'a@b.c' });
  });

  afterEach(() => backend.verify());

  it('sends credentials (httpOnly cookie) only to the API', () => {
    http.get('/api/public/portfolio').subscribe();
    http.get('/assets/file.json').subscribe();
    expect(backend.expectOne('/api/public/portfolio').request.withCredentials).toBeTrue();
    expect(backend.expectOne('/assets/file.json').request.withCredentials).toBeFalse();
  });

  it('normalizes API errors into ApiError with field details', async () => {
    const promise = firstValueFrom(http.post('/api/public/contact', {}));
    backend.expectOne('/api/public/contact').flush(
      { error: { statusCode: 400, code: 'VALIDATION_ERROR', message: 'Datos inválidos', details: [{ field: 'email', errors: ['inválido'] }] } },
      { status: 400, statusText: 'Bad Request' },
    );
    const error = await promise.catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).fieldErrors).toEqual({ email: 'inválido' });
  });

  it('reports network failures with a readable message', async () => {
    const promise = firstValueFrom(http.get('/api/public/portfolio'));
    backend.expectOne('/api/public/portfolio').error(new ProgressEvent('error'), { status: 0 });
    const error = (await promise.catch((e: unknown) => e)) as ApiError;
    expect(error.code).toBe('NETWORK_ERROR');
  });

  it('on 401 from an admin endpoint clears the session and redirects to login', async () => {
    const promise = firstValueFrom(http.get('/api/admin/projects'));
    backend.expectOne('/api/admin/projects').flush({ error: { message: 'x' } }, { status: 401, statusText: 'Unauthorized' });
    await promise.catch(() => undefined);
    expect(session.isAuthenticated()).toBeFalse();
    expect(router.navigate).toHaveBeenCalledWith(['/admin/login'], {
      queryParams: { returnUrl: '/admin/proyectos', expired: 1 },
    });
  });

  it('does not redirect for 401 on non-admin endpoints (e.g. a failed login)', async () => {
    const promise = firstValueFrom(http.post('/api/auth/login', {}));
    backend.expectOne('/api/auth/login').flush({ error: { message: 'x' } }, { status: 401, statusText: 'Unauthorized' });
    await promise.catch(() => undefined);
    expect(router.navigate).not.toHaveBeenCalled();
    expect(session.isAuthenticated()).toBeTrue();
  });
});
