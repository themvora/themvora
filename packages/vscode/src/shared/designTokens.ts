/**
 * The extension's own design tokens: the chrome around a theme, never the theme.
 *
 * One table drives every webview. The Studio and the sidebar get the dark
 * palette as authored, re-pointed at `--vscode-*` variables under the light and
 * high-contrast body classes VS Code sets, so a light or high-contrast workbench
 * is followed rather than fought. The Theme Preview panel forbids literal
 * colours, so it takes the structure and the `--vscode-*` mapping only.
 *
 * The module imports nothing; the Studio build prepends {@link DESIGN_TOKENS_CSS}
 * to its stylesheet and the inline webviews embed the strings directly.
 *
 * @packageDocumentation
 */

/** One colour token: its authored dark value and the workbench variable it follows elsewhere. */
interface ColorToken {
  readonly name: string;
  readonly dark: string;
  readonly vscode: string;
}

const COLOR_TOKENS: readonly ColorToken[] = [
  { name: "bg-0", dark: "#0b0c10", vscode: "var(--vscode-sideBar-background, var(--vscode-editor-background))" },
  { name: "bg-1", dark: "#0e0f13", vscode: "var(--vscode-sideBar-background, var(--vscode-editor-background))" },
  { name: "bg-2", dark: "#101116", vscode: "var(--vscode-editor-background)" },
  { name: "surface-1", dark: "#14151a", vscode: "var(--vscode-input-background, var(--vscode-editor-background))" },
  { name: "surface-2", dark: "#16181e", vscode: "var(--vscode-editorWidget-background, var(--vscode-editor-background))" },
  { name: "surface-sel", dark: "#171827", vscode: "var(--vscode-list-inactiveSelectionBackground, var(--vscode-editorWidget-background))" },
  { name: "surface-notice", dark: "#13141a", vscode: "var(--vscode-editorWidget-background, var(--vscode-editor-background))" },
  { name: "border", dark: "#1e2028", vscode: "var(--vscode-panel-border, var(--vscode-widget-border))" },
  { name: "border-ctl", dark: "#23252e", vscode: "var(--vscode-input-border, var(--vscode-panel-border))" },
  { name: "border-strong", dark: "#2a2c36", vscode: "var(--vscode-widget-border, var(--vscode-panel-border))" },
  { name: "text", dark: "#e7e8ec", vscode: "var(--vscode-foreground)" },
  { name: "text-2", dark: "#b4b6c0", vscode: "var(--vscode-foreground)" },
  { name: "text-muted", dark: "#8b8d98", vscode: "var(--vscode-descriptionForeground)" },
  { name: "accent", dark: "#a78bfa", vscode: "var(--vscode-textLink-foreground)" },
  { name: "accent-border", dark: "#6d5bd0", vscode: "var(--vscode-focusBorder)" },
  { name: "accent-tint", dark: "#1d1a33", vscode: "var(--vscode-badge-background)" },
  { name: "accent-tint-text", dark: "#c4b5fd", vscode: "var(--vscode-badge-foreground)" },
  { name: "seg-active", dark: "#262839", vscode: "var(--vscode-button-secondaryBackground, var(--vscode-list-inactiveSelectionBackground))" },
  { name: "seg-active-text", dark: "#ffffff", vscode: "var(--vscode-button-secondaryForeground, var(--vscode-foreground))" },
  { name: "ok", dark: "#5fd69a", vscode: "var(--vscode-testing-iconPassed, var(--vscode-foreground))" },
  { name: "ok-bg", dark: "#10261b", vscode: "color-mix(in srgb, var(--vscode-testing-iconPassed, var(--vscode-foreground)) 14%, transparent)" },
  { name: "warn", dark: "#f6b34a", vscode: "var(--vscode-editorWarning-foreground, var(--vscode-foreground))" },
  { name: "warn-bg", dark: "#241c0d", vscode: "color-mix(in srgb, var(--vscode-editorWarning-foreground, var(--vscode-foreground)) 14%, transparent)" },
  { name: "bad", dark: "#f87171", vscode: "var(--vscode-errorForeground, var(--vscode-foreground))" },
  { name: "bad-bg", dark: "#2a1215", vscode: "color-mix(in srgb, var(--vscode-errorForeground, var(--vscode-foreground)) 14%, transparent)" },
  { name: "ring", dark: "#a78bfa", vscode: "var(--vscode-focusBorder)" },
  { name: "cta-text", dark: "#ffffff", vscode: "var(--vscode-button-foreground)" },
];

