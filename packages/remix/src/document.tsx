import React, { type CSSProperties, type HTMLAttributes, type ReactNode } from "react";
import {
  resolveInitialTheme,
  type InitialThemeResolution,
  type ScheduledThemeOptions,
  type ThemeDefinition,
  type ThemeIdentifier,
  type ThemeMode,
  type ThemeOverride,
  type ThemeTransitionOptions,
} from "@themvora/core";
import { ThemeHead } from "./blocking-script";
import { ThemeProvider } from "./provider";
import { getThemeShellProps } from "./shell";

/**
 * The one description of a document-level theme installation.
 *
 * Every value here is static: it does not depend on the incoming request, so a
 * module can declare one configuration and use it for the pre-paint script, the
 * server-rendered `<html>` element and the client runtime. The request-specific
 * result is the `initial` state produced by {@link ThemeDocumentHandle.resolveInitial}.
 *
 * @typeParam T - The theme definition type used by the application.
 */
export interface ThemeDocumentConfig<T extends ThemeDefinition> {
  /** The theme registry the selection is resolved against. */
  themes: readonly T[];
  /**
   * Fallback theme when no selection is persisted. Accepts a theme **name** or
   * a **family**; a family resolves to the variant for the mode in effect.
   */
  defaultTheme?: ThemeIdentifier<T>;
  /**
   * Mode used when neither a persisted selection nor `themeOverride` applies.
   *
   * Defaults to the fallback theme's own mode. Pass `"system"` to follow
   * `prefers-color-scheme` instead.
   */
  mode?: ThemeMode;
  /**
   * Alias for {@link ThemeDocumentConfig.mode}, matching the name the Remix
   * provider prop has always used. `mode` wins when both are supplied.
   */
  initialMode?: ThemeMode;
  /**
   * Family used when nothing is persisted and `defaultTheme` names no family.
   * A variant name is normalised to its family.
   */
  family?: ThemeIdentifier<T>;
  /**
   * Alias for {@link ThemeDocumentConfig.family}, matching the name the Remix
   * provider prop has always used. `family` wins when both are supplied.
   */
  initialFamily?: ThemeIdentifier<T>;
  /**
   * Hide the native scrollbar from the very first paint. Adds the
   * `tv-scrollbar` class to `<html>` and emits the pre-paint hiding stylesheet.
   *
   * The application still imports `@themvora/core/scrollbar.css` itself: a CSS
   * import is a bundler concern, not something a component can inject.
   */
  scrollbar?: boolean;
  /**
   * An explicit theme override applied over any persisted selection. The
   * pre-paint script, the shell and the runtime all receive the same value.
   */
  themeOverride?: ThemeOverride<ThemeIdentifier<T>>;
  /**
   * Transition configuration passed to the runtime: `true`, `false`, or
   * `{ enabled, duration, easing, preset, … }`.
   *
   * Same contract as the Remix provider's `transition` prop, so a
   * document-level setup can express animations without falling back to the
   * lower-level `ThemeProvider`.
   */
  transition?: boolean | ThemeTransitionOptions;
  /**
   * The solar schedule passed to the runtime, so light/dark can follow the
   * visitor's sunrise and sunset. The document still resolves and paints the
   * persisted selection; the schedule takes over once the runtime mounts.
   */
  scheduled?: false | ScheduledThemeOptions<T>;
  /** Classes merged onto the `<html>` element alongside the theme's own. */
  className?: string;
  /** Inline styles merged after the theme's CSS variables on `<html>`. */
  style?: CSSProperties;
  /** Classes rendered on `<body>`. */
  bodyClassName?: string;
  /** Inline styles rendered on `<body>`. */
  bodyStyle?: CSSProperties;
}

/** Intrinsic elements React permits inside `<head>`. */
export type ThemeDocumentHeadTag =
  | "base"
  | "link"
  | "meta"
  | "title"
  | "style"
  | "script"
  | "noscript"
  | "template";

/**
 * One element accepted in the document `<head>`.
 *
 * Intrinsic elements are restricted to {@link ThemeDocumentHeadTag}; components
 * such as React Router's `<Meta />` and `<Links />` are allowed because their
 * output is a documented head fragment.
 */
export type ThemeDocumentHeadElement =
  | React.ReactElement<unknown, ThemeDocumentHeadTag>
  | React.ReactElement<unknown, React.JSXElementConstructor<any>>;

