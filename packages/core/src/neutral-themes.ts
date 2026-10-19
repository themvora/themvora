/**
 * The neutral baseline themes.
 *
 * These are the framework's fallback themes and the *complete* token reference:
 * they carry the full non-color scale (radius, spacing, shadows, border widths,
 * z-index, breakpoints, typography, code) alongside the semantic colors.
 *
 * Since Phase 7 the **colors are generated** from the same `semantic-v2`
 * pipeline every preset uses, so the baseline cannot fail the contrast contract
 * that the presets are held to. The non-color groups are authored here, because
 * they are a scale, not a semantic system.
 *
 * The seed is `slate-900` — the canonical neutral — generated in the
 * `brand` style, which preserves the seed's own lightness. That is what keeps the
 * baseline monochrome: a near-black primary in light mode, a light one in dark
 * mode, with no hue opinion.
 *
 * @packageDocumentation
 */
import { oklchToHexMapped } from "./color";
import {
  deriveIdentity,
  generateRolePalette,
  resolveStyle,
  type GenerationStyle,
} from "./generation";
import { defineTheme, type ThemeDefinition } from "./model";
import type { GenerationMeta } from "./model/meta";
import { CORE_COLORS } from "./model/semantic-roles";
import type { CodeTokens, ThemeTokens } from "./model/tokens";
import { DEFAULT_CONTRAST_CONTRACT } from "./generation/contract";
import { GENERATION_ALGORITHM } from "./generation/version";

/** The seed the neutral baseline is generated from: slate-900. */
const NEUTRAL_SEED = "#0f172a";

/**
 * The style used for the baseline.
 *
 * `brand` is the *strong-anchor* style: it preserves the seed's lightness rather
 * than clamping it into a narrow band, which is what lets a near-black seed stay
 * near-black. The name refers to the behaviour, not to the use case.
 */
const NEUTRAL_STYLE: GenerationStyle = "brand";

/** A generation mode. */
type NeutralMode = "light" | "dark";

/** Generate the semantic colors for one mode. */
function neutralColors(mode: NeutralMode): Record<string, string> {
  const identity = deriveIdentity(NEUTRAL_SEED);
  const style = resolveStyle(NEUTRAL_STYLE);
  const { palette } = generateRolePalette({ mode, identity, style });

  const colors: Record<string, string> = {};
  for (const role of CORE_COLORS) colors[role] = oklchToHexMapped(palette[role]);
  return colors;
}

const RADIUS: Record<string, string> = {
  sm: "4px",
  md: "8px",
  lg: "12px",
  xl: "16px",
  "2xl": "24px",
  full: "9999px",
};

const SPACING: Record<string, string> = {
  "0": "0px",
  px: "1px",
  "0.5": "2px",
  "1": "4px",
  "1.5": "6px",
  "2": "8px",
  "2.5": "10px",
  "3": "12px",
  "3.5": "14px",
  "4": "16px",
  "5": "20px",
  "6": "24px",
  "7": "28px",
  "8": "32px",
  "9": "36px",
  "10": "40px",
  "11": "44px",
  "12": "48px",
  "14": "56px",
  "16": "64px",
  "20": "80px",
  "24": "96px",
};

const SHADOWS: Record<string, string> = {
  xs: "0 1px 2px rgba(0,0,0,0.05)",
  sm: "0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)",
  md: "0 4px 6px rgba(0,0,0,0.07), 0 2px 4px rgba(0,0,0,0.06)",
  lg: "0 10px 15px rgba(0,0,0,0.1), 0 4px 6px rgba(0,0,0,0.05)",
  xl: "0 20px 25px rgba(0,0,0,0.1), 0 10px 10px rgba(0,0,0,0.04)",
  "2xl": "0 25px 50px rgba(0,0,0,0.25)",
};

const BORDER_WIDTHS: Record<string, string> = {
  "0": "0px",
  "1": "1px",
  "2": "2px",
  "4": "4px",
  "8": "8px",
};

const Z_INDEX: Record<string, string> = {
  auto: "auto",
  "0": "0",
  "10": "10",
  "20": "20",
  "30": "30",
  "40": "40",
  "50": "50",
};

