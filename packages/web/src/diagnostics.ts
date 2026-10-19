import { createDiagnostic, emitDiagnostic } from "@themvora/core";

/**
 * Reports an attribute value a Themvora custom element cannot use.
 *
 * Custom-element attributes are authored as strings in HTML and are never
 * type-checked, so a typo (`initial-mode="Dark"`, `themes="light,dark,"`, a
 * malformed JSON payload) reaches the element as data. The element recovers
 * with a defined fallback instead of throwing — a broken attribute must not
 * take the page down — and reports the mistake once.
 *
 * Uses the canonical diagnostic pipeline (`TV_CONFIG_OPTION_INVALID`) so the
 * code, level, deduplication and dev/prod formatting match every other
 * Themvora configuration error. Deduplication is keyed on code + api +
 * property + received value, so re-rendering an element with the same bad
 * value logs once while a *different* bad value logs again.
 *
 * @param tag - The element's tag name, e.g. `"themvora-provider"`.
 * @param attribute - The attribute at fault, e.g. `"initial-mode"`.
 * @param received - The raw attribute value that could not be used.
 * @param expected - The accepted syntax, as a short human-readable description.
 * @param action - What the element did instead, e.g. "the attribute was ignored".
 */
export function emitInvalidAttributeDiagnostic(
  tag: string,
  attribute: string,
  received: unknown,
  expected: string,
  action: string,
): void {
  emitDiagnostic(
    createDiagnostic({
      code: "TV_CONFIG_OPTION_INVALID",
      level: "warning",
      message: `The "${attribute}" attribute on <${tag}> is not usable; ${action}.`,
      context: {
        api: tag,
        property: attribute,
        received,
        expected,
      },
      hint:
        `Expected ${expected}. ` +
        `Check the attribute in your markup — the element kept a defined ` +
        `state rather than failing.`,
    }),
  );
}
