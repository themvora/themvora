// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it } from "vitest";
import { generateTheme, resolveInitialTheme } from "@themvora/core";
import { ClientThemeProvider, useGeneratedTheme } from "../src/client";

function NameDemo() {
  return <span data-testid="name">{useGeneratedTheme().name}</span>;
}

describe("@themvora/next useGeneratedTheme", () => {
  it("returns the registered generated theme", () => {
    const { light, dark } = generateTheme({ seed: "#635BFF", family: "brand" });
    const themes = [light, dark];
    const initial = resolveInitialTheme({ themes, mode: "light", family: "brand" });

    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    act(() => {
      root.render(
        <ClientThemeProvider themes={themes} initial={initial}>
          <NameDemo />
        </ClientThemeProvider>,
      );
    });

    expect(container.querySelector('[data-testid="name"]')?.textContent).toBe("brand-light");

    act(() => {
      root.unmount();
    });
    document.body.removeChild(container);
  });

  it("re-exports the same accessor as @themvora/react", async () => {
    const react = await import("@themvora/react");
    expect(useGeneratedTheme).toBe(react.useGeneratedTheme);
  });
});
