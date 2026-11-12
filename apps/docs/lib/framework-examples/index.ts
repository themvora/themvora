import type { FrameworkExamples } from "./types";
import { reactExamples } from "./react";
import { nextExamples } from "./next";
import { vueExamples } from "./vue";
import { svelteExamples } from "./svelte";
import { solidExamples } from "./solid";
import { angularExamples } from "./angular";
import { webExamples } from "./web";
import { tailwindExamples } from "./tailwind";
import { astroExamples } from "./astro";
import { nuxtExamples } from "./nuxt";
import { remixExamples } from "./remix";
import { reactRouterExamples } from "./react-router";

export type {
  ApiExample,
  CombiningWorkflow,
  ExampleCategory,
  ExampleSnippet,
  FrameworkExamples,
  UseCaseRecipe,
} from "./types";

/**
 * The examples content, keyed by framework slug.
 *
 * One file per framework rather than one large module: each file is written
 * against a single package's declarations, so a reviewer can diff a change to
 * `@themvora/vue` against the page that documents it without scrolling past
 * ten other integrations.
 */
export const frameworkExamples: Record<string, FrameworkExamples> = {
  react: reactExamples,
  next: nextExamples,
  vue: vueExamples,
  svelte: svelteExamples,
  solid: solidExamples,
  angular: angularExamples,
  web: webExamples,
  tailwind: tailwindExamples,
  astro: astroExamples,
  nuxt: nuxtExamples,
  remix: remixExamples,
  "react-router": reactRouterExamples,
};

/** The examples page for one framework, or `undefined` for an unknown slug. */
export function examplesFor(slug: string): FrameworkExamples | undefined {
  return frameworkExamples[slug];
}

/**
 * Feature name → example anchor, for the What's Available index.
 *
 * Built from the same `covers` declarations the coverage check reads, so a
 * link in the index and the entry it points at cannot disagree: there is one
 * mapping, and an entry that stops claiming a feature also stops being linked
 * from it.
 */
const anchorsBySlug = new Map<string, Map<string, { anchor: string; category: string }>>();

for (const [slug, examples] of Object.entries(frameworkExamples)) {
  const map = new Map<string, { anchor: string; category: string }>();
  for (const category of examples.categories) {
    for (const entry of category.entries) {
      for (const feature of entry.covers) {
        // First claim wins: a grouped feature is documented once, and the
        // Components group's repeat of `useThemePacks()` must resolve to the
        // single Hooks entry rather than to itself.
        if (!map.has(feature)) {
          map.set(feature, { anchor: entry.id, category: category.id });
        }
      }
    }
  }
  anchorsBySlug.set(slug, map);
}

/** Where a What's Available feature is documented, or `null` when it is not. */
export function anchorForFeature(
  slug: string,
  feature: string,
): { anchor: string; category: string } | null {
  return anchorsBySlug.get(slug)?.get(feature) ?? null;
}

/** Every feature name a framework's examples claim, for the coverage check. */
export function claimedFeatures(slug: string): string[] {
  return [...(anchorsBySlug.get(slug)?.keys() ?? [])];
}

/**
 * What's Available group label → the examples-page category anchor.
 *
 * The labels are the contract (`check-framework-examples.mjs` requires them to
 * match the guide exactly), so the guide can link its group header straight to
 * the matching category without knowing the ids.
 */
export function anchorForCategory(slug: string, label: string): string | null {
  const category = frameworkExamples[slug]?.categories.find(
    (entry) => entry.label === label,
  );
  return category?.id ?? null;
}

/** Category ids present in a framework's examples, for anchor validation. */
export function categoryIds(slug: string): string[] {
  return (frameworkExamples[slug]?.categories ?? []).map((category) => category.id);
}
