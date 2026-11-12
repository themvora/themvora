/**
 * The Studio's serialized contract.
 *
 * Both the extension host and the React webview import these types, so a view
 * field cannot drift on one side of the message bridge. The host remains the
 * only authority: the webview posts intents, and {@link parseStudioIntent}
 * accepts only the known shapes — unknown types and malformed payloads are
 * dropped rather than passed to a handler as `unknown`.
 *
 * This module is DOM-free and `vscode`-free, which is what lets the webview
 * typecheck it without the Node types the host uses.
 *
 * @packageDocumentation
 */

/**
 * How Themvora's own Studio chrome is drawn.
 *
 * This is presentation of the extension, not the workbench: `auto` follows the
 * VS Code webview classes, while `light` and `dark` pin the Studio stylesheet
 * regardless of the installed colour theme. It never describes the theme being
 * previewed, and it is never written to VS Code settings.
 */
export type StudioAppearance = "auto" | "light" | "dark";

/** Every Studio appearance, in selector order. */
export const STUDIO_APPEARANCES = ["auto", "light", "dark"] as const;

/**
 * The global-state key holding the Studio appearance preference.
 *
 * A personal preference rather than a project one: a developer who prefers a
 * dark Studio keeps it across every workspace, exactly like the workbench theme.
 */
export const STUDIO_APPEARANCE_KEY = "themvora.studioAppearance";

/**
 * Narrow an untrusted value to a {@link StudioAppearance}.
 *
 * Persisted state outlives the code that wrote it, so anything unrecognised —
 * a future mode, a corrupted value, a missing key — falls back to `auto`.
 *
 * @param value - The raw value, from global state or a message.
 * @returns A valid appearance.
 */
export function parseStudioAppearance(value: unknown): StudioAppearance {
  return value === "light" || value === "dark" ? value : "auto";
}

/** A colour token as the host resolved it. */
export interface StudioToken {
  readonly name: string;
  readonly value: string;
  /** Every contrast pair where this token is the foreground. */
  readonly contrasts?: readonly StudioEditorContrast[];
  /** The CSS custom property core projects this token to. */
  readonly cssVar?: string;
}

/**
 * What the shared preview surface renders, computed by the host with the same
 * model builder the Theme Preview panel uses, so both show identical values.
 */
export interface StudioPreviewSurface {
  readonly themeName: string;
  readonly family: string;
  readonly mode: string;
  readonly systemMode: boolean;
  readonly modes: readonly string[];
  /** Every `--theme-*` custom property. */
  readonly variables: Readonly<Record<string, string>>;
  /** The readable foreground per filled surface, applied as `--on-<surface>`. */
  readonly readable: Readonly<Record<string, string>>;
  /** Core's contrast summary. */
  readonly contrast: string;
  readonly roles: readonly { readonly role: string; readonly value: string | null }[];
}

/** One mode of a theme, ready to render. */
export interface StudioVariant {
  /** `light`, `dark`, or whatever the theme records. */
  readonly mode: string;
  /** The theme's own name, so each panel can be labelled. */
  readonly name: string;
  /** Its colour tokens. */
  readonly tokens: readonly StudioToken[];
  /** The preview model; absent when the theme cannot be previewed. */
  readonly surface?: StudioPreviewSurface;
}

/** The preview scenario to render. */
export type PreviewScenario = "components" | "dashboard";

/** The control a token value needs, derived from its schema group. */
export type StudioTokenKind =
  | "color"
  | "length"
  | "number"
  | "shadow"
  | "font-family"
  | "font-size"
  | "line-height"
  | "text";

/** One measured contrast pair attached to a token. */
export interface StudioEditorContrast {
  readonly ratio: number;
  readonly passes: boolean;
  readonly against: string;
  readonly floor: number;
  readonly requirement: "text" | "ui";
  /** Which token is too light/dark, when the pair fails. */
  readonly direction?: "foreground-too-light" | "foreground-too-dark" | "background-too-light" | "background-too-dark";
  /** How far below the floor, when the pair fails. */
  readonly severity?: "near-miss" | "moderate" | "critical";
}

