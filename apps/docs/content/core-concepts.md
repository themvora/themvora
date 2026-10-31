## Theme

A **theme** is a named set of semantic tokens plus metadata. Themes are plain, serializable objects — no classes, no magic.

```ts
interface ThemeDefinition {
  name: string;                // e.g. "plum-dark"
  extends?: string | string[]; // inherit from another theme
  meta?: ThemeMeta;            // label, family, mode, order, tags, version...
  tokens?: ThemeTokens;        // colors, spacing, radius, shadows, ...
}
```

A concrete theme looks like this:

```ts
import { defineTheme } from "@themvora/core";

const plumDark = defineTheme({
  name: "plum-dark",
  meta: {
    family: "plum",
    mode: "dark",
    label: "Plum Dark",
    order: 20,
    tags: ["preset"],
  },
  tokens: {
    colors: {
      background: "#171123",
      foreground: "#f6f1fb",
      primary: "#a78bfa",
      card: "#221a33",
      border: "#3b2d55",
      // ... every semantic role
    },
    radius: { lg: "14px" },
  },
});
```

`meta` also carries `created` and `updated` timestamps (added automatically when a theme is registered), plus `version` for migrations.

## Token Groups

Tokens are grouped by **semantic meaning**, not raw values:

- `colors` — nested, recursively-addressable: `colors.surface.default`, `colors.primary`, `colors.accent.hover`
- `spacing`, `radius`, `shadows`, `borderWidths`, `zIndex`, `breakpoints`
- `typography` — `fontFamilies`, `fontSizes`, `lineHeights`

Because tokens are plain nested objects, you can address any leaf by its path — `theme.tokens.colors.primary` — and merge partial overrides safely.

## Mode & Family

- **Mode** — `"light" | "dark" | "system"`. `system` follows the OS with `prefers-color-scheme`.
- **Family** — a named set of themes (e.g. `"plum"`, `"mint"`, `"apple"`). Switching family changes the palette; switching mode changes light/dark within that family.

```ts
runtime.selection.setFamily("plum");  // plum light/dark pair
runtime.selection.setMode("dark");    // whichever plum is active, use dark
runtime.selection.toggleTheme();      // flip between light and dark
```

The active theme is always resolved from **family + mode** — the library picks the matching theme in the registry.

## Semantic Token Groups

Nested token objects become **recursive groups**. The emitter walks each group,
joins every nested level with `-`, and appends the key **verbatim**:

```
--theme-color-background          /* colors.background            */
--theme-color-cardForeground      /* colors.cardForeground        */
--theme-typography-font-size-2xl  /* typography.fontSizes["2xl"]  */
--theme-shadow-md                 /* shadows.md                   */
--theme-breakpoint-lg             /* breakpoints.lg               */
--theme-radius-lg
--theme-spacing-4
```

Two naming rules follow from "verbatim", and both catch people out:

- **Colour keys stay camelCase.** The real property is
  `--theme-color-cardForeground`, not `--theme-color-card-foreground`. Only
  *nested levels* gain a `-`; a key is never re-cased or split.
- **Two group prefixes are singular.** `shadows` emits `--theme-shadow-*` and
  `breakpoints` emits `--theme-breakpoint-*`, not `--theme-shadows-*` /
  `--theme-breakpoints-*`.

Every token maps to a `--theme-*` variable automatically via `themeToCSSVariables`:

```ts
import { themeToCSSVariables } from "@themvora/core";

const vars = themeToCSSVariables(plumDark, { prefix: "theme-" });
// { "--theme-color-background": "#171123", "--theme-radius-lg": "14px", ... }
```

## The Theme Store

A minimal reactive store that holds the active theme.

```ts
import { createThemeStore } from "@themvora/core";

const store = createThemeStore({ initialTheme: myTheme });

store.get();                                        // current theme
store.set(nextTheme);                               // apply
store.subscribe((theme) => render(theme));          // react to changes
store.batch(() => { store.set(a); store.set(b); }); // coalesce writes
store.destroy();
```

## Model Builders

Type-safe, zero-cost helpers for composing themes: `defineTheme`, `extendTheme`, `composeTheme`, `mergeThemeDefinitions`, `mergeTokens`, and `resolveTheme`.

See the [Tokens reference](/tokens) for full code examples of each builder.

## Theme Registry

Every registered theme lives in a registry — the engine behind dynamic theming, family lookups, and theme packs.

