// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import {
  createThemeRuntime,
  generateTheme,
  getBuiltInThemes,
  type ThemeDefinition,
  type ThemeError,
} from "@themvora/core";
import { useGeneratedTheme } from "../src/index";
import { setProviderRuntime } from "../src/utils";

function withProvider(
  themes: readonly ThemeDefinition[],
  options: Record<string, unknown> = {},
) {
  const runtime = createThemeRuntime({
    themes,
    dom: false,
    cssVariables: false,
    persistence: null,
    broadcast: null,
    ...options,
  } as any);

  const el = document.createElement("themvora-provider");
  document.body.appendChild(el);
  setProviderRuntime(el as any, runtime as any);
  return runtime;
}

function catchError(fn: () => unknown): unknown {
  try {
    fn();
  } catch (error) {
    return error;
  }
  return undefined;
}

describe("useGeneratedTheme (web components)", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("returns the registered generated theme the active selection resolves to", () => {
    const { light, dark } = generateTheme({ seed: "#635BFF", family: "brand" });

    withProvider([light, dark], { initialMode: "light" });
    expect(useGeneratedTheme().name).toBe("brand-light");
  });

  it("does not qualify an ordinary preset", () => {
    withProvider(getBuiltInThemes());
    const error = catchError(() => useGeneratedTheme());
    expect((error as ThemeError | undefined)?.code).toBe("TV_GENERATION_THEME_NOT_FOUND");
  });

  it("rejects an ambiguous configuration rather than returning the first entry", () => {
    const a = generateTheme({ seed: "#635BFF", family: "a" });
    const b = generateTheme({ seed: "#d97706", family: "b" });

    withProvider([...getBuiltInThemes(), a.light, a.dark, b.light, b.dark], {
      defaultTheme: "light",
    });
    const error = catchError(() => useGeneratedTheme());
    expect((error as ThemeError | undefined)?.code).toBe("TV_GENERATION_THEME_AMBIGUOUS");
  });

  it("throws a provider error when no <themvora-provider> is present", () => {
    const error = catchError(() => useGeneratedTheme());
    expect(String((error as Error | undefined)?.message)).toMatch(/themvora-provider/);
  });

  it("reflects a generated theme installed by a pack (vanilla re-read)", () => {
    const { light } = generateTheme({ seed: "#635BFF", family: "brand" });
    const runtime = withProvider([light]);

    expect(useGeneratedTheme().meta?.label).toBe("Brand Light");

    // Vanilla reads are live, not subscribed — a re-read sees the pack install.
    runtime.use({
      name: "brand",
      themes: [{ ...light, meta: { ...light.meta, label: "Refreshed Light" } }],
    });

    expect(useGeneratedTheme().meta?.label).toBe("Refreshed Light");
  });

  it("throws after the generated theme is removed (live read, no stale value)", () => {
    const { light } = generateTheme({ seed: "#635BFF", family: "brand" });
    const runtime = withProvider([light]);

    expect(useGeneratedTheme().meta?.label).toBe("Brand Light");

    runtime.registry.unregister("brand-light");

    const error = catchError(() => useGeneratedTheme());
    expect((error as ThemeError | undefined)?.code).toBe("TV_GENERATION_THEME_NOT_FOUND");
  });
});