/**
 * Framework head content accepted by `<theming.Document head={[…]}>`.
 *
 * `head` is an **array**, not a fragment. React 19 types every JSX expression
 * as `ReactElement<any, any>`, so TypeScript cannot distinguish `<div>` from
 * `<meta>` by element type. The array rejects fragments at the prop boundary;
 * the document then validates the rendered tree and throws a descriptive error
 * for an invalid intrinsic element such as `<div>`.
 */
export type ThemeDocumentHeadContent =
  | ThemeDocumentHeadElement
  | readonly ThemeDocumentHeadContent[]
  | string
  | number
  | boolean
  | null
  | undefined;

const HEAD_TAGS = new Set<ThemeDocumentHeadTag>([
  "base",
  "link",
  "meta",
  "title",
  "style",
  "script",
  "noscript",
  "template",
]);

/**
 * Validate the rendered head tree.
 *
 * React 19's JSX types erase the intrinsic tag — every JSX expression is a
 * `ReactElement<any, any>` — so TypeScript cannot tell `<div>` from `<meta>` at
 * the prop boundary. The array shape rejects fragments; this check catches an
 * invalid element that still reaches the document. Components are allowed and
 * left to their own render, because their output cannot be inspected here.
 */
function assertHeadContent(children: ReactNode, path = "head"): void {
  React.Children.forEach(children, (child, index) => {
    if (!React.isValidElement(child)) return;

    if (child.type === React.Fragment) {
      assertHeadContent(
        (child.props as { children?: ReactNode }).children,
        `${path}[${index}]`,
      );
      return;
    }

    if (typeof child.type === "string" && !HEAD_TAGS.has(child.type as ThemeDocumentHeadTag)) {
      throw new Error(
        `ThemeDocument ${path}: <${child.type}> is not valid inside <head>. ` +
          `Use a head element (${[...HEAD_TAGS].join(", ")}) or a component that renders one.`,
      );
    }
  });
}

/**
 * Extra props for the document element rendered by `<theming.Document>`.
 *
 * The theme-owned attributes (`data-theme*`, the merged `className`, the
 * `style` containing the CSS variables, and `suppressHydrationWarning`) are
 * written after these props, so they cannot be overridden by a caller.
 */
export interface ThemeDocumentHtmlProps
  extends Omit<HTMLAttributes<HTMLHtmlElement>, "lang" | "className" | "style"> {
  /** The document language, rendered as `<html lang="…">`. */
  lang?: string;
  /**
   * Classes merged with the configuration's `className` and, when enabled,
   * `tv-scrollbar`. The combined value is rendered once, so the server and the
   * hydrated client agree on the attribute.
   */
  className?: string;
  /**
   * Inline styles merged after the theme's CSS variables. Use it for layout
   * properties; the resolved `color-scheme` and `--theme-*` variables are owned
   * by the shell.
   */
  style?: CSSProperties;
  /** The document text direction, rendered as `<html dir="…">`. */
  dir?: "ltr" | "rtl" | "auto";
}

/**
 * Extra props for the document body rendered by `<theming.Document>`.
 */
export interface ThemeDocumentBodyProps
  extends Omit<HTMLAttributes<HTMLBodyElement>, "className" | "style"> {
  /** Classes merged with the configuration's `bodyClassName`. */
  className?: string;
  /** Inline styles merged after the configuration's `bodyStyle`. */
  style?: CSSProperties;
}

/**
 * Props for the document component created by
 * {@link createThemeDocument}.
 *
 * @typeParam T - The theme definition type used by the application.
 */
export interface ThemeDocumentProps<T extends ThemeDefinition> {
  /**
   * The request-resolved state from {@link ThemeDocumentHandle.resolveInitial}.
   *
   * Optional on purpose: React Router can render the root `Layout` while the
   * root loader is unavailable (an error response, a hydration fallback). When
   * it is missing or `null`, the document renders the configuration's static
   * fallback instead of throwing a second error inside the boundary.
   */
  initial?: InitialThemeResolution<T> | null;
  /**
   * Framework head content, as an array of head elements.
   *
   * Only head-valid intrinsic elements (`meta`, `link`, `title`, `style`,
   * `script`, `base`, `noscript`, `template`) and components such as React
   * Router's `<Meta />`/`<Links />` are accepted.
   *
   * The array is deliberate: React 19 types every JSX expression as
   * `ReactElement<any, any>`, so invalid children inside `<>…</>` would slip
   * through. The array rejects a fragment at the prop boundary; an invalid
   * intrinsic element that reaches the array is rejected with a clear error
   * when the document renders.
   *
   * @example
   * ```tsx
   * head={[
   *   <meta key="charset" charSet="utf-8" />,
   *   <Meta key="meta" />,
   *   <Links key="links" />,
   * ]}
   * ```
   *
   * @throws If an intrinsic element other than the head tags above reaches the
   * array — directly or through a fragment placed in the array. Components are
   * allowed because their rendered output cannot be inspected at this point.
   */
  head?: readonly ThemeDocumentHeadContent[];
  /** Framework body-end content (for example `<ScrollRestoration />` and `<Scripts />`). */
  afterContent?: ReactNode;
  /**
   * Extra props for `<html>`.
   *
   * Theme-owned attributes win over the same keys here. See
   * {@link ThemeDocumentHtmlProps} for the documented `lang`, `className`,
   * `style` and `dir` behaviour.
   */
  htmlProps?: ThemeDocumentHtmlProps;
  /** Extra props for `<body>`; see {@link ThemeDocumentBodyProps}. */
  bodyProps?: ThemeDocumentBodyProps;
  /** The application tree rendered inside the theme provider. */
  children: ReactNode;
}

