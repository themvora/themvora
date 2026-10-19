/**
 * Canonical capability registry — the single source for feature → package →
 * symbol mapping (docs-system brief §4 / §12 Phase 2).
 *
 * Consumers:
 *  - Audit E: every symbol referenced by the docs must be listed here AND exist
 *    in the shipped surface (docs/reference/public-api.json).
 *  - Audit F: nothing classified `INTERNAL` may appear here or in the docs.
 *  - Feature/framework/adapter pages: a page may not reference an exported
 *    symbol that is absent from this file (§4 rule).
 *
 * Derivation rules (brief §1 — the shipped package is the only source of truth):
 *  - Symbol lists are taken from the *shipped* surface, cross-checked against
 *    `docs/reference/public-api.json`, which is generated from the built `.d.ts`
 *    by `scripts/docs/public-api.mjs`.
 *  - Symbols classified `INTERNAL` are deliberately absent (Audit F).
 *  - Groupings follow the actual module layout of `@themvora/core`
 *    (`src/accessibility.ts`, `src/scheduling.ts`, `src/persistence.ts`,
 *    `src/sync.ts`, `src/transition.ts`, `src/generation.ts`, `src/history.ts`,
 *    `src/plugins.ts`, `src/bootstrap.ts`, `src/scrollbar.ts`, `src/scope.ts`) so
 *    the registry mirrors how the ecosystem is actually built.
 *  - Every symbol listed must be importable from the package and entrypoint
 *    named in `packages`.
 */

export type CapabilityCategory = "core-feature" | "tooling" | "concept";

export type Capability = {
  /** URL slug of the capability page. */
  slug: string;
  /** Human title, as it appears in the docs sidebar. */
  title: string;
  /** Where this belongs in the information architecture (brief §2). */
  category: CapabilityCategory;
  /** One-sentence contract-level summary. */
  summary: string;
  /** package name -> symbols exported by that package for this capability. */
  packages: Record<string, string[]>;
  /** Framework slugs where this capability is available. */
  frameworks: string[];
  /** Adapter slugs where this capability is relevant. */
  adapters?: string[];
  /** Known, documented limitations surfaced on the page's Limitations section. */
  limitations?: string[];
  /** Generated API-reference destination (the site's `/api-reference/{pkg}` routes). */
  apiReference?: string;
  /**
   * Guide page on the docs site that owns this capability (brief §6.4: every
   * generated API page links back to its capability's guide). Site route from
   * `apps/docs/lib/docs-routes.ts`.
   */
  guide?: string;
};

/**
 * Integration surfaces: the provider/hook/adapter plumbing that integration
 * pages (frameworks, adapters) legitimately import but which is not itself a
 * product capability. §4's rule ("no page may reference an exported symbol that
 * is not listed here") is satisfied because these live in this same file.
 */
export type Integration = {
  kind: "framework" | "adapter";
  /** package name -> symbols this integration's pages may document. */
  packages: Record<string, string[]>;
  /**
   * Package whose full public surface this integration re-exports (e.g.
   * `@themvora/nuxt` re-exports core + vue). Lets the registry stay exact
   * without copying hundreds of names.
   */
  mirrors?: string[];
  /**
   * Guide page on the docs site that owns this integration (brief §6.4: every
   * generated API page links back to the guide that owns its symbols). Site
   * route from `apps/docs/lib/docs-routes.ts`.
   */
  guide?: string;
  /** Companion packages the integration requires at runtime (for install blocks). */
  peerPackages?: string[];
};

