## @themvora/svelte
Themvora Svelte integration.

Provides the module-level runtime holder (`setThemeRuntime` /
`getThemeRuntime`), the `useTheme*` hooks, the `ThemeProvider`,
`ThemeScope`, `ThemeScrollbar`, and `ThemeInspector` components, the
`themeInspector` action, the schedule accessors, and the SSR
bootstrap-script helper.

> Generated from `packages/svelte/src` by `apps/docs/scripts/generate-api-reference.mjs`. Do not edit by hand — run `pnpm --filter @themvora/docs api:generate`.

## Functions

### `createSvelteThemeBootstrapScript<T extends ThemeDefinition<string>>(options): string`
Build the blocking zero-flash `<head>` script for a Svelte app (SSR or SPA).

Inlines core's `createThemeBootstrapScript` with the Svelte defaults
(`storageKey: "theme-selection"`, `prefix: "theme-"` — the same values the
Svelte `ThemeProvider` persistence and CSS variables use), so the persisted
theme is applied before first paint. Emit the returned string as a
blocking `<script>` inside `<head>` (e.g. a `<svelte:head>` slot).

| Parameter | Type | Description |
| --------- | ---- | ----------- |
| `options` | `ThemeBootstrapScriptOptions<T>` | — |

**Returns** `string`

---


### `getThemeRuntime<T extends ThemeDefinition<string>>(): ThemeRuntime<T>`
Reads the runtime the nearest `ThemeProvider` installed.

**Returns** `ThemeRuntime<T>`

---


### `getThemeSchedule<T extends ThemeDefinition<string>>(): ThemeSchedule | null`
Direct access to the runtime's sunrise/sunset scheduling controller.
Returns `null` when the provider was created without the `scheduled` option.

```svelte
const schedule = getThemeSchedule();
schedule?.enable();
schedule?.disable();
```

**See also:** `useThemeRuntime`

**Returns** `ThemeSchedule | null`

---


### `pickOptions(props?): OverlayScrollbarOptions`
Narrows a `ThemeScrollbarProps` object to the overlay-engine options.

Defined values are copied one key at a time and `undefined` keys are dropped
entirely, so an explicitly-undefined prop cannot override an engine default.
The result is a fresh object; `props` is never mutated.

| Parameter | Type | Description |
| --------- | ---- | ----------- |
| `props` | `ThemeScrollbarProps` (optional) | The component's props. Omit or pass `undefined` for an empty options object. |

**Returns** `OverlayScrollbarOptions` — A new `OverlayScrollbarOptions` containing only the keys that were
  defined on `props`.

---


### `setThemeRuntime<T extends ThemeDefinition<string>>(runtime): void`
Sets the active Themvora runtime in the current Svelte component context.

This is the low-level holder used by `ThemeProvider` to expose the runtime
to descendant components. It must be called during component initialization
(or a `$:` reactive block) so the runtime is available to any `useTheme*`
hook in the subtree. Prefer using `ThemeProvider` over calling this
directly.

**See also:** `getThemeRuntime`

| Parameter | Type | Description |
| --------- | ---- | ----------- |
| `runtime` | `ThemeRuntime<T>` | The runtime to expose to the current component and its descendants. |

**Returns** `void`

---


### `themeInspector(node, props): { destroy: void; update: void }`
Svelte action that mounts a `<themvora-inspector>` custom element into the
target node. Use in any `.svelte` file:

```svelte
<div use:themeInspector={{ bottom: 80, right: 24, size: 36, zIndex: 50 }} />
```

**See also:** `ThemvoraInspector`

| Parameter | Type | Description |
| --------- | ---- | ----------- |
| `node` | `HTMLElement` | — |
| `props` | `ThemeInspectorProps` | — |

**Returns** `{ destroy: void; update: void }`

---


### `useGeneratedTheme<T extends ThemeDefinition<string>>(): { value: void; subscribe: void }`
Reactive access to the theme produced by `generateTheme()` and registered
with the provider, as a readable Svelte store.

Resolves the registered theme that carries the generator's origin marker
(`meta.generation.kind === "generated"`); shipped presets never qualify. When
both halves of one `generateTheme()` call are registered, the store tracks the
theme the active selection resolves to.

