// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { defineTheme, resetDiagnosticEmission } from "@themvora/core";
import { createBlockingScriptContent } from "../src/lib/blocking-script";
import { injectProvidedThemes } from "../src/lib/hooks";
import { THEME_RUNTIME } from "../src/lib/tokens";
import { DestroyRef, Injector, runInInjectionContext } from "@angular/core";
import { createThemeRuntime } from "@themvora/core";

/**
 * Angular parity: the blocking script honours `themeOverride`, and
 * `injectProvidedThemes()` exposes the provider's own collection.
 */

const themes = [
  defineTheme({ name: "a-light", meta: { family: "a", mode: "light" }, tokens: { colors: { background: "#ffffff" } } }),
  defineTheme({ name: "a-dark", meta: { family: "a", mode: "dark" }, tokens: { colors: { background: "#000000" } } }),
  defineTheme({ name: "b-light", meta: { family: "b", mode: "light" }, tokens: { colors: { background: "#111111" } } }),
];

function runScripts(html: string) {
  const host = document.createElement("div");
  host.innerHTML = html;
  for (const script of Array.from(host.querySelectorAll("script"))) {
    new Function(script.textContent ?? "")();
  }
  return host;
}

beforeEach(() => {
  resetDiagnosticEmission();
  window.localStorage.clear();
  document.documentElement.removeAttribute("data-theme-family");
  document.documentElement.removeAttribute("data-theme-mode");
  document.documentElement.classList.remove("dark");
});

afterEach(() => {
  window.localStorage.clear();
});

describe("Angular blocking script — themeOverride", () => {
  it("applies the override over a persisted selection", () => {
    window.localStorage.setItem(
      "theme-selection",
      JSON.stringify({ mode: "light", family: "b" }),
    );

    runScripts(
      createBlockingScriptContent(themes, null, { themeOverride: "a-dark" }),
    );

    expect(document.documentElement.getAttribute("data-theme-family")).toBe("a");
    expect(document.documentElement.getAttribute("data-theme-mode")).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("does not change what is stored", () => {
    const saved = JSON.stringify({ mode: "light", family: "b" });
    window.localStorage.setItem("theme-selection", saved);

    runScripts(createBlockingScriptContent(themes, null, { themeOverride: "a-dark" }));

    expect(window.localStorage.getItem("theme-selection")).toBe(saved);
  });

  it("keeps the persisted selection without an override", () => {
    window.localStorage.setItem(
      "theme-selection",
      JSON.stringify({ mode: "dark", family: "a" }),
    );

    runScripts(createBlockingScriptContent(themes, null, {}));

    expect(document.documentElement.getAttribute("data-theme-family")).toBe("a");
    expect(document.documentElement.getAttribute("data-theme-mode")).toBe("dark");
  });
});

describe("injectProvidedThemes — Angular", () => {
  it("exposes the provider's families and follows the registry", () => {
    const runtime = createThemeRuntime({
      themes,
      dom: false,
      cssVariables: false,
      persistence: null,
      broadcast: null,
    } as never);

    const injector = Injector.create({
      providers: [
        { provide: THEME_RUNTIME, useValue: runtime },
        { provide: DestroyRef, useValue: { onDestroy: () => {} } },
      ],
    });

    const families = runInInjectionContext(injector, () =>
      injectProvidedThemes<never>(),
    );

    expect(families().map((family) => family.family)).toEqual(["a", "b"]);
    expect(families()[0]!.variants).toHaveLength(2);

    runtime.registry.unregister("b-light");
    expect(families().map((family) => family.family)).toEqual(["a"]);

    // Tearing the runtime down must not throw with a live signal subscriber.
    runtime.destroy();
  });
});
