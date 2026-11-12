"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type CopyState = "idle" | "copied" | "failed";

/**
 * An install command with a copy affordance.
 *
 * If the clipboard is unavailable the text is selected instead, so the visitor
 * only has to press the copy shortcut. Shared by the hero (a generic
 * `<your-framework>` command) and the closing quick start (a concrete one), so
 * the two cannot drift in behaviour.
 */
export function InstallCommand({
  command,
  className,
}: {
  command: string;
  className?: string | undefined;
}) {
  const [state, setState] = useState<CopyState>("idle");
  const timer = useRef<number | undefined>(undefined);
  const codeRef = useRef<HTMLElement | null>(null);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const reset = useCallback(() => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setState("idle"), 2200);
  }, []);

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(command);
      setState("copied");
    } catch {
      const node = codeRef.current;
      const selection = window.getSelection();
      if (node && selection) {
        const range = document.createRange();
        range.selectNodeContents(node);
        selection.removeAllRanges();
        selection.addRange(range);
      }
      setState("failed");
    }
    reset();
  }, [command, reset]);

  const label =
    state === "copied"
      ? "Copied"
      : state === "failed"
        ? "Press Ctrl/⌘ C"
        : "Copy";

  return (
    <div
      className={`install-command w-full max-w-full min-w-0 sm:w-auto bg-card ${className ?? ""}`.trim()}
    >
      {/* Wraps rather than clipping. As a single non-wrapping line it was being
          cut mid-token underneath the Copy button at 390px, and again at 1024px
          where the hero column is narrower than the command. Wrapping is safe
          here because Copy copies the raw string, not the rendered line breaks;
          on a wide column the command still occupies one line. */}
      <code
        ref={codeRef}
        className="mono min-w-0 flex-1 whitespace-normal break-words text-xs sm:text-sm"
      >
        {command}
      </code>
      <button
        type="button"
        onClick={copy}
        className="install-copy shrink-0"
        aria-label={
          state === "copied"
            ? "Copied"
            : state === "failed"
              ? "Copy failed, command selected"
              : "Copy install command"
        }
      >
        {label}
      </button>
      <span aria-live="polite" className="sr-only">
        {state === "copied"
          ? "Install command copied"
          : state === "failed"
            ? "Copy failed. The command is selected; press Control or Command C."
            : ""}
      </span>
    </div>
  );
}
