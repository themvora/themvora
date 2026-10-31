/**
 * The custom-scrollbar guide's snippet corpus.
 *
 * Kept out of `scrollbar-framework.tsx` for one reason: that module is a
 * `"use client"` boundary, and a server component cannot read a value exported
 * from one. The page derives the JavaScript counterpart of every snippet with
 * the TypeScript compiler before render, which means it has to be able to
 * iterate this data on the server. The maps are pure data — no JSX, no hooks —
 * so they live here, are imported by both sides, and cost nothing to share.
 *
 * Nothing in this file may import React, the highlighter, or the compiler: the
 * client bundle pulls it in through the guide.
 */

/**
 * The framework ids the guide can switch between.
 *
 * Declared here rather than in `scrollbar-framework.tsx` because the snippet
 * maps below are keyed by it, and a `"use client"` module is not a legal source
 * for a type the server also needs. The guide re-exports it, so nothing that
 * imported it from there has to change.
 */
export type ScrollbarFramework =
  | "react"
  | "next"
  | "vue"
  | "nuxt"
  | "svelte"
  | "solid"
  | "angular"
  | "astro"
  | "web"
  | "remix"
  | "vanilla";

export type ScrollbarExample = {
  lang: string;
  code: string;
  filename?: string;
};

export const MOUNT_SNIPPETS: Record<ScrollbarFramework, ScrollbarExample> = {
  react: {
    lang: "tsx",
    code: `import { ThemeProvider, ThemeScrollbar } from "@themvora/react";
import { ArrowUp, ArrowDown } from "lucide-react";

export default function Layout({ children }) {
  return (
    <ThemeProvider themes={themes} defaultTheme="light">
      <ThemeScrollbar
        behavior={{ autoHide: true }}
        appearance={{ thickness: 8, radius: 999 }}
        icons={{ up: <ArrowUp />, down: <ArrowDown /> }}
      />
      {children}
    </ThemeProvider>
  );
}`,
  },
  next: {
    lang: "tsx",
    code: `import { ThemeProvider, ThemeScrollbar } from "@themvora/next";
import { ArrowUp, ArrowDown } from "lucide-react";

export default function RootLayout({ children }) {
  return (
    <ThemeProvider
      themes={themes}
      defaultTheme="light"
      scrollbar // server-rendered pre-paint CSS — no flash, no hydration mismatch
    >
      <ThemeScrollbar
        behavior={{ autoHide: true }}
        icons={{ up: <ArrowUp />, down: <ArrowDown /> }}
      />
      {children}
    </ThemeProvider>
  );
}`,
  },
  vue: {
    lang: "vue",
    code: `<script setup lang="ts">
import { ThemeProvider, ThemeScrollbar } from "@themvora/vue";
</script>

<template>
  <ThemeProvider :themes="themes" defaultTheme="light">
    <ThemeScrollbar />
    <slot />
  </ThemeProvider>
</template>`,
  },
  svelte: {
    lang: "svelte",
    code: `<script lang="ts">
  import { ThemeProvider, ThemeScrollbar } from "@themvora/svelte";
</script>

<ThemeProvider {themes} defaultTheme="light">
  <ThemeScrollbar behavior={{ autoHide: true }} />
  {@render children()}
</ThemeProvider>`,
  },
  solid: {
    lang: "tsx",
    code: `import { ThemeProvider, ThemeScrollbar } from "@themvora/solid";

export default function App() {
  return (
    <ThemeProvider themes={themes} defaultTheme="light">
      <ThemeScrollbar />
      <div>{/* your app */}</div>
    </ThemeProvider>
  );
}`,
  },
  angular: {
    lang: "tsx",
    code: `import { Component } from "@angular/core";
import {
  provideTheme,
  ThemeScrollbarDirective,
} from "@themvora/angular";

@Component({
  selector: "app-root",
  template: \`
    <div
      themvoraScrollbar
      [themvoraScrollbarOptions]="{
      behavior: { autoHide: true },
      appearance: { arrows: true },
    }"
    ></div>
    <router-outlet />
  \`,
  standalone: true,
  imports: [ThemeScrollbarDirective],
  providers: [provideTheme()],
})
export class AppComponent {}`,
  },
  astro: {
    lang: "astro",
    // The layout, not a bare tag: `scrollbar` on the provider is what puts the
    // hiding class and CSS in the server-rendered HTML, and the component is
    // what draws the overlay. Shown apart, a reader copies the component into a
    // page and gets a native bar until the first paint after hydration.
    code: `---
// src/layouts/BaseLayout.astro — mount it once, beside the provider.
import Provider from "@themvora/astro/provider.astro";
import ThemeScrollbar from "@themvora/astro/ThemeScrollbar.astro";
import themeConfig from "../../theme.config";
import "../styles.css"; // @import "@themvora/core/scrollbar.css";
---

<Provider config={themeConfig} lang="en" scrollbar bootstrap={false}>
  <ThemeScrollbar
    behavior={{ autoHide: true }}
    appearance={{ thickness: 8, radius: 999 }}
    icons={{ up: "^", down: "v" }}
  />
  <slot />
</Provider>`,
  },
  web: {
    lang: "html",
    code: `<themvora-scrollbar auto-hide thickness="8" radius="999"></themvora-scrollbar>

<script type="module">
  // Registers every <themvora-*> element, including <themvora-scrollbar>, and
  // injects their stylesheet.
  import "@themvora/web";
</script>`,
  },
  nuxt: {
    lang: "vue",
    code: `// nuxt.config.ts
export default defineNuxtConfig({
  modules: ["@themvora/nuxt"],
  themvora: {
    themes,
    defaultTheme: "light",
    scrollbar: true, // server-rendered pre-paint scrollbar CSS
  },
});

// app.vue — ThemeScrollbar is auto-imported by the module
<template>
  <ThemeScrollbar :behavior="{ autoHide: true }" />
  <NuxtPage />
</template>`,
  },
  remix: {
    lang: "tsx",
    code: `import { ThemeProvider, ThemeScrollbar } from "@themvora/remix";

export default function App() {
  return (
    <ThemeProvider themes={themes} defaultTheme="light">
      <ThemeScrollbar behavior={{ autoHide: true }} />
      <Outlet />
    </ThemeProvider>
  );
}`,
  },
  vanilla: {
    lang: "ts",
    code: `import {
  createThemeRuntime,
  createThemeScrollbar,
} from "@themvora/core";
import "@themvora/core/scrollbar.css";
import themes from "./themes";

const runtime = createThemeRuntime({
  themes,
  defaultTheme: "light",
});

// One call mounts the overlay and discovers every scrollable
// container on the page. Returns an OverlayScrollbarHandle (or
// null on SSR / coarse-pointer devices).
const handle = createThemeScrollbar(runtime.store, {
  autoHide: true,
  arrows: true,
  thickness: 8,
  radius: 999,
});

// The strips recolor automatically when the theme changes.
runtime.selection.setMode("dark");`,
  },
};

