import type { CSSProperties } from "react";
import {
  themeToCSSVariables,
  type InitialThemeResolution,
  type ThemeDefinition,
  type ThemeMode,
} from "@themvora/core";

/**
 * Extra props merged onto the shell attributes computed by
 * {@link getThemeShellProps}.
 *
 * @typeParam T - The theme definition type used by the application.
 */
export interface ThemeShellOptions {
  /**
   * Classes rendered on `<html>` alongside the theme's own.
   *
   * Kept stable across renders: the overlay scrollbar engine adds
   * `tv-scrollbar-ready` to the same attribute, and React rewrites `class`
   * wholesale whenever the prop it was given changes — which would take the
   * engine's marker with it and leave the overlay permanently faded out.
   */
  className?: string;
  /**
   * Render the `tv-scrollbar` class, so the pre-paint stylesheet hides the
   * native bar from the first frame.
   *
   * Pair it with `scrollbar` on {@link ThemeHead}: the class scopes the CSS and
   * the CSS does the hiding, so either half alone does nothing. This is the
   * Remix-side equivalent of `@themvora/next`'s `scrollbar` prop — Remix owns
   * the document, so the class has to come from the layout.
   */
  scrollbar?: boolean;
  /** Inline styles merged after the theme's CSS variables. */
  style?: CSSProperties;
}

/**
 * The `<html>` props produced by {@link getThemeShellProps}: the theme
 * attributes and CSS variables the pre-paint script writes, plus the
 * hydration suppression that covers the parts of them the server cannot know.
 *
 * @remarks
 * Assignable to a React `<html>` element by construction — spread it and add
 * the app's own props (`lang`, a `className`) around it.
 */
export interface ThemeShellProps {
  /** The resolved theme's name, as `data-theme`. */
  "data-theme": string;
  /** The resolved mode (`light` / `dark`) the theme was painted with. */
  "data-theme-mode": "light" | "dark";
  /** The resolved theme's family, when it declares one. */
  "data-theme-family"?: string;
  /** The visitor's chosen mode, which `"system"` is not reduced from. */
  "data-theme-selection-mode": ThemeMode;
  /** The visitor's chosen family, when one was resolved. */
  "data-theme-selection-family"?: string;
  /** Completion marker: the bootstrap ran, so the document is themed. */
  "data-theme-ready": "true";
  /** `color-scheme` plus the resolved theme's `--theme-*` variables. */
  style: CSSProperties;
  /** Extra classes, plus `tv-scrollbar` when `scrollbar` was requested. */
  className?: string;
  /** Suppresses React's attribute diff for this element only. Always `true`. */
  suppressHydrationWarning: true;
}

/**
 * The `<html>` attributes the pre-paint bootstrap script writes, as React
 * props. Spread them onto the document element rendered by `app/root.tsx`.
 *
 * @typeParam T - The theme definition type used by the application.
 *
 * @remarks
 * Every value here is a *snapshot* of the server's resolution, and it exists
 * for one reason: **hydration parity**. The blocking script in `<ThemeHead>`
 * rewrites all of it before first paint, so React's virtual DOM has to start
 * out agreeing with the DOM, or React reports a hydration mismatch on `<html>`
 * and — because it never patches attributes up — keeps a virtual DOM that
 * disagrees with the document for the rest of the session.
 *
 * That is not hypothetical. A Remix app that renders a bare `<html lang="en">`
 * hydrates against seven attributes it never rendered (`data-theme`,
 * `data-theme-mode`, `data-theme-family`, `data-theme-selection-mode`,
 * `data-theme-selection-family`, `data-theme-ready` and `style`), and React
 * logs "some attributes of the server rendered HTML didn't match the client
 * properties" on every load. Rendering the snapshot removes six of the seven;
 * `suppressHydrationWarning` covers the last one, which cannot be removed by
 * construction: `data-theme-mode` is the *resolved* mode, so a `"system"`
 * selection resolved against a dark `prefers-color-scheme` legitimately differs
 * from the server's `"light"`. The same goes for the `dark` class the script
 * toggles, which is deliberately not rendered here — the script owns it.
 *
 * The suppression is scoped to the `<html>` element and its own attributes. It
 * does not hide mismatches in the application tree, so a genuine hydration bug
 * in a route still reports.
 *
 * @example
 * ```tsx
 * import { getBuiltInThemes } from "@themvora/core";
 * import { ThemeHead, getThemeShellProps } from "@themvora/remix";
 *
 * const themes = getBuiltInThemes();
 *
 * export function Layout({ children }: { children: ReactNode }) {
 *   const { initial } = useLoaderData<typeof loader>();
 *   return (
 *     <html lang="en" {...getThemeShellProps(initial, { scrollbar: true })}>
 *       <head>
 *         <ThemeHead themes={themes} defaultTheme="light" scrollbar />
 *       </head>
 *       <body>{children}</body>
 *     </html>
 *   );
 * }
 * ```
 *
 * @param initial - The SSR-resolved initial state from `getInitialThemeState`.
 * @param options - Extra classes, the scrollbar opt-in, and extra inline styles.
 * @returns The `<html>` props: the theme attributes, the CSS variables, and the
 *   hydration suppression.
 *
 * @see {@link ThemeHead}
 * @see `getInitialThemeState`
 */
export function getThemeShellProps<T extends ThemeDefinition>(
  initial: InitialThemeResolution<T>,
  options: ThemeShellOptions = {},
): ThemeShellProps {
  // The family of the *resolved* theme — the value the script writes to
  // `data-theme-family`, recomputed in the browser from the plan's `names` map.
  const resolvedFamily = initial.theme.meta?.family;

  // What the script writes to `data-theme-selection-family`: the selection's
  // own family, falling back to the resolved one. The two differ whenever a
  // variant name was selected, and the selection is what the readouts report.
  const selectionFamily = initial.selection.family ?? resolvedFamily;

  // The script's `eff`: `mode === "dark" || (mode === "system" && sysDark)`.
  // The server cannot evaluate `prefers-color-scheme`, and
  // `getInitialThemeState` resolves `"system"` with `prefersDark: false`, so
  // this is the same answer the server gave — and the one the script gives for
  // a light-preferring visitor.
  const mode: "light" | "dark" =
    initial.selection.mode === "dark" ? "dark" : "light";

  const className = [options.className, options.scrollbar ? "tv-scrollbar" : ""]
    .filter(Boolean)
    .join(" ");

  return {
    "data-theme": initial.theme.name,
    "data-theme-mode": mode,
    ...(resolvedFamily ? { "data-theme-family": String(resolvedFamily) } : {}),
    "data-theme-selection-mode": initial.selection.mode,
    ...(selectionFamily
      ? { "data-theme-selection-family": String(selectionFamily) }
      : {}),
    "data-theme-ready": "true",
    // `color-scheme` first so the browser paints form controls and the canvas
    // backdrop in the right scheme before the stylesheet is parsed, then the
    // theme's variables. `CSSProperties` does not describe custom properties,
    // hence the cast — the same shape `@themvora/next` renders on its shell.
    style: {
      colorScheme: mode,
      ...themeToCSSVariables(initial.theme),
      ...options.style,
    } as CSSProperties,
    ...(className ? { className } : {}),
    // See the `@remarks` above: the resolved mode and the `dark` class are
    // legitimately unreachable from the server.
    suppressHydrationWarning: true,
  };
}
