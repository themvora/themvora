// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { createApp, defineComponent, h, nextTick, ref } from "vue";
import { createThemeRuntime, defineTheme } from "@themvora/core";
import { ThemeProvider, ThemeScope, useTheme } from "../src/index";

const themes = [
  defineTheme({ name: "alpha-light", meta: { family: "alpha", mode: "light" }, tokens: { colors: { background: "#ffffff" } } }),
  defineTheme({ name: "alpha-dark", meta: { family: "alpha", mode: "dark" }, tokens: { colors: { background: "#000000" } } }),
  defineTheme({ name: "beta-light", meta: { family: "beta", mode: "light" }, tokens: { colors: { background: "#111111" } } }),
  defineTheme({ name: "beta-dark", meta: { family: "beta", mode: "dark" }, tokens: { colors: { background: "#222222" } } }),
];

/** Renders the live theme name, so a prop change can be observed. */
const Probe = defineComponent({
  setup() {
    const { theme } = useTheme();
    return () => h("span", { "data-probe": "" }, theme.value.name);
  },
});

function mount(providerProps: Record<string, unknown>) {
  const el = document.createElement("div");
  document.body.appendChild(el);
  const app = createApp({
    render: () => h(ThemeProvider, providerProps, { default: () => h(Probe) }),
  });
  app.mount(el);
  return { app, el, name: () => el.querySelector("[data-probe]")?.textContent };
}

describe("ThemeProvider — reacting to prop changes", () => {
  it("follows a changed default-theme", async () => {
    const defaultTheme = ref("alpha-light");
    const el = document.createElement("div");
    document.body.appendChild(el);

    const app = createApp({
      render: () =>
        h(
          ThemeProvider,
          { themes, defaultTheme: defaultTheme.value, persistence: null },
          { default: () => h(Probe) },
        ),
    });
    app.mount(el);

    expect(el.querySelector("[data-probe]")?.textContent).toBe("alpha-light");

    defaultTheme.value = "beta-light";
    await nextTick();
    await new Promise((r) => setTimeout(r, 50));

    expect(el.querySelector("[data-probe]")?.textContent).toBe("beta-light");
    app.unmount();
  });
});

describe("ThemeScope — reacting to prop changes", () => {
  it("follows a changed family", async () => {
    const family = ref("alpha");
    const el = document.createElement("div");
    document.body.appendChild(el);

    const Scoped = defineComponent({
      setup() {
        return () => h("div");
      },
    });

    const app = createApp({
      render: () =>
        // A concrete initial mode keeps the scope non-OS-dependent, so its
        // variables are written inline (a `system` mode emits a `@media` block
        // instead — see `resolveScopedThemePrePaint`).
        h(ThemeProvider, { themes, defaultTheme: "alpha-light", initialMode: "light", persistence: null }, {
          default: () =>
            h(ThemeScope, { family: family.value, "data-testid": "scope" }, {
              default: () => h(Scoped),
            }),
        }),
    });
    app.mount(el);

    const scope = el.querySelector("[data-v-tv-scope]");
    const before = scope?.getAttribute("style") ?? "";

    family.value = "beta";
    await nextTick();
    await new Promise((r) => setTimeout(r, 50));

    const after = el.querySelector("[data-v-tv-scope]")?.getAttribute("style") ?? "";
    // The scoped element's variables should have changed with the family.
    expect(after).not.toBe(before);
    app.unmount();
  });
});

describe("ThemeProvider — reacting to a transition prop change", () => {
  it("updates the live runtime without recreating it", async () => {
    const runtime = createThemeRuntime({
      themes,
      dom: false,
      cssVariables: false,
      persistence: null,
      broadcast: null,
      transition: { enabled: true, duration: 300 },
    } as never);

    const transition = ref<unknown>({ enabled: true, duration: 300 });
    const el = document.createElement("div");
    document.body.appendChild(el);

    const app = createApp({
      render: () =>
        h(
          ThemeProvider,
          {
            runtime,
            transition: transition.value,
            dom: false,
            cssVariables: false,
          },
          { default: () => h(Probe) },
        ),
    });
    app.mount(el);

    expect(runtime.transition?.duration).toBe(300);
    const themeBefore = runtime.store.get().name;
    const historyBefore = runtime.history.getHistory().length;

    transition.value = { enabled: true, duration: 900 };
    await nextTick();
    await new Promise((r) => setTimeout(r, 20));

    // The same runtime is reconfigured; a transition change is not a theme
    // change, so selection and history are untouched.
    expect(runtime.transition?.duration).toBe(900);
    expect(runtime.store.get().name).toBe(themeBefore);
    expect(runtime.history.getHistory().length).toBe(historyBefore);

    app.unmount();
    runtime.destroy();
  });
});
