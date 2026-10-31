import { describe, expect, it } from "vitest";
import {
  createProvidedThemesSource,
  createThemeRuntime,
  defineTheme,
  generateTheme,
  getNeutralThemes,
  normalizeProvidedThemes,
  type ThemeDefinition,
} from "../src/index";

/**
 * Provider-aware theme discovery.
 *
 * The contract these tests pin is the one every framework integration exposes:
 * exactly the themes the provider was given, grouped by family, variants kept
 * apart, order preserved, identity stable, nothing leaked between providers.
 */

const theme = (
  name: string,
  family: string | undefined,
  mode: "light" | "dark",
  extra: Partial<ThemeDefinition> = {},
): ThemeDefinition =>
  defineTheme({
    name,
    ...(family ? { meta: { family, mode } } : { meta: { mode } }),
    tokens: { colors: { background: mode === "dark" ? "#000" : "#fff" } },
    ...extra,
  }) as ThemeDefinition;

const mintLight = theme("mint-light", "mint", "light");
const mintDark = theme("mint-dark", "mint", "dark");
const oatLight = theme("oat-light", "oat", "light");

describe("normalizeProvidedThemes", () => {
  it("groups variants under their family in supplied order", () => {
    const families = normalizeProvidedThemes([mintLight, oatLight, mintDark]);

    expect(families.map((family) => family.family)).toEqual(["mint", "oat"]);
    expect(families[0]!.variants.map((variant) => variant.name)).toEqual([
      "mint-light",
      "mint-dark",
    ]);
    expect(families[0]!.variants.map((variant) => variant.mode)).toEqual([
      "light",
      "dark",
    ]);
  });

  it("keeps light and dark as variants instead of flattening them", () => {
    const [mint] = normalizeProvidedThemes([mintLight, mintDark]);

    expect(mint!.variants).toHaveLength(2);
    expect(mint!.variants[1]!.tokens.colors?.background).toBe("#000");
  });

  it("carries family metadata and the resolved tokens", () => {
    const labelled = defineTheme({
      name: "mint-light",
      meta: { family: "mint", mode: "light", label: "Mint", description: "Fresh" },
      tokens: { colors: { background: "#f0fff0" } },
    }) as ThemeDefinition;

    const [mint] = normalizeProvidedThemes([labelled]);

    expect(mint!.name).toBe("Mint");
    expect(mint!.meta?.description).toBe("Fresh");
    expect(mint!.variants[0]!.tokens.colors?.background).toBe("#f0fff0");
    // The definition the provider holds is reachable unchanged.
    expect(mint!.variants[0]!.theme.name).toBe("mint-light");
  });

  it("gives a family with no meta.family the canonical default family", () => {
    const bare = theme("plain", undefined, "light");

    const families = normalizeProvidedThemes([bare]);

    expect(families).toHaveLength(1);
    expect(families[0]!.family).toBe("default");
    expect(families[0]!.id).toBe("default");
  });

  it("reads provenance only from explicit markers", () => {
    const generated = generateTheme({ seed: "#635BFF", family: "brand" });
    const plain = theme("mint-light", "mint", "light");

    const [brand] = normalizeProvidedThemes([generated.light]);
    const [mint] = normalizeProvidedThemes([plain]);

    expect(brand!.provenance).toEqual({
      kind: "generated",
      algorithm: expect.any(String),
    });
    // Nothing is guessed from the name.
    expect(mint!.provenance).toBeUndefined();
  });

  it("reuses unchanged entries so identity survives an ordinary update", () => {
    const first = normalizeProvidedThemes([mintLight, mintDark]);
    const second = normalizeProvidedThemes([mintLight, mintDark], first);

    expect(second).toBe(first);
    expect(second[0]).toBe(first[0]);
  });

  it("replaces only the family whose tokens changed", () => {
    const first = normalizeProvidedThemes([mintLight, oatLight]);
    const changedMint = defineTheme({
      name: "mint-light",
      meta: { family: "mint", mode: "light" },
      tokens: { colors: { background: "#123456" } },
    }) as ThemeDefinition;

    const second = normalizeProvidedThemes([changedMint, oatLight], first);

    expect(second[0]).not.toBe(first[0]);
    expect(second[0]!.variants[0]!.tokens.colors?.background).toBe("#123456");
    expect(second[1]).toBe(first[1]);
  });

  it("does not mutate the caller's definitions", () => {
    const snapshot = JSON.stringify(mintLight);
    const families = normalizeProvidedThemes([mintLight]);
    families[0]!.variants[0]!.tokens.colors!.background = "#ff0000";

    expect(JSON.stringify(mintLight)).toBe(snapshot);
  });

  it("drops a duplicate theme name, first definition winning", () => {
    const duplicate = defineTheme({
      name: "mint-light",
      meta: { family: "mint", mode: "light" },
      tokens: { colors: { background: "#abcdef" } },
    }) as ThemeDefinition;

    const [mint] = normalizeProvidedThemes([mintLight, duplicate]);

    expect(mint!.variants).toHaveLength(1);
    expect(mint!.variants[0]!.tokens.colors?.background).toBe("#fff");
  });
});

