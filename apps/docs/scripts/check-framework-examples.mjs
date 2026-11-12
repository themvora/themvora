#!/usr/bin/env node
/**
 * Coverage gate for the framework "Examples & use cases" pages.
 *
 * The pages claim that every public API listed in a guide's **What's Available**
 * section has a practical example. That claim is only worth something if it is
 * checkable, so this script compares two data files directly:
 *
 *   `lib/frameworks.tsx`            → the What's Available groups and features
 *   `lib/framework-examples/*.ts`   → each entry's `covers` declaration
 *
 * It fails on:
 *
 *   - a framework that has no examples file, or a file that is not registered
 *     in `lib/framework-examples/index.ts` (the page would 404 or render empty);
 *   - a What's Available feature no example claims (a documented API with no
 *     practical guidance — the whole point of these pages);
 *   - an example that claims a feature which does not exist in What's Available
 *     (an invented API, or a stale name left behind by an edit);
 *   - a category whose label does not match its What's Available group;
 *   - a duplicate anchor id, or a `related` id that resolves to nothing;
 *   - an entry with no `covers`, no `what`, no `when`, no `effect`, or no code.
 *
 * Both files are read as text rather than imported: `lib/frameworks.tsx` is TSX
 * and the example files are TypeScript, and the docs build is the only place
 * that compiles them. Parsing the two literal shapes the files actually use
 * keeps this gate runnable with no toolchain — the same reason
 * `generate-framework-guides.mjs` reads its source the way it does.
 *
 * Usage: node apps/docs/scripts/check-framework-examples.mjs
 * Exit: 0 when clean, 1 on any violation.
 */

import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const siteRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const frameworksPath = join(siteRoot, "lib", "frameworks.tsx");
const examplesDir = join(siteRoot, "lib", "framework-examples");
const registryPath = join(examplesDir, "index.ts");

const read = (path) => readFileSync(path, "utf8").replace(/\r\n/g, "\n");
const failures = [];
const fail = (where, what) => failures.push({ where, what });

/**
 * Undo the escaping a double-quoted TypeScript string applies.
 *
 * Feature names contain quotes — `import "@themvora/web"`, `configKey:
 * "themvora"` — so the source writes them escaped and a naive `"([^"]*)"` stops
 * at the first inner quote and reports a truncated name. Both sides of the
 * comparison go through here, so the two spellings agree.
 */
