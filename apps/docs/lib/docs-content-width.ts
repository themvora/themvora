/**
 * Per-page content width policy for the documentation workspace.
 *
 * The docs grid owns the column geometry; this module only decides how much of
 * the article track a page's content should use:
 *
 *   standard — explanatory prose, roughly 44rem / 70–78 characters per line
 *   wide     — setup guides, code samples, diagrams, feature grids
 *   full     — API tables, compatibility matrices and other tabular pages
 *
 * Defaults are resolved from the route, so a page does not need its own
 * wrapper or a one-off CSS rule. Pages can still opt into a variant through
 * `DocsLayout` when their shape differs from the route family.
 */
export type DocsContentWidth = "standard" | "wide" | "full";

const FULL_PREFIXES = [
  "/api-reference",
  "/reference/compatibility",
  "/reference/diagnostics",
  "/packages",
  "/tokens",
  "/libraries",
];

const STANDARD_PREFIXES = [
  "/core-concepts",
  "/troubleshooting",
  "/known-limitations",
  "/changelog",
  "/blog",
  "/roadmap",
  "/devtools",
  "/vscode",
  "/security",
];

function matches(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function resolveDocsContentWidth(pathname: string): DocsContentWidth {
  const clean = pathname.split("#")[0]?.split("?")[0] ?? pathname;
  if (FULL_PREFIXES.some((prefix) => matches(clean, prefix))) return "full";
  if (STANDARD_PREFIXES.some((prefix) => matches(clean, prefix))) return "standard";
  return "wide";
}
