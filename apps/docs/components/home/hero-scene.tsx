"use client";

import { useEffect, useMemo, useRef } from "react";
import { useTheme } from "@themvora/next/client";

import { deriveAtmosphere, type Atmosphere } from "../../lib/hero-scene";
import { createHeroScene, type HeroSceneHandle, type ThreeModule } from "../../lib/hero-three";

/**
 * The hero's 3D semantic colour field — the progressive-enhancement wrapper.
 *
 * ## The load order, and why
 *
 * The hero must be complete and correct before any of this exists. So:
 *
 * | t | what is on screen | what is loading |
 * | - | ----------------- | --------------- |
 * | 0 | `hero-aurora` + `hero-orb` — the CSS poster | nothing yet |
 * | first paint | the same poster, still | the page's own JS |
 * | idle | the same poster, still | the `three` chunk, via `import()` |
 * | first 3D frame | the canvas, crossfading in over ~900 ms | — |
 *
 * Two consequences matter:
 *
 * **The canvas is mounted from the start.** It is a stable layer with a fixed
 * size, so there is no layout shift when the scene arrives and nothing to
 * re-mount. What changes is its opacity.
 *
 * **`three` is never in the critical bundle.** It is imported dynamically, so the
 * ~150 kB gzipped it costs is paid after the hero has already painted. Putting it
 * in the initial JS to shave the visual delay would make the page's actual
 * startup heavier to make one background appear sooner — the wrong trade.
 *
 * ## Why the poster is CSS rather than a raster image
 *
 * A pre-rendered poster would need one raster per theme *per mode*, and would be
 * a stale image the moment a token changed. The CSS poster is drawn in
 * `--theme-color-*`, so it is:
 *
 * - **instant** — it is in the first stylesheet, with the first paint;
 * - **theme-correct in both modes**, with no variant matrix;
 * - **correct during a theme switch that happens before WebGL loads**, which is
 *   the case a raster poster handles worst: it would show the *old* theme until
 *   the new one had been fetched.
 *
 * It is a soft abstract composition, so CSS expresses it exactly. A raster poster
 * would earn its place for a scene with structure CSS cannot draw — this one does
 * not have any.
 *
 * ## What each degraded state looks like
 *
 * - **No WebGL, or the chunk fails to load** — the canvas never becomes visible
 *   and the poster *is* the hero. Nothing is missing.
 * - **`prefers-reduced-motion`** — the scene renders its full composition with
 *   the camera and every drift frozen at `t = 0`. A static image, not a blank.
 * - **Theme switched before WebGL loads** — the poster has already followed it
 *   (it reads the live CSS variables), and the scene is built from the current
 *   theme, so it fades in already correct rather than flashing the old palette.
 */
export function HeroScene({ className = "" }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const handleRef = useRef<HeroSceneHandle | null>(null);
  const { theme } = useTheme();

  const colors = (theme?.tokens?.colors ?? {}) as Record<string, string | undefined>;
  const target = useMemo(
    () =>
      deriveAtmosphere({
        background: colors.background,
        primary: colors.primary,
        accent: colors.accent,
        foreground: colors.foreground,
      }),
    [colors.background, colors.primary, colors.accent, colors.foreground],
  );

  /**
   * The atmosphere the scene should be showing.
   *
   * A ref as well as the prop, because the scene may be built *after* a theme has
   * already been chosen — it has to start from the current one, not from whatever
   * was current when the module first evaluated.
   */
  const targetRef = useRef<Atmosphere | null>(target);

  useEffect(() => {
    targetRef.current = target;
    if (target) handleRef.current?.setAtmosphere(target);
  }, [target]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let disposed = false;
    let handle: HeroSceneHandle | null = null;

    void (async () => {
      let THREE: ThreeModule;
      try {
        // The code-split boundary. Everything above this line has already
        // painted; everything below is paid for out of the time after it.
        THREE = await import("three");
      } catch {
        // The chunk did not load. The poster stays and the hero is complete.
        return;
      }
      if (disposed) return;

      try {
        handle = createHeroScene(THREE, canvas, targetRef.current, () => {
          // Fade in only once a real frame exists, so shader compilation is
          // never presented as a hitch.
          canvas.dataset.ready = "true";
        });
      } catch {
        // No WebGL. Same outcome: the poster is the hero.
        return;
      }

      if (disposed) {
        handle.dispose();
        return;
      }

      handleRef.current = handle;
      if (targetRef.current) handle.setAtmosphere(targetRef.current);

      /*
        A development-only diagnostic hook.

        A canvas cannot be checked the way the rest of this repository is checked
        — there is no DOM to query and no ratio to assert. Rather than weaken the
        gate to "the canvas exists", the scene publishes the few facts that are
        actually meaningful. Stripped in production.
      */
      if (process.env.NODE_ENV !== "production") {
        (window as unknown as Record<string, unknown>).__tvHeroScene = {
          get frames() { return handleRef.current?.diagnostics().frames ?? 0; },
          get draws() { return handleRef.current?.diagnostics().draws ?? 0; },
          get motionTime() { return handleRef.current?.diagnostics().motionTime ?? 0; },
          get reduced() { return handleRef.current?.diagnostics().reduced ?? false; },
          get size() {
            const d = handleRef.current?.diagnostics();
            return { width: d?.width ?? 0, height: d?.height ?? 0 };
          },
          get atmosphere() { return handleRef.current?.diagnostics().atmosphere ?? null; },
          /** Whether the canvas has been crossfaded in. */
          get ready() { return canvas.dataset.ready === "true"; },
        };
      }
    })();

    return () => {
      disposed = true;
      handle?.dispose();
      handleRef.current = null;
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      data-hero-scene
      aria-hidden
      // The opacity is driven by `data-ready`, not by React state: the fade is a
      // one-shot CSS transition and does not need a render to run.
      className={`hero-scene-canvas pointer-events-none absolute inset-0 h-full w-full ${className}`}
    />
  );
}

export default HeroScene;
