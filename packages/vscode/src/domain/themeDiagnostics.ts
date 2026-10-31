/**
 * Core validation → editor-facing issues.
 *
 * Pure: no `vscode`, no ranges, no formatting decisions. It decides *what* is
 * wrong, *how wrong*, and *which theme half* — the adapter decides where to draw
 * it.
 *
 * The severity split follows core's own verdict, because a diagnostic that
 * contradicts the CLI is worse than no diagnostic:
 *
 * - **Error** — core says the theme is invalid (`validateTheme().valid === false`),
 *   or the issue is structural in a way that makes the theme unusable (a token
 *   whose value is not a colour).
 * - **Warning** — core says the theme is *valid* but has a quality problem:
 *   contrast, accessibility, semantic or visual.
 *
 * **Deduplication is not optional.** `validateTheme()` and
 * `validateThemeLevels()` overlap: on a theme missing 19 roles, levels reports
 * those same 19 paths plus one invalid-value issue. Emitting both would put two
 * squiggles on every missing token, so structural `TV_THEME_TOKEN_MISSING`
 * issues from the levels pass are dropped — `validateTheme()` owns them.
 *
 * @packageDocumentation
 */
import {
  validateTheme,
  validateThemeLevels,
  type ThemeDefinition,
  type ValidationLevel,
} from "@themvora/core";

import type { ThemeHalf } from "./diagnosticLocator.js";

/** How a finding should be shown. */
export type IssueSeverity = "error" | "warning";

/** One finding, ready for the adapter to place. */
export interface ThemeIssue {
  /** Error or warning. */
  readonly severity: IssueSeverity;
  /** Core's stable diagnostic code. */
  readonly code: string;
  /** Core's message, unchanged. */
  readonly message: string;
  /** Dot-path into the theme, when core supplied one. */
  readonly path: string | null;
  /** Which theme of the document this belongs to. */
  readonly half: ThemeHalf;
}

/**
 * Which theme half a document index refers to.
 *
 * @param count - How many themes the document holds.
 * @param index - The theme's position.
 * @returns `single`, `light` or `dark`.
 */
function halfOf(count: number, index: number): ThemeHalf {
  if (count === 1) return "single";
  return index === 0 ? "light" : "dark";
}

/**
 * The severity a level implies.
 *
 * Structural problems make the theme unusable, so they are errors; every other
 * level is a quality judgement core makes about a theme it still calls valid.
 *
 * @param level - Core's validation level.
 * @returns The severity.
 */
export function severityOfLevel(level: ValidationLevel): IssueSeverity {
  return level === "structural" ? "error" : "warning";
}

/**
 * Collect every issue for a parsed document.
 *
 * @param themes - The themes the document holds, in document order.
 * @returns The issues, deduplicated, in a stable order.
 */
export function diagnoseThemes(themes: readonly ThemeDefinition[]): readonly ThemeIssue[] {
  const issues: ThemeIssue[] = [];
  const seen = new Set<string>();

  /**
   * Add an issue unless the same code at the same path in the same half is
   * already present. The half is part of the key because a pair legitimately has
   * the same path wrong in both themes.
   */
  const add = (issue: ThemeIssue): void => {
    const key = `${issue.half}|${issue.code}|${issue.path ?? ""}`;
    if (seen.has(key)) return;
    seen.add(key);
    issues.push(issue);
  };

  themes.forEach((theme, index) => {
    const half = halfOf(themes.length, index);

    // Authoritative structural verdict.
    for (const issue of validateTheme(theme, { themes }).issues) {
      add({
        severity: "error",
        code: issue.code,
        message: issue.message,
        path: issue.path,
        half,
      });
    }

    // Quality levels, minus the findings `validateTheme` already owns.
    for (const issue of validateThemeLevels(theme)) {
      if (issue.code === "TV_THEME_TOKEN_MISSING") continue;

      add({
        severity: severityOfLevel(issue.level),
        code: issue.code,
        message: issue.message,
        path: issue.path ?? null,
        half,
      });
    }
  });

  return issues;
}
