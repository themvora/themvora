#!/usr/bin/env node
/**
 * Guards the quick-start snippets on the Web Components framework guide and the
 * vanilla page.
 *
 * Both pages must be copy-paste runnable by someone who has just created a
 * Vite vanilla-ts project and installed only the documented packages. That
 * contract is easy to break silently: a stray `@themvora/app-shared` import (a
 * monorepo-only package), a Tailwind class in a "native CSS" example, an
 * import map left over from an earlier standalone-HTML revision, or a token
 * name that the shipped runtime never emits — none of which the TypeScript
 * compiler sees, because the snippets are strings.
 *
 * The checks are deliberately about *properties* of the snippets, not their
 * exact text: comparing whole snippets would fail on every wording tweak while
 * still missing a broken import.
 *
 * Usage: node apps/docs/scripts/check-quickstart-snippets.mjs
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { readWebSnippets, snippetAt } from "./lib/frameworks-snippets.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const docsRoot = dirname(here);
const repoRoot = join(docsRoot, "..", "..");

const failures = [];
const fail = (subject, detail) => failures.push({ subject, detail });

// --- the canonical sources ---------------------------------------------------

const frameworksSrc = readFileSync(join(docsRoot, "lib", "frameworks.tsx"), "utf8");
const vanillaSrc = readFileSync(join(docsRoot, "app", "vanilla", "page.tsx"), "utf8");

/**
 * The web entry's snippets, read by the same module the consumer test uses.
 *
 * Reading them here with a second parser is how the two guards could disagree
 * about what the docs say: one of them would be checking a snippet the other
 * had mis-sliced.
 */
const snippets = readWebSnippets(repoRoot);

/** `{ title, code }` for a `const name = { … }` snippet in the vanilla page. */
function vanillaSnippet(name) {
  const at = vanillaSrc.indexOf(`const ${name} = {`);
  if (at === -1) throw new Error(`vanilla snippet "${name}" not found`);
  return snippetAt(vanillaSrc, at, name, snippets.styles);
}

const webFiles = {
  "index.html (step 2)": snippets.noTheme,
  "src/main.ts (step 2)": snippets.setupExtra,
  "index.html (step 3)": snippets.snippet,
  "index.html (configuration)": snippets.quickStart,
  "index.html (scoped)": snippets.snippet2,
  "scripts/write-pre-paint.mjs": snippets.snippet3,
  "src/style.css": { title: "src/style.css", code: snippets.styles },
};

const vanillaFiles = {
  "index.html (step 2)": vanillaSnippet("setupHtmlSnippet"),
  "src/main.ts": vanillaSnippet("setupTsSnippet"),
  "index.html (step 3)": vanillaSnippet("uiHtmlSnippet"),
  "src/style.css": vanillaSnippet("stylesSnippet"),
};

const pages = [
  { name: "web guide", packages: ["@themvora/core", "@themvora/web"], files: webFiles },
  { name: "vanilla page", packages: ["@themvora/core"], files: vanillaFiles },
];

// --- 1. nothing example-app-only, no Tailwind, no import maps ---------------

const forbidden = [
  ["@themvora/app-shared (monorepo-only)", /@themvora\/app-shared/],
  ["the examples/apps workspace", /examples\/apps/],
  ["a workspace: protocol dependency", /workspace:/],
  ["an import map (pre-Vite revision)", /importmap/],
  ["a raw /node_modules path", /\/node_modules\//],
  ["a public CDN import", /https?:\/\/(?:esm\.sh|cdn\.)/],
  ["a Tailwind utility stack", /\btailwind\b/i],
];

for (const page of pages) {
  for (const [file, { code }] of Object.entries(page.files)) {
    for (const [label, pattern] of forbidden) {
      if (pattern.test(code)) fail(`${page.name} · ${file}`, `contains ${label}`);
    }
  }
}

// --- 2. every snippet declares a creatable file ------------------------------

const CREATABLE = /\.(?:html|ts|css|mjs)$/;
for (const page of pages) {
  for (const [file, { title }] of Object.entries(page.files)) {
    if (!CREATABLE.test(title)) {
      fail(`${page.name} · ${file}`, `declares "${title}", which is not a file a reader can create`);
    }
  }
}

// --- 3. imports are covered by the documented install command ----------------

for (const page of pages) {
  for (const [file, { code, title }] of Object.entries(page.files)) {
    if (!title.endsWith(".ts") && !title.endsWith(".mjs")) continue;
    for (const m of code.matchAll(/from\s+"([^"]+)"/g)) {
      const specifier = m[1];
      if (!specifier.startsWith("@themvora/")) continue;
      const covered = page.packages.some(
        (pkg) => specifier === pkg || specifier.startsWith(`${pkg}/`),
      );
      if (!covered) {
        fail(
          `${page.name} · ${file}`,
          `imports "${specifier}", but the install step only installs ${page.packages.join(", ")}`,
        );
      }
    }
  }
}

