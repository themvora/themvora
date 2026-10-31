"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ThemeScope, useTheme, useThemeRuntime } from "@themvora/next/client";
import { measureThemeContrast } from "@themvora/core";
import type { ThemeDefinition } from "@themvora/core";

type PreviewMode = "light" | "dark";

interface PresetGroup {
  family: string;
  label: string;
  style?: string | undefined;
  tags?: string[] | undefined;
  light?: ThemeDefinition | undefined;
  dark?: ThemeDefinition | undefined;
}

const HIDDEN_FAMILIES = new Set(["lab", "scope"]);

const MODES: readonly PreviewMode[] = ["light", "dark"];

const STYLE_FILTERS = [
  { value: "balanced", label: "Balanced" },
  { value: "soft", label: "Soft" },
  { value: "vibrant", label: "Vibrant" },
  { value: "editorial", label: "Editorial" },
  { value: "minimal", label: "Minimal" },
  { value: "brand", label: "Brand" },
];

const FAVORITES_KEY = "themvora-favorites";

function loadFavorites(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const stored = localStorage.getItem(FAVORITES_KEY);
    return stored ? new Set(JSON.parse(stored)) : new Set();
  } catch {
    return new Set();
  }
}

function saveFavorites(favorites: Set<string>) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify([...favorites]));
  } catch {}
}

function modeOf(theme: ThemeDefinition): PreviewMode {
  return theme.meta?.mode === "dark" ? "dark" : "light";
}

function colorOf(
  theme: ThemeDefinition | undefined,
  token: string,
): string | undefined {
  const value = theme?.tokens?.colors?.[token];
  return typeof value === "string" ? value : undefined;
}

function getContrastRatio(theme: ThemeDefinition | undefined): number | null {
  if (!theme) return null;
  const pairs = measureThemeContrast(theme);
  const fgBg = pairs.find((p) => p.foreground === "foreground" && p.background === "background");
  return fgBg?.ratio ?? null;
}

function groupByFamily(themes: readonly ThemeDefinition[]): PresetGroup[] {
  const groups = new Map<string, PresetGroup>();

  for (const theme of themes) {
    const family = theme.meta?.family;
    if (!family || HIDDEN_FAMILIES.has(family)) continue;

    let group = groups.get(family);
    if (!group) {
      const created: PresetGroup = {
        family,
        label: theme.meta?.label?.replace(/\s+(Light|Dark)$/i, "") ?? family,
        style: theme.meta?.generation?.style,
        tags: theme.meta?.tags,
        light: undefined,
        dark: undefined,
      };
      groups.set(family, created);
      group = created;
    }

    if (modeOf(theme) === "dark") {
      group.dark ??= theme;
    } else {
      group.light ??= theme;
    }
  }

  return [...groups.values()].filter((group) => group.light || group.dark);
}

function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(" ");
}

