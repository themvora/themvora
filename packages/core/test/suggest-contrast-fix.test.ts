import { describe, expect, it } from "vitest";
import { suggestContrastFix } from "../src/generation/scorecard";
import type { ThemeDefinition } from "../src/model/theme";

describe("suggestContrastFix", () => {
  it("returns undefined for a passing pair", () => {
    const theme: ThemeDefinition = {
      name: "test",
      tokens: {
        colors: {
          background: "#ffffff",
          foreground: "#000000",
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

    const suggestion = suggestContrastFix(theme, "foreground", "background");
    expect(suggestion).toBeUndefined();
  });

  it("suggests a fix for a failing pair", () => {
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

    const suggestion = suggestContrastFix(theme, "foreground", "background");
    expect(suggestion).toBeDefined();
    expect(suggestion?.token).toBe("foreground");
    expect(suggestion?.value).toBeDefined();
    expect(suggestion?.value).not.toBe("#999999");
  });

  it("returns undefined for missing tokens", () => {
    const theme: ThemeDefinition = {
      name: "test",
      tokens: {
        colors: {
          background: "#ffffff",
          // foreground is missing
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

    const suggestion = suggestContrastFix(theme, "foreground", "background");
    expect(suggestion).toBeUndefined();
  });

  it("prefers the safer adjustment when both are possible", () => {
    const theme: ThemeDefinition = {
      name: "test",
      tokens: {
        colors: {
          background: "#ffffff",
          foreground: "#aaaaaa", // Low contrast
          card: "#ffffff",
          cardForeground: "#aaaaaa", // Also low contrast
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

    const suggestion = suggestContrastFix(theme, "foreground", "background");
    expect(suggestion).toBeDefined();
    // The suggestion should not break card/cardForeground if possible.
    expect(suggestion?.breaksExisting).toBe(false);
  });
});
