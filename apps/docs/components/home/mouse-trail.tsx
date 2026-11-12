"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTheme } from "@themvora/next/client";

import { createTrail, type TrailHandle } from "../../lib/mouse-trail";

/**
 * How many tokens feed the trail's gradient. The engine de-duplicates and orders
 * them by hue, so a handful of distinct colours blend better than twenty-one
 * near-neighbours.
 */
const MAX_COLORS = 10;

/** Below this chroma a token is a neutral, and is only used if nothing else is. */
const MIN_CHROMA = 28;

/** `#rgb`, `#rrggbb`, `#rrggbbaa` → `rrggbb`, or `null`. */
function normalizeHex(value: string): string | null {
  let m = value.trim().replace(/^#/, "");
  if (!/^[0-9a-f]+$/i.test(m)) return null;
  if (m.length === 4) m = m.slice(0, 3);
  if (m.length === 8) m = m.slice(0, 6);
  if (m.length === 3)
    m = m
      .split("")
      .map((c) => c + c)
      .join("");
  return m.length === 6 ? m : null;
}

function chromaOf(hex6: string): number {
  const n = parseInt(hex6, 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return Math.max(r, g, b) - Math.min(r, g, b);
}

/**
 * The one place that decides whether this device gets a trail.
 *
 * ## Why the device is disqualified rather than degraded
 *
 * A trail is a pointer effect, so the honest test is not "is this a small
 * screen" but "is there a pointer to trail". Two independent conditions, both of
 * which must hold:
 *
 * - **`min-width: 1024px`** — the tablet/desktop boundary. Below it there is no
 *   room beside the content for a flourish, and the pointer is almost always a
 *   finger.
 * - **`pointer: fine`** — a real cursor. A touchscreen laptop docked to a mouse
 *   passes; the same laptop in tablet mode does not.
 *
 * On top of those, two opt-outs that apply everywhere: `prefers-reduced-motion`
 * and `Save-Data`.
 *
 * The result is used to decide whether the canvas is *rendered at all*, not
 * whether it draws — a device that cannot use the effect should not be carrying
 * a WebGL canvas, its listeners, or its dynamic import.
 */
const DESKTOP_ONLY = "(min-width: 1024px) and (pointer: fine)";

export function useTrailEligible(): boolean {
  const [eligible, setEligible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const desktop = window.matchMedia(DESKTOP_ONLY);
    const still = window.matchMedia("(prefers-reduced-motion: reduce)");
    const nav = navigator as Navigator & { connection?: { saveData?: boolean } };

    const evaluate = () => {
      setEligible(desktop.matches && !still.matches && !nav.connection?.saveData);
    };

    evaluate();

    // Re-evaluate when the window crosses the breakpoint or the visitor changes
    // a system preference, so a resized desktop window gains the trail and a
    // tablet does not.
    desktop.addEventListener("change", evaluate);
    still.addEventListener("change", evaluate);

    return () => {
      desktop.removeEventListener("change", evaluate);
      still.removeEventListener("change", evaluate);
    };
  }, []);

  return eligible;
}

/**
 * The hero's cursor trail.
 *
 * ## Why it is built this way
 *
 * **It is off by default on the devices that cannot afford it.** A finger has no
 * cursor, and a reduced-motion or data-saving visitor has asked for stillness —
 * three reasons to render nothing at all, checked before any work happens.
 *
 * **`three` is not in the bundle.** It is imported when the browser is idle, or
 * on the first pointer move if that comes sooner — so the page's critical path
 * never pays for it, and a visitor who never moves the mouse may never download
 * it.
 *
 * **It belongs to the hero, and only to the hero.** The canvas is an absolutely
 * positioned layer inside the section, not a fixed overlay: the section's own
 * `overflow: hidden` clips it, it scrolls away with the section, it paints
 * *under* the copy and the cards because it comes first in the DOM, and the
 * section's `IntersectionObserver` stops the loop entirely once the hero leaves
 * the viewport. A trail that follows the pointer down the whole page is a
 * distraction; a trail inside the first screen is an invitation.
 *
 * **It follows the theme.** The palette comes from the theme's colour tokens, and
 * the glow is retuned whenever the provider flips the `.dark` class on `<html>`.
 */
export function HeroTrail({ enabled = true }: { enabled?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const handleRef = useRef<TrailHandle | null>(null);
  const pendingRef = useRef<{ x: number; y: number } | null>(null);
  const loadingRef = useRef(false);
  const { theme } = useTheme();

  const colors = useMemo(() => {
    const map = (theme?.tokens?.colors ?? {}) as Record<string, unknown>;

    /*
      Ordered by chroma, not by declaration.

      A token set is mostly neutrals — background, foreground, border, muted —
      and taking the first few would paint the trail in shades of grey. The trail
      is the one place on the page where the theme's *colour* is the point, so
      the saturated tokens are picked first. Neutrals are used only if the theme
      has almost no colour at all, so the trail is never empty.
    */
    const entries: Array<{ hex: string; chroma: number }> = [];
    for (const value of Object.values(map)) {
      if (typeof value !== "string") continue;
      const hex6 = normalizeHex(value);
      if (hex6) entries.push({ hex: `#${hex6}`, chroma: chromaOf(hex6) });
    }

    entries.sort((a, b) => b.chroma - a.chroma);
    const vivid = entries.filter((entry) => entry.chroma >= MIN_CHROMA);
    const pool = vivid.length >= 2 ? vivid : entries;

    return pool.slice(0, MAX_COLORS).map((entry) => entry.hex);
  }, [theme]);

  const colorsRef = useRef(colors);
  colorsRef.current = colors;

  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  useEffect(() => {
    if (typeof window === "undefined") return;
    // A finger has no cursor, and these visitors have asked for stillness.
    if (window.matchMedia("(pointer: coarse)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const nav = navigator as Navigator & {
      connection?: { saveData?: boolean };
    };
    if (nav.connection?.saveData) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    let disposed = false;
    const root = document.documentElement;

    /*
      The canvas's document offset, cached.

      The trail takes canvas-local pixels, and the section moves with the page, so
      every move has to be converted. `getBoundingClientRect()` inside a pointer
      handler would force layout on the busiest path there is; the offset only
      changes when the layout does, so it is measured there and read from
      arithmetic everywhere else.
    */
    let originX = 0;
    let originY = 0;
    let boxW = 0;
    let boxH = 0;

    const measure = () => {
      const rect = canvas.getBoundingClientRect();
      originX = rect.left + window.scrollX;
      originY = rect.top + window.scrollY;
      boxW = rect.width;
      boxH = rect.height;
    };

    const syncMode = () => {
      handleRef.current?.setDark(root.classList.contains("dark"));
    };

    const ensureScene = () => {
      if (handleRef.current || loadingRef.current || disposed) return;
      loadingRef.current = true;
      void (async () => {
        try {
          const THREE = await import("three");
          if (disposed || !canvasRef.current) return;
          handleRef.current = createTrail(
            THREE,
            canvasRef.current,
            colorsRef.current,
            false,
          );
          syncMode();
          handleRef.current.setVisible(enabledRef.current);
          // Anything the pointer did while the chunk was loading is replayed, so
          // the first move is not swallowed.
          const pending = pendingRef.current;
          if (pending) handleRef.current.push(pending.x, pending.y);
        } catch {
          /* no WebGL, or no chunk: the page is complete without it */
        } finally {
          loadingRef.current = false;
        }
      })();
    };

    const onMove = (event: PointerEvent) => {
      // Hybrid laptops report touch through the same events; a finger gets no trail.
      if (event.pointerType === "touch") return;

      const x = event.clientX - originX;
      const y = event.clientY - (originY - window.scrollY);

      // Outside the section: end the stroke rather than emit bodies that the
      // section's `overflow: hidden` would clip away unseen.
      if (x < 0 || y < 0 || x > boxW || y > boxH) {
        pendingRef.current = null;
        handleRef.current?.leave();
        return;
      }

      pendingRef.current = { x, y };
      if (!handleRef.current) {
        ensureScene();
        return;
      }
      handleRef.current.push(x, y);
    };

    // When the pointer leaves the window or the tab loses focus, the next move
    // starts a fresh stroke instead of drawing a line from where it left.
    const onLeave = () => {
      pendingRef.current = null;
      handleRef.current?.leave();
    };

    const onResize = () => {
      measure();
      handleRef.current?.resize();
    };

    measure();

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("resize", onResize);
    window.addEventListener("blur", onLeave);
    root.addEventListener("mouseleave", onLeave);

    // The section's height changes when the code sample does, which a window
    // resize never reports.
    const resizeObserver = new ResizeObserver(onResize);
    resizeObserver.observe(canvas);

    // The loop is only allowed to run while the hero is on screen.
    const intersection = new IntersectionObserver(
      (entries) => {
        handleRef.current?.setVisible(entries[0]?.isIntersecting ?? true);
      },
      { rootMargin: "80px" },
    );
    intersection.observe(canvas);

    // Follow the provider's light/dark switch, so the glow is retuned with it.
    const observer = new MutationObserver(syncMode);
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });

    // Preload while the browser is idle, so the first move is instant without
    // paying for the chunk during load.
    const useIdle = typeof window.requestIdleCallback === "function";
    const idleHandle = useIdle
      ? window.requestIdleCallback(() => ensureScene(), { timeout: 2500 })
      : window.setTimeout(ensureScene, 1200);

    return () => {
      disposed = true;
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("blur", onLeave);
      root.removeEventListener("mouseleave", onLeave);
      resizeObserver.disconnect();
      intersection.disconnect();
      observer.disconnect();
      if (useIdle) window.cancelIdleCallback(idleHandle);
      else window.clearTimeout(idleHandle);
      handleRef.current?.dispose();
      handleRef.current = null;
      loadingRef.current = false;
    };
  }, []);

  useEffect(() => {
    handleRef.current?.setColors(colors);
  }, [colors]);

  /*
    The pause control.

    `setVisible(false)` empties the pool and stops the loop, so pausing costs
    exactly nothing — it is not a hidden render, it is no render. The stroke is
    also ended, so resuming starts a fresh one instead of drawing a line from
    wherever the pointer happened to be.
  */
  useEffect(() => {
    if (!enabled) handleRef.current?.leave();
    handleRef.current?.setVisible(enabled);
  }, [enabled]);

  /*
    Rendered in place, inside the hero section.

    Not portalled and not fixed: the section is the boundary. It is the first
    child of the section's content so every later sibling — the copy, the
    palette, the code panel — paints over it, which is what keeps the beads
    behind the text instead of across it.
  */
  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      /*
        Full width, hero height.

        `left-1/2` + `-translate-x-1/2` + `w-screen` escapes the content column's
        `max-w-6xl` without widening it, so the trail runs edge to edge while the
        copy keeps its measure; the section's `overflow: hidden` trims the
        `w-screen` overshoot on the scrollbar side.

        `h-full`, not `inset-y-0`. A canvas is a *replaced* element: with
        `top`/`bottom` set and `height: auto`, CSS resolves the height from the
        element's intrinsic size — the drawing buffer the renderer just wrote —
        and ignores `bottom`. That fed back on itself, and the canvas grew past
        the block it was supposed to fill, which is what put beads over the
        framework row. A percentage height is resolved against the block and
        cannot drift.
      */
      className={`pointer-events-none absolute top-0 left-1/2 h-full w-screen -translate-x-1/2${
        enabled ? "" : " invisible"
      }`}
    />
  );
}

export default HeroTrail;
