/**
 * Canonical runtime-configuration normalization and validation.
 *
 * The provider props (`themes`, `defaultTheme`, `initial`/`initialFamily`/
 * `initialMode`) are *live configuration*: each framework adapter forwards a
 * config change here so the runtime can re-resolve centrally, rather than each
 * adapter inventing its own selection rules.
 *
 * @packageDocumentation
 */
import type { ThemeDefinition, ThemeMode } from "./model/theme";
import { getThemeFamilies, getThemeMode, normalizeThemeFamily } from "./model/selection";
import type { ThemeSelectionState } from "./model/selection";
import { resolveSelectedTheme } from "./model/resolve-selected-theme";
import { createDiagnostic, emitDiagnostic } from "./diagnostics";
import { getNeutralThemes } from "./neutral-themes";

/**
 * Whether a value is a usable theme entry.
 *
 * Deliberately lenient — the runtime needs a stable identity (`name`) and an
 * object to read `meta`/`tokens` from, not a fully-populated palette. A theme
 * with partial tokens is still a valid registration (the CSS-variable binding
 * simply emits what is present), so schema completeness is not required here.
 */
export function isUsableTheme(theme: unknown): theme is ThemeDefinition {
  return (
    !!theme &&
    typeof theme === "object" &&
    typeof (theme as { name?: unknown }).name === "string" &&
    (theme as { name: string }).name.length > 0
  );
}

/**
 * The canonical neutral fallback catalog.
 *
 * A single source shared by every adapter: the framework packages never define
 * their own fallback palette.
 */
export function getFallbackThemes<T extends ThemeDefinition>(): readonly T[] {
  return getNeutralThemes() as unknown as readonly T[];
}

/**
 * Normalize a theme catalog.
 *
 * Drops entries that are not usable themes, drops duplicate `name`s (first
 * wins, matching the registry's deduplication), and — when nothing usable
 * remains — falls back to the canonical neutral themes. The input array is never
 * mutated.
 *
 * @param themes - The requested catalog, or `undefined` to request the fallback.
 * @returns A non-empty, deduplicated catalog.
 */
export function normalizeThemeCatalog<T extends ThemeDefinition>(
  themes: readonly T[] | undefined,
): readonly T[] {
  const seen = new Set<string>();
  const usable: T[] = [];

  for (const theme of themes ?? []) {
    if (!isUsableTheme(theme)) continue;
    if (seen.has(theme.name)) continue;
    seen.add(theme.name);
    usable.push(theme);
  }

  return usable.length > 0 ? usable : getFallbackThemes<T>();
}

/**
 * Whether a selection can be resolved to a usable theme in a catalog.
 *
 * A selection is resolvable when its family is registered in `themes` AND at
 * least one theme for that family resolves the requested mode (treating
 * `"system"` as the light variant for the check — the caller re-resolves the
 * concrete mode).
 */
export function isSelectionResolvable(
  themes: readonly ThemeDefinition[],
  selection: ThemeSelectionState,
): boolean {
  const family = normalizeThemeFamily(themes, selection.family);
  if (family !== selection.family) return false;
  return themes.some((theme) => (theme.meta?.family ?? "default") === family);
}

/**
 * The outcome of resolving a configuration change: the effective selection and
 * the theme it resolves to.
 */
export interface EffectiveConfiguration<T extends ThemeDefinition> {
  /** The effective selection after the configuration change. */
  selection: ThemeSelectionState;
  /** The theme the effective selection resolves to. */
  theme: T;
}

/**
 * Resolve the effective selection + theme for a configuration update.
 *
 * Precedence (shared by every adapter — there is no per-framework variant):
 *
 * 1. `preserve` and the previous selection is still resolvable → keep it. A
 *    catalog change that leaves the selection valid must not silently move the
 *    user to another theme.
 * 2. Otherwise resolve from `defaultTheme` / `initialFamily` / `initialMode`
 *    against the effective catalog.
 * 3. An unknown requested family normalizes to a resolvable family and emits a
 *    single `TV_THEME_FAMILY_UNKNOWN` diagnostic.
 *
 * @param options Resolution inputs.
 * @returns The effective selection and its theme.
 */
export function resolveEffectiveConfiguration<T extends ThemeDefinition>(options: {
  themes: readonly T[];
  defaultTheme?: string | undefined;
  initialFamily?: string | undefined;
  initialMode?: ThemeMode | undefined;
  prefersDark?: boolean | undefined;
  previousSelection?: ThemeSelectionState | undefined;
  preservePrevious?: boolean | undefined;
}): EffectiveConfiguration<T> {
  const themes = options.themes;

  if (
    options.preservePrevious &&
    options.previousSelection &&
    isSelectionResolvable(themes, options.previousSelection)
  ) {
    const selection = options.previousSelection;
    const theme = resolveSelectedTheme(themes, {
      family: normalizeThemeFamily(themes, selection.family),
      mode: selection.mode === "system" ? (options.prefersDark ? "dark" : "light") : selection.mode,
    });
    return { selection, theme };
  }

  const fallbackTheme =
    themes.find((theme) => theme.name === options.defaultTheme) ?? themes[0]!;

  const requestedFamily =
    options.initialFamily && options.initialFamily.length > 0
      ? options.initialFamily
      : undefined;

  const family = normalizeThemeFamily(themes, requestedFamily, fallbackTheme);

  if (requestedFamily !== undefined && family !== requestedFamily) {
    emitUnknownFamilyDiagnostic(requestedFamily, family, themes);
  }

  const mode: ThemeMode = options.initialMode ?? getThemeMode(fallbackTheme);

  const selection: ThemeSelectionState = { family, mode };
  const theme = resolveSelectedTheme(themes, {
    family,
    mode: mode === "system" ? (options.prefersDark ? "dark" : "light") : mode,
  });

  return { selection, theme };
}

