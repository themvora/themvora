## @themvora/astro
Themvora Astro integration.

This entry point is **framework-neutral**: it ships the Astro integration
(`themvora`), the zero-flash server helpers (`createBlockingScript`,
`buildThemeCssMap`, `darkModeCSSTemplate`, `systemModeCSSTemplate`,
`computeFingerprint`, `getInitialThemeState`), the Astro-specific
`ThemePersistence`, the browser-side `getThemeController()` /
`createThemeController()` API, the shared-runtime accessors, and the
framework-neutral `ThemvoraScrollbar` / `ThemvoraInspector` re-exports from
`@themvora/web`. None of it imports React.

The React island (`ThemeProviderClient`), the React hooks, and the React
`ThemeScope` live behind the opt-in `@themvora/astro/client` subpath, which
is the only entry that depends on React.

> Generated from `packages/astro/src` by `apps/docs/scripts/generate-api-reference.mjs`. Do not edit by hand — run `pnpm --filter @themvora/docs api:generate`.

## Functions

### `buildThemeCssMap<T extends ThemeDefinition<string>>(themes, options?): Record<string, Record<string, string>>`
Build a lookup map of theme keys to flat CSS variables.

Each theme is registered twice:
- under its own `name` (e.g. `"sunrise-light"`)
- under a `family:mode` key (e.g. `"sunrise:light"`) so that a persisted
  family + effective mode can be resolved without knowing theme names.

**See also:** `createThemeBootstrapScript`

| Parameter | Type | Description |
| --------- | ---- | ----------- |
| `themes` | `readonly T[]` | — |
| `options` | `BuildThemeCssMapOptions` (optional) | — |

**Returns** `Record<string, Record<string, string>>`

---


### `computeFingerprint(themes, defaultTheme?): string`
Fingerprints a theme registry so a persisted selection from an older build —
different themes, or a different `defaultTheme` — is ignored rather than
applied against themes it was never valid for.

**See also:** `ThemeBootstrapCookieSource`, `buildBootstrapPlan`

| Parameter | Type | Description |
| --------- | ---- | ----------- |
| `themes` | `readonly ThemeDefinition<string>[]` | The theme registry to fingerprint. |
| `defaultTheme` | `string` (optional) | The fallback theme name. Included in the fingerprint, so changing it invalidates previously persisted selections. |

**Returns** `string` — A stable fingerprint string, or `""` when `themes` is empty.

The result is written to the `theme-fingerprint` cookie and compared on the
next request, so it is part of the **stable cookie contract** documented in
`VERSIONING.md` — changing the format invalidates every visitor's persisted
selection on their next visit.

It lives here, in core, because four SSR integrations
(Next, Nuxt, Astro, Remix) previously each carried a byte-identical private
copy. Any edit to one of them would have silently broken cross-framework
persistence with nothing to catch it.

---


### `createAstroThemePersistence(themes?, defaultTheme?): ThemeSelectionPersistenceAdapter | null`
Creates the client-side persistence adapter for Astro. Mirrors the theme
selection to `localStorage` (cross-tab sync, offline) AND to the theme
cookies (`theme-family` / `theme-mode` / `theme-fingerprint`) so the server
resolves the exact same state on the next request.

Reads from both: `localStorage` first, then the cookies. Reading the cookies
as well is what keeps the client runtime in agreement with the pre-paint
bootstrap script, which only ever sees cookies — a read path that ignored
them made the runtime overwrite an already-correct first paint.

**See also:** `ThemeProviderClient`

| Parameter | Type | Description |
| --------- | ---- | ----------- |
| `themes` | `readonly ThemeDefinition<string>[]` (optional) | The theme registry used to compute the config fingerprint. |
| `defaultTheme` | `string` (optional) | Fallback theme name used in the fingerprint. |

**Returns** `ThemeSelectionPersistenceAdapter | null` — A persistence adapter, or `null` when running outside the browser.

Returns `null` during SSR (no `window`). The cookie contract matches the
other SSR integrations (`@themvora/next`, `@themvora/nuxt`, `@themvora/remix`).

**Blocked storage degrades, it does not throw.** `window.localStorage` can
throw on access and `setItem` throws when the quota is full; both are treated
as "this browser cannot remember the selection". The cookie mirror is written
either way, so the server still resolves the same theme on the next request.

---


### `createBlockingScript(fingerprint, themeCssMap, options): string`
Builds the blocking, inline bootstrap script that applies the persisted
theme before first paint (zero-flash).

The script reads the theme cookies, rejects them when the config fingerprint
is stale, resolves the effective mode (`"system"` against
`prefers-color-scheme`), and writes the CSS variables plus the full DOM
contract the client runtime applies — `data-theme`, `data-theme-family`,
`data-theme-mode`, the `dark` class and `color-scheme` — onto
`document.documentElement`. Hydration therefore confirms the server-rendered
theme instead of correcting it.

It is deliberately tiny and synchronous: no runtime, no listeners, no
storage access beyond cookies, and no framework dependency.

**See also:** `buildThemeCssMap`, `buildThemeBootstrapPayload`, `darkModeCSSTemplate`

| Parameter | Type | Description |
| --------- | ---- | ----------- |
| `fingerprint` | `string` | The config fingerprint used to reject stale cookies. |
| `themeCssMap` | `Record<string, Record<string, string>>` | A map of theme keys to CSS variable records (see buildThemeCssMap). |
| `options` | `BlockingScriptOptions` | The fallback selection and theme lookup (see BlockingScriptOptions). Omit it only when the caller resolves the fallback itself. |

**Returns** `string` — The inline script string to emit in the document `<head>`.

Pass `options` so a visitor with no valid cookies is resolved against the
same fallback the runtime uses. Without it the script still corrects the
mode marker and uses the first matching `family:mode` entry it finds, but it
cannot guarantee it agrees with the client runtime.

---


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


### `darkModeCSSTemplate(variables): string`
Generate a `@media (prefers-color-scheme: dark)` CSS block carrying the given
variables.

**See also:** `systemModeCSSTemplate`

| Parameter | Type | Description |
| --------- | ---- | ----------- |
| `variables` | `Record<string, string>` | The CSS variables to emit under the dark media query. |

**Returns** `string` — A `@media (prefers-color-scheme: dark)` block targeting `:root`,
  escaped so it cannot terminate a `<style>` element (`</` becomes `</`,
  which CSS parses identically).

This is a **pre-script** fallback only, and it cannot beat an inline `style`
on the same element: inline declarations outrank every stylesheet rule
regardless of specificity. So it is only safe when nothing inlines the light
variables — do not pair it with a server render that writes them onto
`<html>`, or an OS-dark visitor keeps the light ones and this block is inert.
When the resolved mode is `"system"`, use systemModeCSSTemplate
instead: it emits both schemes and expects no inline variables.

---


### `getGlobalRuntime<T extends ThemeDefinition<string>>(): ThemeRuntime<T> | null`
Returns the app-wide global runtime, or `null` when none has been installed
yet (e.g. before `ThemeProviderClient` mounts).

**See also:** `setGlobalRuntime`

**Returns** `ThemeRuntime<T> | null` — The installed runtime, or `null`.

---


### `getInitialThemeState<T extends ThemeDefinition<string>>(request, options): Promise<InitialThemeResolution<T>>`
Resolves the initial theme state server-side from the incoming request's
theme cookies, so the server-rendered HTML is already themed and a client
island can hydrate against the exact same state (zero-flash).

Framework-neutral: only reads the standard `theme-mode` / `theme-family`
cookies, the optional `Sec-CH-Prefers-Color-Scheme` client hint, and the
theme registry, so it works from any Astro server context
(`Astro.request`) without pulling in a client framework runtime.

**See also:** `- `provider.astro`
 - `ThemeProviderClient``

| Parameter | Type | Description |
| --------- | ---- | ----------- |
| `request` | `Request` | The incoming request (e.g. `Astro.request`). |
| `options` | `GetInitialThemeStateOptions<T>` | The theme registry, fallback selection, and optional system-preference read (see GetInitialThemeStateOptions). |

**Returns** `Promise<InitialThemeResolution<T>>` — The resolved initial theme state.

Pair this with `provider.astro` (which paints the themed `<html>` on the
server) and pass the result to the opt-in React island
(`@themvora/astro/client`) as its `initial` prop so hydration matches.

```ts
---
import { getInitialThemeState } from "@themvora/astro";
import { getBuiltInThemes } from "@themvora/core";

const initial = await getInitialThemeState(Astro.request, {
  themes: getBuiltInThemes(),
  defaultTheme: "mint-light",
  mode: "system",
  systemPreference: true,
});
---
```

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


### `injectPrePaintScrollbarCSS(): void`
Injects the pre-paint scrollbar-hiding CSS and class into the document.

Framework-free (vanilla JS). Adds a `<style>` carrying the pre-paint
scrollbar CSS and the `tv-scrollbar` class to the document root so the
native scrollbar is hidden before first paint. Idempotent and a no-op on the
server.

This is a manual bootstrap helper for a page that wants the native bar hidden
before its own script runs. It is *not* how ThemvoraScrollbar hides
the bar — that happens through `createOverlayScrollbar`, which claims the
hiding and gives it back on `destroy()`. Calling this directly therefore
hides the bar without registering a claim, so pair it with
`restoreNativeScrollbar()` if you later want the native bar back.

**See also:** `ThemvoraScrollbar`

**Returns** `void`

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


### `systemModeCSSTemplate(light, dark): string`
Generate the stylesheet that resolves a `"system"` selection with CSS alone —
no script and no inline style.

**See also:** `darkModeCSSTemplate`

| Parameter | Type | Description |
| --------- | ---- | ----------- |
| `light` | `Record<string, string>` | The light theme's CSS variables. |
| `dark` | `Record<string, string>` | The dark theme's CSS variables. |

