"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import type { SearchEntry } from "../lib/search";
import {
  apiSymbol,
  buildSearchPresentation,
  type ApiKind,
  type SearchLeaf,
  type SearchSymbolGroup,
} from "../lib/search-groups";
import { useFocusTrap } from "./ui/use-focus-trap";

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * API-style punctuation should not decide whether a symbol is found.
 *
 * `useTheme()` and `useTheme` document the same symbol; the query keeps its
 * punctuation for display, but matching works on the identifier.
 */
function normalizeQueryToken(token: string): string {
  return token
    .replace(/\(\)$/, "")
    .replace(/[`"'.,;:!?]+$/, "")
    .trim();
}

function queryTokens(query: string): string[] {
  return [
    ...new Set(
      query
        .trim()
        .toLowerCase()
        .split(/\s+/)
        .map(normalizeQueryToken)
        .filter(Boolean),
    ),
  ];
}

/** Highlight every query token in a string, not just the whole query. */
function highlight(text: string, query: string): React.ReactNode {
  const tokens = queryTokens(query);

  if (tokens.length === 0) return text;

  const pattern = tokens
    .sort((a, b) => b.length - a.length)
    .map(escapeRegExp)
    .join("|");
  const parts = text.split(new RegExp(`(${pattern})`, "ig"));

  return parts.map((part, index) =>
    tokens.includes(part.toLowerCase()) ? (
      <mark
        key={index}
        className="rounded-sm bg-transparent font-semibold"
        style={{ color: "var(--theme-color-primary)" }}
      >
        {part}
      </mark>
    ) : (
      part
    ),
  );
}

const KIND_CLASS: Record<ApiKind, string> = {
  Hook: "text-foreground/55",
  Function: "text-foreground/55",
  Component: "text-foreground/55",
  Type: "text-foreground/45",
  Class: "text-foreground/45",
};

function KindBadge({ kind }: { kind: ApiKind }) {
  return (
    <span
      className={`shrink-0 rounded border border-border px-1.5 py-px text-[9px] font-semibold uppercase tracking-[0.08em] ${KIND_CLASS[kind]}`}
    >
      {kind}
    </span>
  );
}

function Breadcrumb({ parts }: { parts: string[] }) {
  return (
    <span className="flex min-w-0 flex-wrap items-center gap-x-1 gap-y-0.5 text-[10.5px] leading-tight text-foreground/40">
      {parts.map((part, index) => (
        <span key={`${part}-${index}`} className="flex items-center gap-1">
          {index > 0 ? (
            <span aria-hidden="true" className="text-foreground/25">
              /
            </span>
          ) : null}
          <span className={index === parts.length - 1 ? "text-foreground/55" : ""}>
            {part}
          </span>
        </span>
      ))}
    </span>
  );
}

function Chevron() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="shrink-0"
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

/** The framework/subpath identity that distinguishes one API variant from another. */
function variantIdentity(leaf: SearchLeaf): string {
  const base =
    leaf.framework ??
    leaf.breadcrumb[leaf.breadcrumb.length - 1] ??
    leaf.title;
  const last = leaf.breadcrumb[leaf.breadcrumb.length - 1];

  return last && last !== base && leaf.breadcrumb.length > 2
    ? `${base} / ${last}`
    : base;
}

function ResultRow({
  leaf,
  query,
  active,
  onActivate,
  onOpen,
}: {
  leaf: SearchLeaf;
  query: string;
  active: boolean;
  onActivate: (position: number) => void;
  onOpen: (position: number) => void;
}) {
  const primary = leaf.grouped ? variantIdentity(leaf) : leaf.title;
  const packageLabel =
    leaf.package && leaf.package !== leaf.title && leaf.package !== leaf.framework
      ? leaf.package
      : undefined;
  const signature =
    leaf.signature &&
    leaf.signature !== leaf.symbol &&
    leaf.signature !== leaf.title
      ? leaf.signature
      : undefined;
  const excerptLines = leaf.grouped ? "line-clamp-1" : "line-clamp-2";

  return (
    <button
      id={leaf.id}
      type="button"
      role="option"
      tabIndex={-1}
      aria-selected={active}
      data-index={leaf.position}
      data-route={leaf.entry.route}
      onMouseEnter={() => onActivate(leaf.position)}
      onClick={() => onOpen(leaf.position)}
      className={`group/result flex w-full cursor-pointer flex-col items-start gap-0.5 rounded-lg border-l-2 px-3 py-2 text-left transition-colors motion-reduce:transition-none ${
        leaf.grouped ? "ml-1.5 pl-4" : ""
      } ${
        active
          ? "border-[var(--docs-accent)] bg-[color-mix(in_srgb,var(--docs-accent)_10%,transparent)]"
          : "border-transparent hover:bg-muted/60"
      }`}
    >
      <span className="flex min-w-0 w-full items-center gap-2">
        <span className="min-w-0 truncate text-[13px] font-semibold leading-snug">
          {highlight(primary, query)}
        </span>

        {leaf.kind && !leaf.grouped ? <KindBadge kind={leaf.kind} /> : null}

        {packageLabel ? (
          <span className="ml-auto hidden shrink-0 mono text-[9.5px] text-foreground/35 sm:inline">
            {packageLabel}
          </span>
        ) : null}

        <span
          className={`ml-auto shrink-0 sm:ml-1 ${
            active ? "opacity-60" : "opacity-0 group-hover/result:opacity-35"
          }`}
        >
          <Chevron />
        </span>
      </span>

      <Breadcrumb parts={leaf.breadcrumb} />

      {signature ? (
        <span className="line-clamp-1 w-full mono text-[10px] leading-snug text-foreground/40">
          {highlight(signature, query)}
        </span>
      ) : null}

      {leaf.excerpt ? (
        <span
          className={`${excerptLines} w-full text-[11.5px] leading-snug text-foreground/50`}
        >
          {highlight(leaf.excerpt, query)}
        </span>
      ) : null}
    </button>
  );
}

const POPULAR_LINKS = [
  { href: "/quick-start", label: "Quick Start" },
  { href: "/custom-themes", label: "Custom Themes" },
  { href: "/framework-guides", label: "Framework Guides" },
  { href: "/api-reference", label: "API Reference" },
];

interface SearchContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const SearchContext = createContext<SearchContextValue | null>(null);

export const useSearch = () => {
  const ctx = useContext(SearchContext);

  if (!ctx) {
    throw new Error("useSearch must be used within a SearchProvider");
  }

  return ctx;
};

function useIsMac(): boolean {
  const [isMac] = useState(
    () =>
      typeof navigator !== "undefined" &&
      /Mac|iP(hone|ad|od)/.test(navigator.userAgent),
  );
  return isMac;
}

export function SearchButton() {
  const { open, setOpen } = useSearch();
  const isMac = useIsMac();

  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      aria-haspopup="dialog"
      aria-expanded={open}
      aria-controls="search-dialog"
      aria-label="Search documentation"
      className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-2 text-sm font-medium cursor-pointer transition-shadow hover:border-ring hover:shadow-sm"
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="opacity-60"
        aria-hidden="true"
      >
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.3-4.3" />
      </svg>

      <kbd className="hidden md:inline mono w-fit whitespace-nowrap rounded-xs border border-border bg-muted/20 px-1.5 py-0.5 text-[10px] text-foreground/50 dark:bg-muted">
        {isMac ? "⌘ K" : "Ctrl K"}
      </kbd>
    </button>
  );
}

/**
 * Singleton search index loader.
 *
 * Fetches the search index JSON asset on first request, caches it in memory,
 * and deduplicates concurrent requests. Failed requests can be retried and
 * do not permanently cache the failure.
 */
class SearchIndexLoader {
  private cache: SearchEntry[] | null = null;
  private pending: Promise<SearchEntry[]> | null = null;

  async load(): Promise<SearchEntry[]> {
    if (this.cache) {
      return this.cache;
    }

    if (this.pending) {
      return this.pending;
    }

    this.pending = fetch("/search-index.json")
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Failed to load search index: ${res.status}`);
        }
        return res.json();
      })
      .then((data: SearchEntry[]) => {
        this.cache = data;
        this.pending = null;
        return data;
      })
      .catch((err) => {
        this.pending = null;
        throw err;
      });

    return this.pending;
  }

  _clearCache() {
    this.cache = null;
    this.pending = null;
  }
}

