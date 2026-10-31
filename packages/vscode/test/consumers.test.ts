/**
 * Consumer-recognition tests.
 *
 * Each positive case uses the API as the shipped package documents it; each
 * negative case uses the same spelling without the import binding. That pairing
 * is the point: the recognizer must not be a name matcher.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { recognizeConsumers } from "../src/domain/consumers";

/** One real example app file from this repository. */
function example(path: string): string {
  return readFileSync(
    fileURLToPath(new URL(`../../../examples/apps/${path}`, import.meta.url)),
    "utf8",
  );
}

/** The candidates one file produces. */
function consumersOf(source: string) {
  return recognizeConsumers(source, "src/main.ts");
}

describe("JSX providers", () => {
  it("recognizes React ThemeProvider with a static themes prop", () => {
    const found = consumersOf(
      [
        'import { ThemeProvider } from "@themvora/react";',
        "<ThemeProvider themes={[oceanLight, oceanDark]} />",
      ].join("\n"),
    );

    expect(found).toHaveLength(1);
    expect(found[0]).toMatchObject({
      integration: "react",
      api: "ThemeProvider",
      input: "static",
      names: ["oceanLight", "oceanDark"],
    });
  });

  it("recognizes an aliased import", () => {
    const found = consumersOf(
      [
        'import { ThemeProvider as Provider } from "@themvora/react";',
        "<Provider themes={themes} />",
      ].join("\n"),
    );

    expect(found[0]).toMatchObject({ api: "ThemeProvider", names: ["themes"] });
  });

  it("recognizes Next, Remix and Solid providers as their own integrations", () => {
    const next = consumersOf(
      ['import { ThemeProvider } from "@themvora/next";', "<ThemeProvider themes={themes} />"].join("\n"),
    );
    const remix = consumersOf(
      ['import { ThemeProvider } from "@themvora/remix";', "<ThemeProvider themes={themes} />"].join("\n"),
    );
    const solid = consumersOf(
      ['import { ThemeProvider } from "@themvora/solid";', "<ThemeProvider themes={themes} />"].join("\n"),
    );

    expect(next[0]?.integration).toBe("next");
    expect(remix[0]?.integration).toBe("remix");
    expect(solid[0]?.integration).toBe("solid");
  });

  it("recognizes Next's ClientThemeProvider", () => {
    const found = consumersOf(
      [
        'import { ClientThemeProvider } from "@themvora/next/client";',
        "<ClientThemeProvider themes={themes} />",
      ].join("\n"),
    );

    expect(found[0]).toMatchObject({ integration: "next", api: "ClientThemeProvider" });
  });

  it("reports a provider with no themes prop as absent, not registered", () => {
    const found = consumersOf(
      ['import { ThemeProvider } from "@themvora/react";', "<ThemeProvider><App /></ThemeProvider>"].join(
        "\n",
      ),
    );

    expect(found[0]).toMatchObject({ input: "absent" });
    expect(found[0]?.reason).toContain("no themes prop");
  });

  it("reports a runtime-only provider honestly", () => {
    const found = consumersOf(
      [
        'import { ThemeProvider } from "@themvora/react";',
        "<ThemeProvider runtime={runtime}><App /></ThemeProvider>",
      ].join("\n"),
    );

    expect(found[0]?.input).toBe("absent");
    expect(found[0]?.reason).toContain("adopts a runtime");
  });

  it("reports a dynamic themes prop rather than guessing", () => {
    const found = consumersOf(
      [
        'import { ThemeProvider } from "@themvora/react";',
        "<ThemeProvider themes={selectThemes(mode)} />",
      ].join("\n"),
    );

    expect(found[0]).toMatchObject({ input: "dynamic" });
    expect(found[0]?.reason).toContain("not a static identifier");
  });

  it("does not recognize a local function called ThemeProvider", () => {
    const found = consumersOf(
      [
        "function ThemeProvider() {}",
        "ThemeProvider({ themes: [oceanLight, oceanDark] });",
      ].join("\n"),
    );

    expect(found).toEqual([]);
  });

  it("does not recognize a JSX element with the same name but no import", () => {
    const found = consumersOf("<ThemeProvider themes={[oceanLight]} />");

    expect(found).toEqual([]);
  });

  it("does not read a provider mentioned in a comment or a string", () => {
    const found = consumersOf(
      [
        '// <ThemeProvider themes={[ghost]} />',
        'const example = "<ThemeProvider themes={[ghost]} />";',
      ].join("\n"),
    );

    expect(found).toEqual([]);
  });
});

