"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type RefObject,
} from "react";

import { resolveHeadingId, stripNumberPrefix, type TocItem } from "../lib/toc";

/**
 * Authoritative heading scan shared by the desktop rail and the mobile
 * disclosure.
 *
 * Both instances scan `[data-toc-root]`; id allocation is idempotent (a heading
 * that already carries an id keeps it), so mounting two copies cannot rename
 * anchors. The scan is also what binds the scroll-spy that marks the current
 * section.
 */
function useTocScan(
  initialItems: TocItem[] | undefined,
  onHasToc?: (has: boolean) => void,
) {
  const [items, setItems] = useState<TocItem[]>(initialItems ?? []);
  const [activeId, setActiveId] = useState("");

  // useLayoutEffect (not useEffect) so the list reconciles before the first
  // client-side paint after hydration.
  useLayoutEffect(() => {
    const root = document.querySelector<HTMLElement>("[data-toc-root]");
    if (!root) return;

    let observer: IntersectionObserver | null = null;
    // Whether the first scan has already run. See the floor note below.
    let settled = false;

    const scan = () => {
      const headings = Array.from(root.querySelectorAll<HTMLElement>("h2, h3"));

      const seen = new Map<string, number>();
      const list: TocItem[] = [];

      for (const heading of headings) {
        const rawText = (heading.textContent ?? "").trim();
        if (!rawText) continue;

        const text = stripNumberPrefix(rawText);

        // Every heading gets an id — including the ones inside a collapsed
        // in-page tab panel. The allocation is positional, so skipping the
        // hidden ones would hand the same id to two different headings the
        // moment a panel is revealed.
        //
        // An author-declared id is a published anchor and survives verbatim.
        const id = resolveHeadingId(seen, text, heading.id);
        heading.id = id;

        // A heading inside a `hidden` subtree is not on the page.
        if (heading.closest("[hidden]")) continue;

        list.push({
          id,
          text,
          level: heading.tagName === "H2" ? 2 : 3,
        });
      }

      // The scan is authoritative for completeness, but the server list is a
      // floor for the first scan so the rail never shrinks on hydration.
      const serverCount = initialItems?.length ?? 0;
      const resolved =
        !settled && list.length < serverCount ? (initialItems ?? list) : list;
      settled = true;

      onHasToc?.(resolved.length >= 2);

      if (resolved.length > 0) setItems(resolved);

      // Re-observe: a rescan can find headings the previous pass did not.
      observer?.disconnect();
      observer = new IntersectionObserver(
        (entries) => {
          const visible = entries
            .filter((entry) => entry.isIntersecting)
            .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
          if (visible[0]) {
            setActiveId(visible[0].target.id);
          }
        },
        { rootMargin: "-80px 0px -65% 0px", threshold: 0 },
      );

      for (const heading of headings) observer.observe(heading);
    };

    scan();

    // Components that reveal or collapse a region of the page announce it.
    document.addEventListener("tv:toc-refresh", scan);

    return () => {
      document.removeEventListener("tv:toc-refresh", scan);
      observer?.disconnect();
    };
  }, [initialItems]);

  return { items, activeId, setActiveId };
}

function scrollToHeading(id: string, setActiveId: (id: string) => void) {
  setActiveId(id);
  const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  document
    .getElementById(id)
    ?.scrollIntoView({
      behavior: reduce ? "auto" : "smooth",
      block: "start",
    });
}

type TocBranch = { item: TocItem; children: TocItem[] };

/**
 * Turn the flat heading list into one branch per H2.
 *
 * H3s belong to the closest preceding H2, which is what gives the rail its
 * hierarchy instead of a wall of equally-weighted rows. A page that opens with
 * an H3 keeps it as a root entry.
 */
function groupTocItems(items: TocItem[]): TocBranch[] {
  const branches: TocBranch[] = [];
  for (const item of items) {
    if (item.level === 2 || branches.length === 0) {
      branches.push({ item, children: [] });
    } else {
      branches[branches.length - 1]?.children.push(item);
    }
  }
  return branches;
}