/** One editable token in the Define editor. */
export interface StudioEditorToken {
  /** The path into `ThemeTokens`; nested keys are preserved. */
  readonly path: readonly string[];
  /** The short name shown in the row. */
  readonly name: string;
  /** A humanized label derived from the schema name. */
  readonly label: string;
  /** The schema group id. */
  readonly group: string;
  readonly type: StudioTokenKind;
  /** The value in the selected mode; absent when that mode does not define it. */
  readonly value?: string;
  /** The baseline value in the selected mode, when this is a draft. */
  readonly original?: string;
  readonly changed: boolean;
  /** Every mode in the family that defines this path. */
  readonly presentIn: readonly string[];
  readonly presentInSelected: boolean;
  /** Optional schema capability rather than a required role. */
  readonly optional: boolean;
  /** The preview token key, only when the preview actually consumes it. */
  readonly previewKey?: string;
  readonly cssVar?: string;
  readonly contrasts: readonly StudioEditorContrast[];
  readonly issue?: string;
}

/** One collapsible schema group. */
export interface StudioEditorGroup {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly tokens: readonly StudioEditorToken[];
  readonly issueCount: number;
  /** Changed tokens in the selected mode. */
  readonly changedCount: number;
}

/** The selected draft's editor metadata. */
export interface StudioDraftEditor {
  readonly editable: boolean;
  readonly customized: boolean;
  /** Changed path+mode values across the whole family. */
  readonly changedTokens: number;
  /** Distinct token paths across the family. */
  readonly totalTokens: number;
  readonly modes: readonly string[];
  readonly groups: readonly StudioEditorGroup[];
}

/** The generation inputs recorded on a source `generateTheme()` call. */
export interface StudioGenerateOptions {
  readonly seed: string;
  readonly family?: string;
  readonly withCode?: boolean;
  readonly style?: string;
  readonly contrast?: string;
  readonly algorithm?: string;
}

/** One project theme in the library. */
export interface StudioTheme {
  readonly name: string;
  /** The file that defines it. */
  readonly source: string;
  readonly mode?: string;
  /** The family grouping, from metadata when present. */
  readonly family?: string;
  readonly valid: boolean;
  /** What is proven about runtime supply. */
  readonly evidence: string;
  /** Which canonical API produced it, when known. */
  readonly origin?: "definition" | "generated" | "catalog";
  /** The export/declaration symbol, when known. */
  readonly binding?: string;
  /** 1-based definition position, when known. */
  readonly location?: { readonly line: number; readonly column: number };
  /** The source region, e.g. `<script setup>` or `frontmatter`. */
  readonly region?: string;
  /** The static inputs of the `generateTheme()` call, when it produced this theme. */
  readonly generateOptions?: StudioGenerateOptions;
  /** Providers that import this theme. */
  readonly usedBy: readonly string[];
  /** A small, ordered set of the theme's own colours for a card strip. */
  readonly swatches: readonly string[];
}

/** One theme definition inside a source row. */
export interface StudioSourceTheme {
  readonly name: string;
  readonly mode?: string;
  readonly binding?: string;
  readonly origin?: "definition" | "generated" | "catalog";
  readonly location?: { readonly line: number; readonly column: number };
  readonly region?: string;
  readonly generateOptions?: StudioGenerateOptions;
  readonly valid: boolean;
  readonly issue?: string;
  /** Present only when the theme exists in the registry and has a relationship. */
  readonly evidence?: string;
  readonly usedBy: readonly string[];
}

/** One file the inspection read. */
export interface StudioSourceFile {
  readonly path: string;
  readonly kind: string;
  readonly status: string;
  readonly detail: string;
  /** The file's analyzable region, e.g. `<script setup>`. */
  readonly region?: string;
  readonly themes: number;
  readonly problems: readonly string[];
  /** Distinct provider files importing a theme from this source. */
  readonly usedBy: number;
  readonly definitions: readonly StudioSourceTheme[];
}

