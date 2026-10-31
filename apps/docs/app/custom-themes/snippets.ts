/**
 * The snippets the Custom Themes guide renders, as data.
 *
 * They live here rather than inside `CustomThemesGuide.tsx` because the guide is
 * a client component: a server page cannot read a value exported from a `"use
 * client"` module, so it could not derive the JavaScript counterpart of these
 * snippets. Keeping the text in a plain module makes it readable from both sides
 * — the guide for display, the page for `javascriptSources`.
 */
export const defineSnippet = {
  lang: "ts",
  title: "themes.ts",
  code: `import { defineTheme } from "@themvora/core";

export const oceanLight = defineTheme({
  name: "ocean-light",
  meta: { family: "ocean", mode: "light", label: "Ocean Light" },
  tokens: {
    colors: {
      background: "#f0f9ff",
      foreground: "#0c1e2e",
      primary: "#0284c7",
      primaryForeground: "#ffffff",
      secondary: "#e0f2fe",
      secondaryForeground: "#0369a1",
      muted: "#bae6fd",
      mutedForeground: "#075985",
      // Surfaces are their own roles, not background reused. A card sits on the
      // canvas and a popover sits on top of everything, and both need to be able
      // to differ from it — in dark mode especially, where elevation has to come
      // from lightness rather than from a shadow.
      card: "#ffffff",
      cardForeground: "#0c1e2e",
      popover: "#ffffff",
      popoverForeground: "#0c1e2e",
      accent: "#0ea5e9",
      accentForeground: "#ffffff",
      destructive: "#dc2626",
      destructiveForeground: "#ffffff",
      success: "#16a34a",
      successForeground: "#ffffff",
      border: "#7dd3fc",
      // The input border is its own role: a form control's edge often wants to
      // be firmer than a decorative divider, and ring is the focus colour.
      input: "#7dd3fc",
      ring: "#0284c7",
    },
    radius: { lg: "0.5rem" },
  },
});`,
};

export const darkSnippet = {
  lang: "ts",
  title: "themes.ts",
  code: `// themes.ts — the same file, continued (defineTheme is imported above).
export const oceanDark = defineTheme({
  name: "ocean-dark",
  meta: { family: "ocean", mode: "dark", label: "Ocean Dark" },
  tokens: {
    colors: {
      background: "#0c1e2e",
      foreground: "#f0f9ff",
      primary: "#38bdf8",
      primaryForeground: "#0c1e2e",
      secondary: "#0369a1",
      secondaryForeground: "#e0f2fe",
      muted: "#075985",
      mutedForeground: "#bae6fd",
      // Elevation in dark mode comes from lightness, so the surfaces are
      // *lighter* than the canvas rather than shadowed.
      card: "#112a3d",
      cardForeground: "#f0f9ff",
      popover: "#112a3d",
      popoverForeground: "#f0f9ff",
      accent: "#0ea5e9",
      accentForeground: "#0c1e2e",
      destructive: "#f87171",
      destructiveForeground: "#0c1e2e",
      success: "#4ade80",
      successForeground: "#0c1e2e",
      border: "#0369a1",
      input: "#0369a1",
      ring: "#38bdf8",
    },
    radius: { lg: "0.5rem" },
  },
});`,
};

export const extendSnippet = {
  lang: "ts",
  title: "themes.ts",
  code: `import { defineTheme, extendTheme } from "@themvora/core";

const base = defineTheme({
  name: "base",
  meta: { family: "acme", mode: "light", label: "Acme Base" },
  tokens: {
    colors: {
      background: "#fafafa",
      foreground: "#18181b",
      primary: "#6366f1",
      primaryForeground: "#ffffff",
      secondary: "#f4f4f5",
      secondaryForeground: "#18181b",
      muted: "#f4f4f5",
      mutedForeground: "#71717a",
      card: "#ffffff",
      cardForeground: "#18181b",
      popover: "#ffffff",
      popoverForeground: "#18181b",
      accent: "#f4f4f5",
      accentForeground: "#18181b",
      destructive: "#dc2626",
      destructiveForeground: "#ffffff",
      success: "#16a34a",
      successForeground: "#ffffff",
      border: "#e4e4e7",
      input: "#e4e4e7",
      ring: "#6366f1",
    },
    radius: { lg: "10px" },
  },
});

export const acmeLight = extendTheme("acme-light", base, {
  meta: { family: "acme", mode: "light", label: "Acme Light" },
  colors: {
    background: "#fafafa",
    primary: "#4f46e5",
  },
});

export const acmeDark = extendTheme("acme-dark", base, {
  meta: { family: "acme", mode: "dark", label: "Acme Dark" },
  colors: {
    background: "#09090b",
    foreground: "#fafafa",
    primary: "#818cf8",
    ring: "#818cf8",
  },
});`,
};

