// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { createApp, defineComponent, h, nextTick } from "vue";
import {
  createThemeRuntime,
  generateTheme,
  getBuiltInThemes,
  type ThemeDefinition,
  type ThemeError,
} from "@themvora/core";
import { ThemeProvider, useGeneratedTheme } from "../src/index";

const NameDemo = defineComponent({
  name: "NameDemo",
  setup() {
    const theme = useGeneratedTheme();
    return () => h("span", { id: "name" }, theme.value.name);
  },
});

let app: ReturnType<typeof createApp> | undefined;

function mount(
  themes: readonly ThemeDefinition[],
  options: Record<string, unknown> = {},
): { error: () => unknown; name: () => string | null } {
  let captured: unknown;

  app = createApp({
    render() {
      return h(
        ThemeProvider,
        { themes, persistence: null, dom: false, cssVariables: false, ...options },
        () => h(NameDemo),
      );
    },
  });
  app.config.errorHandler = (error) => {
    captured = error;
  };

  const host = document.createElement("div");
  document.body.appendChild(host);
  app.mount(host);

  return {
    error: () => captured,
    name: () => document.querySelector("#name")?.textContent ?? null,
  };
}

describe("useGeneratedTheme (Vue)", () => {
  afterEach(() => {
    app?.unmount();
    app = undefined;
    document.body.innerHTML = "";
  });

  it("returns the registered generated theme the active selection resolves to", () => {
    const { light, dark } = generateTheme({ seed: "#635BFF", family: "brand" });

    expect(mount([light, dark], { initialMode: "light" }).name()).toBe("brand-light");
    app?.unmount();
    expect(mount([light, dark], { initialMode: "dark" }).name()).toBe("brand-dark");
  });

  it("does not qualify an ordinary preset", () => {
    const { error } = mount(getBuiltInThemes());
    expect((error() as ThemeError | undefined)?.code).toBe("TV_GENERATION_THEME_NOT_FOUND");
  });

  it("rejects an ambiguous configuration rather than returning the first entry", () => {
    const a = generateTheme({ seed: "#635BFF", family: "a" });
    const b = generateTheme({ seed: "#d97706", family: "b" });

    const { error } = mount(
      [...getBuiltInThemes(), a.light, a.dark, b.light, b.dark],
      { defaultTheme: "light" },
    );
    expect((error() as ThemeError | undefined)?.code).toBe("TV_GENERATION_THEME_AMBIGUOUS");
  });

  it("throws the provider error when there is no ThemeProvider", () => {
    let captured: unknown;
    app = createApp({ render: () => h(NameDemo) });
    app.config.errorHandler = (error) => {
      captured = error;
    };
    const host = document.createElement("div");
    document.body.appendChild(host);
    app.mount(host);

    expect(String((captured as Error | undefined)?.message)).toMatch(/ThemeProvider/);
  });

  it("updates a mounted consumer when a pack changes the generated theme", async () => {
    const { light } = generateTheme({ seed: "#635BFF", family: "brand" });
    const runtime = createThemeRuntime({
      themes: [light],
      dom: false,
      cssVariables: false,
      persistence: null,
      broadcast: null,
    } as any);

    const LabelDemo = defineComponent({
      name: "LabelDemo",
      setup() {
        const theme = useGeneratedTheme();
        return () => h("span", { id: "label" }, theme.value.meta?.label ?? theme.value.name);
      },
    });

    app = createApp({
      render: () => h(ThemeProvider, { runtime, themes: [light] }, () => h(LabelDemo)),
    });
    const host = document.createElement("div");
    document.body.appendChild(host);
    app.mount(host);

    expect(document.querySelector("#label")?.textContent).toBe("Brand Light");

    runtime.use({
      name: "brand",
      themes: [{ ...light, meta: { ...light.meta, label: "Refreshed Light" } }],
    });
    await nextTick();

    expect(document.querySelector("#label")?.textContent).toBe("Refreshed Light");
    runtime.destroy();
  });
});

describe("useGeneratedTheme — registry lifecycle hardening (Vue)", () => {
  afterEach(() => {
    app?.unmount();
    app = undefined;
    document.body.innerHTML = "";
  });

  function labelDemo() {
    return defineComponent({
      name: "HardLabelDemo",
      setup() {
        const theme = useGeneratedTheme();
        return () => h("span", { id: "label" }, theme.value.meta?.label ?? theme.value.name);
      },
    });
  }

  function mountWith(runtime: any, themes: readonly ThemeDefinition[]) {
    let captured: unknown;
    app = createApp({
      render: () => h(ThemeProvider, { runtime, themes }, () => h(labelDemo())),
    });
    app.config.errorHandler = (error) => {
      captured = error;
    };
    const host = document.createElement("div");
    document.body.appendChild(host);
    app.mount(host);
    return {
      captured: () => captured,
      label: () => host.querySelector("#label")?.textContent ?? null,
    };
  }

  it("surfaces a removed generated theme at read (no stale value)", async () => {
    const { light } = generateTheme({ seed: "#635BFF", family: "brand" });
    const runtime = createThemeRuntime({
      themes: [light],
      dom: false,
      cssVariables: false,
      persistence: null,
      broadcast: null,
    } as any);

    const mounted = mountWith(runtime, [light]);
    expect(mounted.label()).toBe("Brand Light");

    runtime.registry.unregister("brand-light");
    await nextTick();

    expect((mounted.captured() as ThemeError | undefined)?.code).toBe("TV_GENERATION_THEME_NOT_FOUND");
    runtime.destroy();
  });

  it("tracks a same-name replacement", async () => {
    const { light } = generateTheme({ seed: "#635BFF", family: "brand" });
    const runtime = createThemeRuntime({
      themes: [light],
      dom: false,
      cssVariables: false,
      persistence: null,
      broadcast: null,
    } as any);

    const mounted = mountWith(runtime, [light]);
    expect(mounted.label()).toBe("Brand Light");

    runtime.registry.replace("brand-light", {
      ...light,
      meta: { ...light.meta, label: "Replaced Light" },
    });
    await nextTick();

    expect(mounted.label()).toBe("Replaced Light");
    runtime.destroy();
  });
});
