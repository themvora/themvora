/**
 * The Studio's evidence view model.
 *
 * Pure mapping from one `ProjectInspection` to the rows the webview renders.
 * Keeping it out of the panel is what lets the sources/consumer UI be tested
 * without a webview: no `vscode`, no message bus, no DOM.
 *
 * The mapping never upgrades evidence. A theme without a relationship stays
 * `defined-unregistered`; a registration-only consumer stays registration-only;
 * a dynamic value stays unverified. The UI may word these states differently,
 * but it cannot make them stronger.
 *
 * @packageDocumentation
 */

import { validateTheme, type ThemeDefinition } from "@themvora/core";

import { INTEGRATION_LABELS } from "../domain/consumers.js";
import type { ProjectInspection, RegistryThemeSource } from "../domain/registry.js";
import { themeFamilyName } from "../domain/themeFamily.js";
import type { ThemeDraft } from "../services/draftRegistry.js";
import type {
  StudioConsumer,
  StudioDraftRow,
  StudioSourceFile,
  StudioSourceTheme,
  StudioTheme,
} from "../shared/studioProtocol.js";

/** One project theme, with its source metadata and proven evidence. */
export type StudioThemeView = StudioTheme;

/** One theme definition inside a source row. */
export type StudioSourceThemeView = StudioSourceTheme;

/** One file the inspection read. */
export type StudioSourceView = StudioSourceFile;

/** One verified runtime-consumer use. */
export type StudioConsumerView = StudioConsumer;

/**
 * The key used to join a theme, its source record and its relationship.
 *
 * @param path - The defining file.
 * @param name - The theme name.
 * @param mode - Its mode, if any.
 * @returns A stable key.
 */
function themeKey(path: string, name: string, mode: string | undefined): string {
  return `${path}\u0000${name}\u0000${mode ?? ""}`;
}

/**
 * A compact, ordered swatch strip for a theme card.
 *
 * These are the theme's own colours, read in a fixed role order so the strip is
 * comparable between families. Nothing is derived or invented.
 *
 * @param theme - The theme.
 * @returns Up to four colour values.
 */
function swatchesOf(theme: ThemeDefinition): string[] {
  const colors = (theme.tokens?.colors ?? {}) as Record<string, string | undefined>;
  return ["background", "card", "primary", "accent", "foreground"]
    .map((role) => colors[role])
    .filter((value): value is string => typeof value === "string")
    .slice(0, 4);
}

/**
 * Map the definitions in one entry to their source rows.
 *
 * @param entry - The registry entry.
 * @param themes - The themes the entry contributed.
 * @returns One row per definition.
 */
function definitionsOf(
  entry: ProjectInspection["registries"][number],
  themes: readonly ThemeDefinition[],
): StudioSourceThemeView[] {
  const sources: readonly RegistryThemeSource[] =
    entry.themeSources ??
    themes.map((theme): RegistryThemeSource => ({
      name: theme.name,
      ...(theme.meta?.mode === undefined ? {} : { mode: theme.meta.mode }),
    }));

  return sources.map((source) => {
    const theme = themes.find(
      (candidate) =>
        candidate.name === source.name && (candidate.meta?.mode ?? "") === (source.mode ?? ""),
    );
    const report = theme === undefined ? undefined : validateTheme(theme);
    const issue = report?.issues[0];

    return {
      name: source.name,
      ...(source.mode === undefined ? {} : { mode: source.mode }),
      ...(source.binding === undefined ? {} : { binding: source.binding }),
      ...(source.origin === undefined ? {} : { origin: source.origin }),
      ...(source.generateOptions === undefined ? {} : { generateOptions: source.generateOptions }),
      ...(source.location === undefined ? {} : { location: source.location }),
      ...(source.region === undefined ? {} : { region: source.region }),
      valid: report?.valid ?? false,
      ...(issue === undefined ? {} : { issue: issue.message }),
      usedBy: [],
    };
  });
}

/**
 * Build the theme library rows.
 *
 * @param inspection - The current inspection, when there is one.
 * @returns Every theme, deduplicated by family+mode.
 */