export const capabilities: Record<string, Capability> = {
  // ---------------------------------------------------------------- concepts
  themes: {
    slug: "themes",
    title: "Themes",
    category: "concept",
    summary:
      "A theme is a named, immutable definition of semantic tokens with light/dark variants that the runtime resolves and applies.",
    packages: {
      "@themvora/core": [
        "ThemeDefinition",
        "defineTheme",
        "extendTheme",
        "composeTheme",
        "mergeThemeDefinitions",
        "resolveTheme",
        "resolveThemeName",
        "getThemeFamily",
        "getThemeMode",
        "ThemeMeta",
        "ThemeName",
        "ThemeError",
        "getBuiltInThemes",
        "getDefaultThemes",
        "getNeutralThemes",
        "getPresetThemes",
        "getBrandPresets",
        "getPresetCatalog",
        "PresetCatalogEntry",
        "PresetQuality",
        "PresetCheck",
        "PresetKind",
        "BrandProvenance",
        "BrandSource",
        "BrandSourceKind",
        "BrandReferenceColor",
        "BrandColorClass",
        "CatalogBrand",
        "NormalizedAnchor",
        "BRAND_PRESET_DISCLAIMER",
        "mergePresetTokens",
        "PresetFamily",
        "PresetOverrides",
        "PresetThemeName",
        "PresetVariant",
        "PresetVariantOverride",
        "createThemeRegistry",
        "resolveThemeRegistry",
        "ThemeRegistry",
        "ThemeRegistryOptions",
      ],
      "@themvora/core/vanilla": ["ThemeDefinition", "ThemeRegistry"],
    },
    frameworks: ["react", "next", "vue", "nuxt", "svelte", "solid", "angular", "astro", "remix", "web"],
    apiReference: "/api-reference/core",
    guide: "/custom-themes",
  },
  tokens: {
    slug: "tokens",
    title: "Tokens",
    category: "concept",
    summary:
      "Semantic token groups are the contract between a theme and the DOM: they flatten to CSS variables, never to hardcoded colors.",
    packages: {
      "@themvora/core": [
        // The role vocabulary itself — what a token can *be*. These live with
        // `tokens` rather than in a capability of their own because a role with
        // no token group is not a capability, it is a name.
        "CORE_COLORS",
        "CoreColor",
        "OPTIONAL_SEMANTICS",
        "OptionalSemantic",
        "SEMANTIC_ROLE_GROUPS",
        "SemanticRole",
        "SemanticRoleGroup",
        "isCoreColor",
        "isOptionalSemantic",
        "CodeTokens",
        "auto",
        "contrast",
        "evaluateExpression",
        "isExpression",
        "GROUP_PROPERTIES",
        "GROUP_VAR_PREFIXES",
        "TokenGroup",
        "TOKEN_GROUPS",
        "TokenRemap",
        "ThemeTokens",
        "flattenTokens",
        "mergeTokens",
        "resolveTokens",
        "themeToCSSVariables",
        "buildThemeCssMap",
        "createCSSVariablesBinding",
        "darkModeCSSTemplate",
        "ThemeToCSSVariablesOptions",
        "BuildThemeCssMapOptions",
        "CSSVariablesOptions",
      ],
      "@themvora/angular": ["buildThemeCSSMap", "ThemeCSSMap", "BlockingScriptOptions"],
      "@themvora/astro": ["buildThemeCssMap"],
    },
    frameworks: ["react", "next", "vue", "nuxt", "svelte", "solid", "angular", "astro", "remix", "web"],
    adapters: ["mui", "chakra", "antd", "shadcn", "bootstrap", "daisyui", "open-props", "tailwind", "unocss"],
    apiReference: "/api-reference/core",
    guide: "/tokens",
  },
  familiesModes: {
    slug: "families-modes",
    title: "Families & Modes",
    category: "concept",
    summary:
      "A selection is a family (which palette) plus a mode (light/dark/system); every framework exposes the same read/write surface for it.",
    packages: {
      "@themvora/core": [
        "ThemeFamilies",
        "ThemeModes",
        "ThemeMode",
        "ThemeSelectionState",
        "createThemeModeController",
        "ThemeModeControllerOptions",
        "resolveSelection",
        "resolveSelectedTheme",
        "resolveSelectionTheme",
        "ResolveSelectionOptions",
        "ResolveSelectionThemeOptions",
        "SelectionThemeResolution",
        "createSystemThemeBinding",
        "SystemThemeBindingOptions",
      ],
      "@themvora/react": [
        "useThemeMode",
        "useThemeFamily",
        "useSetThemeMode",
        "useSetThemeFamily",
        "useToggleTheme",
      ],
      "@themvora/next/client": [
        "useThemeMode",
        "useThemeFamily",
        "useSetThemeMode",
        "useSetThemeFamily",
        "useToggleTheme",
      ],
      "@themvora/vue": ["useThemeMode", "useThemeFamily"],
      // @themvora/nuxt does not ship the dedicated mode/family composables;
      // its auto-imported set is read through `useTheme`. (Reported as a
      // framework-parity gap — see docs/reference/README.md.)
      "@themvora/nuxt": ["useTheme"],
      "@themvora/svelte": ["useThemeMode", "useThemeFamily"],
      "@themvora/solid": ["useThemeMode", "useThemeFamily"],
      "@themvora/angular": ["ThemeState", "injectTheme"],
      "@themvora/astro/client": [
        "useThemeMode",
        "useThemeFamily",
        "useSetThemeMode",
        "useSetThemeFamily",
        "useToggleTheme",
      ],
      "@themvora/remix": ["useThemeMode", "useThemeFamily", "useSetThemeMode", "useSetThemeFamily", "useToggleTheme"],
      "@themvora/web": ["useThemeMode", "useThemeFamily"],
    },
    frameworks: ["react", "next", "vue", "nuxt", "svelte", "solid", "angular", "astro", "remix", "web"],
    apiReference: "/api-reference/core",
    guide: "/core-concepts",
  },
  runtime: {
    slug: "runtime",
    title: "Runtime",
    category: "concept",
    summary:
      "One runtime per app owns the store, selection, registry, history, lifecycle and adapters; every framework binding is a thin view over it.",
    packages: {
      "@themvora/core": [
        "createThemeRuntime",
        "ThemeRuntime",
        "ThemeRuntimeOptions",
        "createThemeStore",
        "ThemeStore",
        "ThemeStoreOptions",
        "createThemeLifecycle",
        "ThemeLifecycle",
        "ThemeLifecycleEventMap",
        "ThemeLifecycleEventName",
        "ThemeChangeEvent",
        "ThemeChangeSource",
        "createDOMBinding",
        "DOMBindingOptions",
        "isSettled",
      ],
      "@themvora/core/vanilla": ["Themvora", "ThemvoraOptions"],
      "@themvora/react": [
        "ThemeProvider",
        "ThemeProviderProps",
        "useTheme",
        "useThemeRuntime",
        "useThemeValue",
        "useThemeBatch",
        "useThemeTokens",
        "createThemeRoot",
        "CreateThemeRootOptions",
        "ThemeRootHandle",
      ],
      "@themvora/next": ["ThemeProvider", "ThemeProviderProps"],
      "@themvora/next/client": [
        "ClientThemeProvider",
        "ClientThemeProviderProps",
        "useTheme",
        "useThemeRuntime",
        "useThemeValue",
        "useThemeBatch",
        "useThemeTokens",
      ],
      "@themvora/vue": ["provideThemeRuntime", "ThemeProvider", "useThemeRuntime", "useThemeValue", "useThemeTokens"],
      "@themvora/nuxt": ["ThemeProvider", "ThemeProviderProps", "useTheme", "useThemeRuntime", "useThemeBatch"],
      "@themvora/svelte": [
        "ThemeProvider",
        "getThemeRuntime",
        "setThemeRuntime",
        "useThemeRuntime",
        "useThemeValue",
        "useThemeTokens",
      ],
      "@themvora/solid": ["ThemeProvider", "useThemeRuntime", "useThemeValue", "useThemeTokens"],
      "@themvora/angular": [
        "provideTheme",
        "provideThemeRuntime",
        "ThemeProviderOptions",
        "THEME_RUNTIME",
        "injectThemeRuntime",
        "injectThemeBatch",
      ],
      "@themvora/astro": [
        "themvora",
        "getGlobalRuntime",
        "setGlobalRuntime",
        "requireGlobalRuntime",
        // The Astro-native browser API: a plain controller, deliberately not a
        // hook (`.astro` files have no reactive component runtime).
        "getThemeController",
        "createThemeController",
      ],
      "@themvora/astro/client": ["ThemeProviderClient", "useThemeRuntime", "useThemeValue", "useThemeTokens"],
      "@themvora/remix": ["ThemeProvider", "useThemeRuntime", "useThemeValue", "useThemeTokens"],
      "@themvora/web": [
        "ThemvoraProvider",
        "defineCustomElements",
        "getProviderRuntime",
        "useThemeRuntime",
        "useThemeTokens",
      ],
    },
    frameworks: ["react", "next", "vue", "nuxt", "svelte", "solid", "angular", "astro", "remix", "web"],
    apiReference: "/api-reference/core",
    guide: "/architecture",
  },
  scopes: {
    slug: "scopes",
    title: "Scopes",
    category: "concept",
    summary:
      "A scope re-resolves tokens for a subtree, optionally from a local theme definition, without mutating the global selection.",
    packages: {
      "@themvora/core": [
        "createScopedThemeBinding",
        "ScopedThemeBindingOptions",
        "ScopedThemeSelection",
        "ScopedThemePrePaint",
        "ScopedThemePrePaintOptions",
        "resolveScopedTheme",
        "resolveScopeTransition",
        "resolveScopedThemePrePaint",
        "scopeToCSSVariables",
      ],
    },
    frameworks: ["react", "next", "vue", "nuxt", "svelte", "solid", "angular", "astro", "remix", "web"],
    limitations: [
      "A scope inherits or overrides the global transition policy; it never owns its own store.",
    ],
    apiReference: "/api-reference/core",
    guide: "/scoped-theme",
  },
  // -------------------------------------------------------------- features
  themeScope: {
    slug: "theme-scope",
    title: "ThemeScope",
    category: "core-feature",
    summary:
      "Apply a different family/mode (or a local theme definition) to a subtree, with scoped CSS variables and pre-paint support.",
    packages: {
      "@themvora/core": [
        "createScopedThemeBinding",
        "ScopedThemeBindingOptions",
        "ScopedThemeSelection",
        "ScopedThemePrePaint",
        "ScopedThemePrePaintOptions",
        "resolveScopedTheme",
        "resolveScopeTransition",
        "resolveScopedThemePrePaint",
        "scopeToCSSVariables",
      ],
      "@themvora/react": ["ThemeScope", "ThemeScopeProps", "useScopedTheme"],
      "@themvora/next": ["ThemeScope", "ThemeScopeProps"],
      "@themvora/next/client": ["ThemeScope", "useScopedTheme"],
      "@themvora/vue": ["ThemeScope", "ThemeScopeProps"],
      "@themvora/nuxt": ["ThemeScope"],
      "@themvora/svelte": ["ThemeScope", "ThemeScopeProps"],
      "@themvora/solid": ["ThemeScope", "ThemeScopeProps"],
      "@themvora/angular": ["ThemeScopeDirective", "THEME_SCOPED_RUNTIME"],
      "@themvora/astro/client": ["ThemeScope", "ThemeScopeProps"],
      "@themvora/remix": ["ThemeScope"],
      "@themvora/web": ["ThemvoraScope"],
    },
    frameworks: ["react", "next", "vue", "nuxt", "svelte", "solid", "angular", "astro", "remix", "web"],
    apiReference: "/api-reference/core",
    guide: "/scoped-theme",
  },
  transitions: {
    slug: "transitions",
    title: "Transitions",
    category: "core-feature",
    summary:
      "Diff-driven, group-aware CSS animations that run on every theme change and can be disabled per change.",
    packages: {
      "@themvora/core": [
        "ThemeTransitionOptions",
        "createThemeDiff",
        "ThemeDiff",
        "EMPTY_THEME_DIFF",
        "createTransitionPlan",
        "TransitionPlan",
        "scanForTransition",
        "runThemeAnimation",
        "cancelThemeAnimation",
        "ThemeAnimationInput",
        "createAnimationsPlugin",
        "AnimationsPluginOptions",
        "TRANSITION_PRESETS",
        "TransitionPreset",
        "DEFAULT_TRANSITION_PRESET",
        "DEFAULT_THEME_TRANSITION",
        "ANIMATED_GROUP_KEYS",
        "AnimatedGroupKey",
        "prefersReducedMotion",
      ],
    },
    frameworks: ["react", "next", "vue", "nuxt", "svelte", "solid", "angular", "astro", "remix", "web"],
    limitations: [
      "Scoped pre-paint cannot animate: the first paint of a scope is always instant.",
      "`prefers-reduced-motion` is respected by the animation runner.",
    ],
    apiReference: "/api-reference/core",
    guide: "/animation",
  },
  persistence: {
    slug: "persistence",
    title: "Persistence",
    category: "core-feature",
    summary:
      "Persist the selection across reloads and requests, with fingerprint validation, storage adapters and theme migrations.",
    packages: {
      "@themvora/core": [
        "createThemePersistence",
        "createDefaultPersistence",
        "ThemePersistenceAdapter",
        "ThemePersistenceOptions",
        "ThemeSelectionPersistenceAdapter",
        "StorageAdapter",
        "migrateTheme",
        "registerMigration",
        "clearMigrations",
        "migrations",
        "MigrateOptions",
        "MigrationStep",
      ],
      "@themvora/react": ["useThemeRestore"],
      "@themvora/vue": ["useThemeRestore"],
      "@themvora/svelte": ["useThemeRestore"],
      "@themvora/solid": ["useThemeRestore"],
      "@themvora/angular": ["createAngularPersistence", "injectThemeRestore"],
      "@themvora/astro": ["createAstroThemePersistence"],
      "@themvora/remix": ["createRemixThemePersistence", "RemixThemePersistenceOptions"],
      // The cookie helpers ship from the Nuxt server integration, not from core.
      "@themvora/nuxt": [
        "createNuxtThemeBootstrapScript",
        "resolveThemeFromCookies",
        "parseCookieHeader",
        "themvoraCookieNames",
        "useThemeRestore",
      ],
    },
    frameworks: ["react", "next", "vue", "nuxt", "svelte", "solid", "angular", "astro", "remix", "web"],
    limitations: [
      "A stored selection is fingerprint-validated; stale or tampered state falls back to the default theme.",
    ],
    apiReference: "/api-reference/core",
    guide: "/persistence",
  },
  multiWindow: {
    slug: "multi-window-sync",
    title: "Multi-window sync",
    category: "core-feature",
    summary:
      "Keep every tab and window on the same selection using BroadcastChannel, SharedWorker or StorageEvent — chosen at runtime.",
    packages: {
      "@themvora/core": [
        "createMultiWindowSync",
        "MultiWindowSyncOptions",
        "createThemeBroadcast",
        "ThemeBroadcastOptions",
        "ThemeBroadcastAdapter",
        "createThemeSelectionBroadcast",
        "ThemeSelectionBroadcastOptions",
        "createBroadcastPlugin",
        "BroadcastPluginOptions",
        "BroadcastChannelLike",
        "createStorageEventSync",
        "createSharedWorkerSync",
        "destroySharedWorkerUrl",
        "createNoopSync",
      ],
    },
    frameworks: ["react", "next", "vue", "nuxt", "svelte", "solid", "angular", "astro", "remix", "web"],
    limitations: [
      "SharedWorker transport is unavailable in some browsers and falls back automatically.",
      "Sync is transport-agnostic; the runtime never assumes a specific channel.",
    ],
    apiReference: "/api-reference/core",
    guide: "/multi-window-sync",
  },
  scheduling: {
    slug: "scheduling",
    title: "Scheduling",
    category: "core-feature",
    summary:
      "Switch family/mode on a time-of-day schedule, with an explicit binding between the schedule state and the runtime selection.",
    packages: {
      "@themvora/core": [
        "createThemeSchedule",
        "ThemeSchedule",
        "ThemeScheduleOptions",
        "ThemeScheduleSetOptions",
        "ThemeScheduleState",
        "ThemeScheduleStatus",
        "ThemeScheduleTransition",
        "EMPTY_THEME_SCHEDULE_STATE",
        "createScheduledThemeBinding",
        "ScheduledThemeBindingOptions",
        "ScheduledThemeOptions",
        "ScheduledThemePairInput",
        "resolveScheduledThemePair",
        "createScheduledPlugin",
        "ScheduledPluginOptions",
        "DEFAULT_SCHEDULED_LIGHT_THEME",
        "DEFAULT_SCHEDULED_DARK_THEME",
      ],
      "@themvora/react": ["useThemeSchedule"],
      "@themvora/next/client": ["useThemeSchedule"],
      "@themvora/vue": ["useThemeSchedule", "ThemeScheduleController"],
      "@themvora/nuxt": ["useThemeSchedule"],
      "@themvora/svelte": ["useThemeSchedule", "getThemeSchedule"],
      "@themvora/solid": ["useThemeSchedule"],
      "@themvora/angular": ["injectThemeSchedule", "ThemeScheduleController"],
      "@themvora/astro/client": ["useThemeSchedule"],
      "@themvora/remix": ["useThemeSchedule"],
      "@themvora/web": ["getThemeSchedule"],
    },
    frameworks: ["react", "next", "vue", "nuxt", "svelte", "solid", "angular", "astro", "remix", "web"],
    apiReference: "/api-reference/core",
    guide: "/advanced-features",
  },
  sunriseSunset: {
    slug: "sunrise-sunset",
    title: "Sunrise & sunset",
    category: "core-feature",
    summary:
      "Compute solar times for a location (or the browser's time zone) and drive light/dark switching from real sunrise and sunset.",
    packages: {
      "@themvora/core": [
        "calculateSunTimes",
        "CalculateSunTimesLocationOptions",
        "resolveSolarLocation",
        "SolarLocationInput",
        "ResolvedSolarLocation",
        "getBrowserTimeZone",
        "getLocationForTimeZone",
        "getTimeZoneList",
        "TimeZoneLocation",
        "DEFAULT_TIMEZONE_LOCATION",
      ],
    },
    frameworks: ["react", "next", "vue", "nuxt", "svelte", "solid", "angular", "astro", "remix", "web"],
    limitations: [
      "Solar math is NOAA-based and needs a location; without one the runtime falls back to the default time zone.",
    ],
    apiReference: "/api-reference/core",
    guide: "/sunrise-sunset",
  },
  accessibility: {
    slug: "accessibility",
    title: "Accessibility",
    category: "core-feature",
    summary:
      "Contrast validation, color-vision-deficiency simulation and ready-made high-contrast/large-text profiles.",
    packages: {
      "@themvora/core": [
        "createAccessibilityPlugin",
        "AccessibilityPluginOptions",
        "getAccessibilityProfiles",
        "getHighContrastTheme",
        "getLargeTextTheme",
        "validateThemeContrast",
        "ValidateThemeContrastOptions",
        "ContrastValidationResult",
        "ContrastCheck",
        "getContrastRatio",
        "simulateCVD",
        "simulateThemeForCVD",
        "CVDType",
        "validateTheme",
        "ValidateThemeOptions",
        "ValidationIssue",
        "ValidationResult",
      ],
    },
    frameworks: ["react", "next", "vue", "nuxt", "svelte", "solid", "angular", "astro", "remix", "web"],
    apiReference: "/api-reference/core",
    guide: "/accessibility",
  },
  themeGeneration: {
    slug: "theme-generation",
    title: "Theme generation",
    category: "core-feature",
    summary:
      "Generate a complete, accessible light/dark theme pair from a single seed color, ready to drop into the runtime.",
    packages: {
      "@themvora/core": [
        "generateTheme",
        "GenerateThemeOptions",
        "GeneratedThemePair",
        "createGenerationPlugin",
        "GenerationPluginOptions",
        "GenerationStyle",
        "GENERATION_STYLE_NAMES",
        "scoreTheme",
        "measureThemeContrast",
        "MeasuredPair",
        "SEMANTIC_CONTEXTS",
        "CONTEXT_RESTRICTIONS",
        "auditSemanticContexts",
        "auditActionProminence",
        "ACTION_PROMINENCE_FLOOR",
        "ActionProminence",
        "contextFailures",
        "describeRoleUsage",
        "SemanticContext",
        "ContextLevel",
        "ContextOwner",
        "ContextRequirement",
        "ContextResult",
        "ContextRestriction",
        "FOREGROUND_PREFERENCE",
        "ForegroundPreference",
        "chooseForeground",
        "preferredInk",
        "hasForegroundPreference",
        "PresetScore",
        "CheckStatus",
        "validateThemeLevels",
        "ValidationLevel",
        "LevelIssue",
        "ValidateThemeLevelsOptions",
        "MeasuredPair",
      ],
      "@themvora/core/vanilla": ["generateTheme", "GenerateThemeOptions", "GeneratedThemePair"],
    },
    frameworks: ["react", "next", "vue", "nuxt", "svelte", "solid", "angular", "astro", "remix", "web"],
    apiReference: "/api-reference/core",
    guide: "/theme-studio",
  },
  history: {
    slug: "history",
    title: "History",
    category: "core-feature",
    summary:
      "Every theme change is recorded; undo, redo and time-travel inspect the same canonical history the runtime owns.",
    packages: {
      "@themvora/core": [
        "createThemeHistory",
        "ThemeHistory",
        "ThemeHistoryOptions",
        "HistoryEntry",
        "createHistoryPlugin",
        "HistoryPluginOptions",
      ],
      "@themvora/react": ["useThemeHistory", "useThemeTimeTravel"],
      "@themvora/next/client": ["useThemeHistory", "useThemeTimeTravel"],
      "@themvora/vue": ["useThemeHistory"],
      "@themvora/nuxt": ["useThemeHistory"],
      "@themvora/svelte": ["useThemeHistory"],
      "@themvora/solid": ["useThemeHistory"],
      "@themvora/angular": ["injectThemeHistory", "injectThemeTimeTravel", "ThemeHistoryState"],
      "@themvora/astro/client": ["useThemeHistory"],
      "@themvora/remix": ["useThemeHistory", "useThemeTimeTravel"],
    },
    frameworks: ["react", "next", "vue", "nuxt", "svelte", "solid", "angular", "astro", "remix", "web"],
    apiReference: "/api-reference/core",
    guide: "/advanced-features",
  },
  snapshots: {
    slug: "snapshots",
    title: "History & snapshots",
    category: "core-feature",
    summary:
      "Capture and restore the full runtime state (selection, tokens, history position) as a single snapshot.",
    packages: {
      "@themvora/core": ["ThemeRuntimeSnapshot"],
      "@themvora/react": ["useThemeSnapshot"],
      "@themvora/next/client": ["useThemeSnapshot"],
      "@themvora/vue": ["useThemeSnapshot"],
      "@themvora/nuxt": ["useThemeSnapshot"],
      "@themvora/svelte": ["useThemeSnapshot"],
      "@themvora/solid": ["useThemeSnapshot"],
      "@themvora/angular": ["injectThemeSnapshot", "injectThemeRestore"],
      "@themvora/remix": ["useThemeSnapshot"],
    },
    frameworks: ["react", "next", "vue", "nuxt", "svelte", "solid", "angular", "astro", "remix", "web"],
    limitations: ["A snapshot restores the whole runtime state, not just the current selection."],
    apiReference: "/api-reference/core",
    guide: "/advanced-features",
  },
  plugins: {
    slug: "plugins",
    title: "Plugins",
    category: "core-feature",
    summary:
      "Extend the runtime through a first-class plugin manager and adapter registry; theme packs install ready-made behaviour.",
    packages: {
      "@themvora/core": [
        "createPluginManager",
        "PluginManager",
        "ThemePlugin",
        "ThemePluginHooks",
        "ThemeAdapter",
        "AdapterPlugin",
        "AdapterPluginContext",
        "AdapterRegistry",
        "createAdapterRegistry",
        "AdapterRegistration",
        "AdapterStrategy",
        "createPersistencePlugin",
        "PersistencePluginOptions",
        "createBroadcastPlugin",
        "createScheduledPlugin",
        "createAnimationsPlugin",
        "createAccessibilityPlugin",
        "createGenerationPlugin",
        "createHistoryPlugin",
        "createDebuggerPlugin",
        "DebuggerPluginOptions",
        "createDevToolsPlugin",
        "DevToolsPluginOptions",
        "createThemeDebugger",
        "ThemeDebugger",
        "ThemePack",
      ],
      "@themvora/react": ["useThemePacks"],
      "@themvora/vue": ["useThemePacks"],
      "@themvora/svelte": ["useThemePacks"],
      "@themvora/solid": ["useThemePacks"],
      "@themvora/angular": ["injectThemePacks"],
      "@themvora/remix": ["useThemePacks"],
    },
    frameworks: ["react", "next", "vue", "nuxt", "svelte", "solid", "angular", "astro", "remix", "web"],
    apiReference: "/api-reference/core",
    guide: "/plugins",
  },
  diagnostics: {
    slug: "diagnostics",
    title: "Diagnostics",
    category: "core-feature",
    summary:
      "Recoverable problems are reported as structured diagnostics: a stable code, a severity, structured context and a concrete correction. Creation, formatting and emission are separate steps, so the same diagnostic can be logged, collected or escalated without duplicating the logic that produced it.",
    packages: {
      "@themvora/core": [
        "createDiagnostic",
        "emitDiagnostic",
        "formatDiagnostic",
        "resetDiagnosticEmission",
        "isThemeMode",
        "ThemeDiagnostic",
        "ThemeDiagnosticCode",
        "ThemeDiagnosticContext",
        "ThemeDiagnosticLevel",
        "CreateDiagnosticInput",
        "EmitDiagnosticOptions",
        "DiagnosticSink",
        "ThemeErrorOptions",
      ],
    },
    frameworks: ["react", "next", "vue", "nuxt", "svelte", "solid", "angular", "astro", "remix", "web"],
    apiReference: "/api-reference/core",
    guide: "/reference/diagnostics",
  },
  zeroFlash: {
    slug: "zero-flash",
    title: "Zero-flash bootstrap",
    category: "core-feature",
    summary:
      "Paint the correct theme on the first frame: a blocking script plus server-resolved initial state, with a Vite plugin for SPA builds.",
    packages: {
      "@themvora/core": [
        "defineThemvoraConfig",
        "ThemvoraConfig",
        "ThemeBootstrapConfig",
        "ThemvoraThemeConfig",
        "toBootstrapConfig",
        "readTransportedConfig",
        "resolveRuntimeOptions",
        "createThemeBootstrapScript",
        "ThemeBootstrapScriptOptions",
        "ThemeBootstrapState",
        "createThemeReadoutScript",
        "readBootstrapState",
        "computeFingerprint",
        "resolveInitialTheme",
        "ResolveInitialThemeOptions",
        "InitialThemeResolution",
        "createPrePaintScrollbarCSS",
        "createPrePaintScrollbarScript",
        "PRE_PAINT_SCROLLBAR_CSS",
        "PrePaintScrollbarOptions",
        "darkModeCSSTemplate",
        "systemModeCSSTemplate",
        // The sync-first-render contract: the state the server hands the client,
        // and the React root shim the Vite plugin swaps in so the bootstrap
        // state is committed before the first paint. Public because the SPA path
        // is documented as an opt-out (`syncFirstRender: false`) and a custom
        // entry may need to mount through the same root.
        "ThemeRuntimeInitial",
        "createSyncFirstRoot",
        "SyncFirstRenderRoot",
        "CreateRootLike",
        "SyncFirstRootOptions",
      ],
      // The config loader the build integrations share: it resolves
      // `theme.config.ts` by convention and is the reason the plugin and the
      // integration need no theme options of their own.
      "@themvora/core/config": [
        "loadThemvoraConfig",
        "THEMVORA_CONFIG_FILES",
      ],
      "@themvora/core/vite": [
        "themvoraVitePlugin",
        "ThemvoraVitePlugin",
        "ThemvoraVitePluginOptions",
        "ThemvoraViteInjectedTag",
        // The inline form, kept only for apps that have not moved to
        // `theme.config.ts`. Documented as deprecated on the plugin's options.
        "ThemvoraThemeConfig",
      ],
      "@themvora/next/client": ["ThemeBootstrap", "ThemeBootstrapProps"],
      "@themvora/vue": ["createVueThemeBootstrapScript"],
      "@themvora/svelte": ["createSvelteThemeBootstrapScript"],
      "@themvora/solid": ["createSolidThemeBootstrapScript"],
      "@themvora/angular": ["createBlockingScriptContent"],
      "@themvora/astro": [
        "createBlockingScript",
        "computeFingerprint",
        "getInitialThemeState",
        "ThemvoraIntegrationOptions",
        "injectPrePaintScrollbarCSS",
        "systemModeCSSTemplate",
      ],
      "@themvora/remix": ["ThemeHead", "ThemeHeadProps", "getInitialThemeState"],
      "@themvora/nuxt": [
        "createNuxtThemeBootstrapScript",
        "NuxtThemeBootstrapOptions",
        "ResolveThemeFromCookiesOptions",
        "ModuleOptions",
        "computeFingerprint",
      ],
      "@themvora/web": ["PRE_PAINT_SCROLLBAR_CSS", "injectPrePaintScrollbarCSS"],
    },
    frameworks: ["react", "next", "vue", "nuxt", "svelte", "solid", "angular", "astro", "remix", "web"],
    limitations: [
      "`getInitialThemeState` is a server-only helper: it comes from `@themvora/remix/server` and `@themvora/astro`, never from a client entry.",
      "The Vite plugin is SPA-only; SSR frameworks get zero-flash from their own server integration.",
    ],
    apiReference: "/api-reference/core",
    guide: "/zero-flash",
  },
  customScrollbar: {
    slug: "custom-scrollbar",
    title: "Custom scrollbar",
    category: "core-feature",
    summary:
      "Themed overlay scrollbars that match the active theme and pre-paint before hydration.",
    packages: {
      "@themvora/core": [
        "createThemeScrollbar",
        "createOverlayScrollbar",
        "OverlayScrollbarOptions",
        "OverlayScrollbarHandle",
        "ScrollbarAxis",
        "ScrollbarArrowDir",
        "createPrePaintScrollbarCSS",
        "createPrePaintScrollbarScript",
        "PRE_PAINT_SCROLLBAR_CSS",
        "PrePaintScrollbarOptions",
      ],
      "@themvora/react": [
        "ThemeScrollbar",
        "ThemeScrollbarProps",
        "ThemeScrollbarAppearance",
        "ThemeScrollbarBehavior",
        "ThemeScrollbarIcons",
      ],
      "@themvora/next": ["ThemeScrollbar", "ThemeScrollbarProps"],
      "@themvora/vue": ["ThemeScrollbar", "ThemeScrollbarProps"],
      "@themvora/svelte": ["ThemeScrollbar", "ThemeScrollbarProps"],
      "@themvora/solid": ["ThemeScrollbar", "ThemeScrollbarProps"],
      "@themvora/angular": ["ThemeScrollbarDirective"],
      "@themvora/astro": ["ThemvoraScrollbar"],
      "@themvora/remix": ["ThemeScrollbar", "ThemeScrollbarProps"],
      "@themvora/web": ["ThemvoraScrollbar"],
    },
    frameworks: ["react", "next", "vue", "nuxt", "svelte", "solid", "angular", "astro", "remix", "web"],
    apiReference: "/api-reference/core",
    guide: "/custom-scrollbar",
  },
  // ---------------------------------------------------------------- tooling
  cli: {
    slug: "cli",
    title: "CLI",
    category: "tooling",
    summary:
      "The `themvora` command line: list, generate, validate, inspect, diff, explain, audit, doctor, init, add, migrate, export and completion — themes and token maps, plus project integration, in CI.",
    packages: {
      "@themvora/cli": [
        "cmdGenerate",
        "cmdList",
        "cmdValidate",
        "cmdInspect",
        "cmdDiff",
        "cmdExplain",
        "cmdAudit",
        "cmdDoctor",
        "cmdInit",
        "cmdAdd",
        "cmdCompletion",
        "cmdMigrate",
        "cmdExport",
        "run",
        "parseArgs",
        "ParsedArgs",
        "ParsedFlag",
        "UsageError",
        "CommandExit",
        "ExitCodes",
        "VERSION",
      ],
      // The semantic diff is a core capability the CLI orchestrates: the
      // comparison itself never lives in the CLI.
      "@themvora/core": [
        "diffThemes",
        "ThemeDiffReport",
        "ThemeDiffSide",
        "ThemeDiffOptions",
        "ThemeDiffProvenance",
        "ThemeGenerationProvenance",
        "ThemeModeDiff",
        "ThemeModeDiffCounts",
        "ThemeModeGroupCounts",
        "ThemeSet",
        "ThemeTokenChange",
        "ThemeTokenChangeStatus",
      ],
    },
    frameworks: [],
    apiReference: "/api-reference/cli",
    guide: "/cli",
  },
  devtools: {
    slug: "devtools",
    title: "DevTools",
    category: "tooling",
    summary:
      "Inspect and drive the live runtime from a panel: adapters, history, snapshots and performance entries.",
    packages: {
      "@themvora/devtools": [
        "createDevToolsPanel",
        "createDevToolsInspector",
        "createDevToolsPlugin",
        "DevToolsInspector",
        "DevToolsInspectorOptions",
        "DevToolsEntry",
        "DevToolsState",
        "DevToolsPerformanceEntry",
      ],
      "@themvora/react": ["ThemeInspector", "ThemeInspectorProps"],
      "@themvora/next/client": ["ThemeInspector", "ThemeModeButton"],
      "@themvora/vue": ["ThemeInspector", "ThemeInspectorProps"],
      "@themvora/svelte": ["themeInspector", "ThemeInspectorProps"],
      "@themvora/solid": ["ThemeInspector", "ThemeInspectorProps"],
      "@themvora/angular": ["ThemeInspectorComponent"],
      "@themvora/astro": ["ThemvoraInspector"],
      "@themvora/remix": ["ThemeInspector", "ThemeInspectorProps"],
      "@themvora/web": ["ThemvoraInspector"],
    },
    frameworks: ["react", "next", "vue", "nuxt", "svelte", "solid", "angular", "astro", "remix", "web"],
    limitations: [
      "The inspector is a development surface; keep it off production bundles.",
    ],
    apiReference: "/api-reference/devtools",
    guide: "/devtools",
  },
};

