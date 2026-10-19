import { getNeutralThemes } from "./neutral-themes";
import { getPresetThemes } from "./preset-themes";
import { getBrandPresets } from "./brand-presets";
import { getAccessibilityProfiles } from "./accessibility-profiles";

/**
 * Pairs the semantic system promises to keep readable, with the AA floor for normal
 * text. This is the contract the preset pages display, so it is enforced here rather
 * than merely reported.
 */
const READABLE_PAIRS: ReadonlyArray<readonly [string, string]> = [
  ["foreground", "background"],
  ["cardForeground", "card"],
  ["popoverForeground", "popover"],
  ["primaryForeground", "primary"],
  ["secondaryForeground", "secondary"],
  ["accentForeground", "accent"],
  ["mutedForeground", "muted"],
  ["destructiveForeground", "destructive"],
  ["successForeground", "success"],
  ["warningForeground", "warning"],
];

/** WCAG relative luminance. */
function relativeLuminance(hex: string): number {
  const h = hex.replace("#", "");
  const linear = (c: number) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  const [r = 0, g = 0, b = 0] = [0, 2, 4].map((k) => linear(parseInt(h.slice(k, k + 2), 16)));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio between two hex colors. */
function contrastRatio(a: string, b: string): number {
  const [hi = 1, lo = 0] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** The inks a semantic foreground may be moved to. */
const INK_CANDIDATES = ["#ffffff", "#0f172a", "#020617", "#000000"] as const;

/**
 * Moves a foreground onto the candidate ink with the best contrast when the authored
 * value fails the AA floor.
 *
 * ## Why this exists
 *
 * `successForeground`, `destructiveForeground` and `warningForeground` are hardcoded
 * hex values in five files — 49 occurrences, 36 of them in `preset-themes.ts` alone.
 * Each was chosen by hand, so each is a place the semantic contract can break without
 * anything noticing. Measured across the built-in themes, six distinct pairs were
 * failing:
 *
 *     successForeground/success      3.30:1   in 17 themes  (white on #16a34a)
 *     destructiveForeground/destructive
 *     mutedForeground/muted          2.48:1   discord-light
 *     secondaryForeground/secondary  2.50:1   slack-dark
 *     accentForeground/accent        2.64:1   apple-dark
 *     primaryForeground/primary      3.38:1   large-text-dark
 *
 * Fixing 49 sites individually leaves the 50th to break the same way. One pass here
 * makes the contract hold for every built-in theme, including generated ones.
 *
 * ## Only the ink moves
 *
 * The surface is left exactly as authored. A brand color is what carries the
 * identity; the foreground is what has to be readable on it. That keeps the brand
 * seed exact, which is the whole point of the brand presets.
 */
function ensureReadableContrast<T extends { tokens?: { colors?: Record<string, string> } }>(
  theme: T,
): T {
  const colors = theme.tokens?.colors;
  if (!colors) return theme;

  for (const [fgKey, bgKey] of READABLE_PAIRS) {
    const fg = colors[fgKey];
    const bg = colors[bgKey];
    if (typeof fg !== "string" || typeof bg !== "string") continue;
    if (contrastRatio(fg, bg) >= 4.5) continue;

    let best = fg;
    let bestRatio = contrastRatio(fg, bg);
    for (const candidate of INK_CANDIDATES) {
      const r = contrastRatio(candidate, bg);
      if (r > bestRatio) {
        best = candidate;
        bestRatio = r;
      }
    }
    colors[fgKey] = best;
  }
  return theme;
}

/**
 * Build the complete set of built-in themes shipped with Themvora.
 *
 * Combines the neutral themes, preset themes, brand presets, and accessibility
 * profiles into a single array ready to be registered with a theme runtime.
 *
 * Every theme passes through {@link ensureReadableContrast} on the way out, so a
 * semantic foreground that would fail AA is corrected before any consumer sees it.
 *
 * @returns An array of all built-in theme definitions.
 */
export function getBuiltInThemes() {
  const all = [
    ...getNeutralThemes(),
    ...getPresetThemes(),
    ...getBrandPresets(),
    ...getAccessibilityProfiles(),
  ];

  // The pass needs to reach the colour map, which the `as const` literal types do
  // not expose. The widening is confined to this statement so the public return type
  // stays exactly what it was — consumers depend on it.
  for (const theme of all as Array<{ tokens?: { colors?: Record<string, string> } }>) {
    ensureReadableContrast(theme);
  }

  return all;
}
