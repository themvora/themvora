## @themvora/astro/client
React island entry for Themvora's Astro integration
(`@themvora/astro/client`).

This is the **only** entry that depends on React. Import it explicitly when
you chose a React island in your Astro project:

```tsx
import { ThemeProviderClient, useTheme } from "@themvora/astro/client";
```

The framework-neutral root entry (`@themvora/astro`) does not import React,
so projects that use Astro components only never pull a client framework
runtime into their bundle.

> Generated from `packages/astro/src` by `apps/docs/scripts/generate-api-reference.mjs`. Do not edit by hand — run `pnpm --filter @themvora/docs api:generate`.

## Functions

### `ThemeProviderClient<T extends ThemeDefinition<string>>(props): null`
Client island component that installs the theme runtime on the browser. It
publishes it as the app-wide runtime (see getGlobalRuntime), wires the
cookie persistence adapter, and mirrors the selection back to cookies so the
server resolves the same state on the next request.

**See also:** `getGlobalRuntime`, `createAstroThemePersistence`, `useThemeRuntime`, `ThemeScope`, `createBlockingScript`

| Parameter | Type | Description |
| --------- | ---- | ----------- |
| `props` | `ThemeProviderClientProps<T>` | The island props (see ThemeProviderClientProps). |

**Returns** `null` — `null` — this component only sets up the runtime and side effects.

This is an island component: it renders nothing and only runs on the client.
Mount it inside the server-rendered provider (e.g. `provider.astro`) so the
SSR-resolved `initial` state is available.

**One runtime per document.** If a runtime is already installed — by
`getThemeController()` behind `<ThemeToggle />`, or by another island — this
component adopts it rather than creating a second one, and leaves its
destruction to the owner. That is what lets a page mix native Astro controls
and React islands without two runtimes racing to write `<html>`.

