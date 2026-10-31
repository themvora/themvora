/**
 * Patch application safety tests.
 *
 * Verifies that path validation rejects unsafe paths and that the applyPatch
 * service properly validates before writing.
 */
import { describe, expect, it } from "vitest";

import { applyPatch } from "../src/services/applyPatch";
import type { RootSessions } from "../src/services/rootSessions";
import { __reset } from "./stubs/vscode";

const mockSessions = {
  run: async (_root: string, fn: () => Promise<void>) => fn(),
} as unknown as RootSessions;

describe("applyPatch path validation", () => {
  it("rejects absolute paths starting with /", async () => {
    __reset();
    const result = await applyPatch({
      patch: {
        path: "/etc/passwd",
        action: "create",
        original: "",
        updated: "malicious content",
        description: "Test",
        generatedCode: { imports: [] },
      },
      sessions: mockSessions,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain("Cannot resolve path");
    }
  });

  it("rejects absolute paths with drive letters", async () => {
    __reset();
    const result = await applyPatch({
      patch: {
        path: "C:\\Windows\\System32\\config",
        action: "create",
        original: "",
        updated: "malicious content",
        description: "Test",
        generatedCode: { imports: [] },
      },
      sessions: mockSessions,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain("Cannot resolve path");
    }
  });

  it("rejects path traversal attempts", async () => {
    __reset();
    const result = await applyPatch({
      patch: {
        path: "../../../etc/passwd",
        action: "create",
        original: "",
        updated: "malicious content",
        description: "Test",
        generatedCode: { imports: [] },
      },
      sessions: mockSessions,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain("Cannot resolve path");
    }
  });

  it("rejects path traversal in the middle", async () => {
    __reset();
    const result = await applyPatch({
      patch: {
        path: "src/../../../etc/passwd",
        action: "create",
        original: "",
        updated: "malicious content",
        description: "Test",
        generatedCode: { imports: [] },
      },
      sessions: mockSessions,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain("Cannot resolve path");
    }
  });
});