/** One verified runtime-consumer use. */
export interface StudioConsumer {
  readonly path: string;
  readonly names: readonly string[];
  readonly integration?: string;
  /** The human-readable integration name. */
  readonly integrationLabel?: string;
  readonly api?: string;
  /** `static`, `dynamic` or `absent`. */
  readonly input?: string;
  readonly resolution?: string;
  /** `registered`, `partially-resolved`, `dynamic-unverified`, … */
  readonly evidence?: string;
  readonly reason?: string;
  /** Names that did not reach a theme definition. */
  readonly unresolved?: readonly string[];
  /** A sentence stating what was detected and what could be traced. */
  readonly headline: string;
  readonly location?: { readonly line: number; readonly column: number };
  /** The source region, e.g. `template`, `markup`, `element`. */
  readonly region?: string;
  readonly registrationOnly?: boolean;
  readonly importsFrom?: readonly string[];
}

/** A preset family card. */
export interface StudioPreset {
  readonly id: string;
  readonly label: string;
  /** The catalog family, which is what project themes record as their own. */
  readonly family: string;
  readonly kind: string;
  /** The generation style, for filtering. */
  readonly style: string;
  readonly modes: readonly string[];
  readonly swatches: readonly string[];
}

/** A message from the host, shown in the notice bar. */
export interface StudioNotice {
  readonly kind: "info" | "error";
  readonly text: string;
}

/** Every schema issue sent with an invalid selection. */
export interface StudioIssue {
  readonly message: string;
  readonly token?: string;
  readonly path?: string;
}

/** One issue from multi-level validation. */
export interface StudioLevelIssue {
  /** Which validation level found it. */
  readonly level: "structural" | "semantic" | "contrast" | "visual" | "accessibility";
  /** Stable diagnostic code. */
  readonly code: string;
  /** Dot-path to the offending token, when there is one. */
  readonly path?: string;
  /** Human-readable description. */
  readonly message: string;
  /** The primary token involved, for navigation. */
  readonly token?: string;
  /** Other tokens involved in the same issue, for related-token navigation. */
  readonly related?: readonly string[];
}

/** Token usage analysis for a theme. */
export interface StudioTokenUsage {
  /** Tokens defined in the theme but not referenced by any consumer. */
  readonly unused: readonly string[];
  /** Tokens referenced by consumers but not defined in the theme. */
  readonly missing: readonly string[];
  /** Tokens that are both defined and used. */
  readonly used: readonly string[];
}

/** A patch proposal for adding a theme to a project. */
export interface StudioPatchProposal {
  /** The target file path (workspace-relative). */
  readonly path: string;
  /** The action: create a new file or update an existing one. */
  readonly action: "create" | "update";
  /** The original content (for updates; empty for creates). */
  readonly original: string;
  /** The new content after applying the patch. */
  readonly updated: string;
  /** A human-readable description of what the patch does. */
  readonly description: string;
  /** The framework-specific code that was generated. */
  readonly generatedCode: {
    readonly imports: readonly string[];
    readonly themeDefinition?: string;
    readonly providerMounting?: string;
    readonly registration?: string;
  };
}