Must be called during component initialization inside a `ThemeProvider`
subtree.

Throws `ThemeError` with code `TV_GENERATION_THEME_NOT_FOUND` when the provider
holds no generated theme, and `TV_GENERATION_THEME_AMBIGUOUS` when several are
registered and the active selection does not identify one.

Re-resolves on every settled change to the registry, store, or selection. If
the generated theme is later removed, the store's value is cleared (the theme
is no longer readable) rather than retaining a stale one; Svelte's store
contract has no read-time getter, so a fresh subscription to a removed theme
throws.

**See also:** `useThemeValue`

**Returns** `{ value: void; subscribe: void }` — A readable store whose value is the registered generated theme.

---


### `useTheme<T extends ThemeDefinition<string>>(): { family: { value: void; subscribe: void }; mode: { value: void; subscribe: void }; setFamily: __type(nextFamily: string): void; setMode: __type(nextMode: ThemeMode): void; theme: { value: void; subscribe: void }; toggleTheme: __type(): void }`
Reactive access to the full theme selection state as readable Svelte stores
plus imperative selection controls.

Returns `theme`, `mode` and `family` readable stores together with
`setMode`, `setFamily` and `toggleTheme` helpers. Must be called during
component initialization inside a `ThemeProvider` subtree.

**See also:** `useThemeRuntime`

**Returns** `{ family: { value: void; subscribe: void }; mode: { value: void; subscribe: void }; setFamily: __type(nextFamily: string): void; setMode: __type(nextMode: ThemeMode): void; theme: { value: void; subscribe: void }; toggleTheme: __type(): void }` — An object of reactive stores and selection helpers.

```ts
<script>
  const { theme, mode, family, setMode, toggleTheme } = useTheme();
</script>

<p>{$theme.name} / {$mode}</p>
<button onclick={() => toggleTheme()}>Toggle</button>
```

---


### `useThemeBatch(): __type(callback: __type(): void): void`
Returns a function that batches multiple selection changes into a single
runtime update.

Must be called during component initialization inside a `ThemeProvider`
subtree.

**See also:** `useThemeRuntime`, `useTheme`

**Returns** `__type(callback: __type(): void): void` — A function that runs the given callback inside a runtime batch.

---


### `useThemeFamily(): { value: void; subscribe: void }`
Reactive access to the current theme family as a readable Svelte store.

Must be called during component initialization inside a `ThemeProvider`
subtree.

**See also:** `useThemeRuntime`, `useTheme`

**Returns** `{ value: void; subscribe: void }` — A readable store whose value is the current theme family name.

---


### `useThemeHistory<T extends ThemeDefinition<string>>(): { canRedo: { value: void; subscribe: void }; canUndo: { value: void; subscribe: void }; clear: __type(): void; history: { value: void; subscribe: void }; jump: __type(index: number): void; redo: __type(): void; undo: __type(): void }`
Reactive access to the theme selection history as readable Svelte stores
plus imperative navigation controls.

Returns `canUndo`, `canRedo` and `history` readable stores together with
`undo`, `redo`, `clear` and `jump` helpers. Must be called during component
initialization inside a `ThemeProvider` subtree.

**See also:** `useThemeRuntime`, `useTheme`

**Returns** `{ canRedo: { value: void; subscribe: void }; canUndo: { value: void; subscribe: void }; clear: __type(): void; history: { value: void; subscribe: void }; jump: __type(index: number): void; redo: __type(): void; undo: __type(): void }` — An object of reactive history stores and navigation helpers.

---


### `useThemeLifecycle(): { on: __type(event: keyof ThemeLifecycleEventMap<ThemeDefinition<string>>, listener: __type(data: unknown): void): __type(): void }`
Returns a function to subscribe to runtime lifecycle events.

Must be called during component initialization inside a `ThemeProvider`
subtree.

**See also:** `useThemeRuntime`, `useTheme`

**Returns** `{ on: __type(event: keyof ThemeLifecycleEventMap<ThemeDefinition<string>>, listener: __type(data: unknown): void): __type(): void }` — An object with an `on` method that registers a lifecycle listener.

---


### `useThemeMode(): { value: void; subscribe: void }`
Reactive access to the current theme mode (light/dark/system) as a readable
Svelte store.

