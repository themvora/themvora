/**
 * The snippets the Animation guide renders, as data.
 *
 * They live here rather than inside `AnimationGuide.tsx` because the guide is a
 * client component: a server page cannot read a value exported from a `"use
 * client"` module, so it could not derive the JavaScript counterpart of these
 * snippets. Keeping the text in a plain module makes it readable from both sides
 * — the guide for display, the page for `javascriptSources`.
 */
export const presetTable = [
  {
    name: "smooth",
    props:
      "color, background(-color), border-color, outline-color, fill, stroke, border-radius, box-shadow, text-shadow, opacity",
    when:
      "Default. Full, rich cross-fade for the whole site — pick this unless you have a reason not to.",
  },
  {
    name: "subtle",
    props:
      "color, background(-color), border-color, outline-color, fill, stroke, box-shadow, opacity",
    when:
      "Lower motion profile — skips radius/shadow/text-shadow so the switch reads quieter.",
  },
  {
    name: "instant",
    props: "none (interpolation disabled)",
    when: "Never interpolate — always a hard, instant switch (also respects reduced motion).",
  },
  {
    name: "[string, ...]",
    props: "exactly the properties you list",
    when:
      "Fine-grained control — e.g. animate only color and background-color, nothing else.",
  },
];

// Concise, API-accurate "enable a transition" snippet per framework.
type ExtraSnippet = { lang: string; title: string; code: string };
type AnimationSnippet = {
  label: string;
  lang: string;
  title: string;
  code: string;
  /** Web only — the same setup through the Vite plugin. */
  vite?: ExtraSnippet;
};

const webViteTransitionSnippet: ExtraSnippet = {
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
  defaultTheme: "light",
  initialMode: "system",
  transition: { enabled: true, preset: "smooth" },
});`,
};

export const enableExamples: Record<string, AnimationSnippet> = {
  react: {
    label: "React",
    lang: "tsx",
    title: "App.tsx",
    code: `import { ThemeProvider } from "@themvora/react";

<ThemeProvider
  defaultTheme="light"
  transition={{ enabled: true, preset: "smooth" }}
>
  <YourApp />
</ThemeProvider>`,
  },
  next: {
    label: "Next.js",
    lang: "tsx",
    title: "app/layout.tsx",
    code: `// app/layout.tsx
import { ThemeProvider } from "@themvora/next";

<ThemeProvider
  defaultTheme="light"
  transition={{ enabled: true, preset: "smooth" }}
>
  {children}
</ThemeProvider>`,
  },
  vue: {
    label: "Vue",
    lang: "vue",
    title: "App.vue",
    code: `<script setup lang="ts">
import { ThemeProvider } from "@themvora/vue";
</script>

<template>
  <ThemeProvider
    defaultTheme="light"
    :transition="{ enabled: true, preset: 'smooth' }"
  >
    <YourApp />
  </ThemeProvider>
</template>`,
  },
  svelte: {
    label: "Svelte",
    lang: "svelte",
    title: "app.svelte",
    code: `<script lang="ts">
  import { ThemeProvider } from "@themvora/svelte";
</script>

<ThemeProvider
  defaultTheme="light"
  transition={{ enabled: true, preset: "smooth" }}
>
  <YourApp />
</ThemeProvider>`,
  },
  solid: {
    label: "Solid",
    lang: "tsx",
    title: "App.tsx",
    code: `import { ThemeProvider } from "@themvora/solid";

export function App() {
  return (
    <ThemeProvider
      defaultTheme="light"
      transition={{ enabled: true, preset: "smooth" }}
    >
      <YourApp />
    </ThemeProvider>
  );
}`,
  },
  angular: {
    label: "Angular",
    lang: "ts",
    title: "app.config.ts",
    code: `// app.config.ts
import { ApplicationConfig } from "@angular/core";
import { provideTheme } from "@themvora/angular";

export const appConfig: ApplicationConfig = {
  providers: [
    provideTheme({
      defaultTheme: "light",
      transition: { enabled: true, preset: "smooth" },
    }),
  ],
};`,
  },
  web: {
    label: "Web Components",
    lang: "html",
    title: "index.html",
    code: `<script type="module">
  import "@themvora/web";
