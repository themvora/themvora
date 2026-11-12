import type { ReactNode } from "react";

/**
 * A compact application UI rendered entirely from semantic tokens.
 *
 * ## Why this exists
 *
 * The hero used to demonstrate a theme change with a code block whose *text*
 * changed. That proves the runtime fires; it does not show what the runtime is
 * for. This renders a small dashboard — sidebar, navigation, stat cards, chart,
 * activity rows, buttons, inputs — where every surface, border, text colour,
 * accent and radius is a semantic token (`bg-card`, `border-border`,
 * `text-muted-foreground`, `bg-primary`, `rounded-lg`, …).
 *
 * There is deliberately **no colour in this file**. Not one `#hex`, not one
 * `style={{ color }}`. When the visitor picks a family in the palette above, the
 * runtime rewrites the token variables on `<html>` and this whole panel
 * recolours — borders, radii, accents and all — because it never named a colour
 * in the first place. That is the product's central claim, demonstrated rather
 * than described.
 *
 * The corollary is that this component must not use `primary` as a *text*
 * colour on the canvas: `slack-dark` pins `primary` to an aubergine that is
 * 1.42:1 there (brand fidelity, by design). Filled pairs — `bg-primary` with
 * `text-primary-foreground` — are solved for contrast in every shipped theme,
 * so the active states below are fills.
 */

/** The bar heights of the activity chart, as percentages. */
const CHART = [38, 52, 44, 61, 49, 70, 58, 66, 54, 78, 63, 88, 72, 59, 81, 96];

const NAV = [
  { label: "Overview", active: true },
  { label: "Reports", active: false },
  { label: "Members", active: false },
  { label: "Billing", active: false },
];

function Dot({ className }: { className: string }) {
  return <span className={`size-1.5 shrink-0 rounded-full ${className}`} />;
}

function Stat({
  label,
  value,
  delta,
  trend,
}: {
  label: string;
  value: string;
  delta: string;
  trend: "up" | "down";
}) {
  return (
    <div className="min-w-0 rounded-lg border border-border bg-background p-2">
      <div className="truncate text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 truncate text-sm font-semibold text-foreground">
        {value}
      </div>
      {/* The delta is reading text, so it takes `foreground`. Direction is
          carried by the ▲/▼ glyph, not by colour: `success` and `destructive`
          are status roles, not reading colours, and they are not solved for
          contrast against `background` in every shipped theme. The arrow keeps
          the meaning for anyone who cannot separate the two hues. */}
      <div className="mt-0.5 flex items-center gap-1 text-[10px] font-medium text-foreground">
        <span aria-hidden>{trend === "up" ? "▲" : "▼"}</span>
        {delta}
      </div>
    </div>
  );
}

function ActivityRow({
  who,
  what,
  when,
  tone,
}: {
  who: string;
  what: string;
  when: string;
  tone: string;
}) {
  return (
    <li className="flex min-w-0 items-center gap-2">
      <Dot className={tone} />
      <span className="truncate text-[11px] text-foreground">
        <span className="font-medium">{who}</span>{" "}
        <span className="text-muted-foreground">{what}</span>
      </span>
      <span className="ml-auto shrink-0 text-[10px] text-muted-foreground">
        {when}
      </span>
    </li>
  );
}

export function HeroPreview({ caption }: { caption: ReactNode }) {
  return (
    <figure className="m-0">
      <div
        data-hero-preview
        // `aria-hidden`: this is a picture of an application, not an
        // application. Its fake figures and labels would otherwise be read out
        // as content. The caption below carries the part that is true — which
        // theme is applied — as real text.
        aria-hidden
        className="overflow-hidden rounded-xl border border-border bg-card shadow-sm"
      >
        {/* Window chrome. Neutral dots rather than red/amber/green: this is a
            surface, not a traffic light, and the semantic roles for those three
            colours mean something else. */}
        <div className="flex items-center gap-2 border-b border-border bg-muted/40 px-3 py-2">
          <span className="flex items-center gap-1">
            <span className="size-2 rounded-full bg-muted-foreground/25" />
            <span className="size-2 rounded-full bg-muted-foreground/25" />
            <span className="size-2 rounded-full bg-muted-foreground/25" />
          </span>
          <span className="ml-1 min-w-0 truncate rounded-md border border-border bg-background px-2 py-0.5 text-[10px] text-muted-foreground">
            app.acme.dev/overview
          </span>
        </div>

        <div className="grid grid-cols-[5.75rem_minmax(0,1fr)] sm:grid-cols-[6.5rem_minmax(0,1fr)]">
          {/* Sidebar — `bg-muted` against the card surface, so the two
              surface roles are visibly different. */}
          <div className="border-r border-border bg-muted/30 p-2">
            <div className="mb-3 flex items-center gap-1.5 px-0.5">
              <span className="size-4 shrink-0 rounded-md bg-primary" />
              <span className="truncate text-[11px] font-semibold text-foreground">
                Acme
              </span>
            </div>
            <div className="space-y-0.5">
              {NAV.map((item) => (
                <div
                  key={item.label}
                  className={`truncate rounded-md px-1.5 py-1 text-[10px] ${
                    item.active
                      ? "bg-primary font-semibold text-primary-foreground"
                      : "text-muted-foreground"
                  }`}
                >
                  {item.label}
                </div>
              ))}
            </div>
          </div>

          {/* Main pane */}
          <div className="min-w-0 space-y-2.5 p-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="truncate text-[12px] font-semibold text-foreground">
                Overview
              </span>
              <span className="shrink-0 rounded-md bg-primary px-2 py-1 text-[10px] font-semibold text-primary-foreground">
                New report
              </span>
            </div>

            <div className="grid grid-cols-3 gap-1.5">
              <Stat label="Visitors" value="12.4k" delta="12%" trend="up" />
              <Stat label="Uptime" value="99.2%" delta="0.3%" trend="up" />
              <Stat label="Errors" value="128" delta="8%" trend="down" />
            </div>

            {/* Activity chart: bars are the theme's primary at three weights. */}
            <div className="rounded-lg border border-border bg-background p-2">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  Requests
                </span>
                <span className="rounded-full bg-secondary px-1.5 py-0.5 text-[9px] font-semibold text-secondary-foreground">
                  7d
                </span>
              </div>
              <div className="flex h-11 items-end gap-[2px]">
                {CHART.map((height, i) => (
                  <span
                    key={i}
                    className={`w-full rounded-[2px] bg-primary ${
                      i === CHART.length - 1 ? "opacity-100" : "opacity-40"
                    }`}
                    style={{ height: `${height}%` }}
                  />
                ))}
              </div>
            </div>

            <ul className="space-y-1.5">
              <ActivityRow
                who="Mina"
                what="switched the workspace to dark mode"
                when="2m"
                tone="bg-success"
              />
              <ActivityRow
                who="Ravi"
                what="published a new theme family"
                when="18m"
                tone="bg-primary"
              />
            </ul>

            <div className="flex items-center gap-1.5">
              <span className="min-w-0 flex-1 truncate rounded-md border border-border bg-background px-2 py-1 text-[10px] text-muted-foreground">
                Search reports…
              </span>
              <span className="shrink-0 rounded-md border border-border px-2 py-1 text-[10px] font-medium text-foreground">
                Filter
              </span>
            </div>
          </div>
        </div>
      </div>

      <figcaption className="mt-2.5 text-center text-[11px] leading-relaxed text-muted-foreground lg:text-left">
        {caption}
      </figcaption>
    </figure>
  );
}
