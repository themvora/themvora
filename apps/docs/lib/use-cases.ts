export type UseCase = {
  title: string;
  desc: string;
  lang: string;
  /**
   * Path of the file this snippet belongs in, shown in the code block's header.
   *
   * Optional, and deliberately separate from `title`: the title is a short
   * description ("Theme an island") and must never be shown as a filename. Omit
   * it for fragments that are not a whole file — no label is honest, a
   * description labelled as a path is not.
   */
  filename?: string;
  code: string;
  /**
   * Hand-authored JavaScript alternative, for snippets whose TypeScript cannot
   * be mechanically converted. When present, the pipeline uses it instead of
   * deriving.
   */
  js?: string;
  /** File name for the JavaScript variant, when it differs from the mapped one. */
  jsFilename?: string;
};

const react: UseCase[] = [
  {
    title: "Toggle light / dark",
    desc: "Read the active theme, mode and family and flip between them with zero config.",
    lang: "tsx",
    code: `import { useTheme } from "@themvora/react";

export function ThemeToggle() {
  const { theme, mode, family, setMode, setFamily, toggleTheme } = useTheme();
  return (
    <div className="row">
      <button onClick={toggleTheme}>{theme.name}</button>
      <button onClick={() => setMode("dark")}>Dark</button>
      <button onClick={() => setMode("light")}>Light</button>
      <select value={family} onChange={(e) => setFamily(e.target.value)}>
        {["default", "mint", "plum"].map((f) => (
          <option key={f} value={f}>{f}</option>
        ))}
      </select>
      <span className="mono">{mode}</span>
    </div>
  );
}`,
  },
  {
    title: "Undo / redo + live token editing",
    desc: "Theme changes are snapshotted automatically. Undo, redo, or patch tokens at runtime.",
    lang: "tsx",
    code: `import { useThemeHistory, useThemeRuntime } from "@themvora/react";

export function ThemeControls() {
  const { undo, redo, canUndo, canRedo } = useThemeHistory();
  const runtime = useThemeRuntime();

  return (
    <div>
      <button onClick={undo} disabled={!canUndo}>Undo</button>
      <button onClick={redo} disabled={!canRedo}>Redo</button>
      <button
        onClick={() => runtime.update({ colors: { primary: "#6366f1" } })}
      >
        Make primary indigo
      </button>
    </div>
  );
}`,
  },
  {
    title: "Scope a subtree",
    desc: "Apply a specific theme to a section of the tree with scoped CSS variables.",
    lang: "tsx",
    code: `import { useRef } from "react";
import { ThemeScope, useScopedTheme } from "@themvora/react";
import type { ThemeTransitionOptions } from "@themvora/core";

const transition: ThemeTransitionOptions = { duration: 300, easing: "ease" };

export function Dashboard() {
  return (
    <>
      <Sidebar /> {/* inherits the global theme */}
      <ThemeScope theme="plum-dark" transition={transition}>
        <DataViz /> {/* always themed "plum-dark" */}
      </ThemeScope>
    </>
  );
}

export function ScopedCard() {
  const ref = useRef<HTMLDivElement>(null);
  useScopedTheme(ref, "plum-dark");
  return <div ref={ref}>Imperatively scoped</div>;
}`,
  },
  {
    title: "Lifecycle events + theme packs",
    desc: "React to every theme change, and install a ready-made pack (e.g. a11y profiles) at runtime.",
    lang: "tsx",
    code: `import { useEffect } from "react";
import { useThemeLifecycle, useThemePacks } from "@themvora/react";
import { getAccessibilityProfiles } from "@themvora/core";

export function Telemetry() {
  const { on } = useThemeLifecycle();
  const applyPack = useThemePacks();

  useEffect(() => {
    const off = on("beforeThemeChange", (e) => {
      console.log("theme changing to", e.next.name);
    });
    return off;
  }, [on]);

  return (
    <button
      onClick={() =>
        applyPack({ name: "a11y", themes: getAccessibilityProfiles() })
      }
    >
      Apply High Contrast pack
    </button>
  );
}`,
  },
  {
    title: "Smooth theme transitions",
    desc: "Enable CSS transitions on theme changes for a polished user experience.",
    filename: "src/main.tsx",
    lang: "tsx",
    code: `import { createRoot } from "react-dom/client";
import { ThemeProvider } from "@themvora/react";

// Your application root. The provider lives here; App only renders UI.
function App() {
  return <main>Your app</main>;
}

createRoot(document.getElementById("root")!).render(
  <ThemeProvider
    transition={{
      enabled: true,
      duration: 300,
      easing: "ease-in-out",
      properties: [
        "color",
        "background-color",
        "border-color",
        "border-radius",
        "font-size",
        "box-shadow",
      ],
    }}
  >
    <App />
  </ThemeProvider>,
);`,
  },
];

