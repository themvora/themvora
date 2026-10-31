/**
 * The Studio library: project families, catalog presets, sources and consumers.
 *
 * The themes view is the primary surface. Sources and consumers remain one rail
 * click away rather than being flattened into the theme list.
 */
import { useMemo, type Dispatch } from "react";

import type {
  StudioConsumer,
  StudioDraftRow,
  StudioPreset,
  StudioSelection,
  StudioSourceFile,
  StudioState,
  StudioTheme,
} from "../../src/shared/studioProtocol";
import { familyMatches, presetVisible, sourceMatches, type EvidenceFilter } from "../studioFilters";
import {
  CONSUMER_EVIDENCE_LABEL,
  ORIGIN_LABEL,
  SOURCE_ORIGIN_LABEL,
  familyEvidenceLabel,
  themeEvidenceLabel,
} from "./labels";
import { partitionFamilies, type ThemeFamilyView } from "./themeGroups";
import { Icon, Segmented, SwatchDots, type IconName } from "./ui";
import type { StudioUiAction, StudioUiState } from "./uiState";

/** What the library can ask the shell to do. */
interface LibraryActions {
  readonly onSelectTheme: (theme: StudioTheme) => void;
  readonly onSelectPreset: (id: string) => void;
  /** Open an unsaved draft that already exists in the host registry. */
  readonly onSelectDraft: (id: string) => void;
  readonly onOpen: (path: string, location?: { readonly line: number; readonly column: number }) => void;
  readonly onCreate: () => void;
}

/** Every filter option, with its typed value. */
/* One word each. A `<select>` sizes itself to its widest option, so a label
 * like "partial / dynamic" made the control wider than the heading had room for
 * and pushed it past the panel edge. The distinction each one draws is carried
 * by the rows it filters, not by a second word here. */
const EVIDENCE_FILTERS: readonly { readonly value: EvidenceFilter; readonly label: string }[] = [
  { value: "all", label: "all" },
  { value: "registered", label: "registered" },
  { value: "unregistered", label: "unregistered" },
  { value: "catalog", label: "catalog" },
  { value: "partial", label: "partial" },
  { value: "invalid", label: "invalid" },
];

const RAIL_ICON: Record<StudioUiState["rail"], IconName> = {
  themes: "themes",
  sources: "sources",
  consumers: "consumers",
};

/**
 * The compact evidence filter shown beside the first group heading.
 *
 * @param props - The current filter and its change handler.
 * @returns The control.
 */
function EvidenceSelect({
  value,
  label,
  onChange,
}: {
  readonly value: EvidenceFilter;
  readonly label: string;
  readonly onChange: (value: EvidenceFilter) => void;
}): React.JSX.Element {
  return (
    <label className="evidence-select" title={label}>
      <span>Evidence:</span>
      <select value={value} aria-label={label} onChange={(event) => onChange(event.target.value as EvidenceFilter)}>
        {EVIDENCE_FILTERS.map((entry) => (
          <option key={entry.value} value={entry.value}>
            {entry.label}
          </option>
        ))}
      </select>
    </label>
  );
}

/**
 * An overline group heading with an optional trailing control.
 *
 * @param props - Label, count and aside.
 * @returns The heading.
 */
function GroupHeading({
  label,
  count,
  aside,
}: {
  readonly label: string;
  readonly count: number;
  readonly aside?: React.ReactNode;
}): React.JSX.Element {
  return (
    <div className="group-heading">
      <span className="overline">
        {label} · {count}
      </span>
      {aside}
    </div>
  );
}

/**
 * One project or catalog family row.
 *
 * @param props - The family and selection state.
 * @returns The row.
 */
