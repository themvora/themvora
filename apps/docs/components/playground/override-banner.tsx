"use client";

import { useEffect, useRef, useState } from "react";
import { useTheme, useThemeRuntime, useSetThemeFamily, useSetThemeMode } from "@themvora/next/client";
import { Icon } from "@iconify/react";

interface Snapshot {
  family: string;
  mode: string;
  themeName: string;
}

export function OverrideBanner() {
  const { family, mode, theme } = useTheme();
  const runtime = useThemeRuntime();
  const setFamily = useSetThemeFamily();
  const setMode = useSetThemeMode();

  const initial = useRef<Snapshot | null>(null);
  const [override, setOverride] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!initial.current) {
      initial.current = { family, mode, themeName: theme.name };
      return;
    }

    const snap = initial.current;
    const familyChanged = family !== snap.family;
    const modeChanged = mode !== snap.mode;
    const themeChanged = theme.name !== snap.themeName;

    if (!familyChanged && !modeChanged && !themeChanged) {
      setOverride(null);
      setDismissed(false);
      return;
    }

    // A new override always re-opens the banner, even if the visitor dismissed
    // the previous one — but the same message again after a Reset does not.
    setDismissed(false);

    const name = theme.meta?.label ?? theme.name;
    if (theme.name.includes("high-contrast")) {
      setOverride(`High contrast profile active`);
    } else if (theme.name.includes("large-text")) {
      setOverride(`Large text profile active`);
    } else if (name.toLowerCase().includes("protan") || name.toLowerCase().includes("deuteran") || name.toLowerCase().includes("tritan") || name.toLowerCase().includes("achroma")) {
      setOverride(`CVD simulation active`);
    } else if (familyChanged) {
      setOverride(`Previewing ${snap.family} → ${family}`);
    } else {
      setOverride(`Theme modified`);
    }
  }, [family, mode, theme]);

  function reset() {
    const snap = initial.current;
    if (!snap) return;
    setFamily(snap.family as Parameters<typeof setFamily>[0]);
    setMode(snap.mode as Parameters<typeof setMode>[0]);
    if (theme.name !== snap.themeName) {
      const original = runtime.themes.find((t) => t.name === snap.themeName);
      if (original?.tokens) {
        runtime.update(original.tokens);
      }
    }
  }

  if (!override || dismissed) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="mb-2 flex items-center justify-between gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm"
    >
      <div className="flex items-center gap-2 min-w-0">
        <Icon icon="lucide:info" className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
        <span className="truncate font-medium text-amber-800 dark:text-amber-300">
          {override}
        </span>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <button
          type="button"
          onClick={reset}
          className="rounded-lg border border-amber-500/30 bg-amber-500/15 px-3 py-1 text-xs font-semibold text-amber-800 dark:text-amber-300 cursor-pointer hover:bg-amber-500/25 transition-colors"
        >
          Reset
        </button>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="Dismiss banner"
          title="Dismiss"
          className="rounded-lg border border-amber-500/30 bg-amber-500/15 p-1 text-amber-800 dark:text-amber-300 cursor-pointer hover:bg-amber-500/25 transition-colors"
        >
          <Icon icon="lucide:x" className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
