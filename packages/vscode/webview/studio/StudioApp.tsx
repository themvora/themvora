/**
 * The Studio application shell.
 *
 * The host owns selection, drafts, catalog, validation, saving and navigation.
 * This component owns presentation and UI-only state, and posts typed intents.
 */
import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";

import type {
  StudioHostMessage,
  StudioIntent,
  StudioState,
} from "../../src/shared/studioProtocol";
import { CreateDrawer, type GenerationPreviewInput } from "./CreateDrawer";
import { host } from "./host";
import { Inspector } from "./Inspector";
import { LibraryPanel } from "./LibraryPanel";
import { PatchPreviewDialog } from "./PatchPreviewDialog";
import { PreviewWorkspace } from "./PreviewWorkspace";
import { partitionFamilies } from "./themeGroups";
import { BrandMark, Icon, Segmented } from "./ui";
import {
  initialUiState,
  studioUiReducer,
  type DraftPreviewState,
  type StudioAppearance,
} from "./uiState";

/** A skeleton that matches the shell, not a full-page spinner. */
function StudioLoading(): React.JSX.Element {
  return (
    <div className="studio loading-studio" aria-busy="true" aria-label="Loading Themvora Studio">
      <header className="topbar">
        <span className="brand">
          <BrandMark />
          <span className="brand-name">Themvora Studio</span>
        </span>
        <span className="skeleton-line short" />
        <span className="topbar-actions">
          <span className="skeleton-button" />
          <span className="skeleton-button" />
        </span>
      </header>
      <div className="studio-workspace">
        <aside className="library-shell">
          <span className="skeleton-rail" />
          <div className="library">
            <span className="skeleton-line" />
            <span className="skeleton-line" />
            <span className="skeleton-card" />
            <span className="skeleton-card" />
            <span className="skeleton-card" />
          </div>
        </aside>
        <main className="canvas">
          <span className="skeleton-line short" />
          <span className="skeleton-preview" />
        </main>
        <aside className="inspector">
          <span className="skeleton-line" />
          <span className="skeleton-line" />
          <span className="skeleton-line" />
        </aside>
      </div>
      <p className="loading-label">Reading the project and canonical catalog…</p>
    </div>
  );
}

/** A folder with no readable project. */
function NoFolder({ onRetry }: { onRetry: () => void }): React.JSX.Element {
  return (
    <div className="empty-project">
      <BrandMark size={44} />
      <h1>Open a folder to begin</h1>
      <p>The Studio reads themes from the open workspace. Nothing is executed.</p>
      <button type="button" className="cta" onClick={onRetry}>
        Retry
      </button>
    </div>
  );
}

/** Which side panel is open as an overlay on narrow windows. */
type NarrowPanel = "library" | "inspector" | undefined;

/**
 * The application.
 *
 * @returns The Studio shell.
 */