/** The current Studio selection. */
export interface StudioSelection {
  readonly origin: "project" | "draft" | "preset";
  readonly name: string;
  readonly source?: string;
  readonly mode?: string;
  /** The family this variant belongs to. */
  readonly family?: string;
  readonly modes: readonly string[];
  readonly valid: boolean;
  readonly issue?: string;
  readonly saved: boolean;
  readonly tokens: readonly StudioToken[];
  /** Every resolved variant, so two modes can be rendered at once. */
  readonly variants: readonly StudioVariant[];
  /** What source analysis proves about this theme's runtime supply. */
  readonly evidence?: string;
  /** Provider files that import it. */
  readonly usedBy?: readonly string[];
  /** The export/declaration symbol, when known. */
  readonly binding?: string;
  /** Which canonical API produced it, when known. */
  readonly producingApi?: "definition" | "generated" | "catalog";
  /** 1-based definition position, when known. */
  readonly location?: { readonly line: number; readonly column: number };
  /** The source region, e.g. `<script setup>` or `frontmatter`. */
  readonly region?: string;
  /** Which Create workflow produced a draft. */
  readonly draftKind?: "generate" | "define";
  /**
   * The registry id, when this selection is an unsaved draft.
   *
   * The library uses it to tell the open draft apart from the other drafts it
   * lists, so the same draft is not offered twice.
   */
  readonly draftId?: string;
  /** The preset a draft was based on, when it came from one. */
  readonly draftSource?: string;
  /** The generation inputs, when they can be stated. */
  readonly draftInputs?: {
    readonly seed?: string;
    readonly family?: string;
    readonly style?: string;
    readonly contrast?: string;
    readonly algorithm?: string;
    readonly withCode?: boolean;
  };
  /** The static inputs of the source `generateTheme()` call. */
  readonly generateOptions?: StudioGenerateOptions;
  /** Every schema issue, for the invalid-theme canvas. */
  readonly issues?: readonly StudioIssue[];
  /** Multi-level validation issues (structural, semantic, contrast, visual, accessibility). */
  readonly levelIssues?: readonly StudioLevelIssue[];
  /** Token usage analysis: which tokens are unused, missing, or used. */
  readonly tokenUsage?: StudioTokenUsage;
  /** Grouped token metadata; editable only for drafts. */
  readonly editor?: StudioDraftEditor;
}

/** A generated draft previewed in memory, before any file exists. */
export interface StudioDraftPreview {
  readonly name: string;
  readonly family?: string;
  readonly mode?: string;
  readonly modes: readonly string[];
  readonly valid: boolean;
  readonly issue?: string;
  readonly issues: readonly StudioIssue[];
  readonly tokens: readonly StudioToken[];
  readonly variants: readonly StudioVariant[];
}

/** The outcome of previewing generation inputs. */
export type StudioDraftPreviewResult =
  | { readonly ok: true; readonly preview: StudioDraftPreview }
  | { readonly ok: false; readonly message: string };

/** A suggested target file for patch application. */
export interface StudioFileSuggestion {
  /** The workspace-relative file path. */
  readonly path: string;
  /** Why this file was suggested. */
  readonly reason: string;
  /** The suggestion priority (lower is better). */
  readonly priority: number;
  /** Whether this is a new file or existing. */
  readonly exists: boolean;
}

/** Smart defaults for patch application. */
export interface StudioPatchSuggestions {
  /** Suggested target files for theme patches. */
  readonly targetFiles: readonly StudioFileSuggestion[];
  /** Suggested provider files for theme registration. */
  readonly providerFiles: readonly StudioFileSuggestion[];
  /** Suggested component files for theme mounting. */
  readonly componentFiles: readonly StudioFileSuggestion[];
}

/** The project context shown in the Studio header. */
export interface StudioProject {
  readonly name: string;
  readonly framework: string;
  readonly packageManager: string;
  readonly status: string;
  /** The number of project theme variants (e.g., custom-light, custom-dark). */
  readonly themeCount: number;
  /** The number of project theme families (e.g., custom). */
  readonly familyCount: number;
  /** The number of catalog theme variants. */
  readonly catalogCount: number;
  /** The number of catalog theme families. */
  readonly catalogFamilyCount: number;
}

/** One unsaved draft the library can list. */
export interface StudioDraftRow {
  /** The registry id — the identity, not the name. */
  readonly id: string;
  readonly name: string;
  readonly family?: string;
  readonly modes: readonly string[];
  /** Which workflow produced it. */
  readonly origin: "generated" | "defined" | "preset" | "project";
  readonly valid: boolean;
  /** Unsaved changes relative to the last successful write. */
  readonly dirty: boolean;
  /** The registry revision, so the UI can tell a stale view from a fresh one. */
  readonly revision: number;
  /** Whether a file has been written for this draft. */
  readonly saved: boolean;
  readonly swatches: readonly string[];
}

