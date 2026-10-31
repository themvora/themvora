## @themvora/angular
Themvora Angular integration.

Provides the DI tokens (`THEME_RUNTIME`, `THEME_SCOPED_RUNTIME`),
the `provideTheme` / `provideThemeRuntime` providers, the
`injectTheme*` injection functions, the `ThemeScopeDirective`,
`ThemeScrollbarDirective`, and `ThemeInspectorComponent`, plus the
persistence and blocking-script (zero-flash) helpers.

> Generated from `packages/angular/src` by `apps/docs/scripts/generate-api-reference.mjs`. Do not edit by hand — run `pnpm --filter @themvora/docs api:generate`.

## Functions

### `buildThemeCSSMap(themes): ThemeCSSMap`
Builds a ThemeCSSMap of flattened CSS variables from a list of
themes.

Selects the light and dark themes of the first theme family and flattens
their tokens into CSS variables. Falls back to the first light/dark theme, or
the first theme, when a mode is not present.

**See also:** `createBlockingScriptContent`

| Parameter | Type | Description |
| --------- | ---- | ----------- |
| `themes` | `readonly ThemeDefinition<string>[]` | The theme definitions to build the map from. |

**Returns** `ThemeCSSMap` — A ThemeCSSMap with light and dark CSS variables.

---


### `createAngularPersistence(): ThemeSelectionPersistenceAdapter`
Creates an Angular-aware theme selection persistence adapter.

May be called from an Angular injection context. The adapter reads and
writes the theme selection (mode and theme family) to `localStorage` in the
browser and to `TransferState` on the server, so the selection survives
server-side rendering and is hydrated on the client. It also subscribes to
cross-tab `storage` events.

**See also:** `provideTheme`

**Returns** `ThemeSelectionPersistenceAdapter` — A `ThemeSelectionPersistenceAdapter` bound to the current platform.

---


### `createBlockingScriptContent<T extends ThemeDefinition<string>>(themes, savedSelection?, options): string`
Generates the blocking bootstrap HTML (a critical CSS `<style>` and a
blocking `<script>`) that applies the theme before first paint.

The script sets the theme mode and family attributes and toggles the `dark`
class. The critical `<style>` carries the CSS variables: a plain `:root` rule
when the resolved mode is concrete, or — when it is `"system"` — a
`prefers-color-scheme` block per scheme, so an OS-dark visitor is correct
with no JavaScript at all. The saved selection (from persistence) is honored
when provided.

**See also:** `buildThemeCSSMap`, `BlockingScriptOptions`

| Parameter | Type | Description |
| --------- | ---- | ----------- |
| `themes` | `readonly T[]` | The theme definitions to emit CSS variables for. |
| `savedSelection` | `{ family: string; mode: ThemeMode } \| null` (optional) | The persisted mode and theme family, if any. |
| `options` | `BlockingScriptOptions<T>` | Fallback mode/family inputs. Must match the client runtime's `initialMode`/`defaultTheme` so the two resolve the same theme. |

**Returns** `string` — An HTML string containing the critical style and blocking script.

---


### `injectEffectiveThemeMode(): Signal<"light" | "dark">`
Injects the mode actually **applied** — `"light"` or `"dark"`, never
`"system"` — as a read-only signal.

The narrow form of injectTheme: use it in a component that only
displays the current appearance, so it re-renders for an OS change or a
sunrise/sunset transition and not for anything else.

May be called from an Angular injection context.

**See also:** `injectTheme`, `ThemeState.resolvedMode`

**Returns** `Signal<"light" | "dark">` — A read-only `Signal<"light" | "dark">`.

```ts
const mode = injectEffectiveThemeMode();
// template: <span>{{ mode() }}</span>
```

---


### `injectGeneratedTheme<T extends ThemeDefinition<string>>(): Signal<T>`
Injects the theme produced by `generateTheme()` and registered with the
provider, as a read-only signal.

Resolves the registered theme that carries the generator's origin marker
(`meta.generation.kind === "generated"`); shipped presets never qualify. When
both halves of one `generateTheme()` call are registered, the signal tracks
the theme the active selection resolves to, and unsubscribes automatically
when the injector is destroyed.

May be called from an Angular injection context.

Throws `ThemeError` with code `TV_GENERATION_THEME_NOT_FOUND` when the provider
holds no generated theme, and `TV_GENERATION_THEME_AMBIGUOUS` when several are
registered and the active selection does not identify one.

