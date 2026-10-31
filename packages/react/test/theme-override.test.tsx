// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { defineTheme, resetDiagnosticEmission, type ThemeDefinition } from "@themvora/core";
import { ThemeProvider, useTheme, useThemeRuntime } from "../src";

/**
 * `themeOverride` on the React provider.
 *
 * The core suite pins the runtime semantics; this one pins that the prop reaches
 * them — including through the pre-paint bootstrap, which is what keeps the
 * override flash-free in a client-rendered app.
 */

const theme = (name: string, family: string, mode: "light" | "dark"): ThemeDefinition =>
  defineTheme({
    name,
    meta: { family, mode },
    tokens: { colors: { background: mode === "dark" ? "#000" : "#fff" } },
  }) as ThemeDefinition;

const catalog = [
  theme("mint-light", "mint", "light"),
  theme("mint-dark", "mint", "dark"),
  theme("oat-light", "oat", "light"),
  theme("oat-dark", "oat", "dark"),
];

const base = { dom: false, cssVariables: false, broadcast: null };

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

function Probe({ onState }: { onState: (state: { name: string; family: string }) => void }) {
  const { theme: active, family } = useTheme();
  onState({ name: active.name, family });
  return null;
}

let observed = { name: "", family: "" };

beforeEach(() => {
  observed = { name: "", family: "" };
  window.localStorage.clear();
  document.getElementById("themvora-bootstrap")?.remove();
  document.documentElement.removeAttribute("data-theme");
  document.documentElement.removeAttribute("data-theme-ready");
});

afterEach(() => {
  resetDiagnosticEmission();
  window.localStorage.clear();
  document.getElementById("themvora-bootstrap")?.remove();
});

describe("ThemeProvider themeOverride", () => {
  it("wins over a conflicting persisted selection", () => {
    window.localStorage.setItem(
      "theme-selection",
      JSON.stringify({ family: "oat", mode: "dark" }),
    );
    const ui = mount();

    ui.render(
      <ThemeProvider {...(base as never)} themes={catalog} themeOverride="mint-light">
        <Probe onState={(state) => (observed = state)} />
      </ThemeProvider>,
    );

    expect(observed).toEqual({ name: "mint-light", family: "mint" });
    ui.cleanup();
  });

  it("is present in the pre-paint bootstrap script", () => {
    const ui = mount();

    ui.render(
      <ThemeProvider {...(base as never)} themes={catalog} themeOverride="mint-dark">
        <Probe onState={(state) => (observed = state)} />
      </ThemeProvider>,
    );

    const script = document.getElementById("themvora-bootstrap");
    expect(script).not.toBeNull();
    expect(script!.textContent).toContain('"family":"mint"');
    expect(script!.textContent).toContain('"mode":"dark"');
    ui.cleanup();
  });

  it("does not write to storage", () => {
    const ui = mount();

    ui.render(
      <ThemeProvider {...(base as never)} themes={catalog} themeOverride="mint-dark">
        <Probe onState={(state) => (observed = state)} />
      </ThemeProvider>,
    );

    expect(window.localStorage.getItem("theme-selection")).toBeNull();
    ui.cleanup();
  });

  it("applies a changed prop once and does not fight a manual selection", () => {
    const ui = mount();
    let runtime: ReturnType<typeof useThemeRuntime> | null = null;

    function RuntimeProbe() {
      runtime = useThemeRuntime();
      return <Probe onState={(state) => (observed = state)} />;
    }

    const tree = (override: string) => (
      <ThemeProvider {...(base as never)} themes={catalog} themeOverride={override}>
        <RuntimeProbe />
      </ThemeProvider>
    );

    ui.render(tree("mint-dark"));
    expect(observed.name).toBe("mint-dark");

    // A manual selection is a user action: it must win over an unchanged prop.
    act(() => {
      runtime!.selection.setFamily("oat");
    });
    expect(observed.family).toBe("oat");

    // An ordinary re-render re-forwards the same override.
    ui.render(tree("mint-dark"));
    expect(observed.family).toBe("oat");

    // A genuinely new override applies again.
    ui.render(tree("mint-light"));
    expect(observed.name).toBe("mint-light");
    ui.cleanup();
  });

  it("leaves defaultTheme semantics alone", () => {
    const ui = mount();

    ui.render(
      <ThemeProvider {...(base as never)} themes={catalog} defaultTheme="oat-light">
        <Probe onState={(state) => (observed = state)} />
      </ThemeProvider>,
    );

    expect(observed.name).toBe("oat-light");
    ui.cleanup();
  });

  it("restores the underlying selection when the prop is removed", () => {
    window.localStorage.setItem(
      "theme-selection",
      JSON.stringify({ family: "oat", mode: "dark" }),
    );
    const ui = mount();

    const tree = (override?: string) => (
      <ThemeProvider
        {...(base as never)}
        themes={catalog}
        defaultTheme="mint-light"
        themeOverride={override}
      >
        <Probe onState={(state) => (observed = state)} />
      </ThemeProvider>
    );

    ui.render(tree("mint-dark"));
    expect(observed.name).toBe("mint-dark");

    // Removing the prop is a transition: the provider forwards `undefined`, the
    // runtime restores the persisted layer, and it happens in this commit.
    ui.render(tree(undefined));

    expect(observed).toEqual({ name: "oat-dark", family: "oat" });
    ui.cleanup();
  });

  it("keeps a manual selection when the prop is removed", () => {
    const ui = mount();
    let runtime: ReturnType<typeof useThemeRuntime> | null = null;

    function RuntimeProbe() {
      runtime = useThemeRuntime();
      return <Probe onState={(state) => (observed = state)} />;
    }

    const tree = (override?: string) => (
      <ThemeProvider {...(base as never)} themes={catalog} themeOverride={override}>
        <RuntimeProbe />
      </ThemeProvider>
    );

    ui.render(tree("mint-dark"));
    act(() => {
      runtime!.selection.setFamily("oat");
    });
    expect(observed.family).toBe("oat");

    ui.render(tree(undefined));

    // The visitor's own choice is newer than the snapshot.
    expect(observed.family).toBe("oat");
    ui.cleanup();
  });

  it("accepts a family name as the override", () => {
    const ui = mount();

    ui.render(
      <ThemeProvider {...(base as never)} themes={catalog} themeOverride="mint">
        <Probe onState={(state) => (observed = state)} />
      </ThemeProvider>,
    );

    expect(observed).toEqual({ name: "mint-light", family: "mint" });
    ui.cleanup();
  });

  it("ignores an override that names a theme the provider does not have", () => {
    const ui = mount();

    ui.render(
      <ThemeProvider {...(base as never)} themes={catalog} defaultTheme="oat-light" themeOverride="nope">
        <Probe onState={(state) => (observed = state)} />
      </ThemeProvider>,
    );

    expect(observed.name).toBe("oat-light");
    ui.cleanup();
  });
});
