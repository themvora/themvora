## @themvora/core/vite
Themvora Vite plugin — injects the zero-flash bootstrap script and the
pre-paint scrollbar CSS into the served HTML.

Imported from the `@themvora/core/vite` subpath. Use with the Vite
configuration of vanilla or framework apps that render HTML on the
server.

> Generated from `packages/core/src` by `apps/docs/scripts/generate-api-reference.mjs`. Do not edit by hand — run `pnpm --filter @themvora/docs api:generate`.

## Functions

### `themvoraVitePlugin<T extends ThemeDefinition<string>>(options): ThemvoraVitePlugin`
Vite plugin that injects the theme bootstrap as a blocking inline script at
the top of `index.html`, so the persisted theme is applied before the first
paint. Prevents the flash-of-wrong-theme on reload for client-rendered apps.

**See also:** `ThemvoraVitePluginOptions`

| Parameter | Type | Description |
| --------- | ---- | ----------- |
| `options` | `ThemvoraVitePluginOptions<T>` | Build-time options. Optional; the default discovery path needs none. |

**Returns** `ThemvoraVitePlugin` — A Vite plugin, to be added to `plugins`.

**Config discovery.** The plugin looks for the application's
`theme.config.ts` in Vite's root (`config.root`, or `process.cwd()` when
unset), trying `theme.config.ts`, `.tsx`, `.mts`, `.mjs`, `.js` and `.cjs` in
that order. The file must have a default export — the object
defineThemvoraConfig returns. Discovery goes through Vite's own
`loadConfigFromFile`, so a TypeScript config resolves its imports exactly as
`vite.config.ts` does.

**What it injects.** Three things, all derived from that one configuration
and emitted in this order (`head-prepend`, `enforce: "pre"`):

1. a render-blocking `<style>` from createThemePrePaintCss — the
   fallback theme, the `prefers-color-scheme` dark fallback when the mode is
   `"system"`, and one rule per declared theme;
2. `window.__THEMVORA_CONFIG__`, the serializable
   ThemeBootstrapConfig projection the provider reads;
3. the classic blocking bootstrap script that restores the persisted
   selection.

When `scrollbar` is enabled, the pre-paint scrollbar script follows. The
stylesheet is what themes a page with JavaScript disabled; the script is what
restores a saved non-default theme before the body is parsed.

**Validation.** The provider in the transformed HTML is parsed and checked
against the config: unknown theme names, a default theme outside the
generated collection, an invalid `initial-mode`, and a provider that resolves
a different initial theme all fail the build with an actionable message.
Provider JSON theme definitions are added to the generated collection, so a
runtime-only catalog the plugin can see is still painted.

**Development.** `transformIndexHtml` runs on every dev page load, so the
injected resources are always current for the running process. The *discovered
config* is resolved once and memoized, so editing `theme.config.ts` needs a
dev-server restart; editing `vite.config.ts` restarts Vite anyway, so the
plugin's own options do not.

**Production.** The resources are injected into the generated HTML at build
time and run before the application bundle. They are not emitted as separate
chunks.

**Limitations.** The plugin only validates a provider that is present in the
document it transforms; a provider inserted later from framework state is
runtime-only. It does not serve SSR HTML: frameworks that render on the
server (Next.js, Nuxt, Remix, Astro) have their own packages, which emit the
same bootstrap from the server. Themes registered imperatively with
`runtime.use()` after load are not in the generated CSS.

```ts
// Nothing to configure beyond registering the plugin.
import { themvoraVitePlugin } from "@themvora/core/vite";

export default defineConfig({
  plugins: [react(), themvoraVitePlugin()],
});
```

---

## Interfaces

### `ThemvoraThemeConfig<T extends ThemeDefinition>`
The deprecated inline form of the theme configuration: the registry, the
fallback theme, the initial mode/family, and the persistence key and prefix,
passed straight to themvoraVitePlugin.

**See also:** `themvoraVitePlugin`

