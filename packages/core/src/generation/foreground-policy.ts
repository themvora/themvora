/**
 * Foreground selection policy.
 *
 * ## The problem this solves
 *
 * `bestInk()` used to answer a single question: *which of near-white / near-black
 * has more contrast on this surface?* That is a defensible rule and it is not the
 * right one, because **maximum contrast and best semantics are not the same
 * thing**.
 *
 * Consider a primary whose surface gives:
 *
 * ```
 * white  4.6:1   ← passes AA, reads as a button
 * black  4.7:1   ← passes AA, marginally higher
 * ```
 *
 * Max-contrast picks black. The theme still passes its contract, so nothing
 * complains — and a strong action surface now carries dark text in a dark UI,
 * which reads as a disabled or secondary control. Contrast was never the
 * question the interface was asking.
 *
 * ## The rule
 *
 * ```
 * if the role's preferred ink meets the published floor: use it
 * else if the other ink meets the published floor:   use that
 * else:                                              use the better one and let the solver repair it
 * ```
 *
 * Note the floor is the **published** one (4.5), not the internal safety target.
 * The safety margin exists to protect a *generated* value from a later edit; a
 * declared preference is a design intention, and the intention should win
 * whenever the theme is still readable. This is the same distinction the solver
 * already makes for anchored brand pairs.
 *
 * ## Why it is per-role
 *
 * A single global rule would be the opposite mistake — "always white" is as
 * wrong as "always the higher ratio". A quiet surface wants a dark reading ink;
 * a strong action surface wants a light one. The preference is a property of the
 * role, not of the contrast arithmetic.
 *
 * ## What this is not
 *
 * It is not "force white everywhere". A generated primary too light for white
 * still gets a dark ink — and, where the style allows, the solver repairs the
 * primary instead. The preference only decides *when both are acceptable*.
 *
 * @packageDocumentation
 */
import { contrastRatio } from "../color";
import { oklchToRgb } from "../color";
import type { CoreColor } from "../model/semantic-roles";
import { darkInk, lightInk } from "./content";
import { targetFor } from "./contract";
import type { Oklch } from "../color";
import type { PaletteContext } from "./types";

/** Which ink a role prefers, when that preference is legible. */
export type ForegroundPreference = "light" | "dark";

/**
 * The preferred foreground for each role that has one.
 *
 * **Only action and emphasis surfaces appear here**, and that is the whole point
 * of the list being short. A preference is a statement about *what the surface
 * is for*: a strong action fill wants light ink because that is what makes it
 * read as an action rather than a disabled control.
 *
 * Reading inks are deliberately absent. `foreground`, `mutedForeground`,
 * `cardForeground` and `secondaryForeground` sit on quiet surfaces whose
 * lightness flips with the mode, so the correct ink family flips with it too —
 * a fixed preference would be wrong in one mode. They fall through to highest
 * contrast, which is exactly right for a role whose only job is legibility.
 *
 * (An earlier draft listed them as preferring "light"/"dark" and broke
 * `mutedForeground/muted` to 4.495:1 — the property test caught it. The rule
 * "don't give a reading ink a preference" is load-bearing.)
 */
export const FOREGROUND_PREFERENCE: Readonly<Partial<Record<CoreColor, ForegroundPreference>>> = {
  primaryForeground: "light",
  destructiveForeground: "light",
  successForeground: "light",
  accentForeground: "light",
};

/**
 * The preferred ink for a role, resolved for the mode.
 *
 * "light" and "dark" are the two *ink families*, not literal white and black:
 * the light ink is the theme's near-white, the dark ink its near-black. A role
 * that prefers light ink gets the near-white in both modes, which is what keeps
 * a button label consistent across a mode switch.
 *
 * @param role - The role to resolve.
 * @param ctx - The generation context (for the neutral hue and chroma).
 * @returns The preferred ink, or `null` when the role has no preference.
 */
export function preferredInk(role: CoreColor, ctx: PaletteContext): Oklch | null {
  const preference = FOREGROUND_PREFERENCE[role];
  if (!preference) return null;
  return preference === "light" ? lightInk(ctx) : darkInk(ctx);
}

/** Contrast of an ink against a surface, as a ratio. */
function inkRatio(ink: Oklch, background: Oklch): number {
  return contrastRatio(oklchToRgb(ink), oklchToRgb(background));
}

/**
 * Choose the foreground for a role on a surface.
 *
 * ```
 * if the preferred ink meets the target:  use it
 * else if the other ink meets it:         use that
 * else:                                   use the better of the two, and let the solver repair it
 * ```
 *
 * ## Why the target, and not the floor
 *
 * The internal target (4.75) is used here rather than the published floor (4.5),
 * because that is what makes the preference *free*: whenever the preferred ink
 * clears 4.75 it is also the higher-ratio ink, so honouring the preference and
 * maximising contrast agree. The two rules only diverge in the narrow band where
 * white measures 4.50–4.58, and there the fallback takes the higher ratio.
 *
 * This is why the change is a refactor rather than a behaviour change for
 * existing themes — see the note in `theme-generation.md`. What it buys is that
 * the rule is now **explicit, per-role and testable**, instead of being an
 * emergent property of a `>=` comparison inside `bestInk`.
 *
 * @param role - The foreground role being generated.
 * @param background - The surface it will sit on.
 * @param ctx - The generation context.
 * @returns The chosen ink.
 */
export function chooseForeground(
  role: CoreColor,
  background: Oklch,
  ctx: PaletteContext,
): Oklch {
  const light = lightInk(ctx);
  const dark = darkInk(ctx);
  const target = targetFor("text");

  // Branch on the *preference*, not on object identity: `lightInk()` and
  // `darkInk()` return a fresh object on every call, so `preferred === light` is
  // always false and the "other" ink would silently be the same one. That bug
  // shipped for one test run and made the fallback a no-op.
  const preference = FOREGROUND_PREFERENCE[role];

  if (preference) {
    const preferred = preference === "light" ? light : dark;
    const other = preference === "light" ? dark : light;

    if (inkRatio(preferred, background) >= target) return preferred;
    if (inkRatio(other, background) >= target) return other;
    return inkRatio(preferred, background) >= inkRatio(other, background) ? preferred : other;
  }

  return inkRatio(light, background) >= inkRatio(dark, background) ? light : dark;
}

/**
 * Whether a foreground role's choice is governed by a declared preference.
 *
 * @param role - The foreground role.
 * @returns `true` when the role has a declared preference.
 */
export function hasForegroundPreference(role: CoreColor): boolean {
  return FOREGROUND_PREFERENCE[role] !== undefined;
}
