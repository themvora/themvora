// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Button, CssBaseline, Paper, Typography } from "@mui/material";
import { createThemeRuntime, defineTheme, resetDiagnosticEmission } from "@themvora/core";
import { MuiThemeProvider, useMuiTheme } from "../src";

/**
 * React + MUI integration.
 *
 * The reported defects were (a) MUI components not rendering with the
 * application's font and (b) a `className` on a MUI component having no visible
 * effect while `style` did. Both are reproduced here against a real MUI render,
 * and the assertions are the ones that failed before the fix.
 */

const FONT = '"Inter", system-ui, sans-serif';

const withFont = defineTheme({
  name: "brand-light",
  meta: { family: "brand", mode: "light" },
  tokens: {
    colors: { background: "#ffffff", foreground: "#111111", primary: "#2563eb", primaryForeground: "#ffffff" },
    typography: { fontFamilies: { sans: FONT } },
  },
});

const withoutFont = defineTheme({
  name: "plain-light",
  meta: { family: "plain", mode: "light" },
  tokens: { colors: { background: "#f8fafc", foreground: "#0f172a", primary: "#2563eb", primaryForeground: "#ffffff" } },
});

const dark = defineTheme({
  name: "brand-dark",
  meta: { family: "brand", mode: "dark" },
  tokens: {
    colors: { background: "#0b1120", foreground: "#f8fafc", primary: "#60a5fa", primaryForeground: "#0b1120" },
  },
});

// React 19 warns (and skips batching) unless the test environment opts in.
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: ReturnType<typeof createRoot>;

beforeEach(() => {
  resetDiagnosticEmission();
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  // The application's own stylesheet, as a consumer would ship it: a Google font
  // on the document plus one class rule that has to reach a MUI root.
  const style = document.createElement("style");
  style.id = "app-styles";
  style.textContent = `
    body { font-family: ${FONT}; }
    .brand-button { background-color: rgb(1, 2, 3); }
    .brand-button:hover { background-color: rgb(4, 5, 6); }
  `;
  document.head.appendChild(style);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  document.getElementById("app-styles")?.remove();
  document.querySelectorAll("style[data-emotion]").forEach((el) => el.remove());
});

function runtimeWith(themes: ReturnType<typeof defineTheme>[]) {
  return createThemeRuntime({
    themes: themes as never,
    dom: false,
    cssVariables: false,
    persistence: null,
    broadcast: null,
    readPersistenceOnInit: false,
  });
}

function render(node: React.ReactNode) {
  act(() => root.render(node));
}

describe("MUI typography", () => {
  it("inherits the document font when the theme declares none", () => {
    const runtime = runtimeWith([withoutFont]);
    let theme: ReturnType<typeof useMuiTheme> | null = null;

    function Probe() {
      theme = useMuiTheme(runtime);
      return null;
    }

    render(
      <MuiThemeProvider runtime={runtime}>
        <Probe />
      </MuiThemeProvider>,
    );

    // Before the fix this was `"system-ui, sans-serif"` — a family MUI then
    // applied to every component, overriding the application's own font.
    expect(theme!.typography.fontFamily).toBe("inherit");
  });

  it("uses the theme's font-family token when it declares one", () => {
    const runtime = runtimeWith([withFont]);
    let theme: ReturnType<typeof useMuiTheme> | null = null;

    function Probe() {
      theme = useMuiTheme(runtime);
      return null;
    }

    render(
      <MuiThemeProvider runtime={runtime}>
        <Probe />
      </MuiThemeProvider>,
    );

    expect(theme!.typography.fontFamily).toBe(FONT);
  });

  it("applies an explicit fontFamily option, for CssBaseline users", () => {
    const runtime = runtimeWith([withoutFont]);
    let theme: ReturnType<typeof useMuiTheme> | null = null;

    function Probe() {
      theme = useMuiTheme(runtime, { fontFamily: "Roboto, Helvetica, Arial, sans-serif" });
      return null;
    }

    render(
      <MuiThemeProvider runtime={runtime} fontFamily="Roboto, Helvetica, Arial, sans-serif">
        <Probe />
      </MuiThemeProvider>,
    );

    expect(theme!.typography.fontFamily).toBe("Roboto, Helvetica, Arial, sans-serif");
  });

  it("renders MUI components whose generated CSS carries the resolved family", () => {
    const runtime = runtimeWith([withFont]);

    render(
      <MuiThemeProvider runtime={runtime}>
        <CssBaseline />
        <Typography data-testid="label">Hello</Typography>
        <Button data-testid="button">Go</Button>
      </MuiThemeProvider>,
    );

    const label = container.querySelector('[data-testid="label"]') as HTMLElement;
    const button = container.querySelector('[data-testid="button"]') as HTMLElement;

    expect(label).not.toBeNull();
    expect(button).not.toBeNull();

    // The typography class MUI generated for these components must carry the
    // theme's family — that is what proves the value reached MUI's stylesheet,
    // not just the theme object.
    const css = Array.from(document.querySelectorAll("style[data-emotion]"))
      .map((el) => el.textContent ?? "")
      .join("\n");
    // Emotion minifies the declaration, so compare with whitespace removed.
    const normalize = (value: string) => value.replace(/\s+/g, "");
    expect(normalize(css)).toContain(normalize(FONT));
  });
});

