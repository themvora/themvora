"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  useTheme,
  useThemeRuntime,
  useThemeHistory,
  useSetThemeFamily,
  useSetThemeMode,
} from "@themvora/next/client";
import { validateThemeContrast } from "@themvora/core";
import { Icon } from "@iconify/react";
import { ModeToggle } from "../mode-toggle";
import { ThemeQuickSwitcher } from "../theme-quick-switcher";
import { DEFAULT_THEME } from "../../app/theme/theme-config";

const EXPORT_FORMATS = [
  { id: "css", label: "CSS variables" },
  { id: "ts", label: "TypeScript definition" },
  { id: "json", label: "JSON" },
  { id: "tailwind", label: "Tailwind v4 @theme" },
  { id: "shadcn", label: "shadcn CSS variables" },
] as const;

function buildCSSVars(theme: Record<string, unknown>, prefix = "--theme"): string {
  const lines: string[] = [":root {"];
  function walk(obj: Record<string, unknown>, path: string[]) {
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === "string") {
        const varName = [...path, key].join("-");
        lines.push(`  ${varName}: ${value};`);
      } else if (value && typeof value === "object" && !Array.isArray(value)) {
        walk(value as Record<string, unknown>, [...path, key]);
      }
    }
  }
  walk({ colors: theme.colors ?? {}, radius: theme.radius ?? {} }, [prefix, "color"]);
  lines.push("}");
  return lines.join("\n");
}

function buildTSDefinition(name: string, theme: Record<string, unknown>): string {
  return `import { defineTheme } from "@themvora/core";\n\nexport const ${name.replace(/[^a-zA-Z0-9]/g, "-")} = defineTheme(${JSON.stringify({ name, tokens: theme }, null, 2)});\n`;
}

function buildTailwind(theme: Record<string, unknown>): string {
  const colors = (theme.colors ?? {}) as Record<string, string>;
  const lines: string[] = ["@theme {"];
  for (const [key, value] of Object.entries(colors)) {
    lines.push(`  --color-${key}: ${value};`);
  }
  lines.push("}");
  return lines.join("\n");
}

function buildShadcnCSS(theme: Record<string, unknown>): string {
  const colors = (theme.colors ?? {}) as Record<string, string>;
  const lines: string[] = [":root {"];
  for (const [key, value] of Object.entries(colors)) {
    const kebab = key.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
    lines.push(`  --${kebab}: ${value};`);
  }
  lines.push("}");
  return lines.join("\n");
}

function formatExport(format: string, themeName: string, tokens: Record<string, unknown>): string {
  switch (format) {
    case "css": return buildCSSVars(tokens);
    case "ts": return buildTSDefinition(themeName, tokens);
    case "json": return JSON.stringify({ name: themeName, tokens }, null, 2);
    case "tailwind": return buildTailwind(tokens);
    case "shadcn": return buildShadcnCSS(tokens);
    default: return "";
  }
}

