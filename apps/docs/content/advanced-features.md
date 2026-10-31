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

`validateTheme()` checks that every required semantic color token is defined and resolves `extends` chains before validation. See the [/accessibility](/accessibility) page for the full contrast-checking guide, CI integration, and the complete list of required color keys.

```ts
import { validateTheme } from "@themvora/core";

const result = validateTheme(childTheme, { themes: [baseTheme, childTheme] });
// { valid: boolean, issues: [{ type: "missing", path: "colors.destructive", message: "..." }] }
```

## Theme Migration

Themes are versioned with a linear migration chain. `registerMigration()` declares a step between two versions; `migrateTheme()` walks the chain from the current version to the target. See the [/migration](/migration) page for the full guide with examples, CI integration, and checklists.

```ts
import { registerMigration, migrateTheme } from "@themvora/core";

registerMigration({
  from: "1.0.0",
  to: "2.0.0",
  description: "Rename primaryColor to primary",
  remapColors: [{ from: "primaryColor", to: "primary" }],
});

const migrated = migrateTheme(oldTheme, { targetVersion: "2.0.0" });
```

`remapColors` handles simple key renames; for arbitrary transforms, pass a `migrate` function instead. The chain is walked linearly (max 20 steps).

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
const snap = runtime.snapshot();
// snap: { theme, selection: { mode, family }, history: [...], registry: { themes: [...] } }

// ... user makes changes ...

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

runtime.selection.setFamily("brand");
runtime.selection.setMode("dark");
```

Under the hood, `runtime.use()` delegates to `registry.use()`, which registers every theme in the pack and stamps the `pack:brand` tag. The registry's `getThemesByFamily` and `getFamilies` methods immediately reflect the new themes.

## Accessibility Profiles

`getAccessibilityProfiles()` returns pre-built high-contrast and large-text themes. `validateThemeContrast()` audits a theme's WCAG contrast ratios, and `simulateCVD()` models how colors appear under color vision deficiencies. See the [/accessibility](/accessibility) page for the full guide including CVD simulation, CI integration, and all available profiles.

```ts
import { getAccessibilityProfiles, validateThemeContrast } from "@themvora/core";

const profiles = getAccessibilityProfiles();
// [high-contrast-light, high-contrast-dark, large-text-light, large-text-dark]

const audit = validateThemeContrast(myTheme);
// { valid: boolean, checks: [{ foregroundToken, backgroundToken, ratio, passesAANormal, ... }] }
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

Every configuration is fully reactive — changes apply live without remounting. See the dedicated pages for [transition](/transition), [schedule](/sunrise-sunset), and [scrollbar](/scrollbar) for details on when each takes effect.

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

Transitions, schedules, and scrollbar can all be enabled, disabled, or reconfigured after mount without a reload or remount. See [/animation](/animation) for transition and schedule toggling, and [/sunrise-sunset](/sunrise-sunset) for schedule installation and removal.

### Reading the mode a schedule produced

A scheduled transition changes the **applied** appearance, not the visitor's standing choice. See [/sunrise-sunset](/sunrise-sunset) for `useEffectiveThemeMode()`, `selection.subscribeEffective`, and the precedence between automatic drivers.

### Imperative configuration

Framework-free code (and adapters built on `createThemeRuntime`) can drive the
same contract directly:

```ts
runtime.configure({ transition: { enabled: true, duration: 600 } });
runtime.configure({ scheduled: false });
runtime.transition; // live view of the current transition options
runtime.schedule;   // live view of the schedule controller (or null)
```

## Discovering the provider's themes

A provider knows exactly which themes it was given. `useProvidedThemes()` returns
that collection — grouped by family, with each variant's metadata and resolved
tokens — so a theme picker never has to enumerate a second source:

