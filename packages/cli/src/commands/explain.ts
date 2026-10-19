import {
  BRAND_PRESET_DISCLAIMER,
  SEMANTIC_ROLE_GROUPS,
  describeRoleUsage,
  flattenTokens,
  generateTheme,
  getThemeFamily,
  getThemeMode,
  isCoreColor,
  measureThemeContrast,
  resolveTokens,
  scoreTheme,
  validateTheme,
  type PresetCatalogEntry,
  type ThemeDefinition,
} from "@themvora/core";
import { existsSync } from "node:fs";
import { getBool, getString } from "../utils.js";
import type { ParsedArgs } from "../utils.js";
import { UsageError } from "../exit-codes.js";
import { readThemeJSON, toThemes } from "../theme-shared.js";
import { findCatalogEntry, listBrands, listPresets } from "../registry.js";
import { suggestionSuffix } from "../suggest.js";
import { paint, wantsJson, wantsQuiet, writeJson } from "../output.js";

type SourceKind = "file" | "preset" | "brand" | "seed";
type Mode = "light" | "dark";

const MODES: readonly Mode[] = ["light", "dark"];

/** A resolved explanation input. */
interface ExplainSource {
  kind: SourceKind;
  id: string;
  label: string;
  /** The canonical catalog entry, for preset and brand sources. */
  catalog: PresetCatalogEntry | null;
  themes: Partial<Record<Mode, ThemeDefinition>>;
}

/** One semantic role and its resolved value. */
interface RoleRow {
  path: string;
  role: string;
  roleGroup: string;
  value: string;
  /** The primary usage core promises for this role, when it declares one. */
  usage: string | null;
}

/** Everything mode-specific. */
interface ModeExplanation {
  name: string;
  roles: RoleRow[];
  validation: {
    valid: boolean;
    issues: string[];
    score: { passed: number; total: number; checks: { id: string; label: string; status: string; detail?: string }[] };
    contrast: {
      pairs: number;
      text: { total: number; passing: number };
      ui: { total: number; passing: number };
    };
  };
}

/** The explanation, as data. */
interface ExplainReport {
  source: { kind: SourceKind; id: string; label: string };
  recipe: {
    name: string | null;
    family: string;
    kind: string;
    style: string | null;
    character: string | null;
    tags: string[];
    radius: string | null;
    temperature: string | null;
    seed: string | null;
    algorithm: string | null;
    provenance: string | null;
    brandColor: string | null;
    disclaimer: string | null;
  };
  identity: {
    reference: {
      name: string;
      kind: string;
      sourceUrl: string;
      hasDesignSystem: boolean;
      hasLightDark: boolean;
    } | null;
    anchors: { mode: string; role: string; color: string; label: string }[];
    normalized: { mode: string; role: string; anchor: string; resolved: string; label: string }[];
  } | null;
  contract: { text: number; largeText: number; ui: number } | null;
  modes: Partial<Record<Mode, ModeExplanation>>;
}

/** Resolve the single source the invocation asked for. */
function resolveSource(args: ParsedArgs): ExplainSource {
  const positional = args._[1];
  const preset = getString(args, "preset");
  const brand = getString(args, "brand");
  const seed = getString(args, "seed");

  const given = [
    positional !== undefined ? `the positional "${positional}"` : null,
    preset !== undefined ? "--preset" : null,
    brand !== undefined ? "--brand" : null,
    seed !== undefined ? "--seed" : null,
  ].filter((value): value is string => value !== null);

  if (given.length === 0) {
    throw new UsageError(
      "explain needs a source — a theme file, --preset <id>, --brand <id>, or --seed <color>",
    );
  }

  if (given.length > 1) {
    throw new UsageError(
      `only one source may be given — received ${given.join(" and ")}. ` +
        "Use a file, --preset, --brand, or --seed.",
    );
  }

  if (preset !== undefined) return fromRegistry("preset", preset);
  if (brand !== undefined) return fromRegistry("brand", brand);
  if (seed !== undefined) return fromSeed(seed);

  return fromPositional(positional!);
}

/** Build an explanation source from a canonical registry entry. */
function fromRegistry(kind: "preset" | "brand", id: string): ExplainSource {
  const catalog = findCatalogEntry(kind, id);

  if (!catalog) {
    const candidates = (kind === "brand" ? listBrands() : listPresets()).map((entry) => entry.id);
    throw new UsageError(
      `unknown ${kind} "${id}"${suggestionSuffix(id, candidates)} — ` +
        `run "themvora list ${kind}s" to see the available ${kind}s`,
    );
  }

  return {
    kind,
    id: catalog.id,
    label: `${kind} ${catalog.id}`,
    catalog,
    themes: { light: catalog.themes.light, dark: catalog.themes.dark },
  };
}

