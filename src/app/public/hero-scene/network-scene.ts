import {
  AdditiveBlending,
  AmbientLight,
  BoxGeometry,
  BufferGeometry,
  CanvasTexture,
  CylinderGeometry,
  DirectionalLight,
  Group,
  Material,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PerspectiveCamera,
  PointLight,
  Scene,
  SphereGeometry,
  Sprite,
  SpriteMaterial,
  WebGLRenderer,
} from 'three';

export interface SceneOptions {
  reducedMotion: boolean;
  compact: boolean;
  onContextLost?: () => void;
}

export interface NetworkScene {
  setActive(active: boolean): void;
  setReducedMotion(reduced: boolean): void;
  resize(): void;
  dispose(): void;
}

export type NetworkSceneFactory = (container: HTMLElement, options: SceneOptions) => NetworkScene;

/** The scene always sits on the dark hero, so its palette does not follow the theme. */
const COLORS = {
  block: 0x1d2b3d,
  blockAlt: 0x2a2233,
  ambient: 0x3a5674,
  key: 0x66d9ed,
  warm: 0xff9142,
  core: 0xffdcae,
};

interface BlockSpec {
  shape: 'box' | 'cylinder';
  position: [number, number, number];
  size: number;
  rotation: [number, number, number];
  material: 'block' | 'blockAlt';
}

/** One block per layer of a solution: interface, services, data, tests, deployment. */
const BLOCKS: BlockSpec[] = [
  { shape: 'box', position: [0.3, 0.2, 0], size: 2.3, rotation: [0.55, 0.75, 0.1], material: 'block' },
  { shape: 'box', position: [-2.6, 1.5, -1.2], size: 1.7, rotation: [0.3, 0.5, 0.35], material: 'blockAlt' },
  { shape: 'box', position: [2.9, -1.3, -0.8], size: 1.5, rotation: [0.7, 0.3, -0.3], material: 'block' },
  { shape: 'cylinder', position: [-1.9, -1.7, 0.2], size: 0.8, rotation: [1.1, 0.2, 0.5], material: 'blockAlt' },
  { shape: 'cylinder', position: [2.5, 1.7, -1.6], size: 0.6, rotation: [0.4, 0.6, 1.2], material: 'block' },
];

function haloTexture(): CanvasTexture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, 'rgba(255,190,130,0.9)');
  gradient.addColorStop(0.3, 'rgba(255,145,66,0.28)');
  gradient.addColorStop(1, 'rgba(255,145,66,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  return new CanvasTexture(canvas);
}

/**
 * Floating system blocks lit by a slow orbiting warm light. Motion stays
 * restrained: a small drift per block and one orbit of the light every ~40 s.
 */
