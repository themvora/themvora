# Documentation Consistency Audit & Remediation

- **Repository:** `D:\Code\NPM Packages\themvora`
- **Audit date:** 2026-11-04
- **Base commit:** `894b0bce8e2e118d654f7b032942ffda725cf75d` (`main`)
- **Environment:** Node.js 24.15.0 for the audit host; verification target Node 22.23.4, pnpm 12.14.0
- **Scope:** documentation app (`apps/docs`), its generated content, package READMEs, snippet sources, routes, redirects, sitemap/robots, and the documentation release gates
- **Change policy:** no package manifest, peer range, package version, API, CI pin, or dependency update was changed; nothing was staged, committed, pushed, tagged, merged, or published

---

## Summary

The documentation now tells one story about installation, SSR, zero-flash and Node support. The largest audit premise was **false for the current manifests**: `@themvora/core` is a **normal dependency** of every framework binding, not a required peer. Installing `@themvora/react` already brings core. The docs still show the explicit pair (`@themvora/core` + the binding) because that is the convention the guides, READMEs and the package pages already used, but the copy now states the real relationship instead of calling it a peer dependency.

The other high-impact findings were real and were fixed at their sources:

1. Package pages called core a peer dependency while the install command pulled it as a dependency. They now render from one contract module and a dependency table generated from that contract.
2. Framework guide headers translated the Compatibility Matrix's canonical values into different words (`Client-only` → `No`, `Manual` → `Partial`). They now render the matrix labels verbatim.
3. Client-only guides had no SSR-limit callout. They now share one accurate callout that links to `/zero-flash`, `/reference/compatibility`, and the appropriate full-SSR integration.
4. The CLI installation page showed `workspace:*` as a public project example, and every CLI page claimed Node.js 22+ while the published manifest declares `>=18`. The public example is now `pnpm add -D @themvora/cli`; `workspace:*` lives under a clearly separate monorepo-contributors heading; the Node distinction is documented and the published CLI was verified to run on Node 18.20.8.
5. `/docs` and four legacy aliases were missing. They now return permanent redirects to verified canonical pages.
6. Heavy client pages shipped Shiki and its grammars in their first-load JavaScript. `CodeBlock` now highlights on demand; the affected routes lost roughly 165 kB of first-load JS each while keeping the source text in the initial HTML.
7. The reported malformed Web Components CSS (`10 px`, `22 rem`) was **not present in the current source**. The rendered snippet and the copy source both use `10px`, `22rem`, `1px`. A CSS-snippet audit with regression tests now prevents the defect from returning.
8. The reported route timeouts were **not reproducible**. All 195 canonical URLs returned a complete document; median response was 140 ms and the slowest was 1,121 ms. The browser gate visited 170/170 routes with zero console/page errors.

The only gate failure found during verification was self-inflicted: rewriting the CLI installation page removed its `## Requirements` heading, so the committed TOC manifest was stale. The manifest was regenerated from the rendered site and the check now passes.

---

## A. Findings

### A.1 The installation premise did not match the manifests

The audit stated that `@themvora/core` is a required peer. It is not.

| Source | Evidence |
| --- | --- |
| `packages/react/package.json` (HEAD and working tree) | `dependencies: { "@themvora/core": "workspace:^" }`; peers are `react`, `react-dom` |
| `packages/next/package.json` | `dependencies: { "@themvora/core", "@themvora/react" }` |
| `packages/vue`, `svelte`, `solid`, `angular`, `web`, `tailwind`, `astro`, `nuxt`, `remix` | all declare `@themvora/core` in `dependencies` |
| npm registry, `@themvora/react@1.4.0` | `dependencies: { "@themvora/core": "^1.5.0" }`; peers: React/React DOM |

Consequences:

- The claim “core is a required peer” is false, so the documentation must not say it.
- The claim “the framework package pulls in core” is true, but too vague to explain the explicit pair.
- The package page simultaneously said “peer dependency” and “pulled in automatically as a dependency” — a direct contradiction.
- Framework guides showed two packages while the install step said “One package.”

### A.2 Other inconsistencies found and fixed

