/**
 * Theme family identity.
 *
 * A registry commonly holds several families, so selecting a theme must select
 * that family — not every theme in the file. The recorded `meta.family` wins;
 * otherwise the `-light` / `-dark` suffix is removed, which is the convention
 * the canonical registry uses.
 *
 * @packageDocumentation
 */
import type { ThemeDefinition } from "@themvora/core";

/**
 * The family key for one theme.
 *
 * @param theme - The theme.
 * @returns Its family name.
 */
export function themeFamilyName(theme: ThemeDefinition): string {
  return theme.meta?.family ?? theme.name.replace(/-(light|dark)$/u, "");
}

/**
 * The themes that belong with one theme.
 *
 * @param themes - Every theme in the source.
 * @param theme - The selected theme.
 * @returns Its family, or just the theme when the family is empty.
 */
export function familyOf(
  themes: readonly ThemeDefinition[],
  theme: ThemeDefinition,
): readonly ThemeDefinition[] {
  const key = themeFamilyName(theme);
  const family = themes.filter((candidate) => themeFamilyName(candidate) === key);
  return family.length > 0 ? family : [theme];
}
