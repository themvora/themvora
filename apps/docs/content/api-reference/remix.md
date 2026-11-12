## @themvora/remix
Themvora Remix integration.

Provides the SSR-safe `ThemeProvider`, the `ThemeHead` blocking script
for zero-flash bootstrapping, `getThemeShellProps` for the `<html>` element
Remix owns, `createThemeDocument` for a single-source document setup, and
the cookie-backed `createRemixThemePersistence`, plus the React `ThemeScope`,
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

**Blocked storage degrades, it does not throw.** `window.localStorage` can
throw on access and `setItem` throws when the quota is full; both are treated
as "this browser cannot remember the selection". The cookie mirror is written
either way, so the server still resolves the same theme on the next request.

```ts
import { createRemixThemePersistence } from "@themvora/remix";

const persistence = createRemixThemePersistence(myThemes, "light", {
  key: "my-theme-selection",
});
```

---


### `createThemeDocument<T extends ThemeDefinition<string>>(config): ThemeDocumentHandle<T>`
Create a single-source theme configuration for a server-rendered document.

The returned `Document` renders the blocking bootstrap in `<head>`, the
matching theme attributes and CSS variables on `<html>`, the scrollbar class
and pre-paint stylesheet when configured, and the runtime provider around the
application tree. `resolveInitial` derives the request-specific state from the
same configuration, so the loader, the script, the shell and the provider
cannot drift apart.

**See also:** `ThemeDocumentConfig`

| Parameter | Type | Description |
| --------- | ---- | ----------- |
| `config` | `ThemeDocumentConfig<T>` | The registry, fallback selection, static runtime options (`transition`, `scheduled`, `themeOverride`) and document options. |

**Returns** `ThemeDocumentHandle<T>` — The document handle: `resolveInitial`, `Document`, `Provider`,
  `config` and the static `fallback`.

The configuration is copied and frozen, so changing the caller's `themes`
array later cannot change what an already-created document renders. Request
state is never stored on the handle: `resolveInitial` derives it from the
`Request` it is given, which keeps concurrent requests isolated.

The handler imports the server resolver lazily. The client bundle therefore
does not include the cookie parser, while the loader still gets a synchronous
configuration it can call.

```ts
// app/root.tsx — React Router Framework Mode
import { createThemeDocument } from "@themvora/remix/react-router";
import { getBuiltInThemes } from "@themvora/core";
import type { Route } from "./+types/root";

const themes = getBuiltInThemes();

const theming = createThemeDocument({
  themes,
  defaultTheme: "light",
  mode: "system",
  transition: { enabled: true, preset: "smooth" },
  scrollbar: true,
});

export async function loader({ request }: Route.LoaderArgs) {
  return { theme: await theming.resolveInitial(request) };
}

export function Layout({ children }: { children: React.ReactNode }) {
  const data = useRouteLoaderData<typeof loader>("root");
  return (
    <theming.Document
      initial={data?.theme}
      head={[<Meta key="meta" />, <Links key="links" />]}
      afterContent={<><ScrollRestoration /><Scripts /></>}
    >
      {children}
    </theming.Document>
  );
}
```

---


### `getThemeShellProps<T extends ThemeDefinition<string>>(initial, options): ThemeShellProps`
The `<html>` attributes the pre-paint bootstrap script writes, as React
props. Spread them onto the document element rendered by `app/root.tsx`.

**See also:** `ThemeHead`

| Parameter | Type | Description |
| --------- | ---- | ----------- |
| `initial` | `InitialThemeResolution<T>` | The SSR-resolved initial state from `getInitialThemeState`. |
| `options` | `ThemeShellOptions` | Extra classes, the scrollbar opt-in, and extra inline styles. |

**Returns** `ThemeShellProps` — The `<html>` props: the theme attributes, the CSS variables, and the
  hydration suppression.

Every value here is a *snapshot* of the server's resolution, and it exists
for one reason: **hydration parity**. The blocking script in `<ThemeHead>`
rewrites all of it before first paint, so React's virtual DOM has to start
out agreeing with the DOM, or React reports a hydration mismatch on `<html>`
and — because it never patches attributes up — keeps a virtual DOM that
disagrees with the document for the rest of the session.

That is not hypothetical. A Remix app that renders a bare `<html lang="en">`
hydrates against seven attributes it never rendered (`data-theme`,
`data-theme-mode`, `data-theme-family`, `data-theme-selection-mode`,
`data-theme-selection-family`, `data-theme-ready` and `style`), and React
logs "some attributes of the server rendered HTML didn't match the client
properties" on every load. Rendering the snapshot removes six of the seven;
`suppressHydrationWarning` covers the last one, which cannot be removed by
construction: `data-theme-mode` is the *resolved* mode, so a `"system"`
selection resolved against a dark `prefers-color-scheme` legitimately differs
from the server's `"light"`. The same goes for the `dark` class the script
toggles, which is deliberately not rendered here — the script owns it.

The suppression is scoped to the `<html>` element and its own attributes. It
does not hide mismatches in the application tree, so a genuine hydration bug
in a route still reports.

