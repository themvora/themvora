import type { ReactNode } from "react";

export function SectionHeading({
  num,
  desc,
  id,
  headingId,
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
        className="scroll-mt-24 text-lg font-semibold tracking-tight flex items-center gap-2.5"
      >
        {num !== undefined ? (
          <span
            className="w-6 h-6 shrink-0 rounded-full grid place-items-center text-xs font-bold"
            style={{
              background: "var(--theme-color-primary)",
              color:
                "var(--theme-color-primaryForeground)",
            }}
          >
            {num}
          </span>
        ) : null}
        {children}
      </h2>
      {desc ? (
        <div className="text-sm opacity-70 mt-1.5 leading-relaxed">{desc}</div>
      ) : null}
    </div>
  );
}
