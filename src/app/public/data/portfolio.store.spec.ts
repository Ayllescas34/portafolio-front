import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { apiInterceptor } from '../../core/http/interceptors';
import { portfolioFixture } from '../../testing/fixtures';
import { PortfolioStore } from './portfolio.store';

describe('PortfolioStore', () => {
  let store: PortfolioStore;
  let backend: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(withInterceptors([apiInterceptor])), provideHttpClientTesting()],
    });
    store = TestBed.inject(PortfolioStore);
    backend = TestBed.inject(HttpTestingController);
  });

  afterEach(() => backend.verify());

  it('goes through loading -> ready and derives recruiter facts', async () => {
    const promise = store.load();
    expect(store.state()).toBe('loading');
    backend.expectOne('/api/public/portfolio').flush({ data: portfolioFixture() });
    await promise;
    expect(store.state()).toBe('ready');
    expect(store.currentExperience()?.company).toBe('Empresa Actual');
    expect(store.featuredSkills().map((s) => s.name)).toEqual(['NestJS']);
    expect(store.careerStart()).toBe('2024-08-01T00:00:00.000Z');
    expect(store.featuredProject()?.slug).toBe('destacado');
  });

  it('shares a single request between concurrent callers', async () => {
    const a = store.load();
    const b = store.load();
    backend.expectOne('/api/public/portfolio').flush({ data: portfolioFixture() });
    await Promise.all([a, b]);
    expect(store.state()).toBe('ready');
  });

  it('exposes an error state with a readable message', async () => {
    const promise = store.load();
    backend.expectOne('/api/public/portfolio').flush({}, { status: 500, statusText: 'Error' });
    await promise;
    expect(store.state()).toBe('error');
    expect(store.error()?.message).toContain('error');
  });

  it('passes project filters as query parameters', async () => {
    const promise = store.projects({ technology: 'angular', category: 'WEB_APP' });
    const req = backend.expectOne((r) => r.url === '/api/public/projects');
    expect(req.request.params.get('technology')).toBe('angular');
    expect(req.request.params.get('category')).toBe('WEB_APP');
    req.flush({ data: [] });
    expect(await promise).toEqual([]);
  });
});