Must be called during component initialization inside a `ThemeProvider`
subtree.

**See also:** `useThemeRuntime`, `useTheme`

**Returns** `{ value: void; subscribe: void }` — A readable store whose value is the current theme mode.

---


### `useThemePacks(): __type(pack: ThemePack<any>): void`
Returns a function that installs a theme pack onto the runtime.

Must be called during component initialization inside a `ThemeProvider`
subtree.

**See also:** `useThemeRuntime`, `useTheme`

**Returns** `__type(pack: ThemePack<any>): void` — A function that applies the given ThemePack to the runtime.

---


### `useThemeRestore(): __type(snapshot: ThemeRuntimeSnapshot): void`
Returns a function that restores a previously captured runtime snapshot.

Must be called during component initialization inside a `ThemeProvider`
subtree.

**See also:** `useThemeSnapshot`, `useThemeRuntime`

**Returns** `__type(snapshot: ThemeRuntimeSnapshot): void` — A function that restores the given snapshot into the runtime.

---


### `useThemeRuntime<T extends ThemeDefinition<string>>(): ThemeRuntime<T>`
Returns the active Themvora runtime as a plain object.

Unlike the other `useTheme*` hooks this returns the raw runtime (not a
store) and is not reactive. Must be called during component initialization
inside a `ThemeProvider` subtree.

**See also:** `getThemeRuntime`

**Returns** `ThemeRuntime<T>` — The runtime provided by the nearest ancestor `ThemeProvider`.

---


### `useThemeSchedule<T extends ThemeDefinition<string>>(): { value: void; subscribe: void } | null`
Reactive sunrise/sunset schedule state as a readable Svelte store. Returns
`null` when the provider has no `scheduled` option configured. The emitted
value tracks `enabled`, `active`, `status`, `sunrise`/`sunset` and the next
transition.

```svelte
const schedule = useThemeSchedule(); // `$schedule.enabled` …
```

**See also:** `useThemeRuntime`

**Returns** `{ value: void; subscribe: void } | null`

---


### `useThemeSnapshot(): __type(): ThemeRuntimeSnapshot<ThemeDefinition<string>>`
Returns a function that captures the current runtime state as a snapshot.

Must be called during component initialization inside a `ThemeProvider`
subtree.

**See also:** `useThemeRestore`, `useThemeRuntime`

**Returns** `__type(): ThemeRuntimeSnapshot<ThemeDefinition<string>>` — A function that returns a ThemeRuntimeSnapshot of the
  current runtime state.

---


### `useThemeTokens<T extends ThemeDefinition<string>>(): { value: void; subscribe: void }`
Reactive access to the active theme's token group as a readable Svelte
store.

The store emits the resolved tokens whenever the selection changes. Must be
called during component initialization inside a `ThemeProvider` subtree.

**See also:** `useThemeRuntime`, `useTheme`

**Returns** `{ value: void; subscribe: void }` — A readable store whose value is the active theme's tokens.

---


### `useThemeValue<T extends ThemeDefinition<string>>(): { value: void; subscribe: void }`
Reactive access to the currently selected theme as a readable Svelte store.

The store emits the full resolved theme whenever the selection changes.
Must be called during component initialization inside a `ThemeProvider`
subtree.

**See also:** `useThemeRuntime`, `useTheme`

**Returns** `{ value: void; subscribe: void }` — A readable store whose value is the active theme.

---

## Interfaces

### `ThemeInspectorProps`
Props accepted by the Svelte `themeInspector` action.

Configures the floating `<themvora-inspector>` custom element mounted into
the target node.

| Member | Type | Description |
| ------ | ---- | ----------- |
| `bottom` (optional) | `number` | Distance from the bottom of the viewport, in px. Default 104. |
| `right` (optional) | `number` | Distance from the right edge of the viewport, in px. Default 32. |
| `size` (optional) | `number` | Toggle button size, in px. Default 40. |
| `zIndex` (optional) | `number` | Z-index for the floating toggle and panel. Default 9999. |

---


### `ThemeProviderProps<T extends ThemeDefinition>`

**Extends** `ThemeRuntimeOptions<T>`
Props accepted by the Svelte `ThemeProvider` component.