describe("Angular", () => {
  it("recognizes provideTheme with a themes option", () => {
    const found = consumersOf(
      [
        'import { provideTheme } from "@themvora/angular";',
        'provideTheme({ themes: [oceanLight, oceanDark], defaultTheme: "ocean-light" });',
      ].join("\n"),
    );

    expect(found[0]).toMatchObject({
      integration: "angular",
      api: "provideTheme",
      input: "static",
      names: ["oceanLight", "oceanDark"],
    });
  });

  it("reports provideTheme without a themes option as absent", () => {
    const found = consumersOf(
      ['import { provideTheme } from "@themvora/angular";', "provideTheme({});"].join("\n"),
    );

    expect(found[0]).toMatchObject({ input: "absent" });
  });

  it("reports a spread options object as dynamic", () => {
    const found = consumersOf(
      [
        'import { provideTheme } from "@themvora/angular";',
        "provideTheme({ ...options, defaultTheme: \"light\" });",
      ].join("\n"),
    );

    expect(found[0]).toMatchObject({ input: "dynamic" });
  });

  it("recognizes provideThemeRuntime as adoption, not registration", () => {
    const found = consumersOf(
      [
        'import { provideThemeRuntime } from "@themvora/angular";',
        "provideThemeRuntime(runtime);",
      ].join("\n"),
    );

    expect(found[0]).toMatchObject({ api: "provideThemeRuntime", input: "absent" });
    expect(found[0]?.reason).toContain("existing runtime");
  });
});

describe("Nuxt", () => {
  /** The recognizer uses the config file's role, so the path matters. */
  function nuxtConsumersOf(source: string) {
    return recognizeConsumers(source, "nuxt.config.ts");
  }

  it("recognizes the verified module block", () => {
    const found = nuxtConsumersOf(
      [
        'import { themes } from "./themes";',
        "export default defineNuxtConfig({",
        '  modules: ["@themvora/nuxt"],',
        '  themvora: { themes, defaultTheme: "light" },',
        "});",
      ].join("\n"),
    );

    expect(found[0]).toMatchObject({
      integration: "nuxt",
      api: "defineNuxtConfig",
      input: "static",
      names: ["themes"],
    });
  });

  it("reports the module enabled without a themvora block as absent", () => {
    const found = nuxtConsumersOf(
      [
        "export default defineNuxtConfig({",
        '  modules: ["@themvora/nuxt"],',
        "});",
      ].join("\n"),
    );

    expect(found[0]).toMatchObject({ input: "absent" });
    expect(found[0]?.reason).toContain("built-in catalog");
  });

  it("does not recognize a config that never lists the module", () => {
    const found = nuxtConsumersOf(
      ["export default defineNuxtConfig({", "  modules: [],", "});"].join("\n"),
    );

    expect(found).toEqual([]);
  });

  it("does not recognize the same config outside nuxt.config", () => {
    const found = consumersOf(
      ['export default defineNuxtConfig({ modules: ["@themvora/nuxt"], themvora: { themes } });'].join(
        "\n",
      ),
    );

    expect(found).toEqual([]);
  });
});