export const runtimeSnippet = {
  lang: "ts",
  title: "tsx",
  code: `import { createThemeRuntime } from "@themvora/core";
import { oceanLight, oceanDark } from "./themes";

const themes = [oceanLight, oceanDark];

createThemeRuntime({
  themes,
  defaultTheme: "ocean-light",
  initialMode: "system",
});`,
};

export const vanillaSnippet = {
  lang: "ts",
  title: "main.ts",
  code: `import { Themvora } from "@themvora/core/vanilla";
import { oceanLight, oceanDark } from "./themes";

const kit = new Themvora({ themes: [oceanLight, oceanDark] });
kit.setFamily("ocean");
kit.setMode("light");
kit.update({ colors: { primary: "#06b6d4" } });
kit.destroy();`,
};

/**
 * Short descriptors for the generation styles.
 *
 * The *names* come from `GENERATION_STYLE_NAMES` so the list cannot drift when a
 * style is added; these descriptors are prose about a public enum, which is the
 * one thing a docs page is allowed to write itself.
 */
export const STYLE_NOTES: Record<string, string> = {
  balanced: "the reference — moderate chroma, moderate surfaces",
  soft: "lighter and quieter, with more tinted surfaces",
  vibrant: "higher primary chroma, split-complementary accent",
  editorial: "darker primary, stronger borders, complementary accent",
  minimal: "zero surface chroma, restrained primary",
  brand: "preserves the seed's own lightness — the strongest anchor",
};

export const styledSnippet = {
  lang: "ts",
  title: "styled.ts",
  code: `import { generateTheme } from "@themvora/core";

// The style modulates the palette without changing the contract.
const { light, dark } = generateTheme({
  seed: "#6366f1",
  family: "indigo",
  style: "editorial",
});

// "AA" is the default and the only level implemented today.
const { light: aa } = generateTheme({ seed: "#6366f1", contrast: "AA" });`,
};

export const generatedSnippet = {
  lang: "ts",
  title: "generate.ts",
  code: `import { generateTheme, validateTheme } from "@themvora/core";

const { light, dark } = generateTheme({
  seed: "#6366f1",
  family: "indigo",
});

// Validates the pair together: contrast is checked against the sibling
// theme, so a token that only fails in one mode is still reported.
const result = validateTheme(dark, { themes: [light, dark] });
`,
};

// How to wire the custom-defined theme (oceanLight / oceanDark from
// `./themes`, defined in section 1) into each supported framework.
export const customThemeSnippets: Record<
  string,
  {
    title: string;
    lang: string;
    code: string;
    /** A second file the wiring needs, shown as its own block. */
    extra?: { title: string; lang: string; code: string };
  }
