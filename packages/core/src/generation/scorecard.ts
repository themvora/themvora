/**
 * The preset quality scorecard.
 *
 * A single `valid: boolean` tells you a theme is broken but not *how* or *where*.
 * The scorecard reports eight independent checks, so a preset gallery can show
 * `Mint 8/8` and a regression can point at the one axis that moved.
 *
 * The checks are the ones theme-generation.md Phase 7.8 names:
 *
 * | # | Check | What it means |
 * | - | ----- | ------------- |
 * | 1 | Structural | every core role present and a valid colour |
 * | 2 | Semantic | status roles still in their families |
 * | 3 | Text contrast | every text pair clears the AA floor |
 * | 4 | UI contrast | `input` and `ring` clear the non-text floor |
 * | 5 | Surface hierarchy | surfaces separate; the border is visible but subordinate |
 * | 6 | Muted hierarchy | `mutedForeground` is quieter than `foreground` |
 * | 7 | Accent collision | `accent` is distinct from `primary` |
 * | 8 | CVD diagnostics | status roles stay apart under colour-vision deficiency |
 *
 * CVD is reported as `warn`, never `fail`: the generator cannot force a UI to
 * also carry meaning in an icon or a label, so a close pair is a diagnostic, not
 * a conformance failure.
 *
 * @packageDocumentation
 */
import { simulateCVD, type CVDType } from "../accessibility";
import {
  contrastRatioHex,
  deltaEOklch,
  hexToOklchMapped,
  hueDistance,
  oklchToHex,
  parseColor,
  tryParseColor,
  type Oklch,
} from "../color";
import { adjustLightness, gamutMapOklch } from "../color/adjust";
import { relativeLuminance } from "../color/luminance";
import { CORE_COLORS, type CoreColor } from "../model/semantic-roles";
import type { ThemeDefinition } from "../model/theme";
import { floorFor, SEMANTIC_PAIRS } from "./contract";
import { auditSemanticContexts } from "./contexts";
import { BORDER_SURFACES, DEFAULT_RELATIONSHIP_THRESHOLDS } from "./relationships";
import { STATUS_HUES } from "./status";

/** The outcome of one check. */
export type CheckStatus = "pass" | "warn" | "fail";

/** One row of the scorecard. */
export interface PresetCheck {
  /** Stable identifier, e.g. `"text-contrast"`. */
  id: string;
  /** Human-readable label. */
  label: string;
  /** The outcome. */
  status: CheckStatus;
  /** Why it failed, when it did. */
  detail?: string;
}

/** The scorecard for one theme. */
export interface PresetScore {
  /** Theme name. */
  name: string;
  /** Theme family. */
  family: string | null;
  /** Theme mode. */
  mode: string | null;
  /** Every check, in order. */
  checks: PresetCheck[];
  /** How many checks passed. */
  passed: number;
  /** How many checks there are. */
  total: number;
}

/** Tolerance for comparisons against hex-quantised tokens. */
const TOLERANCE = 0.003;

/** Hue tolerance (degrees) for "is this still the red family". */
const STATUS_HUE_TOLERANCE = 40;

/** CVD types diagnosed. */
const CVD_TYPES: readonly CVDType[] = ["protanopia", "deuteranopia", "tritanopia"];

/** Minimum OKLab distance between status roles under CVD before it is a warning. */
const CVD_SEPARATION = 0.03;

/** One measured contract pair. */
export interface MeasuredPair {
  /** The foreground role. */
  foreground: string;
  /** The background role. */
  background: string;
  /** Which contract threshold applies. */
  requirement: "text" | "ui";
  /** The measured WCAG ratio. */
  ratio: number;
  /** The published floor for this requirement. */
  floor: number;
  /** Whether the floor is met. */
  passes: boolean;
  /** Which token is too light/dark, when the pair fails. Absent when the pair passes. */
  readonly direction?: ContrastFailureDirection;
  /** How far below the floor, when the pair fails. Absent when the pair passes. */
  readonly severity?: ContrastSeverity;
}

/**
 * Which side of a failing contrast pair is responsible.
 *
 * Determined from the luminance relationship: if the foreground is lighter than
 * the background but the ratio still fails, the foreground needs to be darker
 * (or the background lighter). The direction tells the user which token to
 * adjust and in which direction.
 */
export type ContrastFailureDirection =
  | "foreground-too-light"
  | "foreground-too-dark"
  | "background-too-light"
  | "background-too-dark";

