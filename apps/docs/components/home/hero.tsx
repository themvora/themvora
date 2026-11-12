"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import {
  useTheme,
  useThemeRuntime,
  useSetThemeFamily,
} from "@themvora/next/client";
import { Button } from "../ui/button";
import { InstallCommand } from "../ui/install-command";
import { frameworkGuidePath, frameworks } from "../../lib/frameworks";
import { HeroTrail, useTrailEligible } from "./mouse-trail";
import { HeroPreview } from "./hero-preview";
import { PKG_VERSION_BADGE } from "../../lib/version";
import { CodeBlock } from "../code-block";

/** Families that exist to support the docs site itself, not to be offered. */
const INTERNAL_FAMILIES = new Set(["themvora", "lab", "scope"]);

const INSTALL_COMMAND = "npm install @themvora/core @themvora/<your-framework>";

const DEMO_SEEN_KEY = "themvora:auto-demo";

/** Whether the visitor has asked for the cursor trail ("on" | "off"). */
const TRAIL_KEY = "themvora:trail";

/**
 * Shared between the auto-demo and the toast: while the demo is recolouring the
 * page, the visitor did not make those changes, so the toast stays quiet.
 */
const demoState = { active: false };

type Family = { name: string; color: string };

/** The public theme families, with the colour each swatch should paint. */
function useThemeFamilies(): Family[] {
  const runtime = useThemeRuntime();

  return useMemo(() => {
    const seen = new Map<string, string>();
    for (const t of runtime.themes) {
      const f = t.meta?.family;
      if (!f || seen.has(f) || INTERNAL_FAMILIES.has(f)) continue;
      // A token may be a plain colour or a role map; only a string is a colour
      // this swatch can paint, so anything else falls back rather than throwing.
      const primary = t.tokens?.colors?.primary;
      seen.set(f, typeof primary === "string" ? primary : "#8b8b8b");
    }
    return [...seen].map(([name, color]) => ({ name, color }));
  }, [runtime.themes]);
}

/**
 * The palette picker: the product's central claim, made clickable.
 * Full-size targets, each swatch in the family's own colour, and a real radio
 * group so it works from the keyboard.
 */
