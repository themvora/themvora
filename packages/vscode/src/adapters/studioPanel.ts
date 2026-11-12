/**
 * The Theme Studio panel.
 *
 * One editor-area webview, reused: repeated invocations reveal the existing panel
 * rather than stacking copies. The React bundle in `dist/webview` is loaded from
 * the VSIX through `asWebviewUri`, so the document carries no inline script and
 * the CSP needs no nonce — `script-src` is the webview origin only.
 *
 * All state lives here. The webview receives one serializable model and posts
 * intents; it never reads a file or calls core.
 *
 * @packageDocumentation
 */

/*
 * `require-atomic-updates` fires on every handler that writes controller state
 * after an `await` — a save dialog, a `toView` round-trip, a project refresh.
 * The Studio is a single panel per window and one message is handled at a time,
 * so last-write-wins is the intended behaviour, not a lost update. The rule is
 * left on everywhere else in this repo; it is only this controller's shape it
 * cannot see through.
 */
/* eslint-disable require-atomic-updates */

import {
  Position,
  Range,
  Uri,
  ViewColumn,
  commands,
  env,
  window,
  workspace,
  type Disposable,
  type WebviewPanel,
} from "vscode";

import {
  GENERATION_STYLE_NAMES,
  measureThemeContrast,
  validateTheme,
  validateThemeLevels,
  type GenerationStyle,
  type LevelIssue,
  type ThemeDefinition,
} from "@themvora/core";

import {
  buildThemeIdentifier,
  determineDefaultSelection,
  type ThemeIdentifier,
} from "../domain/defaultSelection.js";
import { describeError } from "../domain/errors.js";
import { buildPreviewModel, type PreviewMode } from "../domain/previewModel.js";
import { frameworkLabel, type ProjectProfile } from "../domain/projectProfile.js";
import { generatePatchProposal, type SupportedFramework } from "../domain/patchProposal.js";
import type { ProjectInspection } from "../domain/registry.js";
import {
  buildGeneratePayload,
  buildPresetPayload,
  detectThemeOrigin,
  suggestSaveFormat,
  validateSaveFormat,
} from "../domain/saveFormatDefaults.js";
import {
  suggestComponentFiles,
  suggestProviderFiles,
  suggestTargetFiles,
} from "../domain/smartDefaults.js";
import {
  buildThemeEditor,
  editThemeToken,
  modeOf,
  tokenValueAt,
} from "../domain/themeEditor.js";
import { familyOf, themeFamilyName } from "../domain/themeFamily.js";
import type { RootView } from "../domain/rootView.js";
import { workspaceSetup, type WorkspaceSetup } from "../domain/workspaceSetup.js";
import {
  parseStudioAppearance,
  parseStudioIntent,
  type StudioAppearance,
  type StudioDraftPreview,
  type StudioDraftPreviewResult,
  type StudioEditorContrast,
  type StudioHostMessage,
  type StudioIntent,
  type StudioLevelIssue,
  type StudioPatchProposal,
  type StudioPreset,
  type StudioPreviewSurface,
  type StudioSelection,
  type StudioState,
  type StudioToken,
  type StudioVariant,
} from "../shared/studioProtocol.js";
import {
  analyzeTokenUsage,
  buildStudioConsumers,
  buildStudioDrafts,
  buildStudioSources,
  buildStudioThemes,
  isInspectionPath,
  themeCounts,
} from "./studioModel.js";
import type { ThemvoraClient } from "../services/coreClient.js";
import type { PatchOutcome } from "../services/applyPatch.js";
import type { PayloadOptions, SaveOutcome, ThemeFileFormat } from "../services/saveTheme.js";
import {
  DEFAULT_FILE_NAMES,
  baseNameOf,
  directoryOf,
  extensionForFormat,
  themeFilePayload,
} from "../services/saveTheme.js";
import type { DraftRegistry, DraftScope } from "../services/draftRegistry.js";

/** What the panel needs from the extension. */
export interface StudioPanelOptions {
  /** The extension's root, for asset URIs. */
  readonly extensionUri: Uri;
  /** The current workspace roots. */
  readonly roots: () => readonly RootView[];
  /** Read the framework/package profile for the active root. */
  readonly profileFor?: (root: string) => Promise<ProjectProfile>;
  /** The canonical client. */
  readonly client: ThemvoraClient;
  /** Write a theme set, through the shared save path. */
  readonly save: (
    themes: readonly ThemeDefinition[],
    options: {
      readonly format: ThemeFileFormat;
      readonly fileName: string;
      readonly css?: string;
      /** An explicit destination; the shared save path skips its own dialog. */
      readonly target?: Uri;
      /** The seed, generation options and catalog a TypeScript file records. */
      readonly payload?: PayloadOptions;
    },
  ) => Promise<SaveOutcome>;
  /** Apply a patch proposal to the filesystem. */
  readonly applyPatch: (patch: StudioPatchProposal) => Promise<PatchOutcome>;
  /** Show a theme set in the preview panel. */
  readonly preview: {
    openThemes(
      themes: readonly ThemeDefinition[],
      label: string,
      mode?: "light" | "dark",
      draftId?: string,
    ): Promise<void>;
    sync?(
      themes: readonly ThemeDefinition[],
      label: string,
      mode: "light" | "dark",
      draftId?: string,
    ): void;
    /**
     * Drop what the panel is showing, for a theme that no longer exists.
     *
     * Optional so a host without a preview panel does not have to implement it;
     * when it is absent a discarded draft simply stops being pushed.
     */
    clear?(message: string): void;
    onModeChange?(callback: (mode: "light" | "dark") => void): { dispose(): void };
  };
  /** Re-run project discovery after a successful save. */
  readonly refresh?: () => Promise<void>;
  /**
   * The host-side draft registry.
   *
   * The panel is the only writer of drafts; every other surface — the standalone
   * Preview and the commands — reads them from here by id. A draft created in
   * the Studio therefore has one identity everywhere, instead of each view
   * holding its own copy of the theme array.
   */
  readonly drafts: DraftRegistry;
  /**
   * Called instead of opening when the active folder has no Themvora in it.
   *
   * The panel does not know how to explain that in the editor's own UI, so the
   * composition root supplies the message and the setup links.
   */
  readonly onUnconfigured?: (setup: WorkspaceSetup) => void;
  /**
   * The persisted Studio appearance preference.
   *
   * Global state, not workspace state: the appearance is a personal preference
   * like the workbench theme, so it must not reset when the folder changes. The
   * panel writes it here and reads it back into the next document, which is what
   * makes the choice survive closing the Studio.
   */
  readonly studioAppearance: {
    readonly read: () => StudioAppearance;
    readonly write: (appearance: StudioAppearance) => Thenable<void>;
  };
}

/** The panel handle. */
export interface StudioPanel extends Disposable {
  /** Open the panel, creating it if needed, and re-render. */
  open(presetId?: string): Promise<void>;
  /** Re-render from the current roots. */
  refresh(): Promise<void>;
  /** Whether the panel is currently open. */
  isOpen(): boolean;
}

/** A colour token as the webview sees it. */
type TokenView = StudioToken;

/** The current selection. */
type SelectionView = StudioSelection;

/**
 * Keep the selection's provenance when only the rendered mode changes.
 *
 * `toView` rebuilds the token/variant data; it does not know where the theme
 * came from. Switching light/dark must not clear the source, evidence or draft
 * context the inspector is showing.
 *
 * @param current - The selection before the mode change.
 * @param next - The rebuilt selection.
 * @returns The rebuilt selection with the provenance preserved.
 */
function carryMetadata(current: SelectionView, next: SelectionView): SelectionView {
  return {
    ...next,
    ...(current.evidence === undefined ? {} : { evidence: current.evidence }),
    ...(current.usedBy === undefined ? {} : { usedBy: current.usedBy }),
    ...(current.binding === undefined ? {} : { binding: current.binding }),
    ...(current.producingApi === undefined ? {} : { producingApi: current.producingApi }),
    ...(current.location === undefined ? {} : { location: current.location }),
    ...(current.region === undefined ? {} : { region: current.region }),
    ...(current.draftKind === undefined ? {} : { draftKind: current.draftKind }),
    ...(current.draftSource === undefined ? {} : { draftSource: current.draftSource }),
    ...(current.draftInputs === undefined ? {} : { draftInputs: current.draftInputs }),
  };
}

/** One mode of a theme, ready to render. */
export type VariantView = StudioVariant;

/** A preset family card. */
type PresetView = StudioPreset;

/** One measured contrast pair, as the token row carries it. */
type MeasuredContrast = StudioEditorContrast;

/**
 * Measure the semantic pairs of one theme.
 *
 * @param theme - The theme.
 * @returns Contrast pairs by foreground token.
 */
function contrastOf(theme: ThemeDefinition): Map<string, readonly MeasuredContrast[]> {
  const contrast = new Map<string, MeasuredContrast[]>();
  for (const pair of measureThemeContrast(theme)) {
    const entry: MeasuredContrast = {
      ratio: pair.ratio,
      passes: pair.passes,
      against: pair.background,
      floor: pair.floor,
      requirement: pair.requirement,
      ...(pair.direction === undefined ? {} : { direction: pair.direction }),
      ...(pair.severity === undefined ? {} : { severity: pair.severity }),
    };
    const list = contrast.get(pair.foreground) ?? [];
    list.push(entry);
    contrast.set(pair.foreground, list);
  }
  return contrast;
}

/**
 * Build the preview model for one variant, exactly as the Theme Preview panel
 * would, so the Studio surface and the panel render the same values.
 *
 * @param theme - The variant.
 * @param family - The themes it belongs with, for inheritance and the mode list.
 * @returns The surface, or undefined when the theme cannot be previewed.
 */
function surfaceOf(
  theme: ThemeDefinition,
  family: readonly ThemeDefinition[],
): StudioPreviewSurface | undefined {
  const mode = theme.meta?.mode === "dark" ? "dark" : "light";
  for (const themes of [family, [theme]]) {
    const result = buildPreviewModel({ themes, mode, source: "" });
    if (!result.ok || result.model.themeName !== theme.name) continue;
    const { model } = result;
    return {
      themeName: model.themeName,
      family: model.family,
      mode: model.mode,
      systemMode: model.systemMode,
      modes: model.modes,
      variables: model.variables,
      readable: model.readable,
      contrast: model.contrast,
      roles: model.roles.map(({ role, value }) => ({ role, value })),
    };
  }
  return undefined;
}

