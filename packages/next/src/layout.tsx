import React, {
  Suspense,
  type CSSProperties,
  type HTMLAttributes,
  type ReactNode,
} from "react";

import {
  buildBootstrapPlan,
  createPrePaintScrollbarCSS,
  createThemePrePaintCss,
  darkModeCSSTemplate,
  getBuiltInThemes,
  resolveInitialTheme,
  resolveSelectedTheme,
  resolveSelectionTheme,
  resolveThemeOverride,
  type ThemeOverride,
  serializeThemeBootstrapScript,
  themeToCSSVariables,
  type InitialThemeResolution,
  type PrePaintScrollbarOptions,
  type ThemeDefinition,
  type ThemeIdentifier,
  type ThemeMode,
} from "@themvora/core";

import { computeFingerprint } from "./fingerprint";
import { ClientThemeProvider } from "@themvora/next/client";

/**
 * Every attribute a plain `<html>` element accepts, You can pass straight
 * through to `ThemeProvider`. `className` and `style` are merged with the
 * theme's SSR output rather than replaced.
 *
 * @see {@link ThemeProvider}
 */
export interface ThemeProviderHtmlProps extends Omit<
  HTMLAttributes<HTMLHtmlElement>,
  "children" | "lang" | "className" | "style"
> {
  /** Extra classes merged onto the `<html>` element alongside the theme output. */
  className?: string;
  /** Inline styles merged onto the `<html>` element alongside the theme output. */
  style?: CSSProperties;
}

/**
 * Attributes forwarded to the rendered `<body>` element. `className` and
 * `style` are merged with the theme's SSR output (the resolved font family is
 * applied to the body) rather than replaced.
 *
 * @see {@link ThemeProvider}
 */
export interface ThemeProviderBodyProps extends Omit<
  HTMLAttributes<HTMLBodyElement>,
  "children" | "className" | "style"
> {
  /** Extra classes merged onto the `<body>` element alongside the theme output. */
  className?: string;
  /** Inline styles merged onto the `<body>` element alongside the theme output. */
  style?: CSSProperties;
}

/**
 * Props for the App Router `ThemeProvider`. Renders the `<html>` and `<body>`
 * elements, applies the theme, and mounts the client runtime inside the body.
 *
 * @typeParam T - The theme definition type used by the application.
 *
 * @example
 * ```tsx
 * import { ThemeProvider } from "@themvora/next";
 *
 * export default function RootLayout({ children }) {
 *   return (
 *     <ThemeProvider defaultTheme="light" font="Inter, sans-serif">
 *       {children}
 *     </ThemeProvider>
 *   );
 * }
 * ```
 *
 * @remarks
 * **The document shell is static; the persisted selection resolves behind a
 * Suspense boundary.** `ThemeProvider` renders `<html>`/`<head>`/`<body>` from
 * the configured `themes`/`defaultTheme` alone — it never awaits request data —
 * so a route that hosts it stays prerenderable under Next's Cache Components
 * with no route-segment opt-out (in particular **no `export const instant =
 * false`**). The persisted, cookie-backed selection is resolved two ways that
 * agree with each other:
 *
 *  - the blocking bootstrap script in `<head>` reads the same cookies in the
 *    browser and writes the selection onto `<html>` before the first frame, so
 *    the static default never flashes; and
 *  - a nested server component under `<Suspense>` reads `cookies()` and hands
 *    the resolved selection to the client runtime, so the hydrated provider and
 *    the server-rendered subtree both carry the visitor's theme.
 *
 * `data-theme-selection-mode`/`-family` are declared on the shell too: the
 * script rewrites them, so React's hydration diff is suppressed on the document
 * element — the narrowest scope that covers attributes the script owns.
 *
 * @see `createThemeRuntime`
 * @see {@link ThemeProvider}
 * @see {@link ThemeProviderBodyProps}
 */
export interface ThemeProviderProps<
  T extends ThemeDefinition,
