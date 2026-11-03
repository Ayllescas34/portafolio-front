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

function readPalette(element: HTMLElement): ScenePalette {
  const styles = getComputedStyle(element);
  const v = (name: string, fallback: string) => styles.getPropertyValue(name).trim() || fallback;
  return {
    node: v('--accent', '#5eead4'),
    edge: v('--accent-2', '#a5b4fc'),
    pulse: v('--accent', '#5eead4'),
    core: v('--accent-2', '#a5b4fc'),
  };
}

/**
 * Decorative 3D network for the hero. Purely visual (aria-hidden); every piece
 * of information around it is regular HTML. Falls back to a static SVG when
 * WebGL is unavailable or the context is lost.
 */
@Component({
  selector: 'app-hero-scene',
  template: `
    <div class="scene" #host aria-hidden="true" [attr.data-mode]="mode()">
      @if (mode() === 'fallback') {
        <svg class="fallback" viewBox="0 0 400 400" role="presentation">
          <g class="edges">
            <path d="M90 140 L200 80 L310 150 L280 270 L170 310 L95 250 Z M200 80 L200 200 L310 150 M200 200 L280 270 M200 200 L170 310 M200 200 L95 250 M200 200 L90 140" />
          </g>
          <g class="nodes">
            @for (n of fallbackNodes; track $index) {
              <circle [attr.cx]="n[0]" [attr.cy]="n[1]" [attr.r]="n[2]" />
            }
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
    .fallback { width: 100%; height: 100%; opacity: 0.8; }
    .edges path { fill: none; stroke: var(--accent-2); stroke-opacity: 0.35; stroke-width: 1.2; }
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

  readonly mode = signal<'pending' | 'webgl' | 'fallback'>('pending');
  protected readonly fallbackNodes = [
    [90, 140, 5], [200, 80, 6], [310, 150, 5], [280, 270, 5], [170, 310, 4], [95, 250, 4], [200, 200, 8],
  ];

  private scene?: NetworkScene;

  constructor() {
    const destroyRef = inject(DestroyRef);

    afterNextRender(() => {
      if (!this.supportsWebGL()) {
        this.mode.set('fallback');
        return;
      }
      void this.init(destroyRef);
    });

    effect(() => this.scene?.setReducedMotion(this.motion.reduced()));
    effect(() => {
      this.theme.theme();
      // Wait for the new CSS variables to apply before reading them.
      requestAnimationFrame(() => this.scene?.setPalette(readPalette(this.host().nativeElement)));
    });
  }

  private async init(destroyRef: DestroyRef): Promise<void> {
    const element = this.host().nativeElement;
    let factory: NetworkSceneFactory;
    try {
      factory = await this.loader();
    } catch {
      this.mode.set('fallback');
      return;
    }
    if (destroyRef.destroyed) return;

    // The animation loop runs outside Angular: no change detection per frame.
    this.zone.runOutsideAngular(() => {
      this.scene = factory(element, {
        reducedMotion: this.motion.reduced(),
        compact: window.matchMedia('(max-width: 720px)').matches,
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

      destroyRef.onDestroy(() => {
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
