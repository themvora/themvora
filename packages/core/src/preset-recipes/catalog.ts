/**
 * The canonical preset catalog.
 *
 * One derived surface that the preset pages, the quality gate and any future
 * consumer read from. It is **derived**, never authored: every field comes from
 * the recipe, the generator, or the scorecard.
 *
 * ```
 * recipe ──▶ semantic-v2 ──▶ resolved preset ──▶ quality metadata ──▶ page
 * ```
 *
 * and deliberately **not**:
 *
 * ```
 * page ──▶ some manually duplicated palette information
 * ```
 *
 * That is the point of the module: a docs page cannot drift from the shipped
 * preset, because there is nothing on the page to drift from. Adding a field here
 * means adding it to the recipe or deriving it, never transcribing it.
 *
 * @packageDocumentation
 */
import {
  deriveIdentity,
  GENERATION_ALGORITHM,
  resolveStyle,
  scoreTheme,
  type GenerationStyle,
  type PresetCheck,
  type PresetScore,
  type Temperature,
} from "../generation";
import type { ThemeDefinition } from "../model";
import { BRAND_PRESET_RECIPES } from "./brands";
import { DEFAULT_PRESET_RECIPES } from "./defaults";
import type { BrandSource, ResolvedAnchor } from "./brand-source";
import {
  buildPresetThemeReport,
  type BrandProvenance,
  type PresetKind,
  type PresetMode,
  type ThemePresetRecipe,
} from "./recipe";

/**
 * The quality summary for a preset, merged across both modes.
 *
 * A check passes only if it passes in **both** light and dark. This is the same
 * result `scripts/audit-presets.mjs` gates on — the page consumes the quality
 * model rather than running a second contrast implementation.
 */
export interface PresetQuality {
  /** Checks that did not fail, across both modes. */
  passed: number;
  /** Total checks. */
  total: number;
  /** Check ids that warned in at least one mode. */
  warnings: readonly string[];
  /** Check ids that failed in at least one mode. */
  failures: readonly string[];
  /** Per-check detail, merged across modes. */
  checks: readonly PresetCheck[];
}

/** An anchor the solver had to move, rendered as hex. */
export interface NormalizedAnchor {
  /** The Themvora role. */
  role: string;
  /** The exact value the brand published. */
  anchor: string;
  /** The value the theme actually ships. */
  resolved: string;
  /** What the brand calls it. */
  label: string;
}

/**
 * The brand provenance for a catalog entry.
 *
 * Three separate things, kept separate on purpose:
 *
 * 1. **Identity** — the published reference colours and where they came from.
 * 2. **Interpretation** — the anchors Themvora pinned, and the roles it derived.
 * 3. **Normalization** — anchors the solver had to move to keep the theme readable.
 */
export interface CatalogBrand {
  /** The reference material behind the preset. */
  source: BrandSource;
  /** Anchors pinned, per mode. */
  anchors: Record<PresetMode, readonly ResolvedAnchor[]>;
  /** Anchors the solver moved, per mode. Empty when the anchor survived exactly. */
  normalized: Record<PresetMode, readonly NormalizedAnchor[]>;
}

/**
 * Everything a preset page needs about one preset family.
 */
export interface PresetCatalogEntry {
  /** Stable identifier, e.g. `"oat"`. */
  id: string;
  /** Display name, e.g. `"Oat"`. */
  name: string;
  /** Theme family, e.g. `"oat"`. */
  family: string;
  /** Curated default, or brand-inspired. */
  kind: PresetKind;
  /** The seed the palette is generated from. */
  seed: string;
  /** The generation style. */
  style: GenerationStyle;
  /** The algorithm that produced it. */
  algorithm: string;
  /** Derived from the seed's identity. */
  temperature: Temperature;
  /** The recipe's one-line character descriptor. */
  character: string;
  /** Free-form recipe tags. */
  tags: readonly string[];
  /** Border radius. */
  radius: string;
  /** How faithful a brand recipe is. Present on brand recipes only. */
  provenance?: BrandProvenance;
  /** The official brand colour, for documentation. Brand recipes only. */
  brandColor?: string;
  /** Which modes this family ships. */
  modes: readonly PresetMode[];
  /** The resolved themes. */
  themes: Record<PresetMode, ThemeDefinition>;
  /** The merged quality summary. */
  quality: PresetQuality;
  /** Brand reference provenance. Present on brand entries only. */
  brand?: CatalogBrand;
}