/**
 * How far below the floor a contrast pair sits.
 *
 * - `near-miss`: within 0.3 of the floor (e.g. 4.2:1 vs 4.5:1).
 * - `moderate`: 0.3–1.0 below the floor.
 * - `critical`: more than 1.0 below the floor.
 */
export type ContrastSeverity = "near-miss" | "moderate" | "critical";

/**
 * Classify how far below the floor a ratio sits.
 *
 * @param ratio - The measured ratio.
 * @param floor - The required floor.
 * @returns The severity, or undefined when the pair passes.
 */
export function classifyContrastSeverity(ratio: number, floor: number): ContrastSeverity | undefined {
  if (ratio >= floor) return undefined;
  const deficit = floor - ratio;
  if (deficit <= 0.3) return "near-miss";
  if (deficit <= 1.0) return "moderate";
  return "critical";
}

/**
 * Determine which side of a failing pair is responsible.
 *
 * The direction is derived from the luminance relationship: when the foreground
 * is lighter than the background and the ratio still fails, the foreground is
 * "too light" (it needs to be darker to increase contrast). The opposite holds
 * when the foreground is darker.
 *
 * @param fgLuminance - The foreground's relative luminance.
 * @param bgLuminance - The background's relative luminance.
 * @param ratio - The measured ratio.
 * @param floor - The required floor.
 * @returns The direction, or undefined when the pair passes.
 */
export function analyzeContrastDirection(
  fgLuminance: number,
  bgLuminance: number,
  ratio: number,
  floor: number,
): ContrastFailureDirection | undefined {
  if (ratio >= floor) return undefined;

  if (fgLuminance > bgLuminance) {
    // Foreground is lighter but contrast still fails → foreground is too light
    // (or background is too light, making them too close).
    return "foreground-too-light";
  }
  // Foreground is darker but contrast still fails → foreground is too dark
  // (or background is too dark, making them too close).
  return "foreground-too-dark";
}

/**
 * Measure every contract pair in a resolved theme.
 *
 * The canonical measurement — the scorecard's `text-contrast` and `ui-contrast`
 * checks, the preset audit and the docs pages all read this, so a page cannot
 * show a ratio the gate disagrees with. Anything that renders contrast numbers
 * should call this rather than re-deriving them.
 *
 * @param theme - The theme to measure.
 * @returns One row per contract pair, in contract order.
 */
export function measureThemeContrast(theme: ThemeDefinition): MeasuredPair[] {
  const colors = (theme.tokens?.colors ?? {}) as Record<string, string | undefined>;

  return SEMANTIC_PAIRS.flatMap((pair) => {
    const fg = colors[pair.foreground];
    const bg = colors[pair.background];
    if (typeof fg !== "string" || typeof bg !== "string") return [];
    if (!tryParseColor(fg) || !tryParseColor(bg)) return [];

    const ratio = contrastRatioHex(fg, bg);
    const floor = floorFor(pair.requirement);
    const passes = ratio >= floor;

    const direction = passes
      ? undefined
      : analyzeContrastDirection(
          relativeLuminance(parseColor(fg)),
          relativeLuminance(parseColor(bg)),
          ratio,
          floor,
        );
    const severity = passes ? undefined : classifyContrastSeverity(ratio, floor);

    return [
      {
        foreground: pair.foreground,
        background: pair.background,
        requirement: pair.requirement,
        ratio,
        floor,
        passes,
        ...(direction === undefined ? {} : { direction }),
        ...(severity === undefined ? {} : { severity }),
      },
    ];
  });
}

/** Safety margin added to the floor when suggesting fixes. */
const SUGGESTION_SAFETY_MARGIN = 0.25;

/** Maximum lightness adjustment steps for binary search. */
const SUGGESTION_SEARCH_STEPS = 20;

/**
 * A suggested fix for a contrast failure.
 */
export interface ContrastFixSuggestion {
  /** The token to adjust. */
  readonly token: string;
  /** The suggested new value. */
  readonly value: string;
  /** Which other pairs would be affected by this change. */
  readonly affected: readonly string[];
  /** Whether this suggestion would break any currently-passing pairs. */
  readonly breaksExisting: boolean;
}

