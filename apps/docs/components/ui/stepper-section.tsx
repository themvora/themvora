import type { ReactNode } from "react";

/**
 * A step in a numbered flow, with a connector running between steps.
 *
 * The badge sits in the left gutter and a rule runs down that gutter, with a
 * short horizontal stub joining each badge to it — so the steps read as one
 * sequence rather than as a stack of unrelated headings.
 *
 * The connector is a **wide-screen affordance only**. Below `lg` the gutter
 * collapses and the number sits inline beside its heading: at phone width the
 * gutter would take a sixth of the column and the connector would have nothing
 * useful to join.
 *
 * Only the two guided flows use this — the library guide and the framework
 * quick-start. Reference pages keep plain headings, because their sections are
 * not a sequence and a connector would imply an order that does not exist.
 */
export function StepperSection({
  id,
  children,
  className,
  first = false,
  last = false,
}: {
  id?: string | undefined;
  children: ReactNode;
  className?: string | undefined;
  first?: boolean | undefined;
  last?: boolean | undefined;
}) {
  const rail = { background: "var(--theme-color-border)" } as const;

  return (
    <section
      {...(id ? { id } : {})}
      className={`relative scroll-mt-24 lg:pl-14 ${className ?? ""}`.trim()}
      data-stepper=""
    >
      {/* Vertical rail. Overshoots the section to bridge the gap between steps;
          the first step clips its top, the last its bottom. */}
      <span
        aria-hidden
        className="absolute hidden lg:block"
        style={{
          ...rail,
          left: 0,
          width: 1,
          top: first ? "0.75rem" : "-2.5rem",
          bottom: last ? "0" : "-2.5rem",
        }}
      />
      {/* Stub from the rail to the badge, so the number is visibly attached to
          the sequence rather than floating beside it. Sits on the badge's
          vertical centre (badge is 1.5rem tall at the top of the heading). */}
      <span
        aria-hidden
        className="absolute hidden lg:block"
        style={{ ...rail, left: 0, width: "1.25rem", height: 1, top: "0.875rem" }}
      />
      {children}
    </section>
  );
}