| # | Finding | Source | Impact | Fix |
| --- | --- | --- | --- | --- |
| 1 | Package pages called core a peer and installed it as a dependency | `app/packages/[slug]/page.tsx` | Developers could not tell whether to install core | Contract-driven install command + dependency table |
| 2 | “One package” on guide install steps while the command listed core + binding | `lib/frameworks.tsx` | Copy contradicted the command beside it | Copy now names the core runtime and the binding |
| 3 | `/choose-package` said “every framework package pulls the core runtime” | `app/choose-package/page.tsx`, `lib/search-sections.ts` | Technically true but hid the explicit install convention | Now states core is a normal dependency and why the pair is shown |
| 4 | Guide header mapped `Client-only` → `No`, `Manual` → `Partial`, `Auto` → `Yes` | `app/framework-guides/[slug]/page.tsx`, `components/ui/doc-header.tsx` | Two vocabularies for the same matrix | `ssrLabel` / `zeroFlashLabel` render the matrix values verbatim |
| 5 | Client-only guides had no SSR limitation callout | framework guides | Readers could assume server cookie resolution | One shared callout with links to the full-SSR alternative |
| 6 | React guide tagline said “React 18/19”; peer is `^19.0.0` | `lib/packages.tsx`, `packages/react/README.md` | False compatibility claim | Updated to React 19 |
| 7 | Next matrix version `^15.5.22` omitted `^16`; Astro omitted 6/7 | `lib/compatibility-data.ts` | Matrix disagreed with the manifest | Ranges now match the manifests |
| 8 | Matrix “last verified” dates and release were stale (2.0.1, September) | `lib/compatibility-data.ts` | Canonical reference looked abandoned | 2.1.0 / 2026-11-04 |
| 9 | `defaultTheme="light"` sat beside `mint-light` / `themvora-default-light` with no explanation | Next guide and other guides | Readers could mistake `"light"` for a mode keyword | Shared “Theme names, families, and modes” callout |
| 10 | CLI public example used `workspace:*` | `content/cli/installation.md` | Copy-paste failure outside the monorepo | Published `pnpm add -D @themvora/cli`; contributor example separated |
| 11 | Every CLI page claimed Node.js 22+, manifest says `>=18` | `content/cli/*.md`, `packages/cli/README.md` | False prerequisite | CLI docs now 18+; contributor requirement 22.23.4 explained |
| 12 | Framework guides said 18+ without explaining the CLI distinction | framework guides, CLI docs | Apparent contradiction | Prerequisite wording + Node support policy section |
| 13 | Library Nuxt install replaced React with Vue but never installed `@themvora/nuxt` | `components/library-recipe.tsx` | The shown `defineNuxtConfig({ modules: ["@themvora/nuxt"] })` could not work | Nuxt appends `@themvora/nuxt`; derived commands highlight lazily |
| 14 | Package page “Quick Start” linked CLI/DevTools to `/framework-guides/<slug>` | `app/packages/[slug]/page.tsx` | Dead destination for `/packages/cli` and `/packages/devtools` | Links to `/cli` and `/devtools` |
| 15 | Architecture said a framework package “installs that framework and nothing else” | `content/architecture.md` | Omitted the core dependency | Now names core and the explicit pair |
| 16 | Known limitations said Vue/Svelte/Solid/Angular “providers are client components” and use core bootstrap | `app/known-limitations/page.tsx` | Angular is Helpers; it uses `createBlockingScriptContent` | Split by actual behavior |
| 17 | “Zero runtime dependencies” was applied to the whole library in the hero and license page | `components/home/hero.tsx`, `app/license/page.tsx` | Angular has `tslib` | Now scoped to core / states the `tslib` exception |
| 18 | Heavy client pages imported Shiki directly | Theme Studio, presets, playground, accessibility, animation, custom themes, scoped theme, sunrise/sunset, custom scrollbar | ~165 kB extra first-load JS per route | `CodeBlock` / `ClientPre` highlight on demand |
| 19 | `/docs` and legacy aliases had no route behavior | `next.config.ts` | Common documentation URL 404s | Permanent redirects + tests |
| 20 | Reports of malformed Web CSS | `/framework-guides/web` | Could not be reproduced in source | Added extraction + unit-gap audit and tests |
| 21 | Reports of route timeouts | `/quick-start`, `/theme-studio`, libraries, etc. | Could not be reproduced | Measured all canonical routes; no change needed |

---

## B. Installation contracts

The canonical data is `apps/docs/lib/package-contracts.ts`. It mirrors the published manifests and is verified by `scripts/docs/audits/audit-installation-contracts.mjs`.

### B.1 Package matrix

