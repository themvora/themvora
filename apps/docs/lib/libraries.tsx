import { type ReactElement } from "react";
import { Icon } from "@iconify/react";

const icons = {
  shadcn: <Icon icon="simple-icons:shadcnui" width={24} height={24} />,
  bootstrap: <Icon icon="devicon:bootstrap" width={24} height={24} />,
  daisyui: <Icon icon="simple-icons:daisyui" width={24} height={24} />,
  openprops: <Icon icon="simple-icons:css3" width={24} height={24} />,
  mui: <Icon icon="simple-icons:mui" width={24} height={24} />,
  chakra: <Icon icon="simple-icons:chakraui" width={24} height={24} />,
  antd: <Icon icon="simple-icons:antdesign" width={24} height={24} />,
  mantine: <Icon icon="simple-icons:mantine" width={24} height={24} />,
  unocss: <Icon icon="simple-icons:unocss" width={24} height={24} />,
};

export type LibraryFeature = {
  name: string;
  desc: string;
};

export type LibraryGroup = {
  label: string;
  features: LibraryFeature[];
};

export type LibrarySnippet = {
  title: string;
  lang: string;
  code: string;
};

/**
 * One framework's version of the whole recipe.
 *
 * The page shows a framework picker, and **every snippet below it has to follow
 * that choice** — otherwise picking Next.js leaves the reader looking at React
 * code, which is worse than not offering the picker at all. Each field falls
 * back to the library-level snippet when a framework has not been written yet.
 */
export type FrameworkSnippet = { lang: string; code: string };

export type LibraryFrameworkExample = {
  label: string;
  lang: string;
  /** The adapter wiring for this framework. */
  code: string;
  /** File name shown above the snippet. */
  filename?: string | undefined;
  /** Mounting ThemeProvider — the entry file differs per framework. */
  mountProvider?: FrameworkSnippet | undefined;
  /** The complete app. */
  completeExample?: FrameworkSnippet | undefined;
  /** Ordinary library components. */
  componentExample?: FrameworkSnippet | undefined;
  /** Switching theme at runtime. */
  themeSwitchExample?: FrameworkSnippet | undefined;
  /** The same thing without Themvora. */
  beforeExample?: FrameworkSnippet | undefined;
};

/**
 * How the adapter bridges Themvora and the library.
 *
 * This is the field that does the most work on the page: it selects the
 * "How it works" diagram, and it is the honest answer to the question readers
 * keep asking — why aren't all the adapters built the same way?
 *
 * - `generated-theme` — Themvora builds the library's *native theme object*
 *   and hands it to the library's own provider. MUI, Chakra, Mantine, Ant Design.
 * - `css-variable` — Themvora writes the library's *own CSS custom properties*
 *   and the library's stylesheet consumes them. shadcn, Bootstrap, DaisyUI,
 *   Open Props.
 * - `build-time` — the mapping is compiled, not resolved at runtime.
 */
export type LibraryArchitecture = "css-variable" | "generated-theme" | "build-time";

/** One row of the "what gets mapped" table. */
export type LibraryMapping = {
  /** Themvora's semantic role, e.g. `primaryForeground`. */
  role: string;
  /** How the target library spells it, e.g. `palette.primary.contrastText`. */
  target: string;
};

export type LibraryItem = {
  slug: string;
  name: string;
  icon: ReactElement;
  pkg: string;
  tagline: string;
  mark: string;
  tags: string[];
  kind: string;
  groups: LibraryGroup[];
  snippet2: LibrarySnippet;
  frameworks?: LibraryFrameworkExample[] | undefined;
  /** Import path for the adapter's CSS file (e.g. "@themvora/shadcn/shadcn.css").
   *  Only adapters that map CSS variables ship a stylesheet; others are
   *  runtime-only and need no CSS import. */
  css?: string | undefined;
  featureCount: number;

  // ---------------------------------------------------------------------
  // Integration-recipe fields.
  //
  // The page used to be an adapter API page: it assumed the UI library was
  // already installed and stopped at the provider. Both are dead ends for
  // someone who arrives saying "I use MUI" — so these carry the rest of the
  // recipe. `architecture` and `install` are set for every library; the code
  // examples are filled in per library as they are written.
  // ---------------------------------------------------------------------

  /** The UI library's own documentation. */
  officialUrl: string;
  /** How the adapter bridges the two — decides the diagram. */
  architecture: LibraryArchitecture;
  /** Two separate commands: theirs, then ours. */
  install: { library: string[]; themvora: string[] };
  /** The app half: your components plus the provider that bridges them. */
  quickStart?: LibrarySnippet | undefined;
  /** The root half: mounting ThemeProvider. Separate because someone adding
   *  Themvora to an existing app needs this, and someone starting fresh needs
   *  both — one combined block makes each scroll past the other's half. */
  quickStartRoot?: LibrarySnippet | undefined;
  /** Ordinary library components. No Themvora props anywhere. */
  componentExample?: LibrarySnippet | undefined;
  /** Switching theme at runtime, with real components underneath. */
  themeSwitchExample?: LibrarySnippet | undefined;
  /** What you'd write instead, without Themvora. */
  beforeExample?: LibrarySnippet | undefined;
  /** Themvora role → library token. */
  mapping?: LibraryMapping[] | undefined;
};

type RawLibrary = Omit<LibraryItem, "featureCount">;

function cssAdapterFrameworks(opts: {
  hook: string;
  injectable: string;
  pkg: string;
}): LibraryFrameworkExample[] {
  const { hook, injectable, pkg } = opts;
  return [
    {
      label: "React",
      lang: "tsx",
      code: `import { useThemeRuntime } from "@themvora/react";
import { ${hook} } from "${pkg}/react";

export function InstallAdapter() {
  ${hook}(useThemeRuntime());
  return null;
}`,
    },
    {
      label: "Vue 3",
      lang: "vue",
      code: `<script setup lang="ts">
import { useThemeRuntime } from "@themvora/vue";
import { ${hook} } from "${pkg}/vue";

${hook}(useThemeRuntime());
</script>

<template>
</template>`,
    },
    {
      label: "Svelte",
      lang: "svelte",
      code: `<script lang="ts">
  import { getThemeRuntime } from "@themvora/svelte";
  import { ${hook} } from "${pkg}/svelte";

  ${hook}(getThemeRuntime());
</script>`,
    },
    {
      label: "Solid",
      lang: "tsx",
      code: `import { useThemeRuntime } from "@themvora/solid";
import { ${hook} } from "${pkg}/solid";

export function InstallAdapter() {
  ${hook}(useThemeRuntime());
  return null;
}`,
    },
    {
      label: "Angular",
      lang: "ts",
      code: `import { Component } from "@angular/core";
import { injectThemeRuntime } from "@themvora/angular";
import { ${injectable} } from "${pkg}/angular";

@Component({
  selector: "app-root",
  standalone: true,
  template: "<router-outlet />",
})
export class AppComponent {
  constructor() {
    // A constructor is an injection context — registers on provideTheme()'s runtime.
    ${injectable}(injectThemeRuntime());
  }
}`,
    },
    {
      label: "Next.js",
      lang: "tsx",
      code: `"use client";
import { useThemeRuntime } from "@themvora/next/client";
import { ${hook} } from "${pkg}/react";

export function InstallAdapter() {
  ${hook}(useThemeRuntime());
  return null;
}`,
    },
    {
      label: "Nuxt",
      lang: "vue",
      code: `<script setup lang="ts">
import { useThemeRuntime } from "@themvora/nuxt";
import { ${hook} } from "${pkg}/vue";

// The module already provides the runtime — just mount this in your app.
${hook}(useThemeRuntime());
</script>

<template>
</template>`,
    },
    {
      label: "Remix",
      lang: "tsx",
      code: `import { useThemeRuntime } from "@themvora/remix";
import { ${hook} } from "${pkg}/react";

export function InstallAdapter() {
  ${hook}(useThemeRuntime());
  return null;
}`,
    },
    {
      label: "Astro",
      lang: "tsx",
      code: `import { ThemeProviderClient, useThemeRuntime } from "@themvora/astro/client";
import { ${hook} } from "${pkg}/react";

function InstallAdapter() {
  ${hook}(useThemeRuntime());
  return null;
}

// ThemeProviderClient installs the runtime; the adapter is a sibling that reads it.
export default function ThemeIsland() {
  return (
    <>
      <ThemeProviderClient initialMode="system" />
      <InstallAdapter />
    </>
  );
}`,
    },
  ];
}

function generatedThemeFrameworks(opts: {
  provider: string;
  pkg: string;
}): LibraryFrameworkExample[] {
  const { provider, pkg } = opts;
  return [
    {
      label: "React",
      lang: "tsx",
      code: `import type { ReactNode } from "react";
import { useThemeRuntime } from "@themvora/react";
import { ${provider} } from "${pkg}";

// Rebuilds the library's native theme on every change.
export function ThemeZone({ children }: { children: ReactNode }) {
  const runtime = useThemeRuntime();
  return <${provider} runtime={runtime}>{children}</${provider}>;
}`,
    },
    {
      label: "Next.js",
      lang: "tsx",
      code: `"use client";
import type { ReactNode } from "react";
import { ${provider} } from "${pkg}";
import { useThemeRuntime } from "@themvora/next/client";

export function ThemeZone({ children }: { children: ReactNode }) {
  const runtime = useThemeRuntime();
  return <${provider} runtime={runtime}>{children}</${provider}>;
}`,
    },
    {
      label: "Remix",
      lang: "tsx",
      code: `import type { ReactNode } from "react";
import { ${provider} } from "${pkg}";
import { useThemeRuntime } from "@themvora/remix";

export function ThemeZone({ children }: { children: ReactNode }) {
  const runtime = useThemeRuntime();
  return <${provider} runtime={runtime}>{children}</${provider}>;
}`,
    },
    {
      label: "Astro",
      lang: "tsx",
      code: `// src/components/ThemeZone.tsx (client island)
import type { ReactNode } from "react";
import { useThemeRuntime } from "@themvora/astro/client";
import { ${provider} } from "${pkg}";

export default function ThemeZone({ children }: { children: ReactNode }) {
  const runtime = useThemeRuntime();
  return <${provider} runtime={runtime}>{children}</${provider}>;
}

// In your page — ThemeProviderClient installs the shared runtime first:
//   <ThemeProviderClient client:only="react" />
//   <ThemeZone client:only="react">{/* … */}</ThemeZone>`,
    },
  ];
}

function unocssFrameworkExample(): LibraryFrameworkExample[] {
  return [
    {
      label: "Any framework",
      lang: "ts",
      code: `// vite.config.ts — the preset exposes Themvora tokens as utilities such as
// \`bg-primary\`, \`text-foreground\`, \`border-border\` and \`rounded-lg\`. Their
// values reference the live \`--theme-*\` variables, so they follow whichever
// theme is active at runtime — no rebuild needed when the theme changes.
import { defineConfig } from "vite";
import UnoCSS from "unocss/vite";
import { presetWind3 } from "unocss";
import { presetThemvora } from "@themvora/unocss";

export default defineConfig({
  plugins: [UnoCSS({ presets: [presetWind3(), presetThemvora()] })],
});`,
    },
  ];
}

