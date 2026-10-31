/**
 * The canonical client over Themvora's public API.
 *
 * Every operation delegates to `@themvora/core`. Nothing here re-derives a
 * palette, a preset, a validation rule or a migration — the client's job is the
 * part the UI needs and core does not provide: a uniform result envelope, a
 * capability report, error mapping, cancellation, and one place to change when a
 * CLI transport becomes available.
 *
 * **Why core and not the CLI.** `MILESTONE-3-CLI-DECISION.md` records the
 * evidence: importing `@themvora/cli` brings `node:fs` and `node:child_process`
 * into the bundle, which the extension's structural gate forbids. Core is the
 * same surface the CLI itself calls, and it is already bundled.
 *
 * Operations are `async` even though they are synchronous today, so that adding a
 * CLI transport later does not change every call site.
 *
 * @packageDocumentation
 */
import {
  GENERATION_STYLE_NAMES,
  diffThemes,
  generateTheme,
  getPresetCatalog,
  measureThemeContrast,
  migrateTheme,
  resolveTheme,
  themeToCSSVariables,
  themeToCssDocument,
  validateTheme,
  validateThemeLevels,
  type GeneratedThemePair,
  type GenerationStyle,
  type LevelIssue,
  type PresetCatalogEntry,
  type ThemeDefinition,
  type ThemeDiffReport,
  type ThemeSet,
  type ValidationIssue,
} from "@themvora/core";

import {
  detectCapabilities,
  type Capabilities,
  type CoreOperation,
} from "../domain/capabilities.js";
import {
  resultOf,
  type Diagnostic,
  type OperationResult,
  type Outcome,
} from "../domain/outcome.js";
import { summariseContrast, type ContrastSummary } from "../domain/report.js";
import { resolveInDocument } from "../domain/themeResolution.js";

/**
 * The real core exports, named so detection inspects actual bindings.
 *
 * A namespace import would defeat tree-shaking; this object keeps the imports
 * statically named while still giving detection something concrete to inspect.
 */
const CORE_SURFACE: Readonly<Record<string, unknown>> = {
  generateTheme,
  validateTheme,
  validateThemeLevels,
  measureThemeContrast,
  getPresetCatalog,
  GENERATION_STYLE_NAMES,
  diffThemes,
  themeToCSSVariables,
  themeToCssDocument,
  migrateTheme,
  // Inspected by capability detection, not called here: the resolution itself
  // lives in `domain/themeResolution.ts`.
  resolveTheme,
};

/** Core error codes that mean the *request* was wrong, not the engine. */
const USAGE_CODES: ReadonlySet<string> = new Set(["TV_GENERATION_INVALID_SEED"]);

/** The cancellation state every operation accepts. */
export interface OperationOptions {
  /** Aborts the operation before it starts. */
  readonly signal?: AbortSignal;
}

/** A request to validate one theme. */
export interface ValidateRequest extends OperationOptions {
  /** The theme to validate. */
  readonly theme: ThemeDefinition;
  /** The other themes from the same document, for `extends` resolution. */
  readonly themes?: readonly ThemeDefinition[];
}

/** A request to generate a light/dark pair. */
export interface GenerateRequest extends OperationOptions {
  /** Hex seed, e.g. `#4f46e5`. Passed to core unchanged. */
  readonly seed: string;
  /** Theme family; defaults to core's `generated`. */
  readonly family?: string;
  /** Generation style, from {@link Capabilities}-visible `styles`. */
  readonly style?: GenerationStyle;
  /** Also generate syntax-highlighting tokens. */
  readonly withCode?: boolean;
}

/** A request carrying one theme. */
export interface ThemeRequest extends OperationOptions {
  /** The theme to operate on. */
  readonly theme: ThemeDefinition;
  /**
   * The other themes from the same document.
   *
   * Supplying it lets a theme that declares `extends` be resolved against its
   * base first. Without it a derived theme is treated as if it stood alone,
   * which is how it came to be reported invalid and rendered as one property.
   */
  readonly themes?: readonly ThemeDefinition[];
}

/** A request comparing two themes. */
export interface DiffRequest extends OperationOptions {
  /**
   * Left side.
   *
   * A single theme, or a `{ light, dark }` set — core compares a set mode by
   * mode, which is why passing a parsed pair is better than picking one half.
   */
  readonly a: ThemeDefinition | ThemeSet;
  /** Right side. */
  readonly b: ThemeDefinition | ThemeSet;
  /** Include tokens that did not change. Defaults to `false`, as core does. */
  readonly includeUnchanged?: boolean;
}

/** What `validate` reports. */
export interface ValidationReport {
  /** Decided by core's `validateTheme()`, which is the only rule that gates. */
  readonly valid: boolean;
  /** The fatal issues, empty when valid. */
  readonly issues: readonly ValidationIssue[];
  /** The layered diagnostics core reports without failing the theme. */
  readonly levels: readonly LevelIssue[];
  /** The canonical contrast measurement. */
  readonly contrast: ContrastSummary;
}