/** Everything that is not a colour: type, radii, spacing, motion. */
const STRUCTURE = `
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 14px;
  --font-ui: "Inter", var(--vscode-font-family, system-ui), system-ui, -apple-system, "Segoe UI", sans-serif;
  --font-mono: "JetBrains Mono", var(--vscode-editor-font-family, ui-monospace), ui-monospace, "Cascadia Code", Consolas, monospace;
  --fs-overline: 11px;
  --fs-sm: 12px;
  --fs-ctl: 12.5px;
  --fs-body: 13px;
  --fs-title: 15px;
  --fs-dialog: 18px;
  --sp-1: 4px;
  --sp-2: 8px;
  --sp-3: 12px;
  --sp-4: 16px;
  --sp-5: 20px;
  --sp-6: 24px;
  --sp-7: 28px;
  --sp-8: 32px;
  --ease: cubic-bezier(0.2, 0.7, 0.3, 1);
  --dur: 140ms;
  --dur-drawer: 200ms;`;

function declarations(pick: (token: ColorToken) => string): string {
  return COLOR_TOKENS.map((token) => `  --${token.name}: ${pick(token)};`).join("\n");
}

/** The `--vscode-*` mapping alone, with no literal colour anywhere. */
const VSCODE_PALETTE = declarations((token) => token.vscode);

/**
 * The full token sheet for the Studio and the sidebar: the authored dark palette
 * by default, the workbench's own colours under light and high-contrast themes.
 */
