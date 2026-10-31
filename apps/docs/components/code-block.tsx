"use client";

import { useState, useRef, useLayoutEffect } from "react";
import { CopyButton } from "./ui/copy-button";
import { CodeLanguageSwitch } from "./ui/code-language-switch";
import { useCodeLanguage } from "./code-language";
import type { CodeLanguageId, CodeVariant } from "../lib/code-variants";

const COLLAPSE_THRESHOLD = 25;
const COLLAPSED_MAX_HEIGHT = 280;

export function CodeBlock({
  html,
  code,
  language,
  filename,
  className,
  bordered = true,
  collapsible = true,
  variants,
  displayLanguage,
}: {
  /**
   * Pre-highlighted markup for `code`.
   *
   * Optional when `variants` is present: each variant carries its own markup, so
   * passing both would highlight the same source twice.
   */
  html?: string | undefined;
  code: string;
  language: string;
  filename?: string | undefined;
  className?: string;
  bordered?: boolean;
  collapsible?: boolean;
  /**
   * Both language forms of the snippet, pre-highlighted on the server.
   *
   * Absent for snippets that have no honest second form — CSS, shell, JSON, a
   * TypeScript-only declaration — and in that case the block renders exactly as
   * it always has, with no selector.
   */
  variants?: CodeVariant[] | undefined;
  /**
   * The languages the displayed source is usable in — `TS / JS`, `TSX / JSX`.
   *
   * A *label*, not a grammar: `language` still selects the highlighter and the
   * filename still carries its own extension. Computed on the server, because
   * the answer comes from the compiler; absent for CSS, shell, JSON, HTML and
   * the single-file components, where the plain grammar label is the whole truth.
   */
  displayLanguage?: string | null | undefined;
}) {
  // The page's choice when there is one (see `CodeLanguageProvider`), otherwise a
  // block-local choice, so the component still works outside `DocsLayout`.
  const pageLanguage = useCodeLanguage();
  const [localLanguage, setLocalLanguage] = useState<CodeLanguageId>("ts");
  const selectedLanguage = pageLanguage?.language ?? localLanguage;
  const setLanguage = pageLanguage?.setLanguage ?? setLocalLanguage;

  const paired = (variants?.length ?? 0) > 1;
  // A page-level choice can be "js" on a page where some blocks have no
  // JavaScript form; those blocks keep their single source rather than showing
  // an empty pane.
  const active = paired
    ? (variants?.find((variant) => variant.id === selectedLanguage) ?? variants?.[0])
    : undefined;

  const currentCode = active?.code ?? code;
  const currentHtml = active?.html ?? html ?? "";
  const currentLanguage = active?.lang ?? language;
  const currentFilename = active?.filename ?? filename;

  // The badge describes the source that is on screen. A selected JavaScript
  // variant is JavaScript whatever the TypeScript one claimed, so the combined
  // label belongs to the unpaired case only.
  const badge =
    active?.id === "js"
      ? active.lang === "jsx"
        ? "JSX"
        : active.lang === "js"
          ? "JS"
          : currentLanguage
      : (displayLanguage ?? currentLanguage);

  const codeLines = currentCode.split("\n");
  const lineCount =
    codeLines[codeLines.length - 1] === ""
      ? codeLines.length - 1
      : codeLines.length;
  const canCollapse = collapsible && lineCount > COLLAPSE_THRESHOLD;
  const [expanded, setExpanded] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const [hiddenCount, setHiddenCount] = useState(
    lineCount - COLLAPSE_THRESHOLD,
  );

  useLayoutEffect(() => {
    if (!canCollapse || expanded) return;
    const el = contentRef.current;
    if (!el) return;
    const h = el.clientHeight;
    if (h === 0) return;
    const firstLine = el.querySelector<HTMLElement>(".line");
    if (!firstLine) return;
    const lh = firstLine.getBoundingClientRect().height;
    if (lh <= 0) return;
    const visible = Math.max(1, Math.floor(h / lh));
    setHiddenCount(Math.max(0, lineCount - visible));
    // `lineCount` is derived from the selected variant, so switching language
    // re-measures the collapsed height instead of keeping the previous count.
  }, [canCollapse, expanded, lineCount]);

  return (
    <div
      className={`code-block group relative ${!bordered ? "code-block-unbordered" : ""} ${className ?? ""}`}
      data-collapsed={canCollapse && !expanded ? "" : undefined}
      data-code-variants={paired ? "" : undefined}
    >
      <div
        className="code-block-toolbar"
        onClick={(event) => event.stopPropagation()}
      >
        <span className="code-block-filename" title={currentFilename ?? badge}>
          {currentFilename ?? badge}
        </span>
        <div className="flex items-center gap-1.5 shrink-0">
          {paired ? (
            <CodeLanguageSwitch
              variants={variants ?? []}
              value={active?.id ?? "ts"}
              onChange={setLanguage}
              label={
                currentFilename
                  ? `Code language for ${currentFilename}`
                  : "Code language"
              }
            />
          ) : filename ? (
            <span className="code-block-lang">{badge}</span>
          ) : null}
          <CopyButton text={currentCode} label="Copy" className="code-block-copy" />
        </div>
      </div>
      <div
        ref={contentRef}
        // Only the selected variant is rendered. Rendering both and hiding one
        // would leave the unselected snippet in the accessibility tree and in
        // `Ctrl+F`, which is worse than not offering the choice at all.
        dangerouslySetInnerHTML={{ __html: currentHtml }}
        data-code-language={active?.id}
        // The Shiki language the pane was highlighted with — `tsx` becomes
        // `jsx` on a switch. Exposed because the token colours are CSS
        // variables and therefore identical in both languages: without this,
        // "was it re-highlighted as JavaScript?" is unanswerable from the DOM.
        data-code-lang={active?.lang ?? language}
        className={`code-block-content${canCollapse && !expanded ? " code-block-collapsed" : ""}`}
      />
      {canCollapse ? (
        <button
          type="button"
          className="code-block-expand"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
        >
          {expanded ? "Show less" : `Show ${hiddenCount} more lines`}
        </button>
      ) : null}
    </div>
  );
}