| Package | Normal dependencies | Required peers | Optional peers | Explicit install shown |
| --- | --- | --- | --- | --- |
| `@themvora/core` | — | — | — | `@themvora/core` |
| `@themvora/react` | `@themvora/core` | `react ^19`, `react-dom ^19` | — | `@themvora/core` + `@themvora/react` |
| `@themvora/next` | `@themvora/core`, `@themvora/react` | `next ^15.5.22 || ^16`, `react ^19`, `react-dom ^19` | — | `@themvora/core` + `@themvora/next` |
| `@themvora/vue` | `@themvora/core`, `@themvora/web` | `vue ^3.4` | — | `@themvora/core` + `@themvora/vue` |
| `@themvora/svelte` | `@themvora/core`, `@themvora/web` | `svelte ^5` | — | `@themvora/core` + `@themvora/svelte` |
| `@themvora/solid` | `@themvora/core`, `@themvora/web` | `solid-js ^1.8` | — | `@themvora/core` + `@themvora/solid` |
| `@themvora/angular` | `@themvora/core`, `@themvora/web`, `tslib ^2.8` | `@angular/core >=17`, `@angular/common >=17` | — | `@themvora/core` + `@themvora/angular` |
| `@themvora/web` | `@themvora/core` | — | — | `@themvora/core` + `@themvora/web` |
| `@themvora/tailwind` | `@themvora/core` | `tailwindcss ^4` | — | `@themvora/core` + `@themvora/tailwind` (guide also installs `tailwindcss`) |
| `@themvora/astro` | `@themvora/core`, `@themvora/web` | `astro ^5 || ^6 || ^7` | `react ^19`, `react-dom ^19` | `@themvora/core` + `@themvora/astro`; island path adds `@astrojs/react react react-dom` |
| `@themvora/nuxt` | `@themvora/core`, `@themvora/vue` | `nuxt >=3.10`, `vue ^3.4` | — | `@themvora/core` + `@themvora/nuxt` |
| `@themvora/remix` | `@themvora/core`, `@themvora/react` | `@remix-run/react ^2.16`, `react ^19`, `react-dom ^19` | — | `@themvora/core` + `@themvora/remix` |
| `@themvora/cli` | `@themvora/core` | — | — | `@themvora/cli` (dev dependency) |
| `@themvora/devtools` | `@themvora/core` | — | — | `@themvora/devtools` |
| `@themvora/adapters` | `@themvora/core` | — | — | internal shared package |
| `@themvora/shadcn` | `@themvora/adapters`, `@themvora/core` | — | React, React DOM, Vue, Svelte, Solid, Angular | adapter page / library recipe |
| `@themvora/bootstrap` | `@themvora/adapters`, `@themvora/core` | — | same as shadcn | adapter page / library recipe |
| `@themvora/daisyui` | `@themvora/adapters`, `@themvora/core` | — | same as shadcn | adapter page / library recipe |
| `@themvora/open-props` | `@themvora/adapters`, `@themvora/core` | — | same as shadcn | adapter page / library recipe |
| `@themvora/mui` | `@themvora/adapters`, `@themvora/core` | `@emotion/react ^11`, `@emotion/styled ^11`, `@mui/material ^9`, React 19 | — | library recipe |
| `@themvora/chakra` | `@themvora/adapters`, `@themvora/core` | `@chakra-ui/react ^3`, React 19 | — | library recipe |
| `@themvora/antd` | `@themvora/adapters`, `@themvora/core` | `antd ^6`, React 19 | — | library recipe |
| `@themvora/mantine` | `@themvora/adapters`, `@themvora/core` | `@mantine/core ^7 || ^9`, `@mantine/hooks`, React 19 | — | library recipe |
| `@themvora/unocss` | `@themvora/adapters`, `@themvora/core` | `@unocss/core ^66`, `unocss ^66` | — | library recipe |

The audit asserts every dependency, peer range and optional flag against the actual `package.json`, so a manifest change cannot leave the docs silently wrong.

### B.2 Centralisation

- `lib/package-contracts.ts` owns the contracts and the command formatters.
- `app/packages/[slug]/page.tsx`, `app/framework-guides/[slug]/page.tsx`, and `app/quick-start/page.tsx` render from `explicitInstallPackages()` / `formatInstallCommand()`.
- The package page renders a dependency table directly from the contract: dependency, required peer, optional peer, and declared Node engine.
- Library recipes still author their library-specific commands once, then substitute the picked framework. Nuxt now appends `@themvora/nuxt` because the recipe mounts that module.
- `InstallCommand` accepts commands without pre-highlighted HTML, so derived commands can be highlighted on demand.

---

## C. SSR and zero-flash classifications

Source: `apps/docs/lib/compatibility-data.ts`; every framework row is compared to the manifest peer range by `scripts/docs/audits/audit-ssr-metadata.mjs`.

