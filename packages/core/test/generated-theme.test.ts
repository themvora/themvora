import { describe, expect, it } from "vitest";
import {
  createThemeRegistry,
  createThemeRuntime,
  findGeneratedTheme,
  generateTheme,
  getBrandPresets,
  getBuiltInThemes,
  getNeutralThemes,
  getPresetThemes,
  isGeneratedTheme,
  resolveGeneratedTheme,
  ThemeError,
  type ThemeDefinition,
} from "../src";

/**
 * The generated-theme accessor contract: provenance, resolution, and the
 * guarantee that shipped presets are never mistaken for generated themes.
 */
describe("isGeneratedTheme", () => {
  it("is true for the output of generateTheme()", () => {
    const { light, dark } = generateTheme({ seed: "#635BFF" });

    expect(isGeneratedTheme(light)).toBe(true);
    expect(isGeneratedTheme(dark)).toBe(true);
    expect(light.meta?.generation?.kind).toBe("generated");
  });

  it("is false for every shipped preset and the neutral baseline", () => {
    // The regression guard: presets are produced by the same engine and carry
    // `meta.generation`, but they are not application-generated. If a preset ever
    // starts being marked, `useGeneratedTheme()` would return a shipped theme.
    const shipped: readonly ThemeDefinition[] = [
      ...getPresetThemes(),
      ...getBrandPresets(),
      ...getNeutralThemes(),
      ...getBuiltInThemes(),
    ];

    expect(shipped.length).toBeGreaterThan(0);
    for (const theme of shipped) {
      expect(isGeneratedTheme(theme), `${theme.name} must not be marked generated`).toBe(false);
      expect(theme.meta?.generation?.kind, `${theme.name} must not set kind`).toBeUndefined();
    }
  });

  it("is false for a hand-authored theme that mimics the metadata", () => {
    const impostor: ThemeDefinition = {
      name: "generated-light",
      meta: { family: "generated", mode: "light", generation: { algorithm: "semantic-v2", seed: "#000000" } },
      tokens: { colors: {} },
    };

    expect(isGeneratedTheme(impostor)).toBe(false);
  });
});

describe("findGeneratedTheme", () => {
  it("reports missing when only presets are registered", () => {
    const result = findGeneratedTheme(getPresetThemes());

    expect(result.status).toBe("missing");
    expect(result.theme).toBeNull();
  });

  it("finds the single registered generated theme", () => {
    const { light } = generateTheme({ seed: "#635BFF", family: "brand" });
    const result = findGeneratedTheme([...getPresetThemes(), light]);

    expect(result.status).toBe("found");
    expect(result.theme?.name).toBe("brand-light");
    expect(result.candidates).toHaveLength(1);
  });

  it("disambiguates multiple generated themes via the active theme", () => {
    const a = generateTheme({ seed: "#635BFF", family: "a" });
    const b = generateTheme({ seed: "#d97706", family: "b" });
    const themes = [a.light, a.dark, b.light, b.dark];

    expect(findGeneratedTheme(themes, b.dark).theme?.name).toBe("b-dark");
  });

  it("is ambiguous when several generated themes are registered and none is active", () => {
    const a = generateTheme({ seed: "#635BFF", family: "a" });
    const b = generateTheme({ seed: "#d97706", family: "b" });
    const active = getPresetThemes()[0]!;

    const result = findGeneratedTheme([a.light, a.dark, b.light, b.dark], active);
    expect(result.status).toBe("ambiguous");
    expect(result.theme).toBeNull();
  });
});

