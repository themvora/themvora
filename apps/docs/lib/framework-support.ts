/**
 * Which frameworks each library adapter supports, and — separately — what
 * engineering evidence exists for that support.
 *
 * ## Two layers, deliberately not mixed
 *
 * This file answers two different questions, and conflating them produced a real
 * defect in the previous revision:
 *
 *   1. **Can a consumer use this library with this framework?** — answered by
 *      `PUBLIC_FRAMEWORKS`. This drives the public framework selector.
 *   2. **Have *we* verified that combination in this repository?** — answered by
 *      `INTERNAL_EVIDENCE`. This is an engineering record and is **never
 *      rendered**.
 *
 * The previous revision exposed layer 2 to readers — "⚠ unverified", "not yet
 * verified", evidence strings, "no copy/paste setup until verified". That is an
 * audit artifact, not documentation. A reader asking "how do I use this?" was
 * shown our test bookkeeping instead of an answer. The two layers are now
 * separate: a framework either appears in the public selector with a real
 * recipe, or it does not appear at all.
 *
 * ## What "supported" means here
 *
 * **Support is composition, not package shape.** The earlier model treated the
 * absence of a `@themvora/mui/vue` entry as proof MUI could not be documented
 * for Vue-shaped frameworks, and — by extension — was too strict about React
 * frameworks too. That conflated three different things:
 *
 *   - the **target library's own ecosystem** (MUI is a React component library)
 *   - the **Themvora framework integration** (`@themvora/react`, `-next`, `-remix`, `-astro`)
 *   - the **adapter** (`@themvora/mui`)
 *
 * A supported combination is one where those compose into a path a consumer can
 * actually follow. For MUI that means React, plus the React-based frameworks
 * whose Themvora integration exists — Next.js, Remix, and Astro through a React
 * island. It does **not** mean MUI + Vue: MUI is React, and no amount of adapter
 * composition changes that.
 *
 * ## Adapter families
 *
 * The two families genuinely differ and must not share one template:
 *
 *   - **provider** (MUI, Chakra, Ant Design, Mantine) — the adapter builds the
 *     library's *native theme object* and hands it to the library's own provider.
 *     Support is bounded by the library's own ecosystem: React and React-based
 *     frameworks.
 *   - **css-variable** (shadcn, Bootstrap, DaisyUI, Open Props) — the adapter
 *     writes the library's *own CSS custom properties*; the library's stylesheet
 *     consumes them. Nothing is React-bound, so support is genuinely wider.
 */

export type AdapterFamily = "provider" | "css-variable" | "build-time";

/** Frameworks the docs can select, in display order. */
export const FRAMEWORKS = [
  "React",
  "Next.js",
  "Remix",
  "Astro",
  "Vue 3",
  "Nuxt",
  "Svelte",
  "Solid",
  "Angular",
] as const;

export type FrameworkName = (typeof FRAMEWORKS)[number];

export const ADAPTER_FAMILY: Record<string, AdapterFamily> = {
  mui: "provider",
  chakra: "provider",
  antd: "provider",
  mantine: "provider",
  shadcn: "css-variable",
  bootstrap: "css-variable",
  daisyui: "css-variable",
  "open-props": "css-variable",
  unocss: "build-time",
};

/**
 * The framework bridges Themvora ships. A provider-family library can only be
 * documented for a framework whose bridge exists and can host a React tree.
 */
const REACT_BRIDGES: FrameworkName[] = ["React", "Next.js", "Remix", "Astro"];

/**
 * CSS-variable libraries are not React-bound: the adapter writes the library's
 * own custom properties and nothing in the path is framework-specific. Every
 * framework Themvora ships a binding for is therefore a real integration, and
 * each one has a recipe.
 */
const CSS_FRAMEWORKS: FrameworkName[] = [
  "React",
  "Next.js",
  "Remix",
  "Astro",
  "Vue 3",
  "Nuxt",
  "Svelte",
  "Solid",
  "Angular",
];

/**
 * PUBLIC — the frameworks the selector offers.
 *
 * Everything listed here has a recipe, and the recipe set is generated
 * (`scripts/docs/generate-library-recipes.mjs`), so this table is checked
 * against it by `scripts/audit-library-docs.mjs`. A framework absent from here
 * is simply not offered; there is no third state the reader can see.
 *
 * ## Why shadcn/ui is narrower than its adapter
 *
 * `@themvora/shadcn` ships `/react`, `/vue`, `/svelte`, `/solid` and `/angular`
 * entries, but *shadcn/ui* is a React project. The Vue and Svelte recipes use
 * the maintained ports (shadcn-vue, shadcn-svelte), which have their own CLIs
 * and their own component imports. Solid and Angular are not offered: the ports
 * that exist are separate projects with different setup, and documenting them
 * here would mean inventing a path this repository cannot check.
 */
