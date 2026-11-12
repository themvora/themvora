#!/usr/bin/env node
/**
 * Enforces the canonical setup structure across every published README and the
 * root README.
 *
 * The rules are the ones the docs site already follows, applied to the surfaces
 * a reader meets first — the npm page and the GitHub landing page:
 *
 *   1. Install
 *   2. Set up
 *   3. Run and choose a theme
 *   4. Add the global stylesheet
 *   5. Add a small UI
 *   6. Style it with Themvora tokens
 *
 * Three failure modes this catches, none of which a reader would report as a
 * bug but all of which teach the wrong thing:
 *
 *   - **The document rule in two places.** `html, body { … }` belongs to step 4.
 *     A copy in step 6 means the same rule is maintained twice, and the second
 *     copy is the one that rots.
 *   - **CSS in the run step.** Step 3 is markup and class names only. An inline
 *     `<style>` or a `var(--theme-*)` reference there re-creates the coupling the
 *     split exists to remove: the reader can no longer tell which file the rule
 *     lives in.
 *   - **An unlabelled snippet.** Every block in steps 3–6 must name its file, so
 *     a reader can find where the code goes without guessing.
 *
 * Usage: node scripts/docs/check-doc-setup-conventions.mjs
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, "..", "..");

const STEPS = [
  "Install",
  "Set up",
  "Run and choose a theme",
  "Add the global stylesheet",
  "Add a small UI",
  "Style it with Themvora tokens",
];

/**
 * Tailwind CSS is build-time only: it has no runtime and therefore no run step,
 * so its stylesheet step is numbered 3 rather than 4. It is the single
 * documented exception, and it is listed rather than inferred.
 */
const SKIPS_RUN_STEP = new Set(["tailwind"]);

const DOCS = [
  { name: "root README", path: "README.md" },
  { name: "@themvora/react", path: "packages/react/README.md" },
  { name: "@themvora/next", path: "packages/next/README.md" },
  { name: "@themvora/vue", path: "packages/vue/README.md" },
  { name: "@themvora/svelte", path: "packages/svelte/README.md" },
  { name: "@themvora/solid", path: "packages/solid/README.md" },
  { name: "@themvora/angular", path: "packages/angular/README.md" },
  { name: "@themvora/web", path: "packages/web/README.md" },
  { name: "@themvora/tailwind", path: "packages/tailwind/README.md", slug: "tailwind" },
  { name: "@themvora/astro", path: "packages/astro/README.md" },
  { name: "@themvora/nuxt", path: "packages/nuxt/README.md" },
  { name: "@themvora/remix", path: "packages/remix/README.md" },
];

const failures = [];
const fail = (subject, detail) => failures.push({ subject, detail });

