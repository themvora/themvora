"use client";

import { useMemo, useState, useCallback } from "react";
import {
  checkContrastPair,
  createAccessibilityPlugin,
  getCVDLabel,
  simulateCVD,
  simulateThemeForCVD,
  validateThemeContrast,
  type ContrastCheck,
  type CVDType,
} from "@themvora/core";
import { useTheme, useThemeRuntime, useThemeHistory } from "@themvora/next/client";
import { CodeBlock } from "../code-block";
import { highlightCode } from "../../lib/highlight";

const CVD_TYPES: CVDType[] = [
  "protanopia",
  "deuteranopia",
  "tritanopia",
  "achromatopsia",
];

const ACCESSIBILITY_PROFILES = [
  {
    name: "high-contrast-light",
    label: "High Contrast · Light",
    desc: "Maximum contrast for readability.",
  },
  {
    name: "high-contrast-dark",
    label: "High Contrast · Dark",
    desc: "Maximum contrast on dark backgrounds.",
  },
  {
    name: "large-text-light",
    label: "Large Text · Light",
    desc: "Enlarged type on light backgrounds.",
  },
  {
    name: "large-text-dark",
    label: "Large Text · Dark",
    desc: "Enlarged type on dark backgrounds.",
  },
];

type StatusLabel = "PASS" | "FAIL";

/**
 * Parse a color string in various formats (hex, rgb, hsl, oklch) to hex.
 * Returns null if parsing fails.
 */
