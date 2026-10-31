// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { createApp, defineComponent, h, nextTick, ref } from "vue";
import { defineTheme } from "@themvora/core";
import { ThemeProvider, useProvidedThemes, useTheme } from "../src/index";

/**
 * Vue parity for the two provider features: the discovery composable and the
 * one-shot `theme-override` prop.
 */

const themes = [
  defineTheme({ name: "alpha-light", meta: { family: "alpha", mode: "light" }, tokens: { colors: { background: "#ffffff" } } }),
  defineTheme({ name: "alpha-dark", meta: { family: "alpha", mode: "dark" }, tokens: { colors: { background: "#000000" } } }),
  defineTheme({ name: "beta-light", meta: { family: "beta", mode: "light" }, tokens: { colors: { background: "#111111" } } }),
];

const baseProps = {
  dom: false,
  cssVariables: false,
  persistence: null,
  broadcast: null,
};

function mount(providerProps: Record<string, unknown>, probe: ReturnType<typeof defineComponent>) {
  const el = document.createElement("div");
  document.body.appendChild(el);
  const app = createApp({
    render: () => h(ThemeProvider, { ...baseProps, ...providerProps }, { default: () => h(probe) }),
  });
  app.mount(el);
  return {
    app,
    el,
    unmount: () => {
      app.unmount();
      document.body.removeChild(el);
    },
  };
}

describe("useProvidedThemes — Vue", () => {
  const Probe = defineComponent({
    setup() {
      const families = useProvidedThemes();
      return () =>
        h(
          "span",
          { "data-families": "" },
          families.value.map((family) => `${family.family}:${family.variants.length}`).join("|"),
        );
    },
  });

  it("reflects the themes the provider was given", () => {
    const { el, unmount } = mount({ themes }, Probe);

    expect(el.querySelector("[data-families]")?.textContent).toBe("alpha:2|beta:1");
    unmount();
  });

  it("updates when the themes prop changes", async () => {
    const list = ref(themes.slice(0, 2));
    const el = document.createElement("div");
    document.body.appendChild(el);

    const app = createApp({
      render: () =>
        h(ThemeProvider, { ...baseProps, themes: list.value }, { default: () => h(Probe) }),
    });
    app.mount(el);

    expect(el.querySelector("[data-families]")?.textContent).toBe("alpha:2");

    list.value = [themes[2]!];
    await nextTick();

    expect(el.querySelector("[data-families]")?.textContent).toBe("beta:1");

    app.unmount();
    document.body.removeChild(el);
  });
});

describe("theme-override — Vue", () => {
  const Probe = defineComponent({
    setup() {
      const { theme } = useTheme();
      return () => h("span", { "data-theme": "" }, theme.value.name);
    },
  });

  it("wins over default-theme", () => {
    const { el, unmount } = mount(
      { themes, defaultTheme: "beta-light", themeOverride: "alpha-dark" },
      Probe,
    );

    expect(el.querySelector("[data-theme]")?.textContent).toBe("alpha-dark");
    unmount();
  });

  it("restores the underlying selection when the override is removed", async () => {
    const override = ref<string | undefined>("alpha-dark");
    const el = document.createElement("div");
    document.body.appendChild(el);

    const app = createApp({
      render: () =>
        h(
          ThemeProvider,
          { ...baseProps, themes, defaultTheme: "beta-light", themeOverride: override.value },
          { default: () => h(Probe) },
        ),
    });
    app.mount(el);
    expect(el.querySelector("[data-theme]")?.textContent).toBe("alpha-dark");

    override.value = undefined;
    await nextTick();

    expect(el.querySelector("[data-theme]")?.textContent).toBe("beta-light");

    app.unmount();
    document.body.removeChild(el);
  });

  it("applies a changed override once", async () => {
    const override = ref<string | undefined>("alpha-dark");
    const el = document.createElement("div");
    document.body.appendChild(el);

    const app = createApp({
      render: () =>
        h(
          ThemeProvider,
          { ...baseProps, themes, themeOverride: override.value },
          { default: () => h(Probe) },
        ),
    });
    app.mount(el);
    expect(el.querySelector("[data-theme]")?.textContent).toBe("alpha-dark");

    override.value = "beta-light";
    await nextTick();
    expect(el.querySelector("[data-theme]")?.textContent).toBe("beta-light");

    // Re-rendering with the same value must not re-assert it.
    override.value = "beta-light";
    await nextTick();
    expect(el.querySelector("[data-theme]")?.textContent).toBe("beta-light");

    app.unmount();
    document.body.removeChild(el);
  });
});
