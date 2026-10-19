"use client";

import React, { useEffect, useInsertionEffect, useRef } from "react";
import { createRoot, type Root } from "react-dom/client";
import {
  createPrePaintScrollbarScript,
  createOverlayScrollbar,
  type OverlayScrollbarHandle,
  type OverlayScrollbarOptions,
  type ScrollbarArrowDir,
  type ScrollbarAxis,
  type ScrollbarOffset,
  resolveScrollbarOptions,
} from "@themvora/core";
import { useThemeRuntime } from "./provider";

type IconProp = React.ReactNode;

/** Behavior — how the overlay scrolls and hides. */
export interface ThemeScrollbarBehavior extends Pick<
  OverlayScrollbarOptions,
  | "autoHide"
  | "hoverExpand"
  | "draggable"
  | "clickToJump"
  | "smooth"
  | "overscroll"
  | "axes"
  | "touch"
  | "dir"
> {
  /** Idle (ms) before a revealed strip fades out. Default `900`. */
  autoHideDelay?: number;
}

/** Appearance — the look/size of every strip. */
export interface ThemeScrollbarAppearance extends Pick<
  OverlayScrollbarOptions,
  | "arrows"
  | "thickness"
  | "hoverThickness"
  | "radius"
  | "minThumbSize"
  | "offset"
  | "trackOpacity"
  | "thumbOpacity"
  | "zIndex"
  | "duration"
  | "animationDuration"
  | "thumbColor"
  | "trackColor"
  | "activeThumbColor"
  | "thumbHoverColor"
> {}

/**
 * Scope — which scrollable containers the overlay tracks. This decides *where*
 * the scrollbar appears, not how it looks, so it is its own group rather than
 * part of `appearance`.
 */
export interface ThemeScrollbarScope {
  /** Scope the overlay to these containers (document is always tracked). */
  include?: string[] | null;
  /** Skip these containers when tracking. */
  exclude?: string[] | null;
}

/**
 * Arrow button icons (any `ReactNode` — JSX, inline SVG, text, …).
 */
export interface ThemeScrollbarIcons {
  /** Icon for all arrow directions (individual overrides win). */
  arrow?: React.ReactNode;
  /** Icon for the "scroll up" button. */
  up?: React.ReactNode;
  /** Icon for the "scroll down" button. */
  down?: React.ReactNode;
  /** Icon for the "scroll left" button. */
  left?: React.ReactNode;
  /** Icon for the "scroll right" button. */
  right?: React.ReactNode;
  /** Arrow glyph size, in CSS px, for all four directions. Clamped to the
   *  button's usable area, so it never overflows a thin rail. Omit to keep the
   *  default sizing. */
  size?: number;
}

/**
 * Props for the {@link ThemeScrollbar} overlay component.
 *
 * Options are grouped into `behavior`, `appearance`, and `icons` — but every
 * option is also accepted as a flat, top-level prop (flat props win over the
 * grouped ones).
 */
export interface ThemeScrollbarProps {
  /** How the overlay scrolls and hides. */
  behavior?: ThemeScrollbarBehavior;
  /** The look and size of every rail. */
  appearance?: ThemeScrollbarAppearance;
  /** Which scrollable containers the overlay tracks. */
  scope?: ThemeScrollbarScope;
  /** Arrow button icons, plus the shared glyph size. */
  icons?: ThemeScrollbarIcons;
  /** Renders nothing visible; kept for API symmetry (the overlay is created
   *  against the runtime, not the component tree). It is deliberately ignored
   *  by option resolution and change detection. */
  children?: React.ReactNode;
}

function isIcon(value: React.ReactNode): value is NonNullable<React.ReactNode> {
  return value !== undefined && value !== null && value !== false;
}

/**
 * A stable, normalized fingerprint of a React node.
 *
 * React elements are reduced to their type plus a shallow fingerprint of their
 * props (and children, depth-limited), so `<Chevron dir="up" />` and
 * `<Chevron dir="down" />` produce DIFFERENT fingerprints. The previous
 * serializer collapsed every element to its type name, which meant changing a
 * prop on an existing icon component was silently ignored.
 */
