/**
 * One list of selectable themes, from every source the extension can read.
 *
 * The commands each grew their own way of finding a theme: three of them opened
 * a JSON file dialog, the preview command read the active editor, the preset
 * command read the catalog. The same project theme was therefore reachable from
 * one command and invisible to the next, and a preset could be previewed but not
 * compared.
 *
 * This module is that one list. It does not read source itself — the inspection
 * already did, and its `relationships` already carry the evidence — and it does
 * not resolve themes itself: `ThemeDefinition` values come straight from the
 * graph and from the bundled core catalog. A command asks for the catalog, then
 * asks the user, then hands the chosen `ThemeDefinition` to core.
 *
 * @packageDocumentation
 */
import { window, type QuickPickItem } from "vscode";
import type { ThemeDefinition } from "@themvora/core";

import type { ProjectInspection } from "../domain/registry.js";
import type { ThemvoraClient } from "./coreClient.js";
import type { ThemeDraft } from "./draftRegistry.js";

/** Where a selectable theme came from. */
export type ThemeEntryOrigin = "project" | "document" | "preset" | "draft";

/** One theme the user can act on. */
export interface ThemeEntry {
  /** Stable identity: origin, source and theme name. */
  readonly id: string;
  /** The theme's own name. */
  readonly label: string;
  /** The family it belongs to, when the definition records one. */
  readonly family?: string;
  /** This entry's mode. */
  readonly mode?: string;
  /** Every mode the source group carries, so a command can offer the pair. */
  readonly modes: readonly string[];
  readonly origin: ThemeEntryOrigin;
  /** What to call the origin in a sentence. */
  readonly originLabel: string;
  /** The file it came from, workspace-relative or absolute. */
  readonly source?: string;
  /**
   * The workspace folder this entry belongs to, for a project theme.
   *
   * Two folders can each hold a `src/theme/theme.config.ts`, and a preset
   * established in one is not established in the other.
   */
  readonly root?: string;
  /** 1-based definition position, when the reader recorded one. */
  readonly location?: { readonly line: number; readonly column: number };
  /** The theme itself, as core will receive it. */
  readonly theme: ThemeDefinition;
  /**
   * The whole group this theme belongs to — its light/dark sibling, or the
   * other themes in the same document.
   *
   * `ThemeRequest.themes` wants this: a theme that declares `extends` can only
   * be resolved against its base when the rest of the document is supplied.
   */
  readonly set: readonly ThemeDefinition[];
  /** Registration evidence, for project themes. */
  readonly evidence?: string;
  /**
   * Whether the theme itself came from the canonical catalog.
   *
   * The `origin` field above says which *list* the entry came from; this says
   * which canonical API produced the theme. A project theme defined with
   * `defineTheme()` and one produced by `getPresetThemes()` are both `origin:
   * "project"`, and only the second is the catalog preset.
   */
  readonly catalogOrigin: boolean;
  /** Providers that import it, for project themes. */
  readonly consumers: readonly string[];
  /**
   * The registry id, for a draft entry.
   *
   * A draft is not a project theme and not a catalog item; this is how a caller
   * that needs the record itself — to save it, or to check its revision — gets
   * from the entry back to the host's copy.
   */
  readonly draftId?: string;
  /**
   * The draft revision this entry was built from.
   *
   * A command compares it against the registry before acting, so a result
   * computed from revision *n* cannot be presented as current once *n+1*
   * exists.
   */
  readonly draftRevision?: number;
  /** Up to three colours, for a swatch strip. */
  readonly swatches: readonly string[];
  /** One line for a picker: origin, family and mode. */
  readonly detail: string;
}

/** A workspace folder and what was found in it. */
export interface CatalogRoot {
  readonly name: string;
  readonly inspection: ProjectInspection;
}

/** What the catalog needs. */
export interface ThemeCatalogDeps {
  /** The canonical client, for the preset catalog. */
  readonly client: ThemvoraClient;
  /** The inspected workspace folders. */
  readonly roots: () => readonly CatalogRoot[];
  /**
   * The active editor's parsed themes, when it holds any.
   *
   * The caller parses — the preview command already has to, and doing it here
   * would put a second document reader in the extension.
   */
  readonly activeDocument?: () => { readonly path: string; readonly themes: readonly ThemeDefinition[] } | undefined;
  /**
   * The unsaved drafts to offer.
   *
   * Opt-in: a caller that omits this sees project themes, the open document and
   * the catalog exactly as before. Drafts are host state, not project state, so
   * they must never appear in discovery or in preset-registration evidence.
   */
  readonly drafts?: () => readonly ThemeDraft[];
}

