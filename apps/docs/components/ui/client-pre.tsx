"use client";

import { useHighlightedHtml } from "./use-highlighted-html";

/**
 * Highlighted code for hand-built blocks that already own their toolbar.
 *
 * `CodeBlock` is the normal primitive. The Theme Studio and a few labs render
 * their own `.code-block` shell because the toolbar is generated output rather
 * than a filename, and they need the same on-demand highlighting. This keeps
 * Shiki out of the route's initial bundle while preserving the markup contract.
 */
export function ClientPre({
  code,
  lang,
  className,
}: {
  code: string;
  lang: string;
  className?: string;
}) {
  const html = useHighlightedHtml(code, lang);
  return (
    <div
      className={className}
      {...(html ? { dangerouslySetInnerHTML: { __html: html } } : {})}
    >
      {html ? null : (
        <pre
          className="shiki themvora"
          style={{
            background: "var(--tv-code-bg)",
            color: "var(--tv-syntax-plain)",
          }}
        >
          <code>{code}</code>
        </pre>
      )}
    </div>
  );
}