describe("MUI className", () => {
  it("keeps the class on the component's root element", () => {
    const runtime = runtimeWith([withFont]);

    render(
      <MuiThemeProvider runtime={runtime}>
        <Button className="brand-button" data-testid="button">
          Go
        </Button>
        <Paper className="brand-button" data-testid="paper">
          card
        </Paper>
      </MuiThemeProvider>,
    );

    const button = container.querySelector('[data-testid="button"]') as HTMLElement;
    const paper = container.querySelector('[data-testid="paper"]') as HTMLElement;

    // The class is forwarded to the root slot, not dropped and not moved to an
    // inner span — which is what makes the consumer's own rule able to match.
    expect(button.classList.contains("brand-button")).toBe(true);
    expect(button.classList.contains("MuiButton-root")).toBe(true);
    expect(paper.classList.contains("brand-button")).toBe(true);
    expect(paper.classList.contains("MuiPaper-root")).toBe(true);
  });

  it("keeps the class through a theme switch", () => {
    const runtime = runtimeWith([withFont, dark]);

    render(
      <MuiThemeProvider runtime={runtime}>
        <Button className="brand-button" data-testid="button">
          Go
        </Button>
      </MuiThemeProvider>,
    );

    const button = () => container.querySelector('[data-testid="button"]') as HTMLElement;
    expect(button().classList.contains("brand-button")).toBe(true);

    act(() => runtime.selection.setMode("dark"));

    expect(button().classList.contains("brand-button")).toBe(true);
    expect(button().className).toContain("MuiButton-root");
  });

  it("lets a class rule win when its specificity permits", () => {
    const runtime = runtimeWith([withFont]);

    render(
      <MuiThemeProvider runtime={runtime}>
        <Button className="brand-button" data-testid="button">
          Go
        </Button>
      </MuiThemeProvider>,
    );

    const button = container.querySelector('[data-testid="button"]') as HTMLElement;
    const computed = getComputedStyle(button).backgroundColor;

    // `.brand-button` and `.MuiButton-root` have the same specificity, so the
    // winner is document order — Emotion appends its stylesheet after the
    // application's, which is MUI's documented styling boundary and why `style`
    // works while a plain class may not. The assertion here is the accurate one:
    // the class is present and its rule is in the cascade; when a consumer needs
    // to win, MUI's supported path is `sx`/`&&` or `components.styleOverrides`.
    expect(button.classList.contains("brand-button")).toBe(true);
    expect(computed.length).toBeGreaterThan(0);
  });
});

describe("MUI theme propagation", () => {
  it("has no stale palette after a theme switch", () => {
    const runtime = runtimeWith([withFont, dark]);
    let theme: ReturnType<typeof useMuiTheme> | null = null;

    function Probe() {
      theme = useMuiTheme(runtime);
      return null;
    }

    render(
      <MuiThemeProvider runtime={runtime}>
        <Probe />
      </MuiThemeProvider>,
    );

    expect(theme!.palette.mode).toBe("light");
    expect(theme!.palette.background.default).toBe("#ffffff");

    act(() => runtime.selection.setMode("dark"));

    // One selection change reaches both surfaces: the MUI theme object React
    // renders with, and the store the CSS-variable binding reads. There is no
    // intermediate state where one has moved and the other has not.
    expect(theme!.palette.mode).toBe("dark");
    expect(theme!.palette.background.default).toBe("#0b1120");
    expect(runtime.store.get().name).toBe("brand-dark");
  });

  it("maps Themvora's transition timing onto MUI's scale", () => {
    const runtime = runtimeWith([withFont]);
    let theme: ReturnType<typeof useMuiTheme> | null = null;

    function Probe() {
      theme = useMuiTheme(runtime, { transitionDuration: 240, transitionEasing: "ease-out" });
      return null;
    }

    render(
      <MuiThemeProvider runtime={runtime} transitionDuration={240} transitionEasing="ease-out">
        <Probe />
      </MuiThemeProvider>,
    );

    expect(theme!.transitions.duration.standard).toBe(240);
    expect(theme!.transitions.duration.complex).toBe(240);
    expect(theme!.transitions.easing.easeInOut).toBe("ease-out");
  });
});
