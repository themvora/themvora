/**
 * The snippets the Scoped Theme guide renders, as data.
 *
 * They live here rather than inside `ScopedThemeGuide.tsx` because the guide is
 * a client component: the server cannot read a value exported from a `"use
 * client"` module, so a page that wanted to derive the JavaScript counterpart of
 * these snippets had no way to see them. Keeping the text in a plain module
 * makes it readable from both sides — the guide for display, the page for
 * `javascriptSources`.
 */
type WebViteSnippet = { title: string; lang: string; code: string };
type Snippet = {
  lang: string;
  title: string;
  code: string;
  /** Web only — the same setup through the Vite plugin. */
  vite?: WebViteSnippet;
};

const webViteSnippet: WebViteSnippet = {
  title: "Using Vite — theme.config.ts",
  lang: "ts",
  code: `// vite.config.ts
import { defineConfig } from "vite";
import { themvoraVitePlugin } from "@themvora/web/vite";

export default defineConfig({ plugins: [themvoraVitePlugin()] });

// theme.config.ts
import { defineThemvoraConfig, getBuiltInThemes } from "@themvora/core";

export default defineThemvoraConfig({
  themes: getBuiltInThemes(),
  defaultTheme: "mint-light",
  initialMode: "system",
});`,
};

export const scopeExamples: Record<string, Snippet> = {
  react: {
    lang: "tsx",
    title: "src/App.tsx",
    code: `// src/App.tsx — the provider is mounted in src/main.tsx.
import { ThemeScope } from "@themvora/react";
import type { ThemeTransitionOptions } from "@themvora/core";

const scopeTransition: ThemeTransitionOptions = { duration: 300, easing: "cubic-bezier(0.4, 0, 0.2, 1)" };

export function App() {
  return (
    <ThemeScope theme="plum-dark" transition={scopeTransition}>
      <Sidebar />
    </ThemeScope>
  );
}`,
  },
  next: {
    lang: "tsx",
    title: "scoped-panel.tsx",
    code: `"use client";

import { ThemeScope } from "@themvora/next/client";
import type { ThemeTransitionOptions } from "@themvora/core";

const transition: ThemeTransitionOptions = { duration: 300, easing: "ease" };

export function ScopedPanel() {
  return (
    <ThemeScope theme="plum-dark" transition={transition}>
      <Notifications />
    </ThemeScope>
  );
}`,
  },
  vue: {
    lang: "vue",
    title: "App.vue",
    code: `<script setup lang="ts">
import { ThemeScope } from "@themvora/vue";
import type { ThemeTransitionOptions } from "@themvora/core";

const transition: ThemeTransitionOptions = { duration: 300, easing: "ease" };
</script>

<template>
  <ThemeScope theme="plum-dark" :transition="transition">
    <YourComponent />
  </ThemeScope>
</template>`,
  },
  svelte: {
    lang: "svelte",
    title: "App.svelte",
    code: `<script lang="ts">
import { ThemeScope } from "@themvora/svelte";
import type { ThemeTransitionOptions } from "@themvora/core";

const transition: ThemeTransitionOptions = { duration: 300, easing: "ease" };
</script>

<ThemeProvider>
  <ThemeScope theme="plum-dark" {transition}>
    <YourComponent />
  </ThemeScope>
</ThemeProvider>`,
  },
  solid: {
    lang: "tsx",
    title: "app.tsx",
    code: `import { ThemeScope } from "@themvora/solid";
import type { ThemeTransitionOptions } from "@themvora/core";

const transition: ThemeTransitionOptions = { duration: 300, easing: "ease" };

export function App() {
  return (
    <ThemeProvider>
      <ThemeScope theme="plum-dark" transition={transition}>
        <YourComponent />
      </ThemeScope>
    </ThemeProvider>
  );
}`,
  },
  angular: {
    lang: "ts",
    title: "app-banner.ts",
    code: `import { Component } from "@angular/core";
import { ThemeScopeDirective } from "@themvora/angular";
import type { ThemeTransitionOptions } from "@themvora/core";

const transition: ThemeTransitionOptions = { duration: 300, easing: "ease" };

@Component({
  selector: "app-banner",
  template: \`
    <div [themvoraScope]="'plum-dark'" [themvoraScopeTransition]="transition">
      <p>This subtree uses the plum-dark palette with transition.</p>
    </div>
  \`,
  standalone: true,
  imports: [ThemeScopeDirective],
})
export class BannerComponent {}`,
  },
  web: {
    lang: "html",
    title: "index.html",
    code: `<themvora-provider default-theme="mint-light">
  <your-app></your-app>

  <themvora-scope theme="plum-dark" theme-transition='{"duration":300,"easing":"ease"}'>
    <aside>Scoped to plum-dark</aside>
  </themvora-scope>
</themvora-provider>

<script type="module">
  import "@themvora/web";
</script>`,
    vite: webViteSnippet,
  },
  tailwind: {
    lang: "css",
    title: "scope.css",
    code: `/* Scoped themes are pure CSS-variable islands — works with Tailwind too.
   Scope a region with a custom property override layer. */
.scoped-plum {
  @apply dark:text-plum-50 bg-plum-50;
  --theme-color-primary: theme(colors.plum.700);
  --theme-color-background: theme(colors.plum.50);
}

.dark .scoped-plum {
  --theme-color-primary: theme(colors.plum.300);
  --theme-color-background: theme(colors.plum-950);
}

<div class="scoped-plum">
  This subtree uses the plum palette, isolated from the global theme.
</div>`,
  },
  astro: {
    lang: "astro",
    title: "src/components/Scoped.astro",
    code: `---
import { ThemeScope } from "@themvora/astro/client";
---

<div class="scoped-region">
  <ThemeScope theme="plum-dark">
    <slot />
  </ThemeScope>
</div>`,
  },
  nuxt: {
    lang: "vue",
    title: "ScopedPanel.vue",
    code: `<script setup lang="ts">
import { ThemeScope } from "@themvora/nuxt";
import type { ThemeTransitionOptions } from "@themvora/core";

const transition: ThemeTransitionOptions = { duration: 300, easing: "ease" };
</script>

<template>
  <ThemeScope theme="plum-dark" :transition="transition">
    <YourComponent />
  </ThemeScope>
</template>`,
  },
  remix: {
    lang: "tsx",
    title: "scoped-panel.tsx",
    code: `"use client";

import { ThemeScope } from "@themvora/remix";
import type { ThemeTransitionOptions } from "@themvora/core";

const transition: ThemeTransitionOptions = { duration: 300, easing: "ease" };

export function ScopedPanel() {
  return (
    <ThemeScope theme="plum-dark" transition={transition}>
      <Notifications />
    </ThemeScope>
  );
}`,
  },
};

