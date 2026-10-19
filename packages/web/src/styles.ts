/**
 * Built-in styling for the Themvora custom elements.
 *
 * ## Why a single injected stylesheet
 *
 * The elements keep their children in the light DOM: `<themvora-scope>` exists
 * precisely so ordinary consumer markup inherits the theme's custom
 * properties, which a shadow root would block. Light-DOM internals cannot use
 * `adoptedStyleSheets`, so the component rules ship as one document-level
 * stylesheet that the package entry injects once.
 *
 * That gives the consumer the contract the HTML-first experience needs — load
 * the entry, write semantic HTML, get a usable control — with no extra CSS
 * import and no per-element duplication.
 *
 * ## Rules for this file
 *
 * 1. **No palette of its own.** Every colour is a semantic token
 *    (`--theme-color-*`), so the controls follow whatever theme is active,
 *    including themes registered at runtime. There is no second theme system
 *    here.
 * 2. **Zero specificity.** Every selector is wrapped in `:where()`, so a
 *    consumer stylesheet overrides any of it with a plain tag selector and no
 *    `!important`.
 * 3. **Motion respects the OS.** Transitions are disabled under
 *    `prefers-reduced-motion: reduce`.
 * 4. **Fallbacks are present.** A control rendered before the provider has
 *    applied its variables (or outside a provider) still has readable
 *    defaults instead of `currentColor`-on-nothing.
 */

/** The `id` of the injected stylesheet element. */
export const COMPONENT_STYLE_ID = "themvora-elements-style";

/**
 * The document-level stylesheet for the built-in elements.
 *
 * Exported so consumers can inspect it, and so the injection is testable
 * without parsing the DOM.
 */
export const COMPONENT_CSS = `
/* ---------------------------------------------------------------- toggle */
:where(themvora-toggle) {
  display: inline-flex;
  vertical-align: middle;
}

:where(themvora-toggle) > button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  width: 2.25rem;
  height: 2.25rem;
  margin: 0;
  padding: 0;
  font: inherit;
  line-height: 1;
  color: var(--theme-color-foreground, #111827);
  background-color: var(--theme-color-muted, #f3f4f6);
  border: 1px solid var(--theme-color-border, #d4d4d8);
  border-radius: var(--theme-radius-md, 0.375rem);
  cursor: pointer;
  -webkit-appearance: none;
  appearance: none;
  transition:
    background-color 150ms ease,
    color 150ms ease,
    border-color 150ms ease;
}

:where(themvora-toggle) > button:hover {
  color: var(--theme-color-accentForeground, var(--theme-color-foreground, #111827));
  background-color: var(--theme-color-accent, #e5e7eb);
}

:where(themvora-toggle) > button:focus-visible {
  outline: 2px solid var(--theme-color-ring, #6366f1);
  outline-offset: 2px;
}

:where(themvora-toggle) > button > svg {
  display: block;
  width: 1.125rem;
  height: 1.125rem;
  flex: none;
  pointer-events: none;
}

/* ---------------------------------------------------------------- select */
:where(themvora-select) {
  display: inline-flex;
  vertical-align: middle;
}

:where(themvora-select) > select {
  box-sizing: border-box;
  margin: 0;
  padding: 0.375rem 0.625rem;
  font: inherit;
  line-height: 1.25;
  color: var(--theme-color-foreground, #111827);
  background-color: var(--theme-color-background, #ffffff);
  border: 1px solid var(--theme-color-input, var(--theme-color-border, #d4d4d8));
  border-radius: var(--theme-radius-md, 0.375rem);
  cursor: pointer;
}

:where(themvora-select) > select:focus-visible {
  outline: 2px solid var(--theme-color-ring, #6366f1);
  outline-offset: 2px;
}

/* ------------------------------------------------------------- motion off */
@media (prefers-reduced-motion: reduce) {
  :where(themvora-toggle) > button {
    transition: none;
  }
}
`.trim();

/**
 * Injects {@link COMPONENT_CSS} into the document once.
 *
 * Idempotent: repeated calls, duplicate bundle evaluation and a consumer who
 * already pasted the stylesheet into their own `<style id="themvora-elements-style">`
 * all leave exactly one copy in the document. A no-op on the server.
 *
 * @returns `true` when this call inserted the stylesheet, `false` when it was
 *   already present or the environment has no DOM.
 */
export function injectComponentStyles(): boolean {
  if (typeof document === "undefined") return false;
  if (document.getElementById(COMPONENT_STYLE_ID)) return false;

  const parent = document.head ?? document.documentElement;
  if (!parent) return false;

  const style = document.createElement("style");
  style.id = COMPONENT_STYLE_ID;
  style.textContent = COMPONENT_CSS;
  parent.appendChild(style);
  return true;
}
