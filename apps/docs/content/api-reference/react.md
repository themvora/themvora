## @themvora/react
Themvora React integration.

Provides the `ThemeProvider`, runtime hooks, the scoped theming component
and hook (`ThemeScope` / `useScopedTheme`), the theme mode button and
inspector, the overlay `ThemeScrollbar`, and the optional synchronous
client root bootstrap (`createThemeRoot`).

> Generated from `packages/react/src` by `apps/docs/scripts/generate-api-reference.mjs`. Do not edit by hand — run `pnpm --filter @themvora/docs api:generate`.

## Functions

### `createThemeRoot<T extends ThemeDefinition<string>>(options): ThemeRootHandle<T>`
Create a Themvora-owned React root for client-rendered (CSR) applications.

Themvora owns the root boundary: the runtime is created once, and the
initial commit is flushed synchronously so the browser's very first frame is
already the themed UI. Without it, React's concurrent root can schedule the
initial commit after the browser paints an empty/partial frame — visible as
a flicker on reload in some applications.

This is an **optional, opt-in** helper. Most applications can use the plain
React API and it will be smooth:

```tsx
const root = createRoot(container);
root.render(
  <ThemeProvider defaultTheme="mint-light" initialMode="system">
    <App />
  </ThemeProvider>,
);
```

Reach for `createThemeRoot` when you want Themvora to own the root
initialization boundary — for example a reload-sensitive demo, or an app
whose providers need the Themvora runtime at composition time:

```tsx
import { createThemeRoot } from "@themvora/react";

const handle = createThemeRoot({
  container: document.getElementById("root")!,
  defaultTheme: "mint-light",
  initialMode: "system",
  transition: { enabled: true },
  render: ({ runtime }) => (
    <MuiThemeProvider runtime={runtime}>
      <App />
    </MuiThemeProvider>
  ),
});

handle.unmount();
```

Only the FIRST commit is flushed synchronously; subsequent renders keep
React's normal concurrent scheduling. `ThemeProvider` itself never calls
`flushSync` — the helper owns the root, which is the one place React
documents `flushSync` as appropriate.

Do **not** use this helper for SSR/SSG applications — server-rendered HTML
must be hydrated with `hydrateRoot()` (or a framework integration such as
`@themvora/next`), not replaced by a fresh `createRoot`.

**See also:** `ThemeProvider`

| Parameter | Type | Description |
| --------- | ---- | ----------- |
| `options` | `CreateThemeRootOptions<T>` | — |

**Returns** `ThemeRootHandle<T>`

---


### `ThemeInspector(__namedParameters): Element`
A floating developer tool that inspects the active theme.

Renders a fixed toggle button and an expandable panel showing the current
theme name, family, mode, selection state, token values, and emitted CSS
variables — useful while building themeable UI.

**See also:** `useTheme`

**Returns** `Element`

The panel opens above the toggle with a gap, stays dismissible via the
toggle, `Escape`, or clicking outside, and matches the provider's transition
duration for its own fade.

```ts
<ThemeInspector />
```

---


### `ThemeModeButton(): Element`
A minimal demo-style button that cycles the theme mode:
`light → dark → system → light`.

Renders a `<button>` whose label is the mode **actually applied**, with the
configured mode shown alongside it while that is `"system"`. Cycling always
follows the configured mode, so a visitor who picked "system" stays on it.

Use it for demos and prototypes, or build your own control with
useTheme.

**See also:** `useTheme`, `useEffectiveThemeMode`

**Returns** `Element`

The label reads useEffectiveThemeMode rather than useThemeMode
on purpose. With a sunrise/sunset schedule running, the configured mode is the
visitor's standing request — `"system"`, or whichever mode they last picked —
and it does not move at sunset. A label bound to it therefore kept announcing
the old mode while the page changed colour. The effective mode moves with the
page.

```ts
<ThemeModeButton />
```

---


### `ThemeProvider<T extends ThemeDefinition<string>>(__namedParameters): Element`
React provider for a Themvora runtime.

Creates a runtime on mount (unless a `runtime` prop is given), installs the
DOM + CSS-variable bindings, injects a pre-paint bootstrap script for
flash-proofing, and provides the runtime to all Themvora hooks below.

Must be rendered inside the application's root. When no `runtime` prop is
passed, the provider owns the runtime and destroys it on unmount; the
deferred-destroy mechanism keeps the runtime alive across React StrictMode
remounts.

**See also:** `useTheme`, `ThemeScope`, `createThemeRoot`

**Returns** `Element`

**The first paint is the root's business, not the provider's.** On a
client-rendered app React's concurrent root *schedules* the initial commit,
so the browser can paint a frame with the root still empty before React
commits — one frame, ~33 ms, plainly visible as the UI blinking on reload.
The provider cannot prevent it: that frame is painted before any of the app's
React code runs, so nothing the provider does in a render, an insertion
effect or a layout effect is in time.

