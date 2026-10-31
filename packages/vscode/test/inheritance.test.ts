/**
 * Regression tests: themes that use `extends`.
 *
 * The defect these pin down: `themeToCSSVariables()` and `measureThemeContrast()`
 * do not follow inheritance, and `validateTheme()` only follows it when handed
 * the sibling registry. So a derived theme used to validate as invalid and
 * render as a one-property stylesheet.
 *
 * The fixture is the one the task asked for: a base that defines the required
 * token groups, and a derived theme that overrides **only** `primary`.
 */
import {
  generateTheme,
  resolveTheme,
  themeToCssDocument,
  type ThemeDefinition,
} from "@themvora/core";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { ExtensionContext } from "vscode";

import manifest from "../package.json";
import { COMMAND_COPY_CSS_VARIABLES } from "../src/commands/copyCssVariables";
import { COMMAND_REFRESH } from "../src/commands/refresh";
import { COMMAND_VALIDATE_THEME } from "../src/commands/validateTheme";
import { activate, createThemvoraClient } from "../src/index";
import { createTempProject, type TempProject } from "./helpers/tempProject";
import { __invoke, __reset, __state, Uri } from "./stubs/vscode";

/** The base: a full generated theme, so every required group is present. */
const BASE = generateTheme({ seed: "#4f46e5" }).light;

/** The derived theme: inherits everything, overrides one role. */
const DERIVED: ThemeDefinition = {
  name: "brand-dark",
  extends: BASE.name,
  meta: { family: "brand", mode: "dark" },
  tokens: { colors: { primary: "#ff0000" } },
};

const DOCUMENT: ThemeDefinition[] = [BASE, DERIVED];
const DOCUMENT_JSON = JSON.stringify({ light: BASE, dark: DERIVED }, null, 2);

const client = createThemvoraClient();

/** The fake extension context. */
function context(): ExtensionContext {
  return {
    subscriptions: [],
    extension: { packageJSON: manifest },
  } as unknown as ExtensionContext;
}

/** The channel the validate report goes to. */
function lines(): string[] {
  const channel = __state.outputChannels[0];
  if (!channel) throw new Error("no output channel was created");
  return channel.lines;
}

let project: TempProject;

beforeEach(async () => {
  __reset();
  project = createTempProject();
  activate(context());
  await __invoke(COMMAND_REFRESH);
});

afterEach(() => {
  project.cleanup();
});

describe("client: validation with a registry", () => {
  it("reports a derived theme as invalid when validated alone", async () => {
    // The old behaviour, kept as a guard: without the registry the theme really
    // is incomplete, and the client must not pretend otherwise.
    const result = await client.validate({ theme: DERIVED });

    expect(result.outcome).toBe("validation-failed");
    expect(result.value?.valid).toBe(false);
  });

  it("reports the same theme as valid when given its document", async () => {
    const result = await client.validate({ theme: DERIVED, themes: DOCUMENT });

    expect(result.outcome).toBe("ok");
    expect(result.value?.valid).toBe(true);
    expect(result.value?.issues).toEqual([]);
  });

  it("measures contrast on the resolved theme, not the override alone", async () => {
    const alone = await client.validate({ theme: DERIVED });
    const withRegistry = await client.validate({ theme: DERIVED, themes: DOCUMENT });

    // An unresolved derived theme has one colour, so it measured as zero pairs.
    expect(alone.value?.contrast.pairs).toBe(0);
    // Sixteen pairs are measured now that the theme is complete. How many pass is
    // a property of the override (red on this background), not of the fix.
    expect(withRegistry.value?.contrast).toMatchObject({
      pairs: 16,
      text: { total: 9 },
      ui: { total: 7 },
    });
  });

  it("keeps standalone themes on the path they took before", async () => {
    const result = await client.validate({ theme: BASE, themes: DOCUMENT });

    expect(result.outcome).toBe("ok");
    expect(result.value?.contrast.pairs).toBe(16);
  });
});

describe("client: CSS document with a registry", () => {
  it("includes inherited properties, not only the overrides", async () => {
    const result = await client.cssDocument({ theme: DERIVED, themes: DOCUMENT });

    expect(result.outcome).toBe("ok");

    const css = result.value!;
    expect(css.match(/--theme-/g)).toHaveLength(22);

    // Inherited from the base…
    expect(css).toContain(`--theme-color-background: ${BASE.tokens!.colors!["background"]};`);
    expect(css).toContain(`--theme-color-border: ${BASE.tokens!.colors!["border"]};`);
    // …and the override still wins.
    expect(css).toContain("--theme-color-primary: #ff0000;");
    expect(css).not.toContain(`--theme-color-primary: ${BASE.tokens!.colors!["primary"]};`);
  });

  it("matches core's own resolution exactly", async () => {
    const result = await client.cssDocument({ theme: DERIVED, themes: DOCUMENT });

    // Not a lookalike: the command's output is core's resolved document.
    expect(result.value).toBe(themeToCssDocument(resolveTheme(DOCUMENT, DERIVED.name)));
  });

  it("is unchanged for a theme without extends", async () => {
    const withRegistry = await client.cssDocument({ theme: BASE, themes: DOCUMENT });
    const without = await client.cssDocument({ theme: BASE });

    expect(withRegistry.value).toBe(without.value);
  });
});