/** Build an explanation source from a seed. */
function fromSeed(seed: string): ExplainSource {
  if (!seed.startsWith("#") || seed.length !== 7) {
    throw new UsageError("seed must be a hex color (e.g. #6366f1)");
  }
  const pair = generateTheme({ seed, family: "default" });
  return { kind: "seed", id: seed, label: `seed ${seed}`, catalog: null, themes: { light: pair.light, dark: pair.dark } };
}

/** Build an explanation source from a theme file. */
function fromFile(path: string): ExplainSource {
  const themes = toThemes(readThemeJSON(path));
  const resolved: Partial<Record<Mode, ThemeDefinition>> = {};
  for (const theme of themes) {
    const mode = getThemeMode(theme);
    // A theme with no concrete mode is explained under its slot rather than guessed.
    resolved[mode === "dark" ? "dark" : "light"] = theme;
  }
  return { kind: "file", id: path, label: `file ${path}`, catalog: null, themes: resolved };
}

/**
 * Resolve a positional source.
 *
 * Same precedence as `diff`: an existing file, then a preset id, then a brand
 * id. The label states which branch was taken, and a value that looks like a
 * path is always a file so a mistyped filename reports `cannot read file`.
 */
function fromPositional(value: string): ExplainSource {
  if (existsSync(value)) return fromFile(value);
  if (/[\\/]/.test(value) || value.endsWith(".json")) return fromFile(value);

  if (findCatalogEntry("preset", value)) return fromRegistry("preset", value);
  if (findCatalogEntry("brand", value)) return fromRegistry("brand", value);

  const candidates = [...listPresets(), ...listBrands()].map((entry) => entry.id);
  throw new UsageError(
    `cannot resolve "${value}"${suggestionSuffix(value, candidates)} — ` +
      "expected a theme file, a preset id, or a brand id",
  );
}

/** The resolved colour roles of a theme, grouped and annotated. */
function roleRows(theme: ThemeDefinition): RoleRow[] {
  const tokens = theme.tokens ? resolveTokens(theme.tokens) : undefined;
  const flat = tokens ? flattenTokens(tokens) : {};
  const rows: RoleRow[] = [];

  for (const [path, value] of Object.entries(flat)) {
    const segments = path.split(".");
    if (segments[0] !== "colors" || segments.length !== 2) continue;
    const role = segments[1]!;
    if (!isCoreColor(role) && role !== "warning" && role !== "info" && role !== "error") continue;

    const group = SEMANTIC_ROLE_GROUPS.find(
      (candidate) =>
        (candidate.roles as readonly string[]).includes(role) ||
        (candidate.optional ?? []).includes(role as never),
    );

    const usage = isCoreColor(role) ? (describeRoleUsage(role).supported[0] ?? null) : null;

    rows.push({
      path,
      role,
      roleGroup: group?.label ?? "Other colours",
      value,
      usage,
    });
  }

  return rows;
}

/** Explain one theme. */
function explainMode(theme: ThemeDefinition): ModeExplanation {
  const validation = validateTheme(theme);
  const score = scoreTheme(theme);
  const pairs = measureThemeContrast(theme);

  const count = (requirement: "text" | "ui") => {
    const subset = pairs.filter((pair) => pair.requirement === requirement);
    return { total: subset.length, passing: subset.filter((pair) => pair.passes).length };
  };

  return {
    name: theme.name,
    roles: roleRows(theme),
    validation: {
      valid: validation.valid,
      issues: validation.issues.map((issue) => issue.message),
      score: {
        passed: score.passed,
        total: score.total,
        checks: score.checks.map((check) => ({
          id: check.id,
          label: check.label,
          status: check.status,
          ...(check.detail !== undefined ? { detail: check.detail } : {}),
        })),
      },
      contrast: { pairs: pairs.length, text: count("text"), ui: count("ui") },
    },
  };
}