function TocLink({
  item,
  active,
  nested = false,
  setActiveId,
  activeRef,
  variant,
  onNavigate,
}: {
  item: TocItem;
  active: boolean;
  nested?: boolean;
  setActiveId: (id: string) => void;
  activeRef?: RefObject<HTMLAnchorElement | null> | undefined;
  variant: "rail" | "inline";
  onNavigate?: (() => void) | undefined;
}) {
  const className =
    variant === "rail"
      ? `docs-toc-link ${nested ? "docs-toc-link-sub" : ""} ${active ? "docs-toc-link-active" : ""}`
      : `docs-toc-mobile-link ${nested ? "docs-toc-mobile-link-nested" : ""} ${
          active ? "docs-toc-mobile-link-active" : ""
        }`;

  return (
    <a
      ref={active ? activeRef : undefined}
      href={`#${item.id}`}
      aria-current={active ? "location" : undefined}
      onClick={(event) => {
        event.preventDefault();
        scrollToHeading(item.id, setActiveId);
        onNavigate?.();
      }}
      className={className}
    >
      {item.text}
    </a>
  );
}

/**
 * On-page table of contents for docs pages.
 *
 * `initialItems` comes from the render-tree collector in DocsLayout
 * (lib/toc-tree.tsx) so the rail is populated in the SSR HTML — no pop-in on
 * refresh. After mount the component still scans `[data-toc-root]`: that scan
 * is authoritative (it also finds headings rendered inside client components),
 * binds the scroll-spy observer and assigns ids to any headings the collector
 * couldn't see.
 */
export function Toc({
  initialItems,
  onHasToc,
}: {
  initialItems?: TocItem[];
  onHasToc?: (has: boolean) => void;
}) {
  const { items, activeId, setActiveId } = useTocScan(initialItems, onHasToc);
  const activeRef = useRef<HTMLAnchorElement>(null);
  const railRef = useRef<HTMLDivElement>(null);

  /**
   * Where the active marker is, in the rail's own coordinate space.
   *
   * Measured rather than inferred from the item index: an entry wraps to two
   * lines when its heading is long, so the marker's height differs per item.
   */
  const [marker, setMarker] = useState<{ top: number; height: number } | null>(
    null,
  );
  /**
   * False for the first placement: a transition that starts from `top: 0`
   * would make the marker slide down the rail on every page load.
   */
  const [markerSettled, setMarkerSettled] = useState(false);

  // Keep the active item visible inside the sticky rail. Never use
  // `scrollIntoView` here — it scrolls every scrollable ancestor (including
  // the window), which fights the user's own scrolling.
  useEffect(() => {
    const link = activeRef.current;
    const rail = link?.closest<HTMLElement>("[data-toc-rail]");
    if (!link || !rail) return;

    const railRect = rail.getBoundingClientRect();
    const linkRect = link.getBoundingClientRect();
    const relTop = linkRect.top - railRect.top + rail.scrollTop;
    const relBottom = relTop + linkRect.height;

    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const behavior: ScrollBehavior = reduce ? "auto" : "smooth";

    // Only write when the item is actually outside the visible band.
    if (relTop < rail.scrollTop) {
      rail.scrollTo({ top: relTop, behavior });
    } else if (relBottom > rail.scrollTop + rail.clientHeight) {
      rail.scrollTo({ top: relBottom - rail.clientHeight, behavior });
    }
  }, [activeId]);

  /**
   * Place the marker under the active entry.
   *
   * Placement is continuous rather than one-shot, because the marker's offset
   * is relative to the rail and the rail's content can move under it: an entry
   * gains `font-medium` when it becomes active and rewraps, a smooth scroll
   * shifts the sticky column, a resize changes the wrap.
   */
  useLayoutEffect(() => {
    const rail = railRef.current;
    if (!rail) return;

    let frame = 0;

    const place = () => {
      frame = 0;
      const railRect = rail.getBoundingClientRect();
      const link = activeRef.current;
      const first = rail.querySelector("ol a");
      const target = link ?? first;
      if (!target) return;

      const rect = target.getBoundingClientRect();
      const next = {
        top: rect.top - railRect.top,
        height: link ? rect.height : 0,
      };
      setMarker((prev) =>
        prev &&
        Math.abs(prev.top - next.top) < 0.5 &&
        Math.abs(prev.height - next.height) < 0.5
          ? prev
          : next,
      );
    };

    const schedule = () => {
      if (frame === 0) frame = requestAnimationFrame(place);
    };

    place();

    const observer = new ResizeObserver(schedule);
    observer.observe(rail);
    // `capture` reaches the rail's own scrollport as well as the window's.
    window.addEventListener("scroll", schedule, { passive: true, capture: true });
    window.addEventListener("resize", schedule);

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", schedule, { capture: true });
      window.removeEventListener("resize", schedule);
      if (frame !== 0) cancelAnimationFrame(frame);
    };
  }, [activeId, items]);

  // Let the first placement land without a transition, then allow animation.
  useEffect(() => {
    if (markerSettled || marker === null) return;
    const frame = requestAnimationFrame(() => setMarkerSettled(true));
    return () => cancelAnimationFrame(frame);
  }, [marker, markerSettled]);

  if (items.length < 2) return null;

  return (
    <nav aria-label="On this page" className="w-full">
      <div className="docs-eyebrow mb-2.5">On this page</div>
      <div ref={railRef} className="relative">
        {/* The rail's moving part. One element for the whole list rather than a
            coloured border on the active link: a border can only appear where
            an item already is, so it has to jump. This one is positioned from
            the active entry's measured box and transitions between those
            positions. */}
        <span
          aria-hidden="true"
          data-toc-marker={markerSettled ? "settled" : "placing"}
          className={`pointer-events-none absolute left-0 top-0 z-10 w-0.5 rounded-full bg-[var(--docs-accent)] ${
            markerSettled
              ? "transition-[transform,height] duration-300 ease-out motion-reduce:transition-none"
              : ""
          }`}
          style={
            marker
              ? {
                  transform: `translateY(${marker.top}px)`,
                  height: `${marker.height}px`,
                }
              : { opacity: 0 }
          }
        />
        <ol className="docs-toc-list">
          {groupTocItems(items).map((branch) => (
            <li key={branch.item.id}>
              <TocLink
                item={branch.item}
                active={branch.item.id === activeId}
                setActiveId={setActiveId}
                activeRef={activeRef}
                variant="rail"
              />
              {branch.children.length > 0 ? (
                <ol className="docs-toc-sublist">
                  {branch.children.map((child) => (
                    <li key={child.id}>
                      <TocLink
                        item={child}
                        active={child.id === activeId}
                        nested
                        setActiveId={setActiveId}
                        activeRef={activeRef}
                        variant="rail"
                      />
                    </li>
                  ))}
                </ol>
              ) : null}
            </li>
          ))}
        </ol>
      </div>
    </nav>
  );
}

