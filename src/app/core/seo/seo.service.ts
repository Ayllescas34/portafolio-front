import { DOCUMENT } from '@angular/common';
import { inject, Injectable } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';

export interface PageMeta {
  title: string;
  description: string;
  /** Absolute or root-relative image for Open Graph. */
  image?: string | null;
  type?: 'website' | 'profile' | 'article';
  keywords?: string[];
  noIndex?: boolean;
}

/** schema.org Person, built only from published profile data. */
export interface PersonData {
  name: string;
  jobTitle: string;
  description: string;
  email?: string | null;
  location?: string | null;
  worksFor?: string | null;
  sameAs?: string[];
  knowsAbout?: string[];
  image?: string | null;
}

const STRUCTURED_DATA_ID = 'structured-data';

/** Title, description, canonical, Open Graph and JSON-LD per route. */
@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly document = inject(DOCUMENT);

  set(page: PageMeta): void {
    const url = this.document.location?.href.split('#')[0].split('?')[0] ?? '';
    this.title.setTitle(page.title);
    this.tag('name', 'description', page.description);
    this.tag('name', 'robots', page.noIndex ? 'noindex, nofollow' : 'index, follow');
    if (page.keywords?.length) this.tag('name', 'keywords', [...new Set(page.keywords)].join(', '));
    else this.meta.removeTag('name="keywords"');
    this.tag('property', 'og:title', page.title);
    this.tag('property', 'og:description', page.description);
    this.tag('property', 'og:type', page.type ?? 'website');
    this.tag('property', 'og:url', url);
    this.tag('property', 'og:locale', 'es_GT');
    this.tag('name', 'twitter:card', page.image ? 'summary_large_image' : 'summary');
    if (page.image) {
      const image = page.image.startsWith('http') ? page.image : new URL(page.image, url).href;
      this.tag('property', 'og:image', image);
    } else {
      this.meta.removeTag('property="og:image"');
    }
    if (page.type !== 'profile') this.clearPerson();
    this.canonical(url);
  }

  /** Writes a JSON-LD Person block (textContent, never innerHTML). */
  setPerson(person: PersonData): void {
    const data = {
      '@context': 'https://schema.org',
      '@type': 'Person',
      name: person.name,
      jobTitle: person.jobTitle,
      description: person.description,
      ...(person.email && { email: `mailto:${person.email}` }),
      ...(person.location && { address: { '@type': 'PostalAddress', addressLocality: person.location } }),
      ...(person.worksFor && { worksFor: { '@type': 'Organization', name: person.worksFor } }),
      ...(person.sameAs?.length && { sameAs: person.sameAs }),
      ...(person.knowsAbout?.length && { knowsAbout: person.knowsAbout }),
      ...(person.image && { image: person.image }),
    };
    let script = this.document.getElementById(STRUCTURED_DATA_ID) as HTMLScriptElement | null;
    if (!script) {
      script = this.document.createElement('script');
      script.type = 'application/ld+json';
      script.id = STRUCTURED_DATA_ID;
      this.document.head.appendChild(script);
    }
    script.textContent = JSON.stringify(data);
  }

  clearPerson(): void {
    this.document.getElementById(STRUCTURED_DATA_ID)?.remove();
  }

  private tag(attr: 'name' | 'property', key: string, content: string): void {
    this.meta.updateTag({ [attr]: key, content }, `${attr}="${key}"`);
  }

  private canonical(url: string): void {
    let link = this.document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!link) {
      link = this.document.createElement('link');
      link.rel = 'canonical';
      this.document.head.appendChild(link);
    }
    link.href = url;
  }
}
