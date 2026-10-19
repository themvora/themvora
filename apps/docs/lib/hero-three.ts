/**
 * The hero's Three.js scene, as a renderer-agnostic factory.
 *
 * ## Why this is a separate module
 *
 * It is the **code-split boundary**. `three` is not imported here — it is passed
 * in, having been loaded with a dynamic `import()` from the component. That is
 * what keeps ~150 kB gzipped out of the critical path for a decorative
 * background: the hero paints without it, and the scene arrives afterwards.
 *
 * Keeping the scene out of the React component also means the frame loop is
 * plainly not a render loop — nothing in this file touches React.
 *
 * ## The two rules
 *
 * **Readability is enforced, not hoped for.** Forms are pushed past the viewport
 * edges *and* a theme-background veil sits above the canvas (`.hero-scene-veil`).
 *
 * **Theme tokens are read, never rewritten.** The palette is derived by
 * `lib/hero-scene.ts` and handed in; this module only applies it.
 *
 * @packageDocumentation
 */
import {
  capDpr,
  interpolateAtmosphere,
  MOTION,
  type Atmosphere,
} from "./hero-scene";

/** The shape of the dynamically-imported module. */
export type ThreeModule = typeof import("three");

export interface HeroSceneHandle {
  /** Update the target palette; the loop interpolates toward it. */
  setAtmosphere: (atmosphere: Atmosphere) => void;
  /** Stop the loop and release every GPU resource. */
  dispose: () => void;
  /** Development-only diagnostics, read by `scripts/probe-hero-scene.mjs`. */
  diagnostics: () => {
    frames: number;
    draws: number;
    motionTime: number;
    reduced: boolean;
    width: number;
    height: number;
    atmosphere: Atmosphere | null;
  };
}

/**
 * Build the scene on a canvas.
 *
 * @param THREE - The dynamically-imported Three.js module.
 * @param canvas - The canvas to render into. Must already be in the DOM.
 * @param initial - The atmosphere to start from, so the scene does not fade in
 *   from the wrong colour.
 * @param onFirstFrame - Called once, after the first frame has actually been
 *   rendered. The caller uses it to crossfade the canvas in, which is what keeps
 *   shader compilation from presenting as a visible hitch.
 */