export const imperativeExamples: Record<string, Snippet> = {
  react: {
    lang: "tsx",
    title: "useScopedTheme — imperative",
    code: `"use client";

import { useRef } from "react";
import { useScopedTheme } from "@themvora/react";

export function Preview({ themeName }: { themeName: string | null }) {
  const ref = useRef<HTMLDivElement | null>(null);
  useScopedTheme(ref, themeName);

  return <div ref={ref}>This div follows {themeName ?? "the global theme"}.</div>;
}`,
  },
  next: {
    lang: "tsx",
    title: "useScopedTheme — imperative",
    code: `"use client";

import { useRef } from "react";
import { useScopedTheme } from "@themvora/next/client";

export function Preview({ themeName }: { themeName: string | null }) {
  const ref = useRef<HTMLDivElement | null>(null);
  useScopedTheme(ref, themeName);

  return <div ref={ref}>This div follows {themeName ?? "the global theme"}.</div>;
}`,
  },
  remix: {
    lang: "tsx",
    title: "useScopedTheme — imperative",
    code: `"use client";

import { useRef } from "react";
import { useScopedTheme } from "@themvora/react";

export function Preview({ themeName }: { themeName: string | null }) {
  const ref = useRef<HTMLDivElement | null>(null);
  useScopedTheme(ref, themeName);

  return <div ref={ref}>This div follows {themeName ?? "the global theme"}.</div>;
}`,
  },
  vue: {
    lang: "vue",
    title: "App.vue — imperative binding",
    code: `<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";
import { useThemeRuntime } from "@themvora/vue";
import { createScopedThemeBinding } from "@themvora/core";

const el = ref<HTMLElement | null>(null);
const runtime = useThemeRuntime();
let binding: ReturnType<typeof createScopedThemeBinding> | null = null;

onMounted(() => {
  binding = createScopedThemeBinding(runtime.themes, el.value!, "plum-dark");
});
onUnmounted(() => binding?.destroy());
</script>

<template>
  <div ref="el">Scoped to plum-dark</div>
</template>`,
  },
  svelte: {
    lang: "svelte",
    title: "App.svelte — imperative binding",
    code: `<script lang="ts">
  import { getThemeRuntime } from "@themvora/svelte";
  import { createScopedThemeBinding } from "@themvora/core";
  import { onMount } from "svelte";

  let el: HTMLDivElement;
  const runtime = getThemeRuntime();

  onMount(() => {
    const binding = createScopedThemeBinding(runtime.themes, el, "plum-dark");
    return () => binding.destroy();
  });
</script>

<div bind:this={el}>Scoped to plum-dark</div>`,
  },
  solid: {
    lang: "tsx",
    title: "Solid — imperative binding",
    code: `import { onMount, onCleanup } from "solid-js";
import { useThemeRuntime } from "@themvora/solid";
import { createScopedThemeBinding } from "@themvora/core";

function Preview() {
  let el: HTMLDivElement | undefined;
  const runtime = useThemeRuntime();

  onMount(() => {
    const binding = createScopedThemeBinding(runtime.themes, el!, "plum-dark");
    onCleanup(() => binding.destroy());
  });

  return <div ref={el}>Scoped to plum-dark</div>;
}`,
  },
  angular: {
    lang: "ts",
    title: "Angular — ThemeScopeDirective",
    code: `import { Component } from "@angular/core";
import { ThemeScopeDirective } from "@themvora/angular";

@Component({
  selector: "app-preview",
  template: \`
    <div [themvoraScope]="'plum-dark'">
      Scoped to plum-dark
    </div>
  \`,
  standalone: true,
  imports: [ThemeScopeDirective],
})
export class PreviewComponent {}`,
  },
  web: {
    lang: "html",
    title: "index.html — themvora-scope",
    code: `<themvora-scope theme="plum-dark">
  <p>Scoped to plum-dark</p>
</themvora-scope>`,
    vite: webViteSnippet,
  },
  tailwind: {
    lang: "ts",
    title: "core — createScopedThemeBinding",
    code: `// Tailwind is a CSS layer — imperative scoping
// uses the core binding, same as vanilla JS.
import { createScopedThemeBinding, getBuiltInThemes } from "@themvora/core";

// createScopedThemeBinding takes the registry positionally; the built-in set
// is a valid registry, so no theme file is needed.
const themes = getBuiltInThemes();

const binding = createScopedThemeBinding(themes, el, "plum-dark");
binding.destroy();`,
  },
  astro: {
    lang: "astro",
    title: "Astro — ThemeScope",
    code: `---
import { ThemeScope } from "@themvora/astro/client";
---
<ThemeScope theme="plum-dark">
  <div>Scoped to plum-dark</div>
</ThemeScope>`,
  },
  nuxt: {
    lang: "vue",
    title: "Nuxt — ThemeScope",
    code: `<template>
  <ThemeScope theme="plum-dark">
    <div>Scoped to plum-dark</div>
  </ThemeScope>
</template>`,
  },
};

