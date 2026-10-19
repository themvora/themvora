import { describe, expect, it } from "vitest";
import { defineTheme } from "@themvora/core";
import { createMantineTheme } from "../src/theme";

const dark = defineTheme({
  name: "test",
  meta: { mode: "dark" },
  tokens: {
    colors: {
      background: "#0f172a",
      foreground: "#f8fafc",
      primary: "#fb923c",
      primaryForeground: "#0f172a",
      secondary: "#1e293b",
      accent: "#fdba74",
      destructive: "#f87171",
      border: "#334155",
      muted: "#334155",
      mutedForeground: "#94a3b8",
    },
    radius: { lg: "16px" },
    typography: {
      fontFamilies: { sans: "Inter, sans-serif" },
      fontSizes: { md: "0.875rem" },
    },
    spacing: { md: "1rem" },
    shadows: { md: "0 4px 6px rgba(0,0,0,0.3)" },
    breakpoints: { sm: "640px", md: "768px", lg: "1024px" },
  },
});

describe("createMantineTheme", () => {
  it("sets primaryColor and generates 10 shades", () => {
    const theme = createMantineTheme(dark);
    expect(theme.primaryColor).toBe("primary");
    expect(theme.colors.primary).toHaveLength(10);
    expect(theme.colors.primary[6]).toBe("#fb923c");
  });

  it("reads the base shade in both light and dark mode", () => {
    // The regression guard: `dark: 8` made a filled button render the base
    // blended toward black instead of the theme's primary. Every mode must read
    // the index the base actually occupies.
    const theme = createMantineTheme(dark);
    expect(theme.primaryShade).toEqual({ light: 6, dark: 6 });
  });

  it("resolves the filled variant's content colour from the declared foreground", () => {
    // Regression guard for the unreadable-content class. Mantine's own
    // `autoContrast` can only ever choose between `--mantine-color-black` and
    // `--mantine-color-white`, so a filled button's text ignored the theme's
    // declared `primaryForeground` entirely. The adapter substitutes it through
    // `variantColorResolver` — Mantine's documented theme extension point —
    // rather than by overriding component CSS.
    const theme = createMantineTheme(dark);
    const resolve = theme.variantColorResolver as unknown as (input: {
      color: string;
      theme: unknown;
      variant: string;
    }) => { color?: string };

    // The fixture declares `primaryForeground: "#0f172a"`, which is neither
    // white nor black, so this can only pass if the declared value is used.
    expect(resolve({ color: "primary", theme, variant: "filled" }).color).toBe("#0f172a");

    // Non-filled variants use the role colour as *content*, so a contrast value
    // must not be substituted there.
    expect(resolve({ color: "primary", theme, variant: "outline" }).color).not.toBe("#0f172a");
  });

  it("maps radius and defaultRadius", () => {
    const theme = createMantineTheme(dark);
    expect(theme.radius.lg).toBe("16px");
    expect(theme.defaultRadius).toBe("lg");
  });

  it("maps fontFamily and fontSizes", () => {
    const theme = createMantineTheme(dark);
    expect(theme.fontFamily).toBe("Inter, sans-serif");
    expect(theme.fontSizes.md).toBe("0.875rem");
  });

  it("maps breakpoints", () => {
    const theme = createMantineTheme(dark);
    expect(theme.breakpoints.md).toBe("768px");
  });
});