/**
 * Unsaved drafts in the shared theme catalog.
 *
 * The commands and the Studio have to agree on what a draft *is*: an entry the
 * user can pick, with an identity that survives a rename, that is never counted
 * as a project theme and never leaks into preset-registration evidence.
 */
import { generateTheme } from "@themvora/core";
import { describe, expect, it } from "vitest";

import type { ProjectInspection, RegistryEntry } from "../src/domain/registry";
import { createThemvoraClient } from "../src/services/coreClient";
import { createDraftRegistry, type ThemeDraft } from "../src/services/draftRegistry";
import {
  collectThemeEntries,
  draftEntries,
  isStaleEntry,
  latestEntry,
  projectEntries,
  type CatalogRoot,
  type ThemeCatalogDeps,
} from "../src/services/themeCatalog";

const PAIR = generateTheme({ seed: "#4f46e5" });
const OTHER = generateTheme({ seed: "#10b981" });

/** A registry entry holding the given themes. */
function registry(themes: readonly unknown[], path = "src/theme/theme.config.ts"): RegistryEntry {
  return {
    kind: "theme-module",
    path,
    status: "supported",
    detail: path,
    themes: themes as never,
    themeSources: themes.map((theme, index) => {
      const mode = (theme as { meta?: { mode?: string } }).meta?.mode;
      return {
        name: (theme as { name: string }).name,
        ...(mode === undefined ? {} : { mode }),
        location: { line: 10 + index, column: 1 },
      };
    }),
  };
}

/** A workspace root. */
function root(name: string, themes: readonly unknown[]): CatalogRoot {
  const inspection: ProjectInspection = {
    root: `C:/${name}`,
    status: "supported",
    packages: ["@themvora/core"],
    registries: [registry(themes)],
    notes: [],
    providers: [],
    relationships: [],
  };
  return { name, inspection };
}

/**
 * One registry for the fixture, as the extension has one per window.
 *
 * Two drafts only need to be distinguishable within the host that owns them,
 * so a per-call registry would hand out `draft-1` twice and test nothing.
 */
const sharedRegistry = createDraftRegistry();

/** A draft, created through the real registry. */
function draft(
  overrides: {
    scope?: { kind: "root"; root: string } | { kind: "standalone" };
    name?: string;
    themes?: readonly unknown[];
  } = {},
): ThemeDraft {
  const result = sharedRegistry.create({
    scope: overrides.scope ?? { kind: "standalone" },
    name: overrides.name ?? "generated",
    origin: "generated",
    themes: (overrides.themes ?? [PAIR.light, PAIR.dark]) as never,
  });
  if (!result.ok) throw new Error("refused");
  return result.draft;
}

describe("membership", () => {
  it("offers no drafts when the caller does not ask for them", async () => {
    // Every existing caller omits `drafts`, and must keep seeing exactly what
    // it saw before.
    const entries = await collectThemeEntries({
      client: createThemvoraClient(),
      roots: () => [],
    });

    expect(entries.filter((entry) => entry.origin === "draft")).toEqual([]);
  });

  it("offers drafts when the caller supplies them", async () => {
    const entries = await collectThemeEntries({
      client: createThemvoraClient(),
      roots: () => [],
      drafts: () => [draft()],
    });

    const drafts = entries.filter((entry) => entry.origin === "draft");
    expect(drafts).toHaveLength(2);
    expect(drafts[0]?.originLabel).toBe("Unsaved draft");
    // The registry id, not the name, is the identity.
    expect(drafts[0]?.id.startsWith("draft:draft-1:")).toBe(true);
    expect(drafts[0]?.draftId).toBe("draft-1");
  });

  it("does not change what the project themes are", async () => {
    const roots = () => [root("app", [PAIR.light, PAIR.dark])];

    const without = projectEntries(roots());
    const entries = await collectThemeEntries({
      client: createThemvoraClient(),
      roots,
      drafts: () => [draft()],
    });

    // The draft adds entries; it does not reclassify or duplicate the project's.
    expect(entries.filter((entry) => entry.origin === "project")).toEqual(without);
  });

  it("keeps catalog presets and drafts distinct", async () => {
    const entries = await collectThemeEntries({
      client: createThemvoraClient(),
      roots: () => [],
      drafts: () => [draft()],
    });

    const presets = entries.filter((entry) => entry.origin === "preset");
    expect(presets.length).toBeGreaterThan(0);
    // A generated draft is not a catalog item merely because core produced it.
    expect(presets.every((entry) => entry.catalogOrigin)).toBe(true);
    expect(entries.filter((entry) => entry.origin === "draft").every((entry) => !entry.catalogOrigin)).toBe(true);
  });

  it("never puts a draft in front of the user's open document", async () => {
    const entries = await collectThemeEntries({
      client: createThemvoraClient(),
      roots: () => [],
      activeDocument: () => ({ path: "C:/app/theme.json", themes: [OTHER.light] }),
      drafts: () => [draft()],
    });

    const order = entries.map((entry) => entry.origin);
    expect(order.indexOf("document")).toBeLessThan(order.indexOf("draft"));
  });
});

