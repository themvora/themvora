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