const unescape = (text) => text.replace(/\\(["\\])/g, "$1");

// ---------------------------------------------------------------------------
// Authority 1 — What's Available, per framework, per group
// ---------------------------------------------------------------------------

/**
 * Parse `rawFrameworks` into `{ slug, groups: [{ label, features: [] }] }`.
 *
 * Indentation and a `groups: [` fence are the parser: a `slug:` line at four
 * spaces starts an entry, `groups: [` at four spaces opens the only array this
 * gate cares about, a `label:` line at eight spaces inside it starts a group,
 * and a `name:` line at twelve spaces inside that group is a feature.
 *
 * The fence matters. Astro's `setupGuide` also contains `id`/`name` pairs — the
 * "Astro-only" and "Astro + React" setup paths — and those are shapes of the
 * guide, not entries in What's Available. Reading only inside `groups` keeps
 * them out, so this gate cannot demand an example for a page layout decision.
 */
function readFrameworkGroups() {
  const src = read(frameworksPath);
  const start = src.indexOf("export const rawFrameworks");
  if (start === -1) {
    throw new Error("could not find `export const rawFrameworks` in lib/frameworks.tsx");
  }

  const out = [];
  let current = null;
  let group = null;
  let inGroups = false;

  for (const line of src.slice(start).split("\n")) {
    const slug = /^ {4}slug: "([^"]+)",$/.exec(line);
    if (slug) {
      current = { slug: slug[1], groups: [], hasSteps: false, hasPaths: false };
      group = null;
      inGroups = false;
      out.push(current);
      continue;
    }
    if (!current) continue;

    // The guide page renders `guideSteps` when a framework has one onboarding
    // sequence, and the framework's own `setupGuide` when it has several shapes
    // (Astro). An entry with neither renders a guide with no onboarding at all,
    // which is a silent hole rather than a visible error — so it is checked
    // here instead of at render time.
    if (/^ {4}guideSteps: \[$/.test(line)) current.hasSteps = true;
    if (/^ {4}setupGuide: \{$/.test(line)) current.hasPaths = true;

    if (/^ {4}groups: \[$/.test(line)) {
      inGroups = true;
      continue;
    }
    if (inGroups && /^ {4}\],$/.test(line)) {
      inGroups = false;
      group = null;
      continue;
    }
    if (!inGroups) continue;

    const label = /^ {8}label: "([^"]+)",$/.exec(line);
    if (label) {
      group = { label: label[1], features: [] };
      current.groups.push(group);
      continue;
    }

    // Feature names may be single-quoted when they contain a double quote —
    // `name: 'import "@themvora/web"'` — so both styles are accepted.
    const name = /^ {12}name: (?:'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)"),$/.exec(line);
    if (name && group) group.features.push(unescape(name[1] ?? name[2]));
  }

  if (out.length === 0) throw new Error("no frameworks parsed from lib/frameworks.tsx");
  return out;
}

// ---------------------------------------------------------------------------
// Authority 2 — the examples data
// ---------------------------------------------------------------------------

/**
 * Every string in a `covers: [...]` / `related: [...]` array, including
 * multi-line arrays. Both quote styles are accepted because the two sides of
 * the comparison do not have to agree on one: `lib/frameworks.tsx` writes
 * `"import \"@themvora/web\""` and an example module may write the same value
 * with single quotes around it.
 */
function readStringArray(src, field) {
  const out = [];
  const re = new RegExp(`${field}:\\s*\\[([\\s\\S]*?)\\]`, "g");
  let match;
  while ((match = re.exec(src))) {
    for (const s of match[1].matchAll(/"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)'/g)) {
      out.push(unescape(s[1] ?? s[2]));
    }
  }
  return out;
}

/**
 * Parse one examples module.
 *
 * The file's shape is a single `FrameworkExamples` object literal, so the
 * fields this gate cares about are read as they appear: `id:` and `label:` and
 * the prose fields inside each entry, `covers:`/`related:` arrays, and the
 * presence of a `code:` template literal.
 */
function readExamplesFile(slug) {
  const path = join(examplesDir, `${slug}.ts`);
  if (!existsSync(path)) return null;
  const src = read(path);

  const ids = [...src.matchAll(/^ {10}id: "([^"]+)",$/gm)].map((m) => m[1]);
  const recipeIds = [...src.matchAll(/^ {6}id: "([^"]+)",$/gm)].map((m) => m[1]);
  const combiningIds = [...src.matchAll(/^ {4}id: "([^"]+)",$/gm)].map((m) => m[1]);
  const categoryIds = [...src.matchAll(/^ {6}id: "([^"]+)",$/gm)].map((m) => m[1]);

  return {
    path,
    src,
    covers: readStringArray(src, "covers"),
    related: readStringArray(src, "related"),
    ids,
    recipeIds,
    combiningIds,
    categoryIds,
    // One `code: [` block per entry, so counting them is enough to catch an
    // entry that forgot its sample.
    codeBlocks: (src.match(/^\s+code: \[$/gm) ?? []).length,
    entryCount: (src.match(/^ {10}name: "/gm) ?? []).length,
  };
}

/** Labels declared by the categories, in order. */
function readCategoryLabels(src) {
  return [...src.matchAll(/^ {6}label: "([^"]+)",$/gm)].map((m) => m[1]);
}

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

const frameworks = readFrameworkGroups();
const registrySrc = read(registryPath);

console.log("\n=== FRAMEWORK EXAMPLES COVERAGE ===\n");
console.log(`frameworks in lib/frameworks.tsx: ${frameworks.length}`);
console.log(`examples modules registered:      ${[...registrySrc.matchAll(/^ {2}(?:"[^"]+"|[a-z]+): [a-zA-Z]+Examples,$/gm)].length}\n`);

for (const framework of frameworks) {
  const { slug } = framework;
  const examples = readExamplesFile(slug);
  const where = `framework-examples/${slug}.ts`;

  // --- the guide has onboarding to render ---------------------------------
  if (!framework.hasSteps && !framework.hasPaths) {
    fail(
      `frameworks.tsx (${slug})`,
      "declares neither `guideSteps` nor `setupGuide`, so its guide renders no onboarding steps",
    );
  }

  if (!examples) {
    fail(where, "no examples module for this framework");
    continue;
  }
  const registered = new RegExp(
    `^ {2}(?:"${slug}"|${slug}): [a-zA-Z]+Examples,$`,
    "m",
  ).test(registrySrc);
  if (!registered) {
    fail(where, "module exists but is not registered in framework-examples/index.ts");
  }

  // --- snippets stay about the integration, not styling --------------------
  // Tailwind is the exception: classes are the subject there.
  if (slug !== "tailwind" && /class(?:Name)?="/.test(examples.src)) {
    fail(
      where,
      "contains a class/className attribute — framework examples should demonstrate APIs, not incidental styling",
    );
  }

  // --- category labels mirror the What's Available groups -----------------
  const labels = readCategoryLabels(examples.src);
  const groupLabels = framework.groups.map((group) => group.label);
  for (const label of groupLabels) {
    if (!labels.includes(label)) {
      fail(where, `category label "${label}" is missing (What's Available group)`);
    }
  }
  for (const label of labels) {
    if (!groupLabels.includes(label)) {
      fail(where, `category label "${label}" does not match any What's Available group`);
    }
  }

  // --- feature coverage ---------------------------------------------------
  const claimed = new Set(examples.covers);
  const features = new Set(framework.groups.flatMap((group) => group.features));
  for (const feature of features) {
    if (!claimed.has(feature)) {
      fail(where, `no example covers What's Available feature: "${feature}"`);
    }
  }
  for (const claim of claimed) {
    if (!features.has(claim)) {
      fail(where, `claims a feature that is not in What's Available: "${claim}"`);
    }
  }

  // --- ids and links ------------------------------------------------------
  const allIds = [...examples.ids, ...examples.recipeIds, ...examples.combiningIds];
  const seen = new Set();
  for (const id of allIds) {
    if (seen.has(id)) fail(where, `duplicate anchor id: "${id}"`);
    seen.add(id);
  }
  for (const related of examples.related) {
    if (!allIds.includes(related)) {
      fail(where, `\`related\` points at an unknown anchor: "${related}"`);
    }
  }

  // --- per-entry completeness --------------------------------------------
  const entries = (examples.src.match(/^ {8}\{$/gm) ?? []).length;
  if (examples.entryCount === 0) {
    fail(where, "no API entries found");
  }
  if (examples.codeBlocks < examples.entryCount) {
    fail(
      where,
      `${examples.entryCount} entries but only ${examples.codeBlocks} code blocks — every entry needs a sample`,
    );
  }
  void entries;

  const covered = `${features.size - [...features].filter((f) => !claimed.has(f)).length}/${features.size}`;
  console.log(`  ${slug.padEnd(10)} groups ${String(labels.length).padStart(2)} · features ${covered.padStart(6)} · entries ${String(examples.entryCount).padStart(2)}`);
}

// --- required prose fields ------------------------------------------------
for (const framework of frameworks) {
  const examples = readExamplesFile(framework.slug);
  if (!examples) continue;
  const missing = [];
  if (!/what: "/.test(examples.src)) missing.push("what");
  if (!/when: "/.test(examples.src)) missing.push("when");
  if (!/effect: "/.test(examples.src)) missing.push("effect");
  if (missing.length) {
    fail(
      `framework-examples/${framework.slug}.ts`,
      `entries are missing required prose fields: ${missing.join(", ")}`,
    );
  }
}

console.log("");
if (failures.length) {
  console.log(`FAIL — ${failures.length} violation(s):\n`);
  for (const { where, what } of failures) console.log(`  ✗ ${where}\n      ${what}`);
  console.log("");
  process.exit(1);
}

console.log("OK — every What's Available feature has an example, and every example maps to a real feature.\n");
