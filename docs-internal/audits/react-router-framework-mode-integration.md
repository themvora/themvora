# React Router Framework Mode integration and single-config document API

Date: 2026-11-04
Base commit: `894b0bce8e2e118d654f7b032942ffda725cf75d` (unchanged; nothing staged or committed)
Verified against: `react-router@8.5.1`, `@react-router/dev@8.5.1`, React 19.3.1, Vite 8.3.5

## A. Framework compatibility

| | Remix v2 | React Router Framework Mode |
| --- | --- | --- |
| Package entry | `@themvora/remix` | `@themvora/remix/react-router` |
| Root module | `app/root.tsx` with Remix `Layout` | `app/root.tsx` with React Router `Layout` |
| Loader args | `{ request }: { request: Request }` / `LoaderFunctionArgs` | generated `Route.LoaderArgs` |
| Framework imports | `@remix-run/node`, `@remix-run/react` | `react-router`, `@react-router/dev/routes` |
| Route config | file-system routes under `app/routes` | `app/routes.ts` (`RouteConfig`) |
| Root data | `useLoaderData<typeof loader>()` | `useRouteLoaderData<typeof loader>("root")` |

The adapter source uses only React and the standard `Request` object. It never
imports `@remix-run/*`, so the same document lifecycle works for both targets.
The `/react-router` subpath exists to make the target explicit and to keep the
documentation and compatibility matrix unambiguous.

## B. Package architecture

**Decision: extend `@themvora/remix` with a dedicated `./react-router` entry
point; do not add a new package.**

Reasoning:

- The runtime has no Remix-specific import; the peer `@remix-run/react` was a
  compatibility signal, not a code dependency.
- `@remix-run/react` is now an **optional** peer
  (`peerDependenciesMeta`), so a React Router project does not install Remix v2
  packages. The peer range itself is unchanged (`^2.16.0`).
- Existing root exports are untouched. `getInitialThemeState`, `ThemeHead`,
  `getThemeShellProps`, `ThemeProvider` and `createRemixThemePersistence` keep
  their behaviour and signatures.
- A new package would duplicate the implementation and add another install
  surface for no additional isolation. If a future React Router release needs an
  incompatible document lifecycle, a dedicated package can be split out then.

Export map verified:

- ESM: `import("@themvora/remix/react-router")` → `createThemeDocument`,
  `ThemeProvider`, `useTheme` all present.
- CJS: `require("@themvora/remix/react-router")` → `createThemeDocument` present.
- Frozen API manifest and docs classification include the subpath
  (`./server`, `./react-router`).

## C. Single-configuration API

`createThemeDocument(config)` returns:

- `resolveInitial(request)` — request-specific cookie resolution against the
  same frozen configuration;
- `Document` — blocking `<head>` bootstrap, matching `<html>` shell, scrollbar
  class/styles, provider around children, framework `head` / `afterContent`
  slots;
- `Provider` — the runtime provider alone;
- `config` — a frozen snapshot (including the theme array);
- `fallback` — the static resolution used when loader data is unavailable.

The configuration is declared once:

```tsx
const theming = createThemeDocument({
  themes,
  defaultTheme: "light",
  mode: "system",
  scrollbar: true,
});
```

How it reaches each layer:

| Layer | Source |
| --- | --- |
| Loader | `theming.resolveInitial(request)` → `getInitialThemeState` with the frozen options |
| Head bootstrap | `ThemeHead` receives `themes`, `defaultTheme`, `mode`, `themeOverride`, `scrollbar` |
| `<html>` shell | `getThemeShellProps(initial, { className, style, scrollbar })` |
| Runtime provider | `ThemeProvider` receives `initial` (else `fallback`), `themes`, `defaultTheme`, `initialMode`, `initialFamily`, `themeOverride` |

The request-specific value is only `initial`; nothing request-derived is stored
on the handle. The server resolver is loaded with a dynamic `import()`, so the
client bundle does not include the cookie parser in its initial chunk.