/**
 * Suggest a minimal fix for a contrast failure.
 *
 * Evaluates both foreground and background adjustment candidates, selects the
 * one that breaks fewer existing pairs, and returns the suggestion. Returns
 * undefined if neither candidate produces a safe result.
 *
 * @param theme - The theme containing the failing pair.
 * @param foreground - The foreground token name.
 * @param background - The background token name.
 * @returns A suggestion, or undefined if no safe fix exists.
 */
export function suggestContrastFix(
  theme: ThemeDefinition,
  foreground: string,
  background: string,
): ContrastFixSuggestion | undefined {
  const colors = (theme.tokens?.colors ?? {}) as Record<string, string | undefined>;
  const fgValue = colors[foreground];
  const bgValue = colors[background];
  if (typeof fgValue !== "string" || typeof bgValue !== "string") return undefined;
  if (!tryParseColor(fgValue) || !tryParseColor(bgValue)) return undefined;

  // Find the requirement for this pair.
  const pair = SEMANTIC_PAIRS.find((p) => p.foreground === foreground && p.background === background);
  if (!pair) return undefined;
  const floor = floorFor(pair.requirement);
  const target = floor + SUGGESTION_SAFETY_MARGIN;

  // Check if the pair already passes the target.
  const currentRatio = contrastRatioHex(fgValue, bgValue);
  if (currentRatio >= target) return undefined;

  const fgOklch = hexToOklchMapped(fgValue);
  const bgOklch = hexToOklchMapped(bgValue);
  const fgLum = relativeLuminance(parseColor(fgValue));
  const bgLum = relativeLuminance(parseColor(bgValue));

  // Determine adjustment direction: to increase contrast, move the lighter color
  // lighter and the darker color darker.
  const fgDirection = fgLum > bgLum ? 1 : -1;
  const bgDirection = bgLum > fgLum ? 1 : -1;

  // Try adjusting foreground.
  const fgCandidate = findMinimalAdjustment(fgOklch, fgLum, bgLum, target, fgDirection);
  // Try adjusting background.
  const bgCandidate = findMinimalAdjustment(bgOklch, bgLum, fgLum, target, bgDirection);

  // Evaluate which candidate is safer.
  const fgImpact = fgCandidate ? evaluateImpact(theme, foreground, fgCandidate.value) : null;
  const bgImpact = bgCandidate ? evaluateImpact(theme, background, bgCandidate.value) : null;

  // Prefer the candidate that breaks fewer pairs.
  if (fgImpact && bgImpact) {
    if (fgImpact.breaksExisting === bgImpact.breaksExisting) {
      // Both break the same number (or none). Prefer the one with fewer affected pairs.
      return fgImpact.affected.length <= bgImpact.affected.length ? fgImpact : bgImpact;
    }
    return fgImpact.breaksExisting ? bgImpact : fgImpact;
  }
  if (fgImpact) return fgImpact;
  if (bgImpact) return bgImpact;
  return undefined;
}

/**
 * Find the minimal lightness adjustment that reaches the target contrast.
 *
 * Uses binary search to find the smallest change. Returns the adjusted color
 * and the new contrast ratio, or undefined if no adjustment within the search
 * range reaches the target.
 */
function findMinimalAdjustment(
  oklch: Oklch,
  lum: number,
  otherLum: number,
  target: number,
  direction: number,
): { value: string; ratio: number } | undefined {
  let low = 0;
  let high = 0.5; // Maximum lightness adjustment
  let best: { value: string; ratio: number } | undefined;

  for (let step = 0; step < SUGGESTION_SEARCH_STEPS; step++) {
    const mid = (low + high) / 2;
    const adjusted = gamutMapOklch(adjustLightness(oklch, mid * direction));
    const adjustedLum = relativeLuminance(parseColor(oklchToHex(adjusted)));
    const ratio =
      adjustedLum > otherLum
        ? (adjustedLum + 0.05) / (otherLum + 0.05)
        : (otherLum + 0.05) / (adjustedLum + 0.05);

    if (ratio >= target) {
      best = { value: oklchToHex(adjusted), ratio };
      high = mid; // Try smaller adjustment
    } else {
      low = mid; // Need larger adjustment
    }
  }

  return best;
}

/**
 * Evaluate the impact of changing a token to a new value.
 *
 * Checks all pairs involving the token and reports which would be affected.
 */