On a server-rendered page the island's *own* markup must come from the same
registry the document used. `provider.astro` publishes the configuration on
`globalThis` for exactly that reason; without it the island's server render
falls back to the built-in themes while its hydrated render uses the real
ones, and React reports a text mismatch (error #418) and re-renders the
island.

```ts
---
import { ThemeProviderClient } from "@themvora/astro/client";
---
<ThemeProviderClient client:load initial={initial} />
```

No theme props are needed: the registry, the default theme and the initial
mode/family all come from the `theme.config.ts` the integration transported.
Pass `initial` only when the page resolved the selection on the server with
`getInitialThemeState()`.
```

---


### `ThemeReadout(props): Element`
Renders a theme-derived value that the **server cannot know**, without the
post-hydration settle — and without the caller having to remember the
contract that makes it work.

**See also:** `ThemeReadoutKind`, `ThemeReadoutProps`

| Parameter | Type | Description |
| --------- | ---- | ----------- |
| `props` | `ThemeReadoutProps` | The readout props (see ThemeReadoutProps). |

**Returns** `Element` — A `<span>` carrying the bootstrap-readout contract.

For `mode: "system"` the server renders a fallback it cannot verify (it cannot
read `prefers-color-scheme`). The pre-paint bootstrap resolves the real value
and patches this element's text before the first paint, so the readout is
correct from frame one instead of correcting itself after hydration.

Two attributes make that work, and this component is the reason callers do not
have to know about them:

- `data-tv-readout` marks the node as bootstrap-owned, so the end-of-body
  patch script (see `createThemeReadoutScript`) writes the resolved value into
  it.
- `suppressHydrationWarning` tells React that this text node is intentionally
  divergent: React renders its own (server) value, sees the DOM already
  differs, and neither warns nor rewrites it. Its post-hydration render then
  produces the live value — the same value the script wrote — so nothing
  moves.

Drop either one and the settle comes back: without the marker nothing patches
the text, and without the suppression React rewrites the server's fallback
over the patched value and then corrects it again.

It degrades safely. If the bootstrap is not present (for example
`injectBootstrap: false` with no replacement) the patch script returns
immediately, the server-rendered fallback stays on screen, and no exception is
thrown — so this is progressive enhancement, not a hard runtime dependency.

A value that is not one of the four semantic kinds — a resolved CSS variable,
say — is not covered here. Use the raw contract for that:
`data-tv-readout="var:--theme-color-primary"` plus `suppressHydrationWarning`
on the element that renders the value.

**This is the only supported way to display a theme value in a React island.**
`useTheme()` and its siblings read through `useSyncExternalStore`, so during
hydration they return `runtime.initial` — the resolution the *server*
produced, which cannot know the persisted selection or
`prefers-color-scheme`. Rendering that as text paints a value the document
does not have and corrects it once hydration commits; the visitor sees the
same line change from one theme name to another for a frame or three. Values
from those hooks are for behaviour — comparing, deriving, deciding — and a
displayed one belongs in a readout.

```ts
Active theme <ThemeReadout kind="theme" fallback="—" />
```

---


### `ThemeScope(props): Element`
Applies a local theme to a subtree, overriding the app-wide selection.

**See also:** `ThemeProviderClient`, `ThemeScopeProps`

| Parameter | Type | Description |
| --------- | ---- | ----------- |
| `props` | `ThemeScopeProps` | The scope props (see ThemeScopeProps). |

**Returns** `Element` — A `<div>` wrapping the scoped content.

The scope is a nested override: it does not change the app-wide selection,
only the CSS variables on its own element. The binding is destroyed when the
scope unmounts.

The variables are resolved **during render**, not in an effect, so they are
present in the server-rendered markup. That distinction is what makes the
scope flash-free: an effect-only scope emits a bare `<div>` on the server, so
its content paints with the *global* theme on the first frame and is
repainted with the scoped one after hydration — a visible colour change on
everything inside. Resolving during render puts the same variables in the
server HTML and in the client's first render, so hydration confirms them and
there is nothing to correct. The effect below then only has to handle later
changes (`theme`, `transition`) and the cross-fade between them.

```ts
<ThemeScope theme="brand-dark">
  <p>This content uses the brand-dark theme.</p>
</ThemeScope>
```

---


### `useGeneratedTheme<T extends ThemeDefinition<string>>(): T`
Returns the theme produced by `generateTheme()` and registered with the
provider. Client-only; re-renders when the resolved generated theme changes.

Resolves the registered theme that carries the generator's origin marker
(`meta.generation.kind === "generated"`); shipped presets never qualify. When
both halves of one `generateTheme()` call are registered, the theme the active
selection resolves to is returned.

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
Returns the theme families registered with the provider. Client-only;
re-renders when the registry changes (e.g. `runtime.use(pack)`).

**See also:** `useThemeRuntime`, `useTheme`

**Returns** `readonly ProvidedThemeFamily<T>[]` — The provider's theme families, in supplied order.

---


### `useSetThemeFamily(): __type(nextFamily: string): void`
Returns a stable setter that changes the theme family. Client-only.

**See also:** `useThemeFamily`

**Returns** `__type(nextFamily: string): void` — A function that sets the theme family.

---


### `useSetThemeMode(): __type(nextMode: ThemeMode): void`
Returns a stable setter that changes the theme mode. Client-only.

**See also:** `useThemeMode`

**Returns** `__type(nextMode: ThemeMode): void` — A function that sets the theme mode.

---


### `useTheme<T extends ThemeDefinition<string>>(): { family: string; mode: ThemeMode; setFamily: __type(nextFamily: string): void; setMode: __type(nextMode: ThemeMode): void; theme: T; toggleTheme: __type(): void }`
Returns the current theme, mode, family, and stable setters. Client-only;
re-renders when any of the reactive values change.

**See also:** `useThemeRuntime`, `useThemeValue`, `useThemeMode`, `useThemeFamily`

**Returns** `{ family: string; mode: ThemeMode; setFamily: __type(nextFamily: string): void; setMode: __type(nextMode: ThemeMode): void; theme: T; toggleTheme: __type(): void }` — An object with `theme`, `mode`, `family`, `setMode`, `setFamily`
and `toggleTheme`.

**These values are for behaviour, not for display.** `theme`, `mode` and
`family` are read through `useSyncExternalStore`, so while the island hydrates
they hold `runtime.initial` — the resolution the *server* produced, which
cannot know the persisted selection or `prefers-color-scheme`. Rendering one
of them as text paints a value the document does not have, and corrects it
once hydration commits: the line visibly changes from one theme name to
another a few frames in.

Use `ThemeReadout` for anything on screen. It is owned by the pre-paint
bootstrap contract, so it agrees with `<html>` from the first frame — for
these same three values. Compare, derive and decide with them; render with a
readout.

```ts
const { theme, mode, setMode, toggleTheme } = useTheme();
```

---


### `useThemeBatch(): __type(callback: __type(): void): void`
Returns a stable function that batches multiple runtime mutations into a
single update. Client-only.

**See also:** `useThemeRuntime`, `useTheme`

**Returns** `__type(callback: __type(): void): void` — A function that runs a callback inside a runtime batch.

---


### `useThemeFamily(): string`
Returns the current theme family. Client-only; re-renders when the family
changes.

**See also:** `useSetThemeFamily`

**Returns** `string` — The current theme family, or `undefined` when none is selected.

---


### `useThemeHistory(): { canRedo: boolean; canUndo: boolean; clear: __type(): void; history: HistoryEntry<ThemeDefinition<string>>[]; jump: __type(index: number): void; redo: __type(): void; undo: __type(): void }`
Returns the theme history controller (undo/redo/jump). Client-only;
re-renders when the history changes.

**See also:** `useThemeRuntime`, `useThemeBatch`

**Returns** `{ canRedo: boolean; canUndo: boolean; clear: __type(): void; history: HistoryEntry<ThemeDefinition<string>>[]; jump: __type(index: number): void; redo: __type(): void; undo: __type(): void }` — An object with `undo`, `redo`, `canUndo`, `canRedo`, `clear`,
`jump` and `history`.

---


### `useThemeLifecycle(): { on: __type(event: keyof ThemeLifecycleEventMap<ThemeDefinition<string>>, listener: __type(data: unknown): void): __type(): void }`
Returns the runtime lifecycle controller, allowing subscription to theme
lifecycle events. Client-only.

**See also:** `useThemeRuntime`, `useTheme`

**Returns** `{ on: __type(event: keyof ThemeLifecycleEventMap<ThemeDefinition<string>>, listener: __type(data: unknown): void): __type(): void }` — An object with an `on` method to subscribe to lifecycle events.

---


### `useThemeMode(): ThemeMode`
Returns the current theme mode (`"light"`, `"dark"` or `"system"`).
Client-only; re-renders when the mode changes.

**See also:** `useSetThemeMode`

**Returns** `ThemeMode` — The current theme mode.

---


### `useThemePacks(): __type(pack: ThemePack<any>): void`
Returns a stable function that installs a theme pack onto the runtime.
Client-only.

**See also:** `useThemeRuntime`, `useTheme`

**Returns** `__type(pack: ThemePack<any>): void` — A function that applies a ThemePack.

---


### `useThemeRestore(): __type(snapshot: ThemeRuntimeSnapshot): void`
Returns a stable function that restores a previously captured runtime
snapshot. Client-only.

**See also:** `useThemeSnapshot`

**Returns** `__type(snapshot: ThemeRuntimeSnapshot): void` — A function that restores a ThemeRuntimeSnapshot.

---


### `useThemeRuntime<T extends ThemeDefinition<string>>(): ThemeRuntime<T>`
Returns the app-wide theme runtime installed by `ThemeProviderClient`.
Client-only: must be called from a component rendered inside the island.

**See also:** `ThemeProviderClient`, `useThemeValue`

**Returns** `ThemeRuntime<T>` — The active theme runtime.

---


### `useThemeSchedule(): ThemeSchedule | null`
Reactive sunrise/sunset schedule controller. Returns `null` when the
runtime was created without the `scheduled` option.

```tsx
const schedule = useThemeSchedule();
schedule?.enable();
schedule?.disable();
schedule?.set({ timeZone: "Asia/Kathmandu" });
```

**See also:** `useThemeRuntime`

**Returns** `ThemeSchedule | null`

The returned controller is a **reactive view**: its state reads
(`state`, `enabled`, `active`, `status`, `sunrise`, `sunset`, …) come from
the subscription below, not from the live controller. That distinction is
what makes it safe to render during SSR.

The schedule is resolved per visitor (timezone auto-detection) and recomputes
on a timer, so sunrise/sunset differ between the server render and hydration.
The subscription hydrates from EMPTY_THEME_SCHEDULE_STATE — the same
snapshot the server rendered — and only adopts the live state after mount, so
hydration matches. Returning the raw controller instead (which is what this
hook used to do, discarding the subscription it had just created) handed
consumers the *live* value during the hydration render: React saw a mismatch
against the server HTML and re-rendered the whole island.

Consumers must therefore read state through this return value — never through
a controller they obtained some other way, which has no server snapshot.

---


### `useThemeSnapshot(): __type(): ThemeRuntimeSnapshot`
Returns a stable function that captures a snapshot of the runtime state.
Client-only.

**See also:** `useThemeRestore`

**Returns** `__type(): ThemeRuntimeSnapshot` — A function returning a ThemeRuntimeSnapshot.

---


### `useThemeTokens<T extends ThemeDefinition<string>>(): ThemeTokens | undefined`
Returns the token group of the current resolved theme. Client-only.

**See also:** `useThemeValue`

**Returns** `ThemeTokens | undefined` — The current theme's tokens, or `undefined` when the theme has none.

---


### `useThemeValue<T extends ThemeDefinition<string>>(): T`
Returns the current resolved theme value (the active theme definition).
Client-only; re-renders when the theme changes.

**See also:** `useThemeRuntime`, `useThemeTokens`

**Returns** `T` — The current theme value.

---


### `useToggleTheme(): __type(): void`
Returns a stable function that toggles the theme between light and dark.
Client-only.

**See also:** `useThemeMode`

**Returns** `__type(): void` — A function that toggles the theme mode.

---

## Interfaces

### `ThemeProviderClientProps<T extends ThemeDefinition>`
Props for the Astro `ThemeProviderClient` island component. Describes the
SSR-resolved initial state and the theme registry the client runtime is
created with.

**See also:** `ThemeProviderClient`

| Member | Type | Description |
| ------ | ---- | ----------- |
| `adapters` (optional) | `ThemeAdapter<T>[]` | DOM adapters (component-library bridges) to install. |
| `broadcast` (optional) | `ThemeSelectionBroadcastAdapter \| null` | Cross-tab broadcast adapter. Omitted → a `BroadcastChannel` on `"theme-selection"`; `null` disables cross-tab sync. |
| `cssVariables` (optional) | `false \| CSSVariablesOptions` | CSS custom property binding. Defaults to `{}` (write `--theme-*` on `<html>`). Pass `false` to disable. |
| `defaultTheme` (optional) | `ThemeIdentifier<T>` | Fallback theme when no selection is persisted. Accepts a supplied theme **name** (`"cocoa-light"`) or a **family** (`"cocoa"`); a family resolves to the variant for the mode in effect. |
| `dom` (optional) | `false \| DOMBindingOptions` | DOM attribute binding. Defaults to `{}` (bind `data-theme` on `<html>`). Pass `false` to disable. |
| `initial` (optional) | `InitialThemeResolution<T>` | The SSR-resolved initial theme state (from `getInitialThemeState`). When provided it wins on first paint, so hydration matches exactly. Omit it on prerendered/static pages (no request available) — the island then reads the persisted selection from storage on the client instead. |
| `initialFamily` (optional) | `ThemeIdentifier<T>` | Family used when nothing is persisted. Optional for the same reason as ThemeProviderClientProps.initialMode — the transported configuration already carries it. A variant name is accepted and normalised to its family; its mode applies only when `initialMode` is absent. |
| `initialMode` (optional) | `ThemeMode` | Mode used when nothing is persisted. |
| `plugins` (optional) | `ThemePlugin<T>[]` | Theme plugins to install at runtime creation. |
| `scheduled` (optional) | `false \| ScheduledThemeOptions<T>` | Sunrise/sunset scheduling. Enables `useThemeSchedule()`; without it that hook returns `null`. `autoDetectLocation` resolves coordinates from the browser, and `timeZone` overrides the detected one. |
| `themeOverride` (optional) | `ThemeOverride<ThemeIdentifier<T>>` | An explicit theme override applied over any persisted selection. Applied once per value and never written to persistence. Pass the same value to the integration's `provider.astro` / `createBlockingScript` for a flash-free override — the island alone can only correct it after mount. |
| `themes` (optional) | `readonly T[]` | The theme registry the client runtime resolves against. |
| `transition` (optional) | `boolean \| ThemeTransitionOptions` | Animate theme changes. Omit it to use the `transition` declared in `theme.config.ts` (the transported configuration); `true` uses the defaults, `{ enabled, duration, easing }` tunes it, and `false` disables it for this island. The transition itself is applied by the DOM/CSS bindings, so it also needs `dom`/`cssVariables` to be left at their defaults (they are). |

---


### `ThemeReadoutProps`
Props for ThemeReadout.

**See also:** `ThemeReadout`

| Member | Type | Description |
| ------ | ---- | ----------- |
| `className` (optional) | `string` | Class applied to the wrapping `<span>`. |
| `fallback` (optional) | `ReactNode` | Rendered when the value is not available. Defaults to nothing. |
| `kind` | `ThemeReadoutKind` | The value to display. |

---


### `ThemeScopeProps`
Props for the Astro `ThemeScope` component. Describes the local theme and
the optional transition applied when the scope's theme changes.

**See also:** `ThemeScope`

| Member | Type | Description |
| ------ | ---- | ----------- |
| `children` | `ReactNode` | The content rendered inside the scoped element. |
| `className` (optional) | `string` | Extra classes applied to the scoped element. |
| `theme` | `string` | The theme name applied to this scope, overriding the app-wide selection. |
| `transition` (optional) | `ThemeTransitionOptions` | Transition applied when the scope's theme changes. Defaults to the owning runtime's transition (the provider's), or pass your own to override. |

---

## Type Aliases

### `ThemeReadoutKind`
Which bootstrap-owned value a ThemeReadout displays.

**See also:** `ThemeReadout`

`"theme" | "label" | "mode" | "family"`

These are exactly the text kinds `data-tv-readout` defines — the same set the
pre-paint bootstrap and the controller resolve (see `readoutValue` in
`dom.ts`), plus the raw `var:<custom-property>` form, which this component
does not wrap.

`"label"` was missing for one release while the contract, the bootstrap and
the controller all supported it. A React app that wanted the human label
therefore had to hand-write `data-tv-readout="label"` *and*
`suppressHydrationWarning` — precisely the pair this component exists so that
nobody has to know — and the obvious workaround, rendering `useTheme().theme`
as text, is the one that fluctuates on load. A component that wraps "the
contract" has to cover it whole, or callers route around it and rediscover
the bug it was written for.

---

## Related docs

- [Families & Modes](/core-concepts) — A selection is a family (which palette) plus a mode (light/dark/system); every framework exposes the same read/write surface for it.
- [Theme Discovery & Overrides](/advanced-features) — A provider exposes exactly the themes it was given — grouped by family, with variants and resolved tokens — and accepts an explicit one-shot themeOverride that outranks a saved selection.
- [Runtime](/architecture) — One runtime per app owns the store, selection, registry, history, lifecycle and adapters; every framework binding is a thin view over it.
- [ThemeScope](/scoped-theme) — Apply a different family/mode (or a local theme definition) to a subtree, with scoped CSS variables and pre-paint support.
- [Theme generation](/theme-studio) — Generate a complete, accessible light/dark theme pair from a single seed color, ready to drop into the runtime.
- [Astro](/framework-guides/astro) — the framework integration
