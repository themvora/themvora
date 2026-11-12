/**
 * Preset setup snippets, per framework.
 *
 * A plain module — not `"use client"` — for one reason: the presets pages need
 * to derive each snippet's JavaScript form on the server, and a server
 * component cannot call a function exported from a client module. Nothing here
 * touches React state or hooks, so the data is shared by both sides.
 *
 * It lives beside the other guide panels rather than in `lib/` because these are
 * eleven mutually exclusive alternatives for one section, not one bundle a
 * reader assembles: `src/main.ts` names the Angular component file, which no
 * sibling snippet declares, and it should not — only one framework's files are
 * ever used together.
 * It deliberately imports nothing: no React, no Shiki, no compiler. The page
 * derives and highlights; this module only holds the templates.
 */

/** Framework example type for snippets. */
export type FrameworkExample = {
  title: string;
  lang: string;
  code: string;
  filename?: string;
};

/**
 * The two install snippets on `/presets`.
 *
 * They live here, beside the per-framework setup templates, rather than in
 * `presets.tsx`, because that module is `"use client"` — a value exported from
 * it reaches the server as a client reference, so the page could not derive
 * their compatibility badges. Both are plain JavaScript, so their badge is
 * `TS / JS` even though the blocks are highlighted with the TypeScript grammar.
 */
export const DEFAULT_PRESET_SNIPPET = `import { getPresetThemes } from "@themvora/core";

// Default presets — nine families, light + dark
const themes = getPresetThemes();

// Restyle one family's tokens
const custom = getPresetThemes({
  plum: {
    light: { tokens: { colors: { primary: "#6d28d9" } } },
  },
});`;

export const BRAND_PRESET_SNIPPET = `import { getBrandPresets } from "@themvora/core";

// Apple, GitHub, Vercel, Slack, Discord — light + dark each
const themes = getBrandPresets();

const github = themes.filter((t) => t.meta?.family === "github");
createThemeRuntime({ themes: github, defaultTheme: "github-light" });`;

/**
 * Stands in for the preset family name while `presetJavaScript` derives the
 * JavaScript form once per framework.
 *
 * The family reaches a snippet only through string literals and comments, which
 * the TypeScript erasure copies verbatim, so a single derivation projects onto
 * every family by substitution. The token is deliberately unspellable as a
 * theme family, so a collision cannot occur.
 */
export const PRESET_FAMILY_TOKEN = "__THEMVORA_FAMILY__";

/** Frameworks the preset pages can generate a setup snippet for. */
export const PRESET_FRAMEWORKS: { slug: string; name: string }[] = [
  { slug: "react", name: "React" },
  { slug: "next", name: "Next.js" },
  { slug: "vue", name: "Vue" },
  { slug: "nuxt", name: "Nuxt" },
  { slug: "svelte", name: "Svelte" },
  { slug: "solid", name: "Solid" },
  { slug: "angular", name: "Angular" },
  { slug: "astro", name: "Astro" },
  { slug: "remix", name: "Remix v2" },
  { slug: "web", name: "Web Components" },
  { slug: "tailwind", name: "Tailwind CSS" },
];

/**
 * Per-framework setup snippet for one preset family.
 *
 * Every snippet uses the framework package's own shipped API —
 * `ThemeProvider`, `createThemeDocument`, `provideTheme` or
 * `defineCustomElements` — rather than dropping down to
 * `createThemeRuntime`. The preset itself always comes from
 * `@themvora/core` (`getPresetThemes` / `getBrandPresets`), and the whole
 * family is handed over so light and dark both resolve.
 */
