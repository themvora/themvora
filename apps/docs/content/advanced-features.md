## Live Theme Generation

`generateTheme()` produces a complete light + dark theme pair from a single seed hex color. It converts the seed to **OKLCH**, then derives secondary, muted, accent, card, popover, input, border and ring colors by adjusting lightness and chroma — low chroma for muted tones, shifted hue for accent, and the seed itself for `primary`/`ring`.

OKLCH rather than HSL because its lightness is perceptually uniform: equal steps read as equal steps, so a generated ramp looks even instead of bunching up at the ends. Contrast is then solved against the declared contract rather than approximated.

```ts
import { generateTheme, mergeTokens } from "@themvora/core";

const { light, dark } = generateTheme({ seed: "#6366f1", family: "indigo" });

// Override defaults — mergeTokens deep-merges partial tokens into the generated theme
const customLight = {
  ...light,
  tokens: mergeTokens(light.tokens, {
    radius: { lg: "14px" },
    colors: { destructive: "#dc2626" },
  }),
};
```

The `family` parameter controls the theme name prefix (`"indigo-light"` / `"indigo-dark"`); omit it and the default is `"generated"`. Contrast-aware foregrounds are computed via WCAG relative luminance — `primaryForeground` gets white or dark ink based on the seed's lightness.

## Theme Validation

`validateTheme()` checks that every required semantic color token is defined. Pass a theme list to resolve `extends` chains before validation.

```ts
import { validateTheme } from "@themvora/core";

const result = validateTheme(childTheme, { themes: [baseTheme, childTheme] });
// { valid: boolean, issues: [{ type: "missing", path: "colors.destructive", message: "..." }] }
```

The required color keys are: `background`, `foreground`, `card`, `cardForeground`, `popover`, `popoverForeground`, `primary`, `primaryForeground`, `secondary`, `secondaryForeground`, `muted`, `mutedForeground`, `accent`, `accentForeground`, `destructive`, `destructiveForeground`, `success`, `successForeground`, `border`, `input`, `ring`.

Use in CI:

```ts
import { getBuiltInThemes, validateTheme } from "@themvora/core";

const themes = getBuiltInThemes();
const failures = themes
  .map((t) => ({ name: t.name, ...validateTheme(t) }))
  .filter((r) => !r.valid);

if (failures.length > 0) {
  console.error("Validation failures:", failures);
  process.exit(1);
}
```

## Theme Migration

Version your themes with a linear migration chain. `registerMigration()` declares a step between two versions; `migrateTheme()` walks the chain from the current version to the target.

```ts
import { registerMigration, migrateTheme } from "@themvora/core";

registerMigration({
  from: "1.0.0",
  to: "2.0.0",
  description: "Rename primaryColor to primary",
  remapColors: [{ from: "primaryColor", to: "primary" }],
});

registerMigration({
  from: "2.0.0",
  to: "3.0.0",
  description: "Add success token",
  migrate(theme) {
    return {
      ...theme,
      tokens: {
        ...theme.tokens,
        colors: {
          ...theme.tokens?.colors,
          success: "#22c55e",
          successForeground: "#ffffff",
        },
      },
    };
  },
});

const migrated = migrateTheme(oldTheme, { targetVersion: "3.0.0" });
```

`remapColors` handles simple key renames; `migrate` handles arbitrary transforms. The chain is walked linearly (max 20 steps) — the `from` version of each step must equal the `to` of the previous one.

## Token Resolution Deep Dive

Tokens support three kinds of dynamic values, resolved lazily by `resolveTokens()`:

**References** — `$colors.primary` or `{colors.primary}` point to another token. Circular references throw.

```ts
tokens: {
  colors: {
    primary: "#6366f1",
    ring: "$colors.primary",
    cardForeground: "{colors.primary}",
  },
}
```

**Expressions** — numeric math evaluated at resolve time.

```ts
spacing: { "12": "calc(3rem + 0.75rem)" }
```

**Derived colors** — `contrast()` returns black/white by WCAG luminance; `auto()` derives a readable foreground from a sibling.

