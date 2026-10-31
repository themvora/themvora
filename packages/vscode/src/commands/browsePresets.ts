/**
 * `Themvora: Browse Presets`
 *
 * Read-only. Lists the canonical catalog — curated presets and brand recipes —
 * with the recipe each one came from, and shows the details of whatever the user
 * selects.
 *
 * **Browsing is not adding.** Nothing here writes to a project: `themvora add`
 * is a CLI command and stays deferred. The command says so in its own result
 * rather than letting a user assume a selection installed anything.
 *
 * @packageDocumentation
 */
import { commands, window, type Disposable, type QuickPickItem } from "vscode";
import type { PresetCatalogEntry } from "@themvora/core";

import type { ThemeDefinition } from "@themvora/core";

import {
  isInProject,
  presetRegistration,
  type PresetEvidenceRow,
  type PresetRegistration,
} from "../shared/presetRegistration.js";
import type { ThemvoraClient } from "../services/coreClient.js";
import { projectEntries, type ThemeCatalogDeps } from "../services/themeCatalog.js";

/**
 * The command identifier.
 *
 * Must match `contributes.commands`; a unit test asserts the two agree.
 */
export const COMMAND_BROWSE_PRESETS = "themvora.browsePresets";

/** What the command needs from the extension. */
export interface BrowsePresetsDeps {
  /** The canonical client. */
  readonly client: ThemvoraClient;
  /** The preview surface, for showing the chosen preset. */
  readonly preview: {
    openThemes(themes: readonly ThemeDefinition[], label: string): Promise<void>;
  };
  /** The clipboard, for the copy action. */
  readonly clipboard: { writeText(value: string): Promise<void> };
  /**
   * Every selectable theme.
   *
   * Only the project's rows are read from it, and only to answer the question a
   * catalog cannot: is this preset already in the project?
   */
  readonly catalog: ThemeCatalogDeps;
}

/** A quick-pick row carrying its catalog entry. */
interface PresetItem extends QuickPickItem {
  readonly entry: PresetCatalogEntry;
  readonly registration: PresetRegistration;
}

/**
 * Curated presets first, then brand recipes, each alphabetical.
 *
 * A stable order matters more than it looks: the catalog is the same on every
 * machine, so the list should not reshuffle between invocations.
 */
const KIND_ORDER: Readonly<Record<string, number>> = { default: 0, brand: 1 };

/**
 * What each `PresetKind` is called in the list.
 *
 * Core's `"default"` means "curated, not brand-derived". Shown verbatim it reads
 * like a fallback, so it is presented as "preset" — the word the product uses.
 */
const KIND_LABEL: Readonly<Record<string, string>> = { default: "preset", brand: "brand" };

/**
 * Register the command.
 *
 * @param deps - The client.
 * @returns The registration, for `context.subscriptions`.
 */
export function registerBrowsePresetsCommand(deps: BrowsePresetsDeps): Disposable {
  return commands.registerCommand(COMMAND_BROWSE_PRESETS, () => runBrowsePresets(deps));
}

/** What the user can do with a chosen preset. */
type PresetAction = "preview" | "studio" | "copy" | "validate";

/** One action row. */
interface ActionItem extends QuickPickItem {
  readonly action: PresetAction;
}

/**
 * Show the catalog.
 *
 * @param deps - The client.
 */