export const rawLibraries: RawLibrary[] = [
  {
    slug: "shadcn",
    name: "shadcn/ui",
    icon: icons.shadcn,
    pkg: "@themvora/shadcn",
    tagline:
      "Drive shadcn/ui components with Themvora semantic tokens via a CSS-variable adapter that stays in sync at runtime.",
    mark: "SH",
    mapping: [
      { role: "background", target: "--background" },
      { role: "foreground", target: "--foreground" },
      { role: "card", target: "--card" },
      { role: "cardForeground", target: "--card-foreground" },
      { role: "primary", target: "--primary" },
      { role: "primaryForeground", target: "--primary-foreground" },
      { role: "secondary", target: "--secondary" },
      { role: "muted", target: "--muted" },
      { role: "mutedForeground", target: "--muted-foreground" },
      { role: "accent", target: "--accent" },
      { role: "destructive", target: "--destructive" },
      { role: "border", target: "--border" },
      { role: "ring", target: "--ring" },
    ],

    officialUrl: "https://ui.shadcn.com/docs/installation/vite",
    architecture: "css-variable",
    install: {
      library: ["pnpm dlx shadcn@latest init","pnpm dlx shadcn@latest add button card"],
      themvora: ["pnpm add @themvora/core @themvora/react @themvora/shadcn"],
    },
    quickStart: {
      title: "A complete example",
      lang: "tsx",
      code: `import { ThemeProvider, useThemeRuntime } from "@themvora/react";
import { useShadcnTheme } from "@themvora/shadcn/react";
import "@themvora/shadcn/shadcn.css";

import { Example } from "./Example";

// No provider to mount: the hook registers the adapter, which writes the
// library's own CSS variables. The import above is what makes them apply.
function ThemeZone() {
  useShadcnTheme(useThemeRuntime());

  return <Example />;
}

export default function App() {
  return (
    <ThemeProvider defaultTheme="plum-light" initialMode="system">
      <ThemeZone />
    </ThemeProvider>
  );
}`,
    },
    componentExample: {
      title: "Ordinary shadcn components",
      lang: "tsx",
      code: `// src/Example.tsx
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function Example() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Themvora + shadcn/ui</CardTitle>
      </CardHeader>
      <CardContent>
        <Button>Primary action</Button>
      </CardContent>
    </Card>
  );
}`,
    },
    themeSwitchExample: {
      title: "Switch theme at runtime",
      lang: "tsx",
      code: `import { useTheme } from "@themvora/react";

export function ThemeControls() {
  const { setMode, toggleTheme } = useTheme();

  return (
    <>
      <button onClick={toggleTheme}>Toggle</button>
      <button onClick={() => setMode("light")}>Light</button>
      <button onClick={() => setMode("dark")}>Dark</button>
    </>
  );
}`,
    },
    frameworks: cssAdapterFrameworks({
      hook: "useShadcnTheme",
      injectable: "injectShadcnTheme",
      pkg: "@themvora/shadcn",
    }),
    kind: "CSS Variables",
    css: "@themvora/shadcn/shadcn.css",
    tags: ["Radix", "CSS vars", "Runtime"],
    groups: [
      {
        label: "Adapter",
        features: [
          {
            name: "createShadcnAdapter(options)",
            desc: "Installs a tagged `:root` style element whose `--*` variables (colors, radius, border, shadow, typography) update as the theme changes.",
          },
          {
            name: "createShadcnVariables(tokens)",
            desc: "Deprecated — prefer `createShadcnAdapter`. Generates the shadcn CSS-variable map from a token set (`theme.tokens`), without touching the DOM. Passing a theme definition yields empty values.",
          },
          {
            name: "useShadcnTheme(runtime, options?)",
            desc: "React hook (from `@themvora/shadcn/react`) that installs and disposes the adapter onto an explicit runtime. Call once in your app root.",
          },
          {
            name: "injectShadcnCSS()",
            desc: "Idempotent, SSR-safe helper that injects the shadcn compatibility stylesheet. Called automatically by the hook.",
          },
        ],
      },
      {
        label: "Options",
        features: [
          {
            name: "CreateShadcnAdapterOptions",
            desc: "Accepts `strategy` to hand a custom token→variable mapping to the adapter.",
          },
          {
            name: "ShadcnAdapterOptions",
            desc: "Typed options for how semantic tokens map to shadcn CSS custom properties.",
          },
        ],
      },
    ],
    snippet2: {
      title: "Standalone variables",
      lang: "ts",
      code: `import { createShadcnVariables } from "@themvora/shadcn";
import { getBuiltInThemes } from "@themvora/core";

// These factories read \`tokens\` as-is — pass the token set, not a theme and
// not a \`{ family, mode }\` pair. Built-in themes ship a complete token set.
const [theme] = getBuiltInThemes();

const css = createShadcnVariables(theme.tokens!);
// css -> { "--background": "#f8fafc", "--foreground": "#0f172a", … }`,
    },
  },
  {
    slug: "bootstrap",
    name: "Bootstrap",
    icon: icons.bootstrap,
    pkg: "@themvora/bootstrap",
    tagline:
      "Compile Bootstrap 5 with Themvora semantic tokens through a CSS-variable adapter that refreshes variables as themes change.",
    mark: "BS",
    mapping: [
      { role: "primary", target: "--bs-primary" },
      { role: "secondary", target: "--bs-secondary" },
      { role: "destructive", target: "--bs-danger" },
      { role: "background", target: "--bs-body-bg" },
      { role: "foreground", target: "--bs-body-color" },
      { role: "border", target: "--bs-border-color" },
      { role: "radius", target: "--bs-border-radius" },
    ],

    officialUrl: "https://getbootstrap.com/docs/5.3/getting-started/download/",
    architecture: "css-variable",
    install: {
      library: ["pnpm add bootstrap"],
      themvora: ["pnpm add @themvora/core @themvora/react @themvora/bootstrap"],
    },
    quickStart: {
      title: "A complete example",
      lang: "tsx",
      code: `import { ThemeProvider, useThemeRuntime } from "@themvora/react";
import { useBootstrapTheme } from "@themvora/bootstrap/react";
import "@themvora/bootstrap/bootstrap.css";

import { Example } from "./Example";

// No provider to mount: the hook registers the adapter, which writes the
// library's own CSS variables. The import above is what makes them apply.
function ThemeZone() {
  useBootstrapTheme(useThemeRuntime());

  return <Example />;
}

export default function App() {
  return (
    <ThemeProvider defaultTheme="plum-light" initialMode="system">
      <ThemeZone />
    </ThemeProvider>
  );
}`,
    },
    componentExample: {
      title: "Ordinary bootstrap components",
      lang: "tsx",
      code: `// src/Example.tsx
export function Example() {
  return (
    <div className="card">
      <div className="card-body">
        <h5 className="card-title">Themvora + Bootstrap</h5>
        <button type="button" className="btn btn-primary">
          Primary action
        </button>
      </div>
    </div>
  );
}`,
    },
    themeSwitchExample: {
      title: "Switch theme at runtime",
      lang: "tsx",
      code: `import { useTheme } from "@themvora/react";

export function ThemeControls() {
  const { setMode, toggleTheme } = useTheme();

  return (
    <>
      <button onClick={toggleTheme}>Toggle</button>
      <button onClick={() => setMode("light")}>Light</button>
      <button onClick={() => setMode("dark")}>Dark</button>
    </>
  );
}`,
    },
    frameworks: cssAdapterFrameworks({
      hook: "useBootstrapTheme",
      injectable: "injectBootstrapTheme",
      pkg: "@themvora/bootstrap",
    }),
    kind: "CSS Variables",
    css: "@themvora/bootstrap/bootstrap.css",
    tags: ["v5", "Sass", "Runtime"],
    groups: [
      {
        label: "Adapter",
        features: [
          {
            name: "createBootstrapAdapter(options)",
            desc: "Maintains a tagged `:root` style element with concrete Bootstrap variables, including derived color pairs, kept in sync at runtime.",
          },
          {
            name: "createBootstrapVariables(tokens)",
            desc: "Produces the concrete Bootstrap CSS custom-property map from a token set (`theme.tokens`) — no DOM required. A theme definition leaves the derived color pairs empty.",
          },
          {
            name: "useBootstrapTheme(runtime, options?)",
            desc: "React hook (from `@themvora/bootstrap/react`) that installs and disposes the adapter on the current runtime.",
          },
          {
            name: "injectBootstrapCSS()",
            desc: "SSR-safe, idempotent helper that injects Bootstrap compatibility CSS on first use.",
          },
        ],
      },
      {
        label: "Options",
        features: [
          {
            name: "CreateBootstrapAdapterOptions",
            desc: "Accepts `strategy` to customize how tokens become Bootstrap variables.",
          },
          {
            name: "BootstrapAdapterOptions",
            desc: "Options covering derived-color handling (e.g. primary/tint pairs) and defaults.",
          },
        ],
      },
    ],
    snippet2: {
      title: "Static variables",
      lang: "ts",
      code: `import { createBootstrapVariables } from "@themvora/bootstrap";
import { getBuiltInThemes } from "@themvora/core";

// Pass the token set — a \`{ family, mode }\` pair is not a ThemeTokens and
// silently yields empty values ("--bs-body-bg": "").
const [theme] = getBuiltInThemes();

const css = createBootstrapVariables(theme.tokens!);
// css -> { "--bs-body-bg": "#f8fafc", "--bs-body-color": "#0f172a", … }`,
    },
  },
  {
    slug: "daisyui",
    name: "daisyUI",
    icon: icons.daisyui,
    pkg: "@themvora/daisyui",
    tagline:
      "Wire daisyUI components to Themvora semantic tokens with a CSS-variable adapter that stays in sync as themes and modes change.",
    mark: "DU",
    mapping: [
      { role: "background", target: "--color-base-100" },
      { role: "secondary", target: "--color-base-200" },
      { role: "border", target: "--color-base-300" },
      { role: "foreground", target: "--color-base-content" },
      { role: "primary", target: "--color-primary" },
      { role: "primaryForeground", target: "--color-primary-content" },
      { role: "secondary", target: "--color-secondary" },
      { role: "secondaryForeground", target: "--color-secondary-content" },
      { role: "accent", target: "--color-accent" },
      { role: "muted", target: "--color-neutral" },
      { role: "mutedForeground", target: "--color-neutral-content" },
      { role: "destructive", target: "--color-error" },
      { role: "destructiveForeground", target: "--color-error-content" },
    ],

    officialUrl: "https://daisyui.com/docs/install/",
    architecture: "css-variable",
    install: {
      library: ["pnpm add daisyui tailwindcss @tailwindcss/vite"],
      themvora: ["pnpm add @themvora/core @themvora/react @themvora/daisyui"],
    },
    quickStart: {
      title: "A complete example",
      lang: "tsx",
      code: `import { ThemeProvider, useThemeRuntime } from "@themvora/react";
import { useDaisyTheme } from "@themvora/daisyui/react";
import "@themvora/daisyui/daisyui.css";

import { Example } from "./Example";

// No provider to mount: the hook registers the adapter, which writes the
// library's own CSS variables. The import above is what makes them apply.
function ThemeZone() {
  useDaisyTheme(useThemeRuntime());

  return <Example />;
}

export default function App() {
  return (
    <ThemeProvider defaultTheme="plum-light" initialMode="system">
      <ThemeZone />
    </ThemeProvider>
  );
}`,
    },
    componentExample: {
      title: "Ordinary daisyui components",
      lang: "tsx",
      code: `// src/Example.tsx
export function Example() {
  return (
    <div className="d-card">
      <div className="d-card-body">
        <h4 className="d-card-title">Themvora + daisyUI</h4>
        <p className="text-base-content/70">This is an ordinary daisyUI card.</p>
        <button className="d-btn d-btn-primary">Primary action</button>
      </div>
    </div>
  );
}`,
    },
    themeSwitchExample: {
      title: "Switch theme at runtime",
      lang: "tsx",
      code: `import { useTheme } from "@themvora/react";

export function ThemeControls() {
  const { setMode, toggleTheme } = useTheme();

  return (
    <>
      <button onClick={toggleTheme}>Toggle</button>
      <button onClick={() => setMode("light")}>Light</button>
      <button onClick={() => setMode("dark")}>Dark</button>
    </>
  );
}`,
    },
    frameworks: cssAdapterFrameworks({
      hook: "useDaisyTheme",
      injectable: "injectDaisyTheme",
      pkg: "@themvora/daisyui",
    }),
    kind: "CSS Variables",
    css: "@themvora/daisyui/daisyui.css",
    tags: ["Tailwind", "Framework", "Runtime"],
    groups: [
      {
        label: "Adapter",
        features: [
          {
            name: "createDaisyAdapter(options)",
            desc: "Installs a tagged `:root` style element with concrete daisyUI variables (background, foreground, base-100/200/300, primary, etc.).",
          },
          {
            name: "createDaisyVariables(tokens)",
            desc: "Generates the daisyUI CSS custom-property map from a token set (`theme.tokens`). A theme definition collapses the output to radius tokens only.",
          },
          {
            name: "useDaisyTheme(runtime, options?)",
            desc: "React hook (from `@themvora/daisyui/react`) that installs the daisyUI adapter onto an explicit runtime.",
          },
          {
            name: "injectDaisyCSS()",
            desc: "Idempotent, SSR-safe helper to inject daisyUI compatibility CSS.",
          },
        ],
      },
      {
        label: "Options",
        features: [
          {
            name: "CreateDaisyAdapterOptions",
            desc: "Accepts `strategy` to map semantic tokens to daisyUI variables.",
          },
          {
            name: "DaisyAdapterOptions",
            desc: "Options controlling daisyUI variable derivation and defaults.",
          },
        ],
      },
    ],
    snippet2: {
      title: "Static variables",
      lang: "ts",
      code: `import { createDaisyVariables } from "@themvora/daisyui";
import { getBuiltInThemes } from "@themvora/core";

// Pass the token set — a \`{ family, mode }\` pair yields only the radius and
// border variables, with every color missing.
const [theme] = getBuiltInThemes();

const css = createDaisyVariables(theme.tokens!);
// css -> { "--color-base-100": "#f8fafc", "--color-primary": "…", … }`,
    },
  },
  {
    slug: "open-props",
    name: "Open Props",
    icon: icons.openprops,
    pkg: "@themvora/open-props",
    tagline:
      "Expose Themvora semantic tokens as Open Props style variables for any design that uses CSS custom properties.",
    mark: "OP",
    mapping: [
      { role: "background", target: "--color-background" },
      { role: "foreground", target: "--color-foreground" },
      { role: "card", target: "--color-canvas" },
      { role: "muted", target: "--color-muted" },
      { role: "mutedForeground", target: "--color-muted-foreground" },
      { role: "primary", target: "--color-primary" },
      { role: "secondary", target: "--color-secondary" },
      { role: "accent", target: "--color-accent" },
      { role: "destructive", target: "--color-danger" },
      { role: "border", target: "--color-border" },
    ],

    officialUrl: "https://open-props.style/",
    architecture: "css-variable",
    install: {
      library: ["pnpm add open-props"],
      themvora: ["pnpm add @themvora/core @themvora/react @themvora/open-props"],
    },
    quickStart: {
      title: "A complete example",
      lang: "tsx",
      code: `import { ThemeProvider, useThemeRuntime } from "@themvora/react";
import { useOpenPropsTheme } from "@themvora/open-props/react";
import "@themvora/open-props/open-props.css";

import { Example } from "./Example";

// No provider to mount: the hook registers the adapter, which writes the
// library's own CSS variables. The import above is what makes them apply.
function ThemeZone() {
  useOpenPropsTheme(useThemeRuntime());

  return <Example />;
}

export default function App() {
  return (
    <ThemeProvider defaultTheme="plum-light" initialMode="system">
      <ThemeZone />
    </ThemeProvider>
  );
}`,
    },
    componentExample: {
      title: "Ordinary open-props components",
      lang: "tsx",
      code: `// src/Example.tsx
export function Example() {
  return (
    <div
      style={{
        background: "var(--color-surface)",
        color: "var(--color-text)",
        border: "1px solid var(--color-border)",
        borderRadius: "var(--radius-2)",
        padding: "var(--size-3)",
      }}
    >
      <h2>Themvora + Open Props</h2>
      <button
        style={{
          background: "var(--color-primary)",
          color: "var(--color-primary-foreground)",
          borderRadius: "var(--radius-2)",
          padding: "var(--size-2) var(--size-3)",
        }}
      >
        Primary action
      </button>
    </div>
  );
}`,
    },
    themeSwitchExample: {
      title: "Switch theme at runtime",
      lang: "tsx",
      code: `import { useTheme } from "@themvora/react";

export function ThemeControls() {
  const { setMode, toggleTheme } = useTheme();

  return (
    <>
      <button onClick={toggleTheme}>Toggle</button>
      <button onClick={() => setMode("light")}>Light</button>
      <button onClick={() => setMode("dark")}>Dark</button>
    </>
  );
}`,
    },
    frameworks: cssAdapterFrameworks({
      hook: "useOpenPropsTheme",
      injectable: "injectOpenPropsTheme",
      pkg: "@themvora/open-props",
    }),
    kind: "CSS Variables",
    css: "@themvora/open-props/open-props.css",
    tags: ["CSS", "Design tokens", "Runtime"],
    groups: [
      {
        label: "Adapter",
        features: [
          {
            name: "createOpenPropsAdapter(options)",
            desc: "Installs a tagged `:root` style element with concrete `--op-*` variables updated as the theme changes.",
          },
          {
            name: "createOpenPropsVariables(tokens)",
            desc: "Builds the Open Props variable map from a token set (`theme.tokens`). A theme definition leaves the color entries empty.",
          },
          {
            name: "useOpenPropsTheme(runtime, options?)",
            desc: "React hook (from `@themvora/open-props/react`) that installs the Open Props adapter onto an explicit runtime.",
          },
          {
            name: "injectOpenPropsCSS()",
            desc: "Idempotent, SSR-safe helper for injecting Open Props compatibility CSS.",
          },
        ],
      },
      {
        label: "Options",
        features: [
          {
            name: "CreateOpenPropsAdapterOptions",
            desc: "Accepts `strategy` to customize token→variable mapping.",
          },
          {
            name: "OpenPropsAdapterOptions",
            desc: "Options for Open Props variable derivation and defaults.",
          },
        ],
      },
    ],
    snippet2: {
      title: "Static variables",
      lang: "ts",
      code: `import { createOpenPropsVariables } from "@themvora/open-props";
import { getBuiltInThemes } from "@themvora/core";

const [theme] = getBuiltInThemes();

const css = createOpenPropsVariables(theme.tokens!);
// css -> { "--color-canvas": "#f8fafc", "--color-text": "#0f172a", … }`,
    },
  },
  {
    slug: "mui",
    name: "Material UI",
    icon: icons.mui,
    pkg: "@themvora/mui",
    tagline:
      "Derive a Material UI theme from Themvora semantic tokens and rebuild it automatically whenever the active theme changes.",
    mark: "MUI",
    // The complete recipe, in the order someone actually needs it:
    // install both halves, see a real component, then watch it react.
    quickStart: {
      title: "A complete MUI app, themed by Themvora",
      lang: "tsx",
      code: `import { ThemeProvider, useThemeRuntime } from "@themvora/react";
import { MuiThemeProvider } from "@themvora/mui";
import { Button, Card, CardContent, Typography } from "@mui/material";

function App() {
  return (
    <Card>
      <CardContent>
        <Typography variant="h5">Themvora + Material UI</Typography>
        <Typography color="text.secondary">
          This is an ordinary MUI component tree.
        </Typography>
        <Button variant="contained">Continue</Button>
      </CardContent>
    </Card>
  );
}

// Themvora's runtime lives here, and MuiThemeProvider bridges it to MUI.
function ThemedApp() {
  const runtime = useThemeRuntime();

  return (
    <MuiThemeProvider runtime={runtime}>
      <App />
    </MuiThemeProvider>
  );
}

}`,
    },
    // Deliberately a second snippet: the provider half is what you drop into
    // an existing tree, the root half is only for a fresh app. One combined
    // block makes both readers scroll past the part that is not theirs.
    quickStartRoot: {
      title: "Mount the provider",
      lang: "tsx",
      code: `import { ThemeProvider } from "@themvora/react";

import { ThemedApp } from "./App";

// ThemeProvider owns the active theme. Anything inside it can read and change it.
export default function Root() {
  return (
    <ThemeProvider>
      <ThemedApp />
    </ThemeProvider>
  );
}`,
    },
    componentExample: {
      title: "Ordinary MUI components",
      lang: "tsx",
      code: `// src/App.tsx
import { Button, Card, CardContent, Typography } from "@mui/material";

export function Example() {
  return (
    <Card>
      <CardContent>
        <Typography variant="h6">Themvora + Material UI</Typography>
        <Button variant="contained">Primary action</Button>
      </CardContent>
    </Card>
  );
}`,
    },
    themeSwitchExample: {
      title: "Switch theme at runtime",
      lang: "tsx",
      code: `import { useTheme } from "@themvora/react";
import { Button, Stack } from "@mui/material";

function ThemeControls() {
  const { setMode, toggleTheme } = useTheme();

  return (
    <Stack direction="row" spacing={1}>
      <Button onClick={toggleTheme}>Toggle</Button>
      <Button onClick={() => setMode("light")}>Light</Button>
      <Button onClick={() => setMode("dark")}>Dark</Button>
    </Stack>
  );
}`,
    },
    beforeExample: {
      title: "Without Themvora",
      lang: "tsx",
      code: `import { ThemeProvider, createTheme } from "@mui/material/styles";

const theme = createTheme({
  palette: { primary: { main: "#6366f1" } },
});

<ThemeProvider theme={theme}>
  <App />
</ThemeProvider>`,
    },
    mapping: [
      { role: "primary", target: "palette.primary.main" },
      { role: "primaryForeground", target: "palette.primary.contrastText" },
      { role: "secondary", target: "palette.secondary.main" },
      { role: "background", target: "palette.background.default" },
      { role: "card", target: "palette.background.paper" },
      { role: "foreground", target: "palette.text.primary" },
      { role: "mutedForeground", target: "palette.text.secondary" },
      { role: "destructive", target: "palette.error.main" },
      { role: "success", target: "palette.success.main" },
      { role: "border", target: "palette.divider" },
      { role: "radius", target: "shape.borderRadius" },
      { role: "typography.fontFamilies.sans", target: "typography.fontFamily" },
    ],

    officialUrl: "https://mui.com/material-ui/getting-started/installation/",
    architecture: "generated-theme",
    install: {
      library: ["pnpm add @mui/material @emotion/react @emotion/styled"],
      themvora: ["pnpm add @themvora/core @themvora/react @themvora/mui"],
    },
    frameworks: generatedThemeFrameworks({
      provider: "MuiThemeProvider",
      pkg: "@themvora/mui",
    }),
    kind: "Generated Theme",
    tags: ["React", "Provider", "createTheme"],
    groups: [
      {
        label: "Provider",
        features: [
          {
            name: "MuiThemeProvider",
            desc: "Wraps MUI's own `ThemeProvider` with a theme derived from Themvora semantic tokens (palette, shape, typography, shadows, breakpoints).",
          },
          {
            name: "useMuiTheme(runtime)",
            desc: "Subscribes to a Themvora runtime and returns a `Theme` rebuilt whenever the theme changes.",
          },
        ],
      },
      {
        label: "Create",
        features: [
          {
            name: "createMuiTheme(source)",
            desc: "Builds a MUI `Theme` from a theme definition, its tokens, or a runtime.",
          },
          {
            name: "buildMuiThemeOptions(theme)",
            desc: "Maps an `AdapterResolvedTheme` to MUI `ThemeOptions` — colors, spacing, shape, shadows, breakpoints.",
          },
        ],
      },
      {
        label: "Registry",
        features: [
          {
            name: "createMuiAdapter(options)",
            desc: "Framework-neutral `ThemeAdapter` you register via `runtime.adapters.use()` — alternative to the provider, with `getSnapshot`/`subscribe` for use outside React.",
          },
          {
            name: "MUI_ADAPTER_ID",
            desc: "The registry id (`\"mui\"`) used to identify and replace the adapter.",
          },
          {
            name: "CreateMuiAdapterOptions",
            desc: "Options for the registry adapter — including `strategy` for how faithfully tokens map onto MUI's theme.",
          },
          {
            name: "MuiAdapterOptions",
            desc: "Base adapter options type (strategy + defaults) used by both the provider and the registry adapter.",
          },
        ],
      },
    ],
    snippet2: {
      title: "Static theme",
      lang: "ts",
      code: `import { createMuiTheme } from "@themvora/mui";
import { getBuiltInThemes } from "@themvora/core";

// createMuiTheme accepts a runtime, a store, a theme definition, or raw
// tokens. A \`{ family, mode }\` object is none of those — the factory then
// falls back to MUI's stock palette instead of the theme you asked for.
const themes = getBuiltInThemes();
const theme = themes.find((t) => t.name === "mint-light")!;

const muiTheme = createMuiTheme(theme);`,
    },
  },
  {
    slug: "chakra",
    name: "Chakra UI",
    icon: icons.chakra,
    pkg: "@themvora/chakra",
    tagline:
      "Bootstrap a Chakra UI system from Themvora semantic tokens, rebuilt automatically as themes change.",
    mark: "CH",
    mapping: [
      { role: "primary", target: "colors.primary (50–950 scale)" },
      { role: "primaryForeground", target: "colors.primary.contrast" },
      { role: "background", target: "colors.background" },
      { role: "foreground", target: "colors.foreground" },
      { role: "card", target: "colors.card" },
      { role: "muted", target: "colors.muted" },
      { role: "mutedForeground", target: "colors.mutedForeground" },
      { role: "border", target: "colors.border" },
      { role: "ring", target: "colors.ring" },
      { role: "radius", target: "radii.lg" },
    ],

    officialUrl: "https://chakra-ui.com/docs/get-started/installation",
    architecture: "generated-theme",
    install: {
      library: ["pnpm add @chakra-ui/react @emotion/react"],
      themvora: ["pnpm add @themvora/core @themvora/react @themvora/chakra"],
    },
    quickStart: {
      title: "A complete example",
      lang: "tsx",
      code: `import { ThemeProvider, useThemeRuntime } from "@themvora/react";
import { ChakraThemeProvider } from "@themvora/chakra";

import { Example } from "./Example";

// The bridge rebuilds the library's theme whenever Themvora's active theme
// changes. Without it the library keeps its own default theme.
function ThemeZone() {
  const runtime = useThemeRuntime();

  return (
    <ChakraThemeProvider runtime={runtime}>
      <Example />
    </ChakraThemeProvider>
  );
}

export default function App() {
  return (
    <ThemeProvider defaultTheme="plum-light" initialMode="system">
      <ThemeZone />
    </ThemeProvider>
  );
}`,
    },
    componentExample: {
      title: "Ordinary chakra components",
      lang: "tsx",
      code: `// src/Example.tsx
import { Box, Button, Heading, Text } from "@chakra-ui/react";

export function Example() {
  return (
    <Box p="6" borderWidth="1px" borderRadius="lg">
      <Heading size="md">Themvora + Chakra UI</Heading>
      <Text color="fg.muted">This is an ordinary Chakra component tree.</Text>
      <Button colorPalette="primary">Primary action</Button>
    </Box>
  );
}`,
    },
    themeSwitchExample: {
      title: "Switch theme at runtime",
      lang: "tsx",
      code: `import { useTheme } from "@themvora/react";

export function ThemeControls() {
  const { setMode, toggleTheme } = useTheme();

  return (
    <>
      <button onClick={toggleTheme}>Toggle</button>
      <button onClick={() => setMode("light")}>Light</button>
      <button onClick={() => setMode("dark")}>Dark</button>
    </>
  );
}`,
    },
    frameworks: generatedThemeFrameworks({
      provider: "ChakraThemeProvider",
      pkg: "@themvora/chakra",
    }),
    kind: "Generated Theme",
    tags: ["React", "System", "Provider"],
    groups: [
      {
        label: "Provider",
        features: [
          {
            name: "ChakraThemeProvider",
            desc: "Wraps Chakra's `ChakraProvider` with a system derived from Themvora semantic tokens.",
          },
          {
            name: "useChakraTheme(runtime)",
            desc: "Subscribes to a Themvora runtime and returns a Chakra `system` rebuilt on theme changes.",
          },
        ],
      },
      {
        label: "Create",
        features: [
          {
            name: "createChakraTheme(source)",
            desc: "Builds a Chakra UI system from a theme definition, its tokens, or a runtime.",
          },
          {
            name: "buildChakraConfig(theme)",
            desc: "Maps an `AdapterResolvedTheme` to a Chakra `SystemStyleObject`/config shape.",
          },
        ],
      },
      {
        label: "Registry",
        features: [
          {
            name: "createChakraAdapter(options)",
            desc: "Framework-neutral `ThemeAdapter` you register via `runtime.adapters.use()` — alternative to the provider, for use outside React.",
          },
          {
            name: "CHAKRA_ADAPTER_ID",
            desc: "The registry id (`\"chakra\"`) used to identify and replace the adapter.",
          },
          {
            name: "CreateChakraAdapterOptions",
            desc: "Options for the registry adapter — including `strategy` for how faithfully tokens map onto Chakra's system.",
          },
          {
            name: "ChakraAdapterOptions",
            desc: "Base adapter options type (strategy + defaults) used by both the provider and the registry adapter.",
          },
        ],
      },
    ],
    snippet2: {
      title: "Static theme",
      lang: "ts",
      code: `import { createChakraTheme } from "@themvora/chakra";
import { getBuiltInThemes } from "@themvora/core";

const themes = getBuiltInThemes();
const theme = themes.find((t) => t.name === "mint-dark")!;

const system = createChakraTheme(theme);`,
    },
  },
  {
    slug: "antd",
    name: "Ant Design",
    icon: icons.antd,
    pkg: "@themvora/antd",
    tagline:
      "Drive Ant Design's config-based theming from Themvora semantic tokens, rebuilt on every theme change.",
    mark: "AN",
    mapping: [
      { role: "primary", target: "colorPrimary" },
      { role: "background", target: "colorBgLayout" },
      { role: "card", target: "colorBgBase" },
      { role: "popover", target: "colorBgElevated" },
      { role: "foreground", target: "colorTextBase" },
      { role: "border", target: "colorBorder" },
      { role: "destructive", target: "colorError" },
      { role: "success", target: "colorSuccess" },
      { role: "warning", target: "colorWarning" },
    ],

    officialUrl: "https://ant.design/docs/react/getting-started",
    architecture: "generated-theme",
    install: {
      library: ["pnpm add antd"],
      themvora: ["pnpm add @themvora/core @themvora/react @themvora/antd"],
    },
    quickStart: {
      title: "A complete example",
      lang: "tsx",
      code: `import { ThemeProvider, useThemeRuntime } from "@themvora/react";
import { AntdThemeProvider } from "@themvora/antd";

import { Example } from "./Example";

// The bridge rebuilds the library's theme whenever Themvora's active theme
// changes. Without it the library keeps its own default theme.
function ThemeZone() {
  const runtime = useThemeRuntime();

  return (
    <AntdThemeProvider runtime={runtime}>
      <Example />
    </AntdThemeProvider>
  );
}

export default function App() {
  return (
    <ThemeProvider defaultTheme="plum-light" initialMode="system">
      <ThemeZone />
    </ThemeProvider>
  );
}`,
    },
    componentExample: {
      title: "Ordinary antd components",
      lang: "tsx",
      code: `// src/Example.tsx
import { Button, Card, Typography } from "antd";

export function Example() {
  return (
    <Card>
      <Typography.Title level={5}>Themvora + Ant Design</Typography.Title>
      <Typography.Paragraph type="secondary">
        This is an ordinary Ant Design component tree.
      </Typography.Paragraph>
      <Button type="primary">Primary action</Button>
    </Card>
  );
}`,
    },
    themeSwitchExample: {
      title: "Switch theme at runtime",
      lang: "tsx",
      code: `import { useTheme } from "@themvora/react";

export function ThemeControls() {
  const { setMode, toggleTheme } = useTheme();

  return (
    <>
      <button onClick={toggleTheme}>Toggle</button>
      <button onClick={() => setMode("light")}>Light</button>
      <button onClick={() => setMode("dark")}>Dark</button>
    </>
  );
}`,
    },
    frameworks: generatedThemeFrameworks({
      provider: "AntdThemeProvider",
      pkg: "@themvora/antd",
    }),
    kind: "Generated Theme",
    tags: ["React", "ConfigProvider", "Token"],
    groups: [
      {
        label: "Provider",
        features: [
          {
            name: "AntdThemeProvider",
            desc: "Wraps Ant Design's `ConfigProvider` with a `theme` derived from Themvora semantic tokens.",
          },
          {
            name: "useAntdTheme(runtime)",
            desc: "Subscribes to a Themvora runtime and returns an AntD `ThemeConfig` on changes.",
          },
        ],
      },
      {
        label: "Create",
        features: [
          {
            name: "createAntdTheme(source)",
            desc: "Builds an Ant Design `ThemeConfig` from a theme definition, its tokens, or a runtime.",
          },
          {
            name: "buildAntdConfig(theme)",
            desc: "Maps an `AdapterResolvedTheme` to AntD token configuration (colorPrimary, borderRadius, etc.).",
          },
        ],
      },
      {
        label: "Registry",
        features: [
          {
            name: "createAntdAdapter(options)",
            desc: "Framework-neutral `ThemeAdapter` you register via `runtime.adapters.use()` — alternative to the provider, for use outside React.",
          },
          {
            name: "ANTD_ADAPTER_ID",
            desc: "The registry id (`\"antd\"`) used to identify and replace the adapter.",
          },
          {
            name: "CreateAntdAdapterOptions",
            desc: "Options for the registry adapter — including `strategy` for how faithfully tokens map onto Ant Design's config.",
          },
          {
            name: "AntdAdapterOptions",
            desc: "Base adapter options type (strategy + defaults) used by both the provider and the registry adapter.",
          },
        ],
      },
    ],
    snippet2: {
      title: "Static config",
      lang: "ts",
      code: `import { createAntdTheme } from "@themvora/antd";
import { getBuiltInThemes } from "@themvora/core";

const themes = getBuiltInThemes();
const theme = themes.find((t) => t.name === "plum-dark")!;

const config = createAntdTheme(theme);`,
    },
  },
  {
    slug: "mantine",
    name: "Mantine",
    icon: icons.mantine,
    pkg: "@themvora/mantine",
    tagline:
      "Map Theme semantic tokens onto a Mantine theme, with color-scheme forced to match the active Themvora mode.",
    mark: "MN",
    mapping: [
      { role: "primary", target: "primaryColor: \"primary\"" },
      { role: "primary", target: "primaryShade.light / .dark" },
      { role: "primaryForeground", target: "primary.contrast (via variantColorResolver)" },
      { role: "radius", target: "defaultRadius" },
    ],

    officialUrl: "https://mantine.dev/getting-started/",
    architecture: "generated-theme",
    install: {
      library: ["pnpm add @mantine/core @mantine/hooks"],
      themvora: ["pnpm add @themvora/core @themvora/react @themvora/mantine"],
    },
    quickStart: {
      title: "A complete example",
      lang: "tsx",
      code: `import { ThemeProvider, useThemeRuntime } from "@themvora/react";
import { MantineThemeProvider } from "@themvora/mantine";

import { Example } from "./Example";

// The bridge rebuilds the library's theme whenever Themvora's active theme
// changes. Without it the library keeps its own default theme.
function ThemeZone() {
  const runtime = useThemeRuntime();

  return (
    <MantineThemeProvider runtime={runtime}>
      <Example />
    </MantineThemeProvider>
  );
}

export default function App() {
  return (
    <ThemeProvider defaultTheme="plum-light" initialMode="system">
      <ThemeZone />
    </ThemeProvider>
  );
}`,
    },
    componentExample: {
      title: "Ordinary mantine components",
      lang: "tsx",
      code: `// src/Example.tsx
import { Button, Card, Text, Title } from "@mantine/core";

export function Example() {
  return (
    <Card withBorder padding="lg">
      <Title order={5}>Themvora + Mantine</Title>
      <Text c="dimmed">This is an ordinary Mantine component tree.</Text>
      <Button>Primary action</Button>
    </Card>
  );
}`,
    },
    themeSwitchExample: {
      title: "Switch theme at runtime",
      lang: "tsx",
      code: `import { useTheme } from "@themvora/react";

export function ThemeControls() {
  const { setMode, toggleTheme } = useTheme();

  return (
    <>
      <button onClick={toggleTheme}>Toggle</button>
      <button onClick={() => setMode("light")}>Light</button>
      <button onClick={() => setMode("dark")}>Dark</button>
    </>
  );
}`,
    },
    frameworks: generatedThemeFrameworks({
      provider: "MantineThemeProvider",
      pkg: "@themvora/mantine",
    }),
    kind: "Generated Theme",
    tags: ["React", "Provider", "ColorScheme"],
    groups: [
      {
        label: "Provider",
        features: [
          {
            name: "MantineThemeProvider",
            desc: "Wraps Mantine's `MantineProvider`, forcing the color scheme to match the active Themvora mode.",
          },
          {
            name: "useMantineTheme(runtime)",
            desc: "Subscribes to a runtime and returns a Mantine `Theme` rebuilt on changes.",
          },
        ],
      },
      {
        label: "Create",
        features: [
          {
            name: "createMantineTheme(source)",
            desc: "Builds a Mantine theme from a theme definition, its tokens, or a runtime — colors (with generated shades), fonts, radius, spacing, shadows, breakpoints.",
          },
        ],
      },
    ],
    snippet2: {
      title: "Static theme",
      lang: "ts",
      code: `import { createMantineTheme } from "@themvora/mantine";
import { getBuiltInThemes } from "@themvora/core";

const themes = getBuiltInThemes();
const builtIn = themes.find((t) => t.name === "cocoa-dark")!;

const theme = createMantineTheme(builtIn);`,
    },
  },
  {
    slug: "unocss",
    name: "UnoCSS",
    icon: icons.unocss,
    pkg: "@themvora/unocss",
    tagline:
      "Expose Theme semantic tokens as UnoCSS utilities (`bg-primary`, `rounded-lg`) that reference live CSS variables.",
    mark: "UN",
    officialUrl: "https://unocss.dev/integrations/vite",
    architecture: "build-time",
    install: {
      library: ["pnpm add -D unocss @unocss/vite"],
      themvora: ["pnpm add @themvora/core @themvora/react @themvora/unocss"],
    },
    quickStart: {
      title: "A complete example",
      lang: "tsx",
      code: `import { defineConfig } from "unocss";
import { presetThemvora } from "@themvora/unocss";

export default defineConfig({
  presets: [presetThemvora()],
});`,
    },
    componentExample: {
      title: "Ordinary unocss components",
      lang: "tsx",
      code: `// src/Example.tsx
export function Example() {
  return (
    <div className="bg-card text-card-foreground border border-border rounded-lg p-4">
      <h2 className="text-lg font-semibold">Themvora + UnoCSS</h2>
      <button className="bg-primary text-primary-foreground rounded px-4 py-2">
        Primary action
      </button>
    </div>
  );
}`,
    },
    themeSwitchExample: {
      title: "Switch theme at runtime",
      lang: "tsx",
      code: `import { useTheme } from "@themvora/react";

export function ThemeControls() {
  const { setMode, toggleTheme } = useTheme();

  return (
    <>
      <button onClick={toggleTheme}>Toggle</button>
      <button onClick={() => setMode("light")}>Light</button>
      <button onClick={() => setMode("dark")}>Dark</button>
    </>
  );
}`,
    },
    frameworks: unocssFrameworkExample(),
    kind: "Build Time",
    tags: ["UnoCSS", "Preset", "Runtime vars"],
    groups: [
      {
        label: "Preset",
        features: [
          {
            name: "presetThemvora()",
            desc: "UnoCSS preset mapping semantic tokens to utilities: `bg-primary`, `text-foreground`, `border-border`, `rounded-lg`, `shadow-lg`. Values reference `--theme-*` variables and update at runtime.",
          },
          {
            name: "createUnoTheme(source)",
            desc: "Returns a static UnoCSS theme object (colors, radii, shadows) with concrete values for build-time generation.",
          },
        ],
      },
      {
        label: "Types",
        features: [
          {
            name: "ThemeTokens",
            desc: "Re-exports the semantic token shape from `@themvora/core`.",
          },
        ],
      },
    ],
    snippet2: {
      title: "Static theme",
      lang: "ts",
      code: `import { createUnoTheme } from "@themvora/unocss";
import { getBuiltInThemes, resolveTheme } from "@themvora/core";

// A theme definition, not { family } — createUnoTheme takes an AdapterSource.
const themes = getBuiltInThemes();
const theme = createUnoTheme(resolveTheme(themes, "berry-dark"));
// theme.colors.primary === "#..."`,
    },
  },
];


