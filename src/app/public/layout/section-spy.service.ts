import { Injectable, signal } from '@angular/core';

export const SECTIONS = ['inicio', 'perfil', 'experiencia', 'capacidades', 'proyectos', 'formacion', 'contacto'] as const;
export type SectionId = (typeof SECTIONS)[number];

/** Tracks which home section is on screen to highlight it in the navigation. */
@Injectable({ providedIn: 'root' })
export class SectionSpyService {
  readonly active = signal<SectionId | null>(null);
  private observer?: IntersectionObserver;

  observe(root: ParentNode): void {
    this.disconnect();
    if (typeof IntersectionObserver === 'undefined') return;
    const visible = new Map<string, number>();
    this.observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) visible.set(entry.target.id, entry.isIntersecting ? entry.intersectionRatio : 0);
        const [top] = [...visible.entries()].filter(([, r]) => r > 0).sort((a, b) => b[1] - a[1]);
        if (top) this.active.set(top[0] as SectionId);
      },
      { rootMargin: '-35% 0px -55% 0px', threshold: [0, 0.01, 0.25, 0.5, 1] },
    );
    SECTIONS.forEach((id) => {
      const el = root.querySelector(`#${id}`);
      if (el) this.observer!.observe(el);
    });
  }

  disconnect(): void {
    this.observer?.disconnect();
    this.active.set(null);
  }
}
