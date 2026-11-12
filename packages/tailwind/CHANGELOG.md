# @themvora/tailwind

## 1.4.0

### Minor Changes

- Ship a `base` layer, and move the preflight rules into it.

  Tailwind v4 changed the default border colour from `gray-200` to
  `currentColor`. shadcn/ui's generated components rely on the older contract — a
  Card is written as `class="… border …"` with no `border-*` colour utility — so
  on v4 every one of those borders painted in the text colour: a near-black
  outline on a light theme. `@themvora/tailwind` now restores the previous
  behaviour, so an application that imports the package gets it without repeating
  the `@layer base { * { @apply border-border } }` snippet.

  `preflight.css` had the opposite defect. Its rules were unlayered, and an
  unlayered rule outranks every layered one regardless of specificity, so
  `html, body { background: …; color: … }` silently beat `bg-*` and `text-*`
  applied to those elements: the utilities were emitted, matched, and lost. The
  rules now live in `@layer base`, where utilities outrank them as intended.

  Both changes alter what an existing stylesheet renders, in the direction the
  utility classes were always meant to have. No export was removed or renamed;
  `dist/base.css` is a new file and `index.css` imports it.

### Patch Changes

- Updated dependencies
- Updated dependencies
  - @themvora/core@1.6.0

## 1.3.1

### Patch Changes

- Documentation only: the "Style it with Themvora tokens" examples now use only the tokens a theme is
  required to define.

  The examples read `--theme-radius-md` and `--theme-spacing-4` alongside the colours. Those variables do
  exist in the built-in themes, but `spacing` and `radius` are optional groups — a project theme that
  defines only colours has neither, and the snippet resolved to nothing for exactly the reader most
  likely to copy it.

  The examples now:

  - theme the **document** as well as the page, with an `html, body` rule — a themed card on an unthemed
    canvas was the other half of the problem;
  - use only the required semantic colours (`--theme-color-background`, `-foreground`, `-card`,
    `-cardForeground`, `-border`);
  - keep spacing, typography and layout as ordinary CSS, and give the optional radius a fallback
    (`var(--theme-radius-lg, 12px)`) instead of assuming it is defined.

  No code, types or exports changed — this release exists so the npm landing page shows the corrected
  example. `@themvora/tailwind`'s README gains the same section it was missing.

- Updated dependencies
- Updated dependencies
- Updated dependencies
- Updated dependencies
- Updated dependencies
- Updated dependencies
  - @themvora/core@1.5.0

## 1.3.0

### Minor Changes

- React: add `createThemeRoot()` — an optional client-only root bootstrap that lets Theme Kit own the initial React root commit (synchronous first commit via the framework-documented `flushSync` boundary) for CSR applications with a measured first-render scheduling gap. Composition stays in the app: the `render({ runtime })` callback owns the whole provider tree. `ThemeProvider` remains the normal React integration and never calls `flushSync` itself.

  Core: add a `scrollbar` option to the Vite plugin to inject the pre-paint scrollbar bootstrap (`createPrePaintScrollbarScript`) head-prepend, so the custom overlay is the only scrollbar from the first frame.

  React/Vue/Solid/Svelte/Angular: wire scrollbar pre-paint on the `ThemeScrollbar` mount (idempotent — no-ops when the plugin/SSR adapter already emitted it).

  Vue: fix the selected theme not persisting to localStorage.

  Docs: add "Which React setup should I use?", an "Optimized CSR bootstrap" section with architecture diagrams and multi-provider composition, and regenerate the API reference (now including `createThemeRoot`).

### Patch Changes

- Updated dependencies
  - @theme-kit/core@1.3.0

## 1.2.2

### Patch Changes

- Updated dependencies
  - @theme-kit/core@1.2.2

## 1.0.0

### Major Changes

- Release Theme Kit 1.0.0 — the first stable release of the framework-agnostic
  theming runtime. Semantic tokens, theme families, SSR-safe hydration with zero
  flash, smooth transitions, scoped themes, persistence and history,
  multi-window sync, scheduling, a custom scrollbar, a CLI, and adapters for
  React, Next.js, Vue, Nuxt, Svelte, Solid, Angular, Astro, Remix, Tailwind, and
  the major UI libraries (shadcn/ui, Bootstrap, daisyUI, Open Props, Material UI,
  Chakra UI, Ant Design, Mantine, UnoCSS).

### Patch Changes

- Updated dependencies
- Updated dependencies
- Updated dependencies
  - @theme-kit/core@1.0.0
