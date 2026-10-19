/**
 * Syntax-highlighting palette generation.
 *
 * The syntax roles are spread around the seed's hue wheel so they stay
 * distinguishable against the code surface, and each mode gets its own
 * lightness targets. All math is OKLCH — the previous implementation generated
 * these in HSL, which is the "no HSL-only generation logic" rule
 * theme-generation.md §1 forbids.
 *
 * The code surface itself (`#ffffff` / `#0f172a`) is deliberately fixed: a code
 * block is a neutral container regardless of brand, and the values are part of
 * the published contract.
 *
 * @packageDocumentation
 */
import { normalizeHue, oklchToHexMapped } from "../color";
import type { CodeTokens } from "../model/tokens";
import type { ThemeIdentity } from "./identity";

/** Code surface background per mode. Fixed by the published contract. */
const CODE_BACKGROUND = { light: "#ffffff", dark: "#0f172a" } as const;
/** Default code text per mode. */
const CODE_FOREGROUND = { light: "#0f172a", dark: "#e2e8f0" } as const;
/** Comment / line-number text per mode. */
const CODE_MUTED = { light: "#64748b", dark: "#94a3b8" } as const;

/** Syntax hue offsets from the seed hue, in degrees. */
const SYNTAX_OFFSETS = {
  keyword: 0,
  tag: 0,
  number: 25,
  attribute: 90,
  string: 130,
  type: 180,
  function: 240,
} as const;

/** Chroma floor so an achromatic seed still yields a visible syntax palette. */
const SYNTAX_CHROMA_FLOOR = 0.08;
/** Syntax lightness targets per mode. */
const SYNTAX_LIGHTNESS = { light: 0.45, dark: 0.75 } as const;

/**
 * Generate the opt-in syntax palette for a mode.
 *
 * @param mode - The mode to generate for.
 * @param identity - The seed identity (supplies the base hue and chroma).
 * @returns The code token set.
 */
export function generateCodeTokens(
  mode: "light" | "dark",
  identity: ThemeIdentity,
): CodeTokens {
  const isLight = mode === "light";
  const baseChroma = Math.max(identity.chroma * 0.9, SYNTAX_CHROMA_FLOOR);

  const syntax = (offset: number, chromaScale = 1, lightnessScale = 1): string =>
    oklchToHexMapped({
      l: SYNTAX_LIGHTNESS[mode] * lightnessScale,
      c: baseChroma * chromaScale,
      h: normalizeHue(identity.hue + offset),
    });

  return {
    background: CODE_BACKGROUND[mode],
    foreground: CODE_FOREGROUND[mode],
    border: isLight ? "#e2e8f0" : "#1e293b",
    comment: CODE_MUTED[mode],
    keyword: syntax(SYNTAX_OFFSETS.keyword),
    string: syntax(SYNTAX_OFFSETS.string, 0.8),
    number: syntax(SYNTAX_OFFSETS.number, 0.9),
    function: syntax(SYNTAX_OFFSETS.function, 0.7),
    variable: CODE_FOREGROUND[mode],
    type: syntax(SYNTAX_OFFSETS.type, 0.7, 0.95),
    property: CODE_FOREGROUND[mode],
    operator: CODE_FOREGROUND[mode],
    punctuation: isLight ? "#475569" : "#cbd5e1",
    tag: syntax(SYNTAX_OFFSETS.tag),
    attribute: syntax(SYNTAX_OFFSETS.attribute, 0.8, 0.95),
    lineNumber: CODE_MUTED[mode],
    selection: `${oklchToHexMapped(identity.base)}4d`,
    highlight: isLight ? "#f1f5f9" : "#1e293b",
    gutter: isLight ? "#f8fafc" : "#020617",
  };
}