const next: UseCase[] = [
  {
    title: "SSR provider with zero-flash",
    desc: "The server component resolves the initial theme, renders CSS variables in the HTML, and blocks the flash.",
    lang: "tsx",
    code: `// app/layout.tsx
import { ThemeProvider } from "@themvora/next";

export default function RootLayout({ children }) {
  return (
    <ThemeProvider
      defaultTheme="system"
      className="scroll-smooth"
      body={{ className: "font-sans" }}
    >
      {children}
    </ThemeProvider>
  );
}`,
  },
  {
    title: "Client-side switcher",
    desc: "Hooks live behind @themvora/next/client and update cookies + DOM together.",
    lang: "tsx",
    code: `// app/theme-switcher.tsx
"use client";
import { useTheme } from "@themvora/next/client";

export function ThemeSwitcher() {
  const { theme, mode, setMode, toggleTheme } = useTheme();
  return (
    <button onClick={toggleTheme}>
      {theme.name} · {mode}
    </button>
  );
}`,
  },
  {
    title: "Scoped theming in a client component",
    desc: "ThemeScope works in any client component, next to server-rendered content.",
    lang: "tsx",
    code: `// app/widgets.tsx
"use client";
import { ThemeScope } from "@themvora/next/client";
import type { ThemeTransitionOptions } from "@themvora/core";

const transition: ThemeTransitionOptions = { duration: 300, easing: "ease" };

export function Widget() {
  return (
    <ThemeScope theme="plum-dark" transition={transition}>
      <div className="rounded-xl p-4">Always plum-dark here</div>
    </ThemeScope>
  );
}`,
  },
  {
    title: "Runtime access + lifecycle events",
    desc: "Reach the underlying runtime from a client component, and subscribe to lifecycle events such as beforeThemeChange.",
    lang: "tsx",
    code: `// app/runtime-demo.tsx
"use client";
import { useEffect } from "react";
import { useThemeRuntime, useThemeLifecycle } from "@themvora/next/client";

export function RuntimeDemo() {
  const runtime = useThemeRuntime();
  const { on } = useThemeLifecycle();

  useEffect(() => {
    // Fires for every theme change, including one arriving from another tab.
    const off = on("beforeThemeChange", (e) => console.log(e.next.name));
    return off;
  }, [on]);

  return (
    <button onClick={() => runtime.update({ radius: { sm: "8px", md: "12px" } })}>
      Soften corners
    </button>
  );
}`,
  },
  {
    title: "Sunrise / sunset scheduling",
    desc: "Switch between a light and a dark theme at each visitor's local sunrise and sunset. Coordinates are auto-detected from the browser timezone — pin them with latitude/longitude or timeZone when you need to.",
    lang: "tsx",
    code: `// app/layout.tsx — no theme definitions required
import type { ReactNode } from "react";
import { ThemeProvider } from "@themvora/next";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    // No \`themes\` prop: the built-in neutral light/dark pair is used.
    // With your own themes, name the pair instead:
    //   scheduled={{ lightTheme: "mint-light", darkTheme: "mint-dark" }}
    <ThemeProvider defaultTheme="light" scheduled={{}}>
      {children}
    </ThemeProvider>
  );
}

// app/schedule-status.tsx
"use client";
import { useThemeSchedule } from "@themvora/next/client";

export function ScheduleStatus() {
  const schedule = useThemeSchedule();
  if (!schedule) return null;

  return (
    <button
      onClick={() => (schedule.enabled ? schedule.disable() : schedule.enable())}
    >
      {schedule.status}
      {schedule.sunrise ? " · sunrise " + schedule.sunrise.toLocaleTimeString() : ""}
      {schedule.sunset ? " · sunset " + schedule.sunset.toLocaleTimeString() : ""}
    </button>
  );
}`,
  },
  {
    title: "Multi-window sync",
    desc: "Sync is on by default — there is no API to call. Every runtime installs a BroadcastChannel adapter on the \"theme-selection\" channel, so switching the theme in one tab updates every other open tab. This component renders the shared selection, so you can watch it change from a second tab.",
    lang: "tsx",
    code: `// app/sync-status.tsx
"use client";
import { useTheme } from "@themvora/next/client";

export function SyncStatus() {
  const { theme, family, mode } = useTheme();

  // Open the site in two tabs and switch the theme in one — this updates in
  // both, because the runtime broadcasts the selection over BroadcastChannel.
  return (
    <p data-theme={theme.name}>
      {family} · {mode}
    </p>
  );
}`,
  },
  {
    title: "Smooth theme transitions",
    desc: "Enable CSS transitions on theme changes for a polished user experience.",
    lang: "tsx",
    code: `// app/layout.tsx
import { ThemeProvider } from "@themvora/next";

export default function RootLayout({ children }) {
  return (
    <ThemeProvider
      defaultTheme="light"
      transition={{
        enabled: true,
        duration: 300,
        easing: "ease-in-out",
      }}
    >
      {children}
    </ThemeProvider>
  );
}`,
  },
];

