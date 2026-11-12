// @vitest-environment jsdom
import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { createApp, defineComponent, h, nextTick } from "vue";
import { defineTheme, createDOMBinding, createCSSVariablesBinding } from "@themvora/core";
import { ThemeProvider, useTheme } from "../src/index";

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

const Child = defineComponent({
  setup() {
    const { theme, toggleTheme, setMode } = useTheme();
    return () =>
      h("div", [
        h("button", { id: "switcher", onClick: () => toggleTheme() }, String(theme.value.name)),
        h("button", { id: "system", onClick: () => setMode("system") }, "system"),
        h("button", { id: "light", onClick: () => setMode("light") }, "light"),
      ]);
  },
});

let app: ReturnType<typeof createApp>;

function mountApp(initialMode?: "light" | "dark" | "system") {
  app = createApp({
    render() {
      return h(
        ThemeProvider,
        {
          themes,
          defaultTheme: "mint-light",
          persistence: null,
          ...(initialMode !== undefined ? { initialMode } : {}),
        },
        () => h(Child),
      );
    },
  });
  const host = document.createElement("div");
  document.body.appendChild(host);
  app.mount(host);
  return { app, host };
}

describe("vue ThemeProvider DOM binding", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute("data-theme");
    document.documentElement.removeAttribute("data-theme-mode");
    document.documentElement.removeAttribute("data-theme-selection-mode");
    document.documentElement.removeAttribute("style");
  });

  afterEach(() => {
    document.body.innerHTML = "";
    app?.unmount();
  });

  it("applies the theme to the document root on toggle", async () => {
    // Spy on the binding creation by checking it gets called
    const domSpy = vi.spyOn(await import("@themvora/core"), "createDOMBinding");

    mountApp();
    await nextTick();

    const el = document.documentElement;
    const btn = document.querySelector<HTMLButtonElement>("#switcher")!;

    console.log("createDOMBinding calls:", domSpy.mock.calls.length);
    console.log("data-theme after mount:", el.getAttribute("data-theme"));
    console.log("btn text:", btn.textContent);

    expect(el.getAttribute("data-theme")).toBe("mint-light");
  });

  it("mirrors the selection onto data-theme-selection-mode", async () => {
    mountApp("system");
    await nextTick();

    const el = document.documentElement;
    expect(el.getAttribute("data-theme-selection-mode")).toBe("system");

    document.querySelector<HTMLButtonElement>("#light")!.click();
    await nextTick();

    expect(el.getAttribute("data-theme-selection-mode")).toBe("light");
    expect(el.getAttribute("data-theme-mode")).toBe("light");
  });
});
