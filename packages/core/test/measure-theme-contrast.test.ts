import { describe, expect, it } from "vitest";
import { measureThemeContrast } from "../src/generation/scorecard";
import type { ThemeDefinition } from "../src/model/theme";

describe("measureThemeContrast", () => {
  it("includes direction and severity for failing pairs", () => {
    const theme: ThemeDefinition = {
      name: "test",
      tokens: {
        colors: {
          background: "#ffffff",
          foreground: "#999999", // Low contrast with white
          card: "#ffffff",
          cardForeground: "#333333",
          popover: "#ffffff",
          popoverForeground: "#333333",
          primary: "#0000ff",
          primaryForeground: "#ffffff",
          secondary: "#cccccc",
          secondaryForeground: "#333333",
          muted: "#f0f0f0",
          mutedForeground: "#666666",
          accent: "#ff00ff",
          accentForeground: "#ffffff",
          destructive: "#ff0000",
          destructiveForeground: "#ffffff",
          success: "#00ff00",
          successForeground: "#000000",
          border: "#cccccc",
          input: "#cccccc",
          ring: "#0000ff",
        },
      },
    };

    const pairs = measureThemeContrast(theme);
    const fgBgPair = pairs.find((p) => p.foreground === "foreground" && p.background === "background");

    expect(fgBgPair).toBeDefined();
    expect(fgBgPair?.passes).toBe(false);
    expect(fgBgPair?.direction).toBeDefined();
    expect(fgBgPair?.severity).toBeDefined();
    expect(fgBgPair?.ratio).toBeLessThan(4.5);
  });

  it("does not include direction and severity for passing pairs", () => {
    const theme: ThemeDefinition = {
      name: "test",
      tokens: {
        colors: {
          background: "#ffffff",
          foreground: "#000000", // High contrast
          card: "#ffffff",
          cardForeground: "#000000",
          popover: "#ffffff",
          popoverForeground: "#000000",
          primary: "#0000ff",
          primaryForeground: "#ffffff",
          secondary: "#cccccc",
          secondaryForeground: "#000000",
          muted: "#f0f0f0",
          mutedForeground: "#333333",
          accent: "#ff00ff",
          accentForeground: "#ffffff",
          destructive: "#ff0000",
          destructiveForeground: "#ffffff",
          success: "#00ff00",
          successForeground: "#000000",
          border: "#cccccc",
          input: "#cccccc",
          ring: "#0000ff",
        },
      },
    };

    const pairs = measureThemeContrast(theme);
    const fgBgPair = pairs.find((p) => p.foreground === "foreground" && p.background === "background");

    expect(fgBgPair).toBeDefined();
    expect(fgBgPair?.passes).toBe(true);
    expect(fgBgPair?.direction).toBeUndefined();
    expect(fgBgPair?.severity).toBeUndefined();
  });
});
