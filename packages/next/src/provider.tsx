"use client";

import React, { useEffect, useMemo, useRef } from "react";
import {
  createThemeRuntime,
  type InitialThemeResolution,
  type ThemeDefinition,
  type ThemeRuntime,
} from "@themvora/core";
import {
  ThemeProvider as ReactThemeProvider,
  useThemeRuntime,
} from "@themvora/react";
import { createNextThemePersistence } from "./persistence";
import { computeFingerprint } from "./fingerprint";

export interface ClientThemeProviderProps<T extends ThemeDefinition> {
  initial: InitialThemeResolution<T>;
  themes?: readonly T[];
  defaultTheme?: string;
  transition?: boolean | import("@themvora/core").ThemeTransitionOptions;
  /**
   * Sunrise/sunset scheduling. Created client-side only — the server resolves
   * the initial theme (zero-flash) and the client schedule takes over
   * activation. Configure via `useThemeSchedule()`.
   */
  scheduled?: false | import("@themvora/core").ScheduledThemeOptions<T>;
  /**
   * Library adapters installed onto the created runtime. Each adapter keeps its
   * own injected `<style>` in sync as the theme changes.
   */
  adapters?: import("@themvora/core").ThemeAdapter<T>[];
  children: React.ReactNode;
}

function writeCookie(name: string, value: string) {
  document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(
    value,
  )}; path=/; max-age=31536000; samesite=lax`;
}

function syncDarkClass(theme: ThemeDefinition) {
  const isDark = theme.meta?.mode === "dark";
  document.documentElement.classList.toggle("dark", isDark);
}

function CookieSync({ fingerprint }: { fingerprint: string }) {
  const runtime = useThemeRuntime();

  useEffect(() => {
    // Sync from the runtime's *current* theme, never from `initial.theme`.
    //
    // `initial` is the server's resolution, and for a "system" selection the
    // server can only assume light — it cannot read the visitor's OS. By the
    // time this passive effect runs, the system binding has already resolved
    // `prefers-color-scheme` and set the store to the dark theme (and the DOM
    // adapter has applied the `dark` class). Re-syncing from the server's
    // assumption here would *strip* that class, leaving dark color tokens with
    // light-mode `dark:` variants — a half-themed page. Reading the store is
    // also simply more correct: it is the resolved state, not a stale guess.
    const current = runtime.store.get();
    syncDarkClass(current);

    writeCookie("theme-family", runtime.selection.getFamily());
    writeCookie("theme-mode", runtime.selection.getMode());
    writeCookie("theme-name", String(current.name));
    writeCookie("theme-fingerprint", fingerprint);

    const unsubscribe = runtime.store.subscribe((theme) => {
      syncDarkClass(theme);
      writeCookie("theme-name", String(theme.name));
      writeCookie("theme-family", runtime.selection.getFamily());
      writeCookie("theme-mode", runtime.selection.getMode());
      writeCookie("theme-fingerprint", fingerprint);
    });

    return unsubscribe;
  }, [runtime, fingerprint]);

  return null;
}

export function ClientThemeProvider<T extends ThemeDefinition>({
  initial,
   themes,
   defaultTheme,
   transition,
   scheduled,
   adapters,
   children,
}: ClientThemeProviderProps<T>) {
  const persistence = useMemo(
    () => createNextThemePersistence(themes, defaultTheme),
    [themes, defaultTheme],
  );

  const fingerprint = useMemo(
    () => computeFingerprint(themes ?? [], defaultTheme),
    [themes, defaultTheme],
  );

  // Next's server provider emits the cookie-backed bootstrap into <head>. On the
  // client, create the runtime from that already-applied DOM state and hand it to
  // the React context provider as caller-owned. This is important for two
  // reasons: React's owned-runtime bootstrap reads localStorage (a second source
  // which can overwrite Next's cookie selection), and its initial-state layout
  // effect deliberately reapplies the server snapshot. Both are correct for a
  // generic React SSR app, but Next has already done the authoritative handoff.
  //
  // createThemeRuntime keeps `runtime.initial` equal to the server's `initial`
  // snapshot while its live store adopts `data-theme-ready`, so hydration still
  // uses the server snapshot and the client keeps the theme that was painted.
  // The runtime is created **once** and reconfigured in place. Recreating it on
  // every prop change (the previous `useMemo` deps) discarded runtime state —
  // history, the adopted `data-theme-ready` selection — and churned the React
  // context. Configuration changes (`themes` / `defaultTheme` / `initial`) are
  // forwarded to the adopted runtime and applied through the shared
  // `runtime.configure()` contract by the React provider below.
  const runtime = useMemo(() => {
    const options = {
      ...(themes ? { themes } : {}),
      ...(defaultTheme !== undefined
        ? { defaultTheme: defaultTheme as T["name"] }
        : {}),
      initial,
      readPersistenceOnInit: false,
      persistence,
      dom: false as const,
      cssVariables: false as const,
      ...(transition !== undefined ? { transition } : {}),
      ...(scheduled !== undefined ? { scheduled } : {}),
      ...(adapters ? { adapters } : {}),
    };
    return createThemeRuntime(options);
    // Created once: the creation-time snapshot of the props; later changes flow
    // through `configure` (see the React provider).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // This wrapper owns the externally-created runtime. Defer destruction by one
  // task so React StrictMode's simulated cleanup/setup pair can cancel it, just
  // like the React provider does for runtimes it owns itself.
  const destroyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (destroyTimerRef.current !== null) {
      clearTimeout(destroyTimerRef.current);
      destroyTimerRef.current = null;
    }

    return () => {
      destroyTimerRef.current = setTimeout(() => {
        destroyTimerRef.current = null;
        runtime.destroy();
      }, 0);
    };
  }, [runtime]);

  return (
    <ReactThemeProvider
      runtime={runtime as ThemeRuntime<T>}
      initial={initial}
      {...(themes ? { themes } : {})}
      {...(defaultTheme !== undefined ? { defaultTheme: defaultTheme as T["name"] } : {})}
      readPersistenceOnInit={false}
      persistence={persistence}
      {...(transition !== undefined ? { transition } : {})}
      {...(scheduled !== undefined ? { scheduled } : {})}
      {...(adapters ? { adapters } : {})}
    >
      <CookieSync fingerprint={fingerprint} />
      {children}
    </ReactThemeProvider>
  );
}