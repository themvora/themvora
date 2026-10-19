// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it, vi, afterEach } from "vitest";
import { createThemeRuntime, defineTheme, getNeutralThemes, resetDiagnosticEmission } from "@themvora/core";
import { ThemeProvider, useTheme, useThemeRuntime } from "../src";

/**
 * A mounted provider must react to configuration-prop changes — no reload, no
 * remount. This is the React (and, by the shared provider contract, Next/Remix)
 * half of the cross-framework reactive-configuration contract.
 */

const t = (name: string, family: string, mode: "light" | "dark" = "light") =>
  defineTheme({ name, meta: { family, mode }, tokens: { colors: { background: "#fff" } } });

const a = [t("a-light", "a"), t("a-dark", "a", "dark")];
const b = [t("b-light", "b"), t("b-dark", "b", "dark")];

function Probe() {
  const { theme, family } = useTheme();
  return <span data-testid="t">{`${theme.name}|${family}`}</span>;
}

function mount() {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  const base = { dom: false, cssVariables: false, persistence: null, broadcast: null };
  const render = (props: Record<string, unknown>) => {
    act(() => {
      root.render(
        <ThemeProvider {...({ ...base, ...props } as never)}>
          <Probe />
        </ThemeProvider>,
      );
    });
  };
  return {
    render,
    text: () => container.querySelector('[data-testid="t"]')?.textContent ?? null,
    cleanup: () => {
      act(() => root.unmount());
      document.body.removeChild(container);
    },
  };
}

afterEach(() => {
  resetDiagnosticEmission();
  vi.restoreAllMocks();
  localStorage.clear();
  document.body.innerHTML = "";
});

describe("ThemeProvider — reactive configuration props", () => {
  it("follows a changed defaultTheme without a remount", () => {
    const m = mount();
    m.render({ themes: a, defaultTheme: "a-light" });
    expect(m.text()).toBe("a-light|a");

    m.render({ themes: a, defaultTheme: "a-dark" });
    expect(m.text()).toBe("a-dark|a");
    m.cleanup();
  });

  it("follows a replaced themes collection", () => {
    const m = mount();
    m.render({ themes: a, defaultTheme: "a-light" });
    expect(m.text()).toBe("a-light|a");

    m.render({ themes: b, defaultTheme: "b-light" });
    expect(m.text()).toBe("b-light|b");
    m.cleanup();
  });

  it("follows a changed initialFamily", () => {
    const m = mount();
    m.render({ themes: [...a, ...b], defaultTheme: "a-light", initialFamily: "a" });
    expect(m.text()).toBe("a-light|a");

    m.render({ themes: [...a, ...b], defaultTheme: "a-light", initialFamily: "b" });
    expect(m.text()).toBe("b-light|b");
    m.cleanup();
  });

  it("applies the neutral fallback when the collection becomes empty", () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const m = mount();
    m.render({ themes: a, defaultTheme: "a-light" });
    expect(m.text()).toBe("a-light|a");

    m.render({ themes: [], defaultTheme: "a-light" });
    expect(m.text()).toBe(`${getNeutralThemes()[0]!.name}|default`);
    m.cleanup();
  });

  it("reports an unknown family once and recovers when it becomes valid", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const m = mount();

    m.render({ themes: a, defaultTheme: "a-light", initialFamily: "ghost" });
    m.render({ themes: a, defaultTheme: "a-light", initialFamily: "ghost" });
    expect(error).toHaveBeenCalledTimes(1);

    m.render({
      themes: [...a, t("ghost-light", "ghost")],
      defaultTheme: "a-light",
      initialFamily: "ghost",
    });
    expect(m.text()).toBe("ghost-light|ghost");
    m.cleanup();
  });
});

describe("ThemeProvider — reactive transition prop", () => {
  it("forwards a changed transition to the live runtime without recreating it", () => {
    const runtime = createThemeRuntime({
      themes: a,
      dom: false,
      cssVariables: false,
      persistence: null,
      broadcast: null,
      transition: { enabled: true, duration: 300 },
    } as never);

    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    const render = (transition: unknown) => {
      act(() => {
        root.render(
          <ThemeProvider
            runtime={runtime as never}
            dom={false}
            cssVariables={false}
            {...({ transition } as never)}
          >
            <Probe />
          </ThemeProvider>,
        );
      });
    };

    render({ enabled: true, duration: 300 });
    expect(runtime.transition?.duration).toBe(300);

    const historyBefore = runtime.history.getHistory().length;
    const themeBefore = runtime.store.get().name;

    render({ enabled: true, duration: 900 });

    // The runtime instance is the same one (no remount) and the transition
    // change left the theme and history untouched.
    expect(runtime.transition?.duration).toBe(900);
    expect(runtime.store.get().name).toBe(themeBefore);
    expect(runtime.history.getHistory().length).toBe(historyBefore);

    render(false);
    expect(runtime.transition?.enabled).toBe(false);

    act(() => root.unmount());
    document.body.removeChild(container);
    runtime.destroy();
  });

  it("exposes the runtime through useThemeRuntime for consumers", () => {
    const runtime = createThemeRuntime({
      themes: a,
      dom: false,
      cssVariables: false,
      persistence: null,
      broadcast: null,
    } as never);
    let seen: unknown = null;
    function Capture() {
      seen = useThemeRuntime();
      return null;
    }
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    act(() => {
      root.render(
        <ThemeProvider runtime={runtime as never} dom={false} cssVariables={false}>
          <Capture />
        </ThemeProvider>,
      );
    });
    expect(seen).toBe(runtime);
    act(() => root.unmount());
    document.body.removeChild(container);
    runtime.destroy();
  });
});
