/**
 * The Studio inspector: tokens, validation and provenance.
 *
 * Every value here came from the host's canonical resolution. The panel can
 * highlight a token, copy a value and open a source position; it cannot change
 * a token or decide that a theme is valid.
 */
import type { Dispatch } from "react";

import type { StudioSelection } from "../../src/shared/studioProtocol";
import {
  ORIGIN_LABEL,
  SOURCE_ORIGIN_LABEL,
  selectionEvidence,
  themeEvidenceLabel,
} from "./labels";
import { TokenEditor } from "./TokenEditor";
import { Icon } from "./ui";
import type { InspectorTab, StudioUiAction, StudioUiState } from "./uiState";

/** The exact TypeScript source the host would write. */
function SourcePanel({
  ui,
  onSource,
}: {
  readonly ui: StudioUiState;
  readonly onSource: () => void;
}): React.JSX.Element {
  return (
    <section className="inspector-panel source-panel">
      <div className="editor-head">
        <div>
          <h3>Draft source</h3>
          <p className="muted small">The exact TypeScript Studio would write. Nothing is saved.</p>
        </div>
        <button type="button" className="compact" onClick={onSource}>
          {ui.fileText === undefined ? "Generate source" : "Refresh source"}
        </button>
      </div>
      {ui.fileText === undefined ? (
        <div className="empty-state small-empty">
          <strong>No source generated yet</strong>
          <p>Generate it to inspect the defineTheme output before saving.</p>
          <button type="button" className="secondary" onClick={onSource}>
            Generate source
          </button>
        </div>
      ) : (
        <pre className="file-preview" aria-label="Exact draft source">
          <code>{ui.fileText}</code>
        </pre>
      )}
      <p className="muted small">
        Edits invalidate this preview. Saving remains a separate host operation.
      </p>
    </section>
  );
}

/** Human-readable direction label. */
function directionLabel(direction: string): string {
  switch (direction) {
    case "foreground-too-light":
      return "Foreground is too light";
    case "foreground-too-dark":
      return "Foreground is too dark";
    case "background-too-light":
      return "Background is too light";
    case "background-too-dark":
      return "Background is too dark";
    default:
      return direction;
  }
}

/** Severity badge class. */
function severityClass(severity: string): string {
  switch (severity) {
    case "near-miss":
      return "severity-near-miss";
    case "moderate":
      return "severity-moderate";
    case "critical":
      return "severity-critical";
    default:
      return "";
  }
}

/** Severity label. */
function severityLabel(severity: string): string {
  switch (severity) {
    case "near-miss":
      return "Near miss";
    case "moderate":
      return "Moderate";
    case "critical":
      return "Critical";
    default:
      return severity;
  }
}