/** The origin labels, in one place so every command says the same thing. */
export const ORIGIN_LABEL: Record<ThemeEntryOrigin, string> = {
  project: "Project theme",
  document: "Open document",
  preset: "Catalog preset",
  draft: "Unsaved draft",
};

/**
 * Up to three colours from a theme, for a swatch strip.
 *
 * @param theme - The theme.
 * @returns Its primary, accent and background, when they are strings.
 */
function swatchesOf(theme: ThemeDefinition): string[] {
  const colors = (theme.tokens as { colors?: Record<string, unknown> } | undefined)?.colors;
  if (colors === undefined) return [];
  return [colors.primary, colors.accent, colors.background].filter(
    (value): value is string => typeof value === "string",
  );
}

/**
 * Group a flat list into light/dark sets by family.
 *
 * @param themes - The themes from one source.
 * @returns The sets, in first-seen order.
 */
function setsByFamily(themes: readonly ThemeDefinition[]): Map<string, ThemeDefinition[]> {
  const groups = new Map<string, ThemeDefinition[]>();
  for (const theme of themes) {
    const key = theme.meta?.family ?? theme.name.replace(/-(light|dark)$/u, "");
    const existing = groups.get(key);
    if (existing === undefined) groups.set(key, [theme]);
    else existing.push(theme);
  }
  return groups;
}

/**
 * Turn one source's themes into entries, one per concrete theme.
 *
 * One entry per variant, not per family: a command that copies CSS variables or
 * validates a theme needs a mode, and "the family" does not have one.
 *
 * @param themes - The themes from the source.
 * @param base - The fields every entry shares.
 * @returns The entries.
 */
function entriesFor(
  themes: readonly ThemeDefinition[],
  base: Omit<ThemeEntry, "id" | "label" | "family" | "mode" | "modes" | "theme" | "set" | "swatches" | "detail">,
): ThemeEntry[] {
  const sets = setsByFamily(themes);
  const setFor = (theme: ThemeDefinition): ThemeDefinition[] =>
    sets.get(theme.meta?.family ?? theme.name.replace(/-(light|dark)$/u, "")) ?? [theme];

  return themes.map((theme) => {
    const set = setFor(theme);
    const modes = set.map((entry) => entry.meta?.mode ?? "default");
    const family = theme.meta?.family;
    const mode = theme.meta?.mode;
    return {
      ...base,
      // The folder is part of the identity: two roots can each hold a
      // `src/theme/theme.config.ts`, and without it the second root's themes
      // would collide with the first's and be dropped as duplicates.
      id: `${base.origin}:${base.root ?? "-"}:${base.source ?? "-"}:${theme.name}`,
      label: theme.name,
      ...(family === undefined ? {} : { family }),
      ...(mode === undefined ? {} : { mode }),
      modes,
      theme,
      set,
      swatches: swatchesOf(theme),
      detail: [base.originLabel, family, mode].filter((part) => part !== undefined && part !== "").join(" · "),
    };
  });
}

/**
 * Every project theme, across every inspected folder.
 *
 * The evidence comes from `relationships`, which is the graph's own summary of
 * what was traced — this module never infers registration from a name.
 *
 * @param roots - The inspected folders.
 * @returns The entries.
 */
export function projectEntries(roots: readonly CatalogRoot[]): ThemeEntry[] {
  const entries: ThemeEntry[] = [];

  for (const root of roots) {
    for (const registry of root.inspection.registries) {
      if (registry.status !== "supported" || registry.themes === undefined) continue;

      const sources = registry.themeSources ?? [];
      const byName = new Map(root.inspection.relationships.map((relationship) => [relationship.name, relationship]));

      // Built as one group so each entry's `set` is the file's light/dark pair,
      // then decorated with the evidence recorded for that exact theme name.
      const built = entriesFor(registry.themes, {
        origin: "project",
        originLabel: ORIGIN_LABEL.project,
        source: registry.path,
        root: root.name,
        consumers: [],
        catalogOrigin: false,
      });

      for (const [index, entry] of built.entries()) {
        const relationship = byName.get(entry.label);
        const location = sources[index]?.location;
        const declared = sources[index]?.origin;
        entries.push({
          ...entry,
          ...(location === undefined ? {} : { location }),
          ...(relationship?.evidence === undefined ? {} : { evidence: relationship.evidence }),
          consumers: relationship?.usedBy ?? [],
          // The reader records which canonical API produced the theme; a
          // generated registry records catalog-source evidence instead.
          catalogOrigin: declared === "catalog" || relationship?.evidence === "catalog-source",
        });
      }
    }
  }

  return entries;
}