export function WorkspaceBar() {
  const { family, mode, theme } = useTheme();
  const runtime = useThemeRuntime();
  const history = useThemeHistory();
  const setFamily = useSetThemeFamily();
  const setMode = useSetThemeMode();

  const [exportOpen, setExportOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const audit = useMemo(() => validateThemeContrast(theme), [theme]);

  const copyLink = useCallback(() => {
    const params = new URLSearchParams({
      family,
      mode,
      theme: theme.name,
    });
    const url = `${window.location.origin}${window.location.pathname}?${params.toString()}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [family, mode, theme.name]);

  const handleExport = useCallback((format: string) => {
    const tokens = (theme.tokens ?? {}) as Record<string, unknown>;
    const output = formatExport(format, theme.name, tokens);
    const ext = format === "ts" ? "ts" : format === "css" || format === "tailwind" || format === "shadcn" ? "css" : "json";
    const mime = format === "json" ? "application/json" : "text/plain";

    const blob = new Blob([output], { type: mime });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${theme.name}.${ext}`;
    a.click();
    URL.revokeObjectURL(a.href);
    setExportOpen(false);
  }, [theme]);

  const handleReset = useCallback(() => {
    history.clear();
    // The site's real default — not the first preset in the registry.
    const defaultTheme = runtime.themes.find((t) => t.name === DEFAULT_THEME);
    if (defaultTheme) {
      setFamily(defaultTheme.meta!.family!);
      setMode(defaultTheme.meta!.mode === "dark" ? "dark" : "light");
      if (defaultTheme.tokens) {
        runtime.update(defaultTheme.tokens);
      }
    }
  }, [history, runtime, setFamily, setMode]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        if (history.canUndo) history.undo();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "z" && e.shiftKey) {
        e.preventDefault();
        if (history.canRedo) history.redo();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [history]);

  useEffect(() => {
    if (!exportOpen) return;
    function onClick(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-export-menu]")) {
        setExportOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [exportOpen]);

  const auditPass = audit.passCount ?? 0;
  const auditTotal = audit.totalCount ?? 0;

  return (
    <div
      className="sticky top-0 z-40 mb-2 flex items-center gap-2 rounded-xl border border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 px-3 py-2 shadow-sm"
      role="toolbar"
      aria-label="Workspace controls"
    >
      {/* Family selector */}
      <ThemeQuickSwitcher align="left" />

      {/* Mode toggle */}
      <ModeToggle />

      {/* Theme name. `truncate` only took effect once .mono moved into
          @layer components; 220px fits the registry's longest names while the
          flex row squeezes the pill (overflow-hidden ⇒ min-width 0) on
          tighter md screens. */}
      <span className="hidden md:inline mono text-[11px] px-2 py-1 rounded-full border border-border opacity-70 truncate max-w-[220px]">
        {theme.name}
      </span>

      {/* Separator */}
      <div className="hidden sm:block w-px h-5 bg-border/60" aria-hidden />

      {/* Undo / Redo */}
      <div className="flex items-center gap-0.5">
        <button
          type="button"
          onClick={() => history.canUndo && history.undo()}
          disabled={!history.canUndo}
          title="Undo (Ctrl+Z)"
          aria-label="Undo"
          className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
        >
          <Icon icon="lucide:undo-2" className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => history.canRedo && history.redo()}
          disabled={!history.canRedo}
          title="Redo (Ctrl+Shift+Z)"
          aria-label="Redo"
          className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
        >
          <Icon icon="lucide:redo-2" className="h-4 w-4" />
        </button>
      </div>

      {/* Reset */}
      <button
        type="button"
        onClick={handleReset}
        title="Reset to default theme"
        aria-label="Reset"
        className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer transition-colors"
      >
        <Icon icon="lucide:rotate-ccw" className="h-4 w-4" />
      </button>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Audit badge */}
      <div
        className={`hidden sm:flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
          audit.valid
            ? "bg-green-500/10 text-green-600 dark:text-green-400"
            : "bg-red-500/10 text-red-600 dark:text-red-400"
        }`}
        title={`Accessibility audit: ${auditPass}/${auditTotal} pairs pass AA`}
        aria-label={`Audit: ${auditPass} of ${auditTotal} pairs pass WCAG AA`}
      >
        <Icon icon={audit.valid ? "lucide:check-circle" : "lucide:alert-circle"} className="h-3.5 w-3.5" />
        <span className="mono">{auditPass}/{auditTotal} AA</span>
      </div>

      {/* Copy link */}
      <button
        type="button"
        onClick={copyLink}
        title="Copy shareable link"
        aria-label="Copy link"
        className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer transition-colors"
      >
        <Icon icon={copied ? "lucide:check" : "lucide:link"} className="h-4 w-4" />
      </button>

      {/* Export dropdown */}
      <div className="relative" data-export-menu>
        <button
          type="button"
          onClick={() => setExportOpen((v) => !v)}
          title="Export theme"
          aria-label="Export theme"
          aria-expanded={exportOpen}
          className="flex items-center gap-1 rounded-lg border border-border bg-muted px-2.5 py-1.5 text-xs font-medium cursor-pointer hover:bg-muted/80 transition-colors"
        >
          <Icon icon="lucide:download" className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Export</span>
        </button>
        {exportOpen && (
          <div
            className="absolute right-0 top-full mt-1 w-48 rounded-lg border border-border bg-card shadow-lg z-50 overflow-hidden"
            role="menu"
          >
            {EXPORT_FORMATS.map((fmt) => (
              <button
                key={fmt.id}
                type="button"
                onClick={() => handleExport(fmt.id)}
                role="menuitem"
                className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors cursor-pointer"
              >
                {fmt.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