export const OPTIONS_SNIPPETS: Record<ScrollbarFramework, ScrollbarExample> = {
  react: {
    lang: "tsx",
    code: `<ThemeScrollbar
  behavior={{
    autoHide: true,
    autoHideDelay: 900,
    hoverExpand: false,
    draggable: true,
    clickToJump: true,
    smooth: false,
    overscroll: true,
    axes: ["x", "y"],
    touch: false,
    dir: "ltr",
  }}
  appearance={{
    arrows: true,
    thickness: 8,
    hoverThickness: 12,
    radius: 999,
    minThumbSize: 40,
    offset: 4,
    trackOpacity: 0.2,
    thumbOpacity: 0.7,
    zIndex: 9999,
    duration: 180,
    animationDuration: 180,
    thumbColor: "#ff6b6b",
    trackColor: "#2d2d2d",
    activeThumbColor: "#ff4444",
    thumbHoverColor: "#ff8888",
  }}
  scope={{ include: [".panel"], exclude: [".no-scroll"] }}
  icons={{
    arrow: <ScrollIcon />,
    up: <ArrowUp />,
    down: <ArrowDown />,
    left: <ArrowLeft />,
    right: <ArrowRight />,
    size: 12,
  }}
/>`,
  },
  next: {
    lang: "tsx",
    code: `<ThemeScrollbar
  behavior={{ autoHide: true, clickToJump: true }}
  appearance={{ thickness: 8, radius: 999, hoverThickness: 12 }}
  icons={{ up: <ArrowUp />, down: <ArrowDown /> }}
/>`,
  },
  vue: {
    lang: "vue",
    code: `<template>
  <ThemeScrollbar
    :behavior="{ autoHide: true, clickToJump: true }"
    :appearance="{ thickness: 8, radius: 999, hoverThickness: 12 }"
    :icons="{ up: ArrowUp, down: ArrowDown }"
  />
</template>`,
  },
  svelte: {
    lang: "svelte",
    code: `<ThemeScrollbar
  behavior={{ autoHide: true, clickToJump: true }}
  appearance={{ thickness: 8, radius: 999, hoverThickness: 12 }}
  icons={{ up: ArrowUp, down: ArrowDown }}
/>`,
  },
  solid: {
    lang: "tsx",
    code: `<ThemeScrollbar
  behavior={{ autoHide: true, clickToJump: true }}
  appearance={{ thickness: 8, radius: 999, hoverThickness: 12 }}
  icons={{ up: <ArrowUp />, down: <ArrowDown /> }}
/>`,
  },
  angular: {
    lang: "tsx",
    code: `<div
  themvoraScrollbar
  [themvoraScrollbarOptions]="{
    behavior: { autoHide: true },
    appearance: { arrows: true, thickness: 8, radius: 999, hoverThickness: 12 },
    scope: { include: ['.panel'] },
    icons: { up: chevronUp, down: chevronDown, size: 12 }
  }"
></div>`,
  },
  astro: {
    lang: "astro",
    code: `<ThemeScrollbar
  behavior={{ autoHide: true, hoverExpand: false, axes: ["vertical", "horizontal"] }}
  appearance={{ arrows: true, thickness: 8, radius: 999, minThumbSize: 40, offset: { right: 4, top: 4, bottom: 4 } }}
  scope={{ include: [".panel"], exclude: [".no-scroll"] }}
  icons={{ arrow: "^", up: "^", down: "v", size: 12 }}
/>`,
  },
  web: {
    lang: "html",
    code: `<themvora-scrollbar
  auto-hide
  arrows
  thickness="8"
  radius="999"
  hover-thickness="12"
  arrow-up-icon="data:image/svg+xml,..."
></themvora-scrollbar>`,
  },
  nuxt: {
    lang: "vue",
    code: `// app.vue — same grouped props as Vue
<template>
  <ThemeScrollbar
    :behavior="{ autoHide: true }"
    :appearance="{ thickness: 8, radius: 999 }"
    :icons="{ up: ArrowUp, down: ArrowDown }"
  />
</template>`,
  },
  remix: {
    lang: "tsx",
    code: `<ThemeScrollbar
  behavior={{ autoHide: true, clickToJump: true }}
  appearance={{ thickness: 8, radius: 999 }}
  icons={{ up: <ArrowUp />, down: <ArrowDown /> }}
/>`,
  },
  vanilla: {
    lang: "ts",
    code: `createThemeScrollbar(store, {
  autoHide: true,
  autoHideDelay: 900,
  hoverExpand: false,
  draggable: true,
  clickToJump: true,
  smooth: false,
  overscroll: true,
  axes: ["vertical", "horizontal"],
  touch: false,
  dir: "ltr",
  arrows: true,
  thickness: 8,
  hoverThickness: 12,
  radius: 999,
  minThumbSize: 40,
  offset: 4,
  trackOpacity: 0.2,
  thumbOpacity: 0.7,
  duration: 180,
  animationDuration: 180,
  include: [".panel"],
  exclude: [".no-scroll"],
});`,
  },
};

