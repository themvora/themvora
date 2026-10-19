## @themvora/remix
Themvora Remix integration.

Provides the SSR-safe `ThemeProvider`, the `ThemeHead` blocking script
for zero-flash bootstrapping, and the cookie-backed
`createRemixThemePersistence`, plus the React `ThemeScope`,
`ThemeScrollbar`, and `ThemeInspector` re-exports.

> Generated from `packages/remix/src` by `apps/docs/scripts/generate-api-reference.mjs`. Do not edit by hand — run `pnpm --filter @themvora/docs api:generate`.

## Functions

### `createRemixThemePersistence(themes?, defaultTheme?, options): ThemeSelectionPersistenceAdapter | null`
Creates the client-side persistence adapter for Remix. Mirrors the theme
selection to `localStorage` (cross-tab sync, offline) AND to the theme
cookies (`theme-family` / `theme-mode` / `theme-fingerprint`) so the server
resolves the exact same state on the next request.

**See also:** `ThemeProvider`, `ThemeHead`

| Parameter | Type | Description |
| --------- | ---- | ----------- |
| `themes` | `readonly ThemeDefinition<string>[]` (optional) | The theme registry used to compute the config fingerprint. |
| `defaultTheme` | `string` (optional) | Fallback theme name used in the fingerprint. |
| `options` | `RemixThemePersistenceOptions` | Persistence options (see RemixThemePersistenceOptions). |

**Returns** `ThemeSelectionPersistenceAdapter | null` — A persistence adapter, or `null` when running outside the browser.

Returns `null` during SSR (no `window`), so the runtime falls back to its
default persistence behavior on the server. The cookie contract matches
`@themvora/next` and `@themvora/nuxt`.

```ts
import { createRemixThemePersistence } from "@themvora/remix";

const persistence = createRemixThemePersistence(myThemes, "light", {
  key: "my-theme-selection",
});
```

---


### `ThemeHead<T extends ThemeDefinition<string>>(props): Element`
Renders the blocking theme bootstrap in the document `<head>`. Emits an
inline script that reads the persisted theme cookies and applies the CSS
variables plus DOM effects before first paint (zero-flash), plus a
`prefers-color-scheme` dark-mode fallback when the selection is `"system"`.

**See also:** `ThemeProvider`, `ThemeHeadProps`

| Parameter | Type | Description |
| --------- | ---- | ----------- |
| `props` | `ThemeHeadProps<T>` | The head props (see ThemeHeadProps). |

**Returns** `Element` — A fragment containing the blocking `<script>` and optional dark-mode `<style>`.

Place this inside the document `<head>` so the script runs before the app
stylesheets and the browser paints already themed. Pair with
`ThemeProvider` and `getInitialThemeState` for the full SSR-first setup.

```ts
// app/root.tsx
import { ThemeHead } from "@themvora/remix";

export function Layout({ children }) {
  return (
    // `tv-scrollbar` must be rendered here, not added by a script.
    <html className="tv-scrollbar">
      <head>
        <ThemeHead themes={myThemes} defaultTheme="light" scrollbar />
      </head>
      <body>{children}</body>
    </html>
  );
}
```

---


### `ThemeInspector(__namedParameters?): Element`
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


### `ThemeProvider<T extends ThemeDefinition<string>>(props): Element`
Remix theme provider. Mounts the client theme runtime, wires the cookie
persistence adapter, and — when an SSR-resolved `initial` state is supplied —
mirrors the selection back to cookies so the server resolves the same state
on the next request (zero-flash).

**See also:** `ThemeHead`, `createRemixThemePersistence`, `ThemeProviderProps`

| Parameter | Type | Description |
| --------- | ---- | ----------- |
| `props` | `ThemeProviderProps<T>` | The provider props (see ThemeProviderProps). |

**Returns** `Element` — The provider tree wrapping the application content.

Pair with `ThemeHead` in the document `<head>` and `getInitialThemeState` in
the loader for the full SSR-first, zero-flash setup. When `initial` is
omitted, the persisted selection is read on the client from `localStorage`
and then from the theme cookies `ThemeHead`'s script reads — see
ThemeProviderProps.initial for the hydration caveat.