> = {
  react: {
    title: "src/main.tsx",
    lang: "tsx",
    code: `import { createRoot } from "react-dom/client";
import { ThemeProvider } from "@themvora/react";
import { oceanLight, oceanDark } from "./themes";
import { App } from "./App";

const themes = [oceanLight, oceanDark];

createRoot(document.getElementById("root")!).render(
  <ThemeProvider themes={themes} defaultTheme="ocean-light">
    <App />
  </ThemeProvider>,
);`,
    extra: {
      title: "src/App.tsx",
      lang: "tsx",
      code: `import { useProvidedThemes, useSetThemeFamily } from "@themvora/react";

export function App() {
  const families = useProvidedThemes();
  const setFamily = useSetThemeFamily();

  return (
    <main>
      <select
        value={families[0]?.family ?? ""}
        onChange={(e) => setFamily(e.target.value)}
      >
        {families.map((f) => (
          <option key={f.family} value={f.family}>
            {f.family}
          </option>
        ))}
      </select>
    </main>
  );
}`,
    },
  },
  next: {
    title: "app/layout.tsx",
    lang: "tsx",
    code: `// app/layout.tsx
import type { ReactNode } from "react";
import { ThemeProvider } from "@themvora/next";
import { oceanLight, oceanDark } from "./themes";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider
      themes={[oceanLight, oceanDark]}
      defaultTheme="ocean-light"
    >
      {children}
    </ThemeProvider>
  );
}`,
    extra: {
      title: "app/page.tsx",
      lang: "tsx",
      code: `"use client";

import { useProvidedThemes, useSetThemeFamily } from "@themvora/next/client";

export default function Page() {
  const families = useProvidedThemes();
  const setFamily = useSetThemeFamily();

  return (
    <main>
      <select
        value={families[0]?.family ?? ""}
        onChange={(e) => setFamily(e.target.value)}
      >
        {families.map((f) => (
          <option key={f.family} value={f.family}>
            {f.family}
          </option>
        ))}
      </select>
    </main>
  );
}`,
    },
  },
  vue: {
    title: "App.vue",
    lang: "vue",
    code: `<script setup lang="ts">
import { ThemeProvider } from "@themvora/vue";
import { oceanLight, oceanDark } from "./themes";

const themes = [oceanLight, oceanDark];
</script>

<template>
  <ThemeProvider :themes="themes" default-theme="ocean-light">
    <YourView />
  </ThemeProvider>
</template>`,
    extra: {
      title: "YourView.vue",
      lang: "vue",
      code: `<script setup lang="ts">
import { useProvidedThemes, useTheme } from "@themvora/vue";

const families = useProvidedThemes();
const { setFamily } = useTheme();
</script>

<template>
  <main>
    <select @change="(e: Event) => setFamily((e.target as HTMLSelectElement).value)">
      <option
        v-for="f in families"
        :key="f.family"
        :value="f.family"
      >
        {{ f.family }}
      </option>
    </select>
  </main>
</template>`,
    },
  },
  svelte: {
    title: "App.svelte",
    lang: "svelte",
    code: `<script lang="ts">
  import { ThemeProvider } from "@themvora/svelte";
  import { oceanLight, oceanDark } from "./themes";

  const themes = [oceanLight, oceanDark];
</script>

<ThemeProvider {themes} defaultTheme="ocean-light">
  {@render children()}
</ThemeProvider>`,
    extra: {
      title: "FamilyPicker.svelte",
      lang: "svelte",
      code: `<script lang="ts">
  import { useProvidedThemes, useTheme } from "@themvora/svelte";

  const families = useProvidedThemes();
  const { setFamily } = useTheme();
</script>

<main>
  <select onchange={(e: Event) => setFamily((e.currentTarget as HTMLSelectElement).value)}>
    {#each $families as f}
      <option value={f.family}>{f.family}</option>
    {/each}
  </select>
</main>`,
    },
  },
  solid: {
    title: "main.tsx",
    lang: "tsx",
    code: `import { render } from "solid-js/web";
import { ThemeProvider } from "@themvora/solid";
import { oceanLight, oceanDark } from "./themes";

render(() => (
  <ThemeProvider themes={[oceanLight, oceanDark]} defaultTheme="ocean-light">
    <App />
  </ThemeProvider>
), document.getElementById("root")!);`,
    extra: {
      title: "App.tsx",
      lang: "tsx",
      code: `import { useProvidedThemes, useTheme } from "@themvora/solid";

export function App() {
  const families = useProvidedThemes();
  const { setFamily } = useTheme();

  return (
    <main>
      <select
        value={families()[0]?.family ?? ""}
        onChange={(e) => setFamily(e.currentTarget.value)}
      >
        {families().map((f) => (
          <option value={f.family}>{f.family}</option>
        ))}
      </select>
    </main>
  );
}`,
    },
  },
  angular: {
    title: "app.config.ts",
    lang: "ts",
    code: `import { ApplicationConfig } from "@angular/core";
import { provideTheme } from "@themvora/angular";
import { oceanLight, oceanDark } from "./themes";

export const appConfig: ApplicationConfig = {
  providers: [
    provideTheme({
      themes: [oceanLight, oceanDark],
      defaultTheme: "ocean-light",
    }),
  ],
};`,
    extra: {
      title: "family-picker.component.ts",
      lang: "ts",
      code: `import { Component, computed, inject } from "@angular/core";
import {
  injectProvidedThemes,
  injectTheme,
} from "@themvora/angular";

@Component({
  selector: "app-family-picker",
  template: \`
    <select (change)="setFamily($any($event.target).value)">
      @for (f of families(); track f.family) {
        <option [value]="f.family">{{ f.family }}</option>
      }
    </select>
  \`,
})
export class FamilyPickerComponent {
  private readonly state = injectTheme();
  readonly families = injectProvidedThemes();

  setFamily(family: string) {
    this.state().setFamily(family);
  }
}`,
    },
  },
  web: {
    title: "index.html",
    lang: "html",
    code: `<script type="module">
  // Registers every <themvora-*> element and their stylesheet.
  import "@themvora/web";
</script>

<!-- \`themes\` accepts a JSON array of theme definitions. A list of names
     (\`themes="light dark"\`) selects from the themes that are already
     registered instead. -->
<themvora-provider
  default-theme="ocean-light"
  themes='[
    {
      "name": "ocean-light",
      "meta": { "family": "ocean", "mode": "light", "label": "Ocean Light" },
      "tokens": { "colors": { "background": "#f0f9ff", "primary": "#0284c7" } }
    },
    {
      "name": "ocean-dark",
      "meta": { "family": "ocean", "mode": "dark", "label": "Ocean Dark" },
      "tokens": { "colors": { "background": "#0c1e2e", "primary": "#38bdf8" } }
    }
  ]'
>
  <my-app></my-app>
</themvora-provider>`,
    extra: {
      title: "my-app.js",
      lang: "js",
      code: `import { useProvidedThemes, useThemeRuntime } from "@themvora/web";

// useProvidedThemes() returns the families registered with the provider.
// setFamily is called through the runtime's selection API.
const families = useProvidedThemes();
const runtime = useThemeRuntime();

const select = document.createElement("select");
families.forEach((f) => {
  const option = document.createElement("option");
  option.value = f.family;
  option.textContent = f.family;
  select.appendChild(option);
});

select.addEventListener("change", (e) => {
  runtime.selection.setFamily(e.target.value);
});

document.getElementById("my-app")?.appendChild(select);`,
    },
  },
  tailwind: {
    title: "main.ts",
    lang: "ts",
    code: `import { createThemeRuntime } from "@themvora/core";
import { oceanLight, oceanDark } from "./themes";

createThemeRuntime({
  themes: [oceanLight, oceanDark],
  defaultTheme: "ocean-light",
});`,
    extra: {
      title: "globals.css",
      lang: "css",
      code: `@import "tailwindcss";
@import "@themvora/tailwind";

body {
  @apply bg-background text-foreground;
}`,
    },
  },
  astro: {
    title: "src/pages/index.astro",
    lang: "astro",
    code: `---
import { ThemeProviderClient } from "@themvora/astro/client";
import { oceanLight, oceanDark } from "../themes";
---

<ThemeProviderClient
  themes={[oceanLight, oceanDark]}
  defaultTheme="ocean-light"
/>`,
    extra: {
      title: "src/components/FamilyPicker.tsx",
      lang: "tsx",
      code: `// src/components/FamilyPicker.tsx — a React island component.
// Use client:load to mount it inside the Astro page.
import { useProvidedThemes, useSetThemeFamily } from "@themvora/astro/client";

export function FamilyPicker() {
  const families = useProvidedThemes();
  const setFamily = useSetThemeFamily();

  return (
    <select
      value={families[0]?.family ?? ""}
      onChange={(e) => setFamily(e.target.value)}
    >
      {families.map((f) => (
        <option key={f.family} value={f.family}>
          {f.family}
        </option>
      ))}
    </select>
  );
}`,
    },
  },
  nuxt: {
    title: "nuxt.config.ts",
    lang: "ts",
    code: `import { oceanLight, oceanDark } from "./themes";

export default defineNuxtConfig({
  modules: ["@themvora/nuxt"],
  themvora: {
    themes: [oceanLight, oceanDark],
    defaultTheme: "ocean-light",
    initialMode: "system",
  },
});`,
    extra: {
      title: "components/FamilyPicker.vue",
      lang: "vue",
      code: `<script setup lang="ts">
import { useProvidedThemes, useTheme } from "@themvora/nuxt";

const families = useProvidedThemes();
const { setFamily } = useTheme();
</script>

<template>
  <main>
    <select @change="(e: Event) => setFamily((e.target as HTMLSelectElement).value)">
      <option
        v-for="f in families"
        :key="f.family"
        :value="f.family"
      >
        {{ f.family }}
      </option>
    </select>
  </main>
</template>`,
    },
  },
  remix: {
    title: "app/root.tsx",
    lang: "tsx",
    code: `import { ThemeProvider } from "@themvora/remix";
import { oceanLight, oceanDark } from "./themes";

export default function App() {
  return (
    <ThemeProvider themes={[oceanLight, oceanDark]} defaultTheme="ocean-light">
      <Outlet />
    </ThemeProvider>
  );
}`,
    extra: {
      title: "app/routes/_index.tsx",
      lang: "tsx",
      code: `import { useProvidedThemes, useSetThemeFamily } from "@themvora/remix";

export default function Index() {
  const families = useProvidedThemes();
  const setFamily = useSetThemeFamily();

  return (
    <main>
      <select
        value={families[0]?.family ?? ""}
        onChange={(e) => setFamily(e.target.value)}
      >
        {families.map((f) => (
          <option key={f.family} value={f.family}>
            {f.family}
          </option>
        ))}
      </select>
    </main>
  );
}`,
    },
  },
};
