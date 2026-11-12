/**
 * Pre-paint CSS for Bootstrap's variable layer.
 *
 * @remarks
 * The adapter writes `--bs-*` into a `<style>` element when the runtime
 * installs. That is late: until it runs, Bootstrap's own `:root` defaults are
 * what the browser paints, so a reload shows Bootstrap's stock white cards and
 * `#6c757d` buttons for as long as the bundle takes.
 *
 * The component surfaces are already static — `bootstrap.css` re-declares them
 * on the component, where Bootstrap declares them — but the brand roles
 * (`--bs-primary`, `--bs-secondary`, `--bs-body-bg`, …) are produced by
 * `createBootstrapVariables`, which only exists at runtime.
 *
 * This module emits exactly those variables as CSS, one block per theme, so a
 * server-rendered document can inline them and paint correctly before any script
 * runs. It is a plain function with no DOM access.
 *
 * @packageDocumentation
 */
import { getBuiltInThemes, resolveInitialTheme, type ThemeDefinition, type ThemeIdentifier } from "@themvora/core";
import { createBootstrapVariables } from "./generator";

/** Options for {@link createBootstrapPrePaintCss}. */
export interface BootstrapPrePaintOptions<T extends ThemeDefinition> {
  /** The theme registry. Defaults to the built-in themes. */
  themes?: readonly T[];
  /** Theme whose block is emitted as the bare `:root` rule. */
  defaultTheme?: ThemeIdentifier<T>;
}

function block(selector: string, variables: Record<string, string>): string {
  const declarations = Object.entries(variables)
    .filter(([, value]) => typeof value === "string" && value.length > 0)
    .map(([name, value]) => `  ${name}: ${value};`)
    .join("\n");
  return declarations ? `${selector} {\n${declarations}\n}\n` : "";
}

/**
 * Builds the stylesheet that defines Bootstrap's variables before first paint.
 *
 * ```tsx
 * // a server component
 * import { createBootstrapPrePaintCss } from "@themvora/bootstrap/prepaint";
 * const css = createBootstrapPrePaintCss();
 * // <style dangerouslySetInnerHTML={{ __html: css }} />
 * ```
 *
 * @param options Registry and the theme to emit as `:root`.
 * @returns CSS text, or an empty string when nothing could be generated.
 */
export function createBootstrapPrePaintCss<T extends ThemeDefinition>(
  options: BootstrapPrePaintOptions<T> = {},
): string {
  const themes = (options.themes ?? (getBuiltInThemes() as unknown as readonly T[])) as readonly T[];
  if (!themes.length) return "";

  const defaultTheme =
    options.defaultTheme ??
    (resolveInitialTheme({ themes }).theme.name as ThemeIdentifier<T>);

  const parts: string[] = [];

  for (const theme of themes) {
    if (!theme.tokens) continue;
    const variables = createBootstrapVariables(theme.tokens);
    // The document carries `data-theme="<name>"`; matching that attribute keeps
    // every family's block available without JavaScript.
    const selector =
      theme.name === defaultTheme
        ? `:root, :root[data-theme="${theme.name}"]`
        : `:root[data-theme="${theme.name}"]`;
    parts.push(block(selector, variables));
  }

  return parts.join("");
}