describe("createProvidedThemesSource", () => {
  const base = {
    dom: false as const,
    cssVariables: false as const,
    persistence: null,
    broadcast: null,
    readPersistenceOnInit: false,
  };

  it("reflects exactly the themes the provider was given", () => {
    const runtime = createThemeRuntime({
      ...base,
      themes: [mintLight, mintDark, oatLight],
    });

    const source = createProvidedThemesSource(runtime);
    const families = source.get();

    expect(families.map((family) => family.family)).toEqual(["mint", "oat"]);
    expect(families).toHaveLength(2);
  });

  it("does not add built-in themes the provider never received", () => {
    const runtime = createThemeRuntime({ ...base, themes: [mintLight] });
    const families = createProvidedThemesSource(runtime).get();

    expect(families).toHaveLength(1);
    expect(getNeutralThemes().length).toBeGreaterThan(1);
  });

  it("adds a family registered after creation and removes one that goes away", () => {
    const runtime = createThemeRuntime({ ...base, themes: [mintLight] });
    const source = createProvidedThemesSource(runtime);
    let notifications = 0;
    source.subscribe(() => {
      notifications += 1;
    });

    expect(source.get().map((family) => family.family)).toEqual(["mint"]);

    runtime.use({ name: "extra", themes: [oatLight] });
    expect(source.get().map((family) => family.family)).toEqual(["mint", "oat"]);

    runtime.registry.unregister("oat-light");
    expect(source.get().map((family) => family.family)).toEqual(["mint"]);
    // No ghost entry: the removed family is gone, not emptied.
    expect(source.get().some((family) => family.family === "oat")).toBe(false);
    expect(notifications).toBeGreaterThanOrEqual(2);
  });

  it("reflects a replaced variant's tokens", () => {
    const runtime = createThemeRuntime({ ...base, themes: [mintLight, mintDark] });
    const source = createProvidedThemesSource(runtime);

    const before = source.get()[0]!.variants[1]!.tokens.colors?.background;
    runtime.registry.replace(
      "mint-dark",
      defineTheme({
        name: "mint-dark",
        meta: { family: "mint", mode: "dark" },
        tokens: { colors: { background: "#101010" } },
      }) as ThemeDefinition,
    );

    expect(source.get()[0]!.variants[1]!.tokens.colors?.background).toBe("#101010");
    expect(before).not.toBe("#101010");
  });

  it("replaces the whole collection when the catalog prop changes", () => {
    const runtime = createThemeRuntime({ ...base, themes: [mintLight, mintDark] });
    const source = createProvidedThemesSource(runtime);

    runtime.configure({ themes: [oatLight] });

    expect(source.get().map((family) => family.family)).toEqual(["oat"]);
  });

  it("returns a stable snapshot while nothing changes", () => {
    const runtime = createThemeRuntime({ ...base, themes: [mintLight, mintDark] });
    const source = createProvidedThemesSource(runtime);

    const first = source.get();
    const second = source.get();

    expect(second).toBe(first);
  });

  it("keeps two providers isolated", () => {
    const one = createThemeRuntime({ ...base, themes: [mintLight] });
    const two = createThemeRuntime({ ...base, themes: [oatLight] });

    const a = createProvidedThemesSource(one);
    const b = createProvidedThemesSource(two);

    one.use({ name: "extra", themes: [theme("berry-light", "berry", "light")] });

    expect(a.get().map((family) => family.family)).toEqual(["mint", "berry"]);
    expect(b.get().map((family) => family.family)).toEqual(["oat"]);
  });

  it("mixes user-defined, generated, preset and neutral themes", () => {
    const generated = generateTheme({ seed: "#0ea5e9", family: "sky" });
    const neutral = getNeutralThemes()[0]!;
    const runtime = createThemeRuntime({
      ...base,
      themes: [mintLight, mintDark, generated.light, generated.dark, neutral],
    });

    const families = createProvidedThemesSource(runtime).get();
    const names = families.map((family) => family.family);

    expect(names).toContain("mint");
    expect(names).toContain("sky");
    expect(names.length).toBeGreaterThanOrEqual(3);
    // The generated pair is one family with two variants, not two families.
    const sky = families.find((family) => family.family === "sky")!;
    expect(sky.variants).toHaveLength(2);
    expect(sky.provenance?.kind).toBe("generated");
  });
});
