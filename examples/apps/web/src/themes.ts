/**
 * The app's own theme pack.
 *
 * Deliberately *not* imported from `@themvora/app-shared`: this example is
 * standalone, so it declares its own palette instead of borrowing the suite's
 * fixtures. It is also not part of the page's initial catalog — the lab loads it
 * at runtime with `runtime.use(pack)` to demonstrate the catalog signal.
 *
 * `defineTheme` validates the definition and normalises the metadata, so the
 * runtime can index it by family and mode.
 */
import {
  defineTheme,
  type ThemeDefinition,
  type ThemePack,
} from "@themvora/core";

const shared = {
  destructive: "#DC2626",
  destructiveForeground: "#FFFFFF",
  success: "#15803D",
  successForeground: "#FFFFFF",
} as const;

export const solarLight = defineTheme({
  name: "solar-light",
  meta: {
    family: "solar",
    mode: "light",
    label: "Solar Light",
    order: 5,
    tags: ["brand"],
  },
  tokens: {
    colors: {
      background: "#FFFBF5",
      foreground: "#2A1F14",

      card: "#FFFFFF",
      cardForeground: "#2A1F14",

      popover: "#FFFFFF",
      popoverForeground: "#2A1F14",

      primary: "#C2410C",
      primaryForeground: "#FFFFFF",

      secondary: "#FDF0E3",
      secondaryForeground: "#7A3E12",

      muted: "#F7EEE3",
      mutedForeground: "#7C6A58",

      accent: "#FFE8CC",
      accentForeground: "#9A3412",

      ...shared,

      border: "#EFE2D2",
      input: "#E7D8C5",
      ring: "#C2410C",
    },
    radius: { lg: "16px", md: "12px", sm: "8px" },
    shadows: { sm: "#2A1F14" },
  },
});

export const solarDark = defineTheme({
  name: "solar-dark",
  meta: {
    family: "solar",
    mode: "dark",
    label: "Solar Dark",
    order: 5,
    tags: ["brand"],
  },
  tokens: {
    colors: {
      background: "#16100A",
      foreground: "#F7EDE2",

      card: "#1F1710",
      cardForeground: "#F7EDE2",

      popover: "#241B13",
      popoverForeground: "#F7EDE2",

      primary: "#FB923C",
      primaryForeground: "#1A1008",

      secondary: "#2A1F15",
      secondaryForeground: "#F3DFC9",

      muted: "#221A12",
      mutedForeground: "#B9A48C",

      accent: "#3A2717",
      accentForeground: "#FFD7AE",

      ...shared,

      border: "#33261A",
      input: "#3C2D1F",
      ring: "#FB923C",
    },
    radius: { lg: "16px", md: "12px", sm: "8px" },
    shadows: { sm: "#000000" },
  },
});

/** The pack the lab installs with `runtime.use(...)`. */
export const solarPack: ThemePack<ThemeDefinition> = {
  name: "solar",
  themes: [solarLight, solarDark],
};
/** Registered name used by the "select the brand theme" action. */
export const solarDefaultTheme = solarLight.name;
