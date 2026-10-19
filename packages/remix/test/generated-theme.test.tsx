// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it } from "vitest";
import { generateTheme } from "@themvora/core";
import { ThemeProvider } from "../src/provider";
import { useGeneratedTheme } from "../src/hooks";

function NameDemo() {
  return <span data-testid="name">{useGeneratedTheme().name}</span>;
}

describe("@themvora/remix useGeneratedTheme", () => {
  it("returns the registered generated theme the active selection resolves to", () => {
    const { light, dark } = generateTheme({ seed: "#635BFF", family: "brand" });

    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    act(() => {
      root.render(
        <ThemeProvider themes={[light, dark]} initialMode="dark">
          <NameDemo />
        </ThemeProvider>,
      );
    });

    expect(container.querySelector('[data-testid="name"]')?.textContent).toBe("brand-dark");

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
