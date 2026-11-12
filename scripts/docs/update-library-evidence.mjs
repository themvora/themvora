/**
 * Derive the internal compatibility evidence from the verification results.
 *
 * This is deliberately a **one-way** generator: no one hand-edits the evidence
 * table. A combination is only recorded as passing a stage when the harness
 * actually produced a result for that stage.
 *
 *   source      — adapter source/exports/peers inspected (always, this repo)
 *   install     — documented dependency set resolved in a fixture
 *   typecheck   — `pnpm run check` for that exact recipe
 *   build       — `pnpm run build` for that exact recipe
 *   browser     — production preview rendered in Chromium
 *   themeSwitch — light/dark AND theme-family switching repainted the library
 *
 * Inputs (produced by the two verification harnesses):
 *   verify/library-recipes/results/*.json
 *   verify/library-recipes/browser/results.json
 *
 * Output:
 *   apps/docs/lib/generated/library-evidence.ts
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const REPO = join(import.meta.dirname, "..", "..");
const RESULTS = join(REPO, "verify", "library-recipes", "results");
const BROWSER = join(REPO, "verify", "library-recipes", "browser", "results.json");
const TARGET = join(REPO, "apps", "docs", "lib", "generated", "library-evidence.ts");

/** Stages that must all pass before a combination is "fully verified". */
const STAGES = ["source", "install", "typecheck", "build", "browser", "themeSwitch"];
/** Frameworks whose production output is server-rendered. */
const SSR = new Set(["Next.js", "Remix", "Nuxt", "Astro"]);

const APPS = {
  React: "verify/library-recipes/apps/react",
  "Next.js": "verify/library-recipes/apps/nextjs",
  Remix: "verify/library-recipes/apps/remix",
  Astro: "verify/library-recipes/apps/astro",
  "Vue 3": "verify/library-recipes/apps/vue",
  Nuxt: "verify/library-recipes/apps/nuxt",
  Svelte: "verify/library-recipes/apps/svelte",
  Solid: "verify/library-recipes/apps/solid",
  Angular: "verify/library-recipes/apps/angular",
};

const TESTS = {
  shadcn: "packages/adapters/shadcn/test",
  bootstrap: "packages/adapters/bootstrap/test",
  daisyui: "packages/adapters/daisyui/test",
  "open-props": "packages/adapters/open-props/test",
  mui: "packages/adapters/mui/test",
  chakra: "packages/adapters/chakra/test",
  antd: "packages/adapters/antd/test",
  mantine: "packages/adapters/mantine/test",
  unocss: "packages/adapters/unocss/test",
};

/** `open-props-svelte.json` -> `open-props/Svelte`. */
const LIBS = ["shadcn", "bootstrap", "daisyui", "open-props", "mui", "chakra", "antd", "mantine", "unocss"];
const DIRS = {
  react: "React", nextjs: "Next.js", remix: "Remix", astro: "Astro",
  vue: "Vue 3", nuxt: "Nuxt", svelte: "Svelte", solid: "Solid", angular: "Angular",
};
function comboFromFile(file) {
  const base = file.replace(/\.json$/, "");
  const lib = LIBS.find((l) => base.startsWith(`${l}-`));
  if (!lib) return null;
  const fw = DIRS[base.slice(lib.length + 1)];
  return fw ? `${lib}/${fw}` : null;
}

const buildResults = new Map();
if (existsSync(RESULTS)) {
  for (const file of readdirSync(RESULTS).filter((f) => f.endsWith(".json"))) {
    const r = JSON.parse(readFileSync(join(RESULTS, file), "utf8"));
    const combo = r.combo ?? comboFromFile(file);
    if (combo) buildResults.set(combo, r);
  }
}

const browserResults = new Map();
if (existsSync(BROWSER)) {
  for (const r of JSON.parse(readFileSync(BROWSER, "utf8"))) {
    browserResults.set(r.combo, r);
  }
}