function ThemeFamilyRow({
  family,
  selected,
  onSelect,
}: {
  readonly family: ThemeFamilyView;
  readonly selected: StudioSelection | undefined;
  readonly onSelect: (theme: StudioTheme) => void;
}): React.JSX.Element {
  const selectedHere = family.themes.some(
    (theme) => theme.name === selected?.name && theme.source === selected.source,
  );
  const primary = family.themes[0]!;
  const valid = family.themes.every((theme) => theme.valid);
  const usedBy = new Set(family.themes.flatMap((theme) => theme.usedBy)).size;
  const origin = primary.origin === undefined ? "source" : (SOURCE_ORIGIN_LABEL[primary.origin] ?? primary.origin);
  const evidence = familyEvidenceLabel(family.themes);
  const registered = family.themes.every((theme) => theme.evidence === "registered");
  const kind =
    primary.origin === "generated"
      ? "generate"
      : primary.origin === "definition"
        ? "define"
        : primary.origin === "catalog"
          ? "catalog"
          : "project";
  const status = `${valid ? "Valid" : "Invalid"} · ${evidence}`;
  const source = `${origin}${usedBy > 0 ? ` · used by ${usedBy}` : ""}`;

  return (
    <article className={`theme-row${selectedHere ? " selected" : ""}`}>
      <button
        type="button"
        className="theme-row-main"
        aria-current={selectedHere ? "true" : undefined}
        title={primary.source}
        onClick={() => onSelect(primary)}
      >
        <SwatchDots colors={family.swatches} />
        <span className="theme-row-label">
          <span className="theme-row-name">{family.name}</span>
          <span
            className={`theme-row-status${valid && registered ? " is-ok" : ""}`}
            role="img"
            aria-label={status}
            title={status}
          />
        </span>
      </button>
      <div className="theme-row-meta">
        <span className="theme-row-left">
          <span className="theme-row-kind">{kind} ·</span>
          <span className="mode-links" role="group" aria-label={`${family.name} variants`}>
            {family.themes.map((theme) => {
              const active = theme.name === selected?.name && theme.source === selected.source;
              return (
                <button
                  key={`${theme.name}:${theme.mode ?? ""}`}
                  type="button"
                  className={`mode-link${active ? " active" : ""}`}
                  aria-pressed={active}
                  title={theme.name}
                  onClick={() => onSelect(theme)}
                >
                  {theme.mode ?? "default"}
                </button>
              );
            })}
          </span>
        </span>
        <span className="theme-row-aside" title={`${source} · ${primary.source}`}>
          {source}
        </span>
      </div>
    </article>
  );
}

/**
 * One catalog preset row.
 *
 * @param props - The preset.
 * @returns The row.
 */
function PresetRow({
  preset,
  active,
  onSelect,
}: {
  readonly preset: StudioPreset;
  readonly active: boolean;
  readonly onSelect: (id: string) => void;
}): React.JSX.Element {
  return (
    <article className={`theme-row${active ? " selected" : ""}`}>
      <button
        type="button"
        className="theme-row-main"
        aria-current={active ? "true" : undefined}
        title={`${preset.label} · read-only catalog preset`}
        onClick={() => onSelect(preset.id)}
      >
        <SwatchDots colors={preset.swatches} />
        <span className="theme-row-label">
          <span className="theme-row-name">{preset.label}</span>
          <span
            className="theme-row-status"
            role="img"
            aria-label="Catalog preset · not registered in this project"
            title="Catalog preset · not registered in this project"
          />
        </span>
      </button>
      <div className="theme-row-meta">
        <span className="theme-row-left">
          <span className="theme-row-kind">{preset.kind} ·</span>
          <span className="theme-row-modes">{preset.modes.join(" / ")}</span>
        </span>
        <span className="theme-row-aside" title="Catalog preset · read-only">
          catalog · read-only
        </span>
      </div>
    </article>
  );
}

/**
 * Another unsaved draft the registry holds.
 *
 * Distinct from `DraftRow`, which shows the draft being edited: this is an
 * entry point to a draft that already exists — including one a command created.
 * The label, the origin and the saved state all come from the registry record.
 *
 * @param props - The row and the selection handler.
 * @returns The row.
 */
