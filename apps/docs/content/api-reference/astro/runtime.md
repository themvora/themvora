## @themvora/astro/runtime
Browser entry for the Themvora Astro integration
(`@themvora/astro/runtime`).

This is the **framework-neutral client API**, and it is the entry a `<script>`
in a `.astro` file should import. It ships the global runtime controller —
`getThemeController()` / `createThemeController()` — plus the low-level
shared-runtime accessors, and it imports no client framework.

> Generated from `packages/astro/src` by `apps/docs/scripts/generate-api-reference.mjs`. Do not edit by hand — run `pnpm --filter @themvora/docs api:generate`.

## Functions

### `createThemeController<T extends ThemeDefinition<string>>(options): ThemeController<T>`
Creates a controller over a **new** runtime and installs it as the app-wide
runtime.

**See also:** `getThemeController`, `ThemeController`

| Parameter | Type | Description |
| --------- | ---- | ----------- |
| `options` | `ThemeControllerOptions<T>` | Overrides for the transported application configuration (see ThemeControllerOptions). |

**Returns** `ThemeController<T>` — A new controller owning a new runtime.

Prefer getThemeController in application code: this function replaces
any runtime already installed, so two calls give two runtimes racing to write
`<html>`.

```ts
import { createThemeController } from "@themvora/astro";

const theme = createThemeController({ themes: myTestThemes });
theme.setMode("dark");
```

---


### `getGlobalRuntime<T extends ThemeDefinition<string>>(): ThemeRuntime<T> | null`
Returns the app-wide global runtime, or `null` when none has been installed
yet (e.g. before `ThemeProviderClient` mounts).

**See also:** `setGlobalRuntime`

**Returns** `ThemeRuntime<T> | null` — The installed runtime, or `null`.

---


### `getThemeController<T extends ThemeDefinition<string>>(options): ThemeController<T>`
The app-wide ThemeController, created on first call.

**See also:** `ThemeController`, `createThemeController`, `getGlobalRuntime`

| Parameter | Type | Description |
| --------- | ---- | ----------- |
| `options` | `ThemeControllerOptions<T>` | Overrides, honoured only on the call that creates the controller (see ThemeControllerOptions). |

**Returns** `ThemeController<T>` — The shared controller.

**One runtime per document.** The provider, `<ThemeToggle />`, a hand-written
`<script>` and a React island all end up here, and the first caller wins:
every later call returns the same controller rather than building a second
runtime that would fight the first over `<html>`. That is what lets a page go
from `<Provider>` to `<ThemeToggle />` with no per-page `initialMode` /
`initialFamily` and no React island.

If a runtime is already installed — a React island created one — this adopts
it instead of replacing it, so the two surfaces share one runtime and one
state.

Browser-only. It reads the transported configuration, the persisted selection
and `prefers-color-scheme`, none of which exist on a server — call it from a
`<script>`, never from Astro frontmatter.

```ts
<button id="theme-toggle">Toggle theme</button>

<script>
  import { getThemeController } from "@themvora/astro";

  const theme = getThemeController();

  document
    .querySelector("#theme-toggle")
    ?.addEventListener("click", () => theme.toggleTheme());
</script>
```

---


### `installThemeBindings(): void`
Installs the delegated DOM bindings for the Themvora contracts.

**See also:** `THEME_SELECTION_ATTRIBUTE`, `THEME_TOGGLE_ATTRIBUTE`

**Returns** `void`

Two contracts, one listener each, registered once per document:

| Contract | Event | Effect |
| -------- | ----- | ------ |
| `[data-tv-toggle]` | `click` | `toggleTheme()` |
| `[data-tv-select]` | `change` | `setFamily()` / `setMode()` from `value` |

The `change` listener is the input half of `[data-tv-select]`; the output half
— writing the live selection back into the element — lives in
`syncSelectionControls`, and `[data-tv-pressed]` (a segmented control's
`aria-pressed`) is mirrored by `syncPressedControls` on the same change. A
page that renders `<ThemeToggle />` and a segmented control therefore needs no
script of its own, and the two controls cannot disagree.

**Delegated, not per-element.** This is the fix for the interaction bug, not
a style preference. Astro bundles a component's `<script>` once per page, so
a component that rendered the select cannot know how many instances the page
has — `getElementById` binds one of them. And Astro's module scripts never
re-execute across `<ClientRouter />` navigations, so a page you navigate back
to keeps the listeners its *first* visit registered and no others. A
`document`-level listener has neither problem: it is registered once and
matches whatever the DOM contains at the moment the event fires.

**Lazy.** Nothing here creates a runtime. The controller is resolved on the
first interaction, so a page that renders a control but is never used ships
the script and pays nothing else — the runtime, its persistence adapter and
its cross-tab channel are still created on demand.

Safe to call more than once, and safe to call on the server (a no-op).

```ts
<select data-tv-select="family">
  <option value="mint">mint</option>
  <option value="cocoa">cocoa</option>
</select>

<script>
  import { installThemeBindings } from "@themvora/astro/runtime";
  installThemeBindings();
</script>
```

---


### `requireGlobalRuntime<T extends ThemeDefinition<string>>(): ThemeRuntime<T>`
Returns the app-wide global runtime, throwing when none has been installed.

**See also:** `getGlobalRuntime`, `setGlobalRuntime`

**Returns** `ThemeRuntime<T>` — The installed runtime.

