import {
  BufferGeometry,
  CanvasTexture,
  Color,
  Float32BufferAttribute,
  Group,
  LineBasicMaterial,
  LineLoop,
  LineSegments,
  PerspectiveCamera,
  Points,
  PointsMaterial,
  Scene,
  Vector3,
  WebGLRenderer,
} from 'three';

export interface ScenePalette {
  node: string;
  edge: string;
  pulse: string;
  plane: string;
}

export interface SceneOptions {
  reducedMotion: boolean;
  compact: boolean;
  palette: ScenePalette;
  onContextLost?: () => void;
}

export interface NetworkScene {
  setActive(active: boolean): void;
  setReducedMotion(reduced: boolean): void;
  setPalette(palette: ScenePalette): void;
  resize(): void;
  dispose(): void;
}

export type NetworkSceneFactory = (container: HTMLElement, options: SceneOptions) => NetworkScene;

/** Interface → services → data → tests → deployment, top to bottom. */
const LAYER_COUNT = 5;
const LAYER_GAP = 0.78;
const LAYER_RADIUS = 1.75;

/** Deterministic PRNG so the structure looks the same on every visit. */
function random(seed: number): () => number {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
}

function dotTexture(): CanvasTexture {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.55, 'rgba(255,255,255,0.9)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  return new CanvasTexture(canvas);
}

/**
 * A calm, layered system diagram: five stacked rings of nodes (one per
 * delivery layer), linked vertically. Small pulses travel down the layers,
 * from the interface to deployment. Slow rotation, no glow, no bloom.
 */
