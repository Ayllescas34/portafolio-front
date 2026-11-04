import {
  BufferAttribute,
  BufferGeometry,
  Color,
  Group,
  LineSegments,
  PerspectiveCamera,
  Scene,
  ShaderMaterial,
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
  low: 0x2f5f9a,
  high: 0xa9cdf5,
};

const WIDTH = 26;
const DEPTH = 15;

const VERTEX_SHADER = /* glsl */ `
  uniform float uTime;
  varying float vLight;

  float surface(vec2 p) {
    return sin(p.x * 0.42 + uTime * 0.38) * 0.34
      + sin(p.y * 0.64 - uTime * 0.27) * 0.24
      + sin((p.x + p.y) * 0.27 + uTime * 0.21) * 0.46;
  }

  void main() {
    float height = surface(position.xz);
    vec3 moved = vec3(position.x, position.y + height, position.z);

    // Fades towards the horizon and the copy, which sits on the left.
    float horizon = smoothstep(-15.0, -6.0, position.z);
    float side = mix(0.28, 1.0, smoothstep(-9.0, 5.0, position.x));
    vLight = horizon * side * (0.55 + 0.45 * smoothstep(-0.8, 0.9, height));

    gl_Position = projectionMatrix * modelViewMatrix * vec4(moved, 1.0);
  }
`;

const FRAGMENT_SHADER = /* glsl */ `
  uniform vec3 uLow;
  uniform vec3 uHigh;
  varying float vLight;

  void main() {
    gl_FragColor = vec4(mix(uLow, uHigh, vLight), vLight * 0.62);
  }
`;

/** Parallel lines across the surface: each row is a chain of short segments. */
function createSurface(rows: number, columns: number): BufferGeometry {
  const positions = new Float32Array(rows * columns * 3);
  const indices: number[] = [];
  for (let row = 0; row < rows; row++) {
    const z = 2 - (row / (rows - 1)) * DEPTH;
    for (let column = 0; column < columns; column++) {
      const offset = (row * columns + column) * 3;
      positions[offset] = (column / (columns - 1) - 0.5) * WIDTH;
      positions[offset + 2] = z;
      if (column < columns - 1) indices.push(row * columns + column, row * columns + column + 1);
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  return geometry;
}

/**
 * A slow surface of fine lines, like a living chart. Motion stays restrained, and
 * all of it runs in the vertex shader, so the main thread only updates one uniform.
 */
export const createNetworkScene: NetworkSceneFactory = (container, options) => {
  const scene = new Scene();
  const camera = new PerspectiveCamera(36, 1, 0.1, 60);

  const renderer = new WebGLRenderer({ antialias: !options.compact, alpha: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, options.compact ? 1.25 : 1.75));
  renderer.setClearColor(0x000000, 0);
  renderer.domElement.setAttribute('aria-hidden', 'true');
  container.appendChild(renderer.domElement);

  const geometry = options.compact ? createSurface(30, 80) : createSurface(52, 150);
  const material = new ShaderMaterial({
    vertexShader: VERTEX_SHADER,
    fragmentShader: FRAGMENT_SHADER,
    transparent: true,
    depthWrite: false,
    uniforms: {
      uTime: { value: 4 },
      uLow: { value: new Color(COLORS.low) },
      uHigh: { value: new Color(COLORS.high) },
    },
  });

  const group = new Group();
  group.position.y = -1.5;
  group.add(new LineSegments(geometry, material));
  scene.add(group);

  // ── State & loop ─────────────────────────────────────────────────────────
  let reduced = options.reducedMotion;
  let active = false;
  let frame = 0;
  let last = 0;
  const pointer = { x: 0, y: 0 };
  const tilt = { x: 0, y: 0 };

  const render = () => renderer.render(scene, camera);

  const tick = (time: number) => {
    // Clamp so a long pause (tab switch) never produces a jump.
    const dt = last ? Math.min((time - last) / 1000, 0.05) : 0;
    last = time;
    material.uniforms['uTime'].value += dt;
    tilt.x += (pointer.y * 0.02 - tilt.x) * Math.min(1, dt * 2);
    tilt.y += (pointer.x * 0.035 - tilt.y) * Math.min(1, dt * 2);
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
      camera.position.set(0, 3.1, camera.aspect < 1.2 ? 9.5 + (1.2 - camera.aspect) * 5 : 9.5);
      camera.lookAt(0, 0.5, -3);
      camera.updateProjectionMatrix();
      if (!frame) render();
    },
    dispose() {
      stop();
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };

  api.resize();
  render();
  return api;
};
