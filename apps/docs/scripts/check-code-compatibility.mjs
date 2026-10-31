#!/usr/bin/env node
/**
 * Code-compatibility gate.
 *
 * The badge in a block's toolbar (`TS / JS`, `TSX / JSX`, `TS`, `TSX`, `JS`,
 * `JSX`) is a *claim about the source*, not about the conversion. This gate
 * exists so that claim cannot silently drift, and so the corpus it is made about
 * stays an inventory a reviewer can read.
 *
 * Four things are checked, none implied by the others:
 *
 *  1. **Detection.** A table of cases asserts the exact label for sources that
 *     are valid in both languages, valid only as TypeScript, valid only as TSX,
 *     and for languages where no combined label applies at all. The ambiguous
 *     cases matter as much as the clear ones: a fragment that does not parse on
 *     its own, a `satisfies` that needs erasure, a `<T>` that could be a JSX
 *     element — the label must fall back to the grammar, never guess.
 *
 *  2. **The label agrees with the derivation.** A snippet labelled `TS / JS`
 *     must also be one the derivation reports as *already* JavaScript, and a
 *     snippet labelled `TS` must not be. The two use different code paths, so
 *     agreement is evidence rather than tautology.
 *
 *  3. **The label is independent of the grammar.** A badge never rewrites the
 *     source, never changes the highlight language, and never changes the
 *     filename — asserted here, and again in the browser probe against the DOM.
 *
 *  4. **The TypeScript-only exception holds.** Angular documentation is
 *     TypeScript-only by decision (`TYPESCRIPT_ONLY_FRAMEWORKS`): no JavaScript
 *     variant, no selector, no combined label — even for the snippets that are
 *     technically valid JavaScript. Checked at the policy level (the functions
 *     refuse when told the framework), at the recognition level (the corpus
 *     detector finds the Angular snippets) and at the corpus level (not one of
 *     them carries a combined label).
 *
 *  5. **The corpus census.** Counts per label, printed, with a sample of the
 *     dual-labelled and TypeScript-only results for manual review. Deliberately
 *     not an assertion about the current numbers: the counts follow the
 *     documentation, and a new page must be free to change them.
 *
 * Usage: node --experimental-strip-types scripts/check-code-compatibility.mjs
 */

import { readFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  codeVariants,
  compatibilityBadge,
  compatibilityLabel,
  compatibilityLabels,
  deriveJavaScript,
  isAngularSource,
  isTypeScriptOnlyFramework,
  javascriptFilename,
  javascriptFor,
} from "../lib/code-variants.ts";
import {
  TYPESCRIPT_ONLY_FRAMEWORKS,
  grammarLabel,
  pairWithJavaScript,
} from "../lib/code-language.ts";
import {
  extractMarkdownEntries,
  extractSnippetEntries,
  walk,
} from "../../../scripts/docs/lib/snippets.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const docsRoot = resolve(here, "..");
const repoRoot = resolve(docsRoot, "..", "..");

const failures = [];
const fail = (message) => failures.push(message);

// ---------------------------------------------------------------------------
// 1. Detection cases
// ---------------------------------------------------------------------------

/**
 * `[name, lang, code, expected]` — `expected: null` means "no combined label",
 * which is the answer for CSS, shell, JSON and the single-file components.
 */
