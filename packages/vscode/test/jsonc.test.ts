/**
 * JSONC in the editor.
 *
 * The point of these is not that comments parse — core proves that — but that
 * **positions survive masking**. Every assertion slices the *original* text with
 * offsets produced from the masked source, which is the property a squiggle or a
 * swatch depends on.
 */
import { generateTheme } from "@themvora/core";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { OutputChannel } from "vscode";

import { createColorProvider } from "../src/adapters/colorSwatches";
import { registerThemeDiagnostics } from "../src/adapters/diagnosticCollection";
import { createRoleHoverProvider } from "../src/adapters/roleHover";
import { parseThemeDocument } from "../src/domain/themeDocument";
import {
  __openDocument,
  __reset,
  __state,
  Diagnostic,
  Range,
  type FakeDocument,
  type RecordedDiagnosticCollection,
} from "./stubs/vscode";

const BASE = generateTheme({ seed: "#4f46e5" }).light;
const DARK = generateTheme({ seed: "#4f46e5" }).dark;

/** A valid pair, commented and with a trailing comma. */
const COMMENTED_PAIR = `{
  // hand-authored theme
  "light": ${JSON.stringify(BASE, null, 2)},
  /* the dark half */
  "dark": ${JSON.stringify(DARK, null, 2)},
}`;

/** A broken theme, commented, with a trailing comma in the colour block. */
const COMMENTED_BROKEN = `{
  // a theme missing most roles
  "name": "broken",
  "meta": { "mode": "light" },
  "tokens": {
    "colors": {
      // the only two roles present
      "primary": "nope",
      "background": "#fff",
    },
  },
}`;

const output = { appendLine: () => undefined } as unknown as OutputChannel;

/** The collection the adapter created. */
function collection(): RecordedDiagnosticCollection {
  const found = __state.diagnosticCollections[0];
  if (!found) throw new Error("no diagnostic collection was created");
  return found;
}

/** The diagnostics published for a file. */
function diagnosticsFor(document: FakeDocument): Diagnostic[] {
  return (collection().entries.get(document.uri.toString()) ?? []) as Diagnostic[];
}

/** The text a diagnostic covers, taken from the original document. */
function coveredText(document: FakeDocument, diagnostic: Diagnostic): string {
  return document.getText().slice(
    document.offsetAt!(diagnostic.range.start),
    document.offsetAt!(diagnostic.range.end),
  );
}

let disposable: { dispose(): void } | undefined;

beforeEach(() => {
  __reset();
  disposable = registerThemeDiagnostics({ output });
});

afterEach(() => {
  disposable?.dispose();
  disposable = undefined;
});

describe("parsing", () => {
  it("accepts a commented pair", () => {
    const document = parseThemeDocument(COMMENTED_PAIR);

    expect(document.shape).toBe("themes");
    if (document.shape !== "themes") return;
    expect(document.themes).toHaveLength(2);
    // The masked source is the same length as the file.
    expect(document.source).toHaveLength(COMMENTED_PAIR.length);
  });

  it("still rejects a document that is not a theme", () => {
    expect(parseThemeDocument('{\n  // note\n  "hello": "world"\n}').shape).toBe("unknown");
  });

  it("still rejects malformed JSONC", () => {
    expect(parseThemeDocument('{\n  // note\n  "tokens": {').shape).toBe("invalid-json");
  });
});

describe("diagnostics", () => {
  it("reports the same issues for a commented document", () => {
    const document = __openDocument("/app/theme.jsonc", COMMENTED_BROKEN, "jsonc");

    const diagnostics = diagnosticsFor(document);

    expect(diagnostics).toHaveLength(20);
    expect(diagnostics.filter((entry) => entry.code === "TV_THEME_TOKEN_MISSING")).toHaveLength(19);
    expect(diagnostics.filter((entry) => entry.code === "TV_THEME_TOKEN_INVALID")).toHaveLength(1);
  });

  it("underlines the value in the original file, past the comments", () => {
    const document = __openDocument("/app/theme.jsonc", COMMENTED_BROKEN, "jsonc");

    const invalid = diagnosticsFor(document).find(
      (entry) => entry.code === "TV_THEME_TOKEN_INVALID",
    );
    if (invalid === undefined) throw new Error("expected the invalid-value diagnostic");

    // Offsets came from the masked source; the slice is from the raw file.
    expect(coveredText(document, invalid)).toBe("nope");
  });

  it("underlines the containing object for a missing token, past the comments", () => {
    const document = __openDocument("/app/theme.jsonc", COMMENTED_BROKEN, "jsonc");

    const missing = diagnosticsFor(document).find(
      (entry) => entry.code === "TV_THEME_TOKEN_MISSING",
    );
    if (missing === undefined) throw new Error("expected a missing-token diagnostic");

    const covered = coveredText(document, missing);
    expect(covered.startsWith("{")).toBe(true);
    expect(covered).toContain('"primary"');
  });

  it("clears when a commented document becomes malformed", async () => {
    const document = __openDocument("/app/theme.jsonc", COMMENTED_BROKEN, "jsonc");
    expect(diagnosticsFor(document).length).toBeGreaterThan(0);

    const { __changeDocument } = await import("./stubs/vscode");
    __changeDocument("/app/theme.jsonc", '{\n  // note\n  "tokens": {');

    // The debounce is 200 ms; wait for it to fire.
    await new Promise((resolve) => setTimeout(resolve, 300));

    expect(diagnosticsFor(document)).toEqual([]);
  });
});

describe("colour swatches", () => {
  const provider = createColorProvider();

  it("offers one per colour token across both commented halves", () => {
    const document = __openDocument("/app/theme.jsonc", COMMENTED_PAIR, "jsonc");

    const colors = provider.provideDocumentColors!(
      document as never,
      undefined as never,
    ) as unknown as { range: Range; color: unknown }[];

    expect(colors).toHaveLength(42);
  });

  it("returns ranges that address hex literals in the original file", () => {
    const document = __openDocument("/app/theme.jsonc", COMMENTED_PAIR, "jsonc");
    const colors = provider.provideDocumentColors!(
      document as never,
      undefined as never,
    ) as unknown as { range: Range }[];

    for (const entry of colors) {
      const covered = document.getText().slice(
        document.offsetAt!(entry.range.start),
        document.offsetAt!(entry.range.end),
      );
      expect(covered).toMatch(/^#[0-9a-fA-F]{3,8}$/);
    }
  });
});

describe("hover", () => {
  const provider = createRoleHoverProvider();

  it("explains a role in a commented document", () => {
    const document = __openDocument("/app/theme.jsonc", COMMENTED_PAIR, "jsonc");
    const offset = document.getText().indexOf('"primary":');

    const hover = provider.provideHover!(
      document as never,
      document.positionAt!(offset + 2) as never,
      undefined as never,
    ) as { contents: { value: string } } | undefined;

    if (hover === undefined) throw new Error("expected a hover");
    expect(hover.contents.value).toContain("`primary`");
  });
});