describe("identity", () => {
  it("does not collide with a project theme id", async () => {
    const entries = await collectThemeEntries({
      client: createThemvoraClient(),
      roots: () => [root("app", [PAIR.light, PAIR.dark])],
      drafts: () => [draft()],
    });

    const ids = entries.map((entry) => entry.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("keeps two drafts from two folders apart", () => {
    const app = draft({ scope: { kind: "root", root: "C:/app" } });
    const design = draft({ scope: { kind: "root", root: "C:/design-system" } });

    const entries = draftEntries([app, design]);
    const roots = new Set(entries.map((entry) => entry.root));

    expect(roots).toEqual(new Set(["C:/app", "C:/design-system"]));
    expect(new Set(entries.map((entry) => entry.id)).size).toBe(4);
  });

  it("leaves a standalone draft with no folder", () => {
    const entries = draftEntries([draft()]);
    expect(entries.every((entry) => entry.root === undefined)).toBe(true);
  });

  it("survives a rename without changing the entry id", () => {
    const registry = createDraftRegistry();
    const created = registry.create({
      scope: { kind: "standalone" },
      name: "first",
      origin: "generated",
      themes: [PAIR.light, PAIR.dark],
    });
    if (!created.ok) throw new Error("refused");

    const before = draftEntries([created.draft]).map((entry) => entry.id);
    const renamed = registry.update(created.draft.id, {
      expectedRevision: created.draft.revision,
      name: "second",
    });
    if (!renamed.ok) throw new Error("refused");

    expect(draftEntries([renamed.draft]).map((entry) => entry.id)).toEqual(before);
    // The label does follow the name — that is the point of a display name.
    expect(draftEntries([renamed.draft])[0]?.label).toContain("second");
  });

  it("labels a pair with its modes and a single variant without one", () => {
    const pair = draftEntries([draft()]);
    const single = draftEntries([draft({ themes: [PAIR.light] })]);

    expect(pair.map((entry) => entry.label)).toEqual(["generated · light", "generated · dark"]);
    expect(single[0]?.label).toBe("generated");
  });
});

describe("resolution", () => {
  it("offers the draft's whole family to a command that needs the siblings", async () => {
    const entries = await collectThemeEntries({
      client: createThemvoraClient(),
      roots: () => [],
      drafts: () => [draft()],
    });

    const light = entries.find((entry) => entry.origin === "draft" && entry.mode === "light");
    expect(light?.set.map((theme) => theme.name)).toEqual([PAIR.light.name, PAIR.dark.name]);
  });

  it("does not pick a draft silently when a project theme is also a candidate", async () => {
    // Two unrelated candidates is a question, not an answer — the policy the
    // commands already follow for project themes applies to drafts too.
    const entries = await collectThemeEntries({
      client: createThemvoraClient(),
      roots: () => [root("app", [PAIR.light])],
      drafts: () => [draft({ themes: [OTHER.light] })],
    });

    expect(entries.filter((entry) => entry.origin !== "preset")).toHaveLength(2);
  });
});

describe("revision resolution", () => {
  /** Dependencies over one registry. */
  function deps(registry: ReturnType<typeof createDraftRegistry>): ThemeCatalogDeps {
    return {
      client: createThemvoraClient(),
      roots: () => [],
      drafts: () => registry.list(),
    };
  }

  it("leaves a project entry alone", () => {
    const root = projectRootish();
    const entry = projectEntries([root])[0]!;

    // A file-backed theme is not mutable host state, so it is never stale and
    // resolves to itself.
    expect(isStaleEntry(deps(createDraftRegistry()), entry)).toBe(false);
    expect(latestEntry(deps(createDraftRegistry()), entry)).toBe(entry);
  });

  it("returns the latest revision of an edited draft", () => {
    const registry = createDraftRegistry();
    const created = registry.create({
      scope: { kind: "standalone" },
      name: "ocean",
      origin: "generated",
      themes: [PAIR.light, PAIR.dark],
    });
    if (!created.ok) throw new Error("refused");

    const resolved = draftEntries([created.draft])[0]!;
    const edited = registry.update(created.draft.id, {
      expectedRevision: created.draft.revision,
      themes: [OTHER.light, OTHER.dark],
    });
    if (!edited.ok) throw new Error("refused");

    expect(isStaleEntry(deps(registry), resolved)).toBe(true);
    const latest = latestEntry(deps(registry), resolved);
    // The same entry identity, carrying the newer tokens.
    expect(latest?.id).toBe(resolved.id);
    expect(latest?.draftRevision).toBe(edited.draft.revision);
    expect(latest?.theme.name).toBe(OTHER.light.name);
  });

  it("reports a discarded draft as unresolvable", () => {
    const registry = createDraftRegistry();
    const created = registry.create({
      scope: { kind: "standalone" },
      name: "ocean",
      origin: "generated",
      themes: [PAIR.light, PAIR.dark],
    });
    if (!created.ok) throw new Error("refused");
    const resolved = draftEntries([created.draft])[0]!;

    registry.discard(created.draft.id);

    // A command must not fall back to the entry it already had: the theme is
    // gone, not merely old.
    expect(latestEntry(deps(registry), resolved)).toBeUndefined();
    expect(isStaleEntry(deps(registry), resolved)).toBe(true);
  });
});

/** A project root holding one pair, for the non-draft case. */
function projectRootish(): CatalogRoot {
  const inspection: ProjectInspection = {
    root: "C:/app",
    status: "supported",
    packages: ["@themvora/core"],
    registries: [registry([PAIR.light, PAIR.dark])],
    notes: [],
    providers: [],
    relationships: [],
  };
  return { name: "app", inspection };
}