const CASES = [
  // Valid in both languages: no syntax a JavaScript engine would reject.
  ["plain statements", "ts", `const theme = "mint";\nconsole.log(theme);`, "TS / JS"],
  ["arrow + template", "ts", `const f = (n) => \`\${n}px\`;\nexport default f;`, "TS / JS"],
  ["jsx component", "tsx", `export function App() {\n  return <ThemeProvider><Child /></ThemeProvider>;\n}`, "TSX / JSX"],
  ["jsx fragment siblings", "tsx", `export function App() {\n  return <>\n    <A />\n    <B />\n  </>;\n}`, "TSX / JSX"],

  // TypeScript-only: the label must not claim a JavaScript reading.
  ["type annotation", "ts", `const theme: string = "mint";`, "TS"],
  ["interface", "ts", `interface Props { name: string }\nexport type X = Props;`, "TS"],
  ["type alias", "ts", `type Mode = "light" | "dark";\nexport const m: Mode = "light";`, "TS"],
  ["as assertion", "ts", `const el = document.body as HTMLElement;`, "TS"],
  ["as const", "ts", `export const modes = ["light", "dark"] as const;`, "TS"],
  ["satisfies", "ts", `const cfg = { theme: "mint" } satisfies Config;`, "TS"],
  ["non-null assertion", "ts", `const root = document.getElementById("root")!;`, "TS"],
  ["enum", "ts", `export enum Mode { Light, Dark }`, "TS"],
  ["namespace", "ts", `export namespace A { export const b = 1; }`, "TS"],
  ["type-only import", "ts", `import type { Theme } from "@themvora/core";\nexport const t = 1;`, "TS"],
  ["generic function", "ts", `export function pick<T>(items: T[]): T | undefined { return items[0]; }`, "TS"],
  ["parameter property", "ts", `export class S { constructor(private readonly a: string) {} }`, "TS"],
  ["tsx annotation", "tsx", `export function App({ label }: { label: string }) {\n  return <p>{label}</p>;\n}`, "TSX"],
  ["tsx inside jsx expression", "tsx", `export function App() {\n  return <p>{(() => { const n: number = 1; return n; })()}</p>;\n}`, "TSX"],

  // Not standalone: a fragment is not evidence of anything, so it must not be
  // reported as valid JavaScript — the derivation refuses it for the same reason.
  ["bodyless signature", "ts", `export function setTheme(theme: Theme): void;`, "TS"],
  ["unbalanced fragment", "ts", `const a = (1;`, "TS"],

  // Languages where a combined label would be meaningless.
  ["css", "css", `.btn { color: red; }`, null],
  ["html", "html", `<div class="a"></div>`, null],
  ["json", "json", `{ "a": 1 }`, null],
  ["bash", "bash", `pnpm add @themvora/core`, null],
  ["vue sfc", "vue", `<script setup lang="ts">\nconst a: number = 1;\n</script>`, null],
  ["svelte sfc", "svelte", `<script lang="ts">\nlet a: number = 1;\n</script>`, null],
  ["astro", "astro", `---\nconst a: number = 1;\n---\n<p>hi</p>`, null],

  // Already-JavaScript languages: the label is the language, not a pair.
  ["js", "js", `const a = 1;`, "JS"],
  ["mjs", "mjs", `export const a = 1;`, "JS"],
  ["jsx", "jsx", `export const A = () => <div />;`, "JSX"],
];

for (const [name, lang, code, expected] of CASES) {
  const actual = compatibilityLabel(code, lang);
  if (actual !== expected) {
    fail(`${name}: expected label ${expected ?? "null"}, got ${actual ?? "null"}`);
  }
}

// A label must never be claimed for a language it does not describe, and case
// in the fence info string must not change the answer.
for (const [lang, code, expected] of [
  ["TS", `const theme: string = "mint";`, "TS"],
  ["TypeScript", `const theme: string = "mint";`, "TS"],
  ["TSX", `const theme: string = "mint";`, "TSX"],
  ["tsx", `export const A = () => <div />;`, "TSX / JSX"],
  ["Tsx", `export const A = ({ n }: { n: number }) => <div>{n}</div>;`, "TSX"],
]) {
  const actual = compatibilityLabel(code, lang);
  if (actual !== expected) {
    fail(`case-insensitive ${lang}: expected ${expected}, got ${actual ?? "null"}`);
  }
}

// ---------------------------------------------------------------------------
// 2. The label agrees with the derivation
// ---------------------------------------------------------------------------

/** Cases where the two independent paths must tell the same story. */
for (const [name, lang, code] of [
  ["plain ts", "ts", `const theme = "mint";`],
  ["plain tsx", "tsx", `export const A = () => <div />;`],
  ["annotated ts", "ts", `const theme: string = "mint";`],
  ["annotated tsx", "tsx", `export const A = ({ n }: { n: number }) => <div>{n}</div>;`],
]) {
  const label = compatibilityLabel(code, lang);
  const reason = deriveJavaScript(code, lang).reason;
  const claimsDual = label !== null && label.includes("/");
  const alreadyJs = reason === "already-javascript";
  if (claimsDual !== alreadyJs) {
    fail(
      `${name}: label ${label} and derivation reason ${reason} disagree about ` +
        `whether the source is already JavaScript`,
    );
  }
}

