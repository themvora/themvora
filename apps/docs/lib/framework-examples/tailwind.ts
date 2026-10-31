import type { FrameworkExamples } from "./types";

/**
 * Tailwind CSS examples and use cases.
 *
 * Tailwind is the CSS-only integration: it exposes Themvora tokens as Tailwind
 * theme variables and utilities, and has no runtime of its own. Verified
 * against `packages/tailwind` — the package exports `createTailwindPlugin`,
 * `synchronizeDarkClass` and `themeCSS`, plus `theme.css`, `dark.css` and
 * `preflight.css` entries. Everything else on this page is CSS.
 */
export const tailwindExamples: FrameworkExamples = {
  slug: "tailwind",
  sections: {
    startHere: "One import, one dark variant",
    useCases: "Tokens instead of hex values",
    api: "The stylesheet, the plugin, the variant",
    combining: "The complete stylesheet",
  },
  intro: [
    "The Tailwind integration is build-time only: it maps Themvora's semantic tokens onto Tailwind's `@theme` variables so `bg-primary`, `text-muted-foreground` and `rounded-lg` resolve to the active theme. There is no provider here — a runtime for your framework (or `<themvora-provider>` for plain HTML) does the theming, and Tailwind reads the variables it produces.",
    "That split is why this page is short on JavaScript: the interesting work is one `@import`, one custom variant, and knowing which class names the tokens generate.",
  ],
  startHere: {
    body: "Import the package's CSS entry in your Tailwind stylesheet. One import maps every token group onto Tailwind's theme variables, so utilities exist without a config file.",
    note: "You still need a Themvora runtime — `@themvora/react`, `-vue`, `-svelte`, `-solid`, `-angular` or `-web` — to apply a theme. Tailwind alone only generates the class names.",
    code: [
      {
        title: "src/app.css",
        lang: "css",
        code: `@import "tailwindcss";

/* Maps Themvora tokens onto Tailwind's @theme variables:
   --color-*, --radius-*, --spacing-*, --font-*, --shadow-* */
@import "@themvora/tailwind";

/* Scope \`dark:\` to the class Themvora maintains on <html>. */
@custom-variant dark (&:where(.dark, .dark *));`,
      },
      {
        title: "Using the generated utilities",
        lang: "html",
        code: `<article class="bg-card text-card-foreground border border-border rounded-lg p-6 shadow-md">
  <h2 class="text-2xl font-semibold">Themed by tokens</h2>
  <p class="text-muted-foreground">No hard-coded palette.</p>
  <button class="bg-primary text-primary-foreground rounded-md px-4 py-2">
    Primary action
  </button>
</article>`,
      },
    ],
  },
  categories: [
    {
      id: "integration",
      label: "Integration",
      intro:
        "The CSS entry, the dark-mode variant, and the two helpers that keep Tailwind's expectations and Themvora's DOM contract in agreement.",
      entries: [
        {
          id: "tw-import",
          name: '@import "@themvora/tailwind"',
          covers: ['@import "@themvora/tailwind"'],
          what: "One CSS import that maps every Themvora token group onto Tailwind's `@theme` variables: `--color-*`, `--radius-*`, `--spacing-*`, `--font-*` and `--shadow-*`. Tailwind then generates the matching utilities.",
          when: "Every Tailwind v4 project using Themvora. It replaces a `tailwind.config` theme block entirely.",
          effect: "Utilities such as `bg-primary`, `text-muted-foreground`, `rounded-lg` and `shadow-md` resolve to the active theme's values and repaint when the theme changes.",
          related: ["tw-dark-variant", "tw-layers"],
          code: [
            {
              title: "src/app.css",
              lang: "css",
              code: `@import "tailwindcss";
@import "@themvora/tailwind";`,
            },
          ],
        },
        {
          id: "tw-dark-variant",
          name: "Dark-mode variant",
          covers: ["Dark-mode variant"],
          what: "`@custom-variant dark (&:where(.dark, .dark *))` scopes Tailwind's `dark:` variant to the `.dark` class Themvora maintains on the root element, instead of Tailwind's default `prefers-color-scheme`.",
          when: "Always, when the theme is selected by Themvora rather than by the OS alone. Without it, `dark:` utilities follow the OS and disagree with a visitor who picked light explicitly.",
          effect: "`dark:` utilities activate exactly when Themvora's active theme is dark — including inside a scoped subtree, because the variant matches any ancestor with the class.",
          related: ["tw-import", "tw-sync-dark"],
          code: [
            {
              title: "src/app.css",
              lang: "css",
              code: `@import "tailwindcss";
@import "@themvora/tailwind";

/* Follow the class Themvora writes, not the OS preference. */
@custom-variant dark (&:where(.dark, .dark *));`,
            },
            {
              title: "Using it",
              lang: "html",
              code: `<div class="bg-background text-foreground dark:bg-card">
  Repaints with the active theme's mode.
</div>`,
            },
          ],
        },
        {
          id: "tw-sync-dark",
          name: "synchronizeDarkClass(theme)",
          covers: ["synchronizeDarkClass(theme)"],
          what: "A function that toggles the `.dark` class on the document root to match a theme definition's `meta.mode`.",
          when: "You apply a theme yourself — from a custom script, a non-Themvora runtime, or a server response — and need Tailwind's `dark:` variant to follow. When Themvora's runtime is applying the theme, it already maintains the class.",
          effect: "The root gains or loses `.dark`, so `dark:` utilities switch with it. It is a no-op on the server.",
          related: ["tw-dark-variant"],
          code: [
            {
              title: "src/apply-theme.ts",
              lang: "ts",
              code: `import { synchronizeDarkClass } from "@themvora/tailwind";
import { getBuiltInThemes } from "@themvora/core";

const themes = getBuiltInThemes();
const dark = themes.find((theme) => theme.meta?.mode === "dark");

if (dark) {
  // Keeps Tailwind's \`dark:\` variant in step with a theme applied by hand.
  synchronizeDarkClass(dark);
}`,
            },
          ],
        },
        {
          id: "tw-layers",
          name: "CSS layers",
          covers: ["CSS layers"],
          what: "The package ships `theme.css`, `dark.css` and `preflight.css` layers, so the token declarations, the dark-mode block and the reset can be imported independently or in a controlled order.",
          when: "You need the layer files separately — a design system that owns its own reset, or a page that must load only the token layer.",
          effect: "Imports compose in the order you write them, which is what decides whether your own rules can override a token declaration.",
          related: ["tw-import"],
          code: [
            {
              title: "src/app.css — importing the layers directly",
              lang: "css",
              code: `/* The single \`@import "@themvora/tailwind"\` pulls in all three.
   Import them yourself when you need a different order or a subset. */
@import "@themvora/tailwind/theme.css";
@import "@themvora/tailwind/dark.css";

/* Skip preflight.css when your own reset already owns base styles. */
/* @import "@themvora/tailwind/preflight.css"; */`,
            },
          ],
        },
      ],
    },
    {
      id: "transition",
      label: "Transition",
      intro:
        "Tailwind exposes the transition variables; the runtime owns the orchestration. There is no global transition block to write.",
      entries: [
        {
          id: "tw-transition-vars",
          name: "CSS transition variables",
          covers: ["CSS transition variables"],
          what: "Themova exposes transition variables for Tailwind-aware styling, while the runtime performs the actual theme-change orchestration.",
          when: "You want a class-driven transition on a specific element (a hover state, a panel) that matches the theme's timing rather than inventing a second duration.",
          effect: "Your transitions read the same duration and easing the runtime uses, so a hover and a theme change feel like one system.",
          related: ["tw-plugin", "tw-import"],
          code: [
            {
              title: "src/app.css",
              lang: "css",
              code: `/* Read the runtime's timing instead of hard-coding a duration. */
.panel {
  transition:
    background-color var(--theme-transition-duration, 300ms)
      var(--theme-transition-easing, ease),
    color var(--theme-transition-duration, 300ms)
      var(--theme-transition-easing, ease);
}`,
            },
          ],
        },
        {
          id: "tw-plugin",
          name: "createTailwindPlugin({ themes, defaultTheme })",
          covers: ["createTailwindPlugin({ themes, defaultTheme })"],
          what: "A plugin factory for projects that configure Tailwind in JavaScript rather than CSS. It registers Themvora tokens with Tailwind from a JS config.",
          when: "A Tailwind v3-era config, or a build that generates its Tailwind config programmatically. In Tailwind v4 the CSS import is the shorter path.",
          effect: "The tokens become Tailwind theme values at build time. The plugin is configuration only — it does not apply a theme at runtime.",
          related: ["tw-import", "tw-theme-css"],
          code: [
            {
              title: "tailwind.config.ts",
              lang: "ts",
              code: `import { createTailwindPlugin } from "@themvora/tailwind";
import { getBuiltInThemes } from "@themvora/core";

const themes = getBuiltInThemes();

export default {
  plugins: [
    createTailwindPlugin({ themes, defaultTheme: "mint-light" }),
  ],
};`,
            },
          ],
        },
        {
          id: "tw-theme-css",
          name: "themeCSS",
          covers: ["themeCSS"],
          what: "The Tailwind-compatible `@theme` variable block generated from Themvora tokens, exported as a string and imported through the package's CSS entry.",
          when: "You need the generated block as a value — to write it into a file during a build, or to inline it into a server-rendered stylesheet.",
          effect: "You get the same declarations the CSS entry provides, in a form you can place yourself.",
          related: ["tw-import", "tw-plugin"],
          code: [
            {
              title: "scripts/write-theme-css.mjs",
              lang: "ts",
              code: `import { writeFileSync } from "node:fs";
import { themeCSS } from "@themvora/tailwind";

writeFileSync("src/generated/theme.css", themeCSS);`,
            },
          ],
        },
      ],
    },
  ],
  recipes: [
    {
      id: "token-only-classes",
      title: "Style a component without a second palette",
      problem:
        "A component ends up with `bg-[#6366f1]` because the token name was not obvious, and it looks wrong in every theme but one.",
      apis: ['@import "@themvora/tailwind"', "Dark-mode variant"],
      why: "The import generates a utility per semantic token, so the semantic name is always available. The custom variant makes `dark:` follow the active theme rather than the OS.",
      expect:
        "The component repaints with every theme change and needs no per-theme classes.",
      caveats:
        "Token names keep the casing of the token key: `text-card-foreground`, not `text-card-foreground` invented from a different key. Check the token reference when a utility does not resolve.",
      code: [
        {
          title: "src/components/StatCard.tsx",
          lang: "tsx",
          code: `export function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-lg border border-border bg-card p-6 text-card-foreground shadow-md dark:border-border">
      <h3 className="text-sm text-muted-foreground">{label}</h3>
      <strong className="text-2xl">{value}</strong>
    </article>
  );
}`,
        },
      ],
    },
    {
      id: "dark-variant-inside-scope",
      title: "Make dark: work inside a scoped panel",
      problem:
        "A scoped dark panel renders with light `dark:` utilities, because the class-based variant is only on `<html>`.",
      apis: ["Dark-mode variant", "<themvora-scope>"],
      why: "`&:where(.dark, .dark *)` matches any ancestor carrying the class, and a dark scope adds it to its own wrapper — so the variant activates inside the scope without touching the page.",
      expect:
        "`dark:` utilities inside the scoped panel follow the panel's theme, while the rest of the page keeps the global one.",
      code: [
        {
          title: "Scoped panel",
          lang: "html",
          code: `<themvora-scope theme="cocoa-dark">
  <div class="bg-card text-card-foreground dark:bg-background">
    Both classes follow the scope, not the page.
  </div>
</themvora-scope>`,
        },
      ],
    },
  ],
  combining: [
    {
      id: "full-setup",
      title: "The complete stylesheet",
      body: "Everything the Tailwind side needs, in the order it has to appear: Tailwind itself, the Themvora token mapping, then the variant that ties `dark:` to the class the runtime maintains.",
      code: [
        {
          title: "src/app.css",
          lang: "css",
          code: `@import "tailwindcss";
@import "@themvora/tailwind";

@custom-variant dark (&:where(.dark, .dark *));

/* Your own base styles read the same variables, so they repaint too. */
body {
  background: var(--theme-color-background);
  color: var(--theme-color-foreground);
}`,
        },
      ],
    },
  ],
  notAvailable: [
    {
      name: "A provider or runtime",
      reason:
        "This package is build-time only. Install a runtime adapter (`@themvora/react`, `-vue`, `-svelte`, `-solid`, `-angular` or `-web`) to apply a theme; Tailwind only generates class names from the tokens.",
    },
  ],
};
