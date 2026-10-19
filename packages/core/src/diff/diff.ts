/**
 * Semantic theme diff — the engine.
 *
 * `diffThemes()` is the single public entry point. It normalizes both sides into
 * snapshots, diffs them per concrete visual mode, and returns a report.
 *
 * Nothing here knows about files, registries, or CLI syntax: callers resolve a
 * source into a `ThemeDefinition` (or a `{ light, dark }` set) and hand it over.
 * That boundary is what keeps the CLI from growing a second semantic engine.
 *
 * @packageDocumentation
 */
import { TOKEN_GROUPS, type TokenGroup } from "../css";
import type { ThemeDefinition } from "../model/theme";
import {
  compareEntries,
  createThemeSnapshot,
  provenanceOf,
  resolveConcreteTheme,
  resolveInheritance,
  type ThemeSnapshot,
  type ThemeSnapshotEntry,
} from "./snapshot";
import type {
  ThemeDiffOptions,
  ThemeDiffProvenance,
  ThemeDiffReport,
  ThemeDiffSide,
  ThemeGenerationProvenance,
  ThemeModeDiff,
  ThemeModeDiffCounts,
  ThemeModeGroupCounts,
  ThemeSet,
  ThemeTokenChange,
  ThemeTokenChangeStatus,
} from "./types";

/** The two visual modes. `"system"` is a selector, not a mode. */
const MODES = ["light", "dark"] as const;

type Mode = (typeof MODES)[number];

/** A fresh, zeroed count set. */
function emptyCounts(): ThemeModeDiffCounts {
  return { added: 0, removed: 0, changed: 0, unchanged: 0, total: 0 };
}

/** Whether an input is a light/dark set rather than a single theme. */
function isThemeSet(value: ThemeDefinition | ThemeSet): value is ThemeSet {
  // A `ThemeDefinition` always has a `name`; a set never does.
  return !("name" in value);
}

/**
 * Project one side into snapshots, keyed by concrete visual mode.
 *
 * A single theme is put through the selector, so a `mode: "system"` theme lands
 * in the slot it actually resolves to. A `{ light, dark }` set already *is* the
 * concrete pair, so its slots name the modes and no selector is involved — that
 * is the sense in which `"system"` is a selector over concrete representations
 * rather than a third mode.
 */
function snapshotsOf(
  input: ThemeDefinition | ThemeSet,
  options: ThemeDiffOptions,
): Partial<Record<Mode, ThemeSnapshot>> {
  const out: Partial<Record<Mode, ThemeSnapshot>> = {};

  if (isThemeSet(input)) {
    if (input.light !== undefined) {
      const theme = resolveInheritance(input.light, options);
      out.light = createThemeSnapshot(theme, "light");
    }
    if (input.dark !== undefined) {
      const theme = resolveInheritance(input.dark, options);
      out.dark = createThemeSnapshot(theme, "dark");
    }
    return out;
  }

  const { theme, mode } = resolveConcreteTheme(input, options);
  out[mode] = createThemeSnapshot(theme, mode);
  return out;
}

/**
 * Diff two snapshots for one mode.
 *
 * Either side may be `null`, which is how a mode only one side provides is
 * handled: every token then reads as added or removed.
 */
function diffSnapshots(
  a: ThemeSnapshot | null,
  b: ThemeSnapshot | null,
  mode: Mode,
  includeUnchanged: boolean,
): ThemeModeDiff {
  const entriesA = a?.entries ?? [];
  const entriesB = b?.entries ?? [];

  const byPathA = new Map<string, ThemeSnapshotEntry>(entriesA.map((entry) => [entry.path, entry]));
  const byPathB = new Map<string, ThemeSnapshotEntry>(entriesB.map((entry) => [entry.path, entry]));

  // The union, ordered by the same canonical comparator the snapshots use, so
  // the report's order does not depend on which side a path came from.
  const union: ThemeSnapshotEntry[] = [];
  for (const path of new Set([...byPathA.keys(), ...byPathB.keys()])) {
    union.push(byPathA.get(path) ?? byPathB.get(path)!);
  }
  union.sort(compareEntries);

  const counts = emptyCounts();
  const groupCounts = new Map<TokenGroup, ThemeModeGroupCounts>();
  const changes: ThemeTokenChange[] = [];

  for (const entry of union) {
    const sideA = byPathA.get(entry.path);
    const sideB = byPathB.get(entry.path);

    let status: ThemeTokenChangeStatus;
    if (sideA !== undefined && sideB !== undefined) {
      status = sideA.value === sideB.value ? "unchanged" : "changed";
    } else if (sideB !== undefined) {
      status = "added";
    } else {
      status = "removed";
    }

    counts[status] += 1;
    counts.total += 1;

    const perGroup = groupCounts.get(entry.group) ?? {
      group: entry.group,
      added: 0,
      removed: 0,
      changed: 0,
      unchanged: 0,
    };
    perGroup[status] += 1;
    groupCounts.set(entry.group, perGroup);

    if (status === "unchanged" && !includeUnchanged) continue;

    changes.push({
      path: entry.path,
      group: entry.group,
      role: entry.role,
      roleGroup: entry.roleGroup,
      status,
      ...(sideA !== undefined ? { before: sideA.value } : {}),
      ...(sideB !== undefined ? { after: sideB.value } : {}),
    });
  }

  const byGroup = TOKEN_GROUPS.filter((group) => groupCounts.has(group)).map(
    (group) => groupCounts.get(group)!,
  );

  return {
    mode,
    present: a !== null && b !== null ? "both" : a !== null ? "a" : "b",
    changes,
    counts,
    byGroup,
  };
}

