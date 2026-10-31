/**
 * Code-block presentation gate — no line numbers, one line-height, one padding.
 *
 * The density work has three failure modes that no screenshot review catches
 * reliably, and each is asserted here against the real highlighter and the real
 * stylesheet:
 *
 *  1. **The gutter comes back as markup.** Line numbers were spans emitted by a
 *     Shiki transformer, not text in the source. A regression there would not
 *     change the copied code, so it would only ever be noticed by eye — and only
 *     on blocks longer than five lines, which is where the old transformer
 *     switched numbering on.
 *
 *  2. **The gutter comes back as space.** Hiding the numbers while keeping the
 *     gutter's width would satisfy "no visible numbers" and still indent every
 *     line. So the stylesheet is checked for the rules that produced the offset,
 *     and for the padding the pane actually uses.
 *
 *  3. **The spacing doubles again.** That was a layout bug, not a value: the
 *     pane inherited `white-space: pre`, so the newlines Shiki writes *between*
 *     line spans each became an empty line box, and every gap was twice the line
 *     height. A future edit that drops one of the three properties this depends
 *     on (`white-space` on `code`, `white-space` on `.line`, a minimum height)
 *     would silently restore it, because the block still renders and still looks
 *     plausible.
 *
 * The code itself is checked too: highlighting must be a pure presentation
 * transform, so the text extracted from the markup has to equal the source it
 * was given, byte for byte, for every language the docs use.
 *
 * Usage: node --experimental-strip-types scripts/check-code-block.mjs
 */
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { highlightCode } from "../lib/highlight.ts";

const here = dirname(fileURLToPath(import.meta.url));
const docsRoot = resolve(here, "..");

const failures = [];
let checks = 0;

const check = (condition, message) => {
  checks += 1;
  if (!condition) failures.push(message);
};

const css = readFileSync(join(docsRoot, "app/globals.css"), "utf8");

/**
 * The text content of a fragment of highlighted markup.
 *
 * Shiki escapes `<` as a *numeric* entity (`&#x3C;`), so a decoder that only
 * knows the named ones reports every JSX sample as changed. `&amp;` is decoded
 * last, or an escaped ampersand in the source would be read as the start of
 * another entity.
 */
const stripTags = (html) => html.replace(/<[^>]+>/g, "");
const decode = (text) =>
  text
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number(dec)))
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");

/** The declarations of the first rule whose selector matches exactly. */
function ruleBody(selector) {
  const pattern = new RegExp(
    `(^|\\n)${selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\{([^}]*)\\}`,
  );
  return pattern.exec(css)?.[2] ?? null;
}

/** A declaration's value from a rule body, or `null`. */
function declaration(body, property) {
  if (!body) return null;
  const match = new RegExp(`(?:^|;|\\s)${property}\\s*:\\s*([^;]+)`).exec(body);
  return match ? match[1].trim() : null;
}

// ---------------------------------------------------------------------------
// 1. The highlighter emits no gutter
// ---------------------------------------------------------------------------

const SAMPLES = [
  ["ts", "const theme = createTheme({\n  primary: \"#7c3aed\",\n});\n"],
  ["ts", "import { setTheme } from \"@themvora/core\";\n\nsetTheme(\"mint-dark\");\n"],
  ["tsx", "export function App() {\n  return <ThemeProvider theme=\"mint\">Hi</ThemeProvider>;\n}\n"],
  ["js", "const theme = createTheme({ primary: \"#7c3aed\" });\n"],
  ["jsx", "export const App = () => <div className=\"p-4\">Hi</div>;\n"],
  ["css", ":root {\n  --theme-color-primary: #7c3aed;\n}\n"],
  ["bash", "pnpm add @themvora/core\npnpm add @themvora/react\n"],
  ["json", "{\n  \"theme\": \"mint-dark\"\n}\n"],
  ["vue", "<script setup lang=\"ts\">\nimport { useTheme } from \"@themvora/vue\";\n</script>\n"],
  ["svelte", "<script>\n  import { themvora } from \"@themvora/svelte\";\n</script>\n"],
  ["html", "<div data-theme=\"mint-dark\">\n  <p>Themed</p>\n</div>\n"],
  ["diff", "--- a/theme.ts\n+++ b/theme.ts\n-  primary: \"#000\"\n+  primary: \"#7c3aed\"\n"],
];

const GUTTER_MARKUP = ["line-number", "line-code", "has-line-numbers", "data-line-numbers"];

for (const [lang, source] of SAMPLES) {
  // Long enough to cross the old five-line numbering threshold, and asked to
  // highlight a line, which was the other trigger.
  const long = source + source + source;
  for (const [label, code, options] of [
    ["short", source, undefined],
    ["long", long, undefined],
    ["highlighted", source, { highlightLines: new Set([1]) }],
  ]) {
    const html = highlightCode(code, lang, options);
    for (const marker of GUTTER_MARKUP) {
      check(
        !html.includes(marker),
        `${lang} (${label}) markup still contains "${marker}" — numbering must not be emitted by the highlighter`,
      );
    }

    // The pane's text must be the source, exactly. This is what Copy reads, and
    // what a reader selects, so it is the strongest statement that the code was
    // not altered by any of this.
    const text = decode(stripTags(html)).replace(/\n$/, "");
    check(
      text === code.replace(/\n$/, ""),
      `${lang} (${label}) highlight round-trip changed the source text`,
    );
  }
}

