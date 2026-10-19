// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render } from "solid-js/web";
import { createComponent, createSignal } from "solid-js";
import { ThemeProvider, useTheme } from "@themvora/solid";
import { createThemeRuntime, type ThemeDefinition } from "@themvora/core";

function flushAnimationFrames(count = 3) {
  const frames: Promise<void>[] = [];
  for (let i = 0; i < count; i++) {
    frames.push(new Promise((r) => requestAnimationFrame(() => r())));
  }
  return Promise.all(frames);
}

const themes: ThemeDefinition[] = [
  { name: "mint-light", meta: { family: "mint", mode: "light" }, tokens: { colors: { background: "#f8fafc" } } },
  { name: "mint-dark", meta: { family: "mint", mode: "dark" }, tokens: { colors: { background: "#020617" } } },
];

function ThemeSwitcher() {
  const { theme, toggleTheme } = useTheme();
  const btn = document.createElement("button");
  btn.id = "switcher";
  btn.addEventListener("click", toggleTheme);
  btn.textContent = theme().name;
  return btn;
}

describe("solid ThemeProvider + useTheme", () => {
  it("provides context and applies DOM bindings", async () => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const dispose = render(
      () =>
        createComponent(ThemeProvider, {
          themes,
          defaultTheme: "mint-light",
          persistence: null,
          children: () => createComponent(ThemeSwitcher),
        }),
      host,
    );

    const el = document.documentElement;
    const btn = host.querySelector("#switcher") as HTMLButtonElement;

    // Initial state applied by the DOM binding
    expect(el.getAttribute("data-theme")).toBe("mint-light");
    expect(btn).toBeTruthy();
    expect(btn.textContent).toBe("mint-light");

    // Toggle: DOM attributes update synchronously, CSS variables animate
    btn.click();
    expect(el.getAttribute("data-theme")).toBe("mint-dark");

    await flushAnimationFrames();
    expect(el.style.getPropertyValue("--theme-color-background")).toBe("#020617");

    dispose();
  });
});

describe("solid ThemeProvider — reactive transition prop", () => {
  it("reconfigures the live runtime without recreating it", async () => {
    const runtime = createThemeRuntime({
      themes,
      dom: false,
      cssVariables: false,
      persistence: null,
      broadcast: null,
      transition: { enabled: true, duration: 300 },
    } as never);

    const [transition, setTransition] = createSignal<unknown>({
      enabled: true,
      duration: 300,
    });

    const host = document.createElement("div");
    document.body.appendChild(host);

    const dispose = render(
      () =>
        createComponent(ThemeProvider, {
          runtime,
          get transition() {
            return transition();
          },
          dom: false,
          cssVariables: false,
          children: () => createComponent(ThemeSwitcher),
        }),
      host,
    );

    expect(runtime.transition?.duration).toBe(300);
    const themeBefore = runtime.store.get().name;
    const historyBefore = runtime.history.getHistory().length;

    setTransition({ enabled: true, duration: 900 });
    await new Promise((resolve) => setTimeout(resolve, 0));

    // The same runtime is reconfigured; a transition change is not a theme
    // change, so selection and history are untouched.
    expect(runtime.transition?.duration).toBe(900);
    expect(runtime.store.get().name).toBe(themeBefore);
    expect(runtime.history.getHistory().length).toBe(historyBefore);

    dispose();
    runtime.destroy();
    document.body.removeChild(host);
  });
});
