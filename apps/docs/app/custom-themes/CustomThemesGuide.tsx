"use client";

import { useState } from "react";
import Link from "next/link";
import { highlightCode } from "../../lib/highlight";
import { CodeBlock } from "../../components/code-block";
import { GENERATION_STYLE_NAMES } from "@themvora/core";
import { SectionHeading } from "../../components/ui/section-heading";
import { Callout } from "../../components/ui/callout";
import { FrameworkPicker, getExample } from "../../components/framework-picker";
import { Prerequisites } from "../../components/ui/prerequisites";
import { NextSteps } from "../../components/ui/next-step-card";
import { RelatedLinks } from "../../components/ui/related-links";

const defineSnippet = {
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

const darkSnippet = {
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

const extendSnippet = {
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

const runtimeSnippet = {
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

const vanillaSnippet = {
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
const STYLE_NOTES: Record<string, string> = {
  balanced: "the reference — moderate chroma, moderate surfaces",
  soft: "lighter and quieter, with more tinted surfaces",
  vibrant: "higher primary chroma, split-complementary accent",
  editorial: "darker primary, stronger borders, complementary accent",
  minimal: "zero surface chroma, restrained primary",
  brand: "preserves the seed's own lightness — the strongest anchor",
};

const styledSnippet = {
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

const generatedSnippet = {
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
const customThemeSnippets: Record<
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
    title: "App.tsx",
    lang: "tsx",
    code: `import { ThemeProvider, useTheme } from "@themvora/react";
import { oceanLight, oceanDark } from "./themes";

const themes = [oceanLight, oceanDark];

function ThemeSwitcher() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button type="button" onClick={toggleTheme}>
      {theme.name} — switch mode
    </button>
  );
}

export function App() {
  return (
    <ThemeProvider themes={themes} defaultTheme="ocean-light">
      <ThemeSwitcher />
    </ThemeProvider>
  );
}`,
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
  },
  vue: {
    title: "App.vue",
    lang: "vue",
    code: `<script setup>
import { ThemeProvider } from "@themvora/vue";
import { oceanLight, oceanDark } from "./themes";

const themes = [oceanLight, oceanDark];
</script>

<template>
  <ThemeProvider :themes="themes" default-theme="ocean-light">
    <YourView />
  </ThemeProvider>
</template>`,
  },
  svelte: {
    title: "App.svelte",
    lang: "svelte",
    code: `<script>
  import { ThemeProvider } from "@themvora/svelte";
  import { oceanLight, oceanDark } from "./themes";

  const themes = [oceanLight, oceanDark];
</script>

<ThemeProvider {themes} defaultTheme="ocean-light">
  {@render children()}
</ThemeProvider>`,
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
  },
};

function snippetBlock(snippet: { lang: string; title: string; code: string }) {
  return (
    <CodeBlock
      html={highlightCode(snippet.code, snippet.lang)}
      code={snippet.code}
      language={snippet.lang}
      className="rounded-lg m-0"
    />
  );
}

export function CustomThemesGuide() {
  const [selectedFramework, setSelectedFramework] = useState("react");
  const customSnippet = getExample(customThemeSnippets, selectedFramework);

  return (
    <>
      <Prerequisites
        items={[
          {
            label: "Core package installed",
            value: "@themvora/core for theme definitions",
          },
          {
            label: "Token structure understanding",
            value: "Familiarity with semantic token patterns",
            href: "/tokens",
          },
          {
            label: "Framework runtime",
            value: "A Themvora provider mounted in your app",
            href: "/quick-start",
          },
        ]}
      />

      <section id="define" className="scroll-mt-24 my-10">
        <SectionHeading
          num={1}
          desc="The smallest building block. A name, an optional family + mode, and nested tokens that become CSS variables."
        >
          Define a theme
        </SectionHeading>
        {snippetBlock(defineSnippet)}
        <Callout className="mt-3">
          <strong>Mode + family</strong>{" "}
          <span className="mx-1 opacity-40">|</span>
          Give light and dark variants the same{" "}
          <code className="mono text-[0.9em]">family</code> so switching mode
          stays within your palette. See{" "}
          <Link href="/core-concepts" className="text-primary no-underline">
            Core Concepts
          </Link>{" "}
          for how families work.
        </Callout>
        <div className="mt-3">{snippetBlock(darkSnippet)}</div>
      </section>

      <section id="extend" className="scroll-mt-24 mb-10">
        <SectionHeading
          num={2}
          desc="Inherit from a base theme and override only the tokens that change."
        >
          Extend & compose
        </SectionHeading>
        {snippetBlock(extendSnippet)}
      </section>

      <section id="register" className="scroll-mt-24 mb-10">
        <SectionHeading
          num={3}
          desc="Pass your themes to the runtime or provider in any framework. The same list works everywhere."
        >
          Register with the runtime
        </SectionHeading>
        {snippetBlock(runtimeSnippet)}
        <div className="mt-3">{snippetBlock(vanillaSnippet)}</div>
      </section>

      <section id="generate" className="scroll-mt-24 mb-10">
        <SectionHeading
          num={4}
          desc="No token math needed — derive an entire light/dark pair from one color, then validate it."
        >
          Generate from a seed
        </SectionHeading>
        {snippetBlock(generatedSnippet)}

        <div className="mt-4">
          <h3 className="text-xs font-semibold uppercase tracking-widest opacity-50 mb-2">
            Generation styles
          </h3>
          <p className="text-sm opacity-80 mb-3 leading-relaxed">
            A style is not a separate algorithm. Every style runs the same
            generator and the same solver and produces the same semantic
            contract; a style only modulates a fixed, enumerated set of
            parameters — surface chroma, primary chroma, the secondary and
            accent relationships, neutral temperature, border strength and
            dark-mode depth. Omitting{" "}
            <code className="mono text-[0.9em]">style</code> means{" "}
            <code className="mono text-[0.9em]">balanced</code>, so an existing{" "}
            <code className="mono text-[0.9em]">{"{ seed, family }"}</code> call
            keeps working unchanged.
          </p>
          <ul className="grid gap-1.5 sm:grid-cols-2 mb-3">
            {GENERATION_STYLE_NAMES.map((name) => (
              <li key={name} className="flex items-baseline gap-2 text-sm">
                <code className="mono text-[0.9em] shrink-0">{name}</code>
                <span className="opacity-60 text-[13px] leading-snug">
                  {STYLE_NOTES[name] ?? ""}
                </span>
              </li>
            ))}
          </ul>
          {snippetBlock(styledSnippet)}
        </div>

        <div className="rounded-xl border border-border p-4 mt-4">
          <h3 className="text-xs font-semibold uppercase tracking-widest opacity-50 mb-2">
            What the generator guarantees
          </h3>
          <ul className="flex flex-col gap-2 text-sm opacity-80 leading-relaxed">
            <li>
              <strong className="font-semibold">Deterministic.</strong> The same
              seed, style and options produce byte-identical output. There is no
              randomness and no time input.
            </li>
            <li>
              <strong className="font-semibold">
                Light and dark are independent.
              </strong>{" "}
              The dark theme is generated for dark, not inverted from the light
              one, so the brand hue survives the mode change.
            </li>
            <li>
              <strong className="font-semibold">
                The contrast contract is met before you get the theme.
              </strong>{" "}
              The published contract is 4.5:1 for text and 3:1 for interactive
              boundaries and focus rings. The generator aims slightly higher
              internally so the guarantee survives a small edit, and every
              semantic pair is solved rather than left to chance.
            </li>
            <li>
              <strong className="font-semibold">Provenance is recorded.</strong>{" "}
              <code className="mono text-[0.9em]">meta.generation</code> carries
              the algorithm version, the seed, and the style. The algorithm
              version is separate from the theme schema version, so a future
              generator can ship without silently rewriting themes you already
              generated.
            </li>
          </ul>
        </div>
      </section>

      <section id="presets" className="scroll-mt-24 mb-10">
        <SectionHeading
          num={5}
          desc="Compose on top of the built-in palettes instead of starting from scratch."
        >
          Presets & brand themes
        </SectionHeading>
        <div className="flex flex-col gap-3">
          <h3 className="text-xs font-semibold uppercase tracking-widest opacity-50 mb-2">
            Default presets
          </h3>
          <p className="text-sm opacity-80 mb-3 leading-relaxed">
            Nine curated families —{" "}
            <code className="mono text-[0.9em]">
              oat, berry, mint, citrus, cocoa, plum, iris, sky, graphite
            </code>{" "}
            — each with light + dark. Grab them via{" "}
            <code className="mono text-[0.9em]">getPresetThemes()</code> or
            restyle with{" "}
            <code className="mono text-[0.9em]">
              getPresetThemes(overrides)
            </code>
            .
          </p>
          <CodeBlock
            html={highlightCode(
              `import { getPresetThemes } from "@themvora/core";

// All nine families, light + dark.
const themes = getPresetThemes();

// Or restyle a family as you take it.
const restyled = getPresetThemes({
  plum: {
    light: { tokens: { colors: { primary: "#6d28d9" } } },
  },
});`,
              "ts",
            )}
            code={`import { getPresetThemes } from "@themvora/core";

// All nine families, light + dark.
const themes = getPresetThemes();

// Or restyle a family as you take it.
const restyled = getPresetThemes({
  plum: {
    light: { tokens: { colors: { primary: "#6d28d9" } } },
  },
});`}
            language="ts"
            className="rounded-lg m-0"
          />
        </div>

        <h3 className="text-xs font-semibold uppercase tracking-widest opacity-50 mb-2">
          Brand presets
        </h3>
        <p className="text-sm opacity-80 mb-3 leading-relaxed">
          Brand-inspired starting points — Apple, GitHub, Vercel, Slack, Discord
          — via <code className="mono text-[0.9em]">getBrandPresets()</code>.
          Each starts from a colour the brand <em>publishes</em> in its
          guidelines or design system, pins that value as the identity anchor,
          and generates the surfaces, borders, interaction roles and status
          colours around it with the same engine as any other theme. They are
          examples, not official brand themes.
        </p>
        <CodeBlock
          html={highlightCode(
            `import { getBrandPresets } from "@themvora/core";

const themes = getBrandPresets();

const brand = themes.filter((t) => t.meta?.family === "github");
createThemeRuntime({ themes: brand, defaultTheme: "github-light" });`,
            "ts",
          )}
          code={`import { getBrandPresets } from "@themvora/core";

const themes = getBrandPresets();

const brand = themes.filter((t) => t.meta?.family === "github");
createThemeRuntime({ themes: brand, defaultTheme: "github-light" });`}
          language="ts"
          className="rounded-lg m-0"
        />

        <div className="rounded-xl border border-border p-4 mt-4">
          <h3 className="text-xs font-semibold uppercase tracking-widest opacity-50 mb-2">
            Overrides are yours
          </h3>
          <p className="text-sm opacity-80 leading-relaxed">
            Presets are generated artifacts, so a preset is not a frozen token
            list you have to maintain — it is a recipe you can restyle.
            Overrides are applied{" "}
            <strong className="font-semibold">after</strong> generation and are
            never rewritten for you: the generated baseline satisfies the
            contract, but an override is free to break it, and it is your call.
            Run <code className="mono text-[0.9em]">validateTheme()</code> to
            find out whether it did.
          </p>
        </div>

        <div className="rounded-xl border border-border p-4 mt-4">
          <h3 className="text-xs font-semibold uppercase tracking-widest opacity-50 mb-2">
            Accessibility profiles
          </h3>
          <p className="text-sm opacity-80 leading-relaxed">
            High-contrast and large-text variants ship via{" "}
            <code className="mono text-[0.9em]">
              getAccessibilityProfiles()
            </code>{" "}
            and are tagged{" "}
            <code className="mono text-[0.9em]">"accessibility"</code> for
            filtering.
          </p>
        </div>
      </section>

      <section id="use-your-theme" className="scroll-mt-24 mb-10">
        <SectionHeading
          num={6}
          desc="The theme you defined above is a plain object — the same two objects register in every framework. Pick yours to see the exact integration with the custom ocean family."
        >
          Use your custom theme
        </SectionHeading>
        <FrameworkPicker
          value={selectedFramework}
          onChange={setSelectedFramework}
          label="Pick your framework"
        />
        <CodeBlock
          html={highlightCode(customSnippet.code, customSnippet.lang)}
          code={customSnippet.code}
          language={customSnippet.lang}
          filename={customSnippet.title}
          className="rounded-lg m-0"
        />
        {customSnippet.extra ? (
          <CodeBlock
            html={highlightCode(
              customSnippet.extra.code,
              customSnippet.extra.lang,
            )}
            code={customSnippet.extra.code}
            language={customSnippet.extra.lang}
            filename={customSnippet.extra.title}
            className="rounded-lg m-0 mt-3"
          />
        ) : null}
        <Callout className="mt-3">
          The <code className="mono text-[0.9em]">oceanLight</code> and{" "}
          <code className="mono text-[0.9em]">oceanDark</code> themes come from
          section 1. Register both, set{" "}
          <code className="mono text-[0.9em]">ocean-light</code> as the default,
          and mode toggling stays inside your family. See{" "}
          <Link href="/framework-guides" className="text-primary no-underline">
            Framework Guides
          </Link>{" "}
          for a deeper walkthrough of each integration.
        </Callout>
      </section>

      <NextSteps
        steps={[
          {
            title: "Generate from a seed color",
            description:
              "Use Theme Studio to create a complete light/dark pair",
            href: "/theme-studio",
          },
          {
            title: "Apply scoped themes",
            description: "Override tokens in specific app sections",
            href: "/scoped-theme",
          },
          {
            title: "Test with accessibility profiles",
            description:
              "Validate your custom theme with WCAG-compliant presets",
            href: "/accessibility",
          },
        ]}
      />

      <RelatedLinks
        links={[
          {
            title: "Playground",
            description: "Explore families, history, and multi-window sync",
            href: "/playground",
          },
          {
            title: "@themvora/core",
            description:
              "Full reference for models, registry, and runtime APIs",
            href: "/packages/core",
          },
          {
            title: "Token resolution",
            description:
              "Understand how semantic tokens resolve to concrete values",
            href: "/token-resolution",
          },
        ]}
      />
    </>
  );
}