A missing `initial` (React Router error/hydration fallback) uses `fallback`
instead of throwing. `ThemeHead` renders the script with
`id="themvora-bootstrap"`, the same guard the React provider checks before
injecting its SPA bootstrap, so the document keeps exactly one blocking script.

## D. First-paint evidence

Production HTML (`react-router-serve`, no cookies):

```html
<html lang="en" data-theme="light" data-theme-mode="light"
      data-theme-selection-mode="system"
      data-theme-selection-family="default"
      data-theme-ready="true" style="…" class="app tv-scrollbar">
  <head>
    … <script id="themvora-bootstrap">(function(){try{function getCookie(n)…</script>
```

Measured properties from the browser gate:

- the bootstrap is inside `<head>` and appears exactly once;
- an injected probe wraps `setAttribute` and records the moment
  `data-theme-ready` is written; that timestamp is `<= first-contentful-paint`
  for a cold load and for a persisted dark load;
- with external module scripts blocked, the inline bootstrap still applies the
  persisted theme and the computed body background is the dark token
  (`rgb(9, 9, 10)`), proving the first-paint state does not depend on hydration;
- persisted light and dark requests render the matching `data-theme` and
  `data-theme-mode` in the first HTML response;
- `system` + dark OS paints dark while `data-theme-selection-mode` stays
  `system`;
- no console errors/warnings or uncaught exceptions on cold load, persisted
  loads, navigation, toggle or reload.

## E. Compatibility

| Package | Native peer | Additional verified target |
| --- | --- | --- |
| `@themvora/remix@2.1.0` | `@remix-run/react ^2.16.0` (now optional) | `react-router ^8.5.1` (example manifest) |
| React / React DOM peers | `^19.0.0` | installed 19.3.1 |

The matrix now has two rows for `@themvora/remix`: **Remix v2** (`^2.16.0`) and
**React Router** (`^8.5.1`). The React Router row is verified against
`examples/apps/react-router/package.json`, not inferred from the Remix peer.
SSR: Full; zero-flash: Manual (configured through the document factory);
persistence: Cookie; scrollbar: Component.

## F. Documentation

Corrected/new pages and sources:

- `apps/docs/lib/frameworks.tsx` — separate **Remix v2** and **React Router**
  entries; both use `createThemeDocument()`; React Router uses `react-router`
  imports, `Route.LoaderArgs`, `useRouteLoaderData("root")`, `app/routes.ts`.
  React Router is marked `nested: true`: `allFrameworks` holds every entry for
  page lookup, while the exported `frameworks` list excludes nested targets.
- React Router no longer appears in the Quick Start picker, the framework guide
  cards, the home framework matrix, the header, the package chooser or the
  capability framework arrays. The SSR integration card folds it into Remix;
  the zero-flash example tab is labelled `Remix · React Router`.
- React Router's canonical pages are nested under Remix:
  `/framework-guides/remix/react-router` and
  `/framework-guides/remix/react-router/examples`. The old top-level paths
  permanently redirect there.
- The install step now shows two commands: the primary Themvora-only
  `pnpm add @themvora/core @themvora/remix`, then a separately labelled command
  for projects that do not have React Router yet.
- `apps/docs/lib/framework-examples/remix.ts` — new single-config entry.
- `apps/docs/lib/framework-examples/react-router.ts` — new examples module.
- `apps/docs/lib/framework-examples/index.ts` — registry.
- `apps/docs/app/zero-flash/page.tsx` — React Router example and mode-source
  row.
- `apps/docs/app/no-flash-ssr/page.tsx` — React Router added to the SSR list.
- `apps/docs/app/reference/compatibility/page.tsx` and
  `apps/docs/lib/compatibility-data.ts` — split rows and corrected note.
- `apps/docs/lib/package-contracts.ts` — optional Remix peer.
- `apps/docs/lib/docs-routes.ts`, `apps/docs/lib/docs-nav.ts`,
  `site-header`, `framework-matrix`, `ssr-integrations`, `choose-package`,
  `examples`, `api-reference` — navigation and framework labels.
- `apps/docs/app/framework-guides/remix/react-router/` — nested guide and
  examples routes.