Re-resolves on every settled change to the registry, store, or selection; if
the generated theme is later removed, the same error is raised at the next
reactive read rather than a stale theme being returned.

**See also:** `injectTheme`

**Returns** `Signal<T>` — A read-only `Signal<T>` holding the registered generated theme.

```ts
const generated = injectGeneratedTheme();
effect(() => console.log(generated().name));
```

---


### `injectProvidedThemes<T extends ThemeDefinition<string>>(): Signal<readonly ProvidedThemeFamily<T>[]>`
Injects the themes this provider was given, grouped by family.

Returns exactly the collection supplied to `provideTheme` — not the built-in
catalog. The signal updates when a theme pack is installed or the registry is
mutated, and unsubscribes automatically when the injector is destroyed.

```ts
const families = injectProvidedThemes();
effect(() => console.log(families().map((f) => f.family)));
```

**See also:** `injectTheme`

**Returns** `Signal<readonly ProvidedThemeFamily<T>[]>` — A read-only `Signal` holding the provider's theme families.

---


### `injectTheme<T extends ThemeDefinition<string>>(): Signal<ThemeState<T>>`
Injects a reactive ThemeState signal for the active runtime.

May be called from an Angular injection context. Returns a read-only signal
that updates whenever the active theme changes, and unsubscribes
automatically when the injector is destroyed.

**See also:** `injectThemeRuntime`, `ThemeState`

**Returns** `Signal<ThemeState<T>>` — A read-only `Signal<ThemeState<T>>`.

```ts
const state = injectTheme();
effect(() => console.log(state().mode));
```

---


### `injectThemeBatch(): __type(callback: __type(): void): void`
Injects a batch function that groups multiple selection changes into a
single history entry and notification.

May be called from an Angular injection context.

**See also:** `injectTheme`

**Returns** `__type(callback: __type(): void): void` — A function that runs the given callback inside a runtime batch.

---


### `injectThemeHistory<T extends ThemeDefinition<string>>(): { clear: __type(): void; history: Signal<ThemeHistoryState>; redo: __type(): void; undo: __type(): void }`
Injects the runtime's history state and controls.

May be called from an Angular injection context. Returns a read-only signal
of ThemeHistoryState plus `undo`, `redo`, and `clear` actions. The
signal updates on every theme change and unsubscribes automatically when the
injector is destroyed.

**See also:** `injectThemeTimeTravel`, `injectThemeBatch`

**Returns** `{ clear: __type(): void; history: Signal<ThemeHistoryState>; redo: __type(): void; undo: __type(): void }` — An object with a `history` signal and `undo`/`redo`/`clear` actions.

---


### `injectThemeLifecycle(): { on: __type(event: keyof ThemeLifecycleEventMap<ThemeDefinition<string>>, listener: __type(data: unknown): void): __type(): void }`
Injects the runtime's lifecycle event emitter.

May be called from an Angular injection context.

**See also:** `injectThemeRuntime`, `injectTheme`

**Returns** `{ on: __type(event: keyof ThemeLifecycleEventMap<ThemeDefinition<string>>, listener: __type(data: unknown): void): __type(): void }` — An object with an `on` method that subscribes to lifecycle events.

---


### `injectThemePacks(): __type(pack: ThemePack<any>): void`
Injects a function that applies a theme pack to the runtime.

May be called from an Angular injection context.

**See also:** `injectThemeRuntime`, `injectTheme`

**Returns** `__type(pack: ThemePack<any>): void` — A function that applies the given theme pack to the runtime.

---


### `injectThemeRestore(): __type(snapshot: ThemeRuntimeSnapshot): void`
Injects a function that restores a previously captured runtime snapshot.

May be called from an Angular injection context.

**See also:** `injectThemeSnapshot`

**Returns** `__type(snapshot: ThemeRuntimeSnapshot): void` — A function that restores the given snapshot into the runtime.

---


### `injectThemeRuntime<T extends ThemeDefinition<string>>(): ThemeRuntime<T>`
Injects the active Themvora runtime.

May be called from an Angular injection context. Resolves the scoped runtime
when inside a ThemeScopeDirective, otherwise the environment runtime
provided by provideTheme. Throws if no runtime is provided.

**See also:** `provideTheme`, `injectTheme`

**Returns** `ThemeRuntime<T>` — The active ThemeRuntime.

---


### `injectThemeSchedule<T extends ThemeDefinition<string>>(): ThemeScheduleController | null`
Reactive access to the runtime's sunrise/sunset scheduling controller.
Returns `null` when the runtime was provided without the `scheduled` option.

