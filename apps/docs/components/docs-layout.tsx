"use client";

import { usePathname } from "next/navigation";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { DocsPagination } from "./docs-pagination";
import { Toc, TocInline } from "./toc";
import { Breadcrumbs } from "./breadcrumbs";
import { DocsNavTree } from "./docs-nav-tree";
import { collectTocItems } from "../lib/toc-tree";
import { buildPageHeadings, type TocItem } from "../lib/toc";
import { GENERATED_TOC_HEADINGS } from "../lib/generated/toc-headings";
import { useFocusTrap } from "./ui/use-focus-trap";
import { centerActiveSidebarLink } from "../lib/sidebar-scroll";
import { getActiveNavAncestorIds } from "../lib/docs-nav";
import {
  resolveDocsContentWidth,
  type DocsContentWidth,
} from "../lib/docs-content-width";
import { CodeLanguageProvider } from "./code-language";

const NAV_COLLAPSED_KEY = "tv-docs-nav-collapsed";

/**
 * Manual tree expansion survives client-side navigation (DocsLayout remounts
 * on every route change) but not a full reload. Persisting it across reloads
 * required a post-hydration restore, which visibly closed and re-opened groups
 * that the server had rendered in the active-route-only state. A module store
 * keeps the useful behavior without the hydration flicker; after a reload the
 * active route's ancestors are the stable first-paint state.
 */
const manualExpandedStore = new Set<string>();

function MenuIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      className="opacity-60"
      aria-hidden="true"
    >
      <path d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

function PanelIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="opacity-60"
      aria-hidden="true"
    >
      <rect x="3" y="4" width="18" height="16" rx="2.5" />
      <path d={open ? "M9 4v16M15 9l-3 3 3 3" : "M9 4v16M12 9l3 3-3 3"} />
    </svg>
  );
}

