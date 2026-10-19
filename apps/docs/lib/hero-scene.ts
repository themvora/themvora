/**
 * The hero scene's pure logic.
 *
 * Everything here is a plain function of the theme's colours and a clock. No
 * React, no WebGL, no DOM — so the derivation that decides what the scene *looks
 * like* can be read and checked on its own, and `hero-scene.tsx` is left with
 * only the parts that genuinely need a GPU.
 *
 * ## Why the scene derives its own palette
 *
 * The brief is explicit that the scene must not simply flood the background with
 * `primary`. That is the same mistake the docs site was making with
 * `text-primary`: a brand colour asked to do a job it was not chosen for. In
 * Slack dark `primary` on the canvas is **1.42:1** — a background washed in it
 * would be a background washed in the same value as the page.
 *
 * So the atmosphere is *derived*: brand colours are mixed toward the canvas in
 * controlled proportions, which lowers chroma and ties the result to the mode
 * (light or dark) without touching the semantic roles themselves. The theme's
 * tokens are read, never rewritten.
 *
 * @see docs/style-guide.md §13 — semantic tokens describe meaning, not importance
 */

/** The scene's colour set, derived from a theme's semantic tokens. */
export interface Atmosphere {
  /** The large near forms. */
  nearA: string;
  nearB: string;
  /** The mid ribbons. */
  ribbonA: string;
  ribbonB: string;
  /** The far particles. */
  particle: string;
  /** The fog the whole scene is mixed toward. */
  haze: string;
}

/**
 * The colours the derivation reads. Everything else is derived.
 *
 * Every field is optional and may be `undefined`: these come straight out of a
 * theme's token map, and a partially-populated theme is a real case (the
 * repository compiles with `exactOptionalPropertyTypes`). Missing values fall
 * back to the ones that are present rather than to invented colours.
 */
export interface AtmosphereSource {
  background?: string | undefined;
  primary?: string | undefined;
  accent?: string | undefined;
  foreground?: string | undefined;
}

/**
 * How much brand each layer keeps.
 *
 * These are the dials that keep the scene subordinate. `haze` at 0.12 is barely
 * a tint; `nearA` at 0.45 is the most saturated thing in the scene, and it is
 * still mixed more than half toward the canvas.
 */
const BRAND_MIX = {
  haze: 0.12,
  nearA: 0.45,
  nearB: 0.38,
  ribbonA: 0.62,
  ribbonB: 0.52,
  particle: 0.45,
} as const;

