import {
  AdditiveBlending,
  BufferGeometry,
  CanvasTexture,
  Color,
  Float32BufferAttribute,
  Group,
  IcosahedronGeometry,
  LineBasicMaterial,
  LineSegments,
  PerspectiveCamera,
  Points,
  PointsMaterial,
  Scene,
  Vector3,
  WebGLRenderer,
  WireframeGeometry,
} from 'three';

export interface ScenePalette {
  node: string;
  edge: string;
  pulse: string;
  core: string;
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

/** Deterministic PRNG so the network looks the same on every visit. */
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
  gradient.addColorStop(0.35, 'rgba(255,255,255,0.85)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  return new CanvasTexture(canvas);
}

/**
 * A slowly rotating graph of nodes (systems) linked by edges (integrations),
 * with small pulses travelling along the edges (data flowing between them).
 */
export const createNetworkScene: NetworkSceneFactory = (container, options) => {
  const rand = random(20260201);
  const nodeCount = options.compact ? 46 : 84;
  const pulseCount = options.compact ? 8 : 16;
  const radius = 2.25;

  // ── Nodes on a jittered Fibonacci sphere ─────────────────────────────────
  const nodes: Vector3[] = [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < nodeCount; i++) {
    const y = 1 - (i / (nodeCount - 1)) * 2;
    const r = Math.sqrt(1 - y * y);
    const theta = golden * i;
    const jitter = 0.82 + rand() * 0.3;
    nodes.push(new Vector3(Math.cos(theta) * r, y, Math.sin(theta) * r).multiplyScalar(radius * jitter));
  }

  // ── Edges: each node to its 3 nearest neighbours (deduplicated) ──────────
  const edgeKeys = new Set<string>();
  const edges: [number, number][] = [];
  const adjacency: number[][] = nodes.map(() => []);
  nodes.forEach((node, i) => {
    nodes
      .map((other, j) => ({ j, d: i === j ? Infinity : node.distanceToSquared(other) }))
      .sort((a, b) => a.d - b.d)
      .slice(0, 3)
      .forEach(({ j }) => {
        const key = i < j ? `${i}-${j}` : `${j}-${i}`;
        if (edgeKeys.has(key)) return;
        edgeKeys.add(key);
        edges.push([i, j]);
        adjacency[i].push(j);
        adjacency[j].push(i);
      });
  });

  // ── Three.js objects ─────────────────────────────────────────────────────
  const scene = new Scene();
  const camera = new PerspectiveCamera(42, 1, 0.1, 50);
  camera.position.set(0, 0, 7.4);

  const renderer = new WebGLRenderer({ antialias: !options.compact, alpha: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, options.compact ? 1.5 : 2));
  renderer.setClearColor(0x000000, 0);
  renderer.domElement.setAttribute('aria-hidden', 'true');
  container.appendChild(renderer.domElement);

  const group = new Group();
  scene.add(group);

  const texture = dotTexture();

  const nodeGeometry = new BufferGeometry().setFromPoints(nodes);
  const nodeMaterial = new PointsMaterial({ size: 0.11, map: texture, transparent: true, depthWrite: false });
  group.add(new Points(nodeGeometry, nodeMaterial));

  const edgeGeometry = new BufferGeometry().setFromPoints(edges.flatMap(([a, b]) => [nodes[a], nodes[b]]));
  const edgeMaterial = new LineBasicMaterial({ transparent: true, opacity: 0.32, depthWrite: false });
  group.add(new LineSegments(edgeGeometry, edgeMaterial));

  const coreGeometry = new WireframeGeometry(new IcosahedronGeometry(0.95, 1));
  const coreMaterial = new LineBasicMaterial({ transparent: true, opacity: 0.22, depthWrite: false });
  const core = new LineSegments(coreGeometry, coreMaterial);
  group.add(core);

  // Pulses: each travels along an edge, then hops to a neighbouring edge.
  const pulses = Array.from({ length: pulseCount }, () => {
    const [from, to] = edges[Math.floor(rand() * edges.length)];
    return { from, to, t: rand(), speed: 0.25 + rand() * 0.35 };
  });
  const pulsePositions = new Float32Array(pulseCount * 3);
  const pulseGeometry = new BufferGeometry();
  pulseGeometry.setAttribute('position', new Float32BufferAttribute(pulsePositions, 3));
  const pulseMaterial = new PointsMaterial({
    size: 0.2,
    map: texture,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
  });
  const pulsePoints = new Points(pulseGeometry, pulseMaterial);
  group.add(pulsePoints);

  const applyPalette = (palette: ScenePalette) => {
    nodeMaterial.color = new Color(palette.node);
    edgeMaterial.color = new Color(palette.edge);
    pulseMaterial.color = new Color(palette.pulse);
    coreMaterial.color = new Color(palette.core);
  };
  applyPalette(options.palette);

  // ── State & loop ─────────────────────────────────────────────────────────
  let reduced = options.reducedMotion;
  let active = false;
  let frame = 0;
  let last = 0;
  const pointer = { x: 0, y: 0 };
  const tilt = { x: 0, y: 0 };
  const scratch = new Vector3();
  group.rotation.set(0.35, -0.6, 0);

  const updatePulses = (dt: number) => {
    pulses.forEach((pulse, i) => {
      pulse.t += dt * pulse.speed;
      if (pulse.t >= 1) {
        const next = adjacency[pulse.to];
        pulse.from = pulse.to;
        pulse.to = next[Math.floor(rand() * next.length)] ?? pulse.from;
        pulse.t = 0;
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
    group.rotation.y += dt * 0.07;
    core.rotation.y -= dt * 0.12;
    core.rotation.x += dt * 0.04;
    // Gentle parallax towards the pointer, eased so it never feels jumpy.
    tilt.x += (pointer.y * 0.22 - tilt.x) * Math.min(1, dt * 2.5);
    tilt.y += (pointer.x * 0.3 - tilt.y) * Math.min(1, dt * 2.5);
    group.rotation.x = 0.35 + tilt.x;
    group.position.x = tilt.y * 0.25;
    updatePulses(dt);
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
      // Keep the whole network in view on narrow (portrait) containers.
      camera.position.z = camera.aspect < 1 ? 7.4 / Math.max(camera.aspect, 0.6) : 7.4;
      camera.updateProjectionMatrix();
      if (!frame) render();
    },
    dispose() {
      stop();
      [nodeGeometry, edgeGeometry, coreGeometry, pulseGeometry].forEach((g) => g.dispose());
      [nodeMaterial, edgeMaterial, coreMaterial, pulseMaterial].forEach((m) => m.dispose());
      texture.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };

  api.resize();
  showStatic();
  return api;
};