const vue: UseCase[] = [
  {
    title: "Toggle light / dark",
    desc: "useTheme exposes refs and setters — reactive in templates and scripts.",
    lang: "vue",
    code: `<script setup lang="ts">
import { useTheme } from "@themvora/vue";
const { theme, mode, family, setMode, setFamily, toggleTheme } = useTheme();
</script>

<template>
  <button @click="toggleTheme">{{ theme.name }} · {{ mode }}</button>
  <button @click="setMode('dark')">Dark</button>
  <select :value="family" @change="(e: Event) => setFamily((e.target as HTMLSelectElement).value)">
    <option value="default">Default</option>
    <option value="mint">Mint</option>
  </select>
</template>`,
  },
  {
    title: "Undo / redo theme changes",
    desc: "History state is reactive; use it to build undo/redo controls.",
    lang: "vue",
    code: `<script setup lang="ts">
import { useThemeHistory, useThemeRuntime } from "@themvora/vue";
const { undo, redo, canUndo, canRedo } = useThemeHistory();
const runtime = useThemeRuntime();
</script>

<template>
  <button :disabled="!canUndo" @click="undo">Undo</button>
  <button :disabled="!canRedo" @click="redo">Redo</button>
  <button @click="runtime.update({ colors: { primary: '#6366f1' } })">
    Make primary indigo
  </button>
</template>`,
  },
  {
    title: "Scope a subtree",
    desc: "ThemeScope applies a theme to a slot with scoped CSS variables.",
    lang: "vue",
    code: `<script setup lang="ts">
import { ThemeScope } from "@themvora/vue";
import type { ThemeTransitionOptions } from "@themvora/core";

const transition: ThemeTransitionOptions = { duration: 300, easing: "ease" };
</script>

<template>
  <Sidebar />
  <ThemeScope theme="plum-dark" :transition="transition">
    <DataViz />
  </ThemeScope>
</template>`,
  },
  {
    title: "Lifecycle events",
    desc: "Subscribe to typed lifecycle events and react to changes.",
    lang: "vue",
    code: `<script setup lang="ts">
import { onMounted } from "vue";
import { useThemeLifecycle, useThemePacks } from "@themvora/vue";
import { getAccessibilityProfiles } from "@themvora/core";

const { on } = useThemeLifecycle();
const applyPack = useThemePacks();

onMounted(() => {
  on("beforeThemeChange", (e) => console.log("theme changing to", e.next.name));
});
</script>

<template>
  <button @click="applyPack({ name: 'a11y', themes: getAccessibilityProfiles() })">
    Apply High Contrast pack
  </button>
</template>`,
  },
  {
    title: "Smooth theme transitions",
    desc: "Enable CSS transitions on theme changes for a polished user experience.",
    lang: "vue",
    code: `<script setup lang="ts">
import { ThemeProvider } from "@themvora/vue";
</script>

<template>
  <ThemeProvider
    :transition="{ enabled: true, duration: 300, easing: 'ease-in-out' }"
  >
    <YourView />
  </ThemeProvider>
</template>`,
  },
];

