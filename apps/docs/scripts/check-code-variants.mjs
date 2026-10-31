#!/usr/bin/env node
/**
 * Code-variant gate.
 *
 * Three things are checked, and none of them is implied by the others:
 *
 *  1. **The transform is correct.** A table of hand-written cases covers every
 *     TypeScript construct the docs actually use — annotations, generics,
 *     interfaces, type-only imports, `as const`, `satisfies`, typed callbacks,
 *     and the single-file-component forms — plus the constructs that must be
 *     *refused* (enums, decorators, `defineProps<Props>()`, parameter
 *     properties). Each case asserts the exact output, so a regression shows up
 *     as a diff rather than as a wrong snippet on a live page.
 *
 *  2. **The corpus derives or refuses, never guesses.** Every snippet the docs
 *     contain is run through the derivation; `invalid-output` is a hard failure,
 *     and the census of reasons is printed so the set of examples that stay
 *     TypeScript-only is an inventory a reviewer can read instead of a claim.
 *
 *  3. **The compiler stays out of the browser.** `lib/code-variants.ts` imports
 *     the TypeScript compiler. A `"use client"` module that imports it for value
 *     (rather than `import type`) would ship ~9 MB of parser to every reader.
 *
 * Usage: node --experimental-strip-types scripts/check-code-variants.mjs
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { deriveJavaScript, javascriptFilename } from "../lib/code-variants.ts";
import {
  PRESET_FAMILY_TOKEN,
  PRESET_FRAMEWORKS,
  getPresetFrameworkSnippet,
} from "../components/preset-snippets.ts";
import { getBrandPresets, getPresetThemes } from "@themvora/core";
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
// 1. Transform cases
// ---------------------------------------------------------------------------

/** `[name, lang, input, expected]` — `expected: null` means "must refuse". */
const CASES = [
  ["annotation", "ts", `const theme: string = "mint";`, `const theme = "mint";`],
  ["params", "ts", `function f(a: string, b?: number) { return a; }`, `function f(a, b) { return a; }`],
  ["return type", "ts", `function f(a: string): number { return 1; }`, `function f(a) { return 1; }`],
  ["arrow return", "ts", `const f = (a: number): string => String(a);`, `const f = (a) => String(a);`],
  [
    "destructured param type",
    "ts",
    `function f({ children }: { children: ReactNode }) { return children; }`,
    `function f({ children }) { return children; }`,
  ],
  [
    "interface removed",
    "ts",
    `interface Props { name: string }\nexport function A(p: Props) { return p.name; }`,
    `export function A(p) { return p.name; }`,
  ],
  ["type-only import", "ts", `import type { Theme } from "@themvora/core";\nexport const t = 1;`, `export const t = 1;`],
  [
    "inline type specifier",
    "ts",
    `import { type Theme, useState } from "react";\nexport const t = useState();`,
    `import { useState } from "react";\nexport const t = useState();`,
  ],
  ["generic function", "ts", `export function pick<T>(items: T[]): T | undefined { return items[0]; }`, `export function pick(items) { return items[0]; }`],
  ["generic call", "ts", `const m = new Map<string, number>();`, `const m = new Map();`],
  ["as const", "ts", `export const modes = ["light", "dark"] as const;`, `export const modes = ["light", "dark"];`],
  ["satisfies", "ts", `const cfg = { theme: "mint" } satisfies Config;`, `const cfg = { theme: "mint" };`],
  [
    "class fields",
    "ts",
    `export class Store {\n  private readonly theme: string = "mint";\n  constructor() {}\n  get(): string { return this.theme; }\n}`,
    `export class Store {\n  theme = "mint";\n  constructor() {}\n  get() { return this.theme; }\n}`,
  ],
  ["typed callback", "ts", `items.map((item: string): string => item.trim());`, `items.map((item) => item.trim());`],
  [
    "vue sfc",
    "vue",
    `<script setup lang="ts">\nimport { useTheme } from "@themvora/vue";\nconst { theme } = useTheme();\n</script>\n\n<template><p>{{ theme.name }}</p></template>`,
    `<script setup>\nimport { useTheme } from "@themvora/vue";\nconst { theme } = useTheme();\n</script>\n\n<template><p>{{ theme.name }}</p></template>`,
  ],
  [
    "svelte sfc",
    "svelte",
    `<script lang="ts">\n  let count: number = $state(0);\n</script>\n\n<button>{count}</button>`,
    `<script>\n  let count = $state(0);\n</script>\n\n<button>{count}</button>`,
  ],
  [
    "astro frontmatter",
    "astro",
    `---\nimport { getThemeController } from "@themvora/astro";\nconst controller = getThemeController() as ThemeController;\n---\n\n<p>hi</p>`,
    `---\nimport { getThemeController } from "@themvora/astro";\nconst controller = getThemeController();\n---\n\n<p>hi</p>`,
  ],
  [
    "vue runtime defineProps",
    "vue",
    `<script setup lang="ts">\nconst props = defineProps({ label: String });\n</script>\n\n<template><p>{{ props.label }}</p></template>`,
    `<script setup>\nconst props = defineProps({ label: String });\n</script>\n\n<template><p>{{ props.label }}</p></template>`,
  ],
  [
    "vue named handler",
    "vue",
    `<script setup lang="ts">\nfunction handleChange(event: Event) {\n  const target = event.currentTarget;\n  if (!(target instanceof HTMLSelectElement)) return;\n  console.log(target.value);\n}\n</script>\n\n<template><select @change="handleChange"><option>A</option></select></template>`,
    `<script setup>\nfunction handleChange(event) {\n  const target = event.currentTarget;\n  if (!(target instanceof HTMLSelectElement)) return;\n  console.log(target.value);\n}\n</script>\n\n<template><select @change="handleChange"><option>A</option></select></template>`,
  ],
  [
    "svelte typed props",
    "svelte",
    `<script lang="ts">\n  let { label }: { label: string } = $props();\n</script>\n\n<p>{label}</p>`,
    `<script>\n  let { label } = $props();\n</script>\n\n<p>{label}</p>`,
  ],
  [
    "svelte typed event handler",
    "svelte",
    `<script lang="ts">\n  function handleClick(event: MouseEvent) {\n    const target = event.currentTarget as HTMLButtonElement;\n    console.log(target.value);\n  }\n</script>\n\n<button onclick={handleClick}>Click</button>`,
    `<script>\n  function handleClick(event) {\n    const target = event.currentTarget;\n    console.log(target.value);\n  }\n</script>\n\n<button onclick={handleClick}>Click</button>`,
  ],
  [
    "astro typed frontmatter",
    "astro",
    `---\nconst family: string = "mint";\nconst count: number = 42;\n---\n\n<p>{family}: {count}</p>`,
    `---\nconst family = "mint";\nconst count = 42;\n---\n\n<p>{family}: {count}</p>`,
  ],
  [
    "vue template expression types",
    "vue",
    `<script setup lang="ts">
import { useTheme } from "@themvora/vue";
const { setFamily } = useTheme();
</script>

<template>
  <select @change="(e: Event) => setFamily((e.target as HTMLSelectElement).value)">
    <option value="light">Light</option>
  </select>
</template>`,
    `<script setup>
import { useTheme } from "@themvora/vue";
const { setFamily } = useTheme();
</script>

<template>
  <select @change="(e) => setFamily((e.target).value)">
    <option value="light">Light</option>
  </select>
</template>`,
  ],
  [
    "svelte inline handler types",
    "svelte",
    `<script lang="ts">
  import { useTheme } from "@themvora/svelte";
  const { setFamily } = useTheme();
</script>

<select onchange={(e: Event) => setFamily((e.currentTarget as HTMLSelectElement).value)}>
  <option value="light">Light</option>
</select>`,
    `<script>
  import { useTheme } from "@themvora/svelte";
  const { setFamily } = useTheme();
</script>

<select onchange={(e) => setFamily((e.currentTarget).value)}>
  <option value="light">Light</option>
</select>`,
  ],

  // Refusals — a JavaScript version would change what the snippet does.
  ["enum", "ts", `export enum Mode { Light, Dark }`, null],
  ["decorator", "ts", `@Component({ selector: "app" })\nexport class App {}`, null],
  ["vue defineProps generic", "vue", `<script setup lang="ts">\nconst props = defineProps<{ label: string }>();\n</script>\n\n<template><p>{{ props.label }}</p></template>`, null],
  ["overload signature", "ts", `export function setTheme(theme: Theme): void;`, null],
  ["css is not code", "css", `.btn { color: red; }`, null],
  ["shell is not code", "bash", `pnpm add @themvora/core`, null],
];

