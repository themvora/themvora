/**
 * The contrast contract — one central source of truth for *which* role pairs
 * must be readable and *how readable*.
 *
 * Both the generator's solver (Phase 3) and the theme validator read this, so
 * "the generator's own constraints" and "the published guarantee" cannot drift
 * apart. theme-generation.md §1: accessibility is part of generation, not a
 * post-generation report.
 *
 * ## Border, input and ring are three different things
 *
 * They were originally lumped together as "UI roles held to 3:1". They are not
 * the same requirement, and treating them as one forces the border to become a
 * near-black stroke to pass:
 *
 * - **`input` is an interactive boundary.** If its border is the only thing
 *   identifying the field, it must clear the 3:1 non-text gate against whatever
 *   it sits on. It is a contrast pair.
 * - **`ring` is a focus indicator.** It must be visible against every surface a
 *   focusable element can sit on. It is a contrast pair against each of them.
 * - **`border` is decoration.** It must be *visible* and *subordinate*, not
 *   3:1. Holding it to the non-text gate is what turns a hairline into charcoal.
 *   It is a relationship constraint, not a contrast pair — see
 *   `relationships.DEFAULT_RELATIONSHIP_THRESHOLDS`.
 *
 * @packageDocumentation
 */
import type { CoreColor } from "../model/semantic-roles";

/**
 * The public contract, as documented. WCAG 2.1 AA.
 */
export const DEFAULT_CONTRAST_CONTRACT = {
  /** Normal text. */
  text: 4.5,
  /** Large text (≥18.66px bold or ≥24px). */
  largeText: 3,
  /** Non-text UI affordances: interactive boundaries, focus rings, indicators. */
  ui: 3,
} as const;

/**
 * Internal **safety margins**.
 *
 * Generated themes deliberately overshoot the published floor. A theme solved to
 * exactly 4.50 fails the moment a downstream override nudges a token, and
 * rounding at the hex boundary can shave the last hundredth. Targeting ~4.75 /
 * ~3.2 costs nothing visually and makes the guarantee survive one small edit.
 *
 * These are internal: the *published* contract stays 4.5 / 3 / 3.
 */
export const CONTRAST_TARGETS = {
  /** Solve text pairs to at least this ratio. */
  text: 4.75,
  /** Solve UI pairs to at least this ratio. */
  ui: 3.2,
} as const;

/** Which contract threshold a pair is held to. */
export type ContrastRequirement = "text" | "ui";

/**
 * A role pair the generator must keep readable, and the requirement it is held to.
 *
 * `foreground` is read *on* `background`; the requirement applies to that pair.
 */
export interface SemanticPair {
  /** The role that carries the text/indicator. */
  foreground: CoreColor;
  /** The role it is read against. */
  background: CoreColor;
  /** Which threshold applies. */
  requirement: ContrastRequirement;
}

/**
 * The surfaces a focus ring is promised to be visible against.
 *
 * These are exactly the *neutral* surfaces a focusable control can sit on. A
 * single ring colour can clear 3:1 against all of them because they all sit on
 * the same side of the lightness axis in a given mode — light in light mode,
 * dark in dark mode.
 *
 * ## Why `primary` / `destructive` / `accent` are deliberately not here
 *
 * It is arithmetically impossible, not merely inconvenient. Consider light mode:
 * the canvas sits near luminance `0.90`, and a mid-lightness brand fill near
 * `0.075`. For a ring to clear 3.2:1 against both it would need a luminance `r`
 * with
 *
 * ```
 * (0.90 + 0.05) / (r + 0.05) ≥ 3.2   →  r ≤ 0.247
 * (r + 0.05) / (0.075 + 0.05) ≥ 3.2  →  r ≥ 0.350
 * ```
 *
 * — no such `r` exists. A component that draws a focus ring *on* a coloured
 * action surface must use a ring offset, or an inverse ring variant. Themvora
 * promises the ring against the canvas and its surfaces, and says so here rather
 * than pretending otherwise.
 */
export const FOCUS_SURFACES: readonly CoreColor[] = [
  "background",
  "card",
  "popover",
  "muted",
  "secondary",
];

/**
 * Every pair the generator solves. Order matters only for reporting.
 *
 * `border` is intentionally absent: it is enforced by the relationship checks as
 * "visible but subordinate", not by the contrast solver. See the module docs.
 */
export const SEMANTIC_PAIRS: readonly SemanticPair[] = [
  // -- text -------------------------------------------------------------------
  { foreground: "foreground", background: "background", requirement: "text" },
  { foreground: "cardForeground", background: "card", requirement: "text" },
  { foreground: "popoverForeground", background: "popover", requirement: "text" },
  { foreground: "primaryForeground", background: "primary", requirement: "text" },
  { foreground: "secondaryForeground", background: "secondary", requirement: "text" },
  { foreground: "mutedForeground", background: "muted", requirement: "text" },
  { foreground: "accentForeground", background: "accent", requirement: "text" },
  { foreground: "destructiveForeground", background: "destructive", requirement: "text" },
  { foreground: "successForeground", background: "success", requirement: "text" },

  // -- input: an interactive boundary, on the canvas and inside elevated surfaces
  { foreground: "input", background: "background", requirement: "ui" },
  { foreground: "input", background: "card", requirement: "ui" },

  // -- ring: a focus indicator, against every surface a control can sit on
  ...FOCUS_SURFACES.map(
    (surface): SemanticPair => ({ foreground: "ring", background: surface, requirement: "ui" }),
  ),
] as const;

/** The internal target ratio for a requirement. */
export function targetFor(requirement: ContrastRequirement): number {
  return requirement === "ui" ? CONTRAST_TARGETS.ui : CONTRAST_TARGETS.text;
}

/** The published floor for a requirement. */
export function floorFor(requirement: ContrastRequirement): number {
  return requirement === "ui" ? DEFAULT_CONTRAST_CONTRACT.ui : DEFAULT_CONTRAST_CONTRACT.text;
}
