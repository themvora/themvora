// @vitest-environment jsdom
import { describe, expect, it, beforeEach } from "vitest";
import { createThemeRuntime, defineTheme } from "../src";

function flushFrames(count = 2) {
  const frames: Promise<void>[] = [];
  for (let i = 0; i < count; i++) {
    frames.push(new Promise((r) => requestAnimationFrame(() => r())));
  }
  return Promise.all(frames);
}

beforeEach(() => {
  // Isolate file-level state shared by the runtime's default persistence and
  // the DOM bindings: reset styles, clear stored selection, and undo any attrs
  // a prior test left on the shared <html>.
  document.documentElement.style.cssText = "";
  document.querySelectorAll('style[data-themvora-transition]').forEach((n) => n.remove());
  document
    .querySelectorAll("style[data-themvora-animating-style]")
    .forEach((n) => n.remove());
  document
    .querySelectorAll("style[data-themvora-view-transition-timing]")
    .forEach((n) => n.remove());
  document.documentElement.removeAttribute("data-themvora-animating");
  document.documentElement.classList.remove("dark");
  document.documentElement.removeAttribute("data-theme");
  window.localStorage.clear();
});

describe("theme transitions", () => {
  const themes = [
    defineTheme({
      name: "light",
      meta: { family: "default", mode: "light" },
      tokens: {
        colors: {
          background: "#ffffff",
          foreground: "#000000",
        },
      },
    }),
    defineTheme({
      name: "dark",
      meta: { family: "default", mode: "dark" },
      tokens: {
        colors: {
          background: "#000000",
          foreground: "#ffffff",
        },
      },
    }),
  ];

  it("swaps the theme custom properties in one step when the API is unavailable", async () => {
    const runtime = createThemeRuntime({
      themes,
      initialMode: "light",
      transition: { enabled: true, duration: 300, easing: "ease-in-out" },
    });

    // Boot applies the baseline instantly — no transition is attached.
    expect(document.documentElement.style.transition).toBe("");

    runtime.selection.setMode("dark");

    // No View Transition in jsdom, so the fallback runs — and it must NOT
    // interpolate the variables. Adapter-driven libraries re-render with the
    // new tokens synchronously, so an interpolated `--theme-*` fade would leave
    // those components finished while every token surface was still mid-fade:
    // the page sits half-switched for the whole duration. The swap is one step,
    // and no `:root` transition rule is installed.
    expect(document.documentElement.style.transition).toBe("");
    expect(
      document.documentElement.style.getPropertyValue("--theme-color-background"),
    ).toBe("#000000");

    // What the duration buys is a window in which descendant transitions are
    // muted, so nothing eases into the new palette behind the swap.
    expect(
      document.documentElement.hasAttribute("data-themvora-animating"),
    ).toBe(true);
    expect(
      document.head.querySelector("style[data-themvora-animating-style]"),
    ).not.toBeNull();

    await flushFrames();
    expect(
      document.documentElement.style.getPropertyValue("--theme-color-background"),
    ).toBe("#000000");

    runtime.destroy();
  });

  it("uses the View Transition API for the cross-fade when enabled and supported", async () => {
    const calls: string[] = [];
    (document as any).startViewTransition = (cb: () => void) => {
      calls.push("startViewTransition");
      const result = cb();
      return {
        ready: Promise.resolve(),
        finished: Promise.resolve(result),
      };
    };
    try {
      const runtime = createThemeRuntime({
        themes,
        initialMode: "light",
        transition: {
          enabled: true,
          duration: 300,
          useViewTransition: true,
        },
      });

      runtime.selection.setMode("dark");

      // The cross-fade is owned by the View Transition, so the redundant,
      // double-applying CSS transition must NOT be injected.
      expect(calls).toContain("startViewTransition");
      expect(document.documentElement.style.transition).toBe("");

      // The new variables apply inside the transition callback (no frame
      // batching, no CSS easing), so they are in place immediately.
      expect(
        document.documentElement.style.getPropertyValue("--theme-color-background"),
      ).toBe("#000000");

      runtime.destroy();
    } finally {
      delete (document as any).startViewTransition;
    }
  });

  it("applies the configured duration and easing to the native crossfade", async () => {
    // The UA's default crossfade ignores `transition.duration`, so a supported
    // browser used to render every configured duration identically.
    let finish = () => {};
    (document as any).startViewTransition = (cb: () => Promise<void>) => {
      const result = cb();
      return {
        ready: Promise.resolve(),
        finished: new Promise<void>((resolve) => {
          finish = resolve;
          void result;
        }),
      };
    };
    try {
      const runtime = createThemeRuntime({
        themes,
        initialMode: "light",
        transition: {
          enabled: true,
          duration: 600,
          easing: "ease-in-out",
          useViewTransition: true,
        },
      });

      runtime.selection.setMode("dark");

      const sheet = document.querySelector<HTMLStyleElement>(
        "style[data-themvora-view-transition-timing]",
      );
      expect(sheet).not.toBeNull();
      expect(sheet?.textContent).toContain("animation-duration:600ms");
      expect(sheet?.textContent).toContain("animation-timing-function:ease-in-out");

      finish();
      await Promise.resolve();
      await Promise.resolve();

      // Scoped to this crossfade: a later navigation transition keeps its own
      // timing instead of inheriting the theme's.
      expect(
        document.querySelector("style[data-themvora-view-transition-timing]"),
      ).toBeNull();

      runtime.destroy();
    } finally {
      delete (document as any).startViewTransition;
    }
  });

  it("swaps atomically when the API is requested but unsupported", async () => {
    const runtime = createThemeRuntime({
      themes,
      initialMode: "light",
      transition: {
        enabled: true,
        duration: 300,
        useViewTransition: true, // requested, but startViewTransition absent
      },
    });

    runtime.selection.setMode("dark");

    // Requested-but-absent is not a reason to fall back to interpolation: the
    // two paths differ in *how* the change is painted, not in whether it is
    // atomic. There is no crossfade and no variable easing here — the swap is
    // immediate and only descendant transitions are muted.
    expect(document.documentElement.style.transition).toBe("");
    expect(
      document.documentElement.style.getPropertyValue("--theme-color-background"),
    ).toBe("#000000");
    expect(
      document.documentElement.hasAttribute("data-themvora-animating"),
    ).toBe(true);

    await flushFrames();
    expect(
      document.documentElement.style.getPropertyValue("--theme-color-background"),
    ).toBe("#000000");

    runtime.destroy();
  });

  it("does not add transition when disabled", () => {
    const runtime = createThemeRuntime({
      themes,
      initialMode: "light",
      dom: false,
      cssVariables: false,
    });

    expect(document.documentElement.style.transition).toBe("");

    runtime.destroy();
  });

  it("does not add transition when enabled but dom is disabled", () => {
    const runtime = createThemeRuntime({
      themes,
      initialMode: "light",
      transition: { enabled: true },
      dom: false,
      cssVariables: false,
    });

    expect(document.documentElement.style.transition).toBe("");

    runtime.destroy();
  });
});