/** Schema issues, contrast failures and multi-level validation, each actionable. */
function ValidationPanel({
  selected,
  dispatch,
}: {
  readonly selected: StudioSelection;
  readonly dispatch: Dispatch<StudioUiAction>;
}): React.JSX.Element {
  const issues = selected.issues ?? [];
  const levelIssues = selected.levelIssues ?? [];
  
  // Collect all contrast failures from all tokens' contrasts arrays.
  const contrastFailures: Array<{
    token: string;
    value: string;
    against: string;
    ratio: number;
    floor: number;
    direction?: string;
    severity?: string;
  }> = [];
  for (const token of selected.tokens) {
    for (const contrast of token.contrasts ?? []) {
      if (!contrast.passes) {
        contrastFailures.push({
          token: token.name,
          value: token.value,
          against: contrast.against,
          ratio: contrast.ratio,
          floor: contrast.floor,
          ...(contrast.direction === undefined ? {} : { direction: contrast.direction }),
          ...(contrast.severity === undefined ? {} : { severity: contrast.severity }),
        });
      }
    }
  }
  
  const structuralIssues = levelIssues.filter((issue) => issue.level === "structural");
  const semanticIssues = levelIssues.filter((issue) => issue.level === "semantic");
  const visualIssues = levelIssues.filter((issue) => issue.level === "visual");
  const accessibilityIssues = levelIssues.filter((issue) => issue.level === "accessibility");
  
  const clean = issues.length === 0 && contrastFailures.length === 0 && levelIssues.length === 0;

  const focusToken = (token: string): void => {
    dispatch({ type: "set-highlight", highlight: token });
    dispatch({ type: "set-inspector", inspector: "tokens" });
  };

  return (
    <section className="inspector-panel validation-panel">
      <div className={`validation-banner ${selected.valid ? (clean ? "ok" : "warn") : "bad"}`}>
        <Icon name={selected.valid && clean ? "check" : "alert"} size={16} />
        <div>
        <strong>
          {selected.valid
            ? clean
              ? "Passes the canonical validator"
              : "Valid · warnings"
            : "Invalid theme"}
        </strong>
        <span>
          {selected.valid
            ? clean
              ? "Every schema rule and evaluated contract pair passes."
              : `${contrastFailures.length + levelIssues.length} issue${contrastFailures.length + levelIssues.length === 1 ? "" : "s"} need attention.`
            : (selected.issue ?? "The canonical validator rejected this theme.")}
        </span>
        </div>
      </div>

      {issues.length > 0 ? (
        <section className="issue-group">
          <h3>Schema</h3>
          <ul className="issue-list">
            {issues.map((issue) => (
              <li key={issue.path ?? issue.message} className="issue-card">
                <p className="bad">{issue.message}</p>
                <div className="issue-meta">
                  {issue.path === undefined ? null : <code className="inline-code">{issue.path}</code>}
                  {issue.token === undefined ? null : (
                    <button type="button" className="badge" onClick={() => focusToken(issue.token!)}>
                      {issue.token}
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {structuralIssues.length > 0 ? (
        <section className="issue-group">
          <h3>Structural</h3>
          <ul className="issue-list">
            {structuralIssues.map((issue, index) => (
              <li key={index} className="issue-card">
                <p className="bad">{issue.message}</p>
                <div className="issue-meta">
                  {issue.path === undefined ? null : <code className="inline-code">{issue.path}</code>}
                  {issue.token === undefined ? null : (
                    <button type="button" className="badge" onClick={() => focusToken(issue.token!)}>
                      {issue.token}
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {contrastFailures.length > 0 ? (
        <section className="issue-group">
          <h3>Contrast</h3>
          <ul className="issue-list">
            {contrastFailures.map((failure, index) => (
              <li key={index} className="issue-card contrast-issue">
                <p>
                  <strong>{failure.token}</strong>
                  <span className="muted"> on </span>
                  <strong>{failure.against}</strong>
                </p>
                <div className="issue-meta">
                  <code className="inline-code">{failure.value}</code>
                  <span className={failure.severity ? severityClass(failure.severity) : "bad"}>
                    {failure.ratio.toFixed(2)}:1 · needs ≥ {failure.floor}:1
                  </span>
                  {failure.severity ? (
                    <span className={`severity-badge ${severityClass(failure.severity)}`}>
                      {severityLabel(failure.severity)}
                    </span>
                  ) : null}
                </div>
                {failure.direction ? (
                  <p className="direction-hint">{directionLabel(failure.direction)}</p>
                ) : null}
                <div className="issue-actions">
                  <button type="button" className="badge" onClick={() => focusToken(failure.token)}>
                    Show token
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {semanticIssues.length > 0 ? (
        <section className="issue-group">
          <h3>Semantic</h3>
          <ul className="issue-list">
            {semanticIssues.map((issue, index) => (
              <li key={index} className="issue-card">
                <p>{issue.message}</p>
                <div className="issue-meta">
                  {issue.path === undefined ? null : <code className="inline-code">{issue.path}</code>}
                  {issue.token === undefined ? null : (
                    <button type="button" className="badge" onClick={() => focusToken(issue.token!)}>
                      {issue.token}
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {visualIssues.length > 0 ? (
        <section className="issue-group">
          <h3>Visual</h3>
          <ul className="issue-list">
            {visualIssues.map((issue, index) => (
              <li key={index} className="issue-card">
                <p>{issue.message}</p>
                <div className="issue-meta">
                  {issue.path === undefined ? null : <code className="inline-code">{issue.path}</code>}
                  {issue.token === undefined ? null : (
                    <button type="button" className="badge" onClick={() => focusToken(issue.token!)}>
                      {issue.token}
                    </button>
                  )}
                  {issue.related?.map((related) => (
                    <button key={related} type="button" className="badge related" onClick={() => focusToken(related)}>
                      {related}
                    </button>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {accessibilityIssues.length > 0 ? (
        <section className="issue-group">
          <h3>Accessibility</h3>
          <ul className="issue-list">
            {accessibilityIssues.map((issue, index) => (
              <li key={index} className="issue-card">
                <p>{issue.message}</p>
                <div className="issue-meta">
                  {issue.path === undefined ? null : <code className="inline-code">{issue.path}</code>}
                  {issue.token === undefined ? null : (
                    <button type="button" className="badge" onClick={() => focusToken(issue.token!)}>
                      {issue.token}
                    </button>
                  )}
                  {issue.related?.map((related) => (
                    <button key={related} type="button" className="badge related" onClick={() => focusToken(related)}>
                      {related}
                    </button>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {clean ? (
        <div className="clean-state">
          <span className="status-dot ok">valid</span>
          <p>No issue needs attention.</p>
        </div>
      ) : null}
    </section>
  );
}

/** One label/value row. */
function DetailRow({ label, children }: { label: string; children: React.ReactNode }): React.JSX.Element {
  return (
    <div className="detail-row">
      <span className="detail-label">{label}</span>
      <span className="detail-value">{children}</span>
    </div>
  );
}

/** Provenance, generation and registration details. */
function DetailsPanel({
  selected,
  onOpen,
}: {
  readonly selected: StudioSelection;
  readonly onOpen: (path: string, location?: { readonly line: number; readonly column: number }) => void;
}): React.JSX.Element {
  return (
    <section className="inspector-panel details-panel">
      <section className="detail-section">
        <h3>Identity</h3>
        <DetailRow label="Origin">{ORIGIN_LABEL[selected.origin]}</DetailRow>
        <DetailRow label="Family">{selected.family ?? "not recorded"}</DetailRow>
        <DetailRow label="Mode">{selected.mode ?? "unknown"}</DetailRow>
        <DetailRow label="Variants">{selected.modes.join(", ") || "unknown"}</DetailRow>
        <DetailRow label="Saved">{selected.saved ? "written to a file" : "not written"}</DetailRow>
        <DetailRow label="Validator">
          <span className={selected.valid ? "ok" : "bad"}>{selected.valid ? "valid" : "invalid"}</span>
        </DetailRow>
      </section>

      <section className="detail-section">
        <h3>Source</h3>
        <DetailRow label="File">
          {selected.source === undefined ? (
            "none — generated in memory"
          ) : (
            <button
              type="button"
              className="link-button"
              onClick={() =>
                onOpen(selected.source!, selected.location === undefined ? undefined : selected.location)
              }
            >
              {selected.source}
            </button>
          )}
        </DetailRow>
        <DetailRow label="Region">{selected.region ?? "not applicable"}</DetailRow>
        <DetailRow label="Position">
          {selected.location === undefined ? "not recorded" : `line ${selected.location.line}`}
        </DetailRow>
        <DetailRow label="Exported as">{selected.binding ?? "not established"}</DetailRow>
        <DetailRow label="Producing API">
          {selected.producingApi === undefined
            ? "not established"
            : (SOURCE_ORIGIN_LABEL[selected.producingApi] ?? selected.producingApi)}
        </DetailRow>
      </section>

      {selected.draftKind === undefined &&
      selected.draftSource === undefined &&
      selected.draftInputs === undefined &&
      selected.generateOptions === undefined ? null : (
        <section className="detail-section">
          <h3>Generation</h3>
          {selected.draftKind === undefined ? null : (
            <DetailRow label="Draft workflow">
              {selected.draftKind === "define" ? "Define theme" : "Generate theme"}
            </DetailRow>
          )}
          {selected.editor?.editable === true ? (
            <DetailRow label="Draft changes">
              {selected.editor.customized
                ? `${selected.editor.changedTokens} value${selected.editor.changedTokens === 1 ? "" : "s"} changed`
                : "matches its original basis"}
            </DetailRow>
          ) : null}
          {selected.draftSource === undefined ? null : (
            <DetailRow label="Based on">{selected.draftSource}</DetailRow>
          )}
          {selected.draftInputs === undefined ? null : (
            <DetailRow label="Draft inputs">
              <span className="chip-row">
                <span>seed <code>{selected.draftInputs.seed ?? "—"}</code></span>
                {selected.draftInputs.family === undefined ? null : (
                  <span>family <code>{selected.draftInputs.family}</code></span>
                )}
                {selected.draftInputs.style === undefined ? null : (
                  <span>style <code>{selected.draftInputs.style}</code></span>
                )}
                {selected.draftInputs.withCode === true ? <span>code tokens</span> : null}
              </span>
            </DetailRow>
          )}
          {selected.generateOptions === undefined ? null : (
            <DetailRow label="Source inputs">
              <span className="chip-row">
                <span>seed <code>{selected.generateOptions.seed}</code></span>
                {selected.generateOptions.family === undefined ? null : (
                  <span>family <code>{selected.generateOptions.family}</code></span>
                )}
                {selected.generateOptions.style === undefined ? null : (
                  <span>style <code>{selected.generateOptions.style}</code></span>
                )}
                {selected.generateOptions.contrast === undefined ? null : (
                  <span>contrast <code>{selected.generateOptions.contrast}</code></span>
                )}
                {selected.generateOptions.algorithm === undefined ? null : (
                  <span>algorithm <code>{selected.generateOptions.algorithm}</code></span>
                )}
                {selected.generateOptions.withCode === true ? <span>code tokens</span> : null}
              </span>
            </DetailRow>
          )}
        </section>
      )}

      <section className="detail-section">
        <h3>Registration</h3>
        <DetailRow label="Evidence">{selectionEvidence(selected)}</DetailRow>
        {selected.evidence !== undefined ? (
          <DetailRow label="Theme state">{themeEvidenceLabel(selected.evidence)}</DetailRow>
        ) : null}
        <DetailRow label="Used by">
          {selected.origin === "preset"
            ? "not applicable — catalog preview"
            : selected.origin === "draft"
              ? selected.draftSource === undefined
                ? "not applicable — generated draft"
                : `based on ${selected.draftSource}; not registered`
              : selected.usedBy === undefined || selected.usedBy.length === 0
                ? "no verified provider traced"
                : (
                    <span className="chip-row">
                      {selected.usedBy.map((path) => (
                        <button key={path} type="button" className="link-button" onClick={() => onOpen(path)}>
                          {path}
                        </button>
                      ))}
                    </span>
                  )}
        </DetailRow>
        <DetailRow label="Active now">
          <span className="muted">not observed — static source analysis</span>
        </DetailRow>
      </section>
    </section>
  );
}

/** Props for the inspector. */
export interface InspectorProps {
  readonly selected: StudioSelection | undefined;
  readonly ui: StudioUiState;
  readonly dispatch: Dispatch<StudioUiAction>;
  readonly onOpen: (path: string, location?: { readonly line: number; readonly column: number }) => void;
  readonly onCopy: (text: string) => void;
  readonly onEditToken: (path: readonly string[], value: string) => void;
  readonly onResetToken: (path: readonly string[]) => void;
  readonly onResetGroup: (group: string) => void;
  readonly onResetDraft: () => void;
  readonly onMode: (mode: string) => void;
  readonly onSource: () => void;
}

/**
 * The inspector.
 *
 * @param props - Selection and actions.
 * @returns The tabbed inspector.
 */
export function Inspector({
  selected,
  ui,
  dispatch,
  onOpen,
  onCopy,
  onEditToken,
  onResetToken,
  onResetGroup,
  onResetDraft,
  onMode,
  onSource,
}: InspectorProps): React.JSX.Element {
  const contrastFailureCount =
    selected?.tokens.reduce((sum, token) => {
      return sum + (token.contrasts?.filter((c) => !c.passes).length ?? 0);
    }, 0) ?? 0;
  const issues = (selected?.issues?.length ?? 0) + contrastFailureCount + (selected?.levelIssues?.length ?? 0);

  const tabs: readonly {
    readonly value: InspectorTab;
    readonly label: string;
    readonly count?: number | undefined;
  }[] = [
    {
      value: "tokens",
      label: "Tokens",
      count: selected?.editor?.totalTokens ?? selected?.tokens.length,
    },
    { value: "validation", label: "Validation", count: issues },
    { value: "details", label: "Details" },
    ...(selected?.origin === "draft" ? [{ value: "source" as const, label: "Source" }] : []),
  ];
  const activeTab = tabs.some((tab) => tab.value === ui.inspector) ? ui.inspector : "tokens";

  return (
    <aside className="inspector" aria-label="Theme inspector">
      <nav className="inspector-tabs" role="tablist" aria-label="Inspector">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            type="button"
            role="tab"
            id={`inspector-tab-${tab.value}`}
            data-tab={tab.value}
            aria-controls="inspector-panel"
            aria-selected={activeTab === tab.value}
            tabIndex={activeTab === tab.value ? 0 : -1}
            onClick={() => dispatch({ type: "set-inspector", inspector: tab.value })}
            onKeyDown={(event) => {
              if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
              event.preventDefault();
              const index = tabs.findIndex((entry) => entry.value === activeTab);
              const next =
                event.key === "ArrowRight"
                  ? tabs[(index + 1) % tabs.length]
                  : tabs[(index - 1 + tabs.length) % tabs.length];
              if (next === undefined) return;
              dispatch({ type: "set-inspector", inspector: next.value });
              requestAnimationFrame(() =>
                document.querySelector<HTMLElement>(`[data-tab="${next.value}"]`)?.focus(),
              );
            }}
          >
            {tab.label}
            {tab.count !== undefined && tab.count > 0 ? <span className="tab-count">{tab.count}</span> : null}
          </button>
        ))}
      </nav>

      <div
        className="inspector-scroll"
        id="inspector-panel"
        role="tabpanel"
        aria-labelledby={`inspector-tab-${activeTab}`}
      >
        {selected === undefined ? (
          <div className="empty-state small-empty">
            <Icon name="layers" size={20} />
            <strong>Nothing selected</strong>
            <p>Pick a theme to inspect its tokens and provenance.</p>
          </div>
        ) : activeTab === "tokens" ? (
          <>
            {selected.source === undefined ? null : (
              <p className="source-hint">
                <button
                  type="button"
                  className="link-button"
                  onClick={() =>
                    onOpen(
                      selected.source!,
                      selected.location === undefined ? undefined : selected.location,
                    )
                  }
                >
                  {selected.source}
                </button>
                {selected.region === undefined ? null : <span className="muted"> · {selected.region}</span>}
                {selected.location === undefined ? null : (
                  <span className="muted"> · line {selected.location.line}</span>
                )}
              </p>
            )}
            <TokenEditor
              selected={selected}
              ui={ui}
              dispatch={dispatch}
              onCopy={onCopy}
              onEdit={onEditToken}
              onResetToken={onResetToken}
              onResetGroup={onResetGroup}
              onResetDraft={onResetDraft}
              onMode={onMode}
            />
          </>
        ) : activeTab === "validation" ? (
          <ValidationPanel selected={selected} dispatch={dispatch} />
        ) : activeTab === "source" ? (
          <SourcePanel ui={ui} onSource={onSource} />
        ) : (
          <DetailsPanel selected={selected} onOpen={onOpen} />
        )}
      </div>
    </aside>
  );
}