It is fixed where it happens instead, with no application code:

- **Vite apps** — `themvoraVitePlugin()` resolves `react-dom/client` to a shim
  that flushes the first `render` synchronously (`syncFirstRender`, on by
  default). Nothing in the app changes; `<ThemeProvider>` alone is enough.
- **Anything else** — createThemeRoot is that same synchronous first
  commit plus runtime ownership, and stays entirely opt-in.

The provider's own theme work *is* pre-paint: the bootstrap is injected in an
insertion effect and a server-resolved `initial` is applied in a layout
effect, so neither waits for the browser to paint.

The pre-JS window is out of scope for all of them: until the entry module
runs, the root is empty by definition. A themed canvas keeps that window from
reading as a flash, and only a prerendered first paint puts content in it.

```ts
function App() {
  return (
    <ThemeProvider defaultTheme="mint-light" initialMode="system">
      <Page />
    </ThemeProvider>
  );
}
```

---


### `ThemeScope(__namedParameters): Element`
Applies a theme to a subtree without replacing the global runtime.

The scope resolves local themes (`themes` prop) before falling back to the
parent runtime's theme registry. Nested scopes override their parent within
their own boundary. Theme changes are reactive: `theme`/`family`/`mode`
props and global mode changes re-resolve and animate in place without
remounting.

**See also:** `useScopedTheme`

**Returns** `Element`

Scope-local transitions inherit the parent transition configuration unless
explicitly overridden or disabled. First paint is server-safe: explicit
selections ship resolved variables inline, while OS-dependent selections
(system mode / family-following scopes) ship no inline variables plus a
`@media (prefers-color-scheme: dark)` override, so no flash occurs.

```ts
<ThemeScope family="plum" mode="dark">
  <Editor />
</ThemeScope>
```

---


### `ThemeScrollbar(props): null`
ThemeScrollbar — overlay only.

Creates the custom scrollbar overlay.

Lifecycle:
  mount  → create overlay → measure → attach listeners
  paint  → add tv-scrollbar-ready
  destroy → remove overlay

Props are four optional groups — `behavior`, `appearance`, `scope` and
`icons` — plus `children`, which is accepted for JSX symmetry only.

  <ThemeScrollbar
    behavior={{ autoHide: true, smooth: true }}
    appearance={{ thickness: 8, radius: 999 }}
    scope={{ include: [".panel"] }}
    icons={{ up: <ArrowUpIcon />, size: 12 }}
  />

  <ThemeScrollbar
    behavior={{ autoHide: true, smooth: true }}
    appearance={{ thickness: 8, radius: 999 }}
    icons={{ up: <ArrowUpIcon />, down: <ArrowDownIcon /> }}
  />

**See also:** `ThemeProvider`

| Parameter | Type | Description |
| --------- | ---- | ----------- |
| `props` | `ThemeScrollbarProps` | — |

**Returns** `null`

---


### `useEffectiveThemeMode(): "light" | "dark"`
Subscribe to the mode actually **applied** — `"light"` or `"dark"`, never
`"system"`.

This is the value a control that says "you are in dark mode" must render.
useThemeMode reports the request, which is the right thing for a
three-way light/dark/system picker but the wrong thing for a toggle or a
label: with `mode: "system"` it never changes, and with a sunrise/sunset
schedule running it stays on the configured value while the page changes
underneath it.

Updates for every cause — a click, an OS appearance change, a schedule
transition — because it subscribes to the appearance rather than to the
selection.

```tsx
const effectiveMode = useEffectiveThemeMode();
return <span>{effectiveMode === "dark" ? "Dark" : "Light"}</span>;
```

**See also:** `useThemeMode`, `useThemeSchedule`

**Returns** `"light" | "dark"`

---


### `useGeneratedTheme<T extends ThemeDefinition<string>>(): T`
The theme produced by `generateTheme()` and registered with the provider.

Returns the registered theme that carries the generator's origin marker
(`meta.generation.kind === "generated"`) — never a shipped preset, and never
inferred from a theme's id, family or colors. Generate one and pass the result
to `ThemeProvider`:

```tsx
const generated = generateTheme({ seed: "#635BFF", family: "brand" });
<ThemeProvider themes={[generated.light, generated.dark]}>{children}</ThemeProvider>
```

When both halves of one `generateTheme()` call are registered, the theme the
active selection resolves to is returned. If several generated themes are
registered and none is active, the call throws rather than guessing.

Throws `ThemeError` with code `TV_GENERATION_THEME_NOT_FOUND` when the provider
holds no generated theme, and `TV_GENERATION_THEME_AMBIGUOUS` when several are
registered and the active selection does not identify one.

Re-resolves on every settled change to the registry, store, or selection; if
the generated theme is later removed, the same error is raised at the next
render rather than a stale theme being returned.

**See also:** `useThemeValue`

