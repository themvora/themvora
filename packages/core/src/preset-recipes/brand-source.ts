/**
 * Brand reference data.
 *
 * ## The distinction this module exists to make
 *
 * "Exact brand colours" means **the values the brand publishes in its brand
 * guidelines or design system** — not "every colour currently painted on the
 * brand's website". Those are different things, and conflating them produces a
 * screenshot of one implementation rather than a durable representation of a
 * brand.
 *
 * A modern site has page backgrounds, three surface levels, text, muted text,
 * borders, hover/active/focus states, overlays, gradients and alpha values, in
 * two or more appearances. Sampling that yields a snapshot. Sampling the
 * *published system* yields the brand.
 *
 * ## The pipeline
 *
 * ```
 * official brand / reference palette
 *              ↓
 *      brand identity layer        ← this module: what is exact, and what is not
 *              ↓
 *        semantic-v2               ← generates every non-anchor role
 *              ↓
 *     light / dark adaptation
 *              ↓
 *  contrast + relationship solver  ← may move an anchor, and says so
 *              ↓
 *        Themvora theme
 * ```
 *
 * ## Classification
 *
 * Every reference colour is classified, and the classification decides whether
 * the generator is allowed to touch it:
 *
 * | Class | Meaning |
 * | ----- | ------- |
 * | `ANCHOR` | An exact source value used as identity input. Pinned when it maps to a role. |
 * | `DERIVED` | Generated from the anchors. The source's own value is not used. |
 * | `SEMANTIC` | Seed-independent — status colours are the same in every preset. |
 * | `IMPLEMENTATION` | Specific to the source's own implementation. Recorded, deliberately unused. |
 *
 * **Only `ANCHOR` values need to remain exact.** Everything else is a Themvora
 * semantic interpretation, designed for consistent theming and readability.
 *
 * @packageDocumentation
 */
import type { CoreColor } from "../model/semantic-roles";
import type { PresetMode } from "./recipe";

/**
 * How a reference colour is used by the generator.
 */
export type BrandColorClass =
  /** Exact source value used as identity input; pinned when it maps to a role. */
  | "ANCHOR"
  /** Generated from the anchors — the source's own value is not used. */
  | "DERIVED"
  /** Seed-independent semantic role (status colours). */
  | "SEMANTIC"
  /** Specific to the source's own implementation; recorded, deliberately unused. */
  | "IMPLEMENTATION";

/**
 * Where a brand's reference data came from.
 *
 * `official-guidelines` and `official-design-system` are the strong sources: the
 * brand publishes the values and intends them to be used. `web-reference` is
 * weaker — a value observed on a site, which may change without notice.
 */
export type BrandSourceKind =
  | "official-guidelines"
  | "official-design-system"
  | "web-reference";

/**
 * One colour from a brand's reference material.
 */
export interface BrandReferenceColor {
  /** What the source calls this colour, e.g. `"Blurple"` or `"Background 1"`. */
  label: string;
  /** The exact value, verbatim from the source. */
  color: string;
  /** How the generator treats it. */
  classification: BrandColorClass;
  /** Where the value came from — specific enough to re-check. */
  source: string;
  /** Whether the brand publishes this as part of its identity. */
  official: boolean;
  /**
   * The Themvora role this value anchors, when it is pinned.
   *
   * Present only on `ANCHOR` entries the generator uses directly. An `ANCHOR`
   * without a `themeRole` is still exact — it informs the identity — but it does
   * not map onto a Themvora role.
   */
  themeRole?: CoreColor;
  /** Restrict the anchor to one mode. Omitted means both. */
  mode?: PresetMode;
}

/**
 * The reference material behind a brand preset.
 */
export interface BrandSource {
  /** The brand's name. */
  name: string;
  /** How strong the source is. */
  kind: BrandSourceKind;
  /** Where to re-check the values. */
  sourceUrl: string;
  /** Whether the brand publishes a full token system rather than a few colours. */
  hasDesignSystem: boolean;
  /** Whether the brand publishes light/dark variants of its system. */
  hasLightDark: boolean;
  /** Every reference colour, classified. */
  colors: readonly BrandReferenceColor[];
  /** Caveats — legal, licensing, or fidelity limits. */
  notes?: readonly string[];
}

/** A reference colour that the generator pins. */
export interface ResolvedAnchor {
  /** The Themvora role being pinned. */
  role: CoreColor;
  /** The exact source value. */
  color: string;
  /** What the source calls it. */
  label: string;
}

/**
 * The anchors that apply to one mode.
 *
 * @param source - The brand source.
 * @param mode - The mode to collect anchors for.
 * @returns The anchors pinned in that mode, in declaration order.
 */
export function anchorsFor(source: BrandSource, mode: PresetMode): ResolvedAnchor[] {
  return source.colors
    .filter(
      (color) =>
        color.classification === "ANCHOR" &&
        color.themeRole !== undefined &&
        (color.mode === undefined || color.mode === mode),
    )
    .map((color) => ({
      role: color.themeRole as CoreColor,
      color: color.color,
      label: color.label,
    }));
}

/** Count the reference colours in each class. */
export function classifyCounts(source: BrandSource): Record<BrandColorClass, number> {
  const counts: Record<BrandColorClass, number> = {
    ANCHOR: 0,
    DERIVED: 0,
    SEMANTIC: 0,
    IMPLEMENTATION: 0,
  };
  for (const color of source.colors) counts[color.classification] += 1;
  return counts;
}
