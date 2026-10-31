/**
 * Deterministic default selection for the Studio.
 *
 * When the Studio opens or refreshes, it needs to select a theme automatically
 * rather than showing an empty preview. The selection follows a priority:
 *
 * 1. Preserve the user's last selected theme if it is still valid
 * 2. Select the valid project theme with the strongest evidence
 * 3. If no project themes, select a canonical preset
 * 4. If nothing valid, return undefined (empty state)
 *
 * Evidence strength (strongest to weakest):
 * - registered: a verified consumer supplies it
 * - partially-resolved: consumer relationship exists but incomplete
 * - catalog-source: came from a canonical catalog call
 * - defined-unregistered: defined but no verified consumer association
 *
 * @packageDocumentation
 */

import { validateTheme, type ThemeDefinition } from "@themvora/core";

import type { ProjectInspection, ThemeEvidence } from "../domain/registry.js";
import { themeFamilyName } from "../domain/themeFamily.js";

/** Identifies a theme by its source, name, and mode. */
export interface ThemeIdentifier {
  readonly source: string;
  readonly name: string;
  readonly mode?: string;
}

/** Evidence strength ranking (lower is stronger). */
const EVIDENCE_RANK: Record<ThemeEvidence, number> = {
  registered: 0,
  "partially-resolved": 1,
  "catalog-source": 2,
  "defined-unregistered": 3,
};

/**
 * Compare two evidence values by strength.
 *
 * @param a - First evidence.
 * @param b - Second evidence.
 * @returns Negative if a is stronger, positive if b is stronger, 0 if equal.
 */
function compareEvidence(a: ThemeEvidence, b: ThemeEvidence): number {
  return EVIDENCE_RANK[a] - EVIDENCE_RANK[b];
}

/**
 * Check whether a theme identifier matches a theme definition.
 *
 * @param id - The identifier to check.
 * @param theme - The theme to match against.
 * @param source - The source path of the theme.
 * @returns True when the identifier matches the theme.
 */
function matchesIdentifier(
  id: ThemeIdentifier,
  theme: ThemeDefinition,
  source: string,
): boolean {
  return (
    id.source === source &&
    id.name === theme.name &&
    (id.mode ?? "") === (theme.meta?.mode ?? "")
  );
}

/**
 * Find a persisted selection in the current inspection.
 *
 * @param inspection - The current inspection.
 * @param persisted - The persisted theme identifier.
 * @returns The matching theme and source, or undefined.
 */
function findPersistedSelection(
  inspection: ProjectInspection,
  persisted: ThemeIdentifier,
): { theme: ThemeDefinition; source: string } | undefined {
  for (const registry of inspection.registries) {
    for (const theme of registry.themes ?? []) {
      if (matchesIdentifier(persisted, theme, registry.path)) {
        return { theme, source: registry.path };
      }
    }
  }
  return undefined;
}

/**
 * Find the strongest valid project theme.
 *
 * Iterates through all relationships and finds the theme with the strongest
 * evidence that is also valid. A theme must pass validation to be selected.
 *
 * @param inspection - The current inspection.
 * @returns The theme, source, and evidence, or undefined.
 */
function findStrongestProjectTheme(
  inspection: ProjectInspection,
): { theme: ThemeDefinition; source: string; evidence: ThemeEvidence } | undefined {
  let best: { theme: ThemeDefinition; source: string; evidence: ThemeEvidence } | undefined;

  for (const relationship of inspection.relationships ?? []) {
    const registry = inspection.registries.find((r) => r.path === relationship.definedIn);
    if (registry === undefined) continue;

    const theme = registry.themes?.find(
      (t) => t.name === relationship.name && (t.meta?.mode ?? "") === (relationship.mode ?? ""),
    );
    if (theme === undefined) continue;

    const report = validateTheme(theme);
    if (!report.valid) continue;

    if (best === undefined || compareEvidence(relationship.evidence, best.evidence) < 0) {
      best = { theme, source: relationship.definedIn, evidence: relationship.evidence };
    }
  }

  return best;
}

/**
 * Find any valid project theme as a fallback.
 *
 * When no relationship exists (defined-unregistered themes), iterate through
 * all registries and find the first valid theme.
 *
 * @param inspection - The current inspection.
 * @returns The theme and source, or undefined.
 */
function findAnyValidProjectTheme(
  inspection: ProjectInspection,
): { theme: ThemeDefinition; source: string } | undefined {
  for (const registry of inspection.registries) {
    for (const theme of registry.themes ?? []) {
      const report = validateTheme(theme);
      if (report.valid) {
        return { theme, source: registry.path };
      }
    }
  }
  return undefined;
}

/**
 * Determine the default selection for the Studio.
 *
 * Follows the priority:
 * 1. Persisted selection if still valid
 * 2. Strongest evidence project theme
 * 3. Any valid project theme
 * 4. Undefined (caller should fall back to presets or empty state)
 *
 * @param inspection - The current inspection, when available.
 * @param persisted - The persisted theme identifier, when available.
 * @returns The default selection, or undefined.
 */
export function determineDefaultSelection(
  inspection: ProjectInspection | undefined,
  persisted: ThemeIdentifier | undefined,
): { theme: ThemeDefinition; source: string; evidence?: ThemeEvidence } | undefined {
  if (inspection === undefined) return undefined;

  // 1. Try persisted selection
  if (persisted !== undefined) {
    const found = findPersistedSelection(inspection, persisted);
    if (found !== undefined) {
      const report = validateTheme(found.theme);
      if (report.valid) {
        const relationship = inspection.relationships?.find(
          (r) =>
            r.definedIn === found.source &&
            r.name === found.theme.name &&
            (r.mode ?? "") === (found.theme.meta?.mode ?? ""),
        );
        return {
          theme: found.theme,
          source: found.source,
          ...(relationship === undefined ? {} : { evidence: relationship.evidence }),
        };
      }
    }
  }

  // 2. Try strongest evidence project theme
  const strongest = findStrongestProjectTheme(inspection);
  if (strongest !== undefined) {
    return strongest;
  }

  // 3. Try any valid project theme
  const anyValid = findAnyValidProjectTheme(inspection);
  if (anyValid !== undefined) {
    return anyValid;
  }

  // 4. No valid project themes
  return undefined;
}

/**
 * Build a theme identifier from a selection for persistence.
 *
 * @param source - The source path.
 * @param theme - The theme definition.
 * @returns The identifier.
 */
export function buildThemeIdentifier(
  source: string,
  theme: ThemeDefinition,
): ThemeIdentifier {
  return {
    source,
    name: theme.name,
    ...(theme.meta?.mode === undefined ? {} : { mode: theme.meta.mode }),
  };
}

/**
 * Get the family name for a theme identifier.
 *
 * Looks up the theme in the inspection and returns its family name.
 *
 * @param inspection - The current inspection.
 * @param id - The theme identifier.
 * @returns The family name, or undefined.
 */
export function familyNameForIdentifier(
  inspection: ProjectInspection,
  id: ThemeIdentifier,
): string | undefined {
  const found = findPersistedSelection(inspection, id);
  if (found === undefined) return undefined;
  return themeFamilyName(found.theme);
}