describe("resolveGeneratedTheme", () => {
  it("returns the generated theme", () => {
    const { light } = generateTheme({ seed: "#635BFF", family: "brand" });

    expect(resolveGeneratedTheme([...getPresetThemes(), light]).name).toBe("brand-light");
  });

  it("throws TV_GENERATION_THEME_NOT_FOUND when only presets are registered", () => {
    let error: unknown;
    try {
      resolveGeneratedTheme(getPresetThemes());
    } catch (caught) {
      error = caught;
    }

    expect(error).toBeInstanceOf(ThemeError);
    expect((error as ThemeError).code).toBe("TV_GENERATION_THEME_NOT_FOUND");
  });

  it("throws TV_GENERATION_THEME_AMBIGUOUS rather than returning the first entry", () => {
    const a = generateTheme({ seed: "#635BFF", family: "a" });
    const b = generateTheme({ seed: "#d97706", family: "b" });
    const active = getPresetThemes()[0]!;

    let error: unknown;
    try {
      resolveGeneratedTheme([a.light, a.dark, b.light, b.dark], active);
    } catch (caught) {
      error = caught;
    }

    expect(error).toBeInstanceOf(ThemeError);
    expect((error as ThemeError).code).toBe("TV_GENERATION_THEME_AMBIGUOUS");
  });

  it("resolves the active generated theme when several are registered", () => {
    const a = generateTheme({ seed: "#635BFF", family: "a" });
    const b = generateTheme({ seed: "#d97706", family: "b" });

    expect(resolveGeneratedTheme([a.light, a.dark, b.light, b.dark], b.light).name).toBe("b-light");
  });
});

describe("provenance survives the supported registration paths", () => {
  it("survives ThemeRegistry registration", () => {
    const { light } = generateTheme({ seed: "#635BFF", family: "brand" });
    const registry = createThemeRegistry({ themes: [light] });

    const registered = registry.get("brand-light");
    expect(registered).toBeDefined();
    expect(isGeneratedTheme(registered!)).toBe(true);
  });

  it("survives a JSON round-trip", () => {
    const { light } = generateTheme({ seed: "#635BFF", family: "brand" });
    const revived = JSON.parse(JSON.stringify(light)) as ThemeDefinition;

    expect(isGeneratedTheme(revived)).toBe(true);
  });
});

describe("registration via runtime.use(pack)", () => {
  function makeRuntime() {
    const preset = getPresetThemes()[0]!;
    return createThemeRuntime({
      themes: [preset],
      defaultTheme: preset.name,
      dom: false,
      cssVariables: false,
      persistence: null,
      broadcast: null,
    } as any);
  }

  it("notifies registry subscribers and makes the generated theme resolvable", () => {
    const runtime = makeRuntime();
    let notified = 0;
    const unsubscribe = runtime.registry.subscribe(() => {
      notified += 1;
    });

    const { light } = generateTheme({ seed: "#635BFF", family: "brand" });
    runtime.use({ name: "brand", themes: [light] });

    expect(notified).toBeGreaterThan(0);
    expect(resolveGeneratedTheme(runtime.themes, runtime.store.get()).name).toBe("brand-light");

    unsubscribe();
    runtime.destroy();
  });

  it("disambiguates a generated pair installed by a pack through the active selection", () => {
    const runtime = makeRuntime();
    const { light, dark } = generateTheme({ seed: "#635BFF", family: "brand" });
    runtime.use({ name: "brand", themes: [light, dark] });

    // Two generated themes with a preset active: ambiguous, not "first entry".
    let error: unknown;
    try {
      resolveGeneratedTheme(runtime.themes, runtime.store.get());
    } catch (caught) {
      error = caught;
    }
    expect((error as ThemeError | undefined)?.code).toBe("TV_GENERATION_THEME_AMBIGUOUS");

    // Installing a pack makes the themes selectable; selecting one resolves it.
    runtime.selection.setFamily("brand");
    expect(resolveGeneratedTheme(runtime.themes, runtime.store.get()).name).toBe("brand-light");

    runtime.destroy();
  });
});