function evaluateImpact(
  theme: ThemeDefinition,
  token: string,
  newValue: string,
): ContrastFixSuggestion | undefined {
  const colors = (theme.tokens?.colors ?? {}) as Record<string, string | undefined>;
  const affected: string[] = [];
  let breaksExisting = false;

  for (const pair of SEMANTIC_PAIRS) {
    if (pair.foreground !== token && pair.background !== token) continue;

    const fg = pair.foreground === token ? newValue : colors[pair.foreground];
    const bg = pair.background === token ? newValue : colors[pair.background];
    if (typeof fg !== "string" || typeof bg !== "string") continue;
    if (!tryParseColor(fg) || !tryParseColor(bg)) continue;

    const oldRatio = contrastRatioHex(
      colors[pair.foreground] ?? "#000000",
      colors[pair.background] ?? "#ffffff",
    );
    const newRatio = contrastRatioHex(fg, bg);
    const floor = floorFor(pair.requirement);

    // If this pair was passing and now fails, we're breaking an existing pair.
    if (oldRatio >= floor && newRatio < floor) {
      breaksExisting = true;
    }
    // If the ratio changed significantly, it's affected.
    if (Math.abs(newRatio - oldRatio) > 0.1) {
      affected.push(pair.foreground === token ? pair.background : pair.foreground);
    }
  }

  return {
    token,
    value: newValue,
    affected,
    breaksExisting,
  };
}

function toOklch(value: string | undefined): Oklch | null {
  if (typeof value !== "string" || !tryParseColor(value)) return null;
  return hexToOklchMapped(value);
}

/**
 * Score a theme against the nine preset quality checks.
 *
 * @param theme - The theme to score.
 * @returns The scorecard.
 */
