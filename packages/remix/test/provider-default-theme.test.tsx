// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { defineTheme, type ThemeDefinition } from "@themvora/core";
import { ThemeProvider } from "../src/provider";
import { useTheme } from "../src/hooks";

/**
 * Remix's provider is a React wrapper that adds a cookie-backed persistence
 * adapter and an SSR-resolved `initial` snapshot. Its reactivity is the shared
 * React contract — but `defaultTheme` used to reach only the persistence
 * adapter, never the runtime, so a client-only mount opened on `themes[0]`.
 */

const t = (name: string, family: string, mode: "light" | "dark", bg: string) =>
  defineTheme({
    name,
    meta: { family, mode },
    tokens: { colors: { background: bg } },
  }) as ThemeDefinition;

const aLight = t("a-light", "a", "light", "#ffffff");
const aDark = t("a-dark", "a", "dark", "#111111");
const bLight = t("b-light", "b", "light", "#eeeeff");
const themes = [aLight, aDark, bLight];

function Probe() {
  const { theme } = useTheme();
  return <span data-testid="name">{theme.name}</span>;
}

let root: Root | null = null;
let container: HTMLElement | null = null;

function mount(ui: React.ReactElement) {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root!.render(ui));
  return container;
}

function clearPersistedSelection() {
  // Three things carry a selection between cases: localStorage, the theme
  // cookies the provider mirrors, and the pre-paint state the blocking script
  // writes onto <html>. The runtime adopts that last one on purpose (the DOM is
  // the authority on what was painted), so a test that leaves it behind makes
  // the next case open on the previous theme.
  localStorage.clear();
  for (const name of ["theme-name", "theme-family", "theme-mode", "theme-fingerprint"]) {
    document.cookie = `${name}=; path=/; max-age=0`;
  }
  const root = document.documentElement;
  for (const attribute of ["data-theme", "data-theme-ready", "data-mode", "data-theme-family"]) {
    root.removeAttribute(attribute);
  }
  root.classList.remove("dark");
}

beforeEach(clearPersistedSelection);

afterEach(() => {
  if (root) act(() => root!.unmount());
  root = null;
  container?.remove();
  container = null;
  clearPersistedSelection();
});

describe("remix — provider configuration", () => {
  it("opens on defaultTheme when there is no SSR snapshot", () => {
    const el = mount(
      <ThemeProvider themes={themes} defaultTheme="b-light">
        <Probe />
      </ThemeProvider>,
    );

    expect(el.querySelector("[data-testid='name']")?.textContent).toBe("b-light");
  });

  it("follows a changed defaultTheme without a reload", () => {
    function App({ defaultTheme }: { defaultTheme: string }) {
      return (
        <ThemeProvider themes={themes} defaultTheme={defaultTheme}>
          <Probe />
        </ThemeProvider>
      );
    }

    const el = mount(<App defaultTheme="a-light" />);
    expect(el.querySelector("[data-testid='name']")?.textContent).toBe("a-light");

    act(() => {
      root!.render(<App defaultTheme="a-dark" />);
    });

    expect(el.querySelector("[data-testid='name']")?.textContent).toBe("a-dark");
  });

  it("lets an SSR snapshot win over defaultTheme", () => {
    const el = mount(
      <ThemeProvider
        themes={themes}
        defaultTheme="a-dark"
        initial={{ theme: bLight, selection: { family: "b", mode: "light" } }}
      >
        <Probe />
      </ThemeProvider>,
    );

    // The server resolved `b-light` for first paint; a fallback must not
    // overwrite it.
    expect(el.querySelector("[data-testid='name']")?.textContent).toBe("b-light");
  });

  it("keeps an explicit initialMode ahead of defaultTheme's mode", () => {
    // Documented precedence: `defaultTheme` is the fallback, `initialFamily` /
    // `initialMode` are explicit selections that win over it.
    const el = mount(
      <ThemeProvider themes={themes} defaultTheme="a-dark" initialMode="light">
        <Probe />
      </ThemeProvider>,
    );

    expect(el.querySelector("[data-testid='name']")?.textContent).toBe("a-light");
  });
});
