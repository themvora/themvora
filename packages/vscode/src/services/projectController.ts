/**
 * Owns project state for the window.
 *
 * One controller per extension activation. It is the only place that decides
 * *when* an inspection happens. Everything it does is read-only — it holds no
 * CLI client and spawns nothing, which is what makes the activation path cheap
 * and side-effect free.
 *
 * **Saved analysis, not live analysis.** A project-wide inspection answers "what
 * does this workspace contain", and a workspace contains files, not buffers. So
 * the triggers are the events that change saved bytes — a save, a create, a
 * delete, a rename, a folder change, an explicit refresh — and never a keystroke.
 * Typing used to invalidate the cache and schedule a full re-inspection on a
 * 300 ms debounce; with a 300 ms debounce that is one whole-workspace scan per
 * pause in typing, for a document that is not part of the workspace yet.
 *
 * What stays live is decided by the surfaces that own it, not here: the Preview
 * rebuilds from the buffer it is showing, the Problems panel re-diagnoses the
 * buffer being edited, and the Studio edits drafts that never touch disk. Those
 * are per-document costs with a contract that says "the buffer you are looking
 * at", and they are not this controller's business.
 *
 * **One refresh at a time, one refresh per burst.** Requests are merged while
 * waiting, so ten saves in a "save all" are one inspection; a request that
 * arrives mid-run cancels the run in progress and becomes the next one, so an
 * obsolete result is never published and two scans never overlap.
 *
 * @packageDocumentation
 */
import { workspace, type Disposable, type TextDocument } from "vscode";

import { createStatusBar, type StatusBarHandle } from "../adapters/statusBar.js";
import type { RootView } from "../domain/rootView.js";
import { inspectProject } from "../domain/inspectProject.js";
import { isProjectFile, isThemeSourceFile } from "../domain/projectFiles.js";
import type { ProjectInspection } from "../domain/registry.js";
import {
  CancellationError,
  createCancellationTokenSource,
  type CancellationToken,
  type CancellationTokenSource,
} from "./cancellation.js";
import { createCachingReader } from "./cachingReader.js";
import { createInspectionCacheService, type InspectionCacheService } from "./inspectionCache.js";
import { createWorkspaceReader } from "./workspaceReader.js";

/**
 * How long to wait after a save before re-reading the project.
 *
 * Short on purpose. The wait exists to merge a burst — a format-on-save that
 * writes twice, a "save all", the save event and the watcher event that reports
 * the same write — not to make the user wait for their own save.
 */
const SAVE_DELAY_MS = 75;

/** What asked for a refresh. */
export type RefreshCause = "explicit" | "save" | "create" | "delete" | "rename" | "folders";

/** Why an analysis ran, passed to the publish callback. */
export interface RefreshReason {
  /** Every cause merged into this run. */
  readonly causes: readonly RefreshCause[];
  /** The paths the events named. */
  readonly paths: readonly string[];
  /**
   * Whether the project profile — manifest, installed packages, file inventory —
   * may have changed. A theme save cannot change it; a create or a manifest save
   * can.
   */
  readonly profileStale: boolean;
  /** Whether this run was forced by an explicit refresh. */
  readonly forced: boolean;
}

/** Refresh counters, for diagnostics and for tests that assert on work done. */
export interface ProjectStats {
  /** Analyses that ran to completion and published. */
  readonly analyses: number;
  /** Requests merged into a batch that had not started yet. */
  readonly coalesced: number;
  /** Results dropped because a newer request had already superseded them. */
  readonly discarded: number;
  /** Folders served from cache instead of being inspected again. */
  readonly cacheHits: number;
  /** Wall-clock duration of the most recent published analysis, in milliseconds. */
  readonly lastDurationMs: number;
}