function parseColorToHex(input: string): string | null {
  const value = input.trim().toLowerCase();

  // Hex format
  if (value.startsWith("#")) {
    const hex = value.slice(1);
    if (/^[0-9a-f]{3,8}$/i.test(hex)) {
      if (hex.length === 3 || hex.length === 4) {
        return "#" + hex.split("").map(c => c + c).join("").slice(0, 6);
      }
      if (hex.length === 6 || hex.length === 8) {
        return "#" + hex.slice(0, 6);
      }
    }
    return null;
  }

  // RGB format: rgb(r, g, b) or rgb(r g b)
  const rgbMatch = value.match(/rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/);
  if (rgbMatch) {
    const r = Math.round(Math.min(255, Math.max(0, Number(rgbMatch[1]))));
    const g = Math.round(Math.min(255, Math.max(0, Number(rgbMatch[2]))));
    const b = Math.round(Math.min(255, Math.max(0, Number(rgbMatch[3]))));
    return "#" + [r, g, b].map(c => c.toString(16).padStart(2, "0")).join("");
  }

  // HSL format: hsl(h, s%, l%) or hsl(h s% l%)
  const hslMatch = value.match(/hsla?\(\s*([\d.]+)[,\s]+([\d.]+)%?[,\s]+([\d.]+)%?/);
  if (hslMatch) {
    const h = Number(hslMatch[1]) / 360;
    const s = Number(hslMatch[2]) / 100;
    const l = Number(hslMatch[3]) / 100;

    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    const r = Math.round(hue2rgb(p, q, h + 1/3) * 255);
    const g = Math.round(hue2rgb(p, q, h) * 255);
    const b = Math.round(hue2rgb(p, q, h - 1/3) * 255);

    return "#" + [r, g, b].map(c => c.toString(16).padStart(2, "0")).join("");
  }

  // OKLCH format: oklch(l c h)
  const oklchMatch = value.match(/oklch\(\s*([\d.]+)%?\s+([\d.]+)\s+([\d.]+)/);
  if (oklchMatch) {
    // Simplified OKLCH to hex conversion (approximate)
    const l = Number(oklchMatch[1]) > 1 ? Number(oklchMatch[1]) / 100 : Number(oklchMatch[1]);
    const c = Number(oklchMatch[2]);
    const h = Number(oklchMatch[3]);

    // Convert OKLCH to OKLab
    const hRad = h * Math.PI / 180;
    const a = c * Math.cos(hRad);
    const b_val = c * Math.sin(hRad);

    // Convert OKLab to linear sRGB (simplified approximation)
    const l_ = l + 0.3963377774 * a + 0.2158037573 * b_val;
    const m_ = l - 0.1055613458 * a - 0.0638541728 * b_val;
    const s_ = l - 0.0894841775 * a - 1.2914855480 * b_val;

    const l3 = l_ * l_ * l_;
    const m3 = m_ * m_ * m_;
    const s3 = s_ * s_ * s_;

    const rLinear = 4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3;
    const gLinear = -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3;
    const bLinear = -0.0041960863 * l3 - 0.7034186147 * m3 + 1.7076147010 * s3;

    // Apply gamma correction
    const gamma = (x: number) => x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1/2.4) - 0.055;

    const r = Math.round(Math.min(255, Math.max(0, gamma(rLinear) * 255)));
    const g = Math.round(Math.min(255, Math.max(0, gamma(gLinear) * 255)));
    const b = Math.round(Math.min(255, Math.max(0, gamma(bLinear) * 255)));

    return "#" + [r, g, b].map(c => c.toString(16).padStart(2, "0")).join("");
  }

  return null;
}

/**
 * Auto-fix a color to meet contrast requirements by adjusting lightness.
 * Returns the fixed hex color and the new contrast ratio.
 */
function autoFixForContrast(
  foreground: string,
  background: string,
  targetRatio: number = 4.5
): { fixed: string; ratio: number; delta: number } | null {
  const fgHex = parseColorToHex(foreground);
  const bgHex = parseColorToHex(background);

  if (!fgHex || !bgHex) return null;

  const originalPair = checkContrastPair(fgHex, bgHex);
  if (!originalPair || originalPair.ratio >= targetRatio) {
    return { fixed: fgHex, ratio: originalPair?.ratio ?? 0, delta: 0 };
  }

  // Parse foreground to RGB
  const r = parseInt(fgHex.slice(1, 3), 16);
  const g = parseInt(fgHex.slice(3, 5), 16);
  const b = parseInt(fgHex.slice(5, 7), 16);

  // Convert to HSL to adjust lightness
  const rNorm = r / 255;
  const gNorm = g / 255;
  const bNorm = b / 255;
  const max = Math.max(rNorm, gNorm, bNorm);
  const min = Math.min(rNorm, gNorm, bNorm);
  const l = (max + min) / 2;

  let hue = 0;
  let sat = 0;

  if (max !== min) {
    const d = max - min;
    sat = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case rNorm: hue = ((gNorm - bNorm) / d + (gNorm < bNorm ? 6 : 0)) / 6; break;
      case gNorm: hue = ((bNorm - rNorm) / d + 2) / 6; break;
      case bNorm: hue = ((rNorm - gNorm) / d + 4) / 6; break;
    }
  }

  // Try darkening or lightening to meet contrast
  const bgPair = checkContrastPair("#000000", bgHex);
  const shouldDarken = bgPair && bgPair.ratio > 1;

  for (let i = 0; i <= 100; i++) {
    const newL = shouldDarken ? l - (i / 100) * l : l + (i / 100) * (1 - l);

    // Convert HSL back to RGB
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };

    const q = newL < 0.5 ? newL * (1 + sat) : newL + sat - newL * sat;
    const p = 2 * newL - q;

    const newR = Math.round(hue2rgb(p, q, hue + 1/3) * 255);
    const newG = Math.round(hue2rgb(p, q, hue) * 255);
    const newB = Math.round(hue2rgb(p, q, hue - 1/3) * 255);

    const newHex = "#" + [newR, newG, newB].map(c =>
      Math.min(255, Math.max(0, c)).toString(16).padStart(2, "0")
    ).join("");

    const newPair = checkContrastPair(newHex, bgHex);
    if (newPair && newPair.ratio >= targetRatio) {
      return {
        fixed: newHex,
        ratio: newPair.ratio,
        delta: Math.abs(newL - l) * 100,
      };
    }
  }

  return null;
}

/**
 * Generate a downloadable report of the accessibility audit.
 */