function RegistryDraftRow({
  draft,
  onSelect,
}: {
  readonly draft: StudioDraftRow;
  readonly onSelect: (id: string) => void;
}): React.JSX.Element {
  const status = draft.dirty ? "Draft · not written yet" : "Draft · written, not registered";
  return (
    <article className="theme-row">
      <button
        type="button"
        className="theme-row-main"
        title={`${draft.name} · ${status}`}
        onClick={() => onSelect(draft.id)}
      >
        <SwatchDots colors={draft.swatches} />
        <span className="theme-row-label">
          <span className="theme-row-name">{draft.name}</span>
          <span
            className={`theme-row-status${draft.valid ? " is-ok" : ""}`}
            role="img"
            aria-label={status}
            title={status}
          />
        </span>
      </button>
      <div className="theme-row-meta">
        <span className="theme-row-left">
          <span className="theme-row-kind">{draft.origin} ·</span>
          <span className="theme-row-modes">{draft.modes.join(" / ") || "single mode"}</span>
        </span>
        {/* One word each. "unsaved draft" and "saved draft" differ by a
            prefix, which is easy to misread at a glance; "written" is the fact
            that distinguishes them. */}
        <span className="theme-row-aside" title={status}>
          {draft.dirty ? "not written" : "written"}
        </span>
      </div>
    </article>
  );
}

/**
 * The unsaved draft, listed so the selection stays visible in the library.
 *
 * @param props - The draft selection.
 * @returns The row.
 */
function DraftRow({ selected }: { readonly selected: StudioSelection }): React.JSX.Element {
  const colors = selected.tokens
    .filter((token) => /^(primary|accent|background)$/u.test(token.name))
    .map((token) => token.value);
  return (
    <article className="theme-row selected draft-row" aria-current="true">
      <div className="theme-row-main static">
        <SwatchDots colors={colors.length > 0 ? colors : selected.tokens.slice(0, 3).map((token) => token.value)} />
        <span className="theme-row-label">
          <span className="theme-row-name" title={selected.name}>
            {selected.family ?? selected.name}
          </span>
          <span
            className={`theme-row-status${selected.valid ? " is-ok" : ""}`}
            role="img"
            aria-label={selected.valid ? "Unsaved draft · valid" : "Unsaved draft · invalid"}
            title={selected.valid ? "Unsaved draft · valid" : "Unsaved draft · invalid"}
          />
        </span>
      </div>
      <div className="theme-row-meta">
        <span className="theme-row-left">
          <span className="theme-row-kind">
            {selected.draftKind === "define" ? "define" : "generate"} ·
          </span>
          <span className="theme-row-modes">
            {selected.modes.join(" / ") || "single mode"}
          </span>
        </span>
        <span
          className="theme-row-aside"
          title={selected.draftSource ?? ORIGIN_LABEL.draft}
        >
          {selected.draftSource === undefined
            ? ORIGIN_LABEL.draft
            : `from ${selected.draftSource}`}
        </span>
      </div>
    </article>
  );
}

/** Whether a preset row is the current selection. */
function presetSelected(preset: StudioPreset, selected: StudioSelection | undefined): boolean {
  if (selected?.origin !== "preset") return false;
  return (
    selected.family === preset.id ||
    selected.name === preset.id ||
    selected.name.startsWith(`${preset.id}-`)
  );
}

/**
 * One source file, with its definitions and problems.
 *
 * @param props - The source.
 * @returns The row.
 */