**Returns** `T` — The registered generated theme.

---


### `useProvidedThemes<T extends ThemeDefinition<string>>(): readonly ProvidedThemeFamily<T>[]`
The themes this provider was given, grouped by family.

Returns exactly the collection supplied to the nearest `ThemeProvider` — not
the built-in catalog, and not every theme that exists in the project. Build a
theme picker from it instead of enumerating a separate preset source:

```tsx
const themes = useProvidedThemes();

return themes.map((family) => (
  <section key={family.id}>
    <h3>{family.name}</h3>
    {family.variants.map((variant) => (
      <button key={variant.name} onClick={() => setFamily(family.family)}>
        {variant.mode}
      </button>
    ))}
  </section>
));
```

The collection is reactive: a `themes` prop change, a `runtime.use(pack)`
install or a registry mutation re-renders the consumer. Entries keep their
identity while their content is unchanged, so `React.memo` and dependency
arrays behave.

**See also:** `useTheme`, `normalizeProvidedThemes`

**Returns** `readonly ProvidedThemeFamily<T>[]` — The provider's theme families, in supplied order.

---


### `useScopedTheme(ref, selection, transition?): RefObject<{ destroy: void; getTheme: void; refresh: void; setLocalThemes: void; setTransition: void; update: void } | null>`
Headless scoped-theming hook: applies a scoped theme selection to an
arbitrary element (by ref) without rendering a wrapper component.

Useful when the scoped element is not a plain `div` — e.g. a custom
component that forwards a ref — or when `ThemeScope`'s wrapper would break
layout.

Must be called inside `ThemeProvider`.

| Parameter | Type | Description |
| --------- | ---- | ----------- |
| `ref` | `RefObject<HTMLElement \| null>` | Ref to the element that receives the scoped theme variables. |
| `selection` | `ScopedThemeSelection \| null` | Scoped selection to apply. Pass `null` to remove the scope (destroys any active binding). |
| `transition` | `boolean \| ThemeTransitionOptions` (optional) | Transition override for this scope's changes. Inherits the provider transition when omitted. |

**Returns** `RefObject<{ destroy: void; getTheme: void; refresh: void; setLocalThemes: void; setTransition: void; update: void } | null>` — A ref holding the active scoped binding (for advanced access).

```ts
const elRef = useRef<HTMLDivElement>(null);
useScopedTheme(elRef, { family: "plum", mode: "dark" });
return <div ref={elRef} />;
```

---


### `useSetThemeFamily<T extends ThemeDefinition<string>>(): __type(family: ThemeFamilies<readonly T[]>): void`
Get a stable `setFamily` function (does not re-render on change).

**See also:** `useThemeFamily`

**Returns** `__type(family: ThemeFamilies<readonly T[]>): void`

---


### `useSetThemeMode<T extends ThemeDefinition<string>>(): __type(mode: ModesOf<T>): void`
Get a stable `setMode` function (does not re-render on change).

**See also:** `useThemeMode`

**Returns** `__type(mode: ModesOf<T>): void`

---


### `useTheme<T extends ThemeDefinition<string>>(): { effectiveMode: "light" | "dark"; family: string; mode: ThemeMode; setFamily: __type(family: ThemeFamilies): void; setMode: __type(mode: ModesOf): void; theme: T; toggleTheme: __type(): void }`
The primary Themvora hook. Returns the current theme, mode, family and
   the selection controls.

   When you pass the theme tuple element type, `setFamily` and `setMode`
   are constrained to the families/modes defined in your registry (the
   built-in set is used below so the example stands alone):

   ```ts
   import { getBuiltInThemes } from "@themvora/core";

   const themes = getBuiltInThemes();
   const { theme, mode, family, setMode, setFamily, toggleTheme } = useTheme<typeof themes[number]>();
   setFamily("mint");   // autocomplete suggests your families
   setMode("dark");
   ```

**See also:** `useThemeValue`, `useThemeMode`, `useEffectiveThemeMode`, `useThemeFamily`

**Returns** `{ effectiveMode: "light" | "dark"; family: string; mode: ThemeMode; setFamily: __type(family: ThemeFamilies): void; setMode: __type(mode: ModesOf): void; theme: T; toggleTheme: __type(): void }`

---


### `useThemeBatch(): __type(callback: __type(): void): void`
Get a batch function that defers all selection changes and DOM writes
   to a single flush.

**See also:** `useTheme`

**Returns** `__type(callback: __type(): void): void`

---


### `useThemeFamily(): string`
Subscribe to the current selection family.

**See also:** `useSetThemeFamily`

**Returns** `string`

---


### `useThemeHistory(): { canRedo: boolean; canUndo: boolean; clear: __type(): void; redo: __type(): void; undo: __type(): void }`
Subscribe to the runtime history (undo/redo/canUndo/canRedo/clear).

**See also:** `useThemeTimeTravel`

