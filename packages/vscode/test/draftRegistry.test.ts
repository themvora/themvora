/**
 * The host-owned draft registry.
 *
 * A draft used to be a set of closure variables inside the Studio panel, so
 * nothing outside that webview could name one. These assert the properties the
 * rest of the extension now depends on: a stable id, a revision that detects
 * stale writers, a scope that keeps folders apart, and a lifetime that does not
 * pretend to be durable.
 */
import { generateTheme } from "@themvora/core";
import { describe, expect, it } from "vitest";

import {
  createDraftRegistry,
  sameScope,
  type CreateDraftInput,
  type ThemeDraft,
} from "../src/services/draftRegistry";

const PAIR = generateTheme({ seed: "#4f46e5" });
const OTHER = generateTheme({ seed: "#10b981" });

/** A minimal draft input, overridable per test. */
function input(overrides: Partial<CreateDraftInput> = {}): CreateDraftInput {
  return {
    scope: { kind: "root", root: "C:/app" },
    name: PAIR.light.name,
    family: "generated",
    origin: "generated",
    themes: [PAIR.light, PAIR.dark],
    ...overrides,
  };
}

/** Create a draft or fail the test with the reason. */
function created(overrides: Partial<CreateDraftInput> = {}): ThemeDraft {
  const result = createDraftRegistry().create(input(overrides));
  if (!result.ok) throw new Error(`draft was refused: ${result.failure.kind}`);
  return result.draft;
}

describe("identity", () => {
  it("survives a rename and an edit", () => {
    const registry = createDraftRegistry();
    const first = registry.create(input());
    if (!first.ok) throw new Error("refused");

    const renamed = registry.update(first.draft.id, {
      expectedRevision: first.draft.revision,
      name: "something-else",
    });
    if (!renamed.ok) throw new Error("refused");

    expect(renamed.draft.id).toBe(first.draft.id);
    expect(renamed.draft.name).toBe("something-else");
  });

  it("distinguishes two drafts with the same family and name", () => {
    const registry = createDraftRegistry();
    const first = registry.create(input());
    const second = registry.create(input());
    if (!first.ok || !second.ok) throw new Error("refused");

    // Same name, same family, same folder — and still two drafts, because a
    // developer legitimately wants two variations of one starting point.
    expect(first.draft.name).toBe(second.draft.name);
    expect(first.draft.id).not.toBe(second.draft.id);
    expect(registry.size()).toBe(2);
  });

  it("does not derive identity from the name, family or position", () => {
    const draft = created();
    // Nothing about the current content appears in the id.
    expect(draft.id).toBe("draft-1");
    expect(draft.id).not.toContain(draft.name);
  });

  it("keeps two folders with identical relative paths apart", () => {
    const registry = createDraftRegistry();
    const app = registry.create(input({ scope: { kind: "root", root: "C:/app" } }));
    const design = registry.create(input({ scope: { kind: "root", root: "C:/design-system" } }));
    if (!app.ok || !design.ok) throw new Error("refused");

    expect(app.draft.id).not.toBe(design.draft.id);
    expect(registry.list({ kind: "root", root: "C:/app" }).map((draft) => draft.id)).toEqual([
      app.draft.id,
    ]);
  });

  it("keeps standalone drafts out of every folder", () => {
    const registry = createDraftRegistry();
    const standalone = registry.create(input({ scope: { kind: "standalone" } }));
    const rooted = registry.create(input());
    if (!standalone.ok || !rooted.ok) throw new Error("refused");

    expect(registry.list({ kind: "standalone" })).toHaveLength(1);
    expect(registry.list({ kind: "root", root: "C:/app" }).map((draft) => draft.id)).toEqual([
      rooted.draft.id,
    ]);
  });

  it("compares scopes without treating standalone as the first folder", () => {
    expect(sameScope({ kind: "standalone" }, { kind: "standalone" })).toBe(true);
    expect(sameScope({ kind: "standalone" }, { kind: "root", root: "C:/app" })).toBe(false);
    expect(sameScope({ kind: "root", root: "C:/app" }, { kind: "root", root: "C:/app" })).toBe(true);
    expect(sameScope({ kind: "root", root: "C:/app" }, { kind: "root", root: "C:/other" })).toBe(
      false,
    );
  });
});

