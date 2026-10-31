/**
 * Canonical theme fixtures for the Themvora example app suite.
 *
 * This is the single source of truth for the custom "themvora" brand pair and
 * the selected preset families. Every app registers `themes`; none of them
 * re-declares a palette. Preset families are pulled from the core preset
 * catalog (`getPresetThemes()`), never hardcoded.
 *
 * Mirrors `examples/apps/react/src/themes/themes.ts`.
 */
import { defineTheme, getPresetThemes } from "@themvora/core";

export const brandThemes = [
  defineTheme({
    name: "themvora-default-light",
    meta: {
      family: "themvora",
      mode: "light",
      label: "Themvora Light",
      order: 10,
      tags: ["docs-site"],
    },
    tokens: {
      colors: {
        background: "#F8F9FF",
        foreground: "#17172B",

        card: "#FFFFFF",
        cardForeground: "#17172B",

        popover: "#FFFFFF",
        popoverForeground: "#17172B",

        primary: "#635BFF",
        primaryForeground: "#FFFFFF",

        secondary: "#EEEFFF",
        secondaryForeground: "#29264A",

        muted: "#F0F1FA",
        mutedForeground: "#686B85",

        accent: "#E9E7FF",
        accentForeground: "#4F46D8",

        destructive: "#F05265",
        destructiveForeground: "#FFFFFF",

        success: "#159C72",
        successForeground: "#FFFFFF",

        border: "#E2E4F2",
        input: "#DDE0F0",

        ring: "#635BFF",
      },
      radius: { lg: "12px" },
      shadows: { sm: "#17172B" },
    },
  }),

  defineTheme({
    name: "themvora-default-dark",
    meta: {
      family: "themvora",
      mode: "dark",
      label: "Themvora Dark",
      order: 10,
      tags: ["docs-site"],
    },
    tokens: {
      colors: {
        background: "#0A0B14",
        foreground: "#F0F0FF",

        card: "#111321",
        cardForeground: "#F0F0FF",

        popover: "#17192A",
        popoverForeground: "#F0F0FF",

        primary: "#8178FF",
        primaryForeground: "#0A0B14",

        secondary: "#1A1C30",
        secondaryForeground: "#E8E8FF",

        muted: "#151727",
        mutedForeground: "#999CB8",

        accent: "#25234A",
        accentForeground: "#C7C2FF",

        destructive: "#FF6878",
        destructiveForeground: "#180B10",

        success: "#22C58B",
        successForeground: "#06251B",

        border: "#292B41",
        input: "#30324A",

        ring: "#8178FF",
      },
      radius: { lg: "12px", md: "10px" },
      borderWidths: {},
      breakpoints: {},
      shadows: {},
      spacing: {},
      typography: {},
      zIndex: {},
    },
  }),
];

/** Selectable families shown in the "Presets" chip row. */
export const selection = ["themvora", "citrus", "cocoa", "berry"];

/** Preset families pulled from the core catalog and filtered to `selection`. */
export const presetThemes = getPresetThemes().filter((theme) =>
  selection.includes(theme.meta?.family ?? ""),
);

/** The full theme registry every app registers. */
export const themes = [...brandThemes, ...presetThemes];

/** Registered theme name used when nothing is persisted. */
export const defaultTheme = "themvora-default-light";

/** Mode applied when nothing is persisted. */
export const initialMode = "light";

/** Shared transition config. */
export const transition = {
  enabled: true,
  duration: 250,
  easing: "ease-in-out",
};

/** Selectable modes for the mode segment control. */
export const modes = ["light", "dark", "system"];

/** Color tokens shown in the live-preview swatch list. */
export const previewColors = ["primary", "secondary", "accent", "muted"];

/** Family used by the scoped-theme region. */
export const scopedTheme = "cocoa";
