/**
 * Internal validation levels.
 *
 * The public `validateTheme()` stays a single, non-throwing, structural check —
 * its contract is frozen. These levels are the *internal* breakdown the plan
 * asks for (theme-generation.md Phase 9), used by the quality report, the preset
 * audit and the generator's own tests.
 *
 * Levels:
 *
 * - **structural** — every core token present and a valid color.
 * - **semantic** — status roles are in their families; pairs are coherent.
 * - **contrast** — every contract pair meets its published floor.
 * - **visual** — roles that must be distinguishable are distinguishable.
 * - **accessibility** — CVD diagnostics over the status roles.
 *
 * ## CVD diagnostics are diagnostic, not a conformance promise
 *
 * The accessibility level simulates colour-vision deficiencies and flags status
 * roles that collapse together. It can only tell you the *colours* are close.
 * Icons, text labels and shape must also carry the meaning — the generator cannot
 * force a UI to do that, and a theme that passes this check is not thereby
 * guaranteed to be usable.
 *
 * @packageDocumentation
 */
import { simulateCVD, type CVDType } from "../accessibility";
import {
  contrastRatioHex,
  deltaEOklch,
  hexToOklchMapped,
  hueDistance,
  rgbToOklch,
  tryParseColor,
  type Oklch,
} from "../color";
import type { ThemeDiagnosticCode, ThemeDiagnosticContext } from "../diagnostics";
import { CORE_COLORS, type CoreColor } from "../model/semantic-roles";
import type { ThemeDefinition } from "../model/theme";
import { floorFor, SEMANTIC_PAIRS } from "./contract";
import { BORDER_SURFACES, DEFAULT_RELATIONSHIP_THRESHOLDS } from "./relationships";
import { STATUS_HUES } from "./status";

/** The validation levels, in escalating order. */
export type ValidationLevel = "structural" | "semantic" | "contrast" | "visual" | "accessibility";

/** A problem found at a specific level. */
export interface LevelIssue {
  /** Which level found it. */
  level: ValidationLevel;
  /** Stable diagnostic code. */
  code: ThemeDiagnosticCode;
  /** Dot-path to the offending token, when there is one. */
  path?: string;
  /** Human-readable description. */
  message: string;
  /** Structured context. */
  context?: ThemeDiagnosticContext;
}

/** Options for {@link validateThemeLevels}. */
export interface ValidateThemeLevelsOptions {
  /** Which levels to run. Defaults to all of them. */
  levels?: readonly ValidationLevel[];
  /** The CVD types to diagnose against. Defaults to the two common ones. */
  cvdTypes?: readonly CVDType[];
}

const ALL_LEVELS: readonly ValidationLevel[] = [
  "structural",
  "semantic",
  "contrast",
  "visual",
  "accessibility",
];

/** Hue tolerance (degrees) for "is this still the red family". */
const STATUS_HUE_TOLERANCE = 40;

/**
 * Tolerance for lightness/distance comparisons on **hex** tokens.
 *
 * This validator reads a theme's resolved tokens, which are 8-bit hex. Rounding
 * to the nearest channel moves OKLab lightness by up to ~0.002, so a value solved
 * to exactly a threshold can measure fractionally below it. The tolerance covers
 * quantisation only — it is far below any perceptual difference.
 */
const HEX_QUANTISATION_TOLERANCE = 0.003;

/** Minimum CVD separation between two status colours before they are flagged. */
const CVD_SIMILARITY_THRESHOLD = 0.03;

function toOklch(value: string | undefined): Oklch | null {
  if (typeof value !== "string") return null;
  const parsed = tryParseColor(value);
  return parsed ? rgbToOklch(parsed) : null;
}

/**
 * Run the internal validation levels over a theme definition.
 *
 * @param theme - The theme to validate.
 * @param options - Which levels to run and which CVD types to diagnose.
 * @returns Every issue found, across the requested levels.
 */