/** What `catalog` reports. */
export interface CatalogSnapshot {
  /** Preset and brand recipes, fully resolved. */
  readonly entries: readonly PresetCatalogEntry[];
  /** The generation styles core accepts. */
  readonly styles: readonly GenerationStyle[];
}

/** What `migrate` reports. */
export interface MigrationReport {
  /** The migrated theme, as core returned it. */
  readonly theme: ThemeDefinition;
  /** Whether the schema version changed. */
  readonly changed: boolean;
  /** The version before migration, when the theme recorded one. */
  readonly fromVersion: string | null;
  /** The version after migration, when the result records one. */
  readonly toVersion: string | null;
}

/** The client contract. */
export interface ThemvoraClient {
  /** What this build can and cannot do. */
  readonly capabilities: Capabilities;
  /** Generate a light/dark pair from a seed. */
  generate(request: GenerateRequest): Promise<OperationResult<GeneratedThemePair>>;
  /** Validate one theme. */
  validate(request: ThemeRequest): Promise<OperationResult<ValidationReport>>;
  /** Read the preset/brand catalog and the generation styles. */
  catalog(options?: OperationOptions): Promise<OperationResult<CatalogSnapshot>>;
  /** Diff two themes semantically. */
  diff(request: DiffRequest): Promise<OperationResult<ThemeDiffReport>>;
  /** Project a theme to its CSS custom properties. */
  exportVariables(request: ThemeRequest): Promise<OperationResult<Record<string, string>>>;
  /** Render a theme as a canonical CSS custom-property document. */
  cssDocument(request: ThemeRequest): Promise<OperationResult<string>>;
  /** Migrate a theme to the current schema. */
  migrate(request: ThemeRequest): Promise<OperationResult<MigrationReport>>;
}

/** Options for {@link createThemvoraClient}. */
export interface ClientOptions {
  /**
   * Override the capability report.
   *
   * Exists so the unavailable path can be tested against a client that genuinely
   * believes a capability is missing, without weakening the real detection.
   */
  readonly capabilities?: Capabilities;
}

/**
 * Turn a thrown value into a diagnostic, preserving whatever structure it has.
 *
 * Core throws `ThemeError` with a `code`, `message` and `hint`. An unknown throw
 * is still reported with its message rather than swallowed: an unobservable
 * failure is worse than an unclassified one.
 *
 * @param error - The thrown value.
 * @returns A diagnostic.
 */
export function diagnosticOf(error: unknown): Diagnostic {
  if (typeof error === "object" && error !== null) {
    const candidate = error as { code?: unknown; message?: unknown; hint?: unknown; path?: unknown };
    const message =
      typeof candidate.message === "string" ? candidate.message : "An unknown error occurred.";

    const diagnostic: Diagnostic = {
      severity: "error",
      code: typeof candidate.code === "string" ? candidate.code : "unknown",
      message,
    };

    // `exactOptionalPropertyTypes`: spread rather than assign `undefined`.
    return {
      ...diagnostic,
      ...(typeof candidate.path === "string" ? { path: candidate.path } : {}),
      ...(typeof candidate.hint === "string" ? { hint: candidate.hint } : {}),
    };
  }

  return {
    severity: "error",
    code: "unknown",
    message: typeof error === "string" && error.length > 0 ? error : "An unknown error occurred.",
  };
}

/**
 * Create the client.
 *
 * @param options - Optional overrides, for tests.
 * @returns The client.
 */
