## @themvora/vue
Themvora Vue integration.

Provides the `ThemeProvider`, `ThemeScope`, `ThemeScrollbar` and
`ThemeInspector` components, the `provideThemeRuntime` helper, the
`ThemeScheduleController`, the `useTheme*` composables, and the SSR
bootstrap-script helper.

> Generated from `packages/vue/src` by `apps/docs/scripts/generate-api-reference.mjs`. Do not edit by hand — run `pnpm --filter @themvora/docs api:generate`.

## Functions

### `createVueThemeBootstrapScript<T extends ThemeDefinition<string>>(options): string`
Build the blocking zero-flash `<head>` script for a Vue app (SSR or SPA).

Inlines core's `createThemeBootstrapScript` with the Vue defaults
(`storageKey: "theme-selection"`, `prefix: "theme-"` — the same values the
Vue `ThemeProvider` persistence and CSS variables use), so the persisted
theme is applied before first paint. Emit the returned string as a
blocking `<script>` inside `<head>`.

**See also:** ``buildThemeCssMap``

| Parameter | Type | Description |
| --------- | ---- | ----------- |
| `options` | `ThemeBootstrapScriptOptions<T>` | — |

**Returns** `string`

---


### `provideThemeRuntime<T extends ThemeDefinition<string>>(runtime): void`
Provides a Themvora runtime to the current Vue component subtree.

Call inside a component's `setup` scope (typically the app root) so
descendant composables can resolve it via useThemeRuntime.

**See also:** `useThemeRuntime`, `ThemeProvider`

| Parameter | Type | Description |
| --------- | ---- | ----------- |
| `runtime` | `ThemeRuntime<T>` | The runtime to make available to the subtree. |

**Returns** `void`

---


### `useEffectiveThemeMode(): Ref<"light" | "dark">`
Reactive ref of the mode actually **applied** — `"light"` or `"dark"`, never
`"system"`.

Render this when a control states the current appearance. useThemeMode
reports what the visitor asked for, which does not move at a sunrise/sunset
transition and stays `"system"` for as long as that choice stands — so a label
bound to it kept announcing the old mode while the page changed colour.

Call inside Vue `setup` scope within a `<ThemeProvider>`. Subscribes to the
appearance (store and effective-selection channels) and is cleaned up on
unmount.

**See also:** `useThemeMode`, `useThemeSchedule`

**Returns** `Ref<"light" | "dark">` — A `Ref` holding the applied mode.

---


### `useGeneratedTheme<T extends ThemeDefinition<string>>(): Ref<T>`
Reactive ref of the theme produced by `generateTheme()` and registered with
the provider.

Resolves the registered theme that carries the generator's origin marker
(`meta.generation.kind === "generated"`); shipped presets never qualify. When
both halves of one `generateTheme()` call are registered, the ref tracks the
theme the active selection resolves to and updates on selection changes.

Call inside a Vue `setup` scope within a `<ThemeProvider>`.

Throws `ThemeError` with code `TV_GENERATION_THEME_NOT_FOUND` when the provider
holds no generated theme, and `TV_GENERATION_THEME_AMBIGUOUS` when several are
registered and the active selection does not identify one.

Re-resolves on every settled change to the registry, store, or selection; if
the generated theme is later removed, the same error is raised at the next
reactive read rather than a stale theme being returned.

**See also:** `useThemeValue`

**Returns** `Ref<T>` — A `Ref` holding the registered generated theme.

---


### `useProvidedThemes<T extends ThemeDefinition<string>>(): Ref<readonly ProvidedThemeFamily<T>[], readonly ProvidedThemeFamily<T>[]>`
Reactive ref of the themes this provider was given, grouped by family.

Returns exactly the collection supplied to the nearest `<ThemeProvider>` —
not the built-in catalog, and not every theme in the project. The ref updates
when the provider's `themes` prop changes, when a theme pack is installed, or
when the registry is mutated, and it is cleaned up on unmount.