- `apps/docs/redirects.mjs`, `apps/docs/scripts/check-redirects.mjs` — aliases
  from the old top-level React Router paths.
- `apps/docs/components/install-command-pair.tsx` — the paired install UI.
- `docs/reference/capabilities.ts` — `createThemeDocument` and document types.
- `apps/docs/content/framework-guides.md` — regenerated (12 frameworks).
- `apps/docs/content/api-reference/remix.md`, `remix/server.md`,
  `remix/react-router.md` — regenerated from declarations.
- `packages/remix/README.md` — both integration paths and the factory.
- `examples/apps/README.md` — new example row.

## G. Examples

| App | Command | Port |
| --- | --- | --- |
| Remix v2 | `pnpm --filter @themvora/app-remix dev` | 5200 |
| React Router 8.5.1 | `pnpm --filter @themvora/app-react-router dev` | 5203 |

Both apps now use `createThemeDocument()` as their root setup. The Remix v2
example keeps `@remix-run/react` imports and its `Layout`; the React Router
example uses `Route.LoaderArgs`, `useRouteLoaderData("root")` and
`app/routes.ts`.

The docs sidebar keeps one **Remix** framework entry. Remix v2 and React Router
are nested targets inside it, each with Guide and Examples links, because
React Router is the successor root-route integration for the same package, not
a separate framework.

Build/typecheck:

```bash
pnpm --filter @themvora/app-remix typecheck
pnpm --filter @themvora/app-remix build
pnpm --filter @themvora/app-react-router typecheck
pnpm --filter @themvora/app-react-router build
```

Reproduce the React Router scaffold:

```bash
npx create-react-router@8.5.1 my-app --yes --no-install --no-git-init
pnpm add @themvora/core @themvora/remix
```

The example keeps the official `vite.config.ts`, `react-router.config.ts`,
`tsconfig.json` and `app/routes.ts` conventions.

## H. Verification

| Command | Result |
| --- | --- |
| `pnpm --filter @themvora/remix exec tsc -p tsconfig.json --noEmit` | exit 0 |
| `pnpm --filter @themvora/remix exec vitest run` | 7 files, **53 tests passed** |
| `pnpm --filter @themvora/remix build` | exit 0 (ESM+CJS + declarations, `./react-router`) |
| `pnpm --filter @themvora/app-remix typecheck` | exit 0 |
| `pnpm --filter @themvora/app-remix build` | exit 0 |
| `pnpm --filter @themvora/app-react-router typecheck` | exit 0 |
| `pnpm --filter @themvora/app-react-router build` | exit 0 |
| `node scripts/release/verify-react-router-startup.mjs` | **PASS 52 assertions** |
| `node scripts/release/verify-remix-startup.mjs` | **PASS 24 assertions** |
| `pnpm --filter @themvora/docs typecheck` | exit 0 |
| `pnpm --filter @themvora/docs build` | exit 0 |
| `pnpm --filter @themvora/docs api:check` | 57 files, no drift |
| `node scripts/docs/public-api.mjs --check` | 1420 symbols, 57 entrypoints, OK |
| `node --experimental-strip-types scripts/docs/audits/audit-ssr-metadata.mjs` | 13 rows, 0 failures |
| `node --experimental-strip-types scripts/docs/audits/audit-installation-contracts.mjs` | 24 contracts, 0 failures |
| React Router install command (resolved) | `pnpm add @themvora/core @themvora/remix` |
| Nested route `GET /framework-guides/remix/react-router` | 200; both install commands present |
| Nested examples `GET /framework-guides/remix/react-router/examples` | 200 |
| Old `/framework-guides/react-router` and `/examples` | 308 to the nested URLs |
| Framework guide index | no React Router card; Remix card only |
| Quick Start picker | React Router absent from the framework list |
| `apps/docs/scripts/check-redirects.mjs` | 7 redirects, 0 failures |
| `apps/docs/scripts/test-docs-nav.mjs` | 14/14 pass |
| `apps/docs/scripts/test-search-index.mjs` | 11/11 pass |
| `node scripts/docs/audits/audit-e-invented-symbols.mjs` | 0 failures |
| `node scripts/docs/audits/audit-f-internal-symbols.mjs` | 0 failures |
| `node scripts/docs/audits/audit-g-terminology.mjs` | 0 findings |
| `node scripts/docs/audits/audit-page-contracts.mjs` | 0 failures |
| `node apps/docs/scripts/check-framework-examples.mjs` | 12 frameworks, all features covered |
| `node scripts/docs/snapshot-snippet-baseline.mjs` | 379 pages / 853 refs, no drift |
| `pnpm --filter @themvora/docs variants:check` | ok |
| `pnpm --filter @themvora/docs compat:check` | ok |

