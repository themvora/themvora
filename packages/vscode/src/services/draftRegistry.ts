/**
 * The one host-side owner of unsaved theme drafts.
 *
 * Before this, a draft existed only as closure variables inside the Studio
 * panel: `selected`, `draftBaseline`, `draftSeed`, `draftKind`. Nothing outside
 * that one webview could name a draft, so `Compare`, `Copy`, `Validate` and
 * `Preview` could not reach the theme the developer was looking at, and the
 * standalone Preview held its own copy of the theme array with no way to tell
 * whether it was still current.
 *
 * This registry gives a draft a stable id, a revision, and an owner. The Studio
 * writes; every other surface reads by id.
 *
 * **In memory, deliberately.** Drafts are not written to the project, not
 * serialised to workspace storage, and not restored after a host restart. The
 * lifetime is documented in {@link DraftRegistry}: a draft survives a webview
 * closing, because the panel is a view and the draft is not.
 *
 * @packageDocumentation
 */
import type { ThemeDefinition } from "@themvora/core";

/**
 * Which workflow produced a draft.
 *
 * - `generated` — `generateTheme()` produced the concrete tokens.
 * - `defined` — the developer is authoring tokens directly.
 * - `preset` — copied from a canonical catalog preset.
 * - `project` — copied from a theme already in the project.
 */
export type DraftOrigin = "generated" | "defined" | "preset" | "project";

/**
 * Which workspace a draft belongs to.
 *
 * A draft that was started from a project theme is associated with that folder.
 * A draft produced from a seed with no project involved is `standalone` — it is
 * not assigned to the first folder merely because one is open, which is how a
 * workspace with several roots would otherwise lose track of where a draft came
 * from.
 */
export type DraftScope =
  | { readonly kind: "root"; readonly root: string }
  | { readonly kind: "standalone" };

/** The inputs a generated draft was produced from. */
export interface DraftInputs {
  readonly seed?: string;
  readonly family?: string;
  readonly style?: string;
  readonly contrast?: string;
  readonly algorithm?: string;
}

/** Where a draft was copied from, when it was not authored from nothing. */
export interface DraftBasis {
  /** What kind of thing it was copied from. */
  readonly kind: "preset" | "project-theme";
  /** The preset id or catalog entry id, when known. */
  readonly id?: string;
  /** The label shown to the user at the time of copying. */
  readonly label: string;
  /** The project file it came from, for a project theme. */
  readonly source?: string;
}

/** The canonical validation verdict for a draft revision. */
export interface DraftValidation {
  readonly valid: boolean;
  readonly errors: number;
  readonly warnings: number;
}

/** Where a draft was written, and at which revision. */
export interface DraftSave {
  readonly path: string;
  /** The revision that was written. */
  readonly revision: number;
}

/**
 * One unsaved theme draft.
 *
 * Everything here is either the canonical theme data itself or a fact the host
 * observed; nothing is a second theme model.
 */
export interface ThemeDraft {
  /** Stable for the life of the draft, whatever it is renamed or edited to. */
  readonly id: string;
  readonly scope: DraftScope;
  /** The current display name, which may be edited. */
  readonly name: string;
  readonly family?: string;
  readonly origin: DraftOrigin;
  readonly basis?: DraftBasis;
  /** The concrete themes, exactly as core will receive them. */
  readonly themes: readonly ThemeDefinition[];
  /** Every mode the draft carries, in its own order. */
  readonly modes: readonly string[];
  /** The variant the editor is showing. */
  readonly mode?: string;
  readonly inputs?: DraftInputs;
  /** The untouched themes the draft started from, for diff and revert. */
  readonly baseline?: readonly ThemeDefinition[];
  /**
   * Monotonic per draft. Every accepted mutation increments it, so a result
   * computed against revision *n* can be recognised as stale once *n+1* exists.
   */
  readonly revision: number;
  /** Unsaved changes relative to the last successful write. */
  readonly dirty: boolean;
  readonly validation?: DraftValidation;
  /** Present only after a successful write. */
  readonly saved?: DraftSave;
  /** Host sequence numbers, for deterministic ordering. */
  readonly createdAt: number;
  readonly updatedAt: number;
}

/** What {@link DraftRegistry.create} needs. */
export interface CreateDraftInput {
  readonly scope: DraftScope;
  readonly name: string;
  readonly family?: string;
  readonly origin: DraftOrigin;
  readonly basis?: DraftBasis;
  readonly themes: readonly ThemeDefinition[];
  readonly modes?: readonly string[];
  readonly mode?: string;
  readonly inputs?: DraftInputs;
  readonly baseline?: readonly ThemeDefinition[];
  readonly validation?: DraftValidation;
}

