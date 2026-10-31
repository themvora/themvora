"use client";

import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";

/**
 * One mutually-exclusive setup path.
 *
 * `id` is both the panel's identity and the URL fragment that selects it, so a
 * reader can link to the path they mean (`#astro-react`) instead of to the top
 * of a page that documents two.
 */
export type PathTab = {
  id: string;
  label: string;
};

/**
 * In-page navigation between setup paths that are alternatives, not steps.
 *
 * Why this is not just "two sections one after the other": a guide that stacks
 * `Astro-only` and `Astro + React` asks the reader to scroll past a full install
 * sequence for a shape they have already rejected, and it makes the two paths
 * look like a sequence — do this, then do that — when they are substitutes. The
 * page length is also the point: the Astro guide is the longest on the site
 * because it documents two applications.
 *
 * Both panels are rendered into the document and the inactive one carries
 * `hidden`, rather than the component rendering only the selected panel:
 *
 *   - the content is in the server HTML, so it is indexed and a fragment link
 *     resolves on a cold load instead of after hydration;
 *   - `hidden` keeps the page as short as the selected path, which is the whole
 *     reason for the split;
 *   - the `On this page` rail lists only visible headings, because a link to a
 *     `hidden` section scrolls nowhere (see `components/toc.tsx`).
 *
 * The tablist is the WAI-ARIA pattern with automatic activation: arrow keys
 * move focus *and* selection, `Home`/`End` jump to the ends, and only the
 * selected tab is in the tab order.
 */
export function PathTabs({
  tabs,
  panels,
  label,
}: {
  tabs: PathTab[];
  /** One panel per tab, in the same order. Rendered on the server. */
  panels: ReactNode[];
  /** Accessible name for the tablist. */
  label: string;
}) {
  const [index, setIndex] = useState(0);
  const baseId = useId();
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  // The DOM is the only place a fragment target can be resolved: `#astro-react`
  // names a tab, but `#install-2` names a heading *inside* a panel, and a link
  // to a step of the other path has to select that path before it can scroll.
  const indexForHash = (hash: string): number => {
    const target = hash.replace(/^#/, "");
    if (!target) return -1;

    const direct = tabs.findIndex((tab) => tab.id === target);
    if (direct !== -1) return direct;

    const element = document.getElementById(target);
    const panel = element?.closest<HTMLElement>("[data-path-panel]");
    const owner = panel?.dataset.pathPanel;
    return owner ? tabs.findIndex((tab) => tab.id === owner) : -1;
  };

  const scrollToHash = () => {
    const target = window.location.hash.replace(/^#/, "");
    if (!target) return;
    document
      .getElementById(target)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // `index` as a ref, so the hash listener registered once can compare against
  // the live value instead of the value captured at mount.
  const indexRef = useRef(index);
  indexRef.current = index;

  // Deep link on a cold load. `useLayoutEffect` (not `useEffect`) because the
  // server always renders the first panel: the correction has to land before
  // the browser paints or the reader sees the wrong path for a frame.
  useLayoutEffect(() => {
    const target = indexForHash(window.location.hash);
    if (target <= 0) return;

    setIndex(target);

    // The browser tried to scroll to the fragment during load, while the panel
    // was still `hidden` — a `hidden` element has no box, so nothing happened.
    // Retry once the panel exists. `requestAnimationFrame` runs after React has
    // committed the state change and before the next paint.
    requestAnimationFrame(scrollToHash);
    // Mount-only: this reads the URL once, and later changes arrive as
    // `hashchange` events handled below.
  }, []);

  useEffect(() => {
    const onHashChange = () => {
      const target = indexForHash(window.location.hash);
      if (target < 0 || target === indexRef.current) return;
      setIndex(target);
      // Same reason as above: the browser's own jump was a no-op against a
      // hidden panel, so the scroll has to be replayed after it is revealed.
      requestAnimationFrame(scrollToHash);
    };

    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
    // `tabs` is a stable literal per page render.
  }, []);

  // The rail lists the headings that are on the page, and the set changes when
  // the path changes. `Toc` owns the scan; this only tells it to repeat it.
  useEffect(() => {
    document.dispatchEvent(new CustomEvent("tv:toc-refresh"));
  }, [index]);

  const tabId = (id: string) => `${baseId}-tab-${id}`;
  const select = (next: number) => {
    if (next === index) return;
    setIndex(next);
    // Replace rather than push: switching a tab is not a navigation, and
    // `replaceState` does not fire `hashchange`, so the listener above stays
    // out of the way. The fragment is still updated, so the URL describes what
    // is on screen and a reload lands on the same path.
    window.history.replaceState(null, "", `#${tabs[next]?.id ?? ""}`);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, from: number) => {
    const count = tabs.length;
    let next: number | null = null;

    switch (event.key) {
      case "ArrowRight":
      case "ArrowDown":
        next = (from + 1) % count;
        break;
      case "ArrowLeft":
      case "ArrowUp":
        next = (from - 1 + count) % count;
        break;
      case "Home":
        next = 0;
        break;
      case "End":
        next = count - 1;
        break;
    }

    if (next === null) return;
    event.preventDefault();
    select(next);
    tabRefs.current[next]?.focus();
  };

  return (
    <div className="mt-8">
      <div
        role="tablist"
        aria-label={label}
        className="flex flex-wrap gap-1 rounded-xl border border-border bg-muted/40 p-1"
      >
        {tabs.map((tab, i) => {
          const isActive = i === index;
          return (
            <button
              key={tab.id}
              ref={(element) => {
                tabRefs.current[i] = element;
              }}
              id={tabId(tab.id)}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-controls={tab.id}
              tabIndex={isActive ? 0 : -1}
              onClick={() => select(i)}
              onKeyDown={(event) => onKeyDown(event, i)}
              className={`flex-1 cursor-pointer rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-card text-foreground shadow-sm"
                  : "text-foreground/60 hover:bg-muted hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {panels.map((panel, i) => {
        const tab = tabs[i];
        if (!tab) return null;
        return (
          <div
            key={tab.id}
            id={tab.id}
            role="tabpanel"
            aria-labelledby={tabId(tab.id)}
            data-path-panel={tab.id}
            hidden={i !== index}
            className="mt-6"
          >
            {panel}
          </div>
        );
      })}
    </div>
  );
}
