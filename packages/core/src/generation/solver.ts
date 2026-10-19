/**
 * The contrast solver — generate, check, repair, freeze.
 *
 * theme-generation.md Phase 3. The generator produces candidates; this module
 * guarantees the contract. It never throws and never loops: every search is a
 * fixed-step binary search, and a pair that cannot be satisfied is reported
 * (internally) rather than chased forever.
 *
 * ## What moves, and what does not
 *
 * Constraint priority, highest first:
 *
 * 1. **Semantic meaning** — a destructive surface stays red, success stays green.
 *    Status surfaces are never moved in *hue*.
 * 2. **Brand identity** — for `primary` / `accent` / `destructive` / `success`,
 *    the ink is moved before the surface, and when the surface must move it moves
 *    in lightness only, by the smallest amount that works. It is never replaced
 *    with black or white.
 * 3. **Exact lightness/chroma** — the neutral text pairs move the ink freely,
 *    because the ink is not the identity.
 *
 * @packageDocumentation
 */
import { contrastRatio, oklchToRgb, withLightness, type Oklch } from "../color";
import type { CoreColor } from "../model/semantic-roles";
import { CONTRAST_TARGETS, floorFor, SEMANTIC_PAIRS, targetFor, type SemanticPair } from "./contract";
import { darkInk, lightInk } from "./content";
import type { Palette, PaletteContext } from "./types";

/** Binary-search steps. 28 steps resolve lightness to ~4e-9 — far past what matters. */
const SEARCH_STEPS = 28;
/** Fixed passes over the pair list so cross-pair effects (e.g. `ring`) converge. */
const MAX_PASSES = 2;

/**
 * The margin added to the published floor for pairs that touch an anchor.
 *
 * Deliberately much smaller than {@link CONTRAST_TARGETS}: an anchor is a
 * documented brand choice, so it should not be pushed further than it must be.
 * But solving to the bare floor is not enough either — a pair solved to exactly
 * 4.50 comes back out of the hex round-trip at 4.48 and fails its own check. This
 * is the same reasoning as the border band margin, at the smallest scale that
 * survives quantisation.
 */
const ANCHOR_FLOOR_MARGIN = 0.03;

/** Why a role was adjusted. */
export type AdjustmentReason = "foreground-lightness" | "surface-lightness" | "hierarchy";

/**
 * A single repair, recorded for reports and verbose diagnostics.
 */
export interface Adjustment {
  /** The role that moved. */
  role: CoreColor;
  /** Its value before the repair. */
  from: Oklch;
  /** Its value after the repair. */
  to: Oklch;
  /** Why it moved. */
  reason: AdjustmentReason;
  /** The pair's contrast ratio before. */
  before: number;
  /** The pair's contrast ratio after. */
  after: number;
  /** The ratio the repair was aiming for. */
  target: number;
}

/** A pair the solver could not bring to target. Reported, never thrown. */
export interface UnsatisfiedConstraint {
  /** The pair. */
  pair: SemanticPair;
  /** The best ratio achieved. */
  ratio: number;
  /** The ratio required. */
  target: number;
}

/**
 * Options for {@link solvePalette}.
 */
export interface SolveOptions {
  /**
   * Roles pinned to an exact brand value.
   *
   * A pair that touches an anchor is solved to the **published floor**, not the
   * internal margin. The margin exists so a *generated* value survives a later
   * edit; an anchor is a deliberate, documented choice, and moving it when it
   * already clears AA would trade brand fidelity for nothing.
   *
   * Concretely: Discord's Blurple carries white text at 4.61:1, which passes the
   * published 4.5 floor but misses the internal 4.75 margin. Without this, the
   * solver would shift Blurple; with it, Blurple ships exactly as Discord
   * publishes it.
   */
  anchoredRoles?: ReadonlySet<CoreColor>;
}

/** The solver's output. */
export interface SolveResult {
  /** The repaired palette. */
  palette: Palette;
  /** Every repair made, in order. */
  adjustments: Adjustment[];
  /** Pairs that could not be satisfied. Empty in normal operation. */
  unsatisfied: UnsatisfiedConstraint[];
}

