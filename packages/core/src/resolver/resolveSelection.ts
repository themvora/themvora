import type { ThemeDefinition, ThemeMode } from "../model/theme";
import {
  getThemeMode,
  normalizeThemeFamily,
  type ThemeSelectionState,
} from "../model";
import { resolveThemeReference } from "../theme-reference";

/**
 * Options for resolving a selection state.
 */
export interface ResolveSelectionOptions<T extends ThemeDefinition> {
  /** Registered themes to resolve within. */
  themes: readonly T[];

  /**
   * Fallback theme: a **variant** name (`"mint-dark"`) or a **family** name
   * (`"mint"`). See {@link resolveThemeReference}.
   */
  defaultTheme?: string;

  /** Initial mode. Defaults to the fallback theme's mode. */
  initialMode?: ThemeMode;

  /**
   * Initial family. A variant name is accepted too and normalised to its
   * family — its mode is then used only when `initialMode` is not supplied.
   */
  initialFamily?: string;

  /** A persisted selection that wins over the other inputs when present. */
  persistedSelection?: ThemeSelectionState | null;
}

/**
 * Resolves a selection state from configuration inputs.
 *
 * Priority: `persistedSelection` wins; otherwise `initialFamily` (family or
 * variant), then `defaultTheme` (family or variant), then the first theme.
 *
 * @param options Resolution inputs.
 * @returns The resolved selection (family + mode).
 * @throws {Error} When `themes` is empty.
 * @see {@link resolveInitialTheme}
 * @see {@link resolveThemeReference}
 */
export function resolveSelection<T extends ThemeDefinition>(
  options: ResolveSelectionOptions<T>,
): ThemeSelectionState {
  const themes = options.themes;

  // Both naming forms go through one resolver, so a family here behaves exactly
  // as it does in `themeOverride` and in the pre-paint bootstrap.
  const defaultRef = resolveThemeReference(themes, options.defaultTheme, {
    ...(options.initialMode !== undefined ? { mode: options.initialMode } : {}),
  });
  const familyRef = resolveThemeReference(themes, options.initialFamily, {
    ...(options.initialMode !== undefined ? { mode: options.initialMode } : {}),
  });

  const fallback = defaultRef?.theme ?? themes[0];

  if (!fallback) {
    throw new Error("At least one theme must be provided.");
  }

  if (options.persistedSelection) {
    return {
      family: normalizeThemeFamily(
        themes,
        options.persistedSelection.family,
        fallback,
      ),
      mode: options.persistedSelection.mode,
    };
  }

  // An empty family means "not specified", exactly like omitting it — `??` only
  // catches null/undefined, so an `initialFamily` of `""` (what a cookie read
  // yields for a missing cookie on some adapters) would otherwise survive into
  // the selection. `normalizeThemeFamily` handles that and the stronger case: a
  // family that is not registered at all, which would match no theme, drag
  // every downstream lookup to the `themes[0]` fallback, and leave the selection
  // naming a family that is not on screen.
  const family = normalizeThemeFamily(
    themes,
    familyRef?.family ?? options.initialFamily,
    fallback,
  );

  // Mode, in order: an explicit `initialMode`; the mode a *variant* reference
  // states; the fallback theme's own mode. A family reference deliberately
  // states none, so `initialFamily="mint"` keeps the mode the caller configured
  // instead of quietly picking the family's light variant.
  const mode: ThemeMode =
    options.initialMode ??
    familyRef?.mode ??
    defaultRef?.mode ??
    getThemeMode(fallback);

  return { family, mode };
}