export const FLASHFREE_SNIPPETS: Partial<
  Record<ScrollbarFramework, ScrollbarExample>
> = {
  next: {
    lang: "tsx",
    code: `// Server-rendered: pass \`scrollbar\` to the Next.js ThemeProvider.
// It inlines createPrePaintScrollbarCSS() into the SSR <head> + the
// tv-scrollbar class — no blocking script, no hydration mismatch.
import { ThemeProvider, ThemeScrollbar } from "@themvora/next";

export default function RootLayout({ children }) {
  return (
    <ThemeProvider themes={themes} defaultTheme="light" scrollbar>
      <ThemeScrollbar behavior={{ autoHide: true }} />
      {children}
    </ThemeProvider>
  );
}`,
  },
  nuxt: {
    lang: "ts",
    code: `// Server-rendered: set \`scrollbar: true\` in the module config.
// Nuxt inlines createPrePaintScrollbarCSS() into the SSR <head> +
// the tv-scrollbar class — no blocking script, no hydration mismatch.
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ["@themvora/nuxt"],
  themvora: {
    themes,
    defaultTheme: "light",
    scrollbar: true,
  },
});`,
  },
  remix: {
    lang: "tsx",
    code: `// Flash-free on Remix: \`scrollbar\` on <ThemeHead> emits the native-bar
// hiding CSS in <head>, and getThemeShellProps(initial, { scrollbar: true })
// renders the \`tv-scrollbar\` class and the theme attributes on <html>.
// Remix owns the document, so the class has to come from your layout: the
// pre-paint script cannot add it without causing a hydration mismatch.
import type { ReactNode } from "react";
import { ThemeHead, getThemeShellProps } from "@themvora/remix";

export function Layout({ children }: { children: ReactNode }) {
  const { initial } = useLoaderData<typeof loader>();

  return (
    <html lang="en" {...getThemeShellProps(initial, { scrollbar: true })}>
      <head>
        <Meta />
        <Links />
        <ThemeHead themes={themes} defaultTheme="light" scrollbar />
      </head>
      <body>{children}</body>
    </html>
  );
}`,
  },
  vanilla: {
    lang: "ts",
    code: `// Server rendered: inline createPrePaintScrollbarCSS() + the
// tv-scrollbar class instead of a blocking <script>.
import { createPrePaintScrollbarCSS } from "@themvora/core";

const head = [
  "<!doctype html>",
  '<html class="tv-scrollbar">',
  '  <head>',
  \`    <style>\${createPrePaintScrollbarCSS()}</style>\`,
  '  </head>',
  "</html>",
].join("\\n");`,
  },
};