// --- 4. the stylesheet only reads tokens the runtime emits -------------------

let emitted = null;
try {
  const core = await import(
    pathToFileURL(join(repoRoot, "packages", "core", "dist", "index.js")).href
  );
  emitted = new Set();
  for (const theme of core.getBuiltInThemes()) {
    for (const name of Object.keys(core.themeToCSSVariables(theme))) emitted.add(name);
  }
} catch {
  console.log("NOTE  packages/core/dist is missing — skipped the token-name check.");
}

if (emitted) {
  for (const [file, { code }] of Object.entries(webFiles)) {
    // HTML snippets carry an inline `<style>` too, so a token name can be
    // wrong in a file whose extension is not `.css`. Scanning only stylesheets
    // let the step-3 card ship a variable the runtime never emits.
    for (const m of code.matchAll(/var\((--theme-[A-Za-z0-9.-]+)\)/g)) {
      if (!emitted.has(m[1])) {
        fail(`web guide · ${file}`, `reads ${m[1]}, which the runtime never emits`);
      }
    }
  }
}

// --- 5. the wiring matches the markup it drives ------------------------------

const webMain = webFiles["src/main.ts (step 2)"].code;
const webPages = Object.entries(webFiles).filter(([file]) => file.startsWith("index.html"));

// Every `index.html` the guide shows is a *replacement* for the same file, and
// the reader keeps the `src/main.ts` they wrote in step 2. So each one has to
// satisfy that module's contract — not just the first two. `quickStart` and the
// scoped example both shipped without `#theme-name`, and `src/main.ts` threw on
// both, blanking the page.
for (const [file, { code: html }] of webPages) {
  if (!html.includes('src="/src/main.ts"')) {
    fail(`web guide · ${file}`, 'does not load the entry module ("/src/main.ts")');
  }
  if (!html.includes("<themvora-provider")) {
    fail(`web guide · ${file}`, "does not contain a <themvora-provider>");
  }
  if (!html.includes('id="theme-name"') && webMain.includes("#theme-name")) {
    fail(
      `web guide · ${file}`,
      "omits #theme-name, which src/main.ts requires (it throws without it)",
    );
  }
  // CSS has to be render-blocking. `import "./style.css"` is injected by the
  // module graph, so in dev the first paint has no stylesheet at all: the page
  // flashes raw HTML and only then becomes the themed page. A `<link>` in
  // <head> is fetched before first paint in dev and extracted by the build.
  if (!html.includes('href="/src/style.css"')) {
    fail(
      `web guide · ${file}`,
      'does not link /src/style.css from <head>, so dev paints the page unstyled first',
    );
  }
}

for (const [file, { code, title }] of Object.entries(webFiles)) {
  if (!title.endsWith(".ts")) continue;
  if (/import\s+["'][^"']+\.css["']/.test(code)) {
    fail(
      `web guide · ${file}`,
      "imports a stylesheet from JavaScript; link it from index.html instead",
    );
  }
}

for (const [file, { code, title }] of Object.entries(webFiles)) {
  if (title.endsWith(".ts") && code.includes('document.querySelector<HTMLElement>("#theme-name")')) {
    if (!/if \(!readout\)\s*\{/.test(code)) {
      fail(`${file}`, "queries #theme-name without a null check or failure path");
    }
    if (!code.includes("runtime.store.subscribe")) {
      fail(`${file}`, "reads the runtime without subscribing, so the readout would go stale");
    }
  }
}

const vanillaMain = vanillaFiles["src/main.ts"].code;
const vanillaHtml = [vanillaFiles["index.html (step 2)"].code, vanillaFiles["index.html (step 3)"].code];
for (const [i, html] of vanillaHtml.entries()) {
  if (!html.includes('id="theme-name"')) {
    fail(
      `vanilla page · index.html (step ${i + 2 === 3 ? 2 : i + 2})`,
      "omits #theme-name, which src/main.ts requires (it throws without it)",
    );
  }
}
if (!vanillaHtml[1].includes("data-mode=") || !vanillaHtml[1].includes("data-family=")) {
  fail("vanilla page · index.html (step 3)", "has no data-mode / data-family controls to wire");
}
for (const event of ["themeChange", "modeChange", "familyChange"]) {
  if (!vanillaMain.includes(`kit.on("${event}"`)) {
    fail("vanilla page · src/main.ts", `does not re-render on "${event}"`);
  }
}

// --- report ------------------------------------------------------------------

if (failures.length === 0) {
  console.log("Quick-start snippets: OK");
  console.log(`  checked ${Object.keys(webFiles).length} web + ${Object.keys(vanillaFiles).length} vanilla snippets`);
  process.exit(0);
}

console.log("Quick-start snippet failures:\n");
for (const { subject, detail } of failures) console.log(`  ✗ ${subject} — ${detail}`);
console.log(`\n${failures.length} failure(s).`);
process.exit(1);