const svelte: UseCase[] = [
  {
    title: "Toggle light / dark",
    desc: "useTheme returns readable stores — prefix with $ in Svelte.",
    lang: "svelte",
    code: `<script lang="ts">
  import { useTheme } from "@themvora/svelte";
  const { theme, mode, setMode, toggleTheme } = useTheme();
</script>

<button onclick={toggleTheme}>{$theme.name} · {$mode}</button>
<button onclick={() => setMode("dark")}>Dark</button>`,
  },
  {
    title: "Undo / redo theme changes",
    desc: "History stores are reactive, just like the theme state.",
    lang: "svelte",
    code: `<script lang="ts">
  import { useThemeHistory, useThemeRuntime } from "@themvora/svelte";
  const { undo, redo, canUndo, canRedo } = useThemeHistory();
  const runtime = useThemeRuntime();
</script>

<button onclick={undo} disabled={!$canUndo}>Undo</button>
<button onclick={redo} disabled={!$canRedo}>Redo</button>
<button onclick={() => runtime.update({ colors: { primary: "#6366f1" } })}>
  Make primary indigo
</button>`,
  },
  {
    title: "Scope a subtree",
    desc: "ThemeScope themes a slot subtree in isolation.",
    lang: "svelte",
    code: `<ThemeScope theme="plum-dark">
  <DataViz />
</ThemeScope>`,
  },
  {
    title: "Lifecycle events",
    desc: "Watch every theme change and install packs at runtime.",
    lang: "svelte",
    code: `<script lang="ts">
  import { onMount } from "svelte";
  import { useThemeLifecycle, useThemePacks } from "@themvora/svelte";
  import { getAccessibilityProfiles } from "@themvora/core";
  const { on } = useThemeLifecycle();
  const applyPack = useThemePacks();
  onMount(() => on("beforeThemeChange", (e) => console.log(e.next.name)));
</script>

<button onclick={() => applyPack({ name: "a11y", themes: getAccessibilityProfiles() })}>
  Apply High Contrast pack
</button>`,
  },
  {
    title: "Smooth theme transitions",
    desc: "Enable CSS transitions on theme changes for a polished user experience.",
    lang: "svelte",
code: `<script lang="ts">
  import { ThemeProvider } from "@themvora/svelte";
</script>

<ThemeProvider
  transition={{ enabled: true, duration: 300, easing: "ease-in-out" }}
>
  {@render children()}
</ThemeProvider>`,
  },
];

const solid: UseCase[] = [
  {
    title: "Toggle light / dark",
    desc: "useTheme returns signals and getters for fine-grained reactivity.",
    lang: "tsx",
    code: `import { useTheme } from "@themvora/solid";

function ThemeToggle() {
  const { theme, mode, setMode, toggleTheme } = useTheme();
  return (
    <div>
      <button onClick={() => toggleTheme()}>{theme().name}</button>
      <button onClick={() => setMode("dark")}>Dark</button>
      <span>{mode()}</span>
    </div>
  );
}`,
  },
  {
    title: "Undo / redo theme changes",
    desc: "History controls as signals, plus live runtime updates.",
    lang: "tsx",
    code: `import { useThemeHistory, useThemeRuntime } from "@themvora/solid";

function HistoryControls() {
  const { undo, redo, canUndo, canRedo } = useThemeHistory();
  const runtime = useThemeRuntime();
  return (
    <div>
      <button onClick={() => undo()} disabled={!canUndo()}>Undo</button>
      <button onClick={() => redo()} disabled={!canRedo()}>Redo</button>
      <button onClick={() => runtime.update({ colors: { primary: "#6366f1" } })}>
        Make primary indigo
      </button>
    </div>
  );
}`,
  },
  {
    title: "Scope a subtree",
    desc: "ThemeScope themes a subtree with scoped CSS variables.",
    lang: "tsx",
    code: `import { ThemeScope } from "@themvora/solid";

function Dashboard() {
  return (
    <>
      <Sidebar />
      <ThemeScope theme="plum-dark">
        <DataViz />
      </ThemeScope>
    </>
  );
}`,
  },
  {
    title: "Lifecycle events",
    desc: "Subscribe to lifecycle events and install theme packs.",
    lang: "tsx",
    code: `import { onMount } from "solid-js";
import { useThemeLifecycle, useThemePacks } from "@themvora/solid";
import { getAccessibilityProfiles } from "@themvora/core";
import type { ThemeLifecycleEventMap } from "@themvora/core";

function Telemetry() {
  const { on } = useThemeLifecycle();
  const applyPack = useThemePacks();
  onMount(() =>
    on("beforeThemeChange", (e) => {
      const { next } = e as ThemeLifecycleEventMap["beforeThemeChange"];
      console.log("theme changing to", next.name);
    }),
  );
  return (
    <button onClick={() => applyPack({ name: "a11y", themes: getAccessibilityProfiles() })}>
      Apply High Contrast pack
    </button>
  );
}`,
  },
  {
    title: "Smooth theme transitions",
    desc: "Enable CSS transitions on theme changes for a polished user experience.",
    lang: "tsx",
    code: `import { ThemeProvider } from "@themvora/solid";

export function App() {
  return (
    <ThemeProvider
      transition={{ enabled: true, duration: 300, easing: "ease-in-out" }}
    >
      <YourApp />
    </ThemeProvider>
  );
}`,
  },
];