export function createHeroScene(
  THREE: ThreeModule,
  canvas: HTMLCanvasElement,
  initial: Atmosphere | null,
  onFirstFrame: () => void,
): HeroSceneHandle {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: false,
    // The forms are soft-edged by construction, and MSAA on a full-viewport
    // canvas is the most expensive thing a background can ask for.
    powerPreference: "low-power",
  });
  renderer.setClearAlpha(0);

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 60);
  camera.position.set(0, 0, 7.4);

  // Soft, even lighting. No shadows, no environment — the scene has to read as
  // atmosphere, not as a lit product shot.
  const ambient = new THREE.AmbientLight(0xffffff, 1.15);
  const key = new THREE.DirectionalLight(0xffffff, 1.5);
  key.position.set(2.5, 4, 6);
  const fill = new THREE.DirectionalLight(0xffffff, 0.55);
  fill.position.set(-4, -2.5, 3);
  scene.add(ambient, key, fill);

  // -- geometry ---------------------------------------------------------------
  /**
   * A soft organic mass: a sphere whose radius carries two low-frequency waves,
   * so it reads as a volume with no nameable silhouette.
   *
   * `SphereGeometry` rather than `IcosahedronGeometry` because it is indexed, so
   * `computeVertexNormals` smooths across the surface instead of leaving it
   * faceted.
   */
  const blob = (radius: number, seed: number) => {
    const geometry = new THREE.SphereGeometry(radius, 48, 32);
    const position = geometry.attributes.position as import("three").BufferAttribute;
    const v = new THREE.Vector3();

    for (let i = 0; i < position.count; i += 1) {
      v.fromBufferAttribute(position, i);
      const theta = Math.atan2(v.z, v.x);
      const phi = Math.acos(THREE.MathUtils.clamp(v.y / radius, -1, 1));
      const wobble =
        1 +
        0.17 * Math.sin(3 * theta + seed) * Math.sin(2 * phi + seed * 0.5) +
        0.11 * Math.cos(2 * theta - seed * 0.7);
      position.setXYZ(i, v.x * wobble, v.y * wobble, v.z * wobble);
    }

    geometry.computeVertexNormals();
    return geometry;
  };

  /** A thin arc swept along a curve — the mid layer. */
  const arc = (seed: number, length: number, thickness: number) => {
    const points: import("three").Vector3[] = [];
    for (let i = 0; i <= 12; i += 1) {
      const t = i / 12;
      points.push(
        new THREE.Vector3(
          (t - 0.5) * length,
          Math.sin(t * Math.PI * 2 + seed) * 0.55 + Math.sin(t * Math.PI * 5 + seed * 2) * 0.12,
          Math.cos(t * Math.PI * 1.5 + seed * 0.6) * 0.7,
        ),
      );
    }
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 96, thickness, 5, false);
  };

  /** A soft round sprite, so the points are motes rather than squares. */
  const moteTexture = (() => {
    const size = 64;
    const c = document.createElement("canvas");
    c.width = size;
    c.height = size;
    const ctx = c.getContext("2d")!;
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.45, "rgba(255,255,255,0.45)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    const texture = new THREE.CanvasTexture(c);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  })();

  // Deliberately beyond the frame on every side. A form that fits inside the
  // viewport reads as an object on a page; one that is cropped reads as a field
  // the page sits in.
  const forms = [
    { geometry: blob(1, 1.3), position: [-4.7, 1.6, -2.4], scale: 3.9, spin: 0.011, alpha: 0.5 },
    { geometry: blob(1, 3.7), position: [5.0, -2.0, -3.6], scale: 4.6, spin: -0.008, alpha: 0.42 },
    { geometry: blob(1, 5.1), position: [1.2, 3.2, -1.1], scale: 2.5, spin: 0.014, alpha: 0.3 },
  ].map((spec, index) => {
    // MeshLambertMaterial has no specular term at all. That is the point: a
    // highlight is what turns a background into a generic tech landing page.
    const material = new THREE.MeshLambertMaterial({
      color: 0xffffff,
      emissive: 0x000000,
      transparent: true,
      opacity: spec.alpha,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(spec.geometry, material);
    mesh.position.set(spec.position[0]!, spec.position[1]!, spec.position[2]!);
    mesh.scale.setScalar(spec.scale);
    scene.add(mesh);
    return { mesh, material, spin: spec.spin, alternate: index % 2 === 0 };
  });

  const arcs = [
    { geometry: arc(0.4, 13, 0.075), position: [0, -1.6, 0.6], scale: 1.25, spin: 0.016, alpha: 0.34 },
    { geometry: arc(2.1, 15, 0.055), position: [0.4, 2.3, -1.2], scale: 1.1, spin: -0.012, alpha: 0.26 },
    { geometry: arc(4.4, 11, 0.045), position: [-0.6, 0.4, -2.4], scale: 1.4, spin: 0.009, alpha: 0.18 },
  ].map((spec, index) => {
    const material = new THREE.MeshLambertMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: spec.alpha,
      depthWrite: false,
      // A ribbon is a surface, not a volume: there is no inside to hide.
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(spec.geometry, material);
    mesh.position.set(spec.position[0]!, spec.position[1]!, spec.position[2]!);
    mesh.scale.setScalar(spec.scale);
    scene.add(mesh);
    return { mesh, material, spin: spec.spin, alternate: index % 2 === 0 };
  });

  // A deterministic shell, so the field is identical on every load.
  const particleCount = 220;
  const particlePositions = new Float32Array(particleCount * 3);
  let seedState = 17;
  const rand = () => {
    seedState = (Math.imul(seedState, 1664525) + 1013904223) >>> 0;
    return seedState / 0x100000000;
  };
  for (let i = 0; i < particleCount; i += 1) {
    const theta = rand() * Math.PI * 2;
    const radius = 9 * (0.55 + rand() * 0.45);
    particlePositions[i * 3] = Math.cos(theta) * radius * 1.4;
    particlePositions[i * 3 + 1] = (rand() - 0.5) * 9 * 0.7;
    particlePositions[i * 3 + 2] = Math.sin(theta) * radius * 0.6 - 2.7;
  }
  const particleGeometry = new THREE.BufferGeometry();
  particleGeometry.setAttribute("position", new THREE.BufferAttribute(particlePositions, 3));
  const particleMaterial = new THREE.PointsMaterial({
    size: 0.34,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.42,
    depthWrite: false,
    map: moteTexture,
  });
  const particles = new THREE.Points(particleGeometry, particleMaterial);
  scene.add(particles);

  // -- sizing -----------------------------------------------------------------
  let width = 0;
  let height = 0;
  let visible = true;

  const resize = () => {
    const rect = canvas.getBoundingClientRect();
    width = Math.max(1, Math.round(rect.width));
    height = Math.max(1, Math.round(rect.height));
    renderer.setPixelRatio(capDpr(window.devicePixelRatio || 1));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  };
  resize();

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(canvas);

  // Rendering pauses entirely when the hero scrolls away. The loop keeps running
  // — one cheap boolean per frame — but issues no draw calls.
  const intersection = new IntersectionObserver(
    ([entry]) => {
      visible = entry?.isIntersecting ?? true;
    },
    { rootMargin: "120px" },
  );
  intersection.observe(canvas);

  // -- colour -----------------------------------------------------------------
  let shown: Atmosphere | null = initial;
  let target: Atmosphere | null = initial;
  let transitionFrom: Atmosphere | null = null;
  let transitionStart = 0;

  const applyAtmosphere = (atmosphere: Atmosphere) => {
    const nearA = new THREE.Color(atmosphere.nearA);
    const nearB = new THREE.Color(atmosphere.nearB);
    const ribbonA = new THREE.Color(atmosphere.ribbonA);
    const ribbonB = new THREE.Color(atmosphere.ribbonB);

    forms.forEach((form) => {
      const from = form.alternate ? nearA : nearB;
      const to = form.alternate ? nearB : nearA;
      form.material.color.copy(from);
      // A trace of emissive keeps a translucent form from going flat where the
      // lambert term bottoms out.
      form.material.emissive.copy(to).multiplyScalar(0.16);
    });

    arcs.forEach((item) => {
      item.material.color.copy(item.alternate ? ribbonA : ribbonB);
    });

    particleMaterial.color.set(atmosphere.particle);
  };

  // -- frame loop -------------------------------------------------------------
  const start = performance.now();
  let frame = 0;
  let frames = 0;
  let draws = 0;
  let motionTime = 0;
  let announced = false;

  const render = (now: number) => {
    frame = requestAnimationFrame(render);
    if (!visible || width === 0 || height === 0) return;

    const t = reduced ? 0 : (now - start) / 1000;
    motionTime = t;
    frames += 1;

    // Colour transition: interpolate toward the new atmosphere rather than
    // cutting, so a theme change reads as the same scene in different light.
    if (target && !shown) shown = target;
    if (transitionFrom && target) {
      const k = Math.min(1, (now - transitionStart) / MOTION.themeTransition);
      shown = k >= 1 ? target : interpolateAtmosphere(transitionFrom, target, k);
      if (k >= 1) transitionFrom = null;
    }
    const atmosphere = shown ?? target;
    if (!atmosphere) return;
    applyAtmosphere(atmosphere);

    const cameraSeconds = MOTION.camera / 1000;
    camera.position.x = Math.sin(t * ((Math.PI * 2) / cameraSeconds)) * 0.9;
    camera.position.y = Math.cos(t * ((Math.PI * 2) / cameraSeconds)) * 0.35;
    camera.lookAt(0, 0, 0);

    forms.forEach((form) => {
      form.mesh.rotation.set(t * form.spin * 0.6, t * form.spin, t * form.spin * 0.4);
    });
    arcs.forEach((item) => {
      item.mesh.rotation.set(0, t * item.spin, t * item.spin * 0.3);
    });
    particles.position.y = Math.sin(t * ((Math.PI * 2) / (MOTION.particles / 1000))) * 0.28;

    renderer.render(scene, camera);
    draws += 1;

    // The caller fades the canvas in only once a real frame exists, so shader
    // compilation is never visible as a hitch.
    if (!announced) {
      announced = true;
      onFirstFrame();
    }
  };

  frame = requestAnimationFrame(render);

  return {
    setAtmosphere: (atmosphere) => {
      if (target && target.nearA !== atmosphere.nearA) {
        transitionFrom = shown ?? target;
        transitionStart = performance.now();
      }
      target = atmosphere;
    },
    dispose: () => {
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      intersection.disconnect();

      /*
        `renderer.dispose()` and nothing more.

        An earlier version forced WebGL context loss here. In development React
        invokes an effect twice, so the sequence was: create the context, lose it,
        create it again — and the second `getContext` returns the *lost* context,
        whose `createShader` returns `null` and whose `shaderSource(null, …)`
        throws. The scene never started, and the failure presented as a probe
        timeout rather than as an error.

        Disposal releases the GPU resources; the context is left to the browser.
      */
      forms.forEach((form) => {
        form.mesh.geometry.dispose();
        form.material.dispose();
      });
      arcs.forEach((item) => {
        item.mesh.geometry.dispose();
        item.material.dispose();
      });
      particleGeometry.dispose();
      particleMaterial.dispose();
      moteTexture.dispose();
      renderer.dispose();
    },
    diagnostics: () => {
      const size = new THREE.Vector2();
      renderer.getDrawingBufferSize(size);
      return {
        frames,
        draws,
        motionTime,
        reduced,
        width: size.x,
        height: size.y,
        atmosphere: shown ?? target,
      };
    },
  };
}
