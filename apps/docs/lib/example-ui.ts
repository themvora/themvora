import { CANONICAL_STYLES } from "./frameworks";

/**
 * The one small themed UI the docs show on Quick Start and every framework
 * guide, plus the stylesheet that paints it.
 *
 * ## Why the CSS comes from `frameworks.tsx`
 *
 * The stylesheet is rendered twice: once as the `<style>` element that actually
 * paints the preview, and once as the snippet a reader copies. If those were two
 * files they would drift — the preview would keep working while the snippet
 * rotted, or the reverse — so both come from one string. That string is
 * `CANONICAL_STYLES` in `lib/frameworks.tsx`, the single definition every
 * framework guide renders (and the one the mirror generator can evaluate).
 * `EXAMPLE_CSS` is the preview's name for the same value.
 *
 * ## Which variables are used, and why only these
 *
 * Every colour in the stylesheet is one of the 21 keys `validateTheme`
 * requires (`REQUIRED_COLOR_KEYS` in `packages/core/src/validate-theme.ts`),
 * so any theme that passes validation emits it. The document rule uses exactly
 * the two foundational colours — `background` and `foreground` — and nothing
 * else.
 *
 * Nothing here reads a spacing, shadow or typography token as a requirement:
 * those groups are emitted only when a theme defines them, so a valid
 * hand-written theme may emit no `--theme-typography-*` at all. Where an
 * optional token improves the result (corner radius, shadow) it is read through
 * `var(…, fallback)` so its absence changes the look, not the layout.
 * Typography is ordinary CSS — the font is inherited from the application and
 * the line height is a plain value.
 *
 * The `theme-color-` prefix and the camelCase key names are the emitter's own —
 * `themeToCSSVariables()` in `packages/core/src/css.ts` writes
 * `` `--${prefix}${key}` `` with the key verbatim, so `cardForeground` becomes
 * `--theme-color-cardForeground`. It is not slugified on the way out.
 *
 * @see {@link EXAMPLE_CLASSES}
 * @see {@link EXAMPLE_VARIABLES}
 */

/**
 * The classes the example stylesheet defines and the markup uses.
 *
 * Kept as data so the guide prose can name them without repeating string
 * literals, and so a selector can be checked against the markup it is meant to
 * match.
 */
export const EXAMPLE_CLASSES = [
  "themvora-example-card",
  "themvora-example-header",
  "themvora-example-title",
  "themvora-example-status",
  "themvora-example-description",
  "themvora-example-meta",
  "themvora-example-button",
] as const;

/**
 * The stylesheet for the example, as shown to readers and applied to the
 * preview.
 *
 * The `body` rule contains exactly the two foundational document colours and
 * no typography token. Colours in the component rules come from required
 * tokens only. Radius and shadow are optional, so they carry fallbacks.
 * Typography is inherited rather than read from a `--theme-typography-*`
 * variable — the font is the application's, and the line height is an ordinary
 * value.
 */
export const EXAMPLE_CSS = CANONICAL_STYLES;

/**
 * The semantic variables the example consumes, in the order a reader meets them.
 *
 * Every entry is a required colour token, so this list doubles as the answer to
 * "what does my theme have to define for this component to look right?" — it is
 * the same 21 keys `validateTheme` enforces, narrowed to the ones this component
 * uses.
 */
export const EXAMPLE_VARIABLES = [
  {
    variable: "--theme-color-background",
    token: "colors.background",
    role: "Document background",
  },
  {
    variable: "--theme-color-foreground",
    token: "colors.foreground",
    role: "Document foreground",
  },
  {
    variable: "--theme-color-card",
    token: "colors.card",
    role: "Card surface",
  },
  {
    variable: "--theme-color-cardForeground",
    token: "colors.cardForeground",
    role: "Card text",
  },
  {
    variable: "--theme-color-border",
    token: "colors.border",
    role: "Card outline",
  },
  {
    variable: "--theme-color-mutedForeground",
    token: "colors.mutedForeground",
    role: "Secondary and meta text",
  },
  {
    variable: "--theme-color-success",
    token: "colors.success",
    role: "Status dot and label",
  },
  {
    variable: "--theme-color-primary",
    token: "colors.primary",
    role: "Button fill",
  },
  {
    variable: "--theme-color-primaryForeground",
    token: "colors.primaryForeground",
    role: "Button label",
  },
  {
    variable: "--theme-color-ring",
    token: "colors.ring",
    role: "Button focus outline",
  },
] as const;
