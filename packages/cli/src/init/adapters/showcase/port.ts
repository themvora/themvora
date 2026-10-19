/**
 * What a framework port supplies to the shared showcase renderers.
 *
 * Everything else — the design, the copy, the class vocabulary, the snippets,
 * the interactions — is shared, so a port that only carries these three values
 * cannot accidentally diverge from the reference.
 *
 * @packageDocumentation
 */

/** The framework-specific values the showcase renderers interpolate. */
export interface ShowcasePort {
  /** The framework's runtime package, e.g. `"@themvora/react"`. */
  adapter: string;
  /**
   * The path of the file the hero tells the reader to edit.
   *
   * Must match the framework's real structure — `src/App.tsx` for React and
   * Solid, `src/App.vue`, `src/App.svelte`, and `app/page.tsx` for Next.
   */
  editPath: string;
  /** The framework's documentation guide slug, e.g. `"react"`. */
  guideSlug: string;
  /** The import specifier the component uses for the theme hooks. */
  hooksFrom: string;
}