**Returns** `{ canRedo: boolean; canUndo: boolean; clear: __type(): void; redo: __type(): void; undo: __type(): void }`

---


### `useThemeLifecycle<T extends ThemeDefinition<string>>(): { on: __type<K extends keyof ThemeLifecycleEventMap<ThemeDefinition<string>>>(event: K, listener: __type(data: ThemeLifecycleEventMap<T>[K]): void): __type(): void }`
Subscribe to runtime lifecycle events (theme changed, mode changed, …).

The handler is typed per event name, so `on("beforeThemeChange", ({ next }) => …)`
gives you the theme definitions rather than `unknown` — the same precision
`runtime.lifecycle.on` has in `@themvora/core`.

**See also:** `useTheme`

**Returns** `{ on: __type<K extends keyof ThemeLifecycleEventMap<ThemeDefinition<string>>>(event: K, listener: __type(data: ThemeLifecycleEventMap<T>[K]): void): __type(): void }`

---


### `useThemeMode(): ThemeMode`
Subscribe to the current selection mode ("light" | "dark" | "system").

This is the mode the visitor **asked for**. While a sunrise/sunset schedule
is running, or while the selection is `"system"`, the appearance on screen can
differ from it — use useEffectiveThemeMode to display what is actually
applied.

**See also:** `useEffectiveThemeMode`, `useSetThemeMode`

**Returns** `ThemeMode`

---


### `useThemePacks(): __type(pack: ThemePack<any>): void`
Get a function that applies a theme pack to the runtime.

**See also:** `useTheme`

**Returns** `__type(pack: ThemePack<any>): void`

---


### `useThemeRestore(): __type(snapshot: ThemeRuntimeSnapshot): void`
Get a restore function that re-applies a previously captured snapshot.

**See also:** `useThemeSnapshot`

**Returns** `__type(snapshot: ThemeRuntimeSnapshot): void`

---


### `useThemeRuntime<T extends ThemeDefinition<string>>(): ThemeRuntime<T>`
Get the active Themvora runtime from context. Throws when used outside a
`ThemeProvider`. Pass the theme tuple element type to type the runtime's
store/selection against your registry — any registry works, so the built-in
set is used here to keep the example self-contained:

```ts
import { getBuiltInThemes } from "@themvora/core";

const themes = getBuiltInThemes();
const runtime = useThemeRuntime<typeof themes[number]>();
```

**See also:** `ThemeProvider`, `useTheme`

**Returns** `ThemeRuntime<T>`

---


### `useThemeSchedule(): ThemeSchedule | null`
Reactive access to the runtime's sunrise/sunset scheduling controller.

Requires the runtime to be created with the `scheduled` option (see
`ThemeProvider` / `createThemeRuntime`). Returns `null` when the provider has
no schedule configured.

```tsx
const schedule = useThemeSchedule();
schedule?.enable();
schedule?.disable();
// schedule.enabled, schedule.active, schedule.sunrise, schedule.sunset,
// schedule.nextTransition ... re-render reactively.
```

**See also:** `ThemeProvider`, `useTheme`

**Returns** `ThemeSchedule | null`

The returned controller is a **reactive view**: its state reads come from the
subscription below, not from the live controller. That is what makes it safe
to render during SSR — the subscription hydrates from
EMPTY_THEME_SCHEDULE_STATE, the same snapshot the server rendered, and
only adopts the live state after mount. Returning the raw controller instead
(which is what this hook used to do, discarding the subscription it had just
created) handed consumers the *live* value during the hydration render, so
React saw a mismatch against the server HTML and re-rendered the tree.

---


### `useThemeSnapshot(): __type(): ThemeRuntimeSnapshot`
Get a snapshot function that captures the full runtime state.

**See also:** `useThemeRestore`

**Returns** `__type(): ThemeRuntimeSnapshot`

---


### `useThemeTimeTravel(): { history: HistoryEntry<ThemeDefinition<string>>[]; jump: __type(index: number): void }`
Subscribe to the history timeline and get a `jump(index)` function.

**See also:** `useThemeHistory`

**Returns** `{ history: HistoryEntry<ThemeDefinition<string>>[]; jump: __type(index: number): void }`

---


### `useThemeTokens<T extends ThemeDefinition<string>>(): ThemeTokens | undefined`
Subscribe to the current theme's token groups.

**See also:** `useThemeValue`

**Returns** `ThemeTokens | undefined`

---


### `useThemeValue<T extends ThemeDefinition<string>>(): T`
Subscribe to the current theme definition (re-renders on change).

**See also:** `useTheme`

**Returns** `T`

---


### `useToggleTheme(): __type(): void`
Get a stable `toggleTheme` function (flips light ⇄ dark).

**See also:** `useThemeMode`

**Returns** `__type(): void`

---

## Interfaces

### `CreateThemeRootOptions<T extends ThemeDefinition>`

