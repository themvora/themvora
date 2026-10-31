/**
 * The Components preview: a gallery of the chrome a theme has to get right.
 *
 * The Dashboard shows an application; this surface shows the parts. Buttons,
 * form controls, choices, cards, badges, tabs, borders, elevation and type each
 * get a room of their own, so a theme can be judged on the details a dashboard
 * would hide.
 *
 * It obeys the same contract as the dashboard: every painted element reads one
 * of the 21 roles set on the `.tvp` root, or an sRGB mix of two, and says which
 * through `data-token`. No element carries a `style` attribute, because the
 * panel's CSP would drop it.
 *
 * @packageDocumentation
 */
import {
  PREVIEW_BASE_CSS,
  escapeHtml,
  previewIcon,
  previewMark,
} from "./previewTokens.js";

/** One colour role row. */
export interface PreviewSurfaceRole {
  readonly role: string;
  /** Its value, or `null` when the theme does not define it. */
  readonly value: string | null;
}

/** The text a surface shows. */
export interface PreviewSurfaceContent {
  readonly themeName: string;
  readonly family: string;
  readonly contrast: string;
  /** The concrete mode, e.g. `dark`. */
  readonly mode: string;
  /** The header's mode text, e.g. `system → dark`. */
  readonly modeLabel: string;
  readonly source: string;
  readonly roles: readonly PreviewSurfaceRole[];
  /** The modes the theme offers; the panel's chrome uses it, not this markup. */
  readonly modes?: readonly string[];
}

/** How the markup is emitted. */
export interface PreviewSurfaceOptions {
  /**
   * Emit the element ids the panel script fills in. The Studio renders several
   * surfaces at once, so it uses `data-*` attributes instead.
   */
  readonly ids: boolean;
  /** A denser layout for side-by-side comparison. */
  readonly compact?: boolean;
}

