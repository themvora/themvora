// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import {
  createThemeRuntime,
  defineTheme,
  createCSSVariablesBinding,
  createDOMBinding,
} from "../src/index";

const themes = [
  defineTheme({
    name: "mint-light",
    meta: { family: "mint", mode: "light", label: "Mint Light", order: 10 },
    tokens: { colors: { background: "#f8fafc", card: "#ffffff", primary: "#059669" } },
  }),
  defineTheme({
    name: "mint-dark",
    meta: { family: "mint", mode: "dark", label: "Mint Dark", order: 20 },
    tokens: { colors: { background: "#020617", card: "#0f172a", primary: "#10b981" } },
  }),
];

function flushAnimationFrames(count = 4) {
  const frames: Promise<void>[] = [];
  for (let i = 0; i < count; i++) {
    frames.push(new Promise((r) => requestAnimationFrame(() => r())));
  }
  return Promise.all(frames);
}

describe("default transition behavior (no transition option)", () => {
  afterEach(() => {
    document.head.querySelectorAll("style[data-themvora-transition]").forEach((n) => n.remove());
    document.head
      .querySelectorAll("style[data-themvora-animating-style]")
      .forEach((n) => n.remove());
    document.documentElement.removeAttribute("data-themvora-animating");
    document.documentElement.removeAttribute("style");
    document.documentElement.removeAttribute("data-theme");
  });

  it("swaps in one step with the default transition when no option is passed", async () => {
    const runtime = createThemeRuntime({
      themes,
      defaultTheme: "mint-light",
      dom: false,
      cssVariables: false,
      persistence: null,
    });

    const css = createCSSVariablesBinding(runtime.store, {});
    const el = document.documentElement;

    // Toggle: colors change → the planner reports a duration → the fallback
    // opens a suppression window around the swap.
    runtime.selection.toggleTheme();

    // The swap is synchronous and atomic. There is no persistent `:root`
    // transition rule, so nothing interpolates the `--theme-*` values — that is
    // what keeps adapter-driven components and the token surfaces in step.
    expect(el.style.getPropertyValue("--theme-color-background")).toBe("#020617");
    expect(el.style.transition).toBe("");
    expect(
      document.head.querySelector("style[data-themvora-transition]"),
    ).toBeNull();

    // The default duration is spent muting descendants, not easing variables.
    expect(el.hasAttribute("data-themvora-animating")).toBe(true);
    expect(
      document.head.querySelector("style[data-themvora-animating-style]"),
    ).not.toBeNull();

    await flushAnimationFrames();
    expect(el.style.getPropertyValue("--theme-color-background")).toBe("#020617");

    css?.destroy();
    runtime.destroy();
  });
});
