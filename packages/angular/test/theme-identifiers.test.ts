import { describe, expect, it } from "vitest";
import { defineTheme, type ThemeDefinition } from "@themvora/core";
// `import type` is erased, so this file stays a pure type test: it never loads
// Angular's DI runtime (which needs the JIT compiler outside a real bootstrap).
import type { provideTheme } from "../src/lib/provider";
import type { createBlockingScriptContent } from "../src/lib/blocking-script";

/**
 * IntelliSense for the Angular surface.
 *
 * `provideTheme<T>` and `createBlockingScriptContent<T>` infer `T` from the
 * `themes` they are given, so the selection props complete both naming forms —
 * the exact variant and the family — and reject identifiers the collection does
 * not contain. `vitest` runs these as no-ops; `tsc -p tsconfig.typetest.json` is
 * what fails when the inference regresses.
 */

const themes = [
  defineTheme({
    name: "oat-light",
    meta: { family: "oat", mode: "light" },
    tokens: { colors: { background: "#fdf6e3" } },
  }),
  defineTheme({
    name: "oat-dark",
    meta: { family: "oat", mode: "dark" },
    tokens: { colors: { background: "#1c1917" } },
  }),
  defineTheme({
    name: "cocoa-light",
    meta: { family: "cocoa", mode: "light" },
    tokens: { colors: { background: "#fff7ed" } },
  }),
  defineTheme({
    name: "cocoa-dark",
    meta: { family: "cocoa", mode: "dark" },
    tokens: { colors: { background: "#431407" } },
  }),
];

type Theme = (typeof themes)[number];

/** The options object `provideTheme` accepts once `T` is inferred. */
type ProvideOptions = Parameters<typeof provideTheme<Theme>>[0];
/** The fallback-options argument of `createBlockingScriptContent`. */
type ScriptOptions = Parameters<typeof createBlockingScriptContent<Theme>>[2];

describe("provideTheme accepts every supplied identifier", () => {
  it("accepts a family and a variant", () => {
    const family: ProvideOptions = { themes, defaultTheme: "cocoa" };
    const variant: ProvideOptions = { themes, defaultTheme: "cocoa-dark" };
    const override: ProvideOptions = { themes, themeOverride: "oat" };
    expect([family, variant, override]).toHaveLength(3);
  });

  it("rejects an unknown family", () => {
    // @ts-expect-error `berry` is not in the supplied collection
    const options: ProvideOptions = { themes, defaultTheme: "berry" };
    expect(options).toBeTruthy();
  });

  it("rejects an unknown variant", () => {
    // @ts-expect-error `cocoa-medium` is not in the supplied collection
    const options: ProvideOptions = { themes, themeOverride: "cocoa-medium" };
    expect(options).toBeTruthy();
  });

  it("keeps the dynamic path usable", () => {
    type Dynamic = Parameters<typeof provideTheme<ThemeDefinition>>[0];
    const options: Dynamic = { themes: [...themes], defaultTheme: "anything" };
    expect(options).toBeTruthy();
  });
});

describe("the blocking script accepts the same identifiers", () => {
  it("accepts both naming forms", () => {
    const family: ScriptOptions = { defaultTheme: "oat" };
    const variant: ScriptOptions = { themeOverride: "cocoa-dark" };
    expect([family, variant]).toHaveLength(2);
  });

  it("rejects an unknown variant", () => {
    // @ts-expect-error `cocoa-medium` is not in the supplied collection
    const options: ScriptOptions = { themeOverride: "cocoa-medium" };
    expect(options).toBeTruthy();
  });
});