/**
 * Per-framework recipe content.
 *
 * Only the parts that genuinely differ per framework live here — the runtime
 * import and the file you mount the provider in. Everything else falls back to
 * the library-level snippet, so a page stays readable while its per-framework
 * content is incomplete.
 *
 * Astro is the reason this cannot be a find-and-replace: its entries are
 * vanilla (`createThemeController`), not React.
 */
export const FRAMEWORK_RECIPES: Record<string, Record<string, string>> = {
  "unocss/UnoCSS": {
    "mountProvider": "import { defineConfig, presetWind3 } from \"unocss\";\nimport { presetThemvora } from \"@themvora/unocss\";\n\nexport default defineConfig({\n  presets: [presetWind3(), presetThemvora()],\n});",
    "componentExample": "<!-- index.html — the preset exposes Themvora tokens as utilities -->\n<section class=\"bg-card text-card-foreground border border-border rounded-lg p-4\">\n  <h2 class=\"text-lg font-semibold\">Your plan</h2>\n  <p class=\"text-muted-foreground text-sm\">\n    Every utility resolves to a Themvora token.\n  </p>\n  <button class=\"bg-primary text-primary-foreground rounded-lg px-4 py-2\">\n    Upgrade\n  </button>\n</section>",
    "themeSwitchExample": "// UnoCSS is build-time, so switching needs a runtime from a framework package.\nimport { createThemeRuntime, getBuiltInThemes } from \"@themvora/core\";\n\nconst runtime = createThemeRuntime({\n  themes: getBuiltInThemes(),\n  defaultTheme: \"plum-light\",\n  initialMode: \"system\",\n});\n\ndocument.querySelector(\"button\")!.addEventListener(\"click\", () => {\n  runtime.selection.toggleTheme();\n});",
    "completeExample": "import { defineConfig, presetWind3 } from \"unocss\";\nimport { presetThemvora } from \"@themvora/unocss\";\n\nexport default defineConfig({\n  presets: [presetWind3(), presetThemvora()],\n});\n\n// index.html\n<main class=\"min-h-screen bg-background text-foreground p-8\">\n  <h1 class=\"text-2xl font-semibold\">Themvora + UnoCSS</h1>\n  <section class=\"mt-6 rounded-xl border border-border bg-card p-4\">\n    <h2 class=\"font-semibold text-card-foreground\">Themed card</h2>\n    <button class=\"mt-4 rounded-lg bg-primary px-4 py-2 text-primary-foreground\">\n      Toggle theme\n    </button>\n  </section>\n</main>",
  },
  "shadcn/Angular": {
    "mountProvider": "import { bootstrapApplication } from \"@angular/platform-browser\";\nimport { provideTheme } from \"@themvora/angular\";\nimport \"@themvora/shadcn/shadcn.css\";\n\nimport { AppComponent } from \"./app/app.component\";\n\nbootstrapApplication(AppComponent, {\n  providers: [\n    provideTheme({ defaultTheme: \"plum-light\", initialMode: \"system\" }),\n  ],\n});",
    "themeSwitchExample": "import { Component } from \"@angular/core\";\nimport { injectTheme } from \"@themvora/angular\";\n\n@Component({\n  selector: \"theme-controls\",\n  standalone: true,\n  // injectTheme returns a signal, so it is read as state().\n  template: `\n    <button type=\"button\" (click)=\"state().toggleTheme()\">Toggle</button>\n    <button type=\"button\" (click)=\"state().setMode('light')\">Light</button>\n    <button type=\"button\" (click)=\"state().setMode('dark')\">Dark</button>\n  `,\n})\nexport class ThemeControlsComponent {\n  state = injectTheme();\n}",
    "componentExample": "import { Component } from \"@angular/core\";\n\n@Component({\n  selector: \"app-example\",\n  standalone: true,\n  template: `\n  <div class=\"card\">\n    <h2>Themvora + shadcn/ui</h2>\n    <button class=\"primary\">Primary action</button>\n  </div>\n  `,\n  styles: `\n.card {\n    background: var(--card);\n    color: var(--card-foreground);\n    border: 1px solid var(--border);\n    border-radius: 0.5rem;\n    padding: 1rem;\n  }\n  .primary {\n    background: var(--primary);\n    color: var(--primary-foreground);\n    border-radius: 0.375rem;\n    padding: 0.5rem 1rem;\n  }\n  `,\n})\nexport class ExampleComponent {}",
    "completeExample": "import { bootstrapApplication } from \"@angular/platform-browser\";\nimport { provideTheme } from \"@themvora/angular\";\nimport \"@themvora/shadcn/shadcn.css\";\n\nimport { AppComponent } from \"./app/app.component\";\n\nbootstrapApplication(AppComponent, {\n  providers: [\n    provideTheme({ defaultTheme: \"plum-light\", initialMode: \"system\" }),\n  ],\n});\n\n// src/app/app.component.ts\nimport { Component } from \"@angular/core\";\nimport { RouterOutlet } from \"@angular/router\";\nimport { injectThemeRuntime } from \"@themvora/angular\";\nimport { injectShadcnTheme } from \"@themvora/shadcn/angular\";\n\n@Component({\n  selector: \"app-root\",\n  standalone: true,\n  imports: [RouterOutlet],\n  template: \"<router-outlet />\",\n})\nexport class AppComponent {\n  constructor() {\n    // A constructor is an injection context — registers on provideTheme()'s runtime.\n    injectShadcnTheme(injectThemeRuntime());\n  }\n}",
  },
  "shadcn/Nuxt": {
    "mountProvider": "import { defineNuxtConfig } from \"nuxt/config\";\n\nexport default defineNuxtConfig({\n  // The module owns the provider — there is no component to mount.\n  modules: [\"@themvora/nuxt\"],\n  css: [\"@themvora/shadcn/shadcn.css\"],\n  themvora: {\n    defaultTheme: \"plum-light\",\n    initialMode: \"system\",\n  },\n});",
    "themeSwitchExample": "<!-- components/ThemeControls.vue -->\n<script setup lang=\"ts\">\n// Auto-imported by @themvora/nuxt — no import line needed.\nconst { setMode, toggleTheme } = useTheme();\n</script>\n\n<template>\n  <button type=\"button\" @click=\"toggleTheme()\">Toggle</button>\n  <button type=\"button\" @click=\"setMode('light')\">Light</button>\n  <button type=\"button\" @click=\"setMode('dark')\">Dark</button>\n</template>",
    "componentExample": "<template>\n  <div class=\"card\">\n    <h2>Themvora + shadcn/ui</h2>\n    <button class=\"primary\">Primary action</button>\n  </div>\n</template>\n\n<style scoped>\n.card {\n    background: var(--card);\n    color: var(--card-foreground);\n    border: 1px solid var(--border);\n    border-radius: 0.5rem;\n    padding: 1rem;\n  }\n  .primary {\n    background: var(--primary);\n    color: var(--primary-foreground);\n    border-radius: 0.375rem;\n    padding: 0.5rem 1rem;\n  }\n</style>\n",
    "completeExample": "import { defineNuxtConfig } from \"nuxt/config\";\n\nexport default defineNuxtConfig({\n  // The module owns the provider — there is no component to mount.\n  modules: [\"@themvora/nuxt\"],\n  css: [\"@themvora/shadcn/shadcn.css\"],\n  themvora: {\n    defaultTheme: \"plum-light\",\n    initialMode: \"system\",\n  },\n});\n\n// ------------------------------------------------- plugins/install-adapter.client.ts\nimport { useShadcnTheme } from \"@themvora/shadcn/vue\";\nimport { useThemeRuntime } from \"@themvora/vue\";\n\n// Runs once on the client, after the module has provided the runtime.\nexport default defineNuxtPlugin(() => {\n  useShadcnTheme(useThemeRuntime());\n});",
  },
  "shadcn/Remix": {
    "mountProvider": "import type { ReactNode } from \"react\";\nimport { Links, Meta, Outlet, Scripts, ScrollRestoration, useLoaderData } from \"@remix-run/react\";\nimport { getBuiltInThemes } from \"@themvora/core\";\nimport { ThemeHead, ThemeProvider } from \"@themvora/remix\";\nimport { getInitialThemeState } from \"@themvora/remix/server\";\nimport \"@themvora/shadcn/shadcn.css\";\n\nimport { InstallAdapter } from \"./components/InstallAdapter\";\n\nconst themes = getBuiltInThemes();\nconst INITIAL_MODE = \"system\";\n\n// Resolve the selection server-side so hydration matches exactly.\nexport async function loader({ request }: { request: Request }) {\n  return {\n    initial: await getInitialThemeState(request, {\n      themes,\n      defaultTheme: \"light\",\n      mode: INITIAL_MODE,\n    }),\n  };\n}\n\nexport function Layout({ children }: { children: ReactNode }) {\n  const { initial } = useLoaderData<typeof loader>();\n\n  return (\n    <html lang=\"en\" data-theme={initial.theme.name} data-theme-ready=\"true\">\n      <head>\n        <meta charSet=\"utf-8\" />\n        <Meta />\n        <Links />\n        <ThemeHead themes={themes} defaultTheme=\"light\" mode={INITIAL_MODE} />\n      </head>\n      <body>\n        {children}\n        <ScrollRestoration />\n        <Scripts />\n      </body>\n    </html>\n  );\n}\n\nexport default function App() {\n  const { initial } = useLoaderData<typeof loader>();\n\n  return (\n    <ThemeProvider initial={initial} themes={themes} defaultTheme=\"light\">\n      <InstallAdapter />\n      <Outlet />\n    </ThemeProvider>\n  );\n}",
    "themeSwitchExample": "import { useTheme } from \"@themvora/remix\";\n\nexport function ThemeControls() {\n  const { setMode, toggleTheme } = useTheme();\n\n  return (\n    <>\n      <button type=\"button\" onClick={() => toggleTheme()}>Toggle</button>\n      <button type=\"button\" onClick={() => setMode(\"light\")}>Light</button>\n      <button type=\"button\" onClick={() => setMode(\"dark\")}>Dark</button>\n    </>\n  );\n}",
    "componentExample": "import \"@themvora/shadcn/shadcn.css\";\n\nexport function Example() {\n  return (\n    <div className=\"card\">\n      <h2>Themvora + shadcn/ui</h2>\n      <button className=\"primary\">Primary action</button>\n    </div>\n  );\n}",
    "completeExample": "import type { ReactNode } from \"react\";\nimport { Links, Meta, Outlet, Scripts, ScrollRestoration, useLoaderData } from \"@remix-run/react\";\nimport { getBuiltInThemes } from \"@themvora/core\";\nimport { ThemeHead, ThemeProvider, useThemeRuntime } from \"@themvora/remix\";\nimport { getInitialThemeState } from \"@themvora/remix/server\";\nimport { useShadcnTheme } from \"@themvora/shadcn/react\";\nimport \"@themvora/shadcn/shadcn.css\";\n\nconst themes = getBuiltInThemes();\nconst INITIAL_MODE = \"system\";\n\n// Resolve the selection server-side so hydration matches exactly.\nexport async function loader({ request }: { request: Request }) {\n  return {\n    initial: await getInitialThemeState(request, {\n      themes,\n      defaultTheme: \"light\",\n      mode: INITIAL_MODE,\n    }),\n  };\n}\n\nexport function Layout({ children }: { children: ReactNode }) {\n  const { initial } = useLoaderData<typeof loader>();\n\n  return (\n    <html lang=\"en\" data-theme={initial.theme.name} data-theme-ready=\"true\">\n      <head>\n        <meta charSet=\"utf-8\" />\n        <Meta />\n        <Links />\n        <ThemeHead themes={themes} defaultTheme=\"light\" mode={INITIAL_MODE} />\n      </head>\n      <body>\n        {children}\n        <ScrollRestoration />\n        <Scripts />\n      </body>\n    </html>\n  );\n}\n\nfunction InstallAdapter() {\n  useShadcnTheme(useThemeRuntime());\n  return null;\n}\n\nexport default function App() {\n  const { initial } = useLoaderData<typeof loader>();\n\n  return (\n    <ThemeProvider initial={initial} themes={themes} defaultTheme=\"light\">\n      <InstallAdapter />\n      <Outlet />\n    </ThemeProvider>\n  );\n}",
  },
  "shadcn/Astro": {
    "mountProvider": "---\nimport Provider from \"@themvora/astro/provider.astro\";\nimport themeConfig from \"../../theme.config\";\nimport \"@themvora/shadcn/shadcn.css\";\n---\n\n<Provider config={themeConfig} lang=\"en\">\n  <slot />\n</Provider>",
    "themeSwitchExample": "---\nimport ThemeToggle from \"@themvora/astro/ThemeToggle.astro\";\n---\n\n<!-- Astro ships the toggle as a component — no hook, no script. -->\n<ThemeToggle />",
    "componentExample": "---\nimport \"@themvora/shadcn/shadcn.css\";\n---\n\n  <div class=\"card\">\n    <h2>Themvora + shadcn/ui</h2>\n    <button class=\"primary\">Primary action</button>\n  </div>\n\n<style>\n.card {\n    background: var(--card);\n    color: var(--card-foreground);\n    border: 1px solid var(--border);\n    border-radius: 0.5rem;\n    padding: 1rem;\n  }\n  .primary {\n    background: var(--primary);\n    color: var(--primary-foreground);\n    border-radius: 0.375rem;\n    padding: 0.5rem 1rem;\n  }\n</style>\n",
    "completeExample": "---\nimport Provider from \"@themvora/astro/provider.astro\";\nimport themeConfig from \"../../theme.config\";\nimport \"@themvora/shadcn/shadcn.css\";\n---\n\n<Provider config={themeConfig} lang=\"en\">\n  <slot />\n</Provider>\n\n// ---- src/pages/index.astro\n---\nimport BaseLayout from \"../layouts/BaseLayout.astro\";\nimport { InstallAdapter } from \"../components/InstallAdapter\";\n---\n\n<BaseLayout>\n  <InstallAdapter client:only=\"react\" />\n</BaseLayout>\n\n// ---- src/components/InstallAdapter.tsx\n\"use client\";\n\nimport { useThemeRuntime } from \"@themvora/react\";\nimport { useShadcnTheme } from \"@themvora/shadcn/react\";\n\nexport function InstallAdapter() {\n  useShadcnTheme(useThemeRuntime());\n  return null;\n}",
  },
  "bootstrap/Solid": {
    "mountProvider": "import { render } from \"solid-js/web\";\nimport { ThemeProvider } from \"@themvora/solid\";\nimport \"@themvora/bootstrap/bootstrap.css\";\n\nimport { App } from \"./App\";\nimport { InstallAdapter } from \"./components/InstallAdapter\";\n\nrender(\n  () => (\n    <ThemeProvider defaultTheme=\"plum-light\" initialMode=\"system\">\n      <InstallAdapter />\n      <App />\n    </ThemeProvider>\n  ),\n  document.getElementById(\"root\")!,\n);",
    "themeSwitchExample": "import { useTheme } from \"@themvora/solid\";\n\nexport function ThemeControls() {\n  const { setMode, toggleTheme } = useTheme();\n\n  return (\n    <>\n      <button type=\"button\" onClick={() => toggleTheme()}>Toggle</button>\n      <button type=\"button\" onClick={() => setMode(\"light\")}>Light</button>\n      <button type=\"button\" onClick={() => setMode(\"dark\")}>Dark</button>\n    </>\n  );\n}",
    "componentExample": "import \"@themvora/bootstrap/bootstrap.css\";\n\nexport function Example() {\n  return (\n    <div className=\"card\">\n      <div className=\"card-body\">\n        <h5 className=\"card-title\">Themvora + Bootstrap</h5>\n        <button type=\"button\" className=\"btn btn-primary\">Primary action</button>\n      </div>\n    </div>\n  );\n}",
    "completeExample": "import { render } from \"solid-js/web\";\nimport { ThemeProvider } from \"@themvora/solid\";\nimport \"@themvora/bootstrap/bootstrap.css\";\n\nimport { App } from \"./App\";\nimport { InstallAdapter } from \"./components/InstallAdapter\";\n\nrender(\n  () => (\n    <ThemeProvider defaultTheme=\"plum-light\" initialMode=\"system\">\n      <InstallAdapter />\n      <App />\n    </ThemeProvider>\n  ),\n  document.getElementById(\"root\")!,\n);\n\n// src/components/InstallAdapter.tsx\nimport { useThemeRuntime } from \"@themvora/solid\";\nimport { useBootstrapTheme } from \"@themvora/bootstrap/solid\";\n\nexport function InstallAdapter() {\n  useBootstrapTheme(useThemeRuntime());\n  return null;\n}",
  },
  "bootstrap/Angular": {
    "mountProvider": "import { bootstrapApplication } from \"@angular/platform-browser\";\nimport { provideTheme } from \"@themvora/angular\";\nimport \"@themvora/bootstrap/bootstrap.css\";\n\nimport { AppComponent } from \"./app/app.component\";\n\nbootstrapApplication(AppComponent, {\n  providers: [\n    provideTheme({ defaultTheme: \"plum-light\", initialMode: \"system\" }),\n  ],\n});",
    "themeSwitchExample": "import { Component } from \"@angular/core\";\nimport { injectTheme } from \"@themvora/angular\";\n\n@Component({\n  selector: \"theme-controls\",\n  standalone: true,\n  // injectTheme returns a signal, so it is read as state().\n  template: `\n    <button type=\"button\" (click)=\"state().toggleTheme()\">Toggle</button>\n    <button type=\"button\" (click)=\"state().setMode('light')\">Light</button>\n    <button type=\"button\" (click)=\"state().setMode('dark')\">Dark</button>\n  `,\n})\nexport class ThemeControlsComponent {\n  state = injectTheme();\n}",
    "componentExample": "import { Component } from \"@angular/core\";\n\n@Component({\n  selector: \"app-example\",\n  standalone: true,\n  template: `\n  <div class=\"card\">\n    <div class=\"card-body\">\n      <h5 class=\"card-title\">Themvora + Bootstrap</h5>\n      <button type=\"button\" class=\"btn btn-primary\">Primary action</button>\n    </div>\n  </div>\n  `,\n})\nexport class ExampleComponent {}",
    "completeExample": "import { bootstrapApplication } from \"@angular/platform-browser\";\nimport { provideTheme } from \"@themvora/angular\";\nimport \"@themvora/bootstrap/bootstrap.css\";\n\nimport { AppComponent } from \"./app/app.component\";\n\nbootstrapApplication(AppComponent, {\n  providers: [\n    provideTheme({ defaultTheme: \"plum-light\", initialMode: \"system\" }),\n  ],\n});\n\n// src/app/app.component.ts\nimport { Component } from \"@angular/core\";\nimport { RouterOutlet } from \"@angular/router\";\nimport { injectThemeRuntime } from \"@themvora/angular\";\nimport { injectBootstrapTheme } from \"@themvora/bootstrap/angular\";\n\n@Component({\n  selector: \"app-root\",\n  standalone: true,\n  imports: [RouterOutlet],\n  template: \"<router-outlet />\",\n})\nexport class AppComponent {\n  constructor() {\n    // A constructor is an injection context — registers on provideTheme()'s runtime.\n    injectBootstrapTheme(injectThemeRuntime());\n  }\n}",
  },
  "bootstrap/Nuxt": {
    "mountProvider": "import { defineNuxtConfig } from \"nuxt/config\";\n\nexport default defineNuxtConfig({\n  // The module owns the provider — there is no component to mount.\n  modules: [\"@themvora/nuxt\"],\n  css: [\"@themvora/bootstrap/bootstrap.css\"],\n  themvora: {\n    defaultTheme: \"plum-light\",\n    initialMode: \"system\",\n  },\n});",
    "themeSwitchExample": "<!-- components/ThemeControls.vue -->\n<script setup lang=\"ts\">\n// Auto-imported by @themvora/nuxt — no import line needed.\nconst { setMode, toggleTheme } = useTheme();\n</script>\n\n<template>\n  <button type=\"button\" @click=\"toggleTheme()\">Toggle</button>\n  <button type=\"button\" @click=\"setMode('light')\">Light</button>\n  <button type=\"button\" @click=\"setMode('dark')\">Dark</button>\n</template>",
    "componentExample": "<template>\n  <div class=\"card\">\n    <div class=\"card-body\">\n      <h5 class=\"card-title\">Themvora + Bootstrap</h5>\n      <button type=\"button\" class=\"btn btn-primary\">Primary action</button>\n    </div>\n  </div>\n</template>\n",
    "completeExample": "import { defineNuxtConfig } from \"nuxt/config\";\n\nexport default defineNuxtConfig({\n  // The module owns the provider — there is no component to mount.\n  modules: [\"@themvora/nuxt\"],\n  css: [\"@themvora/bootstrap/bootstrap.css\"],\n  themvora: {\n    defaultTheme: \"plum-light\",\n    initialMode: \"system\",\n  },\n});\n\n// ------------------------------------------------- plugins/install-adapter.client.ts\nimport { useBootstrapTheme } from \"@themvora/bootstrap/vue\";\nimport { useThemeRuntime } from \"@themvora/vue\";\n\n// Runs once on the client, after the module has provided the runtime.\nexport default defineNuxtPlugin(() => {\n  useBootstrapTheme(useThemeRuntime());\n});",
  },
  "bootstrap/Remix": {
    "mountProvider": "import type { ReactNode } from \"react\";\nimport { Links, Meta, Outlet, Scripts, ScrollRestoration, useLoaderData } from \"@remix-run/react\";\nimport { getBuiltInThemes } from \"@themvora/core\";\nimport { ThemeHead, ThemeProvider } from \"@themvora/remix\";\nimport { getInitialThemeState } from \"@themvora/remix/server\";\nimport \"@themvora/bootstrap/bootstrap.css\";\n\nimport { InstallAdapter } from \"./components/InstallAdapter\";\n\nconst themes = getBuiltInThemes();\nconst INITIAL_MODE = \"system\";\n\n// Resolve the selection server-side so hydration matches exactly.\nexport async function loader({ request }: { request: Request }) {\n  return {\n    initial: await getInitialThemeState(request, {\n      themes,\n      defaultTheme: \"light\",\n      mode: INITIAL_MODE,\n    }),\n  };\n}\n\nexport function Layout({ children }: { children: ReactNode }) {\n  const { initial } = useLoaderData<typeof loader>();\n\n  return (\n    <html lang=\"en\" data-theme={initial.theme.name} data-theme-ready=\"true\">\n      <head>\n        <meta charSet=\"utf-8\" />\n        <Meta />\n        <Links />\n        <ThemeHead themes={themes} defaultTheme=\"light\" mode={INITIAL_MODE} />\n      </head>\n      <body>\n        {children}\n        <ScrollRestoration />\n        <Scripts />\n      </body>\n    </html>\n  );\n}\n\nexport default function App() {\n  const { initial } = useLoaderData<typeof loader>();\n\n  return (\n    <ThemeProvider initial={initial} themes={themes} defaultTheme=\"light\">\n      <InstallAdapter />\n      <Outlet />\n    </ThemeProvider>\n  );\n}",
    "themeSwitchExample": "import { useTheme } from \"@themvora/remix\";\n\nexport function ThemeControls() {\n  const { setMode, toggleTheme } = useTheme();\n\n  return (\n    <>\n      <button type=\"button\" onClick={() => toggleTheme()}>Toggle</button>\n      <button type=\"button\" onClick={() => setMode(\"light\")}>Light</button>\n      <button type=\"button\" onClick={() => setMode(\"dark\")}>Dark</button>\n    </>\n  );\n}",
    "componentExample": "import \"@themvora/bootstrap/bootstrap.css\";\n\nexport function Example() {\n  return (\n    <div className=\"card\">\n      <div className=\"card-body\">\n        <h5 className=\"card-title\">Themvora + Bootstrap</h5>\n        <button type=\"button\" className=\"btn btn-primary\">Primary action</button>\n      </div>\n    </div>\n  );\n}",
    "completeExample": "import type { ReactNode } from \"react\";\nimport { Links, Meta, Outlet, Scripts, ScrollRestoration, useLoaderData } from \"@remix-run/react\";\nimport { getBuiltInThemes } from \"@themvora/core\";\nimport { ThemeHead, ThemeProvider, useThemeRuntime } from \"@themvora/remix\";\nimport { getInitialThemeState } from \"@themvora/remix/server\";\nimport { useBootstrapTheme } from \"@themvora/bootstrap/react\";\nimport \"@themvora/bootstrap/bootstrap.css\";\n\nconst themes = getBuiltInThemes();\nconst INITIAL_MODE = \"system\";\n\n// Resolve the selection server-side so hydration matches exactly.\nexport async function loader({ request }: { request: Request }) {\n  return {\n    initial: await getInitialThemeState(request, {\n      themes,\n      defaultTheme: \"light\",\n      mode: INITIAL_MODE,\n    }),\n  };\n}\n\nexport function Layout({ children }: { children: ReactNode }) {\n  const { initial } = useLoaderData<typeof loader>();\n\n  return (\n    <html lang=\"en\" data-theme={initial.theme.name} data-theme-ready=\"true\">\n      <head>\n        <meta charSet=\"utf-8\" />\n        <Meta />\n        <Links />\n        <ThemeHead themes={themes} defaultTheme=\"light\" mode={INITIAL_MODE} />\n      </head>\n      <body>\n        {children}\n        <ScrollRestoration />\n        <Scripts />\n      </body>\n    </html>\n  );\n}\n\nfunction InstallAdapter() {\n  useBootstrapTheme(useThemeRuntime());\n  return null;\n}\n\nexport default function App() {\n  const { initial } = useLoaderData<typeof loader>();\n\n  return (\n    <ThemeProvider initial={initial} themes={themes} defaultTheme=\"light\">\n      <InstallAdapter />\n      <Outlet />\n    </ThemeProvider>\n  );\n}",
  },
  "bootstrap/Astro": {
    "mountProvider": "---\nimport Provider from \"@themvora/astro/provider.astro\";\nimport themeConfig from \"../../theme.config\";\nimport \"@themvora/bootstrap/bootstrap.css\";\n---\n\n<Provider config={themeConfig} lang=\"en\">\n  <slot />\n</Provider>",
    "themeSwitchExample": "---\nimport ThemeToggle from \"@themvora/astro/ThemeToggle.astro\";\n---\n\n<!-- Astro ships the toggle as a component — no hook, no script. -->\n<ThemeToggle />",
    "componentExample": "---\nimport \"@themvora/bootstrap/bootstrap.css\";\n---\n\n  <div class=\"card\">\n    <div class=\"card-body\">\n      <h5 class=\"card-title\">Themvora + Bootstrap</h5>\n      <button type=\"button\" class=\"btn btn-primary\">Primary action</button>\n    </div>\n  </div>\n",
    "completeExample": "---\nimport Provider from \"@themvora/astro/provider.astro\";\nimport themeConfig from \"../../theme.config\";\nimport \"@themvora/bootstrap/bootstrap.css\";\n---\n\n<Provider config={themeConfig} lang=\"en\">\n  <slot />\n</Provider>\n\n// ---- src/pages/index.astro\n---\nimport BaseLayout from \"../layouts/BaseLayout.astro\";\nimport { InstallAdapter } from \"../components/InstallAdapter\";\n---\n\n<BaseLayout>\n  <InstallAdapter client:only=\"react\" />\n</BaseLayout>\n\n// ---- src/components/InstallAdapter.tsx\n\"use client\";\n\nimport { useThemeRuntime } from \"@themvora/react\";\nimport { useBootstrapTheme } from \"@themvora/bootstrap/react\";\n\nexport function InstallAdapter() {\n  useBootstrapTheme(useThemeRuntime());\n  return null;\n}",
  },
  "daisyui/Solid": {
    "mountProvider": "import { render } from \"solid-js/web\";\nimport { ThemeProvider } from \"@themvora/solid\";\nimport \"@themvora/daisyui/daisyui.css\";\n\nimport { App } from \"./App\";\nimport { InstallAdapter } from \"./components/InstallAdapter\";\n\nrender(\n  () => (\n    <ThemeProvider defaultTheme=\"plum-light\" initialMode=\"system\">\n      <InstallAdapter />\n      <App />\n    </ThemeProvider>\n  ),\n  document.getElementById(\"root\")!,\n);",
    "themeSwitchExample": "import { useTheme } from \"@themvora/solid\";\n\nexport function ThemeControls() {\n  const { setMode, toggleTheme } = useTheme();\n\n  return (\n    <>\n      <button type=\"button\" onClick={() => toggleTheme()}>Toggle</button>\n      <button type=\"button\" onClick={() => setMode(\"light\")}>Light</button>\n      <button type=\"button\" onClick={() => setMode(\"dark\")}>Dark</button>\n    </>\n  );\n}",
    "componentExample": "import \"@themvora/daisyui/daisyui.css\";\n\nexport function Example() {\n  return (\n    <div className=\"d-card\">\n      <div className=\"d-card-body\">\n        <h4 className=\"d-card-title\">Themvora + daisyUI</h4>\n        <button className=\"d-btn d-btn-primary\">Primary action</button>\n      </div>\n    </div>\n  );\n}",
    "completeExample": "import { render } from \"solid-js/web\";\nimport { ThemeProvider } from \"@themvora/solid\";\nimport \"@themvora/daisyui/daisyui.css\";\n\nimport { App } from \"./App\";\nimport { InstallAdapter } from \"./components/InstallAdapter\";\n\nrender(\n  () => (\n    <ThemeProvider defaultTheme=\"plum-light\" initialMode=\"system\">\n      <InstallAdapter />\n      <App />\n    </ThemeProvider>\n  ),\n  document.getElementById(\"root\")!,\n);\n\n// src/components/InstallAdapter.tsx\nimport { useThemeRuntime } from \"@themvora/solid\";\nimport { useDaisyTheme } from \"@themvora/daisyui/solid\";\n\nexport function InstallAdapter() {\n  useDaisyTheme(useThemeRuntime());\n  return null;\n}",
  },
  "daisyui/Angular": {
    "mountProvider": "import { bootstrapApplication } from \"@angular/platform-browser\";\nimport { provideTheme } from \"@themvora/angular\";\nimport \"@themvora/daisyui/daisyui.css\";\n\nimport { AppComponent } from \"./app/app.component\";\n\nbootstrapApplication(AppComponent, {\n  providers: [\n    provideTheme({ defaultTheme: \"plum-light\", initialMode: \"system\" }),\n  ],\n});",
    "themeSwitchExample": "import { Component } from \"@angular/core\";\nimport { injectTheme } from \"@themvora/angular\";\n\n@Component({\n  selector: \"theme-controls\",\n  standalone: true,\n  // injectTheme returns a signal, so it is read as state().\n  template: `\n    <button type=\"button\" (click)=\"state().toggleTheme()\">Toggle</button>\n    <button type=\"button\" (click)=\"state().setMode('light')\">Light</button>\n    <button type=\"button\" (click)=\"state().setMode('dark')\">Dark</button>\n  `,\n})\nexport class ThemeControlsComponent {\n  state = injectTheme();\n}",
    "componentExample": "import { Component } from \"@angular/core\";\n\n@Component({\n  selector: \"app-example\",\n  standalone: true,\n  template: `\n  <div class=\"d-card\">\n    <div class=\"d-card-body\">\n      <h4 class=\"d-card-title\">Themvora + daisyUI</h4>\n      <button class=\"d-btn d-btn-primary\">Primary action</button>\n    </div>\n  </div>\n  `,\n})\nexport class ExampleComponent {}",
    "completeExample": "import { bootstrapApplication } from \"@angular/platform-browser\";\nimport { provideTheme } from \"@themvora/angular\";\nimport \"@themvora/daisyui/daisyui.css\";\n\nimport { AppComponent } from \"./app/app.component\";\n\nbootstrapApplication(AppComponent, {\n  providers: [\n    provideTheme({ defaultTheme: \"plum-light\", initialMode: \"system\" }),\n  ],\n});\n\n// src/app/app.component.ts\nimport { Component } from \"@angular/core\";\nimport { RouterOutlet } from \"@angular/router\";\nimport { injectThemeRuntime } from \"@themvora/angular\";\nimport { injectDaisyTheme } from \"@themvora/daisyui/angular\";\n\n@Component({\n  selector: \"app-root\",\n  standalone: true,\n  imports: [RouterOutlet],\n  template: \"<router-outlet />\",\n})\nexport class AppComponent {\n  constructor() {\n    // A constructor is an injection context — registers on provideTheme()'s runtime.\n    injectDaisyTheme(injectThemeRuntime());\n  }\n}",
  },
  "daisyui/Nuxt": {
    "mountProvider": "import { defineNuxtConfig } from \"nuxt/config\";\n\nexport default defineNuxtConfig({\n  // The module owns the provider — there is no component to mount.\n  modules: [\"@themvora/nuxt\"],\n  css: [\"@themvora/daisyui/daisyui.css\"],\n  themvora: {\n    defaultTheme: \"plum-light\",\n    initialMode: \"system\",\n  },\n});",
    "themeSwitchExample": "<!-- components/ThemeControls.vue -->\n<script setup lang=\"ts\">\n// Auto-imported by @themvora/nuxt — no import line needed.\nconst { setMode, toggleTheme } = useTheme();\n</script>\n\n<template>\n  <button type=\"button\" @click=\"toggleTheme()\">Toggle</button>\n  <button type=\"button\" @click=\"setMode('light')\">Light</button>\n  <button type=\"button\" @click=\"setMode('dark')\">Dark</button>\n</template>",
    "componentExample": "<template>\n  <div class=\"d-card\">\n    <div class=\"d-card-body\">\n      <h4 class=\"d-card-title\">Themvora + daisyUI</h4>\n      <button class=\"d-btn d-btn-primary\">Primary action</button>\n    </div>\n  </div>\n</template>\n",
    "completeExample": "import { defineNuxtConfig } from \"nuxt/config\";\n\nexport default defineNuxtConfig({\n  // The module owns the provider — there is no component to mount.\n  modules: [\"@themvora/nuxt\"],\n  css: [\"@themvora/daisyui/daisyui.css\"],\n  themvora: {\n    defaultTheme: \"plum-light\",\n    initialMode: \"system\",\n  },\n});\n\n// ------------------------------------------------- plugins/install-adapter.client.ts\nimport { useDaisyTheme } from \"@themvora/daisyui/vue\";\nimport { useThemeRuntime } from \"@themvora/vue\";\n\n// Runs once on the client, after the module has provided the runtime.\nexport default defineNuxtPlugin(() => {\n  useDaisyTheme(useThemeRuntime());\n});",
  },
  "daisyui/Remix": {
    "mountProvider": "import type { ReactNode } from \"react\";\nimport { Links, Meta, Outlet, Scripts, ScrollRestoration, useLoaderData } from \"@remix-run/react\";\nimport { getBuiltInThemes } from \"@themvora/core\";\nimport { ThemeHead, ThemeProvider } from \"@themvora/remix\";\nimport { getInitialThemeState } from \"@themvora/remix/server\";\nimport \"@themvora/daisyui/daisyui.css\";\n\nimport { InstallAdapter } from \"./components/InstallAdapter\";\n\nconst themes = getBuiltInThemes();\nconst INITIAL_MODE = \"system\";\n\n// Resolve the selection server-side so hydration matches exactly.\nexport async function loader({ request }: { request: Request }) {\n  return {\n    initial: await getInitialThemeState(request, {\n      themes,\n      defaultTheme: \"light\",\n      mode: INITIAL_MODE,\n    }),\n  };\n}\n\nexport function Layout({ children }: { children: ReactNode }) {\n  const { initial } = useLoaderData<typeof loader>();\n\n  return (\n    <html lang=\"en\" data-theme={initial.theme.name} data-theme-ready=\"true\">\n      <head>\n        <meta charSet=\"utf-8\" />\n        <Meta />\n        <Links />\n        <ThemeHead themes={themes} defaultTheme=\"light\" mode={INITIAL_MODE} />\n      </head>\n      <body>\n        {children}\n        <ScrollRestoration />\n        <Scripts />\n      </body>\n    </html>\n  );\n}\n\nexport default function App() {\n  const { initial } = useLoaderData<typeof loader>();\n\n  return (\n    <ThemeProvider initial={initial} themes={themes} defaultTheme=\"light\">\n      <InstallAdapter />\n      <Outlet />\n    </ThemeProvider>\n  );\n}",
    "themeSwitchExample": "import { useTheme } from \"@themvora/remix\";\n\nexport function ThemeControls() {\n  const { setMode, toggleTheme } = useTheme();\n\n  return (\n    <>\n      <button type=\"button\" onClick={() => toggleTheme()}>Toggle</button>\n      <button type=\"button\" onClick={() => setMode(\"light\")}>Light</button>\n      <button type=\"button\" onClick={() => setMode(\"dark\")}>Dark</button>\n    </>\n  );\n}",
    "componentExample": "import \"@themvora/daisyui/daisyui.css\";\n\nexport function Example() {\n  return (\n    <div className=\"d-card\">\n      <div className=\"d-card-body\">\n        <h4 className=\"d-card-title\">Themvora + daisyUI</h4>\n        <button className=\"d-btn d-btn-primary\">Primary action</button>\n      </div>\n    </div>\n  );\n}",
    "completeExample": "import type { ReactNode } from \"react\";\nimport { Links, Meta, Outlet, Scripts, ScrollRestoration, useLoaderData } from \"@remix-run/react\";\nimport { getBuiltInThemes } from \"@themvora/core\";\nimport { ThemeHead, ThemeProvider, useThemeRuntime } from \"@themvora/remix\";\nimport { getInitialThemeState } from \"@themvora/remix/server\";\nimport { useDaisyTheme } from \"@themvora/daisyui/react\";\nimport \"@themvora/daisyui/daisyui.css\";\n\nconst themes = getBuiltInThemes();\nconst INITIAL_MODE = \"system\";\n\n// Resolve the selection server-side so hydration matches exactly.\nexport async function loader({ request }: { request: Request }) {\n  return {\n    initial: await getInitialThemeState(request, {\n      themes,\n      defaultTheme: \"light\",\n      mode: INITIAL_MODE,\n    }),\n  };\n}\n\nexport function Layout({ children }: { children: ReactNode }) {\n  const { initial } = useLoaderData<typeof loader>();\n\n  return (\n    <html lang=\"en\" data-theme={initial.theme.name} data-theme-ready=\"true\">\n      <head>\n        <meta charSet=\"utf-8\" />\n        <Meta />\n        <Links />\n        <ThemeHead themes={themes} defaultTheme=\"light\" mode={INITIAL_MODE} />\n      </head>\n      <body>\n        {children}\n        <ScrollRestoration />\n        <Scripts />\n      </body>\n    </html>\n  );\n}\n\nfunction InstallAdapter() {\n  useDaisyTheme(useThemeRuntime());\n  return null;\n}\n\nexport default function App() {\n  const { initial } = useLoaderData<typeof loader>();\n\n  return (\n    <ThemeProvider initial={initial} themes={themes} defaultTheme=\"light\">\n      <InstallAdapter />\n      <Outlet />\n    </ThemeProvider>\n  );\n}",
  },
  "daisyui/Astro": {
    "mountProvider": "---\nimport Provider from \"@themvora/astro/provider.astro\";\nimport themeConfig from \"../../theme.config\";\nimport \"@themvora/daisyui/daisyui.css\";\n---\n\n<Provider config={themeConfig} lang=\"en\">\n  <slot />\n</Provider>",
    "themeSwitchExample": "---\nimport ThemeToggle from \"@themvora/astro/ThemeToggle.astro\";\n---\n\n<!-- Astro ships the toggle as a component — no hook, no script. -->\n<ThemeToggle />",
    "componentExample": "---\nimport \"@themvora/daisyui/daisyui.css\";\n---\n\n  <div class=\"d-card\">\n    <div class=\"d-card-body\">\n      <h4 class=\"d-card-title\">Themvora + daisyUI</h4>\n      <button class=\"d-btn d-btn-primary\">Primary action</button>\n    </div>\n  </div>\n",
    "completeExample": "---\nimport Provider from \"@themvora/astro/provider.astro\";\nimport themeConfig from \"../../theme.config\";\nimport \"@themvora/daisyui/daisyui.css\";\n---\n\n<Provider config={themeConfig} lang=\"en\">\n  <slot />\n</Provider>\n\n// ---- src/pages/index.astro\n---\nimport BaseLayout from \"../layouts/BaseLayout.astro\";\nimport { InstallAdapter } from \"../components/InstallAdapter\";\n---\n\n<BaseLayout>\n  <InstallAdapter client:only=\"react\" />\n</BaseLayout>\n\n// ---- src/components/InstallAdapter.tsx\n\"use client\";\n\nimport { useThemeRuntime } from \"@themvora/react\";\nimport { useDaisyTheme } from \"@themvora/daisyui/react\";\n\nexport function InstallAdapter() {\n  useDaisyTheme(useThemeRuntime());\n  return null;\n}",
  },
  "open-props/Solid": {
    "mountProvider": "import { render } from \"solid-js/web\";\nimport { ThemeProvider } from \"@themvora/solid\";\nimport \"@themvora/open-props/open-props.css\";\n\nimport { App } from \"./App\";\nimport { InstallAdapter } from \"./components/InstallAdapter\";\n\nrender(\n  () => (\n    <ThemeProvider defaultTheme=\"plum-light\" initialMode=\"system\">\n      <InstallAdapter />\n      <App />\n    </ThemeProvider>\n  ),\n  document.getElementById(\"root\")!,\n);",
    "themeSwitchExample": "import { useTheme } from \"@themvora/solid\";\n\nexport function ThemeControls() {\n  const { setMode, toggleTheme } = useTheme();\n\n  return (\n    <>\n      <button type=\"button\" onClick={() => toggleTheme()}>Toggle</button>\n      <button type=\"button\" onClick={() => setMode(\"light\")}>Light</button>\n      <button type=\"button\" onClick={() => setMode(\"dark\")}>Dark</button>\n    </>\n  );\n}",
    "componentExample": "import \"@themvora/open-props/open-props.css\";\n\nexport function Example() {\n  return (\n    <div className=\"surface\">\n      <h2>Themvora + Open Props</h2>\n      <button className=\"primary\">Primary action</button>\n    </div>\n  );\n}",
    "completeExample": "import { render } from \"solid-js/web\";\nimport { ThemeProvider } from \"@themvora/solid\";\nimport \"@themvora/open-props/open-props.css\";\n\nimport { App } from \"./App\";\nimport { InstallAdapter } from \"./components/InstallAdapter\";\n\nrender(\n  () => (\n    <ThemeProvider defaultTheme=\"plum-light\" initialMode=\"system\">\n      <InstallAdapter />\n      <App />\n    </ThemeProvider>\n  ),\n  document.getElementById(\"root\")!,\n);\n\n// src/components/InstallAdapter.tsx\nimport { useThemeRuntime } from \"@themvora/solid\";\nimport { useOpenPropsTheme } from \"@themvora/open-props/solid\";\n\nexport function InstallAdapter() {\n  useOpenPropsTheme(useThemeRuntime());\n  return null;\n}",
  },
  "open-props/Angular": {
    "mountProvider": "import { bootstrapApplication } from \"@angular/platform-browser\";\nimport { provideTheme } from \"@themvora/angular\";\nimport \"@themvora/open-props/open-props.css\";\n\nimport { AppComponent } from \"./app/app.component\";\n\nbootstrapApplication(AppComponent, {\n  providers: [\n    provideTheme({ defaultTheme: \"plum-light\", initialMode: \"system\" }),\n  ],\n});",
    "themeSwitchExample": "import { Component } from \"@angular/core\";\nimport { injectTheme } from \"@themvora/angular\";\n\n@Component({\n  selector: \"theme-controls\",\n  standalone: true,\n  // injectTheme returns a signal, so it is read as state().\n  template: `\n    <button type=\"button\" (click)=\"state().toggleTheme()\">Toggle</button>\n    <button type=\"button\" (click)=\"state().setMode('light')\">Light</button>\n    <button type=\"button\" (click)=\"state().setMode('dark')\">Dark</button>\n  `,\n})\nexport class ThemeControlsComponent {\n  state = injectTheme();\n}",
    "componentExample": "import { Component } from \"@angular/core\";\n\n@Component({\n  selector: \"app-example\",\n  standalone: true,\n  template: `\n  <div class=\"surface\">\n    <h2>Themvora + Open Props</h2>\n    <button class=\"primary\">Primary action</button>\n  </div>\n  `,\n  styles: `\n.surface {\n    background: var(--color-surface);\n    color: var(--color-text);\n    border: 1px solid var(--color-border);\n    border-radius: var(--radius-2);\n    padding: var(--size-3);\n  }\n  .primary {\n    background: var(--color-primary);\n    color: var(--color-primary-foreground);\n    border-radius: var(--radius-2);\n    padding: var(--size-2) var(--size-3);\n  }\n  `,\n})\nexport class ExampleComponent {}",
    "completeExample": "import { bootstrapApplication } from \"@angular/platform-browser\";\nimport { provideTheme } from \"@themvora/angular\";\nimport \"@themvora/open-props/open-props.css\";\n\nimport { AppComponent } from \"./app/app.component\";\n\nbootstrapApplication(AppComponent, {\n  providers: [\n    provideTheme({ defaultTheme: \"plum-light\", initialMode: \"system\" }),\n  ],\n});\n\n// src/app/app.component.ts\nimport { Component } from \"@angular/core\";\nimport { RouterOutlet } from \"@angular/router\";\nimport { injectThemeRuntime } from \"@themvora/angular\";\nimport { injectOpenPropsTheme } from \"@themvora/open-props/angular\";\n\n@Component({\n  selector: \"app-root\",\n  standalone: true,\n  imports: [RouterOutlet],\n  template: \"<router-outlet />\",\n})\nexport class AppComponent {\n  constructor() {\n    // A constructor is an injection context — registers on provideTheme()'s runtime.\n    injectOpenPropsTheme(injectThemeRuntime());\n  }\n}",
  },
  "open-props/Nuxt": {
    "mountProvider": "import { defineNuxtConfig } from \"nuxt/config\";\n\nexport default defineNuxtConfig({\n  // The module owns the provider — there is no component to mount.\n  modules: [\"@themvora/nuxt\"],\n  css: [\"@themvora/open-props/open-props.css\"],\n  themvora: {\n    defaultTheme: \"plum-light\",\n    initialMode: \"system\",\n  },\n});",
    "themeSwitchExample": "<!-- components/ThemeControls.vue -->\n<script setup lang=\"ts\">\n// Auto-imported by @themvora/nuxt — no import line needed.\nconst { setMode, toggleTheme } = useTheme();\n</script>\n\n<template>\n  <button type=\"button\" @click=\"toggleTheme()\">Toggle</button>\n  <button type=\"button\" @click=\"setMode('light')\">Light</button>\n  <button type=\"button\" @click=\"setMode('dark')\">Dark</button>\n</template>",
    "componentExample": "<template>\n  <div class=\"surface\">\n    <h2>Themvora + Open Props</h2>\n    <button class=\"primary\">Primary action</button>\n  </div>\n</template>\n\n<style scoped>\n.surface {\n    background: var(--color-surface);\n    color: var(--color-text);\n    border: 1px solid var(--color-border);\n    border-radius: var(--radius-2);\n    padding: var(--size-3);\n  }\n  .primary {\n    background: var(--color-primary);\n    color: var(--color-primary-foreground);\n    border-radius: var(--radius-2);\n    padding: var(--size-2) var(--size-3);\n  }\n</style>\n",
    "completeExample": "import { defineNuxtConfig } from \"nuxt/config\";\n\nexport default defineNuxtConfig({\n  // The module owns the provider — there is no component to mount.\n  modules: [\"@themvora/nuxt\"],\n  css: [\"@themvora/open-props/open-props.css\"],\n  themvora: {\n    defaultTheme: \"plum-light\",\n    initialMode: \"system\",\n  },\n});\n\n// ------------------------------------------------- plugins/install-adapter.client.ts\nimport { useOpenPropsTheme } from \"@themvora/open-props/vue\";\nimport { useThemeRuntime } from \"@themvora/vue\";\n\n// Runs once on the client, after the module has provided the runtime.\nexport default defineNuxtPlugin(() => {\n  useOpenPropsTheme(useThemeRuntime());\n});",
  },
  "open-props/Remix": {
    "mountProvider": "import type { ReactNode } from \"react\";\nimport { Links, Meta, Outlet, Scripts, ScrollRestoration, useLoaderData } from \"@remix-run/react\";\nimport { getBuiltInThemes } from \"@themvora/core\";\nimport { ThemeHead, ThemeProvider } from \"@themvora/remix\";\nimport { getInitialThemeState } from \"@themvora/remix/server\";\nimport \"@themvora/open-props/open-props.css\";\n\nimport { InstallAdapter } from \"./components/InstallAdapter\";\n\nconst themes = getBuiltInThemes();\nconst INITIAL_MODE = \"system\";\n\n// Resolve the selection server-side so hydration matches exactly.\nexport async function loader({ request }: { request: Request }) {\n  return {\n    initial: await getInitialThemeState(request, {\n      themes,\n      defaultTheme: \"light\",\n      mode: INITIAL_MODE,\n    }),\n  };\n}\n\nexport function Layout({ children }: { children: ReactNode }) {\n  const { initial } = useLoaderData<typeof loader>();\n\n  return (\n    <html lang=\"en\" data-theme={initial.theme.name} data-theme-ready=\"true\">\n      <head>\n        <meta charSet=\"utf-8\" />\n        <Meta />\n        <Links />\n        <ThemeHead themes={themes} defaultTheme=\"light\" mode={INITIAL_MODE} />\n      </head>\n      <body>\n        {children}\n        <ScrollRestoration />\n        <Scripts />\n      </body>\n    </html>\n  );\n}\n\nexport default function App() {\n  const { initial } = useLoaderData<typeof loader>();\n\n  return (\n    <ThemeProvider initial={initial} themes={themes} defaultTheme=\"light\">\n      <InstallAdapter />\n      <Outlet />\n    </ThemeProvider>\n  );\n}",
    "themeSwitchExample": "import { useTheme } from \"@themvora/remix\";\n\nexport function ThemeControls() {\n  const { setMode, toggleTheme } = useTheme();\n\n  return (\n    <>\n      <button type=\"button\" onClick={() => toggleTheme()}>Toggle</button>\n      <button type=\"button\" onClick={() => setMode(\"light\")}>Light</button>\n      <button type=\"button\" onClick={() => setMode(\"dark\")}>Dark</button>\n    </>\n  );\n}",
    "componentExample": "import \"@themvora/open-props/open-props.css\";\n\nexport function Example() {\n  return (\n    <div className=\"surface\">\n      <h2>Themvora + Open Props</h2>\n      <button className=\"primary\">Primary action</button>\n    </div>\n  );\n}",
    "completeExample": "import type { ReactNode } from \"react\";\nimport { Links, Meta, Outlet, Scripts, ScrollRestoration, useLoaderData } from \"@remix-run/react\";\nimport { getBuiltInThemes } from \"@themvora/core\";\nimport { ThemeHead, ThemeProvider, useThemeRuntime } from \"@themvora/remix\";\nimport { getInitialThemeState } from \"@themvora/remix/server\";\nimport { useOpenPropsTheme } from \"@themvora/open-props/react\";\nimport \"@themvora/open-props/open-props.css\";\n\nconst themes = getBuiltInThemes();\nconst INITIAL_MODE = \"system\";\n\n// Resolve the selection server-side so hydration matches exactly.\nexport async function loader({ request }: { request: Request }) {\n  return {\n    initial: await getInitialThemeState(request, {\n      themes,\n      defaultTheme: \"light\",\n      mode: INITIAL_MODE,\n    }),\n  };\n}\n\nexport function Layout({ children }: { children: ReactNode }) {\n  const { initial } = useLoaderData<typeof loader>();\n\n  return (\n    <html lang=\"en\" data-theme={initial.theme.name} data-theme-ready=\"true\">\n      <head>\n        <meta charSet=\"utf-8\" />\n        <Meta />\n        <Links />\n        <ThemeHead themes={themes} defaultTheme=\"light\" mode={INITIAL_MODE} />\n      </head>\n      <body>\n        {children}\n        <ScrollRestoration />\n        <Scripts />\n      </body>\n    </html>\n  );\n}\n\nfunction InstallAdapter() {\n  useOpenPropsTheme(useThemeRuntime());\n  return null;\n}\n\nexport default function App() {\n  const { initial } = useLoaderData<typeof loader>();\n\n  return (\n    <ThemeProvider initial={initial} themes={themes} defaultTheme=\"light\">\n      <InstallAdapter />\n      <Outlet />\n    </ThemeProvider>\n  );\n}",
  },
  "open-props/Astro": {
    "mountProvider": "---\nimport Provider from \"@themvora/astro/provider.astro\";\nimport themeConfig from \"../../theme.config\";\nimport \"@themvora/open-props/open-props.css\";\n---\n\n<Provider config={themeConfig} lang=\"en\">\n  <slot />\n</Provider>",
    "themeSwitchExample": "---\nimport ThemeToggle from \"@themvora/astro/ThemeToggle.astro\";\n---\n\n<!-- Astro ships the toggle as a component — no hook, no script. -->\n<ThemeToggle />",
    "componentExample": "---\nimport \"@themvora/open-props/open-props.css\";\n---\n\n  <div class=\"surface\">\n    <h2>Themvora + Open Props</h2>\n    <button class=\"primary\">Primary action</button>\n  </div>\n\n<style>\n.surface {\n    background: var(--color-surface);\n    color: var(--color-text);\n    border: 1px solid var(--color-border);\n    border-radius: var(--radius-2);\n    padding: var(--size-3);\n  }\n  .primary {\n    background: var(--color-primary);\n    color: var(--color-primary-foreground);\n    border-radius: var(--radius-2);\n    padding: var(--size-2) var(--size-3);\n  }\n</style>\n",
    "completeExample": "---\nimport Provider from \"@themvora/astro/provider.astro\";\nimport themeConfig from \"../../theme.config\";\nimport \"@themvora/open-props/open-props.css\";\n---\n\n<Provider config={themeConfig} lang=\"en\">\n  <slot />\n</Provider>\n\n// ---- src/pages/index.astro\n---\nimport BaseLayout from \"../layouts/BaseLayout.astro\";\nimport { InstallAdapter } from \"../components/InstallAdapter\";\n---\n\n<BaseLayout>\n  <InstallAdapter client:only=\"react\" />\n</BaseLayout>\n\n// ---- src/components/InstallAdapter.tsx\n\"use client\";\n\nimport { useThemeRuntime } from \"@themvora/react\";\nimport { useOpenPropsTheme } from \"@themvora/open-props/react\";\n\nexport function InstallAdapter() {\n  useOpenPropsTheme(useThemeRuntime());\n  return null;\n}",
  },
  "bootstrap/Svelte": {
    "mountProvider": "<script lang=\"ts\">\n  import { ThemeProvider } from \"@themvora/svelte\";\n  import \"@themvora/bootstrap/bootstrap.css\";\n\n  import ThemeZone from \"./components/ThemeZone.svelte\";\n</script>\n\n<ThemeProvider defaultTheme=\"plum-light\" initialMode=\"system\">\n  <ThemeZone />\n</ThemeProvider>",
    "themeSwitchExample": "<script lang=\"ts\">\n  import { useTheme } from \"@themvora/svelte\";\n\n  const { setMode, toggleTheme } = useTheme();\n</script>\n\n<button type=\"button\" onclick={() => toggleTheme()}>Toggle</button>\n<button type=\"button\" onclick={() => setMode(\"light\")}>Light</button>\n<button type=\"button\" onclick={() => setMode(\"dark\")}>Dark</button>",
    "componentExample": "  <div class=\"card\">\n    <div class=\"card-body\">\n      <h5 class=\"card-title\">Themvora + Bootstrap</h5>\n      <button type=\"button\" class=\"btn btn-primary\">Primary action</button>\n    </div>\n  </div>\n",
    "completeExample": "<script lang=\"ts\">\n  import { ThemeProvider } from \"@themvora/svelte\";\n  import \"@themvora/bootstrap/bootstrap.css\";\n\n  import ThemeZone from \"./components/ThemeZone.svelte\";\n</script>\n\n<ThemeProvider defaultTheme=\"plum-light\" initialMode=\"system\">\n  <ThemeZone />\n</ThemeProvider>\n\n<!-- src/components/ThemeZone.svelte\n     Mount inside <ThemeProvider> — the hook reads the runtime from context. -->\n<script lang=\"ts\">\n  import { useBootstrapTheme } from \"@themvora/bootstrap/svelte\";\nimport { useThemeRuntime } from \"@themvora/svelte\";\n\n  useBootstrapTheme(useThemeRuntime());\n</script>\n\n<Example />",
  },
  "daisyui/Svelte": {
    "mountProvider": "<script lang=\"ts\">\n  import { ThemeProvider } from \"@themvora/svelte\";\n  import \"@themvora/daisyui/daisyui.css\";\n\n  import ThemeZone from \"./components/ThemeZone.svelte\";\n</script>\n\n<ThemeProvider defaultTheme=\"plum-light\" initialMode=\"system\">\n  <ThemeZone />\n</ThemeProvider>",
    "themeSwitchExample": "<script lang=\"ts\">\n  import { useTheme } from \"@themvora/svelte\";\n\n  const { setMode, toggleTheme } = useTheme();\n</script>\n\n<button type=\"button\" onclick={() => toggleTheme()}>Toggle</button>\n<button type=\"button\" onclick={() => setMode(\"light\")}>Light</button>\n<button type=\"button\" onclick={() => setMode(\"dark\")}>Dark</button>",
    "componentExample": "  <div class=\"d-card\">\n    <div class=\"d-card-body\">\n      <h4 class=\"d-card-title\">Themvora + daisyUI</h4>\n      <button class=\"d-btn d-btn-primary\">Primary action</button>\n    </div>\n  </div>\n",
    "completeExample": "<script lang=\"ts\">\n  import { ThemeProvider } from \"@themvora/svelte\";\n  import \"@themvora/daisyui/daisyui.css\";\n\n  import ThemeZone from \"./components/ThemeZone.svelte\";\n</script>\n\n<ThemeProvider defaultTheme=\"plum-light\" initialMode=\"system\">\n  <ThemeZone />\n</ThemeProvider>\n\n<!-- src/components/ThemeZone.svelte\n     Mount inside <ThemeProvider> — the hook reads the runtime from context. -->\n<script lang=\"ts\">\n  import { useDaisyTheme } from \"@themvora/daisyui/svelte\";\nimport { useThemeRuntime } from \"@themvora/svelte\";\n\n  useDaisyTheme(useThemeRuntime());\n</script>\n\n<Example />",
  },
  "open-props/Svelte": {
    "mountProvider": "<script lang=\"ts\">\n  import { ThemeProvider } from \"@themvora/svelte\";\n  import \"@themvora/open-props/open-props.css\";\n\n  import ThemeZone from \"./components/ThemeZone.svelte\";\n</script>\n\n<ThemeProvider defaultTheme=\"plum-light\" initialMode=\"system\">\n  <ThemeZone />\n</ThemeProvider>",
    "themeSwitchExample": "<script lang=\"ts\">\n  import { useTheme } from \"@themvora/svelte\";\n\n  const { setMode, toggleTheme } = useTheme();\n</script>\n\n<button type=\"button\" onclick={() => toggleTheme()}>Toggle</button>\n<button type=\"button\" onclick={() => setMode(\"light\")}>Light</button>\n<button type=\"button\" onclick={() => setMode(\"dark\")}>Dark</button>",
    "componentExample": "  <div class=\"surface\">\n    <h2>Themvora + Open Props</h2>\n    <button class=\"primary\">Primary action</button>\n  </div>\n\n<style>\n.surface {\n    background: var(--color-surface);\n    color: var(--color-text);\n    border: 1px solid var(--color-border);\n    border-radius: var(--radius-2);\n    padding: var(--size-3);\n  }\n  .primary {\n    background: var(--color-primary);\n    color: var(--color-primary-foreground);\n    border-radius: var(--radius-2);\n    padding: var(--size-2) var(--size-3);\n  }\n</style>\n",
    "completeExample": "<script lang=\"ts\">\n  import { ThemeProvider } from \"@themvora/svelte\";\n  import \"@themvora/open-props/open-props.css\";\n\n  import ThemeZone from \"./components/ThemeZone.svelte\";\n</script>\n\n<ThemeProvider defaultTheme=\"plum-light\" initialMode=\"system\">\n  <ThemeZone />\n</ThemeProvider>\n\n<!-- src/components/ThemeZone.svelte\n     Mount inside <ThemeProvider> — the hook reads the runtime from context. -->\n<script lang=\"ts\">\n  import { useOpenPropsTheme } from \"@themvora/open-props/svelte\";\nimport { useThemeRuntime } from \"@themvora/svelte\";\n\n  useOpenPropsTheme(useThemeRuntime());\n</script>\n\n<Example />",
  },
  "chakra/Next.js": {
    "mountProvider": "import { ThemeProvider } from \"@themvora/next\";\n\nimport { ThemeZone } from \"./theme-zone\";\n\n// ThemeProvider renders <html> and <body> itself — do not wrap it in them.\nexport default function RootLayout({ children }: { children: React.ReactNode }) {\n  return (\n    <ThemeProvider lang=\"en\" defaultTheme=\"plum-light\">\n      <ThemeZone>{children}</ThemeZone>\n    </ThemeProvider>\n  );\n}",
    "componentExample": "\"use client\";\n\nimport { Box, Button, Heading } from \"@chakra-ui/react\";\n\nexport function Example() {\n  return (\n    <Box p=\"6\" borderWidth=\"1px\" borderRadius=\"lg\">\n      <Heading size=\"md\">Themvora + Chakra UI</Heading>\n      <Button colorPalette=\"primary\">Primary action</Button>\n    </Box>\n  );\n}",
    "completeExample": "\"use client\";\n\nimport { useThemeRuntime } from \"@themvora/next/client\";\nimport { ChakraThemeProvider } from \"@themvora/chakra\";\n\nimport { Example } from \"./example\";\n\nexport function ThemeZone() {\n  const runtime = useThemeRuntime();\n\n  return (\n    <ChakraThemeProvider runtime={runtime}>\n      <Example />\n    </ChakraThemeProvider>\n  );\n}\n\n// ---------------------------------------------------------------- app/layout.tsx\nimport { ThemeProvider } from \"@themvora/next\";\n\nimport { ThemeZone } from \"./theme-zone\";\n\n// ThemeProvider renders <html> and <body> itself — do not wrap it in them.\nexport default function RootLayout({ children }: { children: React.ReactNode }) {\n  return (\n    <ThemeProvider lang=\"en\" defaultTheme=\"plum-light\">\n      <ThemeZone />\n      {children}\n    </ThemeProvider>\n  );\n}",
    "themeSwitchExample": "\"use client\";\n\nimport { useTheme } from \"@themvora/next/client\";\nimport { Button, Stack } from \"@chakra-ui/react\";\n\nexport function ThemeControls() {\n  const { setMode, toggleTheme } = useTheme();\n\n  return (\n    <Stack direction=\"row\" spacing={1}>\n      <Button onClick={toggleTheme}>Toggle</Button>\n      <Button onClick={() => setMode(\"light\")}>Light</Button>\n      <Button onClick={() => setMode(\"dark\")}>Dark</Button>\n    </Stack>\n  );\n}",
  },
  "chakra/Remix": {
    "mountProvider": "import type { ReactNode } from \"react\";\nimport { Links, Meta, Outlet, Scripts, ScrollRestoration, useLoaderData } from \"@remix-run/react\";\nimport { getBuiltInThemes } from \"@themvora/core\";\nimport { ThemeHead, ThemeProvider } from \"@themvora/remix\";\nimport { getInitialThemeState } from \"@themvora/remix/server\";\n\nimport { ThemeZone } from \"./components/theme-zone\";\n\nconst themes = getBuiltInThemes();\nconst INITIAL_MODE = \"system\";\n\n// Resolve the selection server-side so hydration matches exactly.\nexport async function loader({ request }: { request: Request }) {\n  return {\n    initial: await getInitialThemeState(request, {\n      themes,\n      defaultTheme: \"light\",\n      mode: INITIAL_MODE,\n    }),\n  };\n}\n\nexport function Layout({ children }: { children: ReactNode }) {\n  const { initial } = useLoaderData<typeof loader>();\n\n  return (\n    <html lang=\"en\" data-theme={initial.theme.name} data-theme-ready=\"true\">\n      <head>\n        <meta charSet=\"utf-8\" />\n        <Meta />\n        <Links />\n        <ThemeHead themes={themes} defaultTheme=\"light\" mode={INITIAL_MODE} />\n      </head>\n      <body>\n        {children}\n        <ScrollRestoration />\n        <Scripts />\n      </body>\n    </html>\n  );\n}\n\nexport default function App() {\n  const { initial } = useLoaderData<typeof loader>();\n\n  return (\n    <ThemeProvider initial={initial} themes={themes} defaultTheme=\"light\">\n      <ThemeZone>\n        <Outlet />\n      </ThemeZone>\n    </ThemeProvider>\n  );\n}",
    "componentExample": "import { Box, Button, Heading } from \"@chakra-ui/react\";\n\nexport function Example() {\n  return (\n    <Box p=\"6\" borderWidth=\"1px\" borderRadius=\"lg\">\n      <Heading size=\"md\">Themvora + Chakra UI</Heading>\n      <Button colorPalette=\"primary\">Primary action</Button>\n    </Box>\n  );\n}",
    "completeExample": "import type { ReactNode } from \"react\";\nimport { Links, Meta, Outlet, Scripts, ScrollRestoration, useLoaderData } from \"@remix-run/react\";\nimport { getBuiltInThemes } from \"@themvora/core\";\nimport { ThemeHead, ThemeProvider, useThemeRuntime } from \"@themvora/remix\";\nimport { getInitialThemeState } from \"@themvora/remix/server\";\nimport { ChakraThemeProvider } from \"@themvora/chakra\";\n\nconst themes = getBuiltInThemes();\nconst INITIAL_MODE = \"system\";\n\n// Resolve the selection server-side so hydration matches exactly.\nexport async function loader({ request }: { request: Request }) {\n  return {\n    initial: await getInitialThemeState(request, {\n      themes,\n      defaultTheme: \"light\",\n      mode: INITIAL_MODE,\n    }),\n  };\n}\n\nexport function Layout({ children }: { children: ReactNode }) {\n  const { initial } = useLoaderData<typeof loader>();\n\n  return (\n    <html lang=\"en\" data-theme={initial.theme.name} data-theme-ready=\"true\">\n      <head>\n        <meta charSet=\"utf-8\" />\n        <Meta />\n        <Links />\n        <ThemeHead themes={themes} defaultTheme=\"light\" mode={INITIAL_MODE} />\n      </head>\n      <body>\n        {children}\n        <ScrollRestoration />\n        <Scripts />\n      </body>\n    </html>\n  );\n}\n\nexport default function App() {\n  const { initial } = useLoaderData<typeof loader>();\n  const runtime = useThemeRuntime();\n\n  return (\n    <ThemeProvider initial={initial} themes={themes} defaultTheme=\"light\">\n      <ChakraThemeProvider runtime={runtime}>\n        <Outlet />\n      </ChakraThemeProvider>\n    </ThemeProvider>\n  );\n}",
    "themeSwitchExample": "import { useTheme } from \"@themvora/remix\";\nimport { Button, Stack } from \"@chakra-ui/react\";\n\nexport function ThemeControls() {\n  const { setMode, toggleTheme } = useTheme();\n\n  return (\n    <Stack direction=\"row\" spacing={1}>\n      <Button onClick={toggleTheme}>Toggle</Button>\n      <Button onClick={() => setMode(\"light\")}>Light</Button>\n      <Button onClick={() => setMode(\"dark\")}>Dark</Button>\n    </Stack>\n  );\n}",
  },
  "chakra/Astro": {
    "mountProvider": "---\nimport Provider from \"@themvora/astro/provider.astro\";\nimport themeConfig from \"../../theme.config\";\n---\n\n<Provider config={themeConfig} lang=\"en\">\n  <slot />\n</Provider>",
    "componentExample": "// src/components/Example.tsx — a React island, because Chakra UI is React-only.\nimport { Box, Button, Heading } from \"@chakra-ui/react\";\n\nexport function Example() {\n  return (\n    <Box p=\"6\" borderWidth=\"1px\" borderRadius=\"lg\">\n      <Heading size=\"md\">Themvora + Chakra UI</Heading>\n      <Button colorPalette=\"primary\">Primary action</Button>\n    </Box>\n  );\n}",
    "completeExample": "---\nimport Provider from \"@themvora/astro/provider.astro\";\nimport themeConfig from \"../../theme.config\";\n---\n\n<Provider config={themeConfig} lang=\"en\">\n  <slot />\n</Provider>\n\n<!-- src/pages/index.astro\n     Chakra UI is a React component library, so its tree runs as an island. -->\n---\nimport BaseLayout from \"../layouts/BaseLayout.astro\";\nimport { ThemeZone } from \"../components/ThemeZone\";\n---\n\n<BaseLayout>\n  <ThemeZone client:only=\"react\" />\n</BaseLayout>\n\n<!-- src/components/ThemeZone.tsx\n     The island. The bridge sits inside it, below ThemeProvider. -->\n---\n\"use client\";\n\nimport { ThemeProvider, useThemeRuntime } from \"@themvora/react\";\nimport { ChakraThemeProvider } from \"@themvora/chakra\";\n\nimport { Example } from \"./Example\";\n\nfunction Bridge() {\n  const runtime = useThemeRuntime();\n  return (\n    <ChakraThemeProvider runtime={runtime}>\n      <Example />\n    </ChakraThemeProvider>\n  );\n}\n\nexport function ThemeZone() {\n  return (\n    <ThemeProvider defaultTheme=\"plum-light\" initialMode=\"system\">\n      <Bridge />\n    </ThemeProvider>\n  );\n}\n-->",
    "themeSwitchExample": "---\nimport ThemeToggle from \"@themvora/astro/ThemeToggle.astro\";\n---\n\n<!-- Astro ships the toggle as a component — no hook, no script. -->\n<ThemeToggle />",
  },
  "antd/Next.js": {
    "mountProvider": "import { ThemeProvider } from \"@themvora/next\";\n\nimport { ThemeZone } from \"./theme-zone\";\n\n// ThemeProvider renders <html> and <body> itself — do not wrap it in them.\nexport default function RootLayout({ children }: { children: React.ReactNode }) {\n  return (\n    <ThemeProvider lang=\"en\" defaultTheme=\"plum-light\">\n      <ThemeZone>{children}</ThemeZone>\n    </ThemeProvider>\n  );\n}",
    "componentExample": "\"use client\";\n\nimport { Button, Card, Typography } from \"antd\";\n\nexport function Example() {\n  return (\n    <Card>\n      <Typography.Title level={5}>Themvora + Ant Design</Typography.Title>\n      <Button type=\"primary\">Primary action</Button>\n    </Card>\n  );\n}",
    "completeExample": "\"use client\";\n\nimport { useThemeRuntime } from \"@themvora/next/client\";\nimport { AntdThemeProvider } from \"@themvora/antd\";\n\nimport { Example } from \"./example\";\n\nexport function ThemeZone() {\n  const runtime = useThemeRuntime();\n\n  return (\n    <AntdThemeProvider runtime={runtime}>\n      <Example />\n    </AntdThemeProvider>\n  );\n}\n\n// ---------------------------------------------------------------- app/layout.tsx\nimport { ThemeProvider } from \"@themvora/next\";\n\nimport { ThemeZone } from \"./theme-zone\";\n\n// ThemeProvider renders <html> and <body> itself — do not wrap it in them.\nexport default function RootLayout({ children }: { children: React.ReactNode }) {\n  return (\n    <ThemeProvider lang=\"en\" defaultTheme=\"plum-light\">\n      <ThemeZone />\n      {children}\n    </ThemeProvider>\n  );\n}",
    "themeSwitchExample": "\"use client\";\n\nimport { useTheme } from \"@themvora/next/client\";\nimport { Button, Stack } from \"antd\";\n\nexport function ThemeControls() {\n  const { setMode, toggleTheme } = useTheme();\n\n  return (\n    <Stack direction=\"row\" spacing={1}>\n      <Button onClick={toggleTheme}>Toggle</Button>\n      <Button onClick={() => setMode(\"light\")}>Light</Button>\n      <Button onClick={() => setMode(\"dark\")}>Dark</Button>\n    </Stack>\n  );\n}",
  },
  "antd/Remix": {
    "mountProvider": "import type { ReactNode } from \"react\";\nimport { Links, Meta, Outlet, Scripts, ScrollRestoration, useLoaderData } from \"@remix-run/react\";\nimport { getBuiltInThemes } from \"@themvora/core\";\nimport { ThemeHead, ThemeProvider } from \"@themvora/remix\";\nimport { getInitialThemeState } from \"@themvora/remix/server\";\n\nimport { ThemeZone } from \"./components/theme-zone\";\n\nconst themes = getBuiltInThemes();\nconst INITIAL_MODE = \"system\";\n\n// Resolve the selection server-side so hydration matches exactly.\nexport async function loader({ request }: { request: Request }) {\n  return {\n    initial: await getInitialThemeState(request, {\n      themes,\n      defaultTheme: \"light\",\n      mode: INITIAL_MODE,\n    }),\n  };\n}\n\nexport function Layout({ children }: { children: ReactNode }) {\n  const { initial } = useLoaderData<typeof loader>();\n\n  return (\n    <html lang=\"en\" data-theme={initial.theme.name} data-theme-ready=\"true\">\n      <head>\n        <meta charSet=\"utf-8\" />\n        <Meta />\n        <Links />\n        <ThemeHead themes={themes} defaultTheme=\"light\" mode={INITIAL_MODE} />\n      </head>\n      <body>\n        {children}\n        <ScrollRestoration />\n        <Scripts />\n      </body>\n    </html>\n  );\n}\n\nexport default function App() {\n  const { initial } = useLoaderData<typeof loader>();\n\n  return (\n    <ThemeProvider initial={initial} themes={themes} defaultTheme=\"light\">\n      <ThemeZone>\n        <Outlet />\n      </ThemeZone>\n    </ThemeProvider>\n  );\n}",
    "componentExample": "import { Button, Card, Typography } from \"antd\";\n\nexport function Example() {\n  return (\n    <Card>\n      <Typography.Title level={5}>Themvora + Ant Design</Typography.Title>\n      <Button type=\"primary\">Primary action</Button>\n    </Card>\n  );\n}",
    "completeExample": "import type { ReactNode } from \"react\";\nimport { Links, Meta, Outlet, Scripts, ScrollRestoration, useLoaderData } from \"@remix-run/react\";\nimport { getBuiltInThemes } from \"@themvora/core\";\nimport { ThemeHead, ThemeProvider, useThemeRuntime } from \"@themvora/remix\";\nimport { getInitialThemeState } from \"@themvora/remix/server\";\nimport { AntdThemeProvider } from \"@themvora/antd\";\n\nconst themes = getBuiltInThemes();\nconst INITIAL_MODE = \"system\";\n\n// Resolve the selection server-side so hydration matches exactly.\nexport async function loader({ request }: { request: Request }) {\n  return {\n    initial: await getInitialThemeState(request, {\n      themes,\n      defaultTheme: \"light\",\n      mode: INITIAL_MODE,\n    }),\n  };\n}\n\nexport function Layout({ children }: { children: ReactNode }) {\n  const { initial } = useLoaderData<typeof loader>();\n\n  return (\n    <html lang=\"en\" data-theme={initial.theme.name} data-theme-ready=\"true\">\n      <head>\n        <meta charSet=\"utf-8\" />\n        <Meta />\n        <Links />\n        <ThemeHead themes={themes} defaultTheme=\"light\" mode={INITIAL_MODE} />\n      </head>\n      <body>\n        {children}\n        <ScrollRestoration />\n        <Scripts />\n      </body>\n    </html>\n  );\n}\n\nexport default function App() {\n  const { initial } = useLoaderData<typeof loader>();\n  const runtime = useThemeRuntime();\n\n  return (\n    <ThemeProvider initial={initial} themes={themes} defaultTheme=\"light\">\n      <AntdThemeProvider runtime={runtime}>\n        <Outlet />\n      </AntdThemeProvider>\n    </ThemeProvider>\n  );\n}",
    "themeSwitchExample": "import { useTheme } from \"@themvora/remix\";\nimport { Button, Stack } from \"antd\";\n\nexport function ThemeControls() {\n  const { setMode, toggleTheme } = useTheme();\n\n  return (\n    <Stack direction=\"row\" spacing={1}>\n      <Button onClick={toggleTheme}>Toggle</Button>\n      <Button onClick={() => setMode(\"light\")}>Light</Button>\n      <Button onClick={() => setMode(\"dark\")}>Dark</Button>\n    </Stack>\n  );\n}",
  },
  "antd/Astro": {
    "mountProvider": "---\nimport Provider from \"@themvora/astro/provider.astro\";\nimport themeConfig from \"../../theme.config\";\n---\n\n<Provider config={themeConfig} lang=\"en\">\n  <slot />\n</Provider>",
    "componentExample": "// src/components/Example.tsx — a React island, because Ant Design is React-only.\nimport { Button, Card, Typography } from \"antd\";\n\nexport function Example() {\n  return (\n    <Card>\n      <Typography.Title level={5}>Themvora + Ant Design</Typography.Title>\n      <Button type=\"primary\">Primary action</Button>\n    </Card>\n  );\n}",
    "completeExample": "---\nimport Provider from \"@themvora/astro/provider.astro\";\nimport themeConfig from \"../../theme.config\";\n---\n\n<Provider config={themeConfig} lang=\"en\">\n  <slot />\n</Provider>\n\n<!-- src/pages/index.astro\n     Ant Design is a React component library, so its tree runs as an island. -->\n---\nimport BaseLayout from \"../layouts/BaseLayout.astro\";\nimport { ThemeZone } from \"../components/ThemeZone\";\n---\n\n<BaseLayout>\n  <ThemeZone client:only=\"react\" />\n</BaseLayout>\n\n<!-- src/components/ThemeZone.tsx\n     The island. The bridge sits inside it, below ThemeProvider. -->\n---\n\"use client\";\n\nimport { ThemeProvider, useThemeRuntime } from \"@themvora/react\";\nimport { AntdThemeProvider } from \"@themvora/antd\";\n\nimport { Example } from \"./Example\";\n\nfunction Bridge() {\n  const runtime = useThemeRuntime();\n  return (\n    <AntdThemeProvider runtime={runtime}>\n      <Example />\n    </AntdThemeProvider>\n  );\n}\n\nexport function ThemeZone() {\n  return (\n    <ThemeProvider defaultTheme=\"plum-light\" initialMode=\"system\">\n      <Bridge />\n    </ThemeProvider>\n  );\n}\n-->",
    "themeSwitchExample": "---\nimport ThemeToggle from \"@themvora/astro/ThemeToggle.astro\";\n---\n\n<!-- Astro ships the toggle as a component — no hook, no script. -->\n<ThemeToggle />",
  },
  "mantine/Next.js": {
    "mountProvider": "import { ThemeProvider } from \"@themvora/next\";\n\nimport { ThemeZone } from \"./theme-zone\";\n\n// ThemeProvider renders <html> and <body> itself — do not wrap it in them.\nexport default function RootLayout({ children }: { children: React.ReactNode }) {\n  return (\n    <ThemeProvider lang=\"en\" defaultTheme=\"plum-light\">\n      <ThemeZone>{children}</ThemeZone>\n    </ThemeProvider>\n  );\n}",
    "componentExample": "\"use client\";\n\nimport { Button, Card, Title } from \"@mantine/core\";\n\nexport function Example() {\n  return (\n    <Card withBorder padding=\"lg\">\n      <Title order={5}>Themvora + Mantine</Title>\n      <Button>Primary action</Button>\n    </Card>\n  );\n}",
    "completeExample": "\"use client\";\n\nimport { useThemeRuntime } from \"@themvora/next/client\";\nimport { MantineThemeProvider } from \"@themvora/mantine\";\n\nimport { Example } from \"./example\";\n\nexport function ThemeZone() {\n  const runtime = useThemeRuntime();\n\n  return (\n    <MantineThemeProvider runtime={runtime}>\n      <Example />\n    </MantineThemeProvider>\n  );\n}\n\n// ---------------------------------------------------------------- app/layout.tsx\nimport { ThemeProvider } from \"@themvora/next\";\n\nimport { ThemeZone } from \"./theme-zone\";\n\n// ThemeProvider renders <html> and <body> itself — do not wrap it in them.\nexport default function RootLayout({ children }: { children: React.ReactNode }) {\n  return (\n    <ThemeProvider lang=\"en\" defaultTheme=\"plum-light\">\n      <ThemeZone />\n      {children}\n    </ThemeProvider>\n  );\n}",
    "themeSwitchExample": "\"use client\";\n\nimport { useTheme } from \"@themvora/next/client\";\nimport { Button, Stack } from \"@mantine/core\";\n\nexport function ThemeControls() {\n  const { setMode, toggleTheme } = useTheme();\n\n  return (\n    <Stack direction=\"row\" spacing={1}>\n      <Button onClick={toggleTheme}>Toggle</Button>\n      <Button onClick={() => setMode(\"light\")}>Light</Button>\n      <Button onClick={() => setMode(\"dark\")}>Dark</Button>\n    </Stack>\n  );\n}",
  },
  "mantine/Remix": {
    "mountProvider": "import type { ReactNode } from \"react\";\nimport { Links, Meta, Outlet, Scripts, ScrollRestoration, useLoaderData } from \"@remix-run/react\";\nimport { getBuiltInThemes } from \"@themvora/core\";\nimport { ThemeHead, ThemeProvider } from \"@themvora/remix\";\nimport { getInitialThemeState } from \"@themvora/remix/server\";\n\nimport { ThemeZone } from \"./components/theme-zone\";\n\nconst themes = getBuiltInThemes();\nconst INITIAL_MODE = \"system\";\n\n// Resolve the selection server-side so hydration matches exactly.\nexport async function loader({ request }: { request: Request }) {\n  return {\n    initial: await getInitialThemeState(request, {\n      themes,\n      defaultTheme: \"light\",\n      mode: INITIAL_MODE,\n    }),\n  };\n}\n\nexport function Layout({ children }: { children: ReactNode }) {\n  const { initial } = useLoaderData<typeof loader>();\n\n  return (\n    <html lang=\"en\" data-theme={initial.theme.name} data-theme-ready=\"true\">\n      <head>\n        <meta charSet=\"utf-8\" />\n        <Meta />\n        <Links />\n        <ThemeHead themes={themes} defaultTheme=\"light\" mode={INITIAL_MODE} />\n      </head>\n      <body>\n        {children}\n        <ScrollRestoration />\n        <Scripts />\n      </body>\n    </html>\n  );\n}\n\nexport default function App() {\n  const { initial } = useLoaderData<typeof loader>();\n\n  return (\n    <ThemeProvider initial={initial} themes={themes} defaultTheme=\"light\">\n      <ThemeZone>\n        <Outlet />\n      </ThemeZone>\n    </ThemeProvider>\n  );\n}",
    "componentExample": "import { Button, Card, Title } from \"@mantine/core\";\n\nexport function Example() {\n  return (\n    <Card withBorder padding=\"lg\">\n      <Title order={5}>Themvora + Mantine</Title>\n      <Button>Primary action</Button>\n    </Card>\n  );\n}",
    "completeExample": "import type { ReactNode } from \"react\";\nimport { Links, Meta, Outlet, Scripts, ScrollRestoration, useLoaderData } from \"@remix-run/react\";\nimport { getBuiltInThemes } from \"@themvora/core\";\nimport { ThemeHead, ThemeProvider, useThemeRuntime } from \"@themvora/remix\";\nimport { getInitialThemeState } from \"@themvora/remix/server\";\nimport { MantineThemeProvider } from \"@themvora/mantine\";\n\nconst themes = getBuiltInThemes();\nconst INITIAL_MODE = \"system\";\n\n// Resolve the selection server-side so hydration matches exactly.\nexport async function loader({ request }: { request: Request }) {\n  return {\n    initial: await getInitialThemeState(request, {\n      themes,\n      defaultTheme: \"light\",\n      mode: INITIAL_MODE,\n    }),\n  };\n}\n\nexport function Layout({ children }: { children: ReactNode }) {\n  const { initial } = useLoaderData<typeof loader>();\n\n  return (\n    <html lang=\"en\" data-theme={initial.theme.name} data-theme-ready=\"true\">\n      <head>\n        <meta charSet=\"utf-8\" />\n        <Meta />\n        <Links />\n        <ThemeHead themes={themes} defaultTheme=\"light\" mode={INITIAL_MODE} />\n      </head>\n      <body>\n        {children}\n        <ScrollRestoration />\n        <Scripts />\n      </body>\n    </html>\n  );\n}\n\nexport default function App() {\n  const { initial } = useLoaderData<typeof loader>();\n  const runtime = useThemeRuntime();\n\n  return (\n    <ThemeProvider initial={initial} themes={themes} defaultTheme=\"light\">\n      <MantineThemeProvider runtime={runtime}>\n        <Outlet />\n      </MantineThemeProvider>\n    </ThemeProvider>\n  );\n}",
    "themeSwitchExample": "import { useTheme } from \"@themvora/remix\";\nimport { Button, Stack } from \"@mantine/core\";\n\nexport function ThemeControls() {\n  const { setMode, toggleTheme } = useTheme();\n\n  return (\n    <Stack direction=\"row\" spacing={1}>\n      <Button onClick={toggleTheme}>Toggle</Button>\n      <Button onClick={() => setMode(\"light\")}>Light</Button>\n      <Button onClick={() => setMode(\"dark\")}>Dark</Button>\n    </Stack>\n  );\n}",
  },
  "mantine/Astro": {
    "mountProvider": "---\nimport Provider from \"@themvora/astro/provider.astro\";\nimport themeConfig from \"../../theme.config\";\n---\n\n<Provider config={themeConfig} lang=\"en\">\n  <slot />\n</Provider>",
    "componentExample": "// src/components/Example.tsx — a React island, because Mantine is React-only.\nimport { Button, Card, Title } from \"@mantine/core\";\n\nexport function Example() {\n  return (\n    <Card withBorder padding=\"lg\">\n      <Title order={5}>Themvora + Mantine</Title>\n      <Button>Primary action</Button>\n    </Card>\n  );\n}",
    "completeExample": "---\nimport Provider from \"@themvora/astro/provider.astro\";\nimport themeConfig from \"../../theme.config\";\n---\n\n<Provider config={themeConfig} lang=\"en\">\n  <slot />\n</Provider>\n\n<!-- src/pages/index.astro\n     Mantine is a React component library, so its tree runs as an island. -->\n---\nimport BaseLayout from \"../layouts/BaseLayout.astro\";\nimport { ThemeZone } from \"../components/ThemeZone\";\n---\n\n<BaseLayout>\n  <ThemeZone client:only=\"react\" />\n</BaseLayout>\n\n<!-- src/components/ThemeZone.tsx\n     The island. The bridge sits inside it, below ThemeProvider. -->\n---\n\"use client\";\n\nimport { ThemeProvider, useThemeRuntime } from \"@themvora/react\";\nimport { MantineThemeProvider } from \"@themvora/mantine\";\n\nimport { Example } from \"./Example\";\n\nfunction Bridge() {\n  const runtime = useThemeRuntime();\n  return (\n    <MantineThemeProvider runtime={runtime}>\n      <Example />\n    </MantineThemeProvider>\n  );\n}\n\nexport function ThemeZone() {\n  return (\n    <ThemeProvider defaultTheme=\"plum-light\" initialMode=\"system\">\n      <Bridge />\n    </ThemeProvider>\n  );\n}\n-->",
    "themeSwitchExample": "---\nimport ThemeToggle from \"@themvora/astro/ThemeToggle.astro\";\n---\n\n<!-- Astro ships the toggle as a component — no hook, no script. -->\n<ThemeToggle />",
  },
  "shadcn/Next.js": {
    "mountProvider": "import { ThemeProvider } from \"@themvora/next\";\nimport \"@themvora/shadcn/shadcn.css\";\n\nimport { ThemeZone } from \"./theme-zone\";\n\n// ThemeProvider renders <html> and <body> itself — do not wrap it in them.\nexport default function RootLayout({ children }: { children: React.ReactNode }) {\n  return (\n    <ThemeProvider lang=\"en\" defaultTheme=\"plum-light\">\n      <ThemeZone>{children}</ThemeZone>\n    </ThemeProvider>\n  );\n}",
    "themeSwitchExample": "\"use client\";\n\nimport { useTheme } from \"@themvora/next/client\";\n\nexport function ThemeControls() {\n  const { setMode, toggleTheme } = useTheme();\n\n  return (\n    <>\n      <button type=\"button\" onClick={() => toggleTheme()}>Toggle</button>\n      <button type=\"button\" onClick={() => setMode(\"light\")}>Light</button>\n      <button type=\"button\" onClick={() => setMode(\"dark\")}>Dark</button>\n    </>\n  );\n}",
    "componentExample": "\"use client\";\n\nimport \"@themvora/shadcn/shadcn.css\";\n\nexport function Example() {\n  return (\n    <div className=\"card\">\n      <h2>Themvora + shadcn/ui</h2>\n      <button className=\"primary\">Primary action</button>\n    </div>\n  );\n}",
    "completeExample": "\"use client\";\n\nimport { useThemeRuntime } from \"@themvora/next/client\";\nimport { useShadcnTheme } from \"@themvora/shadcn/react\";\n\nimport { Example } from \"./example\";\n\nexport function ThemeZone() {\n  useShadcnTheme(useThemeRuntime());\n\n  return <Example />;\n}\n\n// ---------------------------------------------------------------- app/layout.tsx\nimport { ThemeProvider } from \"@themvora/next\";\nimport \"@themvora/shadcn/shadcn.css\";\n\nimport { ThemeZone } from \"./theme-zone\";\n\n// ThemeProvider renders <html> and <body> itself — do not wrap it in them.\nexport default function RootLayout({ children }: { children: React.ReactNode }) {\n  return (\n    <ThemeProvider lang=\"en\" defaultTheme=\"plum-light\">\n      <ThemeZone />\n      {children}\n    </ThemeProvider>\n  );\n}",
  },
  "bootstrap/Next.js": {
    "mountProvider": "import { ThemeProvider } from \"@themvora/next\";\nimport \"@themvora/bootstrap/bootstrap.css\";\n\nimport { ThemeZone } from \"./theme-zone\";\n\n// ThemeProvider renders <html> and <body> itself — do not wrap it in them.\nexport default function RootLayout({ children }: { children: React.ReactNode }) {\n  return (\n    <ThemeProvider lang=\"en\" defaultTheme=\"plum-light\">\n      <ThemeZone>{children}</ThemeZone>\n    </ThemeProvider>\n  );\n}",
    "themeSwitchExample": "\"use client\";\n\nimport { useTheme } from \"@themvora/next/client\";\n\nexport function ThemeControls() {\n  const { setMode, toggleTheme } = useTheme();\n\n  return (\n    <>\n      <button type=\"button\" onClick={() => toggleTheme()}>Toggle</button>\n      <button type=\"button\" onClick={() => setMode(\"light\")}>Light</button>\n      <button type=\"button\" onClick={() => setMode(\"dark\")}>Dark</button>\n    </>\n  );\n}",
    "componentExample": "\"use client\";\n\nimport \"@themvora/bootstrap/bootstrap.css\";\n\nexport function Example() {\n  return (\n    <div className=\"card\">\n      <div className=\"card-body\">\n        <h5 className=\"card-title\">Themvora + Bootstrap</h5>\n        <button type=\"button\" className=\"btn btn-primary\">Primary action</button>\n      </div>\n    </div>\n  );\n}",
    "completeExample": "\"use client\";\n\nimport { useThemeRuntime } from \"@themvora/next/client\";\nimport { useBootstrapTheme } from \"@themvora/bootstrap/react\";\n\nimport { Example } from \"./example\";\n\nexport function ThemeZone() {\n  useBootstrapTheme(useThemeRuntime());\n\n  return <Example />;\n}\n\n// ---------------------------------------------------------------- app/layout.tsx\nimport { ThemeProvider } from \"@themvora/next\";\nimport \"@themvora/bootstrap/bootstrap.css\";\n\nimport { ThemeZone } from \"./theme-zone\";\n\n// ThemeProvider renders <html> and <body> itself — do not wrap it in them.\nexport default function RootLayout({ children }: { children: React.ReactNode }) {\n  return (\n    <ThemeProvider lang=\"en\" defaultTheme=\"plum-light\">\n      <ThemeZone />\n      {children}\n    </ThemeProvider>\n  );\n}",
  },
  "daisyui/Next.js": {
    "mountProvider": "import { ThemeProvider } from \"@themvora/next\";\nimport \"@themvora/daisyui/daisyui.css\";\n\nimport { ThemeZone } from \"./theme-zone\";\n\n// ThemeProvider renders <html> and <body> itself — do not wrap it in them.\nexport default function RootLayout({ children }: { children: React.ReactNode }) {\n  return (\n    <ThemeProvider lang=\"en\" defaultTheme=\"plum-light\">\n      <ThemeZone>{children}</ThemeZone>\n    </ThemeProvider>\n  );\n}",
    "themeSwitchExample": "\"use client\";\n\nimport { useTheme } from \"@themvora/next/client\";\n\nexport function ThemeControls() {\n  const { setMode, toggleTheme } = useTheme();\n\n  return (\n    <>\n      <button type=\"button\" onClick={() => toggleTheme()}>Toggle</button>\n      <button type=\"button\" onClick={() => setMode(\"light\")}>Light</button>\n      <button type=\"button\" onClick={() => setMode(\"dark\")}>Dark</button>\n    </>\n  );\n}",
    "componentExample": "\"use client\";\n\nimport \"@themvora/daisyui/daisyui.css\";\n\nexport function Example() {\n  return (\n    <div className=\"d-card\">\n      <div className=\"d-card-body\">\n        <h4 className=\"d-card-title\">Themvora + daisyUI</h4>\n        <button className=\"d-btn d-btn-primary\">Primary action</button>\n      </div>\n    </div>\n  );\n}",
    "completeExample": "\"use client\";\n\nimport { useThemeRuntime } from \"@themvora/next/client\";\nimport { useDaisyTheme } from \"@themvora/daisyui/react\";\n\nimport { Example } from \"./example\";\n\nexport function ThemeZone() {\n  useDaisyTheme(useThemeRuntime());\n\n  return <Example />;\n}\n\n// ---------------------------------------------------------------- app/layout.tsx\nimport { ThemeProvider } from \"@themvora/next\";\nimport \"@themvora/daisyui/daisyui.css\";\n\nimport { ThemeZone } from \"./theme-zone\";\n\n// ThemeProvider renders <html> and <body> itself — do not wrap it in them.\nexport default function RootLayout({ children }: { children: React.ReactNode }) {\n  return (\n    <ThemeProvider lang=\"en\" defaultTheme=\"plum-light\">\n      <ThemeZone />\n      {children}\n    </ThemeProvider>\n  );\n}",
  },
  "open-props/Next.js": {
    "mountProvider": "import { ThemeProvider } from \"@themvora/next\";\nimport \"@themvora/open-props/open-props.css\";\n\nimport { ThemeZone } from \"./theme-zone\";\n\n// ThemeProvider renders <html> and <body> itself — do not wrap it in them.\nexport default function RootLayout({ children }: { children: React.ReactNode }) {\n  return (\n    <ThemeProvider lang=\"en\" defaultTheme=\"plum-light\">\n      <ThemeZone>{children}</ThemeZone>\n    </ThemeProvider>\n  );\n}",
    "themeSwitchExample": "\"use client\";\n\nimport { useTheme } from \"@themvora/next/client\";\n\nexport function ThemeControls() {\n  const { setMode, toggleTheme } = useTheme();\n\n  return (\n    <>\n      <button type=\"button\" onClick={() => toggleTheme()}>Toggle</button>\n      <button type=\"button\" onClick={() => setMode(\"light\")}>Light</button>\n      <button type=\"button\" onClick={() => setMode(\"dark\")}>Dark</button>\n    </>\n  );\n}",
    "componentExample": "\"use client\";\n\nimport \"@themvora/open-props/open-props.css\";\n\nexport function Example() {\n  return (\n    <div className=\"surface\">\n      <h2>Themvora + Open Props</h2>\n      <button className=\"primary\">Primary action</button>\n    </div>\n  );\n}",
    "completeExample": "\"use client\";\n\nimport { useThemeRuntime } from \"@themvora/next/client\";\nimport { useOpenPropsTheme } from \"@themvora/open-props/react\";\n\nimport { Example } from \"./example\";\n\nexport function ThemeZone() {\n  useOpenPropsTheme(useThemeRuntime());\n\n  return <Example />;\n}\n\n// ---------------------------------------------------------------- app/layout.tsx\nimport { ThemeProvider } from \"@themvora/next\";\nimport \"@themvora/open-props/open-props.css\";\n\nimport { ThemeZone } from \"./theme-zone\";\n\n// ThemeProvider renders <html> and <body> itself — do not wrap it in them.\nexport default function RootLayout({ children }: { children: React.ReactNode }) {\n  return (\n    <ThemeProvider lang=\"en\" defaultTheme=\"plum-light\">\n      <ThemeZone />\n      {children}\n    </ThemeProvider>\n  );\n}",
  },
  "mui/Next.js": {
    "mountProvider": "import { ThemeProvider } from \"@themvora/next\";\n\nimport { ThemeZone } from \"./theme-zone\";\n\n// ThemeProvider renders <html> and <body> itself — do not wrap it in them.\nexport default function RootLayout({ children }: { children: React.ReactNode }) {\n  return (\n    <ThemeProvider lang=\"en\" defaultTheme=\"plum-light\">\n      <ThemeZone>{children}</ThemeZone>\n    </ThemeProvider>\n  );\n}",
    "themeSwitchExample": "\"use client\";\n\nimport { useTheme } from \"@themvora/next/client\";\nimport { Button, Stack } from \"@mui/material\";\n\nexport function ThemeControls() {\n  const { setMode, toggleTheme } = useTheme();\n\n  return (\n    <Stack direction=\"row\" spacing={1}>\n      <Button onClick={toggleTheme}>Toggle</Button>\n      <Button onClick={() => setMode(\"light\")}>Light</Button>\n      <Button onClick={() => setMode(\"dark\")}>Dark</Button>\n    </Stack>\n  );\n}",
    "componentExample": "\"use client\";\n\nimport { Button, Card, CardContent, Typography } from \"@mui/material\";\n\nexport default function Page() {\n  return (\n    <Card>\n      <CardContent>\n        <Typography variant=\"h6\">Themvora + Material UI</Typography>\n        <Button variant=\"contained\">Primary action</Button>\n      </CardContent>\n    </Card>\n  );\n}",
    "completeExample": "\"use client\";\n\nimport { useThemeRuntime } from \"@themvora/next/client\";\nimport { MuiThemeProvider } from \"@themvora/mui\";\n\nimport { Example } from \"./example\";\n\nexport function ThemeZone() {\n  const runtime = useThemeRuntime();\n\n  return (\n    <MuiThemeProvider runtime={runtime}>\n      <Example />\n    </MuiThemeProvider>\n  );\n}\n\n// ---------------------------------------------------------------- app/layout.tsx\nimport { ThemeProvider } from \"@themvora/next\";\n\nimport { ThemeZone } from \"./theme-zone\";\n\n// ThemeProvider renders <html> and <body> itself — do not wrap it in them.\nexport default function RootLayout({ children }: { children: React.ReactNode }) {\n  return (\n    <ThemeProvider lang=\"en\" defaultTheme=\"plum-light\">\n      <ThemeZone />\n      {children}\n    </ThemeProvider>\n  );\n}",
  },
  "mui/Remix": {
    "mountProvider": "import type { ReactNode } from \"react\";\nimport { Links, Meta, Outlet, Scripts, ScrollRestoration, useLoaderData } from \"@remix-run/react\";\nimport { getBuiltInThemes } from \"@themvora/core\";\nimport { ThemeHead, ThemeProvider } from \"@themvora/remix\";\nimport { getInitialThemeState } from \"@themvora/remix/server\";\n\nimport { ThemeZone } from \"./components/theme-zone\";\n\nconst themes = getBuiltInThemes();\nconst INITIAL_MODE = \"system\";\n\n// Resolve the selection server-side so hydration matches exactly.\nexport async function loader({ request }: { request: Request }) {\n  return {\n    initial: await getInitialThemeState(request, {\n      themes,\n      defaultTheme: \"light\",\n      mode: INITIAL_MODE,\n    }),\n  };\n}\n\nexport function Layout({ children }: { children: ReactNode }) {\n  const { initial } = useLoaderData<typeof loader>();\n\n  return (\n    <html lang=\"en\" data-theme={initial.theme.name} data-theme-ready=\"true\">\n      <head>\n        <meta charSet=\"utf-8\" />\n        <Meta />\n        <Links />\n        <ThemeHead themes={themes} defaultTheme=\"light\" mode={INITIAL_MODE} />\n      </head>\n      <body>\n        {children}\n        <ScrollRestoration />\n        <Scripts />\n      </body>\n    </html>\n  );\n}\n\nexport default function App() {\n  const { initial } = useLoaderData<typeof loader>();\n\n  return (\n    <ThemeProvider initial={initial} themes={themes} defaultTheme=\"light\">\n      <ThemeZone>\n        <Outlet />\n      </ThemeZone>\n    </ThemeProvider>\n  );\n}",
    "themeSwitchExample": "import { useTheme } from \"@themvora/remix\";\nimport { Button, Stack } from \"@mui/material\";\n\nexport function ThemeControls() {\n  const { setMode, toggleTheme } = useTheme();\n\n  return (\n    <Stack direction=\"row\" spacing={1}>\n      <Button onClick={toggleTheme}>Toggle</Button>\n      <Button onClick={() => setMode(\"light\")}>Light</Button>\n      <Button onClick={() => setMode(\"dark\")}>Dark</Button>\n    </Stack>\n  );\n}",
    "componentExample": "import { Button, Card, CardContent, Typography } from \"@mui/material\";\n\nexport function Example() {\n  return (\n    <Card>\n      <CardContent>\n        <Typography variant=\"h6\">Themvora + Material UI</Typography>\n        <Button variant=\"contained\">Primary action</Button>\n      </CardContent>\n    </Card>\n  );\n}",
    "completeExample": "import type { ReactNode } from \"react\";\nimport { Links, Meta, Outlet, Scripts, ScrollRestoration, useLoaderData } from \"@remix-run/react\";\nimport { getBuiltInThemes } from \"@themvora/core\";\nimport { ThemeHead, ThemeProvider, useThemeRuntime } from \"@themvora/remix\";\nimport { getInitialThemeState } from \"@themvora/remix/server\";\nimport { MuiThemeProvider } from \"@themvora/mui\";\n\nconst themes = getBuiltInThemes();\nconst INITIAL_MODE = \"system\";\n\n// Resolve the selection server-side so hydration matches exactly.\nexport async function loader({ request }: { request: Request }) {\n  return {\n    initial: await getInitialThemeState(request, {\n      themes,\n      defaultTheme: \"light\",\n      mode: INITIAL_MODE,\n    }),\n  };\n}\n\nexport function Layout({ children }: { children: ReactNode }) {\n  const { initial } = useLoaderData<typeof loader>();\n\n  return (\n    <html lang=\"en\" data-theme={initial.theme.name} data-theme-ready=\"true\">\n      <head>\n        <meta charSet=\"utf-8\" />\n        <Meta />\n        <Links />\n        <ThemeHead themes={themes} defaultTheme=\"light\" mode={INITIAL_MODE} />\n      </head>\n      <body>\n        {children}\n        <ScrollRestoration />\n        <Scripts />\n      </body>\n    </html>\n  );\n}\n\nexport default function App() {\n  const { initial } = useLoaderData<typeof loader>();\n  const runtime = useThemeRuntime();\n\n  return (\n    <ThemeProvider initial={initial} themes={themes} defaultTheme=\"light\">\n      <MuiThemeProvider runtime={runtime}>\n        <Outlet />\n      </MuiThemeProvider>\n    </ThemeProvider>\n  );\n}",
  },
  "mui/Astro": {
    "mountProvider": "---\nimport Provider from \"@themvora/astro/provider.astro\";\nimport themeConfig from \"../../theme.config\";\n---\n\n<Provider config={themeConfig} lang=\"en\">\n  <slot />\n</Provider>",
    "themeSwitchExample": "---\nimport ThemeToggle from \"@themvora/astro/ThemeToggle.astro\";\n---\n\n<ThemeToggle />",
    "componentExample": "---\nimport MuiIsland from \"../components/MuiIsland\";\n---\n\n<!-- MUI is React-only, so it runs as an island. -->\n<MuiIsland client:only=\"react\" />",
    "completeExample": "---\nimport Provider from \"@themvora/astro/provider.astro\";\nimport themeConfig from \"../../theme.config\";\n---\n\n<Provider config={themeConfig} lang=\"en\">\n  <slot />\n</Provider>\n\n<!-- src/pages/index.astro\n     Material UI is a React component library, so its tree runs as an island. -->\n---\nimport BaseLayout from \"../layouts/BaseLayout.astro\";\nimport { ThemeZone } from \"../components/ThemeZone\";\n---\n\n<BaseLayout>\n  <ThemeZone client:only=\"react\" />\n</BaseLayout>\n\n<!-- src/components/ThemeZone.tsx\n     The island. The bridge sits inside it, below ThemeProvider. -->\n---\n\"use client\";\n\nimport { ThemeProvider, useThemeRuntime } from \"@themvora/react\";\nimport { MuiThemeProvider } from \"@themvora/mui\";\n\nimport { Example } from \"./Example\";\n\nfunction Bridge() {\n  const runtime = useThemeRuntime();\n  return (\n    <MuiThemeProvider runtime={runtime}>\n      <Example />\n    </MuiThemeProvider>\n  );\n}\n\nexport function ThemeZone() {\n  return (\n    <ThemeProvider defaultTheme=\"plum-light\" initialMode=\"system\">\n      <Bridge />\n    </ThemeProvider>\n  );\n}\n-->",
  },
  "shadcn/Solid": {
    "mountProvider": "import { render } from \"solid-js/web\";\nimport { ThemeProvider } from \"@themvora/solid\";\nimport \"@themvora/shadcn/shadcn.css\";\n\nimport { App } from \"./App\";\nimport { InstallAdapter } from \"./components/InstallAdapter\";\n\nrender(\n  () => (\n    <ThemeProvider defaultTheme=\"plum-light\" initialMode=\"system\">\n      <InstallAdapter />\n      <App />\n    </ThemeProvider>\n  ),\n  document.getElementById(\"root\")!,\n);",
    "themeSwitchExample": "import { useTheme } from \"@themvora/solid\";\n\nexport function ThemeControls() {\n  const { setMode, toggleTheme } = useTheme();\n\n  return (\n    <>\n      <button type=\"button\" onClick={() => toggleTheme()}>Toggle</button>\n      <button type=\"button\" onClick={() => setMode(\"light\")}>Light</button>\n      <button type=\"button\" onClick={() => setMode(\"dark\")}>Dark</button>\n    </>\n  );\n}",
    "componentExample": "import \"@themvora/shadcn/shadcn.css\";\n\nexport function Example() {\n  return (\n    <div className=\"card\">\n      <h2>Themvora + shadcn/ui</h2>\n      <button className=\"primary\">Primary action</button>\n    </div>\n  );\n}",
    "completeExample": "import { render } from \"solid-js/web\";\nimport { ThemeProvider } from \"@themvora/solid\";\nimport \"@themvora/shadcn/shadcn.css\";\n\nimport { App } from \"./App\";\nimport { InstallAdapter } from \"./components/InstallAdapter\";\n\nrender(\n  () => (\n    <ThemeProvider defaultTheme=\"plum-light\" initialMode=\"system\">\n      <InstallAdapter />\n      <App />\n    </ThemeProvider>\n  ),\n  document.getElementById(\"root\")!,\n);\n\n// src/components/InstallAdapter.tsx\nimport { useThemeRuntime } from \"@themvora/solid\";\nimport { useShadcnTheme } from \"@themvora/shadcn/solid\";\n\nexport function InstallAdapter() {\n  useShadcnTheme(useThemeRuntime());\n  return null;\n}",
  },
  "shadcn/Vue 3": {
    "mountProvider": "<script setup lang=\"ts\">\nimport { ThemeProvider } from \"@themvora/vue\";\nimport \"@themvora/shadcn/shadcn.css\";\n\nimport ThemeZone from \"./components/ThemeZone.vue\";\n</script>\n\n<template>\n  <ThemeProvider default-theme=\"plum-light\" initial-mode=\"system\">\n    <ThemeZone />\n  </ThemeProvider>\n</template>",
    "themeSwitchExample": "<!-- src/components/ThemeControls.vue -->\n<script setup lang=\"ts\">\nimport { useTheme } from \"@themvora/vue\";\n\nconst { setMode, toggleTheme } = useTheme();\n</script>\n\n<template>\n  <button type=\"button\" @click=\"toggleTheme()\">Toggle</button>\n  <button type=\"button\" @click=\"setMode('light')\">Light</button>\n  <button type=\"button\" @click=\"setMode('dark')\">Dark</button>\n</template>",
    "componentExample": "<template>\n  <div class=\"card\">\n    <h2>Themvora + shadcn/ui</h2>\n    <button class=\"primary\">Primary action</button>\n  </div>\n</template>\n\n<style scoped>\n.card {\n    background: var(--card);\n    color: var(--card-foreground);\n    border: 1px solid var(--border);\n    border-radius: 0.5rem;\n    padding: 1rem;\n  }\n  .primary {\n    background: var(--primary);\n    color: var(--primary-foreground);\n    border-radius: 0.375rem;\n    padding: 0.5rem 1rem;\n  }\n</style>\n",
    "completeExample": "<script setup lang=\"ts\">\nimport { ThemeProvider } from \"@themvora/vue\";\nimport \"@themvora/shadcn/shadcn.css\";\n\nimport ThemeZone from \"./components/ThemeZone.vue\";\n</script>\n\n<template>\n  <ThemeProvider default-theme=\"plum-light\" initial-mode=\"system\">\n    <ThemeZone />\n  </ThemeProvider>\n</template>\n\n<!-- src/components/ThemeZone.vue\n     Mount inside <ThemeProvider> — the hook reads the runtime from context. -->\n<script setup lang=\"ts\">\nimport { useShadcnTheme } from \"@themvora/shadcn/vue\";\nimport { useThemeRuntime } from \"@themvora/vue\";\n\nuseShadcnTheme(useThemeRuntime());\n</script>\n\n<template>\n  <Example />\n</template>",
  },
  "shadcn/Svelte": {
    "mountProvider": "<script lang=\"ts\">\n  import { ThemeProvider } from \"@themvora/svelte\";\n  import \"@themvora/shadcn/shadcn.css\";\n\n  import ThemeZone from \"./components/ThemeZone.svelte\";\n</script>\n\n<ThemeProvider defaultTheme=\"plum-light\" initialMode=\"system\">\n  <ThemeZone />\n</ThemeProvider>",
    "themeSwitchExample": "<script lang=\"ts\">\n  import { useTheme } from \"@themvora/svelte\";\n\n  const { setMode, toggleTheme } = useTheme();\n</script>\n\n<button type=\"button\" onclick={() => toggleTheme()}>Toggle</button>\n<button type=\"button\" onclick={() => setMode(\"light\")}>Light</button>\n<button type=\"button\" onclick={() => setMode(\"dark\")}>Dark</button>",
    "componentExample": "  <div class=\"card\">\n    <h2>Themvora + shadcn/ui</h2>\n    <button class=\"primary\">Primary action</button>\n  </div>\n\n<style>\n.card {\n    background: var(--card);\n    color: var(--card-foreground);\n    border: 1px solid var(--border);\n    border-radius: 0.5rem;\n    padding: 1rem;\n  }\n  .primary {\n    background: var(--primary);\n    color: var(--primary-foreground);\n    border-radius: 0.375rem;\n    padding: 0.5rem 1rem;\n  }\n</style>\n",
    "completeExample": "<script lang=\"ts\">\n  import { ThemeProvider } from \"@themvora/svelte\";\n  import \"@themvora/shadcn/shadcn.css\";\n\n  import ThemeZone from \"./components/ThemeZone.svelte\";\n</script>\n\n<ThemeProvider defaultTheme=\"plum-light\" initialMode=\"system\">\n  <ThemeZone />\n</ThemeProvider>\n\n<!-- src/components/ThemeZone.svelte\n     Mount inside <ThemeProvider> — the hook reads the runtime from context. -->\n<script lang=\"ts\">\n  import { useShadcnTheme } from \"@themvora/shadcn/svelte\";\nimport { useThemeRuntime } from \"@themvora/svelte\";\n\n  useShadcnTheme(useThemeRuntime());\n</script>\n\n<Example />",
  },
  "bootstrap/Vue 3": {
    "mountProvider": "<script setup lang=\"ts\">\nimport { ThemeProvider } from \"@themvora/vue\";\nimport \"@themvora/bootstrap/bootstrap.css\";\n\nimport ThemeZone from \"./components/ThemeZone.vue\";\n</script>\n\n<template>\n  <ThemeProvider default-theme=\"plum-light\" initial-mode=\"system\">\n    <ThemeZone />\n  </ThemeProvider>\n</template>",
    "themeSwitchExample": "<!-- src/components/ThemeControls.vue -->\n<script setup lang=\"ts\">\nimport { useTheme } from \"@themvora/vue\";\n\nconst { setMode, toggleTheme } = useTheme();\n</script>\n\n<template>\n  <button type=\"button\" @click=\"toggleTheme()\">Toggle</button>\n  <button type=\"button\" @click=\"setMode('light')\">Light</button>\n  <button type=\"button\" @click=\"setMode('dark')\">Dark</button>\n</template>",
    "componentExample": "<template>\n  <div class=\"card\">\n    <div class=\"card-body\">\n      <h5 class=\"card-title\">Themvora + Bootstrap</h5>\n      <button type=\"button\" class=\"btn btn-primary\">Primary action</button>\n    </div>\n  </div>\n</template>\n",
    "completeExample": "<script setup lang=\"ts\">\nimport { ThemeProvider } from \"@themvora/vue\";\nimport \"@themvora/bootstrap/bootstrap.css\";\n\nimport ThemeZone from \"./components/ThemeZone.vue\";\n</script>\n\n<template>\n  <ThemeProvider default-theme=\"plum-light\" initial-mode=\"system\">\n    <ThemeZone />\n  </ThemeProvider>\n</template>\n\n<!-- src/components/ThemeZone.vue\n     Mount inside <ThemeProvider> — the hook reads the runtime from context. -->\n<script setup lang=\"ts\">\nimport { useBootstrapTheme } from \"@themvora/bootstrap/vue\";\nimport { useThemeRuntime } from \"@themvora/vue\";\n\nuseBootstrapTheme(useThemeRuntime());\n</script>\n\n<template>\n  <Example />\n</template>",
  },
  "daisyui/Vue 3": {
    "mountProvider": "<script setup lang=\"ts\">\nimport { ThemeProvider } from \"@themvora/vue\";\nimport \"@themvora/daisyui/daisyui.css\";\n\nimport ThemeZone from \"./components/ThemeZone.vue\";\n</script>\n\n<template>\n  <ThemeProvider default-theme=\"plum-light\" initial-mode=\"system\">\n    <ThemeZone />\n  </ThemeProvider>\n</template>",
    "themeSwitchExample": "<!-- src/components/ThemeControls.vue -->\n<script setup lang=\"ts\">\nimport { useTheme } from \"@themvora/vue\";\n\nconst { setMode, toggleTheme } = useTheme();\n</script>\n\n<template>\n  <button type=\"button\" @click=\"toggleTheme()\">Toggle</button>\n  <button type=\"button\" @click=\"setMode('light')\">Light</button>\n  <button type=\"button\" @click=\"setMode('dark')\">Dark</button>\n</template>",
    "componentExample": "<template>\n  <div class=\"d-card\">\n    <div class=\"d-card-body\">\n      <h4 class=\"d-card-title\">Themvora + daisyUI</h4>\n      <button class=\"d-btn d-btn-primary\">Primary action</button>\n    </div>\n  </div>\n</template>\n",
    "completeExample": "<script setup lang=\"ts\">\nimport { ThemeProvider } from \"@themvora/vue\";\nimport \"@themvora/daisyui/daisyui.css\";\n\nimport ThemeZone from \"./components/ThemeZone.vue\";\n</script>\n\n<template>\n  <ThemeProvider default-theme=\"plum-light\" initial-mode=\"system\">\n    <ThemeZone />\n  </ThemeProvider>\n</template>\n\n<!-- src/components/ThemeZone.vue\n     Mount inside <ThemeProvider> — the hook reads the runtime from context. -->\n<script setup lang=\"ts\">\nimport { useDaisyTheme } from \"@themvora/daisyui/vue\";\nimport { useThemeRuntime } from \"@themvora/vue\";\n\nuseDaisyTheme(useThemeRuntime());\n</script>\n\n<template>\n  <Example />\n</template>",
  },
  "open-props/Vue 3": {
    "mountProvider": "<script setup lang=\"ts\">\nimport { ThemeProvider } from \"@themvora/vue\";\nimport \"@themvora/open-props/open-props.css\";\n\nimport ThemeZone from \"./components/ThemeZone.vue\";\n</script>\n\n<template>\n  <ThemeProvider default-theme=\"plum-light\" initial-mode=\"system\">\n    <ThemeZone />\n  </ThemeProvider>\n</template>",
    "themeSwitchExample": "<!-- src/components/ThemeControls.vue -->\n<script setup lang=\"ts\">\nimport { useTheme } from \"@themvora/vue\";\n\nconst { setMode, toggleTheme } = useTheme();\n</script>\n\n<template>\n  <button type=\"button\" @click=\"toggleTheme()\">Toggle</button>\n  <button type=\"button\" @click=\"setMode('light')\">Light</button>\n  <button type=\"button\" @click=\"setMode('dark')\">Dark</button>\n</template>",
    "componentExample": "<template>\n  <div class=\"surface\">\n    <h2>Themvora + Open Props</h2>\n    <button class=\"primary\">Primary action</button>\n  </div>\n</template>\n\n<style scoped>\n.surface {\n    background: var(--color-surface);\n    color: var(--color-text);\n    border: 1px solid var(--color-border);\n    border-radius: var(--radius-2);\n    padding: var(--size-3);\n  }\n  .primary {\n    background: var(--color-primary);\n    color: var(--color-primary-foreground);\n    border-radius: var(--radius-2);\n    padding: var(--size-2) var(--size-3);\n  }\n</style>\n",
    "completeExample": "<script setup lang=\"ts\">\nimport { ThemeProvider } from \"@themvora/vue\";\nimport \"@themvora/open-props/open-props.css\";\n\nimport ThemeZone from \"./components/ThemeZone.vue\";\n</script>\n\n<template>\n  <ThemeProvider default-theme=\"plum-light\" initial-mode=\"system\">\n    <ThemeZone />\n  </ThemeProvider>\n</template>\n\n<!-- src/components/ThemeZone.vue\n     Mount inside <ThemeProvider> — the hook reads the runtime from context. -->\n<script setup lang=\"ts\">\nimport { useOpenPropsTheme } from \"@themvora/open-props/vue\";\nimport { useThemeRuntime } from \"@themvora/vue\";\n\nuseOpenPropsTheme(useThemeRuntime());\n</script>\n\n<template>\n  <Example />\n</template>",
  },
  "chakra/React": {
    "mountProvider": "import { ThemeProvider } from \"@themvora/react\";\n\nimport { Page } from \"./Page\";\nimport { ThemeZone } from \"./components/ThemeZone\";\n\nexport default function App() {\n  return (\n    <ThemeProvider defaultTheme=\"plum-light\" initialMode=\"system\">\n      <ThemeZone>\n        <Page />\n      </ThemeZone>\n    </ThemeProvider>\n  );\n}",
    "componentExample": "import { Box, Button, Heading } from \"@chakra-ui/react\";\n\nexport function Example() {\n  return (\n    <Box p=\"6\" borderWidth=\"1px\" borderRadius=\"lg\">\n      <Heading size=\"md\">Themvora + Chakra UI</Heading>\n      <Button colorPalette=\"primary\">Primary action</Button>\n    </Box>\n  );\n}",
    "completeExample": "import { ThemeProvider, useThemeRuntime } from \"@themvora/react\";\nimport { ChakraThemeProvider } from \"@themvora/chakra\";\n\nimport { Example } from \"./Example\";\n\n// The bridge rebuilds Chakra UI's theme whenever Themvora's active theme changes.\nfunction ThemeZone() {\n  const runtime = useThemeRuntime();\n\n  return (\n    <ChakraThemeProvider runtime={runtime}>\n      <Example />\n    </ChakraThemeProvider>\n  );\n}\n\nexport default function App() {\n  return (\n    <ThemeProvider defaultTheme=\"plum-light\" initialMode=\"system\">\n      <ThemeZone />\n    </ThemeProvider>\n  );\n}",
    "themeSwitchExample": "import { useTheme } from \"@themvora/react\";\nimport { Button, Stack } from \"@chakra-ui/react\";\n\nexport function ThemeControls() {\n  const { setMode, toggleTheme } = useTheme();\n\n  return (\n    <Stack direction=\"row\" spacing={1}>\n      <Button onClick={toggleTheme}>Toggle</Button>\n      <Button onClick={() => setMode(\"light\")}>Light</Button>\n      <Button onClick={() => setMode(\"dark\")}>Dark</Button>\n    </Stack>\n  );\n}",
  },
  "antd/React": {
    "mountProvider": "import { ThemeProvider } from \"@themvora/react\";\n\nimport { Page } from \"./Page\";\nimport { ThemeZone } from \"./components/ThemeZone\";\n\nexport default function App() {\n  return (\n    <ThemeProvider defaultTheme=\"plum-light\" initialMode=\"system\">\n      <ThemeZone>\n        <Page />\n      </ThemeZone>\n    </ThemeProvider>\n  );\n}",
    "componentExample": "import { Button, Card, Typography } from \"antd\";\n\nexport function Example() {\n  return (\n    <Card>\n      <Typography.Title level={5}>Themvora + Ant Design</Typography.Title>\n      <Button type=\"primary\">Primary action</Button>\n    </Card>\n  );\n}",
    "completeExample": "import { ThemeProvider, useThemeRuntime } from \"@themvora/react\";\nimport { AntdThemeProvider } from \"@themvora/antd\";\n\nimport { Example } from \"./Example\";\n\n// The bridge rebuilds Ant Design's theme whenever Themvora's active theme changes.\nfunction ThemeZone() {\n  const runtime = useThemeRuntime();\n\n  return (\n    <AntdThemeProvider runtime={runtime}>\n      <Example />\n    </AntdThemeProvider>\n  );\n}\n\nexport default function App() {\n  return (\n    <ThemeProvider defaultTheme=\"plum-light\" initialMode=\"system\">\n      <ThemeZone />\n    </ThemeProvider>\n  );\n}",
    "themeSwitchExample": "import { useTheme } from \"@themvora/react\";\nimport { Button, Stack } from \"antd\";\n\nexport function ThemeControls() {\n  const { setMode, toggleTheme } = useTheme();\n\n  return (\n    <Stack direction=\"row\" spacing={1}>\n      <Button onClick={toggleTheme}>Toggle</Button>\n      <Button onClick={() => setMode(\"light\")}>Light</Button>\n      <Button onClick={() => setMode(\"dark\")}>Dark</Button>\n    </Stack>\n  );\n}",
  },
  "mantine/React": {
    "mountProvider": "import { ThemeProvider } from \"@themvora/react\";\n\nimport { Page } from \"./Page\";\nimport { ThemeZone } from \"./components/ThemeZone\";\n\nexport default function App() {\n  return (\n    <ThemeProvider defaultTheme=\"plum-light\" initialMode=\"system\">\n      <ThemeZone>\n        <Page />\n      </ThemeZone>\n    </ThemeProvider>\n  );\n}",
    "componentExample": "import { Button, Card, Title } from \"@mantine/core\";\n\nexport function Example() {\n  return (\n    <Card withBorder padding=\"lg\">\n      <Title order={5}>Themvora + Mantine</Title>\n      <Button>Primary action</Button>\n    </Card>\n  );\n}",
    "completeExample": "import { ThemeProvider, useThemeRuntime } from \"@themvora/react\";\nimport { MantineThemeProvider } from \"@themvora/mantine\";\n\nimport { Example } from \"./Example\";\n\n// The bridge rebuilds Mantine's theme whenever Themvora's active theme changes.\nfunction ThemeZone() {\n  const runtime = useThemeRuntime();\n\n  return (\n    <MantineThemeProvider runtime={runtime}>\n      <Example />\n    </MantineThemeProvider>\n  );\n}\n\nexport default function App() {\n  return (\n    <ThemeProvider defaultTheme=\"plum-light\" initialMode=\"system\">\n      <ThemeZone />\n    </ThemeProvider>\n  );\n}",
    "themeSwitchExample": "import { useTheme } from \"@themvora/react\";\nimport { Button, Stack } from \"@mantine/core\";\n\nexport function ThemeControls() {\n  const { setMode, toggleTheme } = useTheme();\n\n  return (\n    <Stack direction=\"row\" spacing={1}>\n      <Button onClick={toggleTheme}>Toggle</Button>\n      <Button onClick={() => setMode(\"light\")}>Light</Button>\n      <Button onClick={() => setMode(\"dark\")}>Dark</Button>\n    </Stack>\n  );\n}",
  },
  "shadcn/React": {
    "mountProvider": "import { ThemeProvider } from \"@themvora/react\";\nimport \"@themvora/shadcn/shadcn.css\";\n\nimport { App as Page } from \"./Page\";\nimport { InstallAdapter } from \"./components/InstallAdapter\";\n\nexport default function App() {\n  return (\n    <ThemeProvider defaultTheme=\"plum-light\" initialMode=\"system\">\n      <InstallAdapter />\n      <Page />\n    </ThemeProvider>\n  );\n}",
    "componentExample": "import \"@themvora/shadcn/shadcn.css\";\n\nexport function Example() {\n  return (\n    <div className=\"card\">\n      <h2>Themvora + shadcn/ui</h2>\n      <button className=\"primary\">Primary action</button>\n    </div>\n  );\n}",
    "themeSwitchExample": "import { useTheme } from \"@themvora/react\";\n\nexport function ThemeControls() {\n  const { setMode, toggleTheme } = useTheme();\n\n  return (\n    <>\n      <button type=\"button\" onClick={() => toggleTheme()}>Toggle</button>\n      <button type=\"button\" onClick={() => setMode(\"light\")}>Light</button>\n      <button type=\"button\" onClick={() => setMode(\"dark\")}>Dark</button>\n    </>\n  );\n}",
    "completeExample": "import { ThemeProvider, useThemeRuntime } from \"@themvora/react\";\nimport { useShadcnTheme } from \"@themvora/shadcn/react\";\nimport \"@themvora/shadcn/shadcn.css\";\n\nimport { Example } from \"./Example\";\n\n// No provider to mount: the hook registers the adapter, which writes\n// shadcn/ui's own CSS variables. The stylesheet import above applies them.\nfunction ThemeZone() {\n  useShadcnTheme(useThemeRuntime());\n\n  return <Example />;\n}\n\nexport default function App() {\n  return (\n    <ThemeProvider defaultTheme=\"plum-light\" initialMode=\"system\">\n      <ThemeZone />\n    </ThemeProvider>\n  );\n}",
  },
  "bootstrap/React": {
    "mountProvider": "import { ThemeProvider } from \"@themvora/react\";\nimport \"@themvora/bootstrap/bootstrap.css\";\n\nimport { App as Page } from \"./Page\";\nimport { InstallAdapter } from \"./components/InstallAdapter\";\n\nexport default function App() {\n  return (\n    <ThemeProvider defaultTheme=\"plum-light\" initialMode=\"system\">\n      <InstallAdapter />\n      <Page />\n    </ThemeProvider>\n  );\n}",
    "componentExample": "import \"@themvora/bootstrap/bootstrap.css\";\n\nexport function Example() {\n  return (\n    <div className=\"card\">\n      <div className=\"card-body\">\n        <h5 className=\"card-title\">Themvora + Bootstrap</h5>\n        <button type=\"button\" className=\"btn btn-primary\">Primary action</button>\n      </div>\n    </div>\n  );\n}",
    "themeSwitchExample": "import { useTheme } from \"@themvora/react\";\n\nexport function ThemeControls() {\n  const { setMode, toggleTheme } = useTheme();\n\n  return (\n    <>\n      <button type=\"button\" onClick={() => toggleTheme()}>Toggle</button>\n      <button type=\"button\" onClick={() => setMode(\"light\")}>Light</button>\n      <button type=\"button\" onClick={() => setMode(\"dark\")}>Dark</button>\n    </>\n  );\n}",
    "completeExample": "import { ThemeProvider, useThemeRuntime } from \"@themvora/react\";\nimport { useBootstrapTheme } from \"@themvora/bootstrap/react\";\nimport \"@themvora/bootstrap/bootstrap.css\";\n\nimport { Example } from \"./Example\";\n\n// No provider to mount: the hook registers the adapter, which writes\n// Bootstrap's own CSS variables. The stylesheet import above applies them.\nfunction ThemeZone() {\n  useBootstrapTheme(useThemeRuntime());\n\n  return <Example />;\n}\n\nexport default function App() {\n  return (\n    <ThemeProvider defaultTheme=\"plum-light\" initialMode=\"system\">\n      <ThemeZone />\n    </ThemeProvider>\n  );\n}",
  },
  "daisyui/React": {
    "mountProvider": "import { ThemeProvider } from \"@themvora/react\";\nimport \"@themvora/daisyui/daisyui.css\";\n\nimport { App as Page } from \"./Page\";\nimport { InstallAdapter } from \"./components/InstallAdapter\";\n\nexport default function App() {\n  return (\n    <ThemeProvider defaultTheme=\"plum-light\" initialMode=\"system\">\n      <InstallAdapter />\n      <Page />\n    </ThemeProvider>\n  );\n}",
    "componentExample": "import \"@themvora/daisyui/daisyui.css\";\n\nexport function Example() {\n  return (\n    <div className=\"d-card\">\n      <div className=\"d-card-body\">\n        <h4 className=\"d-card-title\">Themvora + daisyUI</h4>\n        <button className=\"d-btn d-btn-primary\">Primary action</button>\n      </div>\n    </div>\n  );\n}",
    "themeSwitchExample": "import { useTheme } from \"@themvora/react\";\n\nexport function ThemeControls() {\n  const { setMode, toggleTheme } = useTheme();\n\n  return (\n    <>\n      <button type=\"button\" onClick={() => toggleTheme()}>Toggle</button>\n      <button type=\"button\" onClick={() => setMode(\"light\")}>Light</button>\n      <button type=\"button\" onClick={() => setMode(\"dark\")}>Dark</button>\n    </>\n  );\n}",
    "completeExample": "import { ThemeProvider, useThemeRuntime } from \"@themvora/react\";\nimport { useDaisyTheme } from \"@themvora/daisyui/react\";\nimport \"@themvora/daisyui/daisyui.css\";\n\nimport { Example } from \"./Example\";\n\n// No provider to mount: the hook registers the adapter, which writes\n// daisyUI's own CSS variables. The stylesheet import above applies them.\nfunction ThemeZone() {\n  useDaisyTheme(useThemeRuntime());\n\n  return <Example />;\n}\n\nexport default function App() {\n  return (\n    <ThemeProvider defaultTheme=\"plum-light\" initialMode=\"system\">\n      <ThemeZone />\n    </ThemeProvider>\n  );\n}",
  },
  "open-props/React": {
    "mountProvider": "import { ThemeProvider } from \"@themvora/react\";\nimport \"@themvora/open-props/open-props.css\";\n\nimport { App as Page } from \"./Page\";\nimport { InstallAdapter } from \"./components/InstallAdapter\";\n\nexport default function App() {\n  return (\n    <ThemeProvider defaultTheme=\"plum-light\" initialMode=\"system\">\n      <InstallAdapter />\n      <Page />\n    </ThemeProvider>\n  );\n}",
    "componentExample": "import \"@themvora/open-props/open-props.css\";\n\nexport function Example() {\n  return (\n    <div className=\"surface\">\n      <h2>Themvora + Open Props</h2>\n      <button className=\"primary\">Primary action</button>\n    </div>\n  );\n}",
    "themeSwitchExample": "import { useTheme } from \"@themvora/react\";\n\nexport function ThemeControls() {\n  const { setMode, toggleTheme } = useTheme();\n\n  return (\n    <>\n      <button type=\"button\" onClick={() => toggleTheme()}>Toggle</button>\n      <button type=\"button\" onClick={() => setMode(\"light\")}>Light</button>\n      <button type=\"button\" onClick={() => setMode(\"dark\")}>Dark</button>\n    </>\n  );\n}",
    "completeExample": "import { ThemeProvider, useThemeRuntime } from \"@themvora/react\";\nimport { useOpenPropsTheme } from \"@themvora/open-props/react\";\nimport \"@themvora/open-props/open-props.css\";\n\nimport { Example } from \"./Example\";\n\n// No provider to mount: the hook registers the adapter, which writes\n// Open Props's own CSS variables. The stylesheet import above applies them.\nfunction ThemeZone() {\n  useOpenPropsTheme(useThemeRuntime());\n\n  return <Example />;\n}\n\nexport default function App() {\n  return (\n    <ThemeProvider defaultTheme=\"plum-light\" initialMode=\"system\">\n      <ThemeZone />\n    </ThemeProvider>\n  );\n}",
  },
  "mui/React": {
    "mountProvider": "import { ThemeProvider } from \"@themvora/react\";\n\nimport { Page } from \"./Page\";\nimport { ThemeZone } from \"./components/ThemeZone\";\n\nexport default function App() {\n  return (\n    <ThemeProvider defaultTheme=\"plum-light\" initialMode=\"system\">\n      <ThemeZone>\n        <Page />\n      </ThemeZone>\n    </ThemeProvider>\n  );\n}",
    "themeSwitchExample": "import { useTheme } from \"@themvora/react\";\nimport { Button, Stack } from \"@mui/material\";\n\nexport function ThemeControls() {\n  const { setMode, toggleTheme } = useTheme();\n\n  return (\n    <Stack direction=\"row\" spacing={1}>\n      <Button onClick={toggleTheme}>Toggle</Button>\n      <Button onClick={() => setMode(\"light\")}>Light</Button>\n      <Button onClick={() => setMode(\"dark\")}>Dark</Button>\n    </Stack>\n  );\n}",
    "componentExample": "import { Button, Card, CardContent, Typography } from \"@mui/material\";\n\nexport function Example() {\n  return (\n    <Card>\n      <CardContent>\n        <Typography variant=\"h6\">Themvora + Material UI</Typography>\n        <Button variant=\"contained\">Primary action</Button>\n      </CardContent>\n    </Card>\n  );\n}",
    "completeExample": "import { ThemeProvider, useThemeRuntime } from \"@themvora/react\";\nimport { MuiThemeProvider } from \"@themvora/mui\";\n\nimport { Example } from \"./Example\";\n\n// The bridge rebuilds Material UI's theme whenever Themvora's active theme changes.\nfunction ThemeZone() {\n  const runtime = useThemeRuntime();\n\n  return (\n    <MuiThemeProvider runtime={runtime}>\n      <Example />\n    </MuiThemeProvider>\n  );\n}\n\nexport default function App() {\n  return (\n    <ThemeProvider defaultTheme=\"plum-light\" initialMode=\"system\">\n      <ThemeZone />\n    </ThemeProvider>\n  );\n}",
  },
};