export const localThemeExamples: Record<string, Snippet> = {
  react: {
    lang: "tsx",
    title: "React — local themes",
    code: `import { ThemeScope } from "@themvora/react";
import type { ThemeDefinition } from "@themvora/core";
import { defineTheme } from "@themvora/core";

const compactTheme: ThemeDefinition = defineTheme({
  name: "compact-light",
  meta: { family: "compact", mode: "light" },
  tokens: {
    colors: {
      background: "#ffffff",
      foreground: "#18181b",
      primary: "#6366f1",
      primaryForeground: "#ffffff",
      card: "#fafafa",
    },
  },
});

export function ScopedEditor() {
  return (
    <ThemeScope themes={[compactTheme]} theme="compact-light">
      <EditorToolbar />
    </ThemeScope>
  );
}`,
  },
  next: {
    lang: "tsx",
    title: "Next.js — local themes",
    code: `"use client";

import { ThemeScope } from "@themvora/next/client";
import type { ThemeDefinition } from "@themvora/core";
import { defineTheme } from "@themvora/core";

const compactTheme: ThemeDefinition = defineTheme({
  name: "compact-light",
  meta: { family: "compact", mode: "light" },
  tokens: {
    colors: {
      background: "#ffffff",
      foreground: "#18181b",
      primary: "#6366f1",
      primaryForeground: "#ffffff",
      card: "#fafafa",
    },
  },
});

export function ScopedPanel() {
  return (
    <ThemeScope themes={[compactTheme]} theme="compact-light">
      <EditorToolbar />
    </ThemeScope>
  );
}`,
  },
  vue: {
    lang: "vue",
    title: "Vue — local themes",
    code: `<script setup lang="ts">
import { ThemeScope } from "@themvora/vue";
import type { ThemeDefinition } from "@themvora/core";
import { defineTheme } from "@themvora/core";

const compactTheme: ThemeDefinition = defineTheme({
  name: "compact-light",
  meta: { family: "compact", mode: "light" },
  tokens: {
    colors: {
      background: "#ffffff",
      foreground: "#18181b",
      primary: "#6366f1",
      primaryForeground: "#ffffff",
      card: "#fafafa",
    },
  },
});
</script>

<template>
  <ThemeScope :themes="[compactTheme]" theme="compact-light">
    <EditorToolbar />
  </ThemeScope>
</template>`,
  },
  svelte: {
    lang: "svelte",
    title: "Svelte — local themes",
    code: `<script lang="ts">
  import { ThemeScope } from "@themvora/svelte";
  import { defineTheme } from "@themvora/core";

  const compactTheme = defineTheme({
    name: "compact-light",
    meta: { family: "compact", mode: "light" },
    tokens: {
      colors: {
        background: "#ffffff",
        foreground: "#18181b",
        primary: "#6366f1",
        primaryForeground: "#ffffff",
        card: "#fafafa",
      },
    },
  });
</script>

<ThemeScope themes={[compactTheme]} theme="compact-light">
  <EditorToolbar />
</ThemeScope>`,
  },
  solid: {
    lang: "tsx",
    title: "Solid — local themes",
    code: `import { ThemeScope } from "@themvora/solid";
import type { ThemeDefinition } from "@themvora/core";
import { defineTheme } from "@themvora/core";

const compactTheme: ThemeDefinition = defineTheme({
  name: "compact-light",
  meta: { family: "compact", mode: "light" },
  tokens: {
    colors: {
      background: "#ffffff",
      foreground: "#18181b",
      primary: "#6366f1",
      primaryForeground: "#ffffff",
      card: "#fafafa",
    },
  },
});

export function ScopedEditor() {
  return (
    <ThemeScope themes={[compactTheme]} theme="compact-light">
      <EditorToolbar />
    </ThemeScope>
  );
}`,
  },
  angular: {
    lang: "ts",
    title: "core — imperative local themes",
    code: `// The Angular ThemeScopeDirective doesn't support local themes.
// Use the imperative core binding with localThemes:
import {
  createScopedThemeBinding,
  defineTheme,
  getBuiltInThemes,
} from "@themvora/core";

// A local theme is just a ThemeDefinition — define it wherever you like.
const compactTheme = defineTheme({
  name: "compact-light",
  meta: { family: "compact", mode: "light" },
  tokens: {
    colors: {
      background: "#ffffff",
      foreground: "#18181b",
      primary: "#6366f1",
    },
  },
});

// createScopedThemeBinding takes the registry positionally.
const themes = getBuiltInThemes();

const binding = createScopedThemeBinding(themes, el, "plum-dark", {
  localThemes: [compactTheme],
});
binding.destroy();`,
  },
  web: {
    lang: "ts",
    title: "core — imperative local themes",
    code: `import {
  createScopedThemeBinding,
  defineTheme,
  getBuiltInThemes,
} from "@themvora/core";

const compactTheme = defineTheme({
  name: "compact-light",
  meta: { family: "compact", mode: "light" },
  tokens: {
    colors: {
      background: "#ffffff",
      foreground: "#18181b",
      primary: "#6366f1",
    },
  },
});

const themes = getBuiltInThemes();

const binding = createScopedThemeBinding(themes, el, "plum-dark", {
  localThemes: [compactTheme],
});
binding.destroy();`,
    vite: webViteSnippet,
  },
  tailwind: {
    lang: "ts",
    title: "core — imperative local themes",
    code: `// Tailwind is a CSS layer — local themes use the core binding.
import {
  createScopedThemeBinding,
  defineTheme,
  getBuiltInThemes,
} from "@themvora/core";

// A local theme is just a ThemeDefinition — define it wherever you like.
const compactTheme = defineTheme({
  name: "compact-light",
  meta: { family: "compact", mode: "light" },
  tokens: {
    colors: {
      background: "#ffffff",
      foreground: "#18181b",
      primary: "#6366f1",
    },
  },
});

// createScopedThemeBinding takes the registry positionally.
const themes = getBuiltInThemes();

const binding = createScopedThemeBinding(themes, el, "plum-dark", {
  localThemes: [compactTheme],
});
binding.destroy();`,
  },
  astro: {
    lang: "ts",
    title: "core — imperative local themes",
    code: `// Astro's ThemeScope doesn't support local themes.
// Use the imperative core binding with localThemes:
import {
  createScopedThemeBinding,
  defineTheme,
  getBuiltInThemes,
} from "@themvora/core";

// A local theme is just a ThemeDefinition — define it wherever you like.
const compactTheme = defineTheme({
  name: "compact-light",
  meta: { family: "compact", mode: "light" },
  tokens: {
    colors: {
      background: "#ffffff",
      foreground: "#18181b",
      primary: "#6366f1",
    },
  },
});

// createScopedThemeBinding takes the registry positionally.
const themes = getBuiltInThemes();

const binding = createScopedThemeBinding(themes, el, "plum-dark", {
  localThemes: [compactTheme],
});
binding.destroy();`,
  },
  nuxt: {
    lang: "vue",
    title: "Nuxt — local themes",
    code: `<script setup lang="ts">
import { ThemeScope } from "@themvora/nuxt";
import { defineTheme } from "@themvora/core";

// A local theme is a plain ThemeDefinition — it never enters the global
// registry, so the scope is the only place that can see it.
const compactTheme = defineTheme({
  name: "compact-light",
  meta: { family: "compact", mode: "light" },
  tokens: {
    colors: {
      background: "#ffffff",
      foreground: "#18181b",
      primary: "#6366f1",
    },
  },
});
</script>

<template>
  <ThemeScope :themes="[compactTheme]" theme="compact-light">
    <EditorToolbar />
  </ThemeScope>
</template>`,
  },
  remix: {
    lang: "tsx",
    title: "Remix — local themes",
    code: `"use client";

import { ThemeScope } from "@themvora/remix";
import type { ThemeDefinition } from "@themvora/core";
import { defineTheme } from "@themvora/core";

const compactTheme: ThemeDefinition = defineTheme({
  name: "compact-light",
  meta: { family: "compact", mode: "light" },
  tokens: {
    colors: {
      background: "#ffffff",
      foreground: "#18181b",
      primary: "#6366f1",
      primaryForeground: "#ffffff",
      card: "#fafafa",
    },
  },
});

export function ScopedPanel() {
  return (
    <ThemeScope themes={[compactTheme]} theme="compact-light">
      <EditorToolbar />
    </ThemeScope>
  );
}`,
  },
};