for (const [name, lang, input, expected] of CASES) {
  const actual = deriveJavaScript(input, lang).js;
  if (expected === null) {
    if (actual !== null) fail(`${name}: expected no JavaScript variant, got:\n${actual}`);
    continue;
  }
  if (actual === null) {
    fail(`${name}: expected a JavaScript variant, got none (${deriveJavaScript(input, lang).reason})`);
    continue;
  }
  if (actual.trim() !== expected.trim()) {
    fail(`${name}: unexpected output\n--- expected ---\n${expected}\n--- actual ---\n${actual}`);
  }
}

// Filenames follow the language.
for (const [input, expected] of [
  ["src/App.tsx", "src/App.jsx"],
  ["theme.config.ts", "theme.config.js"],
  ["src/App.vue", "src/App.vue"],
  ["src/main.tsx — optimized CSR bootstrap", "src/main.jsx — optimized CSR bootstrap"],
]) {
  const actual = javascriptFilename(input);
  if (actual !== expected) fail(`javascriptFilename(${input}): expected ${expected}, got ${actual}`);
}

// ---------------------------------------------------------------------------
// 2. Corpus census
// ---------------------------------------------------------------------------

const DERIVABLE = new Set(["ts", "tsx", "mts", "cts", "typescript", "vue", "svelte", "astro"]);
const census = new Map();
const tsOnly = [];

