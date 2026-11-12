/**
 * Pre-paint CSS for Mantine's own variables.
 *
 * @remarks
 * Mantine paints Card, Paper, inputs, borders and dimmed text from
 * `--mantine-color-*`. Those variables are produced by `MantineProvider` when it
 * mounts — which is *after* the server-rendered markup has already been parsed.
 * The consequence is visible: the first frame has the dashboard in the DOM, the
 * Themvora `--theme-*` values in place, and `--mantine-color-default` still
 * undefined, so a Card paints `transparent` and its border falls back to
 * `currentColor`. The components are not missing; they are unstyled until the
 * provider injects its variables.
 *
 * This module emits the same values `createMantineCssVariables` hands to the
 * provider, as a stylesheet a server-rendered document can inline. It is a plain
 * function with no React and no `"use client"`, so a server component can call
 * it (importing it from the package root would cross a client boundary).
 *
 * @packageDocumentation
 */
import type { AdapterSource } from "@themvora/adapters";
import { resolveAdapterSource } from "@themvora/adapters";
import { getBuiltInThemes, resolveInitialTheme, type ThemeDefinition, type ThemeIdentifier, type ThemeMode } from "@themvora/core";
import { createMantineCssVariables } from "./theme";

/** A registry plus the selection to resolve, for callers without a runtime. */
export interface MantinePrePaintOptions<T extends ThemeDefinition> {
  themes: readonly T[];
  defaultTheme?: ThemeIdentifier<T>;
  initialMode?: ThemeMode;
}

/**
 * Builds the `:root` rule that defines Mantine's variables before first paint.
 *
 * ```tsx
 * // app/layout.tsx (a server component)
 * import { createMantinePrePaintCss } from "@themvora/mantine/prepaint";
 * import { getBuiltInThemes } from "@themvora/core";
 *
 * const css = createMantinePrePaintCss({ themes: getBuiltInThemes(), defaultTheme: "plum-light" });
 * // <style dangerouslySetInnerHTML={{ __html: css }} />
 * ```
 *
 * @param source A runtime, a store, a resolved theme, or a registry plus the
 * selection to resolve.
 * @returns A CSS string, or an empty string when the source cannot be resolved.
 */
export function createMantinePrePaintCss(
  source: AdapterSource | MantinePrePaintOptions<ThemeDefinition> = {},
): string {
  /**
   * Variables for one resolved theme.
   *
   * `createMantineCssVariables` maps the *active* theme, so its output is only
   * correct for the scheme that theme belongs to. Emitting one theme's values
   * under both scheme selectors is what made dark mode render light text on dark
   * surfaces: the block outranked Mantine's own dark palette while carrying the
   * light palette's `--mantine-color-text`.
   */
  const variablesFor = (theme: ThemeDefinition): Record<string, string> | null => {
    try {
      const resolver = createMantineCssVariables(theme as AdapterSource);
      const resolved = resolver({} as never);
      return { ...resolved.variables, ...resolved.light };
    } catch {
      return null;
    }
  };

  let light: Record<string, string> | null = null;
  let dark: Record<string, string> | null = null;

  try {
    // Three shapes are accepted: a runtime/store (which the adapter resolves
    // itself), a registry, or nothing. "Nothing" must still produce the
    // application's theme — an empty object would resolve to an empty token set
    // and every value would silently fall back to Mantine's stock palette, which
    // is worse than emitting nothing because it looks themed but is not.
    const isSource = "store" in source || "tokens" in source || "get" in source;
    const registry = {
      ...(source as MantinePrePaintOptions<ThemeDefinition>),
      themes:
        (source as MantinePrePaintOptions<ThemeDefinition>).themes ??
        (getBuiltInThemes() as unknown as readonly ThemeDefinition[]),
      defaultTheme:
        (source as MantinePrePaintOptions<ThemeDefinition>).defaultTheme ?? ("plum-light" as never),
    };

    if (isSource) {
      // A runtime carries a single resolved theme; it can only describe its own
      // scheme. The other scheme keeps Mantine's own palette rather than being
      // handed values that do not belong to it.
      const resolvedTheme = resolveAdapterSource(source as AdapterSource);
      const current = variablesFor(resolvedTheme as unknown as ThemeDefinition);
      if (resolvedTheme.mode === "dark") dark = current;
      else light = current;
    } else {
      const initial = resolveInitialTheme(registry);
      const family = initial.selection.family;
      light = variablesFor(
        resolveInitialTheme({ ...registry, family, mode: "light" }).theme,
      );
      dark = variablesFor(resolveInitialTheme({ ...registry, family, mode: "dark" }).theme);
    }
  } catch {
    return "";
  }

  const block = (values: Record<string, string> | null) => {
    if (!values) return "";
    return Object.entries(values)
      .filter(([, value]) => typeof value === "string" && value.length > 0)
      .map(([name, value]) => `  ${name}: ${value};`)
      .join("\n");
  };

  const lightDeclarations = block(light);
  const darkDeclarations = block(dark);

  if (!lightDeclarations && !darkDeclarations) return "";

  // The selector matters as much as the values. Mantine ships its own
  // `[data-mantine-color-scheme="light"]` / `[data-mantine-color-scheme="dark"]`
  // rules in `@mantine/core/styles.css`, and an attribute selector outranks
  // `:root` for every component inside that scope — a `:root`-only block is
  // silently overridden by Mantine's stock white/grey palette. Repeating the
  // same selectors puts the theme's values on the winning side of the cascade.
  //
  // `data-mantine-color-scheme` is written by `MantineProvider` when it mounts,
  // so it does not exist in the server HTML. Keying only off it left the first
  // frames on the `:root` fallback — which is the light palette — while the page
  // background was already dark, so dark text landed on a dark surface for the
  // first ~3 frames. Themvora's own `data-theme-mode` *is* server-rendered, so
  // both are listed and the scheme is correct from the first byte.
  //
  // Order: `:root` baseline, then the system preference, then the explicit
  // attributes so an explicit selection always wins over the media query.
  const rules: string[] = [];
  if (lightDeclarations) {
    rules.push(`:root {\n${lightDeclarations}\n}\n`);
  }
  if (darkDeclarations) {
    rules.push(
      `@media (prefers-color-scheme: dark) {:root:not([data-theme-mode="light"]) {\n${darkDeclarations}\n}}\n`,
    );
    rules.push(
      `html[data-theme-mode="dark"], html[data-mantine-color-scheme="dark"] {\n${darkDeclarations}\n}\n`,
    );
  }
  if (lightDeclarations) {
    rules.push(
      `html[data-theme-mode="light"], html[data-mantine-color-scheme="light"] {\n${lightDeclarations}\n}\n`,
    );
  }

  // Surfaces that variables cannot separate.
  //
  // Mantine resolves the page *and* `Paper`/`Card` from the single
  // `--mantine-color-body`, so a theme with distinct `background` and `card`
  // roles has nowhere to put the difference. The theme's `components.Paper`
  // override fixes this once the provider mounts — but that is runtime
  // CSS-in-JS, so it does not exist in the first frame. This rule is the same
  // mapping expressed as static CSS, which is the only form available before
  // hydration.
  //
  // The class names are Mantine's defaults (`classNamesPrefix` is `mantine`).
  // An app that changes the prefix keeps the runtime override and loses only
  // this first-frame rule.
  const surfacesRule = [
    ".mantine-Paper-root, .mantine-Card-root {",
    "  background-color: var(--theme-color-card, var(--theme-color-background));",
    "  border-color: var(--theme-color-border);",
    "}",
  ].join("\n");

  return `${rules.join("")}${surfacesRule}\n`;
}
