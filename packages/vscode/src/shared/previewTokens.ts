/**
 * The token contract every preview surface is painted from.
 *
 * A preview root (`.tvp`) carries exactly the 21 core roles as short custom
 * properties (`--primary`, `--muted-foreground`, …) and nothing else. Every rule
 * under it reads those, or a `color-mix(in srgb, …)` of two of them. No literal
 * colour, no `--vscode-*` variable, no host stylesheet reaches inside.
 *
 * The module imports nothing: the Studio bundle, the panel's inline stylesheet
 * and the build script all consume it as plain strings.
 *
 * @packageDocumentation
 */

/** The 21 core roles, in core's order. */
export const PREVIEW_ROLES = [
  "background",
  "foreground",
  "muted",
  "mutedForeground",
  "card",
  "cardForeground",
  "popover",
  "popoverForeground",
  "primary",
  "primaryForeground",
  "secondary",
  "secondaryForeground",
  "accent",
  "accentForeground",
  "destructive",
  "destructiveForeground",
  "success",
  "successForeground",
  "border",
  "input",
  "ring",
] as const;

/** One core role. */
export type PreviewRole = (typeof PREVIEW_ROLES)[number];

/**
 * The custom property a role is exposed as on the preview root.
 *
 * @param role - A camel-case role, e.g. `mutedForeground`.
 * @returns Its property, e.g. `--muted-foreground`.
 */
export function roleProperty(role: string): string {
  return `--${role.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}`;
}

/**
 * The declarations a preview root carries.
 *
 * Every role is declared, even a missing one: `initial` makes it the guaranteed
 * invalid value, so a host page's own `--border` or `--accent` can never be
 * inherited into the preview in its place.
 *
 * @param roles - The theme's role values.
 * @returns Property → value, for CSSOM or a React style object.
 */
export function previewRoleStyle(
  roles: readonly { readonly role: string; readonly value: string | null }[],
): Record<string, string> {
  const values = new Map(roles.map((entry) => [entry.role, entry.value]));
  const style: Record<string, string> = {};
  for (const role of PREVIEW_ROLES) {
    const value = values.get(role);
    style[roleProperty(role)] = value === undefined || value === null || value.length === 0 ? "initial" : value;
  }
  return style;
}

/**
 * Escape text for an HTML text node or a double-quoted attribute.
 *
 * @param value - Untrusted text: theme names and values come from user files.
 * @returns The escaped text.
 */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Stroke icons, 24-unit grid. */
const ICON_PATHS: Record<string, string> = {
  overview: '<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>',
  analytics: '<path d="M3 3v18h18"/><path d="m7 15 4-4 3 3 5-6"/>',
  orders: '<path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/>',
  customers: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  products: '<path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>',
  reports: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M8 13h8"/><path d="M8 17h5"/>',
  settings: '<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>',
  help: '<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
  plus: '<path d="M12 5v14"/><path d="M5 12h14"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/>',
  share: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.59 13.51 6.83 3.98"/><path d="m15.41 6.51-6.82 3.98"/>',
  up: '<path d="M7 17 17 7"/><path d="M8 7h9v9"/>',
  down: '<path d="M7 7l10 10"/><path d="M17 8v9H8"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  chevron: '<path d="m6 9 6 6 6-6"/>',
  dollar: '<path d="M12 2v20"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>',
  receipt: '<path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/><path d="M8 7h8"/><path d="M8 11h8"/><path d="M8 15h5"/>',
  info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>',
  alert: '<circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/>',
  success: '<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>',
  trash: '<path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
  copy: '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
  edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
  more: '<circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>',
  sparkles: '<path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z"/>',
};

/**
 * An inline stroke icon.
 *
 * @param name - A key of the icon table.
 * @param className - The class to carry.
 * @returns SVG markup; colour comes from `currentColor`.
 */
export function previewIcon(name: string, className = "tvp-icon"): string {
  return `<svg class="${className}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${ICON_PATHS[name] ?? ""}</svg>`;
}

/** The Themvora mark, inline: the panel CSP forbids remote images. */
export function previewMark(className: string): string {
  return `<svg class="${className}" viewBox="0 0 128 128" aria-hidden="true" focusable="false"><rect x="6.5" y="6.5" width="115" height="115" rx="26" fill="none" stroke="currentColor" stroke-width="7"/><circle cx="42.5" cy="81.5" r="18" fill="currentColor"/><circle cx="66.5" cy="48.5" r="15" fill="currentColor" opacity="0.65"/><circle cx="88" cy="75.5" r="11.5" fill="currentColor" opacity="0.35"/></svg>`;
}

/** One swatch rule per role, so a swatch needs no inline style. */
const SWATCH_RULES = PREVIEW_ROLES.map(
  (role) => `.tvp [data-swatch="${role}"] { background: var(${roleProperty(role)}); }`,
).join("\n");

/**
 * The base every surface shares: the root, the resets that keep host styles
 * out, focus, selection, scrollbars, motion and the inspect overlay.
 */
