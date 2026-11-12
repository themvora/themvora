# @themvora/mantine

## 1.4.0

### Minor Changes

- Give every UI-library adapter a correct first frame, and expose the theme on
  the variables each library actually paints from.

  An adapter that writes only `--theme-*` styles the _Themvora_ layer. Each
  library paints from its own variable namespace — Bootstrap's `--bs-*`, Mantine's
  `--mantine-color-*`, Ant Design's cssinjs tokens — and those are produced when
  the library's provider mounts, which is after the server-rendered markup has
  been parsed. The visible result was a first frame of unstyled surfaces: white
  cards on a dark theme, stock greys, native form controls.

  **New subpaths (minor).**

  - `@themvora/bootstrap/prepaint` — `createBootstrapPrePaintCss()` emits the
    `--bs-*` layer as a stylesheet, one block per theme, so a server-rendered
    document can inline it and paint before any script runs. Plain function, no
    DOM access.
  - `@themvora/mantine/prepaint` — `createMantinePrePaintCss()` does the same for
    `--mantine-color-*`. It carries no React import and no `"use client"`, so a
    server component can call it without crossing a client boundary.
  - `@themvora/antd/next` — `AntdStyleRegistry` serialises Ant Design's cssinjs
    cache into the server HTML through `useServerInsertedHTML`. Ant Design ships
    no stylesheet, so without it the server HTML carries the markup and none of
    the styling. The snapshot is emitted inside a cascade layer, so the live cache
    outranks it the moment it produces a rule for the same element, and a theme
    change is never overridden by the colours of the first render.
    `@ant-design/cssinjs` is a new peer, and `next` is a new _optional_ peer — the
    subpath is the only thing that needs it.

  **Corrected variable mapping.**

  - `@themvora/mantine` supplies a `cssVariablesResolver` and exports
    `useMantineCssVariables`, so cards, inputs and borders follow the palette
    instead of Mantine's stock greys.
  - `@themvora/antd` selects Ant Design's algorithm from the resolved theme's
    mode rather than always running the light one, and seeds the semantic roles
    from the matching Themvora token. Warning and success were previously seeded
    from `accent` and `muted`.
  - `@themvora/bootstrap` points `--bs-card-bg`, `--bs-dropdown-bg`,
    `--bs-popover-bg`, `--bs-modal-bg`, `--bs-offcanvas-bg`, `--bs-accordion-bg`,
    `--bs-list-group-bg` and `--bs-toast-bg` at the Themvora role that means the
    same thing. Bootstrap declares these _on the component_, so a `:root` value
    could never reach them; they are re-declared where Bootstrap declares them.
  - `@themvora/daisyui` recolours the focus indicator from the `ring` token.
    daisyUI paints focus with `--color-base-content` — the _text_ colour — which
    is the near-black ring a focused input showed on a light theme. Width, style
    and offset are untouched, so the indicator stays visible and keyboard
    accessible.
  - `@themvora/unocss` contributes preflights. UnoCSS ships utilities, not a
    reset, so a bare `<input>` kept the user agent's `2px inset` border and
    `outline: auto` ring, which no generated utility can theme. The rules are
    element selectors, so any `border-*`, `bg-*` or `outline-*` utility on the
    same element still wins.

  `@themvora/mui`, `@themvora/chakra`, `@themvora/open-props` and
  `@themvora/shadcn` take a patch: their regenerated READMEs document the shared
  pre-paint contract, and their development dependencies move to React 19.3.

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
  - @theme-kit/adapters@1.3.0

## 1.2.2

### Patch Changes

- Updated dependencies
  - @theme-kit/core@1.2.2
  - @theme-kit/adapters@1.2.2

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
  - @theme-kit/adapters@1.0.0
