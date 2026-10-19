import { describe, it, expect, vi, afterEach } from "vitest";
import { DestroyRef, Injector, runInInjectionContext } from "@angular/core";
import {
  createThemeRuntime,
  defineTheme,
  resetDiagnosticEmission,
  type ThemeDefinition,
} from "@themvora/core";
import { THEME_RUNTIME } from "../src/lib/tokens";
import { injectTheme, injectThemeRuntime } from "../src/lib/hooks";

/**
 * Angular's provider is a DI factory, so live configuration is delivered
 * through the injected runtime's `configure()` — the shared core contract.
 * This proves a configuration change reaches Angular consumers without
 * reconstructing the runtime.
 */

const t = (name: string, family: string, mode: "light" | "dark" = "light") =>
  defineTheme({ name, meta: { family, mode }, tokens: { colors: { background: "#fff" } } });

const a = [t("a-light", "a"), t("a-dark", "a", "dark")];
const b = [t("b-light", "b"), t("b-dark", "b", "dark")];

function injectorWith(themes: readonly ThemeDefinition[]) {
  const runtime = createThemeRuntime({
    themes,
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
  return { runtime, injector };
}

afterEach(() => {
  resetDiagnosticEmission();
  vi.restoreAllMocks();
});

describe("Angular — configuration updates via the injected runtime", () => {
  it("updates injectTheme consumers without recreating the runtime", () => {
    const { runtime, injector } = injectorWith(a);

    const state = runInInjectionContext(injector, () => injectTheme());
    expect(state().theme.name).toBe("a-light");

    const resolved = runInInjectionContext(injector, () => injectThemeRuntime());
    expect(resolved).toBe(runtime);

    resolved.configure({ themes: b, defaultTheme: "b-light" });

    expect(state().theme.name).toBe("b-light");
    expect(state().family).toBe("b");
    // Identity preserved — not recreated.
    expect(runInInjectionContext(injector, () => injectThemeRuntime())).toBe(runtime);

    runtime.destroy();
  });

  it("falls back to the neutral theme for an empty catalog", () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const { runtime, injector } = injectorWith(a);

    const state = runInInjectionContext(injector, () => injectTheme());
    runtime.configure({ themes: [] });

    expect(state().theme.meta?.family ?? "default").toBe("default");

    runtime.destroy();
  });

  it("emits the shared unknown-family diagnostic", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const { runtime } = injectorWith(a);

    runtime.configure({ initialFamily: "ghost" });

    expect(error).toHaveBeenCalledTimes(1);
    runtime.destroy();
  });
});