/**
 * Compact "On this page" disclosure shown inside the article below `xl`.
 *
 * It uses the same scan and the same item list as the rail, but collapses to a
 * single summary row so it does not consume a mobile reader's vertical space.
 */
export function TocInline({
  initialItems,
  onHasToc,
}: {
  initialItems?: TocItem[];
  onHasToc?: (has: boolean) => void;
}) {
  const { items, activeId, setActiveId } = useTocScan(initialItems, onHasToc);
  const detailsRef = useRef<HTMLDetailsElement>(null);

  if (items.length < 2) return null;

  return (
    <details ref={detailsRef} className="docs-toc-mobile">
      <summary className="docs-toc-mobile-summary">
        <span className="docs-eyebrow">On this page</span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className="docs-toc-mobile-chevron"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </summary>
      <ol className="docs-toc-mobile-list">
        {groupTocItems(items).map((branch) => (
          <li key={branch.item.id}>
            <TocLink
              item={branch.item}
              active={branch.item.id === activeId}
              setActiveId={setActiveId}
              variant="inline"
              onNavigate={() => {
                if (detailsRef.current) detailsRef.current.open = false;
              }}
            />
            {branch.children.length > 0 ? (
              <ol className="docs-toc-mobile-sublist">
                {branch.children.map((child) => (
                  <li key={child.id}>
                    <TocLink
                      item={child}
                      active={child.id === activeId}
                      nested
                      setActiveId={setActiveId}
                      variant="inline"
                      onNavigate={() => {
                        if (detailsRef.current) detailsRef.current.open = false;
                      }}
                    />
                  </li>
                ))}
              </ol>
            ) : null}
          </li>
        ))}
      </ol>
    </details>
  );
}