function nodeFingerprint(node: unknown, depth = 0): unknown {
  if (node == null || typeof node === "boolean") return node == null ? "nil" : node;
  if (typeof node === "string" || typeof node === "number") return node;
  if (typeof node === "function") return "fn";
  if (Array.isArray(node)) return node.map((item) => nodeFingerprint(item, depth + 1));
  if (typeof node !== "object") return String(node);

  const el = node as { $$typeof?: unknown; type?: unknown; props?: Record<string, unknown> };
  if (!el.$$typeof) {
    try {
      return JSON.stringify(node);
    } catch {
      return "obj";
    }
  }
  if (depth > 3) return "el";
  const type = el.type as { displayName?: string; name?: string } | string | undefined;
  const name =
    typeof type === "string"
      ? type
      : (type?.displayName ?? type?.name ?? "el");
  const props = el.props ?? {};
  const fingerprint: Record<string, unknown> = {};
  for (const key of Object.keys(props).sort()) {
    if (key === "children") continue;
    fingerprint[key] = nodeFingerprint(props[key], depth + 1);
  }
  return { t: name, p: fingerprint, c: nodeFingerprint(props.children, depth + 1) };
}

/** What the mount effect needs, plus the key that decides when it re-runs. */
interface ScrollbarPlan {
  /** Canonical engine options (the arrow renderer is attached in the effect). */
  opts: OverlayScrollbarOptions;
  /** The icon for each direction, already resolved from the flat + grouped
   *  props and the rotation fallbacks. */
  icons: Record<ScrollbarArrowDir, React.ReactNode>;
  /** Content identity of the resolved options and every icon. */
  key: string;
}

/**
 * Resolve the component's props into canonical engine options and a change key.
 *
 * Pure and cheap: the returned `key` is built from the RESOLVED options (so the
 * grouped and flat forms of the same value hash identically) plus each icon's
 * fingerprint — meaning icon size, icon swaps, icon prop changes, colors,
 * scope, thickness and behavior are all detected, while an ordinary re-render
 * that changes nothing (or only `children`) leaves the key untouched and the
 * overlay in place.
 */
function planProps(props: ThemeScrollbarProps): ScrollbarPlan {
  const { behavior, appearance, scope, icons } = props;
  const ic = icons ?? {};

  // One canonical merge, shared with every other adapter. `icons.size` is the
  // public name for the engine's `iconSize`.
  const opts = resolveScrollbarOptions({ behavior, appearance, scope });
  if (ic.size !== undefined) opts.iconSize = ic.size;

  /** Wrap a JSX arrow icon and rotate it so a vertical glyph can serve the
   *  horizontal arrows (and vice-versa) — one custom glyph family, four
   *  native-consistent buttons. The rotated box is the engine-sized square
   *  (`--tv-arrow-size`), so a rotated glyph stays inside its button. */
  const rotated = (icon: React.ReactNode, deg: number): React.ReactNode =>
    isIcon(icon) ? (
      <span
        aria-hidden
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxSizing: "border-box",
          width: "var(--tv-arrow-size, 100%)",
          height: "var(--tv-arrow-size, 100%)",
          maxWidth: "100%",
          maxHeight: "100%",
          transform: `rotate(${deg}deg)`,
        }}
      >
        {icon}
      </span>
    ) : null;
  const first = (...nodes: Array<React.ReactNode | null>): React.ReactNode =>
    nodes.find(isIcon) ?? null;
  const arrowUp = ic.up ?? ic.arrow;
  const arrowDown = ic.down ?? ic.arrow;
  const arrowLeft = ic.left ?? ic.arrow;
  const arrowRight = ic.right ?? ic.arrow;
  const resolvedIcons: Record<ScrollbarArrowDir, React.ReactNode> = {
    up: arrowUp ?? first(rotated(arrowRight, -90), rotated(arrowLeft, 90)),
    down: arrowDown ?? first(rotated(arrowRight, 90), rotated(arrowLeft, -90)),
    left: arrowLeft ?? first(rotated(arrowUp, -90), rotated(arrowRight, 180)),
    right: arrowRight ?? first(rotated(arrowUp, 90), rotated(arrowLeft, 180)),
  };

  const key = JSON.stringify({
    opts,
    icons: (Object.keys(resolvedIcons) as ScrollbarArrowDir[]).map((d) => nodeFingerprint(resolvedIcons[d])),
  });
  return { opts, icons: resolvedIcons, key };
}