**Returns** `string` — Two media blocks, one per scheme, both targeting `:root`, escaped
  for `<style>`-element content exactly as darkModeCSSTemplate is.

Use this **instead of** inlining the resolved variables whenever the mode is
`"system"`. The two cannot be combined: an inline `style` on `<html>`
outranks any stylesheet rule, so a page that inlines the light variables and
also emits a dark media block paints light whatever the OS prefers. Measured
on a production build with page scripts blocked and the OS set to dark, that
combination painted `rgb(248, 250, 252)` (light); emitting both media blocks
and no inline variables painted `rgb(2, 6, 23)`.

`prefers-color-scheme: light` also matches when the visitor has expressed no
preference — `light` is the specified default — so the light block doubles as
the no-preference branch.

---


### `themvora(options): AstroIntegration`
Themvora Astro integration. Registers the pre-paint theme bootstrap with
Astro so every page is themed before first paint (zero-flash), without
requiring a client-side framework runtime.

**See also:** `ThemvoraIntegrationOptions`

| Parameter | Type | Description |
| --------- | ---- | ----------- |
| `options` | `ThemvoraIntegrationOptions` | The integration options (see ThemvoraIntegrationOptions). |

**Returns** `AstroIntegration` — An Astro integration to register in `astro.config.ts`.

**Config discovery.** The integration finds the application's
`theme.config.ts` in Astro's root, trying `theme.config.ts`, `.tsx`, `.mts`,
`.mjs`, `.js` and `.cjs` in that order, and requires a default export — the
object defineThemvoraConfig returns. Passing `config` skips discovery
and accepts either the object or a path to it.

**Two consumers, one declaration.** The discovered configuration is projected
twice: buildBootstrap derives the blocking script from it, and the
same projection is injected as `window.__THEMVORA_CONFIG__` from `<head>`.
The island reads that global instead of taking theme props, so the markup the
server renders and the markup the browser hydrates come from the same
registry — a mismatch there is visible as the panel repainting as the real
families replace the presets. `getInitialThemeState` publishes the same global
on the server, because no integration runs there.

When the app has no discoverable config, the built-in neutral themes are used
and nothing fails.

The integration owns the framework/build boundary only. Server-rendering the
themed `<html>` element is handled by `@themvora/astro/provider.astro`, and
interactive controls are opt-in islands — React users import the island from
`@themvora/astro/client`, which is the only entry that depends on React.

The bootstrap is injected at the **`head-inline`** stage, and that choice is
load-bearing rather than incidental. `before-hydration` looks equivalent —
both run before the island hydrates — but it ships the script as a *module*
(resolved and bundled by Vite), so it executes after the browser has already
painted. Measured on a prerendered page, where the server cannot know the
visitor's selection and always emits the default theme:

| condition | `head-inline` | `before-hydration` |
|---|---|---|
| OS dark, no cookie | dark at 84 ms, never corrected | light painted at 74 ms, corrected at 98 ms |
| dark cookie, cold cache + slow network | dark at 518 ms, never corrected | light painted at 513 ms, corrected at 1052 ms |

So `before-hydration` does not merely weaken the guarantee — it produces a
visible flash of the *wrong* theme, up to ~540 ms of it. Paint ordering
requires the inline head script; pre-hydration is not sufficient.

For a `"system"` selection the script is not the first line of defence —
CSS is. The server cannot know the visitor's preference, so it must not
commit to one: an inline `style` on `<html>` outranks every stylesheet rule,
which means inlining a guess would silently defeat the
`prefers-color-scheme` block meant to correct it. Measured on the built
example with page scripts blocked and the OS set to dark, the
inline-variables-plus-dark-block combination painted the *light* canvas
(`rgb(248, 250, 252)`); emitting both schemes as media blocks and no inline
variables paints `rgb(2, 6, 23)`. See systemModeCSSTemplate.

Client-side navigation (`<ClientRouter />`) is handled separately by
createNavigationScript — the injected bootstrap is byte-identical on
every page, so Astro de-duplicates it and it does not re-run, and the live
theme state would otherwise be replaced by the destination page's build-time
attributes.

```ts
// Register the integration. No theme data.
import { defineConfig } from "astro/config";
import themvora from "@themvora/astro";

export default defineConfig({
  integrations: [themvora()],
});
```

---

## Classes

### `class ThemvoraInspector`

**Extends** `ThemvoraRuntimeConsumer`
Custom element `<themvora-inspector>` that inspects the active theme.

Framework-free (vanilla JS). Renders a floating toggle that opens a panel
showing the active theme's identity, selection, tokens, and resolved CSS
variables, updating live as the theme changes. Observes the `bottom`,
`right`, `size`, and `z-index` attributes.

**See also:** `defineCustomElements`, `ThemvoraProvider`

