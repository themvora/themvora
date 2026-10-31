/**
 * Activation for Themvora for VS Code.
 *
 * This module is the composition root and nothing else. It builds the project
 * controller, registers the sidebar webview and the commands, and returns the
 * public API object. It performs no writes, spawns no process and makes no network
 * call — VS Code activates extensions on the first command invocation, so
 * anything expensive here is paid on the user's first click.
 *
 * @packageDocumentation
 */
import {
  commands,
  Uri,
  env,
  window,
  workspace as vscodeWorkspace,
  type ExtensionContext,
} from "vscode";

import { createClipboard } from "./adapters/clipboard.js";
import { registerConfigStatusBar } from "./adapters/configStatusBar.js";
import { registerStudioPanel } from "./adapters/studioPanel.js";
import { registerWorkspaceView, type WorkspaceViewHandle } from "./adapters/workspaceView.js";
import { registerColorSwatches } from "./adapters/colorSwatches.js";
import { registerThemeFileDecorations } from "./adapters/fileDecorations.js";
import { registerThemeDiagnostics } from "./adapters/diagnosticCollection.js";
import { registerRoleHover } from "./adapters/roleHover.js";
import { COMMAND_BROWSE_PRESETS, registerBrowsePresetsCommand } from "./commands/browsePresets.js";
import { registerCompareThemesCommand } from "./commands/compareThemes.js";
import { createPreviewController, registerPreviewThemeCommand } from "./commands/previewTheme.js";
import { registerCopyCssVariablesCommand } from "./commands/copyCssVariables.js";
import { registerGenerateThemeCommand } from "./commands/generateTheme.js";
import { registerRefreshCommand } from "./commands/refresh.js";
import { registerValidateThemeCommand } from "./commands/validateTheme.js";
import { applyPatch } from "./services/applyPatch.js";
import {
  parseStudioAppearance,
  STUDIO_APPEARANCE_KEY,
} from "./shared/studioProtocol.js";
import {
  createThemvoraClient,
  type ThemvoraClient,
} from "./services/coreClient.js";
import type { RootView } from "./domain/rootView.js";
import { createProjectController } from "./services/projectController.js";
import { createDraftRegistry } from "./services/draftRegistry.js";
import { createProfileCache, readProfileFor } from "./services/projectProfileReader.js";
import { saveThemes, type PayloadOptions, type ThemeFileFormat } from "./services/saveTheme.js";
import type { ThemeDefinition } from "@themvora/core";
import { createRootSessions } from "./services/rootSessions.js";
import type { ThemeCatalogDeps } from "./services/themeCatalog.js";
import { parseThemeDocument } from "./domain/themeDocument.js";
import { workspaceSetup, SETUP_LINKS, type WorkspaceSetup } from "./domain/workspaceSetup.js";

/**
 * The API this extension exposes to other extensions.
 *
 * Intentionally small: it grows one verified capability per milestone rather
 * than advertising a surface that does not exist yet.
 */
export interface ThemvoraApi {
  /** The installed extension version, read from the manifest at activation. */
  readonly version: string;
  /** The canonical client over Themvora's public API. */
  readonly client: ThemvoraClient;
  /**
   * What the extension currently makes of each workspace folder, in folder order.
   *
   * Read-only, and live: it reflects the latest inspection rather than a snapshot
   * from activation. A webview has no read API, so neither a test nor another
   * extension can ask "did you find anything here?" without this.
   */
  readonly projects: readonly RootView[];
  /** The Theme Studio panel, for callers that need to know whether it is open. */
  readonly studio: { isOpen(): boolean };
}

/**
 * Activate the extension.
 *
 * @param context - The extension context, supplied by VS Code.
 * @returns The public API object.
 */