```ts
const schedule = injectThemeSchedule();
schedule?.enable();
schedule?.disable();
schedule?.state().nextTransition;
```

**See also:** `ThemeScheduleController`

**Returns** `ThemeScheduleController | null`

---


### `injectThemeSnapshot(): __type(): ThemeRuntimeSnapshot<ThemeDefinition<string>>`
Injects a function that captures a snapshot of the current runtime state.

May be called from an Angular injection context.

**See also:** `injectThemeRestore`

**Returns** `__type(): ThemeRuntimeSnapshot<ThemeDefinition<string>>` — A function returning a `ThemeRuntimeSnapshot` of the current state.

---


### `injectThemeTimeTravel<T extends ThemeDefinition<string>>(): { history: Signal<readonly HistoryEntry<T>[]>; jump: __type(index: number): void }`
Injects the runtime's history timeline and a jump action for time travel.

May be called from an Angular injection context. Returns a read-only signal
of the full history entries plus a `jump` action that restores a given
history index. The signal updates on every theme change and unsubscribes
automatically when the injector is destroyed.

**See also:** `injectThemeHistory`

**Returns** `{ history: Signal<readonly HistoryEntry<T>[]>; jump: __type(index: number): void }` — An object with a `history` signal and a `jump` action.

---


### `provideTheme<T extends ThemeDefinition<string>>(options): EnvironmentProviders`
Provides a Themvora runtime for the current Angular environment injector.

Call this once at the application root (or a feature environment) to create
the runtime, wire up Angular persistence, and register environment
initializers that bind the runtime to the DOM and CSS variables in the
browser and emit the blocking bootstrap script during server-side rendering.

May be called from an Angular injection context. Returns an
`EnvironmentProviders` value intended for the `providers` array of a
standalone component, route, or `bootstrapApplication`.

**See also:** `provideThemeRuntime`, `injectThemeRuntime`, `ThemeProviderOptions`

| Parameter | Type | Description |
| --------- | ---- | ----------- |
| `options` | `ThemeProviderOptions<T>` | Runtime configuration and the optional DOM binding target. |

**Returns** `EnvironmentProviders` — An `EnvironmentProviders` value that provides the runtime.

```ts
import { provideTheme } from "@themvora/angular";
import { getBuiltInThemes } from "@themvora/core";

bootstrapApplication(AppComponent, {
  providers: [
    provideTheme({ themes: getBuiltInThemes(), defaultTheme: "light" }),
  ],
});
```

---


### `provideThemeRuntime(runtime): EnvironmentProviders`
Provides an existing Themvora runtime for the current Angular environment
injector.

Use this when you already have a runtime instance (for example, created
outside Angular or shared across environments) and want to expose it through
the THEME_RUNTIME token. Unlike provideTheme, it does
not create bindings or persistence.

May be called from an Angular injection context. Returns an
`EnvironmentProviders` value intended for the `providers` array.

**See also:** `provideTheme`, `injectThemeRuntime`

| Parameter | Type | Description |
| --------- | ---- | ----------- |
| `runtime` | `ThemeRuntime<ThemeDefinition<string>>` | The runtime instance to provide. |

**Returns** `EnvironmentProviders` — An `EnvironmentProviders` value that provides the runtime.

---

## Classes

### `class ThemeInspectorComponent`
Angular wrapper component around the Themvora web inspector.

Renders a `<themvora-inspector>` custom element and forwards the `bottom`,
`right`, `size`, `zIndex`, `class`, and `style` inputs to it. The inspector
element is defined on initialization.

**See also:** `injectTheme`, `ThemeScopeDirective`, `ThemeScrollbarDirective`

| Member | Type | Description |
| ------ | ---- | ----------- |
| `constructor` | `ThemeInspectorComponent` | — |
| `bottom` (optional) | `number` | Distance from the bottom of the viewport, in px. |
| `class` (optional) | `string` | CSS classes forwarded to the <themvora-inspector> element. |
| `right` (optional) | `number` | Distance from the right edge of the viewport, in px. |
| `size` (optional) | `number` | Toggle button size (width and height), in px. |
| `style` (optional) | `string` | Inline styles forwarded to the <themvora-inspector> element. |
| `zIndex` (optional) | `number` | Z-index for the floating toggle and panel. |
| `ngOnInit` | `void` | — |

---


### `class ThemeScopeDirective`
Applies a named theme to a single element, overriding the environment
runtime for that element's subtree.

