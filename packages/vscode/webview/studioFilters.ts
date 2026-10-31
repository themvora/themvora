/**
 * The Studio's evidence filters.
 *
 * Each filter reads a typed state the host already sent; none of them creates
 * a category the inspection does not produce. Kept out of the component so the
 * filtering can be tested without rendering React.
 *
 * @packageDocumentation
 */

/** The evidence filters the Sources panel offers. */
export type EvidenceFilter =
  | "all"
  | "registered"
  | "unregistered"
  | "catalog"
  | "partial"
  | "invalid";

/** The theme fields a filter reads. */
export interface FilterableTheme {
  readonly evidence?: string;
  readonly origin?: string;
}

/** The source fields a filter reads. */
export interface FilterableSource {
  readonly path: string;
  readonly status: string;
  readonly definitions: readonly FilterableTheme[];
}

/**
 * Whether a theme belongs in the selected evidence view.
 *
 * @param theme - The theme row.
 * @param filter - The selected filter.
 * @returns `true` when it matches.
 */
export function themeMatches(theme: FilterableTheme, filter: EvidenceFilter): boolean {
  switch (filter) {
    case "all":
      return true;
    case "registered":
      return theme.evidence === "registered";
    case "unregistered":
      return theme.evidence === "defined-unregistered";
    case "catalog":
      return theme.origin === "catalog" || theme.evidence === "catalog-source";
    case "partial":
      return theme.evidence === "partially-resolved";
    case "invalid":
      return false;
  }
}

/**
 * Whether a family has at least one theme in the selected evidence view.
 *
 * @param themes - The family's themes.
 * @param filter - The selected filter.
 * @returns `true` when it matches.
 */
export function familyMatches(
  themes: readonly FilterableTheme[],
  filter: EvidenceFilter,
): boolean {
  return filter === "all" || themes.some((theme) => themeMatches(theme, filter));
}

/**
 * Whether a source has at least one reason to appear under the filter.
 *
 * `partial` also includes a source imported by a consumer whose association is
 * partial or dynamic, even though the theme's own evidence stays unregistered.
 *
 * @param source - The source row.
 * @param filter - The selected filter.
 * @param partialPaths - Source paths imported by a partial/dynamic consumer.
 * @returns `true` when it matches.
 */
export function sourceMatches(
  source: FilterableSource,
  filter: EvidenceFilter,
  partialPaths: ReadonlySet<string> = new Set(),
): boolean {
  switch (filter) {
    case "all":
      return true;
    case "invalid":
      return source.status === "malformed" || source.status === "unsupported";
    case "registered":
      return source.definitions.some((theme) => theme.evidence === "registered");
    case "unregistered":
      return source.definitions.some((theme) => theme.evidence === "defined-unregistered");
    case "catalog":
      return source.definitions.some(
        (theme) => theme.origin === "catalog" || theme.evidence === "catalog-source",
      );
    case "partial":
      return (
        source.definitions.some((theme) => theme.evidence === "partially-resolved") ||
        partialPaths.has(source.path)
      );
  }
}

/**
 * Whether canonical preset previews belong in the selected view.
 *
 * Presets are catalog items, never project registrations, so any filter other
 * than "all" or "catalog" hides them.
 *
 * @param filter - The selected filter.
 * @returns `true` when presets should be shown.
 */
export function presetVisible(filter: EvidenceFilter): boolean {
  return filter === "all" || filter === "catalog";
}
