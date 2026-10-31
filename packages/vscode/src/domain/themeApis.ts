/**
 * The public theme APIs, by the package that actually exports them.
 *
 * A name is only canonical when it comes from one of these surfaces. This table
 * is the identity half of catalog recognition: `getPresetThemes()` is the
 * catalog API, but a local function with that spelling is not. Keeping the
 * names here — rather than matching them in source — is what lets the reader
 * run in strict mode.
 *
 * `@themvora/nuxt` re-exports the whole core entry (`export * from
 * "@themvora/core"`), so a Nuxt application can import the same APIs from it.
 * `@themvora/core/vanilla` exports `generateTheme` but not the catalogs or
 * `defineTheme`.
 *
 * @packageDocumentation
 */

/** The theme APIs exported by `@themvora/core`. */
export const CORE_THEME_APIS = [
  "defineTheme",
  "generateTheme",
  "getPresetThemes",
  "getBrandPresets",
  "getBuiltInThemes",
] as const;

/** A canonical theme API name. */
export type ThemeApiName = (typeof CORE_THEME_APIS)[number];

/**
 * Verified theme API exports, keyed by import specifier.
 *
 * A specifier absent from this table exposes no theme API this reader accepts.
 */
export const VERIFIED_THEME_APIS: Readonly<Record<string, readonly ThemeApiName[]>> = {
  "@themvora/core": CORE_THEME_APIS,
  "@themvora/core/vanilla": ["generateTheme"],
  "@themvora/nuxt": CORE_THEME_APIS,
};

/**
 * The verified theme APIs a package specifier exports.
 *
 * @param specifier - The import specifier, as written.
 * @returns The API names, or undefined when the package exports none.
 */
export function themeApisOf(specifier: string): readonly ThemeApiName[] | undefined {
  return VERIFIED_THEME_APIS[specifier.split("?")[0] ?? specifier];
}

/**
 * Whether a name is one of the canonical theme APIs.
 *
 * @param name - The export name.
 * @returns `true` for a known API.
 */
export function isThemeApiName(name: string): name is ThemeApiName {
  return (CORE_THEME_APIS as readonly string[]).includes(name);
}
