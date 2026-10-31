/**
 * Patch preview dialog.
 *
 * Shows a diff preview of the patch that will be applied, with confirm/cancel actions.
 */
import { useRef, type Dispatch } from "react";

import type { StudioPatchProposal } from "../../src/shared/studioProtocol";
import { Icon, useFocusTrap } from "./ui";
import type { StudioUiAction, StudioUiState } from "./uiState";

export interface PatchPreviewDialogProps {
  readonly patch: StudioPatchProposal;
  readonly ui: StudioUiState;
  readonly dispatch: Dispatch<StudioUiAction>;
  readonly onApply: (patch: StudioPatchProposal) => void;
}

/**
 * The patch preview dialog.
 *
 * @param props - The dialog props.
 * @returns The dialog component.
 */
export function PatchPreviewDialog({
  patch,
  dispatch,
  onApply,
}: PatchPreviewDialogProps): React.JSX.Element {
  const dialogRef = useRef<HTMLElement>(null);
  useFocusTrap(dialogRef);

  const handleClose = (): void => {
    dispatch({ type: "close-patch-preview" });
  };

  const handleApply = (): void => {
    onApply(patch);
    dispatch({ type: "close-patch-preview" });
  };

  return (
    <div className="modal-scrim" onClick={handleClose}>
      <section
        ref={dialogRef}
        className="modal patch-preview-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="patch-dialog-title"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.stopPropagation();
            handleClose();
          }
        }}
      >
        <header className="modal-head">
          <div>
            <h2 id="patch-dialog-title">Preview patch</h2>
            <p className="muted">{patch.description}</p>
          </div>
          <button
            type="button"
            className="icon-button"
            onClick={handleClose}
            aria-label="Close"
            title="Close"
          >
            <Icon name="close" />
          </button>
        </header>

        <div className="modal-body">
          <div className="chip-row">
            <span className={`chip ${patch.action === "create" ? "ok" : "warn"}`}>
              {patch.action === "create" ? "Create file" : "Update file"}
            </span>
            <span className="chip mono ellipsis" title={patch.path}>
              {patch.path}
            </span>
          </div>

          <div className="patch-diff">
            <span className="overline">Changes</span>
            {patch.action === "create" ? (
              <pre className="file-preview">
                <code>{patch.updated}</code>
              </pre>
            ) : (
              <div className="diff-update">
                <div className="diff-section">
                  <span className="overline">Original</span>
                  <pre className="file-preview">
                    <code>{patch.original || "(empty file)"}</code>
                  </pre>
                </div>
                <div className="diff-section">
                  <span className="overline">Updated</span>
                  <pre className="file-preview">
                    <code>{patch.updated}</code>
                  </pre>
                </div>
              </div>
            )}
          </div>

          {patch.generatedCode.imports.length > 0 && (
            <div className="patch-imports">
              <span className="overline">Imports to be added</span>
              <ul>
                {patch.generatedCode.imports.map((imp, idx) => (
                  <li key={idx}>
                    <code>{imp}</code>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <footer className="modal-foot">
          <span className="modal-foot-note mono" title={patch.path}>
            {patch.path}
          </span>
          <button type="button" className="ghost" onClick={handleClose}>
            Cancel
          </button>
          <button type="button" className="cta" onClick={handleApply}>
            Apply patch
          </button>
        </footer>
      </section>
    </div>
  );
}