</script>

<themvora-provider
  default-theme="light"
  transition='{"enabled":true,"preset":"smooth"}'
>
  <your-app></your-app>
</themvora-provider>`,
    vite: webViteTransitionSnippet,
  },
  astro: {
    label: "Astro",
    lang: "astro",
    title: "src/pages/index.astro",
    code: `---
import { ThemeProviderClient } from "@themvora/astro/client";
---

<ThemeProviderClient
  defaultTheme="light"
  transition={{ enabled: true, preset: "smooth" }}
/>
<ThemeSwitcher client:load />`,
  },
  tailwind: {
    label: "Tailwind CSS",
    lang: "ts",
    title: "runtime.ts",
    code: `import { createThemeRuntime } from "@themvora/core";

// Tailwind maps tokens to CSS variables (via @import "@themvora/tailwind");
// the actual transition is owned by the runtime in your framework shell.
const runtime = createThemeRuntime({
  defaultTheme: "light",
  transition: { enabled: true, preset: "smooth" },
});`,
  },
  nuxt: {
    label: "Nuxt",
    lang: "ts",
    title: "nuxt.config.ts",
    code: `// nuxt.config.ts
export default defineNuxtConfig({
  modules: ["@themvora/nuxt"],
  themvora: {
    defaultTheme: "light",
    transition: { enabled: true, preset: "smooth" },
  },
});`,
  },
  remix: {
    label: "Remix",
    lang: "tsx",
    title: "app/root.tsx",
    code: `import type { ReactNode } from "react";
import { createThemeDocument } from "@themvora/remix";
import { getBuiltInThemes } from "@themvora/core";

// One static configuration: the loader, the blocking head script, the <html>
// shell and the runtime all read it. The transition is part of that object.
const theming = createThemeDocument({
  themes: getBuiltInThemes(),
  defaultTheme: "light",
  transition: { enabled: true, preset: "smooth" },
});

// app/root.tsx — the loader returns { theme: await theming.resolveInitial(request) }.
export function Layout({ children }: { children: ReactNode }) {
  return <theming.Document>{children}</theming.Document>;
}`,
  },
  vanilla: {
    label: "Vanilla JS",
    lang: "ts",
    title: "main.ts",
    code: `import { createThemeRuntime } from "@themvora/core";

const runtime = createThemeRuntime({
  defaultTheme: "light",
  transition: { enabled: true, preset: "smooth" },
});`,
  },
};

export const viewTransitionSnippet = {
  lang: "ts",
  title: "view-transition.ts",
  code: `import { createThemeRuntime } from "@themvora/core";

const runtime = createThemeRuntime({
  transition: {
    enabled: true,
    useViewTransition: true,
    duration: 300,
  },
});`,
};

/**
 * The animations plugin, as a runtime plugin.
 *
 * It is the explicit route: instead of the runtime's own diff → plan → scan
 * pipeline, the plugin writes a plain CSS `transition` rule onto one element
 * before each theme change and removes it on destroy. Worth showing because it
 * is the only way to animate a target the runtime does not own.
 */
export const animationsPluginSnippet = {
  lang: "ts",
  title: "animations-plugin.ts",
  code: `import { createThemeRuntime, createAnimationsPlugin } from "@themvora/core";

// The plugin applies a CSS transition to the target element before every theme
// change, so the token updates it writes animate instead of snapping.
const runtime = createThemeRuntime({
  plugins: [
    createAnimationsPlugin({
      transition: { enabled: true, duration: 300, easing: "ease-in-out" },
    }),
  ],
});`,
};

/**
 * The plugin's two options.
 *
 * `element` is the one that matters: it defaults to `document.documentElement`,
 * so a widget that themes its own subtree has to name itself or the transition
 * lands on the wrong node.
 */
export const animationsPluginOptionsSnippet = {
  lang: "ts",
  title: "animations-plugin-options.ts",
  code: `import { createAnimationsPlugin } from "@themvora/core";

