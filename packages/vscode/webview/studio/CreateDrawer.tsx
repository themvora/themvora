/**
 * The Create drawer: four entry points and a live generated preview.
 *
 * Nothing is written or installed until the user chooses Create. For Generate
 * and Define, every input change is sent to the host, which generates, resolves,
 * validates and returns a preview. The webview never calls core itself.
 */
import { useEffect, useRef, useState, type Dispatch } from "react";
import { createPortal } from "react-dom";

import type { StudioPreset, StudioTheme } from "../../src/shared/studioProtocol";
import { presetRegistration, type PresetRegistration } from "./presetEvidence";
import { seedContrast, wcagLevel } from "./colorMath";
import type { ThemeFamilyView } from "./themeGroups";
import { DashboardPreview } from "./DashboardPreview";
import { Icon, Segmented, SwatchDots, useFocusTrap } from "./ui";
import type { DraftPreviewState, StudioUiAction, StudioUiState } from "./uiState";

/** Curated harmonic seeds for 1-click priming. */
const QUICK_SEEDS: readonly { readonly name: string; readonly hex: string }[] = [
  { name: "Indigo", hex: "#4F46E5" },
  { name: "Berry", hex: "#EC4899" },
  { name: "Emerald", hex: "#10B981" },
  { name: "Amber", hex: "#F59E0B" },
  { name: "Cyan", hex: "#06B6D4" },
  { name: "Violet", hex: "#8B5CF6" },
  { name: "Rose", hex: "#F43F5E" },
  { name: "Slate", hex: "#64748B" },
];

/** The generation inputs sent to the host for a live preview. */
export interface GenerationPreviewInput {
  readonly seed: string;
  readonly kind: "generate" | "define";
  readonly family?: string;
  readonly style?: string;
  readonly withCode: boolean;
}

/** Props for the Create drawer. */
export interface CreateDrawerProps {
  readonly ui: StudioUiState;
  readonly styles: readonly string[];
  readonly presets: readonly StudioPreset[];
  /**
   * Every project theme row.
   *
   * The preset list joins each catalog entry to these, so a row can say whether
   * the project already includes that preset. The rows carry the origin and the
   * evidence the source graph produced; nothing is re-scanned here.
   */
  readonly themes: readonly StudioTheme[];
  readonly projectFamilies: readonly ThemeFamilyView[];
  readonly preview: DraftPreviewState | undefined;
  readonly dispatch: Dispatch<StudioUiAction>;
  readonly onPreview: (input: GenerationPreviewInput) => void;
  readonly onCreate: () => void;
  readonly onStartPreset: (id: string) => void;
  readonly onStartExisting: (theme: StudioTheme) => void;
}

/**
 * The registration chip on a preset row.
 *
 * Colour carries the strength of the evidence — green traced to a consumer,
 * violet included in a collection, amber partial, neutral otherwise — and the
 * tooltip carries the sentence, because the row has no room for one.
 *
 * @param props - The verdict for one preset.
 * @returns The chip.
 */
function PresetStatus({
  registration,
}: {
  readonly registration: PresetRegistration;
}): React.JSX.Element {
  const tone =
    registration.status === "registered"
      ? " ok"
      : registration.status === "included"
        ? " accent"
        : registration.status === "partial"
          ? " warn"
          : " quiet";
  return (
    <span className={`pill${tone} preset-status`} title={registration.detail}>
      {registration.label}
    </span>
  );
}

/** One entry point card. */
function EntryCard({
  active,
  title,
  detail,
  onPick,
}: {
  readonly active: boolean;
  readonly title: string;
  readonly detail: string;
  readonly onPick: () => void;
}): React.JSX.Element {
  return (
    <button
      type="button"
      className={`method-card${active ? " active" : ""}`}
      aria-pressed={active}
      onClick={onPick}
    >
      <strong>{title}</strong>
      <span>{detail}</span>
    </button>
  );
}

/**
 * The dual-input seed control.
 *
 * A visual spectrum swatch and a typed HEX field are bound to the same value:
 * dragging the native colour picker updates the text immediately, and typing a
 * sanitized `#rrggbb` moves the swatch in lockstep. Quick palette swatches prime
 * the seed in one click, and the contrast HUD rates it against the two surfaces
 * the generator guarantees (`#ffffff`, `#0e1117`).
 */