| Member | Type | Description |
| ------ | ---- | ----------- |
| `constructor` | `ThemvoraInspector` | — |
| `accessKey` | `string` | The **`HTMLElement.accessKey`** property sets the keystroke which a user can press to jump to a given element. [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/accessKey) |
| readonly `accessKeyLabel` | `string` | The **`HTMLElement.accessKeyLabel`** read-only property returns a string containing the element's browser-assigned access key (if any); otherwise it returns an empty string. [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/accessKeyLabel) |
| `ariaActiveDescendantElement` | `Element \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaActiveDescendantElement) |
| `ariaAtomic` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaAtomic) |
| `ariaAutoComplete` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaAutoComplete) |
| `ariaBrailleLabel` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaBrailleLabel) |
| `ariaBrailleRoleDescription` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaBrailleRoleDescription) |
| `ariaBusy` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaBusy) |
| `ariaChecked` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaChecked) |
| `ariaColCount` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaColCount) |
| `ariaColIndex` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaColIndex) |
| `ariaColIndexText` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaColIndexText) |
| `ariaColSpan` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaColSpan) |
| `ariaControlsElements` | `readonly Element[] \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaControlsElements) |
| `ariaCurrent` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaCurrent) |
| `ariaDescribedByElements` | `readonly Element[] \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaDescribedByElements) |
| `ariaDescription` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaDescription) |
| `ariaDetailsElements` | `readonly Element[] \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaDetailsElements) |
| `ariaDisabled` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaDisabled) |
| `ariaErrorMessageElements` | `readonly Element[] \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaErrorMessageElements) |
| `ariaExpanded` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaExpanded) |
| `ariaFlowToElements` | `readonly Element[] \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaFlowToElements) |
| `ariaHasPopup` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaHasPopup) |
| `ariaHidden` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaHidden) |
| `ariaInvalid` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaInvalid) |
| `ariaKeyShortcuts` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaKeyShortcuts) |
| `ariaLabel` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaLabel) |
| `ariaLabelledByElements` | `readonly Element[] \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaLabelledByElements) |
| `ariaLevel` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaLevel) |
| `ariaLive` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaLive) |
| `ariaModal` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaModal) |
| `ariaMultiLine` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaMultiLine) |
| `ariaMultiSelectable` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaMultiSelectable) |
| `ariaOrientation` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaOrientation) |
| `ariaOwnsElements` | `readonly Element[] \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaOwnsElements) |
| `ariaPlaceholder` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaPlaceholder) |
| `ariaPosInSet` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaPosInSet) |
| `ariaPressed` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaPressed) |
| `ariaReadOnly` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaReadOnly) |
| `ariaRelevant` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaRelevant) |
| `ariaRequired` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaRequired) |
| `ariaRoleDescription` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaRoleDescription) |
| `ariaRowCount` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaRowCount) |
| `ariaRowIndex` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaRowIndex) |
| `ariaRowIndexText` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaRowIndexText) |
| `ariaRowSpan` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaRowSpan) |
| `ariaSelected` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaSelected) |
| `ariaSetSize` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaSetSize) |
| `ariaSort` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaSort) |
| `ariaValueMax` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaValueMax) |
| `ariaValueMin` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaValueMin) |
| `ariaValueNow` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaValueNow) |
| `ariaValueText` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaValueText) |
| readonly `assignedSlot` | `HTMLSlotElement \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/assignedSlot) |
| readonly `ATTRIBUTE_NODE` | `2` | — |
| readonly `attributes` | `NamedNodeMap` | The **`Element.attributes`** property returns a live collection of all attribute nodes registered to the specified node. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/attributes) |
| readonly `attributeStyleMap` | `StylePropertyMap` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/attributeStyleMap) |
| `autocapitalize` | `string` | The **`autocapitalize`** property of the HTMLElement interface represents the element's capitalization behavior for user input. [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/autocapitalize) |
| `autocorrect` | `boolean` | The **`autocorrect`** property of the HTMLElement interface controls whether or not autocorrection of editable text is enabled for spelling and/or punctuation errors. [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/autocorrect) |
| `autofocus` | `boolean` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/autofocus) |
| readonly `baseURI` | `string` | The read-only **`baseURI`** property of the Node interface returns the absolute base URL of the document containing the node. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Node/baseURI) |
| readonly `CDATA_SECTION_NODE` | `4` | node is a CDATASection node. |
| readonly `childElementCount` | `number` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Document/childElementCount) |
| readonly `childNodes` | `NodeListOf<ChildNode>` | The read-only **`childNodes`** property of the Node interface returns a live the first child node is assigned index `0`. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Node/childNodes) |
| readonly `children` | `HTMLCollection` | Returns the child elements. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Document/children) |
| `className` | `string` | The **`className`** property of the of the specified element. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/className) |
| readonly `clientHeight` | `number` | The **`clientHeight`** read-only property of the Element interface is zero for elements with no CSS or inline layout boxes; otherwise, it's the inner height of an element in pixels. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/clientHeight) |
| readonly `clientLeft` | `number` | The **`clientLeft`** read-only property of the Element interface returns the width of the left border of an element in pixels. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/clientLeft) |
| readonly `clientTop` | `number` | The **`clientTop`** read-only property of the Element interface returns the width of the top border of an element in pixels. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/clientTop) |
| readonly `clientWidth` | `number` | The **`clientWidth`** read-only property of the Element interface is zero for inline elements and elements with no CSS; otherwise, it's the inner width of an element in pixels. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/clientWidth) |
| readonly `COMMENT_NODE` | `8` | node is a Comment node. |
| `contentEditable` | `string` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/contentEditable) |
| readonly `currentCSSZoom` | `number` | The **`currentCSSZoom`** read-only property of the Element interface provides the 'effective' CSS `zoom` of an element, taking into account the zoom applied to the element and all its parent elements. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/currentCSSZoom) |
| readonly `dataset` | `DOMStringMap` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/dataset) |
| `dir` | `string` | The **`HTMLElement.dir`** property indicates the text writing directionality of the content of the current element. [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/dir) |
| readonly `DOCUMENT_FRAGMENT_NODE` | `11` | node is a DocumentFragment node. |
| readonly `DOCUMENT_NODE` | `9` | node is a document. |
| readonly `DOCUMENT_POSITION_CONTAINED_BY` | `16` | Set when other is a descendant of node. |
| readonly `DOCUMENT_POSITION_CONTAINS` | `8` | Set when other is an ancestor of node. |
| readonly `DOCUMENT_POSITION_DISCONNECTED` | `1` | Set when node and other are not in the same tree. |
| readonly `DOCUMENT_POSITION_FOLLOWING` | `4` | Set when other is following node. |
| readonly `DOCUMENT_POSITION_IMPLEMENTATION_SPECIFIC` | `32` | — |
| readonly `DOCUMENT_POSITION_PRECEDING` | `2` | Set when other is preceding node. |
| readonly `DOCUMENT_TYPE_NODE` | `10` | node is a doctype. |
| `draggable` | `boolean` | The **`draggable`** property of the HTMLElement interface gets and sets a Boolean primitive indicating if the element is draggable. [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/draggable) |
| readonly `ELEMENT_NODE` | `1` | node is an element. |
| `enterKeyHint` | `string` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/enterKeyHint) |
| readonly `ENTITY_NODE` | `6` | — |
| readonly `ENTITY_REFERENCE_NODE` | `5` | — |
| readonly `firstChild` | `ChildNode \| null` | The read-only **`firstChild`** property of the Node interface returns the node's first child in the tree, or `null` if the node has no children. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Node/firstChild) |
| readonly `firstElementChild` | `Element \| null` | Returns the first child that is an element, and null otherwise. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Document/firstElementChild) |
| `hidden` | `boolean` | The HTMLElement property **`hidden`** reflects the value of the element's `hidden` attribute. [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/hidden) |
| `id` | `string` | The **`id`** property of the Element interface represents the element's identifier, reflecting the **`id`** global attribute. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/id) |
| `inert` | `boolean` | The HTMLElement property **`inert`** reflects the value of the element's `inert` attribute. [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/inert) |
| `innerHTML` | `string` | The **`innerHTML`** property of the Element interface gets or sets the HTML or XML markup contained within the element. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/innerHTML) |
| `innerText` | `string` | The **`innerText`** property of the HTMLElement interface represents the rendered text content of a node and its descendants. [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/innerText) |
| `inputMode` | `string` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/inputMode) |
| readonly `isConnected` | `boolean` | The read-only **`isConnected`** property of the Node interface returns a boolean indicating whether the node is connected (directly or indirectly) to a Document object. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Node/isConnected) |
| readonly `isContentEditable` | `boolean` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/isContentEditable) |
| `lang` | `string` | The **`lang`** property of the HTMLElement interface indicates the base language of an element's attribute values and text content, in the form of a MISSING: RFC(5646, 'BCP 47 language identifier tag')]. [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/lang) |
| readonly `lastChild` | `ChildNode \| null` | The read-only **`lastChild`** property of the Node interface returns the last child of the node, or `null` if there are no child nodes. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Node/lastChild) |
| readonly `lastElementChild` | `Element \| null` | Returns the last child that is an element, and null otherwise. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Document/lastElementChild) |
| readonly `localName` | `string` | The **`Element.localName`** read-only property returns the local part of the qualified name of an element. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/localName) |
| readonly `namespaceURI` | `string \| null` | The **`Element.namespaceURI`** read-only property returns the namespace URI of the element, or `null` if the element is not in a namespace. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/namespaceURI) |
| readonly `nextElementSibling` | `Element \| null` | Returns the first following sibling that is an element, and null otherwise. [MDN Reference](https://developer.mozilla.org/docs/Web/API/CharacterData/nextElementSibling) |
| readonly `nextSibling` | `ChildNode \| null` | The read-only **`nextSibling`** property of the Node interface returns the node immediately following the specified one in their parent's Node.childNodes, or returns `null` if the specified node is the last child in the parent element. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Node/nextSibling) |
| readonly `nodeName` | `string` | The read-only **`nodeName`** property of Node returns the name of the current node as a string. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Node/nodeName) |
| readonly `nodeType` | `number` | The read-only **`nodeType`** property of a Node interface is an integer that identifies what the node is. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Node/nodeType) |
| `nodeValue` | `string \| null` | The **`nodeValue`** property of the Node interface returns or sets the value of the current node. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Node/nodeValue) |
| `nonce` (optional) | `string` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/nonce) |
| readonly `NOTATION_NODE` | `12` | — |
| readonly `offsetHeight` | `number` | The **`offsetHeight`** read-only property of the HTMLElement interface returns the height of an element, including vertical padding and borders, as an integer. [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/offsetHeight) |
| readonly `offsetLeft` | `number` | The **`offsetLeft`** read-only property of the HTMLElement interface returns the number of pixels that the _upper left corner_ of the current element is offset to the left within the HTMLElement.offsetParent node. [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/offsetLeft) |
| readonly `offsetParent` | `Element \| null` | The **`HTMLElement.offsetParent`** read-only property returns a reference to the element which is the closest (nearest in the containment hierarchy) positioned ancestor element. [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/offsetParent) |
| readonly `offsetTop` | `number` | The **`offsetTop`** read-only property of the HTMLElement interface returns the distance from the outer border of the current element (including its margin) to the top padding edge of the HTMLelement.offsetParent, the _closest positioned_ ancestor element. [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/offsetTop) |
| readonly `offsetWidth` | `number` | The **`offsetWidth`** read-only property of the HTMLElement interface returns the layout width of an element as an integer. [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/offsetWidth) |
| `onabort` | `__type(this: GlobalEventHandlers, ev: UIEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLMediaElement/abort_event) |
| `onanimationcancel` | `__type(this: GlobalEventHandlers, ev: AnimationEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/animationcancel_event) |
| `onanimationend` | `__type(this: GlobalEventHandlers, ev: AnimationEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/animationend_event) |
| `onanimationiteration` | `__type(this: GlobalEventHandlers, ev: AnimationEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/animationiteration_event) |
| `onanimationstart` | `__type(this: GlobalEventHandlers, ev: AnimationEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/animationstart_event) |
| `onauxclick` | `__type(this: GlobalEventHandlers, ev: PointerEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/auxclick_event) |
| `onbeforeinput` | `__type(this: GlobalEventHandlers, ev: InputEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/beforeinput_event) |
| `onbeforematch` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/beforematch_event) |
| `onbeforetoggle` | `__type(this: GlobalEventHandlers, ev: ToggleEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/beforetoggle_event) |
| `onblur` | `__type(this: GlobalEventHandlers, ev: FocusEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/blur_event) |
| `oncancel` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLDialogElement/cancel_event) |
| `oncanplay` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLMediaElement/canplay_event) |
| `oncanplaythrough` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLMediaElement/canplaythrough_event) |
| `onchange` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/change_event) |
| `onclick` | `__type(this: GlobalEventHandlers, ev: PointerEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/click_event) |
| `onclose` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLDialogElement/close_event) |
| `oncontextlost` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLCanvasElement/contextlost_event) |
| `oncontextmenu` | `__type(this: GlobalEventHandlers, ev: PointerEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/contextmenu_event) |
| `oncontextrestored` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLCanvasElement/contextrestored_event) |
| `oncopy` | `__type(this: GlobalEventHandlers, ev: ClipboardEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/copy_event) |
| `oncuechange` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLTrackElement/cuechange_event) |
| `oncut` | `__type(this: GlobalEventHandlers, ev: ClipboardEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/cut_event) |
| `ondblclick` | `__type(this: GlobalEventHandlers, ev: MouseEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/dblclick_event) |
| `ondrag` | `__type(this: GlobalEventHandlers, ev: DragEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/drag_event) |
| `ondragend` | `__type(this: GlobalEventHandlers, ev: DragEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/dragend_event) |
| `ondragenter` | `__type(this: GlobalEventHandlers, ev: DragEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/dragenter_event) |
| `ondragleave` | `__type(this: GlobalEventHandlers, ev: DragEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/dragleave_event) |
| `ondragover` | `__type(this: GlobalEventHandlers, ev: DragEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/dragover_event) |
| `ondragstart` | `__type(this: GlobalEventHandlers, ev: DragEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/dragstart_event) |
| `ondrop` | `__type(this: GlobalEventHandlers, ev: DragEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/drop_event) |
| `ondurationchange` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLMediaElement/durationchange_event) |
| `onemptied` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLMediaElement/emptied_event) |
| `onended` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLMediaElement/ended_event) |
| `onerror` | `OnErrorEventHandler` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/error_event) |
| `onfocus` | `__type(this: GlobalEventHandlers, ev: FocusEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/focus_event) |
| `onformdata` | `__type(this: GlobalEventHandlers, ev: FormDataEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLFormElement/formdata_event) |
| `onfullscreenchange` | `__type(this: Element, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/fullscreenchange_event) |
| `onfullscreenerror` | `__type(this: Element, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/fullscreenerror_event) |
| `ongotpointercapture` | `__type(this: GlobalEventHandlers, ev: PointerEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/gotpointercapture_event) |
| `oninput` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/input_event) |
| `oninvalid` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLInputElement/invalid_event) |
| `onkeydown` | `__type(this: GlobalEventHandlers, ev: KeyboardEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/keydown_event) |
| `onkeypress` | `__type(this: GlobalEventHandlers, ev: KeyboardEvent): any \| null` | — |
| `onkeyup` | `__type(this: GlobalEventHandlers, ev: KeyboardEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/keyup_event) |
| `onload` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/load_event) |
| `onloadeddata` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLMediaElement/loadeddata_event) |
| `onloadedmetadata` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLMediaElement/loadedmetadata_event) |
| `onloadstart` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLMediaElement/loadstart_event) |
| `onlostpointercapture` | `__type(this: GlobalEventHandlers, ev: PointerEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/lostpointercapture_event) |
| `onmousedown` | `__type(this: GlobalEventHandlers, ev: MouseEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/mousedown_event) |
| `onmouseenter` | `__type(this: GlobalEventHandlers, ev: MouseEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/mouseenter_event) |
| `onmouseleave` | `__type(this: GlobalEventHandlers, ev: MouseEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/mouseleave_event) |
| `onmousemove` | `__type(this: GlobalEventHandlers, ev: MouseEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/mousemove_event) |
| `onmouseout` | `__type(this: GlobalEventHandlers, ev: MouseEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/mouseout_event) |
| `onmouseover` | `__type(this: GlobalEventHandlers, ev: MouseEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/mouseover_event) |
| `onmouseup` | `__type(this: GlobalEventHandlers, ev: MouseEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/mouseup_event) |
| `onpaste` | `__type(this: GlobalEventHandlers, ev: ClipboardEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/paste_event) |
| `onpause` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLMediaElement/pause_event) |
| `onplay` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLMediaElement/play_event) |
| `onplaying` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLMediaElement/playing_event) |
| `onpointercancel` | `__type(this: GlobalEventHandlers, ev: PointerEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/pointercancel_event) |
| `onpointerdown` | `__type(this: GlobalEventHandlers, ev: PointerEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/pointerdown_event) |
| `onpointerenter` | `__type(this: GlobalEventHandlers, ev: PointerEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/pointerenter_event) |
| `onpointerleave` | `__type(this: GlobalEventHandlers, ev: PointerEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/pointerleave_event) |
| `onpointermove` | `__type(this: GlobalEventHandlers, ev: PointerEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/pointermove_event) |
| `onpointerout` | `__type(this: GlobalEventHandlers, ev: PointerEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/pointerout_event) |
| `onpointerover` | `__type(this: GlobalEventHandlers, ev: PointerEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/pointerover_event) |
| `onpointerrawupdate` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | Available only in secure contexts. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/pointerrawupdate_event) |
| `onpointerup` | `__type(this: GlobalEventHandlers, ev: PointerEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/pointerup_event) |
| `onprogress` | `__type(this: GlobalEventHandlers, ev: ProgressEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLMediaElement/progress_event) |
| `onratechange` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLMediaElement/ratechange_event) |
| `onreset` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLFormElement/reset_event) |
| `onresize` | `__type(this: GlobalEventHandlers, ev: UIEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLVideoElement/resize_event) |
| `onscroll` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Document/scroll_event) |
| `onscrollend` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Document/scrollend_event) |
| `onsecuritypolicyviolation` | `__type(this: GlobalEventHandlers, ev: SecurityPolicyViolationEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Document/securitypolicyviolation_event) |
| `onseeked` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLMediaElement/seeked_event) |
| `onseeking` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLMediaElement/seeking_event) |
| `onselect` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLInputElement/select_event) |
| `onselectionchange` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Document/selectionchange_event) |
| `onselectstart` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Node/selectstart_event) |
| `onslotchange` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLSlotElement/slotchange_event) |
| `onstalled` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLMediaElement/stalled_event) |
| `onsubmit` | `__type(this: GlobalEventHandlers, ev: SubmitEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLFormElement/submit_event) |
| `onsuspend` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLMediaElement/suspend_event) |
| `ontimeupdate` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLMediaElement/timeupdate_event) |
| `ontoggle` | `__type(this: GlobalEventHandlers, ev: ToggleEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/toggle_event) |
| `ontouchcancel` (optional) | `__type(this: GlobalEventHandlers, ev: TouchEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/touchcancel_event) |
| `ontouchend` (optional) | `__type(this: GlobalEventHandlers, ev: TouchEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/touchend_event) |
| `ontouchmove` (optional) | `__type(this: GlobalEventHandlers, ev: TouchEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/touchmove_event) |
| `ontouchstart` (optional) | `__type(this: GlobalEventHandlers, ev: TouchEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/touchstart_event) |
| `ontransitioncancel` | `__type(this: GlobalEventHandlers, ev: TransitionEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/transitioncancel_event) |
| `ontransitionend` | `__type(this: GlobalEventHandlers, ev: TransitionEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/transitionend_event) |
| `ontransitionrun` | `__type(this: GlobalEventHandlers, ev: TransitionEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/transitionrun_event) |
| `ontransitionstart` | `__type(this: GlobalEventHandlers, ev: TransitionEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/transitionstart_event) |
| `onvolumechange` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLMediaElement/volumechange_event) |
| `onwaiting` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLMediaElement/waiting_event) |
| `onwebkitanimationend` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | — |
| `onwebkitanimationiteration` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | — |
| `onwebkitanimationstart` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | — |
| `onwebkittransitionend` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | — |
| `onwheel` | `__type(this: GlobalEventHandlers, ev: WheelEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/wheel_event) |
| `outerHTML` | `string` | The **`outerHTML`** attribute of the Element DOM interface gets the serialized HTML fragment describing the element including its descendants. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/outerHTML) |
| `outerText` | `string` | The **`outerText`** property of the HTMLElement interface returns the same value as HTMLElement.innerText. [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/outerText) |
| readonly `ownerDocument` | `Document` | The read-only **`ownerDocument`** property of the Node interface returns the top-level document object of the node. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Node/ownerDocument) |
| readonly `parentElement` | `HTMLElement \| null` | The read-only **`parentElement`** property of Node interface returns the DOM node's parent Element, or `null` if the node either has no parent, or its parent isn't a DOM Element. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Node/parentElement) |
| readonly `parentNode` | `ParentNode \| null` | The read-only **`parentNode`** property of the Node interface returns the parent of the specified node in the DOM tree. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Node/parentNode) |
| `popover` | `string \| null` | The **`popover`** property of the HTMLElement interface gets and sets an element's popover state via JavaScript (`'auto'`, `'hint'`, or `'manual'`), and can be used for feature detection. [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/popover) |
| readonly `prefix` | `string \| null` | The **`Element.prefix`** read-only property returns the namespace prefix of the specified element, or `null` if no prefix is specified. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/prefix) |
| readonly `previousElementSibling` | `Element \| null` | Returns the first preceding sibling that is an element, and null otherwise. [MDN Reference](https://developer.mozilla.org/docs/Web/API/CharacterData/previousElementSibling) |
| readonly `previousSibling` | `ChildNode \| null` | The read-only **`previousSibling`** property of the Node interface returns the node immediately preceding the specified one in its parent's or `null` if the specified node is the first in that list. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Node/previousSibling) |
| readonly `PROCESSING_INSTRUCTION_NODE` | `7` | node is a ProcessingInstruction node. |
| `role` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/role) |
| readonly `scrollHeight` | `number` | The **`scrollHeight`** read-only property of the Element interface is a measurement of the height of an element's content, including content not visible on the screen due to overflow. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/scrollHeight) |
| `scrollLeft` | `number` | The **`scrollLeft`** property of the Element interface gets or sets the number of pixels by which an element's content is scrolled from its left edge. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/scrollLeft) |
| `scrollTop` | `number` | The **`scrollTop`** property of the Element interface gets or sets the number of pixels by which an element's content is scrolled from its top edge. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/scrollTop) |
| readonly `scrollWidth` | `number` | The **`scrollWidth`** read-only property of the Element interface is a measurement of the width of an element's content, including content not visible on the screen due to overflow. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/scrollWidth) |
| readonly `shadowRoot` | `ShadowRoot \| null` | The `Element.shadowRoot` read-only property represents the shadow root hosted by the element. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/shadowRoot) |
| `slot` | `string` | The **`slot`** property of the Element interface returns the name of the shadow DOM slot the element is inserted in. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/slot) |
| `spellcheck` | `boolean` | The **`spellcheck`** property of the HTMLElement interface represents a boolean value that controls the spell-checking hint. [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/spellcheck) |
| `tabIndex` | `number` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/tabIndex) |
| readonly `tagName` | `string` | The **`tagName`** read-only property of the Element interface returns the tag name of the element on which it's called. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/tagName) |
| readonly `TEXT_NODE` | `3` | node is a Text node. |
| `title` | `string` | The **`HTMLElement.title`** property represents the title of the element: the text usually displayed in a 'tooltip' popup when the mouse is over the node. [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/title) |
| `translate` | `boolean` | The **`translate`** property of the HTMLElement interface indicates whether an element's attribute values and the values of its Text node children are to be translated when the page is localized, or whether to leave them unchanged. [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/translate) |
| `writingSuggestions` | `string` | The **`writingSuggestions`** property of the HTMLElement interface is a string indicating if browser-provided writing suggestions should be enabled under the scope of the element or not. [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/writingSuggestions) |
| `observedAttributes` | `string[]` | — |
| `classList` | `void` | — |
| `part` | `void` | — |
| `runtime` | `void` | — |
| `style` | `void` | — |
| `textContent` | `void` | — |
| `addEventListener` | `void` | — |
| `after` | `void` | — |
| `animate` | `Animation` | — |
| `append` | `void` | — |
| `appendChild` | `T` | — |
| `attachInternals` | `ElementInternals` | — |
| `attachShadow` | `ShadowRoot` | — |
| `attributeChangedCallback` | `void` | — |
| `before` | `void` | — |
| `blur` | `void` | — |
| `checkVisibility` | `boolean` | — |
| `click` | `void` | — |
| `cloneNode` | `Node` | — |
| `closest` | `HTMLElementTagNameMap[K] \| null` | — |
| `compareDocumentPosition` | `number` | — |
| `computedStyleMap` | `StylePropertyMapReadOnly` | — |
| `connectedCallback` | `void` | — |
| `contains` | `boolean` | — |
| `disconnectedCallback` | `void` | — |
| `dispatchEvent` | `boolean` | — |
| `focus` | `void` | — |
| `getAnimations` | `Animation[]` | — |
| `getAttribute` | `string \| null` | — |
| `getAttributeNames` | `string[]` | — |
| `getAttributeNode` | `Attr \| null` | — |
| `getAttributeNodeNS` | `Attr \| null` | — |
| `getAttributeNS` | `string \| null` | — |
| `getBoundingClientRect` | `DOMRect` | — |
| `getClientRects` | `DOMRectList` | — |
| `getElementsByClassName` | `HTMLCollectionOf<Element>` | — |
| `getElementsByTagName` | `HTMLCollectionOf<HTMLElementTagNameMap[K]>` | — |
| `getElementsByTagNameNS` | `HTMLCollectionOf<HTMLElement>` | — |
| `getHTML` | `string` | — |
| `getRootNode` | `Node` | — |
| `hasAttribute` | `boolean` | — |
| `hasAttributeNS` | `boolean` | — |
| `hasAttributes` | `boolean` | — |
| `hasChildNodes` | `boolean` | — |
| `hasPointerCapture` | `boolean` | — |
| `hidePopover` | `void` | — |
| `insertAdjacentElement` | `Element \| null` | — |
| `insertAdjacentHTML` | `void` | — |
| `insertAdjacentText` | `void` | — |
| `insertBefore` | `T` | — |
| `isDefaultNamespace` | `boolean` | — |
| `isEqualNode` | `boolean` | — |
| `isSameNode` | `boolean` | — |
| `lookupNamespaceURI` | `string \| null` | — |
| `lookupPrefix` | `string \| null` | — |
| `matches` | `boolean` | — |
| `normalize` | `void` | — |
| `onCatalogChange` | `void` | — |
| `onDetach` | `void` | — |
| `onRuntime` | `void` | — |
| `prepend` | `void` | — |
| `querySelector` | `HTMLElementTagNameMap[K] \| null` | — |
| `querySelectorAll` | `NodeListOf<HTMLElementTagNameMap[K]>` | — |
| `releasePointerCapture` | `void` | — |
| `remove` | `void` | — |
| `removeAttribute` | `void` | — |
| `removeAttributeNode` | `Attr` | — |
| `removeAttributeNS` | `void` | — |
| `removeChild` | `T` | — |
| `removeEventListener` | `void` | — |
| `replaceChild` | `T` | — |
| `replaceChildren` | `void` | — |
| `replaceWith` | `void` | — |
| `requestFullscreen` | `Promise<void>` | — |
| `requestPointerLock` | `Promise<void>` | — |
| `scroll` | `void` | — |
| `scrollBy` | `void` | — |
| `scrollIntoView` | `void` | — |
| `scrollTo` | `void` | — |
| `setAttribute` | `void` | — |
| `setAttributeNode` | `Attr \| null` | — |
| `setAttributeNodeNS` | `Attr \| null` | — |
| `setAttributeNS` | `void` | — |
| `setHTMLUnsafe` | `void` | — |
| `setPointerCapture` | `void` | — |
| `showPopover` | `void` | — |
| `toggleAttribute` | `boolean` | — |
| `togglePopover` | `boolean` | — |
| `webkitMatchesSelector` | `boolean` | — |
| `define` | `void` | — |

