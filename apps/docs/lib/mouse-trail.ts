/**
 * The cursor trail — a ribbon of lit, glossy beads that flows behind the pointer
 * across the landing page.
 *
 * ## The budget, and why it is a pool
 *
 * A trail is a *recycled* set of bodies, not a stream of new ones. The scene
 * allocates a fixed pool once, hands each body out on a ring buffer as the
 * pointer moves, and returns it to the pool when it dies. There is no
 * allocation per pointer event, no growth over time, and no way for a fast mouse
 * to accumulate a thousand bodies: the oldest is always the one reused.
 *
 * A frame is two instanced draw calls (glow, then beads). When the last body has
 * faded *and* the follower has caught up with the pointer, the loop stops
 * entirely, so an idle page costs nothing at all — not a hidden canvas, not a
 * running rAF.
 *
 * ## Why it feels smooth
 *
 * **The trail follows an eased point, not the raw pointer.** Pointer events
 * arrive at the display's polling rate and carry every tremor of the hand. The
 * trail chases the pointer with exponential smoothing instead, then lays bodies
 * at an even spacing along the path that point actually travelled. The result is
 * a continuous ribbon with no gaps on fast flicks and no clumps on slow drags.
 *
 * **Colour is a gradient along the stroke.** Palette entries are ordered by hue
 * and blended as the pointer travels, ping-ponging at the ends so there is no
 * seam. A stroke reads as one flowing colour sweep rather than confetti.
 *
 * **Every body has an arc.** It pops in with a small overshoot, drifts and sways
 * under drag, then eases out in both size and opacity. Nothing appears or
 * vanishes abruptly, and nothing darkens on its way out — opacity is a real
 * per-instance alpha, so it fades correctly on light and dark pages alike.
 *
 * ## Why spheres, and why lit
 *
 * `IcosahedronGeometry` at detail 2 is 320 triangles with smooth normals. A
 * `MeshStandardMaterial` under an ambient, a key and a faint rim light gives each
 * bead a lit cap, a soft specular highlight and a shadowed underside, which is
 * the difference between "3D pearl" and "flat dot". A billboarded radial glow
 * sits behind the beads and knits them into one ribbon.
 *
 * The camera is placed so that one world unit is exactly one CSS pixel at
 * `z = 0`, which keeps all the motion maths in pixels.
 *
 * Assumes three r155+ (physically-based light units).
 *
 * @packageDocumentation
 */

export type ThreeModule = typeof import("three");

type Rgb = [number, number, number];

/** Bodies in flight. A trail needs a tail, not a swarm. */
const MAX_DESKTOP = 72;
const MAX_COARSE = 28;

/** How long a body lives, in milliseconds. */
const LIFETIME = 1250;

/** How long a body takes to pop in, in milliseconds. */
const APPEAR = 170;

/** Base distance between bodies along the path, in px. Grows with speed. */
const SPACING = 11;
/** Extra spacing per px/s of pointer speed, so a fast flick cannot outrun the pool. */
const SPACING_PER_SPEED = 0.011;
/** Hard cap on bodies emitted in a single frame. */
const MAX_EMIT_PER_FRAME = 8;

/** Follower stiffness, in 1/s. Higher is tighter; lower is silkier. */
const FOLLOW = 20;

/** Distance along the stroke over which the colour moves one palette step. */
const COLOR_SPAN = 240;

/** Glow quad radius, as a multiple of the bead radius. */
const GLOW_SCALE = 3.6;

/** The largest device pixel ratio the overlay renders at... */
const DPR_CAP = 2;
/** ...and the most device pixels it will fill before the ratio is reduced. */
const PIXEL_BUDGET = 4_500_000;