/**
 * Report a family that is not registered in the effective catalog.
 *
 * `level: "error"` because an explicitly requested family that cannot resolve is
 * a configuration mistake, not a supported absence. Deduplication is handled by
 * {@link emitDiagnostic}: the same invalid value reports once, a new invalid
 * value reports again.
 */
export function emitUnknownFamilyDiagnostic(
  requested: string,
  resolved: string,
  themes: readonly ThemeDefinition[],
): void {
  const available = getThemeFamilies(themes);
  emitDiagnostic(
    createDiagnostic({
      code: "TV_THEME_FAMILY_UNKNOWN",
      level: "error",
      message:
        `Requested theme family "${requested}" is not registered; ` +
        // The family the resolver actually chose, not the first registered one:
        // a message that names a different family than the runtime picked sends
        // the reader looking in the wrong place.
        `resolved to "${resolved}" instead.`,
      context: {
        api: "ThemeProvider",
        property: "initialFamily",
        received: requested,
        expected: available.join(" | "),
        details: { availableFamilies: available },
      },
      hint:
        "Check the family name against the themes you registered, or omit the " +
        "prop to use the fallback theme's family.",
    }),
  );
}

/**
 * Report that no usable theme was available and the neutral fallback was used.
 *
 * `level: "warning"` — the runtime recovers safely, so this is reported, not
 * thrown. Deduplicated like every other diagnostic.
 */
export function emitNeutralFallbackDiagnostic(): void {
  emitDiagnostic(
    createDiagnostic({
      code: "TV_THEME_NEUTRAL_FALLBACK",
      level: "warning",
      message:
        "No usable theme was available; the neutral fallback theme was applied.",
      context: { api: "ThemeProvider", property: "themes" },
      hint: "Pass a non-empty `themes` array to register your own catalog.",
    }),
  );
}

/**
 * A single unusable option inside a live configuration update.
 *
 * Used by the runtime's `configure()` validation so the diagnostic names the
 * exact option and value rather than reporting the whole update as invalid.
 */
export interface InvalidOption {
  /** Dotted option path, e.g. `"transition.duration"`. */
  property: string;
  /** The value that was supplied. */
  received: unknown;
  /** A short description of what would have been accepted. */
  expected: string;
}

/**
 * Report an unusable transition/scheduling option supplied to `configure()`.
 *
 * `level: "warning"` — the runtime keeps the previous setting for the affected
 * subsystem (a defined state) rather than corrupting a healthy runtime or
 * throwing. Deduplicated by {@link emitDiagnostic}, so an adapter that forwards
 * the same invalid value on every render logs it once.
 */
export function emitInvalidOptionDiagnostic(option: InvalidOption): void {
  emitDiagnostic(
    createDiagnostic({
      code: "TV_CONFIG_OPTION_INVALID",
      level: "warning",
      message:
        `The "${option.property}" option is not usable; the previous setting was kept.`,
      context: {
        api: "configure",
        property: option.property,
        received: option.received,
        expected: option.expected,
      },
      hint: "Correct the option value; the runtime retained its last valid configuration.",
    }),
  );
}

/**
 * Report that a `scheduled` configuration named light/dark themes that are not
 * registered, so the schedule cannot drive the selection.
 *
 * `level: "warning"` — the schedule is installed but reports no light/dark pair,
 * matching the existing `TV_SCHEDULE_THEME_UNRESOLVED` contract used by the
 * scheduled plugin. Deduplicated by {@link emitDiagnostic}.
 */
export function emitScheduledThemeUnresolvedDiagnostic(names: {
  lightTheme?: string | undefined;
  darkTheme?: string | undefined;
}): void {
  emitDiagnostic(
    createDiagnostic({
      code: "TV_SCHEDULE_THEME_UNRESOLVED",
      level: "warning",
      message:
        "The scheduled configuration names a light/dark theme that is not " +
        "registered, so the schedule is not driving the selection.",
      context: {
        api: "configure",
        property: "scheduled",
        received: [names.lightTheme, names.darkTheme].filter(
          (name): name is string => typeof name === "string",
        ),
        expected: "registered theme names",
      },
      hint:
        "Register the named themes, or omit `lightTheme`/`darkTheme` so the " +
        "pair is derived from the active theme's family.",
    }),
  );
}