export function buildStudioThemes(inspection?: ProjectInspection): StudioThemeView[] {
  const relationships = new Map(
    (inspection?.relationships ?? []).map((entry) => [
      themeKey(entry.definedIn, entry.name, entry.mode),
      entry,
    ]),
  );
  const seen = new Set<string>();
  const themes: StudioThemeView[] = [];

  for (const entry of inspection?.registries ?? []) {
    for (const theme of entry.themes ?? []) {
      const family = themeFamilyName(theme);
      const dedupe = `${family}:${theme.meta?.mode ?? "default"}`;
      if (seen.has(dedupe)) continue;
      seen.add(dedupe);

      const source = entry.themeSources?.find(
        (candidate) =>
          candidate.name === theme.name &&
          (candidate.mode ?? "") === (theme.meta?.mode ?? ""),
      );
      const relationship = relationships.get(themeKey(entry.path, theme.name, theme.meta?.mode));
      const region = source?.region ?? entry.region;

      themes.push({
        name: theme.name,
        source: entry.path,
        ...(theme.meta?.mode === undefined ? {} : { mode: theme.meta.mode }),
        family,
        valid: validateTheme(theme).valid,
        evidence: relationship?.evidence ?? "defined-unregistered",
        ...(source?.origin === undefined ? {} : { origin: source.origin }),
        ...(source?.generateOptions === undefined
          ? {}
          : { generateOptions: source.generateOptions }),
        ...(source?.binding === undefined ? {} : { binding: source.binding }),
        ...(source?.location === undefined ? {} : { location: source.location }),
        ...(region === undefined ? {} : { region }),
        usedBy: relationship?.usedBy ?? [],
        swatches: swatchesOf(theme),
      });
    }
  }

  return themes;
}

/**
 * Build the source rows, including per-definition evidence.
 *
 * @param inspection - The current inspection.
 * @returns One row per registry entry, in inspection order.
 */
export function buildStudioSources(inspection?: ProjectInspection): StudioSourceView[] {
  const relationships = new Map(
    (inspection?.relationships ?? []).map((entry) => [
      themeKey(entry.definedIn, entry.name, entry.mode),
      entry,
    ]),
  );

  return (inspection?.registries ?? []).map((entry) => {
    const definitions = definitionsOf(entry, entry.themes ?? []).map((definition) => {
      const relationship = relationships.get(
        themeKey(entry.path, definition.name, definition.mode),
      );

      return {
        ...definition,
        ...(relationship === undefined
          ? {}
          : { evidence: relationship.evidence, usedBy: relationship.usedBy }),
      };
    });

    const usedBy = new Set(definitions.flatMap((definition) => definition.usedBy));

    return {
      path: entry.path,
      kind: entry.kind,
      status: entry.status,
      detail: entry.detail,
      ...(entry.region === undefined ? {} : { region: entry.region }),
      themes: (entry.themes ?? []).length,
      problems: entry.problems ?? [],
      usedBy: usedBy.size,
      definitions,
    };
  });
}

/**
 * A sentence that states what a consumer use proves.
 *
 * @param usage - One provider usage.
 * @returns The sentence.
 */
function headlineOf(usage: ProjectInspection["providers"][number]): string {
  const integration =
    usage.integration === undefined ? "Themvora" : INTEGRATION_LABELS[usage.integration];
  const api = usage.api === undefined ? "runtime" : usage.api;

  if (usage.registrationOnly === true || usage.evidence === "registration-only") {
    return `${integration} registration detected; theme configuration not established.`;
  }

  if (usage.evidence === "registered") {
    return `${integration} ${api} detected; theme collection resolved.`;
  }

  if (usage.evidence === "partially-resolved") {
    return `${integration} ${api} detected; theme collection partially resolved.`;
  }

  if (usage.evidence === "dynamic-unverified") {
    return `${integration} ${api} detected; supplied themes could not be determined.`;
  }

  if (usage.input === "absent") {
    return `${integration} ${api} detected; no theme input.`;
  }

  return `${integration} ${api} detected; no theme could be traced.`;
}

/**
 * Build the runtime-consumer rows.
 *
 * @param inspection - The current inspection.
 * @returns One row per verified consumer use.
 */
export function buildStudioConsumers(inspection?: ProjectInspection): StudioConsumerView[] {
  return (inspection?.providers ?? []).map((usage) => ({
    path: usage.path,
    names: usage.names,
    ...(usage.integration === undefined ? {} : { integration: usage.integration }),
    ...(usage.integration === undefined
      ? {}
      : { integrationLabel: INTEGRATION_LABELS[usage.integration] }),
    ...(usage.api === undefined ? {} : { api: usage.api }),
    ...(usage.input === undefined ? {} : { input: usage.input }),
    ...(usage.resolution === undefined ? {} : { resolution: usage.resolution }),
    ...(usage.evidence === undefined ? {} : { evidence: usage.evidence }),
    ...(usage.reason === undefined ? {} : { reason: usage.reason }),
    ...(usage.unresolved === undefined ? {} : { unresolved: usage.unresolved }),
    ...(usage.location === undefined ? {} : { location: usage.location }),
    ...(usage.region === undefined ? {} : { region: usage.region }),
    ...(usage.registrationOnly === true ? { registrationOnly: true } : {}),
    ...(usage.importsFrom === undefined ? {} : { importsFrom: usage.importsFrom }),
    headline: headlineOf(usage),
  }));
}