function record(entry, where) {
  const lang = entry.lang ?? "text";
  const result = deriveJavaScript(entry.code, lang);
  census.set(result.reason, (census.get(result.reason) ?? 0) + 1);
  if (result.reason === "invalid-output") {
    fail(`${where}: derivation produced something that is not JavaScript`);
  }
  if (result.reason !== "derived" && DERIVABLE.has(lang.toLowerCase())) {
    tsOnly.push({ where, title: entry.title ?? "(untitled)", reason: result.reason });
  }
}

const sourceFiles = [
  ...walk(join(docsRoot, "app"), [".ts", ".tsx"]),
  ...walk(join(docsRoot, "lib"), [".ts", ".tsx"]),
  ...walk(join(docsRoot, "components"), [".ts", ".tsx"]),
];

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

// ---------------------------------------------------------------------------
// 3. The preset pages' sentinel derivation must project exactly
// ---------------------------------------------------------------------------

// `lib/preset-js.ts` derives each preset setup snippet's JavaScript once, with a
// sentinel in place of the family name, and the browser substitutes the real
// name back in. That is only sound if the substitution reproduces the derivation
// for the actual snippet — so this asserts it against every shipped family
// rather than trusting the argument that the name only appears in literals.
{
  const families = {
    default: [...new Set(getPresetThemes().map((theme) => theme.meta?.family))],
    brand: [...new Set(getBrandPresets().map((theme) => theme.meta?.family))],
  };
  let checked = 0;
  for (const kind of ["default", "brand"]) {
    for (const { slug } of PRESET_FRAMEWORKS) {
      for (const mode of ["light", "dark"]) {
        const sentinel = getPresetFrameworkSnippet(PRESET_FAMILY_TOKEN, kind, slug, mode);
        const sentinelJs = deriveJavaScript(sentinel.code, sentinel.lang).js;
        if (sentinelJs === null) continue;
        for (const family of families[kind]) {
          if (!family) continue;
          const real = getPresetFrameworkSnippet(family, kind, slug, mode);
          const realJs = deriveJavaScript(real.code, real.lang).js;
          const projected = sentinelJs.split(PRESET_FAMILY_TOKEN).join(family);
          checked += 1;
          if (realJs !== projected) {
            fail(
              `preset ${kind}/${slug}/${mode}/${family}: substituting the family into the ` +
                `sentinel derivation does not reproduce the real derivation`,
            );
          }
        }
      }
    }
  }
  console.log(`preset projection: ${checked} family/framework/mode combinations verified`);
}

// ---------------------------------------------------------------------------
// 3. The compiler must not reach the client bundle
// ---------------------------------------------------------------------------

for (const file of [...sourceFiles]) {
  const source = readFileSync(file, "utf8");
  if (!/^\s*["']use client["']/m.test(source)) continue;
  for (const match of source.matchAll(/import\s+(type\s+)?[^;]*?from\s+["']([^"']*code-variants)["']/g)) {
    if (!match[1]) {
      fail(
        `${relative(repoRoot, file)}: client module imports ${match[2]} for value — ` +
          `that would bundle the TypeScript compiler into the browser. Use \`import type\`.`,
      );
    }
  }
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

const total = [...census.values()].reduce((a, b) => a + b, 0);
console.log("code variants: transform cases", CASES.length, "| snippets", total);
console.log(
  [...census.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([reason, count]) => `  ${String(count).padStart(5)}  ${reason}`)
    .join("\n"),
);
console.log(`  ${String(tsOnly.length).padStart(5)}  typescript-only (no selector)`);

if (failures.length > 0) {
  console.error(`\n${failures.length} failure(s):`);
  for (const failure of failures) console.error(`  ✗ ${failure}`);
  process.exit(1);
}

console.log("\nok — every derivable snippet produced valid JavaScript or was refused");
