/**
 * The generated stylesheets.
 *
 * Two engines, one design. `renderShowcaseCss()` is the native-CSS variant — the
 * selectors `showcaseClasses("css")` names, written as ordinary CSS that reads
 * Themvora's semantic custom properties. `renderShowcaseTailwind()` is the
 * Tailwind entry: the two imports plus the document rule, with every element's
 * presentation living in utilities on the markup itself.
 *
 * Neither declares a palette. Colours come from `var(--theme-color-*)` in the CSS
 * variant and from the same variables through `@themvora/tailwind`'s `@theme`
 * mapping in the Tailwind variant, so a theme switch repaints both.
 *
 * @packageDocumentation
 */
import { generatedHeader } from "../files.js";

/**
 * The document-level rules both variants share.
 *
 * @remarks
 * The page itself has to be themed, not only the components. Without this a dark
 * theme paints dark cards on a browser-default white page — the defect the
 * Tailwind variant shipped with until it was measured in a browser.
 */
const DOCUMENT_RULE = `html,
body {
  margin: 0;
  background: var(--theme-color-background);
  color: var(--theme-color-foreground);
  font-family:
    "Geist",
    system-ui,
    -apple-system,
    "Segoe UI",
    Roboto,
    Helvetica,
    Arial,
    sans-serif;
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
}`;

/** The reference's typeface. Kept because it is part of the blueprint's design. */
const FONT_IMPORT =
  '@import url("https://fonts.googleapis.com/css2?family=Geist:ital,wght@0,100..900;1,100..900&display=swap");';

/**
 * The native-CSS variant's stylesheet.
 *
 * @returns The contents of the framework's global stylesheet.
 *
 * @remarks
 * Every colour is a semantic role, and the optional token groups are read with
 * structural fallbacks: only the 21 colour roles are required of a theme, so
 * `spacing`, `radius`, `shadows`, `borderWidths` and `typography` may be empty
 * and a bare `var()` would collapse the layout. A fallback is a length, never a
 * colour — a colour fallback would be the second palette this stylesheet exists
 * to avoid.
 *
 * Breakpoints mirror the blueprint's `min-[420px]`, `sm` (640px), `md` (768px)
 * and `lg` (1024px) steps.
 */