export const transitionExamples: Record<string, Snippet> = {
  react: {
    lang: "tsx",
    title: "React — transition prop",
    code: `import { ThemeScope } from "@themvora/react";

<ThemeScope theme="plum-dark" />

<ThemeScope theme="plum-dark" transition={false} />

<ThemeScope
  theme="plum-dark"
  transition={{ duration: 150 }}
/>`,
  },
  next: {
    lang: "tsx",
    title: "Next.js — transition prop",
    code: `"use client";

import { ThemeScope } from "@themvora/next/client";

<ThemeScope theme="plum-dark" />

<ThemeScope theme="plum-dark" transition={false} />

<ThemeScope
  theme="plum-dark"
  transition={{ duration: 150 }}
/>`,
  },
  vue: {
    lang: "vue",
    title: "Vue — transition prop",
    code: `<template>
  <ThemeScope theme="plum-dark" />
  <ThemeScope theme="plum-dark" :transition="false" />
  <ThemeScope
    theme="plum-dark"
    :transition="{ duration: 150 }"
  />
</template>`,
  },
  svelte: {
    lang: "svelte",
    title: "Svelte — transition prop",
    code: `<ThemeScope theme="plum-dark" />

<ThemeScope theme="plum-dark" transition={false} />

<ThemeScope
  theme="plum-dark"
  transition={{ duration: 150 }}
/>`,
  },
  solid: {
    lang: "tsx",
    title: "Solid — transition prop",
    code: `import { ThemeScope } from "@themvora/solid";

<ThemeScope theme="plum-dark" />

<ThemeScope theme="plum-dark" transition={false} />

<ThemeScope
  theme="plum-dark"
  transition={{ duration: 150 }}
/>`,
  },
  angular: {
    lang: "ts",
    title: "Angular — transition directive",
    code: `import { Component } from "@angular/core";
import { ThemeScopeDirective } from "@themvora/angular";

@Component({
  selector: "app-scope",
  template: \`
    <div [themvoraScope]="'plum-dark'"></div>
    <div
      [themvoraScope]="'plum-dark'"
      [themvoraScopeTransition]="{ duration: 150 }"
    ></div>
  \`,
  standalone: true,
  imports: [ThemeScopeDirective],
})
export class ScopeComponent {}`,
  },
  web: {
    lang: "html",
    title: "Web — scope element",
    code: `<themvora-scope theme="plum-dark"></themvora-scope>

<themvora-scope
  theme="plum-dark"
  theme-transition='{"duration":150}'
></themvora-scope>`,
    vite: webViteSnippet,
  },
  tailwind: {
    lang: "css",
    title: "Tailwind — CSS variables",
    code: `/* Tailwind scopes use CSS custom properties.
   Transitions work via the core runtime's
   transition engine — no Tailwind-specific
   configuration needed. */
.scoped-plum {
  --theme-color-primary: theme(colors.plum.700);
  --theme-color-background: theme(colors.plum.50);
}`,
  },
  astro: {
    lang: "astro",
    title: "Astro — transition prop",
    code: `---
import { ThemeScope } from "@themvora/astro/client";
---

<ThemeScope theme="plum-dark" />

<ThemeScope
  theme="plum-dark"
  transition={{ duration: 150 }}
/>`,
  },
  nuxt: {
    lang: "vue",
    title: "Nuxt — transition prop",
    code: `<template>
  <ThemeScope theme="plum-dark" />
  <ThemeScope
    theme="plum-dark"
    :transition="{ duration: 150 }"
  />
</template>`,
  },
  remix: {
    lang: "tsx",
    title: "Remix — transition prop",
    code: `"use client";

import { ThemeScope } from "@themvora/remix";

<ThemeScope theme="plum-dark" />

<ThemeScope theme="plum-dark" transition={false} />

<ThemeScope
  theme="plum-dark"
  transition={{ duration: 150 }}
/>`,
  },
};