/**
 * Every canonical preset, one entry per variant.
 *
 * A preset is reachable in a workspace with no Themvora at all: the catalog
 * ships with the extension.
 *
 * @param client - The canonical client.
 * @returns The entries, or an empty list when the catalog cannot be read.
 */
async function presetEntries(client: ThemvoraClient): Promise<ThemeEntry[]> {
  const catalog = await client.catalog();
  if (!catalog.ok || catalog.value === null) return [];

  const entries: ThemeEntry[] = [];
  for (const preset of catalog.value.entries) {
    const themes = Object.values(preset.themes).filter(
      (theme): theme is ThemeDefinition => theme !== undefined,
    );
    if (themes.length === 0) continue;

    entries.push(
      ...entriesFor(themes, {
        origin: "preset",
        originLabel: ORIGIN_LABEL.preset,
        source: `preset:${preset.id}`,
        consumers: [],
        catalogOrigin: true,
      }).map((entry) => ({
        ...entry,
        // The preset's display name is the label a person recognises; the theme
        // name is the generated one and would read as a duplicate.
        label: `${preset.name} · ${entry.mode ?? "default"}`,
        detail: [ORIGIN_LABEL.preset, preset.family, entry.mode].filter(Boolean).join(" · "),
      })),
    );
  }

  return entries;
}

/**
 * Every unsaved draft, one entry per variant.
 *
 * The identity is the registry id, not the theme's name: a draft can be renamed
 * and edited, and the entry must still point at the same record. The mode is
 * appended because copy and validate act on a concrete variant.
 *
 * @param drafts - The registry's records.
 * @returns The entries.
 */
export function draftEntries(drafts: readonly ThemeDraft[]): ThemeEntry[] {
  const entries: ThemeEntry[] = [];

  for (const draft of drafts) {
    if (draft.themes.length === 0) continue;

    const built = entriesFor(draft.themes, {
      origin: "draft",
      originLabel: ORIGIN_LABEL.draft,
      consumers: [],
      catalogOrigin: false,
      draftId: draft.id,
      draftRevision: draft.revision,
      // A draft started from a project theme belongs to that folder; one built
      // from a seed or a preset belongs to none.
      ...(draft.scope.kind === "root" ? { root: draft.scope.root } : {}),
    });

    // The draft's name is family-level, so a pair needs its mode to be
    // distinguishable; a single-mode draft does not repeat "default".
    const showMode = built.length > 1;
    entries.push(
      ...built.map((entry) => ({
        ...entry,
        // The registry id is the identity, not the current display name: a
        // rename must not make the entry point somewhere else.
        id: `draft:${draft.id}:${entry.mode ?? "default"}`,
        label: showMode ? `${draft.name} · ${entry.mode ?? "default"}` : draft.name,
      })),
    );
  }

  return entries;
}

/**
 * Collect every selectable theme.
 *
 * Order matters: project themes first, then the open document, then unsaved
 * drafts, then the catalog. A command that has to fall back to "the only
 * candidate" should prefer the user's own work over a preset.
 *
 * @param deps - The client, the roots, the active document and any drafts.
 * @returns The entries, deduplicated by id.
 */
export async function collectThemeEntries(deps: ThemeCatalogDeps): Promise<ThemeEntry[]> {
  const entries: ThemeEntry[] = [...projectEntries(deps.roots())];

  const active = deps.activeDocument?.();
  if (active !== undefined && active.themes.length > 0) {
    entries.push(
      ...entriesFor(active.themes, {
        origin: "document",
        originLabel: ORIGIN_LABEL.document,
        source: active.path,
        consumers: [],
        // A JSON document is a theme someone wrote, not a catalog result.
        catalogOrigin: false,
      }),
    );
  }

  entries.push(...draftEntries(deps.drafts?.() ?? []));

  entries.push(...(await presetEntries(deps.client)));

  const seen = new Set<string>();
  return entries.filter((entry) => {
    if (seen.has(entry.id)) return false;
    seen.add(entry.id);
    return true;
  });
}

/** What a picker row shows. */
interface ThemePickItem extends QuickPickItem {
  readonly entry: ThemeEntry;
}

/**
 * Ask the user to choose one theme.
 *
 * @param entries - Every candidate.
 * @param title - The picker's title, so consecutive prompts differ.
 * @returns The chosen entry, or `undefined` when dismissed.
 */