```ts
import { createThemeRegistry } from "@themvora/core";

const registry = createThemeRegistry();

registry.register(theme);
registry.registerMany([a, b]);
registry.unregister("plum-dark");
registry.replace("plum-dark", newDark);
registry.get("plum-light");
registry.has("plum-light");
registry.list();

registry.getFamilies();                 // ["default", "oat", "plum", ...]
registry.getThemesByFamily("plum");     // plum light + dark

// Install a theme pack — a named bundle of themes you supply.
registry.use({ name: "brand", themes: [brandLight, brandDark] });
```

A **theme pack** is a named bundle of themes; every theme it installs is stamped with a `pack:<name>` tag in its meta.

## The Theme Runtime

`createThemeRuntime` wires everything together — store, registry, selection, persistence, broadcast, DOM bindings, history, lifecycle, and plugins — into one object.

```ts
import { createThemeRuntime } from "@themvora/core";

const runtime = createThemeRuntime({
  defaultTheme: "light",
  transition: { enabled: true, duration: 300 },
  plugins: [createPersistencePlugin(), createHistoryPlugin()],
});
```

Every capability is documented with snippets in the **Architecture** section. Key surfaces: `store`, `registry`, `selection`, `themes`, `update`, `use`, `batch`, `snapshot`/`restore`, `history`, `lifecycle`, `destroy`.

## Token Resolution

Tokens support **references and derived values**, resolved lazily at runtime:

- **References** — `"$colors.primary"` or `"{colors.primary}"` point to another token (with circular-reference detection).

```ts
{
  tokens: {
    colors: { primary: "#6366f1", ring: "$colors.primary" },
  },
}
```

- **Expressions** — numeric math such as `"calc(100% + 2rem)"`-style evaluations:

```ts
spacing: { "12": "calc(3rem + 0.75rem)" }
```

- **Derived colors** — `"contrast(#123456)"` returns black/white by WCAG luminance; `"auto()"` derives a foreground from a base token:

```ts
colors: {
  primary: "#6366f1",
  primaryForeground: "auto()", // readable on primary
}
```

Utilities: `flattenTokens`, `resolveTokens`, `evaluateExpression`.

## Theme Generation

`generateTheme()` produces a complete light + dark theme pair from a single seed color, deriving secondary, muted, accent, card, popover, input, border, and ring colors in OKLCH with WCAG-compliant code tokens. See the [Custom Themes guide](/custom-themes) for the full generation API, style options, and guarantees.

## Theme Validation

`validateTheme()` checks that a theme defines all required semantic color tokens, resolving `extends` chains when a theme list is provided. See the [Accessibility guide](/accessibility) for the full validation API and contrast auditing.

## Theme Migration

Version themes with a migration chain so old theme files automatically upgrade to the latest format. See the [Migration guide](/migration) for `registerMigration`, `migrateTheme`, and the full API.

## Theme History (Undo / Redo)

History is capped (default 50 steps) and records full theme snapshots with timestamps.

```ts
runtime.history.undo();        // step back
runtime.history.redo();        // step forward
runtime.history.jump(i);       // jump to any point in time
runtime.history.canUndo();     // / canRedo()
runtime.history.getHistory();  // / clear()
```

## Lifecycle Events

`runtime.lifecycle.on(event, handler)` with typed payloads:

| Event               | Payload             |
| ------------------- | ------------------- |
| `beforeThemeChange` | `{ current, next }` |
| `afterThemeChange`  | `{ theme }`         |
| `beforePersist`     | `{ selection }`     |
| `afterPersist`      | `{ selection }`     |
| `beforeApply`       | `{ theme }`         |
| `afterApply`        | `{ theme }`         |

```ts
const off = runtime.lifecycle.on("afterThemeChange", ({ theme }) => {
  console.log("applied", theme.name);
});
```

## Plugins

Plugins hook into the lifecycle and can transform tokens.

```ts
interface ThemePlugin {
  name: string;
  priority?: number;
  onBeforeThemeChange?(data): void;
  onAfterThemeChange?(data): void;
  onBeforePersist?(data): void;
  onAfterPersist?(data): void;
  onBeforeApply?(data): void;
  onAfterApply?(data): void;
  transformTokens?(tokens, ctx): ThemeTokens;
}
```

**Official plugins:**

- `createPersistencePlugin()` — persist selection to localStorage
- `createBroadcastPlugin()` — cross-tab sync
- `createHistoryPlugin()` — undo/redo
- `createAnimationsPlugin()` — theme transition animation control
- `createAccessibilityPlugin()` — contrast / accessibility enforcement
- `createScheduledPlugin()` — auto light/dark by solar time
- `createDebuggerPlugin()` — theme change logging
- `createDevToolsPlugin()` — exposes the runtime on `window.__THEMVORA_DEVTOOLS__` for a devtools extension. Core's version is the lightweight bridge (state only); the inspector that records entries and timings is `@themvora/devtools`'s `createDevToolsPlugin`.
- `createGenerationPlugin()` — live theme generation from a seed