**Attributes.** All four are positional and optional:

- `bottom` — distance from the bottom of the viewport, in px (default `104`).
- `right` — distance from the right edge, in px (default `32`).
- `size` — toggle button size, in px (default `40`).
- `z-index` — stacking order of the toggle and panel (default `9999`).

Non-numeric values are ignored in favour of the default.

**Properties.** None of its own beyond the standard `HTMLElement` surface.

**Events.** Dispatches nothing of its own.

**Slots.** None — the panel is built from the runtime's data.

Requires an ancestor `<themvora-provider>`. If the provider is not yet
initialized, it waits for the `theme-ready` event. `define()` is SSR-safe
and no-ops when `customElements` is unavailable.

```ts
<themvora-inspector bottom="24" right="24"></themvora-inspector>
```

---


### `class ThemvoraScrollbar`

**Extends** `ThemvoraRuntimeConsumer`
Phase 2 — ThemvoraScrollbar (Web Component): overlay only.

Creates the custom scrollbar overlay.

Lifecycle:
  connectedCallback  → resolve the runtime
                       ↓
  onRuntime          → hide native bar (Phase 1) → create overlay → attach
                       ↓ (Phase 2)
  later              → add tv-scrollbar-ready
                       ↓ (Phase 3)
  onDetach / destroy → remove overlay → restore native bar

