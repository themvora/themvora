"use client";

import Link from "next/link";
import { useTheme } from "@themvora/next/client";

/**
 * The token panel.
 *
 * This used to be a grouped reference table — five labelled groups with per-role
 * notes — which is the shape a *docs* page uses to teach a token system. On a
 * contact page that reads as an appendix, so it is now one self-contained panel
 * that states the claim once and then shows the evidence.
 *
 * It reads the theme the runtime is *actually* applying rather than a list typed
 * out here, so switching the site theme updates every value. That is the point:
 * the page you are reading is built from the tokens it is listing.
 */

/** The roles worth showing: one per job, not the full 21. */
const ROLES: readonly { role: string; note: string }[] = [
  { role: "primary", note: "the brand action" },
  { role: "primaryForeground", note: "text on it" },
  { role: "accent", note: "highlight" },
  { role: "background", note: "the canvas" },
  { role: "card", note: "elevated panel" },
  { role: "muted", note: "quiet fill" },
  { role: "foreground", note: "primary text" },
  { role: "mutedForeground", note: "secondary text" },
  { role: "border", note: "structural hairline" },
  { role: "input", note: "interactive boundary" },
  { role: "ring", note: "focus indicator" },
  { role: "destructive", note: "danger" },
  { role: "success", note: "positive" },
];

export function LiveTokens() {
  const { theme, mode, family } = useTheme();
  const colors = (theme?.tokens?.colors ?? {}) as Record<
    string,
    string | undefined
  >;

  return (
    <section className="mt-16 sm:mt-24">
      <div className="rounded-2xl border border-border bg-card p-6 sm:p-8">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1.5 mb-6">
          <h2 className="text-base font-semibold tracking-tight">
            Every colour here comes from the theme
          </h2>
          <span
            className="mono text-[11px] px-2 py-0.5 rounded-full"
            style={{
              background:
                "color-mix(in srgb, var(--theme-color-primary) 12%, transparent)",
              color: "var(--theme-color-primary)",
            }}
          >
            {family ?? "—"} · {mode ?? "—"}
          </span>
          <Link
            href="/tokens"
            className="ml-auto text-[12px] text-foreground font-medium underline hover:decoration-foreground"
          >
            Browse all tokens →
          </Link>
        </div>

        <ul className="grid gap-x-6 gap-y-3.5 sm:grid-cols-2 lg:grid-cols-3">
          {ROLES.map(({ role, note }) => {
            const value = colors[role];
            return (
              <li key={role} className="flex items-center gap-3 min-w-0">
                <span
                  className="w-7 h-7 rounded-lg border border-border shrink-0"
                  style={value ? { background: value } : undefined}
                  aria-hidden
                />
                <span className="min-w-0 flex-1">
                  <span className="block mono text-[11px] truncate">
                    {role}
                  </span>
                  <span className="block text-[10px] opacity-50 leading-snug truncate">
                    {note}
                  </span>
                </span>
                <span className="shrink-0 mono text-[10px] opacity-55">
                  {value ?? "—"}
                </span>
              </li>
            );
          })}
        </ul>

        <p className="text-[11px] opacity-50 leading-relaxed mt-6 pt-5 border-t border-border">
          Each is available as{" "}
          <code className="mono">--theme-color-&lt;role&gt;</code>, or as a
          Tailwind utility such as <code className="mono">bg-primary</code> /{" "}
          <code className="mono">text-muted-foreground</code> through{" "}
          <code className="mono">@themvora/tailwind</code>. The wash behind the
          hero, the form&rsquo;s focus ring and the button above are all reading
          these values — nothing on this page is a literal colour.
        </p>
      </div>
    </section>
  );
}