export const ARROW_SNIPPETS: Partial<
  Record<ScrollbarFramework, ScrollbarExample>
> = {
  react: {
    lang: "tsx",
    code: `import { ThemeScrollbar } from "@themvora/react";
import { ChevronUp, ChevronDown } from "lucide-react";

// Pass any ReactNode as arrow icons via the icons group
<ThemeScrollbar
  icons={{
    up: <ChevronUp />,
    down: <ChevronDown />,
  }}
/>`,
  },
  next: {
    lang: "tsx",
    code: `import { ThemeScrollbar } from "@themvora/next";

<ThemeScrollbar
  icons={{
    up: <ChevronUp />,
    down: <ChevronDown />,
  }}
/>`,
  },
  vue: {
    lang: "vue",
    code: `<script setup lang="ts">
import { ThemeScrollbar } from "@themvora/vue";
</script>

<template>
  <ThemeScrollbar
    :icons="{
      up: ChevronUp,
      down: ChevronDown,
    }"
  />
</template>`,
  },
  svelte: {
    lang: "svelte",
    code: `<script lang="ts">
  import { ThemeScrollbar } from "@themvora/svelte";
</script>

<ThemeScrollbar
  icons={{
    up: ChevronUp,
    down: ChevronDown,
  }}
/>`,
  },
  solid: {
    lang: "tsx",
    code: `import { ThemeScrollbar } from "@themvora/solid";

<ThemeScrollbar
  icons={{
    up: <ChevronUp />,
    down: <ChevronDown />,
  }}
/>`,
  },
  angular: {
    lang: "ts",
    code: `import { Component } from "@angular/core";
import { ThemeScrollbarDirective } from "@themvora/angular";

@Component({
  selector: "app-root",
  template: \`
    <div
      themvoraScrollbar
      [themvoraScrollbarOptions]="{
        icons: { up: chevronUp, down: chevronDown, size: 12 }
      }"
    ></div>
  \`,
  standalone: true,
  imports: [ThemeScrollbarDirective],
})
export class AppComponent {}`,
  },
  astro: {
    lang: "astro",
    code: `---
import ThemeScrollbar from "@themvora/astro/ThemeScrollbar.astro";
---

<!-- Arrow content is an HTML string: Astro has no client icon components. -->
<ThemeScrollbar icons={{ up: "<b>^</b>", down: "<b>v</b>", size: 12 }} />`,
  },
  web: {
    lang: "html",
    code: `<themvora-scrollbar
  arrow-up-icon="data:image/svg+xml,..."
  arrow-down-icon="data:image/svg+xml,..."
></themvora-scrollbar>`,
  },
  nuxt: {
    lang: "vue",
    code: `<!-- app.vue — ThemeScrollbar is auto-imported -->
<template>
  <ThemeScrollbar
    :icons="{
      up: ChevronUp,
      down: ChevronDown,
    }"
  />
</template>`,
  },
  remix: {
    lang: "tsx",
    code: `import { ThemeScrollbar } from "@themvora/remix";

<ThemeScrollbar
  icons={{
    up: <ChevronUp />,
    down: <ChevronDown />,
  }}
/>`,
  },
  vanilla: {
    lang: "ts",
    code: `// Vanilla JS uses the core options object — pass raw DOM nodes
// (elements / inline SVG) as arrow icons.
createThemeScrollbar(store, {
  arrowUpIcon: document.querySelector("#chevron-up"),
  arrowDownIcon: document.querySelector("#chevron-down"),
});`,
  },
};

