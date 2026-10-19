// @vitest-environment jsdom
import { act, StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it } from "vitest";
import { createThemeRuntime, defineTheme } from "@themvora/core";
import { ThemeProvider, useSetThemeMode, useTheme, useThemeMode } from "../src";

function Demo() {
  const { theme, mode, setMode } = useTheme();

  return (
    <div>
      <span data-testid="theme">{theme.name}</span>
      <span data-testid="mode">{mode}</span>
      <button onClick={() => setMode("dark")}>dark</button>
    </div>
  );
}

describe("ThemeProvider", () => {
  it("updates hooks when the runtime changes", () => {
    const runtime = createThemeRuntime({
      themes: [
        defineTheme({
          name: "light",
          meta: { family: "default", mode: "light" },
        }),
        defineTheme({
          name: "dark",
          meta: { family: "default", mode: "dark" },
        }),
      ],
      initialMode: "light",
      dom: false,
      cssVariables: false,
    });

    const container = document.createElement("div");
    document.body.appendChild(container);

    const root = createRoot(container);

    act(() => {
      root.render(
        <ThemeProvider runtime={runtime}>
          <Demo />
        </ThemeProvider>,
      );
    });

    expect(container.querySelector('[data-testid="theme"]')?.textContent).toBe(
      "light",
    );
    expect(container.querySelector('[data-testid="mode"]')?.textContent).toBe(
      "light",
    );

    act(() => {
      runtime.selection.setMode("dark");
    });

    expect(container.querySelector('[data-testid="theme"]')?.textContent).toBe(
      "dark",
    );
    expect(container.querySelector('[data-testid="mode"]')?.textContent).toBe(
      "dark",
    );

    act(() => {
      root.unmount();
    });

    document.body.removeChild(container);
  });

  // Regression: React StrictMode (dev) mounts → unmounts → remounts effects.
  // The provider's cleanup destroyed the owned runtime and the remount kept
  // using the destroyed instance, so setMode/toggleTheme silently no-opped.
  // A fresh runtime must be recreated for the remounted effects.
  it("keeps theme switching working under StrictMode (owned runtime)", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);

    const root = createRoot(container);

    act(() => {
      root.render(
        <StrictMode>
          <ThemeProvider
            themes={[
              defineTheme({
                name: "light",
                meta: { family: "default", mode: "light" },
              }),
              defineTheme({
                name: "dark",
                meta: { family: "default", mode: "dark" },
              }),
            ]}
            defaultTheme="light"
            initialMode="light"
            dom={false}
            cssVariables={false}
            persistence={null}
            broadcast={null}
          >
            <Demo />
          </ThemeProvider>
        </StrictMode>,
      );
    });

    // StrictMode double-mount completed; the runtime must be live.
    expect(container.querySelector('[data-testid="theme"]')?.textContent).toBe(
      "light",
    );

    act(() => {
      container.querySelector("button")!.dispatchEvent(
        new MouseEvent("click", { bubbles: true }),
      );
    });

    // If the runtime was destroyed by the StrictMode cleanup, setMode is a
    // no-op and this stays "light".
    expect(container.querySelector('[data-testid="theme"]')?.textContent).toBe(
      "dark",
    );
    expect(container.querySelector('[data-testid="mode"]')?.textContent).toBe(
      "dark",
    );

    act(() => {
      root.unmount();
    });

    document.body.removeChild(container);
  });

  // Regression: the CSS variables + DOM attributes must be applied before the
  // first paint (layout effect) so html/body background rules that reference
  // var(--theme-color-*) show the defined theme on the first frame — not an
  // unthemed default — and don't flicker when hydration completes.
  it("applies the defined theme's CSS variables on mount", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);

    const root = createRoot(container);

    act(() => {
      root.render(
        <ThemeProvider
          themes={[
            defineTheme({
              name: "indigo-light",
              meta: { family: "indigo", mode: "light" },
              tokens: { colors: { background: "#f8fafc", primary: "#6366f1" } },
            }),
            defineTheme({
              name: "indigo-dark",
              meta: { family: "indigo", mode: "dark" },
              tokens: { colors: { background: "#020617", primary: "#9596ea" } },
            }),
          ]}
          defaultTheme="indigo-light"
          initialMode="light"
          persistence={null}
          broadcast={null}
        >
          <Demo />
        </ThemeProvider>,
      );
    });

    const html = document.documentElement;
    // Defined theme's variables are present on <html> right after mount
    expect(html.style.getPropertyValue("--theme-color-background")).toBe("#f8fafc");
    expect(html.style.getPropertyValue("--theme-color-primary")).toBe("#6366f1");
    expect(html.getAttribute("data-theme")).toBe("indigo-light");

    act(() => {
      container.querySelector("button")!.dispatchEvent(
        new MouseEvent("click", { bubbles: true }),
      );
    });

    // The binding batches DOM writes to the next animation frame
    await new Promise((r) => requestAnimationFrame(() => r(null)));
    await new Promise((r) => requestAnimationFrame(() => r(null)));

    // Toggling switches to the defined dark theme (not a default/neutral one)
    expect(html.style.getPropertyValue("--theme-color-background")).toBe("#020617");
    expect(html.getAttribute("data-theme")).toBe("indigo-dark");

    act(() => {
      root.unmount();
    });

    document.body.removeChild(container);
  });

  // Regression: the provider injects a blocking bootstrap <script> into <head>
  // (flash-proofing) and applies the defined theme's variables on mount.
  it("injects the blocking bootstrap script", () => {
    localStorage.clear();
    const container = document.createElement("div");
    document.body.appendChild(container);

    const root = createRoot(container);

    act(() => {
      root.render(
        <ThemeProvider
          themes={[
            defineTheme({ name: "light", meta: { mode: "light" }, tokens: {} }),
            defineTheme({ name: "dark", meta: { mode: "dark" }, tokens: {} }),
          ]}
          defaultTheme="light"
          initialMode="light"
          broadcast={null}
        >
          <Demo />
        </ThemeProvider>,
      );
    });

    const script = document.getElementById("themvora-bootstrap");
    expect(script).toBeTruthy();
    expect(script?.textContent ?? "").toContain("colorScheme");
    // Injecting twice (e.g. StrictMode remount) must not duplicate
    const count = [...document.querySelectorAll("script#themvora-bootstrap")].length;
    expect(count).toBe(1);

    act(() => {
      root.unmount();
    });

    document.body.removeChild(container);
  });

  // Regression: the provider owns the DOM binding (the runtime is created with
  // `dom: false`), so it must hand the binding the selection source. Without it
  // `data-theme-selection-mode` / `-family` stayed at whatever the pre-paint
  // bootstrap or SSR layout wrote and never tracked a client-side change — the
  // resolved `data-theme-mode`/`-family` cannot recover a `"system"` selection.
  // Exercised with a caller-owned runtime, which is the shape the Next.js
  // `ClientThemeProvider` uses.
  it("keeps data-theme-selection-* in sync with live changes", async () => {
    const themes = [
      defineTheme({ name: "mint-light", meta: { family: "mint", mode: "light" } }),
      defineTheme({ name: "mint-dark", meta: { family: "mint", mode: "dark" } }),
      defineTheme({ name: "ocean-light", meta: { family: "ocean", mode: "light" } }),
      defineTheme({ name: "ocean-dark", meta: { family: "ocean", mode: "dark" } }),
    ];

    const runtime = createThemeRuntime({
      themes,
      defaultTheme: "mint-light",
      initialMode: "light",
      initialFamily: "mint",
      persistence: null,
      broadcast: null,
      dom: false,
      cssVariables: false,
    });

    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    const flush = () =>
      new Promise((r) =>
        requestAnimationFrame(() => requestAnimationFrame(() => r(null))),
      );

    act(() => {
      root.render(
        <ThemeProvider runtime={runtime}>
          <Demo />
        </ThemeProvider>,
      );
    });

    const html = document.documentElement;
    expect(html.getAttribute("data-theme")).toBe("mint-light");
    expect(html.getAttribute("data-theme-selection-mode")).toBe("light");
    expect(html.getAttribute("data-theme-selection-family")).toBe("mint");

    // A live family change moves both the resolved theme and the selection.
    act(() => {
      runtime.selection.setFamily("ocean");
    });
    await flush();
    expect(html.getAttribute("data-theme")).toBe("ocean-light");
    expect(html.getAttribute("data-theme-family")).toBe("ocean");
    expect(html.getAttribute("data-theme-selection-family")).toBe("ocean");
    expect(html.getAttribute("data-theme-selection-mode")).toBe("light");

    // A live mode change moves the resolved mode and the selection mode.
    act(() => {
      runtime.selection.setMode("dark");
    });
    await flush();
    expect(html.getAttribute("data-theme")).toBe("ocean-dark");
    expect(html.getAttribute("data-theme-mode")).toBe("dark");
    expect(html.getAttribute("data-theme-selection-mode")).toBe("dark");
    expect(html.getAttribute("data-theme-selection-family")).toBe("ocean");

    act(() => {
      root.unmount();
    });
    document.body.removeChild(container);
    for (const attribute of [
      "data-theme",
      "data-theme-mode",
      "data-theme-family",
      "data-theme-selection-mode",
      "data-theme-selection-family",
    ]) {
      html.removeAttribute(attribute);
    }
  });
});
