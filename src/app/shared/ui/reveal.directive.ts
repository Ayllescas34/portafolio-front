import { afterNextRender, DestroyRef, Directive, ElementRef, inject } from '@angular/core';
import { MotionService } from '../../core/ui/motion.service';

/**
 * Fades an element in the first time it enters the viewport. With reduced
 * motion (or without IntersectionObserver) content is shown immediately.
 */
@Directive({ selector: '[appReveal]', host: { class: 'reveal' } })
export class RevealDirective {
  constructor() {
    const element = inject(ElementRef<HTMLElement>).nativeElement as HTMLElement;
    const motion = inject(MotionService);
    const destroyRef = inject(DestroyRef);

    afterNextRender(() => {
      if (motion.reduced() || typeof IntersectionObserver === 'undefined') {
        element.classList.add('is-visible');
        return;
      }
      const observer = new IntersectionObserver(
        (entries) => {
          if (entries.some((e) => e.isIntersecting)) {
            element.classList.add('is-visible');
            observer.disconnect();
          }
        },
        { rootMargin: '0px 0px -8% 0px', threshold: 0.05 },
      );
      observer.observe(element);
      destroyRef.onDestroy(() => observer.disconnect());
    });
  }
}