const loader = new SearchIndexLoader();

function PopularLinks({ onNavigate }: { onNavigate: () => void }) {
  return (
    <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs">
      {POPULAR_LINKS.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          onClick={onNavigate}
          className="rounded-full border border-border px-3 py-1 font-medium no-underline transition-colors hover:border-ring hover:text-foreground"
        >
          {link.label}
        </Link>
      ))}
    </div>
  );
}

export function SearchProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [entries, setEntries] = useState<SearchEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useFocusTrap(panelRef, open);

  useEffect(() => {
    // `error` is part of the guard: without it, clearing `loading` on failure
    // re-runs this effect immediately and the dialog loops through
    // loading → error → loading instead of showing the retry state.
    if (!open || entries.length > 0 || loading || error) return;

    setLoading(true);
    setError(null);

    loader
      .load()
      .then((data) => {
        setEntries(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || "Failed to load search index");
        setLoading(false);
      });
  }, [open, entries.length, loading, error]);

  const results = useMemo(() => {
    const q = query.trim();

    if (!q) {
      return entries.slice(0, 8);
    }

    const tokens = q
      .toLowerCase()
      .split(/\s+/)
      .map(normalizeQueryToken)
      .filter(Boolean);
    const full = tokens.join(" ");

    const scored = entries
      .map((entry) => {
        const title = entry.title.toLowerCase();
        const text = entry.text.toLowerCase();
        const route = entry.route.toLowerCase();

        let score = 0;

        for (const token of tokens) {
          if (title.includes(token)) {
            score += 10;
            if (new RegExp(`\\b${escapeRegExp(token)}`).test(title)) score += 4;
            if (title.startsWith(token)) score += 2;
          }
          if (text.includes(token)) score += 3;
          if (route.includes(token)) score += 2;
        }

        if (title === full) score += 20;
        else if (title.startsWith(full)) score += 8;
        else if (title.includes(full)) score += 3;

        // API titles carry the full signature, so a shorter prefix match
        // (`useThemeFamily`) otherwise beats the exact symbol (`useTheme`).
        // Matching the normalized symbol keeps `useTheme()` on `useTheme`.
        if (entry.type === "api") {
          const symbol = apiSymbol(entry.title).toLowerCase();
          if (symbol === full || tokens.includes(symbol)) score += 30;
        }

        return { entry, score };
      })
      .filter((result) => result.score > 0)
      .sort(
        (a, b) =>
          b.score - a.score || a.entry.title.length - b.entry.title.length,
      )
      .slice(0, 10);

    return scored.map((result) => result.entry);
  }, [query, entries]);

  const presentation = useMemo(() => {
    if (!query.trim() || loading || error || results.length === 0) return null;
    return buildSearchPresentation(results);
  }, [query, results, loading, error]);

  const leaves = presentation?.leaves ?? [];
  const categories = presentation?.categories ?? [];
  const activeLeaf = leaves[active];
  const hasResults = leaves.length > 0;

  useEffect(() => {
    if (active < leaves.length) return;
    setActive(leaves.length > 0 ? leaves.length - 1 : 0);
  }, [active, leaves.length]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((value) => !value);
        return;
      }

      if (e.key === "Escape") {
        setOpen(false);
      }
    };

    window.addEventListener("keydown", onKey);

    return () => {
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActive(0);
      document.body.style.overflow = "hidden";

      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!activeLeaf) return;

    requestAnimationFrame(() => {
      const element = listRef.current?.querySelector<HTMLElement>(
        `#${activeLeaf.id}`,
      );
      element?.scrollIntoView({ block: "nearest" });
    });
  }, [activeLeaf]);

  function go(position: number) {
    const leaf = leaves[position];

    if (!leaf) return;

    router.push(leaf.entry.route);
    setOpen(false);
  }

  function retry() {
    loader._clearCache();
    setError(null);
    setLoading(true);
    loader
      .load()
      .then((data) => {
        setEntries(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || "Failed to load search index");
        setLoading(false);
      });
  }

  function clearQuery() {
    setQuery("");
    setActive(0);
    inputRef.current?.focus();
  }

  return (
    <SearchContext.Provider value={{ open, setOpen }}>
      {children}

      <div
        className={`fixed inset-0 z-60 transition-opacity duration-200 motion-reduce:transition-none ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        aria-hidden="true"
        style={{
          background:
            "color-mix(in srgb, var(--theme-color-background) 65%, transparent)",
          backdropFilter: "blur(3px) saturate(160%)",
          WebkitBackdropFilter: "blur(3px) saturate(160%)",
        }}
      />

      <div
        inert={!open}
        onClick={() => setOpen(false)}
        className={`fixed inset-0 z-100 flex items-start justify-center px-2 pt-2 sm:px-4 sm:pt-[10vh] ${
          open ? "" : "pointer-events-none"
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="Search documentation"
      >
        <div
          ref={panelRef}
          id="search-dialog"
          className={`relative flex max-h-[calc(100dvh-1rem)] w-full max-w-[760px] flex-col overflow-hidden rounded-xl border border-border bg-background shadow-2xl transition-all duration-200 ease-out motion-reduce:transition-none sm:max-h-[min(75vh,680px)] sm:rounded-2xl ${
            open
              ? "translate-y-0 scale-100 opacity-100"
              : "translate-y-2 scale-[0.98] opacity-0"
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="search-input-wrap flex shrink-0 items-center gap-3 border-b border-border px-4 py-3 transition-colors duration-200 sm:px-5">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="shrink-0 opacity-50"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>

            <input
              ref={inputRef}
              value={query}
              className="search-dialog-input min-w-0 flex-1 bg-transparent py-1 text-[15px] outline-none placeholder:text-foreground/40"
              role="combobox"
              aria-label="Search documentation"
              aria-autocomplete="list"
              aria-haspopup="listbox"
              aria-expanded={open && hasResults}
              aria-controls={hasResults ? "search-results" : undefined}
              aria-activedescendant={activeLeaf?.id}
              aria-busy={loading}
              onChange={(e) => {
                setQuery(e.target.value);
                setActive(0);
              }}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") {
                  e.preventDefault();

                  if (leaves.length > 0) {
                    setActive((current) =>
                      Math.min(leaves.length - 1, current + 1),
                    );
                  }
                } else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setActive((current) => Math.max(0, current - 1));
                } else if (e.key === "Enter") {
                  e.preventDefault();
                  go(active);
                }
              }}
              placeholder="Search docs, APIs, packages…"
              autoComplete="off"
              spellCheck={false}
            />

            <div className="flex shrink-0 items-center gap-1.5">
              {query ? (
                <button
                  type="button"
                  onClick={clearQuery}
                  aria-label="Clear search"
                  className="inline-flex h-6 w-6 items-center justify-center rounded-full text-foreground/40 transition-colors hover:bg-muted hover:text-foreground"
                >
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M6 6 L18 18 M18 6 L6 18" />
                  </svg>
                </button>
              ) : null}

              <kbd
                className="mono hidden cursor-pointer rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] text-foreground/50 md:inline"
                onClick={() => setOpen(false)}
              >
                esc
              </kbd>

              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close search"
                className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border bg-muted/20 text-foreground/60 transition-colors hover:border-ring hover:text-foreground md:hidden"
              >
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M6 6 L18 18 M18 6 L6 18" />
                </svg>
              </button>
            </div>
          </div>

          <div
            ref={listRef}
            className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2 sm:p-3"
          >
            <p className="sr-only" role="status" aria-live="polite">
              {loading
                ? "Loading search index"
                : error
                  ? "Search index failed to load"
                  : query.trim()
                    ? `${leaves.length} result${leaves.length === 1 ? "" : "s"}`
                    : ""}
            </p>

            {loading ? (
              <div className="px-4 py-10 text-center">
                <div className="mx-auto mb-3 h-6 w-6 animate-spin rounded-full border-2 border-border border-t-foreground/50 motion-reduce:animate-none" />
                <p className="text-sm opacity-50">Loading search index…</p>
                <p className="mt-1 text-[11px] opacity-35">
                  You can keep typing while it loads.
                </p>
              </div>
            ) : error ? (
              <div className="px-4 py-10 text-center">
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="mx-auto mb-2 opacity-30"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <p className="mb-3 text-sm opacity-50">{error}</p>
                <button
                  type="button"
                  onClick={retry}
                  className="rounded-full border border-border bg-muted/20 px-4 py-1.5 text-xs font-medium transition-colors hover:border-ring hover:text-foreground"
                >
                  Retry
                </button>
              </div>
            ) : !query.trim() ? (
              <div className="px-4 py-10 text-center">
                <p className="text-sm font-medium">
                  Search the Themvora documentation
                </p>
                <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed opacity-50">
                  Find API symbols, framework guides, examples, packages, and
                  core concepts.
                </p>
                <PopularLinks onNavigate={() => setOpen(false)} />
              </div>
            ) : leaves.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="mx-auto mb-2 opacity-30"
                  aria-hidden="true"
                >
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.3-4.3" />
                </svg>
                <p className="text-sm opacity-50">
                  No results for &ldquo;{query}&rdquo;
                </p>
                <p className="mt-1 text-[11px] opacity-40">
                  Try an API symbol, a package name, or a broader term.
                </p>
                <PopularLinks onNavigate={() => setOpen(false)} />
              </div>
            ) : (
              <div
                id="search-results"
                role="listbox"
                aria-label="Search results"
                className="flex flex-col gap-0.5"
              >
                {categories.map((category) => (
                  <div
                    key={category.id}
                    role="group"
                    aria-label={category.label}
                  >
                    <div className="-mx-2 flex items-baseline justify-between gap-3 px-4 pb-1.5 pt-3 sm:-mx-3 sm:px-5">
                      <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-foreground/45">
                        {category.label}
                      </span>
                      <span className="shrink-0 mono text-[10px] text-foreground/30">
                        {category.count}
                      </span>
                    </div>

                    {category.symbols ? (
                      <div className="flex flex-col gap-0.5">
                        {category.symbols.map((group, groupIndex) => (
                          <SymbolGroup
                            key={`${category.id}-${group.symbol}-${group.kind ?? "api"}`}
                            group={group}
                            query={query}
                            active={active}
                            onActivate={setActive}
                            onOpen={go}
                            groupIndex={groupIndex}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col gap-0.5">
                        {(category.leaves ?? []).map((leaf) => (
                          <ResultRow
                            key={leaf.resultIndex}
                            leaf={leaf}
                            query={query}
                            active={leaf.position === active}
                            onActivate={setActive}
                            onOpen={go}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex shrink-0 items-center justify-between gap-2 border-t border-border px-4 py-2 text-[11px] text-foreground/40 sm:px-5">
            <span className="hidden items-center gap-3 sm:flex">
              <kbd className="mono rounded border border-border bg-muted px-1.5 py-0.5">
                ↑↓
              </kbd>
              <span>navigate</span>

              <kbd className="mono rounded border border-border bg-muted px-1.5 py-0.5">
                ↵
              </kbd>
              <span>open</span>
            </span>

            <span className="mono text-[10px] text-foreground/35">
              {query.trim() && hasResults
                ? `${leaves.length} result${leaves.length === 1 ? "" : "s"}`
                : ""}
            </span>

            <span className="hidden sm:inline">esc to close</span>
          </div>
        </div>
      </div>
    </SearchContext.Provider>
  );
}

function SymbolGroup({
  group,
  query,
  active,
  onActivate,
  onOpen,
  groupIndex,
}: {
  group: SearchSymbolGroup;
  query: string;
  active: number;
  onActivate: (position: number) => void;
  onOpen: (position: number) => void;
  groupIndex: number;
}) {
  const isGroup = group.variants.length > 1;
  const symbolLabel =
    group.kind === "Hook" || group.kind === "Function"
      ? `${group.symbol}()`
      : group.symbol;

  if (!isGroup) {
    const leaf = group.variants[0]!;
    return (
      <ResultRow
        leaf={leaf}
        query={query}
        active={leaf.position === active}
        onActivate={onActivate}
        onOpen={onOpen}
      />
    );
  }

  return (
    <div
      role="group"
      aria-label={`${symbolLabel}${group.kind ? `, ${group.kind}` : ""}, ${group.variants.length} variants`}
      className="flex flex-col gap-0.5"
    >
      <div
        key={`symbol-heading-${groupIndex}`}
        className="flex items-baseline justify-between gap-3 px-3 pb-0.5 pt-2.5"
      >
        <span className="flex min-w-0 items-baseline gap-2">
          <span className="truncate text-[12px] font-semibold leading-snug text-foreground/80">
            {highlight(symbolLabel, query)}
          </span>
          {group.kind ? <KindBadge kind={group.kind} /> : null}
        </span>
        <span className="shrink-0 text-[10px] text-foreground/35">
          {group.variants.length} variants
        </span>
      </div>

      {group.variants.map((leaf) => (
        <ResultRow
          key={leaf.resultIndex}
          leaf={leaf}
          query={query}
          active={leaf.position === active}
          onActivate={onActivate}
          onOpen={onOpen}
        />
      ))}
    </div>
  );
}
