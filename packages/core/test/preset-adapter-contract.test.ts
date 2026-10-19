import { describe, expect, it } from "vitest";
import { getBrandPresets, getContrastRatio, getPresetThemes, type ThemeDefinition } from "../src";
import { DEFAULT_RELATIONSHIP_THRESHOLDS } from "../src/generation";

/**
 * Phase 7.12 — the presets must stay useful once mapped into a real component
 * system, not merely satisfy Themvora's abstract schema.
 *
 * ```
 * Themvora semantic token → adapter mapping → real component state
 * ```
 *
 * Core cannot import the adapters (they depend on core, not the other way
 * round), so the *component states* the adapters produce are enumerated here
 * instead. The role list is the one `@themvora/shadcn` declares in its
 * `requires` — the broadest of the adapters — and the states are the pairs those
 * roles are consumed in.
 */

/** Roles `@themvora/shadcn` declares as required, in its own order. */
const ADAPTER_REQUIRED_ROLES = [
  "background",
  "foreground",
  "card",
  "cardForeground",
  "popover",
  "popoverForeground",
  "primary",
  "primaryForeground",
  "secondary",
  "secondaryForeground",
  "muted",
  "mutedForeground",
  "accent",
  "accentForeground",
  "destructive",
  "destructiveForeground",
  "border",
  "input",
  "ring",
] as const;

/**
 * The component states the adapters actually render, and the contrast floor each
 * one needs. `floor` is the published contract, not the internal target.
 */
const COMPONENT_STATES: ReadonlyArray<{
  component: string;
  foreground: string;
  background: string;
  floor: number;
}> = [
  { component: "Page", foreground: "foreground", background: "background", floor: 4.5 },
  { component: "Card", foreground: "cardForeground", background: "card", floor: 4.5 },
  { component: "Popover", foreground: "popoverForeground", background: "popover", floor: 4.5 },
  { component: "Button (primary)", foreground: "primaryForeground", background: "primary", floor: 4.5 },
  { component: "Button (secondary)", foreground: "secondaryForeground", background: "secondary", floor: 4.5 },
  { component: "Muted text", foreground: "mutedForeground", background: "muted", floor: 4.5 },
  { component: "Badge (accent)", foreground: "accentForeground", background: "accent", floor: 4.5 },
  { component: "Alert (destructive)", foreground: "destructiveForeground", background: "destructive", floor: 4.5 },
  { component: "Input border", foreground: "input", background: "background", floor: 3 },
  { component: "Input border inside a card", foreground: "input", background: "card", floor: 3 },
  { component: "Focus ring on the page", foreground: "ring", background: "background", floor: 3 },
  { component: "Focus ring inside a card", foreground: "ring", background: "card", floor: 3 },
  { component: "Focus ring on a muted surface", foreground: "ring", background: "muted", floor: 3 },
  { component: "Focus ring in a popover", foreground: "ring", background: "popover", floor: 3 },
];

const ALL_PRESETS: readonly ThemeDefinition[] = [...getPresetThemes(), ...getBrandPresets()];

function colorsOf(theme: ThemeDefinition): Record<string, string> {
  return (theme.tokens?.colors ?? {}) as Record<string, string>;
}

describe("presets → adapter contract", () => {
  it("defines every role the adapters declare as required", () => {
    const missing: string[] = [];

    for (const theme of ALL_PRESETS) {
      const colors = colorsOf(theme);
      for (const role of ADAPTER_REQUIRED_ROLES) {
        if (typeof colors[role] !== "string" || !/^#[0-9a-f]{6}$/.test(colors[role] ?? "")) {
          missing.push(`${theme.name}.${role}`);
        }
      }
    }

    expect(missing).toEqual([]);
  });

  it("does not fabricate the optional roles adapters degrade around", () => {
    // shadcn declares `success` / `warning` / `info` as *optional*: it consumes
    // them only if a theme declares them. A generated preset must not invent
    // them — a value nothing reads looks like support.
    for (const theme of ALL_PRESETS) {
      const colors = colorsOf(theme);
      for (const role of ["warning", "warningForeground", "info", "infoForeground", "error", "errorForeground"]) {
        expect(colors[role], `${theme.name}.${role}`).toBeUndefined();
      }
    }
  });

  it("satisfies every component state the adapters render", () => {
    const failures: string[] = [];

    for (const theme of ALL_PRESETS) {
      const colors = colorsOf(theme);
      for (const state of COMPONENT_STATES) {
        const fg = colors[state.foreground];
        const bg = colors[state.background];
        if (typeof fg !== "string" || typeof bg !== "string") {
          failures.push(`${theme.name} ${state.component}: missing token`);
          continue;
        }
        const ratio = getContrastRatio(fg, bg);
        if (ratio < state.floor) {
          failures.push(`${theme.name} ${state.component} ${ratio.toFixed(2)} < ${state.floor}`);
        }
      }
    }

    expect(failures.slice(0, 10)).toEqual([]);
    expect(failures).toHaveLength(0);
  });

  it("keeps borders visible but subordinate when mapped to a component boundary", () => {
    // A `border-border` on a card must be seen; it must not become the loudest
    // thing on screen. This is the band the scorecard enforces, restated in the
    // terms a component author would use.
    for (const theme of ALL_PRESETS) {
      const colors = colorsOf(theme);
      const border = colors.border;
      const background = colors.background;
      if (typeof border !== "string" || typeof background !== "string") continue;

      const ratio = getContrastRatio(border, background);
      // Visible: not 1:1. Subordinate: well below a text-level ratio.
      expect(ratio, `${theme.name} border/background`).toBeGreaterThan(1.15);
      expect(ratio, `${theme.name} border/background`).toBeLessThan(4.5);
      expect(DEFAULT_RELATIONSHIP_THRESHOLDS.borderVisibility).toBeGreaterThan(0);
    }
  });

  it("keeps the destructive alert readable, since it is the only status role most adapters have", () => {
    for (const theme of ALL_PRESETS) {
      const colors = colorsOf(theme);
      const fg = colors.destructiveForeground;
      const bg = colors.destructive;
      if (typeof fg !== "string" || typeof bg !== "string") continue;
      expect(getContrastRatio(fg, bg), theme.name).toBeGreaterThanOrEqual(4.5);
    }
  });
});
