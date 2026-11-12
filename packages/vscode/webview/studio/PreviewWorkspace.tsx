/**
 * The preview workspace: selection identity, modes, comparison and saving.
 *
 * One `ThemePreview` surface renders every origin and both comparison halves.
 * The toolbar may switch a mode or ask the host to save; it never resolves a
 * theme itself.
 */
import { useRef, type Dispatch } from "react";

import type {
  PreviewScenario,
  StudioNotice,
  StudioSelection,
  StudioVariant,
} from "../../src/shared/studioProtocol";
import { ORIGIN_LABEL, formatOrigin, formatsFor } from "./labels";
import { withFormatExtension } from "./uiState";
import { ThemePreview } from "./ThemePreview";
import { DashboardPreview } from "./DashboardPreview";
import { Icon, Segmented, useFocusTrap, type SegmentOption } from "./ui";
import type { ComparisonMode, StudioUiAction, StudioUiState } from "./uiState";

/** A compact token comparison for two variants. */
function TokenComparison({
  variants,
}: {
  variants: readonly StudioVariant[];
}): React.JSX.Element | null {
  const [left, right] = variants;
  if (left === undefined || right === undefined) return null;

  const leftTokens = new Map(left.tokens.map((token) => [token.name, token]));
  const rightTokens = new Map(right.tokens.map((token) => [token.name, token]));
  const names = [
    ...new Set([
      ...left.tokens.map((token) => token.name),
      ...right.tokens.map((token) => token.name),
    ]),
  ];

  return (
    <section className="compare-tokens">
      <h3>Token comparison</h3>
      <div className="compare-table">
        <div className="compare-tr compare-th">
          <span>Token</span>
          <span>{left.mode}</span>
          <span>{right.mode}</span>
        </div>
        {names.map((name) => {
          const leftToken = leftTokens.get(name);
          const rightToken = rightTokens.get(name);
          const differs = leftToken?.value !== rightToken?.value;
          return (
            <div
              className={`compare-tr${differs ? " differs" : ""}`}
              key={name}
            >
              <span className="compare-name">{name}</span>
              <span>
                {leftToken === undefined ? (
                  "—"
                ) : (
                  <>
                    <span
                      className="swatch"
                      style={{ background: leftToken.value }}
                      aria-hidden="true"
                    />
                    <code>{leftToken.value}</code>
                  </>
                )}
              </span>
              <span>
                {rightToken === undefined ? (
                  "—"
                ) : (
                  <>
                    <span
                      className="swatch"
                      style={{ background: rightToken.value }}
                      aria-hidden="true"
                    />
                    <code>{rightToken.value}</code>
                  </>
                )}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/** The separator a path already uses, so a joined display path looks native. */
function separatorOf(path: string): string {
  return path.includes("\\") && !path.includes("/") ? "\\" : "/";
}

/** The target the host will write, or an empty string until one is known. */
function saveTarget(selected: StudioSelection, ui: StudioUiState): string {
  const name = ui.fileName.trim();
  if (ui.saveDirectory !== undefined) {
    const separator = separatorOf(ui.saveDirectory);
    const directory = ui.saveDirectory.replace(/[\\/]+$/u, "");
    // With no name yet, the folder alone still says where the write lands.
    return `${directory}${separator}${name}`;
  }
  if (ui.destination !== "source" || selected.source === undefined) return "";
  const slash = Math.max(selected.source.lastIndexOf("/"), selected.source.lastIndexOf("\\"));
  return slash < 0 ? name : `${selected.source.slice(0, slash + 1)}${name}`;
}

/** The save dialog. */
function SavePanel({
  selected,
  ui,
  dispatch,
  onSave,
  onSerialize,
  onChooseLocation,
}: {
  readonly selected: StudioSelection;
  readonly ui: StudioUiState;
  readonly dispatch: Dispatch<StudioUiAction>;
  readonly onSave: () => void;
  readonly onSerialize: () => void;
  readonly onChooseLocation: () => void;
}): React.JSX.Element {
  const dialog = useRef<HTMLElement>(null);
  useFocusTrap(dialog);
  const origin = formatOrigin(selected);
  const formats = formatsFor(origin);
  const contrastFailureCount = selected.tokens.reduce((sum, token) => {
    return sum + (token.contrasts?.filter((c) => !c.passes).length ?? 0);
  }, 0);
  const issues =
    (selected.issues?.length ?? 0) +
    contrastFailureCount +
    (selected.levelIssues?.length ?? 0);
  const target = saveTarget(selected, ui);
  const hasTarget = target.length > 0;
  const canSave =
    selected.valid && ui.fileName.trim().length > 0 && hasTarget;
  const close = (): void => dispatch({ type: "close-save" });

  return (
    <div className="modal-scrim" onClick={close}>
      <section
        ref={dialog}
        className="modal save-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="save-dialog-title"
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="modal-head">
          <div>
            <h2 id="save-dialog-title">Save theme</h2>
            <p className="muted">
              Writing a file does not register it. A provider must still supply the theme.
            </p>
          </div>
          <button type="button" className="icon-button bordered" aria-label="Close save dialog" onClick={close}>
            <Icon name="close" />
          </button>
        </header>

        <div className="chip-row save-summary" aria-label="Save summary">
          <span className="chip">
            {selected.editor?.changedTokens ?? 0} values changed
          </span>
          <span className={`chip ${issues > 0 ? "bad" : "ok"}`}>
            {issues} {issues === 1 ? "issue" : "issues"}
          </span>
          <span className="chip">{selected.modes.join(" + ") || "single mode"}</span>
          <span className="chip" title={selected.source ?? "New file"}>
            {selected.source === undefined ? "new file" : selected.source}
          </span>
          {selected.editor?.customized === true ? <span className="chip warn">customized</span> : null}
        </div>

        <label className="field">
          <span className="overline">Format</span>
          <select
            value={ui.format}
            onChange={(event) => {
              const next = event.target.value;
              dispatch({ type: "set-format", format: next });
              dispatch({
                type: "set-file-name",
                fileName: withFormatExtension(ui.fileName, next),
              });
            }}
          >
            {formats.map((entry) => (
              <option key={entry.value} value={entry.value}>
                {entry.label}
              </option>
            ))}
          </select>
        </label>
        <div className="field-grid">
          <label className="field">
            <span className="overline">File name</span>
            <input
              className="mono"
              value={ui.fileName}
              spellCheck={false}
              autoFocus
              onChange={(event) => dispatch({ type: "set-file-name", fileName: event.target.value })}
            />
          </label>
          <div className="field">
            <span className="overline" id="save-where-label">
              Where
            </span>
            <div className="field-inline">
              <select
                aria-labelledby="save-where-label"
                value={selected.source === undefined ? "choose" : ui.destination}
                onChange={(event) =>
                  dispatch({
                    type: "set-destination",
                    destination: event.target.value === "choose" ? "choose" : "source",
                  })
                }
              >
                <option value="source" disabled={selected.source === undefined}>
                  Beside the theme source
                </option>
                <option value="choose">Choose a location…</option>
              </select>
              {/* The select cannot re-fire on the option it already shows, so
                  picking (or changing) a folder needs a control of its own.
                  Without it the location was fixed at the first pick. */}
              <button
                type="button"
                className="secondary"
                title={
                  ui.saveDirectory === undefined
                    ? "Pick the folder to write into"
                    : "Pick a different folder"
                }
                onClick={onChooseLocation}
              >
                {ui.saveDirectory === undefined ? "Browse…" : "Change…"}
              </button>
            </div>
          </div>
        </div>

        {ui.fileText === undefined ? null : (
          <pre className="file-preview" aria-label="Exact file contents">
            <code>{ui.fileText}</code>
          </pre>
        )}

        <footer className="modal-foot">
          <span
            className={`modal-foot-note mono${hasTarget ? "" : " is-pending"}`}
            {...(hasTarget ? { title: target } : {})}
          >
            {hasTarget ? target : "Choose a location to continue"}
          </span>
          <button type="button" className="ghost" onClick={close}>
            Cancel
          </button>
          <button
            type="button"
            className="secondary"
            disabled={!hasTarget}
            title={
              hasTarget
                ? "Preview the exact file contents"
                : "Choose a location first"
            }
            onClick={onSerialize}
          >
            Preview file
          </button>
          <button
            type="button"
            className="cta"
            disabled={!canSave}
            title={
              !hasTarget
                ? "Choose a location first"
                : selected.valid
                  ? ui.fileName.trim().length === 0
                    ? "Enter a file name"
                    : "Save this theme"
                  : "Fix the validation issues before saving"
            }
            onClick={onSave}
          >
            Save
          </button>
        </footer>
      </section>
    </div>
  );
}

/** Props for the preview workspace. */
export interface PreviewWorkspaceProps {
  readonly selected: StudioSelection | undefined;
  readonly notice: StudioNotice | undefined;
  readonly projectThemeCount: number;
  readonly ui: StudioUiState;
  readonly dispatch: Dispatch<StudioUiAction>;
  readonly onDraftFromPreset: () => void;
  readonly onMode: (mode: string) => void;
  readonly onRegion: (id: string) => void;
  readonly onSave: () => void;
  readonly onSerialize: () => void;
  readonly onChooseLocation: () => void;
  readonly onResetToken: (path: readonly string[]) => void;
  readonly onDiscardDraft: () => void;
  readonly onUseInProject: () => void;
}

/**
 * The canvas.
 *
 * @param props - Selection and actions.
 * @returns The preview workspace.
 */
export function PreviewWorkspace({
  selected,
  notice,
  projectThemeCount,
  ui,
  dispatch,
  onDraftFromPreset,
  onMode,
  onRegion,
  onSave,
  onSerialize,
  onChooseLocation,
  onResetToken,
  onDiscardDraft,
  onUseInProject,
}: PreviewWorkspaceProps): React.JSX.Element {
  const canCompareModes =
    selected?.valid === true && (selected.variants.length ?? 0) > 1;
  const canCompareBaseline =
    selected?.origin === "draft" && selected.editor?.customized === true;
  const comparingLightDark =
    ui.comparisonMode === "light-dark" && canCompareModes;
  const comparingBeforeAfter =
    ui.comparisonMode === "before-after" && canCompareBaseline;
  const selectedSurface =
    selected === undefined
      ? undefined
      : (
          selected.variants.find((variant) => variant.name === selected.name) ??
          selected.variants.find(
            (variant) => variant.mode === (selected.mode ?? "default"),
          )
        )?.surface;
  const previewSource =
    selected === undefined
      ? ""
      : (selected.source ?? `${selected.origin} · ${selected.name}`);
  const isPreset = selected?.origin === "preset";
  const isDraft = selected?.origin === "draft";
  // An info notice about a draft folds into the draft strip; errors keep their own strip.
  const draftNotice = isDraft && notice?.kind === "info" ? notice.text : undefined;
  const noticeText =
    draftNotice !== undefined
      ? undefined
      : (notice?.text ??
        (isPreset ? "Presets are read-only and not registered in this project." : undefined));
  const inspectToken = (role: string): void => {
    dispatch({ type: "set-highlight", highlight: role });
    dispatch({ type: "set-inspector", inspector: "tokens" });
  };
  const comparisonOptions: SegmentOption<ComparisonMode>[] = [
    { value: "none", label: "Single", title: "Show single preview" },
    ...(canCompareModes
      ? [{ value: "light-dark" as const, label: "Light ↔ Dark", title: "Compare light and dark variants side by side" }]
      : []),
    ...(canCompareBaseline
      ? [{ value: "before-after" as const, label: "Before ↔ After", title: "Compare baseline with current draft" }]
      : []),
  ];

  return (
    <main className="canvas" aria-label="Theme preview">
      <div className="canvas-toolbar">
        <div className="canvas-identity">
          {selected === undefined ? (
            <>
              <strong className="canvas-title">Preview</strong>
              <span className="muted">No theme selected</span>
            </>
          ) : (
            <>
              <strong className="canvas-title" title={selected.name}>
                {selected.name}
              </strong>
              {selected.origin === "draft" ? (
                <span className="pill warn">
                  {selected.editor?.customized === true ? "Customized draft" : "Unsaved draft"}
                </span>
              ) : (
                <span className="pill accent">{ORIGIN_LABEL[selected.origin]}</span>
              )}
              {selected.family === undefined ||
              selected.family === selected.name ? null : (
                <span className="pill hide-compact">{selected.family}</span>
              )}
              {selected.draftKind === "define" ? (
                <span className="pill hide-compact">define draft</span>
              ) : null}
              <span className={`status-text ${selected.valid ? "ok" : "bad"}`}>
                <Icon name={selected.valid ? "check" : "alert"} size={13} />
                {selected.valid ? "valid" : "invalid"}
              </span>
            </>
          )}
        </div>
        <div className="canvas-controls">
          {ui.highlight === undefined ? null : (
            <span className="pill accent highlight-chip">
              {ui.highlight}
              <button
                type="button"
                className="pill-close"
                aria-label="Clear token highlight"
                onClick={() => dispatch({ type: "set-highlight" })}
              >
                <Icon name="close" size={12} />
              </button>
            </span>
          )}
          <button
            type="button"
            className={`inspect-toggle${ui.inspect ? " is-on" : ""}`}
            aria-pressed={ui.inspect}
            title="Hover the preview to see the tokens an element paints and its contrast. Click an element to select its token."
            onClick={() => dispatch({ type: "set-inspect", inspect: !ui.inspect })}
          >
            <Icon name="layers" size={14} />
            Tokens
          </button>
          {selected !== undefined && selected.modes.length > 1 ? (
            <Segmented
              label="Theme mode"
              className="caps"
              value={selected.mode}
              options={selected.modes.map((mode) => ({ value: mode, label: mode }))}
              onChange={onMode}
            />
          ) : null}
          <Segmented<PreviewScenario>
            label="Preview scenario"
            value={ui.scenario}
            options={[
              { value: "components", label: "Components", title: "Component gallery demonstrating semantic theme roles" },
              { value: "dashboard", label: "Dashboard", title: "Application-scale dashboard sample with synthetic data" },
            ]}
            onChange={(scenario) => dispatch({ type: "set-scenario", scenario })}
          />
          {selected?.valid === true && (canCompareModes || canCompareBaseline) ? (
            <Segmented
              label="Comparison mode"
              value={ui.comparisonMode}
              options={comparisonOptions}
              onChange={(mode) => dispatch({ type: "set-comparison-mode", mode })}
            />
          ) : null}
        </div>
      </div>

      {noticeText === undefined ? null : (
        <div className={`notice-strip ${notice?.kind ?? "info"}`} role="status">
          <Icon name={notice?.kind === "error" ? "alert" : "info"} size={14} />
          <span className="notice-text" title={noticeText}>
            {noticeText}
          </span>
          {isPreset ? (
            <button
              type="button"
              className="link-button"
              title="Copy this preset into an unsaved defineTheme draft"
              onClick={onDraftFromPreset}
            >
              Create draft
            </button>
          ) : null}
        </div>
      )}

      {selected?.origin === "draft" ? (
        <div className="notice-strip draft-strip" role="status" aria-label="Unsaved draft">
          {draftNotice === undefined ? null : (
            <>
              <Icon name="info" size={14} />
              <span className="notice-text" title={draftNotice}>
                {draftNotice}
              </span>
            </>
          )}
          <span className="muted draft-kind">
            {selected.draftKind === "define"
              ? "Define theme"
              : "Generate theme"}
          </span>
          {selected.editor?.customized === true ? (
            <span className="pill warn">
              {selected.editor.changedTokens} changed
            </span>
          ) : null}
          {selected.draftSource === undefined ? null : (
            <span className="muted">from {selected.draftSource}</span>
          )}
          {selected.draftInputs === undefined ? null : (
            <span className="muted draft-inputs">
              seed <code>{selected.draftInputs.seed ?? "—"}</code>
              {selected.draftInputs.family === undefined
                ? null
                : ` · ${selected.draftInputs.family}`}
              {selected.draftInputs.style === undefined
                ? null
                : ` · ${selected.draftInputs.style}`}
              {selected.draftInputs.withCode === true ? " · code tokens" : ""}
            </span>
          )}
          <span className="strip-actions">
            <button
              type="button"
              className="link-button"
              onClick={() =>
                dispatch({ type: "set-inspector", inspector: "source" })
              }
            >
              View source
            </button>
            {selected.editor?.customized === true ? (
              <button
                type="button"
                className="link-button"
                title="Revert all tokens to their baseline values"
                onClick={() => {
                  if (!selected.editor) return;
                  for (const group of selected.editor.groups) {
                    for (const token of group.tokens) {
                      if (token.changed && token.original !== undefined) {
                        onResetToken(token.path);
                      }
                    }
                  }
                }}
              >
                Revert all
              </button>
            ) : null}
            <button
              type="button"
              className="link-button"
              disabled={!selected.valid}
              title={
                selected.valid
                  ? "Save this draft"
                  : "Fix the validation issues first"
              }
              onClick={() => dispatch({ type: "open-save" })}
            >
              Save draft…
            </button>
            <button
              type="button"
              className="link-button"
              disabled={!selected.valid}
              title={
                selected.valid
                  ? "Use this theme in your project"
                  : "Fix the validation issues first"
              }
              onClick={onUseInProject}
            >
              Use in my project…
            </button>
            {selected.origin === "draft" ? (
              // Deliberately next to Save and away from "Revert all": reverting
              // restores the baseline and keeps the draft, discarding ends it.
              <button
                type="button"
                className="link-button destructive"
                title="Remove this unsaved draft. Reverting keeps the draft; this does not."
                onClick={onDiscardDraft}
              >
                Discard draft
              </button>
            ) : null}
          </span>
        </div>
      ) : null}

      <div className="canvas-scroll">
        {selected === undefined ? (
          <div className="empty-state canvas-empty">
            <div className="empty-mark" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
            <strong>
              {projectThemeCount === 0
                ? "No project theme yet"
                : "Select a theme"}
            </strong>
            <p>
              {projectThemeCount === 0
                ? "Generate a draft or start from a catalog preset to see the full preview."
                : "Choose a family in the library to drive the preview and inspector."}
            </p>
            <button
              type="button"
              className="secondary"
              onClick={() => dispatch({ type: "open-create" })}
            >
              New theme
            </button>
          </div>
        ) : !selected.valid ? (
          <section
            className="invalid-canvas"
            aria-label="This theme cannot be previewed"
          >
            <h2>This theme cannot be previewed</h2>
            <p className="bad">
              {selected.issue ?? "The canonical validator rejected this theme."}
            </p>
            {selected.issues === undefined ||
            selected.issues.length === 0 ? null : (
              <ul>
                {selected.issues.map((issue) => (
                  <li key={issue.path ?? issue.message}>
                    <button
                      type="button"
                      className="link-button"
                      disabled={issue.token === undefined}
                      onClick={() => {
                        if (issue.token === undefined) return;
                        dispatch({
                          type: "set-highlight",
                          highlight: issue.token,
                        });
                        dispatch({
                          type: "set-inspector",
                          inspector: "tokens",
                        });
                      }}
                    >
                      {issue.message}
                    </button>
                    {issue.token === undefined ? null : (
                      <span className="muted"> · {issue.token}</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
            <p className="muted">
              No colours were substituted. Fix the source and refresh.
            </p>
          </section>
        ) : comparingLightDark ? (
          <>
            <div className="compare">
              {selected.variants.slice(0, 2).map((variant) => (
                <figure key={variant.mode} className="compare-panel">
                  <figcaption>
                    <strong>{variant.mode}</strong>
                    <span className="muted">{variant.name}</span>
                  </figcaption>
                  <ThemePreview
                    tokens={variant.tokens}
                    mode={variant.mode}
                    compact
                    {...(variant.surface === undefined
                      ? {}
                      : { surface: variant.surface })}
                    {...(selected.family === undefined
                      ? {}
                      : { family: selected.family })}
                    {...(ui.highlight === undefined
                      ? {}
                      : { highlight: ui.highlight })}
                    inspect={ui.inspect}
                    onRegion={onRegion}
                    onToken={inspectToken}
                  />
                </figure>
              ))}
            </div>
            <TokenComparison variants={selected.variants} />
          </>
        ) : comparingBeforeAfter ? (
          <>
            <div className="compare">
              <figure className="compare-panel">
                <figcaption>
                  <strong>Before</strong>
                  <span className="muted">Baseline</span>
                </figcaption>
                <ThemePreview
                  tokens={selected.tokens.map((t) => {
                    const editorToken = selected.editor?.groups
                      .flatMap((g) => g.tokens)
                      .find((et) => et.path.join(".") === t.name);
                    return editorToken?.original === undefined
                      ? t
                      : { ...t, value: editorToken.original };
                  })}
                  {...(selected.mode === undefined
                    ? {}
                    : { mode: selected.mode })}
                  {...(selected.family === undefined
                    ? {}
                    : { family: selected.family })}
                  {...(ui.highlight === undefined
                    ? {}
                    : { highlight: ui.highlight })}
                  inspect={ui.inspect}
                  onRegion={onRegion}
                  onToken={inspectToken}
                />
              </figure>
              <figure className="compare-panel">
                <figcaption>
                  <strong>After</strong>
                  <span className="muted">Current draft</span>
                </figcaption>
                <ThemePreview
                  tokens={selected.tokens}
                  {...(selected.mode === undefined
                    ? {}
                    : { mode: selected.mode })}
                  {...(selected.family === undefined
                    ? {}
                    : { family: selected.family })}
                  {...(selectedSurface === undefined
                    ? {}
                    : { surface: selectedSurface })}
                  source={previewSource}
                  {...(ui.highlight === undefined
                    ? {}
                    : { highlight: ui.highlight })}
                  inspect={ui.inspect}
                  onRegion={onRegion}
                  onToken={inspectToken}
                />
              </figure>
            </div>
          </>
        ) : (
          <div className="preview-frame">
            {ui.scenario === "dashboard" ? (
              <DashboardPreview
                tokens={selected.tokens}
                {...(selected.mode === undefined
                  ? {}
                  : { mode: selected.mode })}
                {...(selected.family === undefined
                  ? {}
                  : { family: selected.family })}
                {...(selectedSurface === undefined
                  ? {}
                  : { surface: selectedSurface })}
                source={previewSource}
                {...(ui.highlight === undefined
                  ? {}
                  : { highlight: ui.highlight })}
                inspect={ui.inspect}
                onRegion={onRegion}
                onToken={inspectToken}
              />
            ) : (
              <ThemePreview
                tokens={selected.tokens}
                {...(selected.mode === undefined
                  ? {}
                  : { mode: selected.mode })}
                {...(selected.family === undefined
                  ? {}
                  : { family: selected.family })}
                {...(selectedSurface === undefined
                  ? {}
                  : { surface: selectedSurface })}
                source={previewSource}
                {...(ui.highlight === undefined
                  ? {}
                  : { highlight: ui.highlight })}
                inspect={ui.inspect}
                onRegion={onRegion}
                onToken={inspectToken}
              />
            )}
          </div>
        )}

      </div>

      {ui.saving && selected !== undefined ? (
        <SavePanel
          selected={selected}
          ui={ui}
          dispatch={dispatch}
          onSave={onSave}
          onSerialize={onSerialize}
          onChooseLocation={onChooseLocation}
        />
      ) : null}
    </main>
  );
}