```vue
<script setup>
const families = useProvidedThemes();
</script>

<template>
  <section v-for="family in families" :key="family.id">
    <h3>{{ family.name }}</h3>
    <button v-for="variant in family.variants" :key="variant.name">
      {{ variant.mode }}
    </button>
  </section>
</template>
```

**See also:** `useTheme`

**Returns** `Ref<readonly ProvidedThemeFamily<T>[], readonly ProvidedThemeFamily<T>[]>` — A ref holding the provider's theme families, in supplied order.

---


### `useTheme<T extends ThemeDefinition<string>>(): { effectiveMode: Ref<"light" | "dark", "light" | "dark">; family: Ref<string, string>; mode: Ref<ThemeMode, ThemeMode>; setFamily: __type(nextFamily: string): void; setMode: __type(nextMode: ThemeMode): void; theme: Ref<T, T>; toggleTheme: __type(): void }`
Reactive access to the active theme, mode, and family plus selection
controls.

Call inside Vue `setup` scope within a `<ThemeProvider>`. Returns reactive
refs for `theme`, `mode`, and `family`, along with `setMode`, `setFamily`,
and `toggleTheme` helpers that operate on the runtime's selection.

**See also:** `useThemeValue`, `useThemeMode`, `useEffectiveThemeMode`, `useThemeFamily`

**Returns** `{ effectiveMode: Ref<"light" | "dark", "light" | "dark">; family: Ref<string, string>; mode: Ref<ThemeMode, ThemeMode>; setFamily: __type(nextFamily: string): void; setMode: __type(nextMode: ThemeMode): void; theme: Ref<T, T>; toggleTheme: __type(): void }` — An object of reactive state and selection helpers.

```ts
const { theme, mode, family, setMode, toggleTheme } = useTheme();
```

---


### `useThemeBatch(): __type(callback: __type(): void): void`
Returns a function that batches multiple runtime mutations into a single
history entry and notification.

Call inside Vue `setup` scope within a `<ThemeProvider>`.

**See also:** `useThemeSnapshot`, `useTheme`

**Returns** `__type(callback: __type(): void): void` — A batch function taking a callback to run inside the batch.

---


### `useThemeFamily(): Ref<string, string>`
Reactive ref of the current theme family.

Call inside Vue `setup` scope within a `<ThemeProvider>`. The returned ref
tracks both store and selection changes and is cleaned up on unmount.

**See also:** `useThemeMode`, `useTheme`

**Returns** `Ref<string, string>` — A `Ref` holding the current theme family.

---


### `useThemeHistory<T extends ThemeDefinition<string>>(): { canRedo: Ref<boolean, boolean>; canUndo: Ref<boolean, boolean>; clear: __type(): void; history: Ref<readonly { theme: UnwrapRef; timestamp: number }[], readonly HistoryEntry<T>[] | readonly { theme: UnwrapRef; timestamp: number }[]>; jump: __type(index: number): void; redo: __type(): void; undo: __type(): void }`
Reactive access to the runtime's theme history (undo/redo).

Call inside Vue `setup` scope within a `<ThemeProvider>`. Returns reactive
`canUndo`, `canRedo`, and `history` refs plus `undo`, `redo`, `clear`, and
`jump` actions that operate on the runtime's history.

**See also:** `useThemeSnapshot`, `useThemeRestore`, `useThemeBatch`

**Returns** `{ canRedo: Ref<boolean, boolean>; canUndo: Ref<boolean, boolean>; clear: __type(): void; history: Ref<readonly { theme: UnwrapRef; timestamp: number }[], readonly HistoryEntry<T>[] | readonly { theme: UnwrapRef; timestamp: number }[]>; jump: __type(index: number): void; redo: __type(): void; undo: __type(): void }` — An object of reactive history state and actions.

---


### `useThemeLifecycle(): { on: __type(event: keyof ThemeLifecycleEventMap<ThemeDefinition<string>>, listener: __type(data: unknown): void): __type(): void }`
Returns an object for subscribing to runtime lifecycle events.