/** Everything the host sends for a render. */
export interface StudioState {
  readonly project: StudioProject;
  readonly themes: readonly StudioTheme[];
  /** What each theme file contributed, and what it could not read. */
  readonly sources: readonly StudioSourceFile[];
  /** Files that hand themes to a provider, and the names they pass. */
  readonly providers: readonly StudioConsumer[];
  readonly presets: readonly StudioPreset[];
  /**
   * Unsaved drafts from the host registry.
   *
   * Kept out of `themes` on purpose: a draft is not a project theme, so it must
   * not reach the project counts or the library's evidence filters.
   */
  readonly drafts: readonly StudioDraftRow[];
  /** The canonical generation styles core ships. */
  readonly styles: readonly string[];
  readonly selected?: StudioSelection;
  readonly notice?: StudioNotice;
  /** Smart defaults for patch application. */
  readonly suggestions?: StudioPatchSuggestions;
  /** The preview scenario to render (components or dashboard). */
  readonly scenario?: PreviewScenario;
}

/** Host → webview. */
export type StudioHostMessage =
  | { readonly type: "state"; readonly state: StudioState }
  | { readonly type: "fileText"; readonly text: string }
  /**
   * The native picker's answer.
   *
   * The folder and the file name travel separately: the folder is where the
   * write goes, and the name is what the form now shows, so editing the name
   * afterwards still writes into the folder the user just chose.
   */
  | {
      readonly type: "saveLocation";
      readonly path: string;
      readonly directory: string;
      readonly fileName: string;
    }
  | {
      /** A save attempt finished: the dialog closes on either outcome. */
      readonly type: "saveResult";
      readonly ok: boolean;
      readonly path?: string;
    }
  | { readonly type: "patchPreview"; readonly patch: StudioPatchProposal }
  | {
      readonly type: "draftPreview";
      readonly requestId: number;
      readonly result: StudioDraftPreviewResult;
    };

/** Webview → host intents. */
export type StudioIntent =
  | { readonly type: "ready" }
  | { readonly type: "selectProject"; readonly path: string; readonly name: string }
  /**
   * Edit an unsaved draft that already exists in the host registry.
   *
   * Only the id travels: the host reads the record, so the revision and the
   * theme data are the registry's rather than the webview's memory of them.
   */
  | { readonly type: "selectDraft"; readonly id: string }
  | {
      readonly type: "generate";
      readonly seed: string;
      readonly kind: "generate" | "define";
      readonly family?: string;
      readonly style?: string;
      readonly contrast?: string;
      readonly algorithm?: string;
      readonly withCode?: boolean;
    }
  | {
      readonly type: "previewGenerate";
      readonly requestId: number;
      readonly seed: string;
      readonly kind: "generate" | "define";
      readonly family?: string;
      readonly style?: string;
      readonly contrast?: string;
      readonly algorithm?: string;
      readonly withCode?: boolean;
    }
  | { readonly type: "draftFromPreset" }
  | { readonly type: "draftFromPresetId"; readonly id: string }
  | { readonly type: "draftFromTheme"; readonly path: string; readonly name: string }
  | { readonly type: "presets" }
  | { readonly type: "selectPreset"; readonly id: string }
  | { readonly type: "setMode"; readonly mode: string }
  | { readonly type: "preview" }
  | {
      readonly type: "open";
      readonly path: string;
      readonly line?: number;
      readonly column?: number;
    }
  | { readonly type: "openSource" }
  | { readonly type: "copy"; readonly text: string }
  | {
      readonly type: "save";
      readonly format: string;
      readonly fileName: string;
      readonly destination: string;
    }
  | {
      /** Show the native save dialog and report the chosen path, without writing. */
      readonly type: "chooseSaveLocation";
      readonly format: string;
      readonly fileName: string;
    }
  | { readonly type: "serialize"; readonly format: string }
  | { readonly type: "editToken"; readonly path: readonly string[]; readonly value: string }
  | { readonly type: "resetToken"; readonly path: readonly string[] }
  | { readonly type: "resetGroup"; readonly group: string }
  | { readonly type: "resetDraft" }
  /**
   * Abandon the selected draft.
   *
   * Distinct from `resetDraft`: resetting restores the baseline values and keeps
   * the draft, discarding removes it from the host registry. The host decides
   * whether to confirm, because only it knows whether the draft is dirty.
   */
  | { readonly type: "discardDraft" }
  | { readonly type: "generatePatch"; readonly targetPath?: string }
  | { readonly type: "openPatchPreview"; readonly patch: StudioPatchProposal }
  | { readonly type: "applyPatch"; readonly patch: StudioPatchProposal }
  | { readonly type: "cancelPatch" }
  | { readonly type: "openColorThemePicker" }
  | { readonly type: "setStudioAppearance"; readonly appearance: StudioAppearance };

