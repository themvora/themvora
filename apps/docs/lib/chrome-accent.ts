import { getContrastRatio, type ThemeDefinition } from "@themvora/core";

/**
 * The colour the docs site paints its own furniture in.
 *
 * ## Why this is not simply `--theme-color-primary`
 *
 * `primary` is the theme's *action fill*. In a generated theme it is solved to
 * stand off the canvas, so it doubles as a mark colour and everything here used
 * to read it directly. An **anchored** brand fill is a different thing: it is
 * the brand's published colour, and some brands are too dark to stand off a
 * near-black page. Slack's aubergine is `#4a154b` — 1.42:1 against its own
 * `slack-dark` canvas. Painting the logo mark, the TOC rail, the active nav
 * link, the code-block syntax roles and the scrollbar in it makes them
 * effectively invisible.
 *
 * That is brand fidelity working as designed, not a defect to repair in the
 * generator — `auditActionProminence` in `@themvora/core` reports exactly this
 * and is deliberately not allowed to fail it. So the fix belongs here, in the
 * consumer: the same conclusion `scrollbar/thumb-color.ts` reaches for the
 * thumb, and the same one the header and wordmark already reach by painting
 * themselves in `foreground`.
 *
 * ## The rule
 *
 * Candidates are tried in identity order — `primary`, `accent`, `foreground` —
 * and the first that clears the non-text floor against the canvas wins.
 * `primary` is a preference, not a promise; `foreground` is the guaranteed
 * floor, because `foreground` on `background` is a required text pair in every
 * shipped theme.
 *
 * ## Only anchored fills are corrected
 *
 * The correction applies **only** to a theme that pins `primary` to a brand
 * anchor (`meta.generation.anchored`). That is the one case where a fill below
 * the floor is correct behaviour rather than a bug: the colour is the brand's
 * published value and the generator is not allowed to move it. A *generated*
 * fill that falls below the floor is a different problem with a different
 * owner — `dark-primary-band.test.ts` asserts it does not happen — and this
 * module must not paper over it.
 *
 * The gate also keeps the blast radius honest: of the ten anchored brand
 * themes, exactly one (`slack-dark`, 1.42:1) needs an override. Every other
 * theme in the catalogue — anchored or not, light or dark — resolves
 * `--docs-accent` to its own `primary`, so its rendering is byte-for-byte what
 * it was before this variable existed.
 *
 * The floor is WCAG 2.1 AA for a non-text affordance (3:1), the same value as
 * `ACTION_PROMINENCE_FLOOR` and `THUMB_CONTRAST_FLOOR`. A reading-text floor
 * (4.5:1) is deliberately *not* used here: it would reject themes whose
 * `primary` reads perfectly well as a mark but not as small print, and repaint
 * them near-black for no gain. This is a mark colour — the brand carried beside
 * the text, not the text itself — which is the distinction `hero-accent`
 * already documents.
 *
 * ## What this is not
 *
 * It never mutates the theme. `--theme-color-primary` stays exactly as the
 * preset defines it, so the preset pages keep showing the real swatch and the
 * contrast audit keeps reporting the real number. Only the docs chrome moves.
 *
 * ## Why the chrome is corrected as a whole
 *
 * An earlier revision split this into a corrected `--docs-mark` for four
 * surfaces and left the rest of the chrome on the raw `primary`, on the theory
 * that navigation should carry the brand even when it is dim. Measured on
 * `slack-dark`, that made the active sidebar link indistinguishable: a 1.42:1
 * fill at 12% opacity and a 1.42:1 inset bar are not a highlight, and the item
 * was left identifiable only by its font weight. A highlight that cannot be
 * seen is not brand fidelity — it is a control the reader cannot find. The
 * correction therefore applies to the whole chrome, which is still exactly one
 * theme out of the catalogue.
 */

/** The non-text floor the chrome accent must clear against the canvas. */
export const CHROME_ACCENT_FLOOR = 3;

/**
 * The roles an accent may be drawn from, in preference order.
 *
 * Brand identity first, the reading colour last as the guaranteed floor.
 */
export const CHROME_ACCENT_CANDIDATES = [
  "primary",
  "accent",
  "foreground",
] as const;

const HEX6 = /^#?[0-9a-f]{6}$/i;

function isHex(value: unknown): value is string {
  return typeof value === "string" && HEX6.test(value.trim());
}

/**
 * Whether the theme pins `primary` to a brand anchor.
 *
 * @see ActionProminence in `@themvora/core` — the same flag, read for the same
 *   reason: it separates "the brand is the brand" from "the generator drifted".
 */
function hasAnchoredPrimary(theme: ThemeDefinition): boolean {
  return (theme.meta?.generation?.anchored ?? []).includes("primary");
}

/**
 * Resolve the accent for one theme.
 *
 * @param theme - The theme to read the candidates from.
 * @returns A `#rrggbb` colour, or `null` when the theme carries no usable
 *   colour roles at all.
 */
export function resolveChromeAccent(theme: ThemeDefinition): string | null {
  const colors = (theme.tokens?.colors ?? {}) as Record<string, unknown>;
  const canvas = colors.background;

  // No canvas to measure against: there is nothing to be legible *on*, so the
  // authored value stands rather than being second-guessed.
  if (!isHex(canvas)) {
    return isHex(colors.primary) ? colors.primary : null;
  }

  // A generated fill below the floor is not this module's to correct — see the
  // header. The authored value stands.
  if (!hasAnchoredPrimary(theme)) {
    return isHex(colors.primary) ? colors.primary : null;
  }

  for (const role of CHROME_ACCENT_CANDIDATES) {
    const candidate = colors[role];
    if (!isHex(candidate)) continue;
    if (getContrastRatio(candidate, canvas) >= CHROME_ACCENT_FLOOR) {
      return candidate;
    }
  }

  // Unreachable for a well-formed theme: `foreground` on `background` clears
  // 4.5:1 in every shipped theme, so the chain always resolves above. Return
  // the authored `primary` anyway rather than inventing a colour that belongs
  // to no theme.
  return isHex(colors.primary) ? colors.primary : null;
}

/**
 * Build the stylesheet that binds `--docs-accent` per theme.
 *
 * Only themes whose `primary` fails the floor get a rule — every other theme
 * resolves `--docs-accent` to `var(--theme-color-primary)` and needs nothing
 * emitted.
 *
 * One selector, bare attribute, because that is the one shape that covers both
 * places a theme is applied: `<html>` and a **scoped** theme container, which
 * the scoped adapter stamps with the same attribute. The rule wins without
 * out-specifying the default in `globals.css` because that default lives in
 * `@layer base` and this sheet is unlayered — see the comment there.
 *
 * @param themes - The themes the site ships.
 * @returns CSS text, or `""` when no theme needs correcting.
 */
export function buildChromeAccentCss(
  themes: readonly ThemeDefinition[],
): string {
  const rules: string[] = [];

  for (const theme of themes) {
    const accent = resolveChromeAccent(theme);
    const primary = (theme.tokens?.colors as Record<string, unknown> | undefined)
      ?.primary;

    // Nothing to say when the accent *is* the primary: the default resolves to
    // it, and emitting an identical rule would only bloat the sheet.
    if (!accent || accent === primary) continue;

    rules.push(`[data-theme="${theme.name}"]{--docs-accent:${accent}}`);
  }

  return rules.join("");
}
