// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import {
  buildBootstrapPlan,
  createThemeBootstrapScript,
  createThemeRuntime,
  defineTheme,
  serializeThemeBootstrapScript,
} from "../src";

/**
 * The override must be part of the pre-paint resolution, not a post-mount
 * correction. A script that only applied it after hydration would paint the
 * saved theme first — the exact flash the bootstrap exists to prevent.
 */

const themes = [
  defineTheme({
    name: "mint-light",
    meta: { family: "mint", mode: "light" },
    tokens: { colors: { background: "#f0fff4", foreground: "#052e16" } },
  }),
  defineTheme({
    name: "mint-dark",
    meta: { family: "mint", mode: "dark" },
    tokens: { colors: { background: "#052e16", foreground: "#f0fff4" } },
  }),
  defineTheme({
    name: "oat-light",
    meta: { family: "oat", mode: "light" },
    tokens: { colors: { background: "#fdf6e3", foreground: "#1c1917" } },
  }),
] as const;

function runScript(script: string) {
  new Function(script)();
}

afterEach(() => {
  window.localStorage.removeItem("theme-selection");
  document.documentElement.removeAttribute("style");
  document.documentElement.removeAttribute("data-theme");
  document.documentElement.removeAttribute("data-theme-mode");
  document.documentElement.removeAttribute("data-theme-family");
  document.documentElement.removeAttribute("data-theme-selection-family");
  document.documentElement.removeAttribute("data-theme-selection-mode");
  document.documentElement.removeAttribute("data-theme-ready");
  document.documentElement.classList.remove("dark");
});

describe("buildBootstrapPlan with a theme override", () => {
  it("records the resolved override", () => {
    const plan = buildBootstrapPlan(themes, { themeOverride: "mint-dark" });

    expect(plan.override).toEqual({ family: "mint", mode: "dark" });
    expect(plan.fallbackFamily).toBe("mint");
    expect(plan.fallbackMode).toBe("dark");
  });

  it("leaves the plan untouched when the override cannot be resolved", () => {
    const plan = buildBootstrapPlan(themes, { themeOverride: "nope" });

    expect(plan.override).toBeNull();
    expect(plan.fallbackFamily).toBe("mint");
  });

  it("resolves a partial family request against the plan's own mode", () => {
    const plan = buildBootstrapPlan(themes, {
      initialMode: "dark",
      themeOverride: { family: "oat" },
    });

    expect(plan.override).toEqual({ family: "oat", mode: "dark" });
  });
});

describe("family identifiers in the bootstrap plan", () => {
  it("resolves a family defaultTheme", () => {
    const plan = buildBootstrapPlan(themes, { defaultTheme: "oat" });

    expect(plan.fallbackFamily).toBe("oat");
    expect(plan.fallbackMode).toBe("light");
  });

  it("resolves a family themeOverride into the pre-paint plan", () => {
    const plan = buildBootstrapPlan(themes, { themeOverride: "mint" });

    expect(plan.override).toEqual({ family: "mint", mode: "light" });
    expect(plan.fallbackFamily).toBe("mint");
  });

  it("paints a family override instead of the persisted selection", () => {
    window.localStorage.setItem(
      "theme-selection",
      JSON.stringify({ mode: "light", family: "oat" }),
    );

    runScript(createThemeBootstrapScript({ themes, themeOverride: "mint" }));

    // The first frame is the override, not the saved family corrected later.
    expect(document.documentElement.getAttribute("data-theme")).toBe("mint-light");
    expect(document.documentElement.getAttribute("data-theme-family")).toBe("mint");
  });
});

describe("createThemeBootstrapScript with a theme override", () => {
  it("applies the override over a conflicting persisted selection", () => {
    window.localStorage.setItem(
      "theme-selection",
      JSON.stringify({ mode: "light", family: "oat" }),
    );

    runScript(createThemeBootstrapScript({ themes, themeOverride: "mint-dark" }));

    const el = document.documentElement;
    expect(el.getAttribute("data-theme")).toBe("mint-dark");
    expect(el.getAttribute("data-theme-family")).toBe("mint");
    expect(el.getAttribute("data-theme-selection-family")).toBe("mint");
    expect(el.style.getPropertyValue("--theme-color-background")).toBe("#052e16");
    expect(el.classList.contains("dark")).toBe(true);
  });

  it("applies the override when nothing is persisted", () => {
    window.localStorage.removeItem("theme-selection");

    runScript(createThemeBootstrapScript({ themes, themeOverride: "mint-dark" }));

    expect(document.documentElement.getAttribute("data-theme")).toBe("mint-dark");
  });

  it("does not change what is stored", () => {
    const saved = JSON.stringify({ mode: "light", family: "oat" });
    window.localStorage.setItem("theme-selection", saved);

    runScript(createThemeBootstrapScript({ themes, themeOverride: "mint-dark" }));

    expect(window.localStorage.getItem("theme-selection")).toBe(saved);
  });

  it("still resolves the persisted selection without an override", () => {
    window.localStorage.setItem(
      "theme-selection",
      JSON.stringify({ mode: "light", family: "oat" }),
    );

    runScript(createThemeBootstrapScript({ themes }));

    expect(document.documentElement.getAttribute("data-theme")).toBe("oat-light");
  });

  it("escapes an override that would terminate the script element", () => {
    const hostile = [
      defineTheme({
        name: "</script><img src=x onerror=alert(1)>",
        meta: { family: "evil", mode: "light" },
        tokens: { colors: { background: "#ffffff" } },
      }),
    ];

    const script = createThemeBootstrapScript({
      themes: hostile,
      themeOverride: "</script><img src=x onerror=alert(1)>",
    });

    expect(script).not.toContain("</script");
    expect(script).not.toContain("<img");
  });

  it("leaves the runtime nothing to correct on first render", () => {
    // The whole point of putting the override in the pre-paint plan: the script
    // paints X, and the runtime that mounts afterwards adopts X. If these two
    // disagreed, the visitor would see the persisted theme for one frame and
    // then a correction — the reported flash.
    window.localStorage.setItem(
      "theme-selection",
      JSON.stringify({ mode: "dark", family: "oat" }),
    );

    runScript(createThemeBootstrapScript({ themes, themeOverride: "mint" }));

    const painted = document.documentElement.getAttribute("data-theme");
    const paintedFamily = document.documentElement.getAttribute("data-theme-family");
    expect(painted).toBe("mint-light");
    expect(paintedFamily).toBe("mint");

    // A runtime created with the same props, adopting the bootstrap handoff.
    const runtime = createThemeRuntime({
      themes,
      defaultTheme: "oat-light",
      themeOverride: "mint",
      dom: false,
      cssVariables: false,
      broadcast: null,
    });

    expect(runtime.store.get().name).toBe(painted);
    expect(runtime.selection.getFamily()).toBe(paintedFamily);
    runtime.destroy();
  });

  it("serializes the override through the cookie source too", () => {
    const plan = buildBootstrapPlan(themes, { themeOverride: "mint-dark" });
    const script = serializeThemeBootstrapScript(plan, {
      kind: "cookies",
      names: { mode: "theme-mode", family: "theme-family", fingerprint: "theme-fingerprint" },
    });

    expect(script).toContain("if(ov){mode0=ov.mode;fam0=ov.family;}");
  });
});
