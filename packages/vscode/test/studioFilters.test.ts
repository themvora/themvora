/**
 * Evidence filters.
 *
 * Each filter must follow from the typed evidence state, not from a file name
 * or a family spelling. These tests also pin the two exceptions: a catalog
 * origin stays visible when the theme is registered, and a source imported by a
 * partial/dynamic consumer appears under "partial" even though the theme
 * itself remains defined-unregistered.
 */
import { describe, expect, it } from "vitest";

import {
  familyMatches,
  presetVisible,
  sourceMatches,
  themeMatches,
} from "../webview/studioFilters";

describe("themeMatches", () => {
  it("filters by the evidence the host sent", () => {
    expect(themeMatches({ evidence: "registered" }, "registered")).toBe(true);
    expect(themeMatches({ evidence: "registered" }, "unregistered")).toBe(false);

    expect(themeMatches({ evidence: "defined-unregistered" }, "unregistered")).toBe(true);
    expect(themeMatches({ evidence: "partially-resolved" }, "partial")).toBe(true);
    expect(themeMatches({ evidence: "catalog-source" }, "catalog")).toBe(true);
    expect(themeMatches({ evidence: "registered" }, "invalid")).toBe(false);
    expect(themeMatches({ evidence: "registered" }, "all")).toBe(true);
  });

  it("treats catalog origin as catalog even when the theme is registered", () => {
    expect(themeMatches({ evidence: "registered", origin: "catalog" }, "catalog")).toBe(true);
    expect(themeMatches({ evidence: "registered", origin: "definition" }, "catalog")).toBe(false);
  });
});

describe("familyMatches", () => {
  it("matches a family when any of its themes matches", () => {
    const family = [{ evidence: "registered" }, { evidence: "defined-unregistered" }];

    expect(familyMatches(family, "registered")).toBe(true);
    expect(familyMatches(family, "unregistered")).toBe(true);
    expect(familyMatches(family, "catalog")).toBe(false);
  });
});

describe("sourceMatches", () => {
  it("keeps malformed and unsupported sources under invalid", () => {
    const malformed = { path: "src/broken.ts", status: "malformed", definitions: [] };

    expect(sourceMatches(malformed, "invalid")).toBe(true);
    expect(sourceMatches(malformed, "registered")).toBe(false);
  });

  it("matches the evidence of the definitions it holds", () => {
    const source = {
      path: "src/theme.ts",
      status: "supported",
      definitions: [{ evidence: "registered" }],
    };

    expect(sourceMatches(source, "registered")).toBe(true);
    expect(sourceMatches(source, "unregistered")).toBe(false);
  });

  it("matches a catalog definition by origin", () => {
    const source = {
      path: "src/presets.ts",
      status: "supported",
      definitions: [{ evidence: "defined-unregistered", origin: "catalog" }],
    };

    expect(sourceMatches(source, "catalog")).toBe(true);
  });

  it("includes a source imported by a partial consumer", () => {
    const source = {
      path: "src/theme.ts",
      status: "supported",
      definitions: [{ evidence: "defined-unregistered" }],
    };

    expect(sourceMatches(source, "partial")).toBe(false);
    expect(sourceMatches(source, "partial", new Set(["src/theme.ts"]))).toBe(true);
  });
});

describe("presetVisible", () => {
  it("shows catalog previews only under all or catalog", () => {
    expect(presetVisible("all")).toBe(true);
    expect(presetVisible("catalog")).toBe(true);
    expect(presetVisible("registered")).toBe(false);
    expect(presetVisible("unregistered")).toBe(false);
    expect(presetVisible("partial")).toBe(false);
    expect(presetVisible("invalid")).toBe(false);
  });
});
