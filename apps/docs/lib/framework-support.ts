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
 * CSS-variable libraries are not React-bound, so their support set is the
 * framework entries the adapter itself publishes plus the bridges that can host
 * them.
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
 * Everything listed here has a recipe. Everything absent is simply not offered;
 * there is no third state the reader can see.
 */
export const PUBLIC_FRAMEWORKS: Record<string, FrameworkName[]> = {
  // React component libraries. Support is bounded by the library's own
  // ecosystem, which is React — so the React-based bridges, and nothing else.
  mui: REACT_BRIDGES,
  chakra: REACT_BRIDGES,
  antd: REACT_BRIDGES,
  mantine: REACT_BRIDGES,

  // CSS-variable adapters. Not React-bound, so the wider set applies.
  shadcn: CSS_FRAMEWORKS,
  bootstrap: CSS_FRAMEWORKS,
  daisyui: CSS_FRAMEWORKS,
  "open-props": CSS_FRAMEWORKS,

  // Build-time: no runtime entry, so no framework selection applies.
  unocss: [],
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
 * This is the "have we proven it?" record. It exists so the team can see which
 * combinations have a fixture, a build and a browser run, and which are still
 * only architecturally sound. It deliberately has no accessor used by the page
 * renderer: if you are reading this from a component, you are building the
 * defect this file was split to fix.
 */
export type Evidence = {
  /** Runnable app, if one exists. */
  fixture?: string;
  /** Unit or integration test that exercises it, if one exists. */
  test?: string;
  /** Whether a build has been run against the fixture. */
  build?: "pass" | "not-run";
  /** Whether a browser run has been done. */
  browser?: "pass" | "not-run";
};

export const INTERNAL_EVIDENCE: Record<string, Partial<Record<FrameworkName, Evidence>>> = {
  mui: {
    React: { fixture: "examples/apps/adapters-example", build: "pass", browser: "pass" },
    // Verified 2026-10-03: examples/apps/next builds with Next 15.5.22 (Turbopack)
    // and probe-next-mui.mjs passes 6/6 in Chromium — no page errors, MUI card
    // renders, theme switching resolves light -> dark, content stays legible.
    "Next.js": {
      fixture: "examples/apps/next",
      test: "examples/apps/_tools/probe-next-mui.mjs",
      build: "pass",
      browser: "pass",
    },
    Remix: { build: "not-run" },
    Astro: { build: "not-run" },
  },
  chakra: { React: { fixture: "examples/apps/adapters-example", build: "pass" } },
  antd: { React: { fixture: "examples/apps/adapters-example", build: "pass" } },
  mantine: { React: { fixture: "examples/apps/adapters-example", build: "pass" } },
  shadcn: {
    React: { fixture: "examples/apps/react", build: "pass" },
    "Vue 3": { fixture: "examples/apps/vue", test: "packages/adapters/shadcn/test/vue.test.ts", build: "pass" },
    Svelte: { fixture: "examples/apps/svelte", build: "pass" },
    Solid: { fixture: "examples/apps/solid", build: "pass" },
  },
  bootstrap: {
    React: { fixture: "examples/apps/adapters-example", build: "pass" },
    "Vue 3": { test: "packages/adapters/bootstrap/test/vue.test.ts" },
  },
  daisyui: {
    React: { fixture: "examples/apps/adapters-example", build: "pass" },
    "Vue 3": { test: "packages/adapters/daisyui/test/vue.test.ts" },
  },
  "open-props": {
    React: { fixture: "examples/apps/adapters-example", build: "pass" },
    "Vue 3": { test: "packages/adapters/open-props/test/vue.test.ts" },
  },
};