export function scoreTheme(theme: ThemeDefinition): PresetScore {
  const colors = (theme.tokens?.colors ?? {}) as Record<string, string | undefined>;
  const thresholds = DEFAULT_RELATIONSHIP_THRESHOLDS;
  const checks: PresetCheck[] = [];

  const push = (id: string, label: string, status: CheckStatus, detail?: string) => {
    checks.push(detail === undefined ? { id, label, status } : { id, label, status, detail });
  };

  // -- 1. structural -----------------------------------------------------------
  {
    const missing = CORE_COLORS.filter((role) => toOklch(colors[role]) === null);
    push("structural", "Structural", missing.length === 0 ? "pass" : "fail",
      missing.length === 0 ? undefined : `missing/invalid: ${missing.join(", ")}`);
  }

  const oklch = new Map<CoreColor, Oklch>();
  for (const role of CORE_COLORS) {
    const value = toOklch(colors[role]);
    if (value) oklch.set(role, value);
  }

  // -- 2. semantic -------------------------------------------------------------
  {
    const families: Array<[CoreColor, number, string]> = [
      ["destructive", STATUS_HUES.destructive, "red"],
      ["success", STATUS_HUES.success, "green"],
    ];
    const drifted = families.filter(([role, hue]) => {
      const value = oklch.get(role);
      return value !== undefined && hueDistance(value.h, hue) > STATUS_HUE_TOLERANCE;
    });
    push("semantic", "Semantic", drifted.length === 0 ? "pass" : "fail",
      drifted.length === 0 ? undefined : `${drifted.map(([r, , n]) => `${r} left the ${n} family`).join("; ")}`);
  }

  // -- 3 & 4. contrast ---------------------------------------------------------
  // Measured once, through the canonical helper, so the scorecard and any page
  // rendering the same numbers cannot disagree.
  const measured = measureThemeContrast(theme);
  const contrastFailures = (requirement: "text" | "ui") =>
    measured
      .filter((pair) => pair.requirement === requirement && !pair.passes)
      .map((pair) => `${pair.foreground}/${pair.background} ${pair.ratio.toFixed(2)}`);

  {
    const failures = contrastFailures("text");
    push("text-contrast", "Text contrast", failures.length === 0 ? "pass" : "fail",
      failures.length === 0 ? undefined : failures.join("; "));
  }
  {
    const failures = contrastFailures("ui");
    push("ui-contrast", "UI contrast", failures.length === 0 ? "pass" : "fail",
      failures.length === 0 ? undefined : failures.join("; "));
  }

  // -- 5. surface hierarchy ----------------------------------------------------
  {
    const problems: string[] = [];
    const delta = (a: CoreColor, b: CoreColor) => {
      const x = oklch.get(a);
      const y = oklch.get(b);
      return x && y ? Math.abs(x.l - y.l) : null;
    };

    const bgCard = delta("background", "card");
    if (bgCard !== null && bgCard < thresholds.backgroundCard - TOLERANCE) {
      problems.push(`background/card ΔL ${bgCard.toFixed(3)}`);
    }
    const cardPopover = delta("card", "popover");
    if (cardPopover !== null && cardPopover < thresholds.cardPopover - TOLERANCE) {
      problems.push(`card/popover ΔL ${cardPopover.toFixed(3)}`);
    }
    for (const surface of BORDER_SURFACES) {
      const value = delta("border", surface);
      if (value !== null && value < thresholds.borderVisibility - TOLERANCE) {
        problems.push(`border/${surface} ΔL ${value.toFixed(3)}`);
      }
    }
    const dominance = delta("border", "background");
    if (dominance !== null && dominance > thresholds.borderDominance + TOLERANCE) {
      problems.push(`border dominance ΔL ${dominance.toFixed(3)}`);
    }

    push("surface-hierarchy", "Surface hierarchy", problems.length === 0 ? "pass" : "fail",
      problems.length === 0 ? undefined : problems.join("; "));
  }

  // -- 6. muted hierarchy ------------------------------------------------------
  {
    const foreground = oklch.get("foreground");
    const muted = oklch.get("mutedForeground");
    const isLight = theme.meta?.mode !== "dark";
    let status: CheckStatus = "pass";
    let detail: string | undefined;

    if (foreground && muted) {
      const separation = Math.abs(foreground.l - muted.l);
      const ordered = isLight ? muted.l > foreground.l : muted.l < foreground.l;
      if (!ordered) {
        status = "fail";
        detail = "mutedForeground is not quieter than foreground";
      } else if (separation < thresholds.mutedQuieter - TOLERANCE) {
        status = "fail";
        detail = `ΔL ${separation.toFixed(3)} < ${thresholds.mutedQuieter}`;
      }
    }
    push("muted-hierarchy", "Muted hierarchy", status, detail);
  }

  // -- 7. accent collision -----------------------------------------------------
  {
    const primary = oklch.get("primary");
    const accent = oklch.get("accent");
    let status: CheckStatus = "pass";
    let detail: string | undefined;

    if (primary && accent) {
      const hueGap = hueDistance(primary.h, accent.h);
      const chromaGap = Math.abs(primary.c - accent.c);
      if (hueGap < thresholds.minAccentHueDistance && chromaGap < thresholds.minAccentChroma) {
        status = "fail";
        detail = `hue ${hueGap.toFixed(1)}°, chroma ${chromaGap.toFixed(3)}`;
      }
    }
    push("accent-collision", "Accent collision", status, detail);
  }

  // -- 8. CVD diagnostics ------------------------------------------------------
  {
    const destructive = colors.destructive;
    const success = colors.success;
    const warnings: string[] = [];

    if (typeof destructive === "string" && typeof success === "string") {
      for (const type of CVD_TYPES) {
        const a = hexToOklchMapped(simulateCVD(destructive, type));
        const b = hexToOklchMapped(simulateCVD(success, type));
        if (deltaEOklch(a, b) < CVD_SEPARATION) warnings.push(type);
      }
    }

    // Diagnostic only: a close pair is a warning, never a failure — the generator
    // cannot force a UI to also carry meaning in an icon or a label.
    push("cvd", "CVD diagnostics", warnings.length === 0 ? "pass" : "warn",
      warnings.length === 0 ? undefined : `close under ${warnings.join(", ")}`);
  }

  // -- 9. semantic contexts ----------------------------------------------------
  // The pair checks above ask "does this token contrast its pair?". This asks the
  // question a real UI asks: "is this token usable in every context we promise to
  // support?" A theme can pass every pair check and still paint a brand colour
  // onto the canvas at 1.4:1 — see `contexts.ts`.
  {
    const failures = auditSemanticContexts(theme).filter(
      (result) => !result.passes && result.context.level === "required",
    );
    const detail = failures
      .map((result) => `${result.context.role}/${result.context.against} ${result.ratio?.toFixed(2)}`)
      .join(", ");
    push("contexts", "Semantic contexts", failures.length === 0 ? "pass" : "fail",
      failures.length === 0 ? undefined : detail);
  }

  const passed = checks.filter((check) => check.status !== "fail").length;

  return {
    name: theme.name,
    family: theme.meta?.family ?? null,
    mode: theme.meta?.mode ?? null,
    checks,
    passed,
    total: checks.length,
  };
}