/** The contrast ratio between two colors, treated as foreground/background. */
function ratio(a: Oklch, b: Oklch): number {
  return contrastRatio(oklchToRgb(a), oklchToRgb(b));
}

/** Whether a pair already meets a target. */
function passes(a: Oklch, b: Oklch, target: number): boolean {
  return ratio(a, b) >= target;
}

/** Surfaces whose hue carries brand or semantic meaning and must be preserved. */
const BRAND_SURFACES: ReadonlySet<CoreColor> = new Set([
  "primary",
  "accent",
  "destructive",
  "success",
]);

type PairKind = "ink" | "brand" | "ui";

function pairKind(pair: SemanticPair): PairKind {
  if (pair.requirement === "ui") return "ui";
  if (BRAND_SURFACES.has(pair.background)) return "brand";
  return "ink";
}

/**
 * Move `color` away from `reference` in lightness until the pair meets `target`,
 * stopping at the *closest* lightness that works.
 *
 * Contrast is 1 when the two lightnesses are equal and rises monotonically as
 * they separate, so the search is anchored at the crossover (`reference.l`) and
 * walks toward the extreme. Anchoring at the crossover rather than at `color.l`
 * is what keeps the search monotonic when `color` starts on the wrong side.
 */
function solveAway(color: Oklch, reference: Oklch, target: number): Oklch {
  if (passes(color, reference, target)) return color;

  const goDark = reference.l > 0.5;
  const bound = goDark ? 0 : 1;
  const anchor = goDark ? Math.min(color.l, reference.l) : Math.max(color.l, reference.l);

  if (passes(withLightness(color, anchor), reference, target)) {
    return withLightness(color, anchor);
  }
  if (!passes(withLightness(color, bound), reference, target)) {
    // Even the extreme cannot reach the target; hand back the best available.
    return withLightness(color, bound);
  }

  let fail = anchor;
  let pass = bound;
  for (let i = 0; i < SEARCH_STEPS; i += 1) {
    const mid = (fail + pass) / 2;
    if (passes(withLightness(color, mid), reference, target)) pass = mid;
    else fail = mid;
  }
  return withLightness(color, pass);
}

/**
 * Pure white — the maximum-headroom light ink.
 *
 * Used only on an anchored surface, where the goal is to preserve the brand's
 * exact colour. The generated themes use a hue-tinted near-white instead, which
 * is a deliberate design choice, but it costs ratio: on Discord's Blurple the
 * tinted ink measures 4.49 where pure white measures 4.61. The tint would
 * therefore force a nudge to an anchor that already cleared AA — trading brand
 * fidelity for a stylistic tint on the button label.
 */
const PURE_WHITE: Oklch = { l: 1, c: 0, h: 0 };

/** Near-black, the maximum-headroom dark ink. The counterpart to {@link PURE_WHITE}. */
const NEAR_BLACK: Oklch = { l: 0.18, c: 0, h: 0 };

/**
 * Solve a brand pair: prefer leaving the surface alone, and when it must move,
 * move it by the least amount for the ink that costs the least.
 *
 * @param anchored - Whether the surface is pinned to a brand value. When it is,
 *   the ink candidates are the maximum-headroom ones, so the solver has the best
 *   chance of leaving the anchor untouched.
 */
function solveBrandPair(
  surface: Oklch,
  ctx: PaletteContext,
  target: number,
  anchored = false,
): { surface: Oklch; foreground: Oklch } {
  const light = anchored ? PURE_WHITE : lightInk(ctx);
  const dark = anchored ? NEAR_BLACK : darkInk(ctx);

  if (passes(light, surface, target)) return { surface, foreground: light };
  if (passes(dark, surface, target)) return { surface, foreground: dark };

  const movedForLight = solveAway(surface, light, target);
  const movedForDark = solveAway(surface, dark, target);

  const costLight = Math.abs(movedForLight.l - surface.l);
  const costDark = Math.abs(movedForDark.l - surface.l);

  return costLight <= costDark
    ? { surface: movedForLight, foreground: light }
    : { surface: movedForDark, foreground: dark };
}