export function getPresetFrameworkSnippet(
  family: string,
  kind: "default" | "brand",
  framework: string,
  mode: "light" | "dark" = "light"
): FrameworkExample {
  const getter = kind === "brand" ? "getBrandPresets" : "getPresetThemes";
  const themeName = `${family}-${mode}`;

  const snippets: Record<string, FrameworkExample> = {
    react: {
      title: "src/App.tsx",
      lang: "tsx",
      code: `import { ThemeProvider } from "@themvora/react";
import { ${getter} } from "@themvora/core";

// ${family} — light + dark in one family
const themes = ${getter}().filter((t) => t.meta?.family === "${family}");

export function App() {
  return (
    <ThemeProvider themes={themes} defaultTheme="${themeName}">
      {/* your app */}
    </ThemeProvider>
  );
}`,
    },
    next: {
      title: "app/layout.tsx",
      lang: "tsx",
      code: `import type { ReactNode } from "react";
import { ThemeProvider } from "@themvora/next";
import { ${getter} } from "@themvora/core";

// ${family} — light + dark in one family
const themes = ${getter}().filter((t) => t.meta?.family === "${family}");

export default function RootLayout({ children }: { children: ReactNode }) {
  // ThemeProvider renders <html>, <head> and <body> itself — do not add them.
  return (
    <ThemeProvider themes={themes} defaultTheme="${themeName}">
      {children}
    </ThemeProvider>
  );
}`,
    },
    vue: {
      title: "src/App.vue",
      lang: "vue",
      code: `<!-- src/App.vue -->
<script setup lang="ts">
import { ThemeProvider } from "@themvora/vue";
import { ${getter} } from "@themvora/core";

// ${family} — light + dark in one family
const themes = ${getter}().filter((t) => t.meta?.family === "${family}");
</script>

<template>
  <ThemeProvider :themes="themes" default-theme="${themeName}">
    <!-- your app -->
  </ThemeProvider>
</template>`,
    },
    svelte: {
      title: "src/App.svelte",
      lang: "svelte",
      code: `<!-- src/App.svelte -->
<script lang="ts">
  import { ThemeProvider } from "@themvora/svelte";
  import { ${getter} } from "@themvora/core";

  // ${family} — light + dark in one family
  const themes = ${getter}().filter((t) => t.meta?.family === "${family}");
</script>

<ThemeProvider themes={themes} defaultTheme="${themeName}">
  <!-- your app -->
</ThemeProvider>`,
    },
    solid: {
      title: "src/App.tsx",
      lang: "tsx",
      code: `import { ThemeProvider } from "@themvora/solid";
import { ${getter} } from "@themvora/core";

// ${family} — light + dark in one family
const themes = ${getter}().filter((t) => t.meta?.family === "${family}");

export function App() {
  return (
    <ThemeProvider themes={themes} defaultTheme="${themeName}">
      {/* your app */}
    </ThemeProvider>
  );
}`,
    },
    angular: {
      title: "src/main.ts",
      lang: "ts",
      code: `import { bootstrapApplication } from "@angular/platform-browser";
import { provideTheme } from "@themvora/angular";
import { ${getter} } from "@themvora/core";
import { AppComponent } from "./app/app.component";

// ${family} — light + dark in one family
const themes = ${getter}().filter((t) => t.meta?.family === "${family}");

bootstrapApplication(AppComponent, {
  providers: [provideTheme({ themes, defaultTheme: "${themeName}" })],
});`,
    },
    web: {
      title: "index.html",
      lang: "html",
      code: `<!doctype html>
<html lang="en">
  <body>
    <script type="module">
      // Registers every <themvora-*> element and their stylesheet.
      import "@themvora/web";
      import { ${getter} } from "@themvora/core";

      // ${family} — light + dark in one family
      const themes = ${getter}().filter((t) => t.meta?.family === "${family}");

      // The provider reads its themes from the \`themes\` attribute. Setting it
      // after upgrade is live: the runtime reconciles the catalog in place.
      document
        .querySelector("themvora-provider")
        ?.setAttribute("themes", JSON.stringify(themes));
    </script>

    <themvora-provider default-theme="${themeName}">
      <my-app></my-app>
    </themvora-provider>
  </body>
</html>`,
    },
    astro: {
      title: "theme.config.ts + astro.config.ts",
      lang: "ts",
      code: `// theme.config.ts — the single declaration
import { defineThemvoraConfig } from "@themvora/core";
import { ${getter} } from "@themvora/core";

// ${family} — light + dark in one family
const themes = ${getter}().filter((t) => t.meta?.family === "${family}");

export default defineThemvoraConfig({
  themes,
  defaultTheme: "${themeName}",
  initialMode: "system",
});

// astro.config.ts — registers the integration; the integration discovers the
// config above, injects the pre-paint bootstrap from it, and transports it to
// the runtime. No theme data here.
import { defineConfig } from "astro/config";
import themvora from "@themvora/astro";

export default defineConfig({
  integrations: [themvora()],
});`,
    },
    nuxt: {
      title: "nuxt.config.ts",
      lang: "ts",
      code: `import { ${getter} } from "@themvora/core";

// ${family} — light + dark in one family
const themes = ${getter}().filter((t) => t.meta?.family === "${family}");

export default defineNuxtConfig({
  modules: ["@themvora/nuxt"],
  themvora: {
    themes,
    defaultTheme: "${themeName}",
    initialMode: "system",
  },
});`,
    },
    remix: {
      title: "app/root.tsx — theming configuration",
      lang: "tsx",
      code: `import { ${getter} } from "@themvora/core";

// ${family} — light + dark in one family
const themes = ${getter}().filter((t) => t.meta?.family === "${family}");

const theming = createThemeDocument({
  themes,
  defaultTheme: "${themeName}",
  mode: "system",
});`,
    },
    tailwind: {
      title: "src/globals.css",
      lang: "css",
      code: `@import "tailwindcss";
@import "@themvora/tailwind";

/* The ${family} preset is resolved by the Themvora runtime into the
   --color-* variables below; pick the family with your framework's
   ThemeProvider (see the React / Next.js snippets). */

body {
  @apply bg-background text-foreground;
}`,
    },
  };

  return (
    snippets[framework] ?? {
      title: `${family}-${mode}.ts`,
      lang: "ts",
      code: `import { ${getter} } from "@themvora/core";

// ${family} — light + dark in one family
const themes = ${getter}().filter((t) => t.meta?.family === "${family}");
const theme = themes.find((t) => t.meta?.mode === "${mode}") ?? themes[0];

console.log(theme.name); // "${themeName}"`,
    }
  );
}

