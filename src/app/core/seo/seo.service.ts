import { DOCUMENT } from '@angular/common';
import { inject, Injectable } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';

export interface PageMeta {
  title: string;
  description: string;
  /** Absolute or root-relative image for Open Graph. */
  image?: string | null;
  type?: 'website' | 'profile' | 'article';
  noIndex?: boolean;
}

/** Title, description, canonical and Open Graph tags per route. */
@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly document = inject(DOCUMENT);

  set(page: PageMeta): void {
    const url = this.document.location?.href.split('#')[0] ?? '';
    this.title.setTitle(page.title);
    this.tag('name', 'description', page.description);
    this.tag('name', 'robots', page.noIndex ? 'noindex, nofollow' : 'index, follow');
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
    this.canonical(url);
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
