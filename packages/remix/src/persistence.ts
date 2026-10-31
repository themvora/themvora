import type {
  ThemeDefinition,
  ThemeSelectionPersistenceAdapter,
  ThemeSelectionState,
} from "@themvora/core";
import { computeFingerprint } from "./fingerprint";

/**
 * Options for {@link createRemixThemePersistence}. Configures the storage key,
 * the backing `Storage` object, and the cookie attributes used when mirroring
 * the selection to cookies.
 *
 * @see {@link createRemixThemePersistence}
 */
export interface RemixThemePersistenceOptions {
  /** The `localStorage` key holding the persisted selection. Default `"theme-selection"`. */
  key?: string;
  /** The backing storage. Defaults to `window.localStorage`. */
  storage?: Storage;
  /**
   * Cookie attribute string appended to the mirrored theme cookies (e.g.
   * `"path=/; max-age=31536000; samesite=lax"`). Defaults to
   * `"path=/; max-age=31536000; samesite=lax"`, plus `secure` on an HTTPS
   * origin.
   */
  cookieOptions?: string;
}

function parseState(value: string | null): ThemeSelectionState | null {
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(value) as Partial<ThemeSelectionState>;

    if (
      (parsed.mode === "light" ||
        parsed.mode === "dark" ||
        parsed.mode === "system") &&
      typeof parsed.family === "string"
    ) {
      return {
        mode: parsed.mode,
        family: parsed.family,
      };
    }
  } catch {
    return null;
  }

  return null;
}

/** Cookie names of the contract shared with the pre-paint bootstrap script. */
const COOKIE_NAMES = {
  mode: "theme-mode",
  family: "theme-family",
  fingerprint: "theme-fingerprint",
} as const;

/**
 * Decode a percent-encoded cookie value, treating malformed input as absent.
 *
 * @remarks
 * Nothing guarantees a theme cookie still decodes: a sibling subdomain can
 * plant `theme-mode=%E0%A4%A` on the parent domain, and `decodeURIComponent`
 * throws `URIError` on it. Unguarded, that throw escaped from `get()` — which
 * the runtime calls during creation — and took the page with it.
 */
function safeDecode(value: string): string | null {
  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
}

function readCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(^|; )${name}=([^;]+)`));
  const raw = match?.[2];
  return raw === undefined ? null : safeDecode(raw);
}

/**
 * Obtain the backing `Storage`, or `null` when the browser will not give one up.
 *
 * @remarks
 * The **getter itself** throws `SecurityError` when storage is denied, so
 * guarding the method calls alone is not enough.
 */
function resolveStorage(candidate: Storage | undefined): Storage | null {
  if (candidate) return candidate;
  try {
    return window.localStorage ?? null;
  } catch {
    return null;
  }
}

function readKey(storage: Storage | null, key: string): string | null {
  if (!storage) return null;
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

function writeKey(storage: Storage | null, key: string, value: string): void {
  if (!storage) return;
  try {
    storage.setItem(key, value);
  } catch {
    // Quota exceeded, or a store revoked after it was obtained. The cookie
    // mirror below still runs.
  }
}

function removeKey(storage: Storage | null, key: string): void {
  if (!storage) return;
  try {
    storage.removeItem(key);
  } catch {
    // Same as `writeKey`: the cookies are cleared regardless.
  }
}

/**
 * `Secure` is added only on an HTTPS origin, so an `http://localhost` build can
 * still write the cookie it needs for server-side persistence.
 */
function withSecure(attributes: string): string {
  if (/(^|;\s*)secure(\s*;|$)/i.test(attributes)) return attributes;
  try {
    return typeof location !== "undefined" && location.protocol === "https:"
      ? `${attributes}; secure`
      : attributes;
  } catch {
    return attributes;
  }
}

/**
 * Reads the selection back out of the theme cookies — the same source, and the
 * same fingerprint check, that `ThemeHead`'s pre-paint bootstrap script uses.
 *
 * This adapter writes the selection to `localStorage` **and** to cookies, but
 * only ever read `localStorage`. Whenever the two disagreed — cookies set by
 * the server, a cleared or partitioned `localStorage`, a fresh browser profile,
 * private mode — the client runtime resolved a different theme than the one the
 * blocking script had already painted, and corrected it. That correction is the
 * flash the script exists to prevent.
 */
