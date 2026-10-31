import type {
  ThemeDefinition,
  ThemeSelectionPersistenceAdapter,
  ThemeSelectionState,
} from "@themvora/core";
import { computeFingerprint } from "../../server/fingerprint";
import { themvoraCookieNames } from "../../server/cookies";

export interface NuxtThemePersistenceOptions {
  key?: string;
  storage?: Storage;
}

function parseState(value: string | null): ThemeSelectionState | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as Partial<ThemeSelectionState>;
    if (
      (parsed.mode === "light" || parsed.mode === "dark" || parsed.mode === "system") &&
      typeof parsed.family === "string"
    ) {
      return { mode: parsed.mode, family: parsed.family };
    }
  } catch {
    return null;
  }
  return null;
}

/**
 * `Secure` is added only on an HTTPS origin, so `http://localhost` can still
 * write the cookie the Nuxt server reads.
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

function writeCookie(name: string, value: string) {
  document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(
    value,
  )}; path=/; max-age=31536000; samesite=lax${secureSuffix()}`;
}

function clearCookie(name: string) {
  document.cookie = `${encodeURIComponent(name)}=; path=/; max-age=0; samesite=lax${secureSuffix()}`;
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

function writeKey(storage: Storage | null, key: string, value: string): void {
  if (!storage) return;
  try {
    storage.setItem(key, value);
  } catch {
    // Quota exceeded, or a store revoked after it was obtained. The cookies
    // below are written regardless — that is the whole point of this adapter
    // existing on the client.
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
 * Client-side persistence adapter for Nuxt. Mirrors the selection to
 * `localStorage` (cross-tab sync, offline) AND to the four theme cookies
 * (theme-family / theme-mode / theme-fingerprint) so the server resolves the
 * exact same state on the next request — same contract as `@themvora/next`.
 *
 * @param themes - The registry used to compute the configuration fingerprint.
 * @param defaultTheme - Fallback theme name used in the fingerprint.
 * @param options - Storage key and backing storage.
 * @returns A persistence adapter, or `null` during SSR.
 *
 * @remarks
 * **The two mirrors are independent.** `set()` and `remove()` used to `return`
 * as soon as `setItem`/`removeItem` threw, so a visitor with a full quota or
 * blocked storage lost the *cookie* write too — and with it the server-side
 * persistence that would still have worked. Each half now runs on its own.
 *
 * When storage cannot be obtained at all the adapter is still returned, with
 * the storage half degraded to a no-op: cookies keep the server and the
 * pre-paint script in agreement, which is the only reason this adapter writes
 * them. `null` is reserved for "not in a browser".
 */
export function createNuxtThemePersistence(
  themes?: readonly ThemeDefinition[],
  defaultTheme?: string,
  options: NuxtThemePersistenceOptions = {},
): ThemeSelectionPersistenceAdapter | null {
  if (typeof window === "undefined") return null;

  let storage: Storage | null = null;
  try {
    storage = options.storage ?? window.localStorage ?? null;
  } catch {
    storage = null;
  }

  const key = options.key ?? "theme-selection";
  const fingerprint = themes?.length
    ? computeFingerprint(themes, defaultTheme)
    : null;

  return {
    get() {
      return parseState(readKey(storage, key));
    },

    set(value) {
      writeKey(storage, key, JSON.stringify(value));

      writeCookie(themvoraCookieNames.family, value.family);
      writeCookie(themvoraCookieNames.mode, value.mode);
      if (fingerprint) {
        writeCookie(themvoraCookieNames.fingerprint, fingerprint);
      }
    },

    remove() {
      removeKey(storage, key);

      clearCookie(themvoraCookieNames.family);
      clearCookie(themvoraCookieNames.mode);
      clearCookie(themvoraCookieNames.fingerprint);
    },

    subscribe(listener) {
      const handler = (event: StorageEvent) => {
        if (event.key !== key) return;
        listener(parseState(event.newValue));
      };
      window.addEventListener("storage", handler);
      return () => window.removeEventListener("storage", handler);
    },
  };
}
