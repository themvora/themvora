"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  buildBootstrapPlan,
  computeFingerprint,
  readBootstrapState,
  serializeThemeBootstrapScript,
  type ThemeBootstrapState,
} from "@themvora/core";
import { Icon } from "@iconify/react";
import { CopyButton } from "../ui/copy-button";
import { ClientPre } from "../ui/client-pre";
import { DEFAULT_THEME, themes } from "../../app/theme/theme-config";

// The site's own registry and defaults — the same ones app/layout.tsx hands
// to ThemeProvider — so the readout resolves against the page that hosts it
// and the generated script is byte-for-byte what this site would inline.
const THEMES = themes;
const PLAN = buildBootstrapPlan(THEMES, {
  defaultTheme: DEFAULT_THEME,
  initialMode: "system",
});
const FINGERPRINT = computeFingerprint(THEMES, DEFAULT_THEME);

const SOURCES = [
  { value: "cookies", label: "Cookies (SSR)" },
  { value: "storage", label: "localStorage (SPA)" },
] as const;

type SourceKind = (typeof SOURCES)[number]["value"];

const PIPELINE = [
  {
    title: "Persist",
    desc: "Every selection is mirrored to cookies (SSR) or localStorage (SPA), tagged with a registry fingerprint.",
  },
  {
    title: "Resolve",
    desc: "The fingerprint is validated, then family + effective mode resolve to a concrete theme.",
  },
  {
    title: "Block",
    desc: "A blocking <head> script writes the CSS variables and data-theme attributes before first paint.",
  },
  {
    title: "Paint",
    desc: "The first frame is already the visitor's theme; the runtime adopts the painted state on hydrate.",
  },
];

export function SsrDemo() {
  const [source, setSource] = useState<SourceKind>("cookies");
  const [state, setState] = useState<
    ThemeBootstrapState<(typeof THEMES)[number]> | null
  >(null);

  useEffect(() => {
    setState(readBootstrapState(THEMES));
  }, []);

  const script = useMemo(() => {
    return source === "cookies"
      ? serializeThemeBootstrapScript(
          PLAN,
          {
            kind: "cookies",
            names: {
              mode: "theme-mode",
              family: "theme-family",
              fingerprint: "theme-fingerprint",
            },
          },
          { fingerprint: FINGERPRINT },
        )
      : serializeThemeBootstrapScript(PLAN, {
          kind: "storage",
          key: "theme-selection",
        });
  }, [source]);

  const themeLabel = state
    ? (state.theme.meta?.label ?? String(state.theme.name))
    : null;

  return (
    <div className="flex flex-col gap-5">
      {/* Live handoff readout — what this very page's bootstrap published. */}
      <div className="rounded-xl border border-border overflow-hidden">
        <div className="px-4 py-2 border-b border-border bg-muted/40 text-xs font-semibold uppercase tracking-wider opacity-50">
          This page — read off <code className="mono normal-case">&lt;html&gt;</code>{" "}
          by readBootstrapState()
        </div>
        {state ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-border">
            <ReadoutCell
              label="Theme"
              value={themeLabel ?? "—"}
              hint={String(state.theme.name)}
            />
            <ReadoutCell
              label="Selection"
              value={state.selection.mode}
              hint={`family: ${state.selection.family}`}
            />
            <ReadoutCell
              label="Resolved mode"
              value={state.resolvedMode}
              hint={
                state.selection.mode === "system"
                  ? "from prefers-color-scheme"
                  : "selected directly"
              }
            />
            <ReadoutCell
              label="Handoff"
              value={state.ready ? "complete" : "pending"}
              hint={state.ready ? "data-theme-ready=true" : "script did not report"}
              ok={state.ready}
            />
          </div>
        ) : (
          <div className="px-4 py-6 text-sm opacity-50 flex items-center gap-2">
            <Icon icon="lucide:loader-circle" className="h-4 w-4 animate-spin" />
            Reading the bootstrap state off the document…
          </div>
        )}
      </div>

      {/* The real generated blocking script. */}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Persistence source">
            {SOURCES.map((s) => (
              <button
                key={s.value}
                type="button"
                role="tab"
                aria-selected={source === s.value}
                onClick={() => setSource(s.value)}
                className={`chip ${source === s.value ? "chip-active" : ""}`}
              >
                {s.label}
              </button>
            ))}
          </div>
          <span className="text-[11px] mono opacity-50">
            {(script.length / 1024).toFixed(1)} KB · unminified, as shipped
          </span>
        </div>
        <div className="code-block overflow-hidden">
          <div className="code-block-toolbar">
            <span
              className="code-block-filename"
              title={
                source === "cookies"
                  ? "Reads theme-mode / theme-family / theme-fingerprint cookies, validated against the registry fingerprint"
                  : 'Reads the persisted selection from localStorage["theme-selection"]'
              }
            >
              {source === "cookies"
                ? "themvora-bootstrap.js — cookie source"
                : "themvora-bootstrap.js — storage source"}
            </span>
            <div className="flex items-center gap-1.5">
              <span className="code-block-lang">js</span>
              <CopyButton text={script} label="Copy script" className="code-block-copy" />
            </div>
          </div>
          <ClientPre
            code={script}
            lang="javascript"
            className="max-h-72 overflow-auto sm:max-h-96"
          />
        </div>
        <p className="mt-2 text-xs opacity-50 leading-relaxed">
          Switch the source to see the two persistence contracts: the cookie
          source is what <code className="mono">@themvora/next</code> reads on
          the server, the storage source is what the SPA providers read before
          first paint. Both are fingerprint-validated against the registry.
        </p>
      </div>

      {/* Pipeline strip. */}
      <div className="grid gap-2 sm:grid-cols-4">
        {PIPELINE.map((step, i) => (
          <div
            key={step.title}
            className="rounded-xl border border-border bg-muted/20 p-3"
          >
            <div className="flex items-center gap-2">
              <span
                className="w-5 h-5 shrink-0 rounded-full grid place-items-center text-[10px] font-bold"
                style={{
                  background: "var(--theme-color-primary)",
                  color: "var(--theme-color-primaryForeground)",
                }}
              >
                {i + 1}
              </span>
              <span className="text-sm font-semibold">{step.title}</span>
            </div>
            <div className="mt-1.5 text-xs opacity-60 leading-relaxed">
              {step.desc}
            </div>
          </div>
        ))}
      </div>

      <p className="text-sm opacity-60">
        Deep dive:{" "}
        <Link href="/zero-flash" className="text-foreground underline hover:decoration-foreground">
          Zero-flash guide
        </Link>{" "}
        ·{" "}
        <Link href="/persistence" className="text-foreground underline hover:decoration-foreground">
          Persistence
        </Link>
      </p>
    </div>
  );
}

function ReadoutCell({
  label,
  value,
  hint,
  ok,
}: {
  label: string;
  value: string;
  hint: string;
  ok?: boolean;
}) {
  return (
    <div className="px-4 py-3 min-w-0">
      <div className="text-[10px] font-semibold uppercase tracking-widest opacity-40">
        {label}
      </div>
      <div className="mt-1 flex items-center gap-1.5 text-sm font-semibold capitalize truncate">
        {ok !== undefined && (
          <Icon
            icon={ok ? "lucide:check-circle-2" : "lucide:x-circle"}
            className={`h-4 w-4 shrink-0 ${
              ok
                ? "text-(--theme-color-success)"
                : "text-(--theme-color-destructive)"
            }`}
          />
        )}
        {value}
      </div>
      <div className="mt-0.5 text-[11px] opacity-50 mono truncate">{hint}</div>
    </div>
  );
}