/** The window's project state. */
export interface ProjectController extends Disposable {
  /**
   * Re-read every workspace folder, ignoring the cache.
   *
   * This is what `Themvora: Refresh Project` calls, and what the extension calls
   * after it has written a file itself. It is deliberately a full refresh: the
   * command exists for the case where something changed without an event — a
   * `git checkout`, a generator run in a terminal — and a cache cannot know
   * about that.
   */
  refresh(): Promise<void>;
  /** The most recent inspection results, in folder order. */
  readonly roots: readonly RootView[];
  /** The inspection cache service (for diagnostics and testing). */
  readonly cache: InspectionCacheService;
  /** Refresh counters. */
  readonly stats: ProjectStats;
  /**
   * Resolves once nothing is scheduled or running.
   *
   * The tests and the host smoke test need a point at which the workspace state
   * has settled; polling for one is how a timing assertion becomes flaky.
   */
  whenIdle(): Promise<void>;
}

/** One coalesced request. */
interface Batch {
  readonly causes: Set<RefreshCause>;
  readonly paths: Set<string>;
  forced: boolean;
  readonly waiters: (() => void)[];
}

/** What the controller publishes to. */
export interface ProjectControllerOptions {
  /**
   * Called once per published analysis, after `roots` is replaced.
   *
   * The reason travels with the result so a subscriber can tell "a theme file
   * changed" from "a file appeared", and skip work that cannot have changed.
   */
  readonly onChange?: (roots: readonly RootView[], reason: RefreshReason) => void;
}

/**
 * Create the controller and start observing the workspace.
 *
 * Observers are registered here, but no inspection runs until {@link
 * ProjectController.refresh} is called — activation decides when.
 *
 * @returns The controller.
 */