function generateAuditReport(
  themeName: string,
  audit: ReturnType<typeof validateThemeContrast>,
  format: "json" | "markdown"
): string {
  const timestamp = new Date().toISOString();

  if (format === "json") {
    return JSON.stringify({
      theme: themeName,
      timestamp,
      summary: {
        valid: audit.valid,
        passCount: audit.passCount,
        totalCount: audit.totalCount,
        worstRatio: audit.worstRatio,
      },
      checks: audit.checks.map(c => ({
        foreground: c.foregroundToken,
        background: c.backgroundToken,
        ratio: c.ratio,
        passesAA: c.passesAANormal,
        passesAALarge: c.passesAALarge,
        passesAAA: c.passesAAANormal,
        passesAAALarge: c.passesAAALarge,
      })),
      nonTextChecks: audit.nonTextChecks.map(c => ({
        foreground: c.foregroundToken,
        background: c.backgroundToken,
        ratio: c.ratio,
        passes: c.passesNonText,
      })),
    }, null, 2);
  }

  // Markdown format
  const lines = [
    `# Accessibility Audit Report`,
    ``,
    `**Theme:** ${themeName}`,
    `**Date:** ${timestamp}`,
    ``,
    `## Summary`,
    ``,
    `- **Status:** ${audit.valid ? "✅ PASS" : "❌ FAIL"}`,
    `- **Passing pairs:** ${audit.passCount} / ${audit.totalCount}`,
    `- **Worst ratio:** ${audit.worstRatio.toFixed(2)}:1`,
    ``,
    `## Text Color Pairs (WCAG 2.1)`,
    ``,
    `| Foreground | Background | Ratio | AA | AA Large | AAA | AAA Large |`,
    `|------------|------------|-------|----|-----------|-----|-----------|`,
  ];

  for (const check of audit.checks) {
    lines.push(
      `| \`${check.foregroundToken}\` | \`${check.backgroundToken}\` | ${check.ratio.toFixed(2)}:1 | ${check.passesAANormal ? "✅" : "❌"} | ${check.passesAALarge ? "✅" : "❌"} | ${check.passesAAANormal ? "✅" : "❌"} | ${check.passesAAALarge ? "✅" : "❌"} |`
    );
  }

  if (audit.nonTextChecks.length > 0) {
    lines.push(
      ``,
      `## Non-Text UI Components (3:1 minimum)`,
      ``,
      `| Foreground | Background | Ratio | Pass |`,
      `|------------|------------|-------|------|`,
    );

    for (const check of audit.nonTextChecks) {
      lines.push(
        `| \`${check.foregroundToken}\` | \`${check.backgroundToken}\` | ${check.ratio.toFixed(2)}:1 | ${check.passesNonText ? "✅" : "❌"} |`
      );
    }
  }

  return lines.join("\n");
}

function getContrastStatus(
  passesAANormal: boolean,
  passesAALarge: boolean,
  passesAAANormal: boolean,
  passesAAALarge: boolean,
): { aa: StatusLabel; aaLarge: StatusLabel; aaa: StatusLabel; aaaLarge: StatusLabel } {
  return {
    aa: passesAANormal ? "PASS" : "FAIL",
    aaLarge: passesAALarge ? "PASS" : "FAIL",
    aaa: passesAAANormal ? "PASS" : "FAIL",
    aaaLarge: passesAAALarge ? "PASS" : "FAIL",
  };
}