| Member | Type | Description |
| ------ | ---- | ----------- |
| `defaultTheme` (optional) | `T["name"]` | Theme name to fall back to when no persisted selection exists. |
| `initialFamily` (optional) | `string` | Family used when no persisted selection exists. |
| `initialMode` (optional) | `ThemeMode` | Mode used when no persisted selection exists. Defaults to the fallback theme's own mode — whatever `defaultTheme` resolves to, so a `defaultTheme="light"` app paints light from frame one. |
| `prefix` (optional) | `string` | CSS custom property prefix. Defaults to `"theme-"`. |
| `scrollbar` (optional) | `boolean \| PrePaintScrollbarOptions` | Pre-paint hiding of the native scrollbar for the overlay scrollbar. |
| `storageKey` (optional) | `string` | localStorage key holding the persisted theme selection. Defaults to `"theme-selection"`. |
| `themes` | `readonly T[]` | The theme definitions registered with the runtime. |
| `transition` (optional) | `boolean \| ThemeTransitionOptions` | Theme-change transition. `true` uses the defaults, `false` swaps synchronously, and an object configures the animation. |

---


### `ThemvoraViteInjectedTag`
Structural twin of Vite's `HtmlTagDescriptor`. Kept local so the plugin does
not need a hard dependency on `vite` types; the shape is assignable to
Vite's `IndexHtmlTransformResult` in Vite 4 through 8.

| Member | Type | Description |
| ------ | ---- | ----------- |
| `attrs` (optional) | `Record<string, string \| boolean \| undefined>` | — |
| `children` (optional) | `string` | — |
| `injectTo` (optional) | `"head" \| "body" \| "head-prepend" \| "body-prepend"` | — |
| `tag` | `string` | — |

---


### `ThemvoraVitePlugin`
| Member | Type | Description |
| ------ | ---- | ----------- |
| `enforce` | `"pre"` | — |
| `name` | `string` | — |
| `configResolved` (optional) | `void` | — |
| `configureServer` (optional) | `void` | — |
| `load` (optional) | `string \| Promise<string \| null \| undefined> \| null \| undefined` | — |
| `resolveId` (optional) | `string \| Promise<string \| null \| undefined> \| null \| undefined` | — |
| `transformIndexHtml` | `string \| ThemvoraViteInjectedTag[] \| { html: string; tags: ThemvoraViteInjectedTag[] } \| Promise<string \| ThemvoraViteInjectedTag[] \| { html: string; tags: ThemvoraViteInjectedTag[] }>` | — |

---


### `ThemvoraVitePluginOptions<T extends ThemeDefinition>`
Options for themvoraVitePlugin: where the application configuration
lives, plus the concerns that only exist at build time.

**See also:** `themvoraVitePlugin`

| Member | Type | Description |
| ------ | ---- | ----------- |
| `boot` (optional) | `boolean` | Emit the blocking pre-paint boot script. Defaults to `true`. |
| `config` (optional) | `string \| ThemvoraThemeConfig<T>` | The application's theme configuration, when discovery is not enough. |
| `css` (optional) | `boolean` | Emit the render-blocking theme stylesheet generated from the declared theme collection. Defaults to `true`. |
| `defaultTheme` (optional) | `T["name"]` | Theme name to fall back to when no persisted selection exists. |
| `initialFamily` (optional) | `string` | Family the pre-paint script uses when no persisted selection exists. |
| `initialMode` (optional) | `ThemeMode` | Mode the pre-paint script uses when no persisted selection exists. |
| `prefix` (optional) | `string` | CSS custom property prefix. |
| `scrollbar` (optional) | `boolean \| PrePaintScrollbarOptions` | Hide native scrollbars before first paint by injecting the scrollbar pre-paint bootstrap script. `true` hides them (desktop), an options object keeps native bars on coarse-pointer devices unless `touch` is forced. Default `false` — the script is only needed when the page uses the Themvora overlay scrollbar. |
| `ssrContainer` (optional) | `string` | `id` of the element `ssrEntry`'s markup is injected into. |
| `ssrEntry` (optional) | `string \| null` | Module that exports `render(): string` — the app's markup, server-rendered. Set it and the plugin prerenders `#root` in the **dev server** as well as in a build. |
| `storageKey` (optional) | `string` | localStorage key holding the persisted theme selection. |
| `syncFirstRender` (optional) | `boolean` | Make React's first render commit synchronously, so the browser's first painted frame is already the app. Defaults to `true`. |
| `themes` (optional) | `readonly T[]` | The theme definitions registered with the runtime. |

---

## Related docs

- [Zero-flash bootstrap](/zero-flash) — Paint the correct theme on the first frame: a blocking script plus server-resolved initial state, with a Vite plugin for SPA builds.
