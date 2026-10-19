// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { createThemeRuntime, defineTheme, type ThemeDefinition } from "@themvora/core";
import { ThemeScope } from "../src/theme-scope";
import { setGlobalRuntime } from "../src/shared-runtime";

// React's documented opt-in for `act()` outside a test renderer.
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * The shared reactivity contract through the Astro island: a live
 * configuration change must reach the DOM in the same task, and a scope must
 * not outlive a theme the runtime dropped.
 */

const t = (name: string, family: string, mode: "light" | "dark", bg: string) =>
  defineTheme({
    name,
    meta: { family, mode },
    tokens: { colors: { background: bg } },
  }) as ThemeDefinition;

const aLight = t("a-light", "a", "light", "#ffffff");
const aDark = t("a-dark", "a", "dark", "#111111");
const bLight = t("b-light", "b", "light", "#eeeeff");

let root: Root | null = null;
let container: HTMLElement | null = null;

function mount(runtime: ReturnType<typeof createThemeRuntime>, themeName: string) {
  setGlobalRuntime(runtime);
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root!.render(<ThemeScope theme={themeName}>scoped</ThemeScope>);
  });
  return container.querySelector("div") as HTMLElement;
}

afterEach(() => {
  if (root) act(() => root!.unmount());
  root = null;
  container?.remove();
  container = null;
});

describe("astro — catalog reactivity", () => {
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

  it("re-reads the catalog a pack installs with use()", () => {
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
      runtime.use({ name: "extra", themes: [bLight] });
    });

    expect(scope.getAttribute("data-theme")).toBe("b-light");
  });
});