export function renderShowcaseCss(): string {
  return `${generatedHeader("Themvora showcase styles.")}${FONT_IMPORT}

*,
*::before,
*::after {
  box-sizing: border-box;
}

${DOCUMENT_RULE}

:where(a, button, input, select, textarea):focus-visible {
  outline: 2px solid var(--theme-color-ring);
  outline-offset: 2px;
}

/* ---------- Shell ---------- */

.app-shell {
  display: flex;
  min-height: 100dvh;
  width: 100%;
  align-items: center;
  justify-content: center;
  padding-inline: clamp(0rem, 1vw, 4rem);
}

.page {
  display: flex;
  width: 100%;
  max-width: 56rem;
  margin-inline: auto;
  flex-direction: column;
  gap: var(--theme-spacing-4, 1rem);
  padding: var(--theme-spacing-8, 2rem) var(--theme-spacing-4, 1rem);
}

/* ---------- Hero ---------- */

.hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--theme-spacing-5, 1.25rem);
  padding-bottom: var(--theme-spacing-2, 0.5rem);
  text-align: center;
}

.status {
  display: inline-flex;
  max-width: 100%;
  align-items: center;
  gap: var(--theme-spacing-2, 0.5rem);
  border: var(--theme-border-width-1, 1px) solid var(--theme-color-border);
  border-radius: 999px;
  background: var(--theme-color-card);
  color: var(--theme-color-mutedForeground);
  padding: 0.25rem 0.75rem;
  font-size: 0.75rem;
  box-shadow: var(--theme-shadow-sm, 0 1px 3px rgb(0 0 0 / 0.1));
}

.status-dot {
  width: 0.5rem;
  height: 0.5rem;
  flex-shrink: 0;
  border-radius: 999px;
  background: var(--theme-color-success);
}

.status-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.title {
  margin: 0;
  font-size: 1.875rem;
  font-weight: 700;
  letter-spacing: -0.025em;
  text-wrap: balance;
}

/* The gradient reads the live primary and accent roles, so it re-tints with the
   theme. No fixed colour is involved. */
.title-gradient {
  background-image: linear-gradient(
    to right,
    var(--theme-color-primary),
    var(--theme-color-accent)
  );
  background-clip: text;
  color: transparent;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.lead {
  margin: 0;
  max-width: 32rem;
  color: var(--theme-color-mutedForeground);
  font-size: 0.875rem;
  text-wrap: balance;
}

.code {
  border-radius: var(--theme-radius-md, 0.375rem);
  background: var(--theme-color-secondary);
  padding: 0.125rem 0.375rem;
  font-size: 0.85em;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
}

.docs-nav {
  display: grid;
  width: 100%;
  grid-template-columns: 1fr;
  gap: var(--theme-spacing-2, 0.5rem);
}

/* ---------- Buttons and controls ---------- */

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.375rem;
  border-radius: var(--theme-radius-md, 0.375rem);
  border: var(--theme-border-width-1, 1px) solid transparent;
  padding: 0.5rem 1rem;
  font: inherit;
  font-size: 0.875rem;
  font-weight: 500;
  text-decoration: none;
  cursor: pointer;
  transition: background-color 150ms ease, border-color 150ms ease;
}

.btn-primary {
  border-color: var(--theme-color-primary);
  background: var(--theme-color-primary);
  color: var(--theme-color-primaryForeground);
}

.btn-primary:hover {
  background: color-mix(in srgb, var(--theme-color-primary) 90%, transparent);
}

.btn-outline {
  border-color: var(--theme-color-border);
  background: var(--theme-color-card);
  color: var(--theme-color-foreground);
}

.btn-outline:hover {
  background: var(--theme-color-muted);
}

.icon {
  width: 1em;
  height: 1em;
}

.card {
  border: var(--theme-border-width-1, 1px) solid var(--theme-color-border);
  border-radius: var(--theme-radius-xl, 0.75rem);
  background: var(--theme-color-card);
  color: var(--theme-color-cardForeground);
  padding: var(--theme-spacing-4, 1rem);
  box-shadow: var(--theme-shadow-sm, 0 1px 3px rgb(0 0 0 / 0.1));
}

/* Additive, never a replacement: a stacked card is still a card, so it carries
   the surface, border and padding above as well as this rhythm. Applying only
   this class is what left the controls card with no theme-colour-card surface. */
.card-stack {
  display: grid;
  gap: var(--theme-spacing-5, 1.25rem);
}

.controls-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--theme-spacing-4, 1rem);
}

.control-group {
  display: grid;
  gap: var(--theme-spacing-2, 0.5rem);
}

.control-label {
  margin: 0;
  font-size: 0.75rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--theme-color-mutedForeground);
}

.control-row {
  display: flex;
  min-width: 0;
  flex-wrap: wrap;
  gap: var(--theme-spacing-2, 0.5rem);
}

.segments {
  display: flex;
  width: 100%;
  gap: 0.25rem;
  border: var(--theme-border-width-1, 1px) solid var(--theme-color-border);
  border-radius: var(--theme-radius-lg, 0.5rem);
  background: var(--theme-color-muted);
  padding: 0.25rem;
}

.segment {
  flex: 1;
  border: 0;
  border-radius: var(--theme-radius-md, 0.375rem);
  background: transparent;
  color: inherit;
  padding: 0.375rem 0.75rem;
  font: inherit;
  font-size: 0.875rem;
  text-transform: capitalize;
  cursor: pointer;
  transition: background-color 150ms ease, color 150ms ease;
}

.segment:hover:not([aria-pressed="true"]) {
  background: var(--theme-color-card);
}

.segment[aria-pressed="true"] {
  background: var(--theme-color-primary);
  color: var(--theme-color-primaryForeground);
}

.rule {
  margin: 0;
  border: 0;
  border-top: var(--theme-border-width-1, 1px) solid var(--theme-color-border);
}

.chip {
  border: var(--theme-border-width-1, 1px) solid var(--theme-color-border);
  border-radius: 999px;
  background: transparent;
  color: inherit;
  padding: 0.375rem 0.75rem;
  font: inherit;
  font-size: 0.875rem;
  text-transform: capitalize;
  cursor: pointer;
  transition: background-color 150ms ease, border-color 150ms ease, color 150ms ease;
}

.chip:hover:not([aria-pressed="true"]) {
  background: var(--theme-color-muted);
}

.chip[aria-pressed="true"] {
  border-color: var(--theme-color-primary);
  background: var(--theme-color-primary);
  color: var(--theme-color-primaryForeground);
}

.switcher-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
}

.switcher-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.375rem;
  border: var(--theme-border-width-1, 1px) solid var(--theme-color-primary);
  border-radius: var(--theme-radius-md, 0.375rem);
  background: var(--theme-color-primary);
  color: var(--theme-color-primaryForeground);
  padding: 0.5rem 1rem;
  font: inherit;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: filter 150ms ease;
}

.switcher-btn:hover {
  filter: brightness(1.1);
}

/* ---------- Live preview ---------- */

.preview {
  overflow: hidden;
  border: var(--theme-border-width-1, 1px) solid var(--theme-color-border);
  border-radius: var(--theme-radius-xl, 0.75rem);
  background: var(--theme-color-background);
  color: var(--theme-color-foreground);
  box-shadow: var(--theme-shadow-md, 0 4px 6px rgb(0 0 0 / 0.07));
}

.preview-bar {
  display: flex;
  align-items: center;
  gap: var(--theme-spacing-2, 0.5rem);
  border-bottom: var(--theme-border-width-1, 1px) solid var(--theme-color-border);
  background: var(--theme-color-muted);
  padding: 0.75rem 1rem;
}

.preview-dot {
  width: 0.625rem;
  height: 0.625rem;
  border-radius: 999px;
}

.preview-dot-destructive {
  background: var(--theme-color-destructive);
}

.preview-dot-accent {
  background: var(--theme-color-accent);
}

.preview-dot-success {
  background: var(--theme-color-success);
}

.preview-address {
  display: none;
  margin-left: var(--theme-spacing-3, 0.75rem);
  height: 1.25rem;
  flex: 1;
  border: var(--theme-border-width-1, 1px) solid var(--theme-color-border);
  border-radius: var(--theme-radius-md, 0.375rem);
  background: var(--theme-color-background);
}

.preview-body {
  display: grid;
  gap: var(--theme-spacing-5, 1.25rem);
  background: var(--theme-color-card);
  padding: var(--theme-spacing-4, 1rem);
}

.preview-info {
  min-width: 0;
}

.preview-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
}

.preview-meta {
  margin: 0.25rem 0 0;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 0.75rem;
  color: var(--theme-color-mutedForeground);
  overflow-wrap: anywhere;
}

.preview-swatches {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem 1rem;
  margin: var(--theme-spacing-4, 1rem) 0 0;
  padding: 0;
  list-style: none;
}

.preview-swatch {
  display: flex;
  align-items: center;
  gap: 0.375rem;
}

.preview-swatch-dot {
  width: 1rem;
  height: 1rem;
  flex-shrink: 0;
  border: 2px solid var(--theme-color-border);
  border-radius: 999px;
}

.preview-swatch-name {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 0.75rem;
  color: var(--theme-color-mutedForeground);
}

.preview-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--theme-spacing-2, 0.5rem);
}

.preview-pill {
  border-radius: var(--theme-radius-md, 0.375rem);
  padding: 0.5rem 0.75rem;
  text-align: center;
  font-size: 0.875rem;
  font-weight: 500;
}

/* ---------- Section headings ---------- */

.card-heading {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  margin-bottom: var(--theme-spacing-4, 1rem);
}

.card-title {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 600;
}

.card-hint {
  margin: 0;
  font-size: 0.75rem;
  color: var(--theme-color-mutedForeground);
}

/* ---------- Token grid ---------- */

.token-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--theme-spacing-3, 0.75rem);
  margin: 0;
  padding: 0;
  list-style: none;
}

.token {
  display: flex;
  width: 100%;
  min-width: 0;
  align-items: center;
  gap: var(--theme-spacing-3, 0.75rem);
  border: var(--theme-border-width-1, 1px) solid var(--theme-color-border);
  border-radius: var(--theme-radius-lg, 0.5rem);
  background: transparent;
  color: inherit;
  padding: var(--theme-spacing-2, 0.5rem);
  text-align: left;
  font: inherit;
  cursor: pointer;
  transition: background-color 150ms ease;
}

.token:hover {
  background: var(--theme-color-muted);
}

.token-swatch {
  width: 2.25rem;
  height: 2.25rem;
  flex-shrink: 0;
  border: 2px solid var(--theme-color-border);
  border-radius: var(--theme-radius-md, 0.375rem);
}

.token-body {
  min-width: 0;
}

.token-name {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.875rem;
  font-weight: 500;
}

.token-value {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 0.75rem;
  color: var(--theme-color-mutedForeground);
}

/* ---------- Snippets ---------- */

.snippet-grid {
  display: grid;
  gap: var(--theme-spacing-3, 0.75rem);
}

.snippet {
  min-width: 0;
  overflow: hidden;
  border: var(--theme-border-width-1, 1px) solid var(--theme-color-border);
  border-radius: var(--theme-radius-lg, 0.5rem);
  background: color-mix(in srgb, var(--theme-color-muted) 40%, transparent);
}

.snippet-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--theme-spacing-2, 0.5rem);
  border-bottom: var(--theme-border-width-1, 1px) solid var(--theme-color-border);
  padding: 0.5rem 0.75rem;
}

.snippet-label {
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--theme-color-mutedForeground);
}

.snippet-copy {
  border: 0;
  border-radius: var(--theme-radius-sm, 0.25rem);
  background: transparent;
  color: var(--theme-color-primary);
  padding: 0.125rem 0.5rem;
  font: inherit;
  font-size: 0.75rem;
  cursor: pointer;
}

.snippet-copy:hover {
  background: var(--theme-color-muted);
}

.snippet-code {
  margin: 0;
  overflow-x: auto;
  padding: var(--theme-spacing-3, 0.75rem);
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 0.75rem;
  line-height: 1.625;
}

/* ---------- Scoped theme ---------- */

.scoped-tile {
  border-radius: var(--theme-radius-lg, 0.5rem);
  box-shadow: var(--theme-shadow-md, 0 4px 6px rgb(0 0 0 / 0.07));
}

.scoped-tile-body {
  border: var(--theme-border-width-1, 1px) solid var(--theme-color-border);
  border-radius: var(--theme-radius-lg, 0.5rem);
  background: var(--theme-color-primary);
  color: var(--theme-color-primaryForeground);
  padding: var(--theme-spacing-4, 1rem);
}

.scoped-title {
  margin: 0;
  font-weight: 600;
}

.scoped-text {
  margin: 0.25rem 0 0;
  font-size: 0.875rem;
  color: color-mix(in srgb, var(--theme-color-primaryForeground) 70%, transparent);
}

.scoped-meta {
  display: flex;
  align-items: center;
  gap: var(--theme-spacing-2, 0.5rem);
  margin: var(--theme-spacing-3, 0.75rem) 0 0;
  font-size: 0.875rem;
  color: color-mix(in srgb, var(--theme-color-primaryForeground) 70%, transparent);
}

.scoped-dot {
  width: 0.625rem;
  height: 0.625rem;
  flex-shrink: 0;
  border-radius: 999px;
  background: var(--theme-color-success);
}

.scoped-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: var(--theme-border-width-1, 1px) solid transparent;
  border-radius: var(--theme-radius-md, 0.375rem);
  background: var(--theme-color-primaryForeground);
  color: var(--theme-color-primary);
  padding: 0.5rem 1rem;
  font: inherit;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
}

.scoped-btn:hover {
  opacity: 0.9;
}

/* ---------- Footer ---------- */

.footer {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 0.25rem 0.5rem;
  margin-top: var(--theme-spacing-4, 1rem);
  border-top: var(--theme-border-width-1, 1px) solid var(--theme-color-border);
  padding-top: var(--theme-spacing-6, 1.5rem);
  font-size: 0.875rem;
  color: var(--theme-color-mutedForeground);
}

.footer-link {
  border-radius: var(--theme-radius-sm, 0.25rem);
  color: var(--theme-color-primary);
  text-underline-offset: 4px;
}

.footer-link:hover {
  text-decoration: underline;
}

/* ---------- Responsive ---------- */

@media (min-width: 420px) {
  .docs-nav {
    grid-template-columns: 1fr 1fr;
  }

  .token-grid {
    grid-template-columns: 1fr 1fr;
  }
}

@media (min-width: 640px) {
  .page {
    gap: var(--theme-spacing-6, 1.5rem);
    padding: var(--theme-spacing-12, 3rem) var(--theme-spacing-6, 1.5rem);
  }

  .hero {
    gap: var(--theme-spacing-6, 1.5rem);
    padding-bottom: var(--theme-spacing-4, 1rem);
  }

  .title {
    font-size: 3rem;
  }

  .lead {
    font-size: 1rem;
  }

  .docs-nav {
    display: flex;
    width: auto;
    flex-wrap: wrap;
    justify-content: center;
    gap: var(--theme-spacing-3, 0.75rem);
  }

  .card {
    padding: var(--theme-spacing-6, 1.5rem);
  }

  .control-group {
    grid-template-columns: 6rem 1fr;
    align-items: start;
    gap: var(--theme-spacing-4, 1rem);
  }

  .control-label {
    padding-top: var(--theme-spacing-2, 0.5rem);
  }

  .segments {
    width: auto;
  }

  .segment {
    flex: none;
  }

  .preview-address {
    display: block;
  }

  .preview-body {
    padding: var(--theme-spacing-6, 1.5rem);
  }

  .preview-actions {
    display: flex;
  }

  .card-heading {
    flex-direction: row;
    align-items: baseline;
    justify-content: space-between;
    gap: var(--theme-spacing-4, 1rem);
  }

  .card-hint {
    font-size: 0.875rem;
  }

  .scoped-tile-body {
    padding: var(--theme-spacing-5, 1.25rem);
  }
}

@media (min-width: 768px) {
  .preview-body {
    grid-template-columns: 1fr auto;
    align-items: center;
  }

  .preview-actions {
    justify-content: flex-end;
  }

  .snippet-grid {
    grid-template-columns: 1fr 1fr;
  }

  .token-grid {
    grid-template-columns: repeat(3, 1fr);
  }

  .scoped-tile-body {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--theme-spacing-4, 1rem);
  }
}

@media (min-width: 1024px) {
  .page {
    padding-block: var(--theme-spacing-16, 4rem);
  }

  .token-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}
`;
}

