import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { defineTheme, resolveInitialTheme, themeToCSSVariables } from "@themvora/core";
import { getBlockingScriptContent } from "../src/blocking-script";
import { getThemeShellProps } from "../src/shell";

/**
 * The Remix shell is a hand-written copy of a contract the bootstrap script
 * implements, and until this file existed nothing compared the two. A bare
 * `<html lang="en">` — the shape both the example app and the guide shipped —
 * hydrates against seven attributes it never rendered, and React reports it on
 * every load:
 *
 *   A tree hydrated but some attributes of the server rendered HTML didn't
 *   match the client properties. This won't be patched up.
 *
 * These tests execute the *real* generated script against a stubbed document and
 * compare its attribute writes with what `getThemeShellProps` renders, so the
 * two halves of the contract cannot drift again.
 */
const themes = [
  defineTheme({
    name: "mint-light",
    meta: { family: "mint", mode: "light" },
    tokens: { colors: { background: "#ffffff", foreground: "#101014" } },
  }),
  defineTheme({
    name: "mint-dark",
    meta: { family: "mint", mode: "dark" },
    tokens: { colors: { background: "#101014", foreground: "#ffffff" } },
  }),
  defineTheme({
    name: "ocean-light",
    meta: { family: "ocean", mode: "light" },
    tokens: { colors: { background: "#f2f8ff" } },
  }),
  defineTheme({
    name: "ocean-dark",
    meta: { family: "ocean", mode: "dark" },
    tokens: { colors: { background: "#04121f" } },
  }),
];

/** A theme that declares no `meta.family`, so `data-theme-family` is omitted. */
const bareTheme = defineTheme({
  name: "bare-light",
  meta: { mode: "light" },
  tokens: { colors: { background: "#fafafa" } },
});

interface ScriptResult {
  attributes: Record<string, string>;
  classes: string[];
  colorScheme: string | null;
  variables: Record<string, string>;
}

/**
 * Runs the generated pre-paint script against a stubbed document.
 *
 * @param source - The script body from `getBlockingScriptContent`.
 * @param env - The cookie header and the OS colour-scheme preference.
 * @returns Everything the script wrote to the document element.
 */
function runScript(
  source: string,
  env: { cookie?: string; systemDark?: boolean } = {},
): ScriptResult {
  const { cookie = "", systemDark = false } = env;

  const classes = new Set<string>();
  const attributes: Record<string, string> = {};
  const variables: Record<string, string> = {};
  const style = {
    colorScheme: "" as string,
    setProperty(name: string, value: string) {
      variables[name] = value;
    },
    removeProperty(name: string) {
      delete variables[name];
    },
  };

  const scope = globalThis as { document?: unknown; window?: unknown };
  const previousDocument = scope.document;
  const previousWindow = scope.window;

  scope.document = {
    documentElement: {
      classList: {
        add: (name: string) => classes.add(name),
        remove: (name: string) => classes.delete(name),
        contains: (name: string) => classes.has(name),
      },
      style,
      setAttribute(name: string, value: string) {
        attributes[name] = String(value);
      },
    },
    cookie,
    // `__tvPatch` walks the readout contract; the shell test does not render
    // any, so an empty result is the honest stub.
    querySelectorAll: () => [],
  };
  scope.window = {
    matchMedia: (query: string) => ({
      matches: query.includes("dark") ? systemDark : !systemDark,
    }),
  };

  try {
    // Indirect eval so the script runs against the stubbed globals.
    (0, eval)(source);
  } finally {
    scope.document = previousDocument;
    scope.window = previousWindow;
  }

  return {
    attributes,
    classes: [...classes],
    colorScheme: style.colorScheme === "" ? null : style.colorScheme,
    variables,
  };
}

/** The six attributes the script writes that the shell must also render. */
const SHELL_ATTRIBUTES = [
  "data-theme",
  "data-theme-mode",
  "data-theme-family",
  "data-theme-selection-mode",
  "data-theme-selection-family",
  "data-theme-ready",
] as const;

function shellAttributes(props: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const name of SHELL_ATTRIBUTES) {
    const value = props[name];
    if (typeof value === "string") out[name] = value;
  }
  return out;
}