```ts
tokens: {
  colors: {
    primary: "#6366f1",
    primaryForeground: "auto()",           // white or dark ink based on primary
    muted: "#f1f5f9",
    mutedForeground: "contrast(muted)",    // black on light, white on dark
  },
}
```

Resolution walks the token tree — references first, then expressions, then derived calls. Utilities:

```ts
import { flattenTokens, resolveTokens } from "@themvora/core";

const flat = flattenTokens(myTheme.tokens);       // { "colors.primary": "#6366f1", ... }
const deep = resolveTokens(myTheme.tokens);        // returns a new ThemeTokens tree
```

## Plugin Authoring

Plugins implement the `ThemePlugin` interface and are registered via the `plugins` option or `runtime.registry.use()`.

```ts
import type { ThemePlugin } from "@themvora/core";

const watermarkPlugin: ThemePlugin = {
  name: "watermark",
  priority: 10,               // lower runs first

  onRuntimeCreated(runtime) {
    // access runtime.store, runtime.selection, etc.
  },

  transformTokens(tokens, { theme }) {
    // inject a derived token into every theme
    return {
      ...tokens,
      colors: {
        ...tokens.colors,
        watermark: `${tokens.colors?.primary ?? "#000"}22`,  // 10% opacity
      },
    };
  },

  onAfterThemeChange({ theme }) {
    console.log(`[watermark] applied: ${theme.name}`);
  },

  onDestroy() {
    // cleanup
  },
};
```

Priority controls execution order — lower numbers run first. `transformTokens` is called for every theme change and receives the merged token tree; it must return the modified tree. Plugins can be added/removed at runtime:

```ts
import { createThemeRuntime } from "@themvora/core";

const runtime = createThemeRuntime({
  plugins: [watermarkPlugin],
});
```

## runtime.update()

`update()` merges partial tokens into the current live theme without replacing it. The merge is deep — nested color objects are merged recursively, then all plugins' `transformTokens` run, and the result is resolved.

```ts
// live-edit: override just the primary color
runtime.update({
  colors: { primary: "#f97316" },
});

// override multiple groups at once
runtime.update({
  colors: { primary: "#f97316", accent: "#eab308" },
  radius: { lg: "20px" },
});
```

This triggers the full lifecycle: `beforeThemeChange` → store update → `beforePersist` → `afterPersist` → `afterThemeChange`.

## runtime.snapshot() / restore()

Capture the entire runtime state — current theme, selection, history, and registry — then restore it later. Useful for undo/redo implementations, test fixtures, or time-travel debugging.

```ts
// capture
const snap = runtime.snapshot();
// snap: { theme, selection: { mode, family }, history: [...], registry: { themes: [...] } }

// ... user makes changes ...

// restore
runtime.restore(snap);
```

Both use `structuredClone` internally, so the snapshot is a deep copy — mutations to the snapshot don't affect the live runtime.

## runtime.batch()

Batch coalesces multiple store writes into a single lifecycle cycle. Without `batch`, each `set` or `update` triggers the full event chain.

```ts
runtime.batch(() => {
  runtime.update({ colors: { primary: "#f97316" } });
  runtime.selection.setFamily("ocean");
  runtime.selection.setMode("dark");
});
// single beforeThemeChange / afterThemeChange pair
```

If any intermediate state would be invalid, the batch still completes — there's no rollback. Use it when you know the final state is correct but don't want intermediate renders.

## Theme Packs

A theme pack is a named bundle of themes. `runtime.use()` installs the pack — every theme it contains is tagged `pack:<name>` in its meta.

```ts
const brandPack = {
  name: "brand",
  themes: [
    defineTheme({ name: "brand-light", meta: { family: "brand", mode: "light" }, tokens: { ... } }),
    defineTheme({ name: "brand-dark", meta: { family: "brand", mode: "dark" }, tokens: { ... } }),
  ],
};

runtime.use(brandPack);

// themes are now available for selection
runtime.selection.setFamily("brand");
runtime.selection.setMode("dark");
```

