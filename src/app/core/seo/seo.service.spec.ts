import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { SeoService } from './seo.service';

describe('SeoService', () => {
  let seo: SeoService;
  let doc: Document;

  beforeEach(() => {
    seo = TestBed.inject(SeoService);
    doc = TestBed.inject(DOCUMENT);
  });

  afterEach(() => seo.clearPerson());

  it('sets title, description, keywords (deduplicated) and Open Graph', () => {
    seo.set({
      title: 'Nombre | Analista Programador Full Stack',
      description: 'Descripción',
      keywords: ['.NET 8', 'OpenShift', '.NET 8'],
      type: 'profile',
    });
    expect(doc.title).toBe('Nombre | Analista Programador Full Stack');
    expect(doc.querySelector('meta[name="keywords"]')?.getAttribute('content')).toBe('.NET 8, OpenShift');
    expect(doc.querySelector('meta[property="og:type"]')?.getAttribute('content')).toBe('profile');
  });

  it('writes schema.org Person JSON-LD as text (never HTML)', () => {
    seo.setPerson({
      name: 'Persona',
      jobTitle: 'Analista Programador Full Stack',
      description: '<script>alert(1)</script>',
      worksFor: 'Empresa',
      knowsAbout: ['.NET 8'],
    });
    const script = doc.getElementById('structured-data') as HTMLScriptElement;
    expect(script.type).toBe('application/ld+json');
    const data = JSON.parse(script.textContent!);
    expect(data).toEqual(
      jasmine.objectContaining({
        '@type': 'Person',
        jobTitle: 'Analista Programador Full Stack',
        worksFor: { '@type': 'Organization', name: 'Empresa' },
      }),
    );
    expect(script.children.length).toBe(0);
  });

  it('removes the Person data on non-profile pages', () => {
    seo.setPerson({ name: 'Persona', jobTitle: 'Rol', description: 'x' });
    seo.set({ title: 'Proyecto', description: 'x', type: 'article' });
    expect(doc.getElementById('structured-data')).toBeNull();
  });
});
