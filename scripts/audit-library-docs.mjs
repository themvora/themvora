/**
 * Documentation validation for the library pages.
 *
 * The failure mode being guarded against is not a typo — it is a snippet or a
 * label that *looks* right. Every check below was written after a real instance:
 *
 *   1. a framework offered in the public selector with no recipe behind it
 *   2. a framework-specific snippet importing a package entry that does not exist
 *   3. a React import inside a Vue/Svelte/Solid/Angular recipe
 *   4. a `createXTheme()` factory handed `{ family, mode }`, which is not an
 *      `AdapterSource` and silently falls back to the library default
 *   5. a `resolveTheme()` call with the wrong arity — it is `(themes, name)`
 *   6. **internal verification language rendered to readers** — "unverified",
 *      "not yet verified", evidence text. The previous revision leaked our test
 *      bookkeeping into the public page. This check keeps the two layers apart.
 *
 * Failures here are build/audit failures. They must never become public copy.
 *
 * Run: node scripts/audit-library-docs.mjs
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const DOCS = join(import.meta.dirname, "..", "apps", "docs");

const libraries = readFileSync(join(DOCS, "lib", "libraries.tsx"), "utf8");
const support = readFileSync(join(DOCS, "lib", "framework-support.ts"), "utf8");
const renderer = readFileSync(join(DOCS, "components", "library-recipe.tsx"), "utf8");

const failures = [];
const checks = [];

/** Frameworks listed as public for a library, read from the matrix source. */
function publicFrameworks(slug) {
  const m = support.match(new RegExp(`\\n  "?${slug}"?: \\[([^\\]]*)\\]`));
  if (!m) return null;
  return [...m[1].matchAll(/"([^"]+)"/g)].map((x) => x[1]);
}

/** Recipe keys present in the data. */
const recipeKeys = new Set(
  [...libraries.matchAll(/^  "([a-z-]+\/[^"]+)": \{$/gm)].map((m) => m[1]),
);

// ---------------------------------------------------------------------------
// 1. Every publicly offered framework must have a recipe behind it.
// ---------------------------------------------------------------------------
{
  const gaps = [];
  for (const m of libraries.matchAll(/slug: "([a-z-]+)",/g)) {
    const slug = m[1];
    const frameworks = publicFrameworks(slug);
    if (!frameworks) continue;
    for (const f of frameworks) {
      if (!recipeKeys.has(`${slug}/${f}`)) gaps.push(`${slug}/${f}`);
    }
  }
  checks.push(["every public framework has a recipe", gaps.length === 0]);
  if (gaps.length) failures.push(`public frameworks with no recipe: ${gaps.join(", ")}`);
}

// ---------------------------------------------------------------------------
// 2. No recipe exists for a framework the library does not offer.
// ---------------------------------------------------------------------------
{
  const stray = [];
  for (const key of recipeKeys) {
    const [slug, ...rest] = key.split("/");
    const frameworks = publicFrameworks(slug);
    if (!frameworks) continue;
    // A build-time, framework-neutral adapter (UnoCSS) has an empty public
    // framework list but still needs one recipe for its README. Allow a single
    // entry whose name matches the library itself, and nothing more.
    if (frameworks.length === 0) {
      if (rest.length !== 1 || rest[0].toLowerCase() !== slug) stray.push(key);
      continue;
    }
    if (!frameworks.includes(rest.join("/"))) stray.push(key);
  }
  checks.push(["no recipe for a framework the library does not offer", stray.length === 0]);
  if (stray.length) failures.push(`recipes outside the public set: ${stray.join(", ")}`);
}

// ---------------------------------------------------------------------------
// 3. Adapter subpath imports must be real entries.
// ---------------------------------------------------------------------------
{
  const KNOWN = new Set(["react", "vue", "svelte", "solid", "angular", "factory", "client", "server"]);
  const FRAMEWORK_PKGS = ["core", "react", "vue", "svelte", "solid", "angular", "next", "remix", "astro", "nuxt"];
  const bad = [];
  for (const m of libraries.matchAll(/from "(@themvora\/[a-z-]+)\/([a-z-]+)"/g)) {
    const [, pkg, entry] = m;
    if (FRAMEWORK_PKGS.includes(pkg.split("/")[1])) continue;
    if (!KNOWN.has(entry) && !entry.endsWith(".css")) bad.push(`${pkg}/${entry}`);
  }
  const unique = [...new Set(bad)];
  checks.push(["adapter subpath imports are real entries", unique.length === 0]);
  if (unique.length) failures.push(`nonexistent adapter subpaths: ${unique.join(", ")}`);
}

