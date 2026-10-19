// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import {
  createThemeRuntime,
  generateTheme,
  getBuiltInThemes,
  type ThemeDefinition,
  type ThemeError,
} from "@themvora/core";
import { useGeneratedTheme } from "../src/hooks";
import { setGlobalRuntime } from "../src/shared-runtime";

function NameDemo() {
  const theme = useGeneratedTheme();
  return (
    <span>
      {theme.name}|{theme.meta?.label}
    </span>
  );
}

function install(themes: readonly ThemeDefinition[], options: Record<string, unknown> = {}) {
  const runtime = createThemeRuntime({
    themes,
    dom: false,
    cssVariables: false,
    persistence: null,
    ...options,
  } as any);
  setGlobalRuntime(runtime as any);
}

function render(): string {
  return renderToStaticMarkup(<NameDemo />);
}

function catchError(fn: () => unknown): unknown {
  try {
    fn();
  } catch (error) {
    return error;
  }
  return undefined;
}

describe("useGeneratedTheme (Astro client)", () => {
  // Must run first: no runtime has been installed yet.
  it("throws the provider error when no runtime is installed", () => {
    const error = catchError(() => render());
    expect(String((error as Error | undefined)?.message)).toMatch(/ThemeRuntime not initialized/);
  });

  it("returns the registered generated theme the active selection resolves to", () => {
    const { light, dark } = generateTheme({ seed: "#635BFF", family: "brand" });

    install([light, dark], { initialMode: "light" });
    expect(render()).toContain("brand-light");

    install([light, dark], { initialMode: "dark" });
    expect(render()).toContain("brand-dark");
  });

  it("does not qualify an ordinary preset", () => {
    install(getBuiltInThemes());
    const error = catchError(() => render());
    expect((error as ThemeError | undefined)?.code).toBe("TV_GENERATION_THEME_NOT_FOUND");
  });

  it("rejects an ambiguous configuration rather than returning the first entry", () => {
    const a = generateTheme({ seed: "#635BFF", family: "a" });
    const b = generateTheme({ seed: "#d97706", family: "b" });

    install([...getBuiltInThemes(), a.light, a.dark, b.light, b.dark], {
      defaultTheme: "light",
    });
    const error = catchError(() => render());
    expect((error as ThemeError | undefined)?.code).toBe("TV_GENERATION_THEME_AMBIGUOUS");
  });

  it("reflects a generated theme installed by a pack", () => {
    const { light } = generateTheme({ seed: "#635BFF", family: "brand" });
    install([light]);

    expect(render()).toContain("Brand Light");

    const runtime = createThemeRuntime({
      themes: [light],
      dom: false,
      cssVariables: false,
      persistence: null,
      broadcast: null,
    } as any);
    setGlobalRuntime(runtime as any);
    runtime.use({
      name: "brand",
      themes: [{ ...light, meta: { ...light.meta, label: "Refreshed Light" } }],
    });

    expect(render()).toContain("Refreshed Light");
  });
});
