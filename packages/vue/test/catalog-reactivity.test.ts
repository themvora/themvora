// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { createApp, defineComponent, h, nextTick } from "vue";
import { createThemeRuntime, defineTheme, type ThemeDefinition } from "@themvora/core";
import { ThemeProvider, ThemeScope } from "../src/index";

/**
 * The shared reactivity contract through Vue: a live configuration change must
 * reach the DOM in the same task, and a scope must not outlive a theme the
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

/** Settles Vue's post-flush watchers plus the runtime's own batched notify. */
async function settle() {
  await nextTick();
  await new Promise((resolve) => setTimeout(resolve, 20));
}

describe("vue — catalog reactivity", () => {
  it("re-resolves the scope when the catalog drops its theme", async () => {
    const runtime = createThemeRuntime({
      themes: [aLight, aDark, bLight],
      dom: false,
      cssVariables: false,
      persistence: null,
      broadcast: null,
    } as never);

    const el = document.createElement("div");
    document.body.appendChild(el);
    const app = createApp({
      render: () =>
        h(ThemeProvider, { runtime }, { default: () => h(ThemeScope, { theme: "b-light" }) }),
    });
    app.mount(el);
    await settle();

    const scope = el.querySelector("div") as HTMLElement;
    expect(scope.getAttribute("data-theme")).toBe("b-light");

    runtime.configure({ themes: [aLight, aDark] });
    await settle();

    expect(scope.getAttribute("data-theme")).toBe("a-light");
    expect(scope.style.getPropertyValue("--theme-color-background")).toBe("#ffffff");

    app.unmount();
  });

  it("picks up a theme that arrives after mount", async () => {
    const runtime = createThemeRuntime({
      themes: [aLight],
      dom: false,
      cssVariables: false,
      persistence: null,
      broadcast: null,
    } as never);

    const el = document.createElement("div");
    document.body.appendChild(el);
    const app = createApp({
      render: () =>
        h(ThemeProvider, { runtime }, { default: () => h(ThemeScope, { theme: "b-light" }) }),
    });
    app.mount(el);
    await settle();

    const scope = el.querySelector("div") as HTMLElement;
    expect(scope.getAttribute("data-theme")).toBe("a-light");

    runtime.configure({ themes: [aLight, bLight] });
    await settle();

    expect(scope.getAttribute("data-theme")).toBe("b-light");
    expect(scope.style.getPropertyValue("--theme-color-background")).toBe("#eeeeff");

    app.unmount();
  });

  it("re-resolves a family scope when the mode and the catalog both change", async () => {
    const runtime = createThemeRuntime({
      themes: [aLight, aDark, bLight],
      dom: false,
      cssVariables: false,
      persistence: null,
      broadcast: null,
    } as never);

    const el = document.createElement("div");
    document.body.appendChild(el);
    const app = createApp({
      render: () =>
        h(ThemeProvider, { runtime }, { default: () => h(ThemeScope, { family: "a" }) }),
    });
    app.mount(el);
    await settle();

    const scope = el.querySelector("div") as HTMLElement;
    expect(scope.getAttribute("data-theme")).toBe("a-light");

    runtime.selection.setMode("dark");
    await settle();
    expect(scope.getAttribute("data-theme")).toBe("a-dark");

    runtime.configure({ themes: [aLight, aDark] });
    await settle();
    expect(scope.getAttribute("data-theme")).toBe("a-dark");

    app.unmount();
  });
});
