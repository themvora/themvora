// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it } from "vitest";
import { defineTheme, resolveInitialTheme } from "@themvora/core";
import { ClientThemeProvider, useTheme } from "../src/client";

function Demo() {
  const { theme, mode, family, setFamily, toggleTheme } = useTheme();
  return (
    <>
      <span data-testid="state">{`${theme.name}|${mode}|${family}`}</span>
      <button type="button" onClick={() => setFamily("rose")}>Set rose</button>
      <button type="button" onClick={toggleTheme}>Toggle mode</button>
    </>
  );
}

describe("@themvora/next", () => {
  it("renders with the Next provider and hooks", () => {
    const themes = [
      defineTheme({
        name: "light",
        meta: { family: "default", mode: "light" },
      }),
      defineTheme({
        name: "dark",
        meta: { family: "default", mode: "dark" },
      }),
    ];

    const initial = resolveInitialTheme({
      themes,
      mode: "light",
      family: "default",
    });

    const container = document.createElement("div");
    document.body.appendChild(container);

    const root = createRoot(container);

    act(() => {
      root.render(
        <ClientThemeProvider themes={themes} initial={initial}>
          <Demo />
        </ClientThemeProvider>,
      );
    });

    expect(container.querySelector('[data-testid="state"]')?.textContent).toBe(
      "light|light|default",
    );

    act(() => {
      root.unmount();
    });

    document.body.removeChild(container);
  });

  it("keeps the cookie bootstrap selection instead of overwriting it with the shell default", () => {
    const themes = [
      defineTheme({ name: "default-light", meta: { family: "default", mode: "light" } }),
      defineTheme({ name: "default-dark", meta: { family: "default", mode: "dark" } }),
      defineTheme({ name: "ocean-light", meta: { family: "ocean", mode: "light" } }),
      defineTheme({ name: "ocean-dark", meta: { family: "ocean", mode: "dark" } }),
      defineTheme({ name: "rose-light", meta: { family: "rose", mode: "light" } }),
      defineTheme({ name: "rose-dark", meta: { family: "rose", mode: "dark" } }),
    ];
    const serverInitial = resolveInitialTheme({
      themes,
      defaultTheme: "default-light",
      mode: "light",
      family: "default",
    });

    // This is what the Next server's blocking cookie script leaves behind on
    // <html> for a returning visitor. The static RSC shell below still says
    // default-light, exactly as Cache Components require.
    document.documentElement.setAttribute("data-theme-ready", "true");
    document.documentElement.setAttribute("data-theme", "ocean-dark");
    document.documentElement.setAttribute("data-theme-mode", "dark");
    document.documentElement.setAttribute("data-theme-family", "ocean");
    document.documentElement.setAttribute("data-theme-selection-mode", "dark");
    document.documentElement.setAttribute("data-theme-selection-family", "ocean");

    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    act(() => {
      root.render(
        <ClientThemeProvider
          themes={themes}
          defaultTheme="default-light"
          initial={serverInitial}
        >
          <Demo />
        </ClientThemeProvider>,
      );
    });

    expect(container.querySelector('[data-testid="state"]')?.textContent).toBe(
      "ocean-dark|dark|ocean",
    );
    // The Next bootstrap owns the cookie handoff. The generic React-owned
    // localStorage bootstrap must not be injected as a second, competing script.
    expect(document.getElementById("themvora-bootstrap")).toBeNull();
    expect(document.documentElement.getAttribute("data-theme")).toBe("ocean-dark");

    act(() => {
      container.querySelector("button")!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(container.querySelector('[data-testid="state"]')?.textContent).toBe(
      "rose-dark|dark|rose",
    );
    expect(document.cookie).toContain("theme-family=rose");
    expect(document.cookie).toContain("theme-mode=dark");

    act(() => {
      container.querySelectorAll("button")[1]!.dispatchEvent(
        new MouseEvent("click", { bubbles: true }),
      );
    });
    expect(container.querySelector('[data-testid="state"]')?.textContent).toBe(
      "rose-light|light|rose",
    );
    expect(document.cookie).toContain("theme-family=rose");
    expect(document.cookie).toContain("theme-mode=light");

    act(() => {
      root.unmount();
    });
    document.body.removeChild(container);
    for (const attr of [
      "data-theme-ready",
      "data-theme",
      "data-theme-mode",
      "data-theme-family",
      "data-theme-selection-mode",
      "data-theme-selection-family",
    ]) {
      document.documentElement.removeAttribute(attr);
    }
  });
});
