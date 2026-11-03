import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { apiInterceptor } from '../../../core/http/interceptors';
import { portfolioFixture, projectFixture } from '../../../testing/fixtures';
import { PortfolioStore } from '../../data/portfolio.store';
import { ContactSectionComponent } from './contact-section';
import { ProjectsSectionComponent } from './projects-section';

function setup() {
  TestBed.configureTestingModule({
    providers: [provideRouter([]), provideHttpClient(withInterceptors([apiInterceptor])), provideHttpClientTesting()],
  });
  TestBed.inject(PortfolioStore).portfolio.set(portfolioFixture());
  return TestBed.inject(HttpTestingController);
}

describe('ContactSectionComponent', () => {
  let fixture: ComponentFixture<ContactSectionComponent>;
  let backend: HttpTestingController;
  let el: HTMLElement;

  beforeEach(() => {
    backend = setup();
    fixture = TestBed.createComponent(ContactSectionComponent);
    fixture.detectChanges();
    el = fixture.nativeElement;
  });

  afterEach(() => backend.verify());

  function fill(values: Partial<Record<'name' | 'email' | 'subject' | 'message', string>>) {
    for (const [key, value] of Object.entries(values)) {
      const input = el.querySelector<HTMLInputElement>(`#contact-${key}`)!;
      input.value = value;
      input.dispatchEvent(new Event('input'));
      input.dispatchEvent(new Event('blur'));
    }
    fixture.detectChanges();
  }

  it('shows field errors and sends nothing when the form is invalid', async () => {
    fill({ name: 'A', email: 'no-es-correo' });
    await fixture.componentInstance.submit();
    fixture.detectChanges();
    expect(el.querySelector('#contact-name-error')?.textContent).toContain('al menos 2');
    expect(el.querySelector('#contact-email-error')?.textContent).toContain('correo válido');
    expect(el.querySelector('#contact-email')?.getAttribute('aria-invalid')).toBe('true');
    backend.expectNone('/api/public/contact');
  });

  it('submits a valid message (with empty honeypot) and confirms it', async () => {
    fill({ name: 'Ana López', email: 'ana@example.com', subject: 'Oportunidad', message: 'Me gustaría conversar contigo.' });
    const promise = fixture.componentInstance.submit();
    const req = backend.expectOne('/api/public/contact');
    expect(req.request.body).toEqual({
      name: 'Ana López',
      email: 'ana@example.com',
      subject: 'Oportunidad',
      message: 'Me gustaría conversar contigo.',
      website: '',
    });
    req.flush({ data: { received: true } }, { status: 202, statusText: 'Accepted' });
    await promise;
    fixture.detectChanges();
    expect(el.querySelector('[role="status"]')?.textContent).toContain('Tu mensaje fue recibido');
  });

  it('shows the server error and maps field messages', async () => {
    fill({ name: 'Ana López', email: 'ana@example.com', subject: 'Oportunidad', message: 'Me gustaría conversar contigo.' });
    const promise = fixture.componentInstance.submit();
    backend.expectOne('/api/public/contact').flush(
      { error: { statusCode: 429, code: 'TOO_MANY_REQUESTS', message: 'Demasiadas solicitudes.' } },
      { status: 429, statusText: 'Too Many Requests' },
    );
    await promise;
    fixture.detectChanges();
    expect(el.querySelector('[role="alert"]')?.textContent).toContain('Demasiadas solicitudes.');
    expect(fixture.componentInstance.status()).toBe('error');
  });

  it('keeps the honeypot out of the accessibility tree and tab order', () => {
    const honeypot = el.querySelector<HTMLInputElement>('#contact-website')!;
    expect(honeypot.tabIndex).toBe(-1);
    expect(honeypot.closest('[aria-hidden="true"]')).not.toBeNull();
  });
});

describe('ProjectsSectionComponent', () => {
  let fixture: ComponentFixture<ProjectsSectionComponent>;
  let backend: HttpTestingController;

  beforeEach(() => {
    backend = setup();
    fixture = TestBed.createComponent(ProjectsSectionComponent);
    fixture.detectChanges();
  });

  afterEach(() => backend.verify());

  it('shows the featured project apart from the grid', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.featured')?.textContent).toContain('Destacado');
    const gridTitles = [...el.querySelectorAll('.grid h3')].map((h) => h.textContent?.trim());
    expect(gridTitles).toEqual(['Otro']);
  });

  it('filters through the API and announces the result count', async () => {
    const button = [...fixture.nativeElement.querySelectorAll('button.filter')].find((b: Element) =>
      b.textContent?.includes('Angular'),
    ) as HTMLButtonElement;
    button.click();
    const req = backend.expectOne((r) => r.url === '/api/public/projects');
    expect(req.request.params.get('technology')).toBe('angular');
    req.flush({ data: [projectFixture({ id: 'x', slug: 'filtrado', title: 'Filtrado' })] });
    await fixture.whenStable();
    fixture.detectChanges();
    expect(button.getAttribute('aria-pressed')).toBe('true');
    expect(fixture.nativeElement.querySelector('.results').textContent).toContain('1 proyecto');
    expect(fixture.nativeElement.querySelector('.grid').textContent).toContain('Filtrado');
  });

  it('shows an error state with retry when filtering fails', async () => {
    void fixture.componentInstance.setTechnology('angular');
    backend.expectOne((r) => r.url === '/api/public/projects').flush({}, { status: 500, statusText: 'Error' });
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.componentInstance.state()).toBe('error');
    expect(fixture.nativeElement.querySelector('[role="alert"]')).not.toBeNull();
  });
});