export const DESIGN_TOKENS_CSS = `
:root {${STRUCTURE}
${declarations((token) => token.dark)}
  --cta: linear-gradient(135deg, #ec4899, #8b5cf6);
  /* The logo's own indigo, lifted for a dark surface: #4f46e5 on #0e0f13 is a
   * 2.4:1 shape, which reads as a smudge at 26px. */
  --brand-mark: #8b8cf8;
  --cta-shadow: 0 4px 16px rgba(139, 92, 246, 0.35);
  --hover-row: rgba(255, 255, 255, 0.02);
  --hover-btn: rgba(255, 255, 255, 0.04);
  --scrim: rgba(0, 0, 0, 0.55);
  --shadow-stage: 0 24px 60px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.04);
  --shadow-pop: 0 24px 64px rgba(0, 0, 0, 0.55), 0 0 0 1px rgba(255, 255, 255, 0.04);
  --ring-soft: 0 0 0 3px rgba(109, 91, 208, 0.2);
  --chip-ring: inset 0 0 0 1px rgba(255, 255, 255, 0.1);
}

body.vscode-light {
${VSCODE_PALETTE}
  /* The logo's own indigo. It is not a --vscode-* mapping because the mark is
   * brand, not chrome: it should look the same in every light workbench. */
  --brand-mark: #4f46e5;
  --hover-row: rgba(0, 0, 0, 0.025);
  --hover-btn: rgba(0, 0, 0, 0.05);
  --scrim: rgba(0, 0, 0, 0.32);
  --shadow-stage: 0 18px 48px rgba(15, 23, 42, 0.14), 0 0 0 1px rgba(15, 23, 42, 0.06);
  --shadow-pop: 0 24px 64px rgba(15, 23, 42, 0.22), 0 0 0 1px rgba(15, 23, 42, 0.06);
  --chip-ring: inset 0 0 0 1px rgba(0, 0, 0, 0.18);
}

body.vscode-high-contrast,
body.vscode-high-contrast-light {
${VSCODE_PALETTE}
  /* A fixed indigo cannot be guaranteed to contrast in a high-contrast theme, so
   * the mark follows the workbench's foreground there. */
  --brand-mark: var(--vscode-foreground);
  --border: var(--vscode-contrastBorder);
  --border-ctl: var(--vscode-contrastBorder);
  --border-strong: var(--vscode-contrastBorder);
  --accent-border: var(--vscode-contrastActiveBorder, var(--vscode-focusBorder));
  --cta: var(--vscode-button-background);
  --cta-shadow: none;
  --shadow-stage: 0 0 0 1px var(--vscode-contrastBorder);
  --shadow-pop: 0 0 0 1px var(--vscode-contrastBorder);
  --chip-ring: inset 0 0 0 1px var(--vscode-contrastBorder);
}

/* Forced light — independent of the host workbench theme. */
html[data-studio-appearance="light"],
html[data-studio-appearance="light"] body {
  /* Native widgets — scrollbar gutter, form controls — follow this, not the
   * workbench. Without it a dark VS Code paints a dark scrollbar strip down a
   * light Studio. */
  color-scheme: light;
  /* The UA paints its own bar from the native theme; these keep the Studio's
   * scrollbars light when the workbench is dark. */
  --scrollbar-thumb: rgba(0, 0, 0, 0.28);
  --scrollbar-thumb-hover: rgba(0, 0, 0, 0.4);
  --scrollbar-thumb-active: rgba(0, 0, 0, 0.5);
  --bg-0: #f8f9fb;
  --bg-1: #ffffff;
  --bg-2: #f3f4f6;
  --surface-1: #ffffff;
  --surface-2: #f3f4f6;
  --surface-sel: #eef2ff;
  --surface-notice: #f8fafc;
  --border: #e2e4e9;
  --border-ctl: #d1d5db;
  --border-strong: #c4c8d0;
  --text: #1f2937;
  --text-2: #4b5563;
  --text-muted: #6b7280;
  --accent: #6d5bd0;
  --accent-border: #7c3aed;
  --accent-tint: #ede9fe;
  --accent-tint-text: #5b21b6;
  --seg-active: #e5e7eb;
  --seg-active-text: #111827;
  --ok: #059669;
  --ok-bg: #d1fae5;
  --warn: #d97706;
  --warn-bg: #fef3c7;
  --bad: #dc2626;
  --bad-bg: #fee2e2;
  --ring: #7c3aed;
  --cta: linear-gradient(135deg, #ec4899, #8b5cf6);
  --brand-mark: #4f46e5;
  --cta-text: #ffffff;
  --cta-shadow: 0 4px 16px rgba(139, 92, 246, 0.25);
  --hover-row: rgba(0, 0, 0, 0.025);
  --hover-btn: rgba(0, 0, 0, 0.05);
  --scrim: rgba(0, 0, 0, 0.32);
  --shadow-stage: 0 18px 48px rgba(15, 23, 42, 0.14), 0 0 0 1px rgba(15, 23, 42, 0.06);
  --shadow-pop: 0 24px 64px rgba(15, 23, 42, 0.22), 0 0 0 1px rgba(15, 23, 42, 0.06);
  --ring-soft: 0 0 0 3px rgba(124, 58, 237, 0.15);
  --chip-ring: inset 0 0 0 1px rgba(0, 0, 0, 0.18);
}

/* Forced dark — mirrors :root so it wins even under a light workbench. */
html[data-studio-appearance="dark"],
html[data-studio-appearance="dark"] body {
  color-scheme: dark;
  --scrollbar-thumb: rgba(255, 255, 255, 0.24);
  --scrollbar-thumb-hover: rgba(255, 255, 255, 0.36);
  --scrollbar-thumb-active: rgba(255, 255, 255, 0.46);
${declarations((token) => token.dark)}
  --cta: linear-gradient(135deg, #ec4899, #8b5cf6);
  --brand-mark: #8b8cf8;
  --cta-shadow: 0 4px 16px rgba(139, 92, 246, 0.35);
  --hover-row: rgba(255, 255, 255, 0.02);
  --hover-btn: rgba(255, 255, 255, 0.04);
  --scrim: rgba(0, 0, 0, 0.55);
  --shadow-stage: 0 24px 60px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.04);
  --shadow-pop: 0 24px 64px rgba(0, 0, 0, 0.55), 0 0 0 1px rgba(255, 255, 255, 0.04);
  --ring-soft: 0 0 0 3px rgba(109, 91, 208, 0.2);
  --chip-ring: inset 0 0 0 1px rgba(255, 255, 255, 0.1);
}

/* High-contrast overrides must win even when an appearance is forced. */
body.vscode-high-contrast,
body.vscode-high-contrast-light {
  --border: var(--vscode-contrastBorder) !important;
  --border-ctl: var(--vscode-contrastBorder) !important;
  --border-strong: var(--vscode-contrastBorder) !important;
  --accent-border: var(--vscode-contrastActiveBorder, var(--vscode-focusBorder)) !important;
}
`;

/**
 * The token sheet for a webview that may not carry a literal colour: the same
 * structure and names, every colour taken from the workbench.
 */
export const DESIGN_TOKENS_VSCODE_CSS = `
:root {${STRUCTURE}
${VSCODE_PALETTE}
}
`;

/**
 * `@font-face` rules for the bundled fonts, for a webview that resolves them
 * through `asWebviewUri`. The Studio stylesheet declares its own, relative ones.
 *
 * @param inter - The URI of the Inter variable font.
 * @param mono - The URI of the JetBrains Mono variable font.
 * @returns The rules.
 */
export function fontFaceCss(inter: string, mono: string): string {
  return `
@font-face { font-family: "Inter"; font-style: normal; font-weight: 100 900; font-display: swap; src: url("${inter}") format("woff2"); }
@font-face { font-family: "JetBrains Mono"; font-style: normal; font-weight: 100 800; font-display: swap; src: url("${mono}") format("woff2"); }
`;
}