export function DocsLayout({
  children,
  headings,
  wide = false,
  contentWidth,
}: {
  children: ReactNode;
  /** Server-provided TOC items. Pages whose headings render inside (or
   * alongside) client components aren't visible to `collectTocItems` — RSC
   * serializes those subtrees as templates — so they pass their known
   * headings here to make the rail visible from the initial SSR HTML. The
   * client scan in `Toc` remains authoritative for the live list. */
  headings?: TocItem[];
  /**
   * Drop the "On this page" rail and give its column to the content.
   *
   * For product pages built around large screenshots, where the reading column
   * is the constraint and a rail of six anchors is not worth a third of the
   * width. Documentation pages keep the rail.
   */
  wide?: boolean;
  /**
   * Optional content-width override. Most pages should rely on the route
   * policy in `lib/docs-content-width.ts`; this is for a page whose shape
   * differs from the rest of its family.
   */
  contentWidth?: DocsContentWidth;
}) {
  const pathname = usePathname();
  const resolvedContentWidth =
    contentWidth ?? (wide ? "full" : resolveDocsContentWidth(pathname));
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [collapseReady, setCollapseReady] = useState(false);
  const [manualExpanded, setManualExpanded] = useState<Set<string>>(
    () => new Set(manualExpandedStore),
  );
  // Active ancestors are part of the effective state, never part of the
  // manual store. Navigating React → Vue therefore closes React's group unless
  // the reader opened it themselves.
  const activeAncestorIds = useMemo(
    () => getActiveNavAncestorIds(pathname),
    [pathname],
  );
  const expanded = useMemo(
    () => new Set([...manualExpanded, ...activeAncestorIds]),
    [manualExpanded, activeAncestorIds],
  );
  const asideRef = useRef<HTMLElement>(null);
  const drawerPanelRef = useRef<HTMLDivElement>(null);
  const expandButtonRef = useRef<HTMLButtonElement>(null);
  const navCollapseButtonRef = useRef<HTMLButtonElement>(null);

  // Desktop collapse is a preference, not a per-page state.
  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(NAV_COLLAPSED_KEY) === "1");
    } catch {
      /* private mode */
    }
    setCollapseReady(true);
  }, []);

  useEffect(() => {
    if (!collapseReady) return;
    try {
      localStorage.setItem(NAV_COLLAPSED_KEY, collapsed ? "1" : "0");
    } catch {
      /* private mode */
    }
  }, [collapsed, collapseReady]);

  // Publish the layout state on <body> so the fixed header can follow the docs
  // shell with a plain attribute selector. `body:has([data-docs-layout])` looks
  // equivalent and is not: `:has()` is re-evaluated on every DOM mutation, and a
  // client-side route change is thousands of them, so the header's width
  // transition was competing with that invalidation for its whole 240ms.
  //
  // A layout effect (not an effect) so the attribute is in place before the
  // first paint: the header would otherwise paint at `--site-shell-max` and
  // correct itself a frame later.
  useLayoutEffect(() => {
    const { body } = document;
    body.setAttribute("data-docs-layout", "");
    return () => {
      body.removeAttribute("data-docs-layout");
      body.removeAttribute("data-nav-collapsed");
    };
  }, []);

  useLayoutEffect(() => {
    document.body.setAttribute(
      "data-nav-collapsed",
      collapsed ? "true" : "false",
    );
  }, [collapsed]);

  // Enable the width transition only once the first paint has happened. On a
  // docs page the header's width is corrected before that paint (above), and
  // easing that correction would read as the header sliding open on every load.
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      document.body.setAttribute("data-shell-ready", "");
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  // Keep the rail on the current page's link. The layout is re-mounted on every
  // client navigation and the browser resets `scrollTop` to 0. Active ancestors
  // are part of the same render, so the link is already expanded when this runs.
  useLayoutEffect(() => {
    const rail = asideRef.current;
    if (!rail) return;

    const previousBehavior = rail.style.scrollBehavior;
    rail.style.scrollBehavior = "auto";
    centerActiveSidebarLink(rail);
    rail.style.scrollBehavior = previousBehavior;
  }, [pathname]);

  // The layout effect above runs before late layout settles (fonts, code
  // blocks). One frame later is enough to place the active link correctly.
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      if (asideRef.current) centerActiveSidebarLink(asideRef.current);
    });
    return () => cancelAnimationFrame(frame);
  }, [pathname]);

  const toggleExpanded = useCallback(
    (id: string) => {
      // An ancestor of the current page is always expanded. Pressing it is a
      // "take me back to where I am" action rather than a way to hide the page.
      if (activeAncestorIds.includes(id)) {
        if (asideRef.current) centerActiveSidebarLink(asideRef.current);
        if (open && drawerPanelRef.current) {
          centerActiveSidebarLink(drawerPanelRef.current);
        }
        return;
      }
      setManualExpanded((previous) => {
        const next = new Set(previous);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        manualExpandedStore.clear();
        for (const expandedId of next) manualExpandedStore.add(expandedId);
        return next;
      });
    },
    [activeAncestorIds, open],
  );

  const collapseNavigation = useCallback(() => {
    setCollapsed(true);
    // The restore button lives at the top of the article, so a plain `focus()`
    // scrolls the window to bring it into view — collapsing the rail while the
    // reader was halfway down a page threw them back to the top. Focus is for
    // keyboard continuity, not for navigation: keep the scroll position.
    requestAnimationFrame(() =>
      expandButtonRef.current?.focus({ preventScroll: true }),
    );
  }, []);

  const expandNavigation = useCallback(() => {
    setCollapsed(false);
    // Same reason: the collapse button sits at the top of the rail, and the
    // reader's own scroll position is not ours to change here.
    requestAnimationFrame(() =>
      navCollapseButtonRef.current?.focus({ preventScroll: true }),
    );
  }, []);

  const { tree, items: collectedItems } = useMemo(
    () => collectTocItems(children),
    [children],
  );

  // Three sources, most authoritative first:
  //
  //   1. `headings` — an explicit prop. A page knows its own headings exactly.
  //   2. `GENERATED_TOC_HEADINGS` — committed data for routes whose headings
  //      come from client components (and, on markdown pages, from a body the
  //      walk cannot descend into).
  //   3. `collectedItems` — the render-tree walk, correct only for pages whose
  //      headings are all literal host elements.
  const generated = GENERATED_TOC_HEADINGS[pathname];
  const items =
    headings ?? (generated ? buildPageHeadings(generated) : collectedItems);

  const [hasToc, setHasToc] = useState(() => items.length >= 2);

  useFocusTrap(drawerPanelRef, open);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => {
        drawerPanelRef.current?.focus({ preventScroll: true });
      });
    }
  }, [open]);

  // Opening the drawer should answer "where am I?" first. Center the active
  // link instead of restoring the drawer's previous offset, which could hide
  // the very page the reader is on.
  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => {
      if (drawerPanelRef.current)
        centerActiveSidebarLink(drawerPanelRef.current);
    });
    return () => cancelAnimationFrame(frame);
  }, [open]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    if (open) window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const gridClass = [
    "docs-grid",
    wide ? "docs-grid-wide" : hasToc ? "" : "docs-grid-no-toc",
    collapsed ? "docs-grid-collapsed" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    // One language choice per page: every paired code block inside the article
    // reads the same preference, so switching the provider example also switches
    // the toggle that consumes it.
    <CodeLanguageProvider>
      <div className="docs-bg" aria-hidden />
      <div
        className="docs-shell"
        data-docs-layout
        data-nav-collapsed={collapsed ? "true" : "false"}
      >
        <div className={gridClass} data-content-width={resolvedContentWidth}>
          {/* A dedicated navigation surface: sticky below the global header,
              independently scrollable, with its own persistent header. The
              `data-docs-sidebar` hook is also the scroll container the pre-paint
              script and `centerActiveSidebarLink` target. */}
          <nav
            id="docs-nav-panel"
            ref={asideRef}
            aria-label="Documentation"
            data-docs-sidebar
            data-doc-nav
            className={`docs-nav-panel ${collapsed ? "docs-nav-panel-collapsed" : ""}`}
          >
            <div className="docs-nav-head">
              <div className="min-w-0">
                <p className="text-[13px] font-semibold tracking-tight">
                  Documentation
                </p>
                <p className="mt-0.5 text-[11px] text-foreground/50">
                  Guides, packages &amp; reference
                </p>
              </div>
              <button
                ref={navCollapseButtonRef}
                type="button"
                onClick={collapseNavigation}
                aria-controls="docs-nav-panel"
                aria-expanded={!collapsed}
                aria-label="Collapse documentation navigation"
                title="Collapse documentation navigation"
                className="docs-nav-collapse-toggle"
              >
                <PanelIcon open />
              </button>
            </div>
            <div className="docs-nav-scroll">
              <DocsNavTree
                pathname={pathname}
                expanded={expanded}
                onToggle={toggleExpanded}
                idPrefix="desktop"
              />
            </div>
          </nav>

          <div className="docs-article min-w-0">
            <div className="docs-article-controls flex items-center gap-2 lg:hidden">
              <button
                type="button"
                onClick={() => setOpen(true)}
                aria-haspopup="dialog"
                aria-expanded={open}
                aria-controls="docs-drawer"
                aria-label="Open documentation navigation"
                className="docs-nav-trigger"
              >
                <MenuIcon />
                Documentation
              </button>
            </div>

            {/* Mounted in both states: inserting this row only when collapsed
                changed the article's child set during the same commit, which
                React DevTools' virtual-child instrumentation treated as an
                inconsistent tree. Display, not presence, tracks the state. */}
            <div
              className={`docs-article-controls hidden items-center gap-2 ${
                collapsed ? "lg:flex" : ""
              }`}
            >
              <button
                ref={expandButtonRef}
                type="button"
                onClick={expandNavigation}
                aria-controls="docs-nav-panel"
                aria-expanded={false}
                aria-label="Show documentation navigation"
                title="Show documentation navigation"
                className="docs-nav-restore"
              >
                <span className="docs-nav-restore-icon">
                  <PanelIcon open={false} />
                </span>
                <span className="docs-nav-restore-text">
                  <span className="text-[13px] font-semibold tracking-tight">
                    Documentation
                  </span>
                  <span className="text-[11px] text-foreground/50">
                    Show navigation
                  </span>
                </span>
                <svg
                  width="11"
                  height="11"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                  className="ml-1 opacity-45"
                >
                  <path d="m9 18 6-6-6-6" />
                </svg>
              </button>
            </div>

            <div data-toc-root className="min-w-0">
              <Breadcrumbs />
              {wide ? null : (
                <TocInline initialItems={items} onHasToc={setHasToc} />
              )}
              {tree}

              <DocsPagination />
            </div>
          </div>

          {wide ? null : (
            <div
              data-toc-rail
              className="docs-toc-column docs-toc-rail"
              style={{ display: hasToc ? undefined : "none" }}
            >
              <Toc initialItems={items} onHasToc={setHasToc} />
            </div>
          )}
        </div>
      </div>

      <div
        id="docs-drawer"
        inert={!open}
        className={`fixed inset-0 z-90 lg:hidden ${
          open ? "" : "pointer-events-none"
        }`}
        aria-hidden={!open}
      >
        <div
          className={`absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300 ${
            open ? "opacity-100" : "opacity-0"
          }`}
          onClick={() => setOpen(false)}
          aria-hidden
        />
        <div
          ref={drawerPanelRef}
          role="dialog"
          aria-modal="true"
          aria-label="Documentation navigation"
          tabIndex={open ? -1 : undefined}
          className={`docs-drawer-panel absolute inset-y-0 left-0 w-76 max-w-[88vw] bg-background/98 backdrop-blur-xl border-r border-border overflow-y-auto transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
            open ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex items-center justify-between px-4 py-4 border-b border-border sticky top-0 bg-background/95 backdrop-blur z-150">
            <div className="min-w-0">
              <p className="text-[13px] font-semibold tracking-tight">
                Documentation
              </p>
              <p className="mt-0.5 text-[11px] text-foreground/50">
                Guides, packages &amp; reference
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close documentation navigation"
              className="w-8 h-8 shrink-0 grid place-items-center rounded-md border border-border cursor-pointer hover:bg-muted"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                aria-hidden="true"
              >
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>
          <div className="docs-drawer-tree">
            <DocsNavTree
              pathname={pathname}
              expanded={expanded}
              onToggle={toggleExpanded}
              onNavigate={() => setOpen(false)}
              idPrefix="drawer"
            />
          </div>
        </div>
      </div>
    </CodeLanguageProvider>
  );
}