// The advertised matrix is the docs source of truth — never invent or drop a
// combination because a result file happens to be missing.
const src = readFileSync(join(REPO, "apps", "docs", "lib", "libraries.tsx"), "utf8");
const at = src.indexOf("export const FRAMEWORK_RECIPES");
const end = src.indexOf("export const FRAMEWORK_LANG", at);
const block = src.slice(at, end);
const combos = [...block.matchAll(/^ {2}"([a-z-]+)\/([^"]+)": \{\r?$/gm)]
  .map((m) => `${m[1]}/${m[2]}`)
  .sort();

const failNames = (r) => r.checks.filter((c) => !c.ok).map((c) => c.name);
const byLib = {};

for (const combo of combos) {
  const slash = combo.lastIndexOf("/");
  const lib = combo.slice(0, slash);
  const fw = combo.slice(slash + 1);
  const build = buildResults.get(combo);
  const browser = browserResults.get(combo);

  const checks = browser?.checks ?? [];
  const failed = new Set(failNames({ checks }));
  const switchingNames = [
    "dark changes theme variables",
    "dark repaints the page",
    "light switches back",
    "theme family changes variables",
    "family change repaints library",
    "components still work after theme changes",
  ];
  // "Rendered in a browser" is its own fact: a page can render and theme
  // correctly while still emitting a hydration warning. Only the render-shaped
  // checks decide this stage.
  const RENDER_CHECKS = [
    "http 200",
    "renders content",
    "theme controls rendered",
    "semantic theme variables",
    "library variables mapped",
  ];
  const browserPass = Boolean(browser?.build) && !browser.error && checks.length > 0 &&
    RENDER_CHECKS.filter((n) => checks.some((c) => c.name === n))
      .every((n) => !failed.has(n));
  const themePass = Boolean(browser?.build) && !browser.error &&
    switchingNames.every((n) => !failed.has(n)) &&
    checks.some((c) => c.name === "theme family changes variables" && c.ok);

  const evidence = {
    // "pass" here means the adapter source, published exports, peer ranges and
    // hook signatures were inspected and checked by audit-library-docs.mjs.
    source: "pass",
    install: build ? "pass" : "not-run",
    typecheck: build?.check ? "pass" : "not-run",
    build: build?.build ? "pass" : "not-run",
    browser: browserPass ? "pass" : "not-run",
    themeSwitch: themePass ? "pass" : "not-run",
    // Hydration covers both outcomes: a mismatch in the console, and the
    // missing/streamed SSR styles that cause it. Either one fails the stage.
    hydration: SSR.has(fw)
      ? (browser && checks.length
        ? (["no hydration mismatch", "SSR styles in head", "no streamed Emotion styles in body"]
          .some((name) => failed.has(name)) ? "fail" : "pass")
        : "not-run")
      : "n/a",
    fixture: APPS[fw] ?? "verify/library-recipes/apps",
    test: TESTS[lib],
    // Recorded by the harness from the installed fixture, so evidence names
    // the Node/framework versions a stage actually ran against.
    ...(build?.runtime ? { runtime: build.runtime } : {}),
  };
  evidence.fullyVerified =
    STAGES.every((s) => evidence[s] === "pass") && evidence.hydration !== "fail";
  (byLib[lib] ??= {})[fw] = evidence;
}

const body = [
  "// Generated by scripts/docs/update-library-evidence.mjs — do not edit by hand.",
  "// Each stage is recorded separately; `fullyVerified` is derived, never asserted.",
  "",
  "import type { Evidence } from \"../framework-support\";",
  "",
  "export const LIBRARY_EVIDENCE: Record<string, Record<string, Evidence>> = " +
    JSON.stringify(byLib, null, 2) + ";",
  "",
].join("\n");

mkdirSync(join(REPO, "apps", "docs", "lib", "generated"), { recursive: true });
writeFileSync(TARGET, body, "utf8");

const flat = combos.map((c) => {
  const [lib, ...rest] = c.split("/");
  return byLib[lib][rest.join("/")];
});
console.log(`Wrote ${combos.length} evidence entries to ${TARGET}`);
for (const stage of [...STAGES, "fullyVerified"]) {
  const n = flat.filter((e) => e[stage] === true || e[stage] === "pass").length;
  console.log(`  ${stage.padEnd(14)} ${n}/${combos.length}`);
}
