"use client";

import { useState, useCallback, useMemo } from "react";
import { generateTheme, type ThemeDefinition } from "@themvora/core";
import { CopyButton } from "../ui/copy-button";
import { highlightCode } from "../../lib/highlight";

function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(" ");
}

function JsonPreview({ data }: { data: string }) {
  return (
    <div className="code-block overflow-hidden">
      <div className="code-block-toolbar">
        <span className="code-block-filename" title="Theme JSON">
          Theme JSON
        </span>
        <div className="flex items-center gap-1.5">
          <span className="code-block-lang">json</span>
          <CopyButton
            text={data}
            label="Copy"
            className="code-block-copy"
          />
        </div>
      </div>
      <div
        className="max-h-64 overflow-auto sm:max-h-96"
        dangerouslySetInnerHTML={{ __html: highlightCode(data, "json") }}
      />
    </div>
  );
}

function TsPreview({ data }: { data: string }) {
  return (
    <div className="code-block overflow-hidden">
      <div className="code-block-toolbar">
        <span className="code-block-filename" title="Theme definition">
          Theme Definition (TS)
        </span>
        <div className="flex items-center gap-1.5">
          <span className="code-block-lang">ts</span>
          <CopyButton text={data} label="Copy" className="code-block-copy" />
        </div>
      </div>
      <div
        className="max-h-64 overflow-auto sm:max-h-96"
        dangerouslySetInnerHTML={{ __html: highlightCode(data, "typescript") }}
      />
    </div>
  );
}