> extends ThemeProviderHtmlProps {
  /** The application content rendered inside the `<body>` element. */
  children: ReactNode;
  /** Collection of themes to be specified for the application. */
  themes?: readonly T[];
  /** The lang attribute name the language of the element's content. */
  lang?: string;
  /** Theme to be applied as default.
   * Accepts a supplied theme **name** (`"cocoa-light"`) or a **family**
   * (`"cocoa"`). A family resolves to the variant for the mode in effect, so it
   * stays light/dark-aware instead of pinning one definition.
   */
  defaultTheme?: ThemeIdentifier<T>;
  /** Font family applied to the body element (e.g. "Inter, sans-serif"). */
  font?: string;
  /**
   * An explicit theme override applied over any persisted cookie selection.
   *
   * Resolved on the server as well as in the browser, so the SSR shell, the
   * blocking bootstrap and the hydrated runtime all paint the overridden theme —
   * no correction frame. It is applied once per value and never written to the
   * theme cookies.
   *
   * @see `ThemeRuntimeOptions.themeOverride`
   */
  themeOverride?: import("@themvora/core").ThemeOverride<ThemeIdentifier<T>>;
  /** Attributes forwarded to the rendered `<body>` element. */
  body?: ThemeProviderBodyProps;
  /** CSS transition options for theme changes. */
  transition?: boolean | import("@themvora/core").ThemeTransitionOptions;
  /**
   * Sunrise/sunset scheduling. Passed to the client runtime; the server
   * resolves the initial theme (zero-flash) and the client schedule controls
   * activation. Exposed reactively via `useThemeSchedule()`.
   */
  scheduled?: false | import("@themvora/core").ScheduledThemeOptions<T>;
  /**
   * Opt into a custom document scrollbar that exists from the very first
   * paint — no native-scrollbar flash, no gap while the bundle hydrates.
   *
   * `true` builds the pre-paint overlay with defaults; pass
   * `PrePaintScrollbarOptions` to customize it. The server emits the overlay
   * `tv-scrollbar` class on `<html>` plus a blocking `<style>` (via
   * `createPrePaintScrollbarCSS`) so the native scrollbar is hidden from the
   * very first paint — no flash and no hydration mismatch. When your
   * `<ThemeScrollbar>` / `createOverlayScrollbar` hydrates, the engine creates
   * the custom strips and takes over. Import
   * `@themvora/core/scrollbar.css` for the pre-paint styles.
   */
  scrollbar?: boolean | PrePaintScrollbarOptions;
  /**
   * Extra CSS rendered into `<head>` before the blocking bootstrap script.
   *
   * @remarks
   * Some library adapters cannot express their theme through `--theme-*` alone:
   * Bootstrap writes `--bs-*`, Mantine writes `--mantine-*`. Those adapters
   * expose a `…/prepaint` builder that returns the same variables as a
   * stylesheet. Passing it here puts them in the server-rendered document, so
   * the first frame is already styled instead of waiting for the adapter's
   * runtime write.
   *
   * The value is a string, not a component, so this package stays unaware of
   * which library is in use.
   */
  prePaintCss?: string;
}

// The dark-mode fallback stylesheet is core's `darkModeCSSTemplate`, not a
// local copy. The copy that used to live here was byte-identical apart from one
// thing: it did not escape `</`, so a token value containing `</style` closed
// the `<style>` element it is rendered into. Core's version is escaped for
// style-element content, and using it keeps the two definitions from drifting.

/**
 * Resolve the shell's theme from the configured default only.
 *
 * Deliberately request-independent: it reads no cookies, so it is safe to run
 * while the route is prerendered. The persisted selection is applied by the
 * blocking bootstrap (pre-paint) and by {@link ResolvedThemeProvider}.
 */