**Extends** `Omit<ThemeProviderProps<T>, "children" | "runtime">`
Options for `createThemeRoot`.

Everything `ThemeProvider` accepts (except `children` and `runtime`, which
this helper manages), plus:

- `container` — the DOM node the root mounts into.
- `render` — the application's full composition. Receives the Themvora
  runtime so dependent library configuration can be derived from it:

  ```tsx
  createThemeRoot({
    container,
    defaultTheme: "mint-light",
    initialMode: "system",
    render: ({ runtime }) => (
      <MuiThemeProvider runtime={runtime}>
        <App />
      </MuiThemeProvider>
    ),
  });
  ```

  Composition belongs in JSX, so arbitrary provider trees (MUI, Chakra,
  React Query, Redux, Router, …) are fully under the application's control.
  `MuiThemeProvider` above is the `@themvora/mui` adapter provider, which
  takes the runtime directly. `render` is the primary (and only) composition
  mechanism — there is no separate `children` option.

| Member | Type | Description |
| ------ | ---- | ----------- |
| `adapters` (optional) | `ThemeAdapter<T>[]` | Library adapters installed when the runtime is created. The runtime owns the registry and notifies every adapter whenever the theme changes; it never knows anything about the libraries themselves. |
| `broadcast` (optional) | `ThemeSelectionBroadcastAdapter \| null` | Cross-tab broadcast adapter. When omitted, a `BroadcastChannel`-based adapter on channel `"theme-selection"` is created; pass `null` to disable cross-tab sync. |
| `container` | `Element \| DocumentFragment` | The DOM node this root mounts into. |
| `cssVariables` (optional) | `false \| CSSVariablesOptions` | CSS-variable binding configuration. `false` disables the binding. |
| `defaultTheme` (optional) | `ThemeIdentifier<T>` | Theme to activate when no persisted or explicit selection exists. Accepts a **variant** name (`"cocoa-dark"`) or a **family** name (`"cocoa"`); a family resolves to the variant the mode contract picks (see resolveThemeReference). A variant also supplies its own mode unless `initialMode` is given. |
| `dom` (optional) | `false \| DOMBindingOptions` | DOM attribute/class binding configuration. `false` disables the binding. |
| `initial` (optional) | `InitialThemeResolution<T>` | Explicit initial theme resolution, bypassing default + persistence based resolution. |
| `initialFamily` (optional) | `ThemeIdentifier<T>` | The family resolved on first load. When themes are defined with `as const`, this is constrained to the families defined in `themes` (autocomplete). A **variant** name is accepted too and normalised to its family — the variant's mode is used only when `initialMode` is absent, so an explicit mode always wins. |
| `initialMode` (optional) | `"system" \| ThemeModes<readonly T[]>` | The mode resolved on first load: `"light" \| "dark" \| "system"`. When themes are defined with `as const`, this is constrained to the modes defined in `themes` plus `"system"` (autocomplete). |
| `persistence` (optional) | `ThemeSelectionPersistenceAdapter \| null` | Persistence adapter for the theme selection. Pass `null` to disable persistence entirely. |
| `plugins` (optional) | `ThemePlugin<T>[]` | Runtime plugins installed at creation. |
| `readPersistenceOnInit` (optional) | `boolean` | Whether a persisted selection is read at runtime creation. |
| `render` | `__type(context: { runtime: ThemeRuntime<T> }): ReactNode` | Render the application tree. Called with the Themvora runtime so other library providers can derive their configuration from it. |
| `scheduled` (optional) | `false \| ScheduledThemeOptions<T>` | Sunrise/sunset scheduling configuration. `false` disables scheduling. |
| `themeOverride` (optional) | `ThemeOverride<ThemeIdentifier<T>>` | An explicit theme to apply, outranking a saved selection. Unlike defaultTheme, which is only a fallback, an override is applied even when `localStorage` or a cookie already names another theme — which is what makes "preview this theme" expressible as a prop. It is a one-shot signal, not a controlled selection: it is applied when its value changes, it is never re-asserted on later renders, and it does not write to persistence. See ThemeOverride. |
| `themes` (optional) | `readonly T[]` | Initial theme definitions. Duplicate names are dropped (first wins). When omitted, the registry starts empty. |
| `transition` (optional) | `boolean \| ThemeTransitionOptions` | Transition configuration. `true` enables transitions with defaults, `false` disables them, and an object provides explicit options. |
| `view` (optional) | `Window` | The `window` to bind to. Defaults to the global `window` when available; omit (or pass `undefined`) in SSR environments. |

---


### `ThemeInspectorProps`
Position and sizing options for the ThemeInspector floating UI.

| Member | Type | Description |
| ------ | ---- | ----------- |
| `bottom` (optional) | `number` | Vertical distance from the bottom of the viewport, in px. Default 104. |
| `right` (optional) | `number` | Horizontal distance from the right edge of the viewport, in px. Default 32. |
| `size` (optional) | `number` | Toggle button size (width and height), in px. Default 40. |
| `zIndex` (optional) | `number` | Z-index for the floating toggle and panel. Default 9999. |