Call inside Vue `setup` scope within a `<ThemeProvider>`.

**See also:** `useThemeRuntime`, `useTheme`

**Returns** `{ on: __type(event: keyof ThemeLifecycleEventMap<ThemeDefinition<string>>, listener: __type(data: unknown): void): __type(): void }` — An object with an `on` method to register a lifecycle listener.

---


### `useThemeMode(): Ref<ThemeMode, ThemeMode>`
Reactive ref of the current theme mode (`system`, `light`, or `dark`).

Call inside Vue `setup` scope within a `<ThemeProvider>`. The returned ref
tracks both store and selection changes and is cleaned up on unmount.

**See also:** `useThemeFamily`, `useTheme`

**Returns** `Ref<ThemeMode, ThemeMode>` — A `Ref` holding the current mode.

---


### `useThemePacks(): __type(pack: ThemePack<any>): void`
Returns a function that installs a theme pack onto the runtime.

Call inside Vue `setup` scope within a `<ThemeProvider>`.

**See also:** `useThemeRuntime`, `useTheme`

**Returns** `__type(pack: ThemePack<any>): void` — A function taking a theme pack to install.

---


### `useThemeRestore(): __type(snapshot: ThemeRuntimeSnapshot<ThemeDefinition<string>>): void`
Returns a function that restores the runtime to a previously captured
snapshot.

Call inside Vue `setup` scope within a `<ThemeProvider>`.

**See also:** `useThemeSnapshot`

**Returns** `__type(snapshot: ThemeRuntimeSnapshot<ThemeDefinition<string>>): void` — A function taking a snapshot to restore.

---


### `useThemeRuntime<T extends ThemeDefinition<string>>(): ThemeRuntime<T>`
Resolves the active Themvora runtime from the Vue injection context.

Call inside Vue `setup` scope, within a component that is a descendant of a
`<ThemeProvider>` (or after provideThemeRuntime).

**See also:** `provideThemeRuntime`, `ThemeProvider`, `useThemeValue`

**Returns** `ThemeRuntime<T>` — The injected runtime.

```ts
const runtime = useThemeRuntime();
runtime.selection.setMode("dark");
```

---


### `useThemeSchedule<T extends ThemeDefinition<string>>(): ThemeScheduleController`
Reactive access to the runtime's sunrise/sunset scheduling controller.

Requires the runtime (or `<ThemeProvider>`) to be created with the
`scheduled` option. The returned `state` ref tracks `enabled`, `status`,
`active`, `sunrise`/`sunset` and the next transition; `enable()`/`disable()`
/`set()` control the engine.

```vue
<script setup lang="ts">
const schedule = useThemeSchedule();
</script>
```

**Returns** `ThemeScheduleController`

---


### `useThemeSnapshot(): __type(): ThemeRuntimeSnapshot<ThemeDefinition<string>>`
Returns a function that captures a serializable snapshot of the runtime's
current state.

Call inside Vue `setup` scope within a `<ThemeProvider>`.

**See also:** `useThemeRestore`

**Returns** `__type(): ThemeRuntimeSnapshot<ThemeDefinition<string>>` — A function returning the current runtime snapshot.

---


### `useThemeTokens<T extends ThemeDefinition<string>>(): Ref<ThemeTokens | undefined, ThemeTokens | undefined>`
Reactive ref of the active theme's token group.

Call inside Vue `setup` scope within a `<ThemeProvider>`. The returned ref
updates as the active theme changes and is cleaned up on unmount.

**See also:** `useThemeValue`

**Returns** `Ref<ThemeTokens | undefined, ThemeTokens | undefined>` — A `Ref` holding the active theme's tokens, or `undefined` when the
  theme defines none.

---


### `useThemeValue<T extends ThemeDefinition<string>>(): Ref<T, T>`
Reactive ref of the currently selected theme definition.