describe("client: inheritance failures", () => {
  it("fails clearly when the base is missing", async () => {
    const orphan: ThemeDefinition = { name: "orphan", extends: "nope", tokens: {} };

    const result = await client.cssDocument({ theme: orphan, themes: [orphan] });

    expect(result.outcome).toBe("error");
    expect(result.value).toBeNull();
    expect(result.errors[0]?.message).toContain('Theme "nope" is not registered');
  });

  it("fails clearly on a circular chain", async () => {
    const a: ThemeDefinition = { name: "a", extends: "b", tokens: {} };
    const b: ThemeDefinition = { name: "b", extends: "a", tokens: {} };

    const result = await client.cssDocument({ theme: a, themes: [a, b] });

    expect(result.outcome).toBe("error");
    expect(result.errors[0]?.message).toContain("Circular");
  });

  it("refuses to pick between two themes with the same name", async () => {
    const first: ThemeDefinition = { name: "dup", tokens: { colors: { primary: "#111111" } } };
    const second: ThemeDefinition = {
      name: "dup",
      extends: "dup",
      tokens: { colors: { primary: "#222222" } },
    };

    const result = await client.cssDocument({ theme: second, themes: [first, second] });

    expect(result.outcome).toBe("error");
    expect(result.value).toBeNull();
    expect(result.errors[0]?.message).toContain("ambiguous");
  });
});

describe("command: Validate Theme with inheritance", () => {
  it("reports both themes valid and the resolved contrast", async () => {
    const file = project.write("theme.json", DOCUMENT_JSON);

    await __invoke(COMMAND_VALIDATE_THEME, Uri.file(file));

    expect(__state.warnings).toEqual([]);
    expect(__state.info).toHaveLength(1);
    expect(__state.info[0]).toContain("2 themes valid");

    const report = lines().join("\n");
    expect(report.match(/PASS/g)).toHaveLength(2);
    // The derived theme's contrast used to read as 0 pairs.
    expect(report).not.toContain("0 pairs");
    expect(report.match(/16 pairs/g)).toHaveLength(2);
  });

  it("still reports a genuinely invalid theme", async () => {
    const broken = project.write(
      "broken.json",
      JSON.stringify({ name: "x", meta: { mode: "light" }, tokens: { colors: {} } }),
    );

    await __invoke(COMMAND_VALIDATE_THEME, Uri.file(broken));

    expect(__state.warnings).toHaveLength(1);
    expect(__state.warnings[0]).toContain("invalid");
  });
});

describe("command: Copy CSS Variables with inheritance", () => {
  it("copies inherited properties plus the override", async () => {
    const file = project.write("theme.json", DOCUMENT_JSON);
    __state.quickPickSelection = DERIVED.name;

    await __invoke(COMMAND_COPY_CSS_VARIABLES, Uri.file(file));

    expect(__state.errors).toEqual([]);
    expect(__state.clipboard).toHaveLength(1);

    const css = __state.clipboard[0]!;
    expect(css.match(/--theme-/g)).toHaveLength(22);
    expect(css).toContain("--theme-color-primary: #ff0000;");
    expect(css).toContain(`--theme-color-background: ${BASE.tokens!.colors!["background"]};`);
  });

  it("offers the derived theme as a candidate at all", async () => {
    const file = project.write("theme.json", DOCUMENT_JSON);

    // Both themes must be selectable; before the fix the derived one was
    // rejected as invalid and never offered.
    await __invoke(COMMAND_COPY_CSS_VARIABLES, Uri.file(file));

    expect(__state.quickPickItems.map((item) => item.label)).toEqual([
      "generated-light",
      "brand-dark",
    ]);
  });

  it("refuses to copy when the base is missing, and says why", async () => {
    const orphan: ThemeDefinition = {
      name: "orphan",
      extends: "nope",
      tokens: { colors: { primary: "#ff0000" } },
    };
    const file = project.write("orphan.json", JSON.stringify(orphan));

    await __invoke(COMMAND_COPY_CSS_VARIABLES, Uri.file(file));

    expect(__state.clipboard).toEqual([]);
    expect(__state.info).toEqual([]);
    expect(__state.errors).toHaveLength(1);
    expect(__state.errors[0]).toContain("not registered");
  });

  it("refuses to copy a derived theme whose chain resolves to an invalid theme", async () => {
    // The base exists but is itself incomplete, so resolving does not rescue it.
    const thinBase: ThemeDefinition = {
      name: "thin",
      meta: { mode: "light" },
      tokens: { colors: { primary: "#123456" } },
    };
    const derived: ThemeDefinition = {
      name: "thin-derived",
      extends: "thin",
      meta: { mode: "light" },
      tokens: { colors: { accent: "#654321" } },
    };
    const file = project.write("thin.json", JSON.stringify({ light: thinBase, dark: derived }));

    await __invoke(COMMAND_COPY_CSS_VARIABLES, Uri.file(file));

    expect(__state.clipboard).toEqual([]);
    expect(__state.errors).toHaveLength(1);
    expect(__state.errors[0]).toContain("No theme");
  });
});
