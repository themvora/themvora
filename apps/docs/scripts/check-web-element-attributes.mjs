#!/usr/bin/env node
/**
 * Checks every `<themvora-*>` tag in the documentation against the elements'
 * real `observedAttributes`.
 *
 * A snippet is a string: TypeScript never sees it, so an attribute that the
 * element does not observe is invisible to `tsc` and simply does nothing at
 * runtime. That is the failure mode this guard exists for — a page that looks
 * right in a code block and silently ignores half of it when copied.
 *
 * The element list comes from the sources, not from a list here: every class
 * that declares `observedAttributes` is a registered element, and its tag is
 * read from the same file. Adding an element or an attribute therefore widens
 * what the docs may use, with no edit to this script.
 *
 * Generated files are skipped: `content/api-reference/**` and
 * `content/framework-guides.md` are produced from the sources, so a finding
 * there is a finding in the source, which is already covered.
 *
 * Usage: node apps/docs/scripts/check-web-element-attributes.mjs
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, extname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const docsRoot = dirname(here);
const repoRoot = join(docsRoot, "..", "..");
const webSrc = join(repoRoot, "packages", "web", "src");

// --- the registered elements, from the sources ------------------------------

/** The `[ … ]` after `observedAttributes`, matched with nesting. */
function attributeArray(source) {
  const anchor = source.indexOf("observedAttributes");
  if (anchor === -1) return null;
  // `(): string[]` contains a `[` of its own, and `[]` is empty — skip any
  // bracket that closes immediately, or every scrollbar attribute looks absent.
  let open = -1;
  for (let at = source.indexOf("[", anchor); at !== -1; at = source.indexOf("[", at + 1)) {
    let next = at + 1;
    while (/\s/.test(source[next])) next++;
    if (source[next] !== "]") {
      open = at;
      break;
    }
  }
  if (open === -1) return null;
  let depth = 0;
  let quote = null;
  for (let i = open; i < source.length; i++) {
    const c = source[i];
    if (quote) {
      if (c === "\\") i++;
      else if (c === quote) quote = null;
      continue;
    }
    if (c === '"' || c === "'" || c === "`") {
      quote = c;
      continue;
    }
    if (c === "[") depth++;
    if (c === "]") {
      depth--;
      if (depth === 0) return source.slice(open, i + 1);
    }
  }
  return null;
}

const elements = new Map();
for (const file of readdirSync(webSrc)) {
  if (!file.endsWith(".ts")) continue;
  const source = readFileSync(join(webSrc, file), "utf8");

  const tagMatch =
    source.match(/const TAG\s*=\s*"([^"]+)"/) ??
    source.match(/static define\(tag\s*=\s*"([^"]+)"/);
  // An element with no attributes (`<themvora-toggle>`) has no
  // `observedAttributes` at all; it is still a registered element, and the
  // docs still must not put attributes on it.
  if (!tagMatch || !/customElements\.define/.test(source)) continue;

  const array = attributeArray(source);
  elements.set(tagMatch[1], {
    file,
    attributes: new Set(array === null ? [] : [...array.matchAll(/"([^"]+)"/g)].map((m) => m[1])),
  });
}

if (elements.size === 0) throw new Error("no elements found in packages/web/src");

// --- the documentation files ------------------------------------------------

const SKIP_DIRS = new Set(["node_modules", ".next", ".git"]);
const SKIP_FILES = new Set([
  join(docsRoot, "content", "framework-guides.md"),
  join(docsRoot, "tsconfig.tsbuildinfo"),
]);

function isGenerated(path) {
  return path.includes(join(docsRoot, "content", "api-reference"));
}

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue;
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) walk(path, out);
    else if ([".ts", ".tsx", ".md", ".mdx"].includes(extname(path))) out.push(path);
  }
  return out;
}

const files = ["app", "content", "lib", "components"]
  .map((dir) => join(docsRoot, dir))
  .filter((dir) => statSync(dir, { throwIfNoEntry: false })?.isDirectory())
  .flatMap((dir) => walk(dir))
  .filter((path) => !SKIP_FILES.has(path) && !isGenerated(path));

// --- what a snippet may put on an element -----------------------------------

/**
 * Attributes every element accepts without declaring them: the DOM's own, plus
 * the conventions custom elements inherit. Everything else has to be observed.
 */
const UNIVERSAL = new Set([
  "id",
  "class",
  "style",
  "slot",
  "part",
  "title",
  "hidden",
  "role",
  "tabindex",
  "lang",
  "dir",
  "is",
]);

const isUniversal = (name) =>
  UNIVERSAL.has(name) || name.startsWith("aria-") || name.startsWith("data-") || name.startsWith("on");

/**
 * Tags that look like custom elements but are another package's Angular
 * selector. They are not registered with `customElements`, so they are outside
 * this guard's contract — and `themvora-inspector-component` is the real
 * selector of `ThemeInspectorComponent` in `@themvora/angular`.
 */
const FRAMEWORK_SELECTORS = new Set(["themvora-inspector-component"]);

// --- scan -------------------------------------------------------------------

const failures = [];
const seen = new Map();

for (const path of files) {
  const source = readFileSync(path, "utf8");
  const lines = source.split("\n");

  for (const match of source.matchAll(/<(themvora-[a-z0-9-]+)((?:"[^"]*"|'[^']*'|[^>])*)>/g)) {
    const tag = match[1];
    const attrs = match[2] ?? "";
    const line = source.slice(0, match.index).split("\n").length;

    const element = elements.get(tag);
    if (!element) {
      if (FRAMEWORK_SELECTORS.has(tag)) continue;
      failures.push({
        path: relative(repoRoot, path),
        line,
        detail: `<${tag}> is not a registered element (known: ${[...elements.keys()].join(", ")})`,
      });
      continue;
    }

    for (const attrMatch of attrs.matchAll(/(^|\s)([a-zA-Z][\w:-]*)\s*=/g)) {
      const name = attrMatch[2];
      if (isUniversal(name)) continue;
      seen.set(`${tag} ${name}`, (seen.get(`${tag} ${name}`) ?? 0) + 1);
      if (!element.attributes.has(name)) {
        failures.push({
          path: relative(repoRoot, path),
          line,
          detail: `<${tag}> uses "${name}", which ${element.file} does not observe`,
        });
      }
    }
  }
}

// --- report -----------------------------------------------------------------

if (failures.length === 0) {
  console.log("Web element attributes: OK");
  console.log(
    `  ${elements.size} elements, ${seen.size} distinct attributes across ${files.length} files`,
  );
  for (const [tag, { attributes }] of elements) {
    console.log(`  <${tag}> — ${[...attributes].join(", ") || "(no attributes)"}`);
  }
  process.exit(0);
}

console.log("Web element attribute failures:\n");
for (const f of failures) console.log(`  ✗ ${f.path}:${f.line} — ${f.detail}`);
console.log(`\n${failures.length} failure(s).`);
process.exit(1);