export function activate(context: ExtensionContext): ThemvoraApi {
  // Read rather than hardcode: a constant would be a second source of truth for
  // the version and would silently drift from the manifest on the next release.
  const version = String(context.extension.packageJSON.version ?? "0.0.0");

  const client = createThemvoraClient();
  const sessions = createRootSessions();
  const clipboard = createClipboard();
  // The workspace view re-renders whenever the controller publishes roots. The
  // handle is created after the controller because the two reference each other;
  // the callback only runs after both exist.
  let workspace: WorkspaceViewHandle | undefined;
  let studioPanel: { readonly panel: { isOpen(): boolean; refresh(): Promise<void> } } | undefined;

  /**
   * One profile read per root per published analysis.
   *
   * Both surfaces render the profile and both ask on every publish; without this
   * each one walked the project independently for the same answer. A theme save
   * cannot move the profile, so it does not invalidate it — the reason the
   * controller hands over says which changes could.
   */
  const profiles = createProfileCache(readProfileFor);

  const controller = createProjectController({
    onChange: (_roots, reason) => {
      if (reason.profileStale) profiles.invalidate();
      // Both surfaces render the inspection, so both follow it. The Studio used
      // to go stale because only the sidebar subscribed.
      void workspace?.refresh();
      void studioPanel?.panel.refresh();
    },
  });

  // One channel for every command's detail. Created at activation because it is
  // cheap and invisible until a command writes to it.
  const output = window.createOutputChannel("Themvora");

  /**
   * The one registry of unsaved drafts for this window.
   *
   * The Studio is its only writer; the Preview and the commands read from it by
   * id. It is in memory, so a draft survives a webview closing but not a host
   * restart — which is what the UI says.
   */
  const drafts = createDraftRegistry();

  // A removed folder's drafts are detached, not deleted: the work is still the
  // developer's, it just no longer belongs to a workspace. Discarding stays an
  // explicit act, because losing an unsaved draft to a folder change would be
  // the worst possible outcome of tidying a workspace.
  context.subscriptions.push(
    vscodeWorkspace.onDidChangeWorkspaceFolders((event) => {
      for (const removed of event.removed) drafts.detachRoot(removed.uri.fsPath);
    }),
  );

  /**
   * The one list of selectable themes, shared by every command.
   *
   * `roots` is a getter rather than a snapshot so a refresh is visible without
   * rebuilding this object: the commands read the controller's current state at
   * the moment they run.
   */
  const catalog: ThemeCatalogDeps = {
    client,
    roots: () => controller.roots,
    // Unsaved drafts are offered to the commands that can act on them. The
    // list is read at call time, so a draft created a moment ago is selectable.
    drafts: () => drafts.list(),
    // The active editor is read here, once, instead of in each command: the
    // document may hold a theme the inspection has not reached yet (an unsaved
    // buffer, a file outside the scanned layout).
    activeDocument: () => {
      const editor = window.activeTextEditor;
      if (editor === undefined) return undefined;
      const document = parseThemeDocument(editor.document.getText());
      return document.shape === "themes"
        ? { path: editor.document.uri.fsPath, themes: document.themes }
        : undefined;
    },
  };

  // One preview panel per window, owned by the controller rather than by the
  // command, so a second invocation updates the panel instead of replacing it.
  const preview = createPreviewController({
    output,
    extensionUri: context.extensionUri,
    catalog,
    // Previewing needs a theme, not a project: a canonical preset or a generated
    // draft previews fine. So this only fires when there is genuinely nothing to
    // show, and the next step it offers depends on the workspace.
    onNothingToPreview: () => {
      void explainNothingToPreview(async () => {
        const root = controller.roots[0];
        return root === undefined
          ? undefined
          : workspaceSetup(root.inspection, await readProfileFor(root.inspection.root));
      });
    },
  });

  // One write path for every surface: the command, the sidebar and the Studio.
  const saveToProject = (
    themes: readonly ThemeDefinition[],
    saveOptions: {
      format: ThemeFileFormat;
      fileName: string;
      css?: string;
      target?: Uri;
      payload?: PayloadOptions;
    },
  ) =>
    saveThemes({
      themes,
      sessions,
      format: saveOptions.format,
      fileName: saveOptions.fileName,
      ...(saveOptions.css === undefined ? {} : { css: saveOptions.css }),
      ...(saveOptions.target === undefined ? {} : { target: saveOptions.target }),
      ...(saveOptions.payload === undefined ? {} : { payload: saveOptions.payload }),
      onWritten: () => {
        void controller.refresh();
      },
    });

  context.subscriptions.push(
    controller,
    output,
    registerGenerateThemeCommand({
      client,
      sessions,
      // Generation ends in a preview, not a file: the pair opens as an unsaved
      // draft and the user decides whether to save it.
      preview,
      // The pair is registered before it is shown, so every other command can
      // address the same draft by id.
      drafts,
      // A written theme file may itself be a registry the view reads, so the
      // project is re-read once the write has landed.
      onWritten: () => {
        void controller.refresh();
      },
    }),
    registerValidateThemeCommand({ client, output, catalog }),
    registerCopyCssVariablesCommand({ client, clipboard, catalog }),
    registerBrowsePresetsCommand({ client, preview, clipboard, catalog }),
    registerCompareThemesCommand({ client, output, catalog }),
    preview,
    registerPreviewThemeCommand(preview),
    // Editor features: ambient, so they are registered at activation rather than
    // behind a command.
    registerThemeDiagnostics({ output }),
    registerRoleHover(),
    // Reads the controller's current roots, so a refresh changes the badge
    // without re-registering the provider.
    registerThemeFileDecorations({ roots: () => controller.roots }),
    // Contextual: appears only while a theme file is the active editor.
    registerConfigStatusBar(),
    (studioPanel = registerStudioPanel({
      extensionUri: context.extensionUri,
      roots: () => controller.roots,
      profileFor: profiles.profileFor,
      client,
      save: saveToProject,
      applyPatch: (patch) => applyPatch({ patch, sessions }),
      preview,
      drafts,
      refresh: () => controller.refresh(),
      // A bare "open Studio" in a folder with no Themvora gets an explanation
      // and the two setup links, not an empty editor.
      onUnconfigured: (setup: WorkspaceSetup) => {
        void explainUnconfigured(setup);
      },
      // Global, not workspace: the Studio appearance is a personal preference
      // that should follow the developer between folders, the way the workbench
      // theme does. Nothing here touches `workbench.colorTheme`.
      studioAppearance: {
        read: () => parseStudioAppearance(context.globalState.get(STUDIO_APPEARANCE_KEY)),
        write: (appearance) => context.globalState.update(STUDIO_APPEARANCE_KEY, appearance),
      },
    })).panel,
    workspace = registerWorkspaceView({
      roots: () => controller.roots,
      profileFor: profiles.profileFor,
      // The same preview the command opens: one panel, so the Studio and the
      // command cannot show different things.
      preview,
      client,
      // The command's own save path, so a Studio write and a command write are
      // the same operation.
      save: saveToProject,
      extensionUri: context.extensionUri,
    }),
    registerColorSwatches(),
    registerRefreshCommand(() => controller.refresh()),
  );

  // Deliberately not awaited: activation must return promptly, and the sidebar
  // renders as soon as the first inspection lands. Nothing here writes, so a
  // half-finished scan cannot leave the workspace modified.
  void controller.refresh();

  return {
    version,
    client,
    // A getter, not a snapshot: `controller.roots` is replaced on every refresh.
    get projects() {
      return controller.roots;
    },
    studio: {
      isOpen: () => studioPanel?.panel.isOpen() ?? false,
    },
  };
}

