# Themvora Example Apps

Real, independently runnable applications that show the **same product** — the
Themvora reference experience (hero, theme controls, live preview, token
inspector, CSS/Tailwind snippets, a scoped region, persistence) — implemented
natively for **every framework and integration Themvora supports**.

The **React app is the canonical reference**. Every other app reproduces its
sections and interactions using that framework's native Themvora API. The
per-feature contract and status live in [`feature-parity.md`](./feature-parity.md);
the build/verify results live in [`implementation-report.md`](./implementation-report.md).

## Integration matrix

| App                           | Framework             | Package                  | Port | Entry / integration surface                                                         |
| ----------------------------- | --------------------- | ------------------------ | ---- | ----------------------------------------------------------------------------------- |
| [`react/`](./react)           | React 19 (Vite)       | `@themvora/react`        | 5190 | `ThemeProvider`, `useTheme`, `ThemeScope`, `ThemeScrollbar`                         |
| [`vue/`](./vue)               | Vue 3 (Vite)          | `@themvora/vue`          | 5191 | components + `useTheme()` composable                                                |
| [`svelte/`](./svelte)         | Svelte 5 (Vite)       | `@themvora/svelte`       | 5192 | components + readable-store `useTheme()`                                            |
| [`solid/`](./solid)           | SolidJS (Vite)        | `@themvora/solid`        | 5193 | components + signal `useTheme()`                                                    |
| [`angular/`](./angular)       | Angular 22 (CLI)      | `@themvora/angular`      | 5194 | `provideTheme()`, `injectTheme()`, `[themvoraScope]`, `[themvoraScrollbar]`         |
| [`web/`](./web)               | Web Components (Vite) | `@themvora/web`          | 5195 | `import "@themvora/web"` + `<themvora-provider                                      | scope | toggle | select | scrollbar | inspector>` |
| [`vanilla-js/`](./vanilla-js) | Plain JS (Vite)       | `@themvora/core/vanilla` | 5196 | `new Themvora(...)` + core bindings — standalone, static markup, no shared package  |
| [`vanilla/`](./vanilla)       | Plain HTML/JS, no bundler | `@themvora/core/vanilla` | 5205 | `prepaint.js` in `<head>` + `new Themvora()` — the documented non-Vite setup, zero-flash on reload |
| [`astro/`](./astro)           | Astro 5               | `@themvora/astro`        | 5197 | `themvora()` integration, `provider.astro`, `ThemeToggle.astro`, runtime controller |
| [`nextjs/`](./nextjs)         | Next.js 15 App Router | `@themvora/next`         | 5198 | server `ThemeProvider` + `@themvora/next/client` hooks                              |
| [`nuxt/`](./nuxt)             | Nuxt 4                | `@themvora/nuxt`         | 5199 | Nuxt module (auto-imports + runtime plugin + cookie SSR)                            |
| [`remix/`](./remix)           | Remix v2 (Vite)       | `@themvora/remix`        | 5200 | `ThemeHead` + `ThemeProvider` + `getInitialThemeState` (server)                     |
| [`react-router/`](./react-router) | React Router 8.5 Framework Mode | `@themvora/remix/react-router` | 5203 | `createThemeDocument()` root loader + root `Layout` document |
| [`astro-native/`](./astro-native) | Astro 5           | `@themvora/astro`        | 5201 | `themvora()` + `provider.astro`, `ThemeToggle`, `ThemeFamilySelect`, `ThemeScope`, `<ClientRouter />` |
| [`astro-react/`](./astro-react)   | Astro 5 + React 19 | `@themvora/astro`        | 5202 | the same native surface plus one `client:load` island (`ThemeProviderClient` + `useTheme`) |

Shared, framework-independent assets live in [`shared/`](./shared)
(`@themvora/app-shared`): the canonical brand theme pair + selected preset
families, shared copy/code snippets, SVG scrollbar icons, and shared UI class
strings + base CSS. Presets come from `@themvora/core`'s `getPresetThemes()`, so
no app hardcodes a preset palette.

Five apps are deliberately **standalone** and do not import it: [`web/`](./web),
[`vanilla-js/`](./vanilla-js), [`vanilla/`](./vanilla),
[`astro-native/`](./astro-native) and [`astro-react/`](./astro-react) declare
their own brand pair, copy, styles and markup, so each can be read — and copied —
on its own. They are the reference for "what does this look like with nothing
else in the room".

