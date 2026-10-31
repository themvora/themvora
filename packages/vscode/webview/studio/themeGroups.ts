/**
 * Group theme rows into the families a person thinks in.
 *
 * A registry file can hold several families. Cards are one per family, so a
 * light/dark pair does not read as two unrelated themes. The host already
 * records `family`; the suffix fallback matches the canonical registry naming.
 */
import type { StudioTheme } from "../../src/shared/studioProtocol";

/** One family card. */
export interface ThemeFamilyView {
  readonly key: string;
  readonly name: string;
  readonly themes: readonly StudioTheme[];
  /** Up to four colours from the family, for the card strip. */
  readonly swatches: readonly string[];
}

/**
 * The grouping key for a theme.
 *
 * @param theme - One theme row.
 * @returns Its family key.
 */
export function themeGroupKey(theme: StudioTheme): string {
  return theme.family ?? theme.name.replace(/-(light|dark)$/u, "");
}

/**
 * Group themes by family, preserving first-seen order.
 *
 * @param themes - Every project theme.
 * @returns One entry per family.
 */
export function groupFamilies(themes: readonly StudioTheme[]): ThemeFamilyView[] {
  const groups = new Map<string, { name: string; themes: StudioTheme[] }>();

  for (const theme of themes) {
    const key = themeGroupKey(theme);
    const existing = groups.get(key);
    if (existing === undefined) {
      groups.set(key, { name: theme.family ?? key, themes: [theme] });
    } else {
      existing.themes.push(theme);
    }
  }

  return [...groups.entries()].map(([key, group]) => {
    const swatches = [...new Set(group.themes.flatMap((theme) => theme.swatches))].slice(0, 4);
    return { key, name: group.name, themes: group.themes, swatches };
  });
}

/**
 * Whether a family came wholly from the catalog.
 *
 * A mixed family stays with the project: one project definition is enough to
 * make the family the user's own.
 *
 * @param family - The family.
 * @returns `true` when every theme is catalog-origin.
 */
export function isCatalogFamily(family: ThemeFamilyView): boolean {
  return family.themes.every(
    (theme) => theme.origin === "catalog" || theme.evidence === "catalog-source",
  );
}

/**
 * Split families into the project's own themes and catalog-origin themes.
 *
 * @param themes - Every theme row.
 * @returns The two lists, in first-seen order.
 */
export function partitionFamilies(themes: readonly StudioTheme[]): {
  readonly project: readonly ThemeFamilyView[];
  readonly catalog: readonly ThemeFamilyView[];
} {
  const families = groupFamilies(themes);
  return {
    project: families.filter((family) => !isCatalogFamily(family)),
    catalog: families.filter(isCatalogFamily),
  };
}