describe("Vanilla JavaScript", () => {
  it("recognizes new Themvora with a themes option", () => {
    const found = consumersOf(
      [
        'import { Themvora } from "@themvora/core/vanilla";',
        "const kit = new Themvora({ themes: [light, dark], defaultTheme: \"light\" });",
      ].join("\n"),
    );

    expect(found[0]).toMatchObject({
      integration: "vanilla",
      api: "new Themvora",
      input: "static",
      names: ["light", "dark"],
    });
  });

  it("recognizes Themvora.init", () => {
    const found = consumersOf(
      [
        'import { Themvora } from "@themvora/core/vanilla";',
        'const kit = Themvora.init({ themes });',
      ].join("\n"),
    );

    expect(found[0]).toMatchObject({ api: "Themvora.init", names: ["themes"] });
  });

  it("does not invent configuration for a bare new Themvora()", () => {
    const found = consumersOf(
      ['import { Themvora } from "@themvora/core/vanilla";', "const kit = new Themvora();"].join("\n"),
    );

    expect(found[0]).toMatchObject({ integration: "vanilla", input: "absent" });
    expect(found[0]?.reason).toContain("built-in catalog");
  });

  it("does not recognize a lookalike class", () => {
    const found = consumersOf(
      [
        "const themvora = { Themvora: class {} };",
        "new themvora.Themvora({ themes: [light] });",
      ].join("\n"),
    );

    expect(found).toEqual([]);
  });
});

describe("runtime methods", () => {
  it("recognizes use() on a verified Themvora instance", () => {
    const found = consumersOf(
      [
        'import { Themvora } from "@themvora/core/vanilla";',
        "const kit = new Themvora();",
        "kit.use(solarPack);",
      ].join("\n"),
    );

    expect(found.find((entry) => entry.api === "runtime.use")).toMatchObject({
      integration: "vanilla",
      input: "static",
      names: ["solarPack"],
    });
  });

  it("recognizes configure() on a runtime from getProviderRuntime", () => {
    const found = consumersOf(
      [
        'import { getProviderRuntime } from "@themvora/web";',
        "const runtime = getProviderRuntime(provider);",
        "runtime.configure({ themes: kept });",
      ].join("\n"),
    );

    expect(found.find((entry) => entry.api === "runtime.configure")).toMatchObject({
      integration: "web",
      names: ["kept"],
    });
  });

  it("recognizes a runtime obtained from the React hook", () => {
    const found = consumersOf(
      [
        'import { useThemeRuntime } from "@themvora/react";',
        "const runtime = useThemeRuntime();",
        "runtime.use(pack);",
      ].join("\n"),
    );

    expect(found.find((entry) => entry.api === "runtime.use")).toMatchObject({
      integration: "react",
      names: ["pack"],
    });
  });

  it("does not recognize use() on an unrelated object", () => {
    const found = consumersOf(
      ["const runtime = { use() {} };", "runtime.use(themes);"].join("\n"),
    );

    expect(found).toEqual([]);
  });

  it("does not bind an unrelated global to the package", () => {
    const found = consumersOf(
      ["const web = window.SomeOtherLibrary;", "web.use(themes);"].join("\n"),
    );

    expect(found).toEqual([]);
  });
});

describe("Web Components", () => {
  it("reports an import as registration, not theme supply", () => {
    const found = consumersOf('import "@themvora/web";');

    expect(found[0]).toMatchObject({
      integration: "web",
      api: "import @themvora/web",
      registrationOnly: true,
      input: "absent",
    });
  });

  it("reports defineCustomElements as registration", () => {
    const found = consumersOf(
      [
        'import { defineCustomElements } from "@themvora/web";',
        "defineCustomElements();",
      ].join("\n"),
    );

    expect(found[0]).toMatchObject({
      api: "defineCustomElements",
      registrationOnly: true,
    });
  });

  it("reports a custom element class define() call as registration", () => {
    const found = consumersOf(
      [
        'import { ThemvoraProvider } from "@themvora/web";',
        'ThemvoraProvider.define("my-provider");',
      ].join("\n"),
    );

    expect(found[0]).toMatchObject({ api: "ThemvoraProvider.define", registrationOnly: true });
  });

  it("does not treat a type-only import as registration", () => {
    const found = consumersOf('import type { ThemvoraProviderProps } from "@themvora/web";');

    expect(found).toEqual([]);
  });
});

