// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  createThemeRuntime,
  generateTheme,
  getBuiltInThemes,
  type ThemeError,
  type ThemeRuntime,
} from "@themvora/core";
import { ThemeProvider } from "../src/provider";
import { useGeneratedTheme } from "../src/hooks";

function NameDemo() {
  const theme = useGeneratedTheme();
  return <span data-testid="name">{theme.name}</span>;
}

function render(runtime: ThemeRuntime<any>): string | null | undefined {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  act(() => {
    root.render(
      <ThemeProvider runtime={runtime}>
        <NameDemo />
      </ThemeProvider>,
    );
  });

  const name = container.querySelector('[data-testid="name"]')?.textContent;

  act(() => {
    root.unmount();
  });
  document.body.removeChild(container);

  return name;
}

function baseOptions(themes: readonly any[]) {
  return {
    themes,
    dom: false as const,
    cssVariables: false as const,
    persistence: null,
  };
}

function serverRender(runtime: ThemeRuntime<any>) {
  return renderToString(
    <ThemeProvider runtime={runtime}>
      <NameDemo />
    </ThemeProvider>,
  );
}

function catchError(fn: () => unknown): unknown {
  try {
    fn();
  } catch (error) {
    return error;
  }
  return undefined;
}

describe("useGeneratedTheme (React)", () => {
  it("returns the registered generated theme the active selection resolves to", () => {
    const { light, dark } = generateTheme({ seed: "#635BFF", family: "brand" });

    const lightRuntime = createThemeRuntime({
      ...baseOptions([light, dark]),
      initialMode: "light",
    });
    expect(render(lightRuntime)).toBe("brand-light");

    const darkRuntime = createThemeRuntime({
      ...baseOptions([light, dark]),
      initialMode: "dark",
    });
    expect(render(darkRuntime)).toBe("brand-dark");
  });

  it("does not qualify an ordinary preset", () => {
    const runtime = createThemeRuntime(baseOptions(getBuiltInThemes()));

    const error = catchError(() => serverRender(runtime));
    expect((error as ThemeError | undefined)?.code).toBe("TV_GENERATION_THEME_NOT_FOUND");
  });

  it("resolves multiple generated themes through the active selection", () => {
    const a = generateTheme({ seed: "#635BFF", family: "a" });
    const b = generateTheme({ seed: "#d97706", family: "b" });

    const runtime = createThemeRuntime({
      ...baseOptions([a.light, a.dark, b.light, b.dark]),
      initialFamily: "b",
      initialMode: "dark",
    });

    expect(render(runtime)).toBe("b-dark");
  });

  it("rejects an ambiguous configuration rather than returning the first entry", () => {
    const a = generateTheme({ seed: "#635BFF", family: "a" });
    const b = generateTheme({ seed: "#d97706", family: "b" });

    // The active theme is a shipped preset, so it does not identify which of the
    // two registered generated themes is meant.
    const runtime = createThemeRuntime({
      themes: [...getBuiltInThemes(), a.light, a.dark, b.light, b.dark],
      defaultTheme: "light",
      dom: false,
      cssVariables: false,
      persistence: null,
    });

    const error = catchError(() => serverRender(runtime));
    expect((error as ThemeError | undefined)?.code).toBe("TV_GENERATION_THEME_AMBIGUOUS");
  });

  it("throws the provider error when there is no ThemeProvider", () => {
    const error = catchError(() => renderToString(<NameDemo />));
    expect(String((error as Error | undefined)?.message)).toMatch(/ThemeProvider/);
  });
});

describe("useGeneratedTheme — registration via runtime.use(pack)", () => {
  function LabelDemo() {
    const theme = useGeneratedTheme();
    return <span data-testid="label">{theme.meta?.label ?? theme.name}</span>;
  }

  it("updates a mounted consumer when a pack changes the generated theme", () => {
    const { light } = generateTheme({ seed: "#635BFF", family: "brand" });

    const runtime = createThemeRuntime({
      themes: [light],
      dom: false,
      cssVariables: false,
      persistence: null,
      broadcast: null,
    });

    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    act(() => {
      root.render(
        <ThemeProvider runtime={runtime}>
          <LabelDemo />
        </ThemeProvider>,
      );
    });

    expect(container.querySelector('[data-testid="label"]')?.textContent).toBe("Brand Light");

    // A pack installs into the registry without touching the store/selection.
    act(() => {
      runtime.use({
        name: "brand",
        themes: [{ ...light, meta: { ...light.meta, label: "Refreshed Light" } }],
      });
    });

    expect(container.querySelector('[data-testid="label"]')?.textContent).toBe("Refreshed Light");

    act(() => {
      root.unmount();
    });
    runtime.destroy();
    document.body.removeChild(container);
  });
});

