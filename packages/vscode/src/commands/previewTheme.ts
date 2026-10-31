/**
 * `Themvora: Preview Theme`
 *
 * The host owns every decision: which document, which mode, whether it is valid,
 * what the variables are. The webview owns pixels. Nothing about a theme is
 * interpreted on the other side of the boundary.
 *
 * The panel is a singleton per window. Running the command again with another
 * document reveals and updates the same panel rather than opening a second one,
 * because two previews of two themes is a comparison — and `Compare Themes…`
 * already does that.
 *
 * @packageDocumentation
 */
import { commands, window, workspace, type Disposable, type OutputChannel, type Uri } from "vscode";
import type { ThemeDefinition } from "@themvora/core";

import { createPreviewPanel, type PreviewPanelHandle } from "../adapters/previewPanel.js";
import type { HostToWebview, WebviewToHost } from "../adapters/previewDocument.js";
import { buildPreviewModel, type PreviewMode } from "../domain/previewModel.js";
import { parseThemeDocument, shapeMessage } from "../domain/themeDocument.js";
import {
  collectThemeEntries,
  latestEntry,
  resolveThemeEntry,
  themeSetFor,
  type ThemeCatalogDeps,
  type ThemeEntry,
} from "../services/themeCatalog.js";
import { asUri } from "./commandArgs.js";

/**
 * The command identifier.
 *
 * Must match `contributes.commands`; a unit test asserts the two agree.
 */
export const COMMAND_PREVIEW_THEME = "themvora.previewTheme";

/** How long to wait after an edit before rebuilding the preview. */
const REFRESH_DELAY_MS = 200;

/** The controller behind the command. */
export interface PreviewController extends Disposable {
  /**
   * Open or update the preview.
   *
   * @param sourceArgument - A `Uri` to preview instead of prompting.
   */
  open(sourceArgument?: unknown): Promise<void>;
  /**
   * Preview themes that are already resolved.
   *
   * For the Studio: a theme read from source or generated in memory has no
   * document to parse, and re-serialising it to JSON just to re-read it would be
   * a second path to the same panel. The label is what the panel shows as the
   * source — a file path, or a phrase such as "generated draft".
   *
   * @param themes - The resolved themes.
   * @param label - What to call the source.
   * @param mode - The variant to render first.
   * @param draftId - The host draft this preview shows, when it is one.
   */
  openThemes(
    themes: readonly ThemeDefinition[],
    label: string,
    mode?: PreviewMode,
    draftId?: string,
  ): Promise<void>;
  /**
   * Show themes in the preview only if it is already open, without revealing
   * or focusing it.
   *
   * @param themes - The resolved themes.
   * @param label - What to call the source.
   * @param mode - The mode to render.
   * @param draftId - The host draft this preview shows, when it is one.
   */
  sync(
    themes: readonly ThemeDefinition[],
    label: string,
    mode: PreviewMode,
    draftId?: string,
  ): void;
  /**
   * Register a callback for mode changes from the preview panel.
   *
   * @param callback - Called when the user switches mode in the preview panel.
   * @returns A disposable to unregister the callback.
   */
  onModeChange?(callback: (mode: PreviewMode) => void): Disposable;
  /**
   * Drop whatever the panel is showing.
   *
   * Used when the theme behind the panel no longer exists — a discarded draft —
   * so the panel cannot keep rendering the old colours under a new name. The
   * panel stays open and says why it is empty.
   *
   * @param message - What to tell the user.
   */
  clear(message: string): void;
  /**
   * The host draft the panel is showing, when it is showing one.
   *
   * Answerable only because the Studio tells the controller which draft it is
   * syncing; the panel itself renders a theme, not an identity.
   *
   * @returns The draft id, or `undefined` for a file, preset or document.
   */
  currentDraftId(): string | undefined;
}