/**
 * ThemeScrollbar — overlay only.
 *
 * Creates the custom scrollbar overlay.
 *
 * Lifecycle:
 *   mount  → create overlay → measure → attach listeners
 *   paint  → add tv-scrollbar-ready
 *   destroy → remove overlay
 *
 * Props are four optional groups — `behavior`, `appearance`, `scope` and
 * `icons` — plus `children`, which is accepted for JSX symmetry only.
 *
 *   <ThemeScrollbar
 *     behavior={{ autoHide: true, smooth: true }}
 *     appearance={{ thickness: 8, radius: 999 }}
 *     scope={{ include: [".panel"] }}
 *     icons={{ up: <ArrowUpIcon />, size: 12 }}
 *   />
 *
 *   <ThemeScrollbar
 *     behavior={{ autoHide: true, smooth: true }}
 *     appearance={{ thickness: 8, radius: 999 }}
 *     icons={{ up: <ArrowUpIcon />, down: <ArrowDownIcon /> }}
 *   />
 *
 * @see {@link ThemeProvider}
 * @see `OverlayScrollbarOptions`
 */
export function ThemeScrollbar(props: ThemeScrollbarProps) {
  const runtime = useThemeRuntime();
  const handleRef = useRef<OverlayScrollbarHandle | null>(null);
  const plan = planProps(props);
  const optionsKey = plan.key;

  // Phase 1 — hide the native scrollbar before the first paint. The blocking
  // script adds `tv-scrollbar` to <html> plus a <style> hiding native bars, so
  // the custom overlay is the only scrollbar from the very first frame
  // (matching the Next.js/Nuxt SSR experience). Idempotent: when the Vite
  // plugin or an SSR adapter already emitted it, this no-ops.
  useInsertionEffect(() => {
    if (typeof document === "undefined" || !document.head) return;
    if (document.getElementById("tv-scrollbar-style")) return;
    const script = document.createElement("script");
    script.text = createPrePaintScrollbarScript();
    document.head.appendChild(script);
  }, []);


  useEffect(() => {
    const opts: OverlayScrollbarOptions = { ...plan.opts };

    // Framework-owned arrow content: JSX/`ReactNode` icons are rendered into
    // each arrow button via its own React root, so SVG/component icons work for
    // every scrollable host the engine picks up (including ones discovered
    // later). Strings render natively; dirs without a custom icon keep the
    // built-in CSS triangle. `icons.*` overrides are the grouped form.
    const iconByDir = plan.icons;
    const hasCustomIcons = (Object.keys(iconByDir) as ScrollbarArrowDir[]).some(
      (d) => isIcon(iconByDir[d]),
    );
    const roots = new Map<HTMLDivElement, Root>();
    if (hasCustomIcons) {
      opts.arrowIconRenderer = (el, arrowDir) => {
        const node = iconByDir[arrowDir];
        if (!isIcon(node)) return;
        el.classList.add("tv-arrow-custom");
        const existing = roots.get(el);
        if (existing) {
          existing.render(node);
          return;
        }
        const root = createRoot(el);
        roots.set(el, root);
        root.render(node);
      };
    }

    // Phase 2 — create overlay. The engine adds tv-scrollbar-ready to <html>
    // after the first paint (Phase 3).
    handleRef.current = createOverlayScrollbar(runtime.store, opts);

    return () => {
      handleRef.current?.destroy();
      handleRef.current = null;
      // The arrow icons live in their own React roots. Unmounting one is
      // synchronous, and React refuses to finish unmounting a root while it is
      // already rendering — which is exactly what a development StrictMode
      // remount (or a Suspense re-commit) does, so the cleanup would fire inside
      // a render pass:
      //
      //   Attempted to synchronously unmount a root while React was already
      //   rendering.
      //
      // Defer by one task, like the runtime's own deferred destroy. The overlay
      // was just destroyed, so its arrow elements are detached; unmounting them
      // a task later is safe and the remount creates fresh roots.
      const stale = [...roots.values()];
      roots.clear();
      if (stale.length > 0) {
        setTimeout(() => {
          for (const root of stale) root.unmount();
        }, 0);
      }
    };
    // Recreated when the resolved options change, so an updated prop takes
    // effect immediately instead of waiting for a reload.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runtime.store, optionsKey]);

  return null;
}