Use the `themvoraScope` attribute with a theme name to scope the theme to
the host element. The optional `themvoraScopeTransition` input configures
the transition used when the scoped theme is applied. The binding is
destroyed automatically when the directive is destroyed.

**See also:** `THEME_SCOPED_RUNTIME`, `ThemeScrollbarDirective`, `injectThemeRuntime`

| Member | Type | Description |
| ------ | ---- | ----------- |
| `constructor` | `ThemeScopeDirective` | — |
| `themeName` | `string` | Theme name to scope to (`[themvoraScope]="'plum-dark'"`). Empty string disables the scope. |
| `transition` (optional) | `ThemeTransitionOptions` | Transition override for scoped theme changes. Inherits the runtime's transition when omitted. |
| `ngOnChanges` | `void` | — |
| `ngOnDestroy` | `void` | — |

The scoped theme overrides the environment theme for the element and its
descendants. When the named theme is not found, no binding is created and
the environment theme remains in effect.

Reactive to its inputs: a changed `themvoraScope` re-resolves the bound
element, and a changed `themvoraScopeTransition` updates the transition —
both without recreating the binding.

---


### `class ThemeScrollbarDirective`
Phase 2 — ThemeScrollbarDirective: overlay only.

Creates the custom scrollbar overlay. Does NOT hide the native
scrollbar — that's the bootstrap script's job (Phase 1, tv-scrollbar).

```html
<div themvoraScrollbar [themvoraScrollbarOptions]="{ thickness: 8 }"></div>
```

**See also:** `ThemeScopeDirective`, `ThemeInspectorComponent`, `injectThemeRuntime`

| Member | Type | Description |
| ------ | ---- | ----------- |
| `constructor` | `ThemeScrollbarDirective` | — |
| readonly `options` | `InputSignal<ScrollbarGroupedOptions & { icons?: ScrollbarIconOptions<string> }>` | Overlay scrollbar options passed to the engine (`[themvoraScrollbarOptions]="{ thickness: 8 }"`). |
| `ngOnDestroy` | `void` | — |

---

## Interfaces

### `BlockingScriptOptions<T extends ThemeDefinition>`
Fallback inputs for createBlockingScriptContent.

These must match the options the client runtime is created with. The script
and the runtime each resolve the initial mode independently, so a value given
to one and not the other makes the script paint one theme and the runtime
correct it — a visible flash of the wrong theme.

| Member | Type | Description |
| ------ | ---- | ----------- |
| `defaultTheme` (optional) | `ThemeIdentifier<T>` | Theme name the fallback family and mode are derived from. Should match the `defaultTheme` given to `provideTheme`. Accepts a theme **name** (`"cocoa-light"`) or a **family** (`"cocoa"`). |
| `mode` (optional) | `ThemeMode` | Fallback mode used when no selection is persisted. |
| `themeOverride` (optional) | `ThemeOverride<ThemeIdentifier<T>>` | An explicit theme override, resolved against `themes` and applied over any persisted selection. Should match the `themeOverride` given to `provideTheme`. Without it the script paints the saved theme and the runtime corrects it on boot — the flash the override exists to avoid. |

---


### `ThemeCSSMap`
A map of flattened CSS variables for the light and dark themes.

Each entry maps a CSS variable name (for example `--theme-color-primary`) to
its concrete value for that mode.

**See also:** `buildThemeCSSMap`

| Member | Type | Description |
| ------ | ---- | ----------- |
| `dark` | `Record<string, string>` | CSS variables for the dark theme. |
| `light` | `Record<string, string>` | CSS variables for the light theme. |

---


### `ThemeHistoryState`
Reactive state describing whether the runtime history can undo or redo.

**See also:** `injectThemeHistory`

| Member | Type | Description |
| ------ | ---- | ----------- |
| `canRedo` | `boolean` | Whether a redo is currently possible. |
| `canUndo` | `boolean` | Whether an undo is currently possible. |

---


### `ThemeScheduleController`
Controller for the runtime's sunrise/sunset scheduling.

Exposes a reactive signal of the schedule state plus `enable`, `disable`,
and `set` actions.

**See also:** `injectThemeSchedule`

