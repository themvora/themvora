/**
 * Diagnostic-collection tests.
 *
 * These drive the adapter through the fake host's document lifecycle: open,
 * change, close, and activation with documents already open. The collection is
 * recorded rather than rendered, so what is asserted is exactly what the editor
 * would be given.
 */
import { generateTheme } from "@themvora/core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { OutputChannel } from "vscode";

import { registerThemeDiagnostics } from "../src/adapters/diagnosticCollection";
import {
  __changeDocument,
  __closeDocument,
  __openDocument,
  __reset,
  __state,
  Diagnostic,
  Position,
  Uri,
  type RecordedDiagnosticCollection,
} from "./stubs/vscode";

const BASE = generateTheme({ seed: "#4f46e5" }).light;
const DARK = generateTheme({ seed: "#4f46e5" }).dark;

/** A valid pair document. */
const PAIR = JSON.stringify({ light: BASE, dark: DARK }, null, 2);

/** A theme missing every role except two, one of which is not a colour. */
const BROKEN = JSON.stringify(
  { name: "broken", meta: { mode: "light" }, tokens: { colors: { primary: "nope", background: "#fff" } } },
  null,
  2,
);

/** The collection the adapter created. */
function collection(): RecordedDiagnosticCollection {
  const found = __state.diagnosticCollections[0];
  if (!found) throw new Error("no diagnostic collection was created");
  return found;
}

/** The diagnostics published for a file. */
function diagnosticsFor(fsPath: string): Diagnostic[] {
  const entries = collection().entries.get(Uri.file(fsPath).toString());
  return (entries ?? []) as Diagnostic[];
}

/** Convert a position back to an offset, for asserting the underlined text. */
function offsetOf(text: string, position: Position): number {
  const lines = text.split("\n");
  let offset = 0;
  for (let index = 0; index < position.line; index += 1) {
    offset += (lines[index] ?? "").length + 1;
  }
  return offset + position.character;
}

/** The text a diagnostic covers. */
function coveredText(text: string, diagnostic: Diagnostic): string {
  return text.slice(offsetOf(text, diagnostic.range.start), offsetOf(text, diagnostic.range.end));
}

/** A stand-in output channel. */
const output = { appendLine: () => undefined } as unknown as OutputChannel;

let disposable: { dispose(): void } | undefined;

beforeEach(() => {
  __reset();
  disposable = registerThemeDiagnostics({ output });
});

afterEach(() => {
  disposable?.dispose();
  disposable = undefined;
  vi.useRealTimers();
});

describe("opening documents", () => {
  it("publishes one error per missing token path", () => {
    __openDocument("/app/theme.json", BROKEN);

    const diagnostics = diagnosticsFor("/app/theme.json");

    // 19 missing roles + 1 invalid value, and no duplicates from the levels pass.
    expect(diagnostics).toHaveLength(20);
    expect(diagnostics.filter((diagnostic) => diagnostic.severity === 0)).toHaveLength(20);
    expect(diagnostics.every((diagnostic) => diagnostic.source === "Themvora")).toBe(true);

    const codes = diagnostics.map((diagnostic) => diagnostic.code);
    expect(codes.filter((code) => code === "TV_THEME_TOKEN_MISSING")).toHaveLength(19);
    expect(codes.filter((code) => code === "TV_THEME_TOKEN_INVALID")).toHaveLength(1);
  });

  it("underlines the offending value for an invalid token", () => {
    __openDocument("/app/theme.json", BROKEN);

    const invalid = diagnosticsFor("/app/theme.json").find(
      (diagnostic) => diagnostic.code === "TV_THEME_TOKEN_INVALID",
    );
    if (invalid === undefined) throw new Error("expected the invalid-value diagnostic");

    expect(coveredText(BROKEN, invalid)).toBe("nope");
  });

  it("points a missing token at the object that should hold it", () => {
    __openDocument("/app/theme.json", BROKEN);

    const missing = diagnosticsFor("/app/theme.json").find(
      (diagnostic) => diagnostic.code === "TV_THEME_TOKEN_MISSING",
    );
    if (missing === undefined) throw new Error("expected a missing-token diagnostic");

    // No key exists to underline, so the fallback is the `colors` object.
    const covered = coveredText(BROKEN, missing);
    expect(covered.startsWith("{")).toBe(true);
    expect(covered).toContain('"primary"');
  });

  it("publishes nothing for a healthy theme", () => {
    __openDocument("/app/theme.json", PAIR);

    expect(diagnosticsFor("/app/theme.json")).toEqual([]);
  });

  it("distinguishes the two halves of a pair", () => {
    const brokenPair = JSON.stringify({
      light: { name: "l", meta: { mode: "light" }, tokens: {} },
      dark: { name: "d", meta: { mode: "dark" }, tokens: {} },
    }, null, 2);

    __openDocument("/app/theme.json", brokenPair);

    // Backticks matter: `colors.primary` is a prefix of `colors.primaryForeground`.
    const primary = diagnosticsFor("/app/theme.json").filter((diagnostic) =>
      diagnostic.message.includes("`colors.primary`"),
    );

    // One per half, at two different places in the document.
    expect(primary).toHaveLength(2);
    expect(primary[0]!.range.start.line).not.toBe(primary[1]!.range.start.line);
  });
});