// The line-highlight mark must be a *class*, not a second attribute. Shiki
// writes `properties.class`, so assigning `className` produced
// `class="line" class="highlighted"` — which an HTML parser drops.
{
  const html = highlightCode("const a = 1;\nconst b = 2;", "ts", {
    highlightLines: new Set([2]),
  });
  check(
    /class="line highlighted"/.test(html),
    "a highlighted line is not marked with a `highlighted` class",
  );
  check(
    !/class="[^"]*"\s+class=/.test(html),
    "a line carries two `class` attributes — the highlight would be dropped by the parser",
  );
}

// ---------------------------------------------------------------------------
// 2. The stylesheet has no gutter and no reserved column
// ---------------------------------------------------------------------------

for (const selector of [
  ".code-block pre.shiki .line-number",
  ".code-block pre.shiki .line-code",
  ".code-block pre.shiki code.has-line-numbers .line",
  ".code-block pre.shiki .highlighted .line-number",
]) {
  check(
    ruleBody(selector) === null,
    `globals.css still styles ${selector} — the gutter rule outlived the gutter`,
  );
}

{
  const pre = ruleBody(".code-block pre.shiki");
  const code = ruleBody(".code-block pre.shiki code");
  const line = ruleBody(".code-block pre.shiki .line");
  const block = ruleBody(".code-block");

  check(pre !== null, "globals.css has no `.code-block pre.shiki` rule");
  check(code !== null, "globals.css has no `.code-block pre.shiki code` rule");
  check(line !== null, "globals.css has no `.code-block pre.shiki .line` rule");
  check(block !== null, "globals.css has no `.code-block` rule");

  // --- padding: 12–16px, from the shared variable ---------------------------
  const padding = declaration(pre, "padding");
  check(
    padding === "var(--tv-code-padding-y) var(--tv-code-padding-x)",
    `.code-block pre.shiki padding is "${padding}" — it must come from the shared density variables`,
  );
  const paddingY = declaration(block, "--tv-code-padding-y");
  const paddingYpx = paddingY ? parseFloat(paddingY) * 16 : NaN;
  check(
    paddingYpx >= 12 && paddingYpx <= 16,
    `--tv-code-padding-y resolves to ${paddingYpx}px, outside the 12–16px band`,
  );

  // --- line-height: one ratio, 1.5–1.65 ------------------------------------
  const ratio = declaration(block, "--tv-code-line-height");
  const ratioValue = ratio ? parseFloat(ratio) : NaN;
  check(
    ratioValue >= 1.5 && ratioValue <= 1.65,
    `--tv-code-line-height is "${ratio}", outside the 1.5–1.65 band`,
  );
  for (const [name, body] of [
    ["pre.shiki", pre],
    ["pre.shiki code", code],
  ]) {
    check(
      declaration(body, "line-height") === "var(--tv-code-line-height)",
      `${name} sets line-height to "${declaration(body, "line-height")}" instead of the shared ratio`,
    );
  }

  // --- the three properties that keep spacing from doubling ----------------
  check(
    declaration(code, "white-space") === "normal",
    `pre.shiki code is "${declaration(code, "white-space")}" — with \`pre\` here the newlines between Shiki's line spans become line boxes of their own, which is what doubled the spacing`,
  );
  check(
    declaration(line, "white-space") === "pre",
    `.line does not preserve whitespace ("${declaration(line, "white-space")}") — indentation would collapse`,
  );
  const minHeight = declaration(line, "min-height");
  check(
    minHeight !== null && minHeight.includes("--tv-code-line-height"),
    `.line has no line-height-derived min-height ("${minHeight}") — a blank line in the source would collapse to zero height`,
  );
  check(
    declaration(line, "display") === "block",
    `.line is not block-level ("${declaration(line, "display")}")`,
  );
}

// ---------------------------------------------------------------------------
// 3. No renderer can opt back in
// ---------------------------------------------------------------------------

/**
 * The option and prop that used to turn numbering on, anywhere in the app.
 *
 * A leftover call site would be dead code that reads as a feature, and the next
 * person to add a block would copy it.
 */
{
  const files = [
    "components/code-block.tsx",
    "components/code-example.tsx",
    "lib/highlight.ts",
    "components/markdown.tsx",
  ];
  for (const file of files) {
    const source = readFileSync(join(docsRoot, file), "utf8");
    // Comments are allowed to explain the removal; identifiers are not.
    const code = source
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/(^|[^:])\/\/[^\n]*/g, "$1");
    for (const symbol of ["showLineNumbers", "lineNumbers:", "data-line-numbers"]) {
      check(
        !code.includes(symbol),
        `${file} still references ${symbol} — numbering must be gone, not switched off`,
      );
    }
  }
}

// ---------------------------------------------------------------------------

if (failures.length > 0) {
  console.error(`✗ code-block presentation: ${failures.length} failure(s)\n`);
  for (const failure of failures) console.error(`  ✗ ${failure}`);
  process.exit(1);
}

const blockRule = ruleBody(".code-block");
const measuredRatio = declaration(blockRule, "--tv-code-line-height");
const measuredPadding = declaration(blockRule, "--tv-code-padding-y");
const measuredPaddingPx = measuredPadding
  ? +(parseFloat(measuredPadding) * 16).toFixed(1)
  : "?";

console.log(
  `ok  code-block presentation — ${checks} assertions: no gutter in markup or CSS, ` +
    `line-height ${measuredRatio}×, padding ${measuredPaddingPx}px, source round-trips unchanged`,
);