describe("lifecycle", () => {
  it("starts dirty at revision 1 and increments on every edit", () => {
    const registry = createDraftRegistry();
    const first = registry.create(input());
    if (!first.ok) throw new Error("refused");

    expect(first.draft.dirty).toBe(true);
    expect(first.draft.revision).toBe(1);

    const edited = registry.update(first.draft.id, {
      expectedRevision: 1,
      themes: [OTHER.light, OTHER.dark],
    });
    if (!edited.ok) throw new Error("refused");

    expect(edited.draft.revision).toBe(2);
    expect(edited.draft.themes[0]?.name).toBe(OTHER.light.name);
  });

  it("refuses a stale revision instead of overwriting a newer one", () => {
    const registry = createDraftRegistry();
    const first = registry.create(input());
    if (!first.ok) throw new Error("refused");

    registry.update(first.draft.id, { expectedRevision: 1, name: "second" });

    // A result computed against revision 1 arriving after revision 2 exists.
    const late = registry.update(first.draft.id, { expectedRevision: 1, name: "late" });

    expect(late.ok).toBe(false);
    if (late.ok) throw new Error("unreachable");
    expect(late.failure).toEqual({ kind: "stale-revision", expected: 1, actual: 2 });
    // The newer value is what stands.
    expect(registry.get(first.draft.id)?.name).toBe("second");
  });

  it("reports an unknown id rather than creating one", () => {
    const registry = createDraftRegistry();
    const result = registry.update("draft-99", { expectedRevision: 1, name: "ghost" });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("unreachable");
    expect(result.failure).toEqual({ kind: "unknown-draft", id: "draft-99" });
    expect(registry.size()).toBe(0);
  });

  it("reverts to the recorded baseline under the same id", () => {
    const registry = createDraftRegistry();
    const first = registry.create(input({ baseline: [PAIR.light, PAIR.dark] }));
    if (!first.ok) throw new Error("refused");

    const edited = registry.update(first.draft.id, {
      expectedRevision: 1,
      themes: [OTHER.light, OTHER.dark],
    });
    if (!edited.ok) throw new Error("refused");

    const reverted = registry.revert(first.draft.id, edited.draft.revision);
    if (!reverted.ok) throw new Error("refused");

    expect(reverted.draft.id).toBe(first.draft.id);
    expect(reverted.draft.themes[0]?.name).toBe(PAIR.light.name);
    // Restoring values is not writing a file.
    expect(reverted.draft.dirty).toBe(true);
  });

  it("refuses a revert when there is no baseline", () => {
    const registry = createDraftRegistry();
    const first = registry.create(input());
    if (!first.ok) throw new Error("refused");

    const result = registry.revert(first.draft.id, 1);

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("unreachable");
    expect(result.failure).toEqual({ kind: "no-baseline", id: first.draft.id });
  });

  it("marks saved only at the revision that was written", () => {
    const registry = createDraftRegistry();
    const first = registry.create(input());
    if (!first.ok) throw new Error("refused");

    const saved = registry.markSaved(first.draft.id, 1, "src/theme/generated.ts");
    if (!saved.ok) throw new Error("refused");

    expect(saved.draft.dirty).toBe(false);
    expect(saved.draft.saved).toEqual({ path: "src/theme/generated.ts", revision: 1 });

    // A stale save proposal must not mark a newer revision as written.
    const stale = registry.markSaved(first.draft.id, 1, "elsewhere.ts");
    expect(stale.ok).toBe(false);
  });

  it("is dirty again after an edit that follows a save", () => {
    const registry = createDraftRegistry();
    const first = registry.create(input());
    if (!first.ok) throw new Error("refused");
    const saved = registry.markSaved(first.draft.id, 1, "a.ts");
    if (!saved.ok) throw new Error("refused");

    const edited = registry.update(first.draft.id, {
      expectedRevision: saved.draft.revision,
      themes: [OTHER.light, OTHER.dark],
    });
    if (!edited.ok) throw new Error("refused");

    expect(edited.draft.dirty).toBe(true);
    // The record of what was written stays; it is what the file holds.
    expect(edited.draft.saved?.path).toBe("a.ts");
  });

  it("discards explicitly and reports whether anything was there", () => {
    const registry = createDraftRegistry();
    const first = registry.create(input());
    if (!first.ok) throw new Error("refused");

    expect(registry.discard(first.draft.id)).toBe(true);
    expect(registry.discard(first.draft.id)).toBe(false);
    expect(registry.get(first.draft.id)).toBeUndefined();
  });

  it("detaches a removed folder's drafts instead of losing them", () => {
    const registry = createDraftRegistry();
    const rooted = registry.create(input());
    if (!rooted.ok) throw new Error("refused");

    expect(registry.detachRoot("C:/app")).toBe(1);

    const detached = registry.get(rooted.draft.id);
    expect(detached?.scope).toEqual({ kind: "standalone" });
    // The work survives; only its association is gone.
    expect(detached?.themes).toHaveLength(2);
  });
});

describe("bounds", () => {
  it("never evicts a dirty draft to make room", () => {
    const registry = createDraftRegistry();
    const ids: string[] = [];
    for (let index = 0; index < 50; index += 1) {
      const result = registry.create(input());
      if (!result.ok) throw new Error(`refused at ${String(index)}`);
      ids.push(result.draft.id);
    }

    const overflow = registry.create(input());

    expect(overflow.ok).toBe(false);
    if (overflow.ok) throw new Error("unreachable");
    expect(overflow.failure).toEqual({ kind: "at-capacity", count: 50 });
    // Every draft is still there — nothing was lost to a memory bound.
    expect(registry.list()).toHaveLength(50);
  });

  it("evicts a saved draft before refusing", () => {
    const registry = createDraftRegistry();
    for (let index = 0; index < 50; index += 1) registry.create(input());
    const first = registry.list()[0]!;
    registry.markSaved(first.id, first.revision, "a.ts");

    const overflow = registry.create(input());

    expect(overflow.ok).toBe(true);
    expect(registry.get(first.id)).toBeUndefined();
  });

  it("refuses a draft with no themes", () => {
    const registry = createDraftRegistry();
    const result = registry.create(input({ themes: [] }));

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("unreachable");
    expect(result.failure.kind).toBe("empty");
  });
});