export const CONTAINER_SNIPPETS: Partial<
  Record<ScrollbarFramework, ScrollbarExample>
> = {
  react: {
    lang: "tsx",
    code: `import { ThemeScrollbar } from "@themvora/react";

// Scrollbar scoped to a specific container
<ThemeScrollbar
  scope={{ include: [".panel"] }}
/>

<div className="panel" style={{ overflow: "auto", height: 400 }}>
  <LongContent />
</div>`,
  },
  next: {
    lang: "tsx",
    code: `import { ThemeScrollbar } from "@themvora/next";

<ThemeScrollbar
  scope={{ include: [".panel"] }}
/>

<div className="panel" style={{ overflow: "auto", height: 400 }}>
  <LongContent />
</div>`,
  },
  vue: {
    lang: "vue",
    code: `<template>
  <ThemeScrollbar
    :scope="{ include: ['.panel'] }"
  />

  <div class="panel" style="overflow: auto; height: 400px">
    <LongContent />
  </div>
</template>`,
  },
  svelte: {
    lang: "svelte",
    code: `<ThemeScrollbar
  scope={{ include: [".panel"] }}
/>

<div class="panel" style="overflow: auto; height: 400px">
  <LongContent />
</div>`,
  },
  solid: {
    lang: "tsx",
    code: `import { ThemeScrollbar } from "@themvora/solid";

<ThemeScrollbar
  scope={{ include: [".panel"] }}
/>

<div class="panel" style={{ overflow: "auto", height: "400px" }}>
  <LongContent />
</div>`,
  },
  angular: {
    lang: "ts",
    code: `import { Component } from "@angular/core";
import { ThemeScrollbarDirective } from "@themvora/angular";

@Component({
  selector: "app-root",
  template: \`
    <div
      themvoraScrollbar
      [themvoraScrollbarOptions]="{ scope: { include: ['.panel'] } }"
    ></div>

    <div class="panel" style="overflow: auto; height: 400px">
      <long-content />
    </div>
  \`,
  standalone: true,
  imports: [ThemeScrollbarDirective],
})
export class AppComponent {}`,
  },
  astro: {
    lang: "astro",
    code: `<ThemeScrollbar scope={{ include: [".panel"] }} />

<div class="panel" style="overflow: auto; height: 400px">
  <long-content />
</div>`,
  },
  web: {
    lang: "html",
    code: `<themvora-scrollbar include=".panel"></themvora-scrollbar>

<div class="panel" style="overflow: auto; height: 400px">
  <long-content></long-content>
</div>`,
  },
  nuxt: {
    lang: "vue",
    code: `<template>
  <ThemeScrollbar
    :scope="{ include: ['.panel'] }"
  />

  <div class="panel" style="overflow: auto; height: 400px">
    <LongContent />
  </div>
</template>`,
  },
  remix: {
    lang: "tsx",
    code: `import { ThemeScrollbar } from "@themvora/remix";

<ThemeScrollbar
  scope={{ include: [".panel"] }}
/>

<div className="panel" style={{ overflow: "auto", height: 400 }}>
  <LongContent />
</div>`,
  },
  vanilla: {
    lang: "ts",
    code: `import { createThemeScrollbar } from "@themvora/core";

// Scope the overlay to specific containers via the options object
createThemeScrollbar(store, {
  include: [".panel"],
});`,
  },
};