| Member | Type | Description |
| ------ | ---- | ----------- |
| `disable` | `__type(): void` | Turn the schedule off. Leaves the current theme untouched. |
| `enable` | `__type(): void` | Turn the schedule on. Applies the correct light/dark theme immediately. |
| `set` | `__type(options: ThemeScheduleSetOptions): void` | Reposition (latitude/longitude), reconfigure, or toggle enabled state. |
| `state` | `Signal<ThemeScheduleState>` | Reactive `Signal` of the schedule state: `enabled`, `active`, `status`, `sunrise`, `sunset`, `nextTransition`, `nextActivation`, `nextDeactivation`. |

---


### `ThemeState<T extends ThemeDefinition>`
Reactive state describing the current theme selection.

Exposes the active theme, the current mode and theme family, the resolved
light/dark mode, and callbacks to change the selection.

**See also:** `injectTheme`

| Member | Type | Description |
| ------ | ---- | ----------- |
| `family` | `string` | The current theme family name. |
| `mode` | `ThemeMode` | The current theme mode: `"light"`, `"dark"`, or `"system"`. |
| `resolvedMode` | `"light" \| "dark"` | The mode actually applied — `"light"` or `"dark"`, never `"system"`. Differs from mode while an automatic driver decides the appearance: `mode` is the visitor's request and stays `"system"` (or on the mode they picked) through a sunrise/sunset transition, while this moves with the page. Render this in a label that states the current appearance. |
| `setFamily` | `__type(family: string): void` | Sets the theme family. |
| `setMode` | `__type(mode: ThemeMode): void` | Sets the theme mode. |
| `theme` | `T` | The currently active theme definition. |
| `toggleTheme` | `__type(): void` | Toggles between light and dark mode. |

---

## Type Aliases

### `ThemeProviderOptions<T extends ThemeDefinition>`
Options for provideTheme.

Extends the core runtime options with an optional DOM target element. When
omitted, the runtime is bound to `document.documentElement`.

**See also:** `provideTheme`

`ThemeRuntimeOptions<T> & { target?: HTMLElement }`

---

## Variables

### `THEME_RUNTIME`
Angular dependency-injection token that provides the active Themvora
runtime.

The runtime is created by provideTheme (or supplied directly via
provideThemeRuntime) and is scoped to the environment injector
where it is provided. Inject it to access the runtime's store, selection,
history, lifecycle, and scheduling APIs.

**See also:** `THEME_SCOPED_RUNTIME`, `provideTheme`

`InjectionToken<ThemeRuntime<ThemeDefinition<string>>>`

---


### `THEME_SCOPED_RUNTIME`
Angular dependency-injection token that provides a runtime scoped to a
nested theme scope.

When a ThemeScopeDirective is active, this token resolves to the
scoped runtime for that element; otherwise it is absent and consumers fall
back to THEME_RUNTIME. Inject it to read the runtime that
applies to the current element's scope.

**See also:** `THEME_RUNTIME`, `ThemeScopeDirective`

`InjectionToken<ThemeRuntime<ThemeDefinition<string>>>`

---

## Related docs

- [Tokens](/tokens) — Semantic token groups are the contract between a theme and the DOM: they flatten to CSS variables, never to hardcoded colors.
- [Families & Modes](/core-concepts) — A selection is a family (which palette) plus a mode (light/dark/system); every framework exposes the same read/write surface for it.
- [Theme Discovery & Overrides](/advanced-features) — A provider exposes exactly the themes it was given — grouped by family, with variants and resolved tokens — and accepts an explicit one-shot themeOverride that outranks a saved selection.
- [Runtime](/architecture) — One runtime per app owns the store, selection, registry, history, lifecycle and adapters; every framework binding is a thin view over it.
- [ThemeScope](/scoped-theme) — Apply a different family/mode (or a local theme definition) to a subtree, with scoped CSS variables and pre-paint support.
- [Persistence](/persistence) — Persist the selection across reloads and requests, with fingerprint validation, storage adapters and theme migrations.
- [Theme generation](/theme-studio) — Generate a complete, accessible light/dark theme pair from a single seed color, ready to drop into the runtime.
- [Plugins](/plugins) — Extend the runtime through a first-class plugin manager and adapter registry; theme packs install ready-made behaviour.
- [Zero-flash bootstrap](/zero-flash) — Paint the correct theme on the first frame: a blocking script plus server-resolved initial state, with a Vite plugin for SPA builds.
- [Custom scrollbar](/custom-scrollbar) — Themed overlay scrollbars that match the active theme and pre-paint before hydration.
- [DevTools](/devtools) — Inspect and drive the live runtime from a panel: adapters, history, snapshots and performance entries.
- [Angular](/framework-guides/angular) — the framework integration