const angular: UseCase[] = [
  {
    title: "Provide the runtime",
    desc: "Wire Themvora once in your app config, then inject reactive state anywhere.",
    lang: "ts",
    code: `import { provideTheme } from "@themvora/angular";

export const appConfig: ApplicationConfig = {
  providers: [
    provideTheme({ defaultTheme: "light" }),
  ],
};`,
  },
  {
    title: "Toggle light / dark",
    desc: "injectTheme returns reactive ThemeState with setters.",
    lang: "ts",
    code: `import { Component, inject } from "@angular/core";
import { injectTheme } from "@themvora/angular";

@Component({ selector: "app-toggle", template: \`
  <button (click)="theme().toggleTheme()">
    {{ theme().theme.name }} · {{ theme().mode }}
  </button>
\` })
export class ThemeToggleComponent {
  readonly theme = injectTheme();
}`,
  },
  {
    title: "Undo / redo theme changes",
    desc: "Inject history controls and the runtime for live edits.",
    lang: "ts",
    code: `import { Component, inject } from "@angular/core";
import { injectThemeHistory, injectThemeRuntime } from "@themvora/angular";

@Component({ selector: "app-history", template: \`
  <button (click)="history.undo()" [disabled]="!history.history().canUndo">Undo</button>
  <button (click)="history.redo()" [disabled]="!history.history().canRedo">Redo</button>
  <button (click)="runtime.update({ colors: { primary: '#6366f1' } })">
    Make primary indigo
  </button>
\` })
export class ThemeHistoryComponent {
  readonly history = injectThemeHistory();
  readonly runtime = injectThemeRuntime();
}`,
  },
  {
    title: "Scope a subtree",
    desc: "ThemeScopeDirective themes a single element subtree.",
    lang: "ts",
    code: `import { Component } from "@angular/core";
import { ThemeScopeDirective } from "@themvora/angular";

@Component({
  selector: "app-dashboard",
  template: \`
    <div class="global-theme">Inherits global</div>
    <div [themvoraScope]="'plum-dark'">Always plum-dark here</div>
  \`,
  standalone: true,
  imports: [ThemeScopeDirective],
})
export class DashboardComponent {}`,
  },
  {
    title: "Smooth theme transitions",
    desc: "Enable CSS transitions on theme changes for a polished user experience.",
    lang: "ts",
    code: `import { provideTheme } from "@themvora/angular";

export const appConfig: ApplicationConfig = {
  providers: [
    provideTheme({
      defaultTheme: "light",
      transition: { enabled: true, duration: 300, easing: "ease-in-out" },
    }),
  ],
};`,
  },
];

