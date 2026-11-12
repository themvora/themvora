/**
 * Studio UI state.
 *
 * Host state is authoritative; this reducer owns only presentation choices
 * (filters, rail, inspector, highlight, drawer and save form). Keeping it pure
 * lets the interaction model be tested in Node without a DOM.
 */
import type {
  StudioAppearance,
  StudioDraftPreviewResult,
  StudioPatchProposal,
  StudioSelection,
  PreviewScenario,
} from "../../src/shared/studioProtocol";
import type { EvidenceFilter } from "../studioFilters";
import { DEFAULT_FORMAT, extensionFor, fileNameFor, formatOrigin } from "./labels";

/** The library views reachable from the activity rail. */
export type StudioRail = "themes" | "sources" | "consumers";

/** Which origins the theme list shows. */
export type ThemeScope = "all" | "project" | "preset";

/** The inspector tabs. */
export type InspectorTab = "tokens" | "validation" | "details" | "source";

/** The four ways to start a theme in the Create drawer. */
export type CreateEntry = "generate" | "define" | "preset" | "existing";

/** Where a save goes. */
export type SaveDestination = "source" | "choose";

/** The comparison modes for the preview workspace. */
export type ComparisonMode = "none" | "light-dark" | "before-after";

/** The Studio's own chrome appearance, independent of the VS Code workbench. */
export type { StudioAppearance } from "../../src/shared/studioProtocol";

/** The live draft preview request and its result. */
export type DraftPreviewState =
  | { readonly requestId: number; readonly pending: true }
  | {
      readonly requestId: number;
      readonly pending: false;
      readonly result: StudioDraftPreviewResult;
    };

/** Presentation-only state. */
export interface StudioUiState {
  readonly query: string;
  readonly scope: ThemeScope;
  readonly evidence: EvidenceFilter;
  readonly rail: StudioRail;
  readonly inspector: InspectorTab;
  readonly highlight?: string | undefined;
  /** The preview region last inspected, for the reverse token lookup. */
  readonly previewRegion?: string | undefined;
  readonly comparisonMode: ComparisonMode;
  readonly creating: boolean;
  readonly createEntry: CreateEntry;
  readonly draftMode: string;
  readonly seed: string;
  readonly family: string;
  readonly style: string;
  readonly withCode: boolean;
  readonly saving: boolean;
  readonly format: string;
  readonly fileName: string;
  readonly destination: SaveDestination;
  /**
   * The folder the native picker returned for this save.
   *
   * Held separately from the file name so renaming the file after picking a
   * folder still writes into that folder — and so the form can show exactly
   * where the write will land instead of a path it guessed.
   */
  readonly saveDirectory?: string | undefined;
  readonly fileText?: string | undefined;
  readonly patchPreview?: StudioPatchProposal | undefined;
  /** The preview scenario to render. */
  readonly scenario: PreviewScenario;
  /** Hover-to-inspect is armed in the preview toolbar. */
  readonly inspect: boolean;
  /** The Studio chrome appearance, independent of the VS Code workbench theme. */
  readonly studioAppearance: StudioAppearance;
}

/** Every UI transition. */
export type StudioUiAction =
  | { readonly type: "set-query"; readonly query: string }
  | { readonly type: "set-scope"; readonly scope: ThemeScope }
  | { readonly type: "set-evidence"; readonly evidence: EvidenceFilter }
  | { readonly type: "set-rail"; readonly rail: StudioRail }
  | { readonly type: "set-inspector"; readonly inspector: InspectorTab }
  | { readonly type: "set-highlight"; readonly highlight?: string | undefined }
  | { readonly type: "set-preview-region"; readonly region?: string | undefined }
  | { readonly type: "set-comparison-mode"; readonly mode: ComparisonMode }
  | { readonly type: "set-scenario"; readonly scenario: PreviewScenario }
  | { readonly type: "set-inspect"; readonly inspect: boolean }
  | { readonly type: "set-studio-appearance"; readonly appearance: StudioAppearance }
  | { readonly type: "open-create" }
  | { readonly type: "close-create" }
  | { readonly type: "set-create-entry"; readonly entry: CreateEntry }
  | { readonly type: "set-draft-mode"; readonly mode: string }
  | { readonly type: "set-seed"; readonly seed: string }
  | { readonly type: "set-family"; readonly family: string }
  | { readonly type: "set-style"; readonly style: string }
  | { readonly type: "set-with-code"; readonly withCode: boolean }
  | { readonly type: "open-save" }
  | { readonly type: "close-save" }
  | { readonly type: "set-format"; readonly format: string }
  | { readonly type: "set-file-name"; readonly fileName: string }
  | { readonly type: "set-destination"; readonly destination: SaveDestination }
  | {
      /** The picker answered: remember the folder and adopt the name it returned. */
      readonly type: "set-save-location";
      readonly directory: string;
      readonly fileName: string;
    }
  | { readonly type: "set-file-text"; readonly text?: string }
  | { readonly type: "revert-all-tokens" }
  | { readonly type: "open-patch-preview"; readonly patch: StudioPatchProposal }
  | { readonly type: "close-patch-preview" }
  | {
      readonly type: "selection-changed";
      readonly selection?:
        | {
            readonly origin: StudioSelection["origin"];
            readonly draftKind?: "generate" | "define" | undefined;
          }
        | undefined;
    };

