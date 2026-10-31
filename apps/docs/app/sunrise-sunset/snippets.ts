/**
 * The sunrise/sunset guide's snippet corpus.
 *
 * Out of `SunriseSunsetGuide.tsx` because that module is a `"use client"`
 * boundary: a server component cannot read a value exported from one, and the
 * page needs to iterate this data to derive each snippet's JavaScript form
 * before render. Pure data — no JSX, no hooks, no imports from React, the
 * highlighter, or the compiler.
 */

const frameworkSnippet = (lang: string, title: string, code: string) => ({
  lang,
  title,
  code,
});

export const mountExamples: Record<
  string,
  { lang: string; title: string; code: string }
> = {
  react: frameworkSnippet(
    "tsx",
    "App.tsx",
    `import { ThemeProvider } from "@themvora/react";
import { themes } from "./themes";

export function App() {
  return (
    <ThemeProvider
      themes={themes}
      defaultTheme="mint-light"
      scheduled={{
        enabled: true,
        // Omit latitude/longitude to resolve the visitor's own location
        // from their timezone.
      }}
    >
      <YourApp />
    </ThemeProvider>
  );
}`,
  ),
  next: frameworkSnippet(
    "tsx",
    "app/layout.tsx",
    `// app/layout.tsx
import type { ReactNode } from "react";
import { ThemeProvider } from "@themvora/next";
import { themes } from "./themes";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider
      themes={themes}
      defaultTheme="mint-light"
      scheduled={{ enabled: true }}
    >
      {children}
    </ThemeProvider>
  );
}`,
  ),
  vue: frameworkSnippet(
    "vue",
    "App.vue",
    `<script setup lang="ts">
import { ThemeProvider } from "@themvora/vue";
import { themes } from "./themes";
</script>

<template>
  <ThemeProvider
    :themes="themes"
    defaultTheme="mint-light"
    :scheduled="{enabled: true}"
  >
    <ThemeSwitcher />
  </ThemeProvider>
</template>`,
  ),
  nuxt: frameworkSnippet(
    "ts",
    "nuxt.config.ts",
    `// nuxt.config.ts
import { themes } from "./themes";

export default defineNuxtConfig({
  modules: ["@themvora/nuxt"],
  themvora: {
    themes,
    defaultTheme: "mint-light",
    scheduled: { enabled: true },
  },
});`,
  ),
  svelte: frameworkSnippet(
    "svelte",
    "App.svelte",
    `<script lang="ts">
  import { ThemeProvider } from "@themvora/svelte";
  import { themes } from "./themes";
</script>

<ThemeProvider
  themes={themes}
  defaultTheme="mint-light"
  scheduled={{ enabled: true }}
>
  {@render children()}
</ThemeProvider>`,
  ),
  solid: frameworkSnippet(
    "tsx",
    "App.tsx",
    `import { ThemeProvider } from "@themvora/solid";
import { themes } from "./themes";

export function App() {
  return (
    <ThemeProvider
      themes={themes}
      defaultTheme="mint-light"
      scheduled={{ enabled: true }}
    >
      <YourApp />
    </ThemeProvider>
  );
}`,
  ),
  angular: frameworkSnippet(
    "ts",
    "app.config.ts",
    `import type { ApplicationConfig } from "@angular/core";
import { provideTheme } from "@themvora/angular";
import { themes } from "./themes";

export const appConfig: ApplicationConfig = {
  providers: [
    provideTheme({
      themes,
      defaultTheme: "mint-light",
      scheduled: { enabled: true },
    }),
  ],
};`,
  ),
  web: frameworkSnippet(
    "html",
    "index.html",
    `<script type="module">
  // Registers every <themvora-*> element and their stylesheet.
  import "@themvora/web";
</script>

<!-- The schedule is an attribute like every other provider option, so it can be
     declared before the element upgrades. Omit latitude/longitude to resolve
     the visitor's own location from their timezone. -->
<themvora-provider
  default-theme="mint-light"
  scheduled='{"latitude":27.7172,"longitude":85.324,"lightTheme":"mint-light","darkTheme":"mint-dark"}'
>
  <your-app></your-app>
</themvora-provider>`,
  ),
  astro: frameworkSnippet(
    "astro",
    "src/pages/index.astro",
    `---
// The schedule engine attaches its timer on the client, so an island owns it.
// This is the Astro + React path — add @astrojs/react if the project does not
// have it yet. The Astro-only path (provider.astro + ThemeToggle.astro) has no
// client runtime to schedule.
import Provider from "@themvora/astro/provider.astro";
import { ThemeProviderClient } from "@themvora/astro/client";
import themeConfig from "../../theme.config";
---

<Provider config={themeConfig}>
  <ThemeProviderClient scheduled={{ enabled: true }} client:load />
</Provider>`,
  ),
  tailwind: frameworkSnippet(
    "css",
    "globals.css",
    `@import "tailwindcss";
@import "@themvora/tailwind";

/* Themvora schedules via the core runtime. Wire it in your
   framework shell (React/Vue/etc.) with createThemeRuntime({
   scheduled: {} }) — light/dark themes adapt to the current family and
   coordinates auto-detect from each visitor's timezone.
   The CSS here only maps tokens — scheduling is runtime-driven. */`,
  ),
  remix: frameworkSnippet(
    "tsx",
    "app/root.tsx",
    `import { ThemeProvider } from "@themvora/remix";
import { themes } from "./themes";

export default function App() {
  return (
    <ThemeProvider
      themes={themes}
      defaultTheme="mint-light"
      scheduled={{
        // Optional: light/dark adapt to the current family, coordinates
        // auto-detect from the visitor's timezone.
      }}
    >
      <Outlet />
    </ThemeProvider>
  );
}`,
  ),
};