const web: UseCase[] = [
  {
    title: "Define the elements",
    desc: "One call registers every themvora custom element.",
    lang: "ts",
    code: `import { defineCustomElements } from "@themvora/web";
defineCustomElements();`,
  },
  {
    title: "Provider + toggle + select",
    desc: "Compose the elements in plain HTML — no framework required.",
    lang: "html",
    code: `<themvora-provider default-theme="light">
  <themvora-toggle></themvora-toggle>
  <themvora-select></themvora-select>
</themvora-provider>`,
  },
  {
    title: "Scope a subtree",
    desc: "themvora-scope applies a theme to its children.",
    lang: "html",
    code: `<themvora-scope theme="plum-dark">
  <section>Always plum-dark here</section>
</themvora-scope>`,
  },
  {
    title: "Imperative runtime access",
    desc: "Grab the runtime and drive it from any script.",
    lang: "ts",
    code: `import { useThemeRuntime } from "@themvora/web";

// Resolves the first <themvora-provider> in the document and throws a clear
// error if none has initialised yet. Pass an element instead with
// getProviderRuntime(providerEl) when there is more than one provider.
const runtime = useThemeRuntime();
runtime.selection.setMode("dark");
runtime.update({ colors: { primary: "#6366f1" } });
console.log(runtime.store.get().name);`,
  },
  {
    title: "Smooth theme transitions",
    desc: "Enable CSS transitions on theme changes for a polished user experience.",
    lang: "html",
    code: `<themvora-provider
  default-theme="light"
  transition='{"enabled": true, "duration": 300, "easing": "ease-in-out"}'
>
  <my-app></my-app>
</themvora-provider>`,
  },
];

const tailwind: UseCase[] = [
  {
    title: "Map tokens to Tailwind",
    desc: "Import the plugin so theme tokens become Tailwind v4 utilities.",
    lang: "css",
    code: `@import "tailwindcss";
@import "@themvora/tailwind";`,
  },
  {
    title: "Use tokens as utilities",
    desc: "Every semantic token maps to --color-*, --radius-*, --shadow-* and friends.",
    lang: "tsx",
    code: `export function Card() {
  return (
    <div className="bg-card text-card-foreground rounded-lg shadow-md border border-border">
      <button className="bg-primary text-primary-foreground hover:bg-primary/90">
        Primary action
      </button>
    </div>
  );
}`,
  },
  {
    title: "Smooth theme transitions",
    desc: "Transitions are a runtime option, not CSS you write. Configure them where the runtime is created — here the provider element's transition attribute.",
    lang: "html",
    code: `<themvora-provider
  default-theme="light"
  transition='{"enabled": true, "duration": 300, "easing": "ease-in-out"}'
>
  <themvora-toggle></themvora-toggle>
</themvora-provider>`,
  },
];

const astro: UseCase[] = [
  {
    title: "Resolve the initial theme on the server",
    desc: "getInitialThemeState reads the request cookies, so the document and any island render one resolution.",
    lang: "astro",
    code: `---
import { getInitialThemeState } from "@themvora/astro";
import { getBuiltInThemes } from "@themvora/core";

const themes = getBuiltInThemes();

// Server-rendered page: resolve once from the request. Pass the same object to
// provider.astro and to the island's initial prop, so the three cannot drift.
const initial = getInitialThemeState(Astro.request, { themes });
---

<html data-theme={initial.theme.name}>
  <body><slot /></body>
</html>`,
  },
  {
    title: "Zero-flash script + CSS map",
    desc: "Build the blocking script and precompute CSS variables server-side, when you render the document yourself.",
    lang: "astro",
    code: `---
import { createBlockingScript, buildThemeCssMap, computeFingerprint } from "@themvora/astro";
import { getBuiltInThemes } from "@themvora/core";

// computeFingerprint/buildThemeCssMap take the registry positionally; the
// built-in set (neutral light/dark + the preset families) is a valid registry,
// so no theme file is needed.
const themes = getBuiltInThemes();

const fingerprint = computeFingerprint(themes, "light");
const cssMap = buildThemeCssMap(themes);
const script = createBlockingScript(fingerprint, cssMap);
---

<html data-theme="light" style={cssMap["light"]}>
  <head><Fragment set:html={script} /></head>
  <body><slot /></body>
</html>`,
  },
  {
    title: "Scope a subtree",
    desc: "ThemeScope overrides the theme for its own subtree. It is a sibling of the provider, not a child — ThemeProviderClient renders nothing, so children passed to it are dropped.",
    lang: "tsx",
    code: `// src/components/ScopedChart.tsx — inside the React island.
import { ThemeProviderClient, ThemeScope } from "@themvora/astro/client";

export function ScopedChart() {
  return (
    <>
      {/* Installs the runtime; renders nothing itself. */}
      <ThemeProviderClient />
      <ThemeScope theme="plum-dark">
        <DataViz />
      </ThemeScope>
    </>
  );
}`,
  },
  {
    title: "Shared runtime across islands",
    desc: "getGlobalRuntime() returns the runtime the provider installed, so a browser script and an island share one instance.",
    lang: "astro",
    code: `<script>
  // A browser bundle: import from /runtime, not the package root, which also
  // exports the build integration and would pull node:url into the bundle.
  import { getGlobalRuntime } from "@themvora/astro/runtime";

  const runtime = getGlobalRuntime();
  console.log(runtime?.store.get().name ?? "not initialized yet");
</script>`,
  },
  {
    title: "Smooth theme transitions",
    desc: "Enable CSS transitions on theme changes for a polished user experience.",
    lang: "tsx",
    code: `// src/components/ThemeIsland.tsx
import { ThemeProviderClient, useTheme } from "@themvora/astro/client";

function Switcher() {
  const { theme, toggleTheme } = useTheme();
  return <button onClick={toggleTheme}>{theme.name}</button>;
}

export function ThemeIsland() {
  return (
    <>
      {/* transition is a provider prop; the components that read the runtime
          are siblings, never children. */}
      <ThemeProviderClient
        transition={{ enabled: true, duration: 300, easing: "ease-in-out" }}
      />
      <Switcher />
    </>
  );
}`,
  },
];

