import type { ThemeDefinition } from "./model";
import { resolveTokens } from "./resolve";

/**
 * Every token group that can be emitted as CSS custom properties, **in the
 * canonical order groups are emitted**.
 *
 * The order is part of the contract, not an accident of declaration: anything
 * that renders or compares token groups (the CSS emitter, the theme diff) reads
 * it from here, so a group cannot appear in one order in one place and a
 * different order in another.
 *
 * @see {@link TokenGroup}
 */
export const TOKEN_GROUPS = [
  "colors",
  "spacing",
  "radius",
  "shadows",
  "borderWidths",
  "zIndex",
  "breakpoints",
  "typography",
  "code",
] as const;

/**
 * The name of a token group that can be emitted as CSS custom properties.
 *
 * Derived from {@link TOKEN_GROUPS} so the type and the runtime order can never
 * disagree.
 */
export type TokenGroup = (typeof TOKEN_GROUPS)[number];

/**
 * Options for {@link themeToCSSVariables}.
 */
export interface ThemeToCSSVariablesOptions {
  /**
   * CSS custom property prefix. The token group name is appended to it.
   * @defaultValue `"theme-"`
   */
  prefix?: string;
  /**
   * Restrict emission to the listed token groups. When omitted, all groups
   * are emitted.
   */
  groups?: TokenGroup[];
}

function addEntries(
  target: Record<string, string>,
  prefix: string,
  entries?: Record<string, unknown>,
) {
  if (!entries) {
    return;
  }

  for (const [key, value] of Object.entries(entries)) {
    if (value === undefined || value === null) continue;

    if (typeof value === "object") {
      addEntries(target, `${prefix}${key}-`, value as Record<string, unknown>);
    } else {
      target[`--${prefix}${key}`] = String(value);
    }
  }
}

/**
 * Flatten a theme's semantic tokens into CSS custom properties
 * (`--theme-*`), optionally filtered by token group.
 *
 * @param theme Theme whose tokens are flattened.
 * @param options Emission options (prefix, group filter).
 * @returns A flat map of CSS custom property name → value.
 *
 * @example
 * ```ts
 * const vars = themeToCSSVariables(theme); // { "--theme-color-background": "#fff", ... }
 * ```
 *
 * @remarks
 * Pass `{ groups: ["colors"] }` to emit only specific token groups.
 * @see {@link flattenTokens}
 * @see {@link ThemeToCSSVariablesOptions}
 */
export function themeToCSSVariables(
  theme: ThemeDefinition,
  options: ThemeToCSSVariablesOptions = {},
): Record<string, string> {
  const prefix = options.prefix ?? "theme-";
  const shouldInclude = (group: TokenGroup) =>
    !options.groups || options.groups.includes(group);

  const tokens = theme.tokens ? resolveTokens(theme.tokens) : undefined;

  const variables: Record<string, string> = {};

  if (shouldInclude("colors")) addEntries(variables, `${prefix}color-`, tokens?.colors);
  if (shouldInclude("spacing")) addEntries(variables, `${prefix}spacing-`, tokens?.spacing);
  if (shouldInclude("radius")) addEntries(variables, `${prefix}radius-`, tokens?.radius);
  if (shouldInclude("shadows")) addEntries(variables, `${prefix}shadow-`, tokens?.shadows);
  if (shouldInclude("borderWidths")) addEntries(variables, `${prefix}border-width-`, tokens?.borderWidths);
  if (shouldInclude("zIndex")) addEntries(variables, `${prefix}z-index-`, tokens?.zIndex);
  if (shouldInclude("breakpoints")) addEntries(variables, `${prefix}breakpoint-`, tokens?.breakpoints);

  if (shouldInclude("typography")) {
    const typography = tokens?.typography;
    addEntries(
      variables,
      `${prefix}typography-font-family-`,
      typography?.fontFamilies,
    );
    addEntries(
      variables,
      `${prefix}typography-font-size-`,
      typography?.fontSizes,
    );
    addEntries(
      variables,
      `${prefix}typography-line-height-`,
      typography?.lineHeights,
    );
  }

  if (shouldInclude("code")) {
    addEntries(
      variables,
      `${prefix}code-`,
      tokens?.code as Record<string, unknown> | undefined,
    );
  }

  return variables;
}

