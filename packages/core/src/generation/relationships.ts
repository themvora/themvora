/**
 * Visual relationship checks — enforced during generation, not merely reported.
 *
 * Contrast answers "can I read it?". These checks answer "does the system hold
 * together?": are the surfaces distinguishable, is the border visible but not
 * dominant, does a focused field read as focused, is the accent actually
 * different from the primary, do the status colours stay apart?
 *
 * Every threshold lives in one object ({@link DEFAULT_RELATIONSHIP_THRESHOLDS})
 * so the numbers are reviewable in one place — theme-generation.md Phase 5.
 *
 * ## Why `border` lives here and not in the contrast contract
 *
 * A border is decoration. Holding it to the 3:1 non-text gate (as `input` and
 * `ring` are) forces it to become a near-black stroke, which destroys the
 * surface hierarchy it exists to express. The honest requirement is a *band*:
 * far enough from the surface to be seen, close enough not to dominate, with the
 * hue preserved. That is what this module enforces.
 *
 * @packageDocumentation
 */
import { deltaEOklch, hueDistance, withLightness, type Oklch } from "../color";
import type { CoreColor } from "../model/semantic-roles";
import type { Palette, PaletteContext } from "./types";

/**
 * The numeric thresholds for every relationship check. ΔL values are OKLab
 * lightness differences; ΔE values are OKLab distances; the hue value is degrees.
 */
export interface RelationshipThresholds {
  /** Minimum ΔL between `background` and `card`. */
  backgroundCard: number;
  /** Minimum ΔL between `card` and `popover`. */
  cardPopover: number;
  /** Minimum ΔL between `border` and every surface it separates. */
  borderVisibility: number;
  /** Maximum ΔL between `border` and the canvas — it must not dominate. */
  borderDominance: number;
  /** Minimum ΔE between `input` and `ring` — a focused field must read as focused. */
  inputRingSeparation: number;
  /** Minimum ΔE between `primary` and `background` / `secondary`. */
  primarySeparation: number;
  /** Minimum ΔL between `foreground` and `mutedForeground`. */
  mutedQuieter: number;
  /** Minimum ΔE between `destructive` and `success`. */
  statusSeparation: number;
  /** Minimum hue distance (degrees) between `primary` and `accent`. */
  minAccentHueDistance: number;
  /** Minimum chroma difference between `primary` and `accent`. */
  minAccentChroma: number;
}

/**
 * The defaults. `0.01` ΔL is around the threshold where two adjacent surfaces
 * stop reading as one; the border band is deliberately wide enough to keep a
 * hairline a hairline.
 */
export const DEFAULT_RELATIONSHIP_THRESHOLDS: RelationshipThresholds = {
  backgroundCard: 0.01,
  cardPopover: 0.005,
  borderVisibility: 0.06,
  borderDominance: 0.3,
  inputRingSeparation: 0.1,
  primarySeparation: 0.06,
  mutedQuieter: 0.08,
  statusSeparation: 0.12,
  minAccentHueDistance: 18,
  minAccentChroma: 0.04,
};

/** The surfaces a border can be drawn against. */
export const BORDER_SURFACES: readonly CoreColor[] = ["background", "card", "popover"];

/**
 * Tolerance for threshold comparisons.
 *
 * Lightness values are computed by subtraction and a generator step can land
 * exactly on a threshold — `soft`'s border is `0.955 - 0.06`, which is `0.0599…`
 * in binary floating point. Comparing strictly would flag a border that is
 * *exactly* as visible as required. The tolerance is far below any perceptual
 * difference, so it removes the arithmetic artefact without weakening the rule.
 */
const COMPARISON_EPSILON = 1e-6;

/** A relationship that does not hold. */
export interface RelationshipIssue {
  /** Stable check identifier. */
  check: string;
  /** The roles involved. */
  roles: CoreColor[];
  /** The measured value. */
  value: number;
  /** The threshold it failed. */
  threshold: number;
  /** Human-readable description. */
  message: string;
}

/** A repair made to satisfy a relationship. */
export interface RelationshipAdjustment {
  /** The role that moved. */
  role: CoreColor;
  /** Its value before. */
  from: Oklch;
  /** Its value after. */
  to: Oklch;
  /** The check that required the move. */
  check: string;
}

/**
 * Options for {@link checkRelationships}.
 */
