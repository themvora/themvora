/**
 * The showcase's shared content.
 *
 * Copy, links and snippets live here so the five framework ports render the same
 * product experience. A framework adapter supplies only what genuinely differs —
 * its syntax, and the path of the file the reader is told to edit.
 *
 * @packageDocumentation
 */

/**
 * The documentation site.
 *
 * One base URL, so a deployment change is one edit rather than ten. Every link
 * below is appended to it.
 */
export const DOCS_BASE = "https://themvora-dev.vercel.app";

/** The theme/mode controls, in the reference's order. */
export const MODES = ["light", "dark", "system"] as const;

/** The colour roles the live preview highlights. */
export const PREVIEW_COLORS = ["primary", "secondary", "accent", "muted"] as const;

/** One documentation link. */
export interface DocsLink {
  /** Absolute URL. */
  href: string;
  /** Visible label. */
  label: string;
}

/**
 * The hero's documentation links.
 *
 * @param frameworkSlug - The framework's guide slug, e.g. `"react"`.
 * @returns The four links, the first styled as the primary action.
 *
 * @remarks
 * The framework guide is the *reader's* framework, not React's: a Vue project
 * links to the Vue guide. The slugs are the documentation app's own
 * `framework-guides/<slug>` routes.
 */
export function docsLinks(frameworkSlug: string): DocsLink[] {
  return [
    { href: `${DOCS_BASE}/get-started`, label: "Read the docs" },
    { href: `${DOCS_BASE}/framework-guides/${frameworkSlug}`, label: `${guideLabel(frameworkSlug)} guide` },
    { href: `${DOCS_BASE}/custom-themes`, label: "Custom themes" },
    { href: `${DOCS_BASE}/playground`, label: "Playground" },
  ];
}

/** The display name used in a guide link's label. */
function guideLabel(slug: string): string {
  switch (slug) {
    case "next":
      return "Next.js";
    case "vue":
      return "Vue";
    case "svelte":
      return "Svelte";
    case "solid":
      return "Solid";
    default:
      return "React";
  }
}

/**
 * The Tailwind snippet shown in "Use the tokens", for a framework that spells
 * the attribute `className`.
 *
 * @remarks
 * Every utility is one the shipped `@themvora/tailwind` mapping provides, so the
 * snippet is copy-paste correct rather than illustrative.
 */
export const TAILWIND_SNIPPET = `<button className="rounded-md bg-primary px-4 py-2 text-primary-foreground">
  Themed button
</button>`;

/**
 * The same snippet for a framework that spells the attribute `class`.
 *
 * @remarks
 * Vue, Svelte and Solid all declare `class`; `className` is a React alias, and
 * printing it in a Svelte template would be a snippet that does not compile.
 */
export const TAILWIND_SNIPPET_CLASS = `<button class="rounded-md bg-primary px-4 py-2 text-primary-foreground">
  Themed button
</button>`;

/**
 * The CSS snippet shown in "Use the tokens".
 *
 * @remarks
 * `--theme-color-*` and `--theme-radius-*` are emitted by the runtime, so the
 * snippet works in any theme without per-theme code.
 */
export const CSS_SNIPPET = `.card {
  background: var(--theme-color-card);
  border: 1px solid var(--theme-color-border);
  border-radius: var(--theme-radius-lg);
}`;