export async function pickThemeEntry(
  entries: readonly ThemeEntry[],
  title: string,
): Promise<ThemeEntry | undefined> {
  const items: ThemePickItem[] = entries.map((entry) => ({
    label: entry.label,
    description: entry.detail,
    ...(entry.source === undefined ? {} : { detail: entry.source }),
    entry,
  }));

  const picked = await window.showQuickPick(items, {
    title,
    placeHolder: "A project theme, the open document, or a catalog preset",
    matchOnDescription: true,
    matchOnDetail: true,
  });

  return picked?.entry;
}

/** Why a resolution produced nothing. */
export type ThemeResolutionFailure =
  | { readonly kind: "no-workspace" }
  | { readonly kind: "no-themes" }
  | { readonly kind: "cancelled" };

/** The outcome of asking for a theme. */
export type ThemeResolution =
  | { readonly ok: true; readonly entry: ThemeEntry }
  | { readonly ok: false; readonly failure: ThemeResolutionFailure };

/** How to resolve. */
export interface ResolveThemeOptions {
  /** The picker's title. */
  readonly title: string;
  /**
   * Prefer a single candidate without asking.
   *
   * Set for commands where a picker would be noise — a workspace with exactly
   * one theme has already answered the question.
   */
  readonly autoSelectSingle?: boolean;
}

/**
 * Choose a theme the way every command should.
 *
 * The policy, in order: a theme in the active editor, then the only candidate if
 * there is exactly one, then a picker. It never picks arbitrarily from several —
 * two unrelated themes in one workspace is a question, not an answer.
 *
 * @param deps - The catalog dependencies.
 * @param options - The picker title and the single-candidate rule.
 * @returns The entry, or why there is none.
 */
export async function resolveThemeEntry(
  deps: ThemeCatalogDeps,
  options: ResolveThemeOptions,
): Promise<ThemeResolution> {
  const entries = await collectThemeEntries(deps);

  if (entries.length === 0) {
    return {
      ok: false,
      failure: deps.roots().length === 0 ? { kind: "no-workspace" } : { kind: "no-themes" },
    };
  }

  const inDocument = entries.filter((entry) => entry.origin === "document");
  if (inDocument.length === 1 && inDocument[0] !== undefined) {
    return { ok: true, entry: inDocument[0] };
  }

  if (inDocument.length > 1) {
    const picked = await pickThemeEntry(inDocument, options.title);
    return picked === undefined ? { ok: false, failure: { kind: "cancelled" } } : { ok: true, entry: picked };
  }

  if (options.autoSelectSingle === true && entries.length === 1 && entries[0] !== undefined) {
    return { ok: true, entry: entries[0] };
  }

  const picked = await pickThemeEntry(entries, options.title);
  return picked === undefined ? { ok: false, failure: { kind: "cancelled" } } : { ok: true, entry: picked };
}

/**
 * Re-resolve an entry against the current registry.
 *
 * A draft is mutable host state: between resolving it and acting on it, the
 * Studio may have edited it or discarded it. Copy, validate and preview all use
 * this so they act on the latest revision rather than the one they were handed.
 *
 * @param deps - The catalog dependencies.
 * @param entry - The entry the user chose.
 * @returns The current entry, or `undefined` when the draft is gone.
 */
export function latestEntry(deps: ThemeCatalogDeps, entry: ThemeEntry): ThemeEntry | undefined {
  if (entry.draftId === undefined) return entry;

  const draft = deps.drafts?.().find((candidate) => candidate.id === entry.draftId);
  if (draft === undefined) return undefined;

  const rebuilt = draftEntries([draft]);
  return rebuilt.find((candidate) => candidate.mode === entry.mode) ?? rebuilt[0];
}

/**
 * Whether a draft entry has been revised since it was resolved.
 *
 * A non-draft entry is never stale: a file, a preset and an open document do not
 * change behind the caller's back in the same way.
 *
 * @param deps - The catalog dependencies.
 * @param entry - The entry to check.
 * @returns `true` when the draft moved or disappeared.
 */
export function isStaleEntry(deps: ThemeCatalogDeps, entry: ThemeEntry): boolean {
  if (entry.draftId === undefined) return false;

  const draft = deps.drafts?.().find((candidate) => candidate.id === entry.draftId);
  return draft === undefined || draft.revision !== entry.draftRevision;
}

/**
 * The themes to hand core for a request about one entry.
 *
 * A project theme's siblings come from the same registry; a preset's from its
 * catalog entry. Supplying them lets a derived theme resolve against its base.
 *
 * @param entry - The chosen entry.
 * @returns The group, always containing the entry's own theme.
 */
export function themeSetFor(entry: ThemeEntry): readonly ThemeDefinition[] {
  return entry.set.length === 0 ? [entry.theme] : entry.set;
}
