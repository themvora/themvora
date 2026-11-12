# Contributing to Themvora

Themvora's documentation is **a tested, copy/pasteable representation of the
shipped ecosystem**. That means docs are never a fifth source of truth and are
never edited "to look right" — they are generated from, or verified against, the
shipped packages.

## The four authorities

Only these decide what is true:

1. **Source exports** — what `packages/*/src` actually exports.
2. **Published package manifests / `exports` maps** — the public surface.
3. **Public JSDoc / TSDoc** — the only prose source for API pages.
4. **TypeScript declarations** — the emitted `.d.ts`.

If the docs disagree with any of these, **the docs are wrong**.

> How to write the docs — page structure, headings, terminology, code-example
> conventions, framework notation, callouts, tabs, accessibility, SEO and
> example quality — is specified in [`docs/style-guide.md`](docs/style-guide.md).
> It is an internal maintainer artifact: there is no public route for it.

## Golden rules
1. The shipped package is the only source of truth.
2. Never invent APIs. If a symbol is not exported, it does not appear in docs.
3. Never hide prerequisites. The first example on any page is self-contained
   relative to its install block.
4. Never repeat the same code by hand. Every repeated snippet comes from a
   canonical source (`examples/**` or a shared lib), not a copy.
5. **Never start by editing the visible page.** Start at the shipped API.
6. Prefer failing the gate over shipping drift.

## Documentation conventions

Every surface that teaches setup — the docs site's Quick Start, each framework
guide, the npm README of every published package, and the root README — teaches
**the same six steps, in the same order, with the same names**. A reader who
learns Themvora on npm and then opens the docs must not have to re-learn the
sequence.

### The six steps

| # | Heading | Contains |
| - | ------- | -------- |
| 1 | `Install` | The package-manager command(s) only. |
| 2 | `Set up` | Provider or plugin registration in the app entry. |
| 3 | `Run and choose a theme` | Script and template/markup only — class names, **no CSS**. |
| 4 | `Add the global stylesheet` | The framework's global stylesheet: the document rule plus the classes step 3 uses. |
| 5 | `Add a small UI` | The optional component example (`.themvora-example-*`). |
| 6 | `Style it with Themvora tokens` | Component styles only. |

Tailwind CSS is the one exception: it is build-time only and has no runtime, so
it has no run step and its stylesheet step is numbered 3. Nothing else may skip
a step or reorder them.

### The stylesheet rules

These three rules are what keep the split meaningful:

1. **Step 3 carries no CSS.** No `<style>` element, no `style={{ … }}`, no
   `var(--theme-*)` reference, no rule. Only markup and the four class names
   `page`, `primary`, `card` and `muted`. If a reader cannot tell which file a
   rule lives in, the step has failed.
2. **Step 4 owns the document rule, exactly once per document.** It starts with
   this block and comment, verbatim:

   ```css
   /* Themvora emits its design tokens as CSS custom properties on the root
      element, so a stylesheet only has to read them. Nothing here is
      theme-specific. */
   html,
   body {
     background: var(--theme-color-background);
     color: var(--theme-color-foreground);
   }
   ```

   Then the page, toggle and card classes from step 3 follow it.
3. **Step 6 never repeats the document rule.** It contains only the
   `.themvora-example-*` component rules, and its prose points back to step 4.

Each token is therefore defined or used in exactly one place per guide. A
document with two `html, body` token blocks is a defect, not a stylistic
choice — the second copy is the one that rots.

### Framework stylesheet filenames

Step 4 names the file the framework's own starter actually uses. These are
verified against `examples/apps/*`, not chosen for tidiness:

| Framework | File | Loaded from |
| --------- | ---- | ----------- |
| React (Vite) | `src/index.css` | `src/main.tsx` — `import "./index.css";` |
| Next.js | `app/globals.css` | `app/layout.tsx` — `import "./globals.css";` |
| Vue | `src/index.css` | `src/main.ts` — `import "./index.css";` |
| Svelte | `src/index.css` | `src/main.ts` — `import "./index.css";` |
| Solid | `src/index.css` | `src/index.tsx` — `import "./index.css";` |
| Angular | `src/styles.css` | `angular.json` — `"styles": ["src/styles.css"]` |
| Web Components | `src/styles.css` | `index.html` — `<link rel="stylesheet" href="/src/styles.css" />` |
| Tailwind CSS | `src/index.css` | the app entry — `import "./index.css";` |
| Astro | `src/styles/global.css` | `src/layouts/BaseLayout.astro` — `import "../styles/global.css";` |
| Nuxt | `app/assets/css/main.css` | `nuxt.config.ts` — `css: ["~/assets/css/main.css"]` |
| Remix | `app/styles.css` | `app/root.tsx` — `import styles from "./styles.css?url";` |
| React Router | `app/app.css` | `app/root.tsx` — `import styles from "./app.css?url";` |

If a starter template changes its stylesheet path, the guide and the README
change with it. The docs site's copy of these names lives in
`CANONICAL_STYLESHEETS` in `apps/docs/lib/frameworks.tsx`.

### READMEs

- A package README keeps the same step order but shows **only that framework's**
  snippets, then links to the full docs for the rest.
- A README may be shorter than a guide, but it may not drop a step, rename one,
  or reorder them.
- Snippets are identical wherever they appear — no wording drift between the
  README and the guide. The prose around them may differ.