const BREAKPOINTS: Record<string, string> = {
  sm: "640px",
  md: "768px",
  lg: "1024px",
  xl: "1280px",
  "2xl": "1536px",
};

const TYPOGRAPHY: NonNullable<ThemeTokens["typography"]> = {
  fontFamilies: {
    sans: "ui-sans-serif, system-ui, sans-serif",
    serif: "ui-serif, Georgia, serif",
    mono: "ui-monospace, SFMono-Regular, Menlo, monospace",
  },
  fontSizes: {
    xs: "0.75rem",
    sm: "0.875rem",
    base: "1rem",
    lg: "1.125rem",
    xl: "1.25rem",
    "2xl": "1.5rem",
    "3xl": "1.875rem",
    "4xl": "2.25rem",
    "5xl": "3rem",
  },
  lineHeights: {
    none: "1",
    tight: "1.25",
    snug: "1.375",
    normal: "1.5",
    relaxed: "1.625",
    loose: "2",
  },
};

const LIGHT_CODE: CodeTokens = {
  background: "#f1f5f9",
  foreground: "#0f172a",
  comment: "#64748b",
  keyword: "#dc2626",
  string: "#0891b2",
  number: "#c2410c",
  function: "#7c3aed",
  variable: "#0f172a",
  type: "#0369a1",
  property: "#0369a1",
  operator: "#dc2626",
  punctuation: "#475569",
  tag: "#dc2626",
  attribute: "#0369a1",
  lineNumber: "#94a3b8",
  selection: "rgba(15, 23, 42, 0.12)",
  highlight: "rgba(15, 23, 42, 0.06)",
  gutter: "#f1f5f9",
  border: "#e2e8f0",
};

const DARK_CODE: CodeTokens = {
  background: "#1e293b",
  foreground: "#e2e8f0",
  comment: "#64748b",
  keyword: "#f87171",
  string: "#67e8f9",
  number: "#fbbf24",
  function: "#c4b5fd",
  variable: "#e2e8f0",
  type: "#7dd3fc",
  property: "#7dd3fc",
  operator: "#f87171",
  punctuation: "#94a3b8",
  tag: "#f87171",
  attribute: "#7dd3fc",
  lineNumber: "#475569",
  selection: "rgba(248, 250, 252, 0.16)",
  highlight: "rgba(248, 250, 252, 0.08)",
  gutter: "#1e293b",
  border: "#334155",
};

function neutralTokens(mode: NeutralMode): ThemeTokens {
  return {
    colors: neutralColors(mode),
    radius: RADIUS,
    spacing: SPACING,
    shadows: SHADOWS,
    borderWidths: BORDER_WIDTHS,
    zIndex: Z_INDEX,
    breakpoints: BREAKPOINTS,
    typography: TYPOGRAPHY,
    code: mode === "light" ? LIGHT_CODE : DARK_CODE,
  };
}

function generationMeta(): GenerationMeta {
  return {
    algorithm: GENERATION_ALGORITHM,
    seed: NEUTRAL_SEED,
    style: NEUTRAL_STYLE,
    contrast: { ...DEFAULT_CONTRAST_CONTRACT },
  };
}

/**
 * Build the neutral light and dark themes.
 *
 * These are the framework's baseline themes: a full token set (colors, radius,
 * spacing, shadows, border widths, z-index, breakpoints, typography, and code)
 * with no color family applied. They are the fallback when no family is
 * selected. Their colors are generated, so they satisfy the same contrast
 * contract as every preset.
 *
 * @returns A `[light, dark]` tuple of neutral theme definitions.
 */
export function getNeutralThemes(): [ThemeDefinition, ThemeDefinition] {
  return [
    defineTheme({
      name: "light",
      meta: {
        mode: "light",
        label: "Light",
        order: 10,
        generation: generationMeta(),
      },
      tokens: neutralTokens("light"),
    }),
    defineTheme({
      name: "dark",
      meta: {
        mode: "dark",
        label: "Dark",
        order: 20,
        generation: generationMeta(),
      },
      tokens: neutralTokens("dark"),
    }),
  ];
}
