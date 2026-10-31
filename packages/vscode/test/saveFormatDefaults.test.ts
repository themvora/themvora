/**
 * Tests for origin-aware save format selection.
 *
 * Verifies that:
 * 1. Format suggestions match theme origin
 * 2. Origin detection works from metadata
 * 3. Format validation catches incompatibilities
 * 4. Payload builders extract correct options
 */
import { describe, expect, it } from "vitest";

import { defineTheme, generateTheme } from "@themvora/core";

import {
  buildGeneratePayload,
  buildPresetPayload,
  detectThemeOrigin,
  suggestSaveFormat,
  validateSaveFormat,
} from "../src/domain/saveFormatDefaults.js";

describe("suggestSaveFormat", () => {
  it("suggests ts-generate for generated themes", () => {
    const format = suggestSaveFormat("generated", true);
    expect(format).toBe("ts-generate");
  });

  it("suggests ts-generate when hasGenerateOptions is true", () => {
    const format = suggestSaveFormat(undefined, true);
    expect(format).toBe("ts-generate");
  });

  it("suggests ts-preset for catalog themes", () => {
    const format = suggestSaveFormat("catalog", false);
    expect(format).toBe("ts-preset");
  });

  it("suggests ts for definition themes", () => {
    const format = suggestSaveFormat("definition", false);
    expect(format).toBe("ts");
  });

  it("suggests json for unknown origin", () => {
    const format = suggestSaveFormat(undefined, false);
    expect(format).toBe("json");
  });
});

describe("detectThemeOrigin", () => {
  it("detects generated origin from generation metadata", () => {
    const pair = generateTheme({ seed: "#0066cc" });
    const origin = detectThemeOrigin(pair.light);
    expect(origin).toBe("generated");
  });

  it("detects catalog origin from known family", () => {
    const theme = defineTheme({
      name: "oat-light",
      meta: { family: "oat", mode: "light" },
      tokens: {
        colors: {
          background: "#ffffff",
          foreground: "#000000",
          primary: "#0066cc",
          card: "#f5f5f5",
          cardForeground: "#111111",
          popover: "#ffffff",
          popoverForeground: "#000000",
          primaryForeground: "#ffffff",
          secondary: "#e5e5e5",
          secondaryForeground: "#111111",
          muted: "#f5f5f5",
          mutedForeground: "#666666",
          accent: "#e5e5e5",
          accentForeground: "#111111",
          destructive: "#cc0000",
          destructiveForeground: "#ffffff",
          success: "#00cc00",
          successForeground: "#ffffff",
          border: "#dddddd",
          input: "#dddddd",
          ring: "#0066cc",
        },
      },
    });

    const origin = detectThemeOrigin(theme);
    expect(origin).toBe("catalog");
  });

  it("detects definition origin for custom themes", () => {
    const theme = defineTheme({
      name: "my-custom-theme",
      meta: { family: "my-custom" },
      tokens: {
        colors: {
          background: "#ffffff",
          foreground: "#000000",
          primary: "#0066cc",
          card: "#f5f5f5",
          cardForeground: "#111111",
          popover: "#ffffff",
          popoverForeground: "#000000",
          primaryForeground: "#ffffff",
          secondary: "#e5e5e5",
          secondaryForeground: "#111111",
          muted: "#f5f5f5",
          mutedForeground: "#666666",
          accent: "#e5e5e5",
          accentForeground: "#111111",
          destructive: "#cc0000",
          destructiveForeground: "#ffffff",
          success: "#00cc00",
          successForeground: "#ffffff",
          border: "#dddddd",
          input: "#dddddd",
          ring: "#0066cc",
        },
      },
    });

    const origin = detectThemeOrigin(theme);
    expect(origin).toBe("definition");
  });
});

