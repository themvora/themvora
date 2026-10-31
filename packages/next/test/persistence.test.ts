// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getBuiltInThemes } from "@themvora/core";
import { createNextThemePersistence } from "../src/persistence";

/**
 * F5 — the Next adapter read `window.localStorage` and called
 * `getItem`/`setItem`/`removeItem` with no guard. Per the Web Storage spec the
 * **getter itself** throws `SecurityError` when storage is denied (cookies
 * blocked, a sandboxed iframe without `allow-same-origin`, some embedded
 * webviews), and `setItem` throws `QuotaExceededError` when full.
 *
 * In Next this was not a background failure: `ClientThemeProvider` creates the
 * adapter inside `useMemo` during render, so a denied-storage browser threw
 * while rendering the root layout's client tree.
 *
 * Every case below also asserts the cookie mirror still happened — a storage
 * failure must not cost the server-side persistence that would still work.
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

function storedCookies(): string[] {
  return cookieWrites.filter((entry) => entry.startsWith("theme-"));
}

beforeEach(() => {
  cookieWrites = [];
  captureCookieWrites();
  localStorage.clear();
});

afterEach(() => {
  restoreCookie();
  localStorage.clear();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

let originalStorage: PropertyDescriptor | undefined;

/** Replaces `window.localStorage` with an accessor that throws, as the spec allows. */
function denyStorage() {
  originalStorage ??= Object.getOwnPropertyDescriptor(window, "localStorage");
  Object.defineProperty(window, "localStorage", {
    configurable: true,
    get() {
      throw new DOMException("The operation is insecure.", "SecurityError");
    },
  });
}

function restoreStorage() {
  if (originalStorage) {
    Object.defineProperty(window, "localStorage", originalStorage);
  }
}

describe("Next persistence with blocked storage (F5)", () => {
  it("does not throw when the localStorage getter throws", () => {
    denyStorage();
    try {
      expect(() => createNextThemePersistence(themes, "light")).not.toThrow();
    } finally {
      restoreStorage();
    }
  });

  it("still returns an adapter so cookies keep working", () => {
    denyStorage();
    try {
      const persistence = createNextThemePersistence(themes, "light");
      expect(persistence).not.toBeNull();

      persistence!.set(SELECTION);

      expect(cookieWrites.some((entry) => entry.startsWith("theme-family="))).toBe(true);
      expect(cookieWrites.some((entry) => entry.startsWith("theme-mode="))).toBe(true);
      expect(cookieWrites.some((entry) => entry.startsWith("theme-fingerprint="))).toBe(
        true,
      );
    } finally {
      restoreStorage();
    }
  });

  it("treats a throwing getItem as no stored selection", () => {
    const persistence = createNextThemePersistence(themes, "light", {
      storage: {
        getItem() {
          throw new Error("blocked");
        },
        setItem() {},
        removeItem() {},
        clear() {},
        key: () => null,
        length: 0,
      } as unknown as Storage,
    });

    expect(persistence).not.toBeNull();
    expect(persistence!.get()).toBeNull();
  });

  it("writes cookies when setItem throws (quota exceeded)", () => {
    const persistence = createNextThemePersistence(themes, "light", {
      storage: {
        getItem: () => null,
        setItem() {
          throw new DOMException("quota", "QuotaExceededError");
        },
        removeItem() {},
        clear() {},
        key: () => null,
        length: 0,
      } as unknown as Storage,
    });

    expect(() => persistence!.set(SELECTION)).not.toThrow();
    expect(cookieWrites.some((entry) => entry.startsWith("theme-family=plum"))).toBe(
      true,
    );
    expect(cookieWrites.some((entry) => entry.startsWith("theme-mode=dark"))).toBe(true);
  });

  it("clears cookies when removeItem throws", () => {
    const persistence = createNextThemePersistence(themes, "light", {
      storage: {
        getItem: () => null,
        setItem() {},
        removeItem() {
          throw new Error("blocked");
        },
        clear() {},
        key: () => null,
        length: 0,
      } as unknown as Storage,
    });

    expect(() => persistence!.remove()).not.toThrow();
    expect(cookieWrites).toContain("theme-family=; path=/; max-age=0; samesite=lax");
    expect(cookieWrites).toContain("theme-mode=; path=/; max-age=0; samesite=lax");
  });

  it("reads a stored selection when storage works", () => {
    localStorage.setItem("theme-selection", JSON.stringify(SELECTION));
    const persistence = createNextThemePersistence(themes, "light");

    expect(persistence!.get()).toEqual(SELECTION);
  });

  it("keeps the cookie path and lifetime contract", () => {
    const persistence = createNextThemePersistence(themes, "light", {
      storage: {
        getItem: () => null,
        setItem() {},
        removeItem() {},
        clear() {},
        key: () => null,
        length: 0,
      } as unknown as Storage,
    });
    persistence!.set(SELECTION);

    for (const entry of storedCookies()) {
      expect(entry).toContain("path=/");
      expect(entry).toContain("max-age=31536000");
      expect(entry).toContain("samesite=lax");
      // jsdom runs on http://localhost, so `Secure` must be absent or the
      // cookie would be rejected in ordinary local development.
      expect(entry.toLowerCase()).not.toContain("secure");
    }
  });

  it("adds Secure on an HTTPS origin", () => {
    vi.stubGlobal("location", { ...window.location, protocol: "https:" });

    const persistence = createNextThemePersistence(themes, "light", {
      storage: {
        getItem: () => null,
        setItem() {},
        removeItem() {},
        clear() {},
        key: () => null,
        length: 0,
      } as unknown as Storage,
    });
    persistence!.set(SELECTION);

    expect(cookieWrites.every((entry) => entry.includes("; secure"))).toBe(true);
  });
});