// ---------------------------------------------------------------------------
// 4. No React import in a non-React recipe.
// ---------------------------------------------------------------------------
{
  const reactOnly = /@themvora\/react|@themvora\/next\/client/;
  const leaks = [];
  for (const m of libraries.matchAll(/"([a-z-]+\/(?:Vue 3|Nuxt|Svelte|Solid|Angular))": \{/g)) {
    const at = m.index;
    const entry = libraries.slice(at, libraries.indexOf("\n  },", at));
    if (reactOnly.test(entry)) leaks.push(m[1]);
  }
  checks.push(["no React imports in a non-React recipe", leaks.length === 0]);
  if (leaks.length) failures.push(`React leak in: ${leaks.join(", ")}`);
}

// ---------------------------------------------------------------------------
// 5. No `{ family, mode }` handed to a createXTheme factory.
// ---------------------------------------------------------------------------
{
  const bad = [...libraries.matchAll(/create[A-Za-z]+Theme\(\{\s*(family|mode)/g)];
  checks.push(["no { family, mode } passed to a createXTheme factory", bad.length === 0]);
  if (bad.length) failures.push(`createXTheme given { family, mode }: ${bad.length} site(s)`);
}

// ---------------------------------------------------------------------------
// 6. `resolveTheme` must be called as (themes, name).
// ---------------------------------------------------------------------------
{
  const bad = [...libraries.matchAll(/resolveTheme\(\s*\{/g)];
  checks.push(["resolveTheme called with (themes, name)", bad.length === 0]);
  if (bad.length) failures.push(`resolveTheme({ … }) — wrong arity; it is (themes, name)`);
}

// ---------------------------------------------------------------------------
// 7. Internal verification language must not reach the public renderer.
//
//    The page renderer is where public copy lives. The matrix may say
//    "UNVERIFIED" as much as it likes — that is engineering data — but the
//    renderer must never print it.
// ---------------------------------------------------------------------------
{
  const BANNED = [
    "unverified",
    "not yet verified",
    "verified in this repository",
    "no copy/paste",
    "not supported",
    "not applicable",
    "statusGlyph",
    "StatusPanel",
    "framework-status",
  ];
  const hits = BANNED.filter((b) => renderer.toLowerCase().includes(b.toLowerCase()));
  checks.push(["no internal verification language in the public renderer", hits.length === 0]);
  if (hits.length) failures.push(`internal language rendered: ${hits.join(", ")}`);
}

// ---------------------------------------------------------------------------
// 8. Every framework-sensitive section must have a per-framework override.
//
//    A section with no override falls back to library-level content — which is
//    React-flavoured. That is how "select Next.js" used to change the provider
//    snippet while leaving a React `App.tsx` complete example underneath it: a
//    selector that changes *some* of the recipe is worse than one that changes
//    none, because the reader trusts the parts that did change.
// ---------------------------------------------------------------------------
{
  const SECTIONS = ["mountProvider", "componentExample", "themeSwitchExample", "completeExample"];
  const at0 = libraries.indexOf("const FRAMEWORK_RECIPES");
  const block = libraries.slice(at0, libraries.indexOf("export const FRAMEWORK_LANG", at0));

  const recipes = {};
  let cur = null;
  for (const line of block.split("\n")) {
    const k = line.match(/^  "([a-z-]+\/[^"]+)": \{$/);
    if (k) {
      cur = k[1];
      recipes[cur] = new Set();
      continue;
    }
    if (line.trim() === "},") {
      cur = null;
      continue;
    }
    if (cur) {
      const f = line.match(/^    "(\w+)":/);
      if (f) recipes[cur].add(f[1]);
    }
  }

  const gaps = [];
  for (const m of libraries.matchAll(/slug: "([a-z-]+)",/g)) {
    const slug = m[1];
    for (const f of publicFrameworks(slug) ?? []) {
      const fields = recipes[`${slug}/${f}`];
      if (!fields) {
        gaps.push(`${slug}/${f}: no entry`);
        continue;
      }
      const lack = SECTIONS.filter((x) => !fields.has(x));
      if (lack.length) gaps.push(`${slug}/${f}: ${lack.join(", ")}`);
    }
  }
  checks.push(["every framework has all framework-sensitive sections", gaps.length === 0]);
  if (gaps.length) failures.push(`sections falling back to React content: ${gaps.join("; ")}`);
}

// ---------------------------------------------------------------------------
// 9. Mount the provider must not redefine what Quick Start already defines.
//
//    Both sections were defining the same component — the thing that registers
//    the adapter on the runtime — under two different filenames and two different
//    call styles. A reader following both files it twice and cannot tell which to
//    keep. Mount the provider shows the root file only; the adapter component is
//    Quick Start's job and is referenced, not rewritten.
// ---------------------------------------------------------------------------
{
  const adapterSymbols = [
    "MuiThemeProvider",
    "ChakraThemeProvider",
    "AntdThemeProvider",
    "MantineThemeProvider",
    "useShadcnTheme",
    "useBootstrapTheme",
    "useDaisyTheme",
    "useOpenPropsTheme",
    "injectShadcnTheme",
    "injectBootstrapTheme",
    "injectDaisyTheme",
    "injectOpenPropsTheme",
  ];
  const at0 = libraries.indexOf("const FRAMEWORK_RECIPES");
  const block = libraries.slice(at0, libraries.indexOf("export const FRAMEWORK_LANG", at0));

  const dupes = [];
  for (const m of block.matchAll(/^  "([a-z-]+\/[^"]+)": \{$/gm)) {
    const entry = block.slice(m.index, block.indexOf("\n  },", m.index));
    const mp = entry.match(/^    "mountProvider": "((?:[^"\\]|\\.)*)"/m);
    if (!mp) continue;
    const code = mp[1].replace(/\\n/g, "\n");
    // Defining the adapter symbol here duplicates Quick Start's component.
    const defines = adapterSymbols.filter((sym) => code.includes(sym));
    if (defines.length) dupes.push(`${m[1]} (defines ${defines.join(", ")})`);
  }
  checks.push(["Mount the provider does not redefine the adapter component", dupes.length === 0]);
  if (dupes.length) failures.push(`adapter redefined in mountProvider: ${dupes.join("; ")}`);
}

// ---------------------------------------------------------------------------
// 10. Every CSS-variable prefix the token reference declares must be one core
//     actually emits.
//
//     `/tokens` declared `--theme-z-`; core emits `--theme-z-index-`. The table
//     filters by prefix and slices it off to build each key, so every z-index row
//     rendered `index-10` instead of `10` — a key that does not exist.
//
//     It looked fine because `--theme-z-index-10` *does* start with `--theme-z-`.
//     **A prefix that is a strict prefix of the real one fails quietly**, which is
//     the whole reason this check exists.
// ---------------------------------------------------------------------------
{
  const tokensPage = readFileSync(join(DOCS, "app", "tokens", "page.tsx"), "utf8");
  const declaredPairs = [...tokensPage.matchAll(/id: "(\w+)", prefix: "(--theme-[a-z-]+)"/g)];
  const declared = declaredPairs.map((m) => m[2]);
  const declaredGroups = Object.fromEntries(declaredPairs.map((m) => [m[2], m[1]]));

  // What core actually emits, read from the built package.
  let emitted = [];
  let themeTokens = null;
  try {
    const core = await import(
      pathToFileURL(join(import.meta.dirname, "..", "packages", "core", "dist", "index.js")).href
    );
    const theme = core.getBuiltInThemes()[0];
    emitted = Object.keys(core.themeToCSSVariables(theme));
    themeTokens = theme.tokens;
  } catch {
    emitted = null;
  }

  if (emitted && themeTokens) {
    // Derive the real prefix for each token group from core's own leaf keys,
    // camelCase → kebab-case. `zIndex: { 0, 10, …, auto }` yields the candidate
    // keys `0, 10, …, auto`, and `--theme-z-index-0` minus `--theme-z-index-`
    // is `0` — so that is the real prefix.
    //
    // This is what makes the check able to fail. An earlier version looked for a
    // hyphen after the prefix, which flags correct prefixes
    // (`--theme-typography-font-family-sans`) and — because a *replaced* prefix
    // leaves nothing to compare against — never fires on the broken one either.
    // Assert the declared prefix ends with the group's own name, kebab-cased and
    // de-pluralised: `zIndex` → `z-index-`, `borderWidths` → `border-width-`.
    //
    // Deliberately narrow. Deriving the exact prefix from core's leaf keys was
    // tried and does not work — core's variable naming is not a plain kebab of
    // the token path (`fontFamilies.sans` emits `font-family-sans`, singular),
    // so any such derivation false-positives on typography.
    //
    // This form catches the defect that motivated the check: `--theme-z-` does
    // not end with `z-index-`, so it fails. It will not catch a prefix that is
    // wrong in some other way, and does not claim to.
    const groupSlug = (id) =>
      id
        .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
        .toLowerCase()
        // Strip a plural `s` only when it is one — `radius` must not become
        // `radiu`, and `shadows` must become `shadow`.
        .replace(/(?<![su])s$/, "");

    const bad = [];
    for (const p of declared) {
      const group = declaredGroups[p];
      if (!emitted.some((v) => v.startsWith(p))) {
        bad.push(`${p} (core emits nothing with this prefix)`);
        continue;
      }
      if (group && !p.endsWith(`${groupSlug(group)}-`)) {
        bad.push(`${p} (should end with "${groupSlug(group)}-" for the ${group} group)`);
      }
    }

    checks.push(["every declared token prefix names its own token group", bad.length === 0]);
    for (const b of bad) failures.push(`token prefix: ${b}`);
  } else {
    // Never pass silently — a check that cannot run is not a passing check.
    checks.push(["every declared token prefix names its own token group", false]);
    failures.push("token prefix check could not load @themvora/core — treat as failing, not passing");
  }
}

// ---------------------------------------------------------------------------
// 11. The code-token reference must list every code token core ships.
//
//     It says "Complete reference of every code token" in its own heading, so a
//     missing row is a false claim rather than an omission. It was complete when
//     checked — this keeps it that way, and makes the claim falsifiable.
//
//     Measuring this correctly took three attempts: the CSS-variable cell holds
//     `--theme-code-*`, which a `[a-zA-Z]+` pattern does not match, so pairing
//     cells positionally silently dropped every other token and reported 10 of 19.
// ---------------------------------------------------------------------------
{
  const codePage = readFileSync(join(DOCS, "app", "tokens", "code", "page.tsx"), "utf8");
  const seg = codePage.slice(
    codePage.indexOf('id="token-reference"'),
    codePage.indexOf('id="enable"'),
  );
  // Take the first <code> of each row — the token. The second is the variable.
  const rows = [...seg.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)].map((m) => m[1]);
  const listed = [];
  for (const r of rows) {
    const cells = [...r.matchAll(/<code className="mono">([^<]+)<\/code>/g)].map((m) => m[1]);
    if (cells.length && !cells[0].startsWith("--")) listed.push(cells[0]);
  }

  let shippedCode = null;
  try {
    const core = await import(
      pathToFileURL(join(import.meta.dirname, "..", "packages", "core", "dist", "index.js")).href
    );
    shippedCode = Object.keys(core.getBuiltInThemes()[0].tokens.code);
  } catch {
    shippedCode = null;
  }

  if (shippedCode) {
    const missing = shippedCode.filter((k) => !listed.includes(k));
    const extra = listed.filter((k) => !shippedCode.includes(k));
    checks.push(["code-token reference lists every shipped code token", missing.length === 0 && extra.length === 0]);
    if (missing.length) failures.push(`code tokens missing from /tokens/code: ${missing.join(", ")}`);
    if (extra.length) failures.push(`code tokens listed but not shipped: ${extra.join(", ")}`);
  } else {
    checks.push(["code-token reference lists every shipped code token", false]);
    failures.push("code-token check could not load @themvora/core — treat as failing");
  }
}

