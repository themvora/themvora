// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { createThemeRuntime, defineTheme, type ThemeDefinition } from "@themvora/core";
import { ThemeProvider, ThemeScope } from "../src";

/**
 * The shared reactivity contract through React: a live configuration change
 * must reach the DOM in the same task, and a scope must not outlive a theme the
 * runtime dropped.
 */

const theme = (name: string, family: string, mode: "light" | "dark", bg: string) =>
  defineTheme({
    name,
    meta: { family, mode },
    tokens: { colors: { background: bg } },
  }) as ThemeDefinition;

const aLight = theme("a-light", "a", "light", "#ffffff");
const aDark = theme("a-dark", "a", "dark", "#111111");
const bLight = theme("b-light", "b", "light", "#eeeeff");

let root: Root | null = null;
let container: HTMLElement | null = null;

function mount(runtime: ReturnType<typeof createThemeRuntime>, themeName: string) {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root!.render(
      <ThemeProvider runtime={runtime}>
        <ThemeScope theme={themeName}>
          <span>scoped</span>
        </ThemeScope>
      </ThemeProvider>,
    );
  });
  return container.querySelector("div") as HTMLElement;
}

afterEach(() => {
  if (root) act(() => root!.unmount());
  root = null;
  container?.remove();
  container = null;
});

describe("react — catalog reactivity", () => {
  it("re-resolves the scope when the catalog drops its theme", () => {
    const runtime = createThemeRuntime({
      themes: [aLight, aDark, bLight],
      dom: false,
      cssVariables: false,
      persistence: null,
      broadcast: null,
    } as never);

    const scope = mount(runtime, "b-light");
    expect(scope.getAttribute("data-theme")).toBe("b-light");

    // `b-light` leaves the catalog while the selection stays valid, so no
    // theme change is published — the catalog is the only signal.
    act(() => {
      runtime.configure({ themes: [aLight, aDark] });
    });

    expect(scope.getAttribute("data-theme")).toBe("a-light");
    expect(scope.style.getPropertyValue("--theme-color-background")).toBe("#ffffff");
  });

  it("picks up a theme that arrives after mount", () => {
    const runtime = createThemeRuntime({
      themes: [aLight],
      dom: false,
      cssVariables: false,
      persistence: null,
      broadcast: null,
    } as never);

    const scope = mount(runtime, "b-light");
    expect(scope.getAttribute("data-theme")).toBe("a-light");

    act(() => {
      runtime.configure({ themes: [aLight, bLight] });
    });

    expect(scope.getAttribute("data-theme")).toBe("b-light");
    expect(scope.style.getPropertyValue("--theme-color-background")).toBe("#eeeeff");
  });

  it("applies a changed defaultTheme without a reload", () => {
    const runtime = createThemeRuntime({
      themes: [aLight, aDark, bLight],
      dom: false,
      cssVariables: false,
      persistence: null,
      broadcast: null,
      defaultTheme: "a-light",
    } as never);

    mount(runtime, "a-light");

    act(() => {
      runtime.configure({ defaultTheme: "a-dark" });
    });

    expect(String(runtime.store.get().name)).toBe("a-dark");
  });

  it("keeps family scopes following the mode across a catalog change", () => {
    const runtime = createThemeRuntime({
      themes: [aLight, aDark, bLight],
      dom: false,
      cssVariables: false,
      persistence: null,
      broadcast: null,
    } as never);

    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    act(() => {
      root!.render(
        <ThemeProvider runtime={runtime}>
          <ThemeScope family="a">
            <span>scoped</span>
          </ThemeScope>
        </ThemeProvider>,
      );
    });
    const scope = container.querySelector("div") as HTMLElement;
    expect(scope.getAttribute("data-theme")).toBe("a-light");

    act(() => {
      runtime.selection.setMode("dark");
    });
    expect(scope.getAttribute("data-theme")).toBe("a-dark");

    act(() => {
      runtime.configure({ themes: [aLight, aDark] });
    });
    // Still dark after the catalog moved.
    expect(scope.getAttribute("data-theme")).toBe("a-dark");
  });
});