/** Compare provenance, reporting only the fields that differ. */
function diffProvenance(
  a: ThemeGenerationProvenance | null,
  b: ThemeGenerationProvenance | null,
): ThemeDiffProvenance {
  if (a === null && b === null) {
    return { a: null, b: null, changed: false, differing: [] };
  }

  const fields = ["algorithm", "seed", "style", "anchored"] as const;
  const differing: string[] = [];

  for (const field of fields) {
    const left = a?.[field];
    const right = b?.[field];
    const same = Array.isArray(left) && Array.isArray(right)
      ? left.length === right.length && left.every((value, index) => value === right[index])
      : left === right;
    if (!same) differing.push(field);
  }

  differing.sort();

  return { a, b, changed: differing.length > 0, differing };
}

/** Identity for one side, taken from the first mode it provides. */
function sideIdentity(
  snapshots: Partial<Record<Mode, ThemeSnapshot>>,
  fallback: ThemeDefinition | ThemeSet,
): ThemeDiffSide {
  for (const mode of MODES) {
    const snapshot = snapshots[mode];
    if (snapshot !== undefined) {
      return { name: snapshot.name, family: snapshot.family, mode: snapshot.mode };
    }
  }

  // A side with no tokens at all still has an identity.
  const name = isThemeSet(fallback)
    ? (fallback.light?.name ?? fallback.dark?.name ?? "unnamed")
    : fallback.name;
  const theme = isThemeSet(fallback) ? (fallback.light ?? fallback.dark) : fallback;
  return { name, family: theme?.meta?.family ?? "default", mode: "light" };
}

/** The provenance of whichever member of a side carries generation metadata. */
function sideProvenance(input: ThemeDefinition | ThemeSet): ThemeGenerationProvenance | null {
  const members: (ThemeDefinition | undefined)[] = isThemeSet(input)
    ? [input.light, input.dark]
    : [input];

  for (const member of members) {
    if (member === undefined) continue;
    const provenance = provenanceOf(member);
    if (provenance !== null) return provenance;
  }

  return null;
}

/**
 * Diff two themes, or two light/dark theme sets.
 *
 * Accepts a single theme or a `{ light, dark }` pair on either side. Resolves
 * inheritance through `options.themes` when a definition declares `extends`, and
 * resolves a `mode: "system"` selector through the same registry.
 *
 * Only `light` and `dark` are visual modes. `"system"` is a selector over that
 * pair, resolved before any comparison, and never appears in the report.
 *
 * `hasChanges` reflects **token** changes only. Provenance differences are
 * reported separately, because two themes with identical tokens but different
 * seeds render identically.
 *
 * @param a - The first theme, or light/dark set.
 * @param b - The second theme, or light/dark set.
 * @param options - Registry, `prefersDark`, `includeUnchanged`, and mode filter.
 * @returns The diff report.
 * @throws {ThemeError} When a definition declares `extends`, or a `"system"`
 *   mode, and no `themes` registry was supplied to resolve it.
 *
 * @example
 * ```ts
 * const report = diffThemes(mintLight, irisLight);
 * report.modes.light?.changes.forEach((c) => {
 *   console.log(c.path, c.before, "→", c.after);
 * });
 * ```
 */
export function diffThemes(
  a: ThemeDefinition | ThemeSet,
  b: ThemeDefinition | ThemeSet,
  options: ThemeDiffOptions = {},
): ThemeDiffReport {
  const includeUnchanged = options.includeUnchanged ?? false;
  const requested = options.modes && options.modes.length > 0 ? options.modes : MODES;

  const snapshotsA = snapshotsOf(a, options);
  const snapshotsB = snapshotsOf(b, options);

  const modes: Partial<Record<Mode, ThemeModeDiff>> = {};
  const summary = emptyCounts();

  for (const mode of MODES) {
    if (!requested.includes(mode)) continue;

    const left = snapshotsA[mode] ?? null;
    const right = snapshotsB[mode] ?? null;
    if (left === null && right === null) continue;

    const modeDiff = diffSnapshots(left, right, mode, includeUnchanged);
    modes[mode] = modeDiff;

    summary.added += modeDiff.counts.added;
    summary.removed += modeDiff.counts.removed;
    summary.changed += modeDiff.counts.changed;
    summary.unchanged += modeDiff.counts.unchanged;
    summary.total += modeDiff.counts.total;
  }

  return {
    version: 1,
    a: sideIdentity(snapshotsA, a),
    b: sideIdentity(snapshotsB, b),
    hasChanges: summary.added + summary.removed + summary.changed > 0,
    modes,
    provenance: diffProvenance(sideProvenance(a), sideProvenance(b)),
    summary,
  };
}