/** Build the full explanation. */
function explain(source: ExplainSource): ExplainReport {
  const first = source.themes.light ?? source.themes.dark;
  if (!first) throw new Error(`no themes resolved for ${source.label}`);

  const catalog = source.catalog;
  const generation = first.meta?.generation;
  const brand = catalog?.brand ?? null;

  const modes: Partial<Record<Mode, ModeExplanation>> = {};
  for (const mode of MODES) {
    const theme = source.themes[mode];
    if (theme) modes[mode] = explainMode(theme);
  }

  return {
    source: { kind: source.kind, id: source.id, label: source.label },
    recipe: {
      name: catalog?.name ?? null,
      family: getThemeFamily(first),
      kind:
        catalog === null
          ? source.kind === "seed"
            ? "generated"
            : "theme file"
          : catalog.kind === "brand"
            ? "brand-inspired"
            : "curated preset",
      style: generation?.style ?? catalog?.style ?? null,
      character: catalog?.character ?? null,
      tags: catalog ? [...catalog.tags] : [],
      radius: catalog?.radius ?? null,
      temperature: catalog?.temperature ?? null,
      seed: generation?.seed ?? catalog?.seed ?? null,
      algorithm: generation?.algorithm ?? catalog?.algorithm ?? null,
      provenance: catalog?.provenance ?? null,
      brandColor: catalog?.brandColor ?? null,
      disclaimer: brand ? BRAND_PRESET_DISCLAIMER : null,
    },
    identity: brand
      ? {
          reference: {
            name: brand.source.name,
            kind: brand.source.kind,
            sourceUrl: brand.source.sourceUrl,
            hasDesignSystem: brand.source.hasDesignSystem,
            hasLightDark: brand.source.hasLightDark,
          },
          anchors: MODES.flatMap((mode) =>
            (brand.anchors[mode] ?? []).map((anchor) => ({
              mode,
              role: anchor.role,
              color: anchor.color,
              label: anchor.label,
            })),
          ),
          normalized: MODES.flatMap((mode) =>
            (brand.normalized[mode] ?? []).map((entry) => ({
              mode,
              role: entry.role,
              anchor: entry.anchor,
              resolved: entry.resolved,
              label: entry.label,
            })),
          ),
        }
      : null,
    contract: generation?.contrast
      ? {
          text: generation.contrast.text,
          largeText: generation.contrast.largeText,
          ui: generation.contrast.ui,
        }
      : null,
    modes,
  };
}

/** Render the recipe summary block. */
function renderRecipe(report: ExplainReport): string[] {
  const { recipe, source } = report;
  const lines: string[] = [];

  const row = (label: string, value: string | null) => {
    if (value === null || value === "") return;
    lines.push(`  ${label.padEnd(14)}${value}`);
  };

  lines.push(paint("bold", "source"));
  row("resolved", source.label);
  row("kind", recipe.kind);
  row("family", recipe.family);
  row("style", recipe.style);
  row("character", recipe.character);
  row("tags", recipe.tags.length > 0 ? recipe.tags.join(", ") : null);
  row("radius", recipe.radius);
  row("temperature", recipe.temperature);
  row("seed", recipe.seed);
  row("algorithm", recipe.algorithm);
  row("provenance", recipe.provenance);
  row("brand colour", recipe.brandColor);

  return lines;
}

/** Render the identity block for a brand source. */
function renderIdentity(report: ExplainReport): string[] {
  const identity = report.identity;
  if (!identity) return [];

  const lines = ["", paint("bold", "identity")];
  lines.push(`  ${"reference".padEnd(14)}${identity.reference!.name} · ${identity.reference!.kind}`);
  lines.push(`  ${"".padEnd(14)}${identity.reference!.sourceUrl}`);
  lines.push(
    `  ${"".padEnd(14)}design system: ${identity.reference!.hasDesignSystem ? "yes" : "no"} · ` +
      `light/dark: ${identity.reference!.hasLightDark ? "yes" : "no"}`,
  );

  if (identity.anchors.length > 0) {
    lines.push(`  ${"anchors".padEnd(14)}${identity.anchors.length} pinned`);
    for (const anchor of identity.anchors) {
      lines.push(`    ${anchor.mode.padEnd(6)}${anchor.role.padEnd(16)}${anchor.color}  ${anchor.label}`);
    }
  }

  if (identity.normalized.length === 0) {
    lines.push(`  ${"normalized".padEnd(14)}${paint("green", "every anchor survived exactly")}`);
  } else {
    lines.push(
      `  ${"normalized".padEnd(14)}${paint("yellow", `${identity.normalized.length} anchor(s) moved for readability`)}`,
    );
    for (const entry of identity.normalized) {
      lines.push(
        `    ${entry.mode.padEnd(6)}${entry.role.padEnd(16)}${entry.anchor} → ${entry.resolved}  ${entry.label}`,
      );
    }
  }

  return lines;
}