export function validateThemeLevels(
  theme: ThemeDefinition,
  options: ValidateThemeLevelsOptions = {},
): LevelIssue[] {
  const levels = new Set(options.levels ?? ALL_LEVELS);
  const issues: LevelIssue[] = [];
  const colors = theme.tokens?.colors as Record<string, string | undefined> | undefined;

  // -- structural ------------------------------------------------------------
  if (!colors) {
    return [
      {
        level: "structural",
        code: "TV_THEME_TOKEN_MISSING",
        path: "tokens.colors",
        message: "Missing `tokens.colors`",
        context: { api: "validateThemeLevels", property: "colors", path: "tokens.colors" },
      },
    ];
  }

  const oklch = new Map<CoreColor, Oklch>();

  for (const role of CORE_COLORS) {
    const value = colors[role];
    if (typeof value !== "string") {
      if (levels.has("structural")) {
        issues.push({
          level: "structural",
          code: "TV_THEME_TOKEN_MISSING",
          path: `colors.${role}`,
          message: `Missing token: \`colors.${role}\``,
          context: { api: "validateThemeLevels", property: role, path: `colors.${role}` },
        });
      }
      continue;
    }

    const parsed = toOklch(value);
    if (!parsed) {
      if (levels.has("structural")) {
        issues.push({
          level: "structural",
          code: "TV_THEME_TOKEN_INVALID",
          path: `colors.${role}`,
          message: `Invalid color for \`colors.${role}\`: ${value}`,
          context: {
            api: "validateThemeLevels",
            property: role,
            path: `colors.${role}`,
            received: value,
            expected: "a parseable CSS color",
          },
        });
      }
      continue;
    }

    oklch.set(role, parsed);
  }

  // -- semantic --------------------------------------------------------------
  if (levels.has("semantic")) {
    const families: Array<{ role: CoreColor; hue: number; name: string }> = [
      { role: "destructive", hue: STATUS_HUES.destructive, name: "red" },
      { role: "success", hue: STATUS_HUES.success, name: "green" },
    ];

    for (const { role, hue, name } of families) {
      const value = oklch.get(role);
      if (!value) continue;
      if (hueDistance(value.h, hue) > STATUS_HUE_TOLERANCE) {
        issues.push({
          level: "semantic",
          code: "TV_GENERATION_ROLE_COLLISION",
          path: `colors.${role}`,
          message: `\`${role}\` is not in the ${name} family (hue ${value.h.toFixed(1)}°, expected ≈${hue}°)`,
          context: {
            api: "validateThemeLevels",
            property: role,
            path: `colors.${role}`,
            received: value.h,
            expected: `≈${hue}°`,
          },
        });
      }
    }
  }

  // -- contrast --------------------------------------------------------------
  if (levels.has("contrast")) {
    for (const pair of SEMANTIC_PAIRS) {
      const fg = colors[pair.foreground];
      const bg = colors[pair.background];
      if (typeof fg !== "string" || typeof bg !== "string") continue;
      if (!tryParseColor(fg) || !tryParseColor(bg)) continue;

      const ratio = contrastRatioHex(fg, bg);
      const floor = floorFor(pair.requirement);
      if (ratio < floor) {
        issues.push({
          level: "contrast",
          code: "TV_A11Y_CONTRAST_VIOLATION",
          path: `colors.${pair.foreground} on colors.${pair.background}`,
          message: `${pair.foreground}/${pair.background} is ${ratio.toFixed(2)}:1, below ${floor}:1`,
          context: {
            api: "validateThemeLevels",
            property: pair.foreground,
            path: `colors.${pair.foreground}`,
            received: Number(ratio.toFixed(3)),
            expected: `≥ ${floor}`,
          },
        });
      }
    }
  }

  // -- visual ----------------------------------------------------------------
  if (levels.has("visual")) {
    const t = DEFAULT_RELATIONSHIP_THRESHOLDS;
    const delta = (a: CoreColor, b: CoreColor) => {
      const x = oklch.get(a);
      const y = oklch.get(b);
      return x && y ? Math.abs(x.l - y.l) : null;
    };

    const surfaceChecks: Array<[CoreColor, CoreColor, number]> = [
      ["background", "card", t.backgroundCard],
      ["card", "popover", t.cardPopover],
    ];
    for (const [a, b, minimum] of surfaceChecks) {
      const value = delta(a, b);
      if (value !== null && value < minimum - HEX_QUANTISATION_TOLERANCE) {
        issues.push({
          level: "visual",
          code: "TV_GENERATION_ROLE_COLLISION",
          path: `colors.${a} vs colors.${b}`,
          message: `\`${a}\` and \`${b}\` are not distinguishable (ΔL ${value.toFixed(3)} < ${minimum})`,
          context: { api: "validateThemeLevels", property: a, path: `colors.${a}`, received: value, expected: `≥ ${minimum}` },
        });
      }
    }

    // The border must be visible against every surface it separates, and
    // subordinate to the canvas. It is deliberately not a contrast pair.
    for (const surface of BORDER_SURFACES) {
      const value = delta("border", surface);
      if (value !== null && value < t.borderVisibility - HEX_QUANTISATION_TOLERANCE) {
        issues.push({
          level: "visual",
          code: "TV_GENERATION_ROLE_COLLISION",
          path: `colors.border vs colors.${surface}`,
          message: `\`border\` is not visible against \`${surface}\` (ΔL ${value.toFixed(3)} < ${t.borderVisibility})`,
          context: { api: "validateThemeLevels", property: "border", path: "colors.border", received: value, expected: `≥ ${t.borderVisibility}` },
        });
      }
    }

    const dominance = delta("border", "background");
    if (dominance !== null && dominance > t.borderDominance + HEX_QUANTISATION_TOLERANCE) {
      issues.push({
        level: "visual",
        code: "TV_GENERATION_ROLE_COLLISION",
        path: "colors.border vs colors.background",
        message: `\`border\` dominates the canvas (ΔL ${dominance.toFixed(3)} > ${t.borderDominance})`,
        context: { api: "validateThemeLevels", property: "border", path: "colors.border", received: dominance, expected: `≤ ${t.borderDominance}` },
      });
    }

    // A focused field must read as focused.
    const input = oklch.get("input");
    const ring = oklch.get("ring");
    if (input && ring) {
      const separation = deltaEOklch(input, ring);
      if (separation < t.inputRingSeparation - HEX_QUANTISATION_TOLERANCE) {
        issues.push({
          level: "visual",
          code: "TV_GENERATION_ROLE_COLLISION",
          path: "colors.input vs colors.ring",
          message: `\`input\` and \`ring\` are too similar (ΔE ${separation.toFixed(3)} < ${t.inputRingSeparation})`,
          context: { api: "validateThemeLevels", property: "ring", path: "colors.ring", received: separation, expected: `≥ ${t.inputRingSeparation}` },
        });
      }
    }

    const primary = oklch.get("primary");
    const accent = oklch.get("accent");
    if (primary && accent) {
      const hueGap = hueDistance(primary.h, accent.h);
      const chromaGap = Math.abs(primary.c - accent.c);
      if (hueGap < t.minAccentHueDistance && chromaGap < t.minAccentChroma) {
        issues.push({
          level: "visual",
          code: "TV_GENERATION_ROLE_COLLISION",
          path: "colors.accent vs colors.primary",
          message: "`accent` is not distinct from `primary` in hue or chroma",
          context: { api: "validateThemeLevels", property: "accent", path: "colors.accent", received: hueGap, expected: `≥ ${t.minAccentHueDistance}°` },
        });
      }
    }
  }

  // -- accessibility ---------------------------------------------------------
  if (levels.has("accessibility")) {
    const cvdTypes = options.cvdTypes ?? (["protanopia", "deuteranopia"] as const);
    const statusRoles: CoreColor[] = ["destructive", "success"];

    for (const cvd of cvdTypes) {
      const simulated = statusRoles
        .map((role) => ({ role, value: colors[role] }))
        .filter((entry): entry is { role: CoreColor; value: string } => typeof entry.value === "string")
        .map((entry) => ({ role: entry.role, hex: simulateCVD(entry.value, cvd) }));

      for (let i = 0; i < simulated.length; i += 1) {
        for (let j = i + 1; j < simulated.length; j += 1) {
          const a = simulated[i];
          const b = simulated[j];
          if (!a || !b) continue;
          const oa = hexToOklchMapped(a.hex);
          const ob = hexToOklchMapped(b.hex);
          const distance = deltaEOklch(oa, ob);
          if (distance < CVD_SIMILARITY_THRESHOLD) {
            issues.push({
              level: "accessibility",
              code: "TV_GENERATION_ROLE_COLLISION",
              path: `colors.${a.role} vs colors.${b.role}`,
              message: `\`${a.role}\` and \`${b.role}\` are hard to tell apart under ${cvd}`,
              context: {
                api: "validateThemeLevels",
                property: a.role,
                path: `colors.${a.role}`,
                received: Number(distance.toFixed(4)),
                expected: `≥ ${CVD_SIMILARITY_THRESHOLD}`,
              },
            });
          }
        }
      }
    }
  }

  return issues;
}