## Accessibility Toolkit

```ts
import {
  getContrastRatio,
  validateThemeContrast,
  simulateCVD,
  simulateThemeForCVD,
} from "@themvora/core";

const ratio = getContrastRatio("#ffffff", "#171123"); // 15.6...
const audit = validateThemeContrast(theme);            // full theme audit

// Color Vision Deficiency simulation (protanopia, deuteranopia, ...)
const simulated = simulateCVD("#6366f1", "deuteranopia");
```

## DOM Adapters

- **CSS Variables binding** — `createCSSVariablesBinding(store, { prefix, target, transition, styleSheet, layerName })`. Writes `--theme-*` variables inline or into a `@layer` stylesheet; batches writes and diffs against previously applied variables for minimal DOM churn.
- **DOM Attribute binding** — `createDOMBinding(store, { target, attributeName, transition })`. Sets `data-theme`, `data-theme-family`, `data-theme-mode`, toggles the `.dark` class, and sets `color-scheme`.
- **System theme binding** — `createSystemThemeBinding(store, { lightTheme, darkTheme })` — follows `prefers-color-scheme`.
- **Scoped theme binding** — `createScopedThemeBinding(themes, target, themeName)` — apply a theme to a subtree.
- **Transitions** — `ThemeTransitionOptions`: `enabled`, `duration`, `easing`, `useViewTransition`, `properties[]` (40+ default animated properties).
- **View Transitions API** — native `document.startViewTransition` when switching themes.

```ts
import { createCSSVariablesBinding, createDOMBinding } from "@themvora/core";

const css = createCSSVariablesBinding(store, { prefix: "theme-" });
const dom = createDOMBinding(store, {
  attributeName: "data-theme",
  transition: { enabled: true, duration: 300 },
});
```

## Multi-Window Sync

Sync theme selection across tabs/windows instantly:

- **BroadcastChannel** — primary transport (`createThemeSelectionBroadcast`)
- **SharedWorker** — inline blob-based worker relay
- **StorageEvent fallback** — `createStorageEventSync`
- **Auto strategy** — `createMultiWindowSync({ prefer: "auto" | "broadcast" | "sharedworker" })` picks the best available transport and reports fallbacks
- **Zero-flicker** — transitions are suppressed while applying cross-tab syncs

```ts
import { createMultiWindowSync } from "@themvora/core";

const sync = createMultiWindowSync({ prefer: "auto" });
// choose the theme in one tab — every other tab follows instantly
```

## Scheduled Themes (Solar Time)

Automatically switch between light and dark themes based on actual sunrise/sunset. The schedule derives light/dark variants from the active family, auto-detects the visitor's location from their browser timezone, and exposes a separate *effective mode* channel so UI can reflect appearance without overwriting the user's explicit choice.

See the [Sunrise & Sunset guide](/sunrise-sunset) for the full configuration API, `getTimes` customization, the configured-vs-effective mode table, and framework accessors.

## Persistence

- `createPersistencePlugin({ key })` — full selection persistence (mode + family) as a runtime plugin; default key `theme-selection`
- `createThemePersistence({ storage, key })` — mode-only persistence (`theme-mode`), returned as a `ThemePersistenceAdapter` for manual wiring (not directly assignable to the runtime `persistence` option)
- `ThemeSelectionPersistenceAdapter` — the interface the runtime persistence option expects (`get/set/remove/subscribe` over `{ mode, family }`); default runtime persistence stores `{ mode, family }` under `theme-selection` in localStorage with a `storage` event subscription

```ts
import { createPersistencePlugin } from "@themvora/core";

// Recommended: full selection (mode + family) persistence
const runtime = createThemeRuntime({
  plugins: [createPersistencePlugin({ key: "my-app-theme" })],
});
```

## Bootstrap (Zero Flash of Wrong Theme)

