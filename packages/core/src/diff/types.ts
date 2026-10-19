/**
 * Semantic theme diff — the public report model.
 *
 * ## What this is, and what it is not
 *
 * This is a **semantic** diff: it compares the *resolved token values* of two
 * themes and reports what changed, role by role.
 *
 * It is deliberately unrelated to {@link ThemeDiff}, which is the animation
 * planner's trigger — eight booleans saying which token groups should
 * transition. `ThemeDiff` answers "what should animate"; `ThemeDiffReport`
 * answers "what semantically differs". They share no code and no data.
 *
 * ## Modes
 *
 * There are exactly two visual modes: `light` and `dark`. `"system"` is a
 * **selector** over that pair, resolved before any comparison happens, so it
 * never appears in this report.
 *
 * @packageDocumentation
 */
import type { TokenGroup } from "../css";
import type { CoreColor, OptionalSemantic, SemanticRoleGroup } from "../model/semantic-roles";
import type { ThemeDefinition } from "../model/theme";

/**
 * One side of a diff: a resolved theme identity.
 */
export interface ThemeDiffSide {
  /** The theme name that was compared. */
  name: string;
  /** The theme family, via `getThemeFamily`. */
  family: string;
  /**
   * The **concrete** visual mode.
   *
   * Never `"system"`: a `"system"` selector is resolved before the comparison,
   * so this always names the theme that was actually compared.
   */
  mode: "light" | "dark";
}

/** How one token path differs between the two sides. */
export type ThemeTokenChangeStatus = "added" | "removed" | "changed" | "unchanged";

/**
 * One token path's outcome.
 */
export interface ThemeTokenChange {
  /** Dot-path into the token tree, e.g. `"colors.primary"`. */
  path: string;
  /** The token group the path belongs to. */
  group: TokenGroup;
  /** The semantic role, when the path names a core or optional role. */
  role: CoreColor | OptionalSemantic | null;
  /** The role group the role belongs to, e.g. `"actions"`. */
  roleGroup: SemanticRoleGroup["id"] | null;
  /** The outcome. */
  status: ThemeTokenChangeStatus;
  /** The value on side `a`. Absent when the token was added. */
  before?: string;
  /** The value on side `b`. Absent when the token was removed. */
  after?: string;
}

/** Per-status counts. Always complete, whatever `includeUnchanged` is set to. */
export interface ThemeModeDiffCounts {
  /** Paths present only on `b`. */
  added: number;
  /** Paths present only on `a`. */
  removed: number;
  /** Paths present on both with different resolved values. */
  changed: number;
  /** Paths present on both with the same resolved value. */
  unchanged: number;
  /** Every path seen on either side. */
  total: number;
}

/** Per-group counts. */
export interface ThemeModeGroupCounts extends Omit<ThemeModeDiffCounts, "total"> {
  /** The token group. */
  group: TokenGroup;
}

/** The diff for one visual mode. */
export interface ThemeModeDiff {
  /** The concrete visual mode. `"system"` is a selector, not a mode. */
  mode: "light" | "dark";
  /** Which sides provide this mode. */
  present: "both" | "a" | "b";
  /** The changes, filtered by `includeUnchanged`. */
  changes: readonly ThemeTokenChange[];
  /** The counts. Never filtered. */
  counts: ThemeModeDiffCounts;
  /** Per-group counts, in `TOKEN_GROUPS` order, for groups present on either side. */
  byGroup: readonly ThemeModeGroupCounts[];
}

/** Generation provenance for one side, or `null` when the theme has none. */
export interface ThemeGenerationProvenance {
  /** The generation algorithm, e.g. `"semantic-v2"`. */
  algorithm: string;
  /** The seed the theme was generated from. */
  seed: string;
  /** The generation style, when one was recorded. */
  style: string | null;
  /** Roles pinned to a brand anchor rather than generated. */
  anchored: readonly string[];
}

/**
 * Provenance differences, reported **separately** from token changes.
 *
 * `hasChanges` deliberately ignores this: two themes with identical tokens but
 * different seeds render identically, so reporting them as different would be
 * wrong for the primary use case.
 */
export interface ThemeDiffProvenance {
  /** Provenance on side `a`, or `null`. */
  a: ThemeGenerationProvenance | null;
  /** Provenance on side `b`, or `null`. */
  b: ThemeGenerationProvenance | null;
  /** Whether the two sides' provenance differs. */
  changed: boolean;
  /** The provenance field names that differ, sorted. */
  differing: readonly string[];
}

/**
 * The full diff report.
 */
export interface ThemeDiffReport {
  /** The report schema version. Independent of the theme schema and package versions. */
  version: 1;
  /** Side `a`. */
  a: ThemeDiffSide;
  /** Side `b`. */
  b: ThemeDiffSide;
  /** Whether any **token** value differs. Provenance is reported separately. */
  hasChanges: boolean;
  /** Keyed by concrete visual mode. A `"system"` key cannot exist. */
  modes: Partial<Record<"light" | "dark", ThemeModeDiff>>;
  /** Provenance differences. */
  provenance: ThemeDiffProvenance;
  /** The union of every mode's counts. */
  summary: ThemeModeDiffCounts;
}

/**
 * A light/dark theme set — the shape `generate --mode both` writes and
 * `toThemes` produces.
 */
export interface ThemeSet {
  /** The light theme, when the set has one. */
  light?: ThemeDefinition;
  /** The dark theme, when the set has one. */
  dark?: ThemeDefinition;
}

/**
 * Options for {@link diffThemes}.
 */
export interface ThemeDiffOptions {
  /**
   * Registry used to resolve `extends` on either side, and to resolve a
   * `mode: "system"` selector. Mirrors the `themes` option on `validateTheme`.
   */
  themes?: readonly ThemeDefinition[];
  /**
   * Whether the visitor prefers dark. Consulted **only** when a side declares
   * `mode: "system"`, i.e. only by the selector. An explicit option rather than
   * an ambient read, so the result stays deterministic.
   *
   * @defaultValue `false`
   */
  prefersDark?: boolean;
  /**
   * Include `unchanged` entries in `changes`. Never affects `counts`.
   *
   * @defaultValue `false`
   */
  includeUnchanged?: boolean;
  /**
   * Restrict the comparison to these visual modes. Omit to compare every mode
   * present on either side.
   */
  modes?: readonly ("light" | "dark")[];
}
