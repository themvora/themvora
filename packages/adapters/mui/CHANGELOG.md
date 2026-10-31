# @themvora/mui

## 1.4.0

### Minor Changes

- `createMuiTheme()` takes integration options, so MUI's typography and transitions can be put in step
  with Themvora instead of drifting.

  ```ts
  const muiTheme = createMuiTheme(runtime, {
    fontFamily: "Inter, sans-serif",
    // The same values passed to the runtime's `transition`, so both engines use
    // one timing.
    transitionDuration: 200,
    transitionEasing: "cubic-bezier(0.4, 0, 0.2, 1)",
  });
  ```

  - **`fontFamily`** is for the case where the application loads its font outside the theme (a Google
    font imported in global CSS) _and_ renders `CssBaseline` — whose `body` rule would otherwise inherit
    from `<html>` rather than from the application's `body`. When omitted, the theme's own
    `typography.fontFamilies` token wins; when the theme defines none, MUI is told to **inherit** the
    document font rather than being forced onto `system-ui`.
  - **`transitionDuration` / `transitionEasing`** are mapped onto MUI's own `transitions` scale, so
    MUI-owned animations use the same timing as the theme swap. Pass the runtime's
    `transition.duration` / `transition.easing` to keep both engines in step; MUI's own scale is used
    when they are omitted.

  The problem this addresses is visible in one change: without it, the document switched in one frame
  while a MUI `Button` took ~540 ms and a MUI `Paper` snapped — three timings for one theme change.
  Themvora mutes descendant transitions for the length of the swap on both the View Transition and the
  CSS-property path, so a component that also eases its own `background-color` cannot lag behind the page.

  `MuiThemeIntegrationOptions` is exported so an integration can be typed against it without importing
  the function.

### Patch Changes

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
  - @theme-kit/react@1.3.0
  - @theme-kit/core@1.3.0
  - @theme-kit/adapters@1.3.0

## 1.2.2

### Patch Changes

- Updated dependencies
  - @theme-kit/core@1.2.2
  - @theme-kit/react@1.2.2
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
- Updated dependencies
  - @theme-kit/core@1.0.0
  - @theme-kit/react@1.0.0
  - @theme-kit/adapters@1.0.0