/**
 * Count project-defined and catalog-origin themes, distinguishing families from variants.
 *
 * A generated registry mixes both, so `themes.length` alone would inflate the
 * project count with canonical presets.
 *
 * @param themes - The library rows.
 * @returns The counts of variants and families for project and catalog themes.
 */
export function themeCounts(themes: readonly StudioThemeView[]): {
  readonly project: number;
  readonly projectFamilies: number;
  readonly catalog: number;
  readonly catalogFamilies: number;
} {
  let project = 0;
  let catalog = 0;
  const projectFamilies = new Set<string>();
  const catalogFamilies = new Set<string>();

  for (const theme of themes) {
    const family = theme.family ?? theme.name;
    if (theme.origin === "catalog") {
      catalog += 1;
      catalogFamilies.add(family);
    } else {
      project += 1;
      projectFamilies.add(family);
    }
  }

  return {
    project,
    projectFamilies: projectFamilies.size,
    catalog,
    catalogFamilies: catalogFamilies.size,
  };
}

/**
 * Whether a workspace-relative path is one the inspection actually read.
 *
 * The webview may send a path with an intent to open it, so it is validated
 * here rather than trusted: no absolute paths, no traversal, and only files
 * the inspection produced.
 *
 * @param inspection - The current inspection.
 * @param path - The candidate path.
 * @returns `true` when the path is safe and known.
 */
export function isInspectionPath(inspection: ProjectInspection | undefined, path: string): boolean {
  if (inspection === undefined || path === "") return false;
  if (path.startsWith("/") || path.includes("\\")) return false;
  if (path.split("/").some((segment) => segment === "" || segment === "..")) return false;

  return (
    (inspection.registries ?? []).some((entry) => entry.path === path) ||
    (inspection.providers ?? []).some((usage) => usage.path === path)
  );
}

/**
 * Analyze token usage for a theme.
 *
 * Compares the tokens defined in the theme with the tokens referenced by
 * consumers. Returns lists of unused, missing, and used tokens.
 *
 * @param theme - The theme definition.
 * @param inspection - The project inspection with consumer data.
 * @returns The token usage analysis.
 */
export function analyzeTokenUsage(
  theme: ThemeDefinition,
  inspection?: ProjectInspection,
): { unused: string[]; missing: string[]; used: string[] } {
  const definedTokens = new Set(Object.keys(theme.tokens?.colors ?? {}));
  const referencedTokens = new Set<string>();

  // Collect all tokens referenced by consumers.
  for (const provider of inspection?.providers ?? []) {
    // The `names` field contains the theme names imported, not token names.
    // The `unresolved` field contains names that didn't resolve to a definition.
    // For now, we'll use a simple heuristic: if a consumer has unresolved names,
    // those might be missing tokens.
    if (provider.unresolved !== undefined) {
      for (const name of provider.unresolved) {
        // Only consider names that look like token names (camelCase).
        if (/^[a-z][A-Za-z0-9]*$/u.test(name)) {
          referencedTokens.add(name);
        }
      }
    }
  }

  const unused: string[] = [];
  const used: string[] = [];

  for (const token of definedTokens) {
    if (referencedTokens.has(token)) {
      used.push(token);
    } else {
      unused.push(token);
    }
  }

  const missing: string[] = [];
  for (const token of referencedTokens) {
    if (!definedTokens.has(token)) {
      missing.push(token);
    }
  }

  return { unused, missing, used };
}

/**
 * Map registry drafts to the rows the library lists.
 *
 * Scope is applied here, not in the UI: a draft belongs to one folder or to no
 * folder, and this Studio shows one folder. A draft from another root is not
 * offered — silently adopting it would claim a relationship the registry does
 * not record.
 *
 * @param drafts - Every draft the host registry holds.
 * @param root - The folder this Studio is showing, when it has one.
 * @returns The rows, oldest first.
 */
export function buildStudioDrafts(
  drafts: readonly ThemeDraft[],
  root: string | undefined,
): StudioDraftRow[] {
  return drafts
    .filter(
      (draft) =>
        draft.scope.kind === "standalone" ||
        (root !== undefined && draft.scope.root === root),
    )
    .map((draft) => ({
      id: draft.id,
      name: draft.name,
      ...(draft.family === undefined ? {} : { family: draft.family }),
      modes: draft.modes,
      origin: draft.origin,
      // A draft with no recorded verdict has not been validated yet; calling it
      // valid would be a claim nothing made.
      valid: draft.validation?.valid === true,
      dirty: draft.dirty,
      revision: draft.revision,
      saved: draft.saved !== undefined,
      swatches: draft.themes[0] === undefined ? [] : swatchesOf(draft.themes[0]),
    }));
}
