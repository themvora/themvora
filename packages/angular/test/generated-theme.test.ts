import { describe, it, expect } from "vitest";
import { DestroyRef, Injector, runInInjectionContext } from "@angular/core";
import {
  createThemeRuntime,
  generateTheme,
  getBuiltInThemes,
  type ThemeDefinition,
  type ThemeError,
} from "@themvora/core";
import { THEME_RUNTIME } from "../src/lib/tokens";
import { injectGeneratedTheme } from "../src/lib/hooks";

function makeInjector(
  themes: readonly ThemeDefinition[],
  options: Record<string, unknown> = {},
): Injector {
  const runtime = createThemeRuntime({
    themes,
    dom: false,
    cssVariables: false,
    persistence: null,
    ...options,
  } as any);

  return Injector.create({
    providers: [
      { provide: THEME_RUNTIME, useValue: runtime },
      // A minimal DestroyRef so the hook can register its teardown.
      { provide: DestroyRef, useValue: { onDestroy: () => {} } },
    ],
  });
}

function catchError(fn: () => unknown): unknown {
  try {
    fn();
  } catch (error) {
    return error;
  }
  return undefined;
}

describe("injectGeneratedTheme (Angular)", () => {
  it("returns the registered generated theme the active selection resolves to", () => {
    const { light, dark } = generateTheme({ seed: "#635BFF", family: "brand" });

    const lightSignal = runInInjectionContext(makeInjector([light, dark], { initialMode: "light" }), () =>
      injectGeneratedTheme(),
    );
    expect(lightSignal().name).toBe("brand-light");

    const darkSignal = runInInjectionContext(makeInjector([light, dark], { initialMode: "dark" }), () =>
      injectGeneratedTheme(),
    );
    expect(darkSignal().name).toBe("brand-dark");
  });

  it("does not qualify an ordinary preset", () => {
    const error = catchError(() =>
      runInInjectionContext(makeInjector(getBuiltInThemes()), () => injectGeneratedTheme()),
    );
    expect((error as ThemeError | undefined)?.code).toBe("TV_GENERATION_THEME_NOT_FOUND");
  });

  it("rejects an ambiguous configuration rather than returning the first entry", () => {
    const a = generateTheme({ seed: "#635BFF", family: "a" });
    const b = generateTheme({ seed: "#d97706", family: "b" });

    const error = catchError(() =>
      runInInjectionContext(
        makeInjector([...getBuiltInThemes(), a.light, a.dark, b.light, b.dark], {
          defaultTheme: "light",
        }),
        () => injectGeneratedTheme(),
      ),
    );
    expect((error as ThemeError | undefined)?.code).toBe("TV_GENERATION_THEME_AMBIGUOUS");
  });

  it("throws the provider error when there is no runtime provider", () => {
    const error = catchError(() =>
      runInInjectionContext(Injector.create({ providers: [] }), () => injectGeneratedTheme()),
    );
    // Angular's established convention: its own DI error naming the token.
    expect(error).toBeInstanceOf(Error);
    expect(String((error as Error).message)).toMatch(/themvora\/runtime/);
  });

  it("updates a mounted consumer when a pack changes the generated theme", () => {
    const { light } = generateTheme({ seed: "#635BFF", family: "brand" });
    const runtime = createThemeRuntime({
      themes: [light],
      dom: false,
      cssVariables: false,
      persistence: null,
      broadcast: null,
    } as any);

    const injector = Injector.create({
      providers: [
        { provide: THEME_RUNTIME, useValue: runtime },
        { provide: DestroyRef, useValue: { onDestroy: () => {} } },
      ],
    });

    const theme = runInInjectionContext(injector, () => injectGeneratedTheme());
    expect(theme().meta?.label).toBe("Brand Light");

    runtime.use({
      name: "brand",
      themes: [{ ...light, meta: { ...light.meta, label: "Refreshed Light" } }],
    });

    expect(theme().meta?.label).toBe("Refreshed Light");
    runtime.destroy();
  });
});

describe("injectGeneratedTheme — registry lifecycle hardening (Angular)", () => {
  const runtimeWith = (themes: readonly ThemeDefinition[]) =>
    createThemeRuntime({
      themes,
      dom: false,
      cssVariables: false,
      persistence: null,
      broadcast: null,
    } as any);

  const injectorFor = (runtime: any) =>
    Injector.create({
      providers: [
        { provide: THEME_RUNTIME, useValue: runtime },
        { provide: DestroyRef, useValue: { onDestroy: () => {} } },
      ],
    });

  it("surfaces a removed generated theme at read (no stale value)", () => {
    const { light } = generateTheme({ seed: "#635BFF", family: "brand" });
    const runtime = runtimeWith([light]);
    const theme = runInInjectionContext(injectorFor(runtime), () => injectGeneratedTheme());

    expect(theme().meta?.label).toBe("Brand Light");

    runtime.registry.unregister("brand-light");

    const error = catchError(() => theme());
    expect((error as ThemeError | undefined)?.code).toBe("TV_GENERATION_THEME_NOT_FOUND");
    runtime.destroy();
  });

  it("tracks a same-name replacement", () => {
    const { light } = generateTheme({ seed: "#635BFF", family: "brand" });
    const runtime = runtimeWith([light]);
    const theme = runInInjectionContext(injectorFor(runtime), () => injectGeneratedTheme());

    expect(theme().meta?.label).toBe("Brand Light");

    runtime.registry.replace("brand-light", {
      ...light,
      meta: { ...light.meta, label: "Replaced Light" },
    });

    expect(theme().meta?.label).toBe("Replaced Light");
    runtime.destroy();
  });
});
