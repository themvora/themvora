/**
 * Resolving a theme against the document it came from.
 *
 * `themeToCSSVariables()` and `measureThemeContrast()` do not follow `extends`,
 * and `validateTheme()` only does when handed a registry. Anything that projects
 * or measures a theme therefore has to flatten it first.
 *
 * Core owns the algorithm. This module owns two decisions core leaves open:
 * *when* to call it (only when the theme actually declares `extends`, so
 * standalone themes keep their existing path) and *whether the answer is
 * unambiguous* — `resolveTheme()` picks the first match by name, which would
 * silently render the wrong colours when a document contains two themes with the
 * same name.
 *
 * @packageDocumentation
 */
import { resolveTheme, type ThemeDefinition } from "@themvora/core";

/**
 * Resolve a theme against its document.
 *
 * @param theme - The theme to resolve.
 * @param themes - The document's themes, when known.
 * @returns A concrete theme; the input itself when it declares no `extends`.
 * @throws {Error} When the name is ambiguous, a base is missing, or the chain is
 *   circular. Core's messages are propagated unchanged.
 */
export function resolveInDocument(
  theme: ThemeDefinition,
  themes: readonly ThemeDefinition[] | undefined,
): ThemeDefinition {
  if (themes === undefined || theme.extends === undefined) return theme;

  const matches = themes.filter(
    (candidate) => candidate.name === theme.name,
  ).length;
  if (matches > 1) {
    throw new Error(
      `Theme name "${theme.name}" is ambiguous: ${matches} themes in this document share it, ` +
        "so its base cannot be chosen safely.",
    );
  }

  return resolveTheme(themes, theme.name);
}
