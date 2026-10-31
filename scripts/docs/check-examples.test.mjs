/**
 * Regression coverage for rule D of the example-completeness gate.
 *
 * The gate reported seven violations that were all the same mistake: the word
 * `themes` inside `<button …>View themes</button>`. The rule scans snippets
 * with regular expressions rather than a parser — a deliberate choice, so the
 * gate stays toolchain-free — and a regular expression cannot tell a label from
 * a variable. The fix was to teach the scan which regions of a snippet cannot
 * contain code, not to change the labels.
 *
 * Both directions matter, and both are tested here:
 *
 *   - a snippet whose only mention of `themes` is display text must pass, or
 *     the gate punishes correct documentation;
 *   - a snippet that genuinely references an unbound `themes` must still fail,
 *     including when the reference sits between two tags, because that is the
 *     shape the blanking could plausibly swallow. A rule that cannot fail is
 *     worse than no rule.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  hasUnboundThemesReference,
  stripJsxText,
  stripNoise,
  themesIsBound,
  usesThemesValue,
} from "./lib/example-bindings.mjs";

/** The exact shape that produced the false positives. */
const LABELLED_BUTTON =
  '<button className="themvora-example-button" type="button">View themes</button>';

describe("rule D — display text is not an identifier reference", () => {
  it("ignores a label naming the feature", () => {
    assert.equal(usesThemesValue(LABELLED_BUTTON), false);
    assert.equal(hasUnboundThemesReference(LABELLED_BUTTON, new Set()), false);
  });

  it("ignores the same label in a Vue, Svelte or Astro template", () => {
    // These are not JSX, but they are the same `<tag>text</tag>` shape, and the
    // framework guides write their examples the same way.
    const vue = `<template>\n  <button class="themvora-example-button" type="button">View themes</button>\n</template>`;
    const svelte = `<button class="themvora-example-button" type="button">View themes</button>`;
    const astro = `<button class="themvora-example-button" type="button">View themes</button>`;
    for (const code of [vue, svelte, astro]) {
      assert.equal(hasUnboundThemesReference(code, new Set()), false, code);
    }
  });

  it("ignores a paragraph that wraps across lines", () => {
    const prose = [
      '<p className="themvora-example-description">',
      "  Tokens resolve at runtime, so this card follows whichever themes",
      "  the provider registered, without a reload.",
      "</p>",
    ].join("\n");
    assert.equal(hasUnboundThemesReference(prose, new Set()), false);
  });

  it("keeps offsets intact, so a reported position still points at the snippet", () => {
    const stripped = stripJsxText(LABELLED_BUTTON);
    assert.equal(stripped.length, LABELLED_BUTTON.length);
    assert.equal(stripped.split("\n").length, LABELLED_BUTTON.split("\n").length);
  });

  it("does not blank a run that contains code punctuation", () => {
    // `> b && c <` is a comparison, not a label. Leaving it alone is what stops
    // the blanker from hiding the reference in the next test.
    const code = "if (a > b && c < d) {}";
    assert.equal(stripJsxText(code), code);
  });
});

describe("rule D — a real missing binding still fails", () => {
  it("fails when a provider is handed an unbound `themes`", () => {
    const code = [
      "export function App() {",
      "  return (",
      "    <ThemeProvider themes={themes}>",
      "      <div />",
      "    </ThemeProvider>",
      "  );",
      "}",
    ].join("\n");
    assert.equal(hasUnboundThemesReference(code, new Set()), true);
  });

  it("fails when the reference sits between two tags", () => {
    // The blanker must not swallow this: ` themes && ` is inside an expression
    // container, and the `&` keeps it from being read as prose.
    const code = "const rows = items.map((i) => i > themes && <span key={i} />);";
    assert.equal(hasUnboundThemesReference(code, new Set()), true);
  });

  it("fails for a bare `themes` expression", () => {
    assert.equal(hasUnboundThemesReference("export const names = themes;", new Set()), true);
  });

  it("passes once the snippet imports it", () => {
    const code =
      'import { themes } from "./themes";\nexport const App = () => <ThemeProvider themes={themes} />;';
    assert.equal(hasUnboundThemesReference(code, new Set()), false);
  });

  it("passes once the snippet declares it locally", () => {
    const code = "const themes = [light, dark];\nexport const App = () => <ThemeProvider themes={themes} />;";
    assert.equal(hasUnboundThemesReference(code, new Set()), false);
  });

  it("passes when another snippet in the bundle declares a themes file", () => {
    const code = "export const App = () => <ThemeProvider themes={themes} />;";
    assert.equal(hasUnboundThemesReference(code, new Set(["themes"])), false);
    assert.equal(hasUnboundThemesReference(code, new Set(["light"])), true);
  });
});

describe("rule D — prop names and property accesses are not references", () => {
  it("ignores an attribute whose value is an inline array", () => {
    assert.equal(usesThemesValue('<ThemeScope themes={["light"]} />'), false);
  });

  it("ignores a property access on the runtime", () => {
    assert.equal(usesThemesValue("const catalog = runtime.themes;"), false);
  });

  it("still sees the value half of a prop assignment", () => {
    assert.equal(usesThemesValue("<ThemeProvider themes={themes} />"), true);
  });
});

describe("rule D — noise stripping leaves the code it is meant to scan", () => {
  it("removes comments, literals and markup text but not imports", () => {
    const code = [
      'import { ThemeProvider } from "@themvora/react";',
      "// pass themes here, once they are imported",
      'const label = "View themes";',
      "export const App = () => <ThemeProvider themes={themes} />;",
    ].join("\n");
    const stripped = stripNoise(code);
    assert.match(stripped, /import \{ ThemeProvider \} from ""/);
    assert.equal(/pass themes here/.test(stripped), false);
    assert.equal(/View themes/.test(stripped), false);
    assert.equal(/themes=\{themes\}/.test(stripped), true);
  });

  it("binds through a relative themes module", () => {
    assert.equal(themesIsBound('import catalog from "./themes";', new Set()), true);
    assert.equal(themesIsBound('import catalog from "./palette";', new Set()), false);
  });
});