describe("CommonJS", () => {
  it("recognizes a destructured require", () => {
    const found = consumersOf(
      [
        'const { ThemeProvider } = require("@themvora/react");',
        "const App = () => <ThemeProvider themes={[oceanLight]} />;",
      ].join("\n"),
    );

    expect(found[0]).toMatchObject({ integration: "react", names: ["oceanLight"] });
  });

  it("recognizes a namespace require", () => {
    const found = consumersOf(
      [
        'const web = require("@themvora/web");',
        "web.defineCustomElements();",
      ].join("\n"),
    );

    expect(found[0]).toMatchObject({ api: "defineCustomElements", registrationOnly: true });
  });
});

describe("real repository examples", () => {
  it("recognizes the React example's provider", () => {
    const found = consumersOf(example("react/src/main.tsx"));
    const provider = found.find((entry) => entry.api === "ThemeProvider");

    expect(provider).toMatchObject({
      integration: "react",
      input: "static",
      names: ["themes"],
    });
  });

  it("recognizes the Next.js layout provider", () => {
    const found = consumersOf(example("nextjs/app/layout.tsx"));
    const provider = found.find((entry) => entry.api === "ThemeProvider");

    expect(provider).toMatchObject({ integration: "next", names: ["themes"] });
  });

  it("recognizes the Angular bootstrap", () => {
    const found = consumersOf(example("angular/src/main.ts"));
    const provider = found.find((entry) => entry.api === "provideTheme");

    expect(provider).toMatchObject({ integration: "angular", names: ["themes"] });
  });

  it("recognizes the Nuxt example's module configuration", () => {
    const found = recognizeConsumers(example("nuxt/nuxt.config.ts"), "nuxt.config.ts");

    expect(found[0]).toMatchObject({
      integration: "nuxt",
      api: "defineNuxtConfig",
      names: ["themes"],
    });
  });

  it("recognizes the Solid example's provider", () => {
    const found = consumersOf(example("solid/src/App.tsx"));
    const provider = found.find((entry) => entry.api === "ThemeProvider");

    expect(provider).toMatchObject({ integration: "solid", names: ["themes"] });
  });

  it("recognizes the Remix root provider", () => {
    const found = consumersOf(example("remix/app/root.tsx"));
    const provider = found.find((entry) => entry.api === "ThemeProvider");

    expect(provider).toMatchObject({ integration: "remix", names: ["themes"] });
  });

  it("does not invent options for the vanilla example's bare new Themvora()", () => {
    const found = consumersOf(example("vanilla-js/src/main.ts"));
    const kit = found.find((entry) => entry.api === "new Themvora");

    expect(kit).toMatchObject({ integration: "vanilla", input: "absent" });
  });

  it("recognizes the Web Components example's runtime.use(pack)", () => {
    const found = consumersOf(example("web/src/main.ts"));
    const use = found.find((entry) => entry.api === "runtime.use");

    expect(use).toMatchObject({ integration: "web", names: ["solarPack"] });
  });
});

describe("multiple consumers", () => {
  it("reports each use in one file", () => {
    const found = consumersOf(
      [
        'import { ThemeProvider } from "@themvora/react";',
        'import { Themvora } from "@themvora/core/vanilla";',
        "const kit = new Themvora({ themes: [light] });",
        "<ThemeProvider themes={[oceanLight]} />",
      ].join("\n"),
    );

    expect(found.map((entry) => entry.api).sort()).toEqual(["ThemeProvider", "new Themvora"]);
  });
});