Call inside Vue `setup` scope within a `<ThemeProvider>`. The returned ref
updates whenever the active theme changes and is cleaned up on unmount.

**See also:** `useTheme`, `useThemeTokens`

**Returns** `Ref<T, T>` — A `Ref` holding the active theme.

---

## Interfaces

### `ThemeInspectorProps`
Props accepted by the Vue `<ThemeInspector>` component.

| Member | Type | Description |
| ------ | ---- | ----------- |
| `bottom` (optional) | `number` | Distance from the bottom of the viewport, in px. Default 104. |
| `right` (optional) | `number` | Distance from the right edge of the viewport, in px. Default 32. |
| `size` (optional) | `number` | Toggle button size, in px. Default 40. |
| `zIndex` (optional) | `number` | Z-index for the floating toggle and panel. Default 9999. |

---


### `ThemeProviderProps<T extends ThemeDefinition>`

**Extends** `ThemeRuntimeOptions<T>`
Props accepted by the Vue `<ThemeProvider>` component.

Extends ThemeRuntimeOptions with an optional pre-built runtime. When
`runtime` is omitted, the provider creates and owns its own runtime from the
remaining props and destroys it on unmount.

| Member | Type | Description |
| ------ | ---- | ----------- |
| `adapters` (optional) | `ThemeAdapter<T>[]` | Library adapters installed when the runtime is created. The runtime owns the registry and notifies every adapter whenever the theme changes; it never knows anything about the libraries themselves. |
| `broadcast` (optional) | `ThemeSelectionBroadcastAdapter \| null` | Cross-tab broadcast adapter. When omitted, a `BroadcastChannel`-based adapter on channel `"theme-selection"` is created; pass `null` to disable cross-tab sync. |
| `cssVariables` (optional) | `false \| CSSVariablesOptions` | CSS-variable binding configuration. `false` disables the binding. |
| `defaultTheme` (optional) | `ThemeIdentifier<T>` | Theme to activate when no persisted or explicit selection exists. Accepts a **variant** name (`"cocoa-dark"`) or a **family** name (`"cocoa"`); a family resolves to the variant the mode contract picks (see resolveThemeReference). A variant also supplies its own mode unless `initialMode` is given. |
| `dom` (optional) | `false \| DOMBindingOptions` | DOM attribute/class binding configuration. `false` disables the binding. |
| `initial` (optional) | `InitialThemeResolution<T>` | Explicit initial theme resolution, bypassing default + persistence based resolution. |
| `initialFamily` (optional) | `ThemeIdentifier<T>` | Initial family used when nothing else is given. A **variant** name is also accepted and normalised to its family; the variant's own mode is used only when initialMode is absent, so an explicit mode always wins and the two props cannot silently disagree. |
| `initialMode` (optional) | `ThemeMode` | Initial mode used when nothing else is given. |
| `persistence` (optional) | `ThemeSelectionPersistenceAdapter \| null` | Persistence adapter for the theme selection. Pass `null` to disable persistence entirely. |
| `plugins` (optional) | `ThemePlugin<T>[]` | Runtime plugins installed at creation. |
| `prefix` (optional) | `string` | CSS custom property prefix used by the CSS-variables binding. |
| `readPersistenceOnInit` (optional) | `boolean` | Whether a persisted selection is read at runtime creation. |
| `runtime` (optional) | `ThemeRuntime<T>` | An existing runtime to provide. When omitted, the provider creates and owns a runtime from the other props. |
| `scheduled` (optional) | `false \| ScheduledThemeOptions<T>` | Sunrise/sunset scheduling configuration. `false` disables scheduling. |
| `storageKey` (optional) | `string` | The `localStorage` key the default persistence adapter reads and writes. |
| `themeOverride` (optional) | `ThemeOverride<ThemeIdentifier<T>>` | An explicit theme to apply, outranking a saved selection. Unlike defaultTheme, which is only a fallback, an override is applied even when `localStorage` or a cookie already names another theme — which is what makes "preview this theme" expressible as a prop. It is a one-shot signal, not a controlled selection: it is applied when its value changes, it is never re-asserted on later renders, and it does not write to persistence. See ThemeOverride. |
| `themes` (optional) | `readonly T[]` | Initial theme definitions. Duplicate names are dropped (first wins). When omitted, the registry starts empty. |
| `transition` (optional) | `boolean \| ThemeTransitionOptions` | Transition configuration. `true` enables transitions with defaults, `false` disables them, and an object provides explicit options. |
| `view` (optional) | `Window` | The `window` to bind to. Defaults to the global `window` when available; omit (or pass `undefined`) in SSR environments. |

