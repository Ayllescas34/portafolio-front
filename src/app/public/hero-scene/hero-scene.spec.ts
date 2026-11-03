import { TestBed } from '@angular/core/testing';
import { MotionService } from '../../core/ui/motion.service';
import { HeroSceneComponent, NETWORK_SCENE_LOADER, SCENE_VIEWPORT, WEBGL_SUPPORT } from './hero-scene';
import type { NetworkScene, SceneOptions } from './network-scene';

describe('HeroSceneComponent', () => {
  let scene: jasmine.SpyObj<NetworkScene>;
  let factory: jasmine.Spy<(el: HTMLElement, options: SceneOptions) => NetworkScene>;

  function create(options: { webgl: boolean; reduced: boolean; desktop?: boolean }) {
    scene = jasmine.createSpyObj<NetworkScene>('scene', ['setActive', 'setReducedMotion', 'setPalette', 'resize', 'dispose']);
    factory = jasmine.createSpy('factory').and.returnValue(scene);
    const viewport = {
      matches: options.desktop ?? true,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    } as unknown as MediaQueryList;
    TestBed.configureTestingModule({
      providers: [
        { provide: WEBGL_SUPPORT, useValue: () => options.webgl },
        { provide: NETWORK_SCENE_LOADER, useValue: () => Promise.resolve(factory) },
        { provide: SCENE_VIEWPORT, useValue: viewport },
      ],
    });
    TestBed.inject(MotionService).reduced.set(options.reduced);
    const fixture = TestBed.createComponent(HeroSceneComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('renders the static SVG fallback when WebGL is unavailable', async () => {
    const fixture = create({ webgl: false, reduced: false });
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.componentInstance.mode()).toBe('fallback');
    expect(fixture.nativeElement.querySelector('svg.fallback')).not.toBeNull();
    expect(factory).not.toHaveBeenCalled();
  });

  it('starts the 3D scene with reduced motion when the user prefers it', async () => {
    const fixture = create({ webgl: true, reduced: true });
    await fixture.whenStable();
    expect(fixture.componentInstance.mode()).toBe('webgl');
    expect(factory).toHaveBeenCalled();
    expect(factory.calls.mostRecent().args[1].reducedMotion).toBeTrue();
  });

  it('does not create a WebGL context on small screens', async () => {
    const fixture = create({ webgl: true, reduced: false, desktop: false });
    await fixture.whenStable();
    expect(fixture.componentInstance.mode()).toBe('off');
    expect(factory).not.toHaveBeenCalled();
  });

  it('is decorative for assistive technology', async () => {
    const fixture = create({ webgl: false, reduced: false });
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('.scene').getAttribute('aria-hidden')).toBe('true');
  });

  it('disposes WebGL resources when destroyed', async () => {
    const fixture = create({ webgl: true, reduced: false });
    await fixture.whenStable();
    fixture.destroy();
    expect(scene.dispose).toHaveBeenCalled();
  });
});
