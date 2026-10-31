/**
 * Themvora core — the framework-free theming runtime.
 *
 * Provides the theme model and store, the runtime and selection controller,
 * persistence and cross-tab broadcast, sunrise/sunset scheduling,
 * transitions and animation, DOM and CSS-variable bindings, the plugin
 * system, library adapters, token resolution, validation, generation, and
 * migration.
 *
 * @packageDocumentation
 */
export * from "./model";
export * from "./parse-theme-json";
export * from "./registry-loader";
export * from "./adapters";
export * from "./createThemeStore";
export * from "./bootstrap";
export * from "./app-config";
// Deliberately NOT exported here: the loader uses node builtins and is only
// meaningful at build time. It lives at `@themvora/core/config` so a browser
// bundle of the main entry never sees it.

// Type-only, so the Vite plugin itself is not pulled into the main bundle.
export type { ThemvoraThemeConfig } from "./vite-plugin";
export * from "./sync-first-root";
export * from "./runtime";
// Provider-aware discovery of the themes a runtime was given, plus the explicit
// `themeOverride` resolution both the runtime and the pre-paint bootstrap use.
export * from "./provided-themes";
export * from "./theme-override";
// One resolver for every naming form a selection prop accepts (variant, family),
// shared by `defaultTheme`, `themeOverride`, `initialFamily` and the bootstrap.
export * from "./theme-reference";
// The diagnostics model comes before `./errors`: `ThemeError` carries a
// diagnostic's code and context, so the two are documented together.
export * from "./diagnostics";
export * from "./errors";
export * from "./validate-theme";
export * from "./configuration";
export * from "./css";
export * from "./default-themes";
export * from "./generate-theme";
// Reading a generated theme back out of a provider: the `isGeneratedTheme`
// predicate and the deterministic `resolveGeneratedTheme` resolver that the
// framework accessors build on.
export * from "./generated-theme";
// The generation engine stays internal (theme-generation.md §1 keeps all color
// math in one module), but the names a *consumer* needs are exported: the style
// union and its runtime list, and the internal validation levels that the preset
// quality gate and DevTools consume.
export type { GenerationStyle } from "./generation";
export {
  ACTION_PROMINENCE_FLOOR,
  auditActionProminence,
  chooseForeground,
  FOREGROUND_PREFERENCE,
  hasForegroundPreference,
  preferredInk,
  auditSemanticContexts,
  contextFailures,
  describeRoleUsage,
  CONTEXT_RESTRICTIONS,
  GENERATION_STYLE_NAMES,
  measureThemeContrast,
  scoreTheme,
  SEMANTIC_CONTEXTS,
  validateThemeLevels,
} from "./generation";
export type {
  ActionProminence,
  CheckStatus,
  ForegroundPreference,
  ContextLevel,
  ContextOwner,
  ContextRequirement,
  ContextResult,
  ContextRestriction,
  SemanticContext,
  LevelIssue,
  MeasuredPair,
  PresetCheck,
  PresetScore,
  ValidationLevel,
  ValidateThemeLevelsOptions,
} from "./generation";
// Preset catalog: the derived, read-only surface the docs and tooling consume.
//
// The recipe *construction* API (`buildPresetTheme`, `buildPresetPair`, the
// recipe arrays) deliberately stays internal. Presets are curated inputs to the
// generator, not a public authoring format yet — publishing `buildPresetTheme`
// would invite consumers to build a second preset catalog beside this one, which
// is exactly the duplication Phase 7 removed.
export { BRAND_PRESET_DISCLAIMER, getPresetCatalog } from "./preset-recipes";
export type {
  BrandColorClass,
  BrandProvenance,
  BrandReferenceColor,
  BrandSource,
  BrandSourceKind,
  CatalogBrand,
  NormalizedAnchor,
  PresetCatalogEntry,
  PresetKind,
  PresetQuality,
} from "./preset-recipes";
export * from "./migrate-theme";
export * from "./debug";
export * from "./neutral-themes";
export * from "./preset-themes";
export * from "./built-in-themes";
export * from "./presets";
export * from "./brand-presets";
export * from "./accessibility-profiles";
export * from "./registry";
export * from "./resolver";
export type { ThemeStore, ThemeStoreOptions } from "./types";
export * from "./transition";
export * from "./animation";
export * from "./history";
export * from "./resolve";
export * from "./lifecycle";
export * from "./accessibility";
export * from "./plugin";
export * from "./utils/overlay-scrollbar";
// The semantic theme diff. Deliberately distinct from `./animation`'s
// `ThemeDiff`, which is the animation planner's trigger: that one answers
// "which token groups should transition", this one answers "what semantically
// differs between two themes".
export * from "./diff";
