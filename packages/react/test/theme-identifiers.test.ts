import { describe, expect, it } from "vitest";
import { expectTypeOf } from "vitest";
import { defineTheme, type ThemeDefinition } from "@themvora/core";
import type { ThemeProviderProps } from "../src/index";

/**
 * IntelliSense from the supplied theme collection.
 *
 * These are *type* assertions: `vitest` runs them as no-ops, and
 * `tsc -p tsconfig.typetest.json` is what fails when inference regresses. Both
 * are part of the verification for this change — a `string`-typed prop would pass
 * every runtime test in this repository and still give the user no completions.
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
type Override = NonNullable<Props["themeOverride"]>;

describe("selection props accept every supplied identifier", () => {
  it("offers each variant and family to defaultTheme", () => {
    // Every one of these must be assignable, or the editor cannot suggest it.
    expectTypeOf<"oat-light">().toMatchTypeOf<DefaultTheme>();
    expectTypeOf<"oat-dark">().toMatchTypeOf<DefaultTheme>();
    expectTypeOf<"cocoa-light">().toMatchTypeOf<DefaultTheme>();
    expectTypeOf<"cocoa-dark">().toMatchTypeOf<DefaultTheme>();
    expectTypeOf<"oat">().toMatchTypeOf<DefaultTheme>();
    expectTypeOf<"cocoa">().toMatchTypeOf<DefaultTheme>();
  });

  it("offers each variant and family to themeOverride", () => {
    expectTypeOf<"cocoa-light">().toMatchTypeOf<Override>();
    expectTypeOf<"cocoa-dark">().toMatchTypeOf<Override>();
    expectTypeOf<"cocoa">().toMatchTypeOf<Override>();
    expectTypeOf<{ family: "cocoa"; mode: "dark" }>().toMatchTypeOf<Override>();
  });

  it("constrains initialFamily to the supplied identifiers", () => {
    // A family is the documented form; a variant is accepted too and normalised
    // to its family (its mode applies only when `initialMode` is absent). Both
    // are in the union so the documented variant example compiles.
    expectTypeOf<Props["initialFamily"]>().toEqualTypeOf<
      "oat-light" | "oat-dark" | "cocoa-light" | "cocoa-dark" | "oat" | "cocoa" | undefined
    >();
  });

  it("constrains initialMode to the supplied modes plus system", () => {
    expectTypeOf<Props["initialMode"]>().toEqualTypeOf<
      "light" | "dark" | "system" | undefined
    >();
  });
});

describe("invalid identifiers are rejected at compile time", () => {
  it("rejects an unknown family", () => {
    // @ts-expect-error `berry` is not in the supplied collection
    const props: Props = { themes, defaultTheme: "berry", children: null };
    expect(props).toBeTruthy();
  });

  it("rejects an unknown variant", () => {
    // @ts-expect-error `cocoa-medium` is not in the supplied collection
    const props: Props = { themes, themeOverride: "cocoa-medium", children: null };
    expect(props).toBeTruthy();
  });

  it("rejects an identifier that is not in the collection", () => {
    // @ts-expect-error `berry-dark` is not in the supplied collection
    const props: Props = { themes, initialFamily: "berry-dark", children: null };
    expect(props).toBeTruthy();
  });
});

describe("the dynamic path still works", () => {
  it("accepts plain strings when the collection is not statically known", () => {
    // A generated or fetched catalog is a `ThemeDefinition[]`; its values cannot
    // be known at compile time, and the props must not become unusable because
    // of that.
    const dynamic: ThemeDefinition[] = [...themes];
    type DynamicProps = ThemeProviderProps<ThemeDefinition>;

    expectTypeOf<DynamicProps["defaultTheme"]>().toEqualTypeOf<string | undefined>();

    const props: DynamicProps = { themes: dynamic, defaultTheme: "anything", children: null };
    expect(props).toBeTruthy();
  });
});