/** Merge two per-mode scores into one summary. */
function mergeQuality(light: PresetScore, dark: PresetScore): PresetQuality {
  const checks: PresetCheck[] = light.checks.map((check, index) => {
    const other = dark.checks[index];
    if (other === undefined) return check;

    const detail = [check.detail, other.detail].filter((value): value is string => Boolean(value));
    const status =
      check.status === "fail" || other.status === "fail"
        ? "fail"
        : check.status === "warn" || other.status === "warn"
          ? "warn"
          : "pass";

    if (status === "pass") return { id: check.id, label: check.label, status };
    return {
      id: check.id,
      label: check.label,
      status,
      ...(detail.length > 0 ? { detail: detail.join(" · ") } : {}),
    };
  });

  return {
    passed: checks.filter((check) => check.status !== "fail").length,
    total: checks.length,
    warnings: checks.filter((check) => check.status === "warn").map((check) => check.id),
    failures: checks.filter((check) => check.status === "fail").map((check) => check.id),
    checks,
  };
}

/**
 * Build the catalog entry for one recipe.
 *
 * @param recipe - The recipe.
 * @returns The derived catalog entry.
 */
export function buildCatalogEntry(recipe: ThemePresetRecipe): PresetCatalogEntry {
  const lightReport = buildPresetThemeReport(recipe, "light");
  const darkReport = buildPresetThemeReport(recipe, "dark");
  const light = lightReport.theme;
  const dark = darkReport.theme;
  const identity = deriveIdentity(recipe.seed);

  const entry: PresetCatalogEntry = {
    id: recipe.id,
    name: recipe.name,
    family: recipe.family,
    kind: recipe.kind,
    seed: recipe.seed,
    style: recipe.style ?? "balanced",
    algorithm: GENERATION_ALGORITHM,
    temperature: identity.temperature,
    character: recipe.metadata?.description ?? "",
    tags: recipe.metadata?.tags ?? [],
    radius: recipe.radius ?? "8px",
    modes: ["light", "dark"],
    themes: { light, dark },
    quality: mergeQuality(scoreTheme(light), scoreTheme(dark)),
  };

  // `exactOptionalPropertyTypes` — omit rather than assign undefined.
  if (recipe.metadata?.provenance !== undefined) entry.provenance = recipe.metadata.provenance;
  if (recipe.metadata?.brandColor !== undefined) entry.brandColor = recipe.metadata.brandColor;

  if (recipe.brand !== undefined) {
    entry.brand = {
      source: recipe.brand,
      anchors: { light: lightReport.anchors, dark: darkReport.anchors },
      normalized: { light: lightReport.normalized, dark: darkReport.normalized },
    };
  }

  return entry;
}

/**
 * The preset catalog, derived from the recipes.
 *
 * @param kind - Restrict to `"default"` or `"brand"`. Omit for both.
 * @returns The catalog entries, in recipe order.
 */
export function getPresetCatalog(kind?: PresetKind): PresetCatalogEntry[] {
  const recipes =
    kind === "brand"
      ? BRAND_PRESET_RECIPES
      : kind === "default"
        ? DEFAULT_PRESET_RECIPES
        : [...DEFAULT_PRESET_RECIPES, ...BRAND_PRESET_RECIPES];

  return recipes.map(buildCatalogEntry);
}

/**
 * The resolved style parameters behind a catalog entry, for the technical
 * detail section.
 *
 * @param entry - A catalog entry.
 * @returns The style's parameters.
 */
export function catalogStyleParams(entry: PresetCatalogEntry) {
  return resolveStyle(entry.style);
}