/**
 * Props for the provider created by {@link createThemeDocument}.
 *
 * @typeParam T - The theme definition type used by the application.
 */
export interface ThemeDocumentProviderProps<T extends ThemeDefinition> {
  /** The request-resolved state from {@link ThemeDocumentHandle.resolveInitial}. */
  initial?: InitialThemeResolution<T> | null;
  /** The application tree rendered inside the provider. */
  children: ReactNode;
}

/**
 * The object returned by {@link createThemeDocument}.
 *
 * @typeParam T - The theme definition type used by the application.
 */
export interface ThemeDocumentHandle<T extends ThemeDefinition> {
  /** The frozen configuration every part of the integration reads. */
  readonly config: Readonly<ThemeDocumentConfig<T>>;
  /**
   * The static fallback resolution — the answer when no request state is
   * available. Used by `Document` when `initial` is missing or `null`.
   */
  readonly fallback: InitialThemeResolution<T>;
  /**
   * Resolve the request's persisted selection against this configuration.
   *
   * Call it from the root loader. It reads the `theme-mode` / `theme-family` /
   * `theme-fingerprint` cookies, applies the same stale-registry rule as the
   * pre-paint script, and returns the value `Document` and `Provider` accept.
   */
  resolveInitial(request: Request): Promise<InitialThemeResolution<T>>;
  /** The document integration: `<html>`, `<head>`, blocking script, provider. */
  Document(props: ThemeDocumentProps<T>): React.ReactElement;
  /** The runtime provider alone, for a tree that is not the document shell. */
  Provider(props: ThemeDocumentProviderProps<T>): React.ReactElement;
}

function mergeClassName(...values: Array<string | undefined>): string | undefined {
  const merged = values.filter(Boolean).join(" ");
  return merged === "" ? undefined : merged;
}

function mergeStyle(
  ...values: Array<CSSProperties | undefined>
): CSSProperties | undefined {
  let merged: CSSProperties | undefined;
  for (const value of values) {
    if (!value) continue;
    merged = { ...merged, ...value };
  }
  return merged;
}

/**
 * Create a single-source theme configuration for a server-rendered document.
 *
 * The returned `Document` renders the blocking bootstrap in `<head>`, the
 * matching theme attributes and CSS variables on `<html>`, the scrollbar class
 * and pre-paint stylesheet when configured, and the runtime provider around the
 * application tree. `resolveInitial` derives the request-specific state from the
 * same configuration, so the loader, the script, the shell and the provider
 * cannot drift apart.
 *
 * @typeParam T - The theme definition type used by the application.
 * @param config - The registry, fallback selection, static runtime options
 *   (`transition`, `scheduled`, `themeOverride`) and document options.
 * @returns The document handle: `resolveInitial`, `Document`, `Provider`,
 *   `config` and the static `fallback`.
 *
 * @example
 * ```tsx
 * // app/root.tsx — React Router Framework Mode
 * import { createThemeDocument } from "@themvora/remix/react-router";
 * import { getBuiltInThemes } from "@themvora/core";
 * import type { Route } from "./+types/root";
 *
 * const themes = getBuiltInThemes();
 *
 * const theming = createThemeDocument({
 *   themes,
 *   defaultTheme: "light",
 *   mode: "system",
 *   transition: { enabled: true, preset: "smooth" },
 *   scrollbar: true,
 * });
 *
 * export async function loader({ request }: Route.LoaderArgs) {
 *   return { theme: await theming.resolveInitial(request) };
 * }
 *
 * export function Layout({ children }: { children: React.ReactNode }) {
 *   const data = useRouteLoaderData<typeof loader>("root");
 *   return (
 *     <theming.Document
 *       initial={data?.theme}
 *       head={[<Meta key="meta" />, <Links key="links" />]}
 *       afterContent={<><ScrollRestoration /><Scripts /></>}
 *     >
 *       {children}
 *     </theming.Document>
 *   );
 * }
 * ```
 *
 * @remarks
 * The configuration is copied and frozen, so changing the caller's `themes`
 * array later cannot change what an already-created document renders. Request
 * state is never stored on the handle: `resolveInitial` derives it from the
 * `Request` it is given, which keeps concurrent requests isolated.
 *
 * The handler imports the server resolver lazily. The client bundle therefore
 * does not include the cookie parser, while the loader still gets a synchronous
 * configuration it can call.
 *
 * @see {@link ThemeDocumentConfig}
 */
