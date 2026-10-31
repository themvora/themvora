// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { defineTheme, resetDiagnosticEmission, type ThemeDefinition } from "@themvora/core";
import { ThemeProvider, useProvidedThemes, useTheme, useThemeRuntime } from "../src";

/**
 * `useProvidedThemes()` — the React half of the provider-aware discovery
 * contract. The core suite pins the derivation; this one pins that the hook is
 * reactive, that it reflects the provider's own collection, and that two
 * providers stay isolated.
 */

const theme = (name: string, family: string, mode: "light" | "dark"): ThemeDefinition =>
  defineTheme({
    name,
    meta: { family, mode },
    tokens: { colors: { background: mode === "dark" ? "#000" : "#fff" } },
  }) as ThemeDefinition;

const mintLight = theme("mint-light", "mint", "light");
const mintDark = theme("mint-dark", "mint", "dark");
const oatLight = theme("oat-light", "oat", "light");

const base = { dom: false, cssVariables: false, persistence: null, broadcast: null };

function mount() {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  const render = (element: React.ReactNode) => {
    act(() => {
      root.render(element);
    });
  };

  return {
    render,
    container,
    cleanup: () => {
      act(() => root.unmount());
      document.body.removeChild(container);
    },
  };
}

afterEach(() => {
  resetDiagnosticEmission();
});

describe("useProvidedThemes", () => {
  it("returns exactly the themes the provider was given", () => {
    const ui = mount();
    let seen: readonly { family: string; variants: readonly { name: string }[] }[] = [];

    function Probe() {
      seen = useProvidedThemes();
      return null;
    }

    ui.render(
      <ThemeProvider {...(base as never)} themes={[mintLight, mintDark, oatLight]}>
        <Probe />
      </ThemeProvider>,
    );

    expect(seen.map((family) => family.family)).toEqual(["mint", "oat"]);
    expect(seen[0]!.variants.map((variant) => variant.name)).toEqual([
      "mint-light",
      "mint-dark",
    ]);
    ui.cleanup();
  });

  it("does not expose built-in themes the provider never received", () => {
    const ui = mount();
    let count = 0;

    function Probe() {
      count = useProvidedThemes().length;
      return null;
    }

    ui.render(
      <ThemeProvider {...(base as never)} themes={[mintLight]}>
        <Probe />
      </ThemeProvider>,
    );

    expect(count).toBe(1);
    ui.cleanup();
  });

  it("updates when the provider's themes prop changes", () => {
    const ui = mount();
    let families: string[] = [];

    function Probe() {
      families = useProvidedThemes().map((family) => family.family);
      return null;
    }

    const tree = (themes: ThemeDefinition[]) => (
      <ThemeProvider {...(base as never)} themes={themes}>
        <Probe />
      </ThemeProvider>
    );

    ui.render(tree([mintLight, mintDark]));
    expect(families).toEqual(["mint"]);

    ui.render(tree([oatLight]));
    expect(families).toEqual(["oat"]);

    ui.cleanup();
  });

  it("updates when a theme pack is installed through the runtime", () => {
    const ui = mount();
    let families: string[] = [];
    let runtime: ReturnType<typeof useThemeRuntime> | null = null;

    function Probe() {
      families = useProvidedThemes().map((family) => family.family);
      runtime = useThemeRuntime();
      return null;
    }

    ui.render(
      <ThemeProvider {...(base as never)} themes={[mintLight]}>
        <Probe />
      </ThemeProvider>,
    );

    act(() => {
      runtime!.use({ name: "extra", themes: [oatLight] });
    });

    expect(families).toEqual(["mint", "oat"]);
    ui.cleanup();
  });

  it("keeps entries stable across a re-render that changes nothing", () => {
    const ui = mount();
    const snapshots: unknown[] = [];

    function Probe() {
      snapshots.push(useProvidedThemes());
      return null;
    }

    const tree = () => (
      <ThemeProvider {...(base as never)} themes={[mintLight, mintDark]}>
        <Probe />
      </ThemeProvider>
    );

    ui.render(tree());
    ui.render(tree());

    expect(snapshots.length).toBeGreaterThanOrEqual(2);
    expect(snapshots[1]).toBe(snapshots[0]);
    ui.cleanup();
  });

  it("isolates two providers in one tree", () => {
    const ui = mount();
    const seen: Record<string, string[]> = {};

    function Probe({ id }: { id: string }) {
      seen[id] = useProvidedThemes().map((family) => family.family);
      return null;
    }

    ui.render(
      <ThemeProvider {...(base as never)} themes={[mintLight]}>
        <Probe id="one" />
        <ThemeProvider {...(base as never)} themes={[oatLight]}>
          <Probe id="two" />
        </ThemeProvider>
      </ThemeProvider>,
    );

    expect(seen.one).toEqual(["mint"]);
    expect(seen.two).toEqual(["oat"]);
    ui.cleanup();
  });

  it("throws outside a provider", () => {
    const ui = mount();

    function Probe() {
      useProvidedThemes();
      return null;
    }

    expect(() => ui.render(<Probe />)).toThrow(/ThemeProvider/);
    ui.cleanup();
  });

  it("does not disturb the active selection", () => {
    const ui = mount();
    let name = "";

    function Probe() {
      useProvidedThemes();
      name = useTheme().theme.name;
      return null;
    }

    ui.render(
      <ThemeProvider {...(base as never)} themes={[mintLight, mintDark]} defaultTheme="mint-dark">
        <Probe />
      </ThemeProvider>,
    );

    expect(name).toBe("mint-dark");
    ui.cleanup();
  });
});
