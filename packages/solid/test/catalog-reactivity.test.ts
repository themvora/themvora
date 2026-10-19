// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { render } from "solid-js/web";
import { createComponent } from "solid-js";
import { ThemeProvider, ThemeScope } from "@themvora/solid";
import { createThemeRuntime, type ThemeDefinition } from "@themvora/core";

/**
 * The shared reactivity contract, exercised through the Solid components:
 * a live configuration change must reach the DOM in the same task, and a
 * scope must not outlive a theme the runtime dropped.
 */

const themes: ThemeDefinition[] = [
  { name: "a-light", meta: { family: "a", mode: "light" }, tokens: { colors: { background: "#ffffff" } } },
  { name: "a-dark", meta: { family: "a", mode: "dark" }, tokens: { colors: { background: "#111111" } } },
  { name: "b-light", meta: { family: "b", mode: "light" }, tokens: { colors: { background: "#eeeeff" } } },
];

let host: HTMLElement;
let dispose: (() => void) | null = null;

function mountScope(runtime: ReturnType<typeof createThemeRuntime>, theme: string) {
  host = document.createElement("div");
  document.body.appendChild(host);
  dispose = render(
    () =>
      createComponent(ThemeProvider, {
        runtime,
        children: () => createComponent(ThemeScope, { theme }),
      }),
    host,
  ) as never;
}

afterEach(() => {
  dispose?.();
  dispose = null;
  host?.remove();
});

describe("solid — catalog reactivity", () => {
  it("re-resolves the scope when the provider's catalog drops its theme", () => {
    const runtime = createThemeRuntime({
      themes,
      dom: false,
      cssVariables: false,
      persistence: null,
      broadcast: null,
    } as never);

    mountScope(runtime, "b-light");
    const scope = host.querySelector("div") as HTMLElement;
    expect(scope.getAttribute("data-theme")).toBe("b-light");

    // `b-light` leaves the catalog. The selection stays valid (family a), so
    // nothing publishes a theme change — the catalog signal is the only hook.
    runtime.configure({ themes: [themes[0]!, themes[1]!] });

    expect(scope.getAttribute("data-theme")).toBe("a-light");
    expect(scope.style.getPropertyValue("--theme-color-background")).toBe("#ffffff");
  });

  it("applies a changed defaultTheme without a reload", () => {
    const runtime = createThemeRuntime({
      themes,
      dom: false,
      cssVariables: false,
      persistence: null,
      broadcast: null,
      defaultTheme: "a-light",
    } as never);

    mountScope(runtime, "a-light");

    runtime.configure({ defaultTheme: "a-dark" });

    expect(String(runtime.store.get().name)).toBe("a-dark");
    expect(host.querySelector("div")?.getAttribute("data-theme")).toBe("a-light");
  });

  it("picks up a theme that arrives after mount", () => {
    const runtime = createThemeRuntime({
      themes: [themes[0]!],
      dom: false,
      cssVariables: false,
      persistence: null,
      broadcast: null,
    } as never);

    // The scope asks for a theme the catalog does not have yet: the documented
    // fallback is the catalog's first theme, and it resolves once registered.
    mountScope(runtime, "b-light");
    const scope = host.querySelector("div") as HTMLElement;
    expect(scope.getAttribute("data-theme")).toBe("a-light");

    runtime.configure({ themes: [themes[0]!, themes[2]!] });

    expect(scope.getAttribute("data-theme")).toBe("b-light");
    expect(scope.style.getPropertyValue("--theme-color-background")).toBe("#eeeeff");
  });
});
