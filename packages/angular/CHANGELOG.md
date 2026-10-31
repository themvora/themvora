# @themvora/angular

## 2.1.0

### Minor Changes

- Add `useEffectiveThemeMode()` — `injectEffectiveThemeMode()` in Angular — which reports the mode
  actually applied rather than the mode that was requested.

  `useThemeMode()` returns the _request_, which is what a three-way light/dark/system picker needs. It is
  the wrong value for a toggle or a label, and quietly so: with `mode: "system"` it never changes, and
  with a sunrise/sunset schedule running it stays on the configured value while the page changes
  underneath it.

  ```tsx
  const effectiveMode = useEffectiveThemeMode();
  return <span>{effectiveMode === "dark" ? "Dark" : "Light"}</span>;
  ```

  It returns `"light" | "dark"` — never `"system"` — and updates for every cause: a click, an OS
  appearance change, a schedule transition. That is because it subscribes to the appearance rather than
  to the selection.

  `@themvora/web` additionally gets `observeEffectiveThemeMode(listener)`, the same subscription without
  a component runtime, returning an unsubscribe function:

  ```ts
  const stop = observeEffectiveThemeMode(() => {
    label.textContent = useEffectiveThemeMode();
  });
  ```

- Add `useProvidedThemes()` — and `injectProvidedThemes()` for Angular — so a theme picker can be built
  from the provider itself.

  Building a picker meant reaching past the provider into the preset catalog
  (`Object.entries(getPresetThemes())`) and hoping the two collections agreed. They do not: an app that
  supplies three of its own families has a picker that lists the presets and none of its own themes.

  ```tsx
  const families = useProvidedThemes();
  const setFamily = useSetThemeFamily();
  const setMode = useSetThemeMode();

  return families.map((family) => (
    <fieldset key={family.id}>
      <legend>{family.name}</legend>
      {family.variants.map((variant) => (
        <button
          key={variant.name}
          onClick={() => {
            setFamily(family.family);
            setMode(variant.mode);
          }}
        >
          {variant.mode}
        </button>
      ))}
    </fieldset>
  ));
  ```

  The collection is exactly what the provider was given, grouped by family in supplied order, with each
  variant's tokens already resolved — `auto()` / `contrast()` / expressions are evaluated, so
  `variant.tokens.colors?.primary` reads directly. Each variant also keeps the original definition, for
  anything the grouped view does not model.

  It is reactive: a `themes` prop change, a `runtime.use(pack)` install or a registry mutation
  re-renders the consumer. Entries keep their identity while their content is unchanged, so `React.memo`
  and dependency arrays behave — a re-registered catalog whose only difference is the registry's
  `meta.created` / `meta.updated` stamps is not treated as a change.

  `ProvidedThemeFamily.provenance` reports a _declared_ source only — `{ kind: "generated", algorithm }`
  from `meta.generation`, `{ kind: "pack", pack }` from a `pack:<name>` tag. A theme called `mint-light`
  is not thereby a preset, and nothing is inferred from a name, family or colour.

  Angular follows its own convention: `injectProvidedThemes()` returns a `Signal` of the same collection,
  because a DI-based framework has no hook call site to subscribe from.

### Patch Changes

- Updated dependencies
- Updated dependencies
- Updated dependencies
- Updated dependencies
- Updated dependencies
- Updated dependencies
- Updated dependencies
  - @themvora/core@1.5.0
  - @themvora/web@1.5.0

## 2.0.0

### Major Changes

- **Removed the adapter bindings from the package root.** `injectShadcnTheme`,
  `injectBootstrapTheme`, `injectDaisyTheme`, `injectOpenPropsTheme` and the
  `InjectAdapterOptions` type are no longer exported from `@theme-kit/angular`. They
  were the only reason this package depended on four component-library adapters, which
  in turn pulled React into an Angular app.

  This is the dependency-isolation contract (2.0.0): a framework package depends only on
  `core`/`web`, and adapter framework bindings live on the adapter's own per-framework
  subpath. Angular is a framework package, so its adapter hooks move out with everyone
  else's.

  **Migration.**

  ```ts
  // before (1.3.x)
  import { injectShadcnTheme } from "@theme-kit/angular";

  // after (2.0.0)
  import { injectShadcnTheme } from "@theme-kit/shadcn/angular";
  ```

  Same for `injectBootstrapTheme` → `@theme-kit/bootstrap/angular`,
  `injectDaisyTheme` → `@theme-kit/daisyui/angular`,
  `injectOpenPropsTheme` → `@theme-kit/open-props/angular`. The
  `InjectAdapterOptions` type is exported from the same subpath.

  `@theme-kit/angular` no longer declares any adapter dependency, so it installs with
  only `core` + `web`.

### Minor Changes

- Fix the pre-paint script writing CSS variables nothing reads, and make its
  critical CSS respect the resolved mode.

  `createBlockingScriptContent` flattened tokens with a local helper that passed an
  empty prefix for the `colors` group, so it emitted `--theme-background` while
  core's `themeToCSSVariables`, the Tailwind preset, the adapters and every shipped
  example read `--theme-color-background`. The pre-paint stylesheet was therefore
  **inert**: a theme's colors only appeared once the client runtime booted, which
  is the flash the helper exists to prevent. It also dropped `borderWidths`,
  `zIndex`, `breakpoints`, `typography` and `code`, and did not flatten `extends`
  chains. It now delegates to core's `themeToCSSVariables`, so the emitted names are
  the canonical ones and every token group is covered.

  The critical CSS was also emitted as both a `prefers-color-scheme` block per
  scheme _unconditionally_, which meant a concrete `light` selection followed an
  OS-dark visitor whenever the script was blocked. A concrete mode is now a plain
  `:root` rule; only `"system"` — the one mode the server cannot resolve — uses
  media queries. Verified with scripts blocked: `light`/`dark`/`system` each paint
  the expected canvas against both OS schemes.

  `createBlockingScriptContent` gains an optional third argument,
  `BlockingScriptOptions` (`{ mode?, defaultTheme? }`). The fallback mode was
  previously derived from `themes[0]` alone, so a caller who asked the runtime for
  `"system"` had no way to tell the script, and the two disagreed. Additive: the
  existing two-argument calls compile and behave as before.

### Patch Changes

- Updated dependencies
- Updated dependencies
- Updated dependencies
- Updated dependencies
- Updated dependencies
  - @theme-kit/core@1.4.0
  - @theme-kit/web@1.4.0

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
  - @theme-kit/shadcn@1.3.0
  - @theme-kit/bootstrap@1.3.0
  - @theme-kit/daisyui@1.3.0
  - @theme-kit/open-props@1.3.0
  - @theme-kit/web@1.3.0

## 1.2.2

### Patch Changes

- Updated dependencies
  - @theme-kit/core@1.2.2
  - @theme-kit/bootstrap@1.2.2
  - @theme-kit/daisyui@1.2.2
  - @theme-kit/open-props@1.2.2
  - @theme-kit/shadcn@1.2.2
  - @theme-kit/web@1.2.2

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
  - @theme-kit/bootstrap@1.0.0
  - @theme-kit/daisyui@1.0.0
  - @theme-kit/open-props@1.0.0
  - @theme-kit/shadcn@1.0.0