Extends the core runtime options (themes, default theme, initial mode and
family, persistence, transition, scheduling, DOM/CSS binding options). When
`runtime` is omitted the provider creates and owns a runtime from the
remaining options; when supplied, the provider adopts the given runtime and
does not destroy it on unmount.

| Member | Type | Description |
| ------ | ---- | ----------- |
| `adapters` (optional) | `ThemeAdapter<T>[]` | Library adapters installed when the runtime is created. The runtime owns the registry and notifies every adapter whenever the theme changes; it never knows anything about the libraries themselves. |
| `broadcast` (optional) | `ThemeSelectionBroadcastAdapter \| null` | Cross-tab broadcast adapter. When omitted, a `BroadcastChannel`-based adapter on channel `"theme-selection"` is created; pass `null` to disable cross-tab sync. |
| `children` (optional) | `Snippet<[]>` | The Svelte snippet rendered inside the provider. Must be provided as a snippet (Svelte 5 `{@snippet}`) so it is instantiated after the runtime context is set. |
| `cssVariables` (optional) | `false \| CSSVariablesOptions` | CSS-variable binding configuration. `false` disables the binding. |
| `defaultTheme` (optional) | `T["name"]` | Theme name to activate when no persisted or explicit selection exists. |
| `dom` (optional) | `false \| DOMBindingOptions` | DOM attribute/class binding configuration. `false` disables the binding. |
| `initial` (optional) | `InitialThemeResolution<T>` | Explicit initial theme resolution, bypassing default + persistence based resolution. |
| `initialFamily` (optional) | `string` | Initial family used when nothing else is given. |
| `initialMode` (optional) | `ThemeMode` | Initial mode used when nothing else is given. |
| `persistence` (optional) | `ThemeSelectionPersistenceAdapter \| null` | Persistence adapter for the theme selection. Pass `null` to disable persistence entirely. |
| `plugins` (optional) | `ThemePlugin<T>[]` | Runtime plugins installed at creation. |
| `readPersistenceOnInit` (optional) | `boolean` | Whether a persisted selection is read at runtime creation. |
| `runtime` (optional) | `ThemeRuntime<T>` | A runtime owned by the caller. When provided, the provider does not create or destroy it. When omitted, the provider creates its own runtime from the other props and destroys it on unmount. |
| `scheduled` (optional) | `false \| ScheduledThemeOptions<T>` | Sunrise/sunset scheduling configuration. `false` disables scheduling. |
| `themes` (optional) | `readonly T[]` | Initial theme definitions. Duplicate names are dropped (first wins). When omitted, the registry starts empty. |
| `transition` (optional) | `boolean \| ThemeTransitionOptions` | Transition configuration. `true` enables transitions with defaults, `false` disables them, and an object provides explicit options. |
| `view` (optional) | `Window` | The `window` to bind to. Defaults to the global `window` when available; omit (or pass `undefined`) in SSR environments. |

---


### `ThemeScopeProps`
Props accepted by the Svelte `ThemeScope` component.

Applies a scoped theme to a subtree without changing the provider's global
selection. `theme`/`family`/`mode` are read at mount; family-based and
boundary scopes keep following the provider's light/dark/system mode while
mounted.

