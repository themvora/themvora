"use client";

import type {
  ThemeDefinition,
  ThemeSelectionPersistenceAdapter,
  ThemeSelectionState,
} from "@themvora/core";
import { computeFingerprint } from "./fingerprint";

export interface NextThemePersistenceOptions {
  key?: string;
  storage?: Storage;
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

/**
 * Obtain the backing `Storage`, or `null` when the browser will not give one up.
 *
 * @remarks
 * The **getter itself** throws `SecurityError` when storage is denied — cookies
 * blocked, a sandboxed iframe without `allow-same-origin`, some embedded
 * webviews — so guarding `getItem`/`setItem` alone is not enough: the throw
 * happens before any of them is called.
 */
function resolveStorage(candidate: Storage | undefined): Storage | null {
  if (candidate) return candidate;
  try {
    return window.localStorage ?? null;
  } catch {
    return null;
  }
}

/** Reads one key, treating a blocked or full storage as "nothing stored". */
function readKey(storage: Storage | null, key: string): string | null {
  if (!storage) return null;
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

/** Writes one key. Returns whether the write happened. */
function writeKey(storage: Storage | null, key: string, value: string): boolean {
  if (!storage) return false;
  try {
    storage.setItem(key, value);
    return true;
  } catch {
    // `QuotaExceededError`, a storage that was revoked after it was obtained, or
    // a partitioned store that refuses the write. None of these are programming
    // errors and none of them should reach the caller's click handler.
    return false;
  }
}

function removeKey(storage: Storage | null, key: string): boolean {
  if (!storage) return false;
  try {
    storage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

/**
 * `Secure` is added only on an HTTPS origin. An unconditional `Secure` would
 * make the cookie unwritable on `http://localhost`, which would silently
 * disable server-side persistence in ordinary local development.
 */
function secureSuffix(): string {
  try {
    return typeof location !== "undefined" && location.protocol === "https:"
      ? "; secure"
      : "";
  } catch {
    return "";
  }
}

/**
 * Client-side persistence for Next.js: mirrors the selection to
 * `localStorage` (cross-tab sync, offline) and to the theme cookies the server
 * reads on the next request.
 *
 * @param themes - The registry used to compute the configuration fingerprint.
 * @param defaultTheme - Fallback theme name used in the fingerprint.
 * @param options - Storage key and backing storage.
 * @returns A persistence adapter, or `null` during SSR.
 *
 * @remarks
 * **Blocked storage degrades, it does not throw.** `window.localStorage` can
 * throw on access, and `setItem` throws when the quota is full. Both are
 * treated as "this browser cannot remember the selection": the adapter still
 * exists, so the cookie mirror keeps working and the server still resolves the
 * same theme, and nothing is thrown into a render. This matters in Next
 * specifically because `ClientThemeProvider` creates the adapter inside
 * `useMemo` during render — a throw there failed the whole client tree.
 *
 * The `null` return is reserved for "not in a browser", which is the contract
 * every caller already handles.
 */
export function createNextThemePersistence(
  themes?: readonly ThemeDefinition[],
  defaultTheme?: string,
  options: NextThemePersistenceOptions = {},
): ThemeSelectionPersistenceAdapter | null {
  if (typeof window === "undefined") {
    return null;
  }

  const key = options.key ?? "theme-selection";
  const storage = resolveStorage(options.storage);
  const fingerprint = themes?.length
    ? computeFingerprint(themes, defaultTheme)
    : null;

  return {
    get() {
      return parseState(readKey(storage, key));
    },

    set(value) {
      // Storage and cookies are independent: a full quota must not cost the
      // visitor server-side persistence on their next request.
      writeKey(storage, key, JSON.stringify(value));
      const secure = secureSuffix();

      document.cookie = `theme-family=${encodeURIComponent(
        value.family,
      )}; path=/; max-age=31536000; samesite=lax${secure}`;

      document.cookie = `theme-mode=${encodeURIComponent(
        value.mode,
      )}; path=/; max-age=31536000; samesite=lax${secure}`;

      if (fingerprint) {
        document.cookie = `theme-fingerprint=${encodeURIComponent(
          fingerprint,
        )}; path=/; max-age=31536000; samesite=lax${secure}`;
      }
    },

    remove() {
      removeKey(storage, key);

      const expire = `; path=/; max-age=0; samesite=lax${secureSuffix()}`;
      document.cookie = `theme-family=${expire}`;
      document.cookie = `theme-mode=${expire}`;
      document.cookie = `theme-fingerprint=${expire}`;
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
