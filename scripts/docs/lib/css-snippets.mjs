/**
 * CSS snippet correctness.
 *
 * Documentation snippets are strings, so neither TypeScript nor the browser
 * sees an invalid value like `gap: 10 px`. This module owns the extraction and
 * the check so the CLI audit and its regression tests share one implementation.
 *
 * The rule is deliberately narrow: only a numeric value separated from a CSS
 * unit by whitespace is reported. That is always invalid in a CSS value, and it
 * is the exact defect this check exists to catch. Prose, comments, quoted
 * strings and non-CSS code blocks are excluded rather than heuristically
 * filtered, so the check does not produce noise.
 */

import { extractSnippetEntries } from "./snippets.mjs";

/** Units that may follow a number in a CSS value. */
const UNITS = [
  "px",
  "rem",
  "em",
  "%",
  "vh",
  "vw",
  "vmin",
  "vmax",
  "svh",
  "svw",
  "lvh",
  "lvw",
  "dvh",
  "dvw",
  "ch",
  "ex",
  "rex",
  "ric",
  "cap",
  "ic",
  "lh",
  "rlh",
  "pt",
  "pc",
  "cm",
  "mm",
  "Q",
  "in",
  "fr",
  "deg",
  "grad",
  "rad",
  "turn",
  "ms",
  "s",
  "Hz",
  "kHz",
  "dpi",
  "dpcm",
  "dppx",
  "x",
];

const UNIT_PATTERN = `(?:${UNITS.map((unit) => unit.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`;
const NUMBER = String.raw`-?(?:\d+(?:\.\d+)?|\.\d+)`;
const BAD_SPACING = new RegExp(
  String.raw`(${NUMBER})\s+(${UNIT_PATTERN})(?![-\w])`,
  "g",
);

/** Blank out comments but keep newlines so offsets still map to the source. */
function blankComments(css) {
  return css.replace(/\/\*[\s\S]*?\*\//g, (comment) =>
    comment.replace(/[^\n]/g, " "),
  );
}

/** Blank out quoted strings so `content: "10 px"` is not reported. */
function blankStrings(value) {
  return value.replace(/"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/g, (text) =>
    text.replace(/[^\n]/g, " "),
  );
}

/**
 * Find invalid whitespace between a number and its unit inside CSS values.
 *
 * Only declarations (`property: value;` / `property: value}`) are inspected.
 * A selector or at-rule prelude is not a declaration, and quoted strings are
 * removed before the numeric check.
 *
 * @param {string} css
 * @returns {{ property: string, value: string, number: string, unit: string, offset: number }[]}
 */
export function findInvalidUnitSpacing(css) {
  const clean = blankComments(css);
  const issues = [];

  for (const declaration of clean.matchAll(/([\w-]+)\s*:\s*([^;{}]+)(?=;|\})/g)) {
    const property = declaration[1];
    const rawValue = declaration[2];
    const value = blankStrings(rawValue);
    for (const match of value.matchAll(BAD_SPACING)) {
      issues.push({
        property,
        value: match[0],
        number: match[1],
        unit: match[2],
        offset: (declaration.index ?? 0) + declaration[0].indexOf(rawValue) + match.index,
      });
    }
  }

  return issues;
}

/** Whether a snippet declares itself as CSS. */
export function isCssSnippet(entry) {
  const lang = (entry.lang ?? "").toLowerCase();
  if (lang === "css" || lang === "scss" || lang === "pcss" || lang === "postcss") {
    return true;
  }
  return typeof entry.title === "string" && /\.(css|scss)$/i.test(entry.title);
}

/** Extract fenced code blocks with their declared language. */
export function extractMarkdownBlocks(content) {
  const blocks = [];
  const re = /```([a-zA-Z0-9-]*)[^\n]*\n([\s\S]*?)```/g;
  for (const match of content.matchAll(re)) {
    blocks.push({
      lang: match[1] ?? "",
      title: null,
      code: match[2],
      index: match.index ?? 0,
    });
  }
  return blocks;
}

/**
 * Every CSS snippet in one docs source file.
 *
 * TypeScript/TSX files use the shared `extractSnippetEntries` so the audit sees
 * exactly the snippets the rest of the docs tooling sees. Markdown files use
 * their fenced-block language, because `extractSnippetEntries` has no language
 * for a fenced block.
 */
export function extractCssSnippets(file, content) {
  const entries = file.endsWith(".md")
    ? extractMarkdownBlocks(content)
    : extractSnippetEntries(content);

  return entries
    .filter(isCssSnippet)
    .map((entry) => {
      const index = content.indexOf(entry.code);
      return {
        ...entry,
        index: index >= 0 ? index : entry.index ?? 0,
      };
    });
}

/** 1-based line number for an offset. */
export function lineAt(content, offset) {
  let line = 1;
  for (let i = 0; i < offset && i < content.length; i += 1) {
    if (content[i] === "\n") line += 1;
  }
  return line;
}
