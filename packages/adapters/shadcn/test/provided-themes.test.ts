// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { createThemeRuntime, defineTheme } from "@themvora/core";
import { createShadcnAdapter, createShadcnVariables } from "../src";

/**
 * shadcn/Tailwind propagation.
 *
 * shadcn components consume `--background` / `--primary` / … which the adapter
 * derives from Themvora's tokens. A theme change must rewrite those variables —
 * they are the *only* thing the components read, so a stale value means the
 * component keeps the previous palette while the rest of the page moves.
 */

const theme = (name: string, mode: "light" | "dark", background: string, primary: string) =>
  defineTheme({
    name,
    meta: { mode },
    tokens: {
      colors: {
        background,
        foreground: mode === "dark" ? "#fafafa" : "#0a0a0a",
        card: background,
        cardForeground: mode === "dark" ? "#fafafa" : "#0a0a0a",
        primary,
        primaryForeground: "#ffffff",
        secondary: "#f4f4f5",
        secondaryForeground: "#18181b",
        muted: "#f4f4f5",
        mutedForeground: "#71717a",
        accent: "#f4f4f5",
        accentForeground: "#18181b",
        destructive: "#ef4444",
        destructiveForeground: "#ffffff",
        border: "#e4e4e7",
        input: "#e4e4e7",
        ring: primary,
      },
      radius: { lg: "0.5rem" },
    },
  });

const light = theme("mint-light", "light", "#f0fff4", "#16a34a");
const dark = theme("mint-dark", "dark", "#052e16", "#4ade80");

afterEach(() => {
  document.getElementById("themvora-shadcn-variables")?.remove();
  document.getElementById("@themvora/shadcn")?.remove();
});

function variablesStyle(): string {
  return document.getElementById("themvora-shadcn-variables")?.textContent ?? "";
}

describe("shadcn variables follow the theme selection", () => {
  it("rewrites the variables on a theme change", () => {
    const runtime = createThemeRuntime({
      themes: [light, dark],
      dom: false,
      cssVariables: false,
      persistence: null,
      broadcast: null,
      readPersistenceOnInit: false,
    } as never);

    const adapter = createShadcnAdapter();
    runtime.adapters.use(adapter as never);

    const before = variablesStyle();
    expect(before).toContain("#f0fff4");

    runtime.selection.setMode("dark");

    const after = variablesStyle();
    expect(after).toContain("#052e16");
    expect(after).not.toBe(before);
  });

  it("derives the same values as the pure generator", () => {
    const expected = createShadcnVariables(dark.tokens as never);

    const runtime = createThemeRuntime({
      themes: [light, dark],
      dom: false,
      cssVariables: false,
      persistence: null,
      broadcast: null,
      readPersistenceOnInit: false,
    } as never);

    runtime.adapters.use(createShadcnAdapter() as never);
    runtime.selection.setMode("dark");

    // One derivation, so the injected stylesheet cannot disagree with a
    // consumer that calls the generator directly (an SSR pass, say).
    const injected = variablesStyle().replace(/\s+/g, "");
    for (const [key, value] of Object.entries(expected)) {
      expect(injected).toContain(`${key}:${value}`);
    }
  });
});