export function ThemeGenerator() {
  const [seed, setSeed] = useState("#3b82f6");
  const [family, setFamily] = useState("custom");
  const [withCode, setWithCode] = useState(false);
  const [result, setResult] = useState<{
    light: ThemeDefinition;
    dark: ThemeDefinition;
  } | null>(null);
  const [activeTab, setActiveTab] = useState<"json" | "ts">("json");

  const handleGenerate = useCallback(() => {
    const generated = generateTheme({ seed, family, withCode });
    setResult(generated);
  }, [seed, family, withCode]);

  const jsonOutput = useMemo(() => {
    if (!result) return "";
    return JSON.stringify(
      {
        light: {
          name: result.light.name,
          meta: result.light.meta,
          tokens: result.light.tokens,
        },
        dark: {
          name: result.dark.name,
          meta: result.dark.meta,
          tokens: result.dark.tokens,
        },
      },
      null,
      2,
    );
  }, [result]);

  const downloadFile = useCallback(
    (content: string, filename: string, type: string) => {
      const blob = new Blob([content], { type });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    },
    [],
  );

  /*
    The code export calls `generateTheme`, not `defineTheme`.

    Both of these used to serialise the entire generated pair back into
    `defineTheme(...)`, which inverts what the playground is demonstrating.
    `generateTheme` exists so that nobody authors those tokens; the JSON export
    below already ships the exact values for anyone who wants them. A `.ts` file
    that pastes two hundred lines of derived output back in as authored input
    teaches the wrong API and is not something a reader would ever write.

    The options are the ones this playground actually exposes, so the file
    reproduces the preview exactly.
  */
  const codeExport = useMemo(() => {
    if (!result) return "";
    const sanitized = (family.trim() || "custom").replace(/[^a-zA-Z0-9_]/g, "_");
    const options = [
      `  seed: ${JSON.stringify(seed)},`,
      `  family: ${JSON.stringify(family.trim() || "custom")},`,
      ...(withCode ? ["  // Opt in to the syntax-highlighting palette.", "  withCode: true,"] : []),
    ].join("\n");

    return `import { generateTheme } from "@themvora/core";

/**
 * One seed, two themes — every colour derived, including the surfaces, borders,
 * input edges and status roles. The exact values are in the JSON export; this
 * file is the reproducible form.
 */
export const { light: ${sanitized}Light, dark: ${sanitized}Dark } = generateTheme({
${options}
});

export const themes = [${sanitized}Light, ${sanitized}Dark];
`;
  }, [result, family, seed, withCode]);

  const tsOutput = codeExport;

  /** Whichever tab is showing, so the toolbar's copy button matches it. */
  const copyText = activeTab === "json" ? jsonOutput : tsOutput;

  return (
    <section className="rounded-xl border border-border bg-card p-5 sm:p-6" aria-label="Theme generator">
      <h2 className="text-lg font-semibold tracking-tight mb-1">
        Theme generator
      </h2>
      <p className="text-sm opacity-60 mb-5">
        Pick a seed color and generate a matching light/dark theme pair.
        Optional syntax-highlighting code tokens are generated on request.
      </p>

      <div className="flex flex-wrap items-end gap-4 mb-5">
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="seed-color"
            className="text-[11px] font-semibold uppercase tracking-widest opacity-40"
          >
            Seed color
          </label>
          <div className="flex items-center gap-2">
            <input
              id="seed-color"
              type="color"
              value={seed}
              onChange={(e) => setSeed(e.target.value)}
              className="w-10 h-10 rounded-lg border border-border cursor-pointer bg-transparent"
            />
            <input
              type="text"
              value={seed}
              onChange={(e) => setSeed(e.target.value)}
              placeholder="#3b82f6"
              aria-label="Seed color hex value"
              className="w-32 px-2 py-1.5 rounded-md border border-border bg-card text-sm font-mono outline-none focus:border-ring transition-colors"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="theme-family"
            className="text-[11px] font-semibold uppercase tracking-widest opacity-40"
          >
            Family name
          </label>
          <input
            id="theme-family"
            type="text"
            value={family}
            onChange={(e) => setFamily(e.target.value)}
            className="w-32 px-2 py-1.5 rounded-md border border-border bg-card text-sm font-mono outline-none focus:border-ring transition-colors"
          />
        </div>

        <label className="flex items-center gap-2 pb-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={withCode}
            onChange={(e) => setWithCode(e.target.checked)}
            className="h-4 w-4 rounded border-border accent-(--theme-color-primary) cursor-pointer"
          />
          <span className="text-sm opacity-70">Include code tokens</span>
        </label>

        <button
          type="button"
          onClick={handleGenerate}
          className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold cursor-pointer transition-colors hover:opacity-90"
        >
          Generate
        </button>
      </div>

      {result && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div
                className="w-6 h-6 rounded-full border border-border"
                style={{ background: `var(--theme-color-primary)` }}
              />
              <span className="text-sm font-medium">{result.light.name}</span>
            </div>
            <span className="opacity-40">→</span>
            <div className="flex items-center gap-2">
              <div
                className="w-6 h-6 rounded-full border border-border"
                style={{ background: `var(--theme-color-primary)` }}
              />
              <span className="text-sm font-medium">{result.dark.name}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("json")}
              className={`px-3 py-1.5 rounded-md text-xs font-medium cursor-pointer transition-colors ${
                activeTab === "json"
                  ? "bg-primary text-primary-foreground"
                  : "bg-card border border-border hover:bg-muted"
              }`}
            >
              JSON
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("ts")}
              className={`px-3 py-1.5 rounded-md text-xs font-medium cursor-pointer transition-colors ${
                activeTab === "ts"
                  ? "bg-primary text-primary-foreground"
                  : "bg-card border border-border hover:bg-muted"
              }`}
            >
              TypeScript
            </button>
            <div className="flex-1" />
            <span className="flex items-center gap-1.5">
              <CopyButton
                text={copyText}
                className="px-2.5 py-1 rounded-md border border-border bg-card text-xs font-medium cursor-pointer transition-colors hover:bg-muted"
              />
            </span>
          </div>

          {/* Download actions */}
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="text-[11px] font-semibold uppercase tracking-widest opacity-40">
              Download
            </span>
            <button
              type="button"
              onClick={() =>
                downloadFile(jsonOutput, `${family.trim() || "custom"}.json`, "application/json")
              }
              className="px-2.5 py-1 rounded-md border border-border bg-card text-xs font-medium cursor-pointer transition-colors hover:bg-muted"
            >
              .json
            </button>
            <button
              type="button"
              onClick={() =>
                downloadFile(tsOutput, `${family.trim() || "custom"}.ts`, "text/typescript")
              }
              className="px-2.5 py-1 rounded-md border border-border bg-card text-xs font-medium cursor-pointer transition-colors hover:bg-muted"
            >
              .ts
            </button>
          </div>

          {activeTab === "json" ? (
            <JsonPreview data={jsonOutput} />
          ) : (
            <TsPreview data={tsOutput} />
          )}
        </div>
      )}
    </section>
  );
}