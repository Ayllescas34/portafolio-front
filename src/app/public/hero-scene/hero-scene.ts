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

/** Small screens get a lighter scene: fewer blocks, no antialias, lower pixel ratio. */
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
          <defs>
            <radialGradient id="scene-glow">
              <stop offset="0" stop-color="#ff9142" stop-opacity="0.35" />
              <stop offset="1" stop-color="#ff9142" stop-opacity="0" />
            </radialGradient>
          </defs>
          <circle cx="760" cy="210" r="260" fill="url(#scene-glow)" />
          <g class="cube">
            <path class="top" d="M600 190 760 270 600 350 440 270Z" />
            <path class="left" d="M440 270 600 350V530L440 450Z" />
            <path class="right" d="M760 270 600 350V530L760 450Z" />
          </g>
          <circle cx="760" cy="210" r="22" fill="#ffdcae" />
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
    .top { fill: #4a3a33; }
    .left { fill: #1d2b3d; }
    .right { fill: #2a2233; }
    @keyframes fade { from { opacity: 0; } }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeroSceneComponent {
  private readonly host = viewChild.required<ElementRef<HTMLElement>>('host');
  private readonly motion = inject(MotionService);
  private readonly zone = inject(NgZone);
  private readonly loader = inject(NETWORK_SCENE_LOADER);
  private readonly supportsWebGL = inject(WEBGL_SUPPORT);
  private readonly compact = inject(SCENE_COMPACT);
  private readonly destroyRef = inject(DestroyRef);

  readonly mode = signal<'pending' | 'webgl' | 'fallback'>('pending');
  private scene?: NetworkScene;

  constructor() {
    afterNextRender(() => {
      if (this.supportsWebGL()) void this.init();
      else this.mode.set('fallback');
    });
    effect(() => this.scene?.setReducedMotion(this.motion.reduced()));
  }

  private async init(): Promise<void> {
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