export const nestedScopeExamples: Record<string, Snippet> = {
  react: {
    lang: "tsx",
    title: "React — nested scopes",
    code: `<ThemeProvider>
  <ThemeScope theme="mint-light">
    <Dashboard />

    <ThemeScope theme="plum-dark">
      <CodeEditor />
    </ThemeScope>
  </ThemeScope>
</ThemeProvider>`,
  },
  next: {
    lang: "tsx",
    title: "Next.js — nested scopes",
    code: `<ThemeProvider>
  <ThemeScope theme="mint-light">
    <Dashboard />

    <ThemeScope theme="plum-dark">
      <CodeEditor />
    </ThemeScope>
  </ThemeScope>
</ThemeProvider>`,
  },
  vue: {
    lang: "vue",
    title: "Vue — nested scopes",
    code: `<template>
  <ThemeProvider>
    <ThemeScope theme="mint-light">
      <Dashboard />

      <ThemeScope theme="plum-dark">
        <CodeEditor />
      </ThemeScope>
    </ThemeScope>
  </ThemeProvider>
</template>`,
  },
  svelte: {
    lang: "svelte",
    title: "Svelte — nested scopes",
    code: `<ThemeProvider>
  <ThemeScope theme="mint-light">
    <Dashboard />

    <ThemeScope theme="plum-dark">
      <CodeEditor />
    </ThemeScope>
  </ThemeScope>
</ThemeProvider>`,
  },
  solid: {
    lang: "tsx",
    title: "Solid — nested scopes",
    code: `<ThemeProvider>
  <ThemeScope theme="mint-light">
    <Dashboard />

    <ThemeScope theme="plum-dark">
      <CodeEditor />
    </ThemeScope>
  </ThemeScope>
</ThemeProvider>`,
  },
  angular: {
    lang: "ts",
    title: "Angular — nested scopes",
    code: `import { Component } from "@angular/core";
import { ThemeScopeDirective } from "@themvora/angular";

@Component({
  selector: "app-dashboard",
  template: \`
    <div [themvoraScope]="'mint-light'">
      <Dashboard />

      <div [themvoraScope]="'plum-dark'">
        <CodeEditor />
      </div>
    </div>
  \`,
  standalone: true,
  imports: [ThemeScopeDirective],
})
export class DashboardComponent {}`,
  },
  web: {
    lang: "html",
    title: "Web — nested scopes",
    code: `<themvora-provider themes="mint-light mint-dark plum-light plum-dark" default-theme="mint-light">
  <themvora-scope theme="mint-light">
    <dashboard-component></dashboard-component>

    <themvora-scope theme="plum-dark">
      <code-editor></code-editor>
    </themvora-scope>
  </themvora-scope>
</themvora-provider>`,
    vite: webViteSnippet,
  },
  tailwind: {
    lang: "css",
    title: "Tailwind — CSS scopes",
    code: `/* Tailwind scopes are CSS variable islands.
   Nest scoped containers by applying the
   scoped class to nested elements. */
.scoped-mint {
  --theme-color-primary: theme(colors.mint.700);
}

.scoped-plum {
  --theme-color-primary: theme(colors.plum.300);
}`,
  },
  astro: {
    lang: "astro",
    title: "Astro — nested scopes",
    code: `---
import { ThemeProviderClient } from "@themvora/astro/client";
import { ThemeScope } from "@themvora/astro/client";
---
<ThemeProviderClient defaultTheme="light">
  <ThemeScope theme="mint-light">
    <Dashboard />

    <ThemeScope theme="plum-dark">
      <CodeEditor />
    </ThemeScope>
  </ThemeScope>
</ThemeProviderClient>`,
  },
  nuxt: {
    lang: "vue",
    title: "Nuxt — nested scopes",
    code: `<template>
  <ThemeScope theme="mint-light">
    <Dashboard />

    <ThemeScope theme="plum-dark">
      <CodeEditor />
    </ThemeScope>
  </ThemeScope>
</template>`,
  },
  remix: {
    lang: "tsx",
    title: "Remix — nested scopes",
    code: `<ThemeProvider>
  <ThemeScope theme="mint-light">
    <Dashboard />

    <ThemeScope theme="plum-dark">
      <CodeEditor />
    </ThemeScope>
  </ThemeScope>
</ThemeProvider>`,
  },
};
