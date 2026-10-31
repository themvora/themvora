import {
  computeFingerprint,
  resolveInitialTheme,
  type InitialThemeResolution,
  type ResolveInitialThemeOptions,
  type ThemeDefinition,
  type ThemeMode,
} from "@themvora/core";

/** Cookie names of the contract shared with the pre-paint bootstrap script. */
const COOKIE_NAMES = {
  mode: "theme-mode",
  family: "theme-family",
  fingerprint: "theme-fingerprint",
} as const;

/**
 * Decode a percent-encoded cookie value, treating malformed input as absent.
 *
 * @param value - The raw cookie text.
 * @returns The decoded value, or `undefined` when it does not decode.
 *
 * @remarks
 * A theme cookie is not trustworthy: cookie tossing lets a sibling subdomain
 * plant `theme-mode=%E0%A4%A` on the parent domain, and `decodeURIComponent`
 * throws `URIError` on it. Unguarded, that throw escaped `getInitialThemeState`
 * and turned every route into a 500 until the visitor cleared their cookies.
 * A value that does not decode is treated as "no saved selection", which is
 * what a malformed cookie means, so the normal fallback applies.
 */
function safeDecode(value: string): string | undefined {
  try {
    return decodeURIComponent(value);
  } catch {
    return undefined;
  }
}

/**
 * Resolves the initial theme state server-side from the request's theme
 * cookies, so the browser paints already themed (zero-flash). Pair with
 * `ThemeProvider` (pass the result as `initial`) and `ThemeHead` in the
 * document `<head>`.
 *
 * @param request - The incoming request.
 * @param options - The theme registry and fallback selection.
 * @returns The resolved initial theme state.
 *
 * @remarks
 * The saved selection is only honoured when the `theme-fingerprint` cookie
 * matches the current registry: a cookie written by an older build — different
 * themes, or a different `defaultTheme` — is ignored. That is the same rule
 * `ThemeHead`'s pre-paint script and `createRemixThemePersistence` apply, and
 * without it the server rendered the stale cookie's theme while the client
 * rejected it, producing a hydration mismatch and a visible flash for returning
 * visitors. A **missing** fingerprint is still accepted, which is the legacy
 * cookie contract every integration shares.
 *
 * @see {@link ThemeProvider}
 * @see {@link ThemeHead}
 */
export async function getInitialThemeState<T extends ThemeDefinition>(
  request: Request,
  options: ResolveInitialThemeOptions<T>,
): Promise<InitialThemeResolution<T>> {
  const cookieHeader = request.headers.get("Cookie") ?? "";

  function getCookie(name: string): string | undefined {
    const match = cookieHeader.match(
      new RegExp(`(?:^|;\\s*)${encodeURIComponent(name)}=([^;]*)`),
    );
    return match?.[1] === undefined ? undefined : safeDecode(match[1]);
  }

  const mode = getCookie(COOKIE_NAMES.mode);
  const family = getCookie(COOKIE_NAMES.family);
  const savedFingerprint = getCookie(COOKIE_NAMES.fingerprint);

  const currentFingerprint = computeFingerprint(options.themes, options.defaultTheme);
  const cookiesAreCurrent =
    !savedFingerprint || savedFingerprint === currentFingerprint;

  return resolveInitialTheme({
    ...options,
    ...(cookiesAreCurrent &&
      mode &&
      (mode === "light" || mode === "dark" || mode === "system") && {
        mode: mode as ThemeMode,
      }),
    ...(cookiesAreCurrent &&
      family && {
        family,
      }),
  });
}