---


### `ThemeScheduleController`
Controller returned by useThemeSchedule for the runtime's
sunrise/sunset scheduling engine.

**See also:** `useThemeRuntime`

| Member | Type | Description |
| ------ | ---- | ----------- |
| `disable` | `__type(): void` | Disables the schedule engine. |
| `enable` | `__type(): void` | Enables the schedule engine. |
| `schedule` | `ThemeSchedule \| null` | The underlying controller (`null` when the provider has no `scheduled` option). Methods below are safe no-ops in that case. |
| `set` | `__type(options: ThemeScheduleSetOptions): void` | Updates the schedule configuration. |
| `state` | `Ref<ThemeScheduleState>` | Reactive state snapshot: `enabled`, `active`, `status`, `sunrise`, `sunset`, `nextTransition`, `nextActivation`, `nextDeactivation`. |

---


### `ThemeScopeProps`
Props accepted by the Vue `<ThemeScope>` component.

| Member | Type | Description |
| ------ | ---- | ----------- |
| `family` (optional) | `string` | Theme family for the scoped subtree. Without `mode`, follows the provider's current mode. |
| `mode` (optional) | `ThemeMode` | Mode for a family-based scope. Defaults to the provider's current mode. |
| `theme` (optional) | `string` | Exact theme name or family name. When `family`/`mode` are also set, `theme` wins. Omit to follow the provider's selection inside a boundary. |
| `themes` (optional) | `readonly ThemeDefinition<string>[]` | Local theme definitions — resolved first, parent registry falls back. No second runtime is created. |
| `transition` (optional) | `boolean \| ThemeTransitionOptions` | Transition for this scope. `undefined` inherits the provider's, `false` disables it, an object is merged over the provider config. |

---


### `ThemeScrollbarProps`

**Extends** `ScrollbarGroupedOptions`
Props accepted by the Vue `<ThemeScrollbar>` component.

Extends OverlayScrollbarOptions with an optional custom element tag.

| Member | Type | Description |
| ------ | ---- | ----------- |
| `appearance` (optional) | `ScrollbarAppearanceOptions` | — |
| `behavior` (optional) | `ScrollbarBehaviorOptions` | — |
| `icons` (optional) | `ScrollbarIconOptions<string>` | Arrow button icons: the arrow entry covers all four directions (per-direction entries win), plus the shared glyph size in CSS px. |
| `scope` (optional) | `ScrollbarScopeOptions` | — |
| `tag` (optional) | `string` | The element tag to apply the overlay scrollbar to. Defaults to the provider's scroll container. |

---

## Variables

### `ThemeInspector`
Vue component that renders the framework-agnostic Theme Inspector.

Renders a `<themvora-inspector>` custom element (defined on mount) that
shows a floating toggle opening a panel inspecting the active theme —
identity, selection, tokens, and resolved CSS variables. Can be registered
globally via `app.use(ThemeInspector)`.

**See also:** `ThemeInspectorProps`, `useTheme`