/** What a caller may change about an existing draft. */
export interface UpdateDraftInput {
  /** The revision the caller last saw. A mismatch is refused, never applied. */
  readonly expectedRevision: number;
  readonly name?: string;
  readonly family?: string;
  readonly themes?: readonly ThemeDefinition[];
  readonly modes?: readonly string[];
  readonly mode?: string;
  readonly validation?: DraftValidation;
}

/** Why a mutation did not happen. */
export type DraftFailure =
  | { readonly kind: "unknown-draft"; readonly id: string }
  | { readonly kind: "stale-revision"; readonly expected: number; readonly actual: number }
  | { readonly kind: "no-baseline"; readonly id: string }
  | { readonly kind: "empty"; readonly id: string }
  | { readonly kind: "at-capacity"; readonly count: number };

/** The result of a mutation. */
export type DraftResult =
  | { readonly ok: true; readonly draft: ThemeDraft }
  | { readonly ok: false; readonly failure: DraftFailure };

/**
 * The registry.
 *
 * Lifetime, stated plainly because the UI must not overpromise:
 *
 * - **A webview closing** does not end a draft. The panel is a view; closing it
 *   leaves the draft readable, which is what lets the standalone Preview show
 *   the same draft afterwards.
 * - **Reopening the Studio** resolves the active draft from here rather than
 *   from the webview's own state.
 * - **The extension host restarting** ends every draft. They are in memory and
 *   nothing is written to disk, so they are not recoverable and the UI must not
 *   say they are.
 * - **Removing a workspace folder** detaches that folder's drafts, which then
 *   remain readable as standalone work rather than vanishing.
 * - **Discarding** is explicit and is the only way a draft disappears early.
 */
export interface DraftRegistry {
  /** Register a new draft and return it. */
  create(input: CreateDraftInput): DraftResult;
  /** Read one draft by id. */
  get(id: string): ThemeDraft | undefined;
  /** Every draft, or those visible to one scope. */
  list(scope?: DraftScope): readonly ThemeDraft[];
  /** Apply an edit, refusing a stale revision. */
  update(id: string, input: UpdateDraftInput): DraftResult;
  /** Restore the recorded baseline, keeping the same id. */
  revert(id: string, expectedRevision: number): DraftResult;
  /** Record a successful write. The draft stops being dirty. */
  markSaved(id: string, expectedRevision: number, path: string): DraftResult;
  /** Remove a draft. `true` when it existed. */
  discard(id: string): boolean;
  /** Detach a removed folder's drafts, leaving them readable as standalone. */
  detachRoot(root: string): number;
  /** How many drafts are held. */
  size(): number;
}

/** The most drafts the registry will hold before it refuses more. */
const CAPACITY = 50;

/**
 * Whether two drafts are the same workspace.
 *
 * @param left - One scope.
 * @param right - The other.
 * @returns `true` when they address the same folder, or both are standalone.
 */
export function sameScope(left: DraftScope, right: DraftScope): boolean {
  if (left.kind === "standalone" || right.kind === "standalone") {
    return left.kind === right.kind;
  }
  return left.root === right.root;
}

/**
 * Create a registry.
 *
 * @returns A registry with its own id counter and no drafts.
 */