describe("registry transactions are atomic", () => {
  const themeOf = (name: string): ThemeDefinition => ({
    name,
    meta: { family: "x", mode: "light" },
    tokens: { colors: {} },
  });

  it("a batch with several mutations notifies exactly once", () => {
    const registry = createThemeRegistry();
    let notifications = 0;
    registry.subscribe(() => {
      notifications += 1;
    });

    registry.batch(() => {
      registry.register(themeOf("a"));
      registry.register(themeOf("b"));
      registry.register(themeOf("c"));
    });

    expect(notifications).toBe(1);
    expect(registry.list().map((t) => t.name)).toEqual(["a", "b", "c"]);
  });

  it("never exposes an intermediate empty or partial state", () => {
    const registry = createThemeRegistry({ themes: [themeOf("base")] });
    const observed: string[][] = [];
    registry.subscribe(() => {
      observed.push(registry.list().map((t) => t.name));
    });

    registry.batch(() => {
      registry.clear();
      registry.register(themeOf("a"));
      registry.register(themeOf("b"));
    });

    // One coherent notification, and never the empty or half-applied registry.
    expect(observed).toEqual([["a", "b"]]);
  });

  it("registerMany notifies once", () => {
    const registry = createThemeRegistry();
    let notifications = 0;
    registry.subscribe(() => {
      notifications += 1;
    });

    registry.registerMany([themeOf("a"), themeOf("b"), themeOf("c")]);
    expect(notifications).toBe(1);
  });

  it("a batch with no mutation does not notify", () => {
    const registry = createThemeRegistry({ themes: [themeOf("a")] });
    let notifications = 0;
    registry.subscribe(() => {
      notifications += 1;
    });

    registry.batch(() => {});
    expect(notifications).toBe(0);
  });

  it("destroy() stays silent", () => {
    const registry = createThemeRegistry({ themes: [themeOf("a")] });
    let notifications = 0;
    registry.subscribe(() => {
      notifications += 1;
    });

    registry.destroy();
    expect(notifications).toBe(0);
  });
});

describe("runtime.restore() is one atomic registry transaction", () => {
  it("emits a single notification and no empty intermediate state", () => {
    const preset = getPresetThemes()[0]!;
    const { light, dark } = generateTheme({ seed: "#635BFF", family: "brand" });
    const runtime = createThemeRuntime({
      themes: [preset, light, dark],
      defaultTheme: preset.name,
      dom: false,
      cssVariables: false,
      persistence: null,
      broadcast: null,
    } as any);

    const snapshot = runtime.snapshot();

    const observedLengths: number[] = [];
    runtime.registry.subscribe(() => {
      observedLengths.push(runtime.registry.list().length);
    });

    runtime.restore(snapshot);

    expect(observedLengths).toEqual([3]);
    runtime.destroy();
  });

  it("replacing a generated theme via restore resolves the replacement (no stale)", () => {
    const first = generateTheme({ seed: "#635BFF", family: "brand" }).light;
    const runtime = createThemeRuntime({
      themes: [first],
      dom: false,
      cssVariables: false,
      persistence: null,
      broadcast: null,
    } as any);

    expect(resolveGeneratedTheme(runtime.themes, runtime.store.get()).meta?.label).toBe("Brand Light");

    const snapshot = runtime.snapshot();
    const restored = {
      ...snapshot,
      registry: {
        themes: [
          { ...first, meta: { ...first.meta, label: "Restored Light" } },
        ],
      },
    };
    runtime.restore(restored);

    expect(resolveGeneratedTheme(runtime.themes, runtime.store.get()).meta?.label).toBe("Restored Light");
    runtime.destroy();
  });
});

describe("removal semantics", () => {
  it("a generated theme removed after resolution becomes missing, not stale", () => {
    const { light } = generateTheme({ seed: "#635BFF", family: "brand" });
    const runtime = createThemeRuntime({
      themes: [light],
      dom: false,
      cssVariables: false,
      persistence: null,
      broadcast: null,
    } as any);

    expect(resolveGeneratedTheme(runtime.themes, runtime.store.get()).name).toBe("brand-light");

    runtime.registry.unregister("brand-light");

    expect(findGeneratedTheme(runtime.themes, runtime.store.get()).status).toBe("missing");
    expect(() => resolveGeneratedTheme(runtime.themes, runtime.store.get())).toThrowError(
      /No generated theme/,
    );

    runtime.destroy();
  });
});