`ComponentPublicInstanceConstructor<CreateComponentPublicInstanceWithMixins<ToResolvedProps<ExtractPropTypes<{ bottom: { default: undefined; required: false; type: NumberConstructor }; right: { default: undefined; required: false; type: NumberConstructor }; size: { default: undefined; required: false; type: NumberConstructor }; zIndex: { default: undefined; required: false; type: NumberConstructor } }>, object>, __type(): VNode<RendererNode, RendererElement, { [key: string]: any }>, object, object, object, ComponentOptionsMixin, ComponentOptionsMixin, object, PublicProps, { bottom: number; right: number; size: number; zIndex: number }, true, object, object, GlobalComponents, GlobalDirectives, string, object, any, ComponentProvideOptions, OptionTypesType<object, object, object, object, object, object>, Readonly<ExtractPropTypes<{ bottom: { default: undefined; required: false; type: NumberConstructor }; right: { default: undefined; required: false; type: NumberConstructor }; size: { default: undefined; required: false; type: NumberConstructor }; zIndex: { default: undefined; required: false; type: NumberConstructor } }>> & Readonly<object>, __type(): VNode<RendererNode, RendererElement, { [key: string]: any }>, object, object, object, { bottom: number; right: number; size: number; zIndex: number }>, any, any, any, ComputedOptions, MethodOptions> & ComponentOptionsBase<ToResolvedProps<ExtractPropTypes<{ bottom: { default: undefined; required: false; type: NumberConstructor }; right: { default: undefined; required: false; type: NumberConstructor }; size: { default: undefined; required: false; type: NumberConstructor }; zIndex: { default: undefined; required: false; type: NumberConstructor } }>, object>, __type(): VNode<RendererNode, RendererElement, { [key: string]: any }>, object, object, object, ComponentOptionsMixin, ComponentOptionsMixin, object, string, { bottom: number; right: number; size: number; zIndex: number }, object, string, object, GlobalComponents, GlobalDirectives, string, ComponentProvideOptions> & VNodeProps & AllowedComponentProps & ComponentCustomProps & { install: void }`

---


### `ThemeProvider`
Vue component that provides a Themvora runtime to its subtree and applies
the active theme to the DOM.

Renders only its default slot (no wrapper element). When no `runtime` prop
is given, it creates and owns a runtime from the other props, injects a
blocking zero-flash bootstrap script, and binds DOM/CSS variables on mount.
The owned runtime is destroyed on unmount. Can be registered globally via
`app.use(ThemeProvider)`.

**See also:** `ThemeProviderProps`, `useThemeRuntime`, `ThemeScope`