- Every code block is labelled with its filename (` ```tsx title="src/main.tsx" `).
- Install commands are accurate per package manager and are **not** restructured
  when the surrounding steps change.

### The gate

```bash
node scripts/docs/check-doc-setup-conventions.mjs   # or: pnpm docs:audit:setup
```

It fails when a README is missing a step, orders them wrongly, contains the
`html, body` token block more than once, puts CSS in "Run and choose a theme",
or leaves a block in steps 3–6 without a `title="<file>"`. It runs as part of
`node scripts/docs/release-gate.mjs`.

## The change workflow

Follow this order. **Never start by editing the visible docs page first** — the
page is the last thing to change, not the first.

```
CHANGE API
   ↓
1. Update implementation + types            (packages/*/src)
   ↓
2. Update public JSDoc / TSDoc              (the only prose source for API pages)
   ↓
3. Build the package                        (tsup + tsc)
   ↓
4. Verify exports + declarations            node scripts/release/export-inventory.mjs
   ↓
5. Reclassify the public surface            node scripts/docs/public-api.mjs
   ↓
6. Update the canonical example             (examples/<feature>/<framework>/ + example.meta.json;
                                             a new directory also needs its `!/examples/<feature>/`
                                             line in `.gitignore`, or it is invisible to a clone)
   ↓
7. Update the capability registry           docs/reference/capabilities.ts
   ↓
8. Update the framework / adapter / feature guide   (apps/docs/**)
   ↓
9. Regenerate the API reference             (apps/docs → node scripts/generate-api-reference.mjs)
   ↓
10. Run the snippet audit + baseline floor
   ↓
11. Run the example consumer fixtures       (Audit C)
   ↓
12. Run the dependency audit                (Audit D)
   ↓
13. Run the docs build + browser smoke      (Audit H)
   ↓
14. pnpm docs:release-gate                  (all of the above, sequentially)
```

### Why this order

- Steps 1–4 make the package correct and *frozen* — the manifest becomes the
  authority the later audits read.
- Step 5 classifies every export (`CORE_PUBLIC`, `FRAMEWORK_PUBLIC`, …). An
  unclassified export fails the build.
- Steps 6–8 update the canonical *sources* (example, registry, guide) so the
  visible page is never the origin of truth.
- Step 9 regenerates API pages from JSDoc. **Never hand-edit generated pages.**
- Steps 10–13 verify the result the way a consumer would experience it.

## Running the gates

> `pnpm` is broken in this environment (a `corepack` shim). Run the scripts
> directly with `node`, or use `npx --yes pnpm@10 <script>`.

Run the audits **sequentially** — they spawn `scripts/release/snippet-audit.mjs`
and share a temp report file.

| Command                                                                    | Enforces                                                                    |
| -------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| `node scripts/docs/public-api.mjs`                                          | §7 — every shipped export is classified; fails on unclassified exports and on any disagreement with the frozen manifest. |
| `node scripts/release/export-inventory.mjs`                                 | Source ⇄ dist ⇄ docs are in sync; regenerates `scripts/release/api-manifest.json`. |
| `node scripts/docs/snapshot-snippet-baseline.mjs`                           | Audit A floor — docs must not shrink and no baseline reference may vanish.   |
| `node apps/docs/scripts/generate-api-reference.mjs --check`                 | §14 — regenerates every API page in memory and compares, so a hand-edited or stale file under `apps/docs/content/api-reference/**` fails. Without `--check` the generator writes. |
| `node scripts/docs/audits/audit-b-package-to-docs.mjs --coverage=fail`      | Audit B — every shipped public export lands on its generated API page and has a guide destination. |
| `node scripts/docs/audits/audit-c-examples.mjs`                             | Audit C (static) — every `examples/**/example.meta.json` is internally consistent with the shipped surface, and every capability has an example (§13 coverage). |
| `node scripts/docs/audits/audit-c-examples.mjs --offline`                   | Audit C (offline) — compiles each example's sources against the workspace's built `.d.ts`, then bundles + **renders** framework examples with `react-dom/server`. Deterministic, no network; this is the `--full` gate step. |
| `node scripts/docs/audits/audit-c-examples.mjs --dynamic`                   | Audit C (dynamic, strongest) — packs the declared packages, installs a temp consumer fixture from those tarballs, typechecks and smoke-runs the example's own sources. Needs `pnpm` + network. |
| `node scripts/release/audit-dependencies.mjs`                               | Audit D — dependency isolation; no forbidden edges, every peer earned.       |
| `node scripts/docs/audits/audit-e-invented-symbols.mjs`                     | Audit E — no doc references a symbol that is not in the registry and shipped. |
| `node scripts/docs/audits/audit-f-internal-symbols.mjs`                     | Audit F — no doc or registry entry references an `INTERNAL` symbol.          |
| `node scripts/docs/audits/audit-g-terminology.mjs`                          | Audit G — canonical vocabulary across JSDoc, guides, README, examples, CLI docs. |
| `node scripts/docs/audits/audit-i-generated-tables.mjs`                     | Audit I — every markdown table in `apps/docs/content/**` parses with the site's own GFM pipeline and every row has as many cells as its header. Catches a wrapped JSDoc summary or a union type (`A \| B`) that silently splits a generated API-page row. |
| `node scripts/docs/audits/audit-page-contracts.mjs`                         | §2 IA integrity + all three §3 page contracts: feature (§3.1 — every `core-feature` guide links its API reference), framework (§3.2), adapter (§3.3 — plus a sidebar entry for every framework/adapter entry), tooling (§3.4). Also flags `content/*.md` that no route renders. |
| `node scripts/docs/audits/audit-browser-smoke.mjs`                          | Audit H — docs build + browser smoke against the built site.                 |
| `node scripts/docs/release-gate.mjs`                                        | §9 — runs the gates above sequentially; any failure blocks release.          |

### The release gate

```bash
node scripts/docs/release-gate.mjs                     # fast: static audits + Audit D + G + page contracts
node scripts/docs/release-gate.mjs --full              # + example typecheck, docs build, Audit H
node scripts/docs/release-gate.mjs --full --dynamic    # everything (§9 end to end)
```

`--full` adds the offline example verify (typecheck + render), the docs build and
Audit H. It needs a headless Chromium (Playwright cache or `THEMVORA_CHROME`)
and the `ws` package; Audit H fails rather than skips in that mode.

`--dynamic` adds the strongest example check — pack the declared packages,
install a throwaway consumer project from those tarballs, typecheck and
smoke-run. It needs `pnpm` + network (~4 min) and uses a private npm cache per
run, so it does not depend on the state of your default npm cache. Run
`docs:release-gate:all` before a release.

### Adding a canonical example

Every capability in `docs/reference/capabilities.ts` must have at least one
example — `audit-c-examples.mjs` fails on any uncovered capability slug. So
adding a capability also means adding an example.

1. Copy an existing folder: `examples/<capability>/react/` for a
   framework example, `examples/<capability>/core/` for a framework-free one.
2. Write `src/App.tsx` (+ `src/themes.ts`) against the **shipped** API only.
3. Set `feature` to the capability **slug** and `expectedExportsUsed` to the
   symbols the example actually uses.
4. Add a `!/examples/<capability>/` negation to `.gitignore`.
5. Verify: `node scripts/docs/audits/audit-c-examples.mjs --offline`.

Framework-free examples are single-file with no relative imports, so the dynamic
tier actually **runs** them; React examples are **rendered** by the offline tier.
Prefer a framework-free example for pure APIs (token resolution, scheduling math,
generation, contrast checks), and a React one when the surface is a
component or hook.

**Get the theme shape right.** A theme is one definition *per mode*:

```ts
defineTheme({
  name: "ocean-dark",
  meta: { family: "ocean", mode: "dark" },
  tokens: { colors: { background: "#082f49", foreground: "#e0f2fe" } },
});
```

A `{ name, light, dark }` object is **not** a `ThemeDefinition`. It typechecks
anyway — TypeScript skips excess-property checks when the contextual type is a
bare type parameter — but produces a theme with no tokens. Copy an existing
example rather than inventing the shape.

## Where things live

| Path                                    | Kind      | Notes                                                            |
| --------------------------------------- | --------- | ---------------------------------------------------------------- |
| `docs/style-guide.md`                    | authored  | **how to write the docs** — structure, terminology, examples, a11y, SEO. Internal only; there is no public route. |
| `docs/reference/capabilities.ts`         | authored  | capability ↔ package ↔ symbol registry. Never edited by tooling.  |
| `docs/reference/public-api.json`         | generated | every shipped export, classified.                                 |
| `docs/reference/baselines/**`            | generated | frozen floors (snippet baseline, Audit G allowlist).              |
| `apps/docs/{app,lib,content}`            | authored  | the deployed site: prose + code.                                  |
| `apps/docs/content/api-reference/**`     | generated | **never hand-edit** — regenerate with `generate-api-reference.mjs`. |
| `examples/<feature>/<framework>/**`       | authored  | concept examples consumed by docs (each has `example.meta.json`).  |
| `examples/apps/**`                       | authored  | framework starter apps (described by their own `package.json`).    |

## Anti-patterns (blocked by CI)

- A doc page referencing a symbol not in `capabilities.ts`.
- A snippet importing `@themvora/core` without declaring it in its install block.
- A "minimal" example that requires the reader to invent `themes.ts`,
  `provider.ts`, or `runtime.ts`.
- The same non-trivial code appearing in two places without a canonical source.
- Framework guides inventing `useThemeConfig()`-style helpers that are not shipped.
- Adapter docs implying unrelated framework packages are required, or omitting
  actual required peers.
- Feature pages duplicating the API reference instead of linking it.
- Hand-editing anything under `apps/docs/content/api-reference/**`.

## Audits and what they read

- **Audit A** (floor) — `docs/reference/baselines/snippet-baseline.json`.
- **Audit B** — `docs/reference/public-api.json` ⇄ generated API pages.
- **Audit C** — `examples/**/example.meta.json` ⇄ the shipped surface, plus §13
  coverage (every capability has an example). An empty or missing `examples/`
  fails: with nothing to read, every structural rule would pass vacuously.
- **Audit D** — `scripts/release/dependency-policy.json` ⇄ the real dependency graph.
- **Audit E/F** — `docs/reference/capabilities.ts` ⇄ the shipped exports.
- **Audit G** — the prose surfaces ⇄ the canonical vocabulary
  (`theme, family, mode, runtime, scope, tokens, adapter, schedule, transition, persistence`).
  Fix the prose; only widen the allowlist for a genuine false positive.
- **Audit H** — the built docs site in a real browser.

## Reporting a bug in the docs system

Every audit failure prints **the offending file, the offending symbol/import, and
the contract it violates**. Fix the *root cause* — the source, the registry, or
the example — not the symptom. If an audit is wrong, fix the audit; do not
silence it.
