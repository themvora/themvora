/**
 * The app's theme catalog, declared once for both consumers.
 *
 * `themvoraVitePlugin()` discovers this file at build time and embeds it in the
 * blocking pre-paint script, so the first frame is already themed. The vanilla
 * runtime then reads the same file through the config the plugin injects —
 * `new Themvora()` needs no theme data of its own.
 *
 * Deliberately *not* imported from `@themvora/app-shared`: this example is
 * standalone, so it declares its own brand pair instead of borrowing the
 * suite's fixtures. Preset families still come from `getPresetThemes()`, so the
 * catalog is real theme data rather than a copy of one.
 */
import {
  defineTheme,
  defineThemvoraConfig,
  getFallbackThemes,
  getPresetThemes,
  type ThemeDefinition,
} from "@themvora/core";

const shared = {
  destructive: "#DC2626",
  destructiveForeground: "#FFFFFF",
  success: "#15803D",
  successForeground: "#FFFFFF",
} as const;

/** The app's own brand pair. */
export const custardLight = defineTheme({
  name: "custard-light",
  meta: { family: "custard", mode: "light", label: "Custard Light", order: 5, tags: ["brand"] },
  tokens: {
    colors: {
      background: "#FFFBEB",
      foreground: "#2B2410",

      card: "#FFFFFF",
      cardForeground: "#2B2410",

      popover: "#FFFFFF",
      popoverForeground: "#2B2410",

      primary: "#A16207",
      primaryForeground: "#FFFFFF",

      secondary: "#FEF3C7",
      secondaryForeground: "#78350F",

      muted: "#FDF6E3",
      mutedForeground: "#7A6A45",

      accent: "#FDE68A",
      accentForeground: "#713F12",

      ...shared,

      border: "#EFE4C4",
      input: "#E7D9B0",
      ring: "#A16207",
    },
    radius: { lg: "16px", md: "12px", sm: "8px" },
    shadows: { sm: "#2B2410" },
  },
});

export const custardDark = defineTheme({
  name: "custard-dark",
  meta: { family: "custard", mode: "dark", label: "Custard Dark", order: 5, tags: ["brand"] },
  tokens: {
    colors: {
      background: "#14110A",
      foreground: "#F7F0DC",

      card: "#1C180F",
      cardForeground: "#F7F0DC",

      popover: "#221D12",
      popoverForeground: "#F7F0DC",

      primary: "#FACC15",
      primaryForeground: "#1A1608",

      secondary: "#2A2415",
      secondaryForeground: "#F3E8C8",

      muted: "#201B11",
      mutedForeground: "#B9AC88",

      accent: "#382F18",
      accentForeground: "#FDE68A",

      ...shared,

      border: "#332C1A",
      input: "#3C341F",
      ring: "#FACC15",
    },
    radius: { lg: "16px", md: "12px", sm: "8px" },
    shadows: { sm: "#000000" },
  },
});

/** The names listed in the page's family selector. */
const CATALOG = [
  "light",
  "dark",
  "custard-light",
  "custard-dark",
  "oat-light",
  "oat-dark",
  "plum-light",
  "plum-dark",
] as const;

const available: readonly ThemeDefinition[] = [
  ...getFallbackThemes<ThemeDefinition>(),
  ...getPresetThemes(),
  custardLight,
  custardDark,
];

export const themes: readonly ThemeDefinition[] = CATALOG.flatMap((name) => {
  const theme = available.find((candidate) => String(candidate.name) === name);
  return theme ? [theme] : [];
});

export const defaultTheme = "custard-light";
export const initialMode = "system";

export default defineThemvoraConfig({
  themes,
  defaultTheme,
  initialMode,
});