// ---------------------------------------------------------------------------
// 3. The label is independent of grammar, filename and source
// ---------------------------------------------------------------------------

// The badge is props, not a transformation: it carries the label and nothing
// else, so it cannot touch `language`, `code` or `filename`.
{
  const props = compatibilityBadge(`const theme = "mint";`, "ts");
  const keys = Object.keys(props);
  if (keys.length !== 1 || keys[0] !== "displayLanguage") {
    fail(`compatibilityBadge returned ${JSON.stringify(keys)}; expected only displayLanguage`);
  }
  if (props.displayLanguage !== "TS / JS") {
    fail(`compatibilityBadge: expected TS / JS, got ${props.displayLanguage}`);
  }
  const none = compatibilityBadge(`.a { color: red }`, "css");
  if (Object.keys(none).length !== 0) {
    fail(`compatibilityBadge(css) returned ${JSON.stringify(none)}; expected no props`);
  }
}

// The source a labelled block displays is the source that was labelled — the
// derivation never writes back into the string it was given.
{
  const code = `const theme: string = "mint";\nexport default theme;`;
  const copy = `${code}`;
  compatibilityLabel(code, "ts");
  deriveJavaScript(code, "ts");
  if (code !== copy) fail("the label or derivation mutated its input");
}

// The filename rule is the language's, and the badge does not participate.
for (const [input, expected] of [
  ["src/App.tsx", "src/App.jsx"],
  ["theme.ts", "theme.js"],
]) {
  if (javascriptFilename(input) !== expected) {
    fail(`javascriptFilename(${input}): expected ${expected}`);
  }
}

// ---------------------------------------------------------------------------
// 4. The TypeScript-only exception (Angular)
// ---------------------------------------------------------------------------

/**
 * A snippet with no TypeScript in it at all — the syntax test says `TS / JS`.
 *
 * This is the case the exception exists for. Angular's examples are TypeScript
 * because Angular is, and several of them are also valid JavaScript; the docs
 * still show no selector and no combined label for them.
 */
const PORTABLE = `const theme = "mint";\nconsole.log(theme);`;

/** A JavaScript form that differs from the source, so "identical" cannot pass. */
const PORTABLE_JS = `const theme = "dark";\nconsole.log(theme);`;

// The policy is a named set, not an inference: every member is a decision
// someone made about the documentation, and a silent removal is a regression.
if (!TYPESCRIPT_ONLY_FRAMEWORKS.has("angular")) {
  fail("TYPESCRIPT_ONLY_FRAMEWORKS no longer contains angular");
}

// Matching is on the framework identity, in whatever case a data file spelled
// it — `frameworks.tsx` uses slugs, the library recipes use labels.
for (const framework of ["angular", "Angular", "ANGULAR", " angular "]) {
  if (!isTypeScriptOnlyFramework(framework)) {
    fail(`isTypeScriptOnlyFramework(${JSON.stringify(framework)}) is false`);
  }
}
for (const framework of ["react", "vue", "svelte", "solid", "astro", "web", "next", "", undefined]) {
  if (isTypeScriptOnlyFramework(framework)) {
    fail(
      `isTypeScriptOnlyFramework(${JSON.stringify(framework)}) is true — ` +
        `only ${[...TYPESCRIPT_ONLY_FRAMEWORKS].join(", ")} may be exempt`,
    );
  }
}

// The badge. `TS`, never `TS / JS`, for a source that *is* valid JavaScript.
{
  const label = compatibilityLabel(PORTABLE, "ts", "angular");
  if (label !== "TS") {
    fail(`Angular + valid JavaScript: expected the label TS, got ${label}`);
  }
  const tsx = compatibilityLabel(`export const A = () => <div />;`, "tsx", "angular");
  if (tsx !== "TSX") {
    fail(`Angular + valid JSX: expected the label TSX, got ${tsx}`);
  }

  // The exemption belongs to the framework, not to the corpus: the same source
  // under another framework — or under none — keeps its combined label.
  if (compatibilityLabel(PORTABLE, "ts", "react") !== "TS / JS") {
    fail("a non-Angular framework lost its combined label");
  }
  if (compatibilityLabel(PORTABLE, "ts") !== "TS / JS") {
    fail("a snippet with no framework lost its combined label");
  }

  const badge = compatibilityBadge(PORTABLE, "ts", "angular");
  if (badge.displayLanguage !== "TS") {
    fail(`compatibilityBadge(Angular) returned ${JSON.stringify(badge)}; expected TS`);
  }
}

