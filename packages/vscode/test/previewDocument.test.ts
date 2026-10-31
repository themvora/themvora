/**
 * Message-protocol tests.
 *
 * Everything arriving from the webview is untrusted. These assert that only the
 * two known shapes get through, and that anything else is dropped rather than
 * dispatched or thrown.
 */
import { describe, expect, it } from "vitest";

import { parseWebviewMessage } from "../src/adapters/previewDocument";

describe("accepted messages", () => {
  it("accepts ready", () => {
    expect(parseWebviewMessage({ type: "ready" })).toEqual({ type: "ready" });
  });

  it.each([["light"], ["dark"]])("accepts setMode %s", (mode) => {
    expect(parseWebviewMessage({ type: "setMode", mode })).toEqual({ type: "setMode", mode });
  });

  it("ignores extra fields rather than rejecting the message", () => {
    // A newer webview may send more than this host knows about; that is not a
    // reason to drop a valid request.
    expect(parseWebviewMessage({ type: "setMode", mode: "dark", extra: true })).toEqual({
      type: "setMode",
      mode: "dark",
    });
  });
});

describe("rejected messages", () => {
  it.each([
    ["null", null],
    ["undefined", undefined],
    ["a string", "ready"],
    ["a number", 42],
    ["a boolean", true],
    ["an array", [{ type: "ready" }]],
  ])("rejects %s", (_label, value) => {
    expect(parseWebviewMessage(value)).toBeNull();
  });

  it("rejects an unknown type", () => {
    expect(parseWebviewMessage({ type: "execute" })).toBeNull();
    expect(parseWebviewMessage({ type: "ready " })).toBeNull();
  });

  it("rejects a missing type", () => {
    expect(parseWebviewMessage({})).toBeNull();
    expect(parseWebviewMessage({ mode: "light" })).toBeNull();
  });

  it("rejects setMode without a usable mode", () => {
    expect(parseWebviewMessage({ type: "setMode" })).toBeNull();
    expect(parseWebviewMessage({ type: "setMode", mode: "system" })).toBeNull();
    expect(parseWebviewMessage({ type: "setMode", mode: "" })).toBeNull();
    expect(parseWebviewMessage({ type: "setMode", mode: 1 })).toBeNull();
    expect(parseWebviewMessage({ type: "setMode", mode: ["light"] })).toBeNull();
    expect(parseWebviewMessage({ type: "setMode", mode: "light; rm -rf /" })).toBeNull();
  });

  it("never throws on plain junk", () => {
    // `postMessage` payloads are structured-cloned, so accessors cannot survive
    // the trip; these are the shapes that actually can arrive.
    const junk = [
      { type: "setMode", mode: null },
      { type: "setMode" },
      Object.create(null) as unknown,
      { type: { toString: () => "ready" } },
    ];

    for (const value of junk) {
      expect(() => parseWebviewMessage(value)).not.toThrow();
      expect(parseWebviewMessage(value)).toBeNull();
    }
  });
});