export function StudioApp({
  initialAppearance,
}: {
  readonly initialAppearance: StudioAppearance;
}): React.JSX.Element {
  const [state, setState] = useState<StudioState | null>(null);
  const [ui, dispatch] = useReducer(studioUiReducer, undefined, () =>
    initialUiState(initialAppearance),
  );
  const [draftPreview, setDraftPreview] = useState<
    DraftPreviewState | undefined
  >(undefined);
  const previewRequest = useRef(0);
  const [narrow, setNarrow] = useState<NarrowPanel>(undefined);
  const projectFamilies = useMemo(
    () => partitionFamilies(state?.themes ?? []).project,
    [state?.themes],
  );

  useEffect(() => {
    const listener = (event: MessageEvent): void => {
      const message = event.data as StudioHostMessage | null;
      if (message === null || typeof message !== "object") return;
      if (message.type === "state") setState(message.state);
      if (message.type === "fileText")
        dispatch({ type: "set-file-text", text: message.text });
      if (message.type === "saveLocation")
        dispatch({ type: "set-target-path", path: message.path });
      if (message.type === "saveResult") dispatch({ type: "close-save" });
      if (message.type === "patchPreview")
        dispatch({ type: "open-patch-preview", patch: message.patch });
      if (
        message.type === "draftPreview" &&
        message.requestId === previewRequest.current
      ) {
        setDraftPreview({
          requestId: message.requestId,
          pending: false,
          result: message.result,
        });
      }
    };
    window.addEventListener("message", listener);
    host.postMessage({ type: "ready" });
    return () => window.removeEventListener("message", listener);
  }, []);

  const requestPreview = useCallback((input: GenerationPreviewInput): void => {
    const requestId = previewRequest.current + 1;
    previewRequest.current = requestId;
    setDraftPreview({ requestId, pending: true });
    host.postMessage({
      type: "previewGenerate",
      requestId,
      seed: input.seed,
      kind: input.kind,
      ...(input.family === undefined ? {} : { family: input.family }),
      ...(input.style === undefined ? {} : { style: input.style }),
      withCode: input.withCode,
    });
  }, []);

  useEffect(() => {
    if (ui.creating) return;
    // Invalidate any in-flight preview so a late reply cannot repopulate a
    // drawer that is already closed.
    previewRequest.current += 1;
    setDraftPreview(undefined);
  }, [ui.creating]);

  useEffect(() => {
    if (ui.createEntry === "generate" || ui.createEntry === "define") return;
    previewRequest.current += 1;
    setDraftPreview(undefined);
  }, [ui.createEntry]);

  // Apply the Studio appearance immediately, then let the host own the
  // preference: global state outlives this panel, so closing and reopening the
  // Studio restores the same appearance. The host also writes the attribute
  // into the next document, so the first paint is already correct — which is
  // why a matching attribute means "already applied" and needs no round trip.
  useEffect(() => {
    const root = document.documentElement;
    if (root.dataset.studioAppearance === ui.studioAppearance) return;
    root.dataset.studioAppearance = ui.studioAppearance;
    host.postMessage({ type: "setStudioAppearance", appearance: ui.studioAppearance });
  }, [ui.studioAppearance]);

  // Once a generated draft is edited it can no longer be written as a pure
  // generator call, so a lingering generate format falls back to defineTheme.
  useEffect(() => {
    if (state?.selected?.editor?.customized !== true) return;
    if (ui.format !== "ts-generate") return;
    dispatch({ type: "set-format", format: "ts" });
  }, [state?.selected?.editor?.customized, ui.format]);

  // A new selection owns a new format, highlight and comparison state.
  useEffect(() => {
    dispatch({
      type: "selection-changed",
      ...(state?.selected === undefined
        ? {}
        : {
            selection: {
              origin: state.selected.origin,
              ...(state.selected.draftKind === undefined
                ? {}
                : { draftKind: state.selected.draftKind }),
            },
          }),
    });
  }, [
    state?.selected?.name,
    state?.selected?.source,
    state?.selected?.mode,
    state?.selected?.origin,
    state?.selected?.draftKind,
  ]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key !== "Escape") return;
      if (ui.creating) dispatch({ type: "close-create" });
      else if (ui.saving) dispatch({ type: "close-save" });
      else setNarrow(undefined);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [ui.creating, ui.saving]);

  if (state === null) return <StudioLoading />;

  const selected = state.selected;
  const post = (intent: StudioIntent): void => host.postMessage(intent);
  const canSave = selected !== undefined && selected.valid;

  const onOpen = (
    path: string,
    location?: { readonly line: number; readonly column: number },
  ): void => {
    post({
      type: "open",
      path,
      ...(location === undefined
        ? {}
        : { line: location.line, column: location.column }),
    });
  };

  const generate = (): void => {
    post({
      type: "generate",
      seed: ui.seed,
      kind: ui.createEntry === "define" ? "define" : "generate",
      ...(ui.family.trim().length === 0 ? {} : { family: ui.family.trim() }),
      ...(ui.style.length === 0 ? {} : { style: ui.style }),
      withCode: ui.withCode,
    });
    dispatch({ type: "close-create" });
    dispatch({ type: "open-save" });
  };

  const startFromPreset = (id: string): void => {
    post({ type: "draftFromPresetId", id });
    dispatch({ type: "close-create" });
    dispatch({ type: "open-save" });
  };

  const startFromExisting = (theme: {
    readonly source: string;
    readonly name: string;
  }): void => {
    post({ type: "draftFromTheme", path: theme.source, name: theme.name });
    dispatch({ type: "close-create" });
    dispatch({ type: "open-save" });
  };

  const inspectRegion = (region: string): void => {
    dispatch({ type: "set-preview-region", region });
    dispatch({ type: "set-inspector", inspector: "tokens" });
  };

  const editToken = (path: readonly string[], value: string): void => {
    dispatch({ type: "set-file-text" });
    post({ type: "editToken", path, value });
  };

  const resetToken = (path: readonly string[]): void => {
    dispatch({ type: "set-file-text" });
    post({ type: "resetToken", path });
  };

  const resetGroup = (group: string): void => {
    dispatch({ type: "set-file-text" });
    post({ type: "resetGroup", group });
  };

  const resetDraft = (): void => {
    dispatch({ type: "set-file-text" });
    post({ type: "resetDraft" });
  };

  const discardDraft = (): void => {
    // The host asks for confirmation when the draft is dirty, because only the
    // host knows whether anything would be lost.
    post({ type: "discardDraft" });
  };

  const showSource = (): void => {
    post({ type: "serialize", format: "ts" });
  };

  const setMode = (mode: string): void => post({ type: "setMode", mode });

  const isDraft = selected?.origin === "draft";
  const counts = state.project;
  const countsTitle = `${counts.familyCount} project families (${counts.themeCount} variants) · ${counts.catalogFamilyCount} catalog families (${counts.catalogCount} variants)`;
  const saveTitle = canSave ? "Save this theme" : "Select a valid theme first";
  const openCreate = (): void => dispatch({ type: "open-create" });
  const openSave = (): void => dispatch({ type: "open-save" });

  return (
    <div className="studio" data-narrow={narrow}>
      <header className="topbar">
        <span className="brand">
          <BrandMark />
          <span className="brand-name">Themvora Studio</span>
        </span>
        <span className="topbar-divider" aria-hidden="true" />
        <div className="project-context">
          <strong className="project-name" title={state.project.name}>
            {state.project.name}
          </strong>
          <span className="project-meta">
            {state.project.framework} · {state.project.packageManager}
          </span>
          <span className={`pill ${state.project.status === "supported" ? "ok" : "muted"}`}>
            <span className="pill-dot" aria-hidden="true" />
            {state.project.status}
          </span>
        </div>

        <div className="topbar-actions">
          <span className="topbar-counts" title={countsTitle}>
            {counts.familyCount} families · {counts.catalogFamilyCount} catalog
          </span>
          <Segmented<StudioAppearance>
            label="Studio appearance"
            className="sm"
            value={ui.studioAppearance}
            options={[
              { value: "auto", label: <Icon name="monitor" size={14} />, title: "Auto — follow VS Code appearance", ariaLabel: "Auto" },
              { value: "light", label: <Icon name="sun" size={14} />, title: "Light Studio appearance", ariaLabel: "Light" },
              { value: "dark", label: <Icon name="moon" size={14} />, title: "Dark Studio appearance", ariaLabel: "Dark" },
            ]}
            onChange={(appearance) => dispatch({ type: "set-studio-appearance", appearance })}
          />
          <button
            type="button"
            className="icon-button"
            aria-label="Change VS Code color theme"
            title="Change VS Code color theme… (opens the native VS Code picker)"
            onClick={() => post({ type: "openColorThemePicker" })}
          >
            <Icon name="palette" size={14} />
          </button>
          <button
            type="button"
            className="icon-button narrow-only narrow-library"
            aria-label="Show theme list"
            aria-expanded={narrow === "library"}
            title="Theme list"
            onClick={() => setNarrow(narrow === "library" ? undefined : "library")}
          >
            <Icon name="themes" />
          </button>
          <button
            type="button"
            className="icon-button narrow-only narrow-inspector"
            aria-label="Show inspector"
            aria-expanded={narrow === "inspector"}
            title="Inspector"
            onClick={() => setNarrow(narrow === "inspector" ? undefined : "inspector")}
          >
            <Icon name="layers" />
          </button>
          <button
            type="button"
            className="ghost hide-compact"
            onClick={() => post({ type: "openSource" })}
            disabled={selected?.source === undefined}
            title={selected?.source ?? "This theme has no source file"}
          >
            Open source
          </button>
          <button
            type="button"
            className="secondary"
            onClick={() => post({ type: "preview" })}
            disabled={selected === undefined}
            title="Open the standalone preview panel"
          >
            Preview
          </button>
          {isDraft ? (
            <>
              <button
                type="button"
                className="secondary"
                aria-haspopup="dialog"
                aria-expanded={ui.creating}
                onClick={openCreate}
              >
                New theme
              </button>
              <button type="button" className="cta" onClick={openSave} disabled={!canSave} title={saveTitle}>
                Save draft
              </button>
            </>
          ) : (
            <>
              <button type="button" className="secondary" onClick={openSave} disabled={!canSave} title={saveTitle}>
                Save
              </button>
              <button
                type="button"
                className="cta"
                aria-haspopup="dialog"
                aria-expanded={ui.creating}
                onClick={openCreate}
              >
                New theme
              </button>
            </>
          )}
        </div>
      </header>

      {state.project.status === "no folder" ? (
        <>
          {state.notice === undefined ? null : (
            <p className={`notice-strip ${state.notice.kind}`} role="status">
              <Icon name={state.notice.kind === "error" ? "alert" : "info"} size={14} />
              <span>{state.notice.text}</span>
            </p>
          )}
          <NoFolder onRetry={() => post({ type: "ready" })} />
        </>
      ) : (
        <div className="studio-workspace">
          <LibraryPanel
            state={state}
            selected={selected}
            ui={ui}
            dispatch={dispatch}
            actions={{
              onSelectTheme: (theme) =>
                post({
                  type: "selectProject",
                  path: theme.source,
                  name: theme.name,
                }),
              onSelectPreset: (id) => post({ type: "selectPreset", id }),
              // Only the id travels: the host reads the registry record, so the
              // revision and theme data are the registry's, not this view's.
              onSelectDraft: (id) => post({ type: "selectDraft", id }),
              onOpen,
              onCreate: openCreate,
            }}
          />
          <PreviewWorkspace
            selected={selected}
            notice={state.notice}
            projectThemeCount={state.themes.length}
            ui={ui}
            dispatch={dispatch}
            onDraftFromPreset={() => post({ type: "draftFromPreset" })}
            onMode={setMode}
            onRegion={inspectRegion}
            onSave={() =>
              post({
                type: "save",
                format: ui.format,
                fileName: ui.fileName,
                destination: ui.destination,
              })
            }
            onSerialize={() => post({ type: "serialize", format: ui.format })}
            onChooseLocation={() =>
              post({
                type: "chooseSaveLocation",
                format: ui.format,
                fileName: ui.fileName,
              })
            }
            onResetToken={resetToken}
            onDiscardDraft={discardDraft}
            onUseInProject={() => {
              // Request patch generation from the host
              post({ type: "generatePatch" });
            }}
          />
          <Inspector
            selected={selected}
            ui={ui}
            dispatch={dispatch}
            onOpen={onOpen}
            onCopy={(text) => post({ type: "copy", text })}
            onEditToken={editToken}
            onResetToken={resetToken}
            onResetGroup={resetGroup}
            onResetDraft={resetDraft}
            onMode={setMode}
            onSource={showSource}
          />
          {narrow === undefined ? null : (
            <button
              type="button"
              className="narrow-scrim"
              aria-label="Close panel"
              tabIndex={-1}
              onClick={() => setNarrow(undefined)}
            />
          )}
        </div>
      )}

      <footer className="studio-statusbar">
        <span className="statusbar-left">
          {isDraft
            ? "Generated in memory · nothing has been written yet"
            : "Static source analysis · no active theme reported"}
        </span>
        <span className="statusbar-right" title={countsTitle}>
          {counts.familyCount} project families ({counts.themeCount} variants) ·{" "}
          {counts.catalogFamilyCount} catalog families ({counts.catalogCount} variants) ·{" "}
          {state.sources.length} sources · {state.providers.length} consumers
        </span>
      </footer>

      {ui.creating ? (
        <CreateDrawer
          ui={ui}
          styles={state.styles}
          presets={state.presets}
          themes={state.themes}
          projectFamilies={projectFamilies}
          preview={draftPreview}
          dispatch={dispatch}
          onPreview={requestPreview}
          onCreate={generate}
          onStartPreset={startFromPreset}
          onStartExisting={startFromExisting}
        />
      ) : null}

      {ui.patchPreview !== undefined ? (
        <PatchPreviewDialog
          patch={ui.patchPreview}
          ui={ui}
          dispatch={dispatch}
          onApply={(patch) => post({ type: "applyPatch", patch })}
        />
      ) : null}

    </div>
  );
}