function SourceCard({
  source,
  onOpen,
}: {
  readonly source: StudioSourceFile;
  readonly onOpen: LibraryActions["onOpen"];
}): React.JSX.Element {
  return (
    <li>
      <details className="source-card">
        <summary>
          <span className="source-title" title={source.path}>
            {source.path}
          </span>
          {source.region === undefined ? null : <span className="pill muted">{source.region}</span>}
          <span className={`pill${source.status === "supported" ? " ok" : " muted"}`}>{source.status}</span>
          <span className="muted small">
            {source.themes} {source.themes === 1 ? "theme" : "themes"}
            {source.usedBy > 0 ? ` · used by ${source.usedBy}` : ""}
          </span>
        </summary>
        <div className="source-body">
          <p className="muted small">{source.detail}</p>
          {source.definitions.length === 0 ? null : (
            <ul className="source-definitions">
              {source.definitions.map((definition) => (
                <li key={`${definition.name}:${definition.mode ?? ""}`}>
                  <button
                    type="button"
                    className="link-button"
                    onClick={() =>
                      onOpen(
                        source.path,
                        definition.location === undefined ? undefined : definition.location,
                      )
                    }
                  >
                    {definition.name}
                    {definition.mode === undefined ? "" : ` · ${definition.mode}`}
                  </button>
                  {definition.origin === undefined ? null : (
                    <span className="pill muted">{SOURCE_ORIGIN_LABEL[definition.origin] ?? definition.origin}</span>
                  )}
                  <span className={`pill${definition.valid ? " ok" : " bad"}`}>
                    {definition.valid ? "valid" : "invalid"}
                  </span>
                  {definition.evidence === undefined ? null : (
                    <span className="muted small">{themeEvidenceLabel(definition.evidence)}</span>
                  )}
                  {definition.binding === undefined ? null : (
                    <code className="inline-code">export {definition.binding}</code>
                  )}
                  {definition.usedBy.length > 0 ? (
                    <span className="muted small">used by {definition.usedBy.join(", ")}</span>
                  ) : null}
                  {definition.issue === undefined ? null : <span className="bad small">{definition.issue}</span>}
                </li>
              ))}
            </ul>
          )}
          {source.problems.length > 0 ? (
            <ul className="source-problems">
              {source.problems.map((problem) => (
                <li key={problem} className="bad small">
                  {problem}
                </li>
              ))}
            </ul>
          ) : null}
          <div className="source-actions">
            <button type="button" className="link-button" onClick={() => onOpen(source.path)}>
              Open file
            </button>
          </div>
        </div>
      </details>
    </li>
  );
}

/**
 * One verified consumer.
 *
 * @param props - The consumer.
 * @returns The card.
 */
function ConsumerCard({
  consumer,
  onOpen,
}: {
  readonly consumer: StudioConsumer;
  readonly onOpen: LibraryActions["onOpen"];
}): React.JSX.Element {
  const tone =
    consumer.evidence === "registered"
      ? "ok"
      : consumer.evidence === "unresolved" || consumer.evidence === "dynamic-unverified"
        ? "warn"
        : "muted";

  return (
    <li className="consumer-card">
      <div className="consumer-head">
        <button
          type="button"
          className="source-title link-button"
          title={consumer.reason ?? consumer.path}
          onClick={() =>
            onOpen(consumer.path, consumer.location === undefined ? undefined : consumer.location)
          }
        >
          {consumer.path}
        </button>
        {consumer.evidence === undefined ? null : (
          <span className={`pill ${tone}`}>
            {CONSUMER_EVIDENCE_LABEL[consumer.evidence] ?? consumer.evidence}
          </span>
        )}
      </div>
      <p className="consumer-headline">{consumer.headline}</p>
      <div className="consumer-meta">
        {consumer.integrationLabel === undefined ? null : (
          <span className="pill muted">{consumer.integrationLabel}</span>
        )}
        {consumer.api === undefined ? null : <code className="inline-code">{consumer.api}</code>}
        {consumer.region === undefined ? null : <span className="muted small">{consumer.region}</span>}
        {consumer.location === undefined ? null : (
          <span className="muted small">line {consumer.location.line}</span>
        )}
      </div>
      {consumer.names.length > 0 ? (
        <p className="consumer-detail">
          <span className="muted">Identifiers</span> {consumer.names.join(", ")}
        </p>
      ) : null}
      {consumer.importsFrom !== undefined && consumer.importsFrom.length > 0 ? (
        <p className="consumer-detail">
          <span className="muted">From</span> {consumer.importsFrom.join(", ")}
        </p>
      ) : null}
      {consumer.unresolved !== undefined && consumer.unresolved.length > 0 ? (
        <p className="consumer-detail">
          <span className="muted">Unresolved</span> {consumer.unresolved.join(", ")}
        </p>
      ) : null}
      {consumer.reason !== undefined && consumer.evidence !== "registered" ? (
        <p className="consumer-detail muted">{consumer.reason}</p>
      ) : null}
    </li>
  );
}

