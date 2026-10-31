/**
 * The grouped Define token editor.
 *
 * Groups, token types and labels come from the host's schema-derived editor
 * model. The component can request an edit or a reset; it never mutates a theme,
 * validates a value or writes a file.
 */
import { useEffect, useMemo, useState, type Dispatch } from "react";

import type {
  StudioEditorGroup,
  StudioEditorToken,
  StudioSelection,
} from "../../src/shared/studioProtocol";
import { regionById, regionsUsingToken } from "./previewMap";
import {
  editorTokenKey,
  filterEditorGroups,
  groupSwatches,
  opaqueHex,
  presenceLabel,
} from "./tokenEditorModel";
import { Icon, Segmented } from "./ui";
import type { StudioUiAction, StudioUiState } from "./uiState";

/** Props shared by the editor rows. */
interface EditorActions {
  readonly onCopy: (text: string) => void;
  readonly onEdit: (path: readonly string[], value: string) => void;
  readonly onResetToken: (path: readonly string[]) => void;
}

/**
 * The compact contrast summary.
 *
 * @param token - The token.
 * @returns The ratio or an explicit no-pair marker.
 */
function contrastSummary(token: StudioEditorToken): React.JSX.Element {
  const first = token.contrasts[0];
  if (first === undefined) {
    return (
      <span className="contrast-pill na" title="No evaluated contrast pair">
        —
      </span>
    );
  }
  return (
    <span
      className={`contrast-pill ${first.passes ? "ok" : first.severity === "near-miss" ? "warn" : "bad"}`}
      title={`${first.ratio.toFixed(2)}:1 against ${first.against} · floor ${first.floor}:1`}
    >
      {first.ratio.toFixed(2)}
    </span>
  );
}

/**
 * One editable row.
 *
 * @param props - Token, expansion and actions.
 * @returns The row.
 */