export const createNetworkScene: NetworkSceneFactory = (container, options) => {
  const scene = new Scene();
  const camera = new PerspectiveCamera(38, 1, 0.1, 50);
  camera.position.set(0, 0, 9.5);

  const renderer = new WebGLRenderer({ antialias: !options.compact, alpha: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, options.compact ? 1.25 : 1.75));
  renderer.setClearColor(0x000000, 0);
  renderer.domElement.setAttribute('aria-hidden', 'true');
  container.appendChild(renderer.domElement);

  const group = new Group();
  scene.add(group);

  const materials: Material[] = [];
  const geometries: BufferGeometry[] = [];
  const shared = {
    block: new MeshStandardMaterial({ color: COLORS.block, metalness: 0.35, roughness: 0.55 }),
    blockAlt: new MeshStandardMaterial({ color: COLORS.blockAlt, metalness: 0.3, roughness: 0.6 }),
  };
  materials.push(shared.block, shared.blockAlt);

  const specs = options.compact ? BLOCKS.slice(0, 3) : BLOCKS;
  const blocks = specs.map((spec, i) => {
    const geometry =
      spec.shape === 'box'
        ? new BoxGeometry(spec.size, spec.size, spec.size)
        : new CylinderGeometry(spec.size, spec.size, spec.size * 2.2, 32);
    geometries.push(geometry);
    const mesh = new Mesh(geometry, shared[spec.material]);
    mesh.position.set(...spec.position);
    mesh.rotation.set(...spec.rotation);
    group.add(mesh);
    return { mesh, baseY: spec.position[1], phase: i * 1.3, spin: i % 2 === 0 ? 1 : -1 };
  });

  scene.add(new AmbientLight(COLORS.ambient, 1.1));
  const key = new DirectionalLight(COLORS.key, 0.7);
  key.position.set(-5, 3, 4);
  scene.add(key);

  // The warm orbiting light: a real light plus a small visible core and halo.
  const warm = new PointLight(COLORS.warm, 70, 16, 2);
  scene.add(warm);
  const coreGeometry = new SphereGeometry(0.22, 32, 32);
  const coreMaterial = new MeshBasicMaterial({ color: COLORS.core });
  const core = new Mesh(coreGeometry, coreMaterial);
  const haloMap = haloTexture();
  const haloMaterial = new SpriteMaterial({ map: haloMap, blending: AdditiveBlending, depthWrite: false, transparent: true });
  const halo = new Sprite(haloMaterial);
  halo.scale.set(2.2, 2.2, 1);
  core.add(halo);
  // On small screens only the light remains: the visible sphere would cross the copy.
  core.visible = !options.compact;
  scene.add(core);
  geometries.push(coreGeometry);
  materials.push(coreMaterial, haloMaterial);

  // ── State & loop ─────────────────────────────────────────────────────────
  let reduced = options.reducedMotion;
  let active = false;
  let frame = 0;
  let last = 0;
  let elapsed = 0;
  let orbit = 0.9;
  const pointer = { x: 0, y: 0 };
  const tilt = { x: 0, y: 0 };

  const placeLight = () => {
    // Height follows depth so the light keeps the same screen height through the
    // orbit: always in the free band between the menu and the name.
    const x = Math.cos(orbit) * 4.2;
    const z = Math.sin(orbit) * 1.6 + 0.4;
    const y = (camera.position.z - z) * 0.25;
    warm.position.set(x, y, z);
    core.position.set(x, y, z);
  };

  const render = () => renderer.render(scene, camera);

  const tick = (time: number) => {
    // Clamp so a long pause (tab switch) never produces a jump.
    const dt = last ? Math.min((time - last) / 1000, 0.05) : 0;
    last = time;
    elapsed += dt;
    orbit += dt * 0.16;
    placeLight();
    for (const { mesh, baseY, phase, spin } of blocks) {
      mesh.position.y = baseY + Math.sin(elapsed * 0.35 + phase) * 0.09;
      mesh.rotation.y += dt * 0.04 * spin;
    }
    tilt.x += (pointer.y * 0.05 - tilt.x) * Math.min(1, dt * 2);
    tilt.y += (pointer.x * 0.08 - tilt.y) * Math.min(1, dt * 2);
    group.rotation.set(tilt.x, tilt.y, 0);
    render();
    frame = requestAnimationFrame(tick);
  };

  const onPointerMove = (event: PointerEvent) => {
    pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
    pointer.y = (event.clientY / window.innerHeight) * 2 - 1;
  };

  const start = () => {
    if (frame || reduced || !active) return;
    last = 0;
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    frame = requestAnimationFrame(tick);
  };

  const stop = () => {
    cancelAnimationFrame(frame);
    frame = 0;
    window.removeEventListener('pointermove', onPointerMove);
  };

  renderer.domElement.addEventListener('webglcontextlost', (event) => {
    event.preventDefault();
    stop();
    options.onContextLost?.();
  });

  const api: NetworkScene = {
    setActive(value) {
      active = value;
      if (active && !reduced) start();
      else stop();
    },
    setReducedMotion(value) {
      reduced = value;
      if (reduced) {
        stop();
        render();
      } else {
        start();
      }
    },
    resize() {
      const { clientWidth: width, clientHeight: height } = container;
      if (!width || !height) return;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      // Keep the composition in frame on narrow (portrait) screens.
      camera.position.z = camera.aspect < 1.2 ? 9.5 + (1.2 - camera.aspect) * 7 : 9.5;
      camera.updateProjectionMatrix();
      if (!frame) render();
    },
    dispose() {
      stop();
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      haloMap.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };

  placeLight();
  api.resize();
  render();
  return api;
};
