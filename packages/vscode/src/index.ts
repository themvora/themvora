/**
 * The extension entry point declared by `main` in `package.json`.
 *
 * VS Code imports this module and calls {@link activate}. It is a re-export
 * surface, not a second implementation: activation lives in `./extension`, the
 * command handlers in `./commands`, project reading in `./domain` behind the
 * `ProjectReader` interface, and the Themvora API in `./services/coreClient`.
 *
 * It also exists because the package's declaration entry (`dist/index.d.ts`)
 * must describe the activation contract — the repository's release audit checks
 * for a `dist/index.js` + `dist/index.d.ts` pair on every package, and pointing
 * `main` here is what makes that pair real rather than a stub.
 *
 * @packageDocumentation
 */
export { createClipboard } from "./adapters/clipboard.js";
export { registerThemeFileDecorations } from "./adapters/fileDecorations.js";
export type { ThemeFileDecorationOptions } from "./adapters/fileDecorations.js";
export { parseWebviewMessage } from "./adapters/previewDocument.js";
export type { HostToWebview, WebviewToHost } from "./adapters/previewDocument.js";
export { previewHtml } from "./adapters/previewPanel.js";
export type { Clipboard } from "./adapters/clipboard.js";
export { activate, deactivate } from "./extension.js";
export type { ThemvoraApi } from "./extension.js";

export { COMMAND_GENERATE_THEME, registerGenerateThemeCommand } from "./commands/generateTheme.js";
export type { GenerateCommandDeps } from "./commands/generateTheme.js";
export { COMMAND_REFRESH } from "./commands/refresh.js";
export { COMMAND_VALIDATE_THEME, registerValidateThemeCommand } from "./commands/validateTheme.js";
export {
  COMMAND_COPY_CSS_VARIABLES,
  registerCopyCssVariablesCommand,
} from "./commands/copyCssVariables.js";
export type { CopyCssCommandDeps } from "./commands/copyCssVariables.js";
export { COMMAND_BROWSE_PRESETS, registerBrowsePresetsCommand } from "./commands/browsePresets.js";
export type { BrowsePresetsDeps } from "./commands/browsePresets.js";
export { COMMAND_COMPARE_THEMES, registerCompareThemesCommand } from "./commands/compareThemes.js";
export type { CompareThemesDeps } from "./commands/compareThemes.js";
export {
  COMMAND_PREVIEW_THEME,
  createPreviewController,
  registerPreviewThemeCommand,
} from "./commands/previewTheme.js";
export type { PreviewController, PreviewControllerDeps } from "./commands/previewTheme.js";
export type { ValidateCommandDeps } from "./commands/validateTheme.js";
export { asUri } from "./commands/commandArgs.js";

export {
  CLI_UNAVAILABLE_REASON,
  CORE_OPERATION_EXPORTS,
  detectCapabilities,
} from "./domain/capabilities.js";
export type {
  Capabilities,
  CliOperation,
  CoreOperation,
  OperationAvailability,
} from "./domain/capabilities.js";
export { INTEGRATION_LABELS, recognizeConsumers } from "./domain/consumers.js";
export type {
  ApiAlias,
  ConsumerCandidate,
  ConsumerInput,
  ConsumerIntegration,
} from "./domain/consumers.js";
export { describeError } from "./domain/errors.js";
export { inspectProject } from "./domain/inspectProject.js";
export { OUTCOME_EXIT_CODES, resultOf } from "./domain/outcome.js";
export type { Diagnostic, OperationResult, Outcome } from "./domain/outcome.js";
export { CONFIG_FILES, THEME_MODULE_PATHS, isProjectFile } from "./domain/projectFiles.js";
export type {
  ConsumerEvidence,
  ProjectInspection,
  ProjectReader,
  ProviderResolution,
  ProviderUsage,
  RegistryEntry,
  RegistryKind,
  RegistryStatus,
  ThemeEvidence,
  ThemeRelationship,
} from "./domain/registry.js";
export { describeContrast, summariseContrast } from "./domain/report.js";
export type { ContrastSummary } from "./domain/report.js";
export { isValidSeed, normaliseSeed } from "./domain/seed.js";
export { buildPreviewModel } from "./domain/previewModel.js";
export type {
  PreviewInput,
  PreviewMode,
  PreviewModel,
  PreviewResult,
  PreviewRole,
} from "./domain/previewModel.js";
export { describeProjectStatus, statusIcon, statusLabel } from "./domain/statusLabels.js";
export { parseThemeDocument, shapeMessage } from "./domain/themeDocument.js";
export type { ThemeDocument } from "./domain/themeDocument.js";

export { createThemvoraClient, diagnosticOf } from "./services/coreClient.js";
export type {
  CatalogSnapshot,
  ClientOptions,
  DiffRequest,
  GenerateRequest,
  MigrationReport,
  OperationOptions,
  ThemeRequest,
  ThemvoraClient,
  ValidationReport,
} from "./services/coreClient.js";
export { createRootSessions, rootKey } from "./services/rootSessions.js";
export type { RootSessions } from "./services/rootSessions.js";
