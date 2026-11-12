import type { ReactNode } from "react";

export function SectionHeading({
  num,
  desc,
  id,
  headingId,
  stepper = false,
  className,
  children,
}: {
  num?: number;
  desc?: ReactNode;
  id?: string;
  /**
   * Explicit id for the `<h2>` itself.
   *
   * `id` lands on the wrapper, which is the wrong element to link to when the
   * heading is the anchor a reader shares: the TOC assigns ids from heading
   * text, so a wrapper id and the heading's own id would either differ or, when
   * they happen to agree, collide. Pages that publish per-section anchors (the
   * framework examples pages link `#api-examples`, `#use-cases`, …) pass the
   * anchor here so it is the heading's id — the element the TOC and fragment
   * links resolve to.
   */
  headingId?: string;
  /**
   * Draw the number in the left gutter, for a flow rendered with
   * `StepperSection`. The section reserves the space; this only repositions
   * the badge so the connector can run beneath it.
   */
  stepper?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      id={id}
      className={`mb-4 ${id ? "scroll-mt-24" : ""} ${className ?? ""}`.trim()}
    >
      {/* `scroll-mt-24` lives on the heading, not only on the wrapper: the TOC
          assigns an id to every `h2`/`h3` from its text, so the heading — not
          the section around it — is what a fragment link resolves to. Without
          it the anchor lands under the sticky header. */}
      <h2
        id={headingId}
        className={`scroll-mt-24 text-lg font-semibold tracking-tight flex items-center gap-2.5${stepper ? " relative" : ""}`}
      >
        {num !== undefined ? (
          <span
            className={`w-6 h-6 shrink-0 rounded-full grid place-items-center text-xs font-bold${stepper ? " lg:absolute lg:-left-9 lg:top-1/2 lg:-translate-y-1/2" : ""}`}
            style={{
              background: "var(--theme-color-primary)",
              color: "var(--theme-color-primaryForeground)",
            }}
          >
            {num}
          </span>
        ) : null}
        {/* The label is a flex item, so its min-content width is the longest
            unbreakable token — `createDevToolsPlugin(options)` at 18px is wider
            than a phone column, and the heading pushed the page sideways with
            no way to reach the end of it. `min-w-0` lets the item shrink and
            `break-words` lets the token break only when it has to. */}
        <span className="min-w-0 break-words">{children}</span>
      </h2>
      {desc ? (
        <div className="text-sm opacity-70 mt-1.5 leading-relaxed">{desc}</div>
      ) : null}
    </div>
  );
}