/** The components stylesheet. Every colour is a role or an sRGB mix of roles. */
const COMPONENTS_CSS = `
.tvp .tvc {
  display: flex;
  flex-direction: column;
  gap: 22px;
  padding: 28px;
  min-height: 100%;
  background: var(--background);
  color: var(--foreground);
}

/* Header */
.tvp .tvc-head { display: flex; align-items: flex-end; justify-content: space-between; gap: 24px; flex-wrap: wrap; }
.tvp .tvc-head-text { min-width: 0; }
.tvp .tvc-overline {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--muted-foreground);
}
.tvp .tvc-title { margin-top: 6px; font-size: 26px; line-height: 32px; font-weight: 600; letter-spacing: -0.02em; overflow-wrap: anywhere; }
.tvp .tvc-meta { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 6px; font-size: 12.5px; color: var(--muted-foreground); }
.tvp .tvc-meta > span:empty { display: none; }
.tvp .tvc-lede { margin-top: 10px; max-width: 68ch; font-size: 13px; line-height: 19px; }
.tvp .tvc-meta > span + span::before { content: "\\00b7"; margin-right: 6px; color: var(--muted-foreground); }

.tvp .tvc-stats { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; width: min(100%, 520px); }
.tvp .tvc-stat {
  padding: 12px 14px;
  border-radius: var(--tvp-r-md);
  background: var(--card);
  color: var(--card-foreground);
  border: 1px solid var(--border);
  box-shadow: var(--tvp-shadow-card);
  min-width: 0;
}
.tvp .tvc-stat-label { font-size: 10.5px; font-weight: 600; letter-spacing: 0.07em; text-transform: uppercase; color: var(--muted-foreground); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.tvp .tvc-stat-value { margin-top: 4px; font-size: 16px; line-height: 22px; font-weight: 600; letter-spacing: -0.01em; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tvp .tvc-stats .tvc-stat:last-child .tvc-stat-value { font-size: 13px; line-height: 18px; white-space: normal; overflow: visible; }

/* Cards */
.tvp .tvc-grid { columns: 2; column-gap: 16px; }
.tvp .tvc-card {
  min-width: 0;
  margin-bottom: 16px;
  break-inside: avoid;
  padding: 20px;
  border-radius: var(--tvp-r-lg);
  background: var(--card);
  color: var(--card-foreground);
  border: 1px solid var(--border);
  box-shadow: var(--tvp-shadow-card);
}
.tvp .tvc-card-wide { column-span: all; margin-bottom: 0; }
.tvp .tvc-card-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 16px; }
.tvp .tvc-h2 { font-size: 15px; line-height: 22px; font-weight: 600; letter-spacing: -0.01em; }
.tvp .tvc-note { margin-top: 2px; font-size: 12px; color: var(--muted-foreground); }

/* Buttons */
.tvp .tvc-row { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
.tvp .tvc-row + .tvc-row { margin-top: 10px; }
.tvp .tvc-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 36px;
  padding: 0 14px;
  border-radius: var(--tvp-r-md);
  font-size: 13px;
  font-weight: 600;
  line-height: 1;
  white-space: nowrap;
  transition: background-color 160ms var(--tvp-ease), border-color 160ms var(--tvp-ease), color 160ms var(--tvp-ease), box-shadow 160ms var(--tvp-ease), transform 160ms var(--tvp-ease);
}
.tvp .tvc-btn .tvp-icon { width: 15px; height: 15px; }
.tvp .tvc-btn.is-primary { background: var(--primary); color: var(--primary-foreground); box-shadow: 0 6px 16px color-mix(in srgb, var(--primary) 30%, transparent); }
.tvp .tvc-btn.is-primary:hover { background: color-mix(in srgb, var(--primary-foreground) 8%, var(--primary)); transform: translateY(-1px); }
.tvp .tvc-btn.is-secondary { background: var(--secondary); color: var(--secondary-foreground); }
.tvp .tvc-btn.is-secondary:hover { background: color-mix(in srgb, var(--secondary-foreground) 8%, var(--secondary)); }
.tvp .tvc-btn.is-outline { background: var(--card); color: var(--card-foreground); border: 1px solid var(--border); }
.tvp .tvc-btn.is-outline:hover { background: var(--muted); }
.tvp .tvc-btn.is-ghost { background: var(--card); color: var(--muted-foreground); border: 1px solid var(--card); }
.tvp .tvc-btn.is-ghost:hover { color: var(--card-foreground); border-color: var(--border); }
.tvp .tvc-btn.is-destructive { background: var(--destructive); color: var(--destructive-foreground); }
.tvp .tvc-btn.is-destructive:hover { background: color-mix(in srgb, var(--destructive-foreground) 8%, var(--destructive)); }
.tvp .tvc-btn:active { transform: translateY(0); }
.tvp .tvc-btn:disabled { opacity: 0.5; cursor: default; transform: none; box-shadow: none; }
.tvp .tvc-iconbtn {
  width: 36px;
  height: 36px;
  display: inline-grid;
  place-items: center;
  border-radius: var(--tvp-r-md);
  background: var(--card);
  color: var(--card-foreground);
  border: 1px solid var(--border);
}
.tvp .tvc-iconbtn:hover { background: var(--muted); }
.tvp .tvc-iconbtn .tvp-icon { width: 17px; height: 17px; }
.tvp .tvc-count {
  display: inline-grid;
  place-items: center;
  min-width: 24px;
  height: 22px;
  padding: 0 8px;
  border-radius: 999px;
  background: var(--secondary);
  color: var(--secondary-foreground);
  font-size: 11.5px;
  font-weight: 600;
}

/* Form controls */
.tvp .tvc-form { display: grid; gap: 14px; }
.tvp .tvc-form-row { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
.tvp .tvc-field { display: grid; gap: 6px; min-width: 0; }
.tvp .tvc-label { font-size: 12px; font-weight: 600; color: var(--card-foreground); }
.tvp .tvc-input {
  width: 100%;
  height: 36px;
  padding: 0 12px;
  border-radius: var(--tvp-r-md);
  background: var(--background);
  color: var(--foreground);
  border: 1px solid var(--input);
  font: inherit;
  font-size: 13px;
  transition: border-color 160ms var(--tvp-ease), background-color 160ms var(--tvp-ease);
}
.tvp .tvc-input:hover { border-color: var(--muted-foreground); }
.tvp .tvc-input:focus-visible { outline: 1px solid var(--ring); outline-offset: 0; border-color: var(--ring); }
.tvp .tvc-input.is-invalid { border-color: var(--destructive); }
.tvp .tvc-textarea { height: auto; min-height: 78px; padding: 9px 12px; line-height: 1.5; resize: vertical; }
.tvp .tvc-selectwrap { position: relative; display: block; }
.tvp .tvc-select { cursor: pointer; padding-right: 34px; appearance: none; line-height: 34px; }
.tvp .tvc-selectwrap > .tvp-icon {
  position: absolute;
  right: 12px;
  top: 50%;
  width: 16px;
  height: 16px;
  transform: translateY(-50%);
  color: var(--muted-foreground);
  pointer-events: none;
}
.tvp .tvc-searchwrap {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 36px;
  padding: 0 10px;
  border-radius: var(--tvp-r-md);
  background: var(--background);
  color: var(--muted-foreground);
  border: 1px solid var(--input);
}
.tvp .tvc-searchwrap .tvp-icon { width: 15px; height: 15px; }
.tvp .tvc-searchwrap input { flex: 1; min-width: 0; height: 100%; color: var(--foreground); font: inherit; font-size: 13px; }
.tvp .tvc-searchwrap input:focus-visible { outline: none; }
.tvp .tvc-searchwrap:has(input:focus-visible) { outline: 1px solid var(--ring); outline-offset: 0; border-color: var(--ring); }
.tvp .tvc-hint { font-size: 11.5px; color: var(--muted-foreground); }
.tvp .tvc-error { display: flex; align-items: center; gap: 6px; font-size: 11.5px; color: var(--muted-foreground); }

/* Choices */
.tvp .tvc-choices { display: flex; flex-wrap: wrap; gap: 12px 20px; }
.tvp .tvc-choice { position: relative; display: inline-flex; align-items: center; gap: 8px; font-size: 13px; cursor: pointer; }
.tvp .tvc-choice input { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
.tvp .tvc-box {
  width: 17px;
  height: 17px;
  flex: none;
  display: inline-grid;
  place-items: center;
  border-radius: 5px;
  background: var(--card);
  color: var(--primary-foreground);
  border: 1px solid var(--input);
  transition: background-color 160ms var(--tvp-ease), border-color 160ms var(--tvp-ease);
}
.tvp .tvc-box .tvp-icon { width: 11px; height: 11px; opacity: 0; stroke-width: 2.6; }
.tvp .tvc-choice input:checked + .tvc-box { background: var(--primary); border-color: var(--primary); }
.tvp .tvc-choice input:checked + .tvc-box .tvp-icon { opacity: 1; }
.tvp .tvc-choice input:focus-visible + .tvc-box { outline: 1px solid var(--ring); outline-offset: 0; border-color: var(--ring); }
.tvp .tvc-box.is-radio { border-radius: 50%; }
.tvp .tvc-radio-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--primary-foreground); opacity: 0; }
.tvp .tvc-choice input:checked + .tvc-box .tvc-radio-dot { opacity: 1; }
.tvp .tvc-switch {
  width: 36px;
  height: 20px;
  flex: none;
  display: inline-flex;
  align-items: center;
  padding: 2px;
  border-radius: 999px;
  background: var(--muted);
  border: 1px solid var(--border);
  transition: background-color 160ms var(--tvp-ease), border-color 160ms var(--tvp-ease);
}
.tvp .tvc-knob {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--muted-foreground);
  transition: transform 160ms var(--tvp-ease), background-color 160ms var(--tvp-ease);
}
.tvp .tvc-choice input:checked + .tvc-switch { background: var(--primary); border-color: var(--primary); }
.tvp .tvc-choice input:checked + .tvc-switch .tvc-knob { transform: translateX(16px); background: var(--primary-foreground); }
.tvp .tvc-choice input:focus-visible + .tvc-switch { outline: 1px solid var(--ring); outline-offset: 0; border-color: var(--ring); }

/* Cards and menu */
.tvp .tvc-samples { display: grid; grid-template-columns: minmax(0, 1.25fr) minmax(0, 0.75fr); gap: 12px; align-items: start; }
.tvp .tvc-sample {
  display: grid;
  gap: 12px;
  padding: 14px;
  border-radius: var(--tvp-r-md);
  background: var(--popover);
  color: var(--popover-foreground);
  border: 1px solid var(--border);
}
.tvp .tvc-sample-head { display: flex; align-items: center; gap: 10px; }
.tvp .tvc-avatar {
  width: 34px;
  height: 34px;
  flex: none;
  display: inline-grid;
  place-items: center;
  border-radius: 50%;
  background: var(--accent);
  color: var(--accent-foreground);
  font-size: 11.5px;
  font-weight: 600;
}
.tvp .tvc-sample-name { display: grid; line-height: 1.3; min-width: 0; }
.tvp .tvc-sample-name strong { font-size: 13px; font-weight: 600; }
.tvp .tvc-sample-name span { font-size: 11.5px; color: var(--muted-foreground); }
.tvp .tvc-sample-head .tvc-badge { margin-left: auto; }
.tvp .tvc-sample p { font-size: 12.5px; color: var(--popover-foreground); }
.tvp .tvc-sample-foot { display: flex; gap: 8px; }
.tvp .tvc-sample-foot .tvc-btn { height: 30px; padding: 0 11px; font-size: 12px; }

.tvp .tvc-menu {
  display: grid;
  gap: 2px;
  padding: 6px;
  border-radius: var(--tvp-r-md);
  background: var(--popover);
  color: var(--popover-foreground);
  border: 1px solid var(--border);
  box-shadow: var(--tvp-shadow-pop);
}
.tvp .tvc-menu-item {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 30px;
  padding: 0 8px;
  border-radius: 6px;
  font-size: 12.5px;
  color: var(--popover-foreground);
}
.tvp .tvc-menu-item:hover { background: var(--muted); }
.tvp .tvc-menu-item .tvp-icon { width: 14px; height: 14px; color: var(--muted-foreground); }
.tvp .tvc-kbd {
  margin-left: auto;
  padding: 1px 5px;
  border-radius: 5px;
  background: var(--muted);
  color: var(--muted-foreground);
  border: 1px solid var(--border);
  font-size: 10.5px;
  font-weight: 500;
}
.tvp .tvc-menu-sep { height: 1px; margin: 4px 6px; background: var(--border); }

/* Badges */
.tvp .tvc-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 22px;
  padding: 0 9px;
  border-radius: 999px;
  font-size: 11.5px;
  font-weight: 600;
  white-space: nowrap;
}
.tvp .tvc-badge.is-primary { background: var(--primary); color: var(--primary-foreground); }
.tvp .tvc-badge.is-secondary { background: var(--secondary); color: var(--secondary-foreground); }
.tvp .tvc-badge.is-success { background: var(--success); color: var(--success-foreground); }
.tvp .tvc-badge.is-destructive { background: var(--destructive); color: var(--destructive-foreground); }
.tvp .tvc-badge.is-outline { background: var(--card); color: var(--card-foreground); border: 1px solid var(--border); }
.tvp .tvc-dot { width: 7px; height: 7px; border-radius: 50%; flex: none; }
.tvp .tvc-dot.is-success { background: var(--success); }
.tvp .tvc-dot.is-destructive { background: var(--destructive); }
.tvp .tvc-dot.is-primary { background: var(--primary); }
.tvp .tvc-status-list { display: grid; gap: 8px; margin-top: 14px; }
.tvp .tvc-status { display: flex; align-items: center; gap: 8px; font-size: 12.5px; color: var(--muted-foreground); }
.tvp .tvc-status strong { color: var(--card-foreground); font-weight: 500; }

/* Tabs and segmented */
.tvp .tvc-tabs { display: flex; gap: 2px; border-bottom: 1px solid var(--border); }
.tvp .tvc-tab { position: relative; height: 34px; padding: 0 10px; display: inline-flex; align-items: center; color: var(--muted-foreground); font-size: 13px; font-weight: 500; }
.tvp .tvc-tab:hover { color: var(--card-foreground); }
.tvp .tvc-tab[aria-selected="true"] { color: var(--card-foreground); font-weight: 600; }
.tvp .tvc-tab[aria-selected="true"] { box-shadow: inset 0 -2px 0 var(--primary); }
.tvp .tvc-tabpanel { margin: 14px 0; font-size: 12.5px; color: var(--muted-foreground); }
.tvp .tvc-seg { display: inline-flex; gap: 2px; padding: 3px; border-radius: var(--tvp-r-md); background: var(--muted); }
.tvp .tvc-seg button { height: 28px; padding: 0 12px; display: inline-flex; align-items: center; border-radius: var(--tvp-r-sm); color: var(--muted-foreground); font-size: 12.5px; font-weight: 500; }
.tvp .tvc-seg button:hover { color: var(--card-foreground); }
.tvp .tvc-seg button[aria-pressed="true"] { background: var(--card); color: var(--card-foreground); font-weight: 600; box-shadow: 0 1px 2px color-mix(in srgb, var(--foreground) 10%, transparent); }

/* Borders, radii, elevation */
.tvp .tvc-tiles { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }
.tvp .tvc-tile { display: grid; gap: 8px; padding: 10px; border-radius: var(--tvp-r-md); background: var(--background); border: 1px solid var(--border); font-size: 11px; color: var(--muted-foreground); }
.tvp .tvc-tile-box { height: 32px; background: var(--card); border-radius: var(--tvp-r-sm); }
.tvp .tvc-tile-box.is-border { border: 1px solid var(--border); }
.tvp .tvc-tile-box.is-input { border: 1px solid var(--input); }
.tvp .tvc-tile-box.is-ring { border: 2px solid var(--ring); }
.tvp .tvc-tile-box.is-dashed { border: 1px dashed var(--muted-foreground); }
.tvp .tvc-tile-box.is-r-sm { border-radius: var(--tvp-r-sm); background: color-mix(in srgb, var(--primary) 12%, var(--card)); }
.tvp .tvc-tile-box.is-r-md { border-radius: var(--tvp-r-md); background: color-mix(in srgb, var(--primary) 12%, var(--card)); }
.tvp .tvc-tile-box.is-r-lg { border-radius: var(--tvp-r-lg); background: color-mix(in srgb, var(--primary) 12%, var(--card)); }
.tvp .tvc-tile-box.is-elevated { box-shadow: var(--tvp-shadow-card); border: 1px solid var(--border); }
.tvp .tvc-tile-box.is-raised { box-shadow: var(--tvp-shadow-pop); border: 1px solid var(--border); }

/* Type */
.tvp .tvc-type { display: grid; gap: 12px; }
.tvp .tvc-display { font-size: 25px; line-height: 32px; font-weight: 600; letter-spacing: -0.02em; }
.tvp .tvc-h3 { font-size: 17px; line-height: 24px; font-weight: 600; letter-spacing: -0.01em; }
.tvp .tvc-body { font-size: 13px; line-height: 20px; }
.tvp .tvc-caption { font-size: 12px; color: var(--muted-foreground); }
.tvp .tvc-mono {
  display: inline-block;
  padding: 2px 6px;
  border-radius: 6px;
  background: var(--muted);
  color: var(--muted-foreground);
  font-family: var(--font-mono, "JetBrains Mono", ui-monospace, monospace);
  font-size: 11.5px;
}
.tvp .tvc-link { color: var(--primary); font-size: 12.5px; font-weight: 600; text-decoration: underline; text-underline-offset: 2px; }
.tvp .tvc-link:hover { color: color-mix(in srgb, var(--primary) 12%, var(--foreground)); }

/* Roles table */
.tvp .tvc-table { width: 100%; font-size: 12.5px; }
.tvp .tvc-table thead tr { background: var(--muted); }
.tvp .tvc-table th {
  padding: 9px 14px;
  font-size: 10.5px;
  font-weight: 600;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: var(--muted-foreground);
  text-align: left;
  white-space: nowrap;
}
.tvp .tvc-table th:first-child { width: 38px; }
.tvp .tvc-table td { padding: 7px 14px; border-top: 1px solid var(--border); }
.tvp .tvc-table tr:first-child td { border-top: 0; }
.tvp .tvc-swatch {
  display: inline-block;
  width: 16px;
  height: 16px;
  border-radius: 5px;
  vertical-align: middle;
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--foreground) 12%, transparent);
}
.tvp .tvc-role { font-weight: 500; white-space: nowrap; }
.tvp .tvc-value { width: 100%; font-family: var(--font-mono, "JetBrains Mono", ui-monospace, monospace); font-size: 11.5px; color: var(--muted-foreground); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.tvp .tvc-foot {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  padding-top: 2px;
  font-size: 12px;
  color: var(--muted-foreground);
}
.tvp .tvc-foot-mark { width: 16px; height: 16px; color: var(--muted-foreground); }
.tvp .tvc-foot-sep { color: var(--border); }

.tvp .tvp-compact .tvc { padding: 18px; gap: 16px; }
.tvp .tvp-compact .tvc-grid { columns: 1; }
.tvp .tvp-compact .tvc-card-wide { column-span: none; }
.tvp .tvp-compact .tvc-roles-card,
.tvp .tvp-compact .tvc-foot { display: none; }

@container tvp (max-width: 980px) {
  .tvp .tvc-grid { columns: 1; }
  .tvp .tvc-card-wide { column-span: none; }
  .tvp .tvc-head { align-items: flex-start; }
  .tvp .tvc-stats { width: 100%; }
}

@container tvp (max-width: 760px) {
  .tvp .tvc { padding: 18px; gap: 16px; }
  .tvp .tvc-stats { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .tvp .tvc-samples { grid-template-columns: minmax(0, 1fr); }
  .tvp .tvc-tiles { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .tvp .tvc-form-row { grid-template-columns: minmax(0, 1fr); }
}

@container tvp (max-width: 520px) {
  .tvp .tvc { padding: 14px; }
  .tvp .tvc-stats { grid-template-columns: minmax(0, 1fr); }
  .tvp .tvc-tiles { grid-template-columns: minmax(0, 1fr); }
  .tvp .tvc-title { font-size: 22px; line-height: 28px; }
}
`;