function EditorRow({
  token,
  expanded,
  selected,
  editable,
  onToggle,
  onSelect,
  onCopy,
  onEdit,
  onResetToken,
}: {
  readonly token: StudioEditorToken;
  readonly expanded: boolean;
  readonly selected: boolean;
  readonly editable: boolean;
  readonly onToggle: () => void;
  readonly onSelect: () => void;
  readonly onCopy: (text: string) => void;
  readonly onEdit: (path: readonly string[], value: string) => void;
  readonly onResetToken: (path: readonly string[]) => void;
}): React.JSX.Element {
  const current = token.value ?? "";
  const [draft, setDraft] = useState(current);
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    setDraft(current);
  }, [current]);

  const canEdit = editable && token.presentInSelected;
  const changedInput = draft !== current;
  const picker = opaqueHex(draft);
  const key = editorTokenKey(token.path);
  const usage =
    token.previewKey === undefined ? [] : regionsUsingToken(token.previewKey);

  const commit = (): void => {
    if (!canEdit || !changedInput || draft.trim().length === 0) return;
    onEdit(token.path, draft);
  };

  return (
    <li
      className={`editor-token${expanded ? " expanded" : ""}${selected ? " selected" : ""}`}
      data-token-key={key}
    >
      <div className="editor-token-head">
        <button
          type="button"
          className="editor-token-main"
          aria-expanded={expanded}
          onClick={() => {
            onSelect();
            onToggle();
          }}
        >
          {token.type === "color" ? (
            <span
              className="token-chip"
              style={
                token.value === undefined
                  ? undefined
                  : { background: token.value }
              }
              aria-hidden="true"
            />
          ) : (
            <span className="token-chip token-type" aria-hidden="true">
              {token.type === "number" ? "#" : "T"}
            </span>
          )}
          <span className="editor-token-name">
            <span className="editor-token-label">{token.name}</span>
            <span className="editor-token-sub">
              {token.label}
              {token.optional ? " · optional" : ""}
            </span>
          </span>
          <span className="editor-flags">
            {token.changed ? (
              <span className="changed-dot" title="Modified" />
            ) : null}
            {token.issue === undefined ? null : (
              <span className="issue-dot" title={token.issue} />
            )}
          </span>
          <code className="editor-token-value">
            {token.value === undefined ? "not set" : token.value}
          </code>
          {contrastSummary(token)}
        </button>
        <span className="row-actions">
          {token.value === undefined ? null : (
            <button
              type="button"
              className="icon-button"
              title="Copy value"
              aria-label={`Copy ${token.name}`}
              onClick={() => onCopy(token.value!)}
            >
              <Icon name="copy" size={14} />
            </button>
          )}
          {token.cssVar === undefined ? null : (
            <button
              type="button"
              className="icon-button"
              title={`Copy ${token.cssVar}: ${token.value};`}
              aria-label={`Copy ${token.name} as CSS`}
              onClick={() => onCopy(`${token.cssVar}: ${token.value};`)}
            >
              <Icon name="braces" size={14} />
            </button>
          )}
        </span>
      </div>

      {expanded ? (
        <div className="editor-token-body">
          <div className="editor-meta">
            <span className="badge muted">{presenceLabel(token)}</span>
            {token.optional ? (
              <span className="badge muted">optional</span>
            ) : null}
            {token.changed && token.original !== undefined ? (
              <span className="badge warn">
                was <code>{token.original}</code>
              </span>
            ) : null}
            {token.issue === undefined ? null : (
              <span className="bad small">{token.issue}</span>
            )}
          </div>

          {!editable ? (
            <p className="muted small">
              Read-only. Create a draft to edit this token.
            </p>
          ) : token.presentInSelected ? (
            <div className="editor-controls">
              {token.type === "color" ? (
                <div className="color-controls">
                  <span
                    className="color-preview"
                    style={{ background: token.value ?? "transparent" }}
                    aria-hidden="true"
                  />
                  {picker === undefined ? null : (
                    <button
                      type="button"
                      className="picker-toggle"
                      aria-expanded={pickerOpen}
                      onClick={() => setPickerOpen((open) => !open)}
                    >
                      Picker
                    </button>
                  )}
                  {picker !== undefined && pickerOpen ? (
                    <input
                      type="color"
                      value={picker}
                      aria-label={`${token.name} colour picker`}
                      onChange={(event) => {
                        const next = event.target.value;
                        setDraft(next);
                        onEdit(token.path, next);
                      }}
                    />
                  ) : null}
                  <input
                    className="token-input"
                    value={draft}
                    aria-label={`${token.name} value`}
                    spellCheck={false}
                    onChange={(event) => setDraft(event.target.value)}
                    onBlur={commit}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        commit();
                      }
                      if (event.key === "Escape") {
                        event.preventDefault();
                        setDraft(current);
                      }
                    }}
                  />
                </div>
              ) : (
                <input
                  className="token-input"
                  value={draft}
                  inputMode={token.type === "number" ? "numeric" : "text"}
                  aria-label={`${token.name} value`}
                  spellCheck={false}
                  onChange={(event) => setDraft(event.target.value)}
                  onBlur={commit}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      commit();
                    }
                    if (event.key === "Escape") {
                      event.preventDefault();
                      setDraft(current);
                    }
                  }}
                />
              )}
              <button
                type="button"
                className="compact"
                disabled={!changedInput || draft.trim().length === 0}
                onClick={commit}
              >
                Apply
              </button>
              <button
                type="button"
                className="compact"
                disabled={!changedInput}
                onClick={() => setDraft(current)}
              >
                Discard
              </button>
              {token.changed ? (
                <button
                  type="button"
                  className="compact"
                  onClick={() => onResetToken(token.path)}
                >
                  Reset token
                </button>
              ) : null}
            </div>
          ) : (
            <p className="muted small">
              This token is not set in the selected mode. Switch modes to edit
              it.
            </p>
          )}

          <div className="editor-details">
            <div>
              <span className="detail-label">Contrast</span>
              {token.contrasts.length === 0 ? (
                <span className="muted small"> — no evaluated pair</span>
              ) : (
                <ul className="token-contrasts">
                  {token.contrasts.map((pair) => (
                    <li key={`${pair.against}:${pair.requirement}`}>
                      <span className={pair.passes ? "ok" : "bad"}>
                        {pair.ratio.toFixed(2)}:1
                      </span>
                      <span className="muted"> on {pair.against}</span>
                      <span className="muted small">
                        {" "}
                        · {pair.requirement} floor {pair.floor}:1
                      </span>
                      {pair.severity ? (
                        <span
                          className={`severity-badge severity-${pair.severity}`}
                        >
                          {pair.severity === "near-miss"
                            ? "Near miss"
                            : pair.severity === "moderate"
                              ? "Moderate"
                              : "Critical"}
                        </span>
                      ) : null}
                      {pair.direction ? (
                        <span className="direction-hint small">
                          {" "}
                          {pair.direction === "foreground-too-light"
                            ? "(foreground too light)"
                            : pair.direction === "foreground-too-dark"
                              ? "(foreground too dark)"
                              : pair.direction === "background-too-light"
                                ? "(background too light)"
                                : "(background too dark)"}
                        </span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <span className="detail-label">Preview</span>
              {usage.length === 0 ? (
                <span className="muted small">
                  {" "}
                  no meaningful preview mapping
                </span>
              ) : (
                <span className="muted small">
                  {" "}
                  highlights {usage.map((region) => region.label).join(", ")}
                </span>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </li>
  );
}

/**
 * One collapsible schema group.
 *
 * @param props - Group, expansion and actions.
 * @returns The group.
 */
function TokenGroup({
  group,
  open,
  editable,
  expandedToken,
  highlight,
  actions,
  onToggle,
  onExpand,
  onSelect,
  onResetGroup,
}: {
  readonly group: StudioEditorGroup;
  readonly open: boolean;
  readonly editable: boolean;
  readonly expandedToken: string | undefined;
  readonly highlight: string | undefined;
  readonly actions: EditorActions;
  readonly onToggle: () => void;
  readonly onExpand: (key: string | undefined) => void;
  readonly onSelect: (token: StudioEditorToken) => void;
  readonly onResetGroup: () => void;
}): React.JSX.Element {
  const swatches = groupSwatches(group);

  return (
    <section className="token-group">
      <div className="token-group-head">
        <button
          type="button"
          className="token-group-toggle"
          aria-expanded={open}
          onClick={onToggle}
        >
          <span className="overline">
            {group.label} · {group.tokens.length}
          </span>
          {group.issueCount > 0 ? (
            <span className="badge bad">{group.issueCount}</span>
          ) : null}
          {group.changedCount > 0 ? (
            <span className="badge warn">{group.changedCount} changed</span>
          ) : null}
          <span className="group-swatches" aria-hidden="true">
            {swatches.map((color, index) => (
              <span key={`${color}:${index}`} style={{ background: color }} />
            ))}
          </span>
          <span className="group-chevron">
            <Icon name={open ? "chevronDown" : "chevronRight"} size={14} />
          </span>
        </button>
        {editable && group.changedCount > 0 ? (
          <button type="button" className="compact" onClick={onResetGroup}>
            Reset group
          </button>
        ) : null}
      </div>
      {open ? (
        <ul className="editor-token-list">
          {group.tokens.map((token) => (
            <EditorRow
              key={editorTokenKey(token.path)}
              token={token}
              expanded={expandedToken === editorTokenKey(token.path)}
              selected={
                highlight !== undefined &&
                (token.previewKey === highlight || token.name === highlight)
              }
              editable={editable}
              onToggle={() =>
                onExpand(
                  expandedToken === editorTokenKey(token.path)
                    ? undefined
                    : editorTokenKey(token.path),
                )
              }
              onSelect={() => onSelect(token)}
              onCopy={actions.onCopy}
              onEdit={actions.onEdit}
              onResetToken={actions.onResetToken}
            />
          ))}
        </ul>
      ) : null}
    </section>
  );
}

/** Props for the token editor. */
export interface TokenEditorProps {
  readonly selected: StudioSelection;
  readonly ui: StudioUiState;
  readonly dispatch: Dispatch<StudioUiAction>;
  readonly onCopy: (text: string) => void;
  readonly onEdit: (path: readonly string[], value: string) => void;
  readonly onResetToken: (path: readonly string[]) => void;
  readonly onResetGroup: (group: string) => void;
  readonly onResetDraft: () => void;
  readonly onMode: (mode: string) => void;
}

/**
 * The token editor.
 *
 * @param props - Selection, UI state and host actions.
 * @returns The grouped editor.
 */
export function TokenEditor({
  selected,
  ui,
  dispatch,
  onCopy,
  onEdit,
  onResetToken,
  onResetGroup,
  onResetDraft,
  onMode,
}: TokenEditorProps): React.JSX.Element {
  const editor = selected.editor;
  const [query, setQuery] = useState("");
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set());
  const [expandedToken, setExpandedToken] = useState<string | undefined>(
    undefined,
  );

  const filtered = useMemo(
    () =>
      editor === undefined ? [] : filterEditorGroups(editor.groups, query),
    [editor, query],
  );

  const allTokens = useMemo(
    () =>
      editor === undefined
        ? []
        : editor.groups.flatMap((group) => group.tokens),
    [editor],
  );
  const previewRegion = regionById(ui.previewRegion);
  const previewTokens =
    previewRegion === undefined
      ? []
      : previewRegion.tokens.map((token) =>
          allTokens.find((entry) => entry.previewKey === token),
        );

  // Selecting from Validation focuses the matching row if it has a source.
  useEffect(() => {
    if (ui.highlight === undefined) return;
    const match =
      allTokens.find((token) => token.previewKey === ui.highlight) ??
      allTokens.find((token) => token.name === ui.highlight);
    if (match === undefined) return;

    setCollapsed((current) => {
      if (!current.has(match.group)) return current;
      const next = new Set(current);
      next.delete(match.group);
      return next;
    });
    const key = editorTokenKey(match.path);
    setExpandedToken(key);
    const frame = requestAnimationFrame(() => {
      const row = [...document.querySelectorAll("[data-token-key]")].find(
        (element) => element.getAttribute("data-token-key") === key,
      );
      row?.scrollIntoView({ block: "nearest" });
    });
    return () => cancelAnimationFrame(frame);
  }, [ui.highlight, allTokens]);

  if (editor === undefined) {
    return (
      <div className="empty-state small-empty">
        <strong>No token metadata</strong>
        <p>The host did not provide an editor model for this selection.</p>
      </div>
    );
  }

  const selectToken = (token: StudioEditorToken): void => {
    dispatch({
      type: "set-highlight",
      ...(token.previewKey === undefined
        ? { highlight: undefined }
        : { highlight: token.previewKey }),
    });
  };

  return (
    <section className="inspector-panel token-editor">
      {previewRegion === undefined ? null : (
        <div className="preview-usage">
          <div className="preview-usage-head">
            <strong>Preview · {previewRegion.label}</strong>
            <button
              type="button"
              className="icon-button"
              aria-label="Clear preview selection"
              onClick={() => dispatch({ type: "set-preview-region" })}
            >
              ×
            </button>
          </div>
          <p className="muted small">This element renders with:</p>
          <div className="chip-row">
            {previewTokens.map((token, index) =>
              token === undefined ? (
                <code className="inline-code" key={`missing:${index}`}>
                  {previewRegion.tokens[index]}
                </code>
              ) : (
                <button
                  key={editorTokenKey(token.path)}
                  type="button"
                  className="badge action"
                  onClick={() =>
                    dispatch({
                      type: "set-highlight",
                      highlight: token.previewKey,
                    })
                  }
                >
                  {token.name}
                </button>
              ),
            )}
          </div>
        </div>
      )}

      <div className="editor-head">
        <p className="editor-meta-line">
          {editor.totalTokens} tokens · {editor.groups.length} groups ·{" "}
          {editor.editable ? (
            `${editor.changedTokens} changed`
          ) : (
            <span title="Read-only selection. Copy it into a draft to edit its tokens.">
              read-only
            </span>
          )}
        </p>
        <div className="editor-head-actions">
          {editor.editable && editor.customized ? (
            <button
              type="button"
              className="ghost compact"
              onClick={onResetDraft}
            >
              Reset draft
            </button>
          ) : null}
          {editor.modes.length > 1 ? (
            <Segmented
              label="Token mode"
              size="sm"
              className="caps"
              value={selected.mode}
              options={editor.modes.map((mode) => ({
                value: mode,
                label: mode,
              }))}
              onChange={onMode}
            />
          ) : null}
        </div>
      </div>

      <label className="search-field">
        <Icon name="search" size={14} />
        <input
          type="search"
          value={query}
          placeholder="Search tokens…"
          aria-label="Search tokens"
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>

      {filtered.length === 0 ? (
        <div className="empty-state small-empty">
          <Icon name="search" size={20} />
          <strong>No token matches</strong>
          <p>Try a role name, group or label.</p>
        </div>
      ) : (
        filtered.map((group) => (
          <TokenGroup
            key={group.id}
            group={group}
            open={query.length > 0 || !collapsed.has(group.id)}
            editable={editor.editable}
            expandedToken={expandedToken}
            highlight={ui.highlight}
            actions={{ onCopy, onEdit, onResetToken }}
            onToggle={() =>
              setCollapsed((current) => {
                const next = new Set(current);
                if (next.has(group.id)) next.delete(group.id);
                else next.add(group.id);
                return next;
              })
            }
            onExpand={setExpandedToken}
            onSelect={selectToken}
            onResetGroup={() => onResetGroup(group.id)}
          />
        ))
      )}
    </section>
  );
}