// ---------------------------------------------------------------------------
// 12. Every recipe call must satisfy the adapter hook's declared signature.
//
//     Arity is read from the package source, not from the recipe, so the check
//     cannot drift from the packages it documents. It is what would have caught
//     the twelve bare \`useShadcnTheme()\` calls.
//
//     It also settles claims in both directions. Four times in one session I
//     reported a recipe as broken because the cause sounded right — twice falsely,
//     including a Nuxt import and an Angular signal access that were both correct.
//     **A check that reads the real signature refutes a wrong claim as readily as
//     it confirms a right one**, which a note in MEMORY cannot do.
//
//     Replaces an earlier version that asserted the same thing and was vacuous: it
//     passed on a tree with a deliberately reverted call, because the non-vacuity
//     test used String.replace and rewrote only the first occurrence.
// ---------------------------------------------------------------------------
{
  const ADAPTERS = ["shadcn", "bootstrap", "daisyui", "open-props"];
  const HOOKS = {
    shadcn: { vue: "useShadcnTheme", svelte: "useShadcnTheme", solid: "useShadcnTheme", angular: "injectShadcnTheme" },
    bootstrap: { vue: "useBootstrapTheme", svelte: "useBootstrapTheme", solid: "useBootstrapTheme", angular: "injectBootstrapTheme" },
    daisyui: { vue: "useDaisyTheme", svelte: "useDaisyTheme", solid: "useDaisyTheme", angular: "injectDaisyTheme" },
    "open-props": { vue: "useOpenPropsTheme", svelte: "useOpenPropsTheme", solid: "useOpenPropsTheme", angular: "injectOpenPropsTheme" },
  };
  const FW_FILE = {
    "Vue 3": "vue", Nuxt: "vue", Svelte: "svelte", Solid: "solid", Angular: "angular",
    React: "react", Remix: "react", "Next.js": "react", Astro: "react",
  };

  /** Count the required parameters of an exported function, from its source. */
  const requiredArity = (file, fnName) => {
    if (!existsSync(file)) return null;
    const src = readFileSync(file, "utf8");
    const at = src.indexOf("export function " + fnName);
    if (at < 0) return null;
    const open = src.indexOf("(", at);
    let depth = 0;
    let close = -1;
    for (let i = open; i < src.length; i++) {
      if (src[i] === "(") depth += 1;
      else if (src[i] === ")") { depth -= 1; if (depth === 0) { close = i; break; } }
    }
    if (close < 0) return null;
    const params = src.slice(open + 1, close);
    const parts = [];
    let d = 0;
    let cur = "";
    for (const ch of params) {
      if ("(<[{".includes(ch)) d += 1;
      if (")>]}".includes(ch)) d -= 1;
      if (ch === "," && d === 0) { parts.push(cur); cur = ""; continue; }
      cur += ch;
    }
    if (cur.trim()) parts.push(cur);
    return parts.filter((p) => p.trim() && !p.includes("=") && !/^\s*\w+\s*\?/.test(p)).length;
  };

  const arity = {};
  for (const a of ADAPTERS) {
    for (const fw of ["vue", "svelte", "solid", "angular"]) {
      const name = HOOKS[a][fw];
      arity[a + "/" + fw] = {
        name,
        required: requiredArity(join(import.meta.dirname, "..", "packages", "adapters", a, "src", fw + ".ts"), name),
      };
    }
  }

  const libs = readFileSync(join(DOCS, "lib", "libraries.tsx"), "utf8");
  const at = libs.indexOf("const FRAMEWORK_RECIPES");
  const block = libs.slice(at, libs.indexOf("export const FRAMEWORK_LANG", at));

  const bad = [];
  let checked = 0;
  for (const m of block.matchAll(/^ {2}"([a-z-]+\/[^"]+)": \{\r?$/gm)) {
    const key = m[1];
    const entry = block.slice(m.index, block.indexOf("\n  },", m.index));
    const parts = key.split("/");
    const fw = FW_FILE[parts[1]];
    if (!fw || !HOOKS[parts[0]] || !HOOKS[parts[0]][fw]) continue;
    const spec = arity[parts[0] + "/" + fw];
    if (!spec || spec.required == null) continue;

    for (const c of entry.matchAll(new RegExp("\\b" + spec.name + "\\(([^)]*)\\)", "g"))) {
      const args = c[1].trim();
      const count = args === "" ? 0 : args.split(",").filter((x) => x.trim()).length;
      checked += 1;
      if (count < spec.required) {
        bad.push(key + " — " + spec.name + "(" + args + ") supplies " + count + ", needs " + spec.required);
      }
    }
  }

  checks.push(["every recipe call matches its adapter hook's declared signature", bad.length === 0 && checked > 0]);
  if (checked === 0) failures.push("adapter signature check matched no calls — treat as failing, not passing");
  for (const b of bad) failures.push("adapter signature: " + b);
}

// ---------------------------------------------------------------------------
for (const [label, ok] of checks) {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}`);
}
console.log("");
if (failures.length) {
  console.log(`${failures.length} problem(s):`);
  for (const f of failures) console.log("  -", f);
  process.exit(1);
}
console.log("All library-doc checks passed.");
