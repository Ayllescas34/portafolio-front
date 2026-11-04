import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  InjectionToken,
  NgZone,
  signal,
  viewChild,
} from '@angular/core';
import { MotionService } from '../../core/ui/motion.service';
import type { NetworkScene, NetworkSceneFactory } from './network-scene';

/** The 3D scene is decorative: it starts once the first render has finished. */
export const SCENE_SCHEDULER = new InjectionToken<(start: () => void) => void>('SCENE_SCHEDULER', {
  providedIn: 'root',
  factory: () => (start) => {
    if ('requestIdleCallback' in window) window.requestIdleCallback(start, { timeout: 2000 });
    else setTimeout(start, 200);
  },
});

/** Loads Three.js only when the scene is actually going to render. */
export const NETWORK_SCENE_LOADER = new InjectionToken<() => Promise<NetworkSceneFactory>>('NETWORK_SCENE_LOADER', {
  providedIn: 'root',
  factory: () => () => import('./network-scene').then((m) => m.createNetworkScene),
});

export const WEBGL_SUPPORT = new InjectionToken<() => boolean>('WEBGL_SUPPORT', {
  providedIn: 'root',
  factory: () => () => {
    try {
      const canvas = document.createElement('canvas');
      return !!(window.WebGLRenderingContext && (canvas.getContext('webgl2') ?? canvas.getContext('webgl')));
    } catch {
      return false;
    }
  },
});

/** Small screens get a lighter scene: fewer lines, no antialias, lower pixel ratio. */
export const SCENE_COMPACT = new InjectionToken<() => boolean>('SCENE_COMPACT', {
  providedIn: 'root',
  factory: () => () => window.matchMedia('(max-width: 900px)').matches,
});

/**
 * Decorative full-bleed backdrop for the hero (aria-hidden): every piece of
 * information around it is regular HTML. Falls back to a static SVG when WebGL
 * is unavailable or the context is lost.
 */
@Component({
  selector: 'app-hero-scene',
  template: `
    <div class="scene" #host aria-hidden="true" [attr.data-mode]="mode()">
      @if (mode() === 'fallback') {
        <svg class="fallback" viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice" role="presentation">
          <g fill="none" stroke="#82b6f0" stroke-opacity="0.32">
            <path d="M420 560C620 500 760 620 960 560S1120 500 1200 520" />
            <path d="M380 610C600 550 760 670 960 610S1120 550 1200 570" />
            <path d="M340 660C580 600 760 720 960 660S1120 600 1200 620" />
            <path d="M300 710C560 650 760 770 960 710S1120 650 1200 670" />
          </g>
        </svg>
      }
    </div>
  `,
  styles: `
    :host { display: block; position: absolute; inset: 0; pointer-events: none; }
    .scene { position: absolute; inset: 0; }
    .scene ::ng-deep canvas { width: 100% !important; height: 100% !important; }
    .scene[data-mode='webgl'] { animation: fade 900ms var(--ease) both; }
    .fallback { width: 100%; height: 100%; }
    @keyframes fade { from { opacity: 0; } }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeroSceneComponent {
  private readonly host = viewChild.required<ElementRef<HTMLElement>>('host');
  private readonly motion = inject(MotionService);
  private readonly zone = inject(NgZone);
  private readonly loader = inject(NETWORK_SCENE_LOADER);
  private readonly schedule = inject(SCENE_SCHEDULER);
  private readonly supportsWebGL = inject(WEBGL_SUPPORT);
  private readonly compact = inject(SCENE_COMPACT);
  private readonly destroyRef = inject(DestroyRef);

  readonly mode = signal<'pending' | 'webgl' | 'fallback'>('pending');
  private scene?: NetworkScene;

  constructor() {
    afterNextRender(() => {
      if (this.supportsWebGL()) this.schedule(() => void this.init());
      else this.mode.set('fallback');
    });
    effect(() => this.scene?.setReducedMotion(this.motion.reduced()));
  }

  private async init(): Promise<void> {
    if (this.destroyRef.destroyed) return;
    const element = this.host().nativeElement;
    let factory: NetworkSceneFactory;
    try {
      factory = await this.loader();
    } catch {
      this.mode.set('fallback');
      return;
    }
    if (this.destroyRef.destroyed) return;

    // The animation loop runs outside Angular: no change detection per frame.
    this.zone.runOutsideAngular(() => {
      this.scene = factory(element, {
        reducedMotion: this.motion.reduced(),
        compact: this.compact(),
        onContextLost: () => this.zone.run(() => this.fallback()),
      });

      let inView = false;
      const update = () => this.scene?.setActive(inView && document.visibilityState === 'visible');
      const intersection = new IntersectionObserver(([entry]) => {
        inView = entry.isIntersecting;
        update();
      });
      intersection.observe(element);
      const resize = new ResizeObserver(() => this.scene?.resize());
      resize.observe(element);
      document.addEventListener('visibilitychange', update);

      this.destroyRef.onDestroy(() => {
        intersection.disconnect();
        resize.disconnect();
        document.removeEventListener('visibilitychange', update);
        this.scene?.dispose();
        this.scene = undefined;
      });
    });
    this.mode.set('webgl');
  }

  private fallback(): void {
    this.scene?.dispose();
    this.scene = undefined;
    this.mode.set('fallback');
  }
}