const plugin = createAnimationsPlugin({
  transition: {
    enabled: true,
    duration: 300,
    easing: "ease-in-out",
    properties: ["color", "background-color", "border-color"],
  },
  // Defaults to document.documentElement. Point it at the element the theme
  // variables are actually written to.
  element: document.querySelector<HTMLElement>("#widget") ?? document.documentElement,
});`,
};

/**
 * The `transition` prop is live — a later render changes the next transition
 * without remounting the provider or re-applying the theme already on screen.
 */
export const liveTransitionSnippet = {
  lang: "tsx",
  title: "live-transition.tsx",
  code: `import { ThemeProvider } from "@themvora/react";

// Renders with an instant switch…
<ThemeProvider transition={false}>
  <App />
</ThemeProvider>;

// …then animates the next change, without a remount.
<ThemeProvider transition={{ duration: 600, easing: "ease-in-out" }}>
  <App />
</ThemeProvider>;`,
};

/**
 * Suppressing one switch.
 *
 * `suppressTransition` wins over whatever the live configuration says, which is
 * what a "apply this theme instantly" action (a first paint, a screenshot, a
 * bulk import) needs.
 */
export const suppressTransitionSnippet = {
  lang: "ts",
  title: "suppress-transition.ts",
  code: `import { createThemeRuntime, getBuiltInThemes } from "@themvora/core";

const runtime = createThemeRuntime({ defaultTheme: "light" });
const themes = getBuiltInThemes();
const target = themes.find((theme) => theme.name === "plum-dark") ?? runtime.store.get();

// One switch, no animation — regardless of the configured transition.
runtime.store.set(target, { suppressTransition: true });`,
};

/**
 * The framework-free equivalent of the live `transition` prop.
 */
export const runtimeConfigureSnippet = {
  lang: "ts",
  title: "configure-transition.ts",
  code: `import { createThemeRuntime } from "@themvora/core";

const runtime = createThemeRuntime({ defaultTheme: "light" });

// Replaces the transition used by subsequent changes; the theme on screen is
// not re-applied.
runtime.configure({ transition: { enabled: true, duration: 600 } });

// The live options, after the update above.
const transition = runtime.transition;`,
};

/**
 * Runtime token updates animate too — they are ordinary theme writes, so the
 * same transition applies.
 */
export const runtimeTokenUpdateSnippet = {
  lang: "tsx",
  title: "runtime-token-update.tsx",
  code: `import { useThemeRuntime } from "@themvora/react";

export function LiveEditor() {
  const runtime = useThemeRuntime();

  function softenCorners() {
    // A token override is a theme change: the configured transition animates
    // the radius variables exactly like a light→dark switch.
    runtime.update({
      radius: { sm: "8px", md: "12px", lg: "16px", xl: "20px" },
    });
  }

  return <button onClick={softenCorners}>Soften all corners</button>;
}`,
};

export const bestPracticesSnippet = {
  lang: "css",
  title: "do-and-dont.css",
  code: `/* ── Tailwind ─────────────────────────────────────────────────────── */
/* ✗ DON'T — animating theme tokens via Tailwind utility classes     */
.btn {
  @apply transition-colors;            /* ← re-eases theme colors → lag */
}
.card {
  @apply transition-all;               /* ← catches managed properties too */
}

/* ✓ DO — animate non-theme properties with Tailwind                  */
.btn {
  @apply transition-transform duration-200;
}
.btn:hover {
  @apply -translate-y-0.5;             /* hover lift — fine */
}

/* ── Native CSS ───────────────────────────────────────────────────── */
/* ✗ DON'T — color transition on themed elements                      */
button {
  transition: background-color 0.3s;   /* ← re-eases inherited var → lag */
}
* {
  transition: color 0.2s, background-color 0.2s; /* ← catches everything */
}