function resolveShellInitial<T extends ThemeDefinition>(
  themes: readonly T[],
  defaultTheme: ThemeIdentifier<T> | undefined,
  themeOverride: ThemeOverride<ThemeIdentifier<T>> | undefined,
): InitialThemeResolution<T> {
  const base = resolveInitialTheme({
    themes,
    ...(defaultTheme !== undefined ? { defaultTheme } : {}),
  });

  // The shell is what the server paints, so the override has to be part of it —
  // otherwise the first frame is the default theme and hydration corrects it.
  const override = resolveThemeOverride(themes, themeOverride, base.selection);
  if (!override) return base;

  return {
    selection: override,
    theme: resolveSelectedTheme(themes, {
      ...override,
      mode: override.mode === "system" ? "light" : override.mode,
    }),
  };
}

/**
 * The request-dependent half of the provider, rendered beneath `<Suspense>`.
 *
 * Reads the persisted selection from the theme cookies, then hands it to the
 * client runtime as `initial` so hydration and the first hydrated render agree
 * with both the SSR subtree and the pre-paint bootstrap.
 */
async function ResolvedThemeProvider<T extends ThemeDefinition>({
  themes,
  defaultTheme,
  themeOverride,
  transition,
  scheduled,
  children,
}: {
  themes: readonly T[];
  defaultTheme?: ThemeIdentifier<T>;
  themeOverride?: ThemeOverride<ThemeIdentifier<T>>;
  transition?: boolean | import("@themvora/core").ThemeTransitionOptions;
  scheduled?: false | import("@themvora/core").ScheduledThemeOptions<T>;
  children: ReactNode;
}) {
  const currentFingerprint = computeFingerprint(themes, defaultTheme);

  // The persisted selection, resolved here — beneath `<Suspense>`, so the
  // request-dependent read never makes the hosting route blocking. A missing
  // fingerprint is accepted for the legacy cookie contract; a present but stale
  // fingerprint invalidates the saved selection after the registry changes.
  // These are exactly the rules the blocking bootstrap applies in the browser,
  // so the server-rendered subtree and the pre-paint script cannot disagree.
  let mode: ThemeMode | undefined;
  let family: string | undefined;

  try {
    const { cookies } = await import("next/headers");
    const cookieStore = await cookies();
    const savedFingerprint = cookieStore.get("theme-fingerprint")?.value;

    if (
      savedFingerprint === undefined ||
      savedFingerprint === currentFingerprint
    ) {
      const modeCookie = cookieStore.get("theme-mode")?.value;
      const familyCookie = cookieStore.get("theme-family")?.value;

      if (
        modeCookie === "light" ||
        modeCookie === "dark" ||
        modeCookie === "system"
      ) {
        mode = modeCookie;
      }
      if (familyCookie) family = familyCookie;
    }
  } catch {
    // `cookies()` is unavailable outside a Next request (e.g. a unit test).
  }

  const baseInitial = resolveInitialTheme({
    themes,
    ...(defaultTheme !== undefined ? { defaultTheme } : {}),
    ...(family !== undefined ? { family } : {}),
    ...(mode !== undefined ? { mode } : {}),
  });

  // The override is applied here too, so the `initial` the client hydrates
  // against is the same selection the shell painted. Resolving it only in the
  // browser would make hydration disagree with the server HTML.
  const override = resolveThemeOverride(themes, themeOverride, baseInitial.selection);
  const initial: InitialThemeResolution<T> = override
    ? {
        selection: override,
        theme: resolveSelectedTheme(themes, {
          ...override,
          mode: override.mode === "system" ? "light" : override.mode,
        }),
      }
    : baseInitial;

  return (
    <ClientThemeProvider
      themes={themes}
      initial={initial}
      {...(defaultTheme !== undefined ? { defaultTheme } : {})}
      {...(themeOverride !== undefined ? { themeOverride } : {})}
      {...(transition !== undefined ? { transition } : {})}
      {...(scheduled !== undefined ? { scheduled } : {})}
    >
      {children}
    </ClientThemeProvider>
  );
}