describe("getThemeShellProps — parity with the pre-paint script", () => {
  it("renders exactly the attributes the script writes on a first visit", () => {
    const initial = resolveInitialTheme({ themes, defaultTheme: "mint-light" });
    const script = runScript(getBlockingScriptContent(themes, "mint-light"));

    expect(shellAttributes(getThemeShellProps(initial))).toEqual(
      shellAttributes(script.attributes),
    );
  });

  it("keeps parity for a persisted dark selection", () => {
    const initial = resolveInitialTheme({
      themes,
      defaultTheme: "mint-light",
      mode: "dark",
    });
    const script = runScript(
      getBlockingScriptContent(themes, "mint-light", "dark"),
    );

    expect(shellAttributes(getThemeShellProps(initial))).toEqual(
      shellAttributes(script.attributes),
    );
    expect(getThemeShellProps(initial)["data-theme-mode"]).toBe("dark");
  });

  it("keeps parity for a `system` selection resolved to light", () => {
    const initial = resolveInitialTheme({
      themes,
      defaultTheme: "mint-light",
      mode: "system",
    });
    const script = runScript(
      getBlockingScriptContent(themes, "mint-light", "system"),
    );

    expect(shellAttributes(getThemeShellProps(initial))).toEqual(
      shellAttributes(script.attributes),
    );
    // The selection stays `system`; only the resolved mode is concrete.
    expect(getThemeShellProps(initial)["data-theme-selection-mode"]).toBe("system");
    expect(getThemeShellProps(initial)["data-theme-mode"]).toBe("light");
  });

  it("omits data-theme-family for a theme with no family", () => {
    const initial = resolveInitialTheme({ themes: [bareTheme] });

    const props = getThemeShellProps(initial);

    expect(props["data-theme"]).toBe("bare-light");
    // `meta.family` is what the runtime writes, and it writes `null` — removing
    // the attribute — for a theme that declares none. The *selection* still
    // carries the normalised family, so it is published.
    expect("data-theme-family" in props).toBe(false);
    expect(props["data-theme-selection-family"]).toBe("default");
  });

  it("renders the resolved theme's CSS variables and colour scheme", () => {
    const initial = resolveInitialTheme({ themes, defaultTheme: "mint-light" });

    const props = getThemeShellProps(initial);

    expect(props.style).toEqual({
      colorScheme: "light",
      ...themeToCSSVariables(initial.theme),
    });
    expect(props.style).toMatchObject({ "--theme-color-background": "#ffffff" });
  });
});

describe("getThemeShellProps — hydration", () => {
  it("always suppresses the hydration diff for the element it describes", () => {
    // Not a style choice: `data-theme-mode` is the *resolved* mode, so a
    // `system` selection on a dark OS legitimately differs from the server's
    // `light`. See the case below.
    const initial = resolveInitialTheme({ themes, defaultTheme: "mint-light" });

    expect(getThemeShellProps(initial).suppressHydrationWarning).toBe(true);
  });

  it("differs from the script only where a dark OS changes the resolution", () => {
    // The one mismatch the server cannot avoid — and the reason suppression is
    // scoped to `<html>` rather than removed. On a dark OS the `system`
    // selection resolves to the *dark theme*, so both the theme name and the
    // mode differ from the server's light guess. Everything the server can know
    // still agrees, so the diff stays as narrow as it can be.
    const initial = resolveInitialTheme({
      themes,
      defaultTheme: "mint-light",
      mode: "system",
    });
    const script = runScript(
      getBlockingScriptContent(themes, "mint-light", "system"),
      { systemDark: true },
    );
    const props = shellAttributes(getThemeShellProps(initial));
    const written = shellAttributes(script.attributes);

    expect(props["data-theme-mode"]).toBe("light");
    expect(written["data-theme-mode"]).toBe("dark");
    expect(props["data-theme"]).toBe("mint-light");
    expect(written["data-theme"]).toBe("mint-dark");
    // The selection is untouched by the OS, and so is the family.
    expect(props["data-theme-selection-mode"]).toBe("system");
    expect(written["data-theme-selection-mode"]).toBe("system");
    expect(props["data-theme-family"]).toBe(written["data-theme-family"]);
    expect(props["data-theme-selection-family"]).toBe(
      written["data-theme-selection-family"],
    );
  });
});

describe("getThemeShellProps — scrollbar opt-in", () => {
  it("adds tv-scrollbar when asked, and merges the app's own classes", () => {
    const initial = resolveInitialTheme({ themes, defaultTheme: "mint-light" });

    expect(getThemeShellProps(initial, { scrollbar: true }).className).toBe(
      "tv-scrollbar",
    );
    expect(
      getThemeShellProps(initial, { scrollbar: true, className: "app" }).className,
    ).toBe("app tv-scrollbar");
    expect(getThemeShellProps(initial, { className: "app" }).className).toBe("app");
    expect("className" in getThemeShellProps(initial)).toBe(false);
  });
});

describe("getThemeShellProps — server-rendered markup", () => {
  it("serializes the attributes onto the document element", () => {
    const initial = resolveInitialTheme({ themes, defaultTheme: "mint-light" });

    const markup = renderToStaticMarkup(
      <html lang="en" {...getThemeShellProps(initial, { scrollbar: true })}>
        <body />
      </html>,
    );

    expect(markup).toContain('data-theme="mint-light"');
    expect(markup).toContain('data-theme-mode="light"');
    expect(markup).toContain('data-theme-family="mint"');
    expect(markup).toContain('data-theme-selection-mode="light"');
    expect(markup).toContain('data-theme-ready="true"');
    expect(markup).toContain('class="tv-scrollbar"');
    expect(markup).toContain("--theme-color-background:#ffffff");
    // React's own prop must not leak into the HTML.
    expect(markup).not.toContain("suppressHydrationWarning");
  });
});
