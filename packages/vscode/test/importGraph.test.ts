/**
 * The module graph tests.
 *
 * Every rule here is deliberately about *edges*, not themes: this module's job
 * is to say which file a name came from. The theme mapping is tested with the
 * inspection, where the facts live.
 */
import { describe, expect, it } from "vitest";

import {
  readModuleLinks,
  resolveRelativeSpecifier,
  traceBindings,
} from "../src/domain/importGraph";

/** A reader over an in-memory project. */
function readerOf(files: Record<string, string>) {
  return async (path: string): Promise<string | null> => files[path] ?? null;
}

describe("readModuleLinks — ESM", () => {
  it("reads named, aliased and namespace imports", () => {
    const links = readModuleLinks(
      [
        'import { oceanLight, oceanDark as night } from "./themes";',
        'import * as kit from "./kit";',
        'import Default from "./default";',
      ].join("\n"),
    );

    expect(links.imports).toEqual([
      { local: "oceanLight", imported: "oceanLight", specifier: "./themes" },
      { local: "night", imported: "oceanDark", specifier: "./themes" },
      { local: "kit", imported: "*", specifier: "./kit" },
      { local: "Default", imported: "default", specifier: "./default" },
    ]);
  });

  it("ignores a type-only import", () => {
    const links = readModuleLinks(
      [
        'import type { ThemeDefinition } from "@themvora/core";',
        'import { type ThemeMode, defineTheme } from "@themvora/core";',
      ].join("\n"),
    );

    expect(links.imports).toEqual([
      { local: "defineTheme", imported: "defineTheme", specifier: "@themvora/core" },
    ]);
  });

  it("does not read an import mentioned in a comment or a string", () => {
    const links = readModuleLinks(
      [
        '// import { ghost } from "./ghost";',
        '/* export { ghost } from "./ghost"; */',
        'const example = \'import { shadow } from "./shadow"\';',
      ].join("\n"),
    );

    expect(links.imports).toEqual([]);
    expect(links.reExports).toEqual([]);
  });

  it("does not read an import written as JSX text", () => {
    const links = readModuleLinks('<p>import from "./ghost"</p>;');

    expect(links.imports).toEqual([]);
  });

  it("reads an import after a statement on the same line", () => {
    const links = readModuleLinks('const answer = 42; import { oceanLight } from "./theme";');

    expect(links.imports).toEqual([
      { local: "oceanLight", imported: "oceanLight", specifier: "./theme" },
    ]);
  });

  it("reads a collection initialised from imports", () => {
    const links = readModuleLinks(
      [
        'import { themvora, presetThemes } from "./themes";',
        "const themes = [...themvora, ...presetThemes];",
      ].join("\n"),
    );

    expect(links.collections.get("themes")).toEqual(["themvora", "presetThemes"]);
  });

  it("does not build a collection from a call", () => {
    const links = readModuleLinks("const themes = getAllThemes();");

    expect(links.collections.has("themes")).toBe(false);
  });
});

describe("readModuleLinks — re-exports", () => {
  it("reads an aliased named re-export", () => {
    const links = readModuleLinks('export { oceanLight as light } from "./themes";');

    expect(links.reExports).toEqual([
      { exported: "light", imported: "oceanLight", specifier: "./themes" },
    ]);
  });

  it("reads a star re-export", () => {
    const links = readModuleLinks('export * from "./themes";');

    expect(links.reExports).toEqual([{ exported: "*", imported: "*", specifier: "./themes" }]);
  });

  it("ignores a local export with no specifier", () => {
    const links = readModuleLinks("export { oceanLight };");

    expect(links.reExports).toEqual([]);
  });
});

describe("readModuleLinks — CommonJS", () => {
  it("reads destructured, renamed and namespace requires", () => {
    const links = readModuleLinks(
      [
        'const { generateTheme } = require("@themvora/core");',
        'const { defineTheme: make } = require("@themvora/core");',
        'const kit = require("./kit");',
      ].join("\n"),
    );

    expect(links.imports).toEqual([
      { local: "generateTheme", imported: "generateTheme", specifier: "@themvora/core" },
      { local: "make", imported: "defineTheme", specifier: "@themvora/core" },
      { local: "kit", imported: "*", specifier: "./kit" },
    ]);
  });
});

describe("resolveRelativeSpecifier", () => {
  const files = new Set([
    "src/main.tsx",
    "src/theme.ts",
    "src/themes/index.ts",
    "src/themes/solar.tsx",
    "src/types.d.ts",
  ]);

  it("resolves an exact extension", () => {
    expect(resolveRelativeSpecifier("src/main.tsx", "./theme.ts", files)).toBe("src/theme.ts");
  });

  it("adds a source extension", () => {
    expect(resolveRelativeSpecifier("src/main.tsx", "./theme", files)).toBe("src/theme.ts");
  });

  it("resolves a directory index", () => {
    expect(resolveRelativeSpecifier("src/main.tsx", "./themes", files)).toBe("src/themes/index.ts");
  });

  it("resolves a parent-relative specifier", () => {
    expect(resolveRelativeSpecifier("src/themes/index.ts", "../theme", files)).toBe("src/theme.ts");
  });

  it("maps a runtime .js extension to the TypeScript source", () => {
    expect(resolveRelativeSpecifier("src/main.tsx", "./theme.js", files)).toBe("src/theme.ts");
  });

  it("does not resolve a declaration file", () => {
    expect(resolveRelativeSpecifier("src/main.tsx", "./types", files)).toBeUndefined();
  });

  it("does not resolve a package or an alias", () => {
    expect(resolveRelativeSpecifier("src/main.tsx", "@themvora/core", files)).toBeUndefined();
    expect(resolveRelativeSpecifier("src/main.tsx", "@/theme", files)).toBeUndefined();
  });
});