| Member | Type | Description |
| ------ | ---- | ----------- |
| `children` | `Snippet<[]>` | The Svelte snippet rendered inside the scoped wrapper. |
| `className` (optional) | `string` | CSS class applied to the wrapper `div` created for the scope. |
| `family` (optional) | `string` | Theme family for the scoped subtree. When `mode` is omitted the scope follows the provider's current mode (light/dark/system). |
| `mode` (optional) | `ThemeMode` | Mode for a family-based scope. Optional — defaults to the provider's current mode so `family="plum"` flips light/dark with the page. |
| `theme` (optional) | `string` | Exact theme name, family name, or a `{ family, mode }`-style object. When `family`/`mode` are also passed, `theme` wins (it's the explicit selection). Omit to follow the global selection inside a new boundary. |
| `themes` (optional) | `readonly ThemeDefinition<string>[]` | Local theme definitions for genuinely isolated components. Resolved FIRST (they shadow same-named parent themes), then the provider's registry falls back — no second runtime is created. |
| `transition` (optional) | `boolean \| ThemeTransitionOptions` | Transition for this scope's own theme changes. `undefined` inherits the `<ThemeProvider/>` transition, `false` disables it, `true` inherits, and an object is merged over the provider's config (local keys win). |

---


### `ThemeScrollbarProps`

**Extends** `ScrollbarGroupedOptions`
Props accepted by the Svelte `ThemeScrollbar` component.

Extends the core overlay scrollbar options to configure the overlay engine
(auto-hide, thickness, colors, axes, touch, direction, and so on). The
component renders nothing itself; it only creates and tears down the overlay
engine.

Lives in its own module so `theme-scrollbar.svelte` can import it without
importing the barrel — a component that imported `index.ts` would create a
cycle, since the barrel exports the component.

| Member | Type | Description |
| ------ | ---- | ----------- |
| `appearance` (optional) | `ScrollbarAppearanceOptions` | — |
| `behavior` (optional) | `ScrollbarBehaviorOptions` | — |
| `icons` (optional) | `ScrollbarIconOptions<string>` | Arrow button icons: the arrow entry covers all four directions (per-direction entries win), plus the shared glyph size in CSS px. |
| `scope` (optional) | `ScrollbarScopeOptions` | — |

---

## Variables

### `ThemeKey`
Context key the provider installs the runtime under.

Kept in its own module so the `.svelte` components can read the runtime
without importing the barrel — a component that imported `index.ts` would
create a cycle, since the barrel exports the component.

`typeof ThemeKey`

---


### `ThemeProvider`
The Themvora provider component (Svelte 5 runes: `$props` + `$effect`).

Compiled from `theme-provider.svelte` by `scripts/compile-svelte.mjs`. A
changed configuration prop is forwarded to the shared `runtime.configure()`
contract, so the UI updates without a reload. The two compiled variants are
picked at runtime, so an SSR bundle never runs the client component.

**See also:** `ThemeScope`

`Component<ThemeProviderProps<ThemeDefinition>>`

---


### `ThemeScope`
The scoped theming component (Svelte 5 runes).

Compiled from `theme-scope.svelte`. A changed `theme`/`family`/`mode`/
`themes`/`transition` re-resolves the scope without a remount.

**See also:** `ThemeProvider`

`Component<ThemeScopeProps>`

---


### `ThemeScrollbar`
The overlay scrollbar component. See ThemeScrollbarProps.

Compiled from `theme-scrollbar.svelte` by `scripts/compile-svelte.mjs` — a
runes component, so `$effect` re-runs when an option changes and the overlay
is rebuilt with the new value. A plain function component in this `.ts`
module could not do that: Svelte never re-runs one, so a changed prop was
ignored until the page was reloaded.

The two compiled variants are picked at runtime, so an SSR bundle never runs
the client component (and vice versa).

**See also:** `ThemeProvider`

`Component<ThemeScrollbarProps>`

---

## Related docs

- [Families & Modes](/core-concepts) — A selection is a family (which palette) plus a mode (light/dark/system); every framework exposes the same read/write surface for it.
- [Runtime](/architecture) — One runtime per app owns the store, selection, registry, history, lifecycle and adapters; every framework binding is a thin view over it.
- [ThemeScope](/scoped-theme) — Apply a different family/mode (or a local theme definition) to a subtree, with scoped CSS variables and pre-paint support.
- [Persistence](/persistence) — Persist the selection across reloads and requests, with fingerprint validation, storage adapters and theme migrations.
- [Scheduling](/advanced-features) — Switch family/mode on a time-of-day schedule, with an explicit binding between the schedule state and the runtime selection.
- [Plugins](/plugins) — Extend the runtime through a first-class plugin manager and adapter registry; theme packs install ready-made behaviour.
- [Zero-flash bootstrap](/zero-flash) — Paint the correct theme on the first frame: a blocking script plus server-resolved initial state, with a Vite plugin for SPA builds.
- [Custom scrollbar](/custom-scrollbar) — Themed overlay scrollbars that match the active theme and pre-paint before hydration.
- [DevTools](/devtools) — Inspect and drive the live runtime from a panel: adapters, history, snapshots and performance entries.
- [Svelte 5](/framework-guides/svelte) — the framework integration