The snippet baseline was deliberately re-frozen because the Remix quick-start
moved from the lower-level four-API wiring to `createThemeDocument()`; the
removed references (`ThemeHead`, `ThemeProvider`, `getInitialThemeState`,
`getThemeShellProps`) are still documented in the Remix feature map and
examples.

## I. Files changed

Added:

- `packages/remix/src/document.tsx`
- `packages/remix/src/react-router.ts`
- `packages/remix/test/document.test.tsx`
- `scripts/release/verify-react-router-startup.mjs`
- `examples/apps/react-router/` (official 8.5.1 scaffold + Themvora wiring)
- `apps/docs/lib/framework-examples/react-router.ts`
- `apps/docs/content/api-reference/remix/react-router.md`
- `.changeset/react-router-document.md`
- this report

Modified (relevant):

- `packages/remix/src/index.ts`, `src/blocking-script.tsx`, `package.json`,
  `tsup.config.ts`, `README.md`
- `apps/docs/lib/frameworks.tsx`, `framework-examples/remix.ts`,
  `framework-examples/index.ts`, `compatibility-data.ts`,
  `package-contracts.ts`, `docs-routes.ts`, `docs-nav.ts`
- `examples/apps/remix/app/root.tsx`, `examples/apps/remix/README.md`
- `apps/docs/scripts/test-docs-nav.mjs`
- `apps/docs/app/zero-flash`, `no-flash-ssr`, `quick-start`,
  `reference/compatibility`, `framework-guides`, `choose-package`, `examples`,
  `api-reference`
- `apps/docs/components/home/{framework-matrix,ssr-integrations}.tsx`,
  `site-header.tsx`, `get-started/guide.tsx`, `quick-start/guide.tsx`,
  `custom-scrollbar/scrollbar-framework.tsx`
- `docs/reference/capabilities.ts`, `docs/reference/public-api.json`,
  `docs/reference/baselines/snippet-baseline.json`
- generated: `apps/docs/content/framework-guides.md`,
  `apps/docs/content/api-reference/remix.md`, `remix/server.md`
- `package.json`, `pnpm-lock.yaml`, `examples/apps/README.md`

## J. Remaining issues

- **Package name.** React Router users still install a package named
  `@themvora/remix`. The `/react-router` subpath and docs make the target
  explicit, and the optional peer avoids a false Remix dependency. A dedicated
  `@themvora/react-router` package remains an option if branding outweighs the
  duplication cost.
- **Version range.** Verified against `react-router@8.5.1` only. A future major
  needs its own example/build/browser run before the matrix version changes.
- **Docs browser smoke.** The docs production build and structural audits pass;
  the full `docs:release-gate:browser` suite was not run in this task. The two
  framework apps were verified in a real browser.

## K. Working-tree integrity

- Original HEAD: `894b0bce8e2e118d654f7b032942ffda725cf75d`
- Final HEAD: `894b0bce8e2e118d654f7b032942ffda725cf75d`
- Staged changes: none (`git diff --cached` empty)
- No commit, tag, push, merge, reset, clean or package publish was performed.
- Pre-existing uncommitted work (including the docs-site edits, Nuxt changes,
  `docs-internal/`, untracked audit artifacts and `apps/docs/lib/docs-nav.ts`)
  remains in place. `apps/docs/lib/docs-nav.ts` was already untracked and was
  extended with the React Router guide link.