`ComponentPublicInstanceConstructor<CreateComponentPublicInstanceWithMixins<ToResolvedProps<{ broadcast?: any; cssVariables?: false | CSSVariablesOptions; defaultTheme?: string; dom?: false | DOMBindingOptions; initialFamily?: string; initialMode?: ThemeMode; persistence?: any; readPersistenceOnInit?: boolean; runtime?: ThemeRuntime<any>; scheduled?: false | ScheduledThemeOptions<ThemeDefinition<string>>; themeOverride?: ThemeOverride<string>; themes?: ThemeDefinition<string>[]; transition?: boolean | ThemeTransitionOptions; view?: Window }, object>, __type(): VNode<RendererNode, RendererElement, { [key: string]: any }>[] | undefined, object, object, object, ComponentOptionsMixin, ComponentOptionsMixin, object, PublicProps, { cssVariables: boolean | Record<string, any>; dom: boolean | Record<string, any>; initial: Record<string, any>; readPersistenceOnInit: boolean; runtime: Record<string, any>; scheduled: boolean | Record<string, any>; themeOverride: string | Record<string, any>; transition: boolean | Record<string, any> }, true, object, object, GlobalComponents, GlobalDirectives, string, object, any, ComponentProvideOptions, OptionTypesType<object, object, object, object, object, object>, Readonly<{ broadcast?: any; cssVariables?: false | CSSVariablesOptions; defaultTheme?: string; dom?: false | DOMBindingOptions; initialFamily?: string; initialMode?: ThemeMode; persistence?: any; readPersistenceOnInit?: boolean; runtime?: ThemeRuntime<any>; scheduled?: false | ScheduledThemeOptions<ThemeDefinition<string>>; themeOverride?: ThemeOverride<string>; themes?: ThemeDefinition<string>[]; transition?: boolean | ThemeTransitionOptions; view?: Window }> & Readonly<object>, __type(): VNode<RendererNode, RendererElement, { [key: string]: any }>[] | undefined, object, object, object, { cssVariables: boolean | Record<string, any>; dom: boolean | Record<string, any>; initial: Record<string, any>; readPersistenceOnInit: boolean; runtime: Record<string, any>; scheduled: boolean | Record<string, any>; themeOverride: string | Record<string, any>; transition: boolean | Record<string, any> }>, any, any, any, ComputedOptions, MethodOptions> & ComponentOptionsBase<ToResolvedProps<{ broadcast?: any; cssVariables?: false | CSSVariablesOptions; defaultTheme?: string; dom?: false | DOMBindingOptions; initialFamily?: string; initialMode?: ThemeMode; persistence?: any; readPersistenceOnInit?: boolean; runtime?: ThemeRuntime<any>; scheduled?: false | ScheduledThemeOptions<ThemeDefinition<string>>; themeOverride?: ThemeOverride<string>; themes?: ThemeDefinition<string>[]; transition?: boolean | ThemeTransitionOptions; view?: Window }, object>, __type(): VNode<RendererNode, RendererElement, { [key: string]: any }>[] | undefined, object, object, object, ComponentOptionsMixin, ComponentOptionsMixin, object, string, { cssVariables: boolean | Record<string, any>; dom: boolean | Record<string, any>; initial: Record<string, any>; readPersistenceOnInit: boolean; runtime: Record<string, any>; scheduled: boolean | Record<string, any>; themeOverride: string | Record<string, any>; transition: boolean | Record<string, any> }, object, string, object, GlobalComponents, GlobalDirectives, string, ComponentProvideOptions> & VNodeProps & AllowedComponentProps & ComponentCustomProps & { install: void }`

---


### `ThemeScope`
Vue component that applies a scoped theme to its subtree.

Renders a `div` wrapper carrying a `data-v-tv-scope` attribute and applies
the resolved theme's CSS variables to that element, overriding the
provider's selection for the subtree. Supports an exact theme, a theme
family, local theme definitions, and per-scope transitions. Can be
registered globally via `app.use(ThemeScope)`.

**See also:** `ThemeScopeProps`, `useTheme`

`ComponentPublicInstanceConstructor<CreateComponentPublicInstanceWithMixins<ToResolvedProps<ExtractPropTypes<{ family: { default: undefined; required: false; type: StringConstructor }; mode: { default: undefined; required: false; type: PropType<ThemeMode> }; theme: { default: undefined; required: false; type: StringConstructor }; themes: { default: undefined; required: false; type: PropType<readonly ThemeDefinition<string>[]> }; transition: { default: undefined; type: PropType<boolean | ThemeTransitionOptions> } }>, object>, __type(): VNode<RendererNode, RendererElement, { [key: string]: any }>, object, object, object, ComponentOptionsMixin, ComponentOptionsMixin, object, PublicProps, { family: string; mode: ThemeMode; theme: string; themes: readonly ThemeDefinition<string>[]; transition: boolean | ThemeTransitionOptions }, true, object, any, GlobalComponents, GlobalDirectives, string, object, any, ComponentProvideOptions, OptionTypesType<object, object, object, object, object, object>, Readonly<ExtractPropTypes<{ family: { default: undefined; required: false; type: StringConstructor }; mode: { default: undefined; required: false; type: PropType<ThemeMode> }; theme: { default: undefined; required: false; type: StringConstructor }; themes: { default: undefined; required: false; type: PropType<readonly ThemeDefinition<...>[]> }; transition: { default: undefined; type: PropType<boolean | ThemeTransitionOptions> } }>> & Readonly<object>, __type(): VNode<RendererNode, RendererElement, { [key: string]: any }>, object, object, object, { family: string; mode: ThemeMode; theme: string; themes: readonly ThemeDefinition<string>[]; transition: boolean | ThemeTransitionOptions }>, any, any, any, ComputedOptions, MethodOptions> & ComponentOptionsBase<ToResolvedProps<ExtractPropTypes<{ family: { default: undefined; required: false; type: StringConstructor }; mode: { default: undefined; required: false; type: PropType<ThemeMode> }; theme: { default: undefined; required: false; type: StringConstructor }; themes: { default: undefined; required: false; type: PropType<readonly ThemeDefinition<string>[]> }; transition: { default: undefined; type: PropType<boolean | ThemeTransitionOptions> } }>, object>, __type(): VNode<RendererNode, RendererElement, { [key: string]: any }>, object, object, object, ComponentOptionsMixin, ComponentOptionsMixin, object, string, { family: string; mode: ThemeMode; theme: string; themes: readonly ThemeDefinition<string>[]; transition: boolean | ThemeTransitionOptions }, object, string, any, GlobalComponents, GlobalDirectives, string, ComponentProvideOptions> & VNodeProps & AllowedComponentProps & ComponentCustomProps & { install: void }`