/**
 * Resolve every variant of a theme, in the order the family lists them.
 *
 * @param family - The themes that belong together.
 * @param client - The canonical client, for the CSS projection.
 * @returns One entry per variant.
 */
export async function variantViews(
  family: readonly ThemeDefinition[],
  client: ThemvoraClient,
): Promise<VariantView[]> {
  const seen = new Set<string>();
  const variants: VariantView[] = [];

  for (const theme of family) {
    const mode = theme.meta?.mode ?? "default";
    // One panel per mode: a duplicate would render the same colours twice.
    if (seen.has(mode)) continue;
    seen.add(mode);
    const surface = surfaceOf(theme, family);
    variants.push({
      mode,
      name: theme.name,
      tokens: await tokensOf(theme, contrastOf(theme), client),
      ...(surface === undefined ? {} : { surface }),
    });
  }

  return variants;
}

/**
 * Map a core LevelIssue to the protocol's StudioLevelIssue.
 *
 * Extracts the primary token and related tokens from the path, which is
 * typically `colors.X` or `colors.X vs colors.Y`.
 */
function toStudioLevelIssue(issue: LevelIssue): StudioLevelIssue {
  const pathMatch = /^colors\.([A-Za-z0-9_]+)/u.exec(issue.path ?? "");
  const token = pathMatch?.[1];

  const related: string[] = [];
  const vsMatch = /vs colors\.([A-Za-z0-9_]+)/u.exec(issue.path ?? "");
  if (vsMatch?.[1] !== undefined) related.push(vsMatch[1]);

  const onMatch = /on colors\.([A-Za-z0-9_]+)/u.exec(issue.path ?? "");
  if (onMatch?.[1] !== undefined) related.push(onMatch[1]);

  return {
    level: issue.level,
    code: issue.code,
    ...(issue.path === undefined ? {} : { path: issue.path }),
    message: issue.message,
    ...(token === undefined ? {} : { token }),
    ...(related.length === 0 ? {} : { related }),
  };
}

/**
 * Build the view of one theme.
 *
 * @param theme - The resolved theme.
 * @param origin - Where it came from.
 * @param saved - Whether it is on disk.
 * @param modes - The modes its family offers.
 * @param client - The canonical client.
 * @param family - The themes that belong together.
 * @param source - The file, for a project theme.
 * @returns The selection.
 */
async function toView(
  theme: ThemeDefinition,
  origin: SelectionView["origin"],
  saved: boolean,
  modes: readonly string[],
  client: ThemvoraClient,
  family: readonly ThemeDefinition[],
  source?: string,
  baseline?: readonly ThemeDefinition[],
  inspection?: ProjectInspection,
): Promise<SelectionView> {
  const report = validateTheme(theme);
  const issue = report.issues[0];
  const contrast = contrastOf(theme);
  const issues = report.issues.map((entry) => ({
    message: entry.message,
    ...(entry.context?.property === undefined ? {} : { token: entry.context.property }),
    path: entry.path,
  }));

  const levelIssues = validateThemeLevels(theme).map(toStudioLevelIssue);

  const tokenUsage = analyzeTokenUsage(theme, inspection);

  return {
    origin,
    name: theme.name,
    ...(source === undefined ? {} : { source }),
    family: themeFamilyName(theme),
    ...(theme.meta?.mode === undefined ? {} : { mode: theme.meta.mode }),
    modes,
    valid: report.valid,
    ...(issue === undefined ? {} : { issue: issue.message }),
    saved,
    tokens: await tokensOf(theme, contrast, client),
    variants: await variantViews(family, client),
    ...(issues.length === 0 ? {} : { issues }),
    ...(levelIssues.length === 0 ? {} : { levelIssues }),
    ...(tokenUsage.unused.length === 0 && tokenUsage.missing.length === 0
      ? {}
      : { tokenUsage }),
    editor: buildThemeEditor({
      theme,
      family,
      ...(baseline === undefined ? {} : { baseline }),
      editable: origin === "draft",
    }).editor,
  };
}

/**
 * Every colour token, with its contrast and its CSS custom property.
 *
 * The property name comes from core's own projection (`exportVariables`), not
 * from a naming convention guessed here — a token renamed in core must not
 * silently produce a wrong `--var`.
 *
 * @param theme - The theme.
 * @param contrast - Measured contrast by foreground token.
 * @param client - The canonical client.
 * @returns The tokens.
 */
async function tokensOf(
  theme: ThemeDefinition,
  contrast: ReadonlyMap<string, readonly MeasuredContrast[]>,
  client: ThemvoraClient,
): Promise<TokenView[]> {
  const projected = await client.exportVariables({ theme });
  const variables = projected.ok && projected.value !== null ? projected.value : {};

  return Object.entries(theme.tokens?.colors ?? {})
    .filter(([, value]) => typeof value === "string")
    .map(([name, value]) => {
      const measured = contrast.get(name);
      // Core appends keys verbatim, so primaryForeground stays camelCase.
      const property = `--theme-color-${name}`;
      const cssVar = variables[property] === value ? property : undefined;
      return {
        name,
        value: value as string,
        ...(measured === undefined ? {} : { contrasts: measured }),
        ...(cssVar === undefined ? {} : { cssVar }),
      };
    });
}

/**
 * Read a format name from the webview.
 *
 * @param value - Whatever the message carried.
 * @returns The format, defaulting to JSON.
 */
/**
 * Map a FrameworkId to a SupportedFramework for patch generation.
 *
 * @param framework - The detected framework.
 * @returns The supported framework identifier.
 */
function mapFrameworkToSupported(framework: string): SupportedFramework {
  switch (framework) {
    case "react":
      return "react";
    case "vue":
      return "vue";
    case "svelte":
      return "svelte";
    case "next":
      return "next";
    case "nuxt":
      return "nuxt";
    case "astro":
      return "astro";
    case "angular":
      return "angular";
    case "solid":
      return "solid";
    case "remix":
      return "remix";
    default:
      return "react"; // Default to React for unknown frameworks
  }
}

function asFormat(value: unknown): ThemeFileFormat {
  return value === "ts" || value === "ts-generate" || value === "ts-preset" || value === "css"
    ? value
    : "json";
}

/** The extensions a theme file plausibly carries, whichever format wrote it. */
const THEME_EXTENSIONS: ReadonlySet<string> = new Set([
  ".json",
  ".jsonc",
  ".ts",
  ".mts",
  ".cts",
  ".tsx",
  ".css",
]);

/**
 * The file name to write, falling back to the format's default.
 *
 * @param fileName - What the form holds.
 * @param format - The chosen format.
 * @returns A non-empty file name carrying the format's extension.
 */
function themeFileName(fileName: string, format: ThemeFileFormat): string {
  const trimmed = fileName.trim();
  if (trimmed.length === 0) return DEFAULT_FILE_NAMES[format];

  const expected = `.${extensionForFormat(format)}`;
  const current = /\.[^./\\]+$/u.exec(trimmed)?.[0].toLowerCase();
  if (current === expected) return trimmed;
  if (current === undefined) return `${trimmed}${expected}`;

  // A name the form kept from another format would write JSON into a `.ts` file,
  // or TypeScript into a `.json` one. Any other extension is the user's choice
  // and is left alone.
  return THEME_EXTENSIONS.has(current)
    ? `${trimmed.slice(0, trimmed.length - current.length)}${expected}`
    : trimmed;
}

/**
 * Create the Studio panel controller.
 *
 * @param options - Access to roots, the client, saving and the preview.
 * @returns A handle that opens and refreshes the panel.
 */