/** Split a markdown document into `## ` sections, ignoring headings in fences. */
function sections(text) {
  const lines = text.split("\n");
  const out = [];
  let current = { heading: null, body: [] };
  let fence = null;
  for (const line of lines) {
    const fenceMatch = line.match(/^\s*(`{3,}|~{3,})/);
    if (fenceMatch) {
      if (!fence) fence = fenceMatch[1][0];
      else if (line.trim().startsWith(fence.repeat(3))) fence = null;
      current.body.push(line);
      continue;
    }
    const heading = !fence && line.match(/^##\s+(.+?)\s*$/);
    if (heading) {
      out.push(current);
      current = { heading: heading[1], body: [] };
      continue;
    }
    current.body.push(line);
  }
  out.push(current);
  return out.filter((s) => s.heading);
}

/** Every fenced block in a section: `{ meta, code }`. */
function fences(body) {
  const text = body.join("\n");
  const out = [];
  const re = /^(\s*)(`{3,}|~{3,})([^\n]*)\n([\s\S]*?)^\1?\2\s*$/gm;
  let m;
  while ((m = re.exec(text)) !== null) {
    out.push({ meta: m[3].trim(), code: m[4] });
  }
  return out;
}

/** The step name a heading refers to, or null when it is not a setup step. */
function stepOf(heading) {
  return STEPS.find((step) => heading === step || heading.startsWith(`${step} `)) ?? null;
}

const DOCUMENT_RULE = /html\s*,\s*\n\s*body\s*\{[^}]*--theme-color-background[^}]*--theme-color-foreground/s;

for (const doc of DOCS) {
  const path = join(repoRoot, doc.path);
  let text;
  try {
    text = readFileSync(path, "utf8").replace(/\r\n/g, "\n");
  } catch {
    fail(doc.name, `could not read ${doc.path}`);
    continue;
  }

  const parts = sections(text);
  const setup = parts
    .map((s) => ({ ...s, step: stepOf(s.heading) }))
    .filter((s) => s.step);

  // --- 1. the steps appear once each, in canonical order ---------------------
  const expected = doc.slug === "tailwind"
    ? STEPS.filter((s) => !SKIPS_RUN_STEP.has("x") && s !== "Run and choose a theme")
    : STEPS;

  const seen = setup.map((s) => s.step);
  const missing = expected.filter((step) => !seen.includes(step));
  if (missing.length) {
    fail(doc.name, `missing step(s): ${missing.join(", ")}`);
  }
  const order = seen.filter((step) => expected.includes(step));
  if (order.join(" → ") !== expected.join(" → ") && missing.length === 0) {
    fail(doc.name, `steps are out of order: ${order.join(" → ")}`);
  }

  // --- 2. the document rule appears exactly once, in step 4 -----------------
  const occurrences = text.match(new RegExp(DOCUMENT_RULE.source, "gs")) ?? [];
  if (occurrences.length === 0) {
    fail(doc.name, "no `html, body` token block — step 4 must define it");
  } else if (occurrences.length > 1) {
    fail(
      doc.name,
      `the \`html, body\` token block appears ${occurrences.length} times; it belongs in "Add the global stylesheet" only`,
    );
  } else {
    const sheet = setup.find((s) => s.step === "Add the global stylesheet");
    const inSheet = sheet && fences(sheet.body).some((f) => DOCUMENT_RULE.test(f.code));
    if (!inSheet) {
      fail(doc.name, "the `html, body` token block is not in \"Add the global stylesheet\"");
    }
    const styling = setup.find((s) => s.step === "Style it with Themvora tokens");
    if (styling && fences(styling.body).some((f) => DOCUMENT_RULE.test(f.code))) {
      fail(doc.name, "\"Style it with Themvora tokens\" repeats the `html, body` block");
    }
  }

  // --- 3. no CSS in the run step -------------------------------------------
  // Every section with this heading is checked, not just the first: a document
  // that repeats the step would otherwise pass by having its second copy — the
  // one that actually renders — go unread.
  const runSections = setup.filter((s) => s.step === "Run and choose a theme");
  for (const run of runSections) {
    for (const block of fences(run.body)) {
      const problems = [];
      if (/<style[\s>]/i.test(block.code)) problems.push("an inline <style> element");
      if (/var\(\s*--theme-/.test(block.code)) problems.push("a --theme-* reference");
      if (/^\s*[.#][\w-]+(?:\s*,\s*[.#][\w-]+)*\s*\{/m.test(block.code)) problems.push("a CSS rule");
      if (/style=\{\{/.test(block.code)) problems.push("an inline style prop");
      if (problems.length) {
        fail(doc.name, `"Run and choose a theme" contains ${problems.join(", ")}`);
      }
    }
  }

  // --- 4. every block in steps 3–6 names its file --------------------------
  for (const section of setup) {
    if (section.step === "Install" || section.step === "Set up") continue;
    for (const block of fences(section.body)) {
      if (!/title\s*=\s*"[^"]+"/.test(block.meta)) {
        fail(doc.name, `a block in "${section.step}" does not declare title="<file>"`);
      }
    }
  }
}

if (failures.length === 0) {
  console.log("Documentation setup conventions: OK");
  console.log(`  checked ${DOCS.length} documents against ${STEPS.length} canonical steps`);
  process.exit(0);
}

console.log("Documentation setup convention failures:\n");
for (const { subject, detail } of failures) console.log(`  ✗ ${subject} — ${detail}`);
console.log(`\n${failures.length} failure(s).`);
process.exit(1);
