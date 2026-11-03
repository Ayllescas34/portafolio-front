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
import { ThemeService } from '../../core/ui/theme.service';
import type { NetworkScene, NetworkSceneFactory, ScenePalette } from './network-scene';

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

/** The 3D accent is desktop-only: on phones and small tablets no WebGL context is created. */
export const SCENE_VIEWPORT = new InjectionToken<MediaQueryList | null>('SCENE_VIEWPORT', {
  providedIn: 'root',
  factory: () => (typeof matchMedia === 'function' ? matchMedia('(min-width: 901px)') : null),
});

function readPalette(element: HTMLElement): ScenePalette {
  const styles = getComputedStyle(element);
  const v = (name: string, fallback: string) => styles.getPropertyValue(name).trim() || fallback;
  return {
    node: v('--accent', '#6ea8fe'),
    pulse: v('--accent-2', '#4fb6c2'),
    edge: v('--text-faint', '#8392ab'),
    plane: v('--border-strong', '#31446a'),
  };
}

/**
 * Decorative layered-system diagram for the hero (aria-hidden). Every piece of
 * information around it is regular HTML. Falls back to a static SVG when WebGL
 * is unavailable or the context is lost.
 */
@Component({
  selector: 'app-hero-scene',
  template: `
    <div class="scene" #host aria-hidden="true" [attr.data-mode]="mode()">
      @if (mode() === 'fallback') {
        <svg class="fallback" viewBox="0 0 400 400" role="presentation">
          @for (y of fallbackLayers; track y) {
            <ellipse class="plane" cx="200" [attr.cy]="y" rx="150" ry="34" />
          }
          <g class="links">
            @for (x of fallbackColumns; track x) {
              <line [attr.x1]="x" [attr.y1]="fallbackLayers[0]" [attr.x2]="x" [attr.y2]="fallbackLayers[4]" />
            }
          </g>
          <g class="nodes">
            @for (y of fallbackLayers; track y) {
              @for (x of fallbackColumns; track x) {
                <circle [attr.cx]="x" [attr.cy]="y" r="4" />
              }
            }
          </g>
        </svg>
      }
    </div>
  `,
  styles: `
    :host { display: block; position: absolute; inset: 0 0 2.5rem; pointer-events: none; }
    .scene { position: absolute; inset: 0; }
    .scene ::ng-deep canvas { width: 100% !important; height: 100% !important; }
    .scene[data-mode='webgl'] { animation: fade 700ms var(--ease) both; }
    .fallback { width: 100%; height: 100%; }
    .plane { fill: none; stroke: var(--border-strong); stroke-width: 1; }
    .links line { stroke: var(--text-faint); stroke-opacity: 0.45; stroke-width: 1; }
    .nodes circle { fill: var(--accent); }
    @keyframes fade { from { opacity: 0; } }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeroSceneComponent {
  private readonly host = viewChild.required<ElementRef<HTMLElement>>('host');
  private readonly motion = inject(MotionService);
  private readonly theme = inject(ThemeService);
  private readonly zone = inject(NgZone);
  private readonly loader = inject(NETWORK_SCENE_LOADER);
  private readonly supportsWebGL = inject(WEBGL_SUPPORT);
  private readonly viewport = inject(SCENE_VIEWPORT);
  private readonly destroyRef = inject(DestroyRef);

  readonly mode = signal<'pending' | 'webgl' | 'fallback' | 'off'>('pending');
  protected readonly fallbackLayers = [90, 145, 200, 255, 310];
  protected readonly fallbackColumns = [110, 160, 200, 240, 290];

  private scene?: NetworkScene;
  private starting = false;

  constructor() {
    afterNextRender(() => {
      if (!this.supportsWebGL()) {
        this.mode.set('fallback');
        return;
      }
      if (this.viewport && !this.viewport.matches) {
        this.mode.set('off');
        // Start later if the window grows to desktop size.
        const onChange = (e: MediaQueryListEvent) => e.matches && void this.init();
        this.viewport.addEventListener('change', onChange);
        this.destroyRef.onDestroy(() => this.viewport?.removeEventListener('change', onChange));
        return;
      }
      void this.init();
    });

    effect(() => this.scene?.setReducedMotion(this.motion.reduced()));
    effect(() => {
      this.theme.theme();
      // Wait for the new CSS variables to apply before reading them.
      requestAnimationFrame(() => this.scene?.setPalette(readPalette(this.host().nativeElement)));
    });
  }

  private async init(): Promise<void> {
    if (this.scene || this.starting) return;
    this.starting = true;
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
        compact: window.matchMedia('(max-width: 1200px)').matches,
        palette: readPalette(element),
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