function RatioBadge({ pass, label }: { pass: boolean; label: string }) {
  return (
    <span
      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
        pass
          ? "bg-green-500/15 text-green-600 dark:text-green-400"
          : "bg-red-500/10 text-red-500/60 line-through"
      }`}
    >
      {label}
    </span>
  );
}

function ContrastStatusGrid({
  passesAANormal,
  passesAALarge,
  passesAAANormal,
  passesAAALarge,
}: {
  passesAANormal: boolean;
  passesAALarge: boolean;
  passesAAANormal: boolean;
  passesAAALarge: boolean;
}) {
  const status = useMemo(
    () => getContrastStatus(passesAANormal, passesAALarge, passesAAANormal, passesAAALarge),
    [passesAANormal, passesAALarge, passesAAANormal, passesAAALarge],
  );

  return (
    <div className="grid grid-cols-2 gap-2 mt-2">
      <div className="flex items-center justify-between text-sm">
        <span className="opacity-70">AA Normal</span>
        <RatioBadge pass={status.aa === "PASS"} label={status.aa} />
      </div>
      <div className="flex items-center justify-between text-sm">
        <span className="opacity-70">AA Large</span>
        <RatioBadge pass={status.aaLarge === "PASS"} label={status.aaLarge} />
      </div>
      <div className="flex items-center justify-between text-sm">
        <span className="opacity-70">AAA Normal</span>
        <RatioBadge pass={status.aaa === "PASS"} label={status.aaa} />
      </div>
      <div className="flex items-center justify-between text-sm">
        <span className="opacity-70">AAA Large</span>
        <RatioBadge pass={status.aaaLarge === "PASS"} label={status.aaaLarge} />
      </div>
    </div>
  );
}

export function AccessibilityLab({ compact = false }: { compact?: boolean }) {
  const runtime = useThemeRuntime();
  const { theme } = useTheme();
  const history = useThemeHistory();

  const [fg, setFg] = useState("#0f172a");
  const [bg, setBg] = useState("#ffffff");
  const [fgInput, setFgInput] = useState("#0f172a");
  const [bgInput, setBgInput] = useState("#ffffff");
  const [useAPCA, setUseAPCA] = useState(false);
  const [autoFixResults, setAutoFixResults] = useState<Map<string, { fixed: string; ratio: number; delta: number }>>(new Map());

  const pair = useMemo(() => {
    try {
      return checkContrastPair(fg, bg);
    } catch {
      return null;
    }
  }, [fg, bg]);

  const audit = useMemo(() => validateThemeContrast(theme), [theme]);

  const handleFgInputChange = useCallback((value: string) => {
    setFgInput(value);
    const parsed = parseColorToHex(value);
    if (parsed) setFg(parsed);
  }, []);

  const handleBgInputChange = useCallback((value: string) => {
    setBgInput(value);
    const parsed = parseColorToHex(value);
    if (parsed) setBg(parsed);
  }, []);

  const handleAutoFix = useCallback((fgToken: string, bgToken: string, fgColor: string, bgColor: string) => {
    const result = autoFixForContrast(fgColor, bgColor, useAPCA ? 3 : 4.5);
    if (result) {
      setAutoFixResults(prev => new Map(prev).set(`${fgToken}-${bgToken}`, result));
    }
  }, [useAPCA]);

  const handleFixAll = useCallback(() => {
    const newResults = new Map<string, { fixed: string; ratio: number; delta: number }>();
    for (const check of audit.checks) {
      if (!check.passesAANormal) {
        const result = autoFixForContrast(check.foreground, check.background, useAPCA ? 3 : 4.5);
        if (result) {
          newResults.set(`${check.foregroundToken}-${check.backgroundToken}`, result);
        }
      }
    }
    setAutoFixResults(newResults);
  }, [audit.checks, useAPCA]);

  const handleApplyFixes = useCallback(() => {
    if (autoFixResults.size === 0) return;

    const base = (theme.tokens ?? {}) as Record<string, unknown>;
    const currentColors = (base.colors ?? {}) as Record<string, string>;
    const newColors = { ...currentColors };

    for (const [key, result] of autoFixResults) {
      const fgToken = key.split("-")[0];
      if (fgToken) {
        newColors[fgToken] = result.fixed;
      }
    }

    runtime.update({ ...base, colors: newColors });
    setAutoFixResults(new Map());
  }, [autoFixResults, theme, runtime]);

  const handleDownloadReport = useCallback((format: "json" | "markdown") => {
    const report = generateAuditReport(theme.name, audit, format);
    const blob = new Blob([report], { type: format === "json" ? "application/json" : "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${theme.name}-audit.${format}`;
    a.click();
    URL.revokeObjectURL(url);
  }, [theme.name, audit]);

  const primaryColor =
    typeof theme.tokens?.colors?.primary === "string"
      ? theme.tokens.colors.primary
      : "#6366f1";

  const cvd = useMemo(
    () =>
      CVD_TYPES.map((type) => ({
        type,
        label: getCVDLabel(type),
        color: simulateCVD(primaryColor, type),
      })),
    [primaryColor],
  );

  const [activeCVD, setActiveCVD] = useState<CVDType | null>(null);

  function applyProfile(name: string) {
    const profile = runtime.themes.find((t) => t.name === name);
    if (profile) runtime.update(profile.tokens ?? {});
  }

  function applyCVDSimulation() {
    if (!activeCVD) return;
    const simulated = simulateThemeForCVD(theme, activeCVD);
    runtime.update(simulated.tokens ?? {});
  }

  const [violation, setViolation] = useState<{
    themeName: string;
    checks: ContrastCheck[];
  } | null>(null);
  const [fixApplied, setFixApplied] = useState(false);

  const a11yPlugin = useMemo(
    () =>
      createAccessibilityPlugin({
        warnOnly: false,
        onViolation: (result) => setViolation(result),
      }),
    [],
  );

  function triggerViolation() {
    setFixApplied(false);
    const base = (theme.tokens ?? {}) as Record<string, unknown>;
    const currentColors = (base.colors ?? {}) as Record<string, string>;
    const candidate = {
      name: "low-contrast-demo",
      tokens: {
        ...base,
        colors: {
          ...currentColors,
          background: "#ffffff",
          foreground: "#ffffff",
          card: "#ffffff",
          cardForeground: "#ffffff",
          border: "#f1f5f9",
        },
      },
    } as const;
    // Run the exact hook the accessibility plugin listens to.
    a11yPlugin.onAfterThemeChange?.({ theme: candidate });
    setViolation((v) => v ?? { themeName: "low-contrast-demo", checks: [] });
  }

  function fixViolation() {
    applyProfile("high-contrast-light");
    setViolation(null);
    setFixApplied(true);
  }

  const simulationCss = useMemo(() => {
    if (!activeCVD) return "";
    const colors = simulateThemeForCVD(theme, activeCVD).tokens?.colors as
      Record<string, string> | undefined;
    if (!colors) return "";
    return Object.entries(colors)
      .slice(0, 12)
      .map(([k, v]) => `--theme-color-${k}: ${v};`)
      .join("\n");
  }, [activeCVD, theme]);

  return (
    <div className="flex flex-col gap-8">
      {!compact && (
        <header>
          <div className="chip mb-4">
            <span
              className="w-2 h-2 rounded-full"
              style={{ background: "var(--theme-color-primary)" }}
            />
            Accessibility Lab
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-3">
            WCAG contrast &amp; color vision, live
          </h2>
          <p className="opacity-70 max-w-2xl leading-relaxed">
            Every check below runs against the real accessibility toolkit in{" "}
            <code className="mono text-[0.9em]">@themvora/core</code> —{" "}
            <code className="mono text-[0.9em]">getContrastRatio</code>,{" "}
            <code className="mono text-[0.9em]">validateThemeContrast</code> and{" "}
            <code className="mono text-[0.9em]">simulateCVD</code>.
          </p>
        </header>
      )}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-base font-semibold mb-1">Contrast checker</h2>
          <p className="m-0 mb-2 text-sm opacity-60">
            Pick any two colors and check WCAG AA/AAA compliance instantly.
          </p>
          <p className="m-0 mb-4 text-xs opacity-50">
            This tool evaluates color contrast against WCAG 2.1 standards. It
            does not certify your entire application for WCAG conformance.
          </p>

          <div className="flex items-center gap-2 mb-4">
            <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
              <input
                type="checkbox"
                checked={useAPCA}
                onChange={(e) => setUseAPCA(e.target.checked)}
                className="rounded border-border"
              />
              <span>APCA mode</span>
              <span className="text-[10px] opacity-50" title="Accessible Perceptual Contrast Algorithm (WCAG 3.0 draft)">ⓘ</span>
            </label>
          </div>

          <div className="text-xs opacity-50 mb-4">
            {useAPCA
              ? "APCA thresholds: Lc 60 (body text) / Lc 45 (large text) / Lc 30 (non-text)"
              : "WCAG 2.1 AA/AAA thresholds: AA 4.5:1 (normal) / 3:1 (large); AAA 7:1 (normal) / 4.5:1 (large)"
            }
          </div>

          <div className="flex flex-col gap-2 mb-4">
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={fg}
                onChange={(e) => {
                  setFg(e.target.value);
                  setFgInput(e.target.value);
                }}
                className="w-10 h-10 p-0 border-2 border-border rounded-lg cursor-pointer bg-transparent shrink-0 outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
                aria-label="Foreground color"
              />
              <input
                type="text"
                value={fgInput}
                onChange={(e) => handleFgInputChange(e.target.value)}
                placeholder="#hex, rgb(), hsl(), or oklch()"
                aria-label="Foreground color value"
                className="flex-1 min-w-0 px-3 py-2 border-2 border-border rounded-lg bg-muted font-mono text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
                spellCheck={false}
              />
              <span className="text-xs opacity-40 shrink-0">foreground</span>
            </div>
            <div className="flex items-center">
              <div className="flex-1 border-t border-border/60" aria-hidden />
              <button
                type="button"
                onClick={() => {
                  setFg(bg);
                  setBg(fg);
                  setFgInput(bgInput);
                  setBgInput(fgInput);
                }}
                className="mx-2 px-2.5 py-1 rounded-lg border border-border bg-card text-xs font-medium cursor-pointer hover:bg-muted transition-colors"
                aria-label="Swap foreground and background colors"
                title="Swap foreground and background"
              >
                ⇅ swap
              </button>
              <div className="flex-1 border-t border-border/60" aria-hidden />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={bg}
                onChange={(e) => {
                  setBg(e.target.value);
                  setBgInput(e.target.value);
                }}
                className="w-10 h-10 p-0 border-2 border-border rounded-lg cursor-pointer bg-transparent shrink-0 outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
                aria-label="Background color"
              />
              <input
                type="text"
                value={bgInput}
                onChange={(e) => handleBgInputChange(e.target.value)}
                placeholder="#hex, rgb(), hsl(), or oklch()"
                aria-label="Background color value"
                className="flex-1 min-w-0 px-3 py-2 border-2 border-border rounded-lg bg-muted font-mono text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
                spellCheck={false}
              />
              <span className="text-xs opacity-40 shrink-0">background</span>
            </div>
          </div>

          {pair ? (
            <>
              <div
                className="flex flex-col items-center gap-2 p-6 rounded-xl border border-border"
                style={{ backgroundColor: bg, color: fg }}
              >
                <span className="text-4xl font-bold">Aa</span>
                <span className="mono text-sm">
                  ratio {pair.ratio.toFixed(2)} : 1
                </span>
                <div className="flex gap-1.5 flex-wrap justify-center">
                  <ContrastStatusGrid
                    passesAANormal={pair.passesAANormal}
                    passesAALarge={pair.passesAALarge}
                    passesAAANormal={pair.passesAAANormal}
                    passesAAALarge={pair.passesAAALarge}
                  />
                </div>
              </div>
              <p className="mt-3 m-0 text-xs opacity-50">
                {pair.passesAANormal
                  ? "This pair passes AA for normal text."
                  : "This pair fails AA for normal text — try darkening the foreground."}
              </p>
            </>
          ) : (
            <p className="m-0 text-sm opacity-50">
              Enter valid hex colors to check contrast.
            </p>
          )}
        </section>

        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-base font-semibold mb-1">
            Live theme audit ·{" "}
            <span className="mono text-sm">{theme.name}</span>
          </h2>
          <div className="flex items-center gap-2 mb-2">
            <RatioBadge
              pass={audit.valid}
              label={audit.valid ? "PASS" : "FAIL"}
            />
            <span className="text-xs opacity-60">
              {audit.passCount} / {audit.totalCount} pass AA
              {audit.totalCount > 0 && (
                <span className="ml-1">
                  · worst {audit.worstRatio.toFixed(2)}:1
                </span>
              )}
            </span>
          </div>
          <p className="m-0 mb-2 text-sm opacity-60">
            <code className="mono text-[0.9em]">validateThemeContrast()</code>{" "}
            run against the active theme&apos;s semantic pairs.
          </p>
          <p className="m-0 mb-4 text-xs opacity-50">
            This tool checks all semantic color pairs in the theme. Passing AA for
            normal text means the theme is generally accessible for standard
            content.
          </p>

          <div className="flex flex-wrap gap-2 mb-4">
            {audit.checks.some(c => !c.passesAANormal) && (
              <>
                <button
                  type="button"
                  onClick={handleFixAll}
                  className="px-3 py-1.5 rounded-lg border border-primary bg-primary/10 text-primary text-xs font-semibold cursor-pointer hover:bg-primary/20 transition-colors"
                >
                  Fix all failing pairs
                </button>
                {autoFixResults.size > 0 && (
                  <>
                    <button
                      type="button"
                      onClick={handleApplyFixes}
                      className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold cursor-pointer hover:opacity-90 transition-opacity"
                    >
                      Apply {autoFixResults.size} fix{autoFixResults.size !== 1 ? "es" : ""}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAutoFixResults(new Map());
                      }}
                      className="px-3 py-1.5 rounded-lg border border-border text-xs font-medium cursor-pointer hover:bg-muted transition-colors"
                    >
                      Clear fixes
                    </button>
                  </>
                )}
              </>
            )}
            <div className="flex-1" />
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => handleDownloadReport("json")}
                className="px-2.5 py-1.5 rounded-lg border border-border text-xs font-medium cursor-pointer hover:bg-muted transition-colors"
                title="Download audit report as JSON"
              >
                ↓ JSON
              </button>
              <button
                type="button"
                onClick={() => handleDownloadReport("markdown")}
                className="px-2.5 py-1.5 rounded-lg border border-border text-xs font-medium cursor-pointer hover:bg-muted transition-colors"
                title="Download audit report as Markdown"
              >
                ↓ MD
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            {audit.checks.map((check) => {
              const fixKey = `${check.foregroundToken}-${check.backgroundToken}`;
              const fixResult = autoFixResults.get(fixKey);
              const isFailing = !check.passesAANormal;

              return (
                <div
                  key={fixKey}
                  className="flex flex-col gap-1.5 px-3 py-2 rounded-lg border border-border bg-muted/30"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-6 h-6 rounded-md border border-black/10 shrink-0"
                        style={{ background: check.background }}
                      />
                      <span
                        className="w-6 h-6 rounded-md border border-black/10 shrink-0"
                        style={{ background: check.foreground }}
                      />
                      <code className="mono text-[11px] opacity-70 truncate">
                        {check.foregroundToken} on {check.backgroundToken}
                      </code>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`mono text-xs font-semibold ${
                          check.passesAANormal
                            ? "text-green-600 dark:text-green-400"
                            : "text-red-500"
                        }`}
                      >
                        {check.ratio.toFixed(2)} : 1
                      </span>
                      <RatioBadge pass={check.passesAANormal} label="AA" />
                      {isFailing && (
                        <button
                          type="button"
                          onClick={() => handleAutoFix(
                            check.foregroundToken,
                            check.backgroundToken,
                            check.foreground,
                            check.background
                          )}
                          className="px-2 py-0.5 rounded text-[10px] font-semibold border border-primary text-primary cursor-pointer hover:bg-primary/10 transition-colors"
                          title="Auto-fix this pair"
                        >
                          Fix
                        </button>
                      )}
                    </div>
                  </div>
                  <ContrastStatusGrid
                    passesAANormal={check.passesAANormal}
                    passesAALarge={check.passesAALarge}
                    passesAAANormal={check.passesAAANormal}
                    passesAAALarge={check.passesAAALarge}
                  />
                  {fixResult && (
                    <div className="flex items-center gap-2 px-2 py-1.5 rounded bg-green-500/10 border border-green-500/30 text-xs">
                      <span className="w-4 h-4 rounded border border-black/10" style={{ background: fixResult.fixed }} />
                      <span className="font-medium text-green-700 dark:text-green-400">
                        Fixed: {fixResult.ratio.toFixed(2)}:1
                      </span>
                      <span className="opacity-60">
                        (Δ {fixResult.delta.toFixed(1)}% lightness)
                      </span>
                      <code className="mono text-[10px] opacity-70 ml-auto">
                        {fixResult.fixed}
                      </code>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {audit.nonTextChecks.length > 0 && (
            <div className="mt-4">
              <h3 className="text-sm font-semibold mb-1">
                Non-text UI components
                <span className="ml-2 text-[10px] font-normal opacity-50">
                  WCAG 2.1 §1.4.11 · 3:1 minimum
                </span>
              </h3>
              <div className="flex flex-col gap-1.5">
                {audit.nonTextChecks.map((check) => (
                  <div
                    key={`nontext-${check.foregroundToken}-${check.backgroundToken}`}
                    className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg border border-border bg-muted/30"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-5 h-5 rounded-md border border-black/10 shrink-0"
                        style={{ background: check.background }}
                      />
                      <span
                        className="w-5 h-5 rounded-md border border-black/10 shrink-0"
                        style={{ background: check.foreground }}
                      />
                      <code className="mono text-[11px] opacity-70 truncate">
                        {check.foregroundToken} on {check.backgroundToken}
                      </code>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`mono text-xs font-semibold ${
                          check.passesNonText
                            ? "text-green-600 dark:text-green-400"
                            : "text-red-500"
                        }`}
                      >
                        {check.ratio.toFixed(2)} : 1
                      </span>
                      <RatioBadge pass={check.passesNonText} label="3:1" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-base font-semibold mb-1">
            Color vision deficiency simulation
          </h2>
          <p className="m-0 mb-4 text-sm opacity-60">
            <code className="mono text-[0.9em]">simulateCVD()</code> of the
            active primary ({primaryColor}).
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-2 gap-2 mb-4">
            {cvd.map((entry) => (
              <button
                key={entry.type}
                type="button"
                onClick={() =>
                  setActiveCVD((t) => (t === entry.type ? null : entry.type))
                }
                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border cursor-pointer transition-colors ${
                  activeCVD === entry.type
                    ? "border-primary bg-primary/10"
                    : "border-border bg-muted/30 hover:bg-muted"
                }`}
              >
                <span
                  className="w-9 h-9 rounded-lg border border-black/10"
                  style={{ background: entry.color }}
                />
                <span className="text-[10px] font-semibold text-center leading-tight">
                  {entry.label.split(" (")[0]}
                </span>
              </button>
            ))}
          </div>

          {activeCVD ? (
            <>
              <button
                type="button"
                onClick={applyCVDSimulation}
                className="w-full px-3 py-2.5 rounded-lg border border-primary bg-primary text-primary-foreground text-sm font-semibold cursor-pointer hover:opacity-90 transition-opacity"
              >
                Apply {getCVDLabel(activeCVD).split(" (")[0]} simulation to this
                site
              </button>
              <p className="m-0 mt-2 text-xs opacity-50">
                Re-themes the site with every color run through{" "}
                <code className="mono">simulateThemeForCVD()</code> so you can
                check readability exactly as a user with that condition sees it.
              </p>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={applyCVDSimulation}
                className="w-full px-3 py-2.5 rounded-lg border border-primary bg-primary text-primary-foreground text-sm font-semibold cursor-pointer hover:opacity-90 transition-opacity"
              >
                Apply {getCVDLabel("protanopia").split(" (")[0]} simulation to
                this site
              </button>
              <p className="m-0 mt-2 text-xs opacity-50">
                Re-themes the site with every color run through{" "}
                <code className="mono">simulateThemeForCVD()</code> so you can
                check readability exactly as a user with that condition sees it.
              </p>
            </>
          )}
        </section>

        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-base font-semibold mb-1">
            Accessibility profiles
          </h2>
          <p className="m-0 mb-4 text-sm opacity-60">
            Ready-made high-contrast and large-text themes shipped in{" "}
            <code className="mono text-[0.9em]">getBuiltInThemes()</code>.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {ACCESSIBILITY_PROFILES.map((profile) => {
              const exists = runtime.themes.some(
                (t) => t.name === profile.name,
              );
              return (
                <div
                  key={profile.name}
                  className="flex flex-col gap-2 p-3 rounded-lg border border-border bg-muted/30"
                >
                  <span className="text-sm font-semibold">{profile.label}</span>
                  <p className="m-0 text-xs opacity-60">{profile.desc}</p>
                  <button
                    type="button"
                    onClick={() => applyProfile(profile.name)}
                    disabled={!exists}
                    className="mt-auto px-3 py-1.5 rounded-lg border border-primary bg-primary text-primary-foreground text-xs font-semibold cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
                  >
                    Apply profile
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-base font-semibold mb-1">
          The accessibility plugin &mdash; reacting to violations
        </h2>
        <p className="m-0 mb-4 text-sm opacity-60">
          <code className="mono text-[0.9em]">createAccessibilityPlugin()</code>{" "}
          audits every applied theme at WCAG AA and fires{" "}
          <code className="mono text-[0.9em]">onViolation</code> when a theme
          breaks the configured requirements. This is that callback, live.
        </p>

        <div className="flex flex-wrap gap-3 mb-4">
          <button
            type="button"
            onClick={triggerViolation}
            className="px-3 py-2 rounded-lg border border-destructive/60 text-destructive text-sm font-semibold cursor-pointer hover:bg-destructive/10 transition-colors"
          >
            Trigger a violating theme
          </button>
          {violation && (
            <button
              type="button"
              onClick={fixViolation}
              className="px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold cursor-pointer hover:opacity-90 transition-opacity"
            >
              Fix it — apply High Contrast Light
            </button>
          )}
        </div>

        {!violation && !fixApplied && (
          <p className="m-0 text-xs opacity-50">
            Try it: a &ldquo;low-contrast-demo&rdquo; theme (white foreground on
            white background) is handed to the plugin&apos;s{" "}
            <code className="mono">onAfterThemeChange</code> hook — exactly what
            happens when such a theme is applied to a runtime.
          </p>
        )}

        {fixApplied && (
          <div className="rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm">
            <span className="font-semibold">
              Compliant alternative applied.
            </span>{" "}
            <span className="opacity-70">
              <code className="mono">high-contrast-light</code> passes its audit
              and re-themed this page — the site is readable again.
            </span>
          </div>
        )}

        {violation && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3">
            <div className="text-sm font-semibold flex items-center gap-2 mb-2">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              Theme &quot;{violation.themeName}&quot; —{" "}
              {violation.checks.length} WCAG AA violation(s)
            </div>
            <div className="flex flex-col gap-1">
              {violation.checks.map((check) => (
                <div
                  key={`${check.foregroundToken}-${check.backgroundToken}`}
                  className="flex flex-col gap-1.5 px-3 py-2 rounded-lg bg-card/60 text-sm"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-5 h-5 rounded-md border border-black/10 shrink-0"
                        style={{ background: check.background }}
                      />
                      <span
                        className="w-5 h-5 rounded-md border border-black/10 shrink-0"
                        style={{ background: check.foreground }}
                      />
                      <code className="mono text-[11px] opacity-70 truncate">
                        {check.foregroundToken} on {check.backgroundToken}
                      </code>
                    </div>
                    <span className="mono text-xs font-semibold text-red-500 shrink-0">
                      {check.ratio.toFixed(2)} : 1
                    </span>
                  </div>
                  <ContrastStatusGrid
                    passesAANormal={check.passesAANormal}
                    passesAALarge={check.passesAALarge}
                    passesAAANormal={check.passesAAANormal}
                    passesAAALarge={check.passesAAALarge}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {activeCVD && (
        <section>
          <div className="text-lg font-medium">CVD CSS Tokens</div>
          <hr className="mt-2 text-(--theme-color-accent)" />
          <div className="mt-3 inline-block overflow-x-auto w-full">
            <CodeBlock
              html={highlightCode(simulationCss, "css")}
              code={simulationCss}
              language="css"
            />
          </div>
        </section>
      )}
    </div>
  );
}