Under the hood, `runtime.use()` delegates to `registry.use()`, which registers every theme in the pack and stamps the `pack:brand` tag. The registry's `getThemesByFamily` and `getFamilies` methods immediately reflect the new themes.

## Accessibility Profiles

`getAccessibilityProfiles()` returns pre-built high-contrast and large-text themes. `simulateCVD()` and `simulateThemeForCVD()` model how a theme appears under color vision deficiencies.

```ts
import {
  getAccessibilityProfiles,
  simulateCVD,
  simulateThemeForCVD,
  validateThemeContrast,
} from "@themvora/core";

// pre-built accessibility themes
const profiles = getAccessibilityProfiles();
// [high-contrast-light, high-contrast-dark, large-text-light, large-text-dark]

// simulate how a color looks under deuteranopia
const simulated = simulateCVD("#6366f1", "deuteranopia");

// simulate an entire theme
const deutTheme = simulateThemeForCVD(myTheme, "deuteranopia");

// audit every foreground/background pair
const audit = validateThemeContrast(myTheme);
// { valid: boolean, checks: [{ foregroundToken, backgroundToken, ratio,
//   passesAANormal, passesAALarge, passesAAANormal, passesAAALarge }] }
```

CVD types: `"protanopia"` (red-blind), `"deuteranopia"` (green-blind), `"tritanopia"` (blue-blind), `"achromatopsia"` (total color blindness).

Use `validateThemeContrast` in CI to catch regressions:

```ts
const result = validateThemeContrast(theme);
if (!result.valid) {
  for (const check of result.checks.filter((c) => !c.passesAALarge)) {
    console.error(
      `${check.foregroundToken} on ${check.backgroundToken}: ` +
        `${check.ratio.toFixed(2)}:1 (fails AA large text)`,
    );
  }
  process.exit(1);
}
```

## Live runtime configuration

Every configuration input below is reconciled through one shared contract:
`runtime.configure(update)`. The framework providers forward changed props to
it; nothing recreates the runtime, reloads the page, or resets the active theme,
selection, persistence or history.

Precedence and validation live in the runtime, not in the adapters, so React,
Vue, Svelte, Solid, Web Components, Astro, Next and Nuxt all behave the same
way. Only the *inputs the caller supplied* are applied: omitting a prop leaves
its current value alone, so a provider that never sets `transition` cannot
reset a transition configured at creation.

### Reactivity

| Configuration | Scope | Applies live | When it takes effect | SSR / bootstrap | Validation |
| --- | --- | --- | --- | --- | --- |
| `themes` | provider | Yes | Immediately after the change is observed; selection is re-resolved atomically | Initial catalog is resolved on the server | Empty/all-invalid → neutral fallback + `TV_THEME_NEUTRAL_FALLBACK` |
| `defaultTheme` | provider | Yes | Immediately (only when the selection has to be re-resolved) | Server resolves it for first paint | Unknown name resolves to the fallback |
| `initialFamily` / `initialMode` | provider | Yes | Immediately | Server resolves them for first paint | Unknown family → `TV_THEME_FAMILY_UNKNOWN` |
| `initial` | provider | Yes | Immediately (an SSR-resolved selection) | Read on the server to render the first paint | Unresolvable selection is ignored |
| `transition` | provider (runtime) | Yes | The **next** theme change; the current theme is not re-applied | Client-only — never part of bootstrap | `duration` must be a finite number `>= 0`; `easing` a non-empty string, else `TV_CONFIG_OPTION_INVALID` and the previous setting is kept |
| `scheduled` | provider (runtime) | Yes | Immediately: installs, reconfigures in place, or tears down | Disabled on the server (no `window`) | `checkInterval > 0`, `skipApplyMs >= 0`, `latitude ∈ [-90, 90]`, `longitude ∈ [-180, 180]`; else `TV_CONFIG_OPTION_INVALID`. Unregistered theme names → `TV_SCHEDULE_THEME_UNRESOLVED` |
| `ThemeScrollbar` options | component | Yes | The overlay is rebuilt with the new options | Client-only | Passed through to the overlay engine |
| `ThemeScope` props (`theme`, `family`, `mode`, `transition`, …) | component | Yes | Immediately | The scope's variables are emitted into SSR markup | Same rules as the provider |