---


### `ThemeProviderProps<T extends ThemeDefinition>`

**Extends** `Omit<ThemeRuntimeOptions<T>, "initialFamily" | "initialMode">`
Props for the ThemeProvider component.

Accepts all `createThemeRuntime` options except `initialFamily`/`initialMode`
(which are re-typed with family/mode autocompletion), plus `runtime` and
`children`.

| Member | Type | Description |
| ------ | ---- | ----------- |
| `adapters` (optional) | `ThemeAdapter<T>[]` | Library adapters installed when the runtime is created. The runtime owns the registry and notifies every adapter whenever the theme changes; it never knows anything about the libraries themselves. |
| `broadcast` (optional) | `ThemeSelectionBroadcastAdapter \| null` | Cross-tab broadcast adapter. When omitted, a `BroadcastChannel`-based adapter on channel `"theme-selection"` is created; pass `null` to disable cross-tab sync. |
| `children` | `ReactNode` | The application tree rendered inside the provider. |
| `cssVariables` (optional) | `false \| CSSVariablesOptions` | CSS-variable binding configuration. `false` disables the binding. |
| `defaultTheme` (optional) | `ThemeIdentifier<T>` | Theme to activate when no persisted or explicit selection exists. Accepts a **variant** name (`"cocoa-dark"`) or a **family** name (`"cocoa"`); a family resolves to the variant the mode contract picks (see resolveThemeReference). A variant also supplies its own mode unless `initialMode` is given. |
| `dom` (optional) | `false \| DOMBindingOptions` | DOM attribute/class binding configuration. `false` disables the binding. |
| `initial` (optional) | `InitialThemeResolution<T>` | Explicit initial theme resolution, bypassing default + persistence based resolution. |
| `initialFamily` (optional) | `ThemeIdentifier<T>` | The family resolved on first load. When themes are defined with `as const`, this is constrained to the families defined in `themes` (autocomplete). A **variant** name is accepted too and normalised to its family — the variant's mode is used only when `initialMode` is absent, so an explicit mode always wins. |
| `initialMode` (optional) | `"system" \| ThemeModes<readonly T[]>` | The mode resolved on first load: `"light" \| "dark" \| "system"`. When themes are defined with `as const`, this is constrained to the modes defined in `themes` plus `"system"` (autocomplete). |
| `persistence` (optional) | `ThemeSelectionPersistenceAdapter \| null` | Persistence adapter for the theme selection. Pass `null` to disable persistence entirely. |
| `plugins` (optional) | `ThemePlugin<T>[]` | Runtime plugins installed at creation. |
| `readPersistenceOnInit` (optional) | `boolean` | Whether a persisted selection is read at runtime creation. |
| `runtime` (optional) | `ThemeRuntime<T>` | A runtime owned by the caller. When provided, the provider does not create or destroy a runtime — the caller owns its lifecycle. When omitted, the provider creates an internal runtime (owning `dom` and `cssVariables` itself) and destroys it on unmount. |
| `scheduled` (optional) | `false \| ScheduledThemeOptions<T>` | Sunrise/sunset scheduling configuration. `false` disables scheduling. |
| `themeOverride` (optional) | `ThemeOverride<ThemeIdentifier<T>>` | An explicit theme to apply, outranking a saved selection. Unlike defaultTheme, which is only a fallback, an override is applied even when `localStorage` or a cookie already names another theme — which is what makes "preview this theme" expressible as a prop. It is a one-shot signal, not a controlled selection: it is applied when its value changes, it is never re-asserted on later renders, and it does not write to persistence. See ThemeOverride. |
| `themes` (optional) | `readonly T[]` | Initial theme definitions. Duplicate names are dropped (first wins). When omitted, the registry starts empty. |
| `transition` (optional) | `boolean \| ThemeTransitionOptions` | Transition configuration. `true` enables transitions with defaults, `false` disables them, and an object provides explicit options. |
| `view` (optional) | `Window` | The `window` to bind to. Defaults to the global `window` when available; omit (or pass `undefined`) in SSR environments. |

---


### `ThemeRootHandle<T extends ThemeDefinition>`
The handle returned by `createThemeRoot`.

| Member | Type | Description |
| ------ | ---- | ----------- |
| `root` | `Root` | The underlying React root (for manual re-renders if needed). |
| `runtime` | `ThemeRuntime<T>` | The Themvora runtime created for this root. |
| `unmount` | `void` | — |

---


### `ThemeScopeProps`
Props for the ThemeScope component.

Accepts `theme` (exact selection), `family`/`mode` (family-based
selection), `themes` (scope-local definitions), and `transition`.