const nuxt: UseCase[] = [
  {
    title: "Add the module",
    desc: "Register the module and configure themes in nuxt.config.",
    lang: "ts",
    code: `// nuxt.config.ts
export default defineNuxtConfig({
  modules: ["@themvora/nuxt"],
  themvora: {
    defaultTheme: "mint-light",
    initialMode: "system",
  },
});`,
  },
  {
    title: "SSR-first theming",
    desc: "Cookies are validated (fingerprint) and the initial theme is resolved and rendered server-side with a blocking bootstrap — no flash of the wrong theme.",
    lang: "ts",
    code: `// nuxt.config.ts
export default defineNuxtConfig({
  modules: ["@themvora/nuxt"],
  themvora: {
    defaultTheme: "mint-light",
    initialMode: "system",
    initialFamily: "mint",
  },
});

// The module emits, before first paint:
//   <html data-theme="mint-light" data-theme-mode="light" data-theme-family="mint">
//   <style>:root{--theme-color-background:…}</style>
//   <script>/* blocking bootstrap */</script>`,
  },
  {
    title: "Auto-imported composables",
    desc: "useTheme and friends are auto-imported in every component.",
    lang: "vue",
    code: `<script setup lang="ts">
const { theme, mode, setMode, toggleTheme } = useTheme();
</script>

<template>
  <button @click="toggleTheme">{{ theme.name }} · {{ mode }}</button>
  <button @click="setMode('dark')">Dark</button>
</template>`,
  },
  {
    title: "Components + runtime access",
    desc: "ThemeScope, ThemeScrollbar and the runtime are available everywhere.",
    lang: "vue",
    code: `<script setup lang="ts">
const runtime = useThemeRuntime();
function soften() {
  // update() takes the tokens it is given; radius values are CSS lengths.
  runtime.update({ radius: { sm: "8px", md: "12px" } });
}
</script>

<template>
  <ThemeScope theme="plum-light">
    <DataViz />
  </ThemeScope>
  <ThemeScrollbar :behavior="{ autoHide: true }" />
  <button @click="soften">Soften corners</button>
</template>`,
  },
  {
    title: "Runtime access in a plugin",
    desc: "The plugin-provided runtime is available as `nuxtApp.$themvora`.",
    lang: "ts",
    code: `// plugins/theme.client.ts
export default defineNuxtPlugin((nuxtApp) => {
  const runtime = nuxtApp.$themvora as ThemeRuntime;
  runtime.lifecycle.on("beforeThemeChange", (e) => {
    console.log("theme changing to", e.next.name);
  });
});`,
  },
  {
    title: "Smooth theme transitions",
    desc: "Enable config-driven CSS transitions on theme changes.",
    lang: "ts",
    code: `// nuxt.config.ts
export default defineNuxtConfig({
  modules: ["@themvora/nuxt"],
  themvora: {
    defaultTheme: "light",
    transition: { enabled: true, duration: 360, easing: "cubic-bezier(0.4, 0, 0.2, 1)" },
  },
});`,
  },
];

