import { describe, expect, it } from "vitest";
import { defineTheme } from "@themvora/core";
import { buildChakraConfig } from "../src/theme";
import { resolveAdapterSource } from "@themvora/adapters";

const dark = defineTheme({
  name: "test",
  meta: { mode: "dark" },
  tokens: {
    colors: {
      background: "#0f172a",
      foreground: "#f8fafc",
      card: "#1e293b",
      primary: "#fb923c",
      primaryForeground: "#0f172a",
      secondary: "#1e293b",
      secondaryForeground: "#f8fafc",
      muted: "#334155",
      mutedForeground: "#94a3b8",
      accent: "#fdba74",
      destructive: "#f87171",
      border: "#334155",
      ring: "#fb923c",
    },
    radius: { lg: "16px" },
    typography: {
      fontFamilies: { sans: "Inter, sans-serif" },
    },
  },
});

describe("buildChakraConfig", () => {
  const config = buildChakraConfig(resolveAdapterSource(dark));

  it("generates a 50-950 scale with the base color at 500 (Chakra's solid shade)", () => {
    const scale = config.tokens.colors.primary as Record<string, { value: string }>;
    expect(scale["500"].value).toBe("#fb923c");
    expect(Object.keys(scale)).toHaveLength(11);
    expect(scale["50"].value).not.toBe("#fb923c");
  });

  it("places the theme primary at the shade `solid` reads", () => {
    // The regression guard for the defect this used to have: the base sat at
    // 600 while `solid` pointed at 500, so a filled colorPalette button could
    // never render the theme's primary. Deriving the shade from `solid` keeps
    // the two from drifting apart again.
    const scale = config.tokens.colors.primary as Record<string, { value: string }>;
    const semantic = config.semanticTokens.colors as Record<string, { value: string }>;
    const solidRef = (semantic.primary as Record<string, { value: string }>).solid.value;
    const shade = solidRef.replace("{colors.primary.", "").replace("}", "");
    expect(scale[shade].value).toBe("#fb923c");
  });

  it("maps semantic colors", () => {
    const semantic = config.semanticTokens.colors as Record<string, { value: string }>;
    expect(semantic.background.value).toBe("#0f172a");
    expect(semantic.foreground.value).toBe("#f8fafc");
    // primary/accent/secondary/destructive are palette-semantic objects
    expect(
      (semantic.primary as Record<string, { value: string }>).solid.value,
    ).toBe("{colors.primary.500}");
    expect(
      (semantic.destructive as Record<string, { value: string }>).solid.value,
    ).toBe("{colors.destructive.500}");
  });

  it("routes the palette contrast colour through the theme's declared foreground", () => {
    // Regression guard for the unreadable-content class: `contrast` is the
    // content colour on a `solid` surface (a filled colorPalette button). It
    // used to be shade `100` of the generated scale — a pale tint — so a palette
    // declaring a *dark* foreground still rendered light content on the button.
    const semantic = config.semanticTokens.colors as Record<string, { value: string }>;
    const contrastOf = (name: string) =>
      (semantic[name] as Record<string, { value: string }>).contrast.value;

    expect(contrastOf("primary")).toBe("#0f172a"); // fixture's primaryForeground
    expect(contrastOf("secondary")).toBe("#f8fafc"); // fixture's secondaryForeground
    // The fixture declares no destructiveForeground, so the documented fallback
    // applies — asserted so a future change to the fallback is deliberate.
    expect(contrastOf("destructive")).toBe("#ffffff");
  });

  it("maps fonts and radii", () => {
    const tokens = config.tokens as {
      fonts: Record<string, { value: string }>;
      radii: Record<string, { value: string }>;
    };
    expect(tokens.fonts.body.value).toBe("Inter, sans-serif");
    expect(tokens.radii.lg.value).toBe("16px");
  });
});