/**
 * App Router theme provider. Must be used in the root layout: it renders the
 * `<html>` and `<body>` elements, resolves the persisted selection, emits
 * matching SSR CSS variables and a blocking bootstrap script, and mounts the
 * client runtime inside the body.
 *
 * @typeParam T - The theme definition type used by the application.
 * @param props - The provider props (see {@link ThemeProviderProps}).
 * @returns The themed `<html>`/`<body>` tree wrapping the application content.
 *
 * @example
 * ```tsx
 * import { ThemeProvider } from "@themvora/next";
 *
 * export default function RootLayout({ children }) {
 *   return (
 *     <ThemeProvider defaultTheme="light" scrollbar>
 *       {children}
 *     </ThemeProvider>
 *   );
 * }
 * ```
 *
 * @remarks
 * Because this component renders the document shell, it must be the root of
 * the App Router layout tree. `body` props are forwarded to the `<body>`
 * element; `className`/`style` are merged with the theme's SSR output.
 *
 * The component itself is **synchronous**: the document shell is deterministic
 * and request-independent. The persisted theme is resolved in a nested server
 * component under `<Suspense>` (see {@link ResolvedThemeProvider}) and applied
 * pre-paint by the blocking bootstrap, so the shell is never blocking under
 * Next's Cache Components.
 *
 * @see {@link ThemeProviderProps}
 * @see {@link ThemeProviderBodyProps}
 * @see {@link ThemeProviderHtmlProps}
 * @see `useThemeRuntime`
 */