| Package | Framework | Framework peer | SSR | Zero-flash | Persistence |
| --- | --- | --- | --- | --- | --- |
| `@themvora/core` | Framework-agnostic | N/A | N/A | Manual | None |
| `@themvora/react` | React | `^19.0.0` | Client-only | Manual | LocalStorage |
| `@themvora/next` | Next.js | `^15.5.22 \|\| ^16` | Full | Auto | Cookie |
| `@themvora/vue` | Vue 3 | `^3.4.0` | Client-only | Manual | LocalStorage |
| `@themvora/svelte` | Svelte 5 | `^5.0.0` | Client-only | Manual | LocalStorage |
| `@themvora/solid` | Solid | `^1.8.0` | Client-only | Manual | LocalStorage |
| `@themvora/angular` | Angular | `>=17.0.0` | Helpers | Manual | LocalStorage |
| `@themvora/web` | Web Components | N/A | Client-only | Manual | LocalStorage |
| `@themvora/tailwind` | Tailwind CSS v4 | `^4.0.0` | N/A | N/A | None |
| `@themvora/astro` | Astro | `^5.0.0 \|\| ^6.0.0 \|\| ^7.0.0` | Full | Auto | Cookie |
| `@themvora/nuxt` | Nuxt | `>=3.10.0` | Full | Auto | Cookie |
| `@themvora/remix` | Remix | `^2.16.0` | Full | Manual | Cookie |

Vocabulary definitions are now exact on `/reference/compatibility`:

- **SSR:** `Full` = server resolves theme and renders shell; `Helpers` = bootstrap utilities you wire; `Client-only` = runtime created in the browser, no request-specific cookie resolution; `N/A` = not a runtime integration.
- **Zero-flash:** `Auto` = integration emits the blocking pre-paint script; `Manual` = you inline the documented bootstrap; `None` = no supported pre-paint path; `N/A` = not a runtime integration.

Client-only guides (React, Vue, Svelte, Solid, Web Components) render the shared callout. Full/Helpers integrations do not. The callout links to:

| Guide | Full-SSR alternative |
| --- | --- |
| React | `/framework-guides/next` |
| Vue | `/framework-guides/nuxt` |
| Svelte | `/no-flash-ssr` |
| Solid | `/no-flash-ssr` |
| Web Components | `/no-flash-ssr` |

Every non-CSS guide also carries the shared “Theme names, families, and modes” callout. It states that `defaultTheme` takes a theme name (`light`, `dark`, `mint-light`, `themvora-default-light`), `initialMode` takes `light`/`dark`/`system`, and a family groups mode variants (`mint` → `mint-light` + `mint-dark`). It explicitly says `"light"` passed to `defaultTheme` is the neutral theme whose name is `light`, not a mode shorthand.

---

## D. Route inventory

Static audit: `apps/docs/scripts/check-redirects.mjs`. Runtime audit: `scripts/docs/audits/audit-route-health.mjs`.

| Inventory | Count |
| --- | --- |
| `app/**/page.tsx` route patterns | 85 |
| `DOCS_ROUTES` canonical entries | 114 |
| Canonical URLs checked over HTTP (including API submodules, blog, recipes) | 195 |
| Permanent redirects | 5 |
| Broken internal links | 0 |
| Duplicate page titles | 0 |
| Sitemap coverage gaps | 0 |

### D.1 Redirects

| Alias | Canonical destination | Status | Reason |
| --- | --- | --- | --- |
| `/docs` | `/get-started` | 308 | Common documentation URL; canonical landing is Get Started |
| `/framework-guides/quick-start` | `/quick-start` | 308 | Legacy alias; `/quick-start` is the real page the header/sidebar use |
| `/framework-guides/web-components` | `/framework-guides/web` | 308 | Package name vs guide slug |
| `/default-presets` | `/presets/default` | 308 | Legacy preset URL |
| `/brand-presets` | `/presets/brand` | 308 | Legacy preset URL |

- All are permanent, one hop, and destination pages exist.
- No alias is a real page, appears in `DOCS_ROUTES`, or appears in `sitemap.xml`.
- No internal link points at an alias.
- `/quick-start` is a real canonical page and was not redirected.
- `/framework-guides/quick-start` is a legacy alias, not a page; it redirects to the canonical Quick Start.
- `/docs` is intentionally not a separate page; it redirects to `/get-started`.

### D.2 Previously reported timeouts

| Route | Result |
| --- | --- |
| `/quick-start` | 200 |
| `/theme-studio` | 200 |
| `/accessibility` | 200 |
| `/showcase` | 200 |
| `/recipes` | 200 |
| `/devtools` | 200 |
| `/vscode` | 200 |
| `/reference/diagnostics` | 200 |
| `/libraries/bootstrap` and all other library pages | 200 |