```ts
import { getBuiltInThemes } from "@themvora/core";
import { ThemeHead, getThemeShellProps } from "@themvora/remix";

const themes = getBuiltInThemes();

export function Layout({ children }: { children: ReactNode }) {
  const { initial } = useLoaderData<typeof loader>();
  return (
    <html lang="en" {...getThemeShellProps(initial, { scrollbar: true })}>
      <head>
        <ThemeHead themes={themes} defaultTheme="light" scrollbar />
      </head>
      <body>{children}</body>
    </html>
  );
}
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


### `useTheme<T extends ThemeDefinition<string>>(): { effectiveMode: "light" | "dark"; family: string; mode: ThemeMode; setFamily: __type(family: ThemeFamilies<readonly T[]>): void; setMode: __type(mode: ModesOf<T>): void; theme: T; toggleTheme: __type(): void }`
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

**Returns** `{ effectiveMode: "light" | "dark"; family: string; mode: ThemeMode; setFamily: __type(family: ThemeFamilies<readonly T[]>): void; setMode: __type(mode: ModesOf<T>): void; theme: T; toggleTheme: __type(): void }`

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

### `RemixThemePersistenceOptions`
Options for createRemixThemePersistence. Configures the storage key,
the backing `Storage` object, and the cookie attributes used when mirroring
the selection to cookies.

**See also:** `createRemixThemePersistence`

| Member | Type | Description |
| ------ | ---- | ----------- |
| `cookieOptions` (optional) | `string` | Cookie attribute string appended to the mirrored theme cookies (e.g. `"path=/; max-age=31536000; samesite=lax"`). Defaults to `"path=/; max-age=31536000; samesite=lax"`, plus `secure` on an HTTPS origin. |
| `key` (optional) | `string` | The `localStorage` key holding the persisted selection. Default `"theme-selection"`. |
| `storage` (optional) | `Storage` | The backing storage. Defaults to `window.localStorage`. |

---


### `ThemeDocumentBodyProps`

**Extends** `Omit<HTMLAttributes<HTMLBodyElement>, "className" | "style">`
Extra props for the document body rendered by `<theming.Document>`.

| Member | Type | Description |
| ------ | ---- | ----------- |
| `about` (optional) | `string` | — |
| `accessKey` (optional) | `string` | — |
| `aria-activedescendant` (optional) | `string` | Identifies the currently active element when DOM focus is on a composite widget, textbox, group, or application. |
| `aria-atomic` (optional) | `Booleanish` | Indicates whether assistive technologies will present all, or only parts of, the changed region based on the change notifications defined by the aria-relevant attribute. |
| `aria-autocomplete` (optional) | `"none" \| "list" \| "inline" \| "both"` | Indicates whether inputting text could trigger display of one or more predictions of the user's intended value for an input and specifies how predictions would be presented if they are made. |
| `aria-braillelabel` (optional) | `string` | Defines a string value that labels the current element, which is intended to be converted into Braille. |
| `aria-brailleroledescription` (optional) | `string` | Defines a human-readable, author-localized abbreviated description for the role of an element, which is intended to be converted into Braille. |
| `aria-busy` (optional) | `Booleanish` | — |
| `aria-checked` (optional) | `boolean \| "true" \| "false" \| "mixed"` | Indicates the current "checked" state of checkboxes, radio buttons, and other widgets. |
| `aria-colcount` (optional) | `number` | Defines the total number of columns in a table, grid, or treegrid. |
| `aria-colindex` (optional) | `number` | Defines an element's column index or position with respect to the total number of columns within a table, grid, or treegrid. |
| `aria-colindextext` (optional) | `string` | Defines a human readable text alternative of aria-colindex. |
| `aria-colspan` (optional) | `number` | Defines the number of columns spanned by a cell or gridcell within a table, grid, or treegrid. |
| `aria-controls` (optional) | `string` | Identifies the element (or elements) whose contents or presence are controlled by the current element. |
| `aria-current` (optional) | `boolean \| "true" \| "false" \| "page" \| "step" \| "location" \| "date" \| "time"` | Indicates the element that represents the current item within a container or set of related elements. |
| `aria-describedby` (optional) | `string` | Identifies the element (or elements) that describes the object. |
| `aria-description` (optional) | `string` | Defines a string value that describes or annotates the current element. |
| `aria-details` (optional) | `string` | Identifies the element that provides a detailed, extended description for the object. |
| `aria-disabled` (optional) | `Booleanish` | Indicates that the element is perceivable but disabled, so it is not editable or otherwise operable. |
| `aria-dropeffect` (optional) | `"none" \| "link" \| "copy" \| "execute" \| "move" \| "popup"` | Indicates what functions can be performed when a dragged object is released on the drop target. |
| `aria-errormessage` (optional) | `string` | Identifies the element that provides an error message for the object. |
| `aria-expanded` (optional) | `Booleanish` | Indicates whether the element, or another grouping element it controls, is currently expanded or collapsed. |
| `aria-flowto` (optional) | `string` | Identifies the next element (or elements) in an alternate reading order of content which, at the user's discretion, allows assistive technology to override the general default of reading in document source order. |
| `aria-grabbed` (optional) | `Booleanish` | Indicates an element's "grabbed" state in a drag-and-drop operation. |
| `aria-haspopup` (optional) | `boolean \| "true" \| "false" \| "dialog" \| "grid" \| "listbox" \| "menu" \| "tree"` | Indicates the availability and type of interactive popup element, such as menu or dialog, that can be triggered by an element. |
| `aria-hidden` (optional) | `Booleanish` | Indicates whether the element is exposed to an accessibility API. |
| `aria-invalid` (optional) | `boolean \| "true" \| "false" \| "grammar" \| "spelling"` | Indicates the entered value does not conform to the format expected by the application. |
| `aria-keyshortcuts` (optional) | `string` | Indicates keyboard shortcuts that an author has implemented to activate or give focus to an element. |
| `aria-label` (optional) | `string` | Defines a string value that labels the current element. |
| `aria-labelledby` (optional) | `string` | Identifies the element (or elements) that labels the current element. |
| `aria-level` (optional) | `number` | Defines the hierarchical level of an element within a structure. |
| `aria-live` (optional) | `"off" \| "assertive" \| "polite"` | Indicates that an element will be updated, and describes the types of updates the user agents, assistive technologies, and user can expect from the live region. |
| `aria-modal` (optional) | `Booleanish` | Indicates whether an element is modal when displayed. |
| `aria-multiline` (optional) | `Booleanish` | Indicates whether a text box accepts multiple lines of input or only a single line. |
| `aria-multiselectable` (optional) | `Booleanish` | Indicates that the user may select more than one item from the current selectable descendants. |
| `aria-orientation` (optional) | `"horizontal" \| "vertical"` | Indicates whether the element's orientation is horizontal, vertical, or unknown/ambiguous. |
| `aria-owns` (optional) | `string` | Identifies an element (or elements) in order to define a visual, functional, or contextual parent/child relationship between DOM elements where the DOM hierarchy cannot be used to represent the relationship. |
| `aria-placeholder` (optional) | `string` | Defines a short hint (a word or short phrase) intended to aid the user with data entry when the control has no value. A hint could be a sample value or a brief description of the expected format. |
| `aria-posinset` (optional) | `number` | Defines an element's number or position in the current set of listitems or treeitems. Not required if all elements in the set are present in the DOM. |
| `aria-pressed` (optional) | `boolean \| "true" \| "false" \| "mixed"` | Indicates the current "pressed" state of toggle buttons. |
| `aria-readonly` (optional) | `Booleanish` | Indicates that the element is not editable, but is otherwise operable. |
| `aria-relevant` (optional) | `"text" \| "additions" \| "additions removals" \| "additions text" \| "all" \| "removals" \| "removals additions" \| "removals text" \| "text additions" \| "text removals"` | Indicates what notifications the user agent will trigger when the accessibility tree within a live region is modified. |
| `aria-required` (optional) | `Booleanish` | Indicates that user input is required on the element before a form may be submitted. |
| `aria-roledescription` (optional) | `string` | Defines a human-readable, author-localized description for the role of an element. |
| `aria-rowcount` (optional) | `number` | Defines the total number of rows in a table, grid, or treegrid. |
| `aria-rowindex` (optional) | `number` | Defines an element's row index or position with respect to the total number of rows within a table, grid, or treegrid. |
| `aria-rowindextext` (optional) | `string` | Defines a human readable text alternative of aria-rowindex. |
| `aria-rowspan` (optional) | `number` | Defines the number of rows spanned by a cell or gridcell within a table, grid, or treegrid. |
| `aria-selected` (optional) | `Booleanish` | Indicates the current "selected" state of various widgets. |
| `aria-setsize` (optional) | `number` | Defines the number of items in the current set of listitems or treeitems. Not required if all elements in the set are present in the DOM. |
| `aria-sort` (optional) | `"none" \| "ascending" \| "descending" \| "other"` | Indicates if items in a table or grid are sorted in ascending or descending order. |
| `aria-valuemax` (optional) | `number` | Defines the maximum allowed value for a range widget. |
| `aria-valuemin` (optional) | `number` | Defines the minimum allowed value for a range widget. |
| `aria-valuenow` (optional) | `number` | Defines the current value for a range widget. |
| `aria-valuetext` (optional) | `string` | Defines the human readable text alternative of aria-valuenow for a range widget. |
| `autoCapitalize` (optional) | `string & object \| "off" \| "none" \| "on" \| "sentences" \| "words" \| "characters"` | — |
| `autoCorrect` (optional) | `string` | — |
| `autoFocus` (optional) | `boolean` | — |
| `autoSave` (optional) | `string` | — |
| `children` (optional) | `ReactNode` | — |
| `className` (optional) | `string` | Classes merged with the configuration's `bodyClassName`. |
| `color` (optional) | `string` | — |
| `content` (optional) | `string` | — |
| `contentEditable` (optional) | `Booleanish \| "inherit" \| "plaintext-only"` | — |
| `contextMenu` (optional) | `string` | — |
| `dangerouslySetInnerHTML` (optional) | `{ }` | — |
| `datatype` (optional) | `string` | — |
| `defaultChecked` (optional) | `boolean` | — |
| `defaultValue` (optional) | `string \| number \| readonly string[]` | — |
| `dir` (optional) | `string` | — |
| `draggable` (optional) | `Booleanish` | — |
| `enterKeyHint` (optional) | `"enter" \| "done" \| "go" \| "next" \| "previous" \| "search" \| "send"` | — |
| `exportparts` (optional) | `string` | — |
| `hidden` (optional) | `boolean` | — |
| `id` (optional) | `string` | — |
| `inert` (optional) | `boolean` | — |
| `inlist` (optional) | `any` | — |
| `inputMode` (optional) | `"none" \| "search" \| "text" \| "tel" \| "url" \| "email" \| "numeric" \| "decimal"` | Hints at the type of data that might be entered by the user while editing the element or its contents |
| `is` (optional) | `string` | Specify that a standard HTML element should behave like a defined custom built-in element |
| `itemID` (optional) | `string` | — |
| `itemProp` (optional) | `string` | — |
| `itemRef` (optional) | `string` | — |
| `itemScope` (optional) | `boolean` | — |
| `itemType` (optional) | `string` | — |
| `lang` (optional) | `string` | — |
| `nonce` (optional) | `string` | — |
| `onAbort` (optional) | `ReactEventHandler<HTMLBodyElement>` | — |
| `onAbortCapture` (optional) | `ReactEventHandler<HTMLBodyElement>` | — |
| `onAnimationEnd` (optional) | `AnimationEventHandler<HTMLBodyElement>` | — |
| `onAnimationEndCapture` (optional) | `AnimationEventHandler<HTMLBodyElement>` | — |
| `onAnimationIteration` (optional) | `AnimationEventHandler<HTMLBodyElement>` | — |
| `onAnimationIterationCapture` (optional) | `AnimationEventHandler<HTMLBodyElement>` | — |
| `onAnimationStart` (optional) | `AnimationEventHandler<HTMLBodyElement>` | — |
| `onAnimationStartCapture` (optional) | `AnimationEventHandler<HTMLBodyElement>` | — |
| `onAuxClick` (optional) | `MouseEventHandler<HTMLBodyElement>` | — |
| `onAuxClickCapture` (optional) | `MouseEventHandler<HTMLBodyElement>` | — |
| `onBeforeInput` (optional) | `InputEventHandler<HTMLBodyElement>` | — |
| `onBeforeInputCapture` (optional) | `InputEventHandler<HTMLBodyElement>` | — |
| `onBeforeToggle` (optional) | `ToggleEventHandler<HTMLBodyElement>` | — |
| `onBlur` (optional) | `FocusEventHandler<HTMLBodyElement>` | — |
| `onBlurCapture` (optional) | `FocusEventHandler<HTMLBodyElement>` | — |
| `onCanPlay` (optional) | `ReactEventHandler<HTMLBodyElement>` | — |
| `onCanPlayCapture` (optional) | `ReactEventHandler<HTMLBodyElement>` | — |
| `onCanPlayThrough` (optional) | `ReactEventHandler<HTMLBodyElement>` | — |
| `onCanPlayThroughCapture` (optional) | `ReactEventHandler<HTMLBodyElement>` | — |
| `onChange` (optional) | `ChangeEventHandler<HTMLBodyElement, Element>` | — |
| `onChangeCapture` (optional) | `ChangeEventHandler<HTMLBodyElement, Element>` | — |
| `onClick` (optional) | `MouseEventHandler<HTMLBodyElement>` | — |
| `onClickCapture` (optional) | `MouseEventHandler<HTMLBodyElement>` | — |
| `onCompositionEnd` (optional) | `CompositionEventHandler<HTMLBodyElement>` | — |
| `onCompositionEndCapture` (optional) | `CompositionEventHandler<HTMLBodyElement>` | — |
| `onCompositionStart` (optional) | `CompositionEventHandler<HTMLBodyElement>` | — |
| `onCompositionStartCapture` (optional) | `CompositionEventHandler<HTMLBodyElement>` | — |
| `onCompositionUpdate` (optional) | `CompositionEventHandler<HTMLBodyElement>` | — |
| `onCompositionUpdateCapture` (optional) | `CompositionEventHandler<HTMLBodyElement>` | — |
| `onContextMenu` (optional) | `MouseEventHandler<HTMLBodyElement>` | — |
| `onContextMenuCapture` (optional) | `MouseEventHandler<HTMLBodyElement>` | — |
| `onCopy` (optional) | `ClipboardEventHandler<HTMLBodyElement>` | — |
| `onCopyCapture` (optional) | `ClipboardEventHandler<HTMLBodyElement>` | — |
| `onCut` (optional) | `ClipboardEventHandler<HTMLBodyElement>` | — |
| `onCutCapture` (optional) | `ClipboardEventHandler<HTMLBodyElement>` | — |
| `onDoubleClick` (optional) | `MouseEventHandler<HTMLBodyElement>` | — |
| `onDoubleClickCapture` (optional) | `MouseEventHandler<HTMLBodyElement>` | — |
| `onDrag` (optional) | `DragEventHandler<HTMLBodyElement>` | — |
| `onDragCapture` (optional) | `DragEventHandler<HTMLBodyElement>` | — |
| `onDragEnd` (optional) | `DragEventHandler<HTMLBodyElement>` | — |
| `onDragEndCapture` (optional) | `DragEventHandler<HTMLBodyElement>` | — |
| `onDragEnter` (optional) | `DragEventHandler<HTMLBodyElement>` | — |
| `onDragEnterCapture` (optional) | `DragEventHandler<HTMLBodyElement>` | — |
| `onDragExit` (optional) | `DragEventHandler<HTMLBodyElement>` | — |
| `onDragExitCapture` (optional) | `DragEventHandler<HTMLBodyElement>` | — |
| `onDragLeave` (optional) | `DragEventHandler<HTMLBodyElement>` | — |
| `onDragLeaveCapture` (optional) | `DragEventHandler<HTMLBodyElement>` | — |
| `onDragOver` (optional) | `DragEventHandler<HTMLBodyElement>` | — |
| `onDragOverCapture` (optional) | `DragEventHandler<HTMLBodyElement>` | — |
| `onDragStart` (optional) | `DragEventHandler<HTMLBodyElement>` | — |
| `onDragStartCapture` (optional) | `DragEventHandler<HTMLBodyElement>` | — |
| `onDrop` (optional) | `DragEventHandler<HTMLBodyElement>` | — |
| `onDropCapture` (optional) | `DragEventHandler<HTMLBodyElement>` | — |
| `onDurationChange` (optional) | `ReactEventHandler<HTMLBodyElement>` | — |
| `onDurationChangeCapture` (optional) | `ReactEventHandler<HTMLBodyElement>` | — |
| `onEmptied` (optional) | `ReactEventHandler<HTMLBodyElement>` | — |
| `onEmptiedCapture` (optional) | `ReactEventHandler<HTMLBodyElement>` | — |
| `onEncrypted` (optional) | `ReactEventHandler<HTMLBodyElement>` | — |
| `onEncryptedCapture` (optional) | `ReactEventHandler<HTMLBodyElement>` | — |
| `onEnded` (optional) | `ReactEventHandler<HTMLBodyElement>` | — |
| `onEndedCapture` (optional) | `ReactEventHandler<HTMLBodyElement>` | — |
| `onError` (optional) | `ReactEventHandler<HTMLBodyElement>` | — |
| `onErrorCapture` (optional) | `ReactEventHandler<HTMLBodyElement>` | — |
| `onFocus` (optional) | `FocusEventHandler<HTMLBodyElement>` | — |
| `onFocusCapture` (optional) | `FocusEventHandler<HTMLBodyElement>` | — |
| `onGotPointerCapture` (optional) | `PointerEventHandler<HTMLBodyElement>` | — |
| `onGotPointerCaptureCapture` (optional) | `PointerEventHandler<HTMLBodyElement>` | — |
| `onInput` (optional) | `InputEventHandler<HTMLBodyElement>` | — |
| `onInputCapture` (optional) | `InputEventHandler<HTMLBodyElement>` | — |
| `onInvalid` (optional) | `ReactEventHandler<HTMLBodyElement>` | — |
| `onInvalidCapture` (optional) | `ReactEventHandler<HTMLBodyElement>` | — |
| `onKeyDown` (optional) | `KeyboardEventHandler<HTMLBodyElement>` | — |
| `onKeyDownCapture` (optional) | `KeyboardEventHandler<HTMLBodyElement>` | — |
| `onKeyPress` (optional) | `KeyboardEventHandler<HTMLBodyElement>` | — |
| `onKeyPressCapture` (optional) | `KeyboardEventHandler<HTMLBodyElement>` | — |
| `onKeyUp` (optional) | `KeyboardEventHandler<HTMLBodyElement>` | — |
| `onKeyUpCapture` (optional) | `KeyboardEventHandler<HTMLBodyElement>` | — |
| `onLoad` (optional) | `ReactEventHandler<HTMLBodyElement>` | — |
| `onLoadCapture` (optional) | `ReactEventHandler<HTMLBodyElement>` | — |
| `onLoadedData` (optional) | `ReactEventHandler<HTMLBodyElement>` | — |
| `onLoadedDataCapture` (optional) | `ReactEventHandler<HTMLBodyElement>` | — |
| `onLoadedMetadata` (optional) | `ReactEventHandler<HTMLBodyElement>` | — |
| `onLoadedMetadataCapture` (optional) | `ReactEventHandler<HTMLBodyElement>` | — |
| `onLoadStart` (optional) | `ReactEventHandler<HTMLBodyElement>` | — |
| `onLoadStartCapture` (optional) | `ReactEventHandler<HTMLBodyElement>` | — |
| `onLostPointerCapture` (optional) | `PointerEventHandler<HTMLBodyElement>` | — |
| `onLostPointerCaptureCapture` (optional) | `PointerEventHandler<HTMLBodyElement>` | — |
| `onMouseDown` (optional) | `MouseEventHandler<HTMLBodyElement>` | — |
| `onMouseDownCapture` (optional) | `MouseEventHandler<HTMLBodyElement>` | — |
| `onMouseEnter` (optional) | `MouseEventHandler<HTMLBodyElement>` | — |
| `onMouseLeave` (optional) | `MouseEventHandler<HTMLBodyElement>` | — |
| `onMouseMove` (optional) | `MouseEventHandler<HTMLBodyElement>` | — |
| `onMouseMoveCapture` (optional) | `MouseEventHandler<HTMLBodyElement>` | — |
| `onMouseOut` (optional) | `MouseEventHandler<HTMLBodyElement>` | — |
| `onMouseOutCapture` (optional) | `MouseEventHandler<HTMLBodyElement>` | — |
| `onMouseOver` (optional) | `MouseEventHandler<HTMLBodyElement>` | — |
| `onMouseOverCapture` (optional) | `MouseEventHandler<HTMLBodyElement>` | — |
| `onMouseUp` (optional) | `MouseEventHandler<HTMLBodyElement>` | — |
| `onMouseUpCapture` (optional) | `MouseEventHandler<HTMLBodyElement>` | — |
| `onPaste` (optional) | `ClipboardEventHandler<HTMLBodyElement>` | — |
| `onPasteCapture` (optional) | `ClipboardEventHandler<HTMLBodyElement>` | — |
| `onPause` (optional) | `ReactEventHandler<HTMLBodyElement>` | — |
| `onPauseCapture` (optional) | `ReactEventHandler<HTMLBodyElement>` | — |
| `onPlay` (optional) | `ReactEventHandler<HTMLBodyElement>` | — |
| `onPlayCapture` (optional) | `ReactEventHandler<HTMLBodyElement>` | — |
| `onPlaying` (optional) | `ReactEventHandler<HTMLBodyElement>` | — |
| `onPlayingCapture` (optional) | `ReactEventHandler<HTMLBodyElement>` | — |
| `onPointerCancel` (optional) | `PointerEventHandler<HTMLBodyElement>` | — |
| `onPointerCancelCapture` (optional) | `PointerEventHandler<HTMLBodyElement>` | — |
| `onPointerDown` (optional) | `PointerEventHandler<HTMLBodyElement>` | — |
| `onPointerDownCapture` (optional) | `PointerEventHandler<HTMLBodyElement>` | — |
| `onPointerEnter` (optional) | `PointerEventHandler<HTMLBodyElement>` | — |
| `onPointerLeave` (optional) | `PointerEventHandler<HTMLBodyElement>` | — |
| `onPointerMove` (optional) | `PointerEventHandler<HTMLBodyElement>` | — |
| `onPointerMoveCapture` (optional) | `PointerEventHandler<HTMLBodyElement>` | — |
| `onPointerOut` (optional) | `PointerEventHandler<HTMLBodyElement>` | — |
| `onPointerOutCapture` (optional) | `PointerEventHandler<HTMLBodyElement>` | — |
| `onPointerOver` (optional) | `PointerEventHandler<HTMLBodyElement>` | — |
| `onPointerOverCapture` (optional) | `PointerEventHandler<HTMLBodyElement>` | — |
| `onPointerUp` (optional) | `PointerEventHandler<HTMLBodyElement>` | — |
| `onPointerUpCapture` (optional) | `PointerEventHandler<HTMLBodyElement>` | — |
| `onProgress` (optional) | `ReactEventHandler<HTMLBodyElement>` | — |
| `onProgressCapture` (optional) | `ReactEventHandler<HTMLBodyElement>` | — |
| `onRateChange` (optional) | `ReactEventHandler<HTMLBodyElement>` | — |
| `onRateChangeCapture` (optional) | `ReactEventHandler<HTMLBodyElement>` | — |
| `onReset` (optional) | `ReactEventHandler<HTMLBodyElement>` | — |
| `onResetCapture` (optional) | `ReactEventHandler<HTMLBodyElement>` | — |
| `onScroll` (optional) | `UIEventHandler<HTMLBodyElement>` | — |
| `onScrollCapture` (optional) | `UIEventHandler<HTMLBodyElement>` | — |
| `onScrollEnd` (optional) | `UIEventHandler<HTMLBodyElement>` | — |
| `onScrollEndCapture` (optional) | `UIEventHandler<HTMLBodyElement>` | — |
| `onSeeked` (optional) | `ReactEventHandler<HTMLBodyElement>` | — |
| `onSeekedCapture` (optional) | `ReactEventHandler<HTMLBodyElement>` | — |
| `onSeeking` (optional) | `ReactEventHandler<HTMLBodyElement>` | — |
| `onSeekingCapture` (optional) | `ReactEventHandler<HTMLBodyElement>` | — |
| `onSelect` (optional) | `ReactEventHandler<HTMLBodyElement>` | — |
| `onSelectCapture` (optional) | `ReactEventHandler<HTMLBodyElement>` | — |
| `onStalled` (optional) | `ReactEventHandler<HTMLBodyElement>` | — |
| `onStalledCapture` (optional) | `ReactEventHandler<HTMLBodyElement>` | — |
| `onSubmit` (optional) | `SubmitEventHandler<HTMLBodyElement>` | — |
| `onSubmitCapture` (optional) | `SubmitEventHandler<HTMLBodyElement>` | — |
| `onSuspend` (optional) | `ReactEventHandler<HTMLBodyElement>` | — |
| `onSuspendCapture` (optional) | `ReactEventHandler<HTMLBodyElement>` | — |
| `onTimeUpdate` (optional) | `ReactEventHandler<HTMLBodyElement>` | — |
| `onTimeUpdateCapture` (optional) | `ReactEventHandler<HTMLBodyElement>` | — |
| `onToggle` (optional) | `ToggleEventHandler<HTMLBodyElement>` | — |
| `onTouchCancel` (optional) | `TouchEventHandler<HTMLBodyElement>` | — |
| `onTouchCancelCapture` (optional) | `TouchEventHandler<HTMLBodyElement>` | — |
| `onTouchEnd` (optional) | `TouchEventHandler<HTMLBodyElement>` | — |
| `onTouchEndCapture` (optional) | `TouchEventHandler<HTMLBodyElement>` | — |
| `onTouchMove` (optional) | `TouchEventHandler<HTMLBodyElement>` | — |
| `onTouchMoveCapture` (optional) | `TouchEventHandler<HTMLBodyElement>` | — |
| `onTouchStart` (optional) | `TouchEventHandler<HTMLBodyElement>` | — |
| `onTouchStartCapture` (optional) | `TouchEventHandler<HTMLBodyElement>` | — |
| `onTransitionCancel` (optional) | `TransitionEventHandler<HTMLBodyElement>` | — |
| `onTransitionCancelCapture` (optional) | `TransitionEventHandler<HTMLBodyElement>` | — |
| `onTransitionEnd` (optional) | `TransitionEventHandler<HTMLBodyElement>` | — |
| `onTransitionEndCapture` (optional) | `TransitionEventHandler<HTMLBodyElement>` | — |
| `onTransitionRun` (optional) | `TransitionEventHandler<HTMLBodyElement>` | — |
| `onTransitionRunCapture` (optional) | `TransitionEventHandler<HTMLBodyElement>` | — |
| `onTransitionStart` (optional) | `TransitionEventHandler<HTMLBodyElement>` | — |
| `onTransitionStartCapture` (optional) | `TransitionEventHandler<HTMLBodyElement>` | — |
| `onVolumeChange` (optional) | `ReactEventHandler<HTMLBodyElement>` | — |
| `onVolumeChangeCapture` (optional) | `ReactEventHandler<HTMLBodyElement>` | — |
| `onWaiting` (optional) | `ReactEventHandler<HTMLBodyElement>` | — |
| `onWaitingCapture` (optional) | `ReactEventHandler<HTMLBodyElement>` | — |
| `onWheel` (optional) | `WheelEventHandler<HTMLBodyElement>` | — |
| `onWheelCapture` (optional) | `WheelEventHandler<HTMLBodyElement>` | — |
| `part` (optional) | `string` | — |
| `popover` (optional) | `"" \| "auto" \| "manual" \| "hint"` | — |
| `popoverTarget` (optional) | `string` | — |
| `popoverTargetAction` (optional) | `"toggle" \| "show" \| "hide"` | — |
| `prefix` (optional) | `string` | — |
| `property` (optional) | `string` | — |
| `radioGroup` (optional) | `string` | — |
| `rel` (optional) | `string` | — |
| `resource` (optional) | `string` | — |
| `results` (optional) | `number` | — |
| `rev` (optional) | `string` | — |
| `role` (optional) | `AriaRole` | — |
| `security` (optional) | `string` | — |
| `slot` (optional) | `string` | — |
| `spellCheck` (optional) | `Booleanish` | — |
| `style` (optional) | `CSSProperties` | Inline styles merged after the configuration's `bodyStyle`. |
| `suppressContentEditableWarning` (optional) | `boolean` | — |
| `suppressHydrationWarning` (optional) | `boolean` | — |
| `tabIndex` (optional) | `number` | — |
| `title` (optional) | `string` | — |
| `translate` (optional) | `"yes" \| "no"` | — |
| `typeof` (optional) | `string` | — |
| `unselectable` (optional) | `"off" \| "on"` | — |
| `vocab` (optional) | `string` | — |

---


### `ThemeDocumentConfig<T extends ThemeDefinition>`
The one description of a document-level theme installation.

Every value here is static: it does not depend on the incoming request, so a
module can declare one configuration and use it for the pre-paint script, the
server-rendered `<html>` element and the client runtime. The request-specific
result is the `initial` state produced by ThemeDocumentHandle.resolveInitial.

| Member | Type | Description |
| ------ | ---- | ----------- |
| `bodyClassName` (optional) | `string` | Classes rendered on `<body>`. |
| `bodyStyle` (optional) | `CSSProperties` | Inline styles rendered on `<body>`. |
| `className` (optional) | `string` | Classes merged onto the `<html>` element alongside the theme's own. |
| `defaultTheme` (optional) | `ThemeIdentifier<T>` | Fallback theme when no selection is persisted. Accepts a theme **name** or a **family**; a family resolves to the variant for the mode in effect. |
| `family` (optional) | `ThemeIdentifier<T>` | Family used when nothing is persisted and `defaultTheme` names no family. A variant name is normalised to its family. |
| `initialFamily` (optional) | `ThemeIdentifier<T>` | Alias for ThemeDocumentConfig.family, matching the name the Remix provider prop has always used. `family` wins when both are supplied. |
| `initialMode` (optional) | `ThemeMode` | Alias for ThemeDocumentConfig.mode, matching the name the Remix provider prop has always used. `mode` wins when both are supplied. |
| `mode` (optional) | `ThemeMode` | Mode used when neither a persisted selection nor `themeOverride` applies. Defaults to the fallback theme's own mode. Pass `"system"` to follow `prefers-color-scheme` instead. |
| `scheduled` (optional) | `false \| ScheduledThemeOptions<T>` | The solar schedule passed to the runtime, so light/dark can follow the visitor's sunrise and sunset. The document still resolves and paints the persisted selection; the schedule takes over once the runtime mounts. |
| `scrollbar` (optional) | `boolean` | Hide the native scrollbar from the very first paint. Adds the `tv-scrollbar` class to `<html>` and emits the pre-paint hiding stylesheet. The application still imports `@themvora/core/scrollbar.css` itself: a CSS import is a bundler concern, not something a component can inject. |
| `style` (optional) | `CSSProperties` | Inline styles merged after the theme's CSS variables on `<html>`. |
| `themeOverride` (optional) | `ThemeOverride<ThemeIdentifier<T>>` | An explicit theme override applied over any persisted selection. The pre-paint script, the shell and the runtime all receive the same value. |
| `themes` | `readonly T[]` | The theme registry the selection is resolved against. |
| `transition` (optional) | `boolean \| ThemeTransitionOptions` | Transition configuration passed to the runtime: `true`, `false`, or `{ enabled, duration, easing, preset, … }`. Same contract as the Remix provider's `transition` prop, so a document-level setup can express animations without falling back to the lower-level `ThemeProvider`. |

---


### `ThemeDocumentHandle<T extends ThemeDefinition>`
The object returned by createThemeDocument.

| Member | Type | Description |
| ------ | ---- | ----------- |
| readonly `config` | `Readonly<ThemeDocumentConfig<T>>` | The frozen configuration every part of the integration reads. |
| readonly `fallback` | `InitialThemeResolution<T>` | The static fallback resolution — the answer when no request state is available. Used by `Document` when `initial` is missing or `null`. |
| `Document` | `ReactElement` | — |
| `Provider` | `ReactElement` | — |
| `resolveInitial` | `Promise<InitialThemeResolution<T>>` | — |

---


### `ThemeDocumentHtmlProps`

**Extends** `Omit<HTMLAttributes<HTMLHtmlElement>, "lang" | "className" | "style">`
Extra props for the document element rendered by `<theming.Document>`.

The theme-owned attributes (`data-theme*`, the merged `className`, the
`style` containing the CSS variables, and `suppressHydrationWarning`) are
written after these props, so they cannot be overridden by a caller.

| Member | Type | Description |
| ------ | ---- | ----------- |
| `about` (optional) | `string` | — |
| `accessKey` (optional) | `string` | — |
| `aria-activedescendant` (optional) | `string` | Identifies the currently active element when DOM focus is on a composite widget, textbox, group, or application. |
| `aria-atomic` (optional) | `Booleanish` | Indicates whether assistive technologies will present all, or only parts of, the changed region based on the change notifications defined by the aria-relevant attribute. |
| `aria-autocomplete` (optional) | `"none" \| "list" \| "inline" \| "both"` | Indicates whether inputting text could trigger display of one or more predictions of the user's intended value for an input and specifies how predictions would be presented if they are made. |
| `aria-braillelabel` (optional) | `string` | Defines a string value that labels the current element, which is intended to be converted into Braille. |
| `aria-brailleroledescription` (optional) | `string` | Defines a human-readable, author-localized abbreviated description for the role of an element, which is intended to be converted into Braille. |
| `aria-busy` (optional) | `Booleanish` | — |
| `aria-checked` (optional) | `boolean \| "true" \| "false" \| "mixed"` | Indicates the current "checked" state of checkboxes, radio buttons, and other widgets. |
| `aria-colcount` (optional) | `number` | Defines the total number of columns in a table, grid, or treegrid. |
| `aria-colindex` (optional) | `number` | Defines an element's column index or position with respect to the total number of columns within a table, grid, or treegrid. |
| `aria-colindextext` (optional) | `string` | Defines a human readable text alternative of aria-colindex. |
| `aria-colspan` (optional) | `number` | Defines the number of columns spanned by a cell or gridcell within a table, grid, or treegrid. |
| `aria-controls` (optional) | `string` | Identifies the element (or elements) whose contents or presence are controlled by the current element. |
| `aria-current` (optional) | `boolean \| "true" \| "false" \| "page" \| "step" \| "location" \| "date" \| "time"` | Indicates the element that represents the current item within a container or set of related elements. |
| `aria-describedby` (optional) | `string` | Identifies the element (or elements) that describes the object. |
| `aria-description` (optional) | `string` | Defines a string value that describes or annotates the current element. |
| `aria-details` (optional) | `string` | Identifies the element that provides a detailed, extended description for the object. |
| `aria-disabled` (optional) | `Booleanish` | Indicates that the element is perceivable but disabled, so it is not editable or otherwise operable. |
| `aria-dropeffect` (optional) | `"none" \| "link" \| "copy" \| "execute" \| "move" \| "popup"` | Indicates what functions can be performed when a dragged object is released on the drop target. |
| `aria-errormessage` (optional) | `string` | Identifies the element that provides an error message for the object. |
| `aria-expanded` (optional) | `Booleanish` | Indicates whether the element, or another grouping element it controls, is currently expanded or collapsed. |
| `aria-flowto` (optional) | `string` | Identifies the next element (or elements) in an alternate reading order of content which, at the user's discretion, allows assistive technology to override the general default of reading in document source order. |
| `aria-grabbed` (optional) | `Booleanish` | Indicates an element's "grabbed" state in a drag-and-drop operation. |
| `aria-haspopup` (optional) | `boolean \| "true" \| "false" \| "dialog" \| "grid" \| "listbox" \| "menu" \| "tree"` | Indicates the availability and type of interactive popup element, such as menu or dialog, that can be triggered by an element. |
| `aria-hidden` (optional) | `Booleanish` | Indicates whether the element is exposed to an accessibility API. |
| `aria-invalid` (optional) | `boolean \| "true" \| "false" \| "grammar" \| "spelling"` | Indicates the entered value does not conform to the format expected by the application. |
| `aria-keyshortcuts` (optional) | `string` | Indicates keyboard shortcuts that an author has implemented to activate or give focus to an element. |
| `aria-label` (optional) | `string` | Defines a string value that labels the current element. |
| `aria-labelledby` (optional) | `string` | Identifies the element (or elements) that labels the current element. |
| `aria-level` (optional) | `number` | Defines the hierarchical level of an element within a structure. |
| `aria-live` (optional) | `"off" \| "assertive" \| "polite"` | Indicates that an element will be updated, and describes the types of updates the user agents, assistive technologies, and user can expect from the live region. |
| `aria-modal` (optional) | `Booleanish` | Indicates whether an element is modal when displayed. |
| `aria-multiline` (optional) | `Booleanish` | Indicates whether a text box accepts multiple lines of input or only a single line. |
| `aria-multiselectable` (optional) | `Booleanish` | Indicates that the user may select more than one item from the current selectable descendants. |
| `aria-orientation` (optional) | `"horizontal" \| "vertical"` | Indicates whether the element's orientation is horizontal, vertical, or unknown/ambiguous. |
| `aria-owns` (optional) | `string` | Identifies an element (or elements) in order to define a visual, functional, or contextual parent/child relationship between DOM elements where the DOM hierarchy cannot be used to represent the relationship. |
| `aria-placeholder` (optional) | `string` | Defines a short hint (a word or short phrase) intended to aid the user with data entry when the control has no value. A hint could be a sample value or a brief description of the expected format. |
| `aria-posinset` (optional) | `number` | Defines an element's number or position in the current set of listitems or treeitems. Not required if all elements in the set are present in the DOM. |
| `aria-pressed` (optional) | `boolean \| "true" \| "false" \| "mixed"` | Indicates the current "pressed" state of toggle buttons. |
| `aria-readonly` (optional) | `Booleanish` | Indicates that the element is not editable, but is otherwise operable. |
| `aria-relevant` (optional) | `"text" \| "additions" \| "additions removals" \| "additions text" \| "all" \| "removals" \| "removals additions" \| "removals text" \| "text additions" \| "text removals"` | Indicates what notifications the user agent will trigger when the accessibility tree within a live region is modified. |
| `aria-required` (optional) | `Booleanish` | Indicates that user input is required on the element before a form may be submitted. |
| `aria-roledescription` (optional) | `string` | Defines a human-readable, author-localized description for the role of an element. |
| `aria-rowcount` (optional) | `number` | Defines the total number of rows in a table, grid, or treegrid. |
| `aria-rowindex` (optional) | `number` | Defines an element's row index or position with respect to the total number of rows within a table, grid, or treegrid. |
| `aria-rowindextext` (optional) | `string` | Defines a human readable text alternative of aria-rowindex. |
| `aria-rowspan` (optional) | `number` | Defines the number of rows spanned by a cell or gridcell within a table, grid, or treegrid. |
| `aria-selected` (optional) | `Booleanish` | Indicates the current "selected" state of various widgets. |
| `aria-setsize` (optional) | `number` | Defines the number of items in the current set of listitems or treeitems. Not required if all elements in the set are present in the DOM. |
| `aria-sort` (optional) | `"none" \| "ascending" \| "descending" \| "other"` | Indicates if items in a table or grid are sorted in ascending or descending order. |
| `aria-valuemax` (optional) | `number` | Defines the maximum allowed value for a range widget. |
| `aria-valuemin` (optional) | `number` | Defines the minimum allowed value for a range widget. |
| `aria-valuenow` (optional) | `number` | Defines the current value for a range widget. |
| `aria-valuetext` (optional) | `string` | Defines the human readable text alternative of aria-valuenow for a range widget. |
| `autoCapitalize` (optional) | `string & object \| "off" \| "none" \| "on" \| "sentences" \| "words" \| "characters"` | — |
| `autoCorrect` (optional) | `string` | — |
| `autoFocus` (optional) | `boolean` | — |
| `autoSave` (optional) | `string` | — |
| `children` (optional) | `ReactNode` | — |
| `className` (optional) | `string` | Classes merged with the configuration's `className` and, when enabled, `tv-scrollbar`. The combined value is rendered once, so the server and the hydrated client agree on the attribute. |
| `color` (optional) | `string` | — |
| `content` (optional) | `string` | — |
| `contentEditable` (optional) | `Booleanish \| "inherit" \| "plaintext-only"` | — |
| `contextMenu` (optional) | `string` | — |
| `dangerouslySetInnerHTML` (optional) | `{ }` | — |
| `datatype` (optional) | `string` | — |
| `defaultChecked` (optional) | `boolean` | — |
| `defaultValue` (optional) | `string \| number \| readonly string[]` | — |
| `dir` (optional) | `"auto" \| "ltr" \| "rtl"` | The document text direction, rendered as `<html dir="…">`. |
| `draggable` (optional) | `Booleanish` | — |
| `enterKeyHint` (optional) | `"enter" \| "done" \| "go" \| "next" \| "previous" \| "search" \| "send"` | — |
| `exportparts` (optional) | `string` | — |
| `hidden` (optional) | `boolean` | — |
| `id` (optional) | `string` | — |
| `inert` (optional) | `boolean` | — |
| `inlist` (optional) | `any` | — |
| `inputMode` (optional) | `"none" \| "search" \| "text" \| "tel" \| "url" \| "email" \| "numeric" \| "decimal"` | Hints at the type of data that might be entered by the user while editing the element or its contents |
| `is` (optional) | `string` | Specify that a standard HTML element should behave like a defined custom built-in element |
| `itemID` (optional) | `string` | — |
| `itemProp` (optional) | `string` | — |
| `itemRef` (optional) | `string` | — |
| `itemScope` (optional) | `boolean` | — |
| `itemType` (optional) | `string` | — |
| `lang` (optional) | `string` | The document language, rendered as `<html lang="…">`. |
| `nonce` (optional) | `string` | — |
| `onAbort` (optional) | `ReactEventHandler<HTMLHtmlElement>` | — |
| `onAbortCapture` (optional) | `ReactEventHandler<HTMLHtmlElement>` | — |
| `onAnimationEnd` (optional) | `AnimationEventHandler<HTMLHtmlElement>` | — |
| `onAnimationEndCapture` (optional) | `AnimationEventHandler<HTMLHtmlElement>` | — |
| `onAnimationIteration` (optional) | `AnimationEventHandler<HTMLHtmlElement>` | — |
| `onAnimationIterationCapture` (optional) | `AnimationEventHandler<HTMLHtmlElement>` | — |
| `onAnimationStart` (optional) | `AnimationEventHandler<HTMLHtmlElement>` | — |
| `onAnimationStartCapture` (optional) | `AnimationEventHandler<HTMLHtmlElement>` | — |
| `onAuxClick` (optional) | `MouseEventHandler<HTMLHtmlElement>` | — |
| `onAuxClickCapture` (optional) | `MouseEventHandler<HTMLHtmlElement>` | — |
| `onBeforeInput` (optional) | `InputEventHandler<HTMLHtmlElement>` | — |
| `onBeforeInputCapture` (optional) | `InputEventHandler<HTMLHtmlElement>` | — |
| `onBeforeToggle` (optional) | `ToggleEventHandler<HTMLHtmlElement>` | — |
| `onBlur` (optional) | `FocusEventHandler<HTMLHtmlElement>` | — |
| `onBlurCapture` (optional) | `FocusEventHandler<HTMLHtmlElement>` | — |
| `onCanPlay` (optional) | `ReactEventHandler<HTMLHtmlElement>` | — |
| `onCanPlayCapture` (optional) | `ReactEventHandler<HTMLHtmlElement>` | — |
| `onCanPlayThrough` (optional) | `ReactEventHandler<HTMLHtmlElement>` | — |
| `onCanPlayThroughCapture` (optional) | `ReactEventHandler<HTMLHtmlElement>` | — |
| `onChange` (optional) | `ChangeEventHandler<HTMLHtmlElement, Element>` | — |
| `onChangeCapture` (optional) | `ChangeEventHandler<HTMLHtmlElement, Element>` | — |
| `onClick` (optional) | `MouseEventHandler<HTMLHtmlElement>` | — |
| `onClickCapture` (optional) | `MouseEventHandler<HTMLHtmlElement>` | — |
| `onCompositionEnd` (optional) | `CompositionEventHandler<HTMLHtmlElement>` | — |
| `onCompositionEndCapture` (optional) | `CompositionEventHandler<HTMLHtmlElement>` | — |
| `onCompositionStart` (optional) | `CompositionEventHandler<HTMLHtmlElement>` | — |
| `onCompositionStartCapture` (optional) | `CompositionEventHandler<HTMLHtmlElement>` | — |
| `onCompositionUpdate` (optional) | `CompositionEventHandler<HTMLHtmlElement>` | — |
| `onCompositionUpdateCapture` (optional) | `CompositionEventHandler<HTMLHtmlElement>` | — |
| `onContextMenu` (optional) | `MouseEventHandler<HTMLHtmlElement>` | — |
| `onContextMenuCapture` (optional) | `MouseEventHandler<HTMLHtmlElement>` | — |
| `onCopy` (optional) | `ClipboardEventHandler<HTMLHtmlElement>` | — |
| `onCopyCapture` (optional) | `ClipboardEventHandler<HTMLHtmlElement>` | — |
| `onCut` (optional) | `ClipboardEventHandler<HTMLHtmlElement>` | — |
| `onCutCapture` (optional) | `ClipboardEventHandler<HTMLHtmlElement>` | — |
| `onDoubleClick` (optional) | `MouseEventHandler<HTMLHtmlElement>` | — |
| `onDoubleClickCapture` (optional) | `MouseEventHandler<HTMLHtmlElement>` | — |
| `onDrag` (optional) | `DragEventHandler<HTMLHtmlElement>` | — |
| `onDragCapture` (optional) | `DragEventHandler<HTMLHtmlElement>` | — |
| `onDragEnd` (optional) | `DragEventHandler<HTMLHtmlElement>` | — |
| `onDragEndCapture` (optional) | `DragEventHandler<HTMLHtmlElement>` | — |
| `onDragEnter` (optional) | `DragEventHandler<HTMLHtmlElement>` | — |
| `onDragEnterCapture` (optional) | `DragEventHandler<HTMLHtmlElement>` | — |
| `onDragExit` (optional) | `DragEventHandler<HTMLHtmlElement>` | — |
| `onDragExitCapture` (optional) | `DragEventHandler<HTMLHtmlElement>` | — |
| `onDragLeave` (optional) | `DragEventHandler<HTMLHtmlElement>` | — |
| `onDragLeaveCapture` (optional) | `DragEventHandler<HTMLHtmlElement>` | — |
| `onDragOver` (optional) | `DragEventHandler<HTMLHtmlElement>` | — |
| `onDragOverCapture` (optional) | `DragEventHandler<HTMLHtmlElement>` | — |
| `onDragStart` (optional) | `DragEventHandler<HTMLHtmlElement>` | — |
| `onDragStartCapture` (optional) | `DragEventHandler<HTMLHtmlElement>` | — |
| `onDrop` (optional) | `DragEventHandler<HTMLHtmlElement>` | — |
| `onDropCapture` (optional) | `DragEventHandler<HTMLHtmlElement>` | — |
| `onDurationChange` (optional) | `ReactEventHandler<HTMLHtmlElement>` | — |
| `onDurationChangeCapture` (optional) | `ReactEventHandler<HTMLHtmlElement>` | — |
| `onEmptied` (optional) | `ReactEventHandler<HTMLHtmlElement>` | — |
| `onEmptiedCapture` (optional) | `ReactEventHandler<HTMLHtmlElement>` | — |
| `onEncrypted` (optional) | `ReactEventHandler<HTMLHtmlElement>` | — |
| `onEncryptedCapture` (optional) | `ReactEventHandler<HTMLHtmlElement>` | — |
| `onEnded` (optional) | `ReactEventHandler<HTMLHtmlElement>` | — |
| `onEndedCapture` (optional) | `ReactEventHandler<HTMLHtmlElement>` | — |
| `onError` (optional) | `ReactEventHandler<HTMLHtmlElement>` | — |
| `onErrorCapture` (optional) | `ReactEventHandler<HTMLHtmlElement>` | — |
| `onFocus` (optional) | `FocusEventHandler<HTMLHtmlElement>` | — |
| `onFocusCapture` (optional) | `FocusEventHandler<HTMLHtmlElement>` | — |
| `onGotPointerCapture` (optional) | `PointerEventHandler<HTMLHtmlElement>` | — |
| `onGotPointerCaptureCapture` (optional) | `PointerEventHandler<HTMLHtmlElement>` | — |
| `onInput` (optional) | `InputEventHandler<HTMLHtmlElement>` | — |
| `onInputCapture` (optional) | `InputEventHandler<HTMLHtmlElement>` | — |
| `onInvalid` (optional) | `ReactEventHandler<HTMLHtmlElement>` | — |
| `onInvalidCapture` (optional) | `ReactEventHandler<HTMLHtmlElement>` | — |
| `onKeyDown` (optional) | `KeyboardEventHandler<HTMLHtmlElement>` | — |
| `onKeyDownCapture` (optional) | `KeyboardEventHandler<HTMLHtmlElement>` | — |
| `onKeyPress` (optional) | `KeyboardEventHandler<HTMLHtmlElement>` | — |
| `onKeyPressCapture` (optional) | `KeyboardEventHandler<HTMLHtmlElement>` | — |
| `onKeyUp` (optional) | `KeyboardEventHandler<HTMLHtmlElement>` | — |
| `onKeyUpCapture` (optional) | `KeyboardEventHandler<HTMLHtmlElement>` | — |
| `onLoad` (optional) | `ReactEventHandler<HTMLHtmlElement>` | — |
| `onLoadCapture` (optional) | `ReactEventHandler<HTMLHtmlElement>` | — |
| `onLoadedData` (optional) | `ReactEventHandler<HTMLHtmlElement>` | — |
| `onLoadedDataCapture` (optional) | `ReactEventHandler<HTMLHtmlElement>` | — |
| `onLoadedMetadata` (optional) | `ReactEventHandler<HTMLHtmlElement>` | — |
| `onLoadedMetadataCapture` (optional) | `ReactEventHandler<HTMLHtmlElement>` | — |
| `onLoadStart` (optional) | `ReactEventHandler<HTMLHtmlElement>` | — |
| `onLoadStartCapture` (optional) | `ReactEventHandler<HTMLHtmlElement>` | — |
| `onLostPointerCapture` (optional) | `PointerEventHandler<HTMLHtmlElement>` | — |
| `onLostPointerCaptureCapture` (optional) | `PointerEventHandler<HTMLHtmlElement>` | — |
| `onMouseDown` (optional) | `MouseEventHandler<HTMLHtmlElement>` | — |
| `onMouseDownCapture` (optional) | `MouseEventHandler<HTMLHtmlElement>` | — |
| `onMouseEnter` (optional) | `MouseEventHandler<HTMLHtmlElement>` | — |
| `onMouseLeave` (optional) | `MouseEventHandler<HTMLHtmlElement>` | — |
| `onMouseMove` (optional) | `MouseEventHandler<HTMLHtmlElement>` | — |
| `onMouseMoveCapture` (optional) | `MouseEventHandler<HTMLHtmlElement>` | — |
| `onMouseOut` (optional) | `MouseEventHandler<HTMLHtmlElement>` | — |
| `onMouseOutCapture` (optional) | `MouseEventHandler<HTMLHtmlElement>` | — |
| `onMouseOver` (optional) | `MouseEventHandler<HTMLHtmlElement>` | — |
| `onMouseOverCapture` (optional) | `MouseEventHandler<HTMLHtmlElement>` | — |
| `onMouseUp` (optional) | `MouseEventHandler<HTMLHtmlElement>` | — |
| `onMouseUpCapture` (optional) | `MouseEventHandler<HTMLHtmlElement>` | — |
| `onPaste` (optional) | `ClipboardEventHandler<HTMLHtmlElement>` | — |
| `onPasteCapture` (optional) | `ClipboardEventHandler<HTMLHtmlElement>` | — |
| `onPause` (optional) | `ReactEventHandler<HTMLHtmlElement>` | — |
| `onPauseCapture` (optional) | `ReactEventHandler<HTMLHtmlElement>` | — |
| `onPlay` (optional) | `ReactEventHandler<HTMLHtmlElement>` | — |
| `onPlayCapture` (optional) | `ReactEventHandler<HTMLHtmlElement>` | — |
| `onPlaying` (optional) | `ReactEventHandler<HTMLHtmlElement>` | — |
| `onPlayingCapture` (optional) | `ReactEventHandler<HTMLHtmlElement>` | — |
| `onPointerCancel` (optional) | `PointerEventHandler<HTMLHtmlElement>` | — |
| `onPointerCancelCapture` (optional) | `PointerEventHandler<HTMLHtmlElement>` | — |
| `onPointerDown` (optional) | `PointerEventHandler<HTMLHtmlElement>` | — |
| `onPointerDownCapture` (optional) | `PointerEventHandler<HTMLHtmlElement>` | — |
| `onPointerEnter` (optional) | `PointerEventHandler<HTMLHtmlElement>` | — |
| `onPointerLeave` (optional) | `PointerEventHandler<HTMLHtmlElement>` | — |
| `onPointerMove` (optional) | `PointerEventHandler<HTMLHtmlElement>` | — |
| `onPointerMoveCapture` (optional) | `PointerEventHandler<HTMLHtmlElement>` | — |
| `onPointerOut` (optional) | `PointerEventHandler<HTMLHtmlElement>` | — |
| `onPointerOutCapture` (optional) | `PointerEventHandler<HTMLHtmlElement>` | — |
| `onPointerOver` (optional) | `PointerEventHandler<HTMLHtmlElement>` | — |
| `onPointerOverCapture` (optional) | `PointerEventHandler<HTMLHtmlElement>` | — |
| `onPointerUp` (optional) | `PointerEventHandler<HTMLHtmlElement>` | — |
| `onPointerUpCapture` (optional) | `PointerEventHandler<HTMLHtmlElement>` | — |
| `onProgress` (optional) | `ReactEventHandler<HTMLHtmlElement>` | — |
| `onProgressCapture` (optional) | `ReactEventHandler<HTMLHtmlElement>` | — |
| `onRateChange` (optional) | `ReactEventHandler<HTMLHtmlElement>` | — |
| `onRateChangeCapture` (optional) | `ReactEventHandler<HTMLHtmlElement>` | — |
| `onReset` (optional) | `ReactEventHandler<HTMLHtmlElement>` | — |
| `onResetCapture` (optional) | `ReactEventHandler<HTMLHtmlElement>` | — |
| `onScroll` (optional) | `UIEventHandler<HTMLHtmlElement>` | — |
| `onScrollCapture` (optional) | `UIEventHandler<HTMLHtmlElement>` | — |
| `onScrollEnd` (optional) | `UIEventHandler<HTMLHtmlElement>` | — |
| `onScrollEndCapture` (optional) | `UIEventHandler<HTMLHtmlElement>` | — |
| `onSeeked` (optional) | `ReactEventHandler<HTMLHtmlElement>` | — |
| `onSeekedCapture` (optional) | `ReactEventHandler<HTMLHtmlElement>` | — |
| `onSeeking` (optional) | `ReactEventHandler<HTMLHtmlElement>` | — |
| `onSeekingCapture` (optional) | `ReactEventHandler<HTMLHtmlElement>` | — |
| `onSelect` (optional) | `ReactEventHandler<HTMLHtmlElement>` | — |
| `onSelectCapture` (optional) | `ReactEventHandler<HTMLHtmlElement>` | — |
| `onStalled` (optional) | `ReactEventHandler<HTMLHtmlElement>` | — |
| `onStalledCapture` (optional) | `ReactEventHandler<HTMLHtmlElement>` | — |
| `onSubmit` (optional) | `SubmitEventHandler<HTMLHtmlElement>` | — |
| `onSubmitCapture` (optional) | `SubmitEventHandler<HTMLHtmlElement>` | — |
| `onSuspend` (optional) | `ReactEventHandler<HTMLHtmlElement>` | — |
| `onSuspendCapture` (optional) | `ReactEventHandler<HTMLHtmlElement>` | — |
| `onTimeUpdate` (optional) | `ReactEventHandler<HTMLHtmlElement>` | — |
| `onTimeUpdateCapture` (optional) | `ReactEventHandler<HTMLHtmlElement>` | — |
| `onToggle` (optional) | `ToggleEventHandler<HTMLHtmlElement>` | — |
| `onTouchCancel` (optional) | `TouchEventHandler<HTMLHtmlElement>` | — |
| `onTouchCancelCapture` (optional) | `TouchEventHandler<HTMLHtmlElement>` | — |
| `onTouchEnd` (optional) | `TouchEventHandler<HTMLHtmlElement>` | — |
| `onTouchEndCapture` (optional) | `TouchEventHandler<HTMLHtmlElement>` | — |
| `onTouchMove` (optional) | `TouchEventHandler<HTMLHtmlElement>` | — |
| `onTouchMoveCapture` (optional) | `TouchEventHandler<HTMLHtmlElement>` | — |
| `onTouchStart` (optional) | `TouchEventHandler<HTMLHtmlElement>` | — |
| `onTouchStartCapture` (optional) | `TouchEventHandler<HTMLHtmlElement>` | — |
| `onTransitionCancel` (optional) | `TransitionEventHandler<HTMLHtmlElement>` | — |
| `onTransitionCancelCapture` (optional) | `TransitionEventHandler<HTMLHtmlElement>` | — |
| `onTransitionEnd` (optional) | `TransitionEventHandler<HTMLHtmlElement>` | — |
| `onTransitionEndCapture` (optional) | `TransitionEventHandler<HTMLHtmlElement>` | — |
| `onTransitionRun` (optional) | `TransitionEventHandler<HTMLHtmlElement>` | — |
| `onTransitionRunCapture` (optional) | `TransitionEventHandler<HTMLHtmlElement>` | — |
| `onTransitionStart` (optional) | `TransitionEventHandler<HTMLHtmlElement>` | — |
| `onTransitionStartCapture` (optional) | `TransitionEventHandler<HTMLHtmlElement>` | — |
| `onVolumeChange` (optional) | `ReactEventHandler<HTMLHtmlElement>` | — |
| `onVolumeChangeCapture` (optional) | `ReactEventHandler<HTMLHtmlElement>` | — |
| `onWaiting` (optional) | `ReactEventHandler<HTMLHtmlElement>` | — |
| `onWaitingCapture` (optional) | `ReactEventHandler<HTMLHtmlElement>` | — |
| `onWheel` (optional) | `WheelEventHandler<HTMLHtmlElement>` | — |
| `onWheelCapture` (optional) | `WheelEventHandler<HTMLHtmlElement>` | — |
| `part` (optional) | `string` | — |
| `popover` (optional) | `"" \| "auto" \| "manual" \| "hint"` | — |
| `popoverTarget` (optional) | `string` | — |
| `popoverTargetAction` (optional) | `"toggle" \| "show" \| "hide"` | — |
| `prefix` (optional) | `string` | — |
| `property` (optional) | `string` | — |
| `radioGroup` (optional) | `string` | — |
| `rel` (optional) | `string` | — |
| `resource` (optional) | `string` | — |
| `results` (optional) | `number` | — |
| `rev` (optional) | `string` | — |
| `role` (optional) | `AriaRole` | — |
| `security` (optional) | `string` | — |
| `slot` (optional) | `string` | — |
| `spellCheck` (optional) | `Booleanish` | — |
| `style` (optional) | `CSSProperties` | Inline styles merged after the theme's CSS variables. Use it for layout properties; the resolved `color-scheme` and `--theme-*` variables are owned by the shell. |
| `suppressContentEditableWarning` (optional) | `boolean` | — |
| `suppressHydrationWarning` (optional) | `boolean` | — |
| `tabIndex` (optional) | `number` | — |
| `title` (optional) | `string` | — |
| `translate` (optional) | `"yes" \| "no"` | — |
| `typeof` (optional) | `string` | — |
| `unselectable` (optional) | `"off" \| "on"` | — |
| `vocab` (optional) | `string` | — |

---


### `ThemeDocumentProps<T extends ThemeDefinition>`
Props for the document component created by
createThemeDocument.

| Member | Type | Description |
| ------ | ---- | ----------- |
| `afterContent` (optional) | `ReactNode` | Framework body-end content (for example `<ScrollRestoration />` and `<Scripts />`). |
| `bodyProps` (optional) | `ThemeDocumentBodyProps` | Extra props for `<body>`; see ThemeDocumentBodyProps. |
| `children` | `ReactNode` | The application tree rendered inside the theme provider. |
| `head` (optional) | `readonly ThemeDocumentHeadContent[]` | Framework head content, as an array of head elements. Only head-valid intrinsic elements (`meta`, `link`, `title`, `style`, `script`, `base`, `noscript`, `template`) and components such as React Router's `<Meta />`/`<Links />` are accepted. The array is deliberate: React 19 types every JSX expression as `ReactElement<any, any>`, so invalid children inside `<>…</>` would slip through. The array rejects a fragment at the prop boundary; an invalid intrinsic element that reaches the array is rejected with a clear error when the document renders. |
| `htmlProps` (optional) | `ThemeDocumentHtmlProps` | Extra props for `<html>`. Theme-owned attributes win over the same keys here. See ThemeDocumentHtmlProps for the documented `lang`, `className`, `style` and `dir` behaviour. |
| `initial` (optional) | `InitialThemeResolution<T> \| null` | The request-resolved state from ThemeDocumentHandle.resolveInitial. Optional on purpose: React Router can render the root `Layout` while the root loader is unavailable (an error response, a hydration fallback). When it is missing or `null`, the document renders the configuration's static fallback instead of throwing a second error inside the boundary. |

---


### `ThemeDocumentProviderProps<T extends ThemeDefinition>`
Props for the provider created by createThemeDocument.

| Member | Type | Description |
| ------ | ---- | ----------- |
| `children` | `ReactNode` | The application tree rendered inside the provider. |
| `initial` (optional) | `InitialThemeResolution<T> \| null` | The request-resolved state from ThemeDocumentHandle.resolveInitial. |

---


### `ThemeHeadProps<T extends ThemeDefinition>`
Props for the Remix `ThemeHead` component. Describes the theme registry and
the fallback selection used to build the blocking bootstrap script and the
dark-mode CSS fallback.

**See also:** `ThemeProvider`

| Member | Type | Description |
| ------ | ---- | ----------- |
| `defaultTheme` (optional) | `ThemeIdentifier<T>` | Fallback theme name when no selection is persisted. |
| `mode` (optional) | `ThemeMode` | Fallback mode when no selection is persisted. Defaults to the fallback theme's own mode — whatever `defaultTheme` resolves to. Pass `"system"` to follow `prefers-color-scheme` instead, and give `ThemeProvider` the matching `initialMode` so the script and the runtime resolve the same theme on a first visit. Leaving the two out of step produces a wrong-theme flash: the script paints one theme and the runtime corrects it. |
| `scrollbar` (optional) | `boolean` | Hide the native scrollbar from the very first paint, so the Themvora overlay (`ThemeScrollbar`) is the only scrollbar from frame one — no native-bar-then-overlay swap while the bundle hydrates. Defaults to `false`. |
| `themeOverride` (optional) | `ThemeOverride<ThemeIdentifier<T>>` | An explicit theme override, applied by the pre-paint script over any persisted selection. Pass the same value given to ThemeProvider. |
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
| `defaultTheme` (optional) | `ThemeIdentifier<T>` | Fallback theme when no selection is persisted. Accepts a supplied theme **name** (`"cocoa-light"`) or a **family** (`"cocoa"`); a family resolves to the variant for the mode in effect. |
| `initial` (optional) | `InitialThemeResolution<T>` | The SSR-resolved initial theme state (from `getInitialThemeState`). When provided, it wins on first paint so hydration matches exactly and the selection is mirrored back to cookies. |
| `initialFamily` (optional) | `ThemeIdentifier<T>` | Family used when neither `initial` nor a persisted selection is available. Pair it with `initialMode` for the same reason. Constrained to the identifiers in `themes` when they are statically known. A variant name is accepted and normalised to its family; its mode applies only when `initialMode` is absent. |
| `initialMode` (optional) | `ThemeMode` | Mode used when neither `initial` nor a persisted selection is available. Optional: the runtime and `ThemeHead`'s script both derive the fallback mode from `defaultTheme` by default, so they already agree. Set this to pin a mode the script would not derive — e.g. `"system"` to follow `prefers-color-scheme` — and pass the same value to `ThemeHead`. Ignored when `initial` is provided, since the SSR resolution wins. |
| `scheduled` (optional) | `false \| ScheduledThemeOptions<T>` | Sunrise/sunset schedule forwarded to the runtime. Same contract as `@themvora/react`'s provider; `createThemeDocument()` forwards its `scheduled` option through this prop. |
| `themeOverride` (optional) | `ThemeOverride<ThemeIdentifier<T>>` | An explicit theme override applied over any persisted selection. Applied once per value, never written to the theme cookies, and it does not fight a later manual selection. For a flash-free override, pass the same value to ThemeHead so the pre-paint script resolves it too. |
| `themes` (optional) | `readonly T[]` | The theme registry the selection is resolved against. |
| `transition` (optional) | `boolean \| ThemeTransitionOptions` | Transition configuration forwarded to the runtime: `true`, `false`, or `{ enabled, duration, easing, preset, … }`. Same contract as `@themvora/react`'s provider. `createThemeDocument()` forwards its `transition` option through this prop, so the new single-configuration API can express everything the provider accepts. |

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


### `ThemeShellOptions`
Extra props merged onto the shell attributes computed by
getThemeShellProps.

| Member | Type | Description |
| ------ | ---- | ----------- |
| `className` (optional) | `string` | Classes rendered on `<html>` alongside the theme's own. Kept stable across renders: the overlay scrollbar engine adds `tv-scrollbar-ready` to the same attribute, and React rewrites `class` wholesale whenever the prop it was given changes — which would take the engine's marker with it and leave the overlay permanently faded out. |
| `scrollbar` (optional) | `boolean` | Render the `tv-scrollbar` class, so the pre-paint stylesheet hides the native bar from the first frame. Pair it with `scrollbar` on ThemeHead: the class scopes the CSS and the CSS does the hiding, so either half alone does nothing. This is the Remix-side equivalent of `@themvora/next`'s `scrollbar` prop — Remix owns the document, so the class has to come from the layout. |
| `style` (optional) | `CSSProperties` | Inline styles merged after the theme's CSS variables. |

---


### `ThemeShellProps`
The `<html>` props produced by getThemeShellProps: the theme
attributes and CSS variables the pre-paint script writes, plus the
hydration suppression that covers the parts of them the server cannot know.

| Member | Type | Description |
| ------ | ---- | ----------- |
| `className` (optional) | `string` | Extra classes, plus `tv-scrollbar` when `scrollbar` was requested. |
| `data-theme` | `string` | The resolved theme's name, as `data-theme`. |
| `data-theme-family` (optional) | `string` | The resolved theme's family, when it declares one. |
| `data-theme-mode` | `"light" \| "dark"` | The resolved mode (`light` / `dark`) the theme was painted with. |
| `data-theme-ready` | `"true"` | Completion marker: the bootstrap ran, so the document is themed. |
| `data-theme-selection-family` (optional) | `string` | The visitor's chosen family, when one was resolved. |
| `data-theme-selection-mode` | `ThemeMode` | The visitor's chosen mode, which `"system"` is not reduced from. |
| `style` | `CSSProperties` | `color-scheme` plus the resolved theme's `--theme-*` variables. |
| `suppressHydrationWarning` | `true` | Suppresses React's attribute diff for this element only. Always `true`. |

Assignable to a React `<html>` element by construction — spread it and add
the app's own props (`lang`, a `className`) around it.

---

## Type Aliases

### `ThemeDocumentHeadContent`
Framework head content accepted by `<theming.Document head={[…]}>`.

`head` is an **array**, not a fragment. React 19 types every JSX expression
as `ReactElement<any, any>`, so TypeScript cannot distinguish `<div>` from
`<meta>` by element type. The array rejects fragments at the prop boundary;
the document then validates the rendered tree and throws a descriptive error
for an invalid intrinsic element such as `<div>`.

`ThemeDocumentHeadElement | readonly ThemeDocumentHeadContent[] | string | number | boolean | null | undefined`

---


### `ThemeDocumentHeadElement`
One element accepted in the document `<head>`.

Intrinsic elements are restricted to ThemeDocumentHeadTag; components
such as React Router's `<Meta />` and `<Links />` are allowed because their
output is a documented head fragment.

`React.ReactElement<unknown, ThemeDocumentHeadTag> | React.ReactElement<unknown, React.JSXElementConstructor<any>>`

---


### `ThemeDocumentHeadTag`
Intrinsic elements React permits inside `<head>`.

`"base" | "link" | "meta" | "title" | "style" | "script" | "noscript" | "template"`

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
- [Remix v2](/framework-guides/remix) — the framework integration