function SeedInput({
  ui,
  dispatch,
}: {
  readonly ui: StudioUiState;
  readonly dispatch: Dispatch<StudioUiAction>;
}): React.JSX.Element {
  const hex = /^#([0-9a-f]{3}){1,2}$/iu.exec(ui.seed)?.[0];
  const picker = hex !== undefined && hex.length >= 7 ? hex : undefined;
  const ratio = seedContrast(ui.seed);
  const level = ratio === null ? undefined : wcagLevel(ratio);
  const tone = level === "Fail" ? "bad" : level === "AA Large" ? "warn" : "ok";

  return (
    <div className="seed-input">
      <div className="seed-row">
        <span className="seed-swatch">
          <input
            type="color"
            className="seed-spectrum"
            value={picker ?? "#4f46e5"}
            aria-label="Visual colour spectrum picker"
            title="Click to open the visual spectrum picker"
            onChange={(event) => dispatch({ type: "set-seed", seed: event.target.value })}
          />
        </span>
        <input
          className="seed-hex mono"
          value={ui.seed}
          onChange={(event) =>
            dispatch({
              type: "set-seed",
              seed: event.target.value.startsWith("#")
                ? event.target.value.toUpperCase()
                : `#${event.target.value.toUpperCase()}`,
            })
          }
          placeholder="#4F46E5"
          maxLength={7}
          aria-label="Primary seed colour"
          aria-describedby="seed-hint"
          spellCheck={false}
          autoFocus
        />
        <div className="seed-contrast" aria-live="polite" title="WCAG contrast against the generator's reference surfaces">
          {ratio === null || level === undefined ? (
            <span className="muted">enter #rrggbb</span>
          ) : (
            <>
              <strong className={`mono ${tone}`}>{ratio.toFixed(1)}:1</strong>
              <span className={`pill ${tone}`}>{level}</span>
            </>
          )}
        </div>
      </div>

      <div className="quick-swatches" role="group" aria-label="Quick palette swatches">
        {QUICK_SEEDS.map((seed) => (
          <button
            key={seed.hex}
            type="button"
            className={`quick-swatch${ui.seed.toUpperCase() === seed.hex ? " active" : ""}`}
            title={seed.name}
            aria-label={`Seed with ${seed.name}`}
            aria-pressed={ui.seed.toUpperCase() === seed.hex}
            onClick={() => dispatch({ type: "set-seed", seed: seed.hex })}
          >
            <span className="quick-swatch-dot" style={{ background: seed.hex }} />
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * The live preview block.
 *
 * @param props - The preview and mode control.
 * @returns The preview, loading or error state.
 */
function LivePreview({
  preview,
  ui,
  dispatch,
}: {
  readonly preview: DraftPreviewState | undefined;
  readonly ui: StudioUiState;
  readonly dispatch: Dispatch<StudioUiAction>;
}): React.JSX.Element {
  const [open, setOpen] = useState(false);

  if (preview === undefined) {
    return <div className="live-preview-placeholder">Waiting for inputs…</div>;
  }

  if (preview.pending) {
    return (
      <div className="live-preview-placeholder skeleton-shimmer" aria-busy="true">
        Generating and validating…
      </div>
    );
  }

  if (!preview.result.ok) {
    return (
      <div className="live-preview-error" role="status">
        <Icon name="alert" size={16} />
        <div>
          <strong>Cannot generate this theme</strong>
          <p>{preview.result.message}</p>
        </div>
      </div>
    );
  }

  const live = preview.result.preview;
  const variant = live.variants.find((entry) => entry.mode === ui.draftMode) ?? live.variants[0];
  const evaluated = variant?.tokens.filter((token) => token.contrasts !== undefined && token.contrasts.length > 0) ?? [];
  const passing = evaluated.filter((token) => token.contrasts?.every((c) => c.passes)).length;

  return (
    <div className="live-preview">
      <div className="live-preview-head">
        <span className="live-dot-label">
          <span className="live-dot" aria-hidden="true" />
          Live preview · not saved
        </span>
        {live.modes.length > 1 ? (
          <Segmented
            label="Preview mode"
            size="sm"
            className="caps"
            value={variant?.mode}
            options={live.modes.map((mode) => ({ value: mode, label: mode }))}
            onChange={(mode) => dispatch({ type: "set-draft-mode", mode })}
          />
        ) : null}
      </div>
      {variant === undefined ? (
        <div className="live-preview-error">The generated pair has no variants.</div>
      ) : (
        <>
          <div className="drawer-preview">
            <DashboardPreview
              compact
              tokens={variant.tokens}
              mode={variant.mode}
              {...(variant.surface === undefined ? {} : { surface: variant.surface })}
              {...(live.family === undefined ? {} : { family: live.family })}
            />
            <span className="drawer-preview-fade" aria-hidden="true" />
            <button
              type="button"
              className="drawer-preview-open"
              onClick={() => setOpen(true)}
            >
              <Icon name="eye" size={14} />
              Open full preview
            </button>
          </div>
          {open ? createPortal(
            <div
              className="preview-lightbox"
              role="dialog"
              aria-modal="true"
              aria-label="Theme preview"
              onClick={() => setOpen(false)}
            >
              <div
                className="preview-lightbox-body"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="preview-lightbox-head">
                  <strong>{live.name}</strong>
                  {live.modes.length > 1 ? (
                    // The same control, bound to the same state, as the strip in
                    // the drawer: switching here switches there, because both
                    // read `ui.draftMode`. A lightbox with no way to see the
                    // other half of the pair makes you close it to compare.
                    <Segmented
                      label="Preview mode"
                      size="sm"
                      className="caps"
                      value={variant.mode}
                      options={live.modes.map((mode) => ({ value: mode, label: mode }))}
                      onChange={(mode) => dispatch({ type: "set-draft-mode", mode })}
                    />
                  ) : (
                    <span className="muted">{variant.mode}</span>
                  )}
                  <button
                    type="button"
                    className="icon-button bordered"
                    aria-label="Close preview"
                    autoFocus
                    onClick={() => setOpen(false)}
                  >
                    <Icon name="close" />
                  </button>
                </div>
                <div className="preview-lightbox-scroll">
                  <DashboardPreview
                    tokens={variant.tokens}
                    mode={variant.mode}
                    {...(variant.surface === undefined ? {} : { surface: variant.surface })}
                    {...(live.family === undefined ? {} : { family: live.family })}
                  />
                </div>
              </div>
            </div>,
            document.body,
          ) : null}
          <p className="live-preview-summary">
            <strong>{live.name}</strong>
            <span className={`pill ${live.valid ? "ok" : "bad"}`}>{live.valid ? "valid" : "invalid"}</span>
            <span className="muted">
              {variant.tokens.length} roles · contrast {evaluated.length === 0 ? "—" : `${passing}/${evaluated.length}`}
            </span>
          </p>
          {live.issue === undefined ? null : <p className="bad small">{live.issue}</p>}
        </>
      )}
    </div>
  );
}

/**
 * The drawer.
 *
 * @param props - Form state, preview and actions.
 * @returns The drawer.
 */
export function CreateDrawer({
  ui,
  styles,
  presets,
  themes,
  projectFamilies,
  preview,
  dispatch,
  onPreview,
  onCreate,
  onStartPreset,
  onStartExisting,
}: CreateDrawerProps): React.JSX.Element {
  const drawer = useRef<HTMLDivElement>(null);
  useFocusTrap(drawer);
  const generationEntry = ui.createEntry === "generate" || ui.createEntry === "define";
  const live = preview !== undefined && !preview.pending && preview.result.ok
    ? preview.result.preview
    : undefined;

  // A new pair may not contain the mode currently selected in the drawer.
  useEffect(() => {
    if (live === undefined || live.modes.length === 0) return;
    if (live.modes.includes(ui.draftMode)) return;
    dispatch({ type: "set-draft-mode", mode: live.modes[0]! });
  }, [live, ui.draftMode, dispatch]);

  useEffect(() => {
    if (!ui.creating || !generationEntry) return;
    const timer = window.setTimeout(() => {
      onPreview({
        seed: ui.seed,
        kind: ui.createEntry === "define" ? "define" : "generate",
        ...(ui.family.trim().length === 0 ? {} : { family: ui.family.trim() }),
        ...(ui.style.length === 0 ? {} : { style: ui.style }),
        withCode: ui.withCode,
      });
    }, 250);
    return () => window.clearTimeout(timer);
  }, [ui.creating, generationEntry, ui.seed, ui.family, ui.style, ui.withCode, onPreview]);

  const canCreate = live?.valid === true && preview?.pending !== true;
  const close = (): void => dispatch({ type: "close-create" });

  return (
    <div className="drawer-scrim" onClick={close}>
      <div
        ref={drawer}
        className="drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="drawer-head">
          <div>
            <h2 id="drawer-title">New theme</h2>
            <p className="muted">Nothing is written until you save. Drafts stay in memory.</p>
          </div>
          <button type="button" className="icon-button bordered" aria-label="Close" onClick={close}>
            <Icon name="close" />
          </button>
        </div>

        <div className="drawer-body">
          <div className="method-cards" role="group" aria-label="Create workflow">
            <EntryCard
              active={ui.createEntry === "generate"}
              title="Generate"
              detail="From a seed"
              onPick={() => dispatch({ type: "set-create-entry", entry: "generate" })}
            />
            <EntryCard
              active={ui.createEntry === "define"}
              title="Define"
              detail="Literal"
              onPick={() => dispatch({ type: "set-create-entry", entry: "define" })}
            />
            <EntryCard
              active={ui.createEntry === "preset"}
              title="Preset"
              detail="Copy catalog"
              onPick={() => dispatch({ type: "set-create-entry", entry: "preset" })}
            />
            <EntryCard
              active={ui.createEntry === "existing"}
              title="Existing"
              detail="Copy project"
              onPick={() => dispatch({ type: "set-create-entry", entry: "existing" })}
            />
          </div>

          {generationEntry ? (
            <>
              <div className="field">
                <span className="overline">Primary seed</span>
                <SeedInput ui={ui} dispatch={dispatch} />
              </div>
              <div className="field-grid">
                <label className="field">
                  <span className="overline">Family</span>
                  <input
                    value={ui.family}
                    onChange={(event) => dispatch({ type: "set-family", family: event.target.value })}
                    placeholder="generated"
                  />
                </label>
                <label className="field">
                  <span className="overline">Style</span>
                  <select
                    value={ui.style}
                    onChange={(event) => dispatch({ type: "set-style", style: event.target.value })}
                  >
                    <option value="">Core default</option>
                    {styles.map((entry) => (
                      <option key={entry} value={entry}>
                        {entry.replace(/-/gu, " ")}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={ui.withCode}
                  onChange={(event) => dispatch({ type: "set-with-code", withCode: event.target.checked })}
                />
                <span>Include code-highlighting tokens</span>
              </label>

              <LivePreview preview={preview} ui={ui} dispatch={dispatch} />
            </>
          ) : null}

          {ui.createEntry === "preset" ? (
            presets.length === 0 ? (
              <p className="empty-state small-empty">The catalog is still loading.</p>
            ) : (
              <ul className="pick-list">
                {presets.map((preset) => {
                  const registration = presetRegistration(preset, themes);
                  return (
                    <li key={preset.id}>
                      <button
                        type="button"
                        className="pick-item"
                        title={registration.detail}
                        onClick={() => onStartPreset(preset.id)}
                      >
                        <SwatchDots colors={preset.swatches} />
                        <span className="pick-copy">
                          <strong>{preset.label}</strong>
                          <span className="muted">
                            {preset.kind} · {preset.modes.join(" / ")}
                            {registration.sources.length === 0 ? "" : ` · ${registration.sources[0]}`}
                          </span>
                        </span>
                        <PresetStatus registration={registration} />
                        <Icon name="chevronRight" size={14} />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )
          ) : null}

          {ui.createEntry === "existing" ? (
            projectFamilies.length === 0 ? (
              <p className="empty-state small-empty">
                No project-defined theme to copy. Use Generate or a preset instead.
              </p>
            ) : (
              <ul className="pick-list">
                {projectFamilies.map((family) => {
                  const first = family.themes[0];
                  if (first === undefined) return null;
                  return (
                    <li key={family.key}>
                      <button type="button" className="pick-item" onClick={() => onStartExisting(first)}>
                        <SwatchDots colors={family.swatches} />
                        <span className="pick-copy">
                          <strong>{family.name}</strong>
                          <span className="muted">
                            {family.themes.map((theme) => theme.mode ?? "default").join(" / ")}
                          </span>
                        </span>
                        <Icon name="chevronRight" size={14} />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )
          ) : null}
        </div>

        <div className="drawer-foot">
          <p className="drawer-foot-note" id="seed-hint">
            {ui.createEntry === "generate" ? (
              <>
                Palette from <code>generateTheme()</code>
              </>
            ) : ui.createEntry === "define" ? (
              <>
                Palette from <code>generateTheme()</code> · saves a <code>defineTheme</code> literal
              </>
            ) : ui.createEntry === "preset" ? (
              <>
                Presets are read-only; this copies one into a <code>defineTheme</code> draft. A preset
                already in your project is copied, not re-registered.
              </>
            ) : (
              <>
                Copies into an unsaved <code>defineTheme</code> draft; the original is unchanged
              </>
            )}
          </p>
          <button type="button" className="ghost" onClick={close}>
            Cancel
          </button>
          {generationEntry ? (
            <button type="button" className="cta" onClick={onCreate} disabled={!canCreate}>
              {ui.createEntry === "generate" ? "Generate draft" : "Define draft"}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