No timeout was reproduced at the HTTP or browser level. The crawler report is consistent with crawler-side resource exhaustion, not a broken route. The browser gate visited 170/170 routes with zero failures.

---

## E. Code examples

### E.1 Web Components CSS

The reported values (`gap: 10 px`, `max-width: 22 rem`, `border: 1 px solid`) are **not present** in the current source. `lib/frameworks.tsx` and the generated guide mirror use:

```css
gap: 10px;
max-width: 22rem;
border: 1px solid var(--theme-color-border);
```

The Copy button copies the `code` prop, not rendered markup, so the clipboard source is the same string. Browser verification on `/framework-guides/web` (viewport 486 px):

- rendered code contains `gap: 10px`, `max-width: 22rem`, `border: 1px solid`;
- the rendered code contains no numeric/unit gap;
- the block is highlighted (`pre.shiki span` present);
- clicking its Copy button wrote the complete CSS source to the clipboard, and the captured string contains `gap: 10px` and no numeric/unit gap.

### E.2 CSS snippet audit

New files:

- `scripts/docs/lib/css-snippets.mjs` — extraction + validation, pure and testable
- `scripts/docs/audits/audit-css-snippets.mjs` — CLI over the docs sources
- `scripts/docs/audits/audit-css-snippets.test.mjs` — 10 regression tests

Coverage and behaviour:

- Extracts TSX `code:` template literals via the shared `extractSnippetEntries`, and Markdown fenced blocks with their declared language.
- Checks only CSS/SCSS snippets (by language or `.css`/`.scss` filename).
- Reports whitespace between a number and a unit (`10 px`, `22 rem`, `1 em`, `2 %`, negative and decimal forms).
- Ignores comments, quoted strings, prose and non-CSS code blocks.
- Checks custom properties.
- Runs in the static release gate; the tests run in `pnpm test:scripts`.

Current result: **99 CSS snippets, 0 invalid values**.

---

## F. Node.js support policy

Verified sources: root `engines.node` and `.nvmrc`, `packages/core/package.json`, `packages/adapters/shared/package.json`, `packages/cli/package.json`, and a direct run of the built CLI under Node 18.20.8.

| Category | Requirement | Source / reason |
| --- | --- | --- |
| Browser runtime packages | No Node.js runtime requirement | They run in the browser; no Node-only APIs at runtime |
| Framework integrations and adapters | No `engines` field; the framework toolchain sets the build minimum | Manifest has no `engines`; use the newer of Node 18 and the framework's range |
| `@themvora/core` | `node >=18` | Declared `engines.node` for its tooling surface |
| `@themvora/adapters` | `node >=18` | Declared `engines.node` |
| `@themvora/cli` | `node >=18` | Declared `engines.node`; verified `dist/cli.cjs --version` on Node 18.20.8 |
| Repository contributors | `node >=22.23.4` | Root `engines.node` and `.nvmrc` (22.23.4) |

Pages updated:

- `/reference/compatibility` — new “Node.js support policy” section with the category table and the explanation that the CLI carries its own engine declaration as an executable.
- `/cli/installation` — prerequisites, contributor requirement, and link to the policy.
- `/cli/*` and `packages/cli/README.md` — 22+ replaced by 18+.
- Framework guide prerequisites — “Node.js 18+ (or the version your framework toolchain requires)”.
- `/quick-start` prerequisites — same clarification.

No framework guide was lowered below its actual toolchain minimum; only the false universal claim was removed.

---

## G. Performance and availability

### G.1 Route health

`scripts/docs/audits/audit-route-health.mjs` enumerates:

- every static `app/**/page.tsx` route,
- every `DOCS_ROUTES` entry,
- every sitemap standalone route,
- API reference submodules from `lib/api-reference.ts`,
- recipes from `lib/recipes.ts`,
- blog posts from `content/blog`.

It starts a fresh `next start`, checks bounded batches, records status, response time, content type, document shell, `<title>` and `<h1>`, then checks redirects and SEO endpoints. Report: `scripts/docs/reports/route-health.json`.

Result from the full gate:

| Metric | Result |
| --- | --- |
| Canonical URLs | 195 |
| Failures | 0 |
| Median response | 140 ms |
| Slowest | `/api-reference/web` 1,121 ms |
| Routes over 2 s | 0 |
| Redirect failures | 0 |
| robots/sitemap failures | 0 |

The reported timeouts were not reproducible. No route was skipped to make the check pass.

### G.2 Bundle remediation

