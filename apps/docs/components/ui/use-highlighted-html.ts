"use client";

import { useEffect, useState } from "react";

/**
 * Highlight code after hydration, without shipping Shiki in the initial bundle.
 *
 * The highlighter and its grammars are a large dependency. Documentation pages
 * that render code from a client component used to import `lib/highlight`
 * directly, which put all of it in the route's first-load JavaScript. This hook
 * loads the same module as a separate chunk once the component is mounted.
 *
 * `enabled` is false when the caller already has server-rendered HTML (the
 * common case for `CodeBlock`), so those pages never request the chunk. While
 * the chunk is loading — and if it fails — callers render the plain source in a
 * `<pre className="shiki themvora">`, which uses the same layout styles but no
 * token colours.
 */
export function useHighlightedHtml(
  code: string,
  lang: string,
  enabled = true,
): string | null {
  const [html, setHtml] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || !code) {
      setHtml(null);
      return;
    }
    let cancelled = false;
    import("../../lib/highlight").then(({ highlightCode }) => {
      if (!cancelled) setHtml(highlightCode(code, lang));
    });
    return () => {
      cancelled = true;
    };
  }, [code, lang, enabled]);

  return html;
}