// The selector. No variant, and the derivation says which rule refused it.
{
  const derived = deriveJavaScript(PORTABLE, "ts", "angular");
  if (derived.js !== null) {
    fail(`an Angular snippet derived a JavaScript variant:\n${derived.js}`);
  }
  if (derived.reason !== "typescript-only-framework") {
    fail(`Angular derivation reason is ${derived.reason}; expected typescript-only-framework`);
  }
  if (javascriptFor(PORTABLE, "ts", "angular") !== null) {
    fail("javascriptFor returned a variant for an Angular snippet");
  }
  if (codeVariants({ code: PORTABLE, lang: "ts", framework: "angular" }) !== undefined) {
    fail("codeVariants paired an Angular snippet");
  }
  // A *different* JavaScript source, so the refusal cannot be the
  // "identical sources" rule wearing the framework's name.
  if (pairWithJavaScript({ code: PORTABLE, lang: "ts", framework: "angular" }, PORTABLE_JS) !== undefined) {
    fail("pairWithJavaScript paired an Angular snippet");
  }

  // Control: the same two sources under another framework do pair, so the two
  // assertions above are about the framework and not about the inputs.
  if (pairWithJavaScript({ code: PORTABLE, lang: "ts", framework: "react" }, PORTABLE_JS) === undefined) {
    fail("pairWithJavaScript refused a React snippet — the guard is too broad");
  }
  if (codeVariants({ code: `const a: string = "mint";`, lang: "ts", framework: "react" }) === undefined) {
    fail("codeVariants refused a React snippet — the guard is too broad");
  }
}

// The recognition rule. A page that knows its framework states it; a Markdown
// fence cannot, so the source itself has to be recognisable. These are the four
// shapes every Angular example in the corpus uses.
for (const [name, code] of [
  ["angular package import", `import { Component } from "@angular/core";`],
  ["integration import", `import { provideTheme } from "@themvora/angular";`],
  ["adapter subpath", `import { injectShadcnTheme } from "@themvora/shadcn/angular";`],
  ["decorator", `@Component({ selector: "app-root" })\nexport class AppComponent {}`],
  ["standalone bootstrap", `bootstrapApplication(AppComponent, { providers: [] });`],
  ["bootstrap config type", `export const appConfig: ApplicationConfig = { providers: [] };`],
  ["integration entry point", `providers: [provideTheme({ defaultTheme: "light" })]`],
]) {
  if (!isAngularSource(code)) fail(`isAngularSource missed an Angular ${name}`);
}

// …and it must not fire on the frameworks it is not about, including a snippet
// whose prose merely mentions Angular — a React example is allowed to say so.
for (const [name, code] of [
  ["react provider", `import { ThemeProvider } from "@themvora/react";`],
  ["vue composable", `import { useTheme } from "@themvora/vue";`],
  ["core runtime", `import { createThemeRuntime } from "@themvora/core";`],
  [
    "prose mention",
    `// Unlike Angular, React has a provider component.\nimport { ThemeProvider } from "@themvora/react";`,
  ],
]) {
  if (isAngularSource(code)) fail(`isAngularSource fired on a ${name} snippet`);
}

// ---------------------------------------------------------------------------
// 5. Corpus census
// ---------------------------------------------------------------------------

const sourceFiles = [
  ...walk(join(docsRoot, "app"), [".ts", ".tsx"]),
  ...walk(join(docsRoot, "lib"), [".ts", ".tsx"]),
  ...walk(join(docsRoot, "components"), [".ts", ".tsx"]),
];

const byLabel = new Map();
const dual = [];
const tsOnly = [];
const angular = [];