/**
 * Validate a patch proposal.
 *
 * @param value - The raw value.
 * @returns True when the value is a valid patch proposal.
 */
function isPatchProposal(value: unknown): value is StudioPatchProposal {
  if (typeof value !== "object" || value === null) return false;
  const patch = value as Record<string, unknown>;
  if (typeof patch.path !== "string") return false;

  // Validate path safety: reject absolute paths and traversal attempts
  if (patch.path.startsWith("/") || patch.path.startsWith("\\") || /^[A-Za-z]:/.test(patch.path)) {
    return false;
  }
  if (patch.path.includes("..")) {
    return false;
  }

  if (patch.action !== "create" && patch.action !== "update") return false;
  if (typeof patch.original !== "string") return false;
  if (typeof patch.updated !== "string") return false;
  if (typeof patch.description !== "string") return false;
  if (typeof patch.generatedCode !== "object" || patch.generatedCode === null) return false;
  const code = patch.generatedCode as Record<string, unknown>;
  if (!Array.isArray(code.imports)) return false;
  return true;
}

/**
 * Read an optional string field.
 *
 * @param value - The raw property.
 * @returns The string, or undefined when absent/not a string.
 */
function optionalString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

/**
 * Read an optional coordinate.
 *
 * @param value - The raw property.
 * @returns The number when it is a finite number, else undefined.
 */
function optionalNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

/**
 * Validate a token path.
 *
 * @param value - The raw property.
 * @returns A copy of the path, or null when it is empty or contains non-strings.
 */
function tokenPath(value: unknown): string[] | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > 8) return null;
  if (!value.every((segment) => typeof segment === "string" && segment.length > 0)) return null;
  return [...value] as string[];
}

/**
 * Validate one message from the webview.
 *
 * Only the known intents are accepted. A malformed required field rejects the
 * whole message; unknown fields are ignored. The parser never throws, because a
 * malformed message must not take down the host.
 *
 * @param value - Whatever arrived on the channel.
 * @returns The typed intent, or `null`.
 */