const remix: UseCase[] = [
  {
    title: "One configuration for the whole document",
    desc: "Declare the theme document once; the loader, the pre-paint script, the <html> shell and the runtime all read it.",
    lang: "tsx",
    code: `// app/root.tsx
import type { LinksFunction } from "@remix-run/node";
import { Links, Meta, Outlet, Scripts, ScrollRestoration, useLoaderData } from "@remix-run/react";
import { getBuiltInThemes } from "@themvora/core";
import { createThemeDocument } from "@themvora/remix";
import styles from "./styles.css?url";

export const links: LinksFunction = () => [{ rel: "stylesheet", href: styles }];

// One static configuration. Nothing here depends on the request.
const theming = createThemeDocument({
  themes: getBuiltInThemes(),
  defaultTheme: "light",
  mode: "system",
});

export async function loader({ request }: { request: Request }) {
  return { theme: await theming.resolveInitial(request) };
}

export function Layout({ children }: { children: React.ReactNode }) {
  const { theme } = useLoaderData<typeof loader>();

  return (
    <theming.Document
      initial={theme}
      htmlProps={{ lang: "en" }}
      head={[<Meta key="meta" />, <Links key="links" />]}
      afterContent={<><ScrollRestoration /><Scripts /></>}
    >
      {children}
    </theming.Document>
  );
}

export default function App() {
  return <Outlet />;
}`,
  },
  {
    title: "Zero-flash first paint",
    desc: "The blocking script and the matching <html> shell come from the same configuration, so the server markup is already correct.",
    lang: "tsx",
    code: `// app/root.tsx — the document owns both halves of the pre-paint contract.
const theming = createThemeDocument({
  themes: getBuiltInThemes(),
  defaultTheme: "light",
  mode: "system",
  scrollbar: true, // also hides the native scrollbar before first paint
});

// <theming.Document initial={theme}> renders:
//   1. <ThemeHead>      — the blocking bootstrap, first in <head>
//   2. <html> shell     — the attributes and CSS variables the script writes
//   3. <ThemeProvider>  — the runtime, hydrated against the loader's value
//
// Assembling the document by hand is still supported: pass the same
// \`themes\`, \`defaultTheme\` and \`mode\` to ThemeHead, getThemeShellProps()
// and ThemeProvider, or they will disagree and paint a different theme.`,
  },
  {
    title: "Client switcher",
    desc: "All hooks are re-exported from @themvora/remix for client components.",
    lang: "tsx",
    code: `import { useTheme, useThemeHistory } from "@themvora/remix";

export function ThemeControls() {
  const { theme, toggleTheme } = useTheme();
  const { undo, redo, canUndo } = useThemeHistory();
  return (
    <div>
      <button onClick={toggleTheme}>{theme.name}</button>
      <button onClick={undo} disabled={!canUndo}>Undo</button>
      <button onClick={redo}>Redo</button>
    </div>
  );
}`,
  },
  {
    title: "Persistence",
    desc: "createRemixThemePersistence keeps the selection in sync with the server.",
    lang: "ts",
    code: `import { createRemixThemePersistence } from "@themvora/remix";
import { getBuiltInThemes } from "@themvora/core";

// The registry is the first positional argument, the fallback theme the second.
const themes = getBuiltInThemes();

// Returns null during SSR — there is no storage on the server, and the runtime
// accepts null, so the same module can be imported on both sides.
export const persistence = createRemixThemePersistence(themes, "light", {
  key: "theme",
});`,
  },
  {
    title: "Smooth theme transitions",
    desc: "Enable CSS transitions on theme changes for a polished user experience.",
    lang: "tsx",
    code: `// app/root.tsx
import { createThemeDocument } from "@themvora/remix";
import { getBuiltInThemes } from "@themvora/core";

// Declared once: the provider the document renders receives the same object,
// so a nested route cannot end up with a different transition setting.
const theming = createThemeDocument({
  themes: getBuiltInThemes(),
  defaultTheme: "light",
  mode: "system",
  transition: { enabled: true, duration: 300, easing: "ease-in-out" },
});`,
  },
];

export const frameworkUseCases: Record<string, UseCase[]> = {
  react,
  next,
  vue,
  svelte,
  solid,
  angular,
  web,
  tailwind,
  astro,
  nuxt,
  remix,
};