function record(entry, where) {
  const lang = entry.lang ?? "text";
  const label = compatibilityLabel(entry.code, lang);
  if (label === null) return;
  byLabel.set(label, (byLabel.get(label) ?? 0) + 1);
  const item = { where, title: entry.title ?? "(untitled)", lang, code: entry.code };
  if (isAngularSource(entry.code)) angular.push({ ...item, label });
  if (label.includes("/")) dual.push({ ...item, label });
  else if (label === "TS" || label === "TSX") tsOnly.push({ ...item, label });
}

for (const file of sourceFiles) {
  for (const entry of extractSnippetEntries(readFileSync(file, "utf8"))) {
    record(entry, relative(repoRoot, file));
  }
}
for (const file of walk(join(docsRoot, "content"), [".md", ".mdx"])) {
  for (const entry of extractMarkdownEntries(readFileSync(file, "utf8"))) {
    record(entry, relative(repoRoot, file));
  }
}

// The corpus, not just the functions. The policy above is a unit test; this is
// the claim the documentation makes. Every snippet whose source is Angular must
// carry a grammar label — no pair — and none of them may appear in the
// dual-labelled list that feeds the "verified in both languages" report.
//
// The floor is not a target: it is what makes the assertion non-vacuous. If the
// recognition rule ever stops matching, this list empties and every other check
// here would pass while saying nothing.
const ANGULAR_FLOOR = 40;
if (angular.length < ANGULAR_FLOOR) {
  fail(
    `only ${angular.length} Angular snippets recognised in the corpus ` +
      `(expected at least ${ANGULAR_FLOOR}) — the recognition rule may have stopped matching`,
  );
}
for (const item of angular) {
  if (item.label.includes("/")) {
    fail(`${item.where}: Angular snippet ${item.title} is labelled ${item.label}`);
  }
  const grammar = grammarLabel(item.lang);
  if (grammar !== null && item.label !== grammar) {
    fail(
      `${item.where}: Angular snippet ${item.title} is labelled ${item.label}; ` +
        `a ${item.lang} snippet must be ${grammar}`,
    );
  }
}

// `compatibilityLabels` must agree with the single-snippet function for every
// entry it is asked about — guides look labels up by source text, so a keying
// mistake would show up as a silently unbadged block.
{
  const samples = [...dual, ...tsOnly].slice(0, 200);
  const map = compatibilityLabels(samples.map((s) => ({ code: s.code, lang: s.lang })));
  for (const sample of samples) {
    if (map[sample.code] !== sample.label) {
      fail(
        `${sample.where}: compatibilityLabels disagrees for ${sample.title} — ` +
          `${map[sample.code] ?? "missing"} vs ${sample.label}`,
      );
    }
  }
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

const total = [...byLabel.values()].reduce((a, b) => a + b, 0);
console.log(`code compatibility: ${CASES.length} detection cases | ${total} labelled snippets`);
console.log(
  [...byLabel.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([label, count]) => `  ${String(count).padStart(5)}  ${label}`)
    .join("\n"),
);
// Reported apart from the label counts: these snippets are inside the totals
// above, and the number is the evidence that the exception is in effect rather
// than the corpus happening to contain no Angular examples.
console.log(
  `  ${String(angular.length).padStart(5)}  of those are Angular — TypeScript-only by decision`,
);

/**
 * A handful of representative results, printed for review.
 *
 * The census above is a diagnostic, not an assertion: it moves whenever the
 * documentation does. These samples are what a reviewer actually reads to decide
 * whether a label is truthful.
 */
function sample(list, n) {
  return list
    .filter((item) => item.code.split("\n").length > 2)
    .slice(0, n)
    .map((item) => `    ${item.label.padEnd(9)} ${item.where} — ${item.title}`);
}
console.log("\n  sample — verified in both languages:");
console.log(sample(dual, 6).join("\n") || "    (none)");
console.log("\n  sample — TypeScript only:");
console.log(sample(tsOnly, 6).join("\n") || "    (none)");

if (failures.length > 0) {
  console.error(`\n${failures.length} failure(s):`);
  for (const failure of failures) console.error(`  ✗ ${failure}`);
  process.exit(1);
}

console.log("\nok — every label matches the source it describes");