Phase 1 happens synchronously inside the overlay's construction. For static
HTML served via the Vite plugin (scrollbar: true), the pre-paint script in
<head> runs before first paint; for an SSR'd provider the class and CSS are
in the markup. This component's own hiding is the fallback for
dynamically-inserted elements (which may have already painted).

The teardown is a real teardown. The hiding is claimed, not switched on, so
removing the element gives the native scrollbar back instead of leaving the
page with no scrollbar at all — and an attribute change swaps the overlay
without ever passing through the "hidden, but nothing drawn" state.

**See also:** `ThemvoraProvider`

| Member | Type | Description |
| ------ | ---- | ----------- |
| `constructor` | `ThemvoraScrollbar` | — |
| `accessKey` | `string` | The **`HTMLElement.accessKey`** property sets the keystroke which a user can press to jump to a given element. [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/accessKey) |
| readonly `accessKeyLabel` | `string` | The **`HTMLElement.accessKeyLabel`** read-only property returns a string containing the element's browser-assigned access key (if any); otherwise it returns an empty string. [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/accessKeyLabel) |
| `ariaActiveDescendantElement` | `Element \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaActiveDescendantElement) |
| `ariaAtomic` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaAtomic) |
| `ariaAutoComplete` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaAutoComplete) |
| `ariaBrailleLabel` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaBrailleLabel) |
| `ariaBrailleRoleDescription` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaBrailleRoleDescription) |
| `ariaBusy` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaBusy) |
| `ariaChecked` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaChecked) |
| `ariaColCount` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaColCount) |
| `ariaColIndex` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaColIndex) |
| `ariaColIndexText` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaColIndexText) |
| `ariaColSpan` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaColSpan) |
| `ariaControlsElements` | `readonly Element[] \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaControlsElements) |
| `ariaCurrent` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaCurrent) |
| `ariaDescribedByElements` | `readonly Element[] \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaDescribedByElements) |
| `ariaDescription` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaDescription) |
| `ariaDetailsElements` | `readonly Element[] \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaDetailsElements) |
| `ariaDisabled` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaDisabled) |
| `ariaErrorMessageElements` | `readonly Element[] \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaErrorMessageElements) |
| `ariaExpanded` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaExpanded) |
| `ariaFlowToElements` | `readonly Element[] \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaFlowToElements) |
| `ariaHasPopup` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaHasPopup) |
| `ariaHidden` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaHidden) |
| `ariaInvalid` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaInvalid) |
| `ariaKeyShortcuts` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaKeyShortcuts) |
| `ariaLabel` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaLabel) |
| `ariaLabelledByElements` | `readonly Element[] \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaLabelledByElements) |
| `ariaLevel` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaLevel) |
| `ariaLive` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaLive) |
| `ariaModal` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaModal) |
| `ariaMultiLine` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaMultiLine) |
| `ariaMultiSelectable` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaMultiSelectable) |
| `ariaOrientation` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaOrientation) |
| `ariaOwnsElements` | `readonly Element[] \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaOwnsElements) |
| `ariaPlaceholder` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaPlaceholder) |
| `ariaPosInSet` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaPosInSet) |
| `ariaPressed` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaPressed) |
| `ariaReadOnly` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaReadOnly) |
| `ariaRelevant` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaRelevant) |
| `ariaRequired` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaRequired) |
| `ariaRoleDescription` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaRoleDescription) |
| `ariaRowCount` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaRowCount) |
| `ariaRowIndex` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaRowIndex) |
| `ariaRowIndexText` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaRowIndexText) |
| `ariaRowSpan` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaRowSpan) |
| `ariaSelected` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaSelected) |
| `ariaSetSize` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaSetSize) |
| `ariaSort` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaSort) |
| `ariaValueMax` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaValueMax) |
| `ariaValueMin` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaValueMin) |
| `ariaValueNow` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaValueNow) |
| `ariaValueText` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaValueText) |
| readonly `assignedSlot` | `HTMLSlotElement \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/assignedSlot) |
| readonly `ATTRIBUTE_NODE` | `2` | — |
| readonly `attributes` | `NamedNodeMap` | The **`Element.attributes`** property returns a live collection of all attribute nodes registered to the specified node. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/attributes) |
| readonly `attributeStyleMap` | `StylePropertyMap` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/attributeStyleMap) |
| `autocapitalize` | `string` | The **`autocapitalize`** property of the HTMLElement interface represents the element's capitalization behavior for user input. [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/autocapitalize) |
| `autocorrect` | `boolean` | The **`autocorrect`** property of the HTMLElement interface controls whether or not autocorrection of editable text is enabled for spelling and/or punctuation errors. [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/autocorrect) |
| `autofocus` | `boolean` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/autofocus) |
| readonly `baseURI` | `string` | The read-only **`baseURI`** property of the Node interface returns the absolute base URL of the document containing the node. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Node/baseURI) |
| readonly `CDATA_SECTION_NODE` | `4` | node is a CDATASection node. |
| readonly `childElementCount` | `number` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Document/childElementCount) |
| readonly `childNodes` | `NodeListOf<ChildNode>` | The read-only **`childNodes`** property of the Node interface returns a live the first child node is assigned index `0`. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Node/childNodes) |
| readonly `children` | `HTMLCollection` | Returns the child elements. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Document/children) |
| `className` | `string` | The **`className`** property of the of the specified element. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/className) |
| readonly `clientHeight` | `number` | The **`clientHeight`** read-only property of the Element interface is zero for elements with no CSS or inline layout boxes; otherwise, it's the inner height of an element in pixels. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/clientHeight) |
| readonly `clientLeft` | `number` | The **`clientLeft`** read-only property of the Element interface returns the width of the left border of an element in pixels. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/clientLeft) |
| readonly `clientTop` | `number` | The **`clientTop`** read-only property of the Element interface returns the width of the top border of an element in pixels. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/clientTop) |
| readonly `clientWidth` | `number` | The **`clientWidth`** read-only property of the Element interface is zero for inline elements and elements with no CSS; otherwise, it's the inner width of an element in pixels. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/clientWidth) |
| readonly `COMMENT_NODE` | `8` | node is a Comment node. |
| `contentEditable` | `string` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/contentEditable) |
| readonly `currentCSSZoom` | `number` | The **`currentCSSZoom`** read-only property of the Element interface provides the 'effective' CSS `zoom` of an element, taking into account the zoom applied to the element and all its parent elements. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/currentCSSZoom) |
| readonly `dataset` | `DOMStringMap` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/dataset) |
| `dir` | `string` | The **`HTMLElement.dir`** property indicates the text writing directionality of the content of the current element. [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/dir) |
| readonly `DOCUMENT_FRAGMENT_NODE` | `11` | node is a DocumentFragment node. |
| readonly `DOCUMENT_NODE` | `9` | node is a document. |
| readonly `DOCUMENT_POSITION_CONTAINED_BY` | `16` | Set when other is a descendant of node. |
| readonly `DOCUMENT_POSITION_CONTAINS` | `8` | Set when other is an ancestor of node. |
| readonly `DOCUMENT_POSITION_DISCONNECTED` | `1` | Set when node and other are not in the same tree. |
| readonly `DOCUMENT_POSITION_FOLLOWING` | `4` | Set when other is following node. |
| readonly `DOCUMENT_POSITION_IMPLEMENTATION_SPECIFIC` | `32` | — |
| readonly `DOCUMENT_POSITION_PRECEDING` | `2` | Set when other is preceding node. |
| readonly `DOCUMENT_TYPE_NODE` | `10` | node is a doctype. |
| `draggable` | `boolean` | The **`draggable`** property of the HTMLElement interface gets and sets a Boolean primitive indicating if the element is draggable. [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/draggable) |
| readonly `ELEMENT_NODE` | `1` | node is an element. |
| `enterKeyHint` | `string` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/enterKeyHint) |
| readonly `ENTITY_NODE` | `6` | — |
| readonly `ENTITY_REFERENCE_NODE` | `5` | — |
| readonly `firstChild` | `ChildNode \| null` | The read-only **`firstChild`** property of the Node interface returns the node's first child in the tree, or `null` if the node has no children. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Node/firstChild) |
| readonly `firstElementChild` | `Element \| null` | Returns the first child that is an element, and null otherwise. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Document/firstElementChild) |
| `hidden` | `boolean` | The HTMLElement property **`hidden`** reflects the value of the element's `hidden` attribute. [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/hidden) |
| `id` | `string` | The **`id`** property of the Element interface represents the element's identifier, reflecting the **`id`** global attribute. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/id) |
| `inert` | `boolean` | The HTMLElement property **`inert`** reflects the value of the element's `inert` attribute. [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/inert) |
| `innerHTML` | `string` | The **`innerHTML`** property of the Element interface gets or sets the HTML or XML markup contained within the element. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/innerHTML) |
| `innerText` | `string` | The **`innerText`** property of the HTMLElement interface represents the rendered text content of a node and its descendants. [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/innerText) |
| `inputMode` | `string` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/inputMode) |
| readonly `isConnected` | `boolean` | The read-only **`isConnected`** property of the Node interface returns a boolean indicating whether the node is connected (directly or indirectly) to a Document object. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Node/isConnected) |
| readonly `isContentEditable` | `boolean` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/isContentEditable) |
| `lang` | `string` | The **`lang`** property of the HTMLElement interface indicates the base language of an element's attribute values and text content, in the form of a MISSING: RFC(5646, 'BCP 47 language identifier tag')]. [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/lang) |
| readonly `lastChild` | `ChildNode \| null` | The read-only **`lastChild`** property of the Node interface returns the last child of the node, or `null` if there are no child nodes. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Node/lastChild) |
| readonly `lastElementChild` | `Element \| null` | Returns the last child that is an element, and null otherwise. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Document/lastElementChild) |
| readonly `localName` | `string` | The **`Element.localName`** read-only property returns the local part of the qualified name of an element. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/localName) |
| readonly `namespaceURI` | `string \| null` | The **`Element.namespaceURI`** read-only property returns the namespace URI of the element, or `null` if the element is not in a namespace. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/namespaceURI) |
| readonly `nextElementSibling` | `Element \| null` | Returns the first following sibling that is an element, and null otherwise. [MDN Reference](https://developer.mozilla.org/docs/Web/API/CharacterData/nextElementSibling) |
| readonly `nextSibling` | `ChildNode \| null` | The read-only **`nextSibling`** property of the Node interface returns the node immediately following the specified one in their parent's Node.childNodes, or returns `null` if the specified node is the last child in the parent element. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Node/nextSibling) |
| readonly `nodeName` | `string` | The read-only **`nodeName`** property of Node returns the name of the current node as a string. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Node/nodeName) |
| readonly `nodeType` | `number` | The read-only **`nodeType`** property of a Node interface is an integer that identifies what the node is. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Node/nodeType) |
| `nodeValue` | `string \| null` | The **`nodeValue`** property of the Node interface returns or sets the value of the current node. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Node/nodeValue) |
| `nonce` (optional) | `string` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/nonce) |
| readonly `NOTATION_NODE` | `12` | — |
| readonly `offsetHeight` | `number` | The **`offsetHeight`** read-only property of the HTMLElement interface returns the height of an element, including vertical padding and borders, as an integer. [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/offsetHeight) |
| readonly `offsetLeft` | `number` | The **`offsetLeft`** read-only property of the HTMLElement interface returns the number of pixels that the _upper left corner_ of the current element is offset to the left within the HTMLElement.offsetParent node. [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/offsetLeft) |
| readonly `offsetParent` | `Element \| null` | The **`HTMLElement.offsetParent`** read-only property returns a reference to the element which is the closest (nearest in the containment hierarchy) positioned ancestor element. [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/offsetParent) |
| readonly `offsetTop` | `number` | The **`offsetTop`** read-only property of the HTMLElement interface returns the distance from the outer border of the current element (including its margin) to the top padding edge of the HTMLelement.offsetParent, the _closest positioned_ ancestor element. [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/offsetTop) |
| readonly `offsetWidth` | `number` | The **`offsetWidth`** read-only property of the HTMLElement interface returns the layout width of an element as an integer. [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/offsetWidth) |
| `onabort` | `__type(this: GlobalEventHandlers, ev: UIEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLMediaElement/abort_event) |
| `onanimationcancel` | `__type(this: GlobalEventHandlers, ev: AnimationEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/animationcancel_event) |
| `onanimationend` | `__type(this: GlobalEventHandlers, ev: AnimationEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/animationend_event) |
| `onanimationiteration` | `__type(this: GlobalEventHandlers, ev: AnimationEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/animationiteration_event) |
| `onanimationstart` | `__type(this: GlobalEventHandlers, ev: AnimationEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/animationstart_event) |
| `onauxclick` | `__type(this: GlobalEventHandlers, ev: PointerEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/auxclick_event) |
| `onbeforeinput` | `__type(this: GlobalEventHandlers, ev: InputEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/beforeinput_event) |
| `onbeforematch` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/beforematch_event) |
| `onbeforetoggle` | `__type(this: GlobalEventHandlers, ev: ToggleEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/beforetoggle_event) |
| `onblur` | `__type(this: GlobalEventHandlers, ev: FocusEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/blur_event) |
| `oncancel` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLDialogElement/cancel_event) |
| `oncanplay` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLMediaElement/canplay_event) |
| `oncanplaythrough` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLMediaElement/canplaythrough_event) |
| `onchange` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/change_event) |
| `onclick` | `__type(this: GlobalEventHandlers, ev: PointerEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/click_event) |
| `onclose` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLDialogElement/close_event) |
| `oncontextlost` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLCanvasElement/contextlost_event) |
| `oncontextmenu` | `__type(this: GlobalEventHandlers, ev: PointerEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/contextmenu_event) |
| `oncontextrestored` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLCanvasElement/contextrestored_event) |
| `oncopy` | `__type(this: GlobalEventHandlers, ev: ClipboardEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/copy_event) |
| `oncuechange` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLTrackElement/cuechange_event) |
| `oncut` | `__type(this: GlobalEventHandlers, ev: ClipboardEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/cut_event) |
| `ondblclick` | `__type(this: GlobalEventHandlers, ev: MouseEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/dblclick_event) |
| `ondrag` | `__type(this: GlobalEventHandlers, ev: DragEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/drag_event) |
| `ondragend` | `__type(this: GlobalEventHandlers, ev: DragEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/dragend_event) |
| `ondragenter` | `__type(this: GlobalEventHandlers, ev: DragEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/dragenter_event) |
| `ondragleave` | `__type(this: GlobalEventHandlers, ev: DragEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/dragleave_event) |
| `ondragover` | `__type(this: GlobalEventHandlers, ev: DragEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/dragover_event) |
| `ondragstart` | `__type(this: GlobalEventHandlers, ev: DragEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/dragstart_event) |
| `ondrop` | `__type(this: GlobalEventHandlers, ev: DragEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/drop_event) |
| `ondurationchange` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLMediaElement/durationchange_event) |
| `onemptied` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLMediaElement/emptied_event) |
| `onended` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLMediaElement/ended_event) |
| `onerror` | `OnErrorEventHandler` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/error_event) |
| `onfocus` | `__type(this: GlobalEventHandlers, ev: FocusEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/focus_event) |
| `onformdata` | `__type(this: GlobalEventHandlers, ev: FormDataEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLFormElement/formdata_event) |
| `onfullscreenchange` | `__type(this: Element, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/fullscreenchange_event) |
| `onfullscreenerror` | `__type(this: Element, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/fullscreenerror_event) |
| `ongotpointercapture` | `__type(this: GlobalEventHandlers, ev: PointerEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/gotpointercapture_event) |
| `oninput` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/input_event) |
| `oninvalid` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLInputElement/invalid_event) |
| `onkeydown` | `__type(this: GlobalEventHandlers, ev: KeyboardEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/keydown_event) |
| `onkeypress` | `__type(this: GlobalEventHandlers, ev: KeyboardEvent): any \| null` | — |
| `onkeyup` | `__type(this: GlobalEventHandlers, ev: KeyboardEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/keyup_event) |
| `onload` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/load_event) |
| `onloadeddata` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLMediaElement/loadeddata_event) |
| `onloadedmetadata` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLMediaElement/loadedmetadata_event) |
| `onloadstart` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLMediaElement/loadstart_event) |
| `onlostpointercapture` | `__type(this: GlobalEventHandlers, ev: PointerEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/lostpointercapture_event) |
| `onmousedown` | `__type(this: GlobalEventHandlers, ev: MouseEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/mousedown_event) |
| `onmouseenter` | `__type(this: GlobalEventHandlers, ev: MouseEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/mouseenter_event) |
| `onmouseleave` | `__type(this: GlobalEventHandlers, ev: MouseEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/mouseleave_event) |
| `onmousemove` | `__type(this: GlobalEventHandlers, ev: MouseEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/mousemove_event) |
| `onmouseout` | `__type(this: GlobalEventHandlers, ev: MouseEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/mouseout_event) |
| `onmouseover` | `__type(this: GlobalEventHandlers, ev: MouseEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/mouseover_event) |
| `onmouseup` | `__type(this: GlobalEventHandlers, ev: MouseEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/mouseup_event) |
| `onpaste` | `__type(this: GlobalEventHandlers, ev: ClipboardEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/paste_event) |
| `onpause` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLMediaElement/pause_event) |
| `onplay` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLMediaElement/play_event) |
| `onplaying` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLMediaElement/playing_event) |
| `onpointercancel` | `__type(this: GlobalEventHandlers, ev: PointerEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/pointercancel_event) |
| `onpointerdown` | `__type(this: GlobalEventHandlers, ev: PointerEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/pointerdown_event) |
| `onpointerenter` | `__type(this: GlobalEventHandlers, ev: PointerEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/pointerenter_event) |
| `onpointerleave` | `__type(this: GlobalEventHandlers, ev: PointerEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/pointerleave_event) |
| `onpointermove` | `__type(this: GlobalEventHandlers, ev: PointerEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/pointermove_event) |
| `onpointerout` | `__type(this: GlobalEventHandlers, ev: PointerEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/pointerout_event) |
| `onpointerover` | `__type(this: GlobalEventHandlers, ev: PointerEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/pointerover_event) |
| `onpointerrawupdate` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | Available only in secure contexts. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/pointerrawupdate_event) |
| `onpointerup` | `__type(this: GlobalEventHandlers, ev: PointerEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/pointerup_event) |
| `onprogress` | `__type(this: GlobalEventHandlers, ev: ProgressEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLMediaElement/progress_event) |
| `onratechange` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLMediaElement/ratechange_event) |
| `onreset` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLFormElement/reset_event) |
| `onresize` | `__type(this: GlobalEventHandlers, ev: UIEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLVideoElement/resize_event) |
| `onscroll` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Document/scroll_event) |
| `onscrollend` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Document/scrollend_event) |
| `onsecuritypolicyviolation` | `__type(this: GlobalEventHandlers, ev: SecurityPolicyViolationEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Document/securitypolicyviolation_event) |
| `onseeked` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLMediaElement/seeked_event) |
| `onseeking` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLMediaElement/seeking_event) |
| `onselect` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLInputElement/select_event) |
| `onselectionchange` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Document/selectionchange_event) |
| `onselectstart` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Node/selectstart_event) |
| `onslotchange` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLSlotElement/slotchange_event) |
| `onstalled` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLMediaElement/stalled_event) |
| `onsubmit` | `__type(this: GlobalEventHandlers, ev: SubmitEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLFormElement/submit_event) |
| `onsuspend` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLMediaElement/suspend_event) |
| `ontimeupdate` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLMediaElement/timeupdate_event) |
| `ontoggle` | `__type(this: GlobalEventHandlers, ev: ToggleEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/toggle_event) |
| `ontouchcancel` (optional) | `__type(this: GlobalEventHandlers, ev: TouchEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/touchcancel_event) |
| `ontouchend` (optional) | `__type(this: GlobalEventHandlers, ev: TouchEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/touchend_event) |
| `ontouchmove` (optional) | `__type(this: GlobalEventHandlers, ev: TouchEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/touchmove_event) |
| `ontouchstart` (optional) | `__type(this: GlobalEventHandlers, ev: TouchEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/touchstart_event) |
| `ontransitioncancel` | `__type(this: GlobalEventHandlers, ev: TransitionEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/transitioncancel_event) |
| `ontransitionend` | `__type(this: GlobalEventHandlers, ev: TransitionEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/transitionend_event) |
| `ontransitionrun` | `__type(this: GlobalEventHandlers, ev: TransitionEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/transitionrun_event) |
| `ontransitionstart` | `__type(this: GlobalEventHandlers, ev: TransitionEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/transitionstart_event) |
| `onvolumechange` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLMediaElement/volumechange_event) |
| `onwaiting` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLMediaElement/waiting_event) |
| `onwebkitanimationend` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | — |
| `onwebkitanimationiteration` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | — |
| `onwebkitanimationstart` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | — |
| `onwebkittransitionend` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | — |
| `onwheel` | `__type(this: GlobalEventHandlers, ev: WheelEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/wheel_event) |
| `outerHTML` | `string` | The **`outerHTML`** attribute of the Element DOM interface gets the serialized HTML fragment describing the element including its descendants. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/outerHTML) |
| `outerText` | `string` | The **`outerText`** property of the HTMLElement interface returns the same value as HTMLElement.innerText. [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/outerText) |
| readonly `ownerDocument` | `Document` | The read-only **`ownerDocument`** property of the Node interface returns the top-level document object of the node. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Node/ownerDocument) |
| readonly `parentElement` | `HTMLElement \| null` | The read-only **`parentElement`** property of Node interface returns the DOM node's parent Element, or `null` if the node either has no parent, or its parent isn't a DOM Element. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Node/parentElement) |
| readonly `parentNode` | `ParentNode \| null` | The read-only **`parentNode`** property of the Node interface returns the parent of the specified node in the DOM tree. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Node/parentNode) |
| `popover` | `string \| null` | The **`popover`** property of the HTMLElement interface gets and sets an element's popover state via JavaScript (`'auto'`, `'hint'`, or `'manual'`), and can be used for feature detection. [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/popover) |
| readonly `prefix` | `string \| null` | The **`Element.prefix`** read-only property returns the namespace prefix of the specified element, or `null` if no prefix is specified. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/prefix) |
| readonly `previousElementSibling` | `Element \| null` | Returns the first preceding sibling that is an element, and null otherwise. [MDN Reference](https://developer.mozilla.org/docs/Web/API/CharacterData/previousElementSibling) |
| readonly `previousSibling` | `ChildNode \| null` | The read-only **`previousSibling`** property of the Node interface returns the node immediately preceding the specified one in its parent's or `null` if the specified node is the first in that list. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Node/previousSibling) |
| readonly `PROCESSING_INSTRUCTION_NODE` | `7` | node is a ProcessingInstruction node. |
| `role` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/role) |
| readonly `scrollHeight` | `number` | The **`scrollHeight`** read-only property of the Element interface is a measurement of the height of an element's content, including content not visible on the screen due to overflow. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/scrollHeight) |
| `scrollLeft` | `number` | The **`scrollLeft`** property of the Element interface gets or sets the number of pixels by which an element's content is scrolled from its left edge. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/scrollLeft) |
| `scrollTop` | `number` | The **`scrollTop`** property of the Element interface gets or sets the number of pixels by which an element's content is scrolled from its top edge. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/scrollTop) |
| readonly `scrollWidth` | `number` | The **`scrollWidth`** read-only property of the Element interface is a measurement of the width of an element's content, including content not visible on the screen due to overflow. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/scrollWidth) |
| readonly `shadowRoot` | `ShadowRoot \| null` | The `Element.shadowRoot` read-only property represents the shadow root hosted by the element. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/shadowRoot) |
| `slot` | `string` | The **`slot`** property of the Element interface returns the name of the shadow DOM slot the element is inserted in. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/slot) |
| `spellcheck` | `boolean` | The **`spellcheck`** property of the HTMLElement interface represents a boolean value that controls the spell-checking hint. [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/spellcheck) |
| `tabIndex` | `number` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/tabIndex) |
| readonly `tagName` | `string` | The **`tagName`** read-only property of the Element interface returns the tag name of the element on which it's called. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/tagName) |
| readonly `TEXT_NODE` | `3` | node is a Text node. |
| `title` | `string` | The **`HTMLElement.title`** property represents the title of the element: the text usually displayed in a 'tooltip' popup when the mouse is over the node. [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/title) |
| `translate` | `boolean` | The **`translate`** property of the HTMLElement interface indicates whether an element's attribute values and the values of its Text node children are to be translated when the page is localized, or whether to leave them unchanged. [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/translate) |
| `writingSuggestions` | `string` | The **`writingSuggestions`** property of the HTMLElement interface is a string indicating if browser-provided writing suggestions should be enabled under the scope of the element or not. [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/writingSuggestions) |
| `classList` | `void` | — |
| `part` | `void` | — |
| `runtime` | `void` | — |
| `style` | `void` | — |
| `textContent` | `void` | — |
| `observedAttributes` | `void` | — |
| `addEventListener` | `void` | — |
| `after` | `void` | — |
| `animate` | `Animation` | — |
| `append` | `void` | — |
| `appendChild` | `T` | — |
| `attachInternals` | `ElementInternals` | — |
| `attachShadow` | `ShadowRoot` | — |
| `attributeChangedCallback` | `void` | — |
| `before` | `void` | — |
| `blur` | `void` | — |
| `checkVisibility` | `boolean` | — |
| `click` | `void` | — |
| `cloneNode` | `Node` | — |
| `closest` | `HTMLElementTagNameMap[K] \| null` | — |
| `compareDocumentPosition` | `number` | — |
| `computedStyleMap` | `StylePropertyMapReadOnly` | — |
| `connectedCallback` | `void` | — |
| `contains` | `boolean` | — |
| `disconnectedCallback` | `void` | — |
| `dispatchEvent` | `boolean` | — |
| `focus` | `void` | — |
| `getAnimations` | `Animation[]` | — |
| `getAttribute` | `string \| null` | — |
| `getAttributeNames` | `string[]` | — |
| `getAttributeNode` | `Attr \| null` | — |
| `getAttributeNodeNS` | `Attr \| null` | — |
| `getAttributeNS` | `string \| null` | — |
| `getBoundingClientRect` | `DOMRect` | — |
| `getClientRects` | `DOMRectList` | — |
| `getElementsByClassName` | `HTMLCollectionOf<Element>` | — |
| `getElementsByTagName` | `HTMLCollectionOf<HTMLElementTagNameMap[K]>` | — |
| `getElementsByTagNameNS` | `HTMLCollectionOf<HTMLElement>` | — |
| `getHTML` | `string` | — |
| `getRootNode` | `Node` | — |
| `hasAttribute` | `boolean` | — |
| `hasAttributeNS` | `boolean` | — |
| `hasAttributes` | `boolean` | — |
| `hasChildNodes` | `boolean` | — |
| `hasPointerCapture` | `boolean` | — |
| `hidePopover` | `void` | — |
| `insertAdjacentElement` | `Element \| null` | — |
| `insertAdjacentHTML` | `void` | — |
| `insertAdjacentText` | `void` | — |
| `insertBefore` | `T` | — |
| `isDefaultNamespace` | `boolean` | — |
| `isEqualNode` | `boolean` | — |
| `isSameNode` | `boolean` | — |
| `lookupNamespaceURI` | `string \| null` | — |
| `lookupPrefix` | `string \| null` | — |
| `matches` | `boolean` | — |
| `normalize` | `void` | — |
| `onCatalogChange` | `void` | — |
| `onDetach` | `void` | — |
| `onRuntime` | `void` | — |
| `prepend` | `void` | — |
| `querySelector` | `HTMLElementTagNameMap[K] \| null` | — |
| `querySelectorAll` | `NodeListOf<HTMLElementTagNameMap[K]>` | — |
| `releasePointerCapture` | `void` | — |
| `remove` | `void` | — |
| `removeAttribute` | `void` | — |
| `removeAttributeNode` | `Attr` | — |
| `removeAttributeNS` | `void` | — |
| `removeChild` | `T` | — |
| `removeEventListener` | `void` | — |
| `replaceChild` | `T` | — |
| `replaceChildren` | `void` | — |
| `replaceWith` | `void` | — |
| `requestFullscreen` | `Promise<void>` | — |
| `requestPointerLock` | `Promise<void>` | — |
| `scroll` | `void` | — |
| `scrollBy` | `void` | — |
| `scrollIntoView` | `void` | — |
| `scrollTo` | `void` | — |
| `setAttribute` | `void` | — |
| `setAttributeNode` | `Attr \| null` | — |
| `setAttributeNodeNS` | `Attr \| null` | — |
| `setAttributeNS` | `void` | — |
| `setHTMLUnsafe` | `void` | — |
| `setPointerCapture` | `void` | — |
| `showPopover` | `void` | — |
| `toggleAttribute` | `boolean` | — |
| `togglePopover` | `boolean` | — |
| `webkitMatchesSelector` | `boolean` | — |
| `define` | `void` | — |