/** What the controller needs. */
export interface PreviewControllerDeps {
  /** Where ignored messages and read failures are logged. */
  readonly output: OutputChannel;
  /** The extension's root, for the panel's tab icon. */
  readonly extensionUri: Uri;
  /**
   * Called when the command has nothing to preview.
   *
   * The host owns the message, because the useful next step depends on the
   * workspace: a folder with no Themvora in it needs the setup links, a
   * configured one needs to be told to pick a theme. Silence here would leave
   * the command looking dead.
   */
  readonly onNothingToPreview?: () => void;
  /**
   * Every selectable theme.
   *
   * The command used to fall back to a JSON file dialog. A project theme and a
   * catalog preset are both previewable, and neither needs a file the user has
   * to find first.
   */
  readonly catalog: ThemeCatalogDeps;
}

/**
 * Create the controller.
 *
 * @param deps - The output channel.
 * @returns The controller, to be disposed with the extension.
 */
export function createPreviewController(deps: PreviewControllerDeps): PreviewController {
  let panel: PreviewPanelHandle | null = null;
  let source: Uri | null = null;
  let watcher: Disposable | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;

  let mode: PreviewMode = "light";
  let revision = 0;

  /** The last document that produced a model, for mode switches. */
  let lastValidThemes: readonly ThemeDefinition[] | null = null;
  /** What to call the source when a preview has no document behind it. */
  let lastLabel = "theme";
  /**
   * The host draft this preview is showing, when it is showing one.
   *
   * The panel renders a theme; this is the identity behind it, so a later
   * revision can be recognised as the same draft rather than a different theme
   * that happens to look similar.
   */
  let lastDraftId: string | undefined;
  /** Why the current view is stale, when it is. */
  let staleReason: string | null = null;
  /** Callbacks for mode changes from the preview panel. */
  const modeChangeCallbacks = new Set<(mode: PreviewMode) => void>();

  /**
   * Read a document, preferring the open editor so unsaved edits are previewed.
   *
   * @param uri - The file.
   * @returns Its text, or `null` when it cannot be read.
   */
  async function readText(uri: Uri): Promise<string | null> {
    const open = workspace.textDocuments.find((document) => document.uri.fsPath === uri.fsPath);
    if (open) return open.getText();

    try {
      return new TextDecoder().decode(await workspace.fs.readFile(uri));
    } catch {
      return null;
    }
  }

  /**
   * The label shown in the header.
   *
   * @param uri - The file.
   * @returns Its base name, marked when the editor holds unsaved changes.
   */
  function sourceLabel(uri: Uri): string {
    const name = uri.path.split("/").pop() ?? uri.fsPath;
    const open = workspace.textDocuments.find((document) => document.uri.fsPath === uri.fsPath);
    return open?.isDirty === true ? `${name} • unsaved` : name;
  }

  /**
   * Post a message, creating the panel first if needed.
   *
   * @param message - The message to send.
   */
  function post(message: HostToWebview): void {
    panel?.post(message);
  }

  /**
   * Show a failure in the panel.
   *
   * @param message - Why the source could not be previewed.
   */
  function postError(message: string): void {
    // Stale only when something valid is already on screen; otherwise there is
    // no old render to be stale relative to.
    staleReason = message;
    post({ type: "error", revision: (revision += 1), message, stale: lastValidThemes !== null });
  }

  /**
   * Rebuild and post the preview from the current source.
   */
  async function refresh(): Promise<void> {
    const target = source;
    if (target === null) return;

    const text = await readText(target);
    if (text === null) {
      postError(`Could not read ${target.fsPath}.`);
      return;
    }

    const document = parseThemeDocument(text);
    if (document.shape !== "themes") {
      postError(shapeMessage(sourceLabel(target), document) ?? `${target.fsPath} could not be read.`);
      return;
    }

    const result = buildPreviewModel({
      themes: document.themes,
      mode,
      source: sourceLabel(target),
    });

    if (!result.ok) {
      postError(result.message);
      return;
    }

    lastValidThemes = document.themes;
    staleReason = null;
    // Keep the state in step with what is actually shown: a document with only a
    // dark theme resolves to dark even when light was requested.
    mode = result.model.mode;

    post({ type: "preview", revision: (revision += 1), model: result.model });
  }

  /** Debounce a rebuild triggered by an edit. */
  function scheduleRefresh(): void {
    if (timer !== undefined) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = undefined;
      void refresh();
    }, REFRESH_DELAY_MS);
  }

  /**
   * Watch the source document for edits.
   *
   * @param target - The file to watch.
   */
  function watch(target: Uri): void {
    watcher?.dispose();
    watcher = workspace.onDidChangeTextDocument((event) => {
      if (event.document.uri.fsPath !== target.fsPath) return;
      scheduleRefresh();
    });
  }

  /** Handle a message from the webview. */
  function onMessage(message: WebviewToHost): void {
    if (message.type === "ready") {
      // A re-created webview knows nothing; rebuild rather than replay, so the
      // first thing it shows is the current state of the file. A Studio preview
      // has no file, so it is rebuilt from the themes it was handed.
      if (source === null) {
        if (lastValidThemes !== null) void openThemes(lastValidThemes, lastLabel);
        return;
      }
      void refresh();
      return;
    }

    if (lastValidThemes === null) return;
    if (mode === message.mode && staleReason === null) return;

    const previousMode = mode;
    mode = message.mode;

    const result = buildPreviewModel({
      themes: lastValidThemes,
      mode,
      source: source !== null ? sourceLabel(source) : "theme",
    });

    if (!result.ok) {
      postError(result.message);
      return;
    }

    mode = result.model.mode;
    post({ type: "preview", revision: (revision += 1), model: result.model });

    // A mode switch must not clear a stale banner: the document is still broken.
    if (staleReason !== null) {
      post({ type: "error", revision: (revision += 1), message: staleReason, stale: true });
    }

    // Notify listeners of the mode change
    if (previousMode !== mode) {
      for (const callback of modeChangeCallbacks) {
        callback(mode);
      }
    }
  }

  /** Create the panel if it does not exist, and reveal it. */
  function ensurePanel(): PreviewPanelHandle {
    if (panel !== null && !panel.disposed) {
      panel.reveal();
      return panel;
    }

    panel = createPreviewPanel({
      extensionUri: deps.extensionUri,
      onMessage,
      onDispose: () => {
        panel = null;
        watcher?.dispose();
        watcher = null;
        if (timer !== undefined) {
          clearTimeout(timer);
          timer = undefined;
        }
      },
      log: (line) => deps.output.appendLine(line),
    });

    return panel;
  }

  /**
   * Catalog entries that came from one file.
   *
   * Project entries carry a workspace-relative path while a URI is absolute, so
   * the comparison is a suffix match on normalised separators. A file that the
   * catalog does not know returns nothing, and the caller falls back to reading
   * it as a document.
   *
   * @param uri - The file.
   * @returns The entries that came from it.
   */
  async function entriesForFile(uri: Uri): Promise<ThemeEntry[]> {
    const wanted = uri.fsPath.replace(/\\/gu, "/");
    const entries = await collectThemeEntries(deps.catalog);
    return entries.filter(
      (entry) =>
        entry.origin === "project" &&
        entry.source !== undefined &&
        wanted.endsWith(entry.source.replace(/\\/gu, "/")),
    );
  }

  async function openThemes(
    themes: readonly ThemeDefinition[],
    label: string,
    requested?: PreviewMode,
    draftId?: string,
  ): Promise<void> {
    // The requested mode is the theme's own: opening `rose-dark` must not show
    // light and wait for the user to toggle.
    if (requested !== undefined) mode = requested;

    const result = buildPreviewModel({ themes, mode, source: label });

    ensurePanel();

    if (!result.ok) {
      postError(result.message);
      return;
    }

    lastValidThemes = themes;
    lastLabel = label;
    lastDraftId = draftId;
    staleReason = null;
    mode = result.model.mode;
    // No document behind this preview: stop watching the previous one, or an
    // unrelated edit would overwrite the Studio selection.
    source = null;
    watcher?.dispose();
    watcher = null;

    post({ type: "preview", revision: (revision += 1), model: result.model });
  }

  return {
    openThemes,

    sync(
      themes: readonly ThemeDefinition[],
      label: string,
      requested: PreviewMode,
      draftId?: string,
    ): void {
      if (panel === null || panel.disposed) return;

      const result = buildPreviewModel({ themes, mode: requested, source: label });
      if (!result.ok) return;

      lastValidThemes = themes;
      lastLabel = label;
      lastDraftId = draftId;
      staleReason = null;
      mode = result.model.mode;
      source = null;
      watcher?.dispose();
      watcher = null;

      // Posted, not revealed: a hidden panel rebuilds from this state on `ready`.
      panel.post({ type: "preview", revision: (revision += 1), model: result.model });
    },

    async open(sourceArgument?: unknown): Promise<void> {
      // An explicit argument wins; otherwise the open editor when it already
      // parses as a theme, so the common case needs no dialog at all.
      const target = asUri(sourceArgument) ?? activeThemeUri();
      if (target === undefined) {
        // Nothing named and nothing open: offer every theme the extension knows
        // about. A preset previews in a workspace with no Themvora at all.
        const resolution = await resolveThemeEntry(deps.catalog, { title: "Preview a theme" });
        if (!resolution.ok) {
          // A dismissed picker is not a failure, and saying so would be noise.
          if (resolution.failure.kind !== "cancelled") deps.onNothingToPreview?.();
          return;
        }

        // A discarded draft must not be previewed, and an edited one must be
        // shown as it is now.
        const entry = latestEntry(deps.catalog, resolution.entry);
        if (entry === undefined) {
          deps.onNothingToPreview?.();
          return;
        }

        await openThemes(
          themeSetFor(entry),
          // A draft has no file, so the label is what tells the developer this
          // is unsaved work rather than something the project owns.
          entry.origin === "draft"
            ? `${entry.label} — unsaved draft`
            : entry.source === undefined
              ? entry.label
              : `${entry.label} — ${entry.source}`,
          entry.mode as PreviewMode | undefined,
          ...(entry.draftId === undefined ? [] : [entry.draftId]),
        );
        return;
      }

      // A JSON file is a theme document and keeps the document path, which
      // watches it for edits. Anything else may still hold themes — a `.ts`
      // registry, a stylesheet — and the inspector is what read them. Ask the
      // catalog before treating such a file as unreadable, or the editor-title
      // action fails on exactly the formats the extension understands.
      const resolved = target.fsPath.endsWith(".json") ? [] : await entriesForFile(target);
      if (resolved.length > 0) {
        const first = resolved[0]!;
        await openThemes(
          themeSetFor(first),
          `${first.label} — ${first.source ?? target.fsPath}`,
          first.mode as PreviewMode | undefined,
        );
        return;
      }

      // A file-backed preview is not a draft, whatever the panel showed before.
      lastDraftId = undefined;
      source = target;
      watch(target);

      ensurePanel();
      await refresh();
    },

    clear(message: string): void {
      if (panel === null || panel.disposed) return;

      // Everything that could rebuild a model is dropped, not just the label:
      // a later mode switch must not resurrect the discarded theme.
      lastValidThemes = null;
      lastLabel = "theme";
      lastDraftId = undefined;
      staleReason = message;
      source = null;
      watcher?.dispose();
      watcher = null;

      // `stale: false` is what stops the panel painting the previous palette
      // behind the message.
      post({ type: "error", revision: (revision += 1), message, stale: false });
    },

    currentDraftId(): string | undefined {
      return lastDraftId;
    },

    onModeChange(callback: (mode: PreviewMode) => void): Disposable {
      modeChangeCallbacks.add(callback);
      return {
        dispose: () => {
          modeChangeCallbacks.delete(callback);
        },
      };
    },

    dispose(): void {
      if (timer !== undefined) clearTimeout(timer);
      watcher?.dispose();
      panel?.dispose();
      panel = null;
      modeChangeCallbacks.clear();
    },
  };
}

/**
 * Register the command.
 *
 * @param controller - The preview controller.
 * @returns The registration, for `context.subscriptions`.
 */
export function registerPreviewThemeCommand(controller: PreviewController): Disposable {
  return commands.registerCommand(COMMAND_PREVIEW_THEME, (source?: unknown) =>
    controller.open(source),
  );
}

/**
 * The active editor's file, when it already parses as a theme document.
 *
 * Reusing the open document means the common case needs no dialog at all.
 *
 * @returns The URI, or `undefined` when the active editor is not a theme.
 */
function activeThemeUri(): Uri | undefined {
  const editor = window.activeTextEditor;
  if (editor === undefined) return undefined;

  const document = parseThemeDocument(editor.document.getText());
  return document.shape === "themes" ? editor.document.uri : undefined;
}