export function createThemeDocument<T extends ThemeDefinition>(
  config: ThemeDocumentConfig<T>,
): ThemeDocumentHandle<T> {
  if (config.themes.length === 0) {
    throw new TypeError("createThemeDocument() requires at least one theme.");
  }

  const themes = Object.freeze([...config.themes]) as readonly T[];
  const frozen = Object.freeze({
    ...config,
    themes,
  }) as Readonly<ThemeDocumentConfig<T>>;

  const {
    defaultTheme,
    mode: requestedMode,
    family: requestedFamily,
    initialMode,
    initialFamily,
    scrollbar,
    themeOverride,
    transition,
    scheduled,
  } = frozen;

  // The provider props were named `initialMode`/`initialFamily`; the document
  // config's canonical names are shorter. Accept both, with the canonical name
  // winning when a caller supplies both.
  const mode = requestedMode ?? initialMode;
  const family = requestedFamily ?? initialFamily;

  const resolveOptions = {
    themes,
    ...(defaultTheme !== undefined ? { defaultTheme } : {}),
    ...(mode !== undefined ? { mode } : {}),
    ...(family !== undefined ? { family } : {}),
  };

  const fallback = resolveInitialTheme<T>(resolveOptions);

  function Provider({
    initial,
    children,
  }: ThemeDocumentProviderProps<T>): React.ReactElement {
    return (
      <ThemeProvider<T>
        initial={initial ?? fallback}
        themes={themes}
        {...(defaultTheme !== undefined ? { defaultTheme } : {})}
        {...(mode !== undefined ? { initialMode: mode } : {})}
        {...(family !== undefined ? { initialFamily: family } : {})}
        {...(themeOverride !== undefined ? { themeOverride } : {})}
        {...(transition !== undefined ? { transition } : {})}
        {...(scheduled !== undefined ? { scheduled } : {})}
      >
        {children}
      </ThemeProvider>
    );
  }

  function Document({
    initial,
    head,
    afterContent,
    htmlProps,
    bodyProps,
    children,
  }: ThemeDocumentProps<T>): React.ReactElement {
    assertHeadContent(head);

    const resolved = initial ?? fallback;
    const className = mergeClassName(frozen.className, htmlProps?.className);
    const style = mergeStyle(frozen.style, htmlProps?.style);
    const bodyClassName = mergeClassName(
      frozen.bodyClassName,
      bodyProps?.className,
    );
    const bodyStyle = mergeStyle(frozen.bodyStyle, bodyProps?.style);

    const shell = getThemeShellProps(resolved, {
      ...(className !== undefined ? { className } : {}),
      ...(style !== undefined ? { style } : {}),
      ...(scrollbar ? { scrollbar } : {}),
    });

    return (
      <html {...htmlProps} {...shell}>
        <head>
          {/* First, so the blocking script runs before any stylesheet-driven paint. */}
          <ThemeHead
            themes={themes}
            {...(defaultTheme !== undefined ? { defaultTheme } : {})}
            {...(mode !== undefined ? { mode } : {})}
            {...(themeOverride !== undefined ? { themeOverride } : {})}
            {...(scrollbar ? { scrollbar } : {})}
          />
          {head}
        </head>
        <body
          {...bodyProps}
          {...(bodyClassName !== undefined ? { className: bodyClassName } : {})}
          {...(bodyStyle !== undefined ? { style: bodyStyle } : {})}
        >
          <Provider initial={resolved}>{children}</Provider>
          {afterContent}
        </body>
      </html>
    );
  }

  return {
    config: frozen,
    fallback,
    resolveInitial(request) {
      return import("./server").then(({ getInitialThemeState }) =>
        getInitialThemeState<T>(request, resolveOptions),
      );
    },
    Document,
    Provider,
  };
}