The two Astro apps are also built **from the framework guide alone** — no shared
fixtures, no cross-imports between them, and no code lifted from `astro/`. They
exist to prove that the documented Quick Start actually works: `astro-native/`
uses only server-rendered components plus the runtime controller, while
`astro-react/` adds a single hydrated island to show the same page working across
the framework boundary. Each can be copied into a project as-is.

[`web/`](./web) is the first-paint reference: a standalone Vite vanilla-TS page
that imports no shared package, declares a custom `harbor` family in
`theme.config.ts`, and contains ordinary HTML text. It uses
`themvoraVitePlugin()` with no manual bootstrap script, so it is the app behind
the documented Web Components zero-flash guarantee (and the real-browser
`scripts/web/first-paint-check.mjs` evidence).

## Prerequisites

- Node 20+
- pnpm 9+ (the repo is a pnpm workspace; `examples/apps/*` are workspace packages)

## Install

From the repository root:

```bash
pnpm install
```

This links every `@themvora/*` workspace package and the shared app assets.

## Develop a single app

```bash
pnpm --filter @themvora/app-vue dev
pnpm --filter @themvora/app-nextjs dev      # see each app README for its port
```

`pnpm --filter @themvora/app-<name> dev` works for every app; the package names
are `@themvora/app-react`, `-vue`, `-svelte`, `-solid`, `-angular`, `-web`,
`-vanilla-js`, `-astro`, `-astro-native`, `-astro-react`, `-nextjs`, `-nuxt`,
`-remix`.

## Build / type-check the whole suite

```bash
pnpm apps:build        # production build of every app that has one
pnpm apps:typecheck    # type-check of every app that has one
```

Both are recursive filters over `./examples/apps/*`, so the commands do not need
updating when an app is added or removed.

No app runs a build step in `postinstall`. `pnpm install` happens before
`pnpm -r build`, so a lifecycle script that imports a workspace package resolves
an entrypoint (`dist/index.js`) that does not exist yet on a fresh checkout — a
`postinstall: nuxt prepare` in `nuxt/` failed every CI and Vercel install that
way. Each framework's own build command prepares what it needs (`nuxt build`,
`nuxt dev` and `nuxt typecheck` all run `nuxt prepare`), and `pnpm -r build`
orders the packages before the apps.

## How the apps differ in API style

Same UX, different idioms — this is the point of the suite:

| Framework            | How reactivity reaches the UI                                                                                                                                                               |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| React / Next / Remix | `useTheme()` returns the current theme + setters; the component re-renders                                                                                                                  |
| Vue / Nuxt           | `useTheme()` returns `ref`s (`theme`, `mode`, `family`) + setters                                                                                                                           |
| Svelte               | `useTheme()` returns readable stores, read with `$store`                                                                                                                                    |
| Solid                | `useTheme()` returns accessors (`theme()`, `mode()`) + setters                                                                                                                              |
| Angular              | `injectTheme()` returns a `Signal<ThemeState>`; provided by `provideTheme()` (no provider component)                                                                                        |
| Astro                | server-rendered shell + `installThemeBindings()` over the `data-tv-*` attributes (no client framework); `getThemeController()` for readouts |
| Web Components       | `<themvora-provider>` element + `useThemeRuntime()`; selection via `<themvora-select>` — the [`web/`](./web) app is configured entirely in HTML and reads the runtime only for its readouts |
| Vanilla JS           | `new Themvora(...)` + `kit.on("themeChange", …)`                                                                                                                                            |

Scoping follows the same pattern: React/Vue/Svelte/Solid/Next/Remix/Nuxt use a
`ThemeScope` component (family override); Angular's `[themvoraScope]` and the
Web Components `<themvora-scope>` resolve a **theme name**; Astro uses the native
`ThemeScope.astro`, and vanilla uses `createScopedThemeBinding()` from
`@themvora/core`.

## The React reference

`react/` is the full reference implementation (see
[`react/README.md`](./react/README.md) and [`feature-parity.md`](./feature-parity.md)).
Start there to understand what every other app is reproducing.