export interface TrailHandle {
  /** Register a pointer position. Cheap: it moves a target and wakes the loop. */
  push: (x: number, y: number) => void;
  /** The pointer left the page. The next `push` starts a fresh stroke. */
  leave: () => void;
  /** Replace the palette. Bodies in flight keep the colour they were born with. */
  setColors: (colors: string[]) => void;
  /** Pause while the section is off-screen. */
  setVisible: (visible: boolean) => void;
  /** Re-measure the canvas after the section's own layout changed. */
  resize: () => void;
  /** Tune the glow for a dark or light page. */
  setDark: (dark: boolean) => void;
  dispose: () => void;
  /** Development-only diagnostics. */
  diagnostics: () => { bodies: number; frames: number; running: boolean };
}

interface Body {
  /** Position in CSS pixels from the top-left of the viewport; `z` in world units. */
  x: number;
  y: number;
  z: number;
  /** Velocity in px/s. */
  vx: number;
  vy: number;
  born: number;
  life: number;
  /** Radius in px. */
  size: number;
  sway: number;
  swayAmp: number;
  /** Linear-light colour, ready for the renderer. */
  r: number;
  g: number;
  b: number;
}

const clamp = (v: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, v));
const smooth = (t: number) => t * t * (3 - 2 * t);

/** Overshoots slightly before settling — the "pop" when a bead is born. */
function easeOutBack(t: number): number {
  const c1 = 1.25;
  const c3 = c1 + 1;
  const x = t - 1;
  return 1 + c3 * x * x * x + c1 * x * x;
}

/**
 * Lift a token colour into a range that reads on a page surface.
 *
 * Token sets include near-blacks (`#000`, deep plums) that a lit sphere renders
 * as a soot speck. Mixing toward white by a constant amount keeps the hue and
 * makes the body legible without inventing a colour the theme does not have.
 */
function lift(rgb: Rgb): Rgb {
  const lum = (rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722) / 255;
  const k = lum < 0.5 ? 0.5 - lum : 0;
  return [
    rgb[0] + (255 - rgb[0]) * k,
    rgb[1] + (255 - rgb[1]) * k,
    rgb[2] + (255 - rgb[2]) * k,
  ];
}