export function createDraftRegistry(): DraftRegistry {
  const drafts = new Map<string, ThemeDraft>();
  let counter = 0;
  let sequence = 0;

  /** Modes of a theme set, in first-seen order. */
  const modesOf = (themes: readonly ThemeDefinition[]): string[] => [
    ...new Set(themes.map((theme) => theme.meta?.mode ?? "default")),
  ];

  const store = (draft: ThemeDraft): DraftResult => {
    drafts.set(draft.id, draft);
    return { ok: true, draft };
  };

  /**
   * Make room for one more draft.
   *
   * A saved, clean draft is the only thing that may be evicted: losing work to a
   * memory bound would be worse than refusing the new draft. When nothing is
   * evictable the caller is told, rather than having a dirty draft disappear.
   */
  const makeRoom = (): DraftFailure | undefined => {
    if (drafts.size < CAPACITY) return undefined;

    for (const [id, draft] of drafts) {
      if (!draft.dirty) {
        drafts.delete(id);
        return undefined;
      }
    }
    return { kind: "at-capacity", count: drafts.size };
  };

  return {
    create(input) {
      // A draft with no theme is not a draft; refusing here keeps every reader
      // from having to guard against an empty set.
      if (input.themes.length === 0) return { ok: false, failure: { kind: "empty", id: "" } };

      const blocked = makeRoom();
      if (blocked !== undefined) return { ok: false, failure: blocked };

      counter += 1;
      sequence += 1;
      const themes = input.themes;
      const modes = input.modes === undefined ? modesOf(themes) : [...input.modes];
      const draft: ThemeDraft = {
        // Not derived from the name, family, file or position: two drafts may
        // legitimately be called the same thing, and a rename must not change
        // identity.
        id: `draft-${String(counter)}`,
        scope: input.scope,
        name: input.name,
        ...(input.family === undefined ? {} : { family: input.family }),
        origin: input.origin,
        ...(input.basis === undefined ? {} : { basis: input.basis }),
        themes: [...themes],
        modes,
        ...(input.mode === undefined ? {} : { mode: input.mode }),
        ...(input.inputs === undefined ? {} : { inputs: input.inputs }),
        ...(input.baseline === undefined ? {} : { baseline: [...input.baseline] }),
        revision: 1,
        // Nothing is on disk, so a new draft is unsaved by definition.
        dirty: true,
        ...(input.validation === undefined ? {} : { validation: input.validation }),
        createdAt: sequence,
        updatedAt: sequence,
      };
      return store(draft);
    },

    get(id) {
      return drafts.get(id);
    },

    list(scope) {
      const all = [...drafts.values()].sort((left, right) => left.createdAt - right.createdAt);
      return scope === undefined ? all : all.filter((draft) => sameScope(draft.scope, scope));
    },

    update(id, input) {
      const current = drafts.get(id);
      if (current === undefined) return { ok: false, failure: { kind: "unknown-draft", id } };
      if (current.revision !== input.expectedRevision) {
        return {
          ok: false,
          failure: { kind: "stale-revision", expected: input.expectedRevision, actual: current.revision },
        };
      }

      sequence += 1;
      const themes = input.themes === undefined ? current.themes : [...input.themes];
      if (themes.length === 0) return { ok: false, failure: { kind: "empty", id } };

      // Modes follow the themes unless the caller states them, so an edit that
      // drops a variant cannot leave a stale mode list behind.
      const modes =
        input.modes !== undefined
          ? [...input.modes]
          : input.themes === undefined
            ? current.modes
            : modesOf(themes);

      return store({
        ...current,
        ...(input.name === undefined ? {} : { name: input.name }),
        ...(input.family === undefined ? {} : { family: input.family }),
        themes,
        modes,
        ...(input.mode === undefined ? {} : { mode: input.mode }),
        ...(input.validation === undefined ? {} : { validation: input.validation }),
        revision: current.revision + 1,
        // An edit after a write is unsaved again, even if the values happen to
        // match what was written; the file is the authority and only a new
        // write makes it current.
        dirty: true,
        updatedAt: sequence,
      });
    },

    revert(id, expectedRevision) {
      const current = drafts.get(id);
      if (current === undefined) return { ok: false, failure: { kind: "unknown-draft", id } };
      if (current.revision !== expectedRevision) {
        return {
          ok: false,
          failure: { kind: "stale-revision", expected: expectedRevision, actual: current.revision },
        };
      }
      if (current.baseline === undefined) return { ok: false, failure: { kind: "no-baseline", id } };

      sequence += 1;
      return store({
        ...current,
        themes: [...current.baseline],
        modes: modesOf(current.baseline),
        revision: current.revision + 1,
        // Reverting restores the starting values; it does not write a file, so
        // the draft is still unsaved.
        dirty: true,
        updatedAt: sequence,
      });
    },

    markSaved(id, expectedRevision, path) {
      const current = drafts.get(id);
      if (current === undefined) return { ok: false, failure: { kind: "unknown-draft", id } };
      if (current.revision !== expectedRevision) {
        return {
          ok: false,
          failure: { kind: "stale-revision", expected: expectedRevision, actual: current.revision },
        };
      }

      sequence += 1;
      return store({
        ...current,
        revision: current.revision + 1,
        dirty: false,
        saved: { path, revision: current.revision },
        updatedAt: sequence,
      });
    },

    discard(id) {
      return drafts.delete(id);
    },

    detachRoot(root) {
      let detached = 0;
      for (const [id, draft] of drafts) {
        if (draft.scope.kind !== "root" || draft.scope.root !== root) continue;
        drafts.set(id, { ...draft, scope: { kind: "standalone" } });
        detached += 1;
      }
      return detached;
    },

    size() {
      return drafts.size;
    },
  };
}
