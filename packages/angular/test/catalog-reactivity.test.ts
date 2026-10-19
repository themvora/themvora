// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { DestroyRef, ElementRef, Injector, runInInjectionContext } from "@angular/core";
import { createThemeRuntime, defineTheme, resetDiagnosticEmission } from "@themvora/core";
import { THEME_RUNTIME } from "../src/lib/tokens";
import { ThemeScopeDirective } from "../src/lib/theme-scope.directive";

/**
 * The shared reactivity contract through Angular's directive: a live
 * configuration change must reach the bound element in the same task, and the
 * directive must not keep a theme the runtime dropped — nor lose the scope
 * entirely when its theme is registered late.
 */

const t = (name: string, family: string, mode: "light" | "dark" = "light", bg = "#ffffff") =>
  defineTheme({
    name,
    meta: { family, mode },
    tokens: { colors: { background: bg } },
  });

const aLight = t("a-light", "a");
const aDark = t("a-dark", "a", "dark", "#111111");
const bLight = t("b-light", "b", "light", "#eeeeff");

function mountScope(themes: readonly ReturnType<typeof t>[]) {
  const runtime = createThemeRuntime({
    themes,
    dom: false,
    cssVariables: false,
    persistence: null,
    broadcast: null,
  } as never);

  const el = document.createElement("div");
  document.body.appendChild(el);

  const injector = Injector.create({
    providers: [
      { provide: THEME_RUNTIME, useValue: runtime },
      { provide: ElementRef, useValue: new ElementRef(el) },
      { provide: DestroyRef, useValue: { onDestroy: () => {} } },
    ],
  });

  const directive = runInInjectionContext(injector, () => new ThemeScopeDirective());
  return { directive, el, runtime };
}

afterEach(() => {
  resetDiagnosticEmission();
  vi.restoreAllMocks();
  document.body.innerHTML = "";
});

describe("angular — catalog reactivity", () => {
  it("re-resolves the scope when the catalog drops its theme", () => {
    const { directive, el } = mountScope([aLight, aDark, bLight]);
    directive.themeName = "b-light";
    directive.ngOnChanges();
    expect(el.getAttribute("data-theme")).toBe("b-light");

    (directive as unknown as { runtime: { configure: (u: unknown) => void } }).runtime.configure({
      themes: [aLight, aDark],
    });

    expect(el.getAttribute("data-theme")).toBe("a-light");
    expect(el.style.getPropertyValue("--theme-color-background")).toBe("#ffffff");
  });

  it("applies the scope once the theme it names is registered", () => {
    // The directive bails out when the theme is not registered *yet*; the
    // catalog signal is what makes it retry instead of never applying.
    const { directive, el, runtime } = mountScope([aLight]);
    directive.themeName = "b-light";
    directive.ngOnChanges();
    expect(el.hasAttribute("data-theme")).toBe(false);

    runtime.configure({ themes: [aLight, bLight] });

    expect(el.getAttribute("data-theme")).toBe("b-light");
    expect(el.style.getPropertyValue("--theme-color-background")).toBe("#eeeeff");
  });

  it("releases the scope when the theme attribute is cleared", () => {
    const { directive, el } = mountScope([aLight, aDark, bLight]);
    directive.themeName = "b-light";
    directive.ngOnChanges();
    expect(el.getAttribute("data-theme")).toBe("b-light");

    directive.themeName = "";
    directive.ngOnChanges();

    expect(el.hasAttribute("data-theme")).toBe(false);
    expect(el.style.getPropertyValue("--theme-color-background")).toBe("");
  });
});