| Member | Type | Description |
| ------ | ---- | ----------- |
| `children` | `ReactNode` | The scoped subtree. |
| `className` (optional) | `string` | Additional class applied to the scope wrapper element. |
| `family` (optional) | `string` | Theme family for the scoped subtree. When `mode` is omitted the scope follows the provider's current mode (light/dark/system). |
| `mode` (optional) | `ThemeMode` | Mode for a family-based scope. Optional — defaults to the provider's current mode so `family="plum"` flips light/dark with the page. |
| `style` (optional) | `CSSProperties` | Inline styles applied to the scope wrapper element. Merged over the resolved theme variables, so user styles win on conflicts. |
| `theme` (optional) | `string` | Exact theme name, family name, or a `{ family, mode }`-style object. When `family`/`mode` are also passed, `theme` wins (it's the explicit selection). Omit to follow the global selection inside a new boundary. |
| `themes` (optional) | `readonly ThemeDefinition<string>[]` | Local theme definitions for genuinely isolated components. Resolved FIRST (they shadow same-named parent themes), then the provider's registry falls back — no second runtime is created. |
| `transition` (optional) | `boolean \| ThemeTransitionOptions` | Transition for this scope's own theme changes. `undefined` inherits the `<ThemeProvider/>` transition, `false` disables it, `true` inherits, and an object is merged over the provider's config (local keys win). |

---


### `ThemeScrollbarAppearance`

**Extends** `Pick<OverlayScrollbarOptions, "arrows" | "thickness" | "hoverThickness" | "radius" | "minThumbSize" | "offset" | "trackOpacity" | "thumbOpacity" | "zIndex" | "duration" | "animationDuration" | "thumbColor" | "trackColor" | "activeThumbColor" | "thumbHoverColor">`
Appearance — the look/size of every strip.

| Member | Type | Description |
| ------ | ---- | ----------- |
| `activeThumbColor` (optional) | `string` | Custom thumb color while the user is dragging it. When set, overrides the theme-derived active color. Default `undefined` (uses `thumbColor` or theme-derived). |
| `animationDuration` (optional) | `number` | rAF easing time constant (ms) for smooth thumb travel. Default `180`. |
| `arrows` (optional) | `boolean` | Show the up/down (or left/right) navigation buttons like native browser scrollbars. Clicking scrolls a step; holding repeats. Default `true`. |
| `duration` (optional) | `number` | CSS transition duration (ms) for thickness/opacity/color. Default `250`. |
| `hoverThickness` (optional) | `number` | Thumb thickness while hovered / dragged — only used when `hoverExpand` is true. Default `thickness + 4`. |
| `minThumbSize` (optional) | `number` | Minimum thumb travel size. Default `32`. |
| `offset` (optional) | `ScrollbarOffset` | Distance from the container edges to the rail. A number insets every side equally; an object sets individual sides, with omitted sides defaulting to the component default (`4`, except `left`, which defaults to `0`). A side set to `0` gets no inset — the rail sits flush against that edge, like a native scrollbar. The rail follows the writing direction (a vertical rail sits on the inline-end edge), so in RTL it uses `left`. The content is kept clear of the rail by the native scrollbar gutter the component reserves, not by extra padding, so no content width is taken and nothing reflows. |
| `radius` (optional) | `number` | Thumb corner radius in px. Default `999`. |
| `thickness` (optional) | `number` | Resting thumb thickness (width for vertical, height for horizontal). Default `8`. |
| `thumbColor` (optional) | `string` | Custom thumb color (any CSS color string). When set, overrides the theme-derived color. Default `undefined` (theme-derived). |
| `thumbHoverColor` (optional) | `string` | Custom thumb color while hovered. When set, overrides the theme-derived hover color. Default `undefined` (uses `thumbColor` or theme-derived). |
| `thumbOpacity` (optional) | `number` | Thumb opacity while visible. Default `0.7`. |
| `trackColor` (optional) | `string` | Custom track color (any CSS color string). When set, overrides the theme-derived color. Default `undefined` (theme-derived). |
| `trackOpacity` (optional) | `number` | Track strip opacity (0 = invisible). Default `0.25`. |
| `zIndex` (optional) | `number` | Z-index for the overlay strips. Defaults to the tracked container's own `z-index` (so the scrollbar stays inside its container's stacking order — e.g. a rail inside a sticky header never floats above that header). Containers that declare no z-index get `0`; the document scrollbar gets `55`, which is above typical sticky headers (50) and below full-screen modal backdrops (60) — the window bar is chrome, so a fixed header must not hide it. Overriding lets you force scrollbars above fixed headers/modals if you need to. |

---


### `ThemeScrollbarBehavior`

**Extends** `Pick<OverlayScrollbarOptions, "autoHide" | "hoverExpand" | "draggable" | "clickToJump" | "smooth" | "overscroll" | "axes" | "touch" | "dir">`
Behavior — how the overlay scrolls and hides.