describe("validateSaveFormat", () => {
  it("rejects empty theme list", () => {
    const error = validateSaveFormat("json", []);
    expect(error).toBe("No themes to save.");
  });

  it("rejects ts-generate without seed", () => {
    const theme = defineTheme({
      name: "test",
      tokens: {
        colors: {
          background: "#ffffff",
          foreground: "#000000",
          primary: "#0066cc",
          card: "#f5f5f5",
          cardForeground: "#111111",
          popover: "#ffffff",
          popoverForeground: "#000000",
          primaryForeground: "#ffffff",
          secondary: "#e5e5e5",
          secondaryForeground: "#111111",
          muted: "#f5f5f5",
          mutedForeground: "#666666",
          accent: "#e5e5e5",
          accentForeground: "#111111",
          destructive: "#cc0000",
          destructiveForeground: "#ffffff",
          success: "#00cc00",
          successForeground: "#ffffff",
          border: "#dddddd",
          input: "#dddddd",
          ring: "#0066cc",
        },
      },
    });

    const error = validateSaveFormat("ts-generate", [theme]);
    expect(error).toContain("requires a seed");
  });

  it("accepts ts-generate with seed", () => {
    const pair = generateTheme({ seed: "#0066cc" });
    const error = validateSaveFormat("ts-generate", [pair.light, pair.dark]);
    expect(error).toBeUndefined();
  });

  it("rejects ts-preset for non-catalog themes", () => {
    const theme = defineTheme({
      name: "test",
      meta: { family: "my-custom" },
      tokens: {
        colors: {
          background: "#ffffff",
          foreground: "#000000",
          primary: "#0066cc",
          card: "#f5f5f5",
          cardForeground: "#111111",
          popover: "#ffffff",
          popoverForeground: "#000000",
          primaryForeground: "#ffffff",
          secondary: "#e5e5e5",
          secondaryForeground: "#111111",
          muted: "#f5f5f5",
          mutedForeground: "#666666",
          accent: "#e5e5e5",
          accentForeground: "#111111",
          destructive: "#cc0000",
          destructiveForeground: "#ffffff",
          success: "#00cc00",
          successForeground: "#ffffff",
          border: "#dddddd",
          input: "#dddddd",
          ring: "#0066cc",
        },
      },
    });

    const error = validateSaveFormat("ts-preset", [theme]);
    expect(error).toContain("only for catalog themes");
  });

  it("accepts json for any theme", () => {
    const theme = defineTheme({
      name: "test",
      tokens: {
        colors: {
          background: "#ffffff",
          foreground: "#000000",
          primary: "#0066cc",
          card: "#f5f5f5",
          cardForeground: "#111111",
          popover: "#ffffff",
          popoverForeground: "#000000",
          primaryForeground: "#ffffff",
          secondary: "#e5e5e5",
          secondaryForeground: "#111111",
          muted: "#f5f5f5",
          mutedForeground: "#666666",
          accent: "#e5e5e5",
          accentForeground: "#111111",
          destructive: "#cc0000",
          destructiveForeground: "#ffffff",
          success: "#00cc00",
          successForeground: "#ffffff",
          border: "#dddddd",
          input: "#dddddd",
          ring: "#0066cc",
        },
      },
    });

    const error = validateSaveFormat("json", [theme]);
    expect(error).toBeUndefined();
  });
});

describe("buildGeneratePayload", () => {
  it("extracts seed from generation metadata", () => {
    const pair = generateTheme({ seed: "#0066cc" });
    const payload = buildGeneratePayload(pair.light);
    expect(payload).toBeDefined();
    expect(payload?.seed).toBe("#0066cc");
  });

  it("extracts family from metadata", () => {
    const pair = generateTheme({ seed: "#0066cc", family: "my-theme" });
    const payload = buildGeneratePayload(pair.light);
    expect(payload).toBeDefined();
    expect(payload?.family).toBe("my-theme");
  });

  it("extracts style from generation metadata", () => {
    const pair = generateTheme({ seed: "#0066cc", style: "vibrant" });
    const payload = buildGeneratePayload(pair.light);
    expect(payload).toBeDefined();
    expect(payload?.style).toBe("vibrant");
  });

  it("records whether code tokens were generated", () => {
    expect(buildGeneratePayload(generateTheme({ seed: "#0066cc" }).light)?.withCode).toBe(false);
    expect(buildGeneratePayload(generateTheme({ seed: "#0066cc", withCode: true }).light)?.withCode).toBe(true);
  });

  it("returns undefined for non-generated themes", () => {
    const theme = defineTheme({
      name: "test",
      tokens: {
        colors: {
          background: "#ffffff",
          foreground: "#000000",
          primary: "#0066cc",
          card: "#f5f5f5",
          cardForeground: "#111111",
          popover: "#ffffff",
          popoverForeground: "#000000",
          primaryForeground: "#ffffff",
          secondary: "#e5e5e5",
          secondaryForeground: "#111111",
          muted: "#f5f5f5",
          mutedForeground: "#666666",
          accent: "#e5e5e5",
          accentForeground: "#111111",
          destructive: "#cc0000",
          destructiveForeground: "#ffffff",
          success: "#00cc00",
          successForeground: "#ffffff",
          border: "#dddddd",
          input: "#dddddd",
          ring: "#0066cc",
        },
      },
    });

    const payload = buildGeneratePayload(theme);
    expect(payload).toBeUndefined();
  });
});

describe("buildPresetPayload", () => {
  it("returns undefined for non-catalog themes", () => {
    const theme = defineTheme({
      name: "test",
      meta: { family: "my-custom" },
      tokens: {
        colors: {
          background: "#ffffff",
          foreground: "#000000",
          primary: "#0066cc",
          card: "#f5f5f5",
          cardForeground: "#111111",
          popover: "#ffffff",
          popoverForeground: "#000000",
          primaryForeground: "#ffffff",
          secondary: "#e5e5e5",
          secondaryForeground: "#111111",
          muted: "#f5f5f5",
          mutedForeground: "#666666",
          accent: "#e5e5e5",
          accentForeground: "#111111",
          destructive: "#cc0000",
          destructiveForeground: "#ffffff",
          success: "#00cc00",
          successForeground: "#ffffff",
          border: "#dddddd",
          input: "#dddddd",
          ring: "#0066cc",
        },
      },
    });

    const payload = buildPresetPayload(theme);
    expect(payload).toBeUndefined();
  });
});