export const PUBLIC_FRAMEWORKS: Record<string, FrameworkName[]> = {
  // React component libraries. Support is bounded by the library's own
  // ecosystem, which is React — so the React-based bridges, and nothing else.
  mui: REACT_BRIDGES,
  chakra: REACT_BRIDGES,
  antd: REACT_BRIDGES,
  mantine: REACT_BRIDGES,

  // CSS-variable adapters. Not React-bound, so the wider set applies.
  bootstrap: CSS_FRAMEWORKS,
  daisyui: CSS_FRAMEWORKS,
  "open-props": CSS_FRAMEWORKS,

  // shadcn/ui plus its maintained Vue and Svelte ports.
  shadcn: ["React", "Next.js", "Remix", "Astro", "Vue 3", "Svelte"],

  // Build-time: the preset is framework-neutral, but the runtime that drives
  // the theme is not, so the integrations are the ones with a Vite/Astro
  // integration and a Themvora binding.
  unocss: ["React", "Next.js", "Vue 3", "Svelte", "Astro"],
};

/** The frameworks the public selector should render for a library. */
export function supportedFrameworks(slug: string): FrameworkName[] {
  return PUBLIC_FRAMEWORKS[slug] ?? [];
}

/** Whether a library offers a framework choice at all. */
export function hasFrameworkChoice(slug: string): boolean {
  return supportedFrameworks(slug).length > 1;
}

/**
 * How a framework hosts this adapter. Drives the architecture sentence on the
 * page, which previously claimed every adapter was "a hook, composable,
 * directive or custom element depending on your stack" — untrue for a library
 * that ships a React provider and nothing else.
 */
export type Bridge =
  | "react"
  | "react-framework"
  | "react-island"
  | "vue"
  | "vue-framework"
  | "svelte"
  | "solid"
  | "angular";

export function bridgeFor(family: AdapterFamily, framework: FrameworkName): Bridge {
  if (family === "provider") {
    // A React component library: the adapter's provider runs inside a React tree.
    if (framework === "Astro") return "react-island";
    if (framework === "React") return "react";
    return "react-framework";
  }
  switch (framework) {
    case "React":
    case "Next.js":
    case "Remix":
    case "Astro":
      return framework === "Astro" ? "react-island" : "react";
    case "Vue 3":
    case "Nuxt":
      return "vue";
    case "Svelte":
      return "svelte";
    case "Solid":
      return "solid";
    case "Angular":
      return "angular";
  }
}

/**
 * INTERNAL — engineering evidence. **Never rendered.**
 *
 * The public selector offers only combinations with a real recipe; this file
 * is the separate "have we proven it?" record. Its values are **generated** by
 * `scripts/docs/update-library-evidence.mjs` from the verification harness
 * output (`verify-library-recipes.mjs` and `verify-library-browser.mjs`), so an
 * evidence state cannot drift away from what was actually run.
 *
 * The stages are intentionally distinct. A production build passing is not a
 * browser render, and a browser render is not proof that switching themes
 * repaints the library. `fullyVerified` is derived from all six — it is never
 * asserted by hand.
 */
export type Evidence = {
  /** Adapter source, published exports, peers and hook signatures inspected. */
  source: "pass" | "not-run";
  /** The documented dependency set resolved and installed in a fixture. */
  install: "pass" | "not-run";
  /** The framework's typecheck (or `astro check` / `vue-tsc` / `svelte-check`). */
  typecheck: "pass" | "not-run";
  /** The framework's production build. */
  build: "pass" | "not-run";
  /** Production preview loaded in a real browser without console errors. */
  browser: "pass" | "not-run";
  /** Light/dark and theme-family switches repainted the real library UI. */
  themeSwitch: "pass" | "not-run";
  /** SSR server/client agreement; `n/a` for client-only builds. */
  hydration: "pass" | "fail" | "not-run" | "n/a";
  /** Derived: every stage above passed. */
  fullyVerified: boolean;
  /** The isolated application that produced this evidence. */
  fixture: string;
  /** The adapter's own unit tests. */
  test: string;
  /** Node and framework versions the recipe actually ran against. */
  runtime?: {
    node: string;
    packages: Record<string, string>;
  };
};

import { LIBRARY_EVIDENCE } from "./generated/library-evidence";

export const INTERNAL_EVIDENCE: Record<
  string,
  Partial<Record<FrameworkName, Evidence>>
> = LIBRARY_EVIDENCE;
