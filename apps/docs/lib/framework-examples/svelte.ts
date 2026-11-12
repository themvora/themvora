import type { FrameworkExamples } from "./types";

/**
 * Svelte examples and use cases.
 *
 * Svelte's composables return readable stores, so a component reads them with
 * the `$` prefix and script code uses `get(store)`. Verified against
 * `packages/svelte/src/index.ts`: `useTheme()` returns four readable stores
 * plus plain action functions, and `useThemeSchedule()` returns a readable
 * store rather than React's nullable controller.
 */
export const svelteExamples: FrameworkExamples = {
  slug: "svelte",
  sections: {
    startHere: "Provider above the slot",
    useCases: "Stores, previews, and SSR without flash",
    api: "Stores, components, and bindings",
    combining: "A settings panel, wired end to end",
  },
  intro: [
    "The Svelte integration is store-based: every read is a readable store that a component consumes with `$`, and every write is a plain function on the runtime. The provider must wrap the tree because the runtime is published through Svelte's context, which is only readable during component initialisation.",
    "Two details are worth knowing before you copy anything: the composables must be called during initialisation (not inside an event handler or an `$effect`), and the stores are readable — there is no writable store to assign to, because the runtime owns the state.",
  ],
  startHere: {
    body: "Wrap the tree in `ThemeProvider`. It creates the runtime, injects the pre-paint bootstrap script, and publishes the runtime through context so the composables below it resolve.",
    note: "With no `themes` prop the provider uses the built-in neutral themes, so `defaultTheme=\"light\"` is a complete setup.",
    code: [
      {
        title: "src/App.svelte",
        lang: "svelte",
        code: `<script lang="ts">
  import { ThemeProvider } from "@themvora/svelte";
  import ThemeSwitcher from "./ThemeSwitcher.svelte";
</script>

<ThemeProvider defaultTheme="mint-light" initialMode="system">
  <ThemeSwitcher />
</ThemeProvider>`,
      },
      {
        title: "src/ThemeSwitcher.svelte",
        lang: "svelte",
        code: `<script lang="ts">
  import { useTheme } from "@themvora/svelte";

  // Stores, so the template reads them with \`$\` and no subscription code.
  const { theme, effectiveMode, toggleTheme } = useTheme();
</script>

<button onclick={toggleTheme}>
  {$theme.name} · {$effectiveMode}
</button>`,
      },
    ],
  },
  categories: [
    {
      id: "provider",
      label: "Provider",
      intro:
        "The provider publishes the runtime through Svelte context. The context helpers exist for the cases where the provider is not the right boundary.",
      entries: [
        {
          id: "svelte-provider",
          name: "ThemeProvider",
          covers: ["ThemeProvider"],
          what: "Creates the runtime, installs the DOM and CSS-variable bindings, injects the pre-paint bootstrap, and sets the runtime in Svelte context. Accepts every runtime option, plus `runtime` to supply your own.",
          when: "Once, around the root component. The context is only visible to descendants, so a component outside the provider cannot call the composables.",
          effect: "The active theme's variables land on the document and every `useTheme*` call below the provider resolves the same runtime.",
          related: ["svelte-context", "svelte-use-theme"],
          code: [
            {
              title: "src/routes/+layout.svelte",
              lang: "svelte",
              code: `<script lang="ts">
  import { ThemeProvider } from "@themvora/svelte";
  import { getBuiltInThemes } from "@themvora/core";
  import "../app.css";

  const themes = getBuiltInThemes();
</script>

<ThemeProvider
  {themes}
  defaultTheme="mint-light"
  transition={{ enabled: true, duration: 250 }}
>
  <slot />
</ThemeProvider>`,
            },
            {
              title: "src/app.css",
              lang: "css",
              code: `/* The only stylesheet a themed app needs: every value below is a variable
   the provider writes to :root, so it renders every theme — including ones
   you add later. */
body {
  margin: 0;
  background: var(--theme-color-background);
  color: var(--theme-color-foreground);
  font-family: ui-sans-serif, system-ui, sans-serif;
}`,
            },
          ],
        },
        {
          id: "svelte-context",
          name: "getThemeRuntime() / setThemeRuntime()",
          covers: ["getThemeRuntime() / setThemeRuntime()"],
          what: "`setThemeRuntime(runtime)` publishes a runtime you created; `getThemeRuntime()` retrieves it and throws when none was set. The provider uses the first internally.",
          when: "The runtime already exists outside the component tree — created in a module, shared with a non-Svelte widget, or needed by a helper that is not a component.",
          effect: "`getThemeRuntime()` gives direct access to the registry, store and selection for anything the composables do not cover.",
          related: ["svelte-provider", "svelte-lifecycle"],
          code: [
            {
              title: "src/lib/theme.ts",
              lang: "ts",
              code: `import { createThemeRuntime, getBuiltInThemes } from "@themvora/core";

export const runtime = createThemeRuntime({
  themes: getBuiltInThemes(),
  defaultTheme: "mint-light",
});`,
            },
            {
              title: "Reading it inside a component",
              lang: "svelte",
              code: `<script lang="ts">
  import { getThemeRuntime } from "@themvora/svelte";

  const runtime = getThemeRuntime();
</script>`,
            },
          ],
        },
      ],
    },
    {
      id: "stores",
      label: "Stores",
      intro:
        "Reads are readable stores — subscribe with `$` in a component, or `get()` in a module. Writes are functions, not store assignments.",
      entries: [
        {
          id: "svelte-use-theme",
          name: "useTheme()",
          covers: ["useTheme()"],
          what: "Returns `theme`, `mode`, `effectiveMode` and `family` as readable stores, plus `setMode`, `setFamily` and `toggleTheme` as functions.",
          when: "A component needs more than one slice — a settings panel, a header with a theme name and a toggle.",
          effect: "The component re-renders when any of the four stores emits; the functions update the runtime and the document immediately.",
          related: ["svelte-effective-mode", "svelte-theme-scope"],
          code: [
            {
              title: "src/lib/ThemeSummary.svelte",
              lang: "svelte",
              code: `<script lang="ts">
  import { useTheme } from "@themvora/svelte";

  const { theme, mode, effectiveMode, family, setMode, toggleTheme } = useTheme();
</script>

<section>
  <h2>{$theme.name}</h2>
  <p>Family {$family} · requested {$mode} · showing {$effectiveMode}</p>
  <button onclick={toggleTheme}>Toggle</button>
  <button onclick={() => setMode("system")}>Follow system</button>
</section>`,
            },
          ],
        },
        {
          id: "svelte-effective-mode",
          name: "useEffectiveThemeMode()",
          covers: ["useEffectiveThemeMode()"],
          what: "A readable store of the mode actually applied — `light` or `dark`, never `system`.",
          when: "Any label, icon or `aria-pressed` that states the current appearance. With `system`, `$mode` never moves; `$effectiveMode` does.",
          effect: "Updates on a click, an OS appearance change, and a sunrise/sunset transition.",
          related: ["svelte-use-theme", "svelte-schedule"],
          code: [
            {
              title: "src/lib/AppearanceIcon.svelte",
              lang: "svelte",
              code: `<script lang="ts">
  import { useEffectiveThemeMode } from "@themvora/svelte";

  const effectiveMode = useEffectiveThemeMode();
</script>

<span aria-label={\`\${$effectiveMode} mode\`}>
  {$effectiveMode === "dark" ? "🌙" : "☀️"}
</span>`,
            },
          ],
        },
        {
          id: "svelte-history",
          name: "useThemeHistory()",
          covers: ["useThemeHistory()"],
          what: "Readable `canUndo`, `canRedo` and `history` stores plus `undo`, `redo`, `clear` and `jump` functions.",
          when: "A theme editor or live preview where the visitor experiments and wants to step back or jump to a point.",
          effect: "The stores update as history changes, so buttons disable themselves; `jump(index)` moves straight to an entry.",
          related: ["svelte-snapshot", "svelte-batch"],
          code: [
            {
              title: "src/lib/HistoryControls.svelte",
              lang: "svelte",
              code: `<script lang="ts">
  import { useThemeHistory } from "@themvora/svelte";

  const { undo, redo, canUndo, canRedo, clear, jump, history } = useThemeHistory();
</script>

<div>
  <button onclick={undo} disabled={!$canUndo}>Undo</button>
  <button onclick={redo} disabled={!$canRedo}>Redo</button>
  <button onclick={clear} disabled={!$canUndo && !$canRedo}>Reset</button>

  <ol>
    {#each $history as entry, index}
      <li><button onclick={() => jump(index)}>{entry.theme.name}</button></li>
    {/each}
  </ol>
</div>`,
            },
          ],
        },
        {
          id: "svelte-batch",
          name: "useThemeBatch()",
          covers: ["useThemeBatch()"],
          what: "Returns a function that runs its callback with DOM writes and notifications coalesced into one runtime update.",
          when: "Several changes belong together: family plus mode, or a token patch plus a selection.",
          effect: "One re-render and one transition for the group; no intermediate state is painted.",
          related: ["svelte-history", "svelte-context"],
          code: [
            {
              title: "src/lib/ApplyPreset.svelte",
              lang: "svelte",
              code: `<script lang="ts">
  import { useThemeBatch, useThemeRuntime } from "@themvora/svelte";

  const batch = useThemeBatch();
  const runtime = useThemeRuntime();

  function applyPreset() {
    batch(() => {
      runtime.selection.setFamily("plum");
      runtime.selection.setMode("dark");
    });
  }
</script>

<button onclick={applyPreset}>Plum, dark</button>`,
            },
          ],
        },
        {
          id: "svelte-snapshot",
          name: "useThemeSnapshot() / useThemeRestore()",
          covers: ["useThemeSnapshot() / useThemeRestore()"],
          what: "Two functions: one captures the full runtime state as a serialisable value, the other re-applies one.",
          when: "Named presets the visitor saves, or a checkpoint around a destructive edit.",
          effect: "Restoring replaces the active theme and selection and notifies subscribers once.",
          related: ["svelte-history"],
          code: [
            {
              title: "src/lib/SavedLooks.svelte",
              lang: "svelte",
              code: `<script lang="ts">
  import { useThemeRestore, useThemeSnapshot } from "@themvora/svelte";

  const snapshot = useThemeSnapshot();
  const restore = useThemeRestore();

  let saved: ReturnType<typeof snapshot> | null = $state(null);
</script>

<button onclick={() => (saved = snapshot())}>Save this look</button>
<button onclick={() => saved && restore(saved)} disabled={!saved}>Restore</button>`,
            },
          ],
        },
        {
          id: "svelte-lifecycle",
          name: "useThemeLifecycle()",
          covers: ["useThemeLifecycle()"],
          what: "A typed subscription to runtime lifecycle events such as `beforeThemeChange` and `afterPersist`.",
          when: "You need to react to a change rather than to state — analytics, syncing an external store.",
          effect: "The handler runs when the event fires; the returned unsubscribe stops it. Subscribing does not cause re-renders.",
          related: ["svelte-context", "svelte-batch"],
          code: [
            {
              title: "src/lib/ThemeAnalytics.svelte",
              lang: "svelte",
              code: `<script lang="ts">
  import { onDestroy } from "svelte";
  import { useThemeLifecycle } from "@themvora/svelte";

  const { on } = useThemeLifecycle();

  const off = on("afterThemeChange", ({ theme }) => {
    window.dispatchEvent(new CustomEvent("app:theme-changed", { detail: theme.name }));
  });

  // This subscription is ours, not the composable's — release it explicitly.
  onDestroy(off);
</script>`,
            },
          ],
        },
        {
          id: "svelte-packs",
          name: "useThemePacks()",
          covers: ["useThemePacks()"],
          what: "Returns a function that installs a theme pack into the runtime's registry at runtime.",
          when: "Themes arrive after mount: fetched from an API, generated from a brand colour, or code-split out of the initial bundle.",
          effect: "The registry grows; consumers of `useProvidedThemes()` see the new families. The active selection is untouched unless the pack changes it.",
          related: ["svelte-context", "svelte-use-theme"],
          code: [
            {
              title: "src/lib/BrandPack.svelte",
              lang: "svelte",
              code: `<script lang="ts">
  import { useThemePacks } from "@themvora/svelte";
  import { generateTheme } from "@themvora/core";

  let { seed }: { seed: string } = $props();
  const usePack = useThemePacks();

  $effect(() => {
    const generated = generateTheme({ seed, family: "brand" });
    usePack({ themes: [generated.light, generated.dark] });
  });
</script>`,
            },
          ],
        },
        {
          id: "svelte-schedule",
          name: "useThemeSchedule() / getThemeSchedule()",
          covers: ["useThemeSchedule() / getThemeSchedule()"],
          what: "`useThemeSchedule()` returns a readable store of the schedule state (`enabled`, `status`, `sunrise`, `sunset`, `nextTransition`); `getThemeSchedule()` returns the imperative controller, or `null` when the provider has no `scheduled` option.",
          when: "A settings row that turns daylight following on or off. Read the store for display, call the controller for changes.",
          effect: "The store updates as the sun moves. The controller's `enable()`, `disable()` and `set()` write through to the runtime.",
          related: ["svelte-effective-mode", "svelte-provider"],
          code: [
            {
              title: "src/lib/DaylightSwitch.svelte",
              lang: "svelte",
              code: `<script lang="ts">
  import { getThemeSchedule, useThemeSchedule } from "@themvora/svelte";

  const schedule = useThemeSchedule();
  const controller = getThemeSchedule();
</script>

{#if controller}
  <label>
    <input
      type="checkbox"
      checked={$schedule.enabled}
      onchange={() => ($schedule.enabled ? controller.disable() : controller.enable())}
    />
    Follow daylight
  </label>
{/if}`,
            },
          ],
        },
      ],
    },
    {
      id: "library-adapters",
      label: "Library adapters",
      intro:
        "Install the adapter package alongside `@themvora/svelte`; the framework package does not re-export it. The Svelte helpers register during setup rather than on mount, which is why a daisyUI or shadcn component is styled from its first frame.",
      entries: [
        {
          id: "svelte-adapter-subpaths",
          name: "Adapter framework subpaths",
          covers: ["Adapter framework subpaths"],
          what: "The four adapter packages publish a `/svelte` entry alongside their other framework subpaths. The subpath exports the helper that registers the adapter with a runtime; the package root exports the factory.",
          when: "Any component that installs an adapter. The root export has no lifecycle wiring, so an adapter imported from there never gets registered at all.",
          effect: "The adapter lives exactly as long as the component that registered it.",
          related: ["svelte-shadcn-bootstrap", "svelte-adapter-factories"],
          code: [
            {
              title: "Which specifier to import",
              lang: "ts",
              code: `// Svelte wrapper (lifecycle-aware) — use this in a component.
import { useShadcnTheme } from "@themvora/shadcn/svelte";

// Framework-neutral factory — no lifecycle wiring.
import { createShadcnAdapter } from "@themvora/shadcn/factory";

// The adapter's own stylesheet, imported once.
import "@themvora/shadcn/shadcn.css";`,
            },
          ],
        },
        {
          id: "svelte-shadcn-bootstrap",
          name: "useShadcnTheme(runtime) / useBootstrapTheme(runtime)",
          covers: ["useShadcnTheme(runtime) / useBootstrapTheme(runtime)"],
          what: "Registers the adapter with the runtime you pass and returns the adapter itself — there is nothing to read from the return value, because the library is what consumes the variables. Registration happens during component setup behind a `typeof window` guard, so the variables are already in place when the component first renders; teardown is scheduled through `onMount`, which is what makes it work in both runes and legacy mode.",
          when: "The app ships shadcn/ui or Bootstrap, and those components should read Themvora's palette instead of a second one kept in sync by hand.",
          effect: "Library components are styled from their first frame. On the server the guard skips registration, so nothing is written into the SSR output.",
          related: ["svelte-adapter-subpaths", "svelte-daisy-openprops"],
          code: [
            {
              title: "src/lib/ShadcnBridge.svelte",
              lang: "svelte",
              code: `<script lang="ts">
  import "@themvora/shadcn/shadcn.css";
  import { useThemeRuntime } from "@themvora/svelte";
  import { useShadcnTheme } from "@themvora/shadcn/svelte";

  useShadcnTheme(useThemeRuntime());
</script>

<slot />`,
            },
          ],
        },
        {
          id: "svelte-daisy-openprops",
          name: "useDaisyTheme(runtime) / useOpenPropsTheme(runtime)",
          covers: ["useDaisyTheme(runtime) / useOpenPropsTheme(runtime)"],
          what: "daisyUI and Open Props through the same `/svelte` subpath, with the same eager registration and the same `onMount` teardown. Both take the runtime as an argument rather than looking it up.",
          when: "The app styles with daisyUI's semantic classes or Open Props' custom properties, and those styles should resolve from Themvora's tokens.",
          effect: "The variables exist before the component renders, so a daisyUI `btn` never paints with its built-in colours first.",
          related: ["svelte-shadcn-bootstrap", "svelte-adapter-factories"],
          code: [
            {
              title: "src/lib/DaisyBridge.svelte",
              lang: "svelte",
              code: `<script lang="ts">
  import "@themvora/daisyui/daisyui.css";
  import { useThemeRuntime } from "@themvora/svelte";
  import { useDaisyTheme } from "@themvora/daisyui/svelte";

  useDaisyTheme(useThemeRuntime());
</script>

<slot />`,
            },
          ],
        },
        {
          id: "svelte-adapter-factories",
          name: "Adapter factory subpaths",
          covers: ["adapter factory subpaths"],
          what: "The `/factory` subpaths export the adapter with nothing wrapped around it: no `window` guard, no registration, no teardown. You call `runtime.adapters.use(adapter)` and keep the handle.",
          when: "The adapter is installed once at startup — a module that runs before any component exists, or a test.",
          effect: "The adapter stays installed until you call `dispose()`, across route changes and component teardown.",
          related: ["svelte-adapter-subpaths", "svelte-context"],
          code: [
            {
              title: "src/lib/adapters.ts",
              lang: "ts",
              code: `import { createOpenPropsAdapter } from "@themvora/open-props/factory";
import type { ThemeRuntime } from "@themvora/core";

export function installAdapters(runtime: ThemeRuntime) {
  const handle = runtime.adapters.use(createOpenPropsAdapter());
  return () => handle.dispose();
}`,
            },
          ],
        },
      ],
    },
    {
      id: "transition",
      label: "Transition",
      intro:
        "The provider reads `transition` from its props and re-applies it when they change, so the value can live in reactive state instead of being fixed at mount.",
      entries: [
        {
          id: "svelte-transition",
          name: "transition",
          covers: ["transition prop"],
          what: "Enables and configures the cross-fade applied when the theme changes — duration, easing, preset, animated properties.",
          when: "Leave the default on; tune it when the default feels slow, or disable it for an app that must repaint instantly.",
          effect: "Theme changes animate; the DOM writes still happen in one flush.",
          related: ["svelte-suppress-transition", "svelte-provider"],
          code: [
            {
              title: "src/App.svelte",
              lang: "svelte",
              code: `<ThemeProvider
  defaultTheme="mint-light"
  transition={{ enabled: true, duration: 250, easing: "ease-in-out" }}
>
  <slot />
</ThemeProvider>`,
            },
          ],
        },
        {
          id: "svelte-suppress-transition",
          name: "runtime.store.set(theme, { suppressTransition: true })",
          covers: ["runtime.store.set(theme, { suppressTransition: true })"],
          what: "Applies one theme change immediately, skipping the configured animation for that update only.",
          when: "A print path, a screenshot, or a programmatic reset where animating would look like a glitch.",
          effect: "That change is instant; later changes animate again.",
          related: ["svelte-transition", "svelte-context"],
          code: [
            {
              title: "src/lib/print-theme.ts",
              lang: "ts",
              code: `import { getThemeRuntime } from "@themvora/svelte";

export function applyForPrint() {
  const runtime = getThemeRuntime();
  const light = runtime.themes.find((theme) => theme.name === "mint-light");
  if (!light) return;
  runtime.store.set(light, { suppressTransition: true });
}`,
            },
          ],
        },
      ],
    },
    {
      id: "components",
      label: "Components",
      intro:
        "Svelte ships the scoped-theme component. The React-only pieces are not part of this package — build them from the stores above.",
      entries: [
        {
          id: "svelte-theme-scope",
          name: "ThemeScope",
          covers: ["ThemeScope"],
          what: "Applies a theme to a subtree: the wrapper carries the scoped CSS variables, so only that region repaints.",
          when: "A preview panel, a marketing section in a fixed palette, or a code sample that must render in the theme it documents.",
          effect: "The global selection is neither read for the scope nor changed by it. A `family` scope follows the page mode; an exact `theme` stays pinned.",
          related: ["svelte-use-theme"],
          code: [
            {
              title: "src/lib/Preview.svelte",
              lang: "svelte",
              code: `<script lang="ts">
  import { ThemeScope } from "@themvora/svelte";
</script>

<ThemeScope theme="cocoa-dark">
  <h3>Always cocoa</h3>
  <p>This panel keeps its own theme while the page changes.</p>
</ThemeScope>`,
            },
          ],
        },
      ],
    },
  ],
  recipes: [
    {
      id: "family-picker",
      title: "A family picker driven by the registry",
      problem:
        "A hand-written array of family names goes stale: it still offers a family the app dropped, and never shows one a pack adds.",
      apis: ["useProvidedThemes()", "useTheme()"],
      why: "`useProvidedThemes()` is a readable store, so `$families` in the markup and `get(families)` in a module both read the live registry. There is nothing to mount — the store subscribes when you subscribe to it.",
      expect:
        "The options come from the store and the selected one follows the active family. Installing a pack re-renders the select with no extra wiring.",
      code: [
        {
          title: "src/lib/FamilyPicker.svelte",
          lang: "svelte",
          code: `<script lang="ts">
  import { useProvidedThemes, useTheme } from "@themvora/svelte";

  const families = useProvidedThemes();
  const { family, setFamily } = useTheme();
</script>

<label>
  Theme family
  <select value={$family} onchange={(e) => setFamily(e.currentTarget.value)}>
    {#each $families as entry}
      <option value={entry.name}>{entry.name}</option>
    {/each}
  </select>
</label>`,
        },
      ],
    },
    {
      id: "mode-toggle",
      title: "A mode toggle that reports the truth",
      problem:
        "The toggle's icon says light while the page is dark, because the selection is `system`.",
      apis: ["useEffectiveThemeMode()", "useTheme()"],
      why: "`$effectiveMode` is the applied appearance; `$mode` is the standing request. The label needs the first, the click needs the second.",
      expect:
        "Icon and label always match the page; a click pins an explicit mode so a `system` visitor stops following the OS.",
      code: [
        {
          title: "src/lib/ModeToggle.svelte",
          lang: "svelte",
          code: `<script lang="ts">
  import { useEffectiveThemeMode, useTheme } from "@themvora/svelte";

  const effectiveMode = useEffectiveThemeMode();
  const { mode, setMode } = useTheme();

  const next = $derived($effectiveMode === "dark" ? "light" : "dark");
</script>

<button
  aria-pressed={$effectiveMode === "dark"}
  aria-label={\`Switch to \${next} mode\`}
  onclick={() => setMode(next)}
>
  {$effectiveMode === "dark" ? "🌙 Dark" : "☀️ Light"}
  {#if $mode === "system"} (auto){/if}
</button>`,
        },
      ],
    },
    {
      id: "scoped-preview",
      title: "Preview families without switching to them",
      problem:
        "A gallery should show each family before the visitor commits, without repainting the whole page per preview.",
      apis: ["ThemeScope", "useProvidedThemes()"],
      why: "`ThemeScope` writes the scoped variables onto its own wrapper and renders its slot inside them, so previews coexist without the global selection moving.",
      expect:
        "Each card renders in its own family; clicking one commits the choice through the setter.",
      code: [
        {
          title: "src/lib/ThemeGallery.svelte",
          lang: "svelte",
          code: `<script lang="ts">
  import { ThemeScope, useProvidedThemes, useTheme } from "@themvora/svelte";

  const families = useProvidedThemes();
  const { setFamily } = useTheme();
</script>

<div>
  {#each $families as entry}
    <button onclick={() => setFamily(entry.name)}>
      <ThemeScope family={entry.name}>
        <strong>{entry.name}</strong>
        <p>The quick brown fox</p>
      </ThemeScope>
    </button>
  {/each}
</div>`,
        },
      ],
    },
    {
      id: "ssr-bootstrap",
      title: "Zero flash in a server-rendered Svelte app",
      problem:
        "SvelteKit renders the page on the server, but the theme is only known in the browser — so the first paint is the default theme and is corrected after hydration.",
      apis: ["createSvelteThemeBootstrapScript()", "ThemeProvider"],
      why: "The generated script applies the persisted selection in `<head>` before the body is parsed, using the same storage key and prefix as the provider's persistence.",
      expect:
        "The first paint is the persisted theme; no correction frame on reload.",
      caveats:
        "Emit the script from the same module that defines the themes, so the registry the script embeds and the registry the runtime uses cannot disagree.",
      code: [
        {
          title: "src/hooks.server.ts",
          lang: "ts",
          code: `import { createSvelteThemeBootstrapScript } from "@themvora/svelte";
import { getBuiltInThemes } from "@themvora/core";

const themes = getBuiltInThemes();

export const themeScript = createSvelteThemeBootstrapScript({
  themes,
  defaultTheme: "mint-light",
});`,
        },
      ],
    },
  ],
  combining: [
    {
      id: "settings-page",
      title: "A complete appearance settings panel",
      body: "Family, mode and history controls in one component. Each control subscribes only to the store it displays, so a token change does not re-render the panel.",
      code: [
        {
          title: "src/lib/AppearanceSettings.svelte",
          lang: "svelte",
          code: `<script lang="ts">
  import {
    useEffectiveThemeMode,
    useProvidedThemes,
    useTheme,
    useThemeHistory,
  } from "@themvora/svelte";

  const MODES = ["light", "dark", "system"] as const;

  const families = useProvidedThemes();
  const { family, setFamily, mode, setMode } = useTheme();
  const effectiveMode = useEffectiveThemeMode();
  const { undo, canUndo } = useThemeHistory();
</script>

<form>
  <label>
    Family
    <select value={$family} onchange={(e) => setFamily(e.currentTarget.value)}>
      {#each $families as entry}
        <option value={entry.name}>{entry.name}</option>
      {/each}
    </select>
  </label>

  <fieldset>
    <legend>Mode</legend>
    {#each MODES as option}
      <label>
        <input
          type="radio"
          name="mode"
          checked={$mode === option}
          onchange={() => setMode(option)}
        />
        {option}
        {#if option === $mode && $mode === "system"} (now {$effectiveMode}){/if}
      </label>
    {/each}
  </fieldset>

  <button type="button" disabled={!$canUndo} onclick={undo}>Undo last change</button>
</form>`,
        },
      ],
    },
    {
      id: "brand-pack",
      title: "Install a generated brand theme at runtime",
      body: "A seed colour becomes a light/dark pair, the pair is registered, and the family is selected — batched so the page never paints the half-applied state.",
      code: [
        {
          title: "src/lib/BrandSetup.svelte",
          lang: "svelte",
          code: `<script lang="ts">
  import { useThemeBatch, useThemePacks, useThemeRuntime } from "@themvora/svelte";
  import { generateTheme } from "@themvora/core";

  let { seed }: { seed: string } = $props();
  const usePack = useThemePacks();
  const batch = useThemeBatch();
  const runtime = useThemeRuntime();

  function applyBrand() {
    const generated = generateTheme({ seed, family: "brand" });
    batch(() => {
      usePack({ themes: [generated.light, generated.dark] });
      runtime.selection.setFamily("brand");
    });
  }
</script>

<button onclick={applyBrand}>Use {seed}</button>`,
        },
      ],
    },
  ],
  notAvailable: [
    {
      name: "useThemeTimeTravel()",
      reason:
        "Not exported here. The readable `history` store plus `jump(index)` from `useThemeHistory()` is the equivalent.",
    },
    {
      name: "ThemeModeButton / ThemeInspector",
      reason:
        "React-only components. This package ships `themeInspector()` for the inspector and the stores above for building a mode control.",
    },
  ],
};