export function PresetCards() {
  const runtime = useThemeRuntime();
  const { theme, family, mode, setFamily, setMode } = useTheme();

  const groups = useMemo(() => groupByFamily(runtime.themes), [runtime.themes]);

  const siteMode: PreviewMode = theme?.meta?.mode === "dark" ? "dark" : "light";

  const [previewModes, setPreviewModes] = useState<Record<string, PreviewMode>>(
    {},
  );
  const [search, setSearch] = useState("");
  const [activeStyleFilter, setActiveStyleFilter] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<Set<string>>(() => loadFavorites());
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  const previewModeOf = (group: PresetGroup): PreviewMode =>
    previewModes[group.family] ?? siteMode;

  const setPreviewMode = (group: PresetGroup, value: PreviewMode) => {
    setPreviewModes((prev) => ({ ...prev, [group.family]: value }));
  };

  const toggleFavorite = useCallback((groupFamily: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(groupFamily)) {
        next.delete(groupFamily);
      } else {
        next.add(groupFamily);
      }
      saveFavorites(next);
      return next;
    });
  }, []);

  const filtered = useMemo(() => {
    let result = groups;

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (g) =>
          g.label.toLowerCase().includes(q) ||
          g.family.toLowerCase().includes(q) ||
          g.tags?.some((t) => t.toLowerCase().includes(q)),
      );
    }

    if (activeStyleFilter) {
      result = result.filter((g) => g.style === activeStyleFilter);
    }

    if (showFavoritesOnly) {
      result = result.filter((g) => favorites.has(g.family));
    }

    const active = result.filter((g) => g.family === family);
    const rest = result.filter((g) => g.family !== family);
    return [...active, ...rest];
  }, [groups, search, activeStyleFilter, showFavoritesOnly, favorites, family]);

  useEffect(() => {
    saveFavorites(favorites);
  }, [favorites]);

  return (
    <section
      id="presets"
      className="scroll-mt-24 rounded-xl border border-border bg-card p-5 sm:p-6"
      aria-label="Theme preset cards"
    >
      <div className="mb-4">
        <h2 className="font-semibold">Theme presets</h2>
        <p className="max-w-2xl text-xs opacity-60">
          Compact grid of every preset family. Search, filter by style, or mark
          favorites. Each card previews its own family with a local light/dark
          toggle — Apply switches the whole site to that preview.
        </p>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="mono text-[11px] uppercase tracking-widest opacity-50">
          Site mode
        </span>
        {(["light", "dark", "system"] as const).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setMode(value)}
            aria-pressed={mode === value}
            className={`chip ${mode === value ? "chip-active" : ""}`}
          >
            {value}
          </button>
        ))}
      </div>

      <div className="mb-4 flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search presets..."
              className="w-full rounded-lg border-2 border-border bg-muted px-3 py-2 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-xs opacity-50 hover:opacity-100"
                aria-label="Clear search"
              >
                ✕
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() => setShowFavoritesOnly((v) => !v)}
            aria-pressed={showFavoritesOnly}
            className={cn(
              "rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
              showFavoritesOnly
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-muted hover:bg-muted/80",
            )}
            title="Show favorites only"
          >
            {showFavoritesOnly ? "★" : "☆"}
          </button>
        </div>

        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setActiveStyleFilter(null)}
            className={cn(
              "rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
              !activeStyleFilter
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80",
            )}
          >
            All
          </button>
          {STYLE_FILTERS.map((s) => (
            <button
              key={s.value}
              type="button"
              onClick={() =>
                setActiveStyleFilter(
                  activeStyleFilter === s.value ? null : s.value,
                )
              }
              className={cn(
                "rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
                activeStyleFilter === s.value
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80",
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filtered.map((group) => {
          const isActive = family === group.family;
          const previewMode = previewModeOf(group);
          const previewTheme =
            previewMode === "dark"
              ? (group.dark ?? group.light)
              : (group.light ?? group.dark);
          if (!previewTheme) return null;

          const applied = isActive && siteMode === previewMode;
          const isFavorite = favorites.has(group.family);
          const contrast = getContrastRatio(previewTheme);

          return (
            <ThemeScope
              key={group.family}
              theme={String(previewTheme.name)}
              transition={false}
              className={cn(
                "group relative flex flex-col rounded-lg border border-border bg-card p-3 text-card-foreground transition-all",
                isActive && "ring-2 ring-primary",
                !isActive && "hover:shadow-md",
              )}
            >
              <div className="mb-2 flex items-center justify-between gap-1">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs font-semibold">
                    {group.label}
                  </div>
                  <div className="mono truncate text-[9px] opacity-50">
                    {group.family}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => toggleFavorite(group.family)}
                  className="shrink-0 text-sm opacity-60 hover:opacity-100 transition-opacity"
                  aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
                  aria-pressed={isFavorite}
                >
                  {isFavorite ? "★" : "☆"}
                </button>
              </div>

              <div className="mb-2 flex items-center gap-1">
                {["primary", "secondary", "accent", "muted"].map((token) => (
                  <div
                    key={token}
                    className={cn(
                      "h-4 w-4 rounded-full border border-border",
                      token === "primary" && "bg-primary",
                      token === "secondary" && "bg-secondary",
                      token === "accent" && "bg-accent",
                      token === "muted" && "bg-muted",
                    )}
                    title={`${token}: ${colorOf(previewTheme, token) ?? "—"}`}
                  />
                ))}
                {contrast !== null && (
                  <span
                    className={cn(
                      "ml-auto mono text-[9px] rounded px-1 py-0.5",
                      contrast >= 7
                        ? "bg-green-500/15 text-green-600 dark:text-green-400"
                        : contrast >= 4.5
                          ? "bg-blue-500/15 text-blue-600 dark:text-blue-400"
                          : "bg-amber-500/15 text-amber-600 dark:text-amber-400",
                    )}
                    title={`Contrast ratio: ${contrast.toFixed(2)}:1`}
                  >
                    {contrast.toFixed(1)}
                  </span>
                )}
              </div>

              <div
                role="group"
                aria-label={`${group.label} preview mode`}
                className="mb-2 flex gap-0.5 rounded-md bg-muted p-0.5"
              >
                {MODES.map((value) => {
                  const unavailable = value === "dark" && !group.dark;
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setPreviewMode(group, value)}
                      aria-pressed={previewMode === value}
                      disabled={unavailable}
                      className={cn(
                        "flex-1 rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider transition-colors",
                        previewMode === value
                          ? "bg-secondary-foreground/30 text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground",
                        unavailable && "cursor-not-allowed opacity-40",
                        !unavailable && "cursor-pointer",
                      )}
                    >
                      {value}
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => {
                  setFamily(group.family);
                  setMode(previewMode);
                }}
                disabled={applied}
                className={cn(
                  "w-full rounded-md px-2 py-1.5 text-[10px] font-semibold transition-all",
                  applied
                    ? "bg-muted text-muted-foreground cursor-not-allowed"
                    : "bg-primary text-primary-foreground cursor-pointer hover:opacity-90",
                )}
              >
                {applied ? "Applied" : "Apply"}
              </button>
            </ThemeScope>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="py-8 text-center text-sm opacity-50">
          No presets match your filters.
        </div>
      )}
    </section>
  );
}
