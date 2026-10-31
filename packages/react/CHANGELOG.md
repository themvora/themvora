# @themvora/react

## 1.4.0

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

- `ThemeProvider` accepts a `themeOverride` prop, and `initialFamily` now takes a variant name.

  `themeOverride` is what makes "preview this theme" expressible as a prop. It outranks a saved
  selection — `localStorage` or a cookie — so it survives a reload, and it is a one-shot signal rather
  than a controlled value: it is applied when its value changes, it is never re-asserted on later
  renders, and it never writes to persistence.

  ```tsx
  <ThemeProvider
    themes={themes}
    themeOverride={{ family: "checkout", mode: "dark" }}
  >
    <App />
  </ThemeProvider>
  ```

  The prop is forwarded from `ThemeRuntimeOptions` and keeps the runtime's precedence: an explicit
  override, then a schedule, then the stored selection. A provider that never supplies it never sends
  one, so an update from a provider that does not use it cannot clear an override set elsewhere.

  `initialFamily` accepts `ThemeIdentifier<T>` instead of a family name — the union of variant and family
  names. This is a **widening**: every value that typechecked against 1.3.1 still typechecks. A variant
  name is normalised to its family, and the variant's own mode is used only when `initialMode` is absent,
  so an explicit mode always wins and the two props cannot silently disagree. With themes defined
  `as const`, both props stay autocompleted from the actual theme list.

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
  - @themvora/core@1.5.0

## 1.3.1

### Patch Changes

- Type the `useThemeLifecycle()` handler per event name instead of `unknown`.

  `runtime.lifecycle.on` in `@theme-kit/core` is generic over the event name —
  `on("beforeThemeChange", ({ next }) => …)` gives you `next: T`. The React
  wrapper widened the handler to `(data: unknown) => void`, so the same call in a
  component lost the payload type and `data.next` did not compile, despite the
  docs describing these as "typed lifecycle events".

  ```ts
  // before — `data` is `unknown`
  on: (event: ThemeLifecycleEventName, listener: (data: unknown) => void) => () => void;

  // after
  on: <K extends ThemeLifecycleEventName>(
    event: K,
    listener: (data: ThemeLifecycleEventMap<T>[K]) => void,
  ) => () => void;
  ```

  Type-only: the runtime behaviour is unchanged and no exports were added or
  removed. Handlers that took `unknown` still typecheck (a function accepting
  `unknown` is assignable to one accepting a specific payload), so this only turns
  previously-erroring code into working code.

- Updated dependencies
- Updated dependencies
- Updated dependencies
- Updated dependencies
- Updated dependencies
  - @theme-kit/core@1.4.0

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

- Fix scrollbar overlay clipping to host rounded corners; update framework packages (react/solid/svelte/vue) and core internals.
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

- `ThemeInspector` is now a theme-aware, accessible devtools panel: it uses the
  active theme's semantic tokens (`--theme-color-*`) instead of hardcoded light
  palette colors, renders with `role="dialog"` semantics (Esc to close, focus
  moves into the panel), and the floating toggle is a clear eye icon instead of
  the placeholder "Hello" label. The docs site wires the toolbar in as a live
  theme inspector on every page.
- Updated dependencies
- Updated dependencies
- Updated dependencies
  - @theme-kit/core@1.0.0
