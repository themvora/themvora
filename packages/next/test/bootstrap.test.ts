// @vitest-environment jsdom
import { Suspense } from "react";
import { describe, expect, it, vi } from "vitest";
import { defineTheme } from "@themvora/core";

vi.mock("next/headers", () => ({ cookies: vi.fn() }));
import { cookies } from "next/headers";
import { ThemeProvider } from "../src/layout";
import { computeFingerprint } from "../src/fingerprint";

/**
 * `ThemeProvider` builds the pre-paint script inline, so the only way to test
 * what it actually ships is to render the component and run the script it
 * emits. The previous contents of this file asserted that a component was
 * defined and that a value equalled itself, which is why the blocking script
 * could change without any test noticing.
 */
const themes = [
  defineTheme({
    name: "mint-light",
    meta: { family: "mint", mode: "light" },
    tokens: { colors: { background: "#ffffff" } },
  }),
  defineTheme({
    name: "mint-dark",
    meta: { family: "mint", mode: "dark" },
    tokens: { colors: { background: "#101014" } },
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

const fingerprint = computeFingerprint(themes, "mint-light");

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Node = any;

/** Depth-first search for the inline `<script>` in the rendered tree. */
function findBlockingScript(node: Node): string | null {
  if (!node || typeof node !== "object") return null;

  if (Array.isArray(node)) {
    for (const child of node) {
      const found = findBlockingScript(child);
      if (found) return found;
    }
    return null;
  }

  if (node.type === "script") {
    const html = node.props?.dangerouslySetInnerHTML?.__html;
    if (typeof html === "string") return html;
  }

  return findBlockingScript(node.props?.children);
}

/** Depth-first search for the `<Suspense>` boundary in the rendered tree. */
function findSuspense(node: Node): Node | null {
  if (!node || typeof node !== "object") return null;

  if (Array.isArray(node)) {
    for (const child of node) {
      const found = findSuspense(child);
      if (found) return found;
    }
    return null;
  }

  if (node.type === Suspense) return node;

  return findSuspense(node.props?.children);
}

async function render() {
  // Model Next's server cookie store from the test's cookie jar, so this test
  // exercises the same persisted selection in both server resolution and script.
  vi.mocked(cookies).mockResolvedValue({
    get: (name: string) => {
      const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
      return match ? { value: decodeURIComponent(match[1]!) } : undefined;
    },
  } as never);

  // `defaultTheme` is part of the fingerprint, so it must match the value the
  // cookie fingerprint was computed with or the script rejects the cookies.
  const element = await ThemeProvider({
    children: null,
    themes,
    defaultTheme: "mint-light",
  });
  const script = findBlockingScript(element);
  if (!script) throw new Error("ThemeProvider emitted no blocking script");
  return { element, script };
}

interface DomState {
  dark: boolean;
  colorScheme: string | null;
  theme: string | null;
  mode: string | null;
  family: string | null;
  variables: Record<string, string>;
}

function setOSDark(matches: boolean): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).matchMedia = (query: string) => ({
    matches: query.includes("dark") ? matches : !matches,
  });
}

function setCookies(parts: Record<string, string>): void {
  for (const [name, value] of Object.entries(parts)) {
    document.cookie = `${name}=${encodeURIComponent(value)}`;
  }
}

function clearCookies(): void {
  for (const name of ["theme-mode", "theme-family", "theme-fingerprint"]) {
    document.cookie = `${name}=; max-age=0`;
  }
}

function run(script: string): DomState {
  const el = document.documentElement;
  el.removeAttribute("style");
  for (const name of ["data-theme", "data-theme-mode", "data-theme-family"]) {
    el.removeAttribute(name);
  }
  el.classList.remove("dark");

  // eslint-disable-next-line no-eval
  (0, eval)(script);

  const variables: Record<string, string> = {};
  for (let i = 0; i < el.style.length; i++) {
    const prop = el.style.item(i);
    if (prop.startsWith("--")) variables[prop] = el.style.getPropertyValue(prop);
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const colorScheme = (el.style as any).colorScheme as string;

  return {
    dark: el.classList.contains("dark"),
    colorScheme: colorScheme === "" ? null : colorScheme,
    theme: el.getAttribute("data-theme"),
    mode: el.getAttribute("data-theme-mode"),
    family: el.getAttribute("data-theme-family"),
    variables,
  };
}

describe("@themvora/next ThemeProvider — blocking script", () => {
  it("emits the pre-paint script in <head>", async () => {
    const { script } = await render();

    expect(script).toContain("(function(){try{");
    expect(script).toContain("theme-mode");
    expect(script).toContain("theme-family");
    expect(script).toContain("theme-fingerprint");
    expect(script).toContain("prefers-color-scheme");
  });

  it("renders a request-independent shell and defers the cookie read behind Suspense", () => {
    clearCookies();
    vi.mocked(cookies).mockClear();

    // The document shell resolves from the configured default alone — it is
    // synchronous and reads no request data — so the hosting route stays
    // prerenderable under Next's Cache Components with no route opt-out.
    const element = ThemeProvider({
      children: null,
      themes,
      defaultTheme: "mint-light",
    });

    expect(element).toBeTruthy();
    expect(vi.mocked(cookies)).not.toHaveBeenCalled();

    const suspense = findSuspense(element);
    expect(
      suspense,
      "ThemeProvider must defer the cookie read behind a <Suspense> boundary",
    ).toBeTruthy();
    expect(suspense.props.fallback).toBeTruthy();
  });

  it("agrees with the server-rendered data-theme on a first visit", async () => {
    // The zero-flash invariant: on hydration nothing corrects the paint.
    clearCookies();
    setOSDark(false);
    const { element, script } = await render();

    expect(element.props["data-theme"]).toBe("mint-light");
    expect(run(script).theme).toBe("mint-light");
  });

  it("declares every attribute the blocking script writes onto <html>", async () => {
    // Regression guard. The script runs before React hydrates and writes onto
    // <html>; React's hydration diff treats an attribute that is in the DOM but
    // absent from the client props as a mismatch and reports the whole element.
    // A server that declared only some of them warned on every page load.
    //
    // The expected set is derived from the script rather than hard-coded, so
    // teaching the script a new attribute fails here instead of surfacing as a
    // development-only hydration warning nobody notices.
    clearCookies();
    setOSDark(false);
    const { element, script } = await render();

    const written = new Set(
      [...script.matchAll(/\bel\.setAttribute\('([a-z-]+)'/g)].map((m) => m[1]),
    );
    expect(written.size).toBeGreaterThan(0);

    run(script);
    const el = document.documentElement;

    for (const attribute of written) {
      expect(
        element.props[attribute],
        `<html> does not declare "${attribute}", which the blocking script writes`,
      ).toBeDefined();
      expect(String(element.props[attribute])).toBe(el.getAttribute(attribute));
    }

    // The document shell is request-independent, so it always names the
    // configured default while the blocking script may rewrite the attributes
    // from the persisted cookie. React's hydration attribute diff is therefore
    // suppressed on `<html>` — the element the script owns.
    expect(element.props.suppressHydrationWarning).toBe(true);
  });

  it("keeps the shell static and lets the bootstrap apply the persisted selection", async () => {
    clearCookies();
    setOSDark(false);
    setCookies({
      "theme-mode": "dark",
      "theme-family": "ocean",
      "theme-fingerprint": fingerprint,
    });
    const { element, script } = await render();

    // The document shell is request-independent (so the route stays
    // prerenderable under Cache Components), so it names the configured default.
    // The persisted selection is applied before the first frame by the blocking
    // script — and, server-side, by the Suspense-gated resolver that hands the
    // resolved selection to the client runtime.
    expect(element.props["data-theme"]).toBe("mint-light");
    expect(element.props["data-theme-mode"]).toBe("light");

    const dom = run(script);
    expect(dom.theme).toBe("ocean-dark");
    expect(dom.mode).toBe("dark");
    expect(dom.family).toBe("ocean");
    expect(element.props.suppressHydrationWarning).toBe(true);
  });

  it("ignores the OS on a first visit and paints the resolved default", async () => {
    // The script's fallback mode is the mode `resolveInitialTheme` resolved for
    // the default theme — the very value the client runtime adopts — so a
    // first-time visitor on a dark OS still paints the configured light default
    // instead of being flashed dark-then-light by the runtime. See the
    // `fallbackMode` note in `buildBootstrapPlan`.
    clearCookies();
    setOSDark(true);
    const { script } = await render();

    expect(run(script)).toEqual({
      dark: false,
      colorScheme: "light",
      theme: "mint-light",
      mode: "light",
      family: "mint",
      variables: { "--theme-color-background": "#ffffff" },
    });
  });

  it("follows the OS when the persisted selection is system", async () => {
    // The OS only decides the paint when the selection actually asks it to.
    clearCookies();
    setOSDark(true);
    setCookies({
      "theme-mode": "system",
      "theme-family": "mint",
      "theme-fingerprint": fingerprint,
    });
    const { script } = await render();

    expect(run(script)).toEqual({
      dark: true,
      colorScheme: "dark",
      theme: "mint-dark",
      mode: "dark",
      family: "mint",
      variables: { "--theme-color-background": "#101014" },
    });
  });

  it("applies the persisted selection when the fingerprint matches", async () => {
    clearCookies();
    setOSDark(false);
    setCookies({
      "theme-mode": "dark",
      "theme-family": "ocean",
      "theme-fingerprint": fingerprint,
    });
    const { script } = await render();

    expect(run(script)).toEqual({
      dark: true,
      colorScheme: "dark",
      theme: "ocean-dark",
      mode: "dark",
      family: "ocean",
      variables: { "--theme-color-background": "#04121f" },
    });
  });

  it("rejects stale cookies and falls back to the default", async () => {
    clearCookies();
    setOSDark(false);
    setCookies({
      "theme-mode": "dark",
      "theme-family": "ocean",
      "theme-fingerprint": "an-old-config",
    });
    const { script } = await render();

    const dom = run(script);
    expect(dom.theme).toBe("mint-light");
    expect(dom.dark).toBe(false);
    expect(dom.variables).toEqual({ "--theme-color-background": "#ffffff" });
  });

  it("writes the resolved family, not an unknown persisted one", async () => {
    clearCookies();
    setOSDark(false);
    setCookies({
      "theme-mode": "dark",
      "theme-family": "plum",
      "theme-fingerprint": fingerprint,
    });
    const { script } = await render();

    const dom = run(script);
    expect(dom.theme).toBe("mint-dark");
    expect(dom.family).toBe("mint");
  });

  it("is idempotent", async () => {
    clearCookies();
    setOSDark(false);
    setCookies({
      "theme-mode": "system",
      "theme-family": "ocean",
      "theme-fingerprint": fingerprint,
    });
    const { script } = await render();

    expect(run(script)).toEqual(run(script));
  });
});