/** The initial UI state. */
export function initialUiState(appearance?: StudioAppearance): StudioUiState {
  return {
    query: "",
    scope: "all",
    evidence: "all",
    rail: "themes",
    inspector: "tokens",
    comparisonMode: "none",
    scenario: "dashboard",
    inspect: false,
    studioAppearance: appearance ?? "auto",
    creating: false,
    createEntry: "generate",
    draftMode: "light",
    seed: "#4f46e5",
    family: "",
    style: "",
    withCode: false,
    saving: false,
    format: "json",
    fileName: fileNameFor("json"),
    destination: "source",
  };
}

/**
 * Apply one UI transition.
 *
 * @param state - The current state.
 * @param action - The action.
 * @returns The next state.
 */
export function studioUiReducer(state: StudioUiState, action: StudioUiAction): StudioUiState {
  switch (action.type) {
    case "set-query":
      return { ...state, query: action.query };
    case "set-scope":
      return { ...state, scope: action.scope };
    case "set-evidence":
      return { ...state, evidence: action.evidence };
    case "set-rail":
      return { ...state, rail: action.rail };
    case "set-inspector":
      return { ...state, inspector: action.inspector };
    case "set-highlight":
      return { ...state, highlight: action.highlight };
    case "set-preview-region":
      return { ...state, previewRegion: action.region };
    case "set-comparison-mode":
      return { ...state, comparisonMode: action.mode };
    case "set-scenario":
      return { ...state, scenario: action.scenario };
    case "set-inspect":
      return { ...state, inspect: action.inspect };
    case "set-studio-appearance":
      return { ...state, studioAppearance: action.appearance };
    case "open-create":
      return { ...state, creating: true };
    case "close-create":
      return { ...state, creating: false };
    case "set-create-entry":
      return { ...state, createEntry: action.entry };
    case "set-draft-mode":
      return { ...state, draftMode: action.mode };
    case "set-seed":
      return { ...state, seed: action.seed };
    case "set-family":
      return { ...state, family: action.family };
    case "set-style":
      return { ...state, style: action.style };
    case "set-with-code":
      return { ...state, withCode: action.withCode };
    case "open-save":
      // A fresh dialog: a folder picked for a previous save must not silently
      // become the destination of this one.
      return { ...state, saving: true, fileText: undefined, saveDirectory: undefined };
    case "close-save":
      return { ...state, saving: false, fileText: undefined, saveDirectory: undefined };
    case "set-format":
      return {
        ...state,
        format: action.format,
        fileName: fileNameFor(action.format),
        fileText: undefined,
      };
    case "set-file-name":
      // The folder survives a rename: the user is naming the file, not undoing
      // the place they chose for it.
      return { ...state, fileName: action.fileName, fileText: undefined };
    case "set-destination":
      return {
        ...state,
        destination: action.destination,
        fileText: undefined,
        saveDirectory: undefined,
      };
    case "set-file-text":
      return { ...state, fileText: action.text };
    case "set-save-location":
      return {
        ...state,
        destination: "choose",
        saveDirectory: action.directory,
        fileName: action.fileName,
        fileText: undefined,
      };
    case "revert-all-tokens":
      return state;
    case "open-patch-preview":
      return { ...state, patchPreview: action.patch };
    case "close-patch-preview":
      return { ...state, patchPreview: undefined };
    case "selection-changed": {
      const format = DEFAULT_FORMAT[formatOrigin(action.selection)] ?? "json";
      const isDraft = action.selection?.origin === "draft";
      return {
        ...state,
        format,
        fileName: fileNameFor(format),
        fileText: undefined,
        highlight: undefined,
        previewRegion: undefined,
        comparisonMode: "none",
        saving: isDraft ? state.saving : false,
        saveDirectory: undefined,
        patchPreview: undefined,
      };
    }
    default:
      return state;
  }
}

/**
 * Replace the extension on a file name while preserving its base.
 *
 * @param current - The current name.
 * @param format - The new format.
 * @returns The renamed file.
 */
export function withFormatExtension(current: string, format: string): string {
  return current.replace(/\.[^./]+$/u, "") + extensionFor(format);
}