| Member | Type | Description |
| ------ | ---- | ----------- |
| `autoHide` (optional) | `boolean` | Fade the thumb/track out while idle. Default `true` (macOS-style). |
| `autoHideDelay` (optional) | `number` | Idle (ms) before a revealed strip fades out. Default `900`. |
| `axes` (optional) | `ScrollbarAxis[]` | Which axes to render. Defaults to both. |
| `clickToJump` (optional) | `boolean` | Clicking the empty track scrolls smoothly to that position. Default `true`. |
| `dir` (optional) | `"ltr" \| "rtl" \| "auto"` | Text direction. Defaults to the resolved `dir` / CSS `direction`. |
| `draggable` (optional) | `boolean` | Allow dragging the thumb to scroll. Default `true`. |
| `hoverExpand` (optional) | `boolean` | Grow the strip on hover / drag. Default `false` (thickness stays constant so the scrollbar never shifts while scrolling). |
| `overscroll` (optional) | `boolean` | Subtly compress the thumb at the scroll boundaries (rubber-band feel). Default `true`. |
| `smooth` (optional) | `boolean` | Use rAF-lerped (eased) thumb motion instead of a hard snap. Default `true`. |
| `touch` (optional) | `boolean` | Native (touch) devices: keep native scrollbars by default. Pass `true` to force the overlay on coarse-pointer devices. Default `false`. |

---


### `ThemeScrollbarIcons`
Arrow button icons (any `ReactNode` — JSX, inline SVG, text, …).

| Member | Type | Description |
| ------ | ---- | ----------- |
| `arrow` (optional) | `ReactNode` | Icon for all arrow directions (individual overrides win). |
| `down` (optional) | `ReactNode` | Icon for the "scroll down" button. |
| `left` (optional) | `ReactNode` | Icon for the "scroll left" button. |
| `right` (optional) | `ReactNode` | Icon for the "scroll right" button. |
| `size` (optional) | `number` | Arrow glyph size, in CSS px, for all four directions. Clamped to the button's usable area, so it never overflows a thin rail. Omit to keep the default sizing. |
| `up` (optional) | `ReactNode` | Icon for the "scroll up" button. |

---


### `ThemeScrollbarProps`
Props for the ThemeScrollbar overlay component.

Options are grouped into `behavior`, `appearance`, and `icons` — but every
option is also accepted as a flat, top-level prop (flat props win over the
grouped ones).

| Member | Type | Description |
| ------ | ---- | ----------- |
| `appearance` (optional) | `ThemeScrollbarAppearance` | The look and size of every rail. |
| `behavior` (optional) | `ThemeScrollbarBehavior` | How the overlay scrolls and hides. |
| `children` (optional) | `ReactNode` | Renders nothing visible; kept for API symmetry (the overlay is created against the runtime, not the component tree). It is deliberately ignored by option resolution and change detection. |
| `icons` (optional) | `ThemeScrollbarIcons` | Arrow button icons, plus the shared glyph size. |
| `scope` (optional) | `ThemeScrollbarScope` | Which scrollable containers the overlay tracks. |

---


### `ThemeScrollbarScope`
Scope — which scrollable containers the overlay tracks. This decides *where*
the scrollbar appears, not how it looks, so it is its own group rather than
part of `appearance`.

| Member | Type | Description |
| ------ | ---- | ----------- |
| `exclude` (optional) | `string[] \| null` | Skip these containers when tracking. |
| `include` (optional) | `string[] \| null` | Scope the overlay to these containers (document is always tracked). |

---

## Related docs

- [Families & Modes](/core-concepts) — A selection is a family (which palette) plus a mode (light/dark/system); every framework exposes the same read/write surface for it.
- [Theme Discovery & Overrides](/advanced-features) — A provider exposes exactly the themes it was given — grouped by family, with variants and resolved tokens — and accepts an explicit one-shot themeOverride that outranks a saved selection.
- [Runtime](/architecture) — One runtime per app owns the store, selection, registry, history, lifecycle and adapters; every framework binding is a thin view over it.
- [ThemeScope](/scoped-theme) — Apply a different family/mode (or a local theme definition) to a subtree, with scoped CSS variables and pre-paint support.
- [Persistence](/persistence) — Persist the selection across reloads and requests, with fingerprint validation, storage adapters and theme migrations.
- [Theme generation](/theme-studio) — Generate a complete, accessible light/dark theme pair from a single seed color, ready to drop into the runtime.
- [Plugins](/plugins) — Extend the runtime through a first-class plugin manager and adapter registry; theme packs install ready-made behaviour.
- [Custom scrollbar](/custom-scrollbar) — Themed overlay scrollbars that match the active theme and pre-paint before hydration.
- [DevTools](/devtools) — Inspect and drive the live runtime from a panel: adapters, history, snapshots and performance entries.
- [React](/framework-guides/react) — the framework integration