describe("traceBindings", () => {
  it("follows a direct relative import", async () => {
    const source = [
      'import { oceanLight, oceanDark } from "./theme";',
      "<ThemeProvider themes={[oceanLight, oceanDark]} />;",
    ].join("\n");

    const trace = await traceBindings({
      source,
      names: ["oceanLight", "oceanDark"],
      importer: "src/main.tsx",
      files: new Set(["src/main.tsx", "src/theme.ts"]),
      read: readerOf({ "src/theme.ts": 'export const oceanLight = {};\nexport const oceanDark = {};' }),
    });

    expect(trace.unresolved).toEqual([]);
    expect(trace.bindings.map((entry) => [entry.name, entry.path, entry.imported])).toEqual([
      ["oceanLight", "src/theme.ts", "oceanLight"],
      ["oceanDark", "src/theme.ts", "oceanDark"],
    ]);
  });

  it("follows one re-export and records the file that re-exported it", async () => {
    const source = 'import { oceanLight } from "./theme";';
    const files = new Set(["src/main.tsx", "src/theme/index.ts", "src/theme/ocean.ts"]);

    const trace = await traceBindings({
      source,
      names: ["oceanLight"],
      importer: "src/main.tsx",
      files,
      read: readerOf({
        "src/theme/index.ts": 'export { oceanLight } from "./ocean";',
        "src/theme/ocean.ts": "export const oceanLight = {};",
      }),
    });

    expect(trace.bindings).toEqual([
      {
        name: "oceanLight",
        specifier: "./theme",
        imported: "oceanLight",
        path: "src/theme/ocean.ts",
        reExportedFrom: "src/theme/index.ts",
      },
    ]);
  });

  it("does not follow a second re-export", async () => {
    const files = new Set([
      "src/main.tsx",
      "src/index.ts",
      "src/theme/index.ts",
      "src/theme/inner.ts",
      "src/theme/ocean.ts",
    ]);

    const trace = await traceBindings({
      source: 'import { oceanLight } from "./theme";',
      names: ["oceanLight"],
      importer: "src/main.tsx",
      files,
      read: readerOf({
        "src/theme/index.ts": 'export { oceanLight } from "./inner";',
        "src/theme/inner.ts": 'export { oceanLight } from "./ocean";',
        "src/theme/ocean.ts": "export const oceanLight = {};",
      }),
    });

    // One hop lands on `inner.ts`; going further is the interpreter this
    // module deliberately is not.
    expect(trace.bindings[0]?.path).toBe("src/theme/inner.ts");
    expect(trace.bindings[0]?.reExportedFrom).toBe("src/theme/index.ts");
  });

  it("expands a local collection one level", async () => {
    const source = [
      'import { themvora, presetThemes } from "./themes/themes";',
      "const themes = [...themvora, ...presetThemes];",
      "<ThemeProvider themes={themes} />;",
    ].join("\n");

    const trace = await traceBindings({
      source,
      names: ["themes"],
      importer: "src/main.tsx",
      files: new Set(["src/main.tsx", "src/themes/themes.ts"]),
      read: readerOf({ "src/themes/themes.ts": "export const themvora = [];" }),
    });

    expect(trace.unresolved).toEqual([]);
    expect(trace.bindings.map((entry) => [entry.name, entry.imported, entry.path])).toEqual([
      ["themes", "themvora", "src/themes/themes.ts"],
      ["themes", "presetThemes", "src/themes/themes.ts"],
    ]);
  });

  it("reports a bare specifier as unresolved", async () => {
    const trace = await traceBindings({
      source: 'import { themes } from "@themvora/app-shared/themes";',
      names: ["themes"],
      importer: "app/layout.tsx",
      files: new Set(["app/layout.tsx"]),
      read: readerOf({}),
    });

    expect(trace.bindings).toEqual([]);
    expect(trace.unresolved).toEqual(["themes"]);
    expect(trace.specifiers).toEqual(["@themvora/app-shared/themes"]);
  });

  it("reports a name with no import at all as unresolved", async () => {
    const trace = await traceBindings({
      source: "const themes = [localTheme];",
      names: ["themes"],
      importer: "src/main.tsx",
      files: new Set(["src/main.tsx"]),
      read: readerOf({}),
    });

    expect(trace.unresolved).toEqual(["themes"]);
  });
});
