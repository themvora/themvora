import { describe, expect, it, expectTypeOf } from "vitest";
import { defineTheme } from "@themvora/core";
import type { ThemeProviderProps } from "../src/index";

/**
 * IntelliSense for the Next.js provider.
 *
 * `ThemeProviderProps<T>` derives `defaultTheme` from the `themes` it is given,
 * so a statically known collection completes **both** naming forms — the exact
 * variant and the family. `vitest` runs these as no-ops; `tsc -p
 * tsconfig.typetest.json` is what fails when the inference regresses.
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
] as const;

type Props = ThemeProviderProps<(typeof themes)[number]>;
type DefaultTheme = NonNullable<Props["defaultTheme"]>;

describe("Next.js selection props accept every supplied identifier", () => {
  it("offers each variant and family to defaultTheme", () => {
    expectTypeOf<"oat-light">().toMatchTypeOf<DefaultTheme>();
    expectTypeOf<"cocoa-dark">().toMatchTypeOf<DefaultTheme>();
    expectTypeOf<"oat">().toMatchTypeOf<DefaultTheme>();
    expectTypeOf<"cocoa">().toMatchTypeOf<DefaultTheme>();
  });

  it("rejects an unknown family", () => {
    // @ts-expect-error `berry` is not in the supplied collection
    const props: Props = { themes, defaultTheme: "berry", children: null };
    expect(props).toBeTruthy();
  });

  it("rejects an unknown variant", () => {
    // @ts-expect-error `cocoa-medium` is not in the supplied collection
    const props: Props = { themes, defaultTheme: "cocoa-medium", children: null };
    expect(props).toBeTruthy();
  });

  it("keeps the dynamic path usable", () => {
    type DynamicProps = ThemeProviderProps<import("@themvora/core").ThemeDefinition>;
    expectTypeOf<DynamicProps["defaultTheme"]>().toEqualTypeOf<string | undefined>();
  });
});
