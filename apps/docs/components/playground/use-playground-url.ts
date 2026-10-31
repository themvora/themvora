"use client";

import { useEffect, useRef } from "react";
import {
  useThemeRuntime,
  useSetThemeFamily,
  useSetThemeMode,
} from "@themvora/next/client";

/**
 * Deep-link restore. Params are only ever READ: the runtime persists the
 * selection itself, the address bar stays clean, and shareable URLs are built
 * on demand by the workspace bar's Copy-link button. Links like
 * /playground?family=vercel&mode=light&theme=vercel-light still reproduce that
 * exact state on arrival.
 */
export function usePlaygroundURL() {
  const runtime = useThemeRuntime();
  const setFamily = useSetThemeFamily();
  const setMode = useSetThemeMode();
  const restored = useRef(false);

  useEffect(() => {
    if (restored.current) return;
    restored.current = true;

    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const urlFamily = params.get("family");
    const urlMode = params.get("mode");
    const urlTheme = params.get("theme");
    const section = params.get("section");

    if (urlFamily) {
      const valid = runtime.themes.some((t) => t.meta?.family === urlFamily);
      if (valid) setFamily(urlFamily as Parameters<typeof setFamily>[0]);
    }
    if (urlMode && (urlMode === "light" || urlMode === "dark" || urlMode === "system")) {
      setMode(urlMode);
    }
    if (urlTheme) {
      const target = runtime.themes.find((t) => t.name === urlTheme);
      if (target?.tokens) {
        runtime.update(target.tokens);
      }
    }
    if (section) {
      requestAnimationFrame(() => {
        const el = document.getElementById(section);
        if (el) el.scrollIntoView({ behavior: "smooth" });
      });
    }
  }, [runtime, setFamily, setMode]);
}