describe("useGeneratedTheme — registry lifecycle hardening", () => {
  function LabelDemo() {
    const theme = useGeneratedTheme();
    return <span data-testid="label">{theme.meta?.label ?? theme.name}</span>;
  }

  function mountWith(runtime: ThemeRuntime<any>) {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    act(() => {
      root.render(
        <ThemeProvider runtime={runtime}>
          <LabelDemo />
        </ThemeProvider>,
      );
    });
    return {
      label: () => container.querySelector('[data-testid="label"]')?.textContent ?? null,
      cleanup: () => {
        act(() => root.unmount());
        runtime.destroy();
        document.body.removeChild(container);
      },
    };
  }

  const runtimeWith = (themes: readonly any[], options: Record<string, unknown> = {}) =>
    createThemeRuntime({
      themes,
      dom: false,
      cssVariables: false,
      persistence: null,
      broadcast: null,
      ...options,
    } as any);

  it("re-renders and throws after the generated theme is removed (no stale value)", () => {
    const { light } = generateTheme({ seed: "#635BFF", family: "brand" });
    const runtime = runtimeWith([light]);

    const before = renderToString(
      <ThemeProvider runtime={runtime}>
        <LabelDemo />
      </ThemeProvider>,
    );
    expect(before).toContain("Brand Light");

    runtime.registry.unregister("brand-light");

    const error = catchError(() =>
      renderToString(
        <ThemeProvider runtime={runtime}>
          <LabelDemo />
        </ThemeProvider>,
      ),
    );
    expect((error as ThemeError | undefined)?.code).toBe("TV_GENERATION_THEME_NOT_FOUND");
    runtime.destroy();
  });

  it("reflects a restore that replaces the generated theme with no transient error", () => {
    const first = generateTheme({ seed: "#635BFF", family: "brand" }).light;
    const runtime = runtimeWith([first]);
    const mounted = mountWith(runtime);

    expect(mounted.label()).toBe("Brand Light");

    const snapshot = runtime.snapshot();
    act(() => {
      runtime.restore({
        ...snapshot,
        registry: { themes: [{ ...first, meta: { ...first.meta, label: "Restored Light" } }] },
      });
    });

    expect(mounted.label()).toBe("Restored Light");
    mounted.cleanup();
  });

  it("tracks a same-name replacement without throwing from the subscription", () => {
    const { light } = generateTheme({ seed: "#635BFF", family: "brand" });
    const runtime = runtimeWith([light]);
    const mounted = mountWith(runtime);

    expect(mounted.label()).toBe("Brand Light");

    act(() => {
      runtime.registry.replace("brand-light", {
        ...light,
        meta: { ...light.meta, label: "Replaced Light" },
      });
    });

    expect(mounted.label()).toBe("Replaced Light");
    mounted.cleanup();
  });

  it("keeps multiple providers isolated, including nesting", () => {
    const a = generateTheme({ seed: "#635BFF", family: "a" }).light;
    const b = generateTheme({ seed: "#d97706", family: "b" }).light;
    const rtA = runtimeWith([a]);
    const rtB = runtimeWith([b]);

    expect(
      renderToString(
        <ThemeProvider runtime={rtA}>
          <LabelDemo />
        </ThemeProvider>,
      ),
    ).toContain("A Light");

    expect(
      renderToString(
        <ThemeProvider runtime={rtB}>
          <LabelDemo />
        </ThemeProvider>,
      ),
    ).toContain("B Light");

    // The inner provider wins for its subtree.
    expect(
      renderToString(
        <ThemeProvider runtime={rtA}>
          <ThemeProvider runtime={rtB}>
            <LabelDemo />
          </ThemeProvider>
        </ThemeProvider>,
      ),
    ).toContain("B Light");

    rtA.destroy();
    rtB.destroy();
  });

  it("renders the generated theme during SSR", () => {
    const { light } = generateTheme({ seed: "#635BFF", family: "brand" });
    const runtime = runtimeWith([light]);

    const html = renderToString(
      <ThemeProvider runtime={runtime}>
        <LabelDemo />
      </ThemeProvider>,
    );

    expect(html).toContain("Brand Light");
    runtime.destroy();
  });
});
