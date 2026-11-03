import { Injectable, signal } from '@angular/core';

export const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

/** Exposes prefers-reduced-motion as a live signal. */
@Injectable({ providedIn: 'root' })
export class MotionService {
  readonly reduced = signal(false);

  constructor() {
    if (typeof matchMedia !== 'function') return;
    const query = matchMedia(REDUCED_MOTION_QUERY);
    this.reduced.set(query.matches);
    query.addEventListener('change', (e) => this.reduced.set(e.matches));
  }
}