- `createThemeBootstrapScript({ themes, defaultTheme, initialMode, initialFamily, storageKey, prefix })` — generates a **blocking inline script** that reads the persisted selection, resolves the effective mode (`system` → `prefers-color-scheme`), and applies CSS variables + DOM effects before first paint.
- `buildThemeCssMap(themes)` — maps theme names and `family:mode` keys to flat CSS variable maps.
- `darkModeCSSTemplate(variables)` — a `@media (prefers-color-scheme: dark)` block carrying one theme's variables. This is a **pre-script** fallback only. It cannot override an inline `style` on the same element — inline declarations outrank every stylesheet rule regardless of specificity — so do not pair it with a server render that inlines the *light* variables, or an OS-dark visitor keeps the light ones. When the resolved mode is `system`, express both schemes in CSS instead: `systemModeCSSTemplate(light, dark)` from `@themvora/core` — which emits light *and* dark media blocks and expects **no** inline variables. `@themvora/astro` re-exports the same two functions, and `@themvora/angular`'s `createBlockingScriptContent` applies the identical rule internally.

```ts
import {
  createThemeBootstrapScript,
  buildThemeCssMap,
  darkModeCSSTemplate,
  getBuiltInThemes,
} from "@themvora/core";

// buildThemeCssMap/createThemeBootstrapScript take the registry explicitly;
// the built-in set is a valid registry, so no theme file is needed.
const themes = getBuiltInThemes();

const cssMap = buildThemeCssMap(themes);
const script = createThemeBootstrapScript({ themes, defaultTheme: "light" });
// Neutral themes carry no family, so they are keyed by name only.
const fallbackCSS = darkModeCSSTemplate(cssMap["dark"] ?? {});
```

## Built-in Themes

The library ships with neutral light/dark themes, nine preset families (Oat, Berry, Mint, Citrus, Cocoa, Plum, Iris, Sky, Graphite), brand presets (Apple, GitHub, Vercel, Slack, Discord), and accessibility profiles (High Contrast, Large Text).

See the [Presets page](/presets) for the full catalog and `getPresetThemes()` / `getBrandPresets()` API, and the [Accessibility guide](/accessibility) for the contrast profiles.

## Vanilla (No Framework)

`@themvora/core/vanilla` provides the `Themvora` class — framework-free drop-in theming:

```js
import { Themvora } from "@themvora/core/vanilla";

const kit = new Themvora();       // or Themvora.init()
kit.setMode("dark");
kit.setFamily("plum");
kit.toggleTheme();
kit.update({ colors: { primary: "#07f" } });
kit.use({ name: "brand", themes: [...] });
kit.toCSSVariables();
kit.on("themeChange", (theme) => console.log(theme.name));
kit.destroy();
```

Events: `themeChange`, `modeChange`, `familyChange`. Exposes `.runtime`, `.registry`, `.theme`, `.mode`, `.family`, `.themes`.

## Vite Plugin

`@themvora/core/vite` injects the blocking bootstrap script into `index.html` (`head-prepend`) so the persisted theme applies before first paint in client-rendered apps — no manual inline scripts.

```ts
import { defineTheme, defineThemvoraConfig } from "@themvora/core";

const themes = [
  defineTheme({
    name: "brand-light",
    meta: { family: "brand", mode: "light" },
    tokens: { colors: { background: "#ffffff" } },
  }),
  defineTheme({
    name: "brand-dark",
    meta: { family: "brand", mode: "dark" },
    tokens: { colors: { background: "#101014" } },
  }),
];

export default defineThemvoraConfig({
  themes,
  defaultTheme: "brand-light",
  // Opt in to following the OS. The plugin's bootstrap and the client runtime
  // both read this one value, so there is nothing to keep in sync.
  initialMode: "system",
});
```

```ts
import { themvoraVitePlugin } from "@themvora/core/vite";

export default defineConfig({
  plugins: [react(), themvoraVitePlugin()],
});
```

The plugin **discovers** `theme.config.ts` at the project root, derives the
bootstrap from it, and transports the same configuration to the runtime. Do not
repeat `themes` / `defaultTheme` / `initialMode` in `vite.config.ts` — declaring
them twice is how the script and the runtime drift apart, and a drift is visible
as a flash of the wrong theme.

## Framework Integrations

The same runtime powers every framework integration:

- `@themvora/react` — provider, hooks, `ThemeScope`, `ThemeInspector`, `ThemeModeButton`
- `@themvora/next` — App Router SSR, cookies, zero-flash hydration
- `@themvora/vue`, `@themvora/svelte`, `@themvora/solid`, `@themvora/angular` — provider + composables/stores/signals/injectables
- `@themvora/web` — `<themvora-provider>`, `<themvora-toggle>`, `<themvora-select>`, `<themvora-scope>` custom elements
- `@themvora/tailwind` — Tailwind CSS v4 `@theme` mapping
- `@themvora/astro`, `@themvora/nuxt`, `@themvora/remix` — island/SSR integrations
