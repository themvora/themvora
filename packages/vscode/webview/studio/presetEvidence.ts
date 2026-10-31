/**
 * The Studio's view of preset registration.
 *
 * The calculation is `src/shared/presetRegistration.ts`, shared with the
 * `Browse Presets` command so the drawer and the command cannot disagree. This
 * module is the adapter: it maps a `StudioTheme` row onto the shared evidence
 * shape and re-attaches the original themes, which is what the drawer renders.
 *
 * No workspace folder is passed. The Studio builds its rows from a single
 * inspection, so there is nothing to keep apart — and the shared calculation
 * falls back to the plain family verdict, which is the same text the command
 * produces when its rows come from one folder.
 *
 * @packageDocumentation
 */
import type { StudioPreset, StudioTheme } from "../../src/shared/studioProtocol";
import {
  isInProject as sharedIsInProject,
  presetRegistration as sharedPresetRegistration,
  type PresetEvidenceRow,
  type PresetRegistration as SharedRegistration,
} from "../../src/shared/presetRegistration";

export type { PresetRegistrationStatus } from "../../src/shared/presetRegistration";
export { PRESET_STATUS_LABEL } from "../../src/shared/presetRegistration";

/** The shared verdict, with the Studio's own rows re-attached. */
export interface PresetRegistration extends Omit<SharedRegistration, "rows"> {
  /** The project rows that carry this preset. */
  readonly themes: readonly StudioTheme[];
}

/** A project row, in the shape the shared calculation reads. */
interface StudioRow extends PresetEvidenceRow {
  readonly theme: StudioTheme;
}

/**
 * Whether a project row is a catalog-derived copy rather than a local definition.
 *
 * Mirrors the rule the shared calculation applies: a row counts when it declares
 * catalog origin, or when the graph recorded catalog-source evidence for it.
 *
 * @param theme - One project theme row.
 * @returns `true` when the row came from the canonical catalog.
 */
function isCatalogTheme(theme: StudioTheme): boolean {
  return theme.origin === "catalog" || theme.evidence === "catalog-source";
}

/**
 * Adapt one Studio theme to the shared evidence shape.
 *
 * @param theme - The row.
 * @returns The row, plus the theme it came from.
 */
function toStudioRow(theme: StudioTheme): StudioRow {
  return {
    ...(theme.family === undefined ? {} : { family: theme.family }),
    name: theme.name,
    ...(theme.mode === undefined ? {} : { mode: theme.mode }),
    ...(theme.evidence === undefined ? {} : { evidence: theme.evidence }),
    usedBy: theme.usedBy,
    source: theme.source,
    catalogOrigin: isCatalogTheme(theme),
    theme,
  };
}

/**
 * Work out how a canonical preset relates to the project.
 *
 * @param preset - The catalog entry, as the host sent it.
 * @param themes - Every project theme row the Studio holds.
 * @returns The status, its label and the evidence behind it.
 */
export function presetRegistration(
  preset: StudioPreset,
  themes: readonly StudioTheme[],
): PresetRegistration {
  const shared = sharedPresetRegistration(
    { family: preset.family, label: preset.label, modes: preset.modes },
    themes.map(toStudioRow),
  );

  const { rows, ...rest } = shared;
  return { ...rest, themes: rows.map((row) => row.theme) };
}

/**
 * Whether a preset already belongs to the project.
 *
 * @param registration - The verdict.
 * @returns `true` for every status except catalog-only.
 */
export function isInProject(registration: PresetRegistration): boolean {
  return sharedIsInProject(registration);
}