The heavy pages imported `lib/highlight.ts` (Shiki + 15 grammars) from client components and highlighted during render. `CodeBlock`, `ClientPre` and `useHighlightedHtml` now load the highlighter as a separate chunk after hydration; server-rendered blocks keep their precomputed HTML and never request the chunk.

First-load JS measured by `next build` before and after:

| Route | Before | After | Reduction |
| --- | --- | --- | --- |
| `/playground` | 419 kB | 254 kB | 165 kB |
| `/presets` | 373 kB | 209 kB | 164 kB |
| `/presets/brand` | 379 kB | 214 kB | 165 kB |
| `/presets/default` | 377 kB | 212 kB | 165 kB |
| `/theme-studio` | 367 kB | 202 kB | 165 kB |
| `/scoped-theme` | 341 kB | 176 kB | 165 kB |
| `/sunrise-sunset` | 341 kB | 176 kB | 165 kB |

Initial HTML keeps the code text: the fallback is a `<pre class="shiki themvora">` with the source, so crawlers and no-JS readers still see it. Only token colouring is deferred. No page functionality or example was removed.

---

## H. SEO

Verified by the route-health audit against the production build:

- `/robots.txt`: 200, `text/plain`, references `${SITE_URL}/sitemap.xml`, uses the configured origin.
- `/sitemap.xml`: 200, XML, uses the configured origin, and every `<loc>` is in the canonical inventory.
- Redirect aliases are absent from the sitemap.
- No 404 route is in the sitemap.
- No duplicate/trailing-slash variants are emitted.
- Canonical page metadata uses `docsUrl()` and `metadataBase` from `lib/site.ts`.

`SITE_URL` is `NEXT_PUBLIC_SITE_URL` when set, otherwise `https://themvora-dev.vercel.app`. No localhost origin is used in production metadata.

---

## I. Automated checks

### I.1 New checks

| Check | Script | Wired into |
| --- | --- | --- |
| Installation contracts vs manifests and docs surfaces | `scripts/docs/audits/audit-installation-contracts.mjs` | `docs:release-gate` static tier; `docs:audit:install` |
| SSR / zero-flash metadata and guide labels | `scripts/docs/audits/audit-ssr-metadata.mjs` | static tier; `docs:audit:ssr` |
| CSS unit spacing | `scripts/docs/audits/audit-css-snippets.mjs` | static tier; `docs:audit:css` |
| CSS audit regression tests | `scripts/docs/audits/audit-css-snippets.test.mjs` | `pnpm test:scripts` |
| Redirects, aliases, sitemap exclusions, internal links to aliases | `apps/docs/scripts/check-redirects.mjs` | static tier; `docs:audit:routes` |
| Route health (HTTP status, timing, document content, redirects, robots/sitemap) | `scripts/docs/audits/audit-route-health.mjs` | full tier after `next build`; `docs:audit:health` |

Existing gates were not weakened. The new checks run alongside the existing audits B–I, link checker, example checks, API drift check, browser smoke and TOC manifest check.

### I.2 Test results

- `node --test scripts/docs/audits/audit-css-snippets.test.mjs`: 10 passed, 0 failed.
- `pnpm test:scripts`: 90 passed, 0 failed.
- Static release gate: passed.
- Full release gate: see §J.

---

## J. Verification

Environment: Node.js 24.15.0 on the audit host; repository target Node 22.23.4 and pnpm 12.14.0. Commands were run from the repository root unless noted.

