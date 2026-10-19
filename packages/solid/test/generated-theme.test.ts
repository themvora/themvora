// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render } from "solid-js/web";
import { createComponent, createEffect, createComputed } from "solid-js";
import {
  createThemeRuntime,
  generateTheme,
  getBuiltInThemes,
  type ThemeDefinition,
  type ThemeError,
} from "@themvora/core";
import { ThemeProvider, useGeneratedTheme } from "@themvora/solid";

function NameDemo() {
  const theme = useGeneratedTheme();
  const el = document.createElement("span");
  el.id = "name";
  el.textContent = theme().name;
  return el;
}

function mount(
  themes: readonly ThemeDefinition[],
  options: Record<string, unknown> = {},
): { error: unknown; name: () => string | null; dispose: () => void } {
  const host = document.createElement("div");
  document.body.appendChild(host);

  try {
    const dispose = render(
      () =>
        createComponent(ThemeProvider, {
          themes,
          persistence: null,
          dom: false,
          cssVariables: false,
          ...options,
          children: () => createComponent(NameDemo),
        }),
      host,
    );
    return {
      error: undefined,
      name: () => host.querySelector("#name")?.textContent ?? null,
      dispose,
    };
  } catch (error) {
    return { error, name: () => null, dispose: () => {} };
  }
}

describe("useGeneratedTheme (Solid)", () => {
  it("returns the registered generated theme the active selection resolves to", () => {
    const { light, dark } = generateTheme({ seed: "#635BFF", family: "brand" });

    const lightMount = mount([light, dark], { initialMode: "light" });
    expect(lightMount.name()).toBe("brand-light");
    lightMount.dispose();

    const darkMount = mount([light, dark], { initialMode: "dark" });
    expect(darkMount.name()).toBe("brand-dark");
    darkMount.dispose();
  });

  it("does not qualify an ordinary preset", () => {
    const { error } = mount(getBuiltInThemes());
    expect((error as ThemeError | undefined)?.code).toBe("TV_GENERATION_THEME_NOT_FOUND");
  });

  it("rejects an ambiguous configuration rather than returning the first entry", () => {
    const a = generateTheme({ seed: "#635BFF", family: "a" });
    const b = generateTheme({ seed: "#d97706", family: "b" });

    const { error } = mount(
      [...getBuiltInThemes(), a.light, a.dark, b.light, b.dark],
      { defaultTheme: "light" },
    );
    expect((error as ThemeError | undefined)?.code).toBe("TV_GENERATION_THEME_AMBIGUOUS");
  });

  it("throws the provider error when there is no ThemeProvider", () => {
    const host = document.createElement("div");
    document.body.appendChild(host);

    let captured: unknown;
    try {
      render(() => createComponent(NameDemo), host);
    } catch (error) {
      captured = error;
    }

    expect(String((captured as Error | undefined)?.message)).toMatch(/ThemeProvider/);
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

    function LabelDemo() {
      const theme = useGeneratedTheme();
      const el = document.createElement("span");
      el.id = "label";
      createEffect(() => {
        el.textContent = theme().meta?.label ?? theme().name;
      });
      return el;
    }

    const host = document.createElement("div");
    document.body.appendChild(host);
    const dispose = render(
      () =>
        createComponent(ThemeProvider, {
          runtime,
          themes: [light],
          children: () => createComponent(LabelDemo),
        }),
      host,
    );

    expect(host.querySelector("#label")?.textContent).toBe("Brand Light");

    runtime.use({
      name: "brand",
      themes: [{ ...light, meta: { ...light.meta, label: "Refreshed Light" } }],
    });

    expect(host.querySelector("#label")?.textContent).toBe("Refreshed Light");
    dispose();
    runtime.destroy();
  });
});

describe("useGeneratedTheme — registry lifecycle hardening (Solid)", () => {
  const runtimeWith = (themes: readonly ThemeDefinition[]) =>
    createThemeRuntime({
      themes,
      dom: false,
      cssVariables: false,
      persistence: null,
      broadcast: null,
    } as any);

  it("surfaces a removed generated theme at read (no stale value)", () => {
    const { light } = generateTheme({ seed: "#635BFF", family: "brand" });
    const runtime = runtimeWith([light]);

    let captured: unknown;
    function Probe() {
      const theme = useGeneratedTheme();
      createComputed(() => {
        try {
          theme();
        } catch (error) {
          captured = error;
        }
      });
      const el = document.createElement("span");
      el.id = "probe";
      el.textContent = theme().name;
      return el;
    }

    const host = document.createElement("div");
    document.body.appendChild(host);
    render(
      () =>
        createComponent(ThemeProvider, {
          runtime,
          themes: [light],
          children: () => createComponent(Probe),
        }),
      host,
    );

    runtime.registry.unregister("brand-light");

    expect((captured as ThemeError | undefined)?.code).toBe("TV_GENERATION_THEME_NOT_FOUND");
    runtime.destroy();
  });

  it("tracks a same-name replacement", () => {
    const { light } = generateTheme({ seed: "#635BFF", family: "brand" });
    const runtime = runtimeWith([light]);

    function Probe() {
      const theme = useGeneratedTheme();
      const el = document.createElement("span");
      el.id = "label";
      createEffect(() => {
        el.textContent = theme().meta?.label ?? theme().name;
      });
      return el;
    }

    const host = document.createElement("div");
    document.body.appendChild(host);
    const dispose = render(
      () =>
        createComponent(ThemeProvider, {
          runtime,
          themes: [light],
          children: () => createComponent(Probe),
        }),
      host,
    );

    expect(host.querySelector("#label")?.textContent).toBe("Brand Light");

    runtime.registry.replace("brand-light", {
      ...light,
      meta: { ...light.meta, label: "Replaced Light" },
    });

    expect(host.querySelector("#label")?.textContent).toBe("Replaced Light");
    dispose();
    runtime.destroy();
  });
});