export const createNetworkScene: NetworkSceneFactory = (container, options) => {
  const rand = random(20260201);
  const perLayer = options.compact ? 6 : 8;
  const pulseCount = options.compact ? 4 : 7;

  // ── Geometry ─────────────────────────────────────────────────────────────
  const layers: Vector3[][] = [];
  for (let l = 0; l < LAYER_COUNT; l++) {
    const y = ((LAYER_COUNT - 1) / 2 - l) * LAYER_GAP;
    // Nodes share their angle across layers: links read as clean vertical columns.
    const offset = 0;
    layers.push(
      Array.from({ length: perLayer }, (_, i) => {
        const angle = offset + (i / perLayer) * Math.PI * 2;
        const r = LAYER_RADIUS * (0.94 + rand() * 0.08);
        return new Vector3(Math.cos(angle) * r, y, Math.sin(angle) * r);
      }),
    );
  }
  const nodes = layers.flat();
  const indexOf = (l: number, i: number) => l * perLayer + i;

  // Vertical links: each node to the node at the same position one layer below.
  const down: number[][] = nodes.map(() => []);
  const vertical: [number, number][] = [];
  for (let l = 0; l < LAYER_COUNT - 1; l++) {
    for (let i = 0; i < perLayer; i++) {
      const from = indexOf(l, i);
      const to = indexOf(l + 1, i);
      vertical.push([from, to]);
      down[from].push(to);
    }
  }

  // ── Three.js objects ─────────────────────────────────────────────────────
  const scene = new Scene();
  // Slightly elevated: every layer reads as an ellipse, none is seen edge-on.
  const camera = new PerspectiveCamera(36, 1, 0.1, 50);
  camera.position.set(0, 3.6, 7.4);
  camera.lookAt(0, -0.15, 0);

  const renderer = new WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.setClearColor(0x000000, 0);
  renderer.domElement.setAttribute('aria-hidden', 'true');
  container.appendChild(renderer.domElement);

  const group = new Group();
  scene.add(group);
  const texture = dotTexture();

  // Thin rings: one "plane" per layer.
  const planeMaterial = new LineBasicMaterial({ transparent: true, opacity: 0.35, depthWrite: false });
  const planeGeometries: BufferGeometry[] = [];
  for (let l = 0; l < LAYER_COUNT; l++) {
    const y = layers[l][0].y;
    const points = Array.from({ length: 72 }, (_, i) => {
      const a = (i / 72) * Math.PI * 2;
      return new Vector3(Math.cos(a) * LAYER_RADIUS * 1.12, y, Math.sin(a) * LAYER_RADIUS * 1.12);
    });
    const geometry = new BufferGeometry().setFromPoints(points);
    planeGeometries.push(geometry);
    group.add(new LineLoop(geometry, planeMaterial));
  }

  const nodeGeometry = new BufferGeometry().setFromPoints(nodes);
  const nodeMaterial = new PointsMaterial({ size: 0.12, map: texture, transparent: true, depthWrite: false });
  group.add(new Points(nodeGeometry, nodeMaterial));

  const edgeGeometry = new BufferGeometry().setFromPoints(vertical.flatMap(([a, b]) => [nodes[a], nodes[b]]));
  const edgeMaterial = new LineBasicMaterial({ transparent: true, opacity: 0.4, depthWrite: false });
  group.add(new LineSegments(edgeGeometry, edgeMaterial));

  // Pulses descend through the layers and restart at the top.
  const startPulse = () => {
    const from = indexOf(0, Math.floor(rand() * perLayer));
    return { from, to: down[from][0], t: rand(), speed: 0.16 + rand() * 0.12 };
  };
  const pulses = Array.from({ length: pulseCount }, startPulse);
  const pulsePositions = new Float32Array(pulseCount * 3);
  const pulseGeometry = new BufferGeometry();
  pulseGeometry.setAttribute('position', new Float32BufferAttribute(pulsePositions, 3));
  const pulseMaterial = new PointsMaterial({ size: 0.16, map: texture, transparent: true, depthWrite: false });
  const pulsePoints = new Points(pulseGeometry, pulseMaterial);
  group.add(pulsePoints);

  const applyPalette = (palette: ScenePalette) => {
    nodeMaterial.color = new Color(palette.node);
    edgeMaterial.color = new Color(palette.edge);
    pulseMaterial.color = new Color(palette.pulse);
    planeMaterial.color = new Color(palette.plane);
  };
  applyPalette(options.palette);

  // ── State & loop ─────────────────────────────────────────────────────────
  let reduced = options.reducedMotion;
  let active = false;
  let frame = 0;
  let last = 0;
  const pointer = { x: 0 };
  let tilt = 0;
  const scratch = new Vector3();
  group.rotation.y = -0.4;

  const updatePulses = (dt: number) => {
    pulses.forEach((pulse, i) => {
      pulse.t += dt * pulse.speed;
      if (pulse.t >= 1) {
        const next = down[pulse.to];
        if (next.length) Object.assign(pulse, { from: pulse.to, to: next[0], t: 0 });
        else Object.assign(pulse, startPulse(), { t: 0 });
      }
      scratch.lerpVectors(nodes[pulse.from], nodes[pulse.to], pulse.t);
      pulsePositions.set([scratch.x, scratch.y, scratch.z], i * 3);
    });
    pulseGeometry.attributes['position'].needsUpdate = true;
  };

  const render = () => renderer.render(scene, camera);

  const tick = (time: number) => {
    // Clamp so a long pause (tab switch) never produces a jump.
    const dt = last ? Math.min((time - last) / 1000, 0.05) : 0;
    last = time;
    tilt += (pointer.x * 0.12 - tilt) * Math.min(1, dt * 2);
    group.rotation.y += dt * 0.045;
    group.rotation.z = tilt * 0.15;
    updatePulses(dt);
    render();
    frame = requestAnimationFrame(tick);
  };

  const onPointerMove = (event: PointerEvent) => {
    pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
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

  const showStatic = () => {
    pulsePoints.visible = !reduced;
    updatePulses(0);
    render();
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
        showStatic();
      } else {
        pulsePoints.visible = true;
        start();
      }
    },
    setPalette(palette) {
      applyPalette(palette);
      if (!frame) render();
    },
    resize() {
      const { clientWidth: width, clientHeight: height } = container;
      if (!width || !height) return;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      if (!frame) render();
    },
    dispose() {
      stop();
      [nodeGeometry, edgeGeometry, pulseGeometry, ...planeGeometries].forEach((g) => g.dispose());
      [nodeMaterial, edgeMaterial, pulseMaterial, planeMaterial].forEach((m) => m.dispose());
      texture.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };

  api.resize();
  showStatic();
  return api;
};
