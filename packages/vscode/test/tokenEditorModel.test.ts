/**
 * Pure editor helpers: search, picker safety and presence wording.
 */
import { describe, expect, it } from "vitest";

import type { StudioEditorGroup, StudioEditorToken } from "../src/shared/studioProtocol";
import {
  editorTokenKey,
  filterEditorGroups,
  groupSwatches,
  opaqueHex,
  presenceLabel,
} from "../webview/studio/tokenEditorModel";

/**
 * A minimal token.
 *
 * @param name - Token name.
 * @param overrides - Fields to override.
 * @returns The token.
 */
function token(name: string, overrides: Partial<StudioEditorToken> = {}): StudioEditorToken {
  return {
    path: ["colors", name],
    name,
    label: name,
    group: "actions",
    type: "color",
    value: "#123456",
    changed: false,
    presentIn: ["light", "dark"],
    presentInSelected: true,
    optional: false,
    contrasts: [],
    ...overrides,
  };
}

function group(): StudioEditorGroup {
  return {
    id: "actions",
    label: "Actions",
    description: "Interactive roles",
    tokens: [token("primary"), token("secondary")],
    issueCount: 0,
    changedCount: 0,
  };
}

describe("filterEditorGroups", () => {
  it("returns every group for an empty query", () => {
    const groups = [group()];
    expect(filterEditorGroups(groups, "")).toBe(groups);
    expect(filterEditorGroups(groups, "   ")).toBe(groups);
  });

  it("matches a token name and keeps its group", () => {
    const result = filterEditorGroups([group()], "primary");
    expect(result).toHaveLength(1);
    expect(result[0]?.tokens.map((entry) => entry.name)).toEqual(["primary"]);
  });

  it("a group match keeps all its tokens", () => {
    const result = filterEditorGroups([group()], "Actions");
    expect(result[0]?.tokens).toHaveLength(2);
  });

  it("matches labels and returns nothing when there is no match", () => {
    const groups = [
      group(),
      {
        ...group(),
        id: "radius",
        label: "Radius",
        description: "Corner sizes",
        tokens: [token("lg", { group: "radius", type: "length", value: "8px" })],
      },
    ];
    expect(filterEditorGroups(groups, "corner")).toHaveLength(1);
    expect(filterEditorGroups(groups, "nothing-here")).toEqual([]);
  });
});

describe("editor helpers", () => {
  it("keys nested paths without losing segments", () => {
    expect(editorTokenKey(["colors", "brand", "primary"])).not.toBe(
      editorTokenKey(["colors", "brand.primary"]),
    );
  });

  it("only offers a native picker for opaque hex values", () => {
    expect(opaqueHex("#abc")).toBe("#aabbcc");
    expect(opaqueHex("#aabbcc")).toBe("#aabbcc");
    expect(opaqueHex("#aabbccdd")).toBe("#aabbcc");
    expect(opaqueHex("rgb(1 2 3)")).toBeUndefined();
    expect(opaqueHex(undefined)).toBeUndefined();
  });

  it("describes variant presence without implying both", () => {
    expect(presenceLabel(token("primary"))).toBe("Light + Dark");
    expect(presenceLabel(token("primary", { presentIn: ["light"] }))).toBe("light only");
    expect(presenceLabel(token("primary", { presentIn: [] }))).toBe("not set");
  });

  it("collects only colour swatches for a group summary", () => {
    const groupWithMixed = {
      ...group(),
      tokens: [
        token("primary"),
        token("space", { type: "length", value: "8px" }),
        token("secondary", { value: "#abcdef" }),
      ],
    };
    expect(groupSwatches(groupWithMixed)).toEqual(["#123456", "#abcdef"]);
  });
});
