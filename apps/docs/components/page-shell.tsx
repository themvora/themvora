import type { ReactNode } from "react";

/**
 * The shell for a page that sits directly under the site chrome.
 *
 * ## Why this exists
 *
 * Most pages here are documentation and use `DocsLayout`: a rail, a sidebar, a
 * table of contents, a related-links footer. The legal set and contact are not
 * documentation — they have none of that, and should not.
 *
 * What they do need is to line up with the header and footer above and below
 * them. Those are `max-w-6xl`. These pages were not:
 *
 * | Page | Left edge at 1440px |
 * | ---- | ------------------- |
 * | Site header and footer | **104px** |
 * | `/contact` (`max-w-5xl`) | 232px |
 * | `/privacy`, `/terms`, `/security`, `/license` (`max-w-3xl`) | 360px |
 *
 * Three different content widths down one page, which is what "doesn't fit the
 * layout" looks like when you measure it. Everything now shares
 * {@link STANDALONE_SHELL}, so the edges align and the five pages read as one set.
 *
 * ## Why the prose is still narrow
 *
 * The shell is `max-w-6xl` so it aligns; the *running text* inside is
 * {@link PROSE_MEASURE}. A 1152px line of body copy is roughly 130 characters,
 * well past the 60–75 that reads comfortably. Aligning the container and capping
 * the measure are two different jobs, and doing only the first is how a page ends
 * up wide and unreadable.
 *
 * @packageDocumentation
 */

/**
 * The content width of a standalone page.
 *
 * Deliberately identical to the site header and footer, so a page's edges line up
 * with the chrome rather than floating inside it.
 */
export const STANDALONE_SHELL = "mx-auto max-w-6xl px-6 pt-14 pb-20 sm:pt-20";

/** The comfortable measure for running prose inside a full-width shell. */
export const PROSE_MEASURE = "max-w-3xl";

/**
 * The masthead a standalone page opens with.
 *
 * A title and its metadata on one baseline row, a rule, then the lead. The row is
 * what makes the full width look intentional rather than merely wide: the title
 * anchors the left edge, the metadata anchors the right, and the space between
 * them is doing a job.
 */
export function PageMasthead({
  eyebrow,
  title,
  meta,
  lead,
  actions,
  align = "start",
}: {
  /** A chip above the title, when the page wants one. */
  eyebrow?: ReactNode;
  title: ReactNode;
  /** Right-hand metadata: a date, a status, a version. */
  meta?: ReactNode;
  lead: ReactNode;
  /** Links or buttons that belong with the lead, above the rule. */
  actions?: ReactNode;
  /**
   * Where the masthead sits. `start` is the editorial default and what the legal
   * pages use; `center` suits a page with a form or a call to action under it.
   */
  align?: "start" | "center";
}) {
  const centered = align === "center";

  return (
    <header
      className={`border-b border-border pb-8 mb-10 ${
        centered ? "text-center" : ""
      }`}
    >
      <div
        className={`flex flex-wrap items-baseline gap-x-6 gap-y-2 ${
          centered ? "justify-center" : "justify-between"
        }`}
      >
        <div className="min-w-0">
          {eyebrow ? <div className="mb-4">{eyebrow}</div> : null}
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-balance">
            {title}
          </h1>
        </div>
        {meta ? (
          <p className="shrink-0 text-sm opacity-60">{meta}</p>
        ) : null}
      </div>

      <p
        className={`mt-5 ${PROSE_MEASURE} text-base sm:text-lg leading-relaxed opacity-75 text-pretty ${
          centered ? "mx-auto" : ""
        }`}
      >
        {lead}
      </p>

      {actions ? (
        <div
          className={`mt-7 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm ${
            centered ? "justify-center" : ""
          }`}
        >
          {actions}
        </div>
      ) : null}
    </header>
  );
}