export function createProjectController(
  options: ProjectControllerOptions = {},
): ProjectController {
  let roots: readonly RootView[] = [];

  const statusBar: StatusBarHandle = createStatusBar();
  const cache = createInspectionCacheService();

  const disposables: Disposable[] = [statusBar];

  /** Requests waiting for the debounce to elapse, or for the current run to end. */
  let pending: Batch | null = null;
  /** The debounce timer, while one is armed. */
  let timer: ReturnType<typeof setTimeout> | undefined;
  /** Whether an analysis is in progress. */
  let running = false;
  /** The cancellation source for the run in progress. */
  let currentCancellation: CancellationTokenSource | undefined;
  /** Resolvers waiting for the workspace to settle. */
  let idleWaiters: (() => void)[] = [];

  const counters = { analyses: 0, coalesced: 0, discarded: 0, cacheHits: 0, lastDurationMs: 0 };

  /** Resolve every `whenIdle` waiter if there is nothing left to do. */
  function settleIfIdle(): void {
    if (running || pending !== null || timer !== undefined) return;
    const waiters = idleWaiters;
    idleWaiters = [];
    for (const resolve of waiters) resolve();
  }

  /** An empty request. */
  function emptyBatch(): Batch {
    return { causes: new Set(), paths: new Set(), forced: false, waiters: [] };
  }

  /**
   * Merge a request into the batch that has not started yet.
   *
   * @param cause - What happened.
   * @param paths - The paths it named.
   * @param forced - Whether the caller wants a full refresh.
   * @param delayMs - How long to wait before running.
   * @returns A promise that settles when the batch this request joined is done.
   */
  function request(
    cause: RefreshCause,
    paths: readonly string[],
    forced: boolean,
    delayMs: number,
  ): Promise<void> {
    if (pending === null) {
      pending = emptyBatch();
    } else {
      counters.coalesced += 1;
    }

    const batch = pending;
    batch.causes.add(cause);
    for (const path of paths) batch.paths.add(path);
    batch.forced = batch.forced || forced;

    const done = new Promise<void>((resolve) => {
      batch.waiters.push(resolve);
    });

    // A request that arrives while an analysis is running makes that analysis
    // obsolete. Cancelling it stops the scan at the next file instead of letting
    // it finish a result that will be thrown away.
    currentCancellation?.cancel();

    if (timer !== undefined) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = undefined;
      // A run in progress will pick the batch up when it finishes; starting a
      // second one here is what would make two scans overlap.
      if (running) return;
      void drain();
    }, delayMs);

    return done;
  }

  /**
   * Invalidate whatever the request says changed.
   *
   * @param batch - The merged request.
   * @returns Whether anything that was cached depended on the change.
   */
  function invalidate(batch: Batch): boolean {
    if (batch.forced || batch.causes.has("folders")) {
      cache.clear();
      return true;
    }

    let dropped = false;

    // A create, delete or rename changes the inventory itself: a file the
    // inspection never read can still change what it would report, because the
    // walk would now list it. Only a per-root invalidation covers that.
    if (batch.causes.has("create") || batch.causes.has("delete") || batch.causes.has("rename")) {
      for (const folder of workspace.workspaceFolders ?? []) {
        cache.invalidateRoot(folder.uri.fsPath);
      }
      dropped = true;
    }

    for (const path of batch.paths) {
      if (cache.invalidateFile(path)) dropped = true;
    }

    return dropped;
  }

  /**
   * Produce the next roots, or `null` when nothing would change.
   *
   * @param batch - The merged request.
   * @param token - Cancellation for this run.
   * @returns The new roots, or `null` when the published state is still correct.
   */
  async function analyse(batch: Batch, token: CancellationToken): Promise<RootView[] | null> {
    const changed = invalidate(batch);
    const folders = workspace.workspaceFolders ?? [];

    // Nothing cached depended on the change and the inventory cannot have moved,
    // so every folder would be served from cache and the result would be the one
    // already on screen. Publishing it again would repaint both webviews for no
    // reason.
    if (!changed && !batch.forced && cache.size > 0) return null;

    const next: RootView[] = [];

    for (const folder of folders) {
      if (token.isCancellationRequested) throw new CancellationError();

      const cached = cache.getCachedInspection(folder.uri.fsPath);
      if (cached !== undefined) {
        counters.cacheHits += 1;
        next.push({ name: folder.name, inspection: cached.inspection });
        continue;
      }

      const reader = createWorkspaceReader(folder.uri);
      const recording = createCachingReader(reader, folder.uri.fsPath);

      const inspection: ProjectInspection = await inspectProject(
        folder.uri.fsPath,
        recording,
        token,
      );

      cache.setInspection(folder.uri.fsPath, inspection, new Map(recording.getAccessedFiles()));
      next.push({ name: folder.name, inspection });
    }

    if (token.isCancellationRequested) throw new CancellationError();

    return next;
  }

  /** Describe the batch that just published. */
  function reasonFor(batch: Batch): RefreshReason {
    const profileStale =
      batch.forced ||
      batch.causes.has("folders") ||
      batch.causes.has("create") ||
      batch.causes.has("delete") ||
      batch.causes.has("rename") ||
      [...batch.paths].some((path) => path.split(/[/\\]/).pop() === "package.json");

    return {
      causes: [...batch.causes],
      paths: [...batch.paths],
      profileStale,
      forced: batch.forced,
    };
  }

  /** Publish a finished analysis. */
  function publish(next: readonly RootView[], batch: Batch): void {
    roots = next;
    statusBar.update(next.map((view) => ({ name: view.name, inspection: view.inspection })));
    // Everything that renders roots subscribes here, so a second surface cannot
    // show yesterday's inspection.
    options.onChange?.(next, reasonFor(batch));
  }

  /**
   * Take the queued request, if any.
   *
   * A function rather than a bare assignment because `pending` is written from
   * event handlers: reading it here is the only way the compiler does not narrow
   * it to `null` across the `await` below, which is exactly where a request can
   * arrive.
   *
   * @returns The batch that was waiting, or `null`.
   */
  function takePending(): Batch | null {
    const taken = pending;
    pending = null;
    return taken;
  }

  /** Run batches until none is waiting. */
  async function drain(): Promise<void> {
    if (running) return;
    running = true;

    try {
      let batch = takePending();

      while (batch !== null) {
        currentCancellation?.dispose();
        currentCancellation = createCancellationTokenSource();
        const token = currentCancellation.token;

        const startedAt = Date.now();
        let next: RootView[] | null = null;

        try {
          next = await analyse(batch, token);
        } catch {
          // A cancelled run is the normal way a superseded analysis ends. Any
          // other failure leaves `roots` untouched and the next event retries;
          // nothing is counted, because nothing was published.
        }

        // A request that arrived during the run supersedes its result. The work
        // it asked for is carried into the next batch rather than lost — a
        // cancelled explicit refresh still means "refresh everything" — and so
        // are the waiters: `await refresh()` promises the *published* state, and
        // the state this run computed was just discarded.
        const superseding = takePending();
        if (superseding !== null) {
          if (batch.forced) superseding.forced = true;
          superseding.waiters.push(...batch.waiters);
          if (next !== null) counters.discarded += 1;
          batch = superseding;
          continue;
        }

        if (next !== null) {
          counters.analyses += 1;
          counters.lastDurationMs = Date.now() - startedAt;
          // Publish *before* resolving the waiters: `await refresh()` means "the
          // new state is available", and a caller that reads `roots` on the next
          // line must not see the previous inspection.
          publish(next, batch);
        }

        for (const resolve of batch.waiters) resolve();

        batch = takePending();
      }
    } finally {
      running = false;
      settleIfIdle();
    }
  }

  /**
   * Whether a change to this path can affect an inspection.
   *
   * Two answers, and neither is a filename guess:
   *
   * - The last analysis read the file, so its saved bytes are an input.
   * - The file is named like something an inspection looks for, so a save is
   *   worth re-checking even if the last analysis did not reach it.
   *
   * A file that satisfies neither is not part of the source graph — saving a
   * component that does not mention Themvora must not cost a scan.
   *
   * @param path - The absolute path.
   * @returns `true` when the path can change the result.
   */
  function isRelevant(path: string): boolean {
    if (cache.tracks(path)) return true;
    const name = path.split(/[/\\]/).pop() ?? "";
    return isProjectFile(name) || isThemeSourceFile(path);
  }

  disposables.push(
    workspace.onDidChangeWorkspaceFolders(() => {
      void request("folders", [], true, 0);
    }),
  );

  // Saves are the primary trigger: the analysis is of the workspace, and the
  // workspace changes when bytes land on disk.
  disposables.push(
    workspace.onDidSaveTextDocument((document: TextDocument) => {
      const path = document.uri.fsPath;
      if (!isRelevant(path)) return;
      void request("save", [path], false, SAVE_DELAY_MS);
    }),
  );

  // Creates, deletes and renames change the inventory rather than the contents of
  // a known file, so they are never filtered by name: a file appearing anywhere
  // can change what the walk finds.
  const watcher = workspace.createFileSystemWatcher(
    "**/*.{ts,tsx,mts,cts,js,jsx,mjs,cjs,vue,svelte,astro,json,jsonc,html}",
  );

  disposables.push(
    watcher.onDidCreate(() => {
      void request("create", [], false, SAVE_DELAY_MS);
    }),
    watcher.onDidDelete(() => {
      void request("delete", [], false, SAVE_DELAY_MS);
    }),
    watcher.onDidChange((uri) => {
      // A change the editor did not report is an external one — a checkout, a
      // formatter, a generator. It is a save as far as the analysis is concerned,
      // and it is filtered like one so a tool touching an unrelated file cannot
      // schedule a scan.
      if (!isRelevant(uri.fsPath)) return;
      void request("save", [uri.fsPath], false, SAVE_DELAY_MS);
    }),
    watcher,
  );

  // Renames performed through the workspace API are reported precisely; the
  // watcher reports them as a delete plus a create. Both arrive, and the requests
  // merge into one analysis.
  if (typeof workspace.onDidRenameFiles === "function") {
    disposables.push(
      workspace.onDidRenameFiles(() => {
        void request("rename", [], false, SAVE_DELAY_MS);
      }),
    );
  }

  return {
    refresh(): Promise<void> {
      return request("explicit", [], true, 0);
    },
    cache,
    get roots() {
      return roots;
    },
    get stats(): ProjectStats {
      return { ...counters };
    },
    whenIdle(): Promise<void> {
      if (!running && pending === null && timer === undefined) return Promise.resolve();
      return new Promise<void>((resolve) => {
        idleWaiters.push(resolve);
      });
    },
    dispose(): void {
      if (timer !== undefined) clearTimeout(timer);
      timer = undefined;
      // A request whose analysis will never run must not leave its caller
      // waiting forever.
      for (const resolve of pending?.waiters ?? []) resolve();
      pending = null;
      currentCancellation?.cancel();
      currentCancellation?.dispose();
      currentCancellation = undefined;
      cache.clear();
      for (const disposable of disposables) disposable.dispose();
      settleIfIdle();
    },
  };
}
