/**
 * Semantic theme diff — the comparison projection.
 *
 * Everything here is **internal**. `ThemeSnapshot` is an implementation
 * projection of a theme into something comparable, not a public authoring
 * format, so neither it nor {@link createThemeSnapshot} is re-exported from the
 * package entry.
 *
 * Two rules make the projection trustworthy:
 *
 * 1. **Resolved values only.** `resolveTokens()` runs first, so a theme written
 *    with `primaryForeground: "auto()"` and one written with `"#ffffff"` compare
 *    as identical. A reference whose *target* changed still reports as changed,
 *    which is what a reviewer needs.
 * 2. **Canonical order.** `entries` is an array sorted by `TOKEN_GROUPS` order
 *    and then by the canonical role order, so the order is data rather than
 *    JavaScript's object-key order.
 *
 * @packageDocumentation
 */
import { TOKEN_GROUPS, type TokenGroup } from "../css";
import { createDiagnostic } from "../diagnostics";
import { ThemeError } from "../errors";
import { getThemeFamily, getThemeMode, resolveTheme, resolveThemeName } from "../model";
import {
  CORE_COLORS,
  OPTIONAL_SEMANTICS,
  SEMANTIC_ROLE_GROUPS,
  isCoreColor,
  isOptionalSemantic,
  type CoreColor,
  type OptionalSemantic,
  type SemanticRoleGroup,
} from "../model/semantic-roles";
import type { ThemeDefinition } from "../model/theme";
import { flattenTokens, resolveTokens } from "../resolve";
import type { ThemeDiffOptions, ThemeGenerationProvenance } from "./types";

/**
 * One comparable token.
 *
 * @internal
 */
export interface ThemeSnapshotEntry {
  /** Dot-path into the token tree, e.g. `"colors.primary"`. */
  path: string;
  /** The token group the path belongs to. */
  group: TokenGroup;
  /** The semantic role, when the path names one. */
  role: CoreColor | OptionalSemantic | null;
  /** The role group, when the role belongs to one. */
  roleGroup: SemanticRoleGroup["id"] | null;
  /** The resolved value. */
  value: string;
}

/**
 * A theme projected into canonically ordered comparable tokens.
 *
 * @internal
 */
export interface ThemeSnapshot {
  /** The theme name. */
  name: string;
  /** The theme family. */
  family: string;
  /** A concrete visual mode — a selector cannot reach this type. */
  mode: "light" | "dark";
  /** The comparable tokens, canonically ordered. Order is part of the contract. */
  entries: readonly ThemeSnapshotEntry[];
}

/** Canonical group order, for sorting. */
const GROUP_RANK = new Map<string, number>(TOKEN_GROUPS.map((group, index) => [group, index]));

/**
 * Canonical colour order: core roles first, then optional semantics.
 *
 * Anything else (a nested colour, a vendor key) sorts after both, lexically.
 */
const COLOR_RANK = new Map<string, number>([
  ...CORE_COLORS.map((role, index) => [role as string, index] as const),
  ...OPTIONAL_SEMANTICS.map((role, index) => [role as string, CORE_COLORS.length + index] as const),
]);

/** The group a flattened path belongs to, or `null` when it is not a token group. */
function groupOf(path: string): TokenGroup | null {
  const first = path.split(".")[0];
  return first !== undefined && GROUP_RANK.has(first) ? (first as TokenGroup) : null;
}

/** The role group a role belongs to. */
function roleGroupOf(role: string): SemanticRoleGroup["id"] | null {
  for (const group of SEMANTIC_ROLE_GROUPS) {
    if ((group.roles as readonly string[]).includes(role)) return group.id;
    if (group.optional && (group.optional as readonly string[]).includes(role)) return group.id;
  }
  return null;
}

/**
 * Classify a path.
 *
 * A role is only attributed to a direct colour key (`colors.primary`). A nested
 * colour (`colors.primary.hover`) belongs to the `colors` group but names no
 * role, because the role vocabulary is flat.
 */
function classify(path: string, group: TokenGroup): Pick<ThemeSnapshotEntry, "role" | "roleGroup"> {
  if (group !== "colors") return { role: null, roleGroup: null };

  const segments = path.split(".");
  const key = segments.length === 2 ? segments[1] : undefined;
  if (key === undefined || (!isCoreColor(key) && !isOptionalSemantic(key))) {
    return { role: null, roleGroup: null };
  }

  return { role: key, roleGroup: roleGroupOf(key) };
}

/**
 * Canonical comparator: group order, then canonical role order within `colors`,
 * then code-unit path order.
 *
 * Code-unit comparison, never `localeCompare` — the result must not depend on
 * the host's locale.
 *
 * Exported so the union of two snapshots' paths can be ordered by the same
 * rule rather than by a second comparator.
 *
 * @internal
 */
export function compareEntries(a: ThemeSnapshotEntry, b: ThemeSnapshotEntry): number {
  const byGroup = GROUP_RANK.get(a.group)! - GROUP_RANK.get(b.group)!;
  if (byGroup !== 0) return byGroup;

  if (a.group === "colors") {
    const keyOf = (entry: ThemeSnapshotEntry) => entry.path.split(".")[1] ?? entry.path;
    const rankA = COLOR_RANK.get(keyOf(a)) ?? Number.MAX_SAFE_INTEGER;
    const rankB = COLOR_RANK.get(keyOf(b)) ?? Number.MAX_SAFE_INTEGER;
    if (rankA !== rankB) return rankA - rankB;
  }

  if (a.path === b.path) return 0;
  return a.path < b.path ? -1 : 1;
}

