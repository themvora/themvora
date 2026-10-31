// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getBuiltInThemes } from "@themvora/core";
import { createAstroThemePersistence } from "../src/persistence";
import { getInitialThemeState } from "../src/server";

/**
 * F5 (Astro) and F7 — the Astro adapter had the same unguarded
 * `window.localStorage` access and unguarded `decodeURIComponent` as the Next
 * and Remix adapters.
 *
 * The server resolver already validated `theme-fingerprint`; what it did not do
 * was survive a malformed cookie value.
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

describe("Astro persistence with blocked storage (F5)", () => {
  it("does not throw when the localStorage getter throws", () => {
    const original = Object.getOwnPropertyDescriptor(window, "localStorage");
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      get() {
        throw new DOMException("insecure", "SecurityError");
      },
    });

    try {
      expect(() => createAstroThemePersistence(themes, "light")).not.toThrow();
    } finally {
      if (original) Object.defineProperty(window, "localStorage", original);
    }
  });

  it("still writes the cookies when storage is unavailable", () => {
    const original = Object.getOwnPropertyDescriptor(window, "localStorage");
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      get() {
        throw new DOMException("insecure", "SecurityError");
      },
    });

    try {
      const persistence = createAstroThemePersistence(themes, "light")!;
      persistence.set(SELECTION);

      expect(cookieWrites.some((entry) => entry.startsWith("theme-family=plum"))).toBe(
        true,
      );
      expect(cookieWrites.some((entry) => entry.startsWith("theme-mode=dark"))).toBe(
        true,
      );
    } finally {
      if (original) Object.defineProperty(window, "localStorage", original);
    }
  });

  it("writes cookies when setItem throws", () => {
    // The adapter resolves `window.localStorage` itself, so the throwing store
    // is installed as the global for the duration of this call.
    const original = Object.getOwnPropertyDescriptor(window, "localStorage");
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: throwingStorage({
        setItem() {
          throw new DOMException("quota", "QuotaExceededError");
        },
      }),
    });

    try {
      const guarded = createAstroThemePersistence(themes, "light")!;
      expect(() => guarded.set(SELECTION)).not.toThrow();
      expect(cookieWrites.some((entry) => entry.startsWith("theme-family=plum"))).toBe(
        true,
      );
    } finally {
      if (original) Object.defineProperty(window, "localStorage", original);
    }
  });

  it("ignores a malformed cookie value instead of throwing", () => {
    document.cookie = "theme-mode=%E0%A4%A; path=/";
    document.cookie = "theme-family=%E0%A4%A; path=/";

    const persistence = createAstroThemePersistence(themes, "light")!;
    expect(() => persistence.get()).not.toThrow();
    expect(persistence.get()).toBeNull();
  });
});

describe("Astro server cookie handling (F7)", () => {
  it("does not throw on a malformed percent-encoded cookie", async () => {
    const resolved = await getInitialThemeState(
      request("theme-mode=%E0%A4%A; theme-family=%E0%A4%A"),
      { themes, defaultTheme: "light" },
    );

    expect(resolved.selection.mode).toBe("light");
    expect(resolved.selection.family).toBe("default");
  });

  it("decodes a legitimate encoded value", async () => {
    const resolved = await getInitialThemeState(
      request(`theme-family=${encodeURIComponent("plum")}; theme-mode=dark`),
      { themes, defaultTheme: "light" },
    );

    expect(resolved.selection.family).toBe("plum");
    expect(resolved.selection.mode).toBe("dark");
  });

  it("still rejects a stale fingerprint", async () => {
    const resolved = await getInitialThemeState(
      request("theme-mode=dark; theme-family=plum; theme-fingerprint=stale"),
      { themes, defaultTheme: "light" },
    );

    expect(resolved.selection.mode).toBe("light");
    expect(resolved.selection.family).toBe("default");
  });
});
