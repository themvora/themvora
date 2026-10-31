/**
 * The `themes` binding rules of the example-completeness gate (rule D).
 *
 * Extracted from `scripts/docs/check-examples.mjs` so the interpretation of a
 * snippet — what counts as *using* the `themes` identifier — can be tested
 * directly, without running the whole documentation scan. The gate is
 * regex-based on purpose (no parser, no toolchain), and every false positive it
 * has produced came from that decision, so the decision itself needs coverage.
 *
 * ## Why a word of prose is not a reference
 *
 * The convention the rule enforces is "a snippet must never require the reader
 * to invent `themes.ts`". `<ThemeProvider themes={themes}>` with no import is
 * the defect; a button labelled *View themes* is not. A regex cannot tell them
 * apart from the raw text, so this module removes the parts of a snippet that
 * cannot contain executable code — comments, string literals, and JSX/HTML text
 * children — before scanning for the identifier.
 *
 * The blanking is deliberately one-sided. A miss leaves prose that mentions the
 * word, which is a visible false positive someone will fix; an over-eager strip
 * would hide a real missing import, which is the failure the gate exists to
 * prevent. Every heuristic below is therefore chosen to keep text when it is
 * uncertain, and the regression tests pin that direction.
 */

import {
  parseAllImports,
  isRelativeSpecifier,
  moduleKey,
} from "./snippets.mjs";

/**
 * Punctuation that only appears in code, not in a sentence.
 *
 * A run of JSX text containing any of these is left intact and scanned. That is
 * what keeps `i > themes && <span>` — a genuine reference sitting between two
 * tags — from being mistaken for a label.
 */
const CODE_PUNCTUATION = /[<>{}();=!&|`$*\\[\]]/;

/**
 * The longest run worth treating as text.
 *
 * A paragraph of prose is short; a stretch of code that happens to be bracketed
 * by `>` and `<` is not. Past this length the run is scanned rather than
 * blanked, which can only produce a false positive.
 */
const MAX_TEXT_RUN = 300;

/**
 * A JSX/HTML text child: everything between a tag close and the next tag open.
 *
 * Newlines are allowed — a paragraph inside `<p>` is routinely wrapped — and
 * are the reason the code-punctuation guard above is not optional.
 */
const TEXT_RUN = />([^<>]*)</g;

/**
 * Remove everything in a snippet that cannot be an identifier reference.
 *
 * Order matters: comments and literals first, so that a `>` inside a string
 * cannot open a spurious tag, then JSX text, so that a sentence is not read as
 * code.
 */
export function stripNoise(code) {
  const withoutLiterals = code
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[^:])\/\/[^\n]*/g, "$1 ")
    .replace(/`(?:\\.|[^`\\])*`/g, '""')
    .replace(/'(?:\\.|[^'\\\n])*'/g, '""')
    .replace(/"(?:\\.|[^"\\\n])*"/g, '""');

  return stripJsxText(withoutLiterals);
}

/**
 * Blank JSX and HTML text children.
 *
 * Replacing a run with spaces rather than deleting it keeps every offset — and
 * therefore every line number and column a caller might report — unchanged.
 */
export function stripJsxText(code) {
  return code.replace(TEXT_RUN, (match, text) => {
    if (text.length > MAX_TEXT_RUN) return match;
    if (!/[A-Za-z]/.test(text)) return match;
    if (CODE_PUNCTUATION.test(text)) return match;
    return `>${" ".repeat(text.length)}<`;
  });
}

/**
 * True when a snippet *uses* `themes` as a value.
 *
 * Three occurrences are not references and are rewritten before the scan:
 *
 *   - a prop name — `<ThemeScope themes={[x]}>`, where the identifier is the
 *     attribute and the value is the expression after `=`;
 *   - a property access — `runtime.themes`, which needs no local binding;
 *   - anything inside JSX text, already gone by this point.
 */
export function usesThemesValue(code) {
  const bare = stripNoise(code)
    .replace(/(?<=[\s<{,:])themes\s*(?==|:)/g, "PROPNAME")
    .replace(/\.\s*themes\b/g, "PROPACCESS");
  return /\bthemes\b/.test(bare);
}

/**
 * True when `themes` has a binding somewhere in the entry or its bundle.
 *
 * `declaredKeys` holds the module keys of every file the bundle declares, so a
 * snippet may rely on a `themes.ts` another snippet in the same bundle wrote.
 */
export function themesIsBound(code, declaredKeys) {
  if (declaredKeys.has("themes")) return true;
  if (/(?:const|let|var)\s+themes\b/.test(code)) return true; // const themes = …
  if (/(?:const|let|var)\s*\{[^}]*\bthemes\b[^}]*\}/.test(code)) return true; // const { themes } = …
  if (/\bimport\s*\{[^}]*\bthemes\b[^}]*\}/.test(code)) return true; // import { themes } from "…"
  if (/\bimport\s+themes\s*(?:,|from)/.test(code)) return true; // import themes from "…"
  for (const { specifier } of parseAllImports(code)) {
    if (isRelativeSpecifier(specifier) && moduleKey(specifier) === "themes") return true;
  }
  return false;
}

/**
 * The rule the gate applies: an unbound *value* reference to `themes`.
 */
export function hasUnboundThemesReference(code, declaredKeys) {
  return usesThemesValue(code) && !themesIsBound(code, declaredKeys);
}