/**
 * Deactivate the extension.
 *
 * Every disposable is owned by `context.subscriptions`, so VS Code releases them
 * on shutdown and there is nothing left to unwind here.
 */
export function deactivate(): void {}

/**
 * Tell the user the folder has no Themvora in it, and offer the two useful
 * destinations.
 *
 * The buttons are the only way out of this state that does not involve guessing,
 * so they are the whole message. Choosing one opens a fixed URL; dismissing it
 * does nothing, which is a normal outcome.
 *
 * @param setup - The verdict, for the detail line.
 */
/**
 * Tell the user why nothing opened, and what would make it open.
 *
 * The verdict decides the wording: an unconfigured folder gets the setup links,
 * a configured one gets told to pick a theme. Either way the command must not
 * sit there silently, which reads as a broken preview.
 */
async function explainNothingToPreview(
  currentSetup: () => Promise<WorkspaceSetup | undefined>,
): Promise<void> {
  const setup = await currentSetup();

  if (setup !== undefined && !setup.studioEnabled) {
    const choice = await window.showWarningMessage(
      "No theme is selected, and no Themvora setup was detected in this workspace.",
      { detail: `${setup.summary} Pick a preset to preview, or set Themvora up to preview this project's themes.`, modal: false },
      "Framework Guides",
      "Explore npm Packages",
    );
    if (choice === "Framework Guides") {
      await env.openExternal(Uri.parse(SETUP_LINKS["framework-guides"]));
    } else if (choice === "Explore npm Packages") {
      await env.openExternal(Uri.parse(SETUP_LINKS.npm));
    }
    return;
  }

  const choice = await window.showInformationMessage(
    "No theme is selected.",
    {
      detail: "Open a theme file, pick a preset from the Presets tab, or generate a theme to preview it.",
      modal: false,
    },
    "Browse Presets",
  );
  if (choice === "Browse Presets") {
    await commands.executeCommand(COMMAND_BROWSE_PRESETS);
  }
}

async function explainUnconfigured(setup: WorkspaceSetup): Promise<void> {
  const choice = await window.showWarningMessage(
    "No Themvora setup was detected in this workspace.",
    {
      detail: `${setup.summary} The Studio needs a project that uses Themvora; the preset catalog does not.`,
      modal: false,
    },
    "Framework Guides",
    "Explore npm Packages",
  );
  if (choice === "Framework Guides") {
    await env.openExternal(Uri.parse(SETUP_LINKS["framework-guides"]));
  } else if (choice === "Explore npm Packages") {
    await env.openExternal(Uri.parse(SETUP_LINKS.npm));
  }
}