export interface RelationshipCheckOptions {
  /** Overrides for the default thresholds. */
  thresholds?: RelationshipThresholds;
  /**
   * When `true`, `background` / `card` / `popover` are permitted to be flat.
   * No shipped style sets this; it exists because the plan allows a style to opt
   * into a flat surface model explicitly rather than by accident.
   */
  flatSurfaces?: boolean;
}

/**
 * Overshoot applied to the border band.
 *
 * The band edges are targets, not aspirations — a border solved to exactly
 * `0.06` from its surface comes back out of the hex round-trip at `0.0598` and
 * fails its own check. The same reasoning as the `4.75 / 3.2` contrast margins:
 * solve past the line so quantisation cannot put you back behind it.
 */
const BORDER_MARGIN = 0.01;

function lightnessDelta(a: Oklch, b: Oklch): number {
  return Math.abs(a.l - b.l);
}

/**
 * Evaluate every relationship check.
 *
 * @param palette - The palette to check.
 * @param ctx - The generation context.
 * @param options - Threshold overrides and the flat-surface opt-in.
 * @returns Every issue found; empty when the palette holds together.
 */
export function checkRelationships(
  palette: Palette,
  ctx: PaletteContext,
  options: RelationshipCheckOptions = {},
): RelationshipIssue[] {
  const thresholds = options.thresholds ?? DEFAULT_RELATIONSHIP_THRESHOLDS;
  const issues: RelationshipIssue[] = [];
  const isLight = ctx.mode === "light";

  const push = (
    check: string,
    roles: CoreColor[],
    value: number,
    threshold: number,
    message: string,
  ) => issues.push({ check, roles, value, threshold, message });

  if (!options.flatSurfaces) {
    const bgCard = lightnessDelta(palette.background, palette.card);
    if (bgCard < thresholds.backgroundCard) {
      push("surface-separation", ["background", "card"], bgCard, thresholds.backgroundCard,
        "card is not distinguishable from background");
    }

    const cardPopover = lightnessDelta(palette.card, palette.popover);
    if (cardPopover < thresholds.cardPopover) {
      push("surface-separation", ["card", "popover"], cardPopover, thresholds.cardPopover,
        "popover is not distinguishable from card");
    }
  }

  // -- border: visible against every surface it separates, but subordinate ------
  for (const surface of BORDER_SURFACES) {
    const delta = lightnessDelta(palette.border, palette[surface]);
    if (delta < thresholds.borderVisibility - COMPARISON_EPSILON) {
      push("border-visibility", ["border", surface], delta, thresholds.borderVisibility,
        `border is not visible against ${surface}`);
    }
  }

  const borderDominance = lightnessDelta(palette.border, palette.background);
  if (borderDominance > thresholds.borderDominance + COMPARISON_EPSILON) {
    push("border-dominance", ["border", "background"], borderDominance, thresholds.borderDominance,
      "border dominates the surface it separates");
  }

  // -- input / ring: a focused field must read as focused ----------------------
  const inputRing = deltaEOklch(palette.input, palette.ring);
  if (inputRing < thresholds.inputRingSeparation - COMPARISON_EPSILON) {
    push("input-ring-separation", ["input", "ring"], inputRing, thresholds.inputRingSeparation,
      "input and ring are too similar — the focus state will not read");
  }

  // -- primary separation ------------------------------------------------------
  // `primary` is compared against the neutral surfaces it must stand out from.
  // It is *not* compared to `accent` by ΔE: a deliberately low-chroma style can
  // put the two at a small perceptual distance while still being clearly
  // different colours, so accent distinctness is judged on hue or chroma below.
  for (const role of ["background", "secondary"] as const) {
    const distance = deltaEOklch(palette.primary, palette[role]);
    if (distance < thresholds.primarySeparation) {
      push("primary-separation", ["primary", role], distance, thresholds.primarySeparation,
        `primary is not distinguishable from ${role}`);
    }
  }

  // Accent distinctness: a hue difference OR a chroma difference is enough. This
  // is what catches the "primary ≈ accent" collision the plan names.
  const accentHue = hueDistance(palette.primary.h, palette.accent.h);
  const accentChroma = Math.abs(palette.primary.c - palette.accent.c);
  if (accentHue < thresholds.minAccentHueDistance && accentChroma < thresholds.minAccentChroma) {
    push("accent-collision", ["primary", "accent"], accentChroma, thresholds.minAccentChroma,
      "accent is not distinct from primary in hue or chroma");
  }

  const mutedDelta = lightnessDelta(palette.foreground, palette.mutedForeground);
  const ordered = isLight
    ? palette.mutedForeground.l > palette.foreground.l
    : palette.mutedForeground.l < palette.foreground.l;
  if (!ordered || mutedDelta < thresholds.mutedQuieter) {
    push("muted-hierarchy", ["foreground", "mutedForeground"], mutedDelta, thresholds.mutedQuieter,
      "mutedForeground is not clearly quieter than foreground");
  }

  const statusDistance = deltaEOklch(palette.destructive, palette.success);
  if (statusDistance < thresholds.statusSeparation) {
    push("status-separation", ["destructive", "success"], statusDistance, thresholds.statusSeparation,
      "destructive and success are not far enough apart");
  }

  return issues;
}