/** Props for the library. */
export interface LibraryPanelProps {
  readonly state: StudioState;
  readonly selected: StudioSelection | undefined;
  readonly ui: StudioUiState;
  readonly dispatch: Dispatch<StudioUiAction>;
  readonly actions: LibraryActions;
}

/**
 * The library panel.
 *
 * @param props - State, selection and actions.
 * @returns The rail plus the active library view.
 */
export function LibraryPanel({ state, selected, ui, dispatch, actions }: LibraryPanelProps): React.JSX.Element {
  const match = (text: string): boolean =>
    ui.query.length === 0 || text.toLowerCase().includes(ui.query.toLowerCase());

  const { project: projectFamilies, catalog: catalogFamilies } = useMemo(
    () => partitionFamilies(state.themes),
    [state.themes],
  );

  // A consumer that could not fully trace its themes may still name the files
  // it imported, so the partial filter can find the source even when the theme
  // evidence itself stays defined-unregistered.
  const partialPaths = useMemo(() => {
    const paths = new Set<string>();
    for (const provider of state.providers) {
      if (provider.evidence !== "partially-resolved" && provider.evidence !== "dynamic-unverified") {
        continue;
      }
      for (const path of provider.importsFrom ?? []) paths.add(path);
    }
    return paths;
  }, [state.providers]);

  const familyMatchesFilter = (family: ThemeFamilyView): boolean =>
    familyMatches([...family.themes], ui.evidence) &&
    (match(family.name) || family.themes.some((theme) => match(theme.name)));
  const visibleProjectFamilies =
    ui.scope === "all" || ui.scope === "project"
      ? projectFamilies.filter(familyMatchesFilter)
      : [];
  const visibleCatalogFamilies =
    ui.scope === "all" ? catalogFamilies.filter(familyMatchesFilter) : [];
  const visiblePresets =
    ui.scope === "all" || ui.scope === "preset"
      ? state.presets.filter(
          (preset) =>
            presetVisible(ui.evidence) && match(`${preset.label} ${preset.id} ${preset.kind}`),
        )
      : [];
  const visibleSources = state.sources.filter(
    (entry) =>
      sourceMatches(entry, ui.evidence, partialPaths) &&
      (match(entry.path) || entry.definitions.some((definition) => match(definition.name))),
  );
  const visibleConsumers = state.providers.filter((entry) =>
    match(`${entry.path} ${entry.headline} ${entry.names.join(" ")} ${entry.integrationLabel ?? ""}`),
  );

  const placeholder =
    ui.rail === "themes"
      ? "Search themes and presets"
      : ui.rail === "sources"
        ? "Search files and definitions"
        : "Search consumers and identifiers";

  const heading = ui.rail === "themes" ? "Themes" : ui.rail === "sources" ? "Sources" : "Consumers";
  const headingCount =
    ui.rail === "themes"
      ? projectFamilies.length + catalogFamilies.length + state.presets.length + state.drafts.length
      : ui.rail === "sources"
        ? state.sources.length
        : state.providers.length;
  const headingDetail =
    ui.rail === "themes"
      ? `${state.project.familyCount} project families (${state.project.themeCount} variants) · ${state.project.catalogFamilyCount} catalog families (${state.project.catalogCount} variants) · ${state.presets.length} presets`
      : ui.rail === "sources"
        ? `${state.sources.length} files · ${state.providers.length} consumers`
        : `${state.providers.length} verified uses`;
  const setEvidence = (evidence: EvidenceFilter): void => dispatch({ type: "set-evidence", evidence });
  const evidenceControl = (
    <EvidenceSelect
      value={ui.evidence}
      label={ui.rail === "sources" ? "Filter sources by evidence" : "Filter by evidence"}
      onChange={setEvidence}
    />
  );
  const draft = selected?.origin === "draft" ? selected : undefined;
  // The open draft is listed separately, so it is not offered twice.
  const otherDrafts = state.drafts.filter(
    (candidate) =>
      candidate.id !== draft?.draftId && match(`${candidate.name} ${candidate.family ?? ""}`),
  );
  const themeGroups = [
    { key: "project", label: "Project", count: visibleProjectFamilies.length },
    { key: "catalog-themes", label: "Catalog in project", count: visibleCatalogFamilies.length },
    { key: "presets", label: "Catalog", count: visiblePresets.length },
  ].filter((group) => group.count > 0);
  const firstGroup = themeGroups[0]?.key;
  const nothingMatches =
    visibleProjectFamilies.length === 0 &&
    visibleCatalogFamilies.length === 0 &&
    visiblePresets.length === 0 &&
    otherDrafts.length === 0 &&
    draft === undefined;

  return (
    <aside className="library-shell" aria-label="Studio library">
      <nav className="studio-rail" aria-label="Studio sections">
        {(
          [
            ["themes", "Themes", state.themes.length],
            ["sources", "Sources", state.sources.length],
            ["consumers", "Consumers", state.providers.length],
          ] as const
        ).map(([rail, label, count]) => (
          <button
            key={rail}
            type="button"
            className={`rail-button${ui.rail === rail ? " active" : ""}`}
            aria-current={ui.rail === rail ? "page" : undefined}
            aria-label={count > 0 ? `${label} (${count})` : label}
            title={label}
            onClick={() => dispatch({ type: "set-rail", rail })}
          >
            <Icon name={RAIL_ICON[rail]} size={18} />
            {count > 0 ? (
              <span className="rail-count" aria-hidden="true">
                {count}
              </span>
            ) : null}
          </button>
        ))}
      </nav>

      <div className="library">
        <div className="library-head">
          <h2>
            {heading}
            <span className="library-count" title={headingDetail}>
              {headingCount}
            </span>
          </h2>
          {ui.rail === "themes" ? (
            <button
              type="button"
              className="icon-button bordered"
              aria-label="New theme"
              title="New theme"
              onClick={actions.onCreate}
            >
              <Icon name="plus" />
            </button>
          ) : null}
        </div>

        <label className="search-field">
          <Icon name="search" size={14} />
          <input
            type="search"
            value={ui.query}
            placeholder={placeholder}
            aria-label={placeholder}
            onChange={(event) => dispatch({ type: "set-query", query: event.target.value })}
          />
        </label>

        {ui.rail === "themes" ? (
          <Segmented
            label="Theme origin"
            className="full"
            value={ui.scope}
            options={[
              { value: "all", label: "All" },
              { value: "project", label: "Project" },
              { value: "preset", label: "Presets" },
            ]}
            onChange={(scope) => dispatch({ type: "set-scope", scope })}
          />
        ) : null}

        <div className="library-scroll">
          {ui.rail === "themes" ? (
            <>
              {draft === undefined ? null : (
                <section className="library-section">
                  <GroupHeading label="Draft" count={1} />
                  <DraftRow selected={draft} />
                </section>
              )}

              {otherDrafts.length > 0 ? (
                <section className="library-section">
                  {/* "Drafts", not "Unsaved drafts": a written draft stays in
                      the registry until it is discarded, so the section holds
                      both. */}
                  <GroupHeading label="Drafts" count={otherDrafts.length} />
                  {otherDrafts.map((candidate) => (
                    <RegistryDraftRow
                      key={candidate.id}
                      draft={candidate}
                      onSelect={actions.onSelectDraft}
                    />
                  ))}
                </section>
              ) : null}

              {nothingMatches ? <GroupHeading label="Results" count={0} aside={evidenceControl} /> : null}

              {visibleProjectFamilies.length > 0 ? (
                <section className="library-section">
                  <GroupHeading
                    label="Project"
                    count={visibleProjectFamilies.length}
                    aside={firstGroup === "project" ? evidenceControl : undefined}
                  />
                  {visibleProjectFamilies.map((family) => (
                    <ThemeFamilyRow key={family.key} family={family} selected={selected} onSelect={actions.onSelectTheme} />
                  ))}
                </section>
              ) : null}

              {visibleCatalogFamilies.length > 0 ? (
                <section className="library-section">
                  <GroupHeading
                    label="Catalog in project"
                    count={visibleCatalogFamilies.length}
                    aside={firstGroup === "catalog-themes" ? evidenceControl : undefined}
                  />
                  {visibleCatalogFamilies.map((family) => (
                    <ThemeFamilyRow key={family.key} family={family} selected={selected} onSelect={actions.onSelectTheme} />
                  ))}
                </section>
              ) : null}

              {visiblePresets.length > 0 ? (
                <section className="library-section">
                  <GroupHeading
                    label="Catalog"
                    count={visiblePresets.length}
                    aside={firstGroup === "presets" ? evidenceControl : undefined}
                  />
                  {visiblePresets.map((preset) => (
                    <PresetRow
                      key={preset.id}
                      preset={preset}
                      active={presetSelected(preset, selected)}
                      onSelect={actions.onSelectPreset}
                    />
                  ))}
                </section>
              ) : null}

              {nothingMatches ? (
                <div className="empty-state small-empty">
                  <Icon name="search" size={20} />
                  <strong>Nothing matches</strong>
                  <p>Clear the search or evidence filter to see the library again.</p>
                  <button
                    type="button"
                    className="secondary"
                    onClick={() => {
                      dispatch({ type: "set-query", query: "" });
                      dispatch({ type: "set-evidence", evidence: "all" });
                      dispatch({ type: "set-scope", scope: "all" });
                    }}
                  >
                    Clear filters
                  </button>
                </div>
              ) : null}

              {projectFamilies.length === 0 && state.presets.length > 0 && ui.scope !== "preset" ? (
                <div className="empty-state small-empty">
                  <Icon name="sparkle" size={20} />
                  <strong>No project-defined theme</strong>
                  <p>Catalog themes are still available, or you can generate a new draft.</p>
                  <button type="button" className="secondary" onClick={actions.onCreate}>
                    Create a theme
                  </button>
                </div>
              ) : null}
            </>
          ) : null}

          {ui.rail === "sources" ? (
            <>
              <GroupHeading label="Files" count={visibleSources.length} aside={evidenceControl} />
              {visibleSources.length === 0 ? (
                <div className="empty-state small-empty">
                  <Icon name="sources" size={20} />
                  <strong>No readable source</strong>
                  <p>The project may have no theme file yet, or nothing matches this filter.</p>
                  <button type="button" className="secondary" onClick={actions.onCreate}>
                    Create a theme
                  </button>
                </div>
              ) : (
                <ul className="source-list">
                  {visibleSources.map((source) => (
                    <SourceCard key={source.path} source={source} onOpen={actions.onOpen} />
                  ))}
                </ul>
              )}
            </>
          ) : null}

          {ui.rail === "consumers" ? (
            visibleConsumers.length === 0 ? (
              <div className="empty-state small-empty">
                <Icon name="consumers" size={20} />
                <strong>No consumer traced</strong>
                <p>A provider is listed only when its import resolves to a shipped Themvora API.</p>
              </div>
            ) : (
              <>
                <GroupHeading label="Verified uses" count={visibleConsumers.length} />
                <ul className="consumer-list">
                  {visibleConsumers.map((consumer) => (
                    <ConsumerCard
                      key={`${consumer.path}:${consumer.api ?? ""}:${consumer.location?.line ?? 0}`}
                      consumer={consumer}
                      onOpen={actions.onOpen}
                    />
                  ))}
                </ul>
              </>
            )
          ) : null}
        </div>
      </div>
    </aside>
  );
}