---


### `setGlobalRuntime<T extends ThemeDefinition<string>>(runtime): void`
Installs the given runtime as the app-wide global runtime and, in the
browser, publishes it where the rest of Themvora looks for it.

**See also:** `getGlobalRuntime`

| Parameter | Type | Description |
| --------- | ---- | ----------- |
| `runtime` | `ThemeRuntime<T>` | The theme runtime to install globally. |

**Returns** `void`

Three publications, all of them the same runtime:

1. the module-level `globalRuntime` — what this package's hooks read;
2. `window.__themvoraRuntime` — the documented escape hatch;
3. `document.documentElement.__themvoraRuntime` plus a `theme-ready` event —
   which is how `@themvora/web`'s custom elements (`<themvora-scrollbar>`,
   `<themvora-inspector>`, `<themvora-toggle>`, …) find a runtime. They
   resolve it by walking **DOM ancestors** for that property, and they only
   fall back to waiting for `theme-ready`, which until now was dispatched
   solely by `<themvora-provider>`. Without these two lines an Astro app
   that installs its runtime from a React island had no way to use the
   framework-neutral elements at all — the runtime existed, but nothing in
   the element tree could see it.

---

## Interfaces

### `ThemeController<T extends ThemeDefinition>`
A framework-neutral controller over the app-wide Themvora runtime.

**See also:** `getThemeController`, `createThemeController`

| Member | Type | Description |
| ------ | ---- | ----------- |
| readonly `runtime` | `ThemeRuntime<T>` | The underlying runtime, for anything the controller does not wrap. |
| `destroy` | `void` | — |
| `getFamily` | `string` | — |
| `getMode` | `ThemeMode` | — |
| `getResolvedMode` | `"light" \| "dark"` | — |
| `getTheme` | `T` | — |
| `setFamily` | `void` | — |
| `setMode` | `void` | — |
| `subscribe` | `__type(): void` | — |
| `toggleTheme` | `void` | — |

This is **not** a React hook, and not a hook of any kind: it is a plain
object with getters and setters, valid in any browser context — an Astro
`<script>`, a custom element, an event handler, a devtools console. Nothing
here re-renders; ThemeController.subscribe is how a caller observes
change.

It exists so Astro does not have to borrow React's shape. A `.astro` file has
no reactive component runtime, so `useTheme()` — a React hook, valid only
inside a React island — is the wrong abstraction there. The Astro-idiomatic
spelling is:

```ts
const theme = getThemeController();
theme.toggleTheme();
```

The React hook keeps its own shape, for React islands:

```tsx
const { theme, mode, toggleTheme } = useTheme();
```

---


### `ThemeControllerState<T extends ThemeDefinition>`
The reactive state a ThemeController publishes to its subscribers.

**See also:** `ThemeController.subscribe`

| Member | Type | Description |
| ------ | ---- | ----------- |
| `family` | `string` | The visitor's family selection. |
| `mode` | `ThemeMode` | The visitor's mode selection — `"light"`, `"dark"` or `"system"`. |
| `resolvedMode` | `"light" \| "dark"` | The mode actually applied — `"light"` or `"dark"`, never `"system"`. |
| `theme` | `T` | The resolved theme definition. |

---

## Type Aliases

### `ThemeControllerOptions<T extends ThemeDefinition>`
Options for createThemeController / getThemeController.

**See also:** `getThemeController`

`Partial<Omit<ThemeRuntimeOptions<T>, "persistence" | "readPersistenceOnInit">> & { readouts?: boolean }`

Every field is optional, and every field is an *override*. The application
configuration is already in the browser — `themvora()` transports
`theme.config.ts` as `window.__THEMVORA_CONFIG__` from `<head>` — so the
runtime is built from that. Passing `themes` / `defaultTheme` /
`initialMode` / `initialFamily` here is for a test, a storybook, or an
island that deliberately wants a different registry.

---

## Variables

### `THEME_PRESSED_ATTRIBUTE`
Marks an element as one option of a **segmented control**:
`data-tv-pressed="mode"` or `data-tv-pressed="family"`.

**See also:** `THEME_PRESSED_VALUE_ATTRIBUTE`, `THEME_READOUT_ATTRIBUTE`

`"data-tv-pressed"`

---


### `THEME_PRESSED_VALUE_ATTRIBUTE`
The option a THEME_PRESSED_ATTRIBUTE element represents, compared
against the live mode selection (`"light"` / `"dark"` / `"system"`) or the
live family selection.

`"data-tv-value"`

---


### `THEME_READOUT_ATTRIBUTE`
Opts an element into the **bootstrap readout** contract: its text is owned by
Themvora.

**See also:** `THEME_TOGGLE_ATTRIBUTE`

`"data-tv-readout"`

---


### `THEME_SELECTION_ATTRIBUTE`
Opts a `<select>` into the **selection-control** contract:
`data-tv-select="family"` or `data-tv-select="mode"`.

**See also:** `THEME_TOGGLE_ATTRIBUTE`, `THEME_READOUT_ATTRIBUTE`

`"data-tv-select"`

---


### `THEME_TOGGLE_ATTRIBUTE`
Marks an element as a Themvora theme toggle.

**See also:** `THEME_READOUT_ATTRIBUTE`

`"data-tv-toggle"`

---

## Related docs

- [Astro](/framework-guides/astro) — the framework integration
