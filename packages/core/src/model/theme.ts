import type { ThemeMeta } from "./meta";
import type { ThemeTokens } from "./tokens";

/**
 * Stable theme identifier used for selection and lookup.
 *
 * Any string is accepted; use a readable family-oriented name such as
 * `"mint-light"` or `"dark"`.
 */
export type ThemeName = string;

/**
 * The color-mode dimension of a theme selection.
 *
 * - `"light"` and `"dark"` are explicit modes.
 * - `"system"` follows the visitor's `prefers-color-scheme` preference and
 *   resolves to `"light"` or `"dark"` at selection time.
 */
export type ThemeMode = "light" | "dark" | "system";

/**
 * A theme definition: a name plus optional metadata and token values.
 *
 * @typeParam Name The literal theme name, inferred from `as const` arrays.
 *
 * @see {@link defineTheme}
 * @see {@link extendTheme}
 * @see {@link composeTheme}
 */
export interface ThemeDefinition<Name extends ThemeName = ThemeName> {
  /**
   * Stable theme identifier used for selection and lookup.
   */
  name: Name;

  /**
   * Names of themes this definition extends. Extending merges the base
   * themes' tokens before applying this definition's own tokens.
   */
  extends?: Name | readonly Name[];

  /**
   * Metadata describing the theme family, mode, and presentation labels.
   */
  meta?: ThemeMeta;

  /**
   * Semantic token values consumed by the runtime. When omitted, the
   * theme inherits tokens entirely from its extended bases.
   */
  tokens?: ThemeTokens;
}

/**
 * The literal family union of a **single** theme definition type.
 *
 * `ThemeFamilies` below does this for a tuple; the provider's selection props
 * are typed against the element type, so they need the same derivation one level
 * down. Resolves to `string` when the definition does not state a literal family
 * (a `ThemeDefinition[]` variable, a generated catalog), which keeps the
 * dynamic-input path working.
 */
export type ThemeFamilyOf<T extends ThemeDefinition> = [
  T["meta"] extends { family?: infer F }
    ? F extends string
      ? F
      : never
    : never,
] extends [never]
  ? string
  : T["meta"] extends { family?: infer F }
    ? F extends string
      ? F
      : string
    : string;

/**
 * Every way a caller can name a provided theme.
 *
 * A **variant** name (`"cocoa-dark"`) or a **family** name (`"cocoa"`) — the two
 * forms {@link resolveThemeReference} accepts. Derived from the theme definitions
 * the caller passes, so a statically known collection autocompletes both; a
 * dynamically built one widens to `string` rather than becoming unusable.
 *
 * @typeParam T - The theme definition type used by the application.
 *
 * @example
 * ```ts
 * const themes = [
 *   { name: "oat-light",   meta: { family: "oat",   mode: "light" }, tokens: {} },
 *   { name: "cocoa-dark",  meta: { family: "cocoa", mode: "dark"  }, tokens: {} },
 * ] as const;
 *
 * // ThemeIdentifier<typeof themes[number]>
 * //   = "oat-light" | "cocoa-dark" | "oat" | "cocoa"
 * ```
 */
export type ThemeIdentifier<T extends ThemeDefinition> =
  | T["name"]
  | ThemeFamilyOf<T>;

/**
 * Extract the literal theme-family union from a tuple of theme definitions.
 * When themes are defined with `as const`, autocomplete shows the available
 * families in `setFamily()` / `initialFamily`:
 *
 * ```ts
 * const themes = [
 *   { name: "mint-light", meta: { family: "mint", mode: "light" }, tokens: {} },
 *   { name: "mint-dark",  meta: { family: "mint", mode: "dark" }, tokens: {} },
 * ] as const;
 * // ThemeFamilies<typeof themes> → "mint"
 * ```
 */
export type ThemeFamilies<T extends readonly ThemeDefinition[]> =
  FamilyOf<T[number]> extends never ? string : FamilyOf<T[number]>;

type FamilyOf<T> = T extends ThemeDefinition<infer _Name>
  ? T["meta"] extends { family?: infer F }
    ? F extends string
      ? F
      : never
    : never
  : never;

/**
 * Extract the literal theme-mode union from a tuple of theme definitions.
 * With `as const`, `ThemeModes<typeof themes> → "light" | "dark"`.
 */
export type ThemeModes<T extends readonly ThemeDefinition[]> =
  ModeOf<T[number]> extends never ? ThemeMode : ModeOf<T[number]>;

type ModeOf<T> = T extends ThemeDefinition<infer _Name>
  ? T["meta"] extends { mode?: infer M }
    ? M extends ThemeMode
      ? M
      : never
    : never
  : never;