**Attributes.** Every option is an attribute; changing one rebuilds the
overlay. Booleans are presence-based: present (any value except `false` or
`0`) enables, absent or `false` disables. Numbers are unitless pixels.

- Behaviour — `auto-hide`, `auto-hide-delay`, `hover-expand`, `draggable`,
  `click-to-jump`, `smooth`, `overscroll`, `touch`.
- Arrows — `arrows`, `arrow-icon`, `arrow-up-icon`, `arrow-down-icon`,
  `arrow-left-icon`, `arrow-right-icon` (SVG markup or URL).
- Geometry — `thickness`, `hover-thickness`, `radius`, `min-thumb-size`,
  `icon-size`, `offset` (uniform inset), `offset-top`, `offset-right`,
  `offset-bottom`, `offset-left` (per-side insets win over `offset`).
- Motion and paint — `track-opacity`, `thumb-opacity`, `duration`,
  `animation-duration`, `thumb-color`, `track-color`, `active-thumb-color`,
  `thumb-hover-color`. Colors default to the active theme's tokens.
- Placement — `z-index`, `dir` (`ltr` / `rtl` / `auto`), `axes`
  (comma-separated `vertical` / `horizontal`), `include` / `exclude`
  (comma-separated CSS selectors for the containers to track).

**Properties.** None of its own beyond the standard `HTMLElement` surface.