```tsx
import { useProvidedThemes, useSetThemeFamily } from "@themvora/react";

function ThemePicker() {
  const families = useProvidedThemes();
  const setFamily = useSetThemeFamily();

  return (
    <fieldset>
      {families.map((family) => (
        <section key={family.id}>
          <h3>{family.name}</h3>
          {family.variants.map((variant) => (
            <button key={variant.name} onClick={() => setFamily(family.family)}>
              {variant.mode} — {variant.tokens.colors?.background}
            </button>
          ))}
        </section>
      ))}
    </fieldset>
  );
}
```

Each entry is `{ id, family, name, meta, provenance, variants }`, and each
variant is `{ name, mode, meta, tokens, theme }`. `variants[].meta` and
`variants[].tokens` are authoritative; the family-level `meta` is a roll-up of
the first variant that carries one.

The same data contract is exposed with each framework's own reactivity:

| Framework | Surface | Shape |
| --- | --- | --- |
| React | `useProvidedThemes()` | array (re-renders on change) |
| Vue | `useProvidedThemes()` | `Ref` |
| Svelte | `useProvidedThemes()` | readable store |
| Solid | `useProvidedThemes()` | accessor |
| Angular | `injectProvidedThemes()` | `Signal` |
| Web Components | `useProvidedThemes()` | live read + `themes-change` event |
| Framework-free | `Themvora#providedThemes` | getter |

Three properties are worth knowing:

- **Exactly what the provider received.** Built-in or preset themes the provider
  was not given are absent, and two providers never share a collection.
- **Reactive.** A `themes` prop change, `runtime.use(pack)` or a registry
  mutation updates the collection. Entries whose content did not change keep
  their identity, so `React.memo` and dependency arrays behave.
- **No provenance guessing.** `provenance` is filled only from markers the
  library writes (`meta.generation.kind === "generated"`, a `pack:<name>` tag).
  A theme named `mint-dark` is not thereby a preset.

## Naming a theme: family or variant

Every selection prop — `defaultTheme`, `themeOverride`, `initialFamily` — accepts
the same two forms, resolved by one function against the themes *your provider was
given*:

| Form | Example | What it selects |
| --- | --- | --- |
| **Variant** | `"cocoa-dark"` | that exact definition, with its own mode |
| **Family** | `"cocoa"` | the family's variant for the mode in effect |

```tsx
// `themes` is the registry your provider is given.
const themes = [cocoaLight, cocoaDark, oatLight, oatDark];

// An exact variant: this is the theme, whatever the visitor's mode is.
<ThemeProvider themes={themes} defaultTheme="cocoa-light">
  <App />
</ThemeProvider>

// A family: `initialMode` picks the variant, and the visitor can still toggle.
<ThemeProvider themes={themes} defaultTheme="oat" initialMode="light">
  <App />
</ThemeProvider>
```

A family never resolves to "whichever variant happens to come first in the
object": it uses the mode in effect, then the configured initial mode, then the
family's light variant. So `defaultTheme="oat"` with `initialMode="dark"` is
`oat-dark`, and a visitor who toggles to light gets `oat-light` — the family is the
default, not a lock.

`initialFamily` takes a family. A variant name is accepted too and normalised to
its family; its mode is used **only when `initialMode` is absent**, so the two
props can never silently disagree:

```tsx
const themes = [cocoaLight, cocoaDark, oatLight, oatDark];

<ThemeProvider themes={themes} initialFamily="cocoa-dark">
  {/* cocoa, dark */}
</ThemeProvider>

<ThemeProvider themes={themes} initialFamily="cocoa-dark" initialMode="light">
  {/* cocoa, light — the explicit mode wins */}
</ThemeProvider>
```

A name that is not in the provider's collection is reported
(`TV_THEME_OVERRIDE_UNRESOLVED` for an override, `TV_THEME_FAMILY_UNKNOWN` for
`initialFamily`) and ignored. Themvora never falls back to a same-named theme from
the global preset catalog.

### Autocomplete from your own collection

The props are typed from the `themes` you pass, so a statically known collection
completes both forms — no separate union to maintain:

```tsx
const themes = [
  defineTheme({ name: "oat-light", meta: { family: "oat", mode: "light" }, tokens: {} }),
  defineTheme({ name: "oat-dark", meta: { family: "oat", mode: "dark" }, tokens: {} }),
  defineTheme({ name: "cocoa-light", meta: { family: "cocoa", mode: "light" }, tokens: {} }),
  defineTheme({ name: "cocoa-dark", meta: { family: "cocoa", mode: "dark" }, tokens: {} }),
] as const;

// defaultTheme:   "oat-light" | "oat-dark" | "cocoa-light" | "cocoa-dark" | "oat" | "cocoa"
// initialFamily:  "oat" | "cocoa"
<ThemeProvider themes={themes} defaultTheme="cocoa">…</ThemeProvider>
```

`defineTheme` preserves the literal names and families, and `as const` keeps the
collection literal. A collection built at runtime (`generateTheme()`, a fetched
catalog) is a `ThemeDefinition[]`, whose values cannot be known at compile time —
the props widen to `string` there rather than becoming unusable.

Which surfaces infer the union from `themes`:

| Surface | Completion from `themes` |
| --- | --- |
| React `ThemeProvider` | yes — `defaultTheme`, `themeOverride`, `initialFamily` |
| Svelte / Solid `ThemeProvider` | yes (their props extend the core options) |
| Next.js `ThemeProvider` | yes |
| Remix `ThemeProvider` / `ThemeHead` | yes |
| Astro `ThemeProviderClient` | yes |
| Angular `provideTheme` / `createBlockingScriptContent` | yes |
| Vue `ThemeProviderProps<T>` | yes, via the exported type |
| `<themvora-provider>` element | no — attributes are strings; type a wrapper against `ThemvoraProviderProps<T>` |
| Nuxt module options | no — build-time configuration, not a `themes` prop |

Two surfaces need a word of explanation, because the union exists but the
component cannot show it:

- **Vue's `<ThemeProvider>`** declares its props at runtime (`type: String`), and
  Vue cannot infer a component's prop union from another prop outside an SFC with
  `generic="…"`. The exported `ThemeProviderProps<T>` carries the narrowed union,
  so annotate a wrapper with it if you want template completion:

  ```ts
  import type { ThemeProviderProps } from "@themvora/vue";
  import { defineTheme } from "@themvora/core";

  const themes = [
    defineTheme({ name: "cocoa-light", meta: { family: "cocoa", mode: "light" }, tokens: {} }),
  ];

  type Props = ThemeProviderProps<(typeof themes)[number]>;
  ```

- **Nuxt's module options** are fixed at build time and never receive the theme
  array, so they stay `string`. Pass `themes` to the module and use
  `runtime.configure({ themeOverride })` for a value that changes at runtime.

## Explicit theme override

`defaultTheme` is a **fallback**: it applies only when nothing else selected a
theme. Previewing a theme — or driving one from a prop — needs the opposite, so
the provider accepts `themeOverride`:

```tsx
const themes = [cocoaLight, cocoaDark, oatLight, oatDark];

<ThemeProvider themes={themes} themeOverride={preview ?? undefined}>
  <App />
</ThemeProvider>
```

```ts
type ThemeOverride<Name extends string = string> =
  | Name                                  // "cocoa-dark" or "cocoa"
  | { family?: string; mode?: ThemeMode }; // { family: "cocoa", mode: "dark" }
```

Semantics, identical in every integration:

1. It outranks a saved selection (`localStorage`, cookies) and an SSR-resolved
   `initial`, because it is the most explicit request.
2. It applies **once per value**. Changing the prop applies the new value;
   re-rendering with the same value does nothing, so it never fights a manual
   selection the visitor made afterwards.
3. **Removing it restores the selection it covered**, in the same commit — no
   reload, no remount. If the visitor picked a theme themselves while the override
   was active, that newer choice is kept instead of the snapshot.
4. It does **not** write persistence. An override is a transient preview; a
   later manual selection persists normally.