/**
 * The Tailwind variant's stylesheet.
 *
 * @returns The contents of the framework's global stylesheet.
 *
 * @remarks
 * This is the whole Tailwind integration, and it follows the shipped guide: the
 * `tailwindcss` import first, then `@themvora/tailwind`, whose `@theme` layer maps
 * every semantic token to a utility and whose `dark` variant follows the `.dark`
 * class the runtime maintains.
 *
 * There is no component CSS here on purpose. The design lives in utilities on the
 * markup, so a `.card`-style stylesheet would be a parallel styling system. The
 * only rule is the document one, which no utility can express.
 */
export function renderShowcaseTailwind(): string {
  return `${generatedHeader("Themvora showcase styles (Tailwind CSS v4).")}${FONT_IMPORT}
@import "tailwindcss";

/* Maps Themvora's semantic tokens to Tailwind's theme variables, so utilities
   such as \`bg-card\`, \`text-foreground\` and \`border-border\` resolve to the
   \`--theme-*\` values the runtime owns. */
@import "@themvora/tailwind";

${DOCUMENT_RULE}

/* The typeface the design uses, applied to every element. */
*,
*::before,
*::after {
  font-family:
    "Geist",
    system-ui,
    -apple-system,
    "Segoe UI",
    Roboto,
    Helvetica,
    Arial,
    sans-serif;
}
`;
}