/**
 * A light/dark pair, as {@link generateTheme} returns it.
 *
 * Structural rather than nominal: any `{ light, dark }` object qualifies, which
 * is what lets a document parsed from JSON be passed straight in.
 */
export interface ThemeCssPair {
  /** The light theme. */
  light: ThemeDefinition;
  /** The dark theme. */
  dark: ThemeDefinition;
}

/** The selector a single theme, or a pair's light half, is emitted under. */
export const CSS_ROOT_SELECTOR = ":root";

/**
 * The selector a pair's dark half is emitted under.
 *
 * Matches the convention the CLI's `export` command has always written, and the
 * one `themvora init` uses in the generated stylesheet: an explicit class and a
 * `data-theme` attribute, so a host can opt in with either.
 */
export const CSS_DARK_SELECTOR = '.dark, [data-theme="dark"]';

/**
 * Whether a value is a light/dark pair rather than a single theme.
 *
 * A `ThemeDefinition` is keyed by `name`/`tokens`; it never has both `light` and
 * `dark` as objects, so the check cannot mistake one for the other.
 *
 * @param value - The value to test.
 * @returns `true` when it holds both halves.
 */
function isThemeCssPair(value: ThemeDefinition | ThemeCssPair): value is ThemeCssPair {
  const candidate = value as { light?: unknown; dark?: unknown };
  const isObject = (input: unknown): boolean => typeof input === "object" && input !== null;
  return isObject(candidate.light) && isObject(candidate.dark);
}

/**
 * Render one rule block.
 *
 * @param selector - The selector to emit under.
 * @param variables - The custom properties, in emission order.
 * @returns The block, with a trailing newline added by the caller.
 *
 * @remarks
 * An empty variable set still produces a block (`selector {\n\n}`), which is what
 * the CLI's exporter has always written for a theme with no tokens. It is
 * preserved rather than tidied so the CLI refactor stays byte-compatible; a theme
 * with no tokens does not pass `validateTheme()`, so this is not a state a
 * validated theme can reach.
 */
function cssBlock(selector: string, variables: Record<string, string>): string {
  const lines = Object.entries(variables)
    .map(([name, value]) => `  ${name}: ${value};`)
    .join("\n");

  return `${selector} {\n${lines}\n}`;
}

/**
 * Render a theme, or a light/dark pair, as a CSS custom-property document.
 *
 * This is the canonical formatting for Themvora's `:root` document convention,
 * and the only place it exists: the CLI's `export --format css` and the VS Code
 * extension's Copy CSS Variables both call it, so the CSS a user copies is the
 * CSS the CLI writes.
 *
 * A single theme is emitted under {@link CSS_ROOT_SELECTOR}. A pair is emitted as
 * the light theme under `:root` followed by the dark theme under
 * {@link CSS_DARK_SELECTOR}.
 *
 * Output is deterministic: the variable order comes from
 * {@link themeToCSSVariables}, which emits token groups in a fixed order, so the
 * same theme always produces byte-identical CSS.
 *
 * @param theme - A theme definition, or a `{ light, dark }` pair.
 * @returns The document, ending with a newline.
 *
 * @throws {TypeError} When the argument is not an object. This matches
 *   {@link themeToCSSVariables}, which is total over a theme's tokens and throws
 *   only on input that is not a theme at all; neither invents a diagnostic code
 *   for a programming error.
 *
 * @example
 * ```ts
 * const { light, dark } = generateTheme({ seed: "#4f46e5" });
 * const css = themeToCssDocument({ light, dark });
 * // :root { --theme-color-background: #fbfbff; … }
 * // .dark, [data-theme="dark"] { … }
 * ```
 *
 * @see {@link themeToCSSVariables}
 */
export function themeToCssDocument(theme: ThemeDefinition | ThemeCssPair): string {
  if (typeof theme !== "object" || theme === null) {
    throw new TypeError(
      "themeToCssDocument() expects a theme definition or a { light, dark } pair.",
    );
  }

  if (isThemeCssPair(theme)) {
    return [
      cssBlock(CSS_ROOT_SELECTOR, themeToCSSVariables(theme.light)),
      "",
      cssBlock(CSS_DARK_SELECTOR, themeToCSSVariables(theme.dark)),
      "",
    ].join("\n");
  }

  return `${cssBlock(CSS_ROOT_SELECTOR, themeToCSSVariables(theme))}\n`;
}