export const PREVIEW_BASE_CSS = `
.tvp {
  --tvp-r-sm: 8px;
  --tvp-r-md: 10px;
  --tvp-r-lg: 14px;
  --tvp-ease: cubic-bezier(0.2, 0.7, 0.3, 1);
  --tvp-shadow-card: 0 1px 2px color-mix(in srgb, var(--foreground) 6%, transparent), 0 8px 24px color-mix(in srgb, var(--foreground) 5%, transparent);
  --tvp-shadow-pop: 0 12px 32px color-mix(in srgb, var(--foreground) 14%, transparent), 0 2px 6px color-mix(in srgb, var(--foreground) 8%, transparent);
  position: relative;
  container: tvp / inline-size;
  color-scheme: light;
  font-family: "Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  font-size: 13px;
  line-height: 1.5;
  font-feature-settings: "cv11", "ss01";
  text-align: left;
  background: var(--background);
  color: var(--foreground);
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}

.tvp[data-mode="dark"] { color-scheme: dark; }

.tvp *, .tvp *::before, .tvp *::after { box-sizing: border-box; }

.tvp :where(h1, h2, h3, h4, p, ul, ol, figure, table) { margin: 0; padding: 0; }
.tvp :where(ul, ol) { list-style: none; }
.tvp :where(table) { border-collapse: collapse; border-spacing: 0; width: 100%; }
.tvp :where(th, td) { padding: 0; text-align: left; font-weight: inherit; }

/* Host pages style bare controls; a preview control is drawn from tokens only. */
.tvp :where(button, input, select, textarea, a, kbd) {
  all: unset;
  box-sizing: border-box;
}

.tvp :where(*) {
  transition: background-color 200ms var(--tvp-ease), border-color 200ms var(--tvp-ease), color 200ms var(--tvp-ease), fill 200ms var(--tvp-ease), stroke 200ms var(--tvp-ease), box-shadow 200ms var(--tvp-ease);
}

.tvp :where(button, [role="button"], select, a) { cursor: pointer; }
.tvp :where(input, textarea) { cursor: text; }
.tvp :where(button:disabled) { cursor: default; }

.tvp :focus { outline: none; }
.tvp :focus-visible { outline: 2px solid var(--ring); outline-offset: 2px; }

.tvp ::selection { background: var(--primary); color: var(--primary-foreground); }
.tvp ::placeholder { color: var(--muted-foreground); opacity: 1; }

.tvp ::-webkit-scrollbar { width: 10px; height: 10px; }
.tvp ::-webkit-scrollbar-track { }
.tvp ::-webkit-scrollbar-corner { }
.tvp ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 999px; background-clip: padding-box; }
.tvp ::-webkit-scrollbar-thumb:hover { background: var(--muted-foreground); background-clip: padding-box; }

.tvp .tvp-icon { width: 16px; height: 16px; flex: none; display: block; }

.tvp .tvp-sr {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}

.tvp [hidden] { display: none !important; }

.tvp [data-swatch] { display: inline-block; }
${SWATCH_RULES}

/* Inspection: the selected token's regions, and the hover-to-inspect overlay. */
.tvp .tvp-highlighted { outline: 2px solid var(--ring); outline-offset: 2px; }
.tvp [data-preview-region][data-inspect] { cursor: pointer; }
.tvp.tvp-inspecting [data-token] { cursor: crosshair; }
.tvp .tvp-inspect-target { outline: 2px dashed var(--ring) !important; outline-offset: 2px; }

.tvp .tvp-pop {
  position: absolute;
  z-index: 40;
  min-width: 220px;
  max-width: 300px;
  padding: 10px 12px;
  border-radius: var(--tvp-r-md);
  background: var(--popover);
  color: var(--popover-foreground);
  border: 1px solid var(--border);
  box-shadow: var(--tvp-shadow-pop);
  font-size: 12px;
  line-height: 1.4;
  pointer-events: none;
  transition: none;
}

.tvp .tvp-pop-title { font-weight: 600; margin-bottom: 6px; display: block; }
.tvp .tvp-pop-row { display: grid; grid-template-columns: 14px auto minmax(0, 1fr); align-items: center; gap: 8px; padding: 2px 0; }
.tvp .tvp-pop-row > span:last-child { justify-self: end; font-family: "JetBrains Mono", ui-monospace, monospace; font-size: 11px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tvp .tvp-pop-chip { width: 14px; height: 14px; border-radius: 4px; border: 1px solid var(--border); }
.tvp .tvp-pop-foot { display: flex; align-items: center; gap: 6px; margin-top: 8px; padding-top: 8px; border-top: 1px solid var(--border); font-weight: 600; }
.tvp .tvp-pop-dot { width: 8px; height: 8px; border-radius: 50%; flex: none; }
.tvp .tvp-pop-dot.is-pass { background: var(--success); }
.tvp .tvp-pop-dot.is-fail { background: var(--destructive); }

@keyframes tvp-rise {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: none; }
}

@media (prefers-reduced-motion: reduce) {
  .tvp *, .tvp *::before, .tvp *::after { transition: none !important; animation: none !important; }
}
`;