### Precedence between the selection inputs

The runtime resolves one selection from four inputs, in this order:

1. **A persisted selection** (localStorage, or the SSR cookie/bridge) — the visitor's own choice wins over everything.
2. **`initial`** — an SSR-resolved selection. It is used when it resolves against the current catalog, and **ignored** when it does not (a deploy between the server render and hydration can leave the client with a theme the server no longer has).
3. **`initialFamily` / `initialMode`** — explicit selections. They override the corresponding half of `defaultTheme`, so `defaultTheme="plum-dark"` with `initialMode="light"` resolves to `plum-light`.
4. **`defaultTheme`**, then the catalog's first theme — the fallback.

An unknown `initialFamily` is reported (`TV_THEME_FAMILY_UNKNOWN`) and resolves to a registered family; an unknown `defaultTheme` resolves to the catalog's first theme.

### Catalog changes reach the scopes too

`themes` is not just a provider input: it is the catalog every scope, family
selector and readout resolves against. A catalog change that preserves the
active theme produces **no theme change**, so `store.subscribe()` cannot report
it — a scope would otherwise keep rendering a theme the runtime had dropped.
The runtime therefore exposes the catalog as its own signal:

| Consumer | Signal |
| --- | --- |
| Framework providers, custom consumers | `runtime.registry.subscribe(() => …)` — fires once per atomic catalog change (`configure({ themes })`, `runtime.use(pack)`, `runtime.restore()`), after the store and the selection are updated |
| `<themvora-scope>`, `<themvora-select>` and the other elements | The same signal, subscribed by the element base class |
| Page code listening for the DOM event | `themes-change` on `<themvora-provider>` (`detail.themes`), dispatched on a microtask after the change applies |

Every framework `ThemeScope` subscribes to it and re-resolves in place, so a
scope whose theme leaves the catalog moves to the catalog's first theme — the
same fallback an unknown name gets — instead of keeping stale variables. The
runtime also keeps one catalog array and updates it in place, so a consumer
that captured `runtime.themes` sees later changes rather than a snapshot.

### Enabling and disabling after mount

```tsx
// React — the same prop names exist on every provider.
<ThemeProvider transition={{ enabled: false, duration: 600 }}>
  <App />
</ThemeProvider>

// Later, without a reload or remount: turn transitions on.
<ThemeProvider transition={{ duration: 600 }}>
  <App />
</ThemeProvider>
```

- **Disable transitions:** `transition={false}` (or `transition={{ enabled: false }}`). The next theme change is instant, and the persistent `:root` transition rule is removed so later variable swaps cannot interpolate through it.
- **Re-enable:** pass `transition` again — the next theme change animates.
- **Remove a schedule:** `scheduled={false}`. `runtime.schedule` becomes `null` and every timer/listener the schedule owned is disposed.
- **Install a schedule after mount:** pass `scheduled={{ … }}`; it is created once and reconfigured in place on later changes.
- **Remove the scrollbar feature:** unmount `<ThemeScrollbar />`; the overlay, its observers and its DOM nodes are removed with it (the native scrollbar returns).

### Invalid input

An unusable transition/scheduling option skips **only its own subsystem** and
keeps the previous setting there — a defined state — and reports a
`TV_CONFIG_OPTION_INVALID` warning naming the option and the value. Unrelated
subsystems in the same update still apply. Diagnostics are deduplicated, so a
provider that forwards the same invalid value on every render logs it once.

### Imperative configuration

Framework-free code (and adapters built on `createThemeRuntime`) can drive the
same contract directly:

```ts
runtime.configure({ transition: { enabled: true, duration: 600 } });
runtime.configure({ scheduled: false });
runtime.transition; // live view of the current transition options
runtime.schedule;   // live view of the schedule controller (or null)
```

## API reference

Every export used above is generated from source JSDoc — this guide links it rather than duplicating it.

- [@themvora/core API reference](/api-reference/core)
