/**
 * Output-context encoding helpers for the inline `<script>` and `<style>`
 * content Themvora emits.
 *
 * @remarks
 * Theme data is *data*, but it reaches the page through several different
 * output contexts, and each one has its own escaping rules:
 *
 * - **Executable script content** — a `</script` sequence ends the element
 *   regardless of JavaScript syntax, so any value embedded with
 *   `JSON.stringify` must have its markup delimiters neutralised. JSON escaping
 *   alone does not do this: `JSON.stringify("</script>")` returns the literal
 *   `"</script>"`.
 * - **CSS inside a `<style>` element** — the same applies to `</style`.
 * - **A CSS declaration value** — quotes, commas and parentheses are all
 *   legitimate, so nothing may be stripped here.
 *
 * They are deliberately separate functions. A single "escape everything"
 * helper would either corrupt valid CSS values or leave one of the contexts
 * open; the point of this module is that each call site picks the one that
 * matches where its string actually lands.
 *
 * @packageDocumentation
 */

/**
 * Escapes a JSON serialization so it can be embedded in executable inline
 * script content.
 *
 * @param value - The value to serialize.
 * @returns A JSON literal that is also a valid JavaScript expression and cannot
 *   terminate the containing `<script>` element.
 *
 * @remarks
 * Every `<`, `>`, `&`, U+2028 and U+2029 is replaced with its `\uXXXX` escape.
 * Inside a JSON string literal those escapes are exactly equivalent to the
 * characters they replace, so the parsed value is unchanged; outside a string
 * literal the only place these characters can appear in JSON is nowhere
 * (JSON's structural characters are `{}[],:` plus whitespace), which is what
 * makes a global replacement safe.
 *
 * U+2028/U+2029 are included because they are valid in JSON strings but were
 * line terminators in JavaScript string literals before ES2019 — a value
 * carrying one used to be a syntax error in the emitted script.
 *
 * `undefined` serializes to `null` so a missing optional field still produces a
 * syntactically valid expression.
 */
export function serializeScriptJson(value: unknown): string {
  const json = JSON.stringify(value);
  if (json === undefined) return "null";
  return json.replace(
    /[<>&\u2028\u2029]/g,
    (char) => SCRIPT_ESCAPES[char] ?? char,
  );
}

const SCRIPT_ESCAPES: Record<string, string> = {
  "<": "\\u003c",
  ">": "\\u003e",
  "&": "\\u0026",
  "\u2028": "\\u2028",
  "\u2029": "\\u2029",
};

/**
 * Escapes CSS text so it cannot terminate the `<style>` element that carries
 * it.
 *
 * @param css - The stylesheet text.
 * @returns The same stylesheet with every `</` written as `<\/`.
 *
 * @remarks
 * `<\/` is a CSS escape for `/`, so a value that legitimately contains `</`
 * (inside a quoted string or a `url()`) still parses to the same characters —
 * this is a transport-level escape, not a value-level one. Outside a string,
 * `</` is not valid CSS anyway, so nothing valid is altered.
 *
 * Use this only for text that becomes the **body of a `<style>` element**. CSS
 * that is written through `style.setProperty()` or `element.style.cssText`
 * must not be escaped this way.
 */
export function escapeStyleElementText(css: string): string {
  return css.replace(/<\//g, "<\\/");
}
