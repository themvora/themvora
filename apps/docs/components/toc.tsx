"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

import { resolveHeadingId, stripNumberPrefix, type TocItem } from "../lib/toc";

/**
 * On-page table of contents for docs pages.
 *
 * `initialItems` comes from the render-tree collector in DocsLayout
 * (lib/toc-tree.tsx) so the rail is populated in the SSR HTML — no pop-in on
 * refresh. After mount the component still scans `[data-toc-root]`: that scan
 * is authoritative (it also finds headings rendered inside client
 * components), binds the scroll-spy observer and assigns ids to any headings
 * the collector couldn't see. Ids stay stable across the hand-off because
 * both sides allocate through the same `allocateId`.
 */
export function Toc({
  initialItems,
  onHasToc,
}: {
  initialItems?: TocItem[];
  onHasToc?: (has: boolean) => void;
}) {
  const [items, setItems] = useState<TocItem[]>(initialItems ?? []);
  const [activeId, setActiveId] = useState("");
  const activeRef = useRef<HTMLAnchorElement>(null);
  const railRef = useRef<HTMLDivElement>(null);

  /**
   * Where the active marker is, in the rail's own coordinate space.
   *
   * Measured rather than inferred from the item index: an entry wraps to two
   * lines when its heading is long (`ThemeScope — pick your framework`), so the
   * marker's height differs per item and an index-times-row-height calculation
   * would drift further out of step the further down the page you read.
   */
  const [marker, setMarker] = useState<{ top: number; height: number } | null>(
    null,
  );
  /**
   * Whether the marker may animate.
   *
   * False for the first placement: a transition that starts from `top: 0` would
   * make the marker slide down the rail on every page load, which reads as a
   * loading animation rather than as the page's position.
   */
  const [markerSettled, setMarkerSettled] = useState(false);

  // useLayoutEffect (not useEffect) so the rail reconciles before the first
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
        // moment a panel is revealed, and `#install-2` would then resolve to
        // whichever of the two came first in document order.
        //
        // A heading that already carries an id (author-declared, or assigned
        // by the server collector) keeps it: those ids are published anchors
        // and are linked to from other pages, so the scan must not rename
        // them. `resolveHeadingId` still records them as taken, which keeps
        // the duplicate numbering in lockstep with the server.
        const id = resolveHeadingId(seen, text, heading.id);
        heading.id = id;

        // A heading inside a `hidden` subtree is not on the page. Listing it
        // would put an anchor in the rail that scrolls nowhere.
        if (heading.closest("[hidden]")) continue;

        list.push({
          id,
          text,
          level: heading.tagName === "H2" ? 2 : 3,
        });
      }

      // The scan is authoritative *for completeness* — it also sees headings
      // rendered inside client components, which the RSC collector cannot walk.
      // But it must never produce a *smaller* list than the server already
      // painted: that swap is a visible flash on reload (the rail appeared with
      // eight items and then vanished). So the server list is a floor — for the
      // first scan only. After that the scan wins, because switching an in-page
      // tab legitimately replaces one path's headings with a different set, and
      // a floor there would keep anchors for sections that are no longer shown.
      const serverCount = initialItems?.length ?? 0;
      const resolved =
        !settled && list.length < serverCount ? (initialItems ?? list) : list;
      settled = true;

      // Report whether the page actually has a TOC (at least two headings). The
      // layout uses this to collapse the rail column so pages without a TOC get
      // the full content width instead of a fixed-width empty rail.
      onHasToc?.(resolved.length >= 2);

      if (resolved.length > 0) setItems(resolved);

      // Re-observe: a rescan can find headings the previous pass did not, and
      // the observer is bound to the elements it was created with.
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

    // Components that reveal or collapse a region of the page (the Astro
    // guide's setup-path tabs) announce it, so the rail describes the page the
    // reader is looking at rather than the one that was server-rendered.
    document.addEventListener("tv:toc-refresh", scan);

    return () => {
      document.removeEventListener("tv:toc-refresh", scan);
      observer?.disconnect();
    };
    // Re-scan when the page content changes so the rail visibility stays in
    // sync across same-route navigations (e.g. /blog/[slug] → /blog/[slug]).
    // `initialItems` is referentially stable between unrelated re-renders
    // (it comes from a `useMemo` keyed on `children` in DocsLayout), so the
    // effect does not re-run spuriously.
  }, [initialItems]);

  // Keep the active item visible inside the sticky rail. Never use
  // `scrollIntoView` here — it scrolls every scrollable ancestor (including
  // the window), which fights the user's own scrolling and makes the page
  // jump/jitter. Scroll only the rail's own scrollport instead.
  //
  // The follow is animated, because it is a *secondary* motion: the reader is
  // scrolling the article and the rail quietly keeps up. `behavior` is passed
  // explicitly so `html { scroll-behavior: smooth }` cannot decide for us — and
  // so it can be turned off for a reader who asked for reduced motion.
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

    // Only write when the item is actually outside the visible band: scrolling
    // to a position that is already on screen would animate for no reason.
    if (relTop < rail.scrollTop) {
      rail.scrollTo({ top: relTop, behavior });
    } else if (relBottom > rail.scrollTop + rail.clientHeight) {
      rail.scrollTo({ top: relBottom - rail.clientHeight, behavior });
    }
  }, [activeId]);

  /**
   * Place the marker under the active entry.
   *
   * `useLayoutEffect` so the position is right in the same frame the active id
   * changes — with `useEffect` the marker would paint at the old item for one
   * frame, which is the jump this replaces.
   *
   * Placement is *continuous* rather than one-shot, because the marker's offset
   * is relative to the rail and the rail's content can move under it: an entry
   * gains `font-medium` when it becomes active and rewraps, a smooth
   * `scrollIntoView` shifts the sticky column, a resize changes the wrap. A
   * single measurement left the marker a few pixels off after a smooth scroll —
   * small, but exactly the kind of "almost aligned" that reads as broken.
   *
   * Reads are coalesced into one frame and compared before they are stored, so
   * scrolling the page does not re-render the rail on every frame.
   */
  useLayoutEffect(() => {
    const rail = railRef.current;
    if (!rail) return;

    let frame = 0;

    const place = () => {
      frame = 0;
      const railRect = rail.getBoundingClientRect();
      // Before the scroll-spy has picked a section there is no active entry.
      // The marker parks at the top of the list with no height — invisible, but
      // already in place, so the first activation slides into position instead
      // of appearing out of nowhere.
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
    <nav
      aria-label="On this page"
      className="w-full pl-6 pr-3 overflow-auto scrollbar-none [&::-webkit-scrollbar]:hidden"
    >
      <div className="mb-2 text-[11px] font-semibold uppercase tracking-widest opacity-40">
        On this page
      </div>
      <div ref={railRef} className="relative">
        {/* The rail's moving part.
            One element for the whole list rather than a coloured border on the
            active link: a border can only appear where an item already is, so it
            has to jump. This one is positioned from the active entry's measured
            box and transitions between those positions, which is what makes the
            rail read as scrolling with the page instead of flickering. */}
        <span
          aria-hidden="true"
          data-toc-marker={markerSettled ? "settled" : "placing"}
          className={`pointer-events-none absolute left-0 top-0 z-10 w-0.5 rounded-full bg-primary motion-reduce:transition-none ${
            markerSettled
              ? "transition-[transform,height] duration-300 ease-out"
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
        <ol className="flex flex-col gap-0.5 border-l border-border">
          {items.map((item) => {
            const isActive = item.id === activeId;
            return (
              <li key={item.id}>
                <a
                  ref={isActive ? activeRef : undefined}
                  href={`#${item.id}`}
                  aria-current={isActive ? "location" : undefined}
                  onClick={(e) => {
                    e.preventDefault();
                    setActiveId(item.id);
                    document
                      .getElementById(item.id)
                      ?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                  className={`block border-l-2 py-1 pr-2 text-[13px] leading-snug no-underline transition-colors ${
                    item.level === 3 ? "pl-6" : "pl-3"
                  } ${
                    isActive
                      ? "-ml-px border-transparent font-medium text-primary"
                      : "-ml-px border-transparent text-foreground/60 hover:text-foreground"
                  }`}
                >
                  {item.text}
                </a>
              </li>
            );
          })}
        </ol>
      </div>
    </nav>
  );
}