```ts
import { ThemeProvider } from "@themvora/remix";

export default function App({ children }) {
  return (
    <ThemeProvider defaultTheme="light" themes={myThemes}>
      {children}
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


### `useTheme<T extends ThemeDefinition<string>>(): { family: string; mode: ThemeMode; setFamily: __type(family: ThemeFamilies<readonly T[]>): void; setMode: __type(mode: ModesOf<T>): void; theme: T; toggleTheme: __type(): void }`
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

**See also:** `useThemeValue`, `useThemeMode`, `useThemeFamily`

**Returns** `{ family: string; mode: ThemeMode; setFamily: __type(family: ThemeFamilies<readonly T[]>): void; setMode: __type(mode: ModesOf<T>): void; theme: T; toggleTheme: __type(): void }`

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

**See also:** `useSetThemeMode`

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

### `RemixThemePersistenceOptions`
Options for createRemixThemePersistence. Configures the storage key,
the backing `Storage` object, and the cookie attributes used when mirroring
the selection to cookies.

**See also:** `createRemixThemePersistence`

| Member | Type | Description |
| ------ | ---- | ----------- |
| `cookieOptions` (optional) | `string` | Cookie attribute string appended to the mirrored theme cookies (e.g. `"path=/; max-age=31536000; samesite=lax"`). Defaults to `"path=/; max-age=31536000; samesite=lax"`. |
| `key` (optional) | `string` | The `localStorage` key holding the persisted selection. Default `"theme-selection"`. |
| `storage` (optional) | `Storage` | The backing storage. Defaults to `window.localStorage`. |

---


### `ThemeHeadProps<T extends ThemeDefinition>`
Props for the Remix `ThemeHead` component. Describes the theme registry and
the fallback selection used to build the blocking bootstrap script and the
dark-mode CSS fallback.

**See also:** `ThemeProvider`

| Member | Type | Description |
| ------ | ---- | ----------- |
| `defaultTheme` (optional) | `T["name"]` | Fallback theme name when no selection is persisted. |
| `mode` (optional) | `ThemeMode` | Fallback mode when no selection is persisted. Defaults to the fallback theme's own mode — whatever `defaultTheme` resolves to. Pass `"system"` to follow `prefers-color-scheme` instead, and give `ThemeProvider` the matching `initialMode` so the script and the runtime resolve the same theme on a first visit. Leaving the two out of step produces a wrong-theme flash: the script paints one theme and the runtime corrects it. |
| `scrollbar` (optional) | `boolean` | Hide the native scrollbar from the very first paint, so the Themvora overlay (`ThemeScrollbar`) is the only scrollbar from frame one — no native-bar-then-overlay swap while the bundle hydrates. Defaults to `false`. |
| `themes` | `readonly T[]` | The theme registry the blocking script resolves against. |

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
Props for the Remix `ThemeProvider`. Configures the theme registry, the
fallback selection, and the optional SSR-resolved initial state.

**See also:** `ThemeProvider`, `ThemeHead`

| Member | Type | Description |
| ------ | ---- | ----------- |
| `children` | `ReactNode` | The application content rendered inside the provider. |
| `defaultTheme` (optional) | `T["name"]` | Fallback theme name when no selection is persisted. |
| `initial` (optional) | `InitialThemeResolution<T>` | The SSR-resolved initial theme state (from `getInitialThemeState`). When provided, it wins on first paint so hydration matches exactly and the selection is mirrored back to cookies. |
| `initialFamily` (optional) | `string` | Family used when neither `initial` nor a persisted selection is available. Pair it with `initialMode` for the same reason. |
| `initialMode` (optional) | `ThemeMode` | Mode used when neither `initial` nor a persisted selection is available. Optional: the runtime and `ThemeHead`'s script both derive the fallback mode from `defaultTheme` by default, so they already agree. Set this to pin a mode the script would not derive — e.g. `"system"` to follow `prefers-color-scheme` — and pass the same value to `ThemeHead`. Ignored when `initial` is provided, since the SSR resolution wins. |
| `themes` (optional) | `readonly T[]` | The theme registry the selection is resolved against. |

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
- [Remix](/framework-guides/remix) — the framework integration
