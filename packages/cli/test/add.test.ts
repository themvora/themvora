/**
 * Tests for `themvora add`.
 *
 * The fixtures are real integrated projects — `init` is run through the CLI to
 * create them — because the whole point of `add` is that it extends what `init`
 * wrote. A hand-written fixture would let `add` pass while disagreeing with the
 * renderer that produces the file in the first place.
 */
import { existsSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { cli, tempDir, type TempDir } from "./helpers.js";

let dir: TempDir | null = null;

afterEach(() => {
  dir?.cleanup();
  dir = null;
});

/** A React project with a registry `init` generated. */
async function integratedProject(preset = "mint"): Promise<TempDir> {
  dir = tempDir();
  dir.write(
    "package.json",
    JSON.stringify(
      {
        name: "fixture",
        type: "module",
        dependencies: { react: "^19.0.0" },
      },
      null,
      2,
    ),
  );
  dir.write("vite.config.ts", 'export default { plugins: [] };\n');

  const result = await cli("init", dir.path, "--framework", "react", "--preset", preset, "--no-install");
  expect(result.code, result.output).toBe(0);
  return dir;
}

/** The theme names a registry file declares, in order. */
function themeNames(contents: string): string[] {
  return [...contents.matchAll(/"name": "([a-z0-9-]+)"/g)].map((match) => match[1]!);
}

/** The families a registry offers, read from its `selection` array. */
function selectionOf(contents: string): string[] {
  const line = contents.split("\n").find((candidate) => candidate.startsWith("export const selection ="));
  expect(line, "registry has no selection line").toBeDefined();
  return [...line!.matchAll(/"([a-z0-9-]+)"/g)].map((match) => match[1]!);
}

/** The encoded sources a registry records. */
function sources(contents: string): string[] {
  const line = contents.split("\n").find((candidate) => candidate.includes("themvora:sources:"));
  expect(line, "registry has no sources line").toBeDefined();
  const raw = line!.slice(line!.indexOf("themvora:sources:") + "themvora:sources:".length).trim();
  return (JSON.parse(raw) as string[]).map((entry) => JSON.parse(entry));
}

describe("add --plan", () => {
  it("writes nothing", async () => {
    const project = await integratedProject();
    const before = project.read("src/themes/themes.ts");

    const result = await cli("add", "brand", "apple", "--dir", project.path, "--plan");

    expect(result.code).toBe(0);
    expect(project.read("src/themes/themes.ts")).toBe(before);
    expect(result.stdout).toContain("apple-light");
    expect(result.stdout).toContain("themvora add — plan");
  });

  it("emits the plan as JSON", async () => {
    const project = await integratedProject();

    const result = await cli("add", "brand", "apple", "--dir", project.path, "--plan", "--json");
    const plan = result.json<{ added: string[]; themes: string[]; defaultTheme: string }>();

    expect(plan.added).toEqual(["apple-light", "apple-dark"]);
    expect(plan.themes).toEqual(["mint-light", "mint-dark", "apple-light", "apple-dark"]);
    // Adding a source never moves the theme the app opens with.
    expect(plan.defaultTheme).toBe("mint-light");
  });

  it("never writes under --dry-run", async () => {
    const project = await integratedProject();
    const before = project.read("src/themes/themes.ts");

    const result = await cli("add", "preset", "iris", "--dir", project.path, "--dry-run");

    expect(result.code).toBe(0);
    expect(project.read("src/themes/themes.ts")).toBe(before);
  });
});

describe("add", () => {
  it("extends the registry with a brand", async () => {
    const project = await integratedProject();

    const result = await cli("add", "brand", "apple", "--dir", project.path);

    expect(result.code).toBe(0);
    const contents = project.read("src/themes/themes.ts");

    // A brand has no runtime catalog API, so its resolved definitions are
    // written into the registry. This is the assertion that would have caught
    // the defect where the brand family was recorded in `selection` but no
    // theme behind it ever existed.
    expect(themeNames(contents)).toEqual(["apple-light", "apple-dark"]);
    expect(contents).toContain('export const sourceThemes = [');
    expect(selectionOf(contents)).toEqual(
      expect.arrayContaining(["mint", "apple"]),
    );
  });

  it("records the new source alongside the old one", async () => {
    const project = await integratedProject();

    await cli("add", "brand", "apple", "--dir", project.path);

    expect(sources(project.read("src/themes/themes.ts"))).toEqual([
      { kind: "preset", id: "mint" },
      { kind: "brand", id: "apple" },
    ]);
  });

  it("keeps the original default theme", async () => {
    const project = await integratedProject();

    await cli("add", "brand", "apple", "--dir", project.path);

    expect(project.read("src/themes/themes.ts")).toContain('"mint-light"');
  });

  it("extends the registry with a seed, carrying its family", async () => {
    const project = await integratedProject();

    await cli("add", "seed", "#6366f1", "--family", "indigo", "--dir", project.path);

    const contents = project.read("src/themes/themes.ts");
    expect(themeNames(contents)).toContain("indigo-light");
    expect(selectionOf(contents)).toContain("indigo");
    expect(sources(contents)).toContainEqual({
      kind: "seed",
      seed: "#6366f1",
      family: "indigo",
    });
  });

  it("stays idempotent when the same source is added twice", async () => {
    const project = await integratedProject();

    await cli("add", "brand", "apple", "--dir", project.path);
    const afterFirst = project.read("src/themes/themes.ts");

    const second = await cli("add", "brand", "apple", "--dir", project.path);

    expect(second.code).toBe(0);
    expect(second.stdout).toContain("Already present");
    expect(project.read("src/themes/themes.ts")).toBe(afterFirst);
  });

  it("reports unchanged for a source the registry already had", async () => {
    const project = await integratedProject();

    const result = await cli("add", "preset", "mint", "--dir", project.path, "--json");
    const report = result.json<{ changed: boolean; added: string[] }>();

    expect(report.changed).toBe(false);
    expect(report.added).toEqual([]);
  });

  it("keeps three sources in the order they were added", async () => {
    const project = await integratedProject();

    await cli("add", "brand", "apple", "--dir", project.path);
    await cli("add", "preset", "iris", "--dir", project.path);

    const contents = project.read("src/themes/themes.ts");

    expect(sources(contents)).toEqual([
      { kind: "preset", id: "mint" },
      { kind: "brand", id: "apple" },
      { kind: "preset", id: "iris" },
    ]);
    // Only the brand is written out; mint and iris are preset families, so they
    // are resolved from `getPresetThemes()` rather than copied into the file.
    expect(themeNames(contents)).toEqual(["apple-light", "apple-dark"]);
    expect(selectionOf(contents)).toEqual(
      expect.arrayContaining(["mint", "apple", "iris"]),
    );
  });

  it("writes a registry the project can still typecheck", async () => {
    // The registry is TypeScript; extending it must not break its shape.
    const project = await integratedProject();

    await cli("add", "brand", "apple", "--dir", project.path);

    const contents = project.read("src/themes/themes.ts");
    expect(contents).toContain('import { defineTheme, getPresetThemes } from "@themvora/core"');
    expect(contents).toContain("export const themes = [...themvora, ...presetThemes, ...sourceThemes]");
    // Every inlined definition is wrapped, so a botched splice cannot leave a
    // bare object in the array.
    expect((contents.match(/defineTheme\(/g) ?? []).length).toBe(4);
  });
});

describe("add refusals", () => {
  it("fails with a usage error when the project has no registry", async () => {
    dir = tempDir();
    dir.write("package.json", JSON.stringify({ name: "plain", dependencies: { react: "^19" } }));

    const result = await cli("add", "preset", "mint", "--dir", dir.path);

    expect(result.code).toBe(2);
    expect(result.stderr).toContain("no Themvora theme registry found");
  });

  it("refuses to rewrite a registry the user maintains by hand", async () => {
    const project = await integratedProject();
    project.write("src/themes/themes.ts", "export default { themes: [] };\n");

    const result = await cli("add", "brand", "apple", "--dir", project.path);

    expect(result.code).toBe(2);
    expect(result.stderr).toContain("was not generated by Themvora");
    expect(project.read("src/themes/themes.ts")).toBe("export default { themes: [] };\n");
  });

  it("explains itself when a registry predates the source record", async () => {
    const project = await integratedProject();
    // A registry from an older CLI: generated, but with no sources line.
    const contents = project
      .read("src/themes/themes.ts")
      .split("\n")
      .filter((line) => !line.includes("themvora:sources:"))
      .join("\n");
    project.write("src/themes/themes.ts", contents);

    const result = await cli("add", "brand", "apple", "--dir", project.path);

    expect(result.code).toBe(1);
    expect(result.stderr).toContain("does not record the theme sources");
    expect(result.stderr).toContain("themvora init");
  });

  it("rejects an unknown preset", async () => {
    const project = await integratedProject();

    const result = await cli("add", "preset", "nope", "--dir", project.path);

    expect(result.code).toBe(1);
    expect(result.stderr).toContain('unknown preset "nope"');
  });

  it("rejects an unknown source kind", async () => {
    const project = await integratedProject();

    const result = await cli("add", "flavour", "mint", "--dir", project.path);

    expect(result.code).toBe(2);
    expect(result.stderr).toContain('unknown source kind "flavour"');
  });

  it("requires a value", async () => {
    const project = await integratedProject();

    const result = await cli("add", "preset", "--dir", project.path);

    expect(result.code).toBe(2);
    expect(result.stderr).toContain('"add preset" needs a value');
  });

  it("requires a source kind", async () => {
    const result = await cli("add");

    expect(result.code).toBe(2);
    expect(result.stderr).toContain("a source kind is required");
  });

  it("refuses a seed that is not a colour", async () => {
    const project = await integratedProject();

    const result = await cli("add", "seed", "not-a-colour", "--dir", project.path);

    expect(result.code).toBe(1);
  });
});

describe("add on a Next.js registry", () => {
  it("extends themvora.themes.ts", async () => {
    dir = tempDir();
    dir.write(
      "package.json",
      JSON.stringify({ name: "next-fixture", dependencies: { next: "^16.0.0" } }),
    );
    dir.write("next.config.ts", "export default {};\n");
    dir.write(
      "app/layout.tsx",
      "export default function L({ children }) { return children; }\n",
    );

    // An existing project: `init` writes the registry without touching the layout.
    const init = await cli(
      "init",
      dir.path,
      "--framework",
      "next",
      "--preset",
      "mint",
      "--no-install",
    );
    expect(init.code, init.output).toBe(0);
    expect(existsSync(join(dir.path, "themes/themes.ts"))).toBe(true);

    const result = await cli("add", "brand", "github", "--dir", dir.path);

    expect(result.code).toBe(0);
    const contents = dir.read("themes/themes.ts");
    expect(themeNames(contents)).toContain("github-light");
    expect(contents).toContain('export const defaultTheme: (typeof themes)[number]["name"]');
  });
});
