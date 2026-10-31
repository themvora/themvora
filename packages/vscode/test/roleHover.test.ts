/**
 * Hover tests.
 *
 * The provider is called directly, so these assert the content a user would see
 * rather than the fact that a provider was registered.
 */
import { generateTheme, type ThemeDefinition } from "@themvora/core";
import { beforeEach, describe, expect, it } from "vitest";
import type { Hover, Position, TextDocument } from "vscode";

import { Position as StubPosition } from "./stubs/vscode";

import { createRoleHoverProvider } from "../src/adapters/roleHover";
import { __openDocument, __reset, type FakeDocument } from "./stubs/vscode";

const BASE = generateTheme({ seed: "#4f46e5" }).light;
const DARK = generateTheme({ seed: "#4f46e5" }).dark;

const SINGLE = JSON.stringify(BASE, null, 2);
const PAIR = JSON.stringify({ light: BASE, dark: DARK }, null, 2);

const provider = createRoleHoverProvider();

/** The position of the nth occurrence of a substring. */
function positionOf(document: FakeDocument, needle: string, occurrence = 0): StubPosition {
  const text = document.getText();
  let index = -1;
  for (let found = 0; found <= occurrence; found += 1) {
    index = text.indexOf(needle, index + 1);
    if (index < 0) throw new Error(`"${needle}" not found`);
  }
  return document.positionAt!(index + 1) as StubPosition;
}

/** Hover at a position, as VS Code would ask. */
function hoverAt(document: FakeDocument, needle: string, occurrence = 0): Hover | undefined {
  return provider.provideHover(
    document as unknown as TextDocument,
    positionOf(document, needle, occurrence) as unknown as Position,
    undefined as never,
  ) as Hover | undefined;
}

/** The markdown a hover carries. */
function markdown(hover: Hover): string {
  return (hover.contents as unknown as { value: string }).value;
}

beforeEach(() => {
  __reset();
});

describe("a recognised role", () => {
  it("explains the role from core's metadata", () => {
    const document = __openDocument("/app/theme.json", SINGLE);
    const hover = hoverAt(document, '"primary"');

    if (hover === undefined) throw new Error("expected a hover");
    const text = markdown(hover);

    expect(text).toContain("`primary`");
    expect(text).toContain("Current value:");
    expect(text).toContain(BASE.tokens!.colors!["primary"]!);
    // Group label and description come from SEMANTIC_ROLE_GROUPS.
    expect(text).toContain("Actions");
  });

  it("includes what the role is and is not intended for", () => {
    const document = __openDocument("/app/theme.json", SINGLE);
    const hover = hoverAt(document, '"primary"');

    if (hover === undefined) throw new Error("expected a hover");
    // `describeRoleUsage` reports `primary` as restricted for reading text.
    expect(markdown(hover)).toContain("Not intended for");
  });

  it("carries the contrast pairs the role takes part in", () => {
    const document = __openDocument("/app/theme.json", SINGLE);
    const hover = hoverAt(document, '"primary"');

    if (hover === undefined) throw new Error("expected a hover");
    expect(markdown(hover)).toContain("Contrast");
    expect(markdown(hover)).toMatch(/\d+\.\d+:1/);
  });

  it("does not include contrast for an invalid theme", () => {
    const broken: ThemeDefinition = { name: "broken", tokens: { colors: { primary: "#ff0000" } } };
    const document = __openDocument("/app/theme.json", JSON.stringify(broken, null, 2));

    const hover = hoverAt(document, '"primary"');

    if (hover === undefined) throw new Error("expected a hover");
    // Core says the theme is invalid, so pair ratios would overstate confidence.
    expect(markdown(hover)).not.toContain("**Contrast**");
  });

  it("says when the theme does not define the role", () => {
    const partial: ThemeDefinition = {
      name: "partial",
      tokens: { colors: { primary: "#ff0000" } },
    };
    // Add a role name as a value so the word exists, then hover it.
    const text = JSON.stringify({ ...partial, meta: { description: "mutedForeground" } }, null, 2);
    const document = __openDocument("/app/theme.json", text);

    const hover = hoverAt(document, '"mutedForeground"');

    if (hover === undefined) throw new Error("expected a hover");
    expect(markdown(hover)).toContain("Not defined by this theme");
  });
});

describe("the two halves of a pair", () => {
  it("shows the value from the half the cursor is in", () => {
    const document = __openDocument("/app/theme.json", PAIR);

    const light = hoverAt(document, '"primary"', 0);
    const dark = hoverAt(document, '"primary"', 1);
    if (light === undefined || dark === undefined) throw new Error("expected both hovers");

    expect(markdown(light)).toContain(BASE.tokens!.colors!["primary"]!);
    expect(markdown(dark)).toContain(DARK.tokens!.colors!["primary"]!);
    expect(markdown(dark)).toContain("dark");
  });
});

describe("documents that are not themes", () => {
  it("returns nothing for an unrelated JSON file", () => {
    // The word matches a role name, but the file is not a theme.
    const document = __openDocument(
      "/app/package.json",
      JSON.stringify({ name: "app", primary: "value" }, null, 2),
    );

    expect(hoverAt(document, '"primary"')).toBeUndefined();
  });

  it("returns nothing for malformed JSON", () => {
    const document = __openDocument("/app/theme.json", '{"tokens": {');

    expect(hoverAt(document, '"tokens"')).toBeUndefined();
  });

  it("returns nothing for a word that is not a role", () => {
    const document = __openDocument("/app/theme.json", SINGLE);

    expect(hoverAt(document, '"name"')).toBeUndefined();
  });

  it("returns nothing for a non-JSON document", () => {
    const document = __openDocument("/app/notes.md", SINGLE, "markdown");

    expect(hoverAt(document, '"primary"')).toBeUndefined();
  });
});