export const integrations: Record<string, Integration> = {
  react: {
    kind: "framework",
    guide: "/framework-guides/react",
    peerPackages: ["react", "react-dom"],
    packages: {
      "@themvora/react": [
        "ThemeProvider",
        "ThemeProviderProps",
        "ThemeScope",
        "ThemeScopeProps",
        "ThemeScrollbar",
        "ThemeScrollbarAppearance",
        "ThemeScrollbarBehavior",
        "ThemeScrollbarIcons",
        "ThemeScrollbarProps",
        "ThemeInspector",
        "ThemeInspectorProps",
        "ThemeModeButton",
        "createThemeRoot",
        "CreateThemeRootOptions",
        "ThemeRootHandle",
        "useTheme",
        "useScopedTheme",
        "useThemeRuntime",
        "useThemeValue",
        "useThemeTokens",
        "useThemeMode",
        "useThemeFamily",
        "useSetThemeMode",
        "useSetThemeFamily",
        "useToggleTheme",
        "useThemeSchedule",
        "useThemeHistory",
        "useThemeTimeTravel",
        "useThemeSnapshot",
        "useThemeRestore",
        "useThemePacks",
        "useThemeLifecycle",
        "useThemeBatch",
      ],
    },
  },

  next: {
    kind: "framework",
    guide: "/framework-guides/next",
    peerPackages: ["next", "react", "react-dom"],
    packages: {
      "@themvora/next": [
        "ThemeProvider",
        "ThemeProviderProps",
        "ThemeProviderBodyProps",
        "ThemeProviderHtmlProps",
        "ThemeScope",
        "ThemeScopeProps",
        "ThemeScrollbar",
        "ThemeScrollbarProps",
      ],
      "@themvora/next/client": [
        "ClientThemeProvider",
        "ClientThemeProviderProps",
        "ThemeBootstrap",
        "ThemeBootstrapProps",
        "ThemeInspector",
        "ThemeModeButton",
        "ThemeScope",
        // Client-side cookie persistence. The provider is the usual entry point;
        // these two are listed for apps that wire cookie writes themselves.
        "createNextThemePersistence",
        "NextThemePersistenceOptions",
        "useTheme",
        "useScopedTheme",
        "useThemeRuntime",
        "useThemeValue",
        "useThemeTokens",
        "useThemeMode",
        "useThemeFamily",
        "useSetThemeMode",
        "useSetThemeFamily",
        "useToggleTheme",
        "useThemeSchedule",
        "useThemeHistory",
        "useThemeTimeTravel",
        "useThemeSnapshot",
        "useThemeRestore",
        "useThemePacks",
        "useThemeLifecycle",
        "useThemeBatch",
      ],
    },
  },

  vue: {
    kind: "framework",
    guide: "/framework-guides/vue",
    peerPackages: ["vue"],
    packages: {
      "@themvora/vue": [
        "ThemeProvider",
        "ThemeProviderProps",
        "ThemeScope",
        "ThemeScopeProps",
        "ThemeScrollbar",
        "ThemeScrollbarProps",
        "ThemeInspector",
        "ThemeInspectorProps",
        "ThemeScheduleController",
        "createVueThemeBootstrapScript",
        "provideThemeRuntime",
        "ThemeSymbol",
        "useTheme",
        "useThemeRuntime",
        "useThemeValue",
        "useThemeTokens",
        "useThemeMode",
        "useThemeFamily",
        "useThemeSchedule",
        "useThemeHistory",
        "useThemeSnapshot",
        "useThemeRestore",
        "useThemePacks",
        "useThemeLifecycle",
        "useThemeBatch",
      ],
    },
  },

  nuxt: {
    kind: "framework",
    guide: "/framework-guides/nuxt",
    peerPackages: ["nuxt", "vue"],
    // `@themvora/nuxt` re-exports the whole core surface plus its own
    // auto-imported module surface. It does NOT re-export Vue-internal
    // plumbing that has no Nuxt meaning: `ThemeSymbol`,
    // `ThemeScheduleController`, `createVueThemeBootstrapScript`,
    // `provideThemeRuntime`.
    mirrors: ["@themvora/core"],
    packages: {
      "@themvora/nuxt": [
        "ModuleOptions",
        "NuxtThemeBootstrapOptions",
        "ResolveThemeFromCookiesOptions",
        "createNuxtThemeBootstrapScript",
        "computeFingerprint",
        "parseCookieHeader",
        "resolveThemeFromCookies",
        "themvoraCookieNames",
        "ThemeProvider",
        "ThemeProviderProps",
        "ThemeScope",
        "ThemeScopeProps",
        "ThemeScrollbar",
        "ThemeScrollbarProps",
        "ThemeInspector",
        "ThemeInspectorProps",
        "useTheme",
        "useThemeRuntime",
        "useThemeValue",
        "useThemeTokens",
        "useThemeMode",
        "useThemeFamily",
        "useThemeBatch",
        "useThemeHistory",
        "useThemeLifecycle",
        "useThemePacks",
        "useThemeRestore",
        "useThemeSchedule",
        "useThemeSnapshot",
      ],
    },
  },

  svelte: {
    kind: "framework",
    guide: "/framework-guides/svelte",
    peerPackages: ["svelte"],
    packages: {
      "@themvora/svelte": [
        "ThemeProvider",
        "ThemeProviderProps",
        "ThemeScope",
        "ThemeScopeProps",
        "ThemeScrollbar",
        "ThemeScrollbarProps",
        "themeInspector",
        "ThemeInspectorProps",
        "createSvelteThemeBootstrapScript",
        "getThemeRuntime",
        "setThemeRuntime",
        "getThemeSchedule",
        // The context key Svelte components read the runtime from, and the
        // options narrower `ThemeScrollbar` calls internally. Both are public
        // because a custom component may need to reach the same runtime or
        // re-use the scrollbar's option resolution.
        "ThemeKey",
        "pickOptions",
        "useTheme",
        "useThemeRuntime",
        "useThemeValue",
        "useThemeTokens",
        "useThemeMode",
        "useThemeFamily",
        "useThemeSchedule",
        "useThemeHistory",
        "useThemeSnapshot",
        "useThemeRestore",
        "useThemePacks",
        "useThemeLifecycle",
        "useThemeBatch",
      ],
    },
  },

  solid: {
    kind: "framework",
    guide: "/framework-guides/solid",
    peerPackages: ["solid-js"],
    packages: {
      "@themvora/solid": [
        "ThemeProvider",
        "ThemeProviderProps",
        "ThemeScope",
        "ThemeScopeProps",
        "ThemeScrollbar",
        "ThemeScrollbarProps",
        "ThemeInspector",
        "ThemeInspectorProps",
        "createSolidThemeBootstrapScript",
        "useTheme",
        "useThemeRuntime",
        "useThemeValue",
        "useThemeTokens",
        "useThemeMode",
        "useThemeFamily",
        "useThemeSchedule",
        "useThemeHistory",
        "useThemeSnapshot",
        "useThemeRestore",
        "useThemePacks",
        "useThemeLifecycle",
        "useThemeBatch",
      ],
    },
  },

  angular: {
    kind: "framework",
    guide: "/framework-guides/angular",
    peerPackages: ["@angular/core", "@angular/common"],
    packages: {
      "@themvora/angular": [
        "provideTheme",
        "provideThemeRuntime",
        "ThemeProviderOptions",
        "THEME_RUNTIME",
        "THEME_SCOPED_RUNTIME",
        "injectTheme",
        "injectThemeRuntime",
        "injectThemeBatch",
        "injectThemeHistory",
        "injectThemeTimeTravel",
        "injectThemeSnapshot",
        "injectThemeRestore",
        "injectThemePacks",
        "injectThemeLifecycle",
        "injectThemeSchedule",
        "ThemeState",
        "ThemeHistoryState",
        "ThemeScopeDirective",
        "ThemeScrollbarDirective",
        "ThemeInspectorComponent",
        "ThemeScheduleController",
        "buildThemeCSSMap",
        "ThemeCSSMap",
        "createAngularPersistence",
        "createBlockingScriptContent",
        "BlockingScriptOptions",
      ],
    },
  },

  mui: {
    kind: "adapter",
    guide: "/libraries/mui",
    peerPackages: ["@mui/material", "@emotion/react", "@emotion/styled", "react", "react-dom"],
    packages: {
      "@themvora/mui": [
        "createMuiAdapter", "MuiThemeAdapter", "createMuiTheme", "buildMuiThemeOptions",
        "MuiThemeProvider", "MuiThemeProviderProps", "useMuiTheme",
        "CreateMuiAdapterOptions", "MuiAdapterOptions", "DEFAULT_MUI_OPTIONS", "MUI_ADAPTER_ID",
      ],
    },
  },

  chakra: {
    kind: "adapter",
    guide: "/libraries/chakra",
    peerPackages: ["@chakra-ui/react", "react", "react-dom"],
    packages: {
      "@themvora/chakra": [
        "createChakraAdapter", "ChakraThemeAdapter", "createChakraTheme", "buildChakraConfig",
        "ChakraThemeProvider", "ChakraThemeProviderProps", "useChakraTheme",
        "CreateChakraAdapterOptions", "ChakraAdapterOptions", "DEFAULT_CHAKRA_OPTIONS", "CHAKRA_ADAPTER_ID",
      ],
    },
  },

  antd: {
    kind: "adapter",
    guide: "/libraries/antd",
    peerPackages: ["antd", "react", "react-dom"],
    packages: {
      "@themvora/antd": [
        "createAntdAdapter", "AntdThemeAdapter", "createAntdTheme", "buildAntdConfig",
        "AntdThemeProvider", "AntdThemeProviderProps", "useAntdTheme",
        "CreateAntdAdapterOptions", "AntdAdapterOptions", "DEFAULT_ANTD_OPTIONS", "ANTD_ADAPTER_ID",
      ],
    },
  },

  mantine: {
    kind: "adapter",
    guide: "/libraries/mantine",
    peerPackages: ["@mantine/core", "@mantine/hooks", "react", "react-dom"],
    packages: {
      "@themvora/mantine": [
        "createMantineTheme", "MantineThemeProvider", "MantineThemeProviderProps", "useMantineTheme",
      ],
    },
  },

  shadcn: {
    kind: "adapter",
    guide: "/libraries/shadcn",
    // Framework peers are conditional: only the subpath for the framework you use.
    peerPackages: ["tailwindcss", "react", "vue", "svelte", "solid-js", "@angular/core"],
    packages: {
      "@themvora/shadcn": [
        "createShadcnAdapter", "ShadcnAdapterOptions", "CreateShadcnAdapterOptions",
        "createShadcnVariables", "injectShadcnCSS",
      ],
      "@themvora/shadcn/factory": [
        "createShadcnAdapter", "ShadcnAdapterOptions", "CreateShadcnAdapterOptions",
      ],
      "@themvora/shadcn/react": ["useShadcnTheme"],
      "@themvora/shadcn/vue": ["useShadcnTheme", "UseAdapterOptions"],
      "@themvora/shadcn/svelte": ["useShadcnTheme", "UseAdapterOptions"],
      "@themvora/shadcn/solid": ["useShadcnTheme", "UseAdapterOptions"],
      "@themvora/shadcn/angular": ["injectShadcnTheme", "InjectAdapterOptions"],
    },
  },

  astro: {
    kind: "framework",
    guide: "/framework-guides/astro",
    // React is only needed when an island is used, so it stays opt-in.
    peerPackages: ["astro"],
    packages: {
      "@themvora/astro": [
        "themvora",
        "ThemvoraIntegrationOptions",
        "getInitialThemeState",
        "buildThemeCssMap",
        "computeFingerprint",
        "createBlockingScript",
        "darkModeCSSTemplate",
        "systemModeCSSTemplate",
        "createAstroThemePersistence",
        "getGlobalRuntime",
        "setGlobalRuntime",
        "requireGlobalRuntime",
        // Astro-native browser API (no React, no hook semantics).
        "getThemeController",
        "createThemeController",
        "ThemeController",
        "ThemeControllerOptions",
        "ThemeControllerState",
        "injectPrePaintScrollbarCSS",
        "ThemvoraScrollbar",
        "ThemvoraInspector",
      ],
      "@themvora/astro/client": [
        "ThemeProviderClient",
        "ThemeProviderClientProps",
        "ThemeScope",
        "ThemeScopeProps",
        "useTheme",
        "useThemeRuntime",
        "useThemeValue",
        "useThemeTokens",
        "useThemeMode",
        "useThemeFamily",
        "useSetThemeMode",
        "useSetThemeFamily",
        "useToggleTheme",
        "useThemeSchedule",
        "useThemeHistory",
        "useThemeBatch",
        "useThemeSnapshot",
        "useThemeRestore",
        "useThemePacks",
        "useThemeLifecycle",
        // The island-side readout: the component `createThemeReadoutScript`
        // hydrates, plus its props/kind unions. Distinct from the
        // framework-neutral `ThemeController` above.
        "ThemeReadout",
        "ThemeReadoutProps",
        "ThemeReadoutKind",
      ],
      // The browser entry. It is framework-neutral (no React, no hooks) and must
      // never reach the Node/build entry, so it gets its own keys.
      "@themvora/astro/runtime": [
        "getThemeController",
        "createThemeController",
        "ThemeController",
        "ThemeControllerOptions",
        "ThemeControllerState",
        "getGlobalRuntime",
        "setGlobalRuntime",
        "requireGlobalRuntime",
        // The DOM contract itself: the page skeleton and the readout script must
        // agree on these attribute names, so they are part of the public API.
        "THEME_READOUT_ATTRIBUTE",
        "THEME_TOGGLE_ATTRIBUTE",
      ],
    },
  },

  remix: {
    kind: "framework",
    guide: "/framework-guides/remix",
    peerPackages: ["@remix-run/react", "react", "react-dom"],
    packages: {
      "@themvora/remix": [
        "ThemeProvider",
        "ThemeProviderProps",
        "ThemeScope",
        "ThemeScrollbar",
        "ThemeScrollbarProps",
        "ThemeHead",
        "ThemeHeadProps",
        "ThemeInspector",
        "ThemeInspectorProps",
        "createRemixThemePersistence",
        "RemixThemePersistenceOptions",
        "useTheme",
        "useThemeRuntime",
        "useThemeValue",
        "useThemeTokens",
        "useThemeMode",
        "useThemeFamily",
        "useSetThemeMode",
        "useSetThemeFamily",
        "useToggleTheme",
        "useThemeSchedule",
        "useThemeHistory",
        "useThemeTimeTravel",
        "useThemeSnapshot",
        "useThemeRestore",
        "useThemePacks",
        "useThemeLifecycle",
        "useThemeBatch",
      ],
      "@themvora/remix/server": ["getInitialThemeState"],
    },
  },

  bootstrap: {
    kind: "adapter",
    guide: "/libraries/bootstrap",
    // Framework peers are conditional: only the subpath for the framework you use.
    peerPackages: ["bootstrap", "react", "vue", "svelte", "solid-js", "@angular/core"],
    packages: {
      "@themvora/bootstrap": [
        "createBootstrapAdapter", "BootstrapAdapterOptions", "CreateBootstrapAdapterOptions",
        "createBootstrapVariables", "injectBootstrapCSS",
      ],
      "@themvora/bootstrap/factory": [
        "createBootstrapAdapter", "BootstrapAdapterOptions", "CreateBootstrapAdapterOptions",
      ],
      "@themvora/bootstrap/react": ["useBootstrapTheme"],
      "@themvora/bootstrap/vue": ["useBootstrapTheme", "UseAdapterOptions"],
      "@themvora/bootstrap/svelte": ["useBootstrapTheme", "UseAdapterOptions"],
      "@themvora/bootstrap/solid": ["useBootstrapTheme", "UseAdapterOptions"],
      "@themvora/bootstrap/angular": ["injectBootstrapTheme", "InjectAdapterOptions"],
    },
  },

  daisyui: {
    kind: "adapter",
    guide: "/libraries/daisyui",
    peerPackages: ["daisyui", "tailwindcss", "react", "vue", "svelte", "solid-js", "@angular/core"],
    packages: {
      "@themvora/daisyui": [
        "createDaisyAdapter", "DaisyAdapterOptions", "CreateDaisyAdapterOptions",
        "createDaisyVariables", "injectDaisyCSS",
      ],
      "@themvora/daisyui/factory": [
        "createDaisyAdapter", "DaisyAdapterOptions", "CreateDaisyAdapterOptions",
      ],
      "@themvora/daisyui/react": ["useDaisyTheme"],
      "@themvora/daisyui/vue": ["useDaisyTheme", "UseAdapterOptions"],
      "@themvora/daisyui/svelte": ["useDaisyTheme", "UseAdapterOptions"],
      "@themvora/daisyui/solid": ["useDaisyTheme", "UseAdapterOptions"],
      "@themvora/daisyui/angular": ["injectDaisyTheme", "InjectAdapterOptions"],
    },
  },

  "open-props": {
    kind: "adapter",
    guide: "/libraries/open-props",
    peerPackages: ["open-props", "react", "vue", "svelte", "solid-js", "@angular/core"],
    packages: {
      "@themvora/open-props": [
        "createOpenPropsAdapter", "OpenPropsAdapterOptions", "CreateOpenPropsAdapterOptions",
        "createOpenPropsVariables", "injectOpenPropsCSS",
      ],
      "@themvora/open-props/factory": [
        "createOpenPropsAdapter", "OpenPropsAdapterOptions", "CreateOpenPropsAdapterOptions",
      ],
      "@themvora/open-props/react": ["useOpenPropsTheme"],
      "@themvora/open-props/vue": ["useOpenPropsTheme", "UseAdapterOptions"],
      "@themvora/open-props/svelte": ["useOpenPropsTheme", "UseAdapterOptions"],
      "@themvora/open-props/solid": ["useOpenPropsTheme", "UseAdapterOptions"],
      "@themvora/open-props/angular": ["injectOpenPropsTheme", "InjectAdapterOptions"],
    },
  },

  tailwind: {
    kind: "adapter",
    guide: "/framework-guides/tailwind",
    peerPackages: ["tailwindcss"],
    packages: {
      "@themvora/tailwind": [
        "createTailwindPlugin", "TailwindPluginOptions", "synchronizeDarkClass", "themeCSS",
      ],
    },
  },

  unocss: {
    kind: "adapter",
    guide: "/libraries/unocss",
    peerPackages: ["unocss", "@unocss/core"],
    packages: {
      "@themvora/unocss": ["presetThemvora", "createUnoTheme", "ThemeTokens"],
    },
  },

  adapters: {
    kind: "adapter",
    guide: "/adapters",
    peerPackages: [],
    packages: {
      "@themvora/adapters": [
        "resolveAdapterSource", "AdapterSource", "AdapterResolvedTheme",
        "readColor", "readToken", "readFontSize", "readFontFamily", "readRadius", "readRadiusNumber",
        "readBreakpoints", "readNested",
        "rgbTriplet", "hexToRgb", "rgbToHex", "mixColors", "mixHex", "generateShades", "RGB",
      ],
      "@themvora/adapters/react": ["useRuntimeThemeFactory", "useCSSVariables"],
    },
  },

  web: {
    kind: "framework",
    guide: "/framework-guides/web",
    peerPackages: [],
    packages: {
      "@themvora/web": [
        "defineCustomElements",
        "ThemvoraProvider",
        "ThemvoraProviderProps",
        "ThemvoraScope",
        "ThemvoraScrollbar",
        "ThemvoraToggle",
        "ThemvoraSelect",
        "ThemvoraInspector",
        "getProviderRuntime",
        "getThemeSchedule",
        "injectPrePaintScrollbarCSS",
        "PRE_PAINT_SCROLLBAR_CSS",
        "useThemeRuntime",
        "useThemeTokens",
        "useThemeValue",
        "useThemeMode",
        "useThemeFamily",
      ],
    },
  },
};