| Command | Exit | Result |
| --- | --- | --- |
| `pnpm install --frozen-lockfile` | 0 | 42 workspace projects, lockfile up to date (pnpm 12.14.0) |
| `pnpm --filter @themvora/docs typecheck` | 0 | No TypeScript errors |
| `pnpm test:scripts` | 0 | 90 tests passed |
| `node --test scripts/docs/audits/audit-css-snippets.test.mjs` | 0 | 10 tests passed |
| `node scripts/docs/audits/audit-css-snippets.mjs` | 0 | 99 CSS snippets, 0 invalid |
| `node --experimental-strip-types scripts/docs/audits/audit-installation-contracts.mjs` | 0 | 24 manifests / 24 contracts, 0 failures |
| `node --experimental-strip-types scripts/docs/audits/audit-ssr-metadata.mjs` | 0 | 12 matrix rows, 0 failures |
| `node apps/docs/scripts/check-redirects.mjs` | 0 | 85 routes, 5 redirects, 0 failures |
| `node apps/docs/scripts/check-links.mjs` | 0 | No broken links, no duplicate titles, sitemap covers every route |
| `node apps/docs/scripts/check-quickstart-snippets.mjs` | 0 | 7 web + 4 vanilla snippets |
| `node scripts/docs/check-examples.mjs` | 0 | 1 known baseline violation, no new violations |
| `node scripts/docs/audits/audit-b-package-to-docs.mjs --coverage=fail` | 0 | 1,306 exports, 0 missing destinations |
| `node scripts/docs/audits/audit-g-terminology.mjs` | 0 | No findings |
| `node scripts/docs/audits/audit-page-contracts.mjs` | 0 | 0 failures |
| `node scripts/docs/audits/audit-i-generated-tables.mjs` | 0 | 971 tables, 0 failures |
| `node scripts/docs/test-search-index.mjs` (inside gate) | 0 | 11 passed |
| `node apps/docs/scripts/verify-search-architecture.mjs` | 0 | 10 architecture checks passed |
| `node scripts/docs/generate-toc-headings.mjs --check --prod` | 0 | 114 routes, manifest current |
| `pnpm docs:release-gate` | 0 | Static gate passed |
| `pnpm docs:release-gate:full` | 0 | Static, full and browser gates passed |
| Browser smoke (inside full gate) | 0 | 170/170 routes, 0 failures, 280.9 s |
| Astro readout matrix (browser tier) | 0 | 6 rows, 0 failures |
| React first-paint gate (browser tier) | 0 | 7 loads, 0 failures |
| Route health (inside full gate) | 0 | 195/195 URLs, 0 failures |

### J.1 Full gate

- Static gate: **PASSED**
- Full gate: **PASSED**
- Browser gate: **PASSED**
- Exit: **0**
- Verdict: “All docs gates passed. Release not blocked by docs.”

The first full-gate run failed only on the TOC manifest because the CLI installation rewrite removed its `## Requirements` heading. The manifest was regenerated from the rendered site; the direct `--check --prod` rerun passed, and the second full-gate run passed every tier.

### J.2 Browser verification

Manual browser checks were run against the production build at a **486 px viewport**:

| Journey | Result |
| --- | --- |
| Homepage | H1 present, theme picker present, “Core has zero runtime deps”, v2.1.0, no overflow |
| Framework guides → React | H1 “React”; `SSR: Client-only`; `Zero-flash: Manual`; client-only callout; theme/mode callout; no “SSR: No” |
| Package page → React | install command `pnpm add @themvora/core @themvora/react`; dependency table; “core is also declared as a normal dependency”; no peer claim |
| CLI installation | `pnpm add -D @themvora/cli`; Node.js 18+; no Node.js 22+ claim; `workspace:*` only after the monorepo-contributors heading |
| Web Components guide | CSS rendered and copied correctly (see §E.1) |
| Compatibility matrix | Canonical SSR/zero-flash vocabulary and Node support policy render |
| `/docs` | redirects to `/get-started`; final H1 “Get Started with Themvora” |
| Search | dialog opens, index loads, results for “client-only”, clicking a result navigates to `/framework-guides` |
| Mobile navigation | “Open navigation” expands a dialog with 89 links at 486 px |
| Overflow | 0 px horizontal overflow on `/`, `/framework-guides`, `/theme-studio`, `/playground`, `/presets/default`, `/libraries/bootstrap` |

The full gate's automated browser smoke additionally visited 170/170 routes with zero console errors and zero page exceptions. It covers HTTP 200, hydration, non-empty rendered text, generated API backlinks, and framework mode vocabulary. The route-health audit verifies the document shell and page headings for 195 canonical URLs.

---

## K. Files changed

### Added

- `apps/docs/lib/package-contracts.ts` — canonical installation contracts and command formatters
- `apps/docs/lib/redirects.ts` and `apps/docs/redirects.mjs` — typed re-export and plain-JS redirect map shared with `next.config.ts`
- `apps/docs/components/ui/use-highlighted-html.ts` — on-demand highlighter hook
- `apps/docs/components/ui/client-pre.tsx` — on-demand highlighted block for hand-built toolbars
- `apps/docs/scripts/check-redirects.mjs` — route/alias/sitemap audit
- `scripts/docs/lib/css-snippets.mjs` — CSS extraction and unit-gap validation
- `scripts/docs/audits/audit-css-snippets.mjs` — CSS snippet audit
- `scripts/docs/audits/audit-css-snippets.test.mjs` — 10 regression tests
- `scripts/docs/audits/audit-installation-contracts.mjs` — manifest/doc contract audit
- `scripts/docs/audits/audit-ssr-metadata.mjs` — matrix/guide metadata audit
- `scripts/docs/audits/audit-route-health.mjs` — runtime route health audit
- `scripts/docs/reports/route-health.json` — generated health evidence

