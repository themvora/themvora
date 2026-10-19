import { describe, expect, it } from "vitest";
import { getBuiltInThemes } from "../src/built-in-themes";
import {
  CORE_COLORS,
  OPTIONAL_SEMANTICS,
  SEMANTIC_ROLE_GROUPS,
  isCoreColor,
  isOptionalSemantic,
} from "../src/model/semantic-roles";

/**
 * The semantic vocabulary is a **contract**, so it is pinned against the one
 * thing that can contradict it: the themes Themvora actually ships.
 *
 * The failure this guards is quiet. If `CORE_COLORS` lists a role the built-in
 * themes do not define, every adapter declaring it in `requires` is asking for
 * something no shipped theme can satisfy — and the adapter will emit an empty
 * variable rather than fail, which is how unreadable content ships.
 */
describe("semantic role vocabulary", () => {
  it("lists 21 core roles", () => {
    expect(CORE_COLORS).toHaveLength(21);
    expect(new Set(CORE_COLORS).size).toBe(21);
  });

  it("defines every core role in every built-in theme", () => {
    const themes = getBuiltInThemes();
    expect(themes.length).toBeGreaterThan(0);

    for (const theme of themes) {
      const colors = theme.tokens.colors ?? {};
      const missing = CORE_COLORS.filter((role) => {
        const value = colors[role];
        return typeof value !== "string" || value.length === 0;
      });
      expect(missing, `${theme.name} is missing core roles`).toEqual([]);
    }
  });

  it("keeps warning / info / error out of the core contract", () => {
    // They are genuine semantic roles, but not every library has a slot for
    // them. Requiring them of every theme would force themes to invent values
    // nothing consumes.
    expect(CORE_COLORS).not.toContain("warning");
    expect(CORE_COLORS).not.toContain("info");
    expect(CORE_COLORS).not.toContain("error");
    expect(OPTIONAL_SEMANTICS).toEqual([
      "warning",
      "warningForeground",
      "info",
      "infoForeground",
      "error",
      "errorForeground",
    ]);
  });

  it("classifies every role exactly once across the groups", () => {
    const grouped = SEMANTIC_ROLE_GROUPS.flatMap((group) => [
      ...group.roles,
      ...(group.optional ?? []),
    ]);
    const core = grouped.filter((role) => (CORE_COLORS as readonly string[]).includes(role));
    const optional = grouped.filter((role) => (OPTIONAL_SEMANTICS as readonly string[]).includes(role));

    expect(new Set(grouped).size).toBe(grouped.length);
    expect(new Set(core).size).toBe(CORE_COLORS.length);
    expect(new Set(optional).size).toBe(OPTIONAL_SEMANTICS.length);
  });

  it("guards the two vocabularies apart", () => {
    expect(isCoreColor("primary")).toBe(true);
    expect(isCoreColor("warning")).toBe(false);
    expect(isCoreColor("nonsense")).toBe(false);

    expect(isOptionalSemantic("warning")).toBe(true);
    expect(isOptionalSemantic("primary")).toBe(false);
    expect(isOptionalSemantic("nonsense")).toBe(false);
  });

  it("describes every role as either an action, a surface or a state", () => {
    // The grouping exists so a reader can answer "is this a surface or an
    // action?" without consulting a specific library's token list.
    for (const group of SEMANTIC_ROLE_GROUPS) {
      expect(group.roles.length, `${group.id} has no roles`).toBeGreaterThan(0);
      expect(group.label.length).toBeGreaterThan(0);
      expect(group.description.length).toBeGreaterThan(0);
    }
    expect(SEMANTIC_ROLE_GROUPS.map((g) => g.id)).toEqual([
      "canvas",
      "surfaces",
      "actions",
      "states",
      "interaction",
    ]);
  });
});