/**
 * Enforce the relationship checks that are repairable by moving lightness.
 *
 * Only the checks the generator can fix deterministically are repaired here:
 * surface separation, the border band, and input/ring separation. The others are
 * guaranteed by construction (the accent offset guard, the content hierarchy,
 * fixed status hues) and are verified by {@link checkRelationships} rather than
 * patched.
 *
 * Every repair moves **lightness only** — hue and chroma are the colour's
 * identity, and a border that has to become generic charcoal to pass is not a
 * pass. See theme-generation.md Phase 7.4.
 *
 * @param palette - The palette to repair, mutated in place.
 * @param ctx - The generation context.
 * @param thresholds - Overrides for the default thresholds.
 * @returns The repairs made.
 */
export function enforceRelationships(
  palette: Palette,
  ctx: PaletteContext,
  thresholds: RelationshipThresholds = DEFAULT_RELATIONSHIP_THRESHOLDS,
): RelationshipAdjustment[] {
  const adjustments: RelationshipAdjustment[] = [];
  const isLight = ctx.mode === "light";
  /** Direction that moves a surface *away* from the canvas. */
  const outward = isLight ? 1 : -1;

  const separate = (role: CoreColor, reference: Oklch, minimum: number, check: string) => {
    const current = palette[role];
    if (lightnessDelta(current, reference) >= minimum) return;
    const moved = withLightness(current, reference.l + outward * minimum);
    palette[role] = moved;
    adjustments.push({ role, from: current, to: moved, check });
  };

  separate("card", palette.background, thresholds.backgroundCard, "surface-separation");
  separate("popover", palette.card, thresholds.cardPopover, "surface-separation");

  // -- border band -------------------------------------------------------------
  // The border must sit at least `borderVisibility` away from the nearest surface
  // it separates, and no more than `borderDominance` away from the canvas. That
  // defines a band, not a point: a border already inside it is left exactly as
  // generated, so its hue and weight survive.
  {
    const current = palette.border;
    const surfaceLightnesses = BORDER_SURFACES.map((role) => palette[role].l);
    const anchor = isLight ? Math.min(...surfaceLightnesses) : Math.max(...surfaceLightnesses);
    const direction = isLight ? -1 : 1;

    // Nearest the surfaces the border may sit / furthest it may sit from the canvas.
    // Both edges are inset by `BORDER_MARGIN` so the solved value survives the
    // hex round-trip.
    const nearest = anchor + direction * (thresholds.borderVisibility + BORDER_MARGIN);
    const farthest = palette.background.l + direction * (thresholds.borderDominance - BORDER_MARGIN);

    const low = Math.min(nearest, farthest);
    const high = Math.max(nearest, farthest);

    if (current.l < low || current.l > high) {
      // If the band is empty (visibility and dominance conflict), visibility wins:
      // a border nobody can see is worse than one that is a little heavy.
      const target = low > high ? nearest : current.l < low ? low : high;
      const moved = withLightness(current, target);
      palette.border = moved;
      palette.input = withLightness(palette.input, moved.l);
      adjustments.push({ role: "border", from: current, to: moved, check: "border-visibility" });
    }
  }

  // -- input / ring separation -------------------------------------------------
  {
    const current = palette.ring;
    if (deltaEOklch(palette.input, current) < thresholds.inputRingSeparation) {
      // Move the ring away from the input, toward the far side of the canvas.
      const moved = withLightness(current, palette.input.l + (isLight ? -0.12 : 0.12));
      palette.ring = moved;
      adjustments.push({ role: "ring", from: current, to: moved, check: "input-ring-separation" });
    }
  }

  return adjustments;
}