export async function runBrowsePresets(deps: BrowsePresetsDeps): Promise<void> {
  const catalog = await deps.client.catalog();

  if (!catalog.ok || catalog.value === null) {
    const detail = catalog.errors[0]?.message ?? catalog.reason ?? catalog.outcome;
    void window.showErrorMessage(`Themvora could not read the preset catalog: ${detail}`);
    return;
  }

  const { entries } = catalog.value;
  if (entries.length === 0) {
    // An empty catalog is a broken install, not a user error.
    void window.showErrorMessage("Themvora: the preset catalog is empty.");
    return;
  }

  // The project's own rows, in the shape the shared evidence calculation reads.
  // The same calculation backs the Studio's preset drawer, so the two surfaces
  // cannot disagree about whether a preset is already in the project.
  const rows: PresetEvidenceRow[] = projectEntries(deps.catalog.roots()).map((theme) => ({
    ...(theme.family === undefined ? {} : { family: theme.family }),
    name: theme.label,
    ...(theme.mode === undefined ? {} : { mode: theme.mode }),
    ...(theme.evidence === undefined ? {} : { evidence: theme.evidence }),
    usedBy: theme.consumers,
    ...(theme.source === undefined ? {} : { source: theme.source }),
    // Kept so the evidence calculation can judge each workspace folder on its
    // own; pooling two folders would let half a preset in each add up to a
    // registration that neither project has.
    ...(theme.root === undefined ? {} : { root: theme.root }),
    catalogOrigin: theme.catalogOrigin,
  }));

  const items: PresetItem[] = [...entries]
    .sort(
      (left, right) =>
        (KIND_ORDER[left.kind] ?? 2) - (KIND_ORDER[right.kind] ?? 2) ||
        left.name.localeCompare(right.name),
    )
    .map((entry) => {
      const registration = presetRegistration(
        { family: entry.family, label: entry.name, modes: entry.modes },
        rows,
      );
      return {
        label: entry.name,
        // One scannable line: what kind of recipe it is, and where the project
        // stands on it. The sentence behind the status only appears when there
        // is something to explain — nine rows of explanation is noise.
        description: `${KIND_LABEL[entry.kind] ?? entry.kind} · ${entry.style} · ${registration.label}`,
        detail: isInProject(registration)
          ? `${entry.character} — ${registration.detail}`
          : entry.character,
        entry,
        registration,
      };
    });

  const picked = await window.showQuickPick<PresetItem>(items, {
    title: "Themvora Presets",
    placeHolder: `${entries.length} recipes — preview one, or copy its variables`,
    matchOnDescription: true,
    matchOnDetail: true,
  });

  // Dismissing a browser is not a failure.
  if (picked === undefined) return;

  const { entry } = picked;
  const themes = Object.values(entry.themes).filter(
    (theme): theme is ThemeDefinition => theme !== undefined,
  );
  if (themes.length === 0) {
    void window.showErrorMessage(`Themvora: ${entry.name} has no resolved themes.`);
    return;
  }

  // A preset already in the project is still worth drafting from — the
  // developer wants a variation, not a duplicate registration. The action stays,
  // and says which of the two it will be.
  const inProject = isInProject(picked.registration);

  const actions: ActionItem[] = [
    { label: "Preview", description: "Open the theme in the preview panel", action: "preview" },
    {
      label: "Open in Studio",
      description: inProject
        ? "Start a draft from this preset — it is already in the project, so the draft is a separate copy"
        : "Start a draft from this preset",
      action: "studio",
    },
    { label: "Copy CSS variables", description: "Copy the light variant's variables", action: "copy" },
    { label: "Validate", description: "Check structure and contrast", action: "validate" },
  ];

  const chosen = await window.showQuickPick(actions, {
    title: entry.name,
    placeHolder: `${entry.character} · ${entry.modes.join(" / ")}`,
  });
  if (chosen === undefined) return;

  if (chosen.action === "preview") {
    await deps.preview.openThemes(themes, `preset:${entry.id}`);
    return;
  }

  if (chosen.action === "studio") {
    // The Studio owns the draft workflow, including the notice that says a
    // draft from an existing preset is a copy. Re-implementing it here would be
    // a second path to the same thing.
    await commands.executeCommand("themvora.openStudio", entry.id);
    return;
  }

  if (chosen.action === "copy") {
    const rendered = await deps.client.cssDocument({ theme: themes[0]!, themes });
    if (!rendered.ok || rendered.value === null) {
      const detail = rendered.errors[0]?.message ?? rendered.reason ?? rendered.outcome;
      void window.showErrorMessage(`Themvora could not render ${entry.name}: ${detail}`);
      return;
    }
    try {
      await deps.clipboard.writeText(rendered.value);
    } catch {
      // The copy did not happen, so there is nothing to confirm.
      void window.showErrorMessage("Themvora could not write to the clipboard.");
      return;
    }
    void window.showInformationMessage(`Themvora: copied ${entry.name} CSS variables to the clipboard.`);
    return;
  }

  const report = await deps.client.validate({ theme: themes[0]!, themes });
  if (!report.ok || report.value === null) {
    const detail = report.errors[0]?.message ?? report.reason ?? report.outcome;
    void window.showErrorMessage(`Themvora could not validate ${entry.name}: ${detail}`);
    return;
  }
  void window.showInformationMessage(
    report.value.valid
      ? `Themvora: ${entry.name} is valid.`
      : `Themvora: ${entry.name} has validation issues — run "Validate Theme…" for the report.`,
  );
}