describe("eligibility", () => {
  it("ignores a document that is not JSON", () => {
    __openDocument("/app/notes.md", BROKEN, "markdown");

    expect(collection().setCalls).toBe(0);
  });

  it("ignores JSON that is not a theme", () => {
    __openDocument("/app/package.json", '{"name":"app","version":"1.0.0"}');

    expect(diagnosticsFor("/app/package.json")).toEqual([]);
  });

  it("accepts a jsonc document", () => {
    __openDocument("/app/theme.jsonc", BROKEN, "jsonc");

    expect(diagnosticsFor("/app/theme.jsonc").length).toBeGreaterThan(0);
  });
});

describe("malformed edits", () => {
  it("clears instead of reporting a parse error", () => {
    const file = "/app/theme.json";
    __openDocument(file, BROKEN);
    expect(diagnosticsFor(file).length).toBeGreaterThan(0);

    vi.useFakeTimers();
    __changeDocument(file, '{ "name": "broken", "tokens": {');
    vi.advanceTimersByTime(250);

    expect(diagnosticsFor(file)).toEqual([]);
  });

  it("recovers when the document becomes a theme again", () => {
    const file = "/app/theme.json";
    __openDocument(file, '{"name":"x"}');
    expect(diagnosticsFor(file)).toEqual([]);

    vi.useFakeTimers();
    __changeDocument(file, BROKEN);
    vi.advanceTimersByTime(250);

    expect(diagnosticsFor(file).length).toBeGreaterThan(0);
  });
});

describe("edits", () => {
  it("recomputes from the live buffer", () => {
    const file = "/app/theme.json";
    __openDocument(file, PAIR);
    expect(diagnosticsFor(file)).toEqual([]);

    vi.useFakeTimers();
    // Unsaved edit: only the buffer changes.
    __changeDocument(file, BROKEN);
    vi.advanceTimersByTime(250);

    expect(diagnosticsFor(file).length).toBeGreaterThan(0);
  });

  it("collapses a burst into one publish", () => {
    const file = "/app/theme.json";
    __openDocument(file, PAIR);

    vi.useFakeTimers();
    const before = collection().setCalls;

    for (let index = 0; index < 5; index += 1) __changeDocument(file, BROKEN);
    vi.advanceTimersByTime(250);

    expect(collection().setCalls).toBe(before + 1);
  });

  it("publishes the final content, not an intermediate state", () => {
    const file = "/app/theme.json";
    __openDocument(file, PAIR);

    vi.useFakeTimers();
    __changeDocument(file, BROKEN);
    __changeDocument(file, PAIR);
    vi.advanceTimersByTime(250);

    // The last edit was healthy, so the published result is empty.
    expect(diagnosticsFor(file)).toEqual([]);
  });

  it("does nothing when the document closed before the timer fired", () => {
    const file = "/app/theme.json";
    __openDocument(file, PAIR);

    vi.useFakeTimers();
    __changeDocument(file, BROKEN);
    __closeDocument(file);
    const before = collection().setCalls;

    vi.advanceTimersByTime(250);

    expect(collection().setCalls).toBe(before);
  });
});

describe("closing", () => {
  it("removes that document's diagnostics", () => {
    const file = "/app/theme.json";
    __openDocument(file, BROKEN);
    expect(diagnosticsFor(file).length).toBeGreaterThan(0);

    __closeDocument(file);

    expect(diagnosticsFor(file)).toEqual([]);
  });

  it("leaves other documents alone", () => {
    __openDocument("/app/one.json", BROKEN);
    __openDocument("/app/two.json", BROKEN);

    __closeDocument("/app/one.json");

    expect(diagnosticsFor("/app/one.json")).toEqual([]);
    expect(diagnosticsFor("/app/two.json").length).toBeGreaterThan(0);
  });
});

describe("activation", () => {
  it("evaluates documents that were already open", () => {
    // Register a second collection after a document is open, as a late
    // activation would.
    __openDocument("/app/theme.json", BROKEN);
    const late = registerThemeDiagnostics({ output });

    const created = __state.diagnosticCollections[1];
    expect(created?.entries.get(Uri.file("/app/theme.json").toString())?.length).toBeGreaterThan(0);

    late.dispose();
  });
});

describe("disposal", () => {
  it("disposes the collection and stops listening", () => {
    disposable?.dispose();
    disposable = undefined;

    expect(collection().disposed).toBe(true);

    // No listeners survive, so opening a document changes nothing.
    __openDocument("/app/theme.json", BROKEN);
    expect(collection().setCalls).toBe(0);
  });
});