---


### `ThemeScrollbar`
Vue component that replaces the native scrollbar with a themed overlay
scrollbar.

Renders nothing (returns `null`) and instead installs an overlay scrollbar
on the target element (see ThemeScrollbarProps.tag) once mounted.
Injects the pre-paint hiding CSS synchronously during `setup` so the native
bar never flashes. Can be registered globally via `app.use(ThemeScrollbar)`.

**See also:** `ThemeScrollbarProps`, `ThemeProvider`

`ComponentPublicInstanceConstructor<CreateComponentPublicInstanceWithMixins<ToResolvedProps<{ appearance?: ScrollbarAppearanceOptions; behavior?: ScrollbarBehaviorOptions; icons?: ScrollbarIconOptions<string>; scope?: ScrollbarScopeOptions; tag?: string }, object>, __type(): null, object, object, object, ComponentOptionsMixin, ComponentOptionsMixin, object, PublicProps, { appearance: Record<string, any>; behavior: Record<string, any>; icons: Record<string, any>; scope: Record<string, any> }, true, object, object, GlobalComponents, GlobalDirectives, string, object, any, ComponentProvideOptions, OptionTypesType<object, object, object, object, object, object>, Readonly<{ appearance?: ScrollbarAppearanceOptions; behavior?: ScrollbarBehaviorOptions; icons?: ScrollbarIconOptions<string>; scope?: ScrollbarScopeOptions; tag?: string }> & Readonly<object>, __type(): null, object, object, object, { appearance: Record<string, any>; behavior: Record<string, any>; icons: Record<string, any>; scope: Record<string, any> }>, any, any, any, ComputedOptions, MethodOptions> & ComponentOptionsBase<ToResolvedProps<{ appearance?: ScrollbarAppearanceOptions; behavior?: ScrollbarBehaviorOptions; icons?: ScrollbarIconOptions<string>; scope?: ScrollbarScopeOptions; tag?: string }, object>, __type(): null, object, object, object, ComponentOptionsMixin, ComponentOptionsMixin, object, string, { appearance: Record<string, any>; behavior: Record<string, any>; icons: Record<string, any>; scope: Record<string, any> }, object, string, object, GlobalComponents, GlobalDirectives, string, ComponentProvideOptions> & VNodeProps & AllowedComponentProps & ComponentCustomProps & { install: void }`

---


### `ThemeSymbol`
Vue `InjectionKey` used to provide and inject the active Themvora runtime.

**See also:** `provideThemeRuntime`, `useThemeRuntime`

`InjectionKey<ThemeRuntime<any>>`

---

## Related docs

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
- [Vue 3](/framework-guides/vue) — the framework integration
