import type { FrameworkExamples } from "./types";

/**
 * Nuxt examples and use cases.
 *
 * Nuxt's integration is a module: it installs the runtime as a plugin,
 * auto-imports the composables and components, and resolves the initial theme
 * on the server from cookies. Verified against `packages/nuxt/src` — the module
 * options live under the `themvora` config key, and `useThemeSchedule()` is
 * auto-imported like the rest.
 */
export const nuxtExamples: FrameworkExamples = {
  slug: "nuxt",
  sections: {
    startHere: "The module renders the first byte",
    useCases: "Module config, per-page overrides, honest labels",
    api: "Module options and auto-imports",
    combining: "The complete module configuration",
  },
  intro: [
    "Nuxt's integration is a module: `themvora` in `nuxt.config.ts` configures the registry, the server resolves the initial theme from cookies, and the client runtime is installed once as a plugin.",
    "The convenience that matters is auto-imports — `useTheme()`, `useThemeHistory()`, `ThemeScope` and the rest need no import statement in a Nuxt app. Outside the auto-import scope, import them from `@themvora/vue`: Nuxt's import protection rejects a module's entry point in app code.",
  ],
  startHere: {
    body: "Add the module to `nuxt.config.ts`. It registers the runtime plugin, auto-imports the composables and components, and emits the blocking bootstrap so the first paint is already themed.",
    note: "With no `themes` option the module uses the built-in neutral themes, so an empty `themvora: {}` block is a complete setup.",
    code: [
      {
        title: "nuxt.config.ts",
        lang: "ts",
        code: `import { getBuiltInThemes } from "@themvora/core";

export default defineNuxtConfig({
  modules: ["@themvora/nuxt"],
  themvora: {
    themes: getBuiltInThemes(),
    defaultTheme: "mint-light",
    initialMode: "system",
  },
});`,
      },
      {
        title: "app/app.vue",
        lang: "vue",
        code: `<script setup lang="ts">
// Auto-imported — no import statement needed.
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
      id: "server",
      label: "Server",
      intro:
        "The module's server half resolves the initial theme during the request and puts the result in the HTML. None of it is configured per page.",
      entries: [
        {
          id: "nuxt-ssr",
          name: "SSR-first theme resolution",
          covers: ["SSR-first theme resolution"],
          what: "Reads the `theme-name`, `theme-mode`, `theme-family` and `theme-fingerprint` cookies, validates the fingerprint against the current registry, resolves the initial theme, and renders `<html data-theme>` with the CSS variables inlined.",
          when: "Always — it is what the module does. It matters most when the registry changed since the cookie was written, because the fingerprint rejects a stale selection instead of resolving a missing theme.",
          effect: "The HTML that reaches the browser already carries the right theme; hydration attaches handlers to correct markup.",
          related: ["nuxt-cookie-sync", "nuxt-bootstrap"],
          code: [
            {
              title: "nuxt.config.ts",
              lang: "ts",
              code: `import { getBuiltInThemes } from "@themvora/core";

export default defineNuxtConfig({
  modules: ["@themvora/nuxt"],
  themvora: {
    themes: getBuiltInThemes(),
    defaultTheme: "mint-light",
  },
});`,
            },
          ],
        },
        {
          id: "nuxt-bootstrap",
          name: "Blocking bootstrap script",
          covers: ["Blocking bootstrap script"],
          what: "A blocking `<script>` in `<head>` that re-applies the persisted selection before the body is parsed — the case the server cannot decide is `system` with a dark-preferring visitor.",
          when: "Always, emitted by the module. It is what makes `initialMode: \"system\"` correct on the first frame.",
          effect: "No flash for a visitor whose OS preference differs from the server's assumption.",
          related: ["nuxt-dark-fallback", "nuxt-ssr"],
          code: [
            {
              title: "What the head ends up containing",
              lang: "html",
              code: `<!-- Emitted by the module; you do not write this. -->
<script>
  (function () {
    var d = document.documentElement;
    var mode = "system";
    var prefersDark = matchMedia("(prefers-color-scheme: dark)").matches;
    d.dataset.themeMode = mode === "system" ? (prefersDark ? "dark" : "light") : mode;
    d.classList.toggle("dark", d.dataset.themeMode === "dark");
  })();
</script>`,
            },
          ],
        },
        {
          id: "nuxt-dark-fallback",
          name: "Dark-mode CSS fallback",
          covers: ["Dark-mode CSS fallback"],
          what: "When the persisted mode is `system`, the server also emits an `@media (prefers-color-scheme: dark)` block carrying the dark theme's variables, so the browser can pick the palette without waiting for script.",
          when: "Automatic. It covers browsers that apply the media query before any script runs.",
          effect: "The light variables are emitted for the light scheme and the dark ones only inside the media query, so no inline value outranks the dark block.",
          related: ["nuxt-bootstrap", "nuxt-schedule"],
          code: [
            {
              title: "What the server emits for system mode",
              lang: "css",
              code: `:root {
  --theme-color-background: #ffffff;
  --theme-color-foreground: #0b0b0c;
}

@media (prefers-color-scheme: dark) {
  :root {
    --theme-color-background: #0b0b0c;
    --theme-color-foreground: #f5f5f6;
  }
}`,
            },
          ],
        },
        {
          id: "nuxt-cookie-sync",
          name: "Cookie + localStorage sync",
          covers: ["Cookie + localStorage sync"],
          what: "The client mirrors the selection back to cookies so the server renders the right theme on the next request — the same contract as `@themvora/next`. `localStorage` is the browser copy; the cookies are what the server can read.",
          when: "Automatic. It matters when you write a custom control: call the runtime's setters rather than writing `localStorage` yourself, or the server will render a stale theme.",
          effect: "A reload after a theme change is server-rendered in the new theme, with no correction frame.",
          related: ["nuxt-ssr", "nuxt-runtime-plugin"],
          code: [
            {
              title: "Writing the selection the supported way",
              lang: "vue",
              code: `<script setup lang="ts">
// The runtime mirrors this to cookies; writing localStorage directly would
// leave the server rendering the previous theme.
const { setFamily } = useTheme();
</script>`,
            },
          ],
        },
      ],
    },
    {
      id: "client",
      label: "Client",
      intro:
        "One plugin installs the runtime app-wide; the composables and components are auto-imported on top of it.",
      entries: [
        {
          id: "nuxt-runtime-plugin",
          name: "Runtime plugin",
          covers: ["Runtime plugin"],
          what: "A Nuxt plugin installs one app-wide runtime and provides it to `useTheme()`, `useThemeRuntime()` and every auto-imported composable.",
          when: "Always — the module registers it. You only interact with it when you need the runtime object itself.",
          effect: "One runtime per app, shared by every component and by the module's own components. `useThemeRuntime()` returns it anywhere.",
          related: ["nuxt-auto-imports", "nuxt-config"],
          code: [
            {
              title: "Reading the runtime directly",
              lang: "vue",
              code: `<script setup lang="ts">
// Auto-imported from the module's plugin.
const runtime = useThemeRuntime();
</script>`,
            },
          ],
        },
        {
          id: "nuxt-auto-imports",
          name: "Auto-imports",
          covers: ["Auto-imports"],
          what: "Composables (`useTheme`, `useThemeMode`, `useThemeHistory`, …) and components (`ThemeScope`, `ThemeScrollbar`) are auto-imported, so a page needs no import statement. Outside the auto-import scope, import them from `@themvora/vue`.",
          when: "Always. Use an explicit import in a plain `.ts` file outside the Nuxt auto-import scope, such as a test or a shared utility.",
          effect: "Components resolve in templates without registration; composables resolve in `setup` without imports.",
          related: ["nuxt-runtime-plugin", "nuxt-config"],
          code: [
            {
              title: "app/pages/preview.vue",
              lang: "vue",
              code: `<template>
  <ThemeScope theme="cocoa-dark" class="rounded-lg p-6">
    <h3>Always cocoa</h3>
  </ThemeScope>
</template>`,
            },
            {
              title: "Explicit import outside a component",
              lang: "ts",
              code: `// The auto-import scope does not apply in a plain module. Import from the
// Vue integration — Nuxt's import protection rejects a module's entry point.
import { useThemeRuntime } from "@themvora/vue";`,
            },
          ],
        },
        {
          id: "nuxt-config",
          name: 'configKey: "themvora"',
          covers: ['configKey: "themvora"'],
          what: "The module's options live under `themvora` in `nuxt.config.ts`: `themes`, `defaultTheme`, `initialMode`, `initialFamily`, `transition`, `scrollbar`, `storageKey` and `scheduled`.",
          when: "Any app-level configuration. Because it is module config, it is fixed for the app rather than per page.",
          effect: "The server resolution, the blocking script and the client runtime all read the same options, so they cannot disagree.",
          related: ["nuxt-ssr", "nuxt-transition"],
          code: [
            {
              title: "nuxt.config.ts",
              lang: "ts",
              code: `import { getBuiltInThemes } from "@themvora/core";

export default defineNuxtConfig({
  modules: ["@themvora/nuxt"],
  themvora: {
    themes: getBuiltInThemes(),
    defaultTheme: "mint-light",
    initialMode: "system",
    initialFamily: "mint",
    transition: { enabled: true, duration: 250 },
    scrollbar: true,
    storageKey: "app-theme",
  },
});`,
            },
          ],
        },
        {
          id: "nuxt-schedule",
          name: "useThemeSchedule()",
          covers: ["useThemeSchedule()"],
          what: "An auto-imported composable exposing the sunrise/sunset schedule: a reactive `state` (`enabled`, `status`, `sunrise`, `sunset`, `nextTransition`) plus `enable()`, `disable()` and `set()`.",
          when: "A settings row that turns daylight following on or off. Configure the schedule itself with `scheduled` in the module config.",
          effect: "`state` updates as the sun moves; the methods write through to the runtime. Without `scheduled` in the config the state stays empty and the methods do nothing.",
          related: ["nuxt-dark-fallback", "nuxt-config"],
          code: [
            {
              title: "app/components/DaylightSwitch.vue",
              lang: "vue",
              code: `<script setup lang="ts">
// Auto-imported. Destructure the ref: state is a Ref<ThemeScheduleState>.
const { state, enable, disable } = useThemeSchedule();
</script>

<template>
  <label>
    <input
      type="checkbox"
      :checked="state.enabled"
      @change="state.enabled ? disable() : enable()"
    />
    Follow daylight
    <small v-if="state.nextTransition">
      Next switch: {{ state.nextTransition.toLocaleTimeString() }}
    </small>
  </label>
</template>`,
            },
          ],
        },
      ],
    },
    {
      id: "transition",
      label: "Transition",
      intro:
        "Configured once in the `themvora` block and handed to the plugin, so every page gets the same transition without repeating the option.",
      entries: [
        {
          id: "nuxt-transition",
          name: "transition",
          covers: ["transition in nuxt.config.ts"],
          what: "Configure `transition` in the `themvora` config object to enable CSS transitions on theme changes. Duration and easing are set once; Themvora generates the transition styles at runtime.",
          when: "Leave the default on; tune it when a large surface feels slow, or disable it for an app that must repaint instantly.",
          effect: "Theme changes cross-fade. Because the option is module config, changing it takes a config reload rather than a runtime call.",
          related: ["nuxt-suppress-transition", "nuxt-config"],
          code: [
            {
              title: "nuxt.config.ts",
              lang: "ts",
              code: `export default defineNuxtConfig({
  modules: ["@themvora/nuxt"],
  themvora: {
    transition: { enabled: true, duration: 250, easing: "ease-in-out" },
  },
});`,
            },
          ],
        },
        {
          id: "nuxt-suppress-transition",
          name: "runtime.store.set(theme, { suppressTransition: true })",
          covers: ["runtime.store.set(theme, { suppressTransition: true })"],
          what: "A per-update escape hatch that skips the configured animation for a single switch.",
          when: "A print path, a screenshot, or a programmatic reset where animating would look like a glitch.",
          effect: "That one change is instant; later changes animate again with the configured options.",
          related: ["nuxt-transition", "nuxt-runtime-plugin"],
          code: [
            {
              title: "app/composables/usePrintTheme.ts",
              lang: "ts",
              code: `export function usePrintTheme() {
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
      id: "scrollbar",
      label: "Scrollbar",
      intro:
        "The overlay scrollbar has to exist before the first paint, so it is opted in on the server through the module config.",
      entries: [
        {
          id: "nuxt-scrollbar",
          name: "scrollbar: true",
          covers: ["scrollbar: true"],
          what: "Enables Themvora's overlay scrollbar. The SSR bootstrap hides the native scrollbar before first paint, then the overlay engine synchronizes with browser scrolling without replacing native scroll behaviour.",
          when: "A custom scrollbar is part of the design. Without the server half, the page paints a native bar for a frame.",
          effect: "No native-bar flash; the overlay stays theme-aware and follows runtime theme changes.",
          related: ["nuxt-scrollbar-option", "nuxt-config"],
          code: [
            {
              title: "nuxt.config.ts",
              lang: "ts",
              code: `export default defineNuxtConfig({
  modules: ["@themvora/nuxt"],
  // The overlay styles ship with core, not the module.
  css: ["@themvora/core/scrollbar.css"],
  themvora: { scrollbar: true },
});`,
            },
            {
              title: "app/app.vue",
              lang: "vue",
              code: `<template>
  <!-- Auto-imported; the module config is what hides the native bar. -->
  <ThemeScrollbar />
  <NuxtPage />
</template>`,
            },
          ],
        },
        {
          id: "nuxt-scrollbar-option",
          name: "scrollbar options",
          covers: ["scrollbar option"],
          what: "Configure the overlay appearance — thickness, radius, colours, auto-hide — from the `themvora` config instead of hand-written CSS.",
          when: "The default overlay is too subtle or too heavy for the design, or the app needs an explicit colour token rather than the derived one.",
          effect: "The overlay is built from the options and stays theme-aware as the runtime theme changes.",
          related: ["nuxt-scrollbar"],
          code: [
            {
              title: "nuxt.config.ts",
              lang: "ts",
              code: `export default defineNuxtConfig({
  modules: ["@themvora/nuxt"],
  css: ["@themvora/core/scrollbar.css"],
  themvora: {
    scrollbar: { thickness: 10, radius: 999, autoHide: true },
  },
});`,
            },
          ],
        },
      ],
    },
  ],
  recipes: [
    {
      id: "ssr-first-paint",
      title: "Guarantee a themed first byte",
      problem:
        "A Nuxt app flashes the default theme on reload and the switcher's label changes text after hydration.",
      apis: ["SSR-first theme resolution", "Blocking bootstrap script", "Cookie + localStorage sync"],
      why: "The module resolves the cookie selection on the server and inlines the variables, so the HTML is already correct; the script only handles `system` with a dark-preferring visitor.",
      expect:
        "Reloading with a persisted theme paints it immediately, with no hydration mismatch on components that render the theme name.",
      caveats:
        "Write the selection through the composables. Writing `localStorage` directly bypasses the cookie mirror and the server will render the previous theme.",
      code: [
        {
          title: "nuxt.config.ts",
          lang: "ts",
          code: `import { getBuiltInThemes } from "@themvora/core";

export default defineNuxtConfig({
  modules: ["@themvora/nuxt"],
  themvora: {
    themes: getBuiltInThemes(),
    defaultTheme: "mint-light",
    initialMode: "system",
  },
});`,
        },
      ],
    },
    {
      id: "route-scoped-theme",
      title: "Pin one page to its own theme",
      problem:
        "The pricing page must render in the brand theme regardless of the app-wide selection, without changing the visitor's preference.",
      apis: ["ThemeScope (auto-imported)"],
      why: "`ThemeScope` writes the scoped variables onto its own wrapper and never touches the global selection.",
      expect:
        "The page renders in the pinned theme; navigating away shows the previous selection unchanged.",
      code: [
        {
          title: "app/pages/pricing.vue",
          lang: "vue",
          code: `<template>
  <ThemeScope theme="cocoa-light">
    <h1>Pricing</h1>
    <PricingTable />
  </ThemeScope>
</template>`,
        },
      ],
    },
    {
      id: "client-readout",
      title: "Show the mode that is actually applied",
      problem:
        "The header icon says light while the page is dark, because the selection is `system`.",
      apis: ["useTheme()"],
      why: "`useTheme()` exposes `effectiveMode` alongside `mode`; the icon reads the first, and only a control that changes the selection needs the second.",
      expect: "The icon matches the page in every case, including after a schedule transition.",
      code: [
        {
          title: "app/components/AppearanceIcon.vue",
          lang: "vue",
          code: `<script setup lang="ts">
const { mode, effectiveMode } = useTheme();
</script>

<template>
  <span :title="mode === 'system' ? 'Following the system' : undefined">
    {{ effectiveMode === "dark" ? "🌙" : "☀️" }}
  </span>
</template>`,
        },
      ],
    },
  ],
  combining: [
    {
      id: "full-config",
      title: "A complete module configuration",
      body: "The options this page has referred to, in one place: registry, default, mode, transition, scrollbar and schedule.",
      code: [
        {
          title: "nuxt.config.ts",
          lang: "ts",
          code: `import { getBuiltInThemes } from "@themvora/core";

export default defineNuxtConfig({
  modules: ["@themvora/nuxt"],
  // The scrollbar styles ship with core, not the module.
  css: ["@themvora/core/scrollbar.css"],
  themvora: {
    themes: getBuiltInThemes(),
    defaultTheme: "mint-light",
    initialMode: "system",
    initialFamily: "mint",
    transition: { enabled: true, duration: 250 },
    scrollbar: { thickness: 10, autoHide: true },
    scheduled: { lightTheme: "mint-light", darkTheme: "mint-dark" },
    storageKey: "app-theme",
  },
});`,
        },
      ],
    },
  ],
  notAvailable: [
    {
      name: "createThemeRoot() / createTailwindPlugin()",
      reason:
        "Neither belongs here: Nuxt owns the document and hydrates it, and Tailwind configuration is a CSS concern. Use `@themvora/tailwind` for the Tailwind mapping.",
    },
  ],
};
