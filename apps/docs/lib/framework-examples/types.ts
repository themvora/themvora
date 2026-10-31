/**
 * Shared shape for the per-framework "Examples & use cases" pages.
 *
 * These pages answer a different question from the framework guide and from
 * the API reference:
 *
 *   - the guide gets one app from zero to a working theme;
 *   - the API reference states exact signatures, parameters and return types;
 *   - these pages show *which* export solves *which* problem, in code.
 *
 * The three must not drift, so the examples are structured data rather than
 * prose: every entry declares which `What's Available` feature it documents
 * (`covers`), and `scripts/check-framework-examples.mjs` fails when a listed
 * feature has no example or is claimed twice. That contract is what makes
 * "every public API has a practical example" checkable instead of aspirational.
 */

/** One code sample: a file name, a language, and the code itself. */
export type ExampleSnippet = {
  /** File the snippet belongs in, shown in the code block header. */
  title: string;
  /** Shiki language id — `tsx`, `vue`, `svelte`, `ts`, `html`, `bash`. */
  lang: string;
  /** The code. Extracted by the repo snippet audit, so imports must be real. */
  code: string;
  /**
   * Hand-authored JavaScript alternative, for snippets whose TypeScript cannot
   * be mechanically converted — `defineProps<T>()` with no runtime argument,
   * for example. When present, the pipeline uses it instead of deriving.
   */
  js?: string;
  /** File name for the JavaScript variant, when it differs from the mapped one. */
  jsFilename?: string;
};

/**
 * One public API, documented once.
 *
 * `id` is the anchor on the examples page and the link target the What's
 * Available index points at, so it must be stable — renaming it breaks a link
 * that `check-framework-examples.mjs` resolves against the rendered page.
 */
export type ApiExample = {
  /** Anchor id, unique within the framework. Kebab-case. */
  id: string;
  /** The export as written in code, e.g. `useThemeMode()`. */
  name: string;
  /**
   * The `What's Available` feature names this entry accounts for, verbatim.
   *
   * A grouped feature ("`useThemeMode()` / `useThemeFamily()`") is claimed by
   * the entry that documents both halves; a second entry for the other half
   * lists the same string, which is why the coverage check counts claims as a
   * set rather than requiring one entry per feature.
   */
  covers: string[];
  /** What it actually does, in the framework's own vocabulary. */
  what: string;
  /** The problem it solves — the reason to reach for it over the alternative. */
  when: string;
  /** What the reader observes after using it. */
  effect: string;
  /** Ids of APIs commonly needed alongside this one. */
  related?: string[];
  /** One or more samples. Proportional to the API, not padded. */
  code: ExampleSnippet[];
};

/** A `What's Available` category, mirrored so the two indexes agree. */
export type ExampleCategory = {
  /** Anchor id for the category, e.g. `hooks`. */
  id: string;
  /** Must equal the `What's Available` group label exactly. */
  label: string;
  /** One or two sentences on what this group is for. */
  intro: string;
  entries: ApiExample[];
};

/** An application-level workflow built from several APIs. */
export type UseCaseRecipe = {
  id: string;
  /** Task-shaped heading, e.g. "Let the visitor pick a family". */
  title: string;
  /** The problem this solves. */
  problem: string;
  /** The APIs it uses, by name. */
  apis: string[];
  /** Why these APIs rather than the alternatives. */
  why: string;
  /** What the user sees once it works. */
  expect: string;
  /** Requirements, limits, or failure modes worth knowing first. */
  caveats?: string;
  code: ExampleSnippet[];
};

/** A short narrative showing several APIs cooperating. */
export type CombiningWorkflow = {
  id: string;
  title: string;
  body: string;
  code: ExampleSnippet[];
};

/** Everything the examples route renders for one framework. */
export type FrameworkExamples = {
  /** Framework slug — must match `lib/frameworks.tsx`. */
  slug: string;
  /**
   * Titles for the page's sections.
   *
   * These are per-framework on purpose. Five headings repeated verbatim on
   * eleven pages ("Start here", "Common use cases", "API examples") tell a
   * reader nothing about what is under them and make every integration read
   * like the same document with the imports swapped. Each set names the step
   * that framework's reader is actually on — a provider, an SSR boundary, a
   * build-time integration — while the anchors stay fixed (`start-here`,
   * `use-cases`, `api-examples`, `combining`) so links keep working.
   */
  sections: {
    startHere: string;
    useCases: string;
    api: string;
    /** Omitted when the integration has no end-to-end workflows. */
    combining?: string;
  };
  /** Opening paragraphs: what this integration lets a reader build. */
  intro: string[];
  /** The minimal working workflow, before any API detail. */
  startHere: {
    body: string;
    note?: string;
    code: ExampleSnippet[];
  };
  categories: ExampleCategory[];
  recipes: UseCaseRecipe[];
  combining: CombiningWorkflow[];
  /**
   * Public exports the framework deliberately does not have, and why.
   *
   * Rendering these is the honest alternative to inventing an example for a
   * hook that another integration happens to export.
   */
  notAvailable?: { name: string; reason: string }[];
};

/** Flattened anchor lookup: `slug` + feature name → example anchor id. */
export type FeatureAnchor = { anchor: string; category: string };