/**
 * Per-framework snippet showing all presets passed to the provider without filtering.
 *
 * This is the alternative to `getPresetFrameworkSnippet`: instead of filtering
 * to one family, it passes the entire preset catalog so every family is available.
 */
export function getPresetFrameworkSnippetUnfiltered(
  kind: "default" | "brand",
  framework: string,
  mode: "light" | "dark" = "light"
): FrameworkExample {
  const getter = kind === "brand" ? "getBrandPresets" : "getPresetThemes";
  const defaultTheme = kind === "brand" ? "apple-light" : "plum-light";

  const snippets: Record<string, FrameworkExample> = {
    react: {
      title: "src/App.tsx",
      lang: "tsx",
      code: `import { ThemeProvider } from "@themvora/react";
import { ${getter} } from "@themvora/core";

// All ${kind === "brand" ? "brand" : "default"} presets — every family, light + dark
const themes = ${getter}();

export function App() {
  return (
    <ThemeProvider themes={themes} defaultTheme="${defaultTheme}">
      {/* your app */}
    </ThemeProvider>
  );
}`,
    },
    next: {
      title: "app/layout.tsx",
      lang: "tsx",
      code: `import type { ReactNode } from "react";
import { ThemeProvider } from "@themvora/next";
import { ${getter} } from "@themvora/core";

// All ${kind === "brand" ? "brand" : "default"} presets — every family, light + dark
const themes = ${getter}();

export default function RootLayout({ children }: { children: ReactNode }) {
  // ThemeProvider renders <html>, <head> and <body> itself — do not add them.
  return (
    <ThemeProvider themes={themes} defaultTheme="${defaultTheme}">
      {children}
    </ThemeProvider>
  );
}`,
    },
    vue: {
      title: "src/App.vue",
      lang: "vue",
      code: `<!-- src/App.vue -->
<script setup lang="ts">
import { ThemeProvider } from "@themvora/vue";
import { ${getter} } from "@themvora/core";

// All ${kind === "brand" ? "brand" : "default"} presets — every family, light + dark
const themes = ${getter}();
</script>

<template>
  <ThemeProvider :themes="themes" default-theme="${defaultTheme}">
    <!-- your app -->
  </ThemeProvider>
</template>`,
    },
    svelte: {
      title: "src/App.svelte",
      lang: "svelte",
      code: `<!-- src/App.svelte -->
<script lang="ts">
  import { ThemeProvider } from "@themvora/svelte";
  import { ${getter} } from "@themvora/core";

  // All ${kind === "brand" ? "brand" : "default"} presets — every family, light + dark
  const themes = ${getter}();
</script>

<ThemeProvider themes={themes} defaultTheme="${defaultTheme}">
  <!-- your app -->
</ThemeProvider>`,
    },
    solid: {
      title: "src/App.tsx",
      lang: "tsx",
      code: `import { ThemeProvider } from "@themvora/solid";
import { ${getter} } from "@themvora/core";

// All ${kind === "brand" ? "brand" : "default"} presets — every family, light + dark
const themes = ${getter}();

export function App() {
  return (
    <ThemeProvider themes={themes} defaultTheme="${defaultTheme}">
      {/* your app */}
    </ThemeProvider>
  );
}`,
    },
    angular: {
      title: "src/main.ts",
      lang: "ts",
      code: `import { bootstrapApplication } from "@angular/platform-browser";
import { provideTheme } from "@themvora/angular";
import { ${getter} } from "@themvora/core";
import { AppComponent } from "./app/app.component";

// All ${kind === "brand" ? "brand" : "default"} presets — every family, light + dark
const themes = ${getter}();

bootstrapApplication(AppComponent, {
  providers: [provideTheme({ themes, defaultTheme: "${defaultTheme}" })],
});`,
    },
    web: {
      title: "index.html",
      lang: "html",
      code: `<!doctype html>
<html lang="en">
  <body>
    <script type="module">
      // Registers every <themvora-*> element and their stylesheet.
      import "@themvora/web";
      import { ${getter} } from "@themvora/core";

      // All ${kind === "brand" ? "brand" : "default"} presets — every family, light + dark
      const themes = ${getter}();

      // The provider reads its themes from the \`themes\` attribute. Setting it
      // after upgrade is live: the runtime reconciles the catalog in place.
      document
        .querySelector("themvora-provider")
        ?.setAttribute("themes", JSON.stringify(themes));
    </script>

    <themvora-provider default-theme="${defaultTheme}">
      <my-app></my-app>
    </themvora-provider>
  </body>
</html>`,
    },
    astro: {
      title: "theme.config.ts + astro.config.ts",
      lang: "ts",
      code: `// theme.config.ts — the single declaration
import { defineThemvoraConfig } from "@themvora/core";
import { ${getter} } from "@themvora/core";

// All ${kind === "brand" ? "brand" : "default"} presets — every family, light + dark
const themes = ${getter}();

export default defineThemvoraConfig({
  themes,
  defaultTheme: "${defaultTheme}",
  initialMode: "system",
});

// astro.config.ts — registers the integration; the integration discovers the
// config above, injects the pre-paint bootstrap from it, and transports it to
// the runtime. No theme data here.
import { defineConfig } from "astro/config";
import themvora from "@themvora/astro";

export default defineConfig({
  integrations: [themvora()],
});`,
    },
    nuxt: {
      title: "nuxt.config.ts",
      lang: "ts",
      code: `import { ${getter} } from "@themvora/core";

// All ${kind === "brand" ? "brand" : "default"} presets — every family, light + dark
const themes = ${getter}();

export default defineNuxtConfig({
  modules: ["@themvora/nuxt"],
  themvora: {
    themes,
    defaultTheme: "${defaultTheme}",
    initialMode: "system",
  },
});`,
    },
    remix: {
      title: "app/root.tsx — theming configuration",
      lang: "tsx",
      code: `import { ${getter} } from "@themvora/core";

// All ${kind === "brand" ? "brand" : "default"} presets — every family, light + dark
const themes = ${getter}();

const theming = createThemeDocument({
  themes,
  defaultTheme: "${defaultTheme}",
  mode: "system",
});`,
    },
    tailwind: {
      title: "src/globals.css",
      lang: "css",
      code: `@import "tailwindcss";
@import "@themvora/tailwind";

/* All ${kind === "brand" ? "brand" : "default"} presets are resolved by the
   Themvora runtime into the --color-* variables below; pick the family with
   your framework's ThemeProvider (see the React / Next.js snippets). */

body {
  @apply bg-background text-foreground;
}`,
    },
  };

  return (
    snippets[framework] ?? {
      title: `all-${kind}-presets.ts`,
      lang: "ts",
      code: `import { ${getter} } from "@themvora/core";

// All ${kind === "brand" ? "brand" : "default"} presets — every family, light + dark
const themes = ${getter}();

console.log(themes.length); // ${kind === "brand" ? "10" : "18"} themes`,
    }
  );
}