export function parseStudioIntent(value: unknown): StudioIntent | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;

  const message = value as Record<string, unknown>;
  const type = message.type;

  if (
    type === "ready" ||
    type === "draftFromPreset" ||
    type === "presets" ||
    type === "preview" ||
    type === "openSource" ||
    type === "resetDraft"
  ) {
    return { type };
  }

  if (type === "selectProject") {
    if (typeof message.path !== "string" || typeof message.name !== "string") return null;
    return { type, path: message.path, name: message.name };
  }

  if (type === "selectDraft") {
    if (typeof message.id !== "string" || message.id.length === 0) return null;
    return { type, id: message.id };
  }

  if (type === "generate") {
    if (typeof message.seed !== "string") return null;
    const family = optionalString(message.family);
    const style = optionalString(message.style);
    const contrast = optionalString(message.contrast);
    const algorithm = optionalString(message.algorithm);
    return {
      type,
      seed: message.seed,
      kind: message.kind === "define" ? "define" : "generate",
      ...(family === undefined ? {} : { family }),
      ...(style === undefined ? {} : { style }),
      ...(contrast === undefined ? {} : { contrast }),
      ...(algorithm === undefined ? {} : { algorithm }),
      ...(message.withCode === true ? { withCode: true } : {}),
    };
  }

  if (type === "previewGenerate") {
    if (typeof message.seed !== "string") return null;
    const requestId = optionalNumber(message.requestId);
    if (requestId === undefined) return null;
    const family = optionalString(message.family);
    const style = optionalString(message.style);
    const contrast = optionalString(message.contrast);
    const algorithm = optionalString(message.algorithm);
    return {
      type,
      requestId,
      seed: message.seed,
      kind: message.kind === "define" ? "define" : "generate",
      ...(family === undefined ? {} : { family }),
      ...(style === undefined ? {} : { style }),
      ...(contrast === undefined ? {} : { contrast }),
      ...(algorithm === undefined ? {} : { algorithm }),
      ...(message.withCode === true ? { withCode: true } : {}),
    };
  }

  if (type === "draftFromPresetId") {
    if (typeof message.id !== "string") return null;
    return { type, id: message.id };
  }

  if (type === "draftFromTheme") {
    if (typeof message.path !== "string" || typeof message.name !== "string") return null;
    return { type, path: message.path, name: message.name };
  }

  if (type === "selectPreset") {
    if (typeof message.id !== "string") return null;
    return { type, id: message.id };
  }

  if (type === "setMode") {
    if (typeof message.mode !== "string") return null;
    return { type, mode: message.mode };
  }

  if (type === "open") {
    if (typeof message.path !== "string") return null;
    const line = optionalNumber(message.line);
    const column = optionalNumber(message.column);
    return {
      type,
      path: message.path,
      ...(line === undefined ? {} : { line }),
      ...(column === undefined ? {} : { column }),
    };
  }

  if (type === "copy") {
    if (typeof message.text !== "string") return null;
    return { type, text: message.text };
  }

  if (type === "save") {
    if (
      typeof message.format !== "string" ||
      typeof message.fileName !== "string" ||
      typeof message.destination !== "string"
    ) {
      return null;
    }
    return {
      type,
      format: message.format,
      fileName: message.fileName,
      destination: message.destination,
    };
  }

  if (type === "chooseSaveLocation") {
    if (typeof message.format !== "string" || typeof message.fileName !== "string") return null;
    return { type, format: message.format, fileName: message.fileName };
  }

  if (type === "serialize") {
    if (typeof message.format !== "string") return null;
    return { type, format: message.format };
  }

  if (type === "editToken") {
    const path = tokenPath(message.path);
    if (path === null || typeof message.value !== "string") return null;
    return { type, path, value: message.value };
  }

  if (type === "resetToken") {
    const path = tokenPath(message.path);
    return path === null ? null : { type, path };
  }

  if (type === "resetGroup") {
    if (typeof message.group !== "string") return null;
    return { type, group: message.group };
  }

  if (type === "resetDraft") {
    return { type };
  }

  if (type === "discardDraft") {
    return { type };
  }

  if (type === "generatePatch") {
    const targetPath = optionalString(message.targetPath);
    return {
      type,
      ...(targetPath === undefined ? {} : { targetPath }),
    };
  }

  if (type === "openPatchPreview" || type === "applyPatch") {
    if (!isPatchProposal(message.patch)) return null;
    return { type, patch: message.patch };
  }

  if (type === "cancelPatch") {
    return { type };
  }

  if (type === "openColorThemePicker") {
    return { type };
  }

  if (type === "setStudioAppearance") {
    // Only the three known modes cross the bridge; the parser is the boundary
    // that stops a webview from writing arbitrary values into global state.
    if (message.appearance !== "auto" && message.appearance !== "light" && message.appearance !== "dark") {
      return null;
    }
    return { type, appearance: message.appearance };
  }

  return null;
}
