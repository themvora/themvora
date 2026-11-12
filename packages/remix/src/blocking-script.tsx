import React from "react";
import type { ThemeDefinition, ThemeIdentifier, ThemeMode } from "@themvora/core";
import {
  buildBootstrapPlan,
  createPrePaintScrollbarCSS,
  darkModeCSSTemplate,
  resolveSelectionTheme,
  resolveInitialTheme,
  serializeThemeBootstrapScript,
  themeToCSSVariables,
} from "@themvora/core";
import { computeFingerprint } from "./fingerprint";

/**
 * Props for the Remix `ThemeHead` component. Describes the theme registry and
 * the fallback selection used to build the blocking bootstrap script and the
 * dark-mode CSS fallback.
 *
 * @typeParam T - The theme definition type used by the application.
 *
 * @see {@link ThemeProvider}
 */
export interface ThemeHeadProps<T extends ThemeDefinition> {
  /** The theme registry the blocking script resolves against. */
  themes: readonly T[];
  /** Fallback theme name when no selection is persisted. */
  defaultTheme?: ThemeIdentifier<T>;
  /**
   * An explicit theme override, applied by the pre-paint script over any
   * persisted selection. Pass the same value given to {@link ThemeProvider}.
   */
  themeOverride?: import("@themvora/core").ThemeOverride<ThemeIdentifier<T>>;
  /**
   * Fallback mode when no selection is persisted. Defaults to the fallback
   * theme's own mode — whatever `defaultTheme` resolves to.
   *
   * Pass `"system"` to follow `prefers-color-scheme` instead, and give
   * `ThemeProvider` the matching `initialMode` so the script and the runtime
   * resolve the same theme on a first visit. Leaving the two out of step
   * produces a wrong-theme flash: the script paints one theme and the runtime
   * corrects it.
   */
  mode?: ThemeMode;
  /**
   * Hide the native scrollbar from the very first paint, so the Themvora
   * overlay (`ThemeScrollbar`) is the only scrollbar from frame one — no
   * native-bar-then-overlay swap while the bundle hydrates. Defaults to `false`.
   *
   * @remarks
   * Emits the pre-paint hiding CSS. You must **also** render
   * `className="tv-scrollbar"` on your `<html>` element — Remix owns that
   * element, so Themvora cannot add the class for you. Both halves are
   * required: the class scopes the CSS, and rendering it in your layout is what
   * keeps React's virtual DOM in agreement with the server HTML. Adding it from
   * a pre-paint script instead produces a hydration mismatch on `<html>`, and
   * React would then drop the class on any re-render — bringing the native
   * scrollbar back.
   *
   * Applies to every device, because the server cannot detect the pointer type.
   * That matches `@themvora/next`; the `themvora()` Astro integration and the
   * Nuxt module are the integrations that can keep native bars on touch
   * devices, because they can choose between the script and the SSR class.
   */
  scrollbar?: boolean;
}

// The dark-mode fallback stylesheet comes from core, not from a local copy:
// the copy that used to live here did not escape `</`, so a token value
// containing `</style` closed the `<style>` element `ThemeHead` renders it
// into. Core's version is escaped for style-element content.

export function getBlockingScriptContent<T extends ThemeDefinition>(
  themes: readonly T[],
  defaultTheme?: ThemeIdentifier<T>,
  mode?: ThemeMode,
  themeOverride?: import("@themvora/core").ThemeOverride<ThemeIdentifier<T>>,
): string {
  const plan = buildBootstrapPlan(themes, {
    ...(defaultTheme !== undefined ? { defaultTheme } : {}),
    // Leave the mode to the plan's derived default unless the caller chose one.
    // `getDarkModeCSS` below resolves from the same inputs, so the two halves of
    // this `<head>` cannot disagree — and both agree with the client runtime.
    ...(mode !== undefined ? { initialMode: mode } : {}),
    // The pre-paint script applies the override over the cookie selection, so
    // an override passed to the provider is also the first thing painted.
    ...(themeOverride !== undefined ? { themeOverride } : {}),
  });

  return serializeThemeBootstrapScript(
    plan,
    {
      kind: "cookies",
      names: {
        mode: "theme-mode",
        family: "theme-family",
        fingerprint: "theme-fingerprint",
      },
    },
    { fingerprint: computeFingerprint(themes, defaultTheme) },
  );
}

export function getDarkModeCSS<T extends ThemeDefinition>(
  themes: readonly T[],
  defaultTheme?: ThemeIdentifier<T>,
  mode?: ThemeMode,
): string | null {
  // Emitted only when the resolved mode is `"system"` — i.e. when someone
  // explicitly asked to follow `prefers-color-scheme`. A pinned mode (including
  // the derived default from `defaultTheme`) needs no stylesheet, because the
  // blocking script already paints that exact theme before first paint.
  const initial = resolveInitialTheme({
    themes,
    ...(defaultTheme !== undefined ? { defaultTheme } : {}),
    ...(mode !== undefined ? { mode } : {}),
  });

  if (initial.selection.mode !== "system") {
    return null;
  }

  const dark = resolveSelectionTheme({
    themes,
    selection: { family: initial.selection.family, mode: "dark" },
  });

  const darkVariables = themeToCSSVariables(dark.theme);
  return darkModeCSSTemplate(darkVariables);
}

/**
 * Renders the blocking theme bootstrap in the document `<head>`. Emits an
 * inline script that reads the persisted theme cookies and applies the CSS
 * variables plus DOM effects before first paint (zero-flash), plus a
 * `prefers-color-scheme` dark-mode fallback when the selection is `"system"`.
 *
 * @typeParam T - The theme definition type used by the application.
 * @param props - The head props (see {@link ThemeHeadProps}).
 * @returns A fragment containing the blocking `<script>` and optional dark-mode `<style>`.
 *
 * @example
 * ```tsx
 * import { ThemeHead } from "@themvora/remix";
 *
 * export function Layout({ children }) {
 *   return (
 *     // `tv-scrollbar` must be rendered here, not added by a script.
 *     <html className="tv-scrollbar">
 *       <head>
 *         <ThemeHead themes={myThemes} defaultTheme="light" scrollbar />
 *       </head>
 *       <body>{children}</body>
 *     </html>
 *   );
 * }
 * ```
 *
 * @remarks
 * Place this inside the document `<head>` so the script runs before the app
 * stylesheets and the browser paints already themed. Pair with
 * `ThemeProvider` and `getInitialThemeState` for the full SSR-first setup.
 *
 * @see {@link ThemeProvider}
 * @see {@link ThemeHeadProps}
 */
export function ThemeHead<T extends ThemeDefinition>({
  themes,
  defaultTheme,
  mode,
  themeOverride,
  scrollbar,
}: ThemeHeadProps<T>) {
  const scriptContent = getBlockingScriptContent(
    themes,
    defaultTheme,
    mode,
    themeOverride,
  );
  const darkCSS = getDarkModeCSS(themes, defaultTheme, mode);

  return (
    <>
      {/* The runtime provider skips its SPA bootstrap when this id exists, so
          the document keeps exactly one blocking script. */}
      <script
        id="themvora-bootstrap"
        dangerouslySetInnerHTML={{ __html: scriptContent }}
      />
      {scrollbar ? (
        <style
          data-themvora-pre-paint="scrollbar"
          dangerouslySetInnerHTML={{ __html: createPrePaintScrollbarCSS() }}
        />
      ) : null}
      {darkCSS ? (
        <style
          dangerouslySetInnerHTML={{
            __html: darkCSS,
          }}
        />
      ) : null}
    </>
  );
}