/**
 * Project a theme into its canonically ordered comparable form.
 *
 * @param theme - The theme. Inheritance must already be resolved.
 * @param mode - The **concrete** visual mode this snapshot represents.
 * @returns The snapshot.
 *
 * @internal
 */
export function createThemeSnapshot(
  theme: ThemeDefinition,
  mode: "light" | "dark",
): ThemeSnapshot {
  const tokens = theme.tokens ? resolveTokens(theme.tokens) : undefined;
  const flat = tokens ? flattenTokens(tokens) : {};

  const entries: ThemeSnapshotEntry[] = [];

  for (const [path, value] of Object.entries(flat)) {
    const group = groupOf(path);
    if (group === null) continue; // Not a token group — `flattenTokens` should not emit these.
    entries.push({ path, group, ...classify(path, group), value });
  }

  entries.sort(compareEntries);

  return { name: theme.name, family: getThemeFamily(theme), mode, entries };
}

/** Build the `TV_DIFF_UNRESOLVED_*` error for an unresolvable input. */
function unresolved(
  code: "TV_DIFF_UNRESOLVED_EXTENDS" | "TV_DIFF_UNRESOLVED_SYSTEM",
  name: string,
  message: string,
  hint: string,
): ThemeError {
  return ThemeError.fromDiagnostic(
    createDiagnostic({
      code,
      level: "error",
      message,
      context: { api: "diffThemes", property: "themes", path: name },
      hint,
    }),
  );
}

/**
 * Resolve a theme's `extends` chain through the supplied registry.
 *
 * @param theme - The theme.
 * @param options - The diff options, which carry the registry.
 * @returns The theme with inherited tokens merged in, or the theme unchanged.
 * @throws {ThemeError} When `extends` is declared but no registry was supplied.
 *
 * @internal
 */
export function resolveInheritance(
  theme: ThemeDefinition,
  options: ThemeDiffOptions,
): ThemeDefinition {
  if (theme.extends === undefined) return theme;

  const registry = options.themes;
  if (registry === undefined || registry.length === 0) {
    throw unresolved(
      "TV_DIFF_UNRESOLVED_EXTENDS",
      theme.name,
      `Cannot diff "${theme.name}": it declares \`extends\`, but no theme registry was supplied to resolve its inherited tokens.`,
      "Pass `themes` — the registry the theme extends from.",
    );
  }

  return resolveTheme(registry, theme.name);
}

/**
 * Resolve a theme into something with a concrete visual mode.
 *
 * Inheritance is resolved through `options.themes`. A `mode: "system"` theme is
 * put through the canonical selector — `resolveThemeName()` — because
 * `"system"` is a selector over the concrete light/dark pair, not a visual mode.
 *
 * @param theme - The theme to normalize.
 * @param options - The diff options, which carry the registry and `prefersDark`.
 * @returns The resolved theme and its concrete mode.
 * @throws {ThemeError} When inheritance or the selector cannot be resolved.
 *
 * @internal
 */
export function resolveConcreteTheme(
  theme: ThemeDefinition,
  options: ThemeDiffOptions,
): { theme: ThemeDefinition; mode: "light" | "dark" } {
  const resolved = resolveInheritance(theme, options);

  const mode = getThemeMode(resolved);
  if (mode === "light" || mode === "dark") return { theme: resolved, mode };

  // `mode === "system"`: a selector, not a visual mode. Select from the registry.
  const registry = options.themes;
  if (registry === undefined || registry.length === 0) {
    throw unresolved(
      "TV_DIFF_UNRESOLVED_SYSTEM",
      resolved.name,
      `Cannot diff "${resolved.name}": it declares mode "system", which selects between the concrete light and dark themes, but no theme registry was supplied to select from.`,
      'Pass `themes`, or diff the family\'s concrete light and dark themes instead.',
    );
  }

  const selectedName = resolveThemeName(
    registry,
    getThemeFamily(resolved),
    "system",
    options.prefersDark ?? false,
  );
  const selected = registry.find((candidate) => candidate.name === selectedName);
  const selectedMode = selected ? getThemeMode(selected) : undefined;

  if (selected === undefined || (selectedMode !== "light" && selectedMode !== "dark")) {
    throw unresolved(
      "TV_DIFF_UNRESOLVED_SYSTEM",
      resolved.name,
      `Cannot diff "${resolved.name}": the "system" selector resolved to "${selectedName}", which is not a concrete light or dark theme.`,
      "Register a concrete light and dark theme for this family.",
    );
  }

  return { theme: selected, mode: selectedMode };
}

/**
 * Read a theme's generation provenance.
 *
 * @param theme - The theme.
 * @returns The provenance, or `null` when the theme was not generated.
 *
 * @internal
 */
export function provenanceOf(theme: ThemeDefinition): ThemeGenerationProvenance | null {
  const generation = theme.meta?.generation;
  if (generation === undefined) return null;

  return {
    algorithm: generation.algorithm,
    seed: generation.seed,
    style: generation.style ?? null,
    anchored: generation.anchored ? [...generation.anchored] : [],
  };
}