### Modified (documentation and app)

- Installation and package pages: `app/packages/[slug]/page.tsx`, `app/choose-package/page.tsx`, `app/quick-start/page.tsx`, `app/vanilla/page.tsx`, `app/libraries/[slug]/page.tsx`
- Framework guides: `app/framework-guides/[slug]/page.tsx`, `lib/frameworks.tsx`, `content/framework-guides.md` (regenerated), `lib/framework-examples/remix.ts`
- Compatibility and support: `lib/compatibility-data.ts`, `app/reference/compatibility/page.tsx`, `app/known-limitations/page.tsx`, `components/ui/doc-header.tsx`
- CLI and Node: `content/cli/*.md` (22 files), `packages/cli/README.md`, `packages/react/README.md`
- Code rendering: `components/code-block.tsx`, `components/install-command.tsx`, `components/ui/library-install.tsx`, `components/library-recipe.tsx`, `components/theme-studio/theme-studio.tsx`, `components/accessibility/accessibility-lab.tsx`, `components/playground/show-code.tsx`, `components/playground/ssr-demo.tsx`, `components/preset-preview.tsx`, `components/preset-showcase.tsx`, `components/presets.tsx`, `components/custom-scrollbar/scrollbar-framework.tsx`, `app/animation/AnimationGuide.tsx`, `app/custom-themes/CustomThemesGuide.tsx`, `app/scoped-theme/ScopedThemeGuide.tsx`, `app/sunrise-sunset/SunriseSunsetGuide.tsx`, `lib/code-language.ts`
- Copy and claims: `content/architecture.md`, `app/license/page.tsx`, `components/home/hero.tsx`, `components/get-started/guide.tsx`, `lib/search-sections.ts`
- Metadata and routing: `next.config.ts`, `lib/version.ts`, `lib/packages.tsx`
- Generated: `lib/generated/toc-headings.ts`, `public/search-index.json`
- Gates: `package.json`, `apps/docs/package.json`, `scripts/docs/release-gate.mjs`

### Removed

None. No tests, screenshots or user artifacts were deleted.

---

## L. Remaining issues

1. **The audit's core-peer premise is false and is documented as such.** No manifest was changed. If the product decision changes and core becomes a peer, the contract module and its audit will need to change together; the docs will then be tested for the peer relationship rather than the dependency relationship.
2. **`NEXT_PUBLIC_SITE_URL` should be set on the Vercel project** if the production origin is not `https://themvora-dev.vercel.app`. The code uses the configured value; the local verification used the default.
3. **The malformed Web CSS was not reproducible in the current source.** If production still shows `10 px`, the deployment is serving an older build; a redeploy of this tree is the fix.
4. **The reported crawler timeouts were not reproducible.** No route was skipped or given a longer limit. If they recur, capture the crawler's concurrency and server RSS; the evidence points at crawler-side resource exhaustion.
5. **`Nuxt 4` is the guide's target name; the peer range is `>=3.10.0`.** The guide intentionally targets Nuxt 4 while the package supports 3.10+, which the known-limitations page states. This is a product-target label, not a compatibility claim.
6. **The full gate depends on headless Chromium.** It passed in this environment. A machine without Chromium fails the `--strict` browser tier by design rather than silently skipping.
7. **No GitHub setting, deployment change or product decision is required for the route/redirect/SEO work.**

---

## M. Working-tree integrity

| Item | Before | After |
| --- | --- | --- |
| Branch | `main` | `main` |
| HEAD | `894b0bce8e2e118d654f7b032942ffda725cf75d` | `894b0bce8e2e118d654f7b032942ffda725cf75d` |
| Staged files | 0 | 0 |
| Unstaged tracked changes | 139 modified / 6 deleted | 139+ modified / 6 deleted; all pre-existing changes preserved |
| Untracked files | 17 | 32; pre-existing untracked work preserved, new audit/helpers added |
| Stashes | none | none |

The pre-existing search-index architecture work, CI/dependency remediation, browser gates, homepage redesign, `version.ts` work, deleted hero files, and all other working-tree changes were left in place. No commit, stage, push, tag, merge, reset, clean or discard was performed. No running user server was stopped; only servers started by the audits were terminated.

### M.1 Working-tree note

`scripts/docs/reports/route-health.json` is a generated evidence file from the route-health audit. It is intentionally left untracked alongside the other working-tree artifacts; delete it if the repository policy is not to keep generated reports.
