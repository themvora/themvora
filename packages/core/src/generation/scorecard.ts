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
  tryParseColor,
  type Oklch,
} from "../color";
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
    return [
      {
        foreground: pair.foreground,
        background: pair.background,
        requirement: pair.requirement,
        ratio,
        floor,
        passes: ratio >= floor,
      },
    ];
  });
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