export function createStudioPanel(options: StudioPanelOptions): StudioPanel {
  let panel: WebviewPanel | undefined;
  let selected: readonly ThemeDefinition[] = [];
  let selection: SelectionView | undefined;
  let presets: readonly PresetView[] | undefined;
  /** The seed the current draft came from, so `ts-generate` can record it. */
  let draftSeed: string | undefined;
  /** Which Create workflow produced the current draft. */
  let draftKind: "generate" | "define" = "generate";
  /** The generation inputs, for the Details inspector. */
  let draftInputs: SelectionView["draftInputs"];
  /** The untouched family a draft started from, for diff and reset. */
  let draftBaseline: readonly ThemeDefinition[] | undefined;
  /** Which catalog the selected preset came from, and its family. */
  let presetSource: { kind: "preset" | "brand" | "builtin"; family: string } | undefined;
  let notice: { kind: "info" | "error"; text: string } | undefined;
  /**
   * The folder the native picker returned, held until the save uses it.
   *
   * A folder rather than a file: the form's name field stays authoritative for
   * the file name, so renaming after picking a folder still writes into it.
   */
  let chosenDirectory: Uri | undefined;
  /** True while a write is in flight, so a double click cannot write twice. */
  let writing = false;
  /** Framework, package manager and declared packages for the active root. */
  let profile: ProjectProfile | undefined;
  /** The last selected theme identifier, persisted across Studio sessions. */
  let persistedSelection: ThemeIdentifier | undefined;
  /**
   * The registry id of the draft this panel is currently editing.
   *
   * The panel holds the rendered view; the registry holds the draft. This is
   * the link between them, and the reason the standalone Preview and the
   * commands can name the same theme the Studio is showing.
   */
  let draftId: string | undefined;
  /** The revision last read from or written to the registry. */
  let draftRevision = 0;

  /**
   * The scope a draft started in this panel belongs to.
   *
   * A draft copied from a project theme belongs to that folder. One produced
   * from a seed or a catalog preset belongs to no folder — assigning it to
   * `roots()[0]` would claim a relationship that does not exist.
   */
  function draftScope(): DraftScope {
    const root = options.roots()[0];
    return root === undefined
      ? { kind: "standalone" }
      : { kind: "root", root: root.inspection.root };
  }

  /**
   * Register a newly installed draft.
   *
   * The panel keeps editing the same draft when it is replaced by another
   * generated one — the drawer's Create button can be pressed repeatedly while
   * tuning inputs, and each press must not leave a trail of drafts.
   *
   * @param replaceCurrent - Update the current draft instead of creating one.
   * @param input - What the registry records about the draft.
   */
  function registerDraft(
    replaceCurrent: boolean,
    input: {
      readonly name: string;
      readonly family?: string;
      readonly origin: "generated" | "defined" | "preset" | "project";
      readonly basis?: { readonly kind: "preset" | "project-theme"; readonly id?: string; readonly label: string; readonly source?: string };
      readonly themes: readonly ThemeDefinition[];
      readonly mode?: string;
      readonly inputs?: SelectionView["draftInputs"];
      readonly baseline?: readonly ThemeDefinition[];
      readonly scope?: DraftScope;
    },
  ): void {
    const scope = input.scope ?? draftScope();
    const validation = draftValidationOf(input.themes);

    if (replaceCurrent && draftId !== undefined) {
      const updated = options.drafts.update(draftId, {
        expectedRevision: draftRevision,
        name: input.name,
        themes: input.themes,
        ...(input.family === undefined ? {} : { family: input.family }),
        ...(input.mode === undefined ? {} : { mode: input.mode }),
        validation,
      });
      if (updated.ok) {
        draftRevision = updated.draft.revision;
        return;
      }
      // A stale revision means this panel is no longer the writer of that
      // draft. Fall through and start a new one rather than overwrite.
      draftId = undefined;
    }

    const created = options.drafts.create({
      scope,
      name: input.name,
      ...(input.family === undefined ? {} : { family: input.family }),
      origin: input.origin,
      ...(input.basis === undefined ? {} : { basis: input.basis }),
      themes: input.themes,
      ...(input.mode === undefined ? {} : { mode: input.mode }),
      ...(input.inputs === undefined ? {} : { inputs: input.inputs }),
      ...(input.baseline === undefined ? {} : { baseline: input.baseline }),
      validation,
    });
    draftId = created.ok ? created.draft.id : undefined;
    draftRevision = created.ok ? created.draft.revision : 0;
  }

  /**
   * Push the current draft content into the registry after an edit.
   *
   * @param themes - The edited family.
   * @param mode - The variant being shown.
   */
  function syncDraft(themes: readonly ThemeDefinition[], mode?: string): void {
    if (draftId === undefined) return;

    const updated = options.drafts.update(draftId, {
      expectedRevision: draftRevision,
      themes,
      ...(mode === undefined ? {} : { mode }),
      validation: draftValidationOf(themes),
    });
    if (!updated.ok) return;
    draftRevision = updated.draft.revision;
  }

  /**
   * Canonical validation counts for a draft revision.
   *
   * `valid` is gated by `validateTheme()`, which is the only rule that decides
   * it. The multilevel pass is advisory, so its findings are counted separately
   * rather than folded into validity.
   */
  function draftValidationOf(themes: readonly ThemeDefinition[]): {
    readonly valid: boolean;
    readonly errors: number;
    readonly warnings: number;
  } {
    const reports = themes.map((theme) => validateTheme(theme));
    return {
      valid: reports.every((report) => report.valid),
      errors: reports.reduce((total, report) => total + report.issues.length, 0),
      warnings: themes.reduce((total, theme) => total + validateThemeLevels(theme).length, 0),
    };
  }

  // Lazy-evaluated caches for expensive computations.
  // These are invalidated when the inspection changes.
  let cachedInspection: ProjectInspection | undefined;
  let cachedThemes: StudioState["themes"] | undefined;
  let cachedSources: StudioState["sources"] | undefined;
  let cachedProviders: StudioState["providers"] | undefined;
  let cachedCounts: ReturnType<typeof themeCounts> | undefined;
  let cachedSuggestions: StudioState["suggestions"] | undefined;

  // Subscribe to mode changes from the preview panel
  let modeChangeSubscription: { dispose(): void } | undefined;
  if (options.preview.onModeChange !== undefined) {
    modeChangeSubscription = options.preview.onModeChange(async (newMode) => {
      // Update the Studio's mode to match the preview panel
      if (selection === undefined || selected.length === 0) return;
      
      const theme = selected.find((candidate) => candidate.meta?.mode === newMode);
      if (theme === undefined) return;

      const current = selection;
      const view = await toView(
        theme,
        current.origin,
        current.saved,
        current.modes,
        options.client,
        selected,
        current.source,
        current.origin === "draft" ? draftBaseline : undefined,
      );
      selection =
        current.origin === "project"
          ? { ...view, ...projectMetadataFor(current.source, theme) }
          : carryMetadata(current, view);
      post();
    });
  }

  /**
   * Read the project profile for the active root.
   *
   * The profile is presentation context, not inspection truth: a failure leaves
   * it `undefined` and the header says "Unknown" instead of guessing.
   */
  async function refreshProfile(): Promise<void> {
    const root = options.roots()[0];
    if (root === undefined || options.profileFor === undefined) {
      profile = undefined;
      cachedSuggestions = undefined;
      return;
    }

    try {
      profile = await options.profileFor(root.inspection.root);
      cachedSuggestions = undefined;
    } catch {
      profile = undefined;
      cachedSuggestions = undefined;
    }
  }

  /** A generated light/dark pair, with the normalized inputs. */
  interface GeneratedPair {
    readonly themes: readonly ThemeDefinition[];
    readonly family?: string;
    readonly style?: GenerationStyle;
    readonly contrast?: string;
    readonly algorithm?: string;
    readonly withCode: boolean;
  }

  /**
   * Generate a pair in memory.
   *
   * The one path used by both the Create button and the live preview, so the
   * preview cannot show a different palette from the draft that is installed.
   *
   * @param seed - The hex seed.
   * @param rawFamily - The requested family.
   * @param rawStyle - The requested generation style.
   * @param rawContrast - The requested contrast contract.
   * @param rawAlgorithm - The requested generation algorithm.
   * @param withCode - Whether code tokens were requested.
   * @returns The pair, or a user-facing failure.
   */
  async function generatePair(
    seed: string,
    rawFamily: string | undefined,
    rawStyle: string | undefined,
    rawContrast: string | undefined,
    rawAlgorithm: string | undefined,
    withCode: boolean,
  ): Promise<{ readonly ok: true; readonly pair: GeneratedPair } | { readonly ok: false; readonly message: string }> {
    if (!/^#[0-9a-fA-F]{6}$/u.test(seed)) {
      return { ok: false, message: "A seed must be a hex colour such as #4f46e5." };
    }

    const family = rawFamily?.trim() || undefined;
    const style =
      rawStyle !== undefined && (GENERATION_STYLE_NAMES as readonly string[]).includes(rawStyle)
        ? (rawStyle as GenerationStyle)
        : undefined;
    const contrast = rawContrast?.trim() || undefined;
    const algorithm = rawAlgorithm?.trim() || undefined;
    const generated = await options.client.generate({
      seed,
      ...(family === undefined ? {} : { family }),
      ...(style === undefined ? {} : { style }),
      ...(contrast === undefined ? {} : { contrast: contrast as "AA" }),
      ...(algorithm === undefined ? {} : { algorithm }),
      ...(withCode ? { withCode: true } : {}),
    });
    if (!generated.ok || generated.value === null) {
      return {
        ok: false,
        message: generated.errors[0]?.message ?? "Generation failed.",
      };
    }

    return {
      ok: true,
      pair: {
        themes: [generated.value.light, generated.value.dark],
        ...(family === undefined ? {} : { family }),
        ...(style === undefined ? {} : { style }),
        ...(contrast === undefined ? {} : { contrast }),
        ...(algorithm === undefined ? {} : { algorithm }),
        withCode,
      },
    };
  }

  /**
   * Resolve and validate a generated pair for the live drawer preview.
   *
   * Nothing is installed: no draft, selection or file changes until the user
   * chooses "Create draft".
   *
   * @param themes - The generated pair.
   * @returns The preview model.
   */
  async function draftPreviewOf(themes: readonly ThemeDefinition[]): Promise<StudioDraftPreview> {
    const primary = themes[0]!;
    const modes = [...new Set(themes.map((theme) => theme.meta?.mode ?? "default"))];
    const view = await toView(primary, "draft", false, modes, options.client, themes);
    const reports = themes.map((theme) => validateTheme(theme));
    const issues = reports.flatMap((report, index) =>
      report.issues.map((entry) => ({
        message:
          themes.length > 1
            ? `${themes[index]?.meta?.mode ?? "variant"}: ${entry.message}`
            : entry.message,
        ...(entry.context?.property === undefined ? {} : { token: entry.context.property }),
        path: entry.path,
      })),
    );
    const valid = reports.every((report) => report.valid);

    return {
      name: view.name,
      ...(view.family === undefined ? {} : { family: view.family }),
      ...(view.mode === undefined ? {} : { mode: view.mode }),
      modes,
      valid,
      ...(valid ? {} : { issue: issues[0]?.message ?? "A generated variant is invalid." }),
      issues,
      tokens: view.tokens,
      variants: view.variants,
    };
  }

  /**
   * Reply to one live preview request.
   *
   * @param requestId - The webview's sequence number.
   * @param result - The preview or failure.
   */
  function postDraftPreview(requestId: number, result: StudioDraftPreviewResult): void {
    const reply: StudioHostMessage = { type: "draftPreview", requestId, result };
    void panel?.webview.postMessage(reply);
  }

  /**
   * Install a define draft copied from an existing family.
   *
   * @param family - The themes to copy.
   * @param theme - The variant to show first.
   * @param label - The honest draft source, e.g. `Project · ocean`.
   * @param fromCatalog - The catalog basis for save metadata, when the source
   *   was a preset.
   * @param producingApi - The canonical API that produced the copied theme.
   */
  async function installDefineDraft(
    family: readonly ThemeDefinition[],
    theme: ThemeDefinition,
    label: string,
    fromCatalog: { kind: "preset" | "brand" | "builtin"; family: string } | undefined,
    producingApi: SelectionView["producingApi"],
    sourcePath?: string,
  ): Promise<void> {
    const modes = [...new Set(family.map((candidate) => candidate.meta?.mode ?? "default"))];
    draftSeed = undefined;
    draftKind = "define";
    draftInputs = undefined;
    draftBaseline = family;
    presetSource = fromCatalog;
    selected = family;

    const view = await toView(theme, "draft", false, modes, options.client, family, undefined, family);
    selection = {
      ...view,
      draftKind,
      draftSource: label,
      ...(producingApi === undefined ? {} : { producingApi }),
    };
    // A preset the project already includes is still worth drafting from — the
    // developer wants a variation, not a duplicate registration. Say which of
    // the two happened, so "draft created" is not read as "registered".
    const rows = cachedThemes ?? buildStudioThemes(options.roots()[0]?.inspection);
    const alreadyInProject =
      fromCatalog !== undefined &&
      rows.some(
        (row) =>
          (row.family ?? row.name.replace(/-(light|dark)$/u, "")) === fromCatalog.family &&
          (row.origin === "catalog" || row.evidence === "catalog-source"),
      );

    notice = {
      kind: "info",
      text: alreadyInProject
        ? `Draft created from ${label}. This preset is already in the project's theme collection — the draft is a separate copy and does not change its registration.`
        : `Draft created from ${label}. Nothing has been written yet.`,
    };
    // A copy is always a new draft: the point of copying is to diverge, so the
    // draft must not inherit the id of whatever the panel was editing before.
    registerDraft(false, {
      // The family is the name a person uses for the pair; the variant name
      // ("oat-light") already carries the mode and would read as a duplicate
      // once the mode is appended in a picker.
      name: theme.meta?.family ?? theme.name,
      ...(theme.meta?.family === undefined ? {} : { family: theme.meta.family }),
      origin: fromCatalog === undefined ? "project" : "preset",
      basis:
        fromCatalog === undefined
          ? { kind: "project-theme", label, ...(sourcePath === undefined ? {} : { source: sourcePath }) }
          : { kind: "preset", label, ...(fromCatalog.family === "" ? {} : { id: fromCatalog.family }) },
      themes: family,
      ...(theme.meta?.mode === undefined ? {} : { mode: theme.meta.mode }),
      baseline: family,
      // A preset belongs to no folder; a project theme belongs to the folder it
      // was read from.
      scope: fromCatalog === undefined ? draftScope() : { kind: "standalone" },
    });
    syncPreview();
    post();
  }

  /**
   * The current draft theme and its position.
   *
   * The selected mode decides which variant an edit targets; a draft without a
   * recorded mode falls back to its first variant.
   *
   * @returns The index and theme, or undefined when no draft is selected.
   */
  function currentDraftTheme(): { readonly index: number; readonly theme: ThemeDefinition } | undefined {
    if (selection?.origin !== "draft" || draftBaseline === undefined || selected.length === 0) {
      return undefined;
    }

    const mode = selection.mode;
    const index = selected.findIndex((theme) => modeOf(theme) === mode);
    const resolved = index >= 0 ? index : 0;
    return { index: resolved, theme: selected[resolved]! };
  }

  /**
   * The baseline theme for the current draft mode.
   *
   * @returns The baseline variant, or undefined.
   */
  function baselineDraftTheme(): ThemeDefinition | undefined {
    if (draftBaseline === undefined) return undefined;
    const mode = selection?.mode;
    return (
      draftBaseline.find((theme) => modeOf(theme) === mode) ??
      draftBaseline[0]
    );
  }

  /**
   * Edit a draft that already exists in the registry.
   *
   * The record is adopted, never copied: the id and revision stay the registry's
   * so edits, save, revert and discard keep addressing the same draft the
   * commands see. A draft a command created is therefore editable here, and
   * discardable here, without becoming a second draft.
   *
   * @param id - The registry id from the library row.
   */
  async function selectRegistryDraft(id: string): Promise<void> {
    const draft = options.drafts.get(id);
    if (draft === undefined) {
      // Another surface removed it between the render and the click. Say so and
      // leave the current selection alone rather than showing an empty canvas.
      notice = { kind: "error", text: "That draft is no longer available. It may have been discarded." };
      post();
      return;
    }

    if (draft.themes.length === 0) {
      notice = { kind: "error", text: "That draft has no resolved theme." };
      post();
      return;
    }

    // Adopt the record's own state. `draftRevision` is what the guards compare
    // against, so it must be the revision that was just read.
    draftId = draft.id;
    draftRevision = draft.revision;
    draftBaseline = draft.baseline;
    draftSeed = draft.inputs?.seed;
    draftKind = draft.origin === "defined" ? "define" : "generate";
    draftInputs = draft.inputs;
    presetSource =
      draft.basis?.kind === "preset"
        ? { kind: "preset", family: draft.basis.id ?? draft.family ?? "" }
        : undefined;
    selected = draft.themes;

    const primary =
      draft.themes.find((theme) => modeOf(theme) === draft.mode) ?? draft.themes[0]!;
    const view = await toView(
      primary,
      "draft",
      false,
      draft.modes,
      options.client,
      draft.themes,
      undefined,
      draft.baseline,
    );

    selection = {
      ...view,
      draftKind,
      draftSource: draft.basis?.label ?? "Unsaved draft",
      ...(draft.inputs === undefined ? {} : { draftInputs: draft.inputs }),
      ...(draft.origin === "preset" ? { producingApi: "catalog" as const } : {}),
    };

    notice = {
      kind: "info",
      text: draft.dirty
        ? `Editing unsaved draft "${draft.name}". Nothing has been written yet.`
        : `Editing draft "${draft.name}". Its last saved state is at ${draft.saved?.path ?? "an earlier revision"}.`,
    };
    syncPreview();
    post();
  }

  /**
   * Abandon the selected draft.
   *
   * Resetting restores the baseline and keeps the draft; discarding removes it
   * from the registry and every view that referenced it. The revision guard is
   * the point: a discard request that arrives against a draft this panel no
   * longer owns must not delete someone else's newer work.
   */
  async function discardCurrentDraft(): Promise<void> {
    if (draftId === undefined || selection?.origin !== "draft") {
      notice = { kind: "info", text: "There is no draft to discard." };
      post();
      return;
    }

    const draft = options.drafts.get(draftId);
    if (draft === undefined) {
      // Already gone — a command or an earlier discard removed it. Clear the
      // selection rather than leaving a name pointing at nothing.
      await clearDiscardedDraft("That draft is no longer available.");
      return;
    }

    if (draft.revision !== draftRevision) {
      // This panel is not the writer of that draft any more. Dropping the link
      // and keeping the record is the only safe answer.
      draftId = undefined;
      draftRevision = 0;
      notice = {
        kind: "error",
        text: "This draft changed since the Studio last read it, so nothing was discarded. Reopen it and try again.",
      };
      post();
      return;
    }

    // Only unsaved work needs a decision; a saved draft has a file behind it,
    // so removing the registry record loses nothing the user cannot reopen.
    if (draft.dirty) {
      const answer = await window.showWarningMessage(
        `Discard "${draft.name}"? Its changes have not been saved and cannot be recovered.`,
        { modal: true },
        "Discard",
      );
      // Dismissing a confirmation is a decision not to discard, not an error.
      if (answer !== "Discard") {
        post();
        return;
      }
    }

    options.drafts.discard(draft.id);
    await clearDiscardedDraft(`Draft "${draft.name}" discarded.`);
  }

  /**
   * Drop every reference to a draft that no longer exists, then re-select.
   *
   * The preview is cleared before a fallback is chosen so the discarded
   * palette cannot survive under another theme's name.
   *
   * @param text - What to tell the user happened.
   */
  async function clearDiscardedDraft(text: string): Promise<void> {
    draftId = undefined;
    draftRevision = 0;
    draftSeed = undefined;
    draftKind = "generate";
    draftInputs = undefined;
    draftBaseline = undefined;
    presetSource = undefined;
    selected = [];
    selection = undefined;

    // The existing selection policy picks the fallback: a valid project theme
    // first, then nothing at all.
    await applyDefaultSelection(true);

    if (selection === undefined) {
      // Nothing to fall back to. Say so and take the palette off the preview
      // rather than leaving the discarded draft's colours on screen.
      options.preview.clear?.(`${text} Choose or generate a theme to preview it.`);
      notice = { kind: "info", text: `${text} No theme is selected.` };
    } else {
      notice = { kind: "info", text };
      syncPreview();
    }

    post();
  }

  /**
   * Re-resolve a draft after an edit or reset and preserve its provenance.
   *
   * @param theme - The new variant being displayed.
   */
  /**
   * Turn a just-written draft into the project theme it became.
   *
   * The write is followed by a re-scan; if the new file is inside the folder,
   * the inspector now holds the theme. Selecting it replaces the draft row, so
   * the library and the preview show the saved theme rather than a ghost draft.
   */
  async function adoptSavedTheme(target: Uri, name: string): Promise<void> {
    const root = options.roots()[0];
    const inspection = root?.inspection;
    if (root === undefined || inspection === undefined) return;

    const entry = inspection.registries.find(
      (registry) =>
        Uri.joinPath(Uri.file(root.inspection.root), ...registry.path.split("/")).fsPath ===
        target.fsPath,
    );
    const theme =
      entry?.themes?.find((candidate) => candidate.name === name) ??
      (entry?.themes?.length === 1 ? entry.themes[0] : undefined);
    if (entry === undefined || theme === undefined) return;

    const family = familyOf(entry.themes ?? [theme], theme);
    const modes = [...new Set(family.map((candidate) => candidate.meta?.mode ?? "default"))];
    draftSeed = undefined;
    draftKind = "generate";
    draftInputs = undefined;
    draftBaseline = undefined;
    presetSource = undefined;
    // The draft became a file. Its registry record stays — marked saved — but
    // this panel is no longer editing it, so it stops being the active draft.
    draftId = undefined;
    draftRevision = 0;

    const view = await toView(theme, "project", true, modes, options.client, family, entry.path);
    selected = family;
    selection = { ...view, ...projectMetadataFor(entry.path, theme) };
    persistedSelection = buildThemeIdentifier(entry.path, theme);
    syncPreview();
  }

  async function refreshDraft(theme: ThemeDefinition): Promise<void> {
    const current = selection;
    if (current === undefined) return;

    const view = await toView(
      theme,
      "draft",
      false,
      selected.map(modeOf),
      options.client,
      selected,
      undefined,
      draftBaseline,
    );

    selection = {
      ...view,
      ...(current.draftKind === undefined ? {} : { draftKind: current.draftKind }),
      ...(current.draftSource === undefined ? {} : { draftSource: current.draftSource }),
      ...(current.draftInputs === undefined ? {} : { draftInputs: current.draftInputs }),
      ...(current.producingApi === undefined ? {} : { producingApi: current.producingApi }),
    };
    // One edit, one revision: the standalone Preview and any command that is
    // mid-operation can tell whether the draft moved under them.
    syncDraft(selected, view.mode);
    notice = undefined;
    syncPreview();
    post();
  }

  /**
   * Apply one value to the current draft variant.
   *
   * @param path - The leaf path.
   * @param value - The new value.
   * @returns `true` when the path existed and the draft changed.
   */
  async function applyDraftValue(path: readonly string[], value: string): Promise<boolean> {
    const current = currentDraftTheme();
    if (current === undefined || value.trim().length === 0) return false;

    const updated = editThemeToken(current.theme, path, value);
    if (updated === undefined) return false;

    const next = [...selected];
    next[current.index] = updated;
    selected = next;
    await refreshDraft(updated);
    return true;
  }

  /**
   * The source/evidence facts for one project theme.
   *
   * A mode switch changes the theme object, so the binding, location and
   * relationship must be looked up again rather than carried from the other
   * mode.
   *
   * @param path - The defining source path.
   * @param theme - The theme now selected.
   * @returns The metadata to merge into the selection.
   */
  function projectMetadataFor(
    path: string | undefined,
    theme: ThemeDefinition,
  ): Partial<SelectionView> {
    const inspection = options.roots()[0]?.inspection;
    if (path === undefined || inspection === undefined) return {};

    const entry = inspection.registries.find((candidate) => candidate.path === path);
    const source = entry?.themeSources?.find(
      (candidate) =>
        candidate.name === theme.name &&
        (candidate.mode ?? "") === (theme.meta?.mode ?? ""),
    );
    const relationship = inspection.relationships?.find(
      (candidate) =>
        candidate.definedIn === path &&
        candidate.name === theme.name &&
        (candidate.mode ?? "") === (theme.meta?.mode ?? ""),
    );
    const region = source?.region ?? entry?.region;

    return {
      ...(relationship === undefined
        ? {}
        : { evidence: relationship.evidence, usedBy: relationship.usedBy }),
      ...(source?.binding === undefined ? {} : { binding: source.binding }),
      ...(source?.origin === undefined ? {} : { producingApi: source.origin }),
      ...(source?.generateOptions === undefined
        ? {}
        : { generateOptions: source.generateOptions }),
      ...(source?.location === undefined ? {} : { location: source.location }),
      ...(region === undefined ? {} : { region }),
    };
  }

  /** The model the webview renders. */
  function model(): StudioState {
    const root = options.roots()[0];
    const inspection = root?.inspection;

    // Invalidate caches when inspection changes
    if (inspection !== cachedInspection) {
      cachedInspection = inspection;
      cachedThemes = undefined;
      cachedSources = undefined;
      cachedProviders = undefined;
      cachedCounts = undefined;
      cachedSuggestions = undefined;
    }

    // Lazy-compute themes
    if (cachedThemes === undefined) {
      cachedThemes = buildStudioThemes(inspection);
    }
    const themes = cachedThemes;

    // Lazy-compute counts
    if (cachedCounts === undefined) {
      cachedCounts = themeCounts(themes);
    }
    const counts = cachedCounts;

    // Lazy-compute smart defaults for patch application
    if (cachedSuggestions === undefined && inspection !== undefined) {
      cachedSuggestions = {
        targetFiles: suggestTargetFiles(inspection),
        providerFiles: suggestProviderFiles(inspection, profile?.framework ?? "unknown"),
        componentFiles: suggestComponentFiles(inspection, profile?.framework ?? "unknown"),
      };
    }
    const suggestions = inspection === undefined ? undefined : cachedSuggestions;

    // Lazy-compute sources
    if (cachedSources === undefined) {
      cachedSources = buildStudioSources(inspection);
    }

    // Lazy-compute providers
    if (cachedProviders === undefined) {
      cachedProviders = buildStudioConsumers(inspection);
    }

    return {
      project: {
        name: root?.name ?? "No folder",
        framework: profile === undefined ? "Unknown" : frameworkLabel(profile.framework),
        packageManager: profile?.packageManager ?? "unknown",
        status: inspection === undefined ? "no folder" : String(inspection.status),
        // A generated registry mixes catalog presets with project themes, so
        // the counts are separate rather than one inflated number.
        // We report both variants and families for clarity.
        themeCount: counts.project,
        familyCount: counts.projectFamilies,
        catalogCount: counts.catalog,
        catalogFamilyCount: counts.catalogFamilies,
      },
      themes,
      sources: cachedSources,
      providers: cachedProviders,
      presets: presets ?? [],
      // Read at render time, not cached: a draft created by a command while the
      // Studio is open has to appear without a refresh.
      drafts: buildStudioDrafts(options.drafts.list(), root?.inspection.root),
      styles: [...GENERATION_STYLE_NAMES],
      // The draft id is panel state, not part of the rendered view, so it is
      // attached once here rather than threaded through every selection builder.
      ...(selection === undefined
        ? {}
        : { selected: selection.origin === "draft" && draftId !== undefined ? { ...selection, draftId } : selection }),
      ...(notice === undefined ? {} : { notice }),
      ...(suggestions === undefined ? {} : { suggestions }),
    };
  }

  /**
   * Apply the default selection on Studio open or refresh.
   *
   * Follows the priority:
   * 1. Persisted selection if still valid
   * 2. Strongest evidence project theme
   * 3. Any valid project theme
   * 4. Leave selection undefined (empty state)
   *
   * This is called when the Studio opens and after inspection refresh, so the
   * preview is never empty when a valid theme exists.
   */
  async function applyDefaultSelection(force = false): Promise<void> {
    // If a selection already exists and is still valid, keep it — unless the
    // caller has just removed the thing it referred to.
    if (!force && selection !== undefined && selected.length > 0) {
      return;
    }

    const root = options.roots()[0];
    const inspection = root?.inspection;
    if (inspection === undefined) {
      return;
    }

    const defaultSelection = determineDefaultSelection(inspection, persistedSelection);
    if (defaultSelection === undefined) {
      return;
    }

    const { theme, source } = defaultSelection;
    const registry = inspection.registries.find((r) => r.path === source);
    if (registry === undefined) {
      return;
    }

    const family = familyOf(registry.themes ?? [], theme);
    const modes = ["light", "dark"].filter((mode) => family.some((item) => item.meta?.mode === mode));

    // Read generateOptions from the source if available
    const sourceEntry = registry.themeSources?.find(
      (candidate) =>
        candidate.name === theme.name &&
        (candidate.mode ?? "") === (theme.meta?.mode ?? ""),
    );
    const generateOptions = sourceEntry?.generateOptions;

    // A default selection is a project selection, not a draft or preset
    draftSeed = generateOptions?.seed;
    draftKind = "generate";
    draftInputs = generateOptions === undefined ? undefined : {
      seed: generateOptions.seed,
      ...(generateOptions.family === undefined ? {} : { family: generateOptions.family }),
      ...(generateOptions.style === undefined ? {} : { style: generateOptions.style }),
      ...(generateOptions.contrast === undefined ? {} : { contrast: generateOptions.contrast }),
      ...(generateOptions.algorithm === undefined ? {} : { algorithm: generateOptions.algorithm }),
      ...(generateOptions.withCode === undefined ? {} : { withCode: generateOptions.withCode }),
    };
    draftBaseline = undefined;
    presetSource = undefined;

    const view = await toView(theme, "project", true, modes, options.client, family, source);
    selected = family;
    selection = { ...view, ...projectMetadataFor(source, theme) };

    // Persist this selection
    persistedSelection = buildThemeIdentifier(source, theme);
  }

  /** Post the model, if the panel exists. */
  function post(): void {
    const message: StudioHostMessage = { type: "state", state: model() };
    void panel?.webview.postMessage(message);
  }

  /**
   * Say where the file went, and offer to open it.
   *
   * The panel's own notice is easy to miss: the save closes a dialog and moves
   * the selection in the same frame, so the strip that reports it is behind the
   * change. A write is also a workspace event, and the editor's notification
   * surface is where a VS Code user looks to confirm one happened.
   *
   * @param path - The file that was written.
   */
  function announceSaved(path: string): void {
    const uri = Uri.file(path);
    void window
      .showInformationMessage(`Themvora: theme saved to ${path}`, "Open file", "Copy path")
      .then((choice) => {
        if (choice === "Open file") void window.showTextDocument(uri);
        if (choice === "Copy path") void env.clipboard.writeText(path);
      });
  }

  /**
   * Bring an already-open Theme Preview in step with the Studio selection.
   *
   * The controller's `sync` posts without revealing or creating the panel, so a
   * user who never opened the preview is not interrupted, and one who did gets
   * the theme they just clicked without clicking Preview again.
   */
  function syncPreview(): void {
    if (selection === undefined || selected.length === 0) return;
    const label = selection.source ?? `${selection.origin} · ${selection.name}`;
    const mode: PreviewMode = selection.mode === "dark" ? "dark" : "light";
    // The id travels with the theme: the Preview renders the tokens, but only
    // the id lets a later revision be recognised as the same draft.
    options.preview.sync?.(selected, label, mode, draftId);
  }

  /** The generation inputs and catalog the current draft records in a file. */
  function draftPayload(): PayloadOptions {
    return {
      ...(draftSeed === undefined ? {} : { seed: draftSeed }),
      ...(presetSource === undefined ? {} : { presetSource: presetSource.kind, family: presetSource.family }),
      ...(draftInputs?.family === undefined ? {} : { family: draftInputs.family }),
      ...(draftInputs?.style === undefined ? {} : { style: draftInputs.style }),
      ...(draftInputs?.withCode === undefined ? {} : { withCode: draftInputs.withCode }),
      ...(draftInputs?.contrast === undefined ? {} : { contrast: draftInputs.contrast }),
      ...(draftInputs?.algorithm === undefined ? {} : { algorithm: draftInputs.algorithm }),
    };
  }

  /**
   * Handle one intent from the webview.
   *
   * @param message - The intent, already checked by {@link parseStudioIntent}.
   */
  async function handle(message: StudioIntent): Promise<void> {
    const type = message.type;

    if (type === "ready") {
      post();
      return;
    }

    if (type === "selectProject") {
      const { path, name } = message;

      const entry = options.roots()[0]?.inspection.registries.find((registry) => registry.path === path);
      const theme = entry?.themes?.find((candidate) => candidate.name === name);
      if (theme === undefined) return;

      // The family, not the whole file: one registry can hold many families, and
      // taking all of them would preview whichever light theme came first.
      const family = familyOf(entry?.themes ?? [], theme);
      const modes = ["light", "dark"].filter((mode) => family.some((item) => item.meta?.mode === mode));

      // Read generateOptions from the source if available
      const source = entry?.themeSources?.find(
        (candidate) =>
          candidate.name === theme.name &&
          (candidate.mode ?? "") === (theme.meta?.mode ?? ""),
      );
      const generateOptions = source?.generateOptions;

      // A project selection is not a draft and did not come from a preset.
      draftSeed = generateOptions?.seed;
      draftKind = "generate";
      draftInputs = generateOptions === undefined ? undefined : {
        seed: generateOptions.seed,
        ...(generateOptions.family === undefined ? {} : { family: generateOptions.family }),
        ...(generateOptions.style === undefined ? {} : { style: generateOptions.style }),
        ...(generateOptions.contrast === undefined ? {} : { contrast: generateOptions.contrast }),
        ...(generateOptions.algorithm === undefined ? {} : { algorithm: generateOptions.algorithm }),
        ...(generateOptions.withCode === undefined ? {} : { withCode: generateOptions.withCode }),
      };
      draftBaseline = undefined;
      presetSource = undefined;
      const view = await toView(theme, "project", true, modes, options.client, family, path);

      selected = family;
      selection = { ...view, ...projectMetadataFor(path, theme) };
      
      // Persist this selection for future Studio opens
      persistedSelection = buildThemeIdentifier(path, theme);
      
      notice = undefined;
      syncPreview();
      post();
      return;
    }

    if (type === "generate") {
      const generated = await generatePair(
        message.seed,
        message.family,
        message.style,
        message.contrast,
        message.algorithm,
        message.withCode === true,
      );
      if (!generated.ok) {
        notice = { kind: "error", text: generated.message };
        post();
        return;
      }

      const pair = generated.pair;
      // Read the *previous* draft before the state below replaces it: pressing
      // Create again while tuning inputs should revise the same draft, but
      // doing it after a preset copy must start a new one.
      const wasGeneratedDraft =
        selection?.origin === "draft" && selection.draftKind === "generate" && draftId !== undefined;

      draftSeed = message.seed;
      draftKind = message.kind;
      draftInputs = {
        seed: message.seed,
        ...(pair.family === undefined ? {} : { family: pair.family }),
        ...(pair.style === undefined ? {} : { style: pair.style }),
        ...(pair.contrast === undefined ? {} : { contrast: pair.contrast }),
        ...(pair.algorithm === undefined ? {} : { algorithm: pair.algorithm }),
        ...(pair.withCode ? { withCode: true } : {}),
      };
      presetSource = undefined;
      draftBaseline = pair.themes;
      selected = pair.themes;
      const view = await toView(
        pair.themes[0]!,
        "draft",
        false,
        ["light", "dark"],
        options.client,
        pair.themes,
        undefined,
        pair.themes,
      );
      selection = {
        ...view,
        draftKind,
        ...(draftInputs === undefined ? {} : { draftInputs }),
        producingApi: "generated",
      };
      notice = {
        kind: "info",
        text:
          message.kind === "define"
            ? "Define draft generated in memory. Saving writes a defineTheme literal."
            : "Generated in memory. Nothing has been written yet.",
      };
      // The drawer's Create button can be pressed repeatedly while the inputs
      // are tuned. Pressing it again on a generated draft updates that draft
      // instead of leaving a trail of near-identical ones; switching basis
      // (from a preset copy, say) starts a new draft.
      registerDraft(wasGeneratedDraft, {
        name: pair.family ?? pair.themes[0]!.name,
        ...(pair.family === undefined ? {} : { family: pair.family }),
        origin: message.kind === "define" ? "defined" : "generated",
        themes: pair.themes,
        ...(pair.themes[0]!.meta?.mode === undefined ? {} : { mode: pair.themes[0]!.meta.mode }),
        ...(draftInputs === undefined ? {} : { inputs: draftInputs }),
        baseline: pair.themes,
        // A seed is not a project theme: nothing ties this draft to a folder.
        scope: { kind: "standalone" },
      });
      syncPreview();
      post();
      return;
    }

    if (type === "previewGenerate") {
      const generated = await generatePair(
        message.seed,
        message.family,
        message.style,
        message.contrast,
        message.algorithm,
        message.withCode === true,
      );
      if (!generated.ok) {
        postDraftPreview(message.requestId, { ok: false, message: generated.message });
        return;
      }

      postDraftPreview(message.requestId, {
        ok: true,
        preview: await draftPreviewOf(generated.pair.themes),
      });
      return;
    }

    if (type === "draftFromPreset") {
      if (selection?.origin !== "preset" || selected.length === 0) return;

      const light = selected.find((theme) => theme.meta?.mode === "light") ?? selected[0]!;
      const label =
        presetSource === undefined
          ? selection.name
          : `${presetSource.kind === "brand" ? "Brand" : "Preset"} · ${presetSource.family}`;
      await installDefineDraft(selected, light, label, presetSource, "catalog");
      return;
    }

    if (type === "draftFromPresetId") {
      const catalog = await options.client.catalog();
      const entry = catalog.ok
        ? catalog.value?.entries.find((item) => item.id === message.id)
        : undefined;
      if (entry === undefined) return;

      const family = Object.values(entry.themes);
      const light = entry.themes.light ?? family[0];
      if (light === undefined) return;

      const kind = entry.kind === "brand" ? "brand" : "preset";
      await installDefineDraft(
        family,
        light,
        `${kind === "brand" ? "Brand" : "Preset"} · ${entry.family}`,
        { kind, family: entry.family },
        "catalog",
      );
      return;
    }

    if (type === "draftFromTheme") {
      const root = options.roots()[0];
      const entry = root?.inspection.registries.find((registry) => registry.path === message.path);
      const theme = entry?.themes?.find((candidate) => candidate.name === message.name);
      if (entry === undefined || theme === undefined) return;

      const family = familyOf(entry.themes ?? [theme], theme);
      const source = entry.themeSources?.find(
        (candidate) =>
          candidate.name === theme.name &&
          (candidate.mode ?? "") === (theme.meta?.mode ?? ""),
      );
      await installDefineDraft(
        family,
        theme,
        `Project · ${themeFamilyName(theme)}`,
        undefined,
        source?.origin,
        entry.path,
      );
      return;
    }

    if (type === "presets") {
      const catalog = await options.client.catalog();
      if (!catalog.ok || catalog.value === null) {
        notice = { kind: "error", text: "The preset catalog could not be read." };
        post();
        return;
      }

      presets = catalog.value.entries.map((entry) => {
        const light = entry.themes.light ?? Object.values(entry.themes)[0];
        return {
          id: entry.id,
          label: entry.name,
          // The family is the join key between a catalog entry and the project
          // themes that came from it: a project's catalog-origin themes carry
          // the same `family` their catalog entry declares, so the drawer can
          // say which presets the project already includes without a second
          // catalog or a second scan.
          family: entry.family,
          kind: entry.kind,
          style: entry.style,
          modes: Object.keys(entry.themes),
          swatches: [
            light?.tokens?.colors?.primary,
            light?.tokens?.colors?.accent,
            light?.tokens?.colors?.background,
          ].filter((value): value is string => typeof value === "string"),
        };
      });
      post();
      return;
    }

    if (type === "selectPreset") {
      const { id } = message;

      const catalog = await options.client.catalog();
      const entry = catalog.ok
        ? catalog.value?.entries.find((item) => item.id === id)
        : undefined;
      if (entry === undefined) return;

      const family = Object.values(entry.themes);
      const light = entry.themes.light ?? family[0];
      if (light === undefined) return;

      draftSeed = undefined;
      draftKind = "generate";
      draftInputs = undefined;
      draftBaseline = undefined;
      selected = family;
      presetSource = {
        kind: entry.kind === "brand" ? "brand" : "preset",
        family: entry.family,
      };
      const view = await toView(
        light,
        "preset",
        false,
        Object.keys(entry.themes),
        options.client,
        family,
      );
      selection = { ...view, producingApi: "catalog" };
      notice = { kind: "info", text: "A preset is read-only and is not registered in this project." };
      syncPreview();
      post();
      return;
    }

    if (type === "setMode") {
      const mode = message.mode;
      if (selection === undefined) return;

      const theme = selected.find((candidate) => candidate.meta?.mode === mode);
      if (theme === undefined) return;

      // Capture before the await: assigning from a value read after it is the
      // race the rule warns about, and here it is real — another intent could
      // have replaced the selection in between.
      const current = selection;
      // The capture above is what makes this safe: every value the call needs is
      // read before the await, and the assignment only installs the result.
      const view = await toView(
        theme,
        current.origin,
        current.saved,
        current.modes,
        options.client,
        selected,
        current.source,
        current.origin === "draft" ? draftBaseline : undefined,
      );
      selection =
        current.origin === "project"
          ? { ...view, ...projectMetadataFor(current.source, theme) }
          : carryMetadata(current, view);
      
      // Keep an open Theme Preview in step, without revealing or creating it.
      syncPreview();

      post();
      return;
    }

    if (type === "editToken") {
      await applyDraftValue(message.path, message.value);
      return;
    }

    if (type === "resetToken") {
      const baseline = baselineDraftTheme();
      const original = baseline === undefined ? undefined : tokenValueAt(baseline.tokens, message.path);
      if (original === undefined) return;
      await applyDraftValue(message.path, original);
      return;
    }

    if (type === "resetGroup") {
      const current = currentDraftTheme();
      if (current === undefined || draftBaseline === undefined) return;
      const group = buildThemeEditor({
        theme: current.theme,
        family: selected,
        baseline: draftBaseline,
        editable: true,
      }).editor.groups.find((entry) => entry.id === message.group);
      if (group === undefined) return;

      let theme = current.theme;
      let changed = false;
      for (const token of group.tokens) {
        if (!token.changed || token.original === undefined) continue;
        const updated = editThemeToken(theme, token.path, token.original);
        if (updated === undefined) continue;
        theme = updated;
        changed = true;
      }
      if (!changed) return;

      const next = [...selected];
      next[current.index] = theme;
      selected = next;
      await refreshDraft(theme);
      return;
    }

    if (type === "resetDraft") {
      if (draftBaseline === undefined || draftBaseline.length === 0) return;
      const mode = selection?.mode;
      const theme =
        draftBaseline.find((candidate) => modeOf(candidate) === mode) ?? draftBaseline[0]!;
      selected = draftBaseline;
      await refreshDraft(theme);
      notice = { kind: "info", text: "Draft reset to its original basis. Nothing has been written." };
      post();
      return;
    }

    if (type === "discardDraft") {
      await discardCurrentDraft();
      return;
    }

    if (type === "selectDraft") {
      await selectRegistryDraft(message.id);
      return;
    }

    if (type === "preview") {
      if (selection === undefined) return;
      const label = selection.source ?? `${selection.origin} · ${selection.name}`;
      const mode = selection.mode === "dark" ? "dark" : selection.mode === "light" ? "light" : undefined;
      await options.preview.openThemes(selected, label, mode, draftId);
      return;
    }

    if (type === "open") {
      const { path, line, column } = message;
      const root = options.roots()[0];
      if (root === undefined) return;

      // The webview names a workspace-relative file the inspection produced.
      // Traversal and unknown paths are refused here, not trusted.
      if (!isInspectionPath(root.inspection, path)) return;

      const uri = Uri.joinPath(Uri.file(root.inspection.root), ...path.split("/"));

      if (typeof line === "number" && Number.isInteger(line) && line >= 1) {
        const target = new Position(
          line - 1,
          typeof column === "number" && Number.isInteger(column) && column >= 1 ? column - 1 : 0,
        );
        await window.showTextDocument(uri, { selection: new Range(target, target) });
        return;
      }

      // No reliable position: open the known file, never a guessed line.
      await window.showTextDocument(uri);
      return;
    }

    if (type === "openSource") {
      const source = selection?.source;
      const root = options.roots()[0];
      if (source === undefined || root === undefined) return;

      // The webview names a workspace-relative path it was given; the host
      // resolves it against the folder, so no absolute path crosses the boundary.
      const uri = Uri.joinPath(Uri.file(root.inspection.root), ...source.split("/"));
      await commands.executeCommand("vscode.open", uri);
      return;
    }

    if (type === "copy") {
      await env.clipboard.writeText(message.text);
      return;
    }

    if (type === "chooseSaveLocation") {
      if (selected.length === 0) return;
      const format = asFormat(message.format);
      const name = themeFileName(message.fileName, format);
      const root = options.roots()[0];
      const picked = await window.showSaveDialog({
        saveLabel: "Save Theme",
        // The filter is the extension the file actually gets, not the format
        // key: a `ts-generate` filter makes Windows write `theme.ts.ts-generate`.
        filters: { "Theme file": [extensionForFormat(format)] },
        ...(root === undefined
          ? {}
          : { defaultUri: Uri.joinPath(Uri.file(root.inspection.root), name) }),
      });
      if (picked === undefined) return;

      chosenDirectory = Uri.file(directoryOf(picked.fsPath));
      void panel?.webview.postMessage({
        type: "saveLocation",
        path: picked.fsPath,
        directory: chosenDirectory.fsPath,
        fileName: baseNameOf(picked.fsPath),
      } satisfies StudioHostMessage);
      return;
    }

    if (type === "save") {
      if (selected.length === 0) return;

      // Smart format selection: use the message format if provided, otherwise
      // suggest based on the theme's origin and generation options.
      const requestedFormat = asFormat(message.format);
      const hasGenerateOptions = draftSeed !== undefined;
      const primaryTheme = selected[0]!;
      const origin = detectThemeOrigin(primaryTheme);
      const chosen = requestedFormat ?? suggestSaveFormat(origin, hasGenerateOptions);

      // Validate format compatibility before attempting to save.
      const validationWarning = validateSaveFormat(chosen, selected);
      if (validationWarning !== undefined) {
        notice = { kind: "info", text: validationWarning };
      }

      const name = themeFileName(message.fileName, chosen);

      let css: string | undefined;
      if (chosen === "css") {
        const light = await options.client.cssDocument({ theme: selected[0]! });
        const dark = await options.client.cssDocument({ theme: selected[1] ?? selected[0]! });
        css = [light, dark]
          .map((result) => (result.ok && result.value !== null ? result.value : ""))
          .filter((part) => part.length > 0)
          .join("\n\n");
      }

      // Two destinations, both explicit: beside the theme source the selection
      // came from, or wherever the user picked. A generated draft has no source,
      // so it can only go where the picker said.
      const { destination } = message;
      let target: Uri | undefined;
      let chosenPath: string | undefined;

      if (destination === "source" && selection?.source !== undefined) {
        const root = options.roots()[0];
        if (root !== undefined) {
          const directory = selection.source.split("/").slice(0, -1);
          target = Uri.joinPath(Uri.file(root.inspection.root), ...directory, name);
          chosenPath = selection.source.split("/").slice(0, -1).join("/") || ".";
        }
      }

      // The webview's "Choose a location…" already ran the native picker. Reuse
      // that folder instead of making the user pick the same place twice — which
      // is what happened whenever the form said "source" for a draft that has no
      // source to sit beside.
      if (target === undefined && chosenDirectory !== undefined) {
        target = Uri.joinPath(chosenDirectory, name);
      }

      if (target === undefined) {
        const picked = await window.showSaveDialog({
          saveLabel: "Save Theme",
          filters: { "Theme file": [extensionForFormat(chosen)] },
          ...(options.roots()[0] === undefined
            ? {}
            : { defaultUri: Uri.joinPath(Uri.file(options.roots()[0]!.inspection.root), name) }),
        });
        if (picked === undefined) {
          chosenDirectory = undefined;
          notice = { kind: "info", text: "Save cancelled; nothing was written." };
          void panel?.webview.postMessage({
            type: "saveResult",
            ok: false,
          } satisfies StudioHostMessage);
          post();
          return;
        }
        target = picked;
      }

      // Build the payload: prefer explicit draft/preset context, otherwise
      // extract from the theme's metadata for origin-aware saves.
      let payload: PayloadOptions | undefined;
      if (draftSeed !== undefined || presetSource !== undefined) {
        payload = draftPayload();
      } else {
        // No explicit context: extract from theme metadata based on origin.
        const generatePayload = buildGeneratePayload(primaryTheme);
        if (generatePayload !== undefined) {
          payload = generatePayload;
        } else {
          const presetPayload = buildPresetPayload(primaryTheme);
          if (presetPayload !== undefined) {
            payload = presetPayload;
          }
        }
      }

      const outcome = await options.save(selected, {
        format: chosen,
        fileName: name,
        target,
        ...(css === undefined ? {} : { css }),
        ...(payload === undefined ? {} : { payload }),
      });

      if (!outcome.ok) {
        chosenDirectory = undefined;
        notice =
          outcome.reason === "failed"
            ? { kind: "error", text: `Could not write the theme: ${outcome.message}` }
            : { kind: "info", text: "Save cancelled; nothing was written." };
        if (outcome.reason === "failed") {
          void window.showErrorMessage(`Themvora could not write the theme: ${outcome.message}`);
        }
        void panel?.webview.postMessage({
          type: "saveResult",
          ok: false,
        } satisfies StudioHostMessage);
      } else {
        if (selection !== undefined) selection = { ...selection, saved: true };
        chosenDirectory = undefined;

        // The write succeeded, so this exact revision is now on disk. Marking
        // it saved is what stops a command from treating the draft as unsaved
        // work and re-offering it for a write it has already had.
        if (draftId !== undefined) {
          const marked = options.drafts.markSaved(draftId, draftRevision, outcome.path);
          if (marked.ok) draftRevision = marked.draft.revision;
        }

        // A written file is not discovered until the inspection runs again.
        // The write already succeeded, so a scan failure is reported separately
        // rather than turning the save into a failure.
        if (options.refresh !== undefined) {
          try {
            await options.refresh();
          } catch {
            notice = {
              kind: "error",
              text: `Written to ${outcome.path}, but the project could not be re-scanned. Use Refresh Project.`,
            };
            void panel?.webview.postMessage({
              type: "saveResult",
              ok: true,
              path: outcome.path,
            } satisfies StudioHostMessage);
            announceSaved(outcome.path);
            post();
            return;
          }
        }

        // The draft became a file: select that file's theme so the library and
        // the preview stop showing a draft that no longer exists.
        await adoptSavedTheme(target, primaryTheme.name);
        notice = {
          kind: "info",
          text: `Saved to ${outcome.path}${chosenPath === undefined ? "" : ` (beside ${chosenPath})`}. The project was re-scanned; the file is not registered until a provider supplies it.`,
        };
        void panel?.webview.postMessage({
          type: "saveResult",
          ok: true,
          path: outcome.path,
        } satisfies StudioHostMessage);
        announceSaved(outcome.path);
      }
      post();
      return;
    }

    if (type === "serialize") {
      if (selected.length === 0) return;

      const chosen = asFormat(message.format);

      let text: string;
      if (chosen === "css") {
        const light = await options.client.cssDocument({ theme: selected[0]! });
        const dark = await options.client.cssDocument({ theme: selected[1] ?? selected[0]! });
        text = [light, dark]
          .map((result) => (result.ok && result.value !== null ? result.value : ""))
          .filter((part) => part.length > 0)
          .join("\n\n");
      } else {
        text = themeFilePayload(selected, chosen, draftPayload());
      }

      const reply: StudioHostMessage = { type: "fileText", text };
      void panel?.webview.postMessage(reply);
      return;
    }

    if (type === "generatePatch") {
      // Get the current selection (draft or project theme)
      if (selected.length === 0) {
        notice = { kind: "error", text: "No theme selected for patch generation." };
        post();
        return;
      }

      // Use the first theme for the patch (or we could generate multiple patches)
      const theme = selected[0]!;

      // Determine target path
      const root = options.roots()[0];
      const inspection = root?.inspection;
      const suggestedPath = inspection !== undefined ? suggestTargetFiles(inspection)[0]?.path : undefined;
      const targetPath: string = message.targetPath ?? suggestedPath ?? "src/theme.ts";

      // Determine framework
      const framework: SupportedFramework = mapFrameworkToSupported(profile?.framework ?? "unknown");

      // Determine patch type based on whether the file exists
      const existingFile = inspection?.registries.find((r) => r.path === targetPath);
      const patchType = existingFile !== undefined ? "add-to-theme-file" : "create-theme-file";

      // Get original content if updating
      let originalContent = "";
      if (existingFile !== undefined && root !== undefined) {
        // Try to read the file content
        try {
          const fileUri = Uri.joinPath(Uri.file(root.name), targetPath);
          const content = await workspace.fs.readFile(fileUri);
          originalContent = Buffer.from(content).toString("utf8");
        } catch {
          // File doesn't exist or can't be read, treat as create
          originalContent = "";
        }
      }

      // Generate the patch proposal
      try {
        const patch = generatePatchProposal({
          theme,
          targetPath,
          patchType,
          framework,
          originalContent,
          themeVariableName: theme.name.replace(/[^a-zA-Z0-9]/gu, "") + "Theme",
          saveFormat: "ts",
        });

        const reply: StudioHostMessage = { type: "patchPreview", patch };
        void panel?.webview.postMessage(reply);
      } catch (error) {
        notice = { kind: "error", text: `Failed to generate patch: ${String(error)}` };
        post();
      }
      return;
    }

    if (type === "applyPatch") {
      const outcome = await options.applyPatch(message.patch);

      if (!outcome.ok) {
        notice = { kind: "error", text: `Could not apply patch: ${outcome.message}` };
        post();
        return;
      }

      // A written file is not discovered until the inspection runs again.
      if (options.refresh !== undefined) {
        try {
          await options.refresh();
        } catch {
          notice = {
            kind: "error",
            text: `Written to ${outcome.path}, but the project could not be re-scanned. Use Refresh Project.`,
          };
          post();
          return;
        }
      }

      notice = {
        kind: "info",
        text: `Patch applied to ${outcome.path}. The project was re-scanned.`,
      };
      post();
      return;
    }

    if (type === "openColorThemePicker") {
      // A fixed command, never a name supplied by the webview: opening the
      // native picker is the whole action. It reports nothing back, because a
      // picker that opens is not a theme that changed, and cancelling it is a
      // normal outcome rather than a failure.
      try {
        await commands.executeCommand("workbench.action.selectTheme");
      } catch {
        // `handle` runs detached from the message listener, so an unhandled
        // rejection would surface as a console error. A host that cannot show
        // the picker gets a sentence instead.
        notice = {
          kind: "error",
          text: "VS Code's color theme picker is not available in this window.",
        };
        post();
      }
      return;
    }

    if (type === "setStudioAppearance") {
      // The parser already narrowed this to the three known modes. The webview
      // has applied it to its own DOM; persisting it is what makes the choice
      // survive the panel being disposed and reopened.
      try {
        await options.studioAppearance.write(message.appearance);
      } catch {
        // A failed write must not break the session: the current panel keeps
        // the appearance it already applied, and the next open falls back to
        // whatever was last stored successfully.
      }
      return;
    }
  }

  /** The document. */
  function html(webview: WebviewPanel["webview"]): string {
    const script = webview.asWebviewUri(
      Uri.joinPath(options.extensionUri, "dist", "webview", "studio.js"),
    );
    const style = webview.asWebviewUri(
      Uri.joinPath(options.extensionUri, "dist", "webview", "studio.css"),
    );

    // No inline script or style, so no nonce and no `unsafe-inline`: everything
    // is a packaged asset served from the webview origin. The appearance is the
    // one piece of state written into the document, so the first paint is in the
    // persisted mode instead of flashing the workbench default first.
    return `<!DOCTYPE html>
<html lang="en" data-studio-appearance="${parseStudioAppearance(options.studioAppearance.read())}">
<head>
<meta charset="UTF-8" />
<meta http-equiv="Content-Security-Policy"
  content="default-src 'none'; img-src ${webview.cspSource} data:; font-src ${webview.cspSource}; style-src ${webview.cspSource}; script-src ${webview.cspSource};" />
<link rel="stylesheet" href="${style.toString()}" />
<title>Themvora Studio</title>
</head>
<body>
<div id="root"></div>
<script src="${script.toString()}"></script>
</body>
</html>`;
  }

  return {
    async open(presetId?: string): Promise<void> {
      // Refuse before creating a panel: a Studio over a folder with no Themvora
      // opens onto an empty library and a canvas that cannot be driven, which
      // reads as a broken extension rather than a missing setup.
      // Opening a specific catalog preset is a standalone workflow: the preset
      // ships with the extension, so it needs nothing from the project. Opening
      // the Studio bare is the project workflow, and that one needs a project.
      //
      // Multi-root: the Studio shows every folder, so it is enough for *one* of
      // them to use Themvora. Blocking because the first folder is unrelated
      // would hide a project that is right there in the second one.
      if (presetId === undefined && options.roots().length > 0) {
        if (profile === undefined) await refreshProfile();
        const usable = options.roots().some((root) => workspaceSetup(root.inspection, profile).studioEnabled);
        if (!usable) {
          const first = options.roots()[0];
          if (first !== undefined) options.onUnconfigured?.(workspaceSetup(first.inspection, profile));
          return;
        }
      }

      // A caller may name a preset to land on, which is what the sidebar's
      // "open in Studio" does.
      const selectPreset = async (): Promise<void> => {
        if (presetId !== undefined) await handle({ type: "selectPreset", id: presetId });
      };

      if (panel !== undefined) {
        panel.reveal();
        await refreshProfile();
        await applyDefaultSelection();
        post();
        // The catalog is only fetched once, but a fresh reveal of a disposed
        // panel has none: ask for it again so the Presets tab is never empty.
        if (presets === undefined) await handle({ type: "presets" });
        await selectPreset();
        return;
      }

      panel = window.createWebviewPanel("themvora.studio", "Themvora Studio", ViewColumn.Active, {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [Uri.joinPath(options.extensionUri, "dist", "webview")],
      });
      panel.iconPath = Uri.joinPath(options.extensionUri, "media", "themvora.svg");
      panel.webview.html = html(panel.webview);

      panel.webview.onDidReceiveMessage((message: unknown) => {
        const intent = parseStudioIntent(message);
        if (intent === null) return;

        // One write at a time: a second click on Save while the first is still
        // resolving must not run the dialog and the write again.
        if (intent.type === "save") {
          if (writing) return;
          writing = true;
        }

        void handle(intent)
          .catch((error: unknown) => {
            // Every intent ends in a posted model. A handler that throws would
            // otherwise leave the webview on a stale frame with no explanation,
            // which is what a failed save looked like: the file was written, the
            // dialog never closed and nothing said so.
            notice = {
              kind: "error",
              text: `The Studio could not finish that action: ${describeError(error)}`,
            };
            if (intent.type === "save") {
              chosenDirectory = undefined;
              void panel?.webview.postMessage({
                type: "saveResult",
                ok: false,
              } satisfies StudioHostMessage);
            }
            post();
          })
          .finally(() => {
            if (intent.type === "save") writing = false;
          });
      });

      panel.onDidDispose(() => {
        panel = undefined;
        // A new panel rebuilds from the same host state; only the catalog cache
        // is dropped, because a catalog can change between sessions.
        presets = undefined;
      });

      if (presets === undefined) await handle({ type: "presets" });
      await selectPreset();
      await refreshProfile();
      await applyDefaultSelection();
      post();
    },

    async refresh(): Promise<void> {
      // A closed panel has nothing to re-render, and the profile read below is a
      // walk of the project. Opening the panel rebuilds from the same state.
      if (panel === undefined) return;
      await refreshProfile();
      await applyDefaultSelection();
      post();
    },

    isOpen(): boolean {
      return panel !== undefined;
    },

    dispose(): void {
      panel?.dispose();
      panel = undefined;
      modeChangeSubscription?.dispose();
      modeChangeSubscription = undefined;
    },
  };
}

/** The command id. */
export const OPEN_STUDIO_COMMAND = "themvora.openStudio";

/**
 * Register the command that opens the Studio.
 *
 * @param options - The panel's dependencies.
 * @returns The command registration and the panel handle.
 */
export function registerStudioPanel(
  options: StudioPanelOptions,
): { readonly panel: StudioPanel; readonly dispose: () => void } {
  const panel = createStudioPanel(options);
  const registration = { dispose: () => panel.dispose() };

  const command = registerCommand(panel);
  return {
    panel,
    dispose: () => {
      command.dispose();
      registration.dispose();
    },
  };
}

/**
 * Register the open command.
 *
 * @param panel - The panel to open.
 * @returns The registration.
 */
function registerCommand(panel: StudioPanel): Disposable {
  return commands.registerCommand(OPEN_STUDIO_COMMAND, (presetId?: unknown) =>
    panel.open(typeof presetId === "string" ? presetId : undefined),
  );
}