export function createThemvoraClient(options: ClientOptions = {}): ThemvoraClient {
  const capabilities = options.capabilities ?? detectCapabilities(CORE_SURFACE);

  /**
   * Refuse to run an operation this build cannot perform.
   *
   * @param operation - Which operation.
   * @param started - When the caller's clock started.
   * @returns The envelope, or `null` when the operation may proceed.
   */
  function unavailable<T>(
    operation: CoreOperation,
    started: number,
  ): OperationResult<T> | null {
    const availability = capabilities.core.operations[operation];
    if (availability.available) return null;

    return resultOf<T>("unavailable", Date.now() - started, {
      reason: availability.reason,
    });
  }

  /**
   * Honour a pre-flight cancellation.
   *
   * Core operations are synchronous and finish in milliseconds, so there is no
   * window to interrupt one mid-flight. Checking before starting is the honest
   * behaviour: a cancelled operation does no work and is reported as cancelled,
   * never as a validation failure.
   *
   * @param signal - The caller's signal.
   * @param started - When the caller's clock started.
   * @returns The envelope, or `null` when the operation may proceed.
   */
  function cancelled<T>(signal: AbortSignal | undefined, started: number): OperationResult<T> | null {
    if (signal?.aborted !== true) return null;
    return resultOf<T>("cancelled", Date.now() - started, {
      reason: "The operation was cancelled before it started.",
    });
  }

  /**
   * Map a throw onto an envelope.
   *
   * @param error - The thrown value.
   * @param started - When the caller's clock started.
   * @returns The envelope.
   */
  function failed<T>(error: unknown, started: number): OperationResult<T> {
    const diagnostic = diagnosticOf(error);
    const outcome: Outcome = USAGE_CODES.has(diagnostic.code) ? "usage" : "error";
    return resultOf<T>(outcome, Date.now() - started, { errors: [diagnostic] });
  }

  /**
   * Run a core call and wrap it.
   *
   * @param started - When the caller's clock started.
   * @param body - The core call.
   * @param outcomeOf - Overrides the outcome for a body that reports failure in
   *   its return value rather than by throwing.
   * @returns The envelope.
   */
  function attempt<T>(
    started: number,
    body: () => T,
    outcomeOf?: (value: T) => Outcome,
  ): OperationResult<T> {
    try {
      const value = body();
      return resultOf<T>(outcomeOf?.(value) ?? "ok", Date.now() - started, { value });
    } catch (error) {
      return failed<T>(error, started);
    }
  }

  return {
    capabilities,

    async generate(request: GenerateRequest): Promise<OperationResult<GeneratedThemePair>> {
      const started = Date.now();

      return (
        cancelled<GeneratedThemePair>(request.signal, started) ??
        unavailable<GeneratedThemePair>("generate", started) ??
        attempt(started, () =>
          generateTheme({
            seed: request.seed,
            ...(request.family !== undefined ? { family: request.family } : {}),
            ...(request.style !== undefined ? { style: request.style } : {}),
            ...(request.withCode !== undefined ? { withCode: request.withCode } : {}),
          }),
        )
      );
    },

    async validate(request: ThemeRequest): Promise<OperationResult<ValidationReport>> {
      const started = Date.now();

      return (
        cancelled<ValidationReport>(request.signal, started) ??
        unavailable<ValidationReport>("validate", started) ??
        attempt(started, () => {
          // Resolve first: a missing base or a circular chain throws with core's
          // own message, which is more useful than the "missing tokens" a
          // standalone validation would report. The registry is still passed on,
          // so validation sees the same context the theme was resolved in.
          const theme = resolveInDocument(request.theme, request.themes);
          const options = request.themes === undefined ? {} : { themes: request.themes };

          const result = validateTheme(theme, options);
          return {
            valid: result.valid,
            issues: result.issues,
            // Levels are computed on the resolved theme, so they need no registry.
            levels: validateThemeLevels(theme),
            // Measured on the resolved theme: an unresolved derived theme has
            // almost no colours, so the contrast summary would read as 0 pairs.
            contrast: summariseContrast(measureThemeContrast(theme)),
          };
        }, (report) => (report.valid ? "ok" : "validation-failed"))
      );
    },

    async catalog(options?: OperationOptions): Promise<OperationResult<CatalogSnapshot>> {
      const started = Date.now();

      return (
        cancelled<CatalogSnapshot>(options?.signal, started) ??
        unavailable<CatalogSnapshot>("catalog", started) ??
        attempt(started, () => ({
          entries: getPresetCatalog(),
          styles: [...GENERATION_STYLE_NAMES],
        }))
      );
    },

    async diff(request: DiffRequest): Promise<OperationResult<ThemeDiffReport>> {
      const started = Date.now();

      return (
        cancelled<ThemeDiffReport>(request.signal, started) ??
        unavailable<ThemeDiffReport>("diff", started) ??
        attempt(started, () =>
          diffThemes(request.a, request.b, {
            ...(request.includeUnchanged !== undefined
              ? { includeUnchanged: request.includeUnchanged }
              : {}),
          }),
        )
      );
    },

    async exportVariables(
      request: ThemeRequest,
    ): Promise<OperationResult<Record<string, string>>> {
      const started = Date.now();

      return (
        cancelled<Record<string, string>>(request.signal, started) ??
        unavailable<Record<string, string>>("exportVariables", started) ??
        attempt(started, () => themeToCSSVariables(request.theme))
      );
    },

    async cssDocument(request: ThemeRequest): Promise<OperationResult<string>> {
      const started = Date.now();

      return (
        cancelled<string>(request.signal, started) ??
        unavailable<string>("cssDocument", started) ??
        attempt(started, () =>
          themeToCssDocument(resolveInDocument(request.theme, request.themes)),
        )
      );
    },

    async migrate(request: ThemeRequest): Promise<OperationResult<MigrationReport>> {
      const started = Date.now();

      return (
        cancelled<MigrationReport>(request.signal, started) ??
        unavailable<MigrationReport>("migrate", started) ??
        attempt(started, () => {
          const migrated = migrateTheme(request.theme);
          const fromVersion = request.theme.meta?.version ?? null;
          const toVersion = migrated.meta?.version ?? null;

          return {
            theme: migrated,
            changed: fromVersion !== toVersion,
            fromVersion,
            toVersion,
          };
        })
      );
    },
  };
}