export const controllerExamples: Record<
  string,
  { lang: string; title: string; code: string }
> = {
  react: frameworkSnippet(
    "tsx",
    "ScheduleToggle.tsx",
    `import { useThemeSchedule } from "@themvora/react";

// Any IANA zone works — this short list is only for the picker below.
const TIME_ZONES = ["", "Asia/Kathmandu", "Europe/Helsinki", "America/New_York"];

export function ScheduleToggle() {
  const schedule = useThemeSchedule();
  const state = schedule?.state;

  return (
    <div>
      <button
        onClick={() =>
          state?.enabled ? schedule?.disable() : schedule?.enable()
        }
      >
        {state?.enabled ? "Disable" : "Enable"} schedule
      </button>
      <p>Status: {state?.status}</p>
      <p>
        {state?.timeZone} ({state?.latitude?.toFixed(2)},{" "}
        {state?.longitude?.toFixed(2)}) — Sunrise{" "}
        {state?.sunrise?.toLocaleTimeString()} · Sunset{" "}
        {state?.sunset?.toLocaleTimeString()} · Next{" "}
        {state?.nextTransition?.theme} at{" "}
        {state?.nextTransition?.at.toLocaleTimeString()}
      </p>
      <select
        value={state?.timeZone ?? ""}
        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => schedule?.set({ timeZone: e.target.value })}
      >
        <option value="">Auto (my location)</option>
        {TIME_ZONES.filter(Boolean).map((zone) => (
          <option key={zone} value={zone}>{zone}</option>
        ))}
      </select>
    </div>
  );
}`,
  ),
  next: frameworkSnippet(
    "tsx",
    "components/schedule-toggle.tsx",
    `// components/schedule-toggle.tsx
"use client";
import { useThemeSchedule } from "@themvora/next/client";

export function ScheduleToggle() {
  const schedule = useThemeSchedule();
  const state = schedule?.state;

  return (
    <div>
      <button
        onClick={() =>
          state?.enabled ? schedule?.disable() : schedule?.enable()
        }
      >
        {state?.enabled ? "Disable" : "Enable"} schedule
      </button>
      <p>Status: {state?.status}</p>
      <p>
        Timezone: {state?.timeZone ?? "auto-detected"} · Sunrise{" "}
        {state?.sunrise?.toLocaleTimeString()} · Sunset{" "}
        {state?.sunset?.toLocaleTimeString()}
      </p>
    </div>
  );
}`,
  ),
  vue: frameworkSnippet(
    "vue",
    "ScheduleToggle.vue",
    `<script setup lang="ts">
import { useThemeSchedule } from "@themvora/vue";
// state is a Ref — access it with .value in <script>, auto-unwrapped
// when destructured in the template.
const schedule = useThemeSchedule();
const { state } = schedule;
</script>

<template>
  <button
    @click="state.enabled ? schedule.disable() : schedule.enable()"
  >
    {{ state.enabled ? "Disable" : "Enable" }} schedule
  </button>
  <p>Status: {{ state.status }}</p>
  <p>
    Timezone: {{ state.timeZone ?? "auto-detected" }} · Sunrise
    {{ state.sunrise?.toLocaleTimeString() }}
  </p>
  <select @change="schedule.set({ timeZone: ($event.target as HTMLSelectElement).value })">
    <option value="">Auto (my location)</option>
  </select>
</template>`,
  ),
  nuxt: frameworkSnippet(
    "vue",
    "ScheduleToggle.vue",
    `<script setup lang="ts">
// useThemeSchedule is auto-imported by the module
const schedule = useThemeSchedule();
const { state } = schedule;
</script>

<template>
  <button
    @click="state.enabled ? schedule.disable() : schedule.enable()"
  >
    {{ state.enabled ? "Disable" : "Enable" }} schedule
  </button>
  <p>Status: {{ state.status }}</p>
  <p>
    Timezone: {{ state.timeZone ?? "auto-detected" }} · Sunrise
    {{ state.sunrise?.toLocaleTimeString() }}
  </p>
</template>`,
  ),
  svelte: frameworkSnippet(
    "svelte",
    "ScheduleToggle.svelte",
    `<script lang="ts">
  import { useThemeSchedule, getThemeSchedule } from "@themvora/svelte";

  // A readable store, or null when the provider has no \`scheduled\` option.
  // Auto-subscribe with the \`$\` prefix: \`$scheduleState.enabled\`.
  const scheduleState = useThemeSchedule();
  const controller = getThemeSchedule();
</script>

{#if scheduleState}
  <button
    onclick={() => ($scheduleState.enabled ? controller?.disable() : controller?.enable())}
  >
    {$scheduleState.enabled ? "Disable" : "Enable"} schedule
  </button>
  <p>Status: {$scheduleState.status}</p>
  <p>Timezone: {$scheduleState.timeZone ?? "auto-detected"}</p>
{:else}
  <p>No schedule configured on the provider.</p>
{/if}`,
  ),
  solid: frameworkSnippet(
    "tsx",
    "ScheduleToggle.jsx",
    `import { useThemeSchedule } from "@themvora/solid";

function ScheduleToggle() {
  const schedule = useThemeSchedule();

  return (
    <div>
      <button
        onClick={() =>
          schedule?.enabled ? schedule?.disable() : schedule?.enable()
        }
      >
        {schedule?.enabled ? "Disable" : "Enable"} schedule
      </button>
      <p>Status: {schedule?.status}</p>
      <p>
        Sunrise {schedule?.sunrise?.toLocaleTimeString()} · Sunset{" "}
        {schedule?.sunset?.toLocaleTimeString()}
      </p>
    </div>
  );
}`,
  ),
  angular: frameworkSnippet(
    "ts",
    "schedule-toggle.ts",
    `import { Component, computed } from "@angular/core";
import { injectThemeSchedule } from "@themvora/angular";

@Component({
  selector: "app-schedule-toggle",
  standalone: true,
  template: \`
    <button (click)="toggle()">
      {{ enabled() ? "Disable" : "Enable" }} schedule
    </button>
    <p>Status: {{ status() }}</p>
    <p>Timezone: {{ timeZone() ?? "auto-detected" }}</p>
  \`,
})
export class ScheduleToggleComponent {
  private schedule = injectThemeSchedule();
  readonly enabled = computed(() => this.schedule?.state().enabled ?? false);
  readonly status = computed(
    () => this.schedule?.state().status ?? "disabled",
  );
  readonly timeZone = computed(() => this.schedule?.state().timeZone ?? null);

  toggle() {
    this.enabled() ? this.schedule?.disable() : this.schedule?.enable();
  }
}`,
  ),
  web: frameworkSnippet(
    "ts",
    "schedule.ts",
    `import { getThemeSchedule } from "@themvora/web";

// Web Components expose the same reactive accessor as the hooks.
// Returns null when the provider has no scheduled option configured.
const schedule = getThemeSchedule();

schedule?.enable();   // starts the sunrise/sunset timer
schedule?.disable();  // stops it — theme stays where it is
schedule?.set({ timeZone: "Asia/Kathmandu" });           // pin a timezone
schedule?.set({ latitude: 51.5074, longitude: -0.1278 }); // …or coordinates
schedule?.set({ autoDetectLocation: true });             // back to auto-detection`,
  ),
  astro: frameworkSnippet(
    "astro",
    "ScheduleToggle.astro",
    `---
// No server-side schedule access: the engine attaches its timer on the client,
// so the control is a client script.
---
<button id="schedule-toggle">Enable schedule</button>

<script>
  import { useThemeSchedule } from "@themvora/astro/client";

  const schedule = useThemeSchedule();

  document.getElementById("schedule-toggle").addEventListener("click", () => {
    schedule?.state?.enabled ? schedule?.disable() : schedule?.enable();
  });
  // schedule.set({ timeZone: "Asia/Kathmandu" }) repositions at runtime.
</script>`,
  ),
  tailwind: frameworkSnippet(
    "ts",
    "schedule.ts",
    `import { createThemeRuntime } from "@themvora/core";
import { themes } from "./themes";

// Tailwind is a CSS layer — scheduling runs in the core runtime
// (same as the React/Vue shell). Wire it wherever you boot the runtime.
const runtime = createThemeRuntime({
  themes,
  defaultTheme: "mint-light",
  scheduled: {
    // Optional: light/dark adapt to the current family, coordinates
    // auto-detect from the visitor's timezone.
  },
});

runtime.schedule?.enable();
runtime.schedule?.disable();
runtime.schedule?.set({ timeZone: "Australia/Sydney" });`,
  ),
  remix: frameworkSnippet(
    "tsx",
    "schedule-toggle.tsx",
    `// app/routes/schedule-toggle.tsx
"use client";
import { useThemeSchedule } from "@themvora/remix";

export default function ScheduleToggle() {
  const schedule = useThemeSchedule();

  return (
    <div>
      <button
        onClick={() =>
          schedule?.state?.enabled ? schedule?.disable() : schedule?.enable()
        }
      >
        {schedule?.state?.enabled ? "Disable" : "Enable"} schedule
      </button>
      <p>Status: {schedule?.state?.status}</p>
      <p>
        Timezone: {schedule?.state?.timeZone ?? "auto-detected"} · Sunrise{" "}
        {schedule?.state?.sunrise?.toLocaleTimeString()}
      </p>
    </div>
  );
}`,
  ),
};