/** The components surface, on top of the shared base. */
export const PREVIEW_SURFACE_CSS = `${PREVIEW_BASE_CSS}\n${COMPONENTS_CSS}`;

/**
 * Render the gallery's markup.
 *
 * @param content - The text to show.
 * @param options - Ids versus data attributes, and density.
 * @returns The markup of one `.tvp-app` element.
 */
export function previewSurfaceMarkup(
  content: PreviewSurfaceContent,
  options: PreviewSurfaceOptions,
): string {
  const id = (name: string): string => (options.ids ? ` id="${name}"` : "");
  const text = escapeHtml;
  const value = (raw: string): string => text(raw.length === 0 ? "—" : raw);
  const tok = (spec: string): string => ` data-token="${spec}"`;

  const rows = content.roles
    .map(
      ({ role, value: raw }) => `
            <tr data-role="${text(role)}"${tok("bg:card fg:card-foreground bd:border")}>
              <td><span class="tvc-swatch"${id(`swatch-${role}`)} data-swatch="${text(role)}"></span></td>
              <td class="tvc-role">${text(role)}</td>
              <td class="tvc-value"${id(`value-${role}`)}>${raw === null ? "(missing)" : text(raw)}</td>
            </tr>`,
    )
    .join("");

  const stat = (label: string, hook: string, raw: string): string =>
    `<div class="tvc-stat"${tok("bg:card fg:card-foreground bd:border")}>
              <p class="tvc-stat-label"${tok("bg:card fg:muted-foreground")}>${label}</p>
              <p class="tvc-stat-value"${id(hook)}>${value(raw)}</p>
            </div>`;

  return `<div class="tvp-app tvc${options.compact === true ? " tvp-compact" : ""}" data-preview-region="canvas"${tok("bg:background fg:foreground")}>
    <header class="tvc-head" data-preview-region="hero"${tok("bg:background fg:foreground")}>
      <div class="tvc-head-text">
        <p class="tvc-overline"${tok("bg:background fg:muted-foreground")}>Themvora theme token usage</p>
        <h1 class="tvc-title"><span${id("theme-name")}>${text(content.themeName)}</span></h1>
        <p class="tvc-meta"${tok("bg:background fg:muted-foreground")}>
          <span${id("theme-family")}>${text(content.family)}</span>
          <span${id("theme-contrast")}>${text(content.contrast)}</span>
          <span${id("theme-mode")}>${text(content.modeLabel)}</span>
          <span${id("theme-source")}>${text(content.source)}</span>
        </p>
        <p class="tvc-lede"${tok("bg:background fg:muted-foreground")}>Every component on this page is painted with Themvora tokens. Themvora is a theming library, not a UI library — the components are only here to show what the tokens do.</p>
      </div>
      <div class="tvc-stats" data-preview-region="stat">
        ${stat("Roles", "stat-tokens", content.roles.length === 0 ? "—" : String(content.roles.length))}
        ${stat("Family", "stat-family", content.family)}
        ${stat("Mode", "stat-mode", content.mode)}
        ${stat("Contrast", "stat-contrast", content.contrast)}
      </div>
    </header>

    <div class="tvc-grid">
      <section class="tvc-card" data-preview-region="components-buttons"${tok("bg:card fg:card-foreground bd:border")}>
        <div class="tvc-card-head">
          <div>
            <h2 class="tvc-h2">Buttons</h2>
            <p class="tvc-note">Primary, secondary, outline, ghost and destructive.</p>
          </div>
        </div>
        <div class="tvc-row">
          <button type="button" class="tvc-btn is-primary"${tok("bg:primary fg:primary-foreground")}>${previewIcon("check")}Save changes</button>
          <button type="button" class="tvc-btn is-secondary"${tok("bg:secondary fg:secondary-foreground")}>${previewIcon("share")}Share</button>
          <button type="button" class="tvc-btn is-outline"${tok("bg:card fg:card-foreground bd:border")}>${previewIcon("download")}Export</button>
          <button type="button" class="tvc-btn is-ghost"${tok("bg:card fg:muted-foreground")}>Cancel</button>
        </div>
        <div class="tvc-row">
          <button type="button" class="tvc-btn is-destructive"${tok("bg:destructive fg:destructive-foreground")}>${previewIcon("trash")}Delete</button>
          <button type="button" class="tvc-btn is-outline" disabled${tok("bg:card fg:card-foreground bd:border")}>Disabled</button>
          <button type="button" class="tvc-iconbtn" aria-label="More actions"${tok("bg:card fg:card-foreground bd:border")}>${previewIcon("more")}</button>
          <span class="tvc-count"${tok("bg:secondary fg:secondary-foreground")}>12</span>
        </div>
      </section>

      <section class="tvc-card" data-preview-region="components-form"${tok("bg:card fg:card-foreground bd:border")}>
        <div class="tvc-card-head">
          <div>
            <h2 class="tvc-h2">Form controls</h2>
            <p class="tvc-note">Inputs, select and a validation state.</p>
          </div>
        </div>
        <div class="tvc-form">
          <label class="tvc-field">
            <span class="tvc-label"${tok("bg:card fg:card-foreground")}>Project name</span>
            <input class="tvc-input" type="text" value="Themvora"${tok("bg:background fg:foreground bd:input")} />
          </label>
          <div class="tvc-form-row">
            <label class="tvc-field">
              <span class="tvc-label"${tok("bg:card fg:card-foreground")}>Visibility</span>
              <span class="tvc-selectwrap">
                <select class="tvc-input tvc-select"${tok("bg:background fg:foreground bd:input")}>
                  <option>Everyone in the team</option>
                  <option>Private to me</option>
                </select>
                ${previewIcon("chevron")}
              </span>
            </label>
            <label class="tvc-field">
              <span class="tvc-label"${tok("bg:card fg:card-foreground")}>Search</span>
              <span class="tvc-searchwrap"${tok("bg:background fg:foreground bd:input")}>
                ${previewIcon("search")}
                <input type="search" placeholder="Find a role…" aria-label="Find a role" />
              </span>
            </label>
          </div>
          <label class="tvc-field">
            <span class="tvc-label"${tok("bg:card fg:card-foreground")}>Slug</span>
            <input class="tvc-input is-invalid" type="text" value="theme studio"${tok("bg:background fg:foreground bd:destructive")} />
            <span class="tvc-error"${tok("bg:card fg:muted-foreground")}><span class="tvc-dot is-destructive"${tok("bg:destructive")}></span>Use lowercase letters, numbers and dashes.</span>
          </label>
          <label class="tvc-field">
            <span class="tvc-label"${tok("bg:card fg:card-foreground")}>Description</span>
            <textarea class="tvc-input tvc-textarea"${tok("bg:background fg:foreground bd:input")}>A calm, focused theme for long sessions.</textarea>
            <span class="tvc-hint"${tok("bg:card fg:muted-foreground")}>Shown to everyone who can see this theme.</span>
          </label>
        </div>
      </section>

      <section class="tvc-card" data-preview-region="components-choices"${tok("bg:card fg:card-foreground bd:border")}>
        <div class="tvc-card-head">
          <div>
            <h2 class="tvc-h2">Choices</h2>
            <p class="tvc-note">Checkboxes, radios and a switch.</p>
          </div>
        </div>
        <div class="tvc-choices">
          <label class="tvc-choice">
            <input type="checkbox" checked />
            <span class="tvc-box"${tok("bg:primary fg:primary-foreground")}>${previewIcon("check")}</span>
            Email notifications
          </label>
          <label class="tvc-choice">
            <input type="checkbox" />
            <span class="tvc-box"${tok("bg:card fg:primary-foreground bd:input")}>${previewIcon("check")}</span>
            Weekly digest
          </label>
          <label class="tvc-choice">
            <input type="radio" name="tvc-billing" checked />
            <span class="tvc-box is-radio"${tok("bg:primary fg:primary-foreground")}><span class="tvc-radio-dot"></span></span>
            Monthly
          </label>
          <label class="tvc-choice">
            <input type="radio" name="tvc-billing" />
            <span class="tvc-box is-radio"${tok("bg:card fg:primary-foreground bd:input")}><span class="tvc-radio-dot"></span></span>
            Yearly
          </label>
          <label class="tvc-choice">
            <input type="checkbox" checked />
            <span class="tvc-switch"${tok("bg:primary fg:primary-foreground bd:primary")}><span class="tvc-knob"></span></span>
            Live preview
          </label>
          <label class="tvc-choice">
            <input type="checkbox" />
            <span class="tvc-switch"${tok("bg:muted fg:muted-foreground bd:border")}><span class="tvc-knob"></span></span>
            Reduced motion
          </label>
        </div>
      </section>

      <section class="tvc-card" data-preview-region="components-cards"${tok("bg:card fg:card-foreground bd:border")}>
        <div class="tvc-card-head">
          <div>
            <h2 class="tvc-h2">Cards and menu</h2>
            <p class="tvc-note">Popover surfaces on top of a card.</p>
          </div>
        </div>
        <div class="tvc-samples">
          <article class="tvc-sample"${tok("bg:popover fg:popover-foreground bd:border")}>
            <div class="tvc-sample-head">
              <span class="tvc-avatar"${tok("bg:accent fg:accent-foreground")}>AM</span>
              <span class="tvc-sample-name"><strong>Alex Morgan</strong><span>Product designer</span></span>
              <span class="tvc-badge is-success"${tok("bg:success fg:success-foreground")}>Active</span>
            </div>
            <p>Building a theme system that stays readable in every mode.</p>
            <div class="tvc-sample-foot">
              <button type="button" class="tvc-btn is-outline"${tok("bg:card fg:card-foreground bd:border")}>Message</button>
              <button type="button" class="tvc-btn is-primary"${tok("bg:primary fg:primary-foreground")}>Follow</button>
            </div>
          </article>
          <div class="tvc-menu"${tok("bg:popover fg:popover-foreground bd:border")}>
            <button type="button" class="tvc-menu-item"${tok("bg:popover fg:popover-foreground")}>${previewIcon("edit")}Edit theme<span class="tvc-kbd">⌘E</span></button>
            <button type="button" class="tvc-menu-item"${tok("bg:popover fg:popover-foreground")}>${previewIcon("copy")}Duplicate<span class="tvc-kbd">⌘D</span></button>
            <span class="tvc-menu-sep"></span>
            <button type="button" class="tvc-menu-item"${tok("bg:popover fg:popover-foreground")}>${previewIcon("download")}Export CSS</button>
          </div>
        </div>
      </section>

      <section class="tvc-card" data-preview-region="components-status"${tok("bg:card fg:card-foreground bd:border")}>
        <div class="tvc-card-head">
          <div>
            <h2 class="tvc-h2">Badges and status</h2>
            <p class="tvc-note">Solid pills, outlines and dots.</p>
          </div>
        </div>
        <div class="tvc-row">
          <span class="tvc-badge is-primary"${tok("bg:primary fg:primary-foreground")}>Default</span>
          <span class="tvc-badge is-secondary"${tok("bg:secondary fg:secondary-foreground")}>Secondary</span>
          <span class="tvc-badge is-success" data-preview-region="success"${tok("bg:success fg:success-foreground")}>Paid</span>
          <span class="tvc-badge is-destructive" data-preview-region="destructive"${tok("bg:destructive fg:destructive-foreground")}>Failed</span>
          <span class="tvc-badge is-outline"${tok("bg:card fg:card-foreground bd:border")}><span class="tvc-dot is-success"${tok("bg:success")}></span>Live</span>
          <span class="tvc-badge is-outline"${tok("bg:card fg:muted-foreground bd:border")}>Draft</span>
        </div>
        <div class="tvc-status-list">
          <span class="tvc-status"${tok("bg:card fg:muted-foreground")}><span class="tvc-dot is-success"${tok("bg:success")}></span><strong>Deployment succeeded</strong> · 12 seconds ago</span>
          <span class="tvc-status"${tok("bg:card fg:muted-foreground")}><span class="tvc-dot is-destructive"${tok("bg:destructive")}></span><strong>Payment failed</strong> · retry scheduled</span>
        </div>
      </section>

      <section class="tvc-card" data-preview-region="components-tabs"${tok("bg:card fg:card-foreground bd:border")}>
        <div class="tvc-card-head">
          <div>
            <h2 class="tvc-h2">Tabs and segmented</h2>
            <p class="tvc-note">Navigation inside a surface.</p>
          </div>
        </div>
        <div class="tvc-tabs" role="tablist" aria-label="Sections">
          <button type="button" role="tab" aria-selected="true">Overview</button>
          <button type="button" role="tab" aria-selected="false">Activity</button>
          <button type="button" role="tab" aria-selected="false">Settings</button>
        </div>
        <p class="tvc-tabpanel"${tok("bg:card fg:muted-foreground")}>The overview tab is active. A 2px primary rule marks it.</p>
        <div class="tvc-row">
          <div class="tvc-seg" role="group" aria-label="Density">
            <button type="button" aria-pressed="true"${tok("bg:card fg:card-foreground")}>Comfortable</button>
            <button type="button" aria-pressed="false">Compact</button>
          </div>
          <span class="tvc-badge is-outline"${tok("bg:card fg:muted-foreground bd:border")}>System</span>
        </div>
      </section>

      <section class="tvc-card" data-preview-region="components-borders"${tok("bg:card fg:card-foreground bd:border")}>
        <div class="tvc-card-head">
          <div>
            <h2 class="tvc-h2">Borders, radii and depth</h2>
            <p class="tvc-note">The quiet parts of the theme.</p>
          </div>
        </div>
        <div class="tvc-tiles">
          <div class="tvc-tile"${tok("bg:background fg:muted-foreground bd:border")}><span class="tvc-tile-box is-border"${tok("bg:card bd:border")}></span>Border</div>
          <div class="tvc-tile"${tok("bg:background fg:muted-foreground bd:border")}><span class="tvc-tile-box is-input"${tok("bg:card bd:input")}></span>Input border</div>
          <div class="tvc-tile"${tok("bg:background fg:muted-foreground bd:border")}><span class="tvc-tile-box is-dashed"${tok("bg:card bd:muted-foreground")}></span>Dashed</div>
          <div class="tvc-tile"${tok("bg:background fg:muted-foreground bd:border")}><span class="tvc-tile-box is-ring"${tok("bg:card bd:ring")}></span>Focus ring</div>
          <div class="tvc-tile"${tok("bg:background fg:muted-foreground bd:border")}><span class="tvc-tile-box is-r-sm"${tok("bg:primary/12+card")}></span>Radius 8</div>
          <div class="tvc-tile"${tok("bg:background fg:muted-foreground bd:border")}><span class="tvc-tile-box is-r-md"${tok("bg:primary/12+card")}></span>Radius 10</div>
          <div class="tvc-tile"${tok("bg:background fg:muted-foreground bd:border")}><span class="tvc-tile-box is-r-lg"${tok("bg:primary/12+card")}></span>Radius 14</div>
          <div class="tvc-tile"${tok("bg:background fg:muted-foreground bd:border")}><span class="tvc-tile-box is-elevated"${tok("bg:card bd:border")}></span>Elevation</div>
          <div class="tvc-tile"${tok("bg:background fg:muted-foreground bd:border")}><span class="tvc-tile-box is-raised"${tok("bg:card bd:border")}></span>Popover</div>
        </div>
      </section>

      <section class="tvc-card" data-preview-region="components-type"${tok("bg:card fg:card-foreground bd:border")}>
        <div class="tvc-card-head">
          <div>
            <h2 class="tvc-h2">Typography</h2>
            <p class="tvc-note">Display, heading, body, caption and code.</p>
          </div>
        </div>
        <div class="tvc-type">
          <p class="tvc-overline"${tok("bg:card fg:muted-foreground")}>Display · 25 / 32</p>
          <p class="tvc-display"${tok("bg:card fg:card-foreground")}>Design that speaks in tokens.</p>
          <p class="tvc-h3"${tok("bg:card fg:card-foreground")}>A smaller heading holds its own</p>
          <p class="tvc-body"${tok("bg:card fg:card-foreground")}>Body copy stays at 13px with generous line height, so long settings pages remain comfortable to read.</p>
          <p class="tvc-caption"${tok("bg:card fg:muted-foreground")}>Caption text is muted and never competes with the content above it.</p>
          <p><code class="tvc-mono"${tok("bg:muted fg:muted-foreground")}>--primary: ${text(content.roles.find((role) => role.role === "primary")?.value ?? "—")}</code> <button type="button" class="tvc-link">Manage billing</button></p>
        </div>
      </section>

      <section class="tvc-card tvc-card-wide tvc-roles-card" data-preview-region="roles"${tok("bg:card fg:card-foreground bd:border")}>
        <div class="tvc-card-head">
          <div>
            <h2 class="tvc-h2">Semantic roles</h2>
            <p class="tvc-note">Every role this theme defines, with its raw value.</p>
          </div>
        </div>
        <table class="tvc-table">
          <thead>
            <tr${tok("bg:muted fg:muted-foreground")}><th scope="col">Swatch</th><th scope="col">Role</th><th scope="col">Value</th></tr>
          </thead>
          <tbody>${rows}
          </tbody>
        </table>
      </section>
    </div>

    <footer class="tvc-foot"${tok("bg:background fg:muted-foreground")}>
      ${previewMark("tvc-foot-mark")}
      <span>Themvora</span>
      <span class="tvc-foot-sep" aria-hidden="true">·</span>
      <span>Every colour on this page is one of the theme's 21 roles.</span>
    </footer>
  </div>`;
}