**Events.** Dispatches nothing of its own; it adds `tv-scrollbar-ready` to
the element once the overlay is measured and attached.

**Slots.** None — the element renders nothing into the document flow; the
overlay it creates lives outside it.

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


### `ThemvoraIntegrationOptions`
| Member | Type | Description |
| ------ | ---- | ----------- |
| `config` (optional) | `ThemvoraThemeConfig<ThemeDefinition<string>>` | The provider's theme configuration — the same object you pass to `getInitialThemeState` and `provider.astro`. |
| `defaultTheme` (optional) | `string` | Fallback theme name when no selection is persisted. |
| `injectBootstrap` (optional) | `boolean` | Set to `false` to skip injecting the pre-paint bootstrap script (e.g. when you emit it yourself with `createBlockingScript`). Defaults to `true`. |
| `injectStylesheet` (optional) | `boolean` | Emit the render-blocking pre-paint stylesheet, so the document is already themed **without JavaScript** — the same guarantee `themvoraVitePlugin` provides through its `css` option. |
| `mode` (optional) | `ThemeMode` | Fallback mode when no selection is persisted. Defaults to the fallback theme's own mode — the mode `defaultTheme` resolves to. |
| `navigation` (optional) | `boolean` | Keep the resolved theme across Astro client-side navigations (`<ClientRouter />`). Defaults to `true`. |
| `scrollbar` (optional) | `boolean \| PrePaintScrollbarOptions` | Hide the native scrollbar before first paint, so the Themvora overlay scrollbar (`ThemeScrollbar`) is the only scrollbar from the first frame — the same guarantee the Vite plugin and the Nuxt module provide. `true` hides it on fine-pointer (desktop) devices; pass `{ touch: true }` to hide it on coarse-pointer devices too. Defaults to `false`. |
| `themes` (optional) | `readonly ThemeDefinition<string>[]` | The theme registry the bootstrap resolves against. Defaults to the built-in neutral themes when omitted or empty. |

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

- [Tokens](/tokens) — Semantic token groups are the contract between a theme and the DOM: they flatten to CSS variables, never to hardcoded colors.
- [Runtime](/architecture) — One runtime per app owns the store, selection, registry, history, lifecycle and adapters; every framework binding is a thin view over it.
- [Persistence](/persistence) — Persist the selection across reloads and requests, with fingerprint validation, storage adapters and theme migrations.
- [Zero-flash bootstrap](/zero-flash) — Paint the correct theme on the first frame: a blocking script plus server-resolved initial state, with a Vite plugin for SPA builds.
- [Custom scrollbar](/custom-scrollbar) — Themed overlay scrollbars that match the active theme and pre-paint before hydration.
- [DevTools](/devtools) — Inspect and drive the live runtime from a panel: adapters, history, snapshots and performance entries.
- [Astro](/framework-guides/astro) — the framework integration
