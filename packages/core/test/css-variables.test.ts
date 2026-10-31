// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { createCSSVariablesBinding, createThemeStore } from "../src";
import { defineTheme } from "../src/model";

function flushFrames(count = 2) {
  const frames: Promise<void>[] = [];
  for (let i = 0; i < count; i++) {
    frames.push(new Promise((r) => requestAnimationFrame(() => r())));
  }
  return Promise.all(frames);
}

describe("createCSSVariablesBinding", () => {
  it("applies and clears token groups", async () => {
    const light = defineTheme({
          name: "light",
          tokens: {
            colors: {
              background: "#ffffff",
            },
            spacing: {
              md: "16px",
            },
            radius: {
              lg: "12px",
            },
            shadows: {
              card: "0 10px 30px rgba(0,0,0,0.12)",
            },
            typography: {
              fontFamilies: {
                sans: "Inter, sans-serif",
              },
              fontSizes: {
                base: "16px",
              },
              lineHeights: {
                normal: "1.5",
              },
            },
          },
        });
    const dark = defineTheme({
          name: "dark",
          tokens: {
            colors: {
              background: "#000000",
            },
          },
        });
    const store = createThemeStore({ initialTheme: light });

    const binding = createCSSVariablesBinding(store);

    const style = document.documentElement.style;

    expect(style.getPropertyValue("--theme-color-background")).toBe("#ffffff");
    expect(style.getPropertyValue("--theme-spacing-md")).toBe("16px");
    expect(style.getPropertyValue("--theme-radius-lg")).toBe("12px");
    expect(style.getPropertyValue("--theme-shadow-card")).toBe(
      "0 10px 30px rgba(0,0,0,0.12)",
    );
    expect(style.getPropertyValue("--theme-typography-font-family-sans")).toBe(
      "Inter, sans-serif",
    );
    expect(style.getPropertyValue("--theme-typography-font-size-base")).toBe(
      "16px",
    );
    expect(
      style.getPropertyValue("--theme-typography-line-height-normal"),
    ).toBe("1.5");

store.set(dark);

    // The variables swap on the next animation frame (batched by the
    // coordinator), so flush before asserting the new values.
    await flushFrames();

    expect(style.getPropertyValue("--theme-color-background")).toBe("#000000");
    expect(style.getPropertyValue("--theme-spacing-md")).toBe("");
    expect(style.getPropertyValue("--theme-radius-lg")).toBe("");
    expect(style.getPropertyValue("--theme-shadow-card")).toBe("");
    expect(style.getPropertyValue("--theme-typography-font-family-sans")).toBe(
      "",
    );
    expect(style.getPropertyValue("--theme-typography-font-size-base")).toBe(
      "",
    );
    expect(
      style.getPropertyValue("--theme-typography-line-height-normal"),
    ).toBe("");

    binding.destroy();
  });

  it("clears a pre-existing inline variable the mounted theme does not define", () => {
    // The SSR shell writes the default theme's variables inline. When the theme
    // a runtime mounts with defines fewer groups (a preset with no `code`
    // group), the binding must clear the stale ones instead of leaving them to
    // shadow a `var(--theme-code-*, fallback)` rule.
    const style = document.documentElement.style;
    style.setProperty("--theme-code-background", "#f6f7fc");

    const preset = defineTheme({
      name: "mint-light",
      tokens: { colors: { background: "#e9f3ee" } },
    });
    const store = createThemeStore({ initialTheme: preset });

    const binding = createCSSVariablesBinding(store);

    expect(style.getPropertyValue("--theme-code-background")).toBe("");
    expect(style.getPropertyValue("--theme-color-background")).toBe("#e9f3ee");

    binding.destroy();
    document.documentElement.removeAttribute("style");
  });
  it("survives the suppress-transition style node being detached before the cleanup frame", async () => {
    // The swap path appends a `<style>` that disables transitions and removes it
    // on the second animation frame. The callback is outside any caller's
    // try/catch, so an unguarded `removeChild` on a node whose parent is gone —
    // a host tearing its document down, a test resetting the DOM — surfaces as
    // an uncaught `NotFoundError` in whatever environment happens to be running,
    // not as a failure anyone can attribute. jsdom reports it on `window`.
    const light = defineTheme({ name: "light", tokens: { colors: { background: "#ffffff" } } });
    const dark = defineTheme({ name: "dark", tokens: { colors: { background: "#000000" } } });
    const store = createThemeStore({ initialTheme: light });
    const binding = createCSSVariablesBinding(store);

    store.set(dark, { suppressTransition: true });
    expect(document.head.querySelector("style")).not.toBeNull();

    // Detach it the way a document reset would.
    document.head.innerHTML = "";

    const errors: unknown[] = [];
    const onError = (event: ErrorEvent) => errors.push(event.error ?? event.message);
    window.addEventListener("error", onError);
    try {
      await flushFrames();
    } finally {
      window.removeEventListener("error", onError);
    }

    expect(errors).toEqual([]);
    binding.destroy();
    document.documentElement.removeAttribute("style");
  });
});