export function ThemeProvider<T extends ThemeDefinition>({
  children,
  themes,
  lang = "en",
  defaultTheme,
  className,
  style,
  font,
  themeOverride,
  body,
  transition,
  scheduled,
  scrollbar,
  prePaintCss: adapterPrePaintCss,
  ...htmlProps
}: ThemeProviderProps<T>) {
  const resolvedThemes = themes?.length
    ? themes
    : (getBuiltInThemes() as unknown as readonly T[]);

  const currentFingerprint = computeFingerprint(resolvedThemes, defaultTheme);

  const shellInitial = resolveShellInitial(resolvedThemes, defaultTheme, themeOverride);

  const cssVars = themeToCSSVariables(shellInitial.theme);
  const themeMode = shellInitial.selection.mode === "dark" ? "dark" : "light";
  const ssrStyle = { colorScheme: themeMode, ...cssVars } as CSSProperties;

  // The family of the *resolved* theme — the same value the DOM adapter writes
  // to `data-theme-family` and the same one the blocking script recomputes in
  // the browser.
  const resolvedFamily = shellInitial.theme.meta?.family;

  // What the script writes to `data-theme-selection-family`: the selection's
  // family, falling back to the resolved one.
  const selectionFamily = shellInitial.selection.family ?? resolvedFamily;

  let darkStyle: ReactNode = null;
  if (shellInitial.selection.mode === "system") {
    const dark = resolveSelectionTheme({
      themes: resolvedThemes,
      selection: { family: shellInitial.selection.family, mode: "dark" },
    });
    const darkVariables = themeToCSSVariables(dark.theme);
    darkStyle = (
      <style
        dangerouslySetInnerHTML={{
          __html: darkModeCSSTemplate(darkVariables),
        }}
      />
    );
  }

  // The pre-paint stylesheet, not just the script.
  //
  // The blocking bootstrap writes `--theme-*` as an inline `style` on `<html>`.
  // That is enough for the *first* paint, but not for the one after hydration:
  // this layout renders `<html style={…}>`, so when React hydrates it reconciles
  // that attribute and drops the properties the script added. The variables then
  // disappear until the provider writes them again — a few frames in which every
  // library falls back to its own colours (Bootstrap's white cards, Mantine's
  // grey, shadcn's defaults). A stylesheet keeps the values present through that
  // window, because hydration cannot remove a rule.
  const prePaintCss = createThemePrePaintCss({
    themes: resolvedThemes,
    ...(defaultTheme !== undefined ? { defaultTheme } : {}),
    initialMode: themeMode,
  });

  // The blocking bootstrap is the shell's pre-paint resolution. It reads the
  // persisted cookies in the browser and writes the resolved theme onto
  // `<html>` before anything paints, so the request-independent shell never
  // flashes the default. Its fallback is the shell's own default selection.
  const bootstrapPlan = buildBootstrapPlan(resolvedThemes, {
    ...(defaultTheme !== undefined ? { defaultTheme } : {}),
    ...(themeOverride !== undefined ? { themeOverride } : {}),
  });

  const blockingScript = serializeThemeBootstrapScript(
    bootstrapPlan,
    {
      kind: "cookies",
      names: {
        mode: "theme-mode",
        family: "theme-family",
        fingerprint: "theme-fingerprint",
      },
    },
    { fingerprint: currentFingerprint },
  );

  const {
    className: bodyClassName,
    style: bodyStyle,
    ...bodyProps
  } = body ?? {};

  const bodyFontStyle: CSSProperties = font ? { fontFamily: font } : {};

  return (
    <html
      {...htmlProps}
      lang={lang}
      // The blocking bootstrap writes the persisted selection onto the document
      // before hydration, so `<html>`'s theme attributes/classes can legitimately
      // differ from the static shell. Suppression is scoped to this element —
      // the one the script owns — never to the application subtree.
      suppressHydrationWarning
      data-theme={String(shellInitial.theme.name)}
      data-theme-mode={themeMode}
      data-theme-family={resolvedFamily ? String(resolvedFamily) : undefined}
      // `data-theme-mode` above is the *resolved* mode; the selection is the
      // visitor's actual choice, which the resolved mode cannot recover. The
      // script rewrites both from the cookie.
      data-theme-selection-mode={String(shellInitial.selection.mode)}
      data-theme-selection-family={
        selectionFamily ? String(selectionFamily) : undefined
      }
      data-theme-ready="true"
      className={[
        className,
        themeMode === "dark" ? "dark" : "",
        scrollbar ? "tv-scrollbar" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      style={{ ...style, ...ssrStyle }}
    >
      <head>
        <style data-themvora-pre-paint="css" dangerouslySetInnerHTML={{ __html: prePaintCss }} />
        {adapterPrePaintCss ? (
          <style data-themvora-pre-paint="adapter" dangerouslySetInnerHTML={{ __html: adapterPrePaintCss }} />
        ) : null}
        <script dangerouslySetInnerHTML={{ __html: blockingScript }} />
        {scrollbar && (
          <style
            data-themvora-pre-paint="scrollbar"
            dangerouslySetInnerHTML={{ __html: createPrePaintScrollbarCSS() }}
          />
        )}
        {darkStyle}
      </head>
      <body
        className={bodyClassName}
        style={{ ...bodyStyle, ...bodyFontStyle }}
        {...bodyProps}
      >
        {/* `ResolvedThemeProvider` awaits `cookies()`, which is request data.
            Without this boundary that read is part of the shell itself, so the
            hosting route cannot prerender and Next reports it as blocking. Under
            the boundary the read streams into the already-painted shell, which
            is the whole point of the document being request-independent. */}
        <Suspense fallback={<ThemeShellFallback />}>
          <ResolvedThemeProvider
            themes={resolvedThemes}
            {...(defaultTheme !== undefined ? { defaultTheme } : {})}
            {...(themeOverride !== undefined ? { themeOverride } : {})}
            {...(transition !== undefined ? { transition } : {})}
            {...(scheduled !== undefined ? { scheduled } : {})}
          >
            {children}
          </ResolvedThemeProvider>
        </Suspense>
      </body>
    </html>
  );
}

/**
 * The Suspense fallback: a valid, themed static shell.
 *
 * It carries no application content of its own — the persisted selection has
 * not been read yet, and rendering the tree here would duplicate it once the
 * resolved subtree streams in. The document shell around it already paints the
 * configured theme (the CSS variables live on `<html>`, and the blocking
 * bootstrap has applied the persisted selection pre-paint), so this is only the
 * painted surface the first byte shows.
 */
function ThemeShellFallback() {
  return <div className="tv-theme-shell" aria-hidden="true" />;
}
