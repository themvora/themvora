// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getBuiltInThemes } from "@themvora/core";
import { createNuxtThemePersistence } from "../src/runtime/utils/persistence";

/**
 * F9 — the Nuxt adapter guarded storage correctly, but `return`ed out of
 * `set()`/`remove()` as soon as the storage call threw. The cookie mirror came
 * *after* that `return`, so a visitor with a full quota or blocked storage lost
 * the server-readable cookies as well — and with them the SSR persistence that
 * would still have worked.
 *
 * The factory also returned `null` when `localStorage` could not be obtained,
 * which disabled the adapter entirely: no cookies, no SSR persistence, for a
 * condition that only affects the local mirror.
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

beforeEach(() => {
  cookieWrites = [];
  captureCookieWrites();
});

afterEach(() => {
  restoreCookie();
  vi.restoreAllMocks();
});

describe("Nuxt persistence cookie independence (F9)", () => {
  it("writes the cookies when setItem throws", () => {
    const persistence = createNuxtThemePersistence(themes, "light", {
      storage: throwingStorage({
        setItem() {
          throw new DOMException("quota", "QuotaExceededError");
        },
      }),
    })!;

    expect(() => persistence.set(SELECTION)).not.toThrow();
    expect(cookieWrites.some((entry) => entry.startsWith("theme-family=plum"))).toBe(
      true,
    );
    expect(cookieWrites.some((entry) => entry.startsWith("theme-mode=dark"))).toBe(true);
    expect(
      cookieWrites.some((entry) => entry.startsWith("theme-fingerprint=")),
    ).toBe(true);
  });

  it("clears the cookies when removeItem throws", () => {
    const persistence = createNuxtThemePersistence(themes, "light", {
      storage: throwingStorage({
        removeItem() {
          throw new Error("blocked");
        },
      }),
    })!;

    expect(() => persistence.remove()).not.toThrow();
    expect(cookieWrites).toContain("theme-family=; path=/; max-age=0; samesite=lax");
    expect(cookieWrites).toContain("theme-mode=; path=/; max-age=0; samesite=lax");
    expect(cookieWrites).toContain(
      "theme-fingerprint=; path=/; max-age=0; samesite=lax",
    );
  });

  it("still returns an adapter when the localStorage getter throws", () => {
    const original = Object.getOwnPropertyDescriptor(window, "localStorage");
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      get() {
        throw new DOMException("insecure", "SecurityError");
      },
    });

    try {
      const persistence = createNuxtThemePersistence(themes, "light");
      expect(persistence).not.toBeNull();

      persistence!.set(SELECTION);
      expect(cookieWrites.some((entry) => entry.startsWith("theme-family=plum"))).toBe(
        true,
      );
      // Reads degrade to "nothing stored" rather than throwing.
      expect(persistence!.get()).toBeNull();
    } finally {
      if (original) Object.defineProperty(window, "localStorage", original);
    }
  });

  it("reads a stored selection when storage works", () => {
    localStorage.setItem("theme-selection", JSON.stringify(SELECTION));
    const persistence = createNuxtThemePersistence(themes, "light")!;

    expect(persistence.get()).toEqual(SELECTION);
  });

  it("returns null outside the browser", () => {
    vi.stubGlobal("window", undefined);
    try {
      expect(createNuxtThemePersistence(themes, "light")).toBeNull();
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