/**
 * Per-framework snippet showing a family picker built with `useProvidedThemes()`.
 *
 * This is the third snippet on the preset pages: after the filtered and unfiltered
 * provider setup, it shows how to read the registered families and let the user
 * switch between them at runtime.
 */
export function getPresetFrameworkSnippetFamilyPicker(
  framework: string
): FrameworkExample {
  const snippets: Record<string, FrameworkExample> = {
    react: {
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
    next: {
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
    vue: {
      title: "YourView.vue",
      lang: "vue",
      code: `<script setup lang="ts">
import { useProvidedThemes, useTheme } from "@themvora/vue";

const families = useProvidedThemes();
const { setFamily } = useTheme();
</script>

<template>
  <main>
    <select :value="families[0]?.family ?? ''" @change="setFamily(($event.target as HTMLSelectElement).value)">
      <option v-for="f in families" :key="f.family" :value="f.family">
        {{ f.family }}
      </option>
    </select>
  </main>
</template>`,
    },
    svelte: {
      title: "FamilyPicker.svelte",
      lang: "svelte",
      code: `<script lang="ts">
  import { useProvidedThemes, useTheme } from "@themvora/svelte";

  const families = useProvidedThemes();
  const { setFamily } = useTheme();
</script>

<main>
  <select onchange={(e: Event) => setFamily((e.currentTarget as HTMLSelectElement).value)}>
    {#each families as f}
      <option value={f.family}>{f.family}</option>
    {/each}
  </select>
</main>`,
    },
    solid: {
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
    angular: {
      title: "src/app/family-picker.component.ts",
      lang: "ts",
      code: `import { Component } from "@angular/core";
import { injectProvidedThemes, injectTheme } from "@themvora/angular";

@Component({
  selector: "app-family-picker",
  template: \`
    <main>
      <select [value]="theme().family" (change)="setFamily($any($event.target).value)">
        @for (f of families(); track f.family) {
          <option [value]="f.family">{{ f.family }}</option>
        }
      </select>
    </main>
  \`,
})
export class FamilyPickerComponent {
  // Both are read-only signals, and both require an injection context.
  families = injectProvidedThemes();
  theme = injectTheme();

  setFamily(family: string) {
    this.theme().setFamily(family);
  }
}`,
    },
    web: {
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
document.body.appendChild(select);`,
    },
    astro: {
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
    nuxt: {
      title: "components/FamilyPicker.vue",
      lang: "vue",
      code: `<script setup lang="ts">
import { useProvidedThemes, useTheme } from "@themvora/nuxt";

const families = useProvidedThemes();
const { setFamily } = useTheme();
</script>

<template>
  <main>
    <select :value="families[0]?.family ?? ''" @change="setFamily(($event.target as HTMLSelectElement).value)">
      <option v-for="f in families" :key="f.family" :value="f.family">
        {{ f.family }}
      </option>
    </select>
  </main>
</template>`,
    },
    remix: {
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
    tailwind: {
      title: "N/A",
      lang: "text",
      code: `Tailwind CSS has no runtime — use your framework's ThemeProvider
to register the presets, then read families with that framework's
useProvidedThemes() hook (see the React / Next.js snippets above).`,
    },
  };

  return (
    snippets[framework] ?? {
      title: "FamilyPicker.ts",
      lang: "ts",
      code: `// Use your framework's useProvidedThemes() hook to read the
// registered families, then call setFamily() to switch between them.
// See the React / Next.js snippets for the full pattern.`,
    }
  );
}