/* ✓ DO — animate properties the theme doesn't manage                 */
.toast {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.card {
  transition: box-shadow 0.2s ease, transform 0.2s ease;
}`,
};

export const frameworkSnippets: Record<string, AnimationSnippet> = {
  react: {
    label: "React",
    lang: "tsx",
    title: "App.tsx",
    code: `import { ThemeProvider, ThemeScope } from "@themvora/react";

export function App() {
  return (
    <ThemeProvider
      defaultTheme="light"
      transition={{ enabled: true, preset: "smooth" }}
    >
      <YourApp />

      {/* Nested region with its own theme + transition */}
      <ThemeScope
        theme="plum-dark"
        transition={{ enabled: true, duration: 300, easing: "ease" }}
      >
        <Widget />
      </ThemeScope>
    </ThemeProvider>
  );
}`,
  },
  next: {
    label: "Next.js",
    lang: "tsx",
    title: "app/layout.tsx",
    code: `// app/layout.tsx
import { ThemeProvider } from "@themvora/next";

export default function RootLayout({ children }) {
  return (
    <ThemeProvider
      defaultTheme="light"
      transition={{ enabled: true, preset: "smooth" }}
    >
      {children}
    </ThemeProvider>
  );
}`,
  },
  vue: {
    label: "Vue",
    lang: "vue",
    title: "App.vue",
    code: `<script setup lang="ts">
import { ThemeProvider, ThemeScope } from "@themvora/vue";
</script>

<template>
  <ThemeProvider
    defaultTheme="light"
    :transition="{ enabled: true, preset: 'smooth' }"
  >
    <YourApp />

    <!-- Nested scoped region -->
    <ThemeScope
      theme="plum-dark"
      :transition="{ enabled: true, duration: 300, easing: 'ease' }"
    >
      <Widget />
    </ThemeScope>
  </ThemeProvider>
</template>`,
  },
  svelte: {
    label: "Svelte",
    lang: "svelte",
    title: "app.svelte",
    code: `<script lang="ts">
  import { ThemeProvider, ThemeScope } from "@themvora/svelte";
</script>

<ThemeProvider
  defaultTheme="light"
  transition={{ enabled: true, preset: "smooth" }}
>
  <YourApp />

  <!-- Nested scoped region -->
  <ThemeScope
    theme="plum-dark"
    transition={{ enabled: true, duration: 300, easing: "ease" }}
  >
    <Widget />
  </ThemeScope>
</ThemeProvider>`,
  },
  solid: {
    label: "Solid",
    lang: "tsx",
    title: "App.tsx",
    code: `import { ThemeProvider, ThemeScope } from "@themvora/solid";

export function App() {
  return (
    <ThemeProvider
      defaultTheme="light"
      transition={{ enabled: true, preset: "smooth" }}
    >
      <YourApp />

      {/* Nested scoped region */}
      <ThemeScope
        theme="plum-dark"
        transition={{ enabled: true, duration: 300, easing: "ease" }}
      >
        <Widget />
      </ThemeScope>
    </ThemeProvider>
  );
}`,
  },
  angular: {
    label: "Angular",
    lang: "ts",
    title: "app.config.ts",
    code: `// app.config.ts
import { ApplicationConfig } from "@angular/core";
import { provideTheme } from "@themvora/angular";

export const appConfig: ApplicationConfig = {
  providers: [
    provideTheme({
      defaultTheme: "light",
      transition: { enabled: true, preset: "smooth" },
    }),
  ],
};

// app.component.html
<app-root>
  <your-app></your-app>

  <!-- Nested scoped region via directive -->
  <div
    themvoraScope="plum-dark"
    themvoraScopeTransition="{ enabled: true, duration: 300, easing: 'ease' }"
  >
    <app-widget></app-widget>
  </div>
</app-root>`,
  },
  web: {
    label: "Web Components",
    lang: "html",
    title: "index.html",
    code: `<script type="module">
  import "@themvora/web";
</script>

<themvora-provider
  default-theme="light"
  transition='{"enabled":true,"preset":"smooth"}'
>
  <your-app></your-app>

  <themvora-scope
    theme="plum-dark"
    theme-transition='{"enabled":true,"duration":300,"easing":"ease"}'
  >
    <your-widget></your-widget>
  </themvora-scope>
</themvora-provider>`,
    vite: webViteTransitionSnippet,
  },
  tailwind: {
    label: "Tailwind CSS",
    lang: "css",
    title: "globals.css",
    code: `@import "tailwindcss";
@import "@themvora/tailwind";

/* Tailwind is a CSS layer — transitions are owned by the runtime
   (React/Vue/Svelte shell above). Themvora exposes transition
   variables so you can animate token-driven utilities. */
@theme {
  --transition-duration: 300ms;
  --transition-easing: cubic-bezier(0.4, 0, 0.2, 1);
}

.bg-primary { transition: background-color var(--transition-duration) var(--transition-easing); }`,
  },
  astro: {
    label: "Astro",
    lang: "astro",
    title: "src/pages/index.astro",
    code: `---
import { ThemeProviderClient } from "@themvora/astro/client";
---

<html>
  <head>
    <title>My site</title>
  </head>
  <body>
    <ThemeProviderClient
      defaultTheme="light"
      transition={{ enabled: true, preset: "smooth" }}
    />
    <ThemeSwitcher client:load />
  </body>
</html>`,
  },
  nuxt: {
    label: "Nuxt",
    lang: "ts",
    title: "nuxt.config.ts",
    code: `// nuxt.config.ts
export default defineNuxtConfig({
  modules: ["@themvora/nuxt"],
  themvora: {
    defaultTheme: "light",
    transition: { enabled: true, preset: "smooth" },
  },
});

// app.vue
<template>
  <ThemeProvider :transition="{ enabled: true, preset: 'smooth' }">
    <NuxtPage />

    <!-- Nested scoped region -->
    <ThemeScope
      theme="plum-dark"
      :transition="{ enabled: true, duration: 300, easing: 'ease' }"
    >
      <Widget />
    </ThemeScope>
  </ThemeProvider>
</template>`,
  },
  remix: {
    label: "Remix",
    lang: "tsx",
    title: "app/root.tsx",
    code: `import type { ReactNode } from "react";
import { createThemeDocument, ThemeScope } from "@themvora/remix";
import { getBuiltInThemes } from "@themvora/core";

// app/root.tsx — the document, the head script and the runtime share this
// configuration, including the transition preset.
const theming = createThemeDocument({
  themes: getBuiltInThemes(),
  defaultTheme: "light",
  transition: { enabled: true, preset: "smooth" },
});

export function Layout({ children }: { children: ReactNode }) {
  return <theming.Document>{children}</theming.Document>;
}

// app/routes/home.tsx — a nested scope in the same runtime.
export default function Home() {
  return (
    <>
      <YourApp />

      {/* Nested scoped region */}
      <ThemeScope
        theme="plum-dark"
        transition={{ enabled: true, duration: 300, easing: "ease" }}
      >
        <Widget />
      </ThemeScope>
    </>
  );
}`,
  },
  vanilla: {
    label: "Vanilla JS",
    lang: "ts",
    title: "main.ts",
    code: `import {
  createThemeRuntime,
  createScopedThemeBinding,
  getBuiltInThemes,
} from "@themvora/core";

// createScopedThemeBinding takes the registry positionally; the built-in set
// (the neutral light/dark pair plus the preset families) is a valid registry,
// so no theme file is needed. createThemeRuntime falls back to it on its own.
const themes = getBuiltInThemes();

// The transition prop is set once, at runtime creation.
const runtime = createThemeRuntime({
  defaultTheme: "light",
  transition: { enabled: true, preset: "smooth" },
});

// Apply a scoped theme inside a vanilla element
const binding = createScopedThemeBinding(themes, element, "plum-dark", {
  transition: { duration: 300, easing: "ease" },
});`,
  },
};

/**
 * The `transition` prop as it appears on a provider — a JSX *attribute*, not a
 * module.
 *
 * It cannot parse as a program, so its badge is `TSX` rather than `TSX / JSX`:
 * a fragment is no evidence that the code around it would be valid JavaScript,
 * and the label must not guess. Keeping it here rather than inline is what lets
 * the page derive that badge on the server.
 */
export const transitionPropSnippet = {
  lang: "tsx",
  title: "React / Next / Svelte / Solid — ThemeProvider",
  code: `transition={{ enabled: true, properties: ["color", "background-color"] }}`,
};

// React Router mounts the same package as Remix, so the configuration is
// identical — only the file that owns the document differs. Reusing the
// entry keeps the two from drifting.
enableExamples["react-router"] = { ...enableExamples.remix!, label: "React Router" };