/**
 * The runtime package each framework needs, keyed by the framework label used in
 * the picker.
 *
 * `@themvora/react` is what the install commands are authored with, so a
 * framework whose package is that one needs no swap. The rest are substituted at
 * render time — see `installForFramework`.
 */
/** Syntax-highlighting language for a framework's snippets. */
export const FRAMEWORK_LANG: Record<string, string> = {
  "Vue 3": "vue",
  Nuxt: "vue",
  Svelte: "svelte",
  Angular: "ts",
  Astro: "astro",
};

export const FRAMEWORK_PACKAGE: Record<string, string> = {
  React: "@themvora/react",
  "Next.js": "@themvora/next",
  Remix: "@themvora/remix",
  Astro: "@themvora/astro",
  "Vue 3": "@themvora/vue",
  Svelte: "@themvora/svelte",
  Solid: "@themvora/solid",
  Angular: "@themvora/angular",
  Nuxt: "@themvora/vue",
};

/** Swap the authored `@themvora/react` for the picked framework's package. */
export function installForFramework(
  commands: string[],
  frameworkLabel: string,
): string[] {
  const pkg = FRAMEWORK_PACKAGE[frameworkLabel];
  if (!pkg || pkg === "@themvora/react") return commands;
  return commands.map((cmd) => cmd.replace(/@themvora\/react\b/g, pkg));
}

export const libraries: LibraryItem[] = rawLibraries.map((lib) => ({
  ...lib,
  // Merge in any per-framework recipe content, keyed by library + label.
  frameworks: lib.frameworks?.map((f) => {
    const recipe = FRAMEWORK_RECIPES[`${lib.slug}/${f.label}`] ?? {};
    // Snippet language follows the framework, not a fixed "tsx".
    const lang = FRAMEWORK_LANG[f.label] ?? "tsx";
    const asSnippet = (code?: string): FrameworkSnippet | undefined =>
      code ? { lang, code } : undefined;
    return {
      ...f,
      mountProvider: asSnippet(recipe.mountProvider),
      completeExample: asSnippet(recipe.completeExample),
      componentExample: asSnippet(recipe.componentExample),
      themeSwitchExample: asSnippet(recipe.themeSwitchExample),
      beforeExample: asSnippet(recipe.beforeExample),
    };
  }),
  featureCount: lib.groups.reduce((sum, g) => sum + g.features.length, 0),
}));