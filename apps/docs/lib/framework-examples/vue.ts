import type { FrameworkExamples } from "./types";

/**
 * Vue examples and use cases.
 *
 * Vue's integration is ref-based: `useTheme()` returns `Ref`s, not plain
 * values, so a template reads them without `.value` and script code needs it.
 * Verified against `packages/vue/src/index.ts` — including the fact that
 * `useThemeSchedule()` returns a controller object with a `state` ref rather
 * than the `ThemeSchedule | null` React returns.
 */
export const vueExamples: FrameworkExamples = {
  slug: "vue",
  sections: {
    startHere: "The provider, then the composables",
    useCases: "Pickers, previews, and no flash on SSR",
    api: "Composables, components, and bindings",
    combining: "A settings panel in Composition API",
  },
  intro: [
    "The Vue integration is built on Composition API reactivity: `ThemeProvider` installs the runtime, `useTheme()` hands back refs, and every composable must be called in `setup` so its subscriptions are tied to the component instance.",
    "Because the composables subscribe in `onMounted` and unsubscribe in `onUnmounted`, they are safe during SSR — the server render uses the initial values and the live ones arrive after hydration.",
  ],
  startHere: {
    body: "Register the provider once, either through `app.use()` or by wrapping the root component. Both do the same thing; `app.use()` is the idiomatic choice for an app-wide provider.",
    note: "`ThemeProvider` accepts every runtime option plus `initialMode` and `initialFamily`, so the built-in themes need no configuration.",
    code: [
      {
        title: "src/main.ts",
        lang: "ts",
        code: `import { createApp } from "vue";
import { ThemeProvider } from "@themvora/vue";
import App from "./App.vue";

createApp(App)
  .use(ThemeProvider, { initialMode: "system" })
  .mount("#app");`,
      },
      {
        title: "src/App.vue",
        lang: "vue",
        code: `<script setup lang="ts">
import { useTheme } from "@themvora/vue";

const { theme, effectiveMode, toggleTheme } = useTheme();
</script>

<template>
  <main>
    <h1>{{ theme.name }}</h1>
    <p>Currently rendering in {{ effectiveMode }} mode.</p>
    <button @click="toggleTheme">Switch mode</button>
  </main>
</template>`,
      },
    ],
  },
  categories: [
    {
      id: "setup",
      label: "Setup",
      intro:
        "Two ways to establish the runtime: the provider component, or an explicit provide/inject pair when the runtime has to be created elsewhere.",
      entries: [
        {
          id: "vue-provider",
          name: "ThemeProvider",
          covers: ["ThemeProvider"],
          what: "A provider component that creates the runtime, installs the DOM and CSS-variable bindings, and exposes it through Vue's provide/inject. It accepts every runtime option and registers itself with `app.use()`.",
          when: "Once, at the root — `app.use(ThemeProvider, options)` or a `<ThemeProvider>` around the root component.",
          effect: "The active theme's variables and `data-theme` are applied to the document, and every composable below the provider resolves the same runtime.",
          related: ["vue-provide-runtime", "vue-use-theme"],
          code: [
            {
              title: "src/App.vue",
              lang: "vue",
              code: `<script setup lang="ts">
import { ThemeProvider } from "@themvora/vue";
import { getBuiltInThemes } from "@themvora/core";

const themes = getBuiltInThemes();
</script>

<template>
  <ThemeProvider
    :themes="themes"
    default-theme="mint-light"
    initial-mode="system"
    :transition="{ enabled: true, duration: 250 }"
  >
    <RouterView />
  </ThemeProvider>
</template>`,
            },
          ],
        },
        {
          id: "vue-provide-runtime",
          name: "provideThemeRuntime() / useThemeRuntime()",
          covers: ["provideThemeRuntime() / useThemeRuntime()"],
          what: "The explicit provide/inject pair. `provideThemeRuntime(runtime)` publishes a runtime you created; `useThemeRuntime()` retrieves it and throws when none was provided.",
          when: "The runtime already exists outside the component tree — created in a plugin, shared with a non-Vue widget, or built from a config the provider cannot express.",
          effect: "Every composable resolves the provided runtime. `useThemeRuntime()` gives direct access for anything the composables do not cover.",
          related: ["vue-provider", "vue-lifecycle"],
          code: [
            {
              title: "src/plugins/theme.ts",
              lang: "ts",
              code: `import type { App } from "vue";
import { createThemeRuntime, getBuiltInThemes } from "@themvora/core";

export const runtime = createThemeRuntime({
  themes: getBuiltInThemes(),
  defaultTheme: "mint-light",
});

export function installTheme(app: App) {
  app.provide(Symbol.for("themvora-runtime"), runtime);
}`,
            },
            {
              title: "Reading it in a component",
              lang: "vue",
              code: `<script setup lang="ts">
import { useThemeRuntime } from "@themvora/vue";

const runtime = useThemeRuntime();
// e.g. a custom adapter, or a subscription the composables do not expose.
</script>`,
            },
          ],
        },
      ],
    },
    {
      id: "composables",
      label: "Composables",
      intro:
        "Reads are refs, so a template unwraps them automatically and script code uses `.value`. Actions are plain functions that write to the runtime.",
      entries: [
        {
          id: "vue-use-theme",
          name: "useTheme()",
          covers: ["useTheme()"],
          what: "Returns `theme`, `mode`, `effectiveMode` and `family` as `Ref`s, plus `setMode`, `setFamily` and `toggleTheme` as plain functions.",
          when: "A component needs more than one slice — a settings panel, or a header showing the theme name and a toggle.",
          effect: "The component re-renders when any of the four refs changes; the setters update the runtime and the document immediately.",
          related: ["vue-effective-mode", "vue-theme-scope"],
          code: [
            {
              title: "src/components/ThemeSummary.vue",
              lang: "vue",
              code: `<script setup lang="ts">
import { useTheme } from "@themvora/vue";

const { theme, mode, effectiveMode, family, setMode, toggleTheme } = useTheme();
</script>

<template>
  <section>
    <h2>{{ theme.name }}</h2>
    <p>Family {{ family }} · requested {{ mode }} · showing {{ effectiveMode }}</p>
    <button @click="toggleTheme">Toggle</button>
    <button @click="setMode('system')">Follow system</button>
  </section>
</template>`,
            },
          ],
        },
        {
          id: "vue-effective-mode",
          name: "useEffectiveThemeMode()",
          covers: ["useEffectiveThemeMode()"],
          what: "A `Ref<'light' | 'dark'>` holding the mode actually applied — never `system`.",
          when: "Any label, icon or `aria-pressed` that states the current appearance. Binding those to `mode` is the classic bug: with `system` it never moves.",
          effect: "Updates on a click, an OS appearance change, and a sunrise/sunset transition. During SSR it reports what the server rendered.",
          related: ["vue-use-theme", "vue-schedule"],
          code: [
            {
              title: "src/components/AppearanceIcon.vue",
              lang: "vue",
              code: `<script setup lang="ts">
import { useEffectiveThemeMode } from "@themvora/vue";

const effectiveMode = useEffectiveThemeMode();
</script>

<template>
  <span :aria-label="\`\${effectiveMode} mode\`">
    {{ effectiveMode === "dark" ? "🌙" : "☀️" }}
  </span>
</template>`,
            },
          ],
        },
        {
          id: "vue-history",
          name: "useThemeHistory()",
          covers: ["useThemeHistory()"],
          what: "Reactive `canUndo`, `canRedo` and `history` refs plus `undo`, `redo`, `clear` and `jump` actions.",
          when: "A theme editor or live preview where the visitor experiments and wants to step back or jump to a point.",
          effect: "The refs update as history changes, so buttons disable themselves; `jump(index)` moves straight to an entry.",
          related: ["vue-snapshot", "vue-batch"],
          code: [
            {
              title: "src/components/HistoryControls.vue",
              lang: "vue",
              code: `<script setup lang="ts">
import { useThemeHistory } from "@themvora/vue";

const { undo, redo, canUndo, canRedo, clear, jump, history } = useThemeHistory();
</script>

<template>
  <div>
    <button :disabled="!canUndo" @click="undo">Undo</button>
    <button :disabled="!canRedo" @click="redo">Redo</button>
    <button :disabled="!canUndo && !canRedo" @click="clear">Reset</button>

    <ol>
      <li v-for="(entry, index) in history" :key="index">
        <button @click="jump(index)">{{ entry.theme.name }}</button>
      </li>
    </ol>
  </div>
</template>`,
            },
          ],
        },
        {
          id: "vue-batch",
          name: "useThemeBatch()",
          covers: ["useThemeBatch()"],
          what: "Returns a function that runs its callback with DOM writes and notifications coalesced into one flush — and, in Vue's implementation, one history entry.",
          when: "Several changes belong together: setting family and mode at once, or applying a token patch plus a selection.",
          effect: "One re-render and one transition for the group; no intermediate state is painted.",
          related: ["vue-history", "vue-provider"],
          code: [
            {
              title: "src/components/ApplyPreset.vue",
              lang: "vue",
              code: `<script setup lang="ts">
import { useThemeBatch, useThemeRuntime } from "@themvora/vue";

const batch = useThemeBatch();
const runtime = useThemeRuntime();

function applyPreset() {
  batch(() => {
    runtime.selection.setFamily("plum");
    runtime.selection.setMode("dark");
  });
}
</script>

<template>
  <button @click="applyPreset">Plum, dark</button>
</template>`,
            },
          ],
        },
        {
          id: "vue-snapshot",
          name: "useThemeSnapshot() / useThemeRestore()",
          covers: ["useThemeSnapshot() / useThemeRestore()"],
          what: "Two functions: one captures the full runtime state as a serialisable value, the other re-applies a captured state.",
          when: "Named presets the visitor saves, or a checkpoint around a destructive edit. History is step-by-step; snapshots are named states.",
          effect: "Restoring replaces the active theme and selection and notifies subscribers once.",
          related: ["vue-history"],
          code: [
            {
              title: "src/components/SavedLooks.vue",
              lang: "vue",
              code: `<script setup lang="ts">
import { shallowRef } from "vue";
import { useThemeRestore, useThemeSnapshot } from "@themvora/vue";

const snapshot = useThemeSnapshot();
const restore = useThemeRestore();
const saved = shallowRef<ReturnType<typeof snapshot> | null>(null);
</script>

<template>
  <div>
    <button @click="saved = snapshot()">Save this look</button>
    <button :disabled="!saved" @click="saved && restore(saved)">Restore</button>
  </div>
</template>`,
            },
          ],
        },
        {
          id: "vue-lifecycle",
          name: "useThemeLifecycle()",
          covers: ["useThemeLifecycle()"],
          what: "A typed subscription to runtime lifecycle events such as `beforeThemeChange` and `afterPersist`.",
          when: "You need to react to a change rather than to state — analytics, syncing an external store, or a value that must not trigger another render.",
          effect: "The handler runs when the event fires and the returned unsubscribe stops it. Subscribing does not cause re-renders.",
          related: ["vue-provide-runtime", "vue-batch"],
          code: [
            {
              title: "src/components/ThemeAnalytics.vue",
              lang: "vue",
              code: `<script setup lang="ts">
import { onUnmounted } from "vue";
import { useThemeLifecycle } from "@themvora/vue";

const { on } = useThemeLifecycle();

// The composable's own subscriptions are cleaned up with the component; this
// one is ours to release.
const off = on("afterThemeChange", ({ theme }) => {
  window.dispatchEvent(new CustomEvent("app:theme-changed", { detail: theme.name }));
});

onUnmounted(off);
</script>

<template><span /></template>`,
            },
          ],
        },
        {
          id: "vue-packs",
          name: "useThemePacks()",
          covers: ["useThemePacks()"],
          what: "Returns a function that installs a theme pack into the runtime's registry at runtime.",
          when: "Themes arrive after mount: fetched from an API, generated from a brand colour, or code-split out of the initial bundle.",
          effect: "The registry grows and consumers of `useProvidedThemes()` see the new families. The active selection is untouched unless the pack changes it.",
          related: ["vue-provide-runtime", "vue-use-theme"],
          code: [
            {
              title: "src/components/BrandPack.vue",
              lang: "vue",
              code: `<script setup lang="ts">
import { watchEffect } from "vue";
import { useThemePacks } from "@themvora/vue";
import { generateTheme } from "@themvora/core";

const props = defineProps<{ seed: string }>();
const usePack = useThemePacks();

watchEffect(() => {
  const generated = generateTheme({ seed: props.seed, family: "brand" });
  usePack({ themes: [generated.light, generated.dark] });
});
</script>

<template><span /></template>`,
              js: `<script setup>
import { watchEffect } from "vue";
import { useThemePacks } from "@themvora/vue";
import { generateTheme } from "@themvora/core";

const props = defineProps({ seed: String });
const usePack = useThemePacks();

watchEffect(() => {
  const generated = generateTheme({ seed: props.seed, family: "brand" });
  usePack({ themes: [generated.light, generated.dark] });
});
</script>

<template><span /></template>`,
            },
          ],
        },
        {
          id: "vue-schedule",
          name: "useThemeSchedule()",
          covers: ["useThemeSchedule()"],
          what: "Returns a controller: a `state` ref (`enabled`, `active`, `status`, `sunrise`, `sunset`, `nextTransition`) plus `enable()`, `disable()` and `set()`. The underlying `schedule` is `null` when the provider has no `scheduled` option, and the methods become no-ops.",
          when: "A settings row that turns daylight following on or off, or a readout of the next automatic switch.",
          effect: "`state` fills in after mount — deliberately, so the server render is deterministic — and updates as the sun moves.",
          related: ["vue-effective-mode", "vue-provider"],
          code: [
            {
              title: "src/components/DaylightSwitch.vue",
              lang: "vue",
              code: `<script setup lang="ts">
import { useThemeSchedule } from "@themvora/vue";

const schedule = useThemeSchedule();
</script>

<template>
  <label v-if="schedule.schedule">
    <input
      type="checkbox"
      :checked="schedule.state.enabled"
      @change="schedule.state.enabled ? schedule.disable() : schedule.enable()"
    />
    Follow daylight
    <small v-if="schedule.state.nextTransition">
      Next switch: {{ schedule.state.nextTransition.toLocaleTimeString() }}
    </small>
  </label>
</template>`,
            },
          ],
        },
      ],
    },
    {
      id: "library-adapters",
      label: "Library adapters",
      intro:
        "The framework package does not re-export the adapters — install the adapter package alongside `@themvora/vue`. What matters here is timing: these composables register on mount, so nothing they write reaches server-rendered markup.",
      entries: [
        {
          id: "vue-adapter-subpaths",
          name: "Adapter framework subpaths",
          covers: ["Adapter framework subpaths"],
          what: "Four adapter packages (`@themvora/shadcn`, `-bootstrap`, `-daisyui`, `-open-props`) publish a `/vue` entry next to their other framework subpaths. The subpath exports the composable; the package root exports the factory and its types.",
          when: "Any time the adapter is installed from a `.vue` file. Importing the root instead gets you a factory with no lifecycle — nothing registers it and nothing disposes it.",
          effect: "The adapter is tied to the component that called the composable: its variables are removed when that component unmounts.",
          related: ["vue-shadcn-bootstrap", "vue-adapter-factories"],
          code: [
            {
              title: "Which specifier to import",
              lang: "ts",
              code: `// Vue wrapper (composable) — use this in a component.
import { useShadcnTheme } from "@themvora/shadcn/vue";

// Framework-neutral factory — no lifecycle wiring.
import { createShadcnAdapter } from "@themvora/shadcn/factory";

// The adapter's own stylesheet, imported once.
import "@themvora/shadcn/shadcn.css";`,
            },
          ],
        },
        {
          id: "vue-shadcn-bootstrap",
          name: "useShadcnTheme(runtime) / useBootstrapTheme(runtime)",
          covers: ["useShadcnTheme(runtime) / useBootstrapTheme(runtime)"],
          what: "A composable that installs the adapter's CSS-variable factory on the runtime you pass. It registers in `onMounted` and disposes in `onUnmounted`, so nothing the adapter writes exists during server render: the first paint carries Themvora's own tokens, and the library's variables appear once the component mounts.",
          when: "A Vue app on shadcn/ui or Bootstrap where the library should read Themvora's palette rather than a second hand-written one. If those variables have to be in the SSR markup, install the factory on the server instead — the entry below shows how.",
          effect: "The library's variables track the active theme from mount onward, and the host component's unmount removes them.",
          related: ["vue-adapter-subpaths", "vue-daisy-openprops"],
          code: [
            {
              title: "src/components/ShadcnBridge.vue",
              lang: "vue",
              code: `<script setup lang="ts">
import "@themvora/shadcn/shadcn.css";
import { useThemeRuntime } from "@themvora/vue";
import { useShadcnTheme } from "@themvora/shadcn/vue";

// Installs the binding on mount, disposes it on unmount.
useShadcnTheme(useThemeRuntime());
</script>

<template><slot /></template>`,
            },
          ],
        },
        {
          id: "vue-daisy-openprops",
          name: "useDaisyTheme(runtime) / useOpenPropsTheme(runtime)",
          covers: ["useDaisyTheme(runtime) / useOpenPropsTheme(runtime)"],
          what: "daisyUI and Open Props take the same route: a composable on the adapter's `/vue` subpath with the same `onMounted` registration. Both take the runtime as an argument rather than looking it up, so pass the one from `useThemeRuntime()`.",
          when: "The app styles with daisyUI's semantic classes (`btn`, `card`, `input`) or Open Props' custom properties and should follow Themvora's selection.",
          effect: "The library's variables follow the active theme once the component mounts.",
          related: ["vue-shadcn-bootstrap", "vue-adapter-factories"],
          code: [
            {
              title: "src/components/DaisyBridge.vue",
              lang: "vue",
              code: `<script setup lang="ts">
import "@themvora/daisyui/daisyui.css";
import { useThemeRuntime } from "@themvora/vue";
import { useDaisyTheme } from "@themvora/daisyui/vue";

useDaisyTheme(useThemeRuntime());
</script>

<template><slot /></template>`,
            },
          ],
        },
        {
          id: "vue-adapter-factories",
          name: "Adapter factory subpaths",
          covers: ["adapter factory subpaths"],
          what: "`@themvora/shadcn/factory`, `-bootstrap/factory`, `-daisyui/factory` and `-open-props/factory` export the adapter with no Vue wrapper — no `onMounted`, no disposal. They accept a runtime, a store, a theme definition or a token group.",
          when: "The adapter has to be installed outside a component: a plugin, a test, or a runtime built in a plain `.ts` module. During SSR this is the only option, since there is no mount hook to wait for.",
          effect: "You own the handle. `runtime.adapters.use()` returns it and `dispose()` removes the adapter along with the styles it wrote.",
          related: ["vue-adapter-subpaths", "vue-provide-runtime"],
          code: [
            {
              title: "src/plugins/adapters.ts",
              lang: "ts",
              code: `import { createBootstrapAdapter } from "@themvora/bootstrap/factory";
import type { ThemeRuntime } from "@themvora/core";

export function installAdapters(runtime: ThemeRuntime) {
  const handle = runtime.adapters.use(createBootstrapAdapter());
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
        "`transition` is a reactive prop: change it in the template and the runtime picks up the new options for the next switch, without remounting the provider.",
      entries: [
        {
          id: "vue-transition",
          name: "transition",
          covers: ["transition prop"],
          what: "Enables and configures the cross-fade applied when the theme changes — duration, easing, preset, animated properties.",
          when: "Leave the default on; tune it when the default feels slow, or disable it for an app that must repaint instantly.",
          effect: "Theme changes animate. Changing the option after mount changes the next transition without a remount.",
          related: ["vue-suppress-transition", "vue-provider"],
          code: [
            {
              title: "src/App.vue",
              lang: "vue",
              code: `<template>
  <ThemeProvider
    default-theme="mint-light"
    :transition="{ enabled: true, duration: 250, easing: 'ease-in-out' }"
  >
    <RouterView />
  </ThemeProvider>
</template>`,
            },
          ],
        },
        {
          id: "vue-suppress-transition",
          name: "runtime.store.set(theme, { suppressTransition: true })",
          covers: ["runtime.store.set(theme, { suppressTransition: true })"],
          what: "Applies one theme change immediately, skipping the configured animation for that update only.",
          when: "A print path, a screenshot, or a programmatic reset where animating would look like a glitch.",
          effect: "That change is instant; later changes animate again.",
          related: ["vue-transition", "vue-provide-runtime"],
          code: [
            {
              title: "src/composables/usePrintTheme.ts",
              lang: "ts",
              code: `import { useThemeRuntime } from "@themvora/vue";

export function usePrintTheme() {
  const runtime = useThemeRuntime();

  return function applyForPrint() {
    const light = runtime.themes.find((theme) => theme.name === "mint-light");
    if (!light) return;
    runtime.store.set(light, { suppressTransition: true });
  };
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
        "Vue ships the scoped-theme component. The React-only pieces (`ThemeModeButton`, `ThemeInspector`) are not part of this package — build them from the composables above.",
      entries: [
        {
          id: "vue-theme-scope",
          name: "ThemeScope",
          covers: ["ThemeScope"],
          what: "Applies a theme to a subtree: the wrapper carries the scoped CSS variables, so only that region repaints.",
          when: "A preview panel, a marketing section in a fixed palette, or a code sample that must render in the theme it documents.",
          effect: "The global selection is neither read for the scope nor changed by it. A `family` scope follows the page mode; an exact `theme` stays pinned.",
          related: ["vue-use-theme"],
          code: [
            {
              title: "src/components/Preview.vue",
              lang: "vue",
              code: `<script setup lang="ts">
import { ThemeScope } from "@themvora/vue";
</script>

<template>
  <ThemeScope theme="cocoa-dark" class="rounded-lg p-6">
    <h3>Always cocoa</h3>
    <p>This panel keeps its own theme while the page changes.</p>
  </ThemeScope>
</template>`,
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
        "A hand-kept array of family names in the settings page drifts from what the app actually ships — a renamed family lingers, and a pack's families never appear.",
      apis: ["useProvidedThemes()", "useTheme()"],
      why: "`useProvidedThemes()` returns a ref, so the template unwraps it and a `computed` over it re-runs when the registry changes — including when a pack is installed after mount.",
      expect:
        "The options come from the ref and the active one matches `useTheme()`. Choosing another repaints immediately; a pack installed later adds its families to the list.",
      code: [
        {
          title: "src/components/FamilyPicker.vue",
          lang: "vue",
          code: `<script setup lang="ts">
import { useProvidedThemes, useTheme } from "@themvora/vue";

const families = useProvidedThemes();
const { family, setFamily } = useTheme();

function handleFamilyChange(event: Event) {
  const target = event.currentTarget;
  if (!(target instanceof HTMLSelectElement)) return;
  setFamily(target.value);
}
</script>

<template>
  <label>
    Theme family
    <select :value="family" @change="handleFamilyChange">
      <option v-for="entry in families" :key="entry.name" :value="entry.name">
        {{ entry.name }}
      </option>
    </select>
  </label>
</template>`,
          js: `<script setup>
import { useProvidedThemes, useTheme } from "@themvora/vue";

const families = useProvidedThemes();
const { family, setFamily } = useTheme();

function handleFamilyChange(event) {
  const target = event.currentTarget;
  if (!(target instanceof HTMLSelectElement)) return;
  setFamily(target.value);
}
</script>

<template>
  <label>
    Theme family
    <select :value="family" @change="handleFamilyChange">
      <option v-for="entry in families" :key="entry.name" :value="entry.name">
        {{ entry.name }}
      </option>
    </select>
  </label>
</template>`,
        },
      ],
    },
    {
      id: "mode-toggle",
      title: "A mode toggle that reports the truth",
      problem:
        "The toggle's icon says light while the page is dark, because the selection is `system`.",
      apis: ["useEffectiveThemeMode()", "useTheme()"],
      why: "`effectiveMode` is the applied appearance; `mode` is the standing request. The label needs the first, the click needs the second.",
      expect:
        "Icon and label always match the page; a click pins an explicit mode so a `system` visitor stops following the OS.",
      code: [
        {
          title: "src/components/ModeToggle.vue",
          lang: "vue",
          code: `<script setup lang="ts">
import { computed } from "vue";
import { useEffectiveThemeMode, useTheme } from "@themvora/vue";

const effectiveMode = useEffectiveThemeMode();
const { mode, setMode } = useTheme();

const next = computed(() => (effectiveMode.value === "dark" ? "light" : "dark"));
</script>

<template>
  <button
    :aria-pressed="effectiveMode === 'dark'"
    :aria-label="\`Switch to \${next} mode\`"
    @click="setMode(next)"
  >
    {{ effectiveMode === "dark" ? "🌙 Dark" : "☀️ Light" }}
    <span v-if="mode === 'system'"> (auto)</span>
  </button>
</template>`,
        },
      ],
    },
    {
      id: "scoped-preview",
      title: "Preview families without switching to them",
      problem:
        "A gallery should show each family before the visitor commits, without repainting the whole page per preview.",
      apis: ["ThemeScope", "useProvidedThemes()"],
      why: "`ThemeScope` writes the scoped variables onto its own wrapper and renders its slot inside them, so any number of previews coexist and the global selection never moves.",
      expect:
        "Each card renders in its own family; clicking one commits the choice through the setter.",
      code: [
        {
          title: "src/components/ThemeGallery.vue",
          lang: "vue",
          code: `<script setup lang="ts">
import { ThemeScope, useProvidedThemes, useTheme } from "@themvora/vue";

const families = useProvidedThemes();
const { setFamily } = useTheme();
</script>

<template>
  <div class="grid grid-cols-2 gap-4">
    <button
      v-for="entry in families"
      :key="entry.name"
      @click="setFamily(entry.name)"
    >
      <ThemeScope :family="entry.name" class="p-4 rounded-lg">
        <strong>{{ entry.name }}</strong>
        <p class="muted">The quick brown fox</p>
      </ThemeScope>
    </button>
  </div>
</template>`,
        },
      ],
    },
    {
      id: "ssr-bootstrap",
      title: "Zero flash on a server-rendered Vue app",
      problem:
        "A Nuxt-less SSR setup paints the default theme and corrects it once the client bundle runs.",
      apis: ["createVueThemeBootstrapScript()", "ThemeProvider"],
      why: "The generated script applies the persisted selection in `<head>`, before the body is parsed, so there is nothing to correct. It is emitted with Vue's storage key and prefix, which is what makes it agree with the provider's persistence.",
      expect:
        "The first paint is the persisted theme; no correction frame on reload.",
      caveats:
        "The script and the provider must share the same theme registry. Emit the script from the same module that defines the themes.",
      code: [
        {
          title: "server/head.ts",
          lang: "ts",
          code: `import { createVueThemeBootstrapScript } from "@themvora/vue";
import { getBuiltInThemes } from "@themvora/core";

const themes = getBuiltInThemes();

// Emit inside <head>, before any stylesheet that depends on the variables.
export const themeScript = createVueThemeBootstrapScript({
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
      body: "Family, mode, and history controls in one component — each reading only the refs it needs, so a token change does not re-render the whole panel.",
      code: [
        {
          title: "src/components/AppearanceSettings.vue",
          lang: "vue",
          code: `<script setup lang="ts">
import { useEffectiveThemeMode, useProvidedThemes, useTheme, useThemeHistory } from "@themvora/vue";

const MODES = ["light", "dark", "system"] as const;

const families = useProvidedThemes();
const { family, setFamily, mode, setMode } = useTheme();
const effectiveMode = useEffectiveThemeMode();
const { undo, canUndo } = useThemeHistory();

function handleFamilyChange(event: Event) {
  const target = event.currentTarget;
  if (!(target instanceof HTMLSelectElement)) return;
  setFamily(target.value);
}
</script>

<template>
  <form>
    <label>
      Family
      <select :value="family" @change="handleFamilyChange">
        <option v-for="entry in families" :key="entry.name" :value="entry.name">
          {{ entry.name }}
        </option>
      </select>
    </label>

    <fieldset>
      <legend>Mode</legend>
      <label v-for="option in MODES" :key="option">
        <input
          type="radio"
          name="mode"
          :checked="mode === option"
          @change="setMode(option)"
        />
        {{ option }}
        <span v-if="option === mode && mode === 'system'"> (now {{ effectiveMode }})</span>
      </label>
    </fieldset>

    <button type="button" :disabled="!canUndo" @click="undo">Undo last change</button>
  </form>
</template>`,
          js: `<script setup>
import { useEffectiveThemeMode, useProvidedThemes, useTheme, useThemeHistory } from "@themvora/vue";

const MODES = ["light", "dark", "system"];

const families = useProvidedThemes();
const { family, setFamily, mode, setMode } = useTheme();
const effectiveMode = useEffectiveThemeMode();
const { undo, canUndo } = useThemeHistory();

function handleFamilyChange(event) {
  const target = event.currentTarget;
  if (!(target instanceof HTMLSelectElement)) return;
  setFamily(target.value);
}
</script>

<template>
  <form>
    <label>
      Family
      <select :value="family" @change="handleFamilyChange">
        <option v-for="entry in families" :key="entry.name" :value="entry.name">
          {{ entry.name }}
        </option>
      </select>
    </label>

    <fieldset>
      <legend>Mode</legend>
      <label v-for="option in MODES" :key="option">
        <input
          type="radio"
          name="mode"
          :checked="mode === option"
          @change="setMode(option)"
        />
        {{ option }}
        <span v-if="option === mode && mode === 'system'"> (now {{ effectiveMode }})</span>
      </label>
    </fieldset>

    <button type="button" :disabled="!canUndo" @click="undo">Undo last change</button>
  </form>
</template>`,
        },
      ],
    },
    {
      id: "brand-pack",
      title: "Install a generated brand theme at runtime",
      body: "A seed colour becomes a light/dark pair, the pair is registered, and the family is selected — batched so the page never paints the half-applied state.",
      code: [
        {
          title: "src/components/BrandSetup.vue",
          lang: "vue",
          code: `<script setup lang="ts">
import { useThemeBatch, useThemePacks, useThemeRuntime } from "@themvora/vue";
import { generateTheme } from "@themvora/core";

const props = defineProps<{ seed: string }>();
const usePack = useThemePacks();
const batch = useThemeBatch();
const runtime = useThemeRuntime();

function applyBrand() {
  const generated = generateTheme({ seed: props.seed, family: "brand" });
  batch(() => {
    usePack({ themes: [generated.light, generated.dark] });
    runtime.selection.setFamily("brand");
  });
}
</script>

<template>
  <button @click="applyBrand">Use {{ seed }}</button>
</template>`,
          js: `<script setup>
import { useThemeBatch, useThemePacks, useThemeRuntime } from "@themvora/vue";
import { generateTheme } from "@themvora/core";

const props = defineProps({ seed: String });
const usePack = useThemePacks();
const batch = useThemeBatch();
const runtime = useThemeRuntime();

function applyBrand() {
  const generated = generateTheme({ seed: props.seed, family: "brand" });
  batch(() => {
    usePack({ themes: [generated.light, generated.dark] });
    runtime.selection.setFamily("brand");
  });
}
</script>

<template>
  <button @click="applyBrand">Use {{ seed }}</button>
</template>`,
        },
      ],
    },
  ],
  notAvailable: [
    {
      name: "useThemeTimeTravel()",
      reason:
        "Vue does not export it. `useThemeHistory()` gives you `history` as a ref and `jump(index)` as an action, which covers the same ground.",
    },
    {
      name: "ThemeModeButton / ThemeInspector",
      reason:
        "React-only components. The composables in this package are enough to build the equivalent control; the inspector has no Vue counterpart.",
    },
  ],
};