/** `#rgb`, `#rrggbb` or `#rrggbbaa` → 0–255 triple, or `null`. Alpha is ignored. */
function parseHex(hex: string): Rgb | null {
  let m = hex.trim().replace(/^#/, "");
  if (m.length === 4) m = m.slice(0, 3);
  if (m.length === 8) m = m.slice(0, 6);
  const full =
    m.length === 3
      ? m
          .split("")
          .map((c) => c + c)
          .join("")
      : m;
  if (!/^[0-9a-f]{6}$/i.test(full)) return null;
  const n = parseInt(full, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Hue in degrees, 0–360. Greys return 0. */
function hueOf([r, g, b]: Rgb): number {
  const rr = r / 255;
  const gg = g / 255;
  const bb = b / 255;
  const max = Math.max(rr, gg, bb);
  const min = Math.min(rr, gg, bb);
  const d = max - min;
  if (d === 0) return 0;
  let h: number;
  if (max === rr) h = ((gg - bb) / d) % 6;
  else if (max === gg) h = (bb - rr) / d + 2;
  else h = (rr - gg) / d + 4;
  h *= 60;
  return h < 0 ? h + 360 : h;
}

/** sRGB byte → linear-light float, since the renderer works in linear space. */
function toLinear(byte: number): number {
  const c = clamp(byte, 0, 255) / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/**
 * Turn the theme's hex tokens into a gradient-ready palette: lifted for
 * legibility, de-duplicated so near-identical tokens do not stall the gradient,
 * and ordered by hue so neighbouring entries blend cleanly.
 */
function buildPalette(colors: string[]): Rgb[] {
  const picked: Rgb[] = [];
  for (const hex of colors) {
    const parsed = parseHex(hex);
    if (!parsed) continue;
    const c = lift(parsed);
    const duplicate = picked.some(
      (p) => Math.hypot(p[0] - c[0], p[1] - c[1], p[2] - c[2]) < 38,
    );
    if (!duplicate) picked.push(c);
  }
  if (picked.length === 0) {
    return [
      [124, 140, 255],
      [196, 132, 255],
    ];
  }
  if (picked.length === 1) {
    const [r, g, b] = picked[0] as Rgb;
    picked.push([
      r + (255 - r) * 0.35,
      g + (255 - g) * 0.35,
      b + (255 - b) * 0.35,
    ]);
  }
  return picked.sort((a, b) => hueOf(a) - hueOf(b));
}

/**
 * Sample the palette at `phase`, ping-ponging at both ends so a long stroke
 * sweeps back and forth through the gradient instead of snapping at a seam.
 */
function sample(palette: Rgb[], phase: number): Rgb {
  const n = palette.length;
  if (n === 1) return palette[0] as Rgb;
  const period = 2 * (n - 1);
  let m = phase % period;
  if (m < 0) m += period;
  const idx = m <= n - 1 ? m : period - m;
  const i0 = Math.floor(idx);
  const i1 = Math.min(i0 + 1, n - 1);
  const f = smooth(idx - i0);
  const a = palette[i0] as Rgb;
  const b = palette[i1] as Rgb;
  return [
    a[0] + (b[0] - a[0]) * f,
    a[1] + (b[1] - a[1]) * f,
    a[2] + (b[2] - a[2]) * f,
  ];
}

const GLOW_VERTEX = /* glsl */ `
  attribute float aAlpha;
  varying vec2 vUv;
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    vUv = uv;
    vAlpha = aAlpha;
    #ifdef USE_INSTANCING_COLOR
      vColor = instanceColor;
    #else
      vColor = vec3(1.0);
    #endif
    gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
  }
`;

/*
  The canvas expects sRGB, and a ShaderMaterial skips three's output chunks, so
  the linear-light instance colour is encoded by hand. Doing it here rather than
  with an `#include` keeps the shader independent of which three release is
  installed.
*/
const GLOW_FRAGMENT = /* glsl */ `
  uniform float uStrength;
  varying vec2 vUv;
  varying vec3 vColor;
  varying float vAlpha;

  vec3 toSrgb(vec3 c) {
    c = max(c, vec3(0.0));
    vec3 lo = c * 12.92;
    vec3 hi = 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055;
    return mix(hi, lo, step(c, vec3(0.0031308)));
  }

  void main() {
    float d = length(vUv * 2.0 - 1.0);
    float falloff = exp(-d * d * 3.8) * (1.0 - smoothstep(0.78, 1.0, d));
    gl_FragColor = vec4(toSrgb(vColor), falloff * vAlpha * uStrength);
  }
`;

/**
 * Build the trail.
 *
 * @param canvas - A fixed, full-viewport canvas.
 * @param colors - The theme's colour tokens, as hex strings.
 * @param coarse - Whether the pointer is a finger, which decides the pool size.
 */
export function createTrail(
  THREE: ThreeModule,
  canvas: HTMLCanvasElement,
  colors: string[],
  coarse: boolean,
): TrailHandle {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
    powerPreference: "low-power",
    stencil: false,
    depth: false,
  });
  renderer.setClearAlpha(0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, 1, 10, 8000);

  // Ambient is deliberately low. A trail of evenly-lit spheres is a trail of flat
  // discs; the value difference between the lit cap and the shadowed underside
  // is what makes each bead read as a solid.
  scene.add(new THREE.AmbientLight(0xffffff, 0.95));
  const key = new THREE.DirectionalLight(0xffffff, 2.5);
  key.position.set(-0.8, 1.4, 2.0);
  scene.add(key);
  // A faint light from behind and below catches the far edge of each bead, so
  // the silhouette separates from the page instead of dissolving into it.
  const rim = new THREE.DirectionalLight(0xffffff, 0.9);
  rim.position.set(1.0, -0.9, -0.7);
  scene.add(rim);

  const capacity = coarse ? MAX_COARSE : MAX_DESKTOP;

  // Per-instance opacity, shared by both layers.
  const alphaAttr = new THREE.InstancedBufferAttribute(
    new Float32Array(capacity),
    1,
  );
  alphaAttr.setUsage(THREE.DynamicDrawUsage);

  // ---- Glow: a camera-facing quad with a radial falloff -------------------
  const glowGeometry = new THREE.PlaneGeometry(2, 2);
  glowGeometry.setAttribute("aAlpha", alphaAttr);
  const glowMaterial = new THREE.ShaderMaterial({
    vertexShader: GLOW_VERTEX,
    fragmentShader: GLOW_FRAGMENT,
    uniforms: { uStrength: { value: 0.1 } },
    transparent: true,
    depthTest: false,
    depthWrite: false,
  });
  const glow = new THREE.InstancedMesh(glowGeometry, glowMaterial, capacity);
  glow.frustumCulled = false;
  glow.renderOrder = 0;
  glow.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

  // ---- Beads: smooth lit spheres ------------------------------------------
  const geometry = new THREE.IcosahedronGeometry(1, 2);
  geometry.setAttribute("aAlpha", alphaAttr);
  const material = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.3,
    metalness: 0,
    transparent: true,
    depthWrite: false,
  });
  // Multiply the surface alpha by the per-instance value. `color_fragment` runs
  // right after `diffuseColor` is created, so this is the earliest safe hook.
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        "#include <common>\nattribute float aAlpha;\nvarying float vAlpha;",
      )
      .replace(
        "#include <begin_vertex>",
        "#include <begin_vertex>\nvAlpha = aAlpha;",
      );
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", "#include <common>\nvarying float vAlpha;")
      .replace(
        "#include <color_fragment>",
        "#include <color_fragment>\ndiffuseColor.a *= vAlpha;",
      );
  };
  material.customProgramCacheKey = () => "trail-bead-v2";

  const mesh = new THREE.InstancedMesh(geometry, material, capacity);
  mesh.frustumCulled = false;
  mesh.renderOrder = 1;
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  const instanceColor = new THREE.InstancedBufferAttribute(
    new Float32Array(capacity * 3),
    3,
  );
  instanceColor.setUsage(THREE.DynamicDrawUsage);
  mesh.instanceColor = instanceColor;
  glow.instanceColor = instanceColor;

  // Glow first, so every bead sits in front of every halo.
  scene.add(glow);
  scene.add(mesh);

  const bodies: Array<Body | null> = new Array(capacity).fill(null);
  let cursor = 0;
  let palette = buildPalette(colors);

  const dummy = new THREE.Object3D();
  const tint = new THREE.Color();

  let width = 1;
  let height = 1;
  let frame = 0;
  let frames = 0;
  let running = false;
  let last = 0;

  // Pointer target and the eased follower that chases it.
  let tx = 0;
  let ty = 0;
  let fx = 0;
  let fy = 0;
  let primed = false;
  let visible = true;
  let speed = 0;
  let carry = 0;
  let phase = 0;

  const resize = () => {
    // The canvas is the section, not the window: the trail is bounded by the
    // hero, so the hero's box is the only size that matters.
    const w = Math.max(1, canvas.clientWidth || canvas.width);
    const h = Math.max(1, canvas.clientHeight || canvas.height);
    width = w;
    height = h;

    // Sharp on retina, but never more pixels than the budget allows.
    const dpr = Math.min(window.devicePixelRatio || 1, DPR_CAP);
    const allowed = Math.sqrt(PIXEL_BUDGET / (w * h));
    renderer.setPixelRatio(Math.max(1, Math.min(dpr, allowed)));
    renderer.setSize(w, h, false);

    // Stand the camera where one world unit equals one CSS pixel at z = 0.
    camera.aspect = w / h;
    camera.position.z = h / 2 / Math.tan((camera.fov * Math.PI) / 360);
    camera.far = camera.position.z * 2 + 2000;
    camera.updateProjectionMatrix();
  };
  resize();

  const emit = (
    x: number,
    y: number,
    now: number,
    colorPhase: number,
    vx: number,
    vy: number,
  ) => {
    const [cr, cg, cb] = sample(
      palette,
      colorPhase + (Math.random() - 0.5) * 0.35,
    );

    const index = cursor;
    cursor = (cursor + 1) % capacity;

    // Faster strokes lay slightly larger beads, so the ribbon swells with motion.
    const swell = clamp(speed / 1100, 0, 1);

    bodies[index] = {
      x,
      y,
      // A little depth so the trail has parallax rather than reading as a decal.
      z: (Math.random() - 0.5) * 70,
      vx: vx * 0.05 + (Math.random() - 0.5) * 28,
      vy: vy * 0.05 + (Math.random() - 0.5) * 28 - 12,
      born: now,
      life: LIFETIME * (0.82 + Math.random() * 0.36),
      size: (3.4 + swell * 4.2) * (0.82 + Math.random() * 0.4),
      sway: Math.random() * Math.PI * 2,
      swayAmp: 6 + Math.random() * 12,
      r: toLinear(cr),
      g: toLinear(cg),
      b: toLinear(cb),
    };
  };

  /**
   * Lay bodies at even spacing along the follower's path from (ax, ay) to
   * (bx, by). `carry` is the distance already travelled since the last body, so
   * spacing stays even across frame boundaries.
   */
  const lay = (
    ax: number,
    ay: number,
    bx: number,
    by: number,
    now: number,
    dt: number,
  ) => {
    const dx = bx - ax;
    const dy = by - ay;
    const length = Math.hypot(dx, dy);

    // Smoothed speed, in px/s.
    const instant = length / dt;
    speed += (instant - speed) * (1 - Math.exp(-dt * 10));

    if (length < 1e-4) return;

    const ux = dx / length;
    const uy = dy / length;
    const spacing = SPACING + speed * SPACING_PER_SPEED;
    const startPhase = phase;
    phase += length / COLOR_SPAN;

    let pos = spacing - carry;
    let emitted = 0;
    while (pos <= length && emitted < MAX_EMIT_PER_FRAME) {
      // Back-date each body to the moment the follower passed its position.
      const born = now - (1 - pos / length) * dt * 1000;
      emit(
        ax + ux * pos,
        ay + uy * pos,
        born,
        startPhase + pos / COLOR_SPAN,
        ux * speed,
        uy * speed,
      );
      pos += spacing;
      emitted += 1;
    }
    carry = emitted >= MAX_EMIT_PER_FRAME ? 0 : length - (pos - spacing);
  };

  const park = (k: number) => {
    dummy.position.set(0, 0, -4000);
    dummy.scale.setScalar(0);
    dummy.updateMatrix();
    mesh.setMatrixAt(k, dummy.matrix);
    glow.setMatrixAt(k, dummy.matrix);
    alphaAttr.setX(k, 0);
  };

  const draw = (now: number) => {
    const dt = clamp((now - last) / 1000, 0.001, 0.05);
    last = now;

    // The follower closes a fraction of the gap each frame, independent of fps.
    const gap = Math.abs(tx - fx) + Math.abs(ty - fy);
    const settled = gap < 0.25;
    if (settled) {
      fx = tx;
      fy = ty;
      speed *= Math.exp(-dt * 10);
    } else {
      const a = 1 - Math.exp(-FOLLOW * dt);
      const nx = fx + (tx - fx) * a;
      const ny = fy + (ty - fy) * a;
      lay(fx, fy, nx, ny, now, dt);
      fx = nx;
      fy = ny;
    }

    const halfW = width / 2;
    const halfH = height / 2;
    const drag = Math.exp(-2.4 * dt);

    let alive = 0;

    // Slot 0 is the oldest body and the last slot the newest, so the newest is
    // always drawn on top regardless of where the ring buffer has wrapped to.
    for (let k = 0; k < capacity; k += 1) {
      const i = (cursor + k) % capacity;
      const body = bodies[i];
      if (!body) {
        park(k);
        continue;
      }

      const ageMs = now - body.born;
      const t = ageMs / body.life;
      if (t >= 1) {
        bodies[i] = null;
        park(k);
        continue;
      }

      alive += 1;

      // Drag, so the tail slows instead of flying off, plus a gentle sway so the
      // ribbon breathes rather than sitting rigid.
      body.vx *= drag;
      body.vy *= drag;
      const wave = now * 0.0021 + body.sway;
      body.x += (body.vx + Math.sin(wave) * body.swayAmp) * dt;
      body.y += (body.vy + Math.cos(wave * 0.8) * body.swayAmp * 0.6) * dt;

      const appear = clamp(ageMs / APPEAR, 0, 1);
      const fade = smooth(1 - t);
      const scale = body.size * easeOutBack(appear) * (0.45 + 0.55 * fade);
      const opacity = smooth(appear) * fade;

      dummy.position.set(body.x - halfW, halfH - body.y, body.z);
      dummy.scale.setScalar(Math.max(scale, 0));
      dummy.updateMatrix();
      mesh.setMatrixAt(k, dummy.matrix);

      dummy.scale.setScalar(Math.max(scale, 0) * GLOW_SCALE);
      dummy.updateMatrix();
      glow.setMatrixAt(k, dummy.matrix);

      // A trail is a hint, not a highlight: kept well under full opacity so the
      // copy over it never has to compete.
      alphaAttr.setX(k, opacity * 0.55);

      tint.setRGB(body.r, body.g, body.b);
      mesh.setColorAt(k, tint);
    }

    mesh.instanceMatrix.needsUpdate = true;
    glow.instanceMatrix.needsUpdate = true;
    instanceColor.needsUpdate = true;
    alphaAttr.needsUpdate = true;

    renderer.render(scene, camera);
    frames += 1;

    if (alive === 0 && settled) {
      // The page is idle. Nothing is scheduled, so nothing costs anything.
      running = false;
      cancelAnimationFrame(frame);
      frame = 0;
      return;
    }

    frame = requestAnimationFrame(draw);
  };

  const start = () => {
    if (running || !visible) return;
    running = true;
    last = performance.now();
    frame = requestAnimationFrame(draw);
  };

  const onResize = () => resize();
  window.addEventListener("resize", onResize);

  const onContextLost = (event: Event) => {
    event.preventDefault();
    running = false;
    cancelAnimationFrame(frame);
    frame = 0;
  };
  canvas.addEventListener("webglcontextlost", onContextLost);

  return {
    push: (x, y) => {
      tx = x;
      ty = y;
      if (!primed) {
        primed = true;
        fx = x;
        fy = y;
        carry = 0;
        speed = 0;
        phase = Math.random() * 6;
        emit(x, y, performance.now(), phase, 0, 0);
      }
      start();
    },
    leave: () => {
      primed = false;
    },
    setVisible: (next) => {
      visible = next;
      if (!next) {
        // The hero has left the viewport: drop the bodies and stop the loop.
        for (let i = 0; i < bodies.length; i += 1) bodies[i] = null;
        running = false;
        cancelAnimationFrame(frame);
        frame = 0;
      }
    },
    resize: () => {
      resize();
      start();
    },
    setColors: (next) => {
      const parsed = buildPalette(next);
      if (parsed.length > 0) palette = parsed;
    },
    setDark: (dark) => {
      glowMaterial.uniforms.uStrength!.value = dark ? 0.16 : 0.1;
    },
    dispose: () => {
      running = false;
      cancelAnimationFrame(frame);
      frame = 0;
      window.removeEventListener("resize", onResize);
      canvas.removeEventListener("webglcontextlost", onContextLost);
      scene.remove(mesh);
      scene.remove(glow);
      geometry.dispose();
      glowGeometry.dispose();
      material.dispose();
      glowMaterial.dispose();
      mesh.dispose();
      glow.dispose();
      renderer.dispose();
    },
    diagnostics: () => ({
      bodies: bodies.filter(Boolean).length,
      frames,
      running,
    }),
  };
}
