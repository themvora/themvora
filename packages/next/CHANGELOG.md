# @themvora/next

## 2.1.0

### Minor Changes

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
- Updated dependencies
- Updated dependencies
  - @themvora/core@1.5.0
  - @themvora/react@1.4.0

## 2.0.0

### Major Changes

- Enforce dependency isolation: adapter framework bindings move out of framework
  packages and off the adapter root entries.

  **This is a breaking change. Please read the migration note.**

  The dependency-isolation contract (`scripts/release/dependency-policy.json`,
  enforced by `audit-dependencies.mjs` as part of `release:audit`) permits a
  framework package to depend only on `core`/`web` (or its own renderer), and an
  adapter package only on `core`/`adapters`. Both were violated: the framework
  packages hard-depended on eight to eleven adapter packages each, and every
  adapter's root entry imported `@theme-kit/react` because its hook was a React
  hook.

  Enforcing the contract required removing those dependencies, and the exports
  that existed only to satisfy them went with them:

  - **Adapter roots** (`shadcn`, `bootstrap`, `daisyui`, `open-props`) no longer
    export `useShadcnTheme` / `useBootstrapTheme` / `useDaisyTheme` /
    `useOpenPropsTheme`, and no longer depend on `@theme-kit/react`. Each adapter
    gains per-framework subpaths instead: `./react`, `./vue`, `./svelte`,
    `./solid`, `./angular`.
  - **Framework roots** no longer re-export the adapter bindings:
    `@theme-kit/vue`, `@theme-kit/svelte` and `@theme-kit/solid` each drop
    `useShadcnTheme`, `useBootstrapTheme`, `useDaisyTheme`, `useOpenPropsTheme`
    and `UseAdapterOptions`; `@theme-kit/nuxt` drops the four composables;
    `@theme-kit/next/client` and `@theme-kit/remix` drop the four adapter
    providers and their hooks.

  ### Migration

  The bindings still exist — they moved to the adapter package, one subpath per
  framework:

  ```ts
  // before
  import { useShadcnTheme } from "@theme-kit/shadcn"; // React
  import { useShadcnTheme } from "@theme-kit/vue"; // Vue
  useShadcnTheme(); // no argument
  useShadcnTheme({ strategy: "exact" });

  // after
  import { useShadcnTheme } from "@theme-kit/shadcn/react"; // React
  import { useShadcnTheme } from "@theme-kit/shadcn/vue"; // Vue
  useShadcnTheme(runtime); // runtime is required
  useShadcnTheme(runtime, { strategy: "exact" });
  ```

  Note the second change: the hook's first parameter is now the **runtime**, which
  is a required argument, and the options object moved to second position. The
  runtime is no longer read from framework context inside the adapter, which is
  precisely what let the adapter drop its framework dependency. Callers obtain it
  from their framework's own accessor (`useThemeRuntime()` in React,
  `useThemeRuntime()` in Vue, `getThemeRuntime()` in Svelte, and so on).

  Because the removed symbols cannot be re-exported from their old entries without
  restoring the forbidden dependencies, this change is **not** shim-able: there is
  no deprecated alias that keeps the old import paths working. That is why these
  packages take a **major** rather than a minor.

### Patch Changes

- Repair two corrupted characters in the `ThemeProvider` JSDoc.

  `packages/next/src/layout.tsx` contained a literal U+FFFD replacement character
  followed by `?"` where an em dash belonged, in the doc comment for the
  `scrollbar` option. Because the generated API pages carry JSDoc verbatim, the
  mojibake was published in the docs, not just in the source. Replaced with `—`,
  matching the file's existing convention (328 em dashes vs 9 en dashes across
  `packages/*/src`).

  Documentation only — no runtime or type change.

- Updated dependencies
- Updated dependencies
- Updated dependencies
- Updated dependencies
- Updated dependencies
- Updated dependencies
  - @theme-kit/core@1.4.0
  - @theme-kit/react@1.3.1

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
  - @theme-kit/mui@1.3.0
  - @theme-kit/shadcn@1.3.0
  - @theme-kit/chakra@1.3.0
  - @theme-kit/antd@1.3.0
  - @theme-kit/bootstrap@1.3.0
  - @theme-kit/daisyui@1.3.0
  - @theme-kit/open-props@1.3.0
  - @theme-kit/mantine@1.3.0

## 1.2.2

### Patch Changes

- Updated dependencies
  - @theme-kit/core@1.2.2
  - @theme-kit/react@1.2.2
  - @theme-kit/antd@1.2.2
  - @theme-kit/bootstrap@1.2.2
  - @theme-kit/chakra@1.2.2
  - @theme-kit/daisyui@1.2.2
  - @theme-kit/mui@1.2.2
  - @theme-kit/open-props@1.2.2
  - @theme-kit/shadcn@1.2.2
  - @theme-kit/mantine@1.2.2

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
  - @theme-kit/antd@1.0.0
  - @theme-kit/bootstrap@1.0.0
  - @theme-kit/chakra@1.0.0
  - @theme-kit/daisyui@1.0.0
  - @theme-kit/mantine@1.0.0
  - @theme-kit/mui@1.0.0
  - @theme-kit/open-props@1.0.0
  - @theme-kit/shadcn@1.0.0
