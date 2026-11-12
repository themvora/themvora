"use client";

import { useState, useCallback, useMemo } from "react";
import { FrameworkPicker, getExample } from "../framework-picker";
import { CodeBlock } from "../code-block";
import { Icon } from "@iconify/react";

interface SnippetMap {
  [framework: string]: {
    lang: string;
    code: string;
  };
}

export function ShowCode({
  snippets,
  stateLabel,
}: {
  snippets: SnippetMap;
  stateLabel?: string | undefined;
}) {
  const [open, setOpen] = useState(false);
  const [framework, setFramework] = useState("react");

  const entry = useMemo(() => getExample(snippets, framework), [snippets, framework]);

  const copyCode = useCallback(() => {
    navigator.clipboard.writeText(entry.code);
  }, [entry.code]);

  return (
    <div className="mt-5 rounded-lg border border-border overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-2 px-4 py-2.5 text-sm font-medium cursor-pointer hover:bg-muted/50 transition-colors bg-muted/30"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2">
          <Icon icon="lucide:code" className="h-4 w-4 opacity-60" />
          Show code
          {stateLabel && (
            <span className="text-[10px] font-normal opacity-50">
              · {stateLabel}
            </span>
          )}
        </span>
        <Icon
          icon={open ? "lucide:chevron-up" : "lucide:chevron-down"}
          className="h-4 w-4 opacity-60"
        />
      </button>

      {open && (
        <div className="border-t border-border">
          <div className="px-4 pt-3">
            <FrameworkPicker
              value={framework}
              onChange={setFramework}
              label="Framework"
            />
          </div>
          <div className="px-4 pb-4">
            <div className="relative">
              <CodeBlock code={entry.code} language={entry.lang} />
              <button
                type="button"
                onClick={copyCode}
                title="Copy code"
                aria-label="Copy code"
                className="absolute top-2 right-2 p-1.5 rounded-md bg-card/80 border border-border text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
              >
                <Icon icon="lucide:copy" className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