/** Render the semantic mapping for one mode. */
function renderMapping(explanation: ModeExplanation): string[] {
  const lines: string[] = [`  ${paint("bold", explanation.name)}`];

  const sections = new Map<string, RoleRow[]>();
  for (const row of explanation.roles) {
    const bucket = sections.get(row.roleGroup) ?? [];
    bucket.push(row);
    sections.set(row.roleGroup, bucket);
  }

  const labelWidth = Math.max(0, ...[...sections.values()].flatMap((rows) => rows.map((r) => r.role.length)));
  const valueWidth = Math.max(0, ...[...sections.values()].flatMap((rows) => rows.map((r) => r.value.length)));

  for (const [section, rows] of sections) {
    lines.push(`    ${paint("bold", section)}`);
    for (const row of rows) {
      const usage = row.usage ? `  ${paint("dim", row.usage)}` : "";
      lines.push(`      ${row.role.padEnd(labelWidth)}  ${row.value.padEnd(valueWidth)}${usage}`.replace(/\s+$/, ""));
    }
  }

  return lines;
}

/** Render the validation summary. */
function renderValidation(report: ExplainReport): string[] {
  const lines = ["", paint("bold", "validation")];

  for (const mode of MODES) {
    const explanation = report.modes[mode];
    if (!explanation) continue;
    const { validation } = explanation;

    const status = validation.valid
      ? paint("green", "valid")
      : paint("red", `${validation.issues.length} issue(s)`);
    const failed = validation.score.checks.filter((check) => check.status !== "pass");

    lines.push(
      `  ${mode.padEnd(6)}${status} · ${validation.score.passed}/${validation.score.total} checks · ` +
        `text ${validation.contrast.text.passing}/${validation.contrast.text.total} · ` +
        `ui ${validation.contrast.ui.passing}/${validation.contrast.ui.total}`,
    );

    for (const check of failed) {
      const marker = check.status === "fail" ? paint("red", "✗") : paint("yellow", "!");
      lines.push(`    ${marker} ${check.label}${check.detail ? ` — ${check.detail}` : ""}`);
    }
    for (const issue of validation.issues) {
      lines.push(`    ${paint("red", "✗")} ${issue}`);
    }
  }

  return lines;
}

/** Render the whole explanation. */
function renderReport(report: ExplainReport, quiet: boolean): string {
  const lines: string[] = [...renderRecipe(report), ...renderIdentity(report)];

  if (report.contract) {
    lines.push(
      "",
      paint("bold", "constraint contract"),
      `  ${"text".padEnd(14)}${report.contract.text}:1`,
      `  ${"large text".padEnd(14)}${report.contract.largeText}:1`,
      `  ${"ui".padEnd(14)}${report.contract.ui}:1`,
    );
  }

  if (report.recipe.disclaimer) {
    lines.push("", `  ${paint("dim", report.recipe.disclaimer)}`);
  }

  if (!quiet) {
    lines.push("", paint("bold", "semantic mapping"));
    for (const mode of MODES) {
      const explanation = report.modes[mode];
      if (explanation) lines.push(...renderMapping(explanation));
    }
  }

  lines.push(...renderValidation(report));

  return lines.join("\n");
}

/**
 * Implements the `explain` command.
 *
 * Explains how a theme came to be: its source, its recipe, the identity or brand
 * anchors behind it, the contrast contract it was solved against, the semantic
 * mapping of every role, and a validation summary.
 *
 * Every value comes from an existing public API — the canonical catalog, the
 * generation metadata on the theme, the canonical scorecard. This command
 * derives nothing, and `@themvora/core` gained no API for it.
 *
 * Reads `<file>` or `--preset`/`--brand`/`--seed`, plus `--json` and `--quiet`.
 *
 * @param args The parsed command-line arguments.
 * @throws {UsageError} When no source, or more than one, is given.
 */
export async function cmdExplain(args: ParsedArgs) {
  const report = explain(resolveSource(args));

  if (wantsJson(args)) {
    writeJson(report);
    return;
  }

  process.stdout.write(`${renderReport(report, wantsQuiet(args) || getBool(args, "quiet"))}\n`);
}
