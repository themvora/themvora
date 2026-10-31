/**
 * One resolver for every way a caller can name a theme.
 *
 * A provider's selection props accept two shapes, and both mean something
 * precise:
 *
 * - a **concrete variant** — `"cocoa-dark"` — which names one definition and
 *   carries its own mode;
 * - a **family** — `"cocoa"` — which names a group, and resolves to the variant
 *   the mode contract picks inside it.
 *
 * `defaultTheme`, `themeOverride` and `initialFamily` all go through this module
 * so they cannot drift apart, and so the server, the pre-paint bootstrap and the
 * client runtime agree on what a name means.
 *
 * @packageDocumentation
 */
import type { ThemeDefinition, ThemeMode } from "./model/theme";
import {
  getThemeFamilies,
  getThemeFamily,
  getThemeMode,
  resolveSelectedTheme,
} from "./model";

/**
 * A theme reference that resolved against a provider's catalog.
 *
 * @typeParam T - The theme definition type used by the application.
 *
 * @see {@link resolveThemeReference}
 */
export interface ResolvedThemeReference<T extends ThemeDefinition> {
  /**
   * Which naming form was used.
   *
   * `"variant"` means the reference named one definition exactly; `"family"`
   * means it named a group and the variant was chosen by the mode contract.
   */
  kind: "variant" | "family";
  /** The canonical family the reference belongs to. */
  family: string;
  /** The definition the reference resolves to. */
  theme: T;
  /**
   * The variant's own mode.
   *
   * Present only for a `"variant"` reference: that is the only case where the
   * reference itself states a mode. A family reference deliberately leaves this
   * undefined so the caller's mode contract decides.
   */
  mode?: ThemeMode;
}

/**
 * Options for {@link resolveThemeReference}.
 */
export interface ResolveThemeReferenceOptions {
  /**
   * Mode used to pick a variant when the reference names a family.
   *
   * @defaultValue `"light"` — the documented family default, which
   *   `resolveThemeName` already prefers over a family's first theme.
   */
  mode?: ThemeMode;
  /** Whether the visitor prefers dark. Used only when `mode` is `"system"`. */
  prefersDark?: boolean;
}

/**
 * Resolve a theme reference against a provider's catalog.
 *
 * @typeParam T - The theme definition type used by the application.
 * @param themes - The themes the provider was given. A reference that is not in
 *   this list does not resolve — the global preset catalog is never consulted.
 * @param reference - A variant name, a family name, or nothing.
 * @param options - Mode used for a family reference.
 * @returns The resolution, or `null` when the reference names nothing available.
 *
 * @example
 * ```ts
 * // `themes` is whatever registry the provider was given.
 * const themes = getBuiltInThemes();
 *
 * resolveThemeReference(themes, "cocoa-dark"); // { kind: "variant", mode: "dark", … }
 * resolveThemeReference(themes, "cocoa", { mode: "dark" }); // { kind: "family", … cocoa-dark }
 * resolveThemeReference(themes, "nope"); // null
 * ```
 *
 * @remarks
 * An exact variant name wins over a family name. A theme whose `name` equals
 * another theme's family is therefore addressable as a variant — the explicit,
 * more specific reading — and the family form of the *other* family keeps
 * working. The two namespaces are otherwise independent: a family is
 * `meta.family ?? "default"`, a variant is `name`.
 *
 * @see {@link resolveThemeOverride}
 * @see {@link resolveSelection}
 */
export function resolveThemeReference<T extends ThemeDefinition>(
  themes: readonly T[],
  reference: string | null | undefined,
  options: ResolveThemeReferenceOptions = {},
): ResolvedThemeReference<T> | null {
  if (typeof reference !== "string") return null;
  const wanted = reference.trim();
  if (wanted.length === 0) return null;

  const exact = themes.find((theme) => theme.name === wanted);
  if (exact) {
    return {
      kind: "variant",
      family: getThemeFamily(exact),
      theme: exact,
      mode: getThemeMode(exact),
    };
  }

  if (!getThemeFamilies(themes).includes(wanted)) return null;

  const requestedMode = options.mode;
  const effectiveMode: ThemeMode =
    requestedMode === "system"
      ? options.prefersDark
        ? "dark"
        : "light"
      : (requestedMode ?? "light");

  return {
    kind: "family",
    family: wanted,
    theme: resolveSelectedTheme(themes, { family: wanted, mode: effectiveMode }),
  };
}