function PalettePicker() {
  const options = useThemeFamilies();
  const { family } = useTheme();
  const setFamily = useSetThemeFamily();
  const buttons = useRef<Array<HTMLButtonElement | null>>([]);

  const active = options.findIndex((o) => o.name === family);

  const onKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLDivElement>) => {
      if (options.length === 0) return;
      const from = active < 0 ? 0 : active;
      let next: number;
      switch (event.key) {
        case "ArrowRight":
        case "ArrowDown":
          next = (from + 1) % options.length;
          break;
        case "ArrowLeft":
        case "ArrowUp":
          next = (from - 1 + options.length) % options.length;
          break;
        case "Home":
          next = 0;
          break;
        case "End":
          next = options.length - 1;
          break;
        default:
          return;
      }
      event.preventDefault();
      const option = options[next];
      if (!option) return;
      setFamily(option.name);
      buttons.current[next]?.focus();
    },
    [active, options, setFamily],
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-semibold tracking-tight">
          Try it — pick a theme
        </h2>
        {/* Arrow keys mean nothing on a touch-only device. */}
        <span className="text-[11px] opacity-70 pointer-coarse:hidden hidden md:block">
          try with arrow keys
        </span>
      </div>
      {/* Four columns wherever the track is wide enough to hold a label like
          "Graphite" without truncating it. At `lg` the right track is the
          narrowest it ever gets (27rem), so it drops back to three. */}
      <div
        role="radiogroup"
        aria-label="Theme palette"
        onKeyDown={onKeyDown}
        className="grid grid-cols-3 gap-2 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4"
      >
        {options.map((option, index) => {
          const checked = option.name === family;
          // If the current family isn't offered here (e.g. an internal one),
          // the first chip takes the tab stop so the group stays reachable.
          const tabStop = active < 0 ? index === 0 : checked;
          return (
            <button
              key={option.name}
              ref={(el) => {
                buttons.current[index] = el;
              }}
              type="button"
              role="radio"
              aria-checked={checked}
              tabIndex={tabStop ? 0 : -1}
              onClick={() => setFamily(option.name)}
              className={`palette-chip min-w-0${checked ? " palette-chip-active" : ""}`}
            >
              <span
                className="palette-dot"
                style={{ background: option.color }}
                aria-hidden
              />
              <span className="truncate">{option.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

const MODE_LABELS = {
  light: "Light",
  dark: "Dark",
  system: "System",
} as const;

/**
 * The line under the preview.
 *
 * It states the two things a visitor cannot infer from a picture: which theme is
 * live right now, and that the panel above repaints because it reads semantic
 * tokens rather than colours. The API name is the one the picker itself calls.
 */
function PreviewCaption() {
  const { family, mode } = useTheme();
  const modeLabel = mode in MODE_LABELS ? MODE_LABELS[mode] : "Light";

  return (
    <>
      <span className="font-medium text-foreground">
        Live · <span className="capitalize">{family ?? "default"}</span> ·{" "}
        {modeLabel}
      </span>{" "}
      — every surface above is a semantic token, so the picker&apos;s{" "}
      <code className="mono text-[0.95em]">setFamily()</code> call repaints all
      of it.
    </>
  );
}

/**
 * "Switched to X — Undo".
 *
 * A theme change is easy to trigger by accident and cheap to reverse, so the
 * reversal is offered where the change was made. It stays quiet for changes the
 * visitor didn't make (the auto-demo) and for the Undo itself.
 */
function ThemeToast() {
  const { family } = useTheme();
  const setFamily = useSetThemeFamily();
  const [previous, setPrevious] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);
  const last = useRef<string | null>(null);
  const skipNext = useRef(false);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => {
    const before = last.current;
    last.current = family ?? null;

    if (skipNext.current) {
      skipNext.current = false;
      return;
    }
    if (demoState.active) return;
    if (!before || !family || before === family) return;

    setPrevious(before);
    setVisible(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setVisible(false), 4200);
    return () => window.clearTimeout(timer.current);
  }, [family]);

  if (!visible || !previous) return null;

  return (
    <div className="theme-toast max-w-[calc(100vw-2rem)]" role="status">
      {/* `capitalize` on the family only. On the whole sentence it produced
          "Switched To Slack". */}
      <span className="truncate">
        Switched to <span className="capitalize">{family}</span>
      </span>
      <button
        type="button"
        className="theme-toast-undo shrink-0"
        onClick={() => {
          // The change Undo causes must not raise another toast.
          if (previous !== family) skipNext.current = true;
          setFamily(previous);
          setVisible(false);
        }}
      >
        Undo
      </button>
    </div>
  );
}

/**
 * A one-time, self-cancelling demonstration.
 *
 * A first-time visitor should see the page recolour without being told to click
 * anything. It runs once per browser and any sign of intent — a click, a key, a
 * scroll, a wheel — stops it. If the visitor interrupts it somewhere other than
 * the palette picker, their original theme is restored.
 */
function useAutoDemo(enabled: boolean) {
  const families = useThemeFamilies();
  const { family } = useTheme();
  const setFamily = useSetThemeFamily();

  const familyRef = useRef(family);
  familyRef.current = family;
  const setFamilyRef = useRef(setFamily);
  setFamilyRef.current = setFamily;

  // A string key, so a new `themes` array with the same families can't restart
  // the demo.
  const namesKey = useMemo(
    () => families.map((f) => f.name).join("|"),
    [families],
  );

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (
      (navigator as Navigator & { connection?: { saveData?: boolean } })
        .connection?.saveData
    )
      return;
    try {
      if (window.localStorage.getItem(DEMO_SEEN_KEY)) return;
    } catch {
      return;
    }

    const options = namesKey ? namesKey.split("|") : [];
    if (options.length < 3) return;

    const origin = familyRef.current ?? options[0]!;
    const from = Math.max(options.indexOf(origin), 0);
    const a = options[(from + 1) % options.length]!;
    const b = options[(from + 2) % options.length]!;

    const timers: number[] = [];
    const events = ["pointerdown", "keydown", "wheel", "touchstart"] as const;
    let cancelled = false;

    const teardown = () => {
      cancelled = true;
      timers.forEach((t) => window.clearTimeout(t));
      events.forEach((e) => window.removeEventListener(e, onIntent));
    };

    const markSeen = () => {
      try {
        window.localStorage.setItem(DEMO_SEEN_KEY, "1");
      } catch {
        /* storage is optional */
      }
    };

    // Give React a moment to flush the last change before the toast is allowed
    // to react to theme changes again.
    const releaseSoon = () =>
      window.setTimeout(() => {
        demoState.active = false;
      }, 300);

    const onIntent = (event: Event) => {
      const pickedPalette =
        event.target instanceof Element &&
        event.target.closest('[role="radiogroup"]') !== null;
      teardown();
      markSeen();
      if (pickedPalette) {
        demoState.active = false;
        return;
      }
      if (familyRef.current !== origin) setFamilyRef.current(origin);
      releaseSoon();
    };

    const run = (name: string, at: number) =>
      timers.push(
        window.setTimeout(() => {
          if (!cancelled) setFamilyRef.current(name);
        }, at),
      );

    demoState.active = true;
    events.forEach((e) =>
      window.addEventListener(e, onIntent, { passive: true }),
    );

    run(a, 1600);
    run(b, 3100);
    run(origin, 4600);
    timers.push(
      window.setTimeout(() => {
        if (cancelled) return;
        teardown();
        markSeen();
        releaseSoon();
      }, 5200),
    );

    return () => {
      teardown();
      demoState.active = false;
    };
  }, [enabled, namesKey]);
}

/**
 * The trail's pause control. It sits with the scroll cue, which is where the
 * trail is. `aria-pressed` and a label that states what will happen.
 */
function TrailToggle({
  enabled,
  onToggle,
  className,
}: {
  enabled: boolean;
  onToggle: () => void;
  className?: string | undefined;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={enabled}
      title={enabled ? "Hide the cursor trail" : "Show the cursor trail"}
      className={`trail-toggle${className ? ` ${className}` : ""}`}
    >
      <svg
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="currentColor"
        aria-hidden
        className="shrink-0"
      >
        {enabled ? (
          <>
            <rect x="6" y="4" width="4" height="16" rx="1" />
            <rect x="14" y="4" width="4" height="16" rx="1" />
          </>
        ) : (
          <path d="M8 5.5v13a1 1 0 0 0 1.53.85l10-6.5a1 1 0 0 0 0-1.7l-10-6.5A1 1 0 0 0 8 5.5Z" />
        )}
      </svg>
      {enabled ? "Pause trail" : "Resume trail"}
    </button>
  );
}

/** A quiet invitation to keep going, at the foot of the first screen. */
function ScrollCue({ className }: { className?: string | undefined }) {
  return (
    <div
      className={`flex justify-center${className ? ` ${className}` : ""}`}
      aria-hidden
    >
      <span className="scroll-cue">
        <span className="scroll-cue-label">Scroll</span>
        <span className="scroll-cue-dot" />
      </span>
    </div>
  );
}

export function Hero() {
  useAutoDemo(true);

  const [trailOn, setTrailOn] = useState(true);

  /*
    Whether this device can have the trail at all.

    Mobile and tablet are disqualified outright — not dimmed, not paused: no
    canvas, no listeners, no `three` import. A pointer effect on a device without
    a pointer is cost with no benefit, so the element is never rendered.
  */
  const trailEligible = useTrailEligible();

  // Read the stored preference after mount, so the server's markup and the
  // client's first render agree. With no stored choice, respect reduced motion.
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(TRAIL_KEY);
      if (stored === "off") {
        setTrailOn(false);
      } else if (
        stored === null &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ) {
        setTrailOn(false);
      }
    } catch {
      /* storage is optional */
    }
  }, []);

  const toggleTrail = useCallback(() => {
    const next = !trailOn;
    setTrailOn(next);
    try {
      window.localStorage.setItem(TRAIL_KEY, next ? "on" : "off");
    } catch {
      /* storage is optional */
    }
  }, [trailOn]);

  const frameworkNames = useMemo(
    () => frameworks.map((fw) => fw.name).join(" · "),
    [],
  );

  return (
    <section className="relative overflow-hidden">
      {/*
        The background is CSS, not WebGL: a full-viewport canvas has to stay
        mounted to do its job, which is a permanent per-frame cost. The 3D lives
        in the cursor trail, where it is transient and free when the pointer is
        still.
      */}
      <div className="hero-bg" aria-hidden />
      <div className="hero-aurora" aria-hidden />
      <div className="hero-orb hero-orb-1" aria-hidden />
      <div className="hero-orb hero-orb-2" aria-hidden />
      <div className="hero-vignette" aria-hidden />

      <div className="relative mx-auto max-w-6xl px-6 py-10 sm:py-14 lg:px-8 lg:py-20">
        {/*
          The trail's scope: the hero block and the scroll cue, nothing below.
          The canvas is an absolutely positioned child of this wrapper, and every
          sibling is `relative`, so the beads pass behind the content.
        */}
        <div className="relative">
          {trailEligible && <HeroTrail enabled={trailOn} />}

          {/*
            Single column until `lg`, then two tracks with a reserved width so
            nothing reflows when the preview or a font arrives. `min-w-0` lets
            each track shrink below its children's min-content width; without it
            one unshrinkable child widens the column and clips the heading.

            `items-start`, not `items-center`: the right track (picker + preview)
            is taller than the text column, and centring split the difference
            into a dead band above the chip that read as a broken top margin.
            Both tracks now start on the same line.
          */}
          <div className="relative grid gap-10 sm:gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,27rem)] lg:items-start lg:gap-14 xl:grid-cols-[minmax(0,1fr)_minmax(0,31rem)]">
            <div className="min-w-0 text-center lg:text-left">
              <div className="fade-up fade-up-1 mb-5 sm:mb-6">
                <span className="chip cursor-default">
                  <span
                    className="h-2 w-2 shrink-0 rounded-full pulse-soft"
                    style={{ background: "var(--docs-accent)" }}
                  />
                  Framework-agnostic theming
                </span>
              </div>
              {/* `text-3xl` at the base breakpoint: at a 265px viewport the
                column is 233px wide and "applications." at 36px measures
                234px. 30px keeps whole words whole; `break-words` is only a
                last resort for narrower screens. */}
              <h1 className="fade-up fade-up-2 mb-4 wrap-break-word text-4xl font-bold tracking-tight text-balance min-[480px]:text-4xl sm:mb-5 md:text-[3.25rem] lg:text-[2.85rem] lg:leading-13 xl:text-[3.25rem]">
                The theming runtime{" "}
                <span className="hero-accent block">
                  for modern applications.
                </span>
              </h1>
              <p className="fade-up fade-up-3 mx-auto mb-7 max-w-2xl text-base leading-relaxed opacity-80 text-balance sm:mb-8 sm:text-lg lg:mx-0 lg:max-w-xl">
                Define a theme once as semantic tokens, then switch families and
                modes at runtime — with SSR that paints the right theme on the
                first frame, scoped subtrees, and adapters for the UI library
                you already use.
              </p>
              <div className="fade-up fade-up-3 mb-7 flex flex-wrap items-center justify-center gap-3 sm:mb-8 lg:justify-start">
                <Button href="/get-started" size="lg">
                  Get started
                </Button>
                <Button href="/presets" variant="secondary" size="lg">
                  Browse themes
                </Button>
              </div>
              <div className="fade-up fade-up-3 flex min-w-0 flex-col items-center gap-3 lg:items-start lg:mb-4">
                <InstallCommand command={INSTALL_COMMAND} />
                <span className="max-w-full text-xs opacity-70 mt-4">
                  {frameworkNames}
                </span>
                <Link
                  href="/cli/quickstart"
                  className="max-w-full text-xs opacity-70 no-underline transition-opacity hover:opacity-100 focus-visible:opacity-100"
                >
                  Build themes from the terminal with{" "}
                  <code className="mono">themvora generate</code> → Read CLI
                  docs →
                </Link>
              </div>
            </div>

            {/* The control, then the thing it controls. The preview is the
                argument: one application, every theme, no per-theme styling. */}
            <div className="fade-up fade-up-4 mx-auto flex w-full min-w-0 max-w-md flex-col gap-4 md:max-w-xl lg:mx-0 lg:max-w-none">
              <PalettePicker />
              <HeroPreview caption={<PreviewCaption />} />
            </div>
          </div>

          {/* The scroll cue only makes sense while the hero is a single tall
              column; from `lg` up the toggle sits alone. */}
          <div className="relative mt-10 flex flex-wrap items-center justify-center gap-4 sm:mt-12">
            <ScrollCue className="lg:hidden" />
            <TrailToggle enabled={trailOn} onToggle={toggleTrail} />
          </div>
        </div>

        <div className="mt-10 border-t border-border pt-8">
          <div className="mb-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-3 sm:gap-x-5">
            {frameworks.map((fw) => (
              <Link
                key={fw.slug}
                href={frameworkGuidePath(fw.slug)}
                className="flex items-center gap-1.5 opacity-70 no-underline transition-opacity hover:opacity-100 focus-visible:opacity-100"
              >
                <span className="text-base">{fw.icon}</span>
                <span className="text-[11px] font-medium">{fw.name}</span>
              </Link>
            ))}
          </div>
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-center text-[11px] opacity-70">
            <span>{frameworks.length} frameworks</span>
            <span aria-hidden>·</span>
            <span>MIT licensed</span>
            <span aria-hidden>·</span>
            <span>Core has zero runtime deps</span>
            <span aria-hidden>·</span>
            <Link
              href="/changelog"
              className="no-underline transition-opacity hover:opacity-100"
            >
              {PKG_VERSION_BADGE}
            </Link>
            <span aria-hidden>·</span>
            <Link
              href="/known-limitations"
              className="no-underline transition-opacity hover:opacity-100"
            >
              Known limitations
            </Link>
          </div>
        </div>
      </div>

      <ThemeToast />
    </section>
  );
}