5. An unresolvable value is reported as `TV_THEME_OVERRIDE_UNRESOLVED` and
   ignored — it is retried if the catalog later gains that theme.

```tsx
const themes = [cocoaLight, cocoaDark, oatLight, oatDark];

// Preview a theme while the visitor's own selection stays untouched underneath.
<ThemeProvider themes={themes} themeOverride={preview}>…</ThemeProvider>
// Set `preview` back to `undefined` and the previous selection reappears.
```

Precedence, in order:

```
themeOverride  >  initial (SSR handoff)  >  persisted  >  defaultTheme / initialFamily / initialMode  >  fallback
```

`themeOverride` is a layer over that list rather than an entry in it: it is applied
over whatever the rest resolves to, and removing it reveals that layer again.

**Initial paint.** Every integration that owns a pre-paint bootstrap
(`createThemeBootstrapScript`, the Next shell, the Remix `ThemeHead`, the Angular
blocking script, the Nuxt plugin) resolves the override into that script — family
form included — so the first frame is already the overridden theme rather than the
saved one corrected after mount. Astro's client island applies it after mount; pass
the same value to `provider.astro` / `createBlockingScript` for a flash-free
override there.

**Change detection** is semantic, not referential: `"cocoa-dark"`, `"cocoa"` and
`{ family: "cocoa", mode: "dark" }` each identify a request, and a freshly
allocated object per render is not a change.

### What gets persisted

Only the **selection identity** is stored — `{ family, mode }` — never a theme
definition, its tokens or its metadata:

```json
{ "family": "brand", "mode": "dark" }
```

That is why a user-defined or generated theme persists exactly like a preset: the
identity resolves against whatever the provider supplies on the next load, and an
identity whose family is gone falls back safely. An override never writes it, and
neither does restoring one.

## Keeping a UI library in step

Themvora applies a theme change as one update: the resolved tokens, the DOM
attributes and the `--theme-*` variables commit together, inside one animation
window. A UI library that mirrors tokens into its own theme object participates
only as far as its own API allows.

- **MUI typography.** MUI's typography rules carry their own `font-family`, so a
  font loaded through global CSS on `body` does not reach MUI components by
  inheritance. `@themvora/mui` writes the theme's `typography.fontFamilies` token
  when there is one and `"inherit"` when there is not — so MUI follows the
  document font instead of being forced onto `system-ui`. If you render
  `CssBaseline`, its `body` rule inherits from `<html>`; pass the family
  explicitly: `<MuiThemeProvider runtime={runtime} fontFamily="Inter, sans-serif">`.
- **MUI `className`.** MUI forwards `className` to the component's root slot, so
  the class is present and its rule is in the cascade. When it appears not to
  apply, the cause is usually order or specificity: Emotion appends its
  stylesheet after a `<link>`ed application stylesheet, and `.brand-button` and
  `.MuiButton-root` have the same specificity, so MUI wins. `style` works because
  inline declarations outrank every stylesheet rule. Use MUI's supported escape
  hatches — `sx`, `&&` to raise specificity, or `components.styleOverrides` for a
  nested slot — rather than `!important`.
- **MUI transitions.** MUI's own animations use its `transitions` scale. Pass
  `transitionDuration` / `transitionEasing` to `MuiThemeProvider` (the same
  values as the runtime's `transition`) so both engines use one timing. During a
  theme change Themvora mutes descendant transitions for the length of the swap —
  on both the View Transition path and the CSS-property path — so a component
  that also eases its own `background-color` cannot lag behind the page. Measured
  on the React + MUI fixture: without it the document switched in one frame while
  a MUI `Button` took ~540 ms and a MUI `Paper` snapped, i.e. three timings for
  one change.
- **shadcn/Tailwind.** These components read the CSS variables the adapter
  writes (`--background`, `--primary`, …), so they follow the same swap. Nothing
  else is required; the variables are rewritten on every selection change.

## API reference

Every export used above is generated from source JSDoc — this guide links it rather than duplicating it.

- [@themvora/core API reference](/api-reference/core)
