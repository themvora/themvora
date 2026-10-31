// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { computeFingerprint, getBuiltInThemes } from "@themvora/core";
import { createRemixThemePersistence } from "../src/persistence";
import { getInitialThemeState } from "../src/server";

/**
 * F5 (Remix) — the adapter read `window.localStorage` and called its methods
 * with no guard, and wrote the storage entry *before* the cookies. A blocked
 * getter threw from `get()` during runtime creation; a full quota threw out of
 * the user's click handler and, because `setItem` came first, skipped the
 * cookie mirror entirely.
 *
 * F7 — `decodeURIComponent` on a cookie value with no guard. A malformed value
 * (`%E0%A4%A`, planted by a sibling subdomain) threw `URIError` out of
 * `getInitialThemeState`, so every route returned a server error.
 *
 * F8 — the server resolver never read `theme-fingerprint`, so after a registry
 * change it rendered the stale cookie's theme while the client rejected it.
 */

const themes = getBuiltInThemes();
const SELECTION = { mode: "dark", family: "plum" } as const;

let cookieWrites: string[] = [];
let restoreCookie: () => void;

function captureCookieWrites() {
  const descriptor = Object.getOwnPropertyDescriptor(Document.prototype, "cookie")!;
  Object.defineProperty(document, "cookie", {
    configurable: true,
    get: () => descriptor.get!.call(document),
    set: (value: string) => {
      cookieWrites.push(value);
      descriptor.set!.call(document, value);
    },
  });
  restoreCookie = () => {
    delete (document as unknown as Record<string, unknown>).cookie;
  };
}

function throwingStorage(overrides: Partial<Storage> = {}): Storage {
  return {
    getItem: () => null,
    setItem() {},
    removeItem() {},
    clear() {},
    key: () => null,
    length: 0,
    ...overrides,
  } as unknown as Storage;
}

function request(cookie: string): Request {
  return new Request("https://example.test/", { headers: { cookie } });
}

beforeEach(() => {
  cookieWrites = [];
  captureCookieWrites();
});

afterEach(() => {
  restoreCookie();
  vi.restoreAllMocks();
});

describe("Remix persistence with blocked storage (F5)", () => {
  it("does not throw when the localStorage getter throws", () => {
    const original = Object.getOwnPropertyDescriptor(window, "localStorage");
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      get() {
        throw new DOMException("insecure", "SecurityError");
      },
    });

    try {
      expect(() => createRemixThemePersistence(themes, "light")).not.toThrow();
    } finally {
      if (original) Object.defineProperty(window, "localStorage", original);
    }
  });

  it("writes cookies when setItem throws", () => {
    const persistence = createRemixThemePersistence(themes, "light", {
      storage: throwingStorage({
        setItem() {
          throw new DOMException("quota", "QuotaExceededError");
        },
      }),
    });

    expect(() => persistence!.set(SELECTION)).not.toThrow();
    expect(cookieWrites.some((entry) => entry.startsWith("theme-family=plum"))).toBe(
      true,
    );
    expect(cookieWrites.some((entry) => entry.startsWith("theme-mode=dark"))).toBe(true);
  });

  it("clears cookies when removeItem throws", () => {
    const persistence = createRemixThemePersistence(themes, "light", {
      storage: throwingStorage({
        removeItem() {
          throw new Error("blocked");
        },
      }),
    });

    expect(() => persistence!.remove()).not.toThrow();
    expect(cookieWrites).toContain("theme-family=; path=/; max-age=0; samesite=lax");
  });

  it("falls back to the cookies when getItem throws", () => {
    document.cookie = "theme-mode=dark; path=/";
    document.cookie = "theme-family=plum; path=/";

    const persistence = createRemixThemePersistence(themes, "light", {
      storage: throwingStorage({
        getItem() {
          throw new Error("blocked");
        },
      }),
    });

    expect(persistence!.get()).toEqual({ mode: "dark", family: "plum" });
  });

  it("ignores a malformed cookie value instead of throwing", () => {
    document.cookie = "theme-mode=%E0%A4%A; path=/";
    document.cookie = "theme-family=%E0%A4%A; path=/";

    const persistence = createRemixThemePersistence(themes, "light", {
      storage: throwingStorage(),
    });

    expect(() => persistence!.get()).not.toThrow();
    expect(persistence!.get()).toBeNull();
  });
});

describe("Remix server cookie handling (F7)", () => {
  it("does not throw on a malformed percent-encoded cookie", async () => {
    const resolved = await getInitialThemeState(
      request("theme-mode=%E0%A4%A; theme-family=%E0%A4%A"),
      { themes, defaultTheme: "light" },
    );

    // The malformed values are treated as absent, so the normal fallback
    // applies — not an exception, and not a half-applied selection.
    expect(resolved.selection.mode).toBe("light");
  });

  it("decodes a legitimate encoded value", async () => {
    const resolved = await getInitialThemeState(
      request(`theme-family=${encodeURIComponent("plum")}; theme-mode=dark`),
      { themes, defaultTheme: "light" },
    );

    expect(resolved.selection.family).toBe("plum");
    expect(resolved.selection.mode).toBe("dark");
  });

  it("ignores unrelated cookies", async () => {
    const resolved = await getInitialThemeState(
      request("session=abc; theme-mode=dark"),
      { themes, defaultTheme: "light" },
    );

    expect(resolved.selection.mode).toBe("dark");
    // Only the mode cookie was sent, so the family falls back to the
    // `defaultTheme`'s own family.
    expect(resolved.selection.family).toBe("default");
  });
});

describe("Remix server fingerprint (F8)", () => {
  const fingerprint = computeFingerprint(themes, "light");

  it("accepts a selection written with the current fingerprint", async () => {
    const resolved = await getInitialThemeState(
      request(
        `theme-mode=dark; theme-family=plum; theme-fingerprint=${encodeURIComponent(fingerprint)}`,
      ),
      { themes, defaultTheme: "light" },
    );

    expect(resolved.selection.mode).toBe("dark");
    expect(resolved.selection.family).toBe("plum");
  });

  it("rejects a selection written with a stale fingerprint", async () => {
    const resolved = await getInitialThemeState(
      request(
        "theme-mode=dark; theme-family=plum; theme-fingerprint=an-older-registry",
      ),
      { themes, defaultTheme: "light" },
    );

    // Falls back exactly as the pre-paint script and the client adapter do, so
    // the server render and the browser cannot disagree.
    expect(resolved.selection.mode).toBe("light");
    expect(resolved.selection.family).toBe("default");
  });

  it("accepts a selection with no fingerprint (legacy cookie contract)", async () => {
    const resolved = await getInitialThemeState(
      request("theme-mode=dark; theme-family=plum"),
      { themes, defaultTheme: "light" },
    );

    expect(resolved.selection.mode).toBe("dark");
  });

  it("keeps the same fallback for a malformed cookie with a stale fingerprint", async () => {
    const resolved = await getInitialThemeState(
      request("theme-mode=%E0%A4%A; theme-fingerprint=stale"),
      { themes, defaultTheme: "light" },
    );

    expect(resolved.selection.mode).toBe("light");
  });
});
