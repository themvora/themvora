// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it } from "vitest";
import { defineTheme, resolveInitialTheme, type ThemeRuntime } from "@themvora/core";
import { ClientThemeProvider } from "../src/provider";
import { useTheme, useThemeRuntime } from "@themvora/react";

const t = (name: string, family: string, mode: "light" | "dark" = "light") =>
  defineTheme({ name, meta: { family, mode }, tokens: { colors: { background: "#fff" } } });

const a = [t("a-light", "a"), t("a-dark", "a", "dark")];
const b = [t("b-light", "b"), t("b-dark", "b", "dark")];

let seenRuntime: ThemeRuntime<any> | null = null;

function Probe() {
  seenRuntime = useThemeRuntime<any>();
  const { theme } = useTheme();
  return <span data-testid="t">{theme.name}</span>;
}

function render(container: HTMLElement, root: ReturnType<typeof createRoot>, themes: any[], defaultTheme: string) {
  const initial = resolveInitialTheme({ themes, defaultTheme, mode: "light" });
  act(() => {
    root.render(
      <ClientThemeProvider themes={themes} defaultTheme={defaultTheme} initial={initial}>
        <Probe />
      </ClientThemeProvider>,
    );
  });
}

describe("@themvora/next — configuration is applied without discarding the runtime", () => {
  it("updates the catalog in place and preserves runtime identity", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    render(container, root, a, "a-light");
    expect(container.querySelector('[data-testid="t"]')?.textContent).toBe("a-light");
    const firstRuntime = seenRuntime;

    render(container, root, b, "b-light");
    expect(container.querySelector('[data-testid="t"]')?.textContent).toBe("b-light");

    // The runtime is reconfigured, not recreated.
    expect(seenRuntime).toBe(firstRuntime);

    act(() => root.unmount());
    document.body.removeChild(container);
  });

  it("keeps a still-valid selection when the catalog changes", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    render(container, root, a, "a-light");
    render(container, root, [...a, ...b], "a-light");
    expect(container.querySelector('[data-testid="t"]')?.textContent).toBe("a-light");

    act(() => root.unmount());
    document.body.removeChild(container);
  });
});
