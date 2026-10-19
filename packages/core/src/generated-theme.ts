/**
 * `isGeneratedTheme` / `resolveGeneratedTheme` — reading a generated theme back
 * out of a provider.
 *
 * {@link generateTheme} marks its result with `meta.generation.kind ===
 * "generated"`. That marker is the one thing the shipped presets and the neutral
 * baseline never carry, so it is what tells a theme *the application generated*
 * apart from one that merely records how the framework built it.
 *
 * The marker is provenance, not identity: it survives `JSON` round-trips and
 * the `ThemeRegistry` registration path (both copy `meta` verbatim), which is
 * what lets the framework accessors recognize a theme after it has been
 * serialized and re-registered.
 *
 * @packageDocumentation
 */
import { createDiagnostic } from "./diagnostics";
import { ThemeError } from "./errors";
import type { ThemeDefinition } from "./model/theme";

/**
 * The `meta.generation.kind` value stamped by {@link generateTheme}.
 *
 * @see isGeneratedTheme
 */
export const GENERATED_THEME_KIND = "generated";

/**
 * Whether a theme was produced by the public {@link generateTheme} call.
 *
 * Matches on the explicit origin marker only. It deliberately does **not** infer
 * from a theme's name, family, or colors: the built-in presets and the neutral
 * baseline are produced by the same engine and would otherwise be mistaken for
 * application-generated themes, and a hand-authored theme could impersonate one
 * by adopting a familiar id.
 *
 * @param theme - The theme definition to test.
 * @returns `true` when the theme carries the generator's origin marker.
 *
 * @see resolveGeneratedTheme
 */
export function isGeneratedTheme(theme: ThemeDefinition): boolean {
  return theme.meta?.generation?.kind === GENERATED_THEME_KIND;
}

/**
 * The outcome of {@link findGeneratedTheme}.
 *
 * - `"found"` — exactly one eligible theme resolved (its `theme` is set).
 * - `"missing"` — no generated theme is registered.
 * - `"ambiguous"` — more than one is registered and the active selection does
 *   not pick one out. Callers must reject this rather than guess.
 */
export type GeneratedThemeStatus = "found" | "missing" | "ambiguous";

/**
 * The result of looking up the generated theme among registered themes.
 *
 * @typeParam T - The theme definition type.
 */
export interface GeneratedThemeLookup<T extends ThemeDefinition> {
  /** Which case was hit. */
  status: GeneratedThemeStatus;
  /** The resolved generated theme, or `null` when none could be resolved. */
  theme: T | null;
  /** Every registered generated theme, in registration order. For diagnostics. */
  candidates: readonly T[];
}

/**
 * Locate the generated theme among a provider's registered themes.
 *
 * Deterministic and non-throwing:
 *
 * - No generated theme registered → `"missing"`.
 * - Exactly one → `"found"`.
 * - More than one → `"found"` for the one whose name matches `active` (the
 *   current active selection); otherwise `"ambiguous"`. The first candidate is
 *   never returned on a tie.
 *
 * @param themes - The themes registered with the provider, in registration order.
 * @param active - The currently active theme, used to disambiguate multiple
 *   generated themes. Omitted on a surface with no active selection.
 * @returns The lookup result.
 *
 * @see resolveGeneratedTheme
 */
export function findGeneratedTheme<T extends ThemeDefinition>(
  themes: readonly T[],
  active?: T | undefined,
): GeneratedThemeLookup<T> {
  const candidates = themes.filter(isGeneratedTheme) as T[];

  if (candidates.length === 0) {
    return { status: "missing", theme: null, candidates };
  }
  if (candidates.length === 1) {
    return { status: "found", theme: candidates[0]!, candidates };
  }

  const activeMatch = active
    ? candidates.find((theme) => theme.name === active.name)
    : undefined;

  if (activeMatch) {
    return { status: "found", theme: activeMatch, candidates };
  }
  return { status: "ambiguous", theme: null, candidates };
}

/**
 * Resolve the single generated theme registered with a provider, or throw.
 *
 * The throwing counterpart of {@link findGeneratedTheme}, for call sites that
 * need a theme rather than a status — the framework accessors, which surface the
 * failure to the caller.
 *
 * @param themes - The themes registered with the provider.
 * @param active - The currently active theme, used to disambiguate multiple
 *   generated themes.
 * @returns The resolved generated theme.
 * @throws {ThemeError} `TV_GENERATION_THEME_NOT_FOUND` when none is registered,
 *   or `TV_GENERATION_THEME_AMBIGUOUS` when several are and `active` does not
 *   single one out.
 *
 * @see isGeneratedTheme
 * @see findGeneratedTheme
 */
export function resolveGeneratedTheme<T extends ThemeDefinition>(
  themes: readonly T[],
  active?: T | undefined,
): T {
  const { status, theme, candidates } = findGeneratedTheme(themes, active);

  if (status === "found") {
    return theme!;
  }

  if (status === "missing") {
    throw ThemeError.fromDiagnostic(
      createDiagnostic({
        code: "TV_GENERATION_THEME_NOT_FOUND",
        level: "error",
        message:
          "No generated theme is registered with this provider.",
        context: {
          api: "useGeneratedTheme",
          expected:
            "a theme created by generateTheme() and passed to the provider's `themes`",
        },
        hint:
          'const { light, dark } = generateTheme({ seed: "#635BFF" }); ' +
          "then pass them to the provider's `themes`.",
      }),
    );
  }

  const names = candidates.map((candidate) => candidate.name).join(", ");
  const activeName = active?.name;

  throw ThemeError.fromDiagnostic(
    createDiagnostic({
      code: "TV_GENERATION_THEME_AMBIGUOUS",
      level: "error",
      message:
        `${candidates.length} generated themes are registered (${names}) and the ` +
        "active theme does not select one of them.",
      context: {
        api: "useGeneratedTheme",
        received: activeName,
        expected: `one of: ${names}`,
        details: { candidates: names },
      },
      hint:
        "Register a single generated theme, or activate one of the generated " +
        "themes so the active selection identifies which to return.",
    }),
  );
}