function readCookieSelection(fingerprint: string | null): ThemeSelectionState | null {
  const saved = readCookie(COOKIE_NAMES.fingerprint);
  // Stale cookies from an older build are ignored, exactly as the script does:
  // only reject when both fingerprints are known and differ.
  if (fingerprint && saved && saved !== fingerprint) return null;

  const mode = readCookie(COOKIE_NAMES.mode);
  const family = readCookie(COOKIE_NAMES.family);

  if (!family) return null;
  if (mode !== "light" && mode !== "dark" && mode !== "system") return null;

  return { mode, family };
}

/**
 * Creates the client-side persistence adapter for Remix. Mirrors the theme
 * selection to `localStorage` (cross-tab sync, offline) AND to the theme
 * cookies (`theme-family` / `theme-mode` / `theme-fingerprint`) so the server
 * resolves the exact same state on the next request.
 *
 * @param themes - The theme registry used to compute the config fingerprint.
 * @param defaultTheme - Fallback theme name used in the fingerprint.
 * @param options - Persistence options (see {@link RemixThemePersistenceOptions}).
 * @returns A persistence adapter, or `null` when running outside the browser.
 *
 * @example
 * ```ts
 * import { createRemixThemePersistence } from "@themvora/remix";
 *
 * const persistence = createRemixThemePersistence(myThemes, "light", {
 *   key: "my-theme-selection",
 * });
 * ```
 *
 * @remarks
 * Returns `null` during SSR (no `window`), so the runtime falls back to its
 * default persistence behavior on the server. The cookie contract matches
 * `@themvora/next` and `@themvora/nuxt`.
 *
 * **Blocked storage degrades, it does not throw.** `window.localStorage` can
 * throw on access and `setItem` throws when the quota is full; both are treated
 * as "this browser cannot remember the selection". The cookie mirror is written
 * either way, so the server still resolves the same theme on the next request.
 *
 * @see {@link ThemeProvider}
 * @see {@link ThemeHead}
 */
export function createRemixThemePersistence(
  themes?: readonly ThemeDefinition[],
  defaultTheme?: string,
  options: RemixThemePersistenceOptions = {},
): ThemeSelectionPersistenceAdapter | null {
  if (typeof window === "undefined") {
    return null;
  }

  const key = options.key ?? "theme-selection";
  const storage = resolveStorage(options.storage);
  const cookieBase = withSecure(
    options.cookieOptions ?? "path=/; max-age=31536000; samesite=lax",
  );
  const fingerprint = themes?.length
    ? computeFingerprint(themes, defaultTheme)
    : null;

  return {
    get() {
      // localStorage first (cross-tab, offline), then the cookies `ThemeHead`'s
      // bootstrap script reads — so the runtime adopts the already-painted
      // theme instead of overwriting it.
      return parseState(readKey(storage, key)) ?? readCookieSelection(fingerprint);
    },

    set(value) {
      // Storage and cookies are independent: a full quota must not cost the
      // visitor server-side persistence on their next request.
      writeKey(storage, key, JSON.stringify(value));

      document.cookie = `${COOKIE_NAMES.family}=${encodeURIComponent(value.family)}; ${cookieBase}`;
      document.cookie = `${COOKIE_NAMES.mode}=${encodeURIComponent(value.mode)}; ${cookieBase}`;

      if (fingerprint) {
        document.cookie = `${COOKIE_NAMES.fingerprint}=${encodeURIComponent(fingerprint)}; ${cookieBase}`;
      }
    },

    remove() {
      removeKey(storage, key);

      const expire = withSecure("path=/; max-age=0; samesite=lax");
      document.cookie = `${COOKIE_NAMES.family}=; ${expire}`;
      document.cookie = `${COOKIE_NAMES.mode}=; ${expire}`;
      document.cookie = `${COOKIE_NAMES.fingerprint}=; ${expire}`;
    },

    subscribe(listener) {
      const handleStorage = (event: StorageEvent) => {
        if (event.key !== key) {
          return;
        }

        listener(parseState(event.newValue));
      };

      window.addEventListener("storage", handleStorage);

      return () => {
        window.removeEventListener("storage", handleStorage);
      };
    },
  };
}