/**
 * Keep the content hierarchy intact after repair.
 *
 * Repair only ever moves an ink *away* from its surface, which in practice
 * preserves the order — but "in practice" is not a guarantee, so it is enforced.
 * `mutedForeground` must stay quieter than `foreground`, and this runs after the
 * ratio work so it can never undo it.
 */
function enforceHierarchy(
  palette: Palette,
  ctx: PaletteContext,
  adjustments: Adjustment[],
): void {
  const isLight = ctx.mode === "light";
  const targets: Array<{ weaker: CoreColor; stronger: CoreColor; surface: CoreColor }> = [
    { weaker: "secondaryForeground", stronger: "foreground", surface: "secondary" },
    { weaker: "mutedForeground", stronger: "foreground", surface: "muted" },
  ];

  for (const { weaker, stronger, surface } of targets) {
    const weak = palette[weaker];
    const strong = palette[stronger];
    const violated = isLight ? weak.l < strong.l : weak.l > strong.l;
    if (!violated) continue;

    const corrected = withLightness(weak, isLight ? strong.l + 0.04 : strong.l - 0.04);
    palette[weaker] = corrected;
    adjustments.push({
      role: weaker,
      from: weak,
      to: corrected,
      reason: "hierarchy",
      before: ratio(weak, palette[surface]),
      after: ratio(corrected, palette[surface]),
      target: targetFor("text"),
    });
  }
}

/**
 * Solve every pair in the contract.
 *
 * @param palette - The candidate palette from the generators.
 * @param ctx - The generation context.
 * @returns The repaired palette, the repairs made, and any pair left unsatisfied.
 */
export function solvePalette(
  palette: Palette,
  ctx: PaletteContext,
  options: SolveOptions = {},
): SolveResult {
  const anchored = options.anchoredRoles;

  /** Anchored pairs are held to the published floor; everything else to the margin. */
  const targetOf = (pair: SemanticPair): number =>
    anchored !== undefined &&
    (anchored.has(pair.foreground) || anchored.has(pair.background))
      ? floorFor(pair.requirement) + ANCHOR_FLOOR_MARGIN
      : targetFor(pair.requirement);

  const adjustments: Adjustment[] = [];
  let current: Palette = { ...palette };

  for (let pass = 0; pass < MAX_PASSES; pass += 1) {
    for (const pair of SEMANTIC_PAIRS) {
      const target = targetOf(pair);
      const foreground = current[pair.foreground];
      const background = current[pair.background];
      const before = ratio(foreground, background);
      if (before >= target) continue;

      const next = { ...current };

      if (pairKind(pair) === "brand") {
        const solved = solveBrandPair(
          background,
          ctx,
          target,
          anchored?.has(pair.background) ?? false,
        );
        if (solved.surface !== background) {
          next[pair.background] = solved.surface;
          adjustments.push({
            role: pair.background,
            from: background,
            to: solved.surface,
            reason: "surface-lightness",
            before,
            after: ratio(solved.foreground, solved.surface),
            target,
          });
        }
        if (solved.foreground !== foreground) {
          adjustments.push({
            role: pair.foreground,
            from: foreground,
            to: solved.foreground,
            reason: "foreground-lightness",
            before,
            after: ratio(solved.foreground, solved.surface),
            target,
          });
        }
        next[pair.foreground] = solved.foreground;
      } else {
        const moved = solveAway(foreground, background, target);
        next[pair.foreground] = moved;
        adjustments.push({
          role: pair.foreground,
          from: foreground,
          to: moved,
          reason: "foreground-lightness",
          before,
          after: ratio(moved, background),
          target,
        });
      }

      current = next;
    }
  }

  enforceHierarchy(current, ctx, adjustments);

  const unsatisfied: UnsatisfiedConstraint[] = [];
  for (const pair of SEMANTIC_PAIRS) {
    const target = targetOf(pair);
    const achieved = ratio(current[pair.foreground], current[pair.background]);
    if (achieved < target) unsatisfied.push({ pair, ratio: achieved, target });
  }

  return { palette: current, adjustments, unsatisfied };
}