/** `#rrggbb` → `[r, g, b]`, or `null` when unparseable. */
export function hexToRgb(hex: string): [number, number, number] | null {
  const m = hex.trim().replace(/^#/, "");
  const full = m.length === 3 ? m.split("").map((c) => c + c).join("") : m;
  if (!/^[0-9a-f]{6}$/i.test(full)) return null;
  const n = parseInt(full, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** `[r, g, b]` (0–255) → `#rrggbb`. */
export function rgbToHex([r, g, b]: [number, number, number]): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  return `#${[r, g, b].map((v) => clamp(v).toString(16).padStart(2, "0")).join("")}`;
}

/**
 * Mix `a` toward `b` by `t` (0 = all `a`, 1 = all `b`).
 *
 * sRGB mixing, not OKLab. That is deliberate: mixing toward the canvas is what
 * reduces chroma here, and sRGB does it slightly faster and more predictably
 * than a perceptual mix would. The scene is atmosphere, not brand colour, so
 * exact hue preservation is not the goal — restraint is.
 */
export function mixHex(a: string, b: string, t: number): string {
  const ra = hexToRgb(a);
  const rb = hexToRgb(b);
  if (!ra || !rb) return a;
  const k = Math.max(0, Math.min(1, t));
  return rgbToHex([
    ra[0] + (rb[0] - ra[0]) * k,
    ra[1] + (rb[1] - ra[1]) * k,
    ra[2] + (rb[2] - ra[2]) * k,
  ]);
}

/**
 * Derive the scene's palette from a theme.
 *
 * @param source - The theme's semantic colours.
 * @returns The atmosphere, or `null` when the source is incomplete.
 */
export function deriveAtmosphere(source: AtmosphereSource): Atmosphere | null {
  const { background, primary, accent, foreground } = source;
  if (!background || !primary) return null;

  // A theme without an accent still gets a second hue: the foreground is the
  // safest neutral to fall back to, and mixing it toward the canvas keeps the
  // pair distinguishable without inventing a colour.
  const second = accent ?? foreground ?? primary;

  return {
    haze: mixHex(primary, background, 1 - BRAND_MIX.haze),
    nearA: mixHex(primary, background, 1 - BRAND_MIX.nearA),
    nearB: mixHex(second, background, 1 - BRAND_MIX.nearB),
    ribbonA: mixHex(primary, background, 1 - BRAND_MIX.ribbonA),
    ribbonB: mixHex(second, background, 1 - BRAND_MIX.ribbonB),
    particle: mixHex(foreground ?? primary, background, 1 - BRAND_MIX.particle),
  };
}

/**
 * Interpolate two atmospheres.
 *
 * Used for the theme transition. The geometry is untouched — only the colours
 * move — which is the whole point: *same structure, different theme*. That is
 * Themvora's idea rendered as a background.
 *
 * @param from - The outgoing atmosphere.
 * @param to - The incoming atmosphere.
 * @param t - 0 = `from`, 1 = `to`.
 */
export function interpolateAtmosphere(from: Atmosphere, to: Atmosphere, t: number): Atmosphere {
  const k = Math.max(0, Math.min(1, t));
  const keys = Object.keys(from) as (keyof Atmosphere)[];
  const out = {} as Atmosphere;
  for (const key of keys) out[key] = mixHex(from[key], to[key], k);
  return out;
}

/**
 * Motion durations, in milliseconds.
 *
 * Long on purpose. The brief's target is that a viewer notices the page feels
 * alive, not that an animation is running — so every cycle is measured in tens
 * of seconds and the phases are mutually prime-ish, which keeps the composition
 * from visibly repeating.
 */
export const MOTION = {
  /** The camera's slow orbit. */
  camera: 34000,
  /** The large forms' drift. */
  forms: 26000,
  /** The ribbons' flow. */
  ribbons: 29000,
  /** The particles' drift. */
  particles: 43000,
  /** A theme change takes this long to settle. */
  themeTransition: 800,
} as const;

/**
 * The largest device pixel ratio the scene will render at.
 *
 * A 3× phone would otherwise render nine times the pixels of a 1× display for a
 * decorative background. Capping at 1.75 keeps the edges clean while holding the
 * frame cost roughly constant across devices.
 */
export const MAX_DPR = 1.75;

/** Clamp a device pixel ratio into the range the scene will render at. */
export function capDpr(dpr: number): number {
  if (!Number.isFinite(dpr) || dpr <= 0) return 1;
  return Math.min(Math.max(dpr, 1), MAX_DPR);
}

/**
 * The protected region the hero content occupies.
 *
 * Normalised to the canvas: `cx`/`cy` are 0–1 from the top-left, `rx`/`ry` are
 * radii as a fraction of the canvas's width and height.
 *
 * The shader fades geometry out inside this ellipse, so the composition can be
 * as large and peripheral as it likes without ever putting a form behind the
 * heading. Readability is the constraint the scene is built around, not
 * something it is checked against afterwards.
 */
export const SAFE_REGION = {
  cx: 0.5,
  cy: 0.46,
  rx: 0.62,
  ry: 0.5,
} as const;

/**
 * How far the safe region's falloff extends past its radius.
 *
 * A hard edge would read as a hole. This gives the fade a skirt so the geometry
 * thins out rather than stopping.
 */
export const SAFE_FALLOFF = 0.55;

/**
 * Whether the scene should render motion.
 *
 * @param reducedMotion - The `prefers-reduced-motion` result.
 * @returns `true` when the scene may animate.
 */
export function shouldAnimate(reducedMotion: boolean): boolean {
  return !reducedMotion;
}
