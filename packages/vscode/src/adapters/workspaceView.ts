/**
 * The Themvora workspace view.
 *
 * The single webview **view** in the Themvora Activity Bar container. It answers "which themes are here" in a list; this answers "what is
 * this project, and what can I do with it" with room to say it.
 *
 * There is no separate native tree: files, packages and themes are one picture. The view is presentation only: it receives a view
 * model and posts intents back. It never reads a file, calls core, or decides what
 * a theme means — the extension host does that, so the webview cannot drift from
 * the CLI's or the preview's interpretation.
 *
 * @packageDocumentation
 */
import {
  Uri,
  ViewColumn,
  commands,
  window,
  type Disposable,
  type WebviewView,
  type WebviewViewProvider,
} from "vscode";

import type { RootView } from "../domain/rootView.js";
import { describeProjectStatus, statusLabel } from "../domain/statusLabels.js";
import type { ProjectProfile, ThemvoraPackage } from "../domain/projectProfile.js";
import { familyOf, themeFamilyName } from "../domain/themeFamily.js";
import { SETUP_LINKS, setupLink, workspaceSetup, type WorkspaceSetup } from "../domain/workspaceSetup.js";
import { env } from "vscode";

import { DESIGN_TOKENS_CSS, fontFaceCss } from "../shared/designTokens.js";

import { validateTheme, type ThemeDefinition } from "@themvora/core";
import type { SaveOutcome, ThemeFileFormat } from "../services/saveTheme.js";
import type { ThemvoraClient } from "../services/coreClient.js";

/** One token as the explorer shows it. */
export interface WorkspaceToken {
  /** The canonical token name, e.g. `primaryForeground`. */
  readonly name: string;
  /** Its value, verbatim from the theme. */
  readonly value: string;
  /**
   * The contrast this token has against its paired background, when the theme
   * declares such a pair. Measured by core, not here.
   */
  readonly contrast?: { readonly ratio: number; readonly passes: boolean; readonly against: string };
}

/** One theme as the view shows it. */
export interface WorkspaceTheme {
  /** The theme's name. */
  readonly name: string;
  /** `light` or `dark`, when the theme records it. */
  readonly mode?: string;
  /** The family, when recorded. */
  readonly family?: string;
  /** The file the theme came from. */
  readonly source: string;
  /** Whether the canonical validator accepts it. */
  readonly valid: boolean;
  /** The first validation issue, when invalid. */
  readonly issue?: string;
  /** Its colour tokens, in the theme's own order. */
  readonly tokens: readonly WorkspaceToken[];
}

/** One theme inside a registry file. */
export interface WorkspaceFileTheme {
  readonly name: string;
  /** The family key, from `meta.family` or the name's mode suffix. */
  readonly family: string;
  readonly mode?: string;
  readonly valid: boolean;
  /** Its primary colour, for the row's dot. */
  readonly color?: string;
}

/**
 * One theme family in a file, however many modes it ships.
 *
 * A registry lists `rose-light` and `rose-dark` as two themes, but a developer
 * thinks of them as one theme with two modes — the same unit the Presets tab
 * shows. The file list groups them so the two tabs agree.
 */
export interface WorkspaceFamily {
  /** The family name, e.g. `rose`. */
  readonly name: string;
  /** The variant to open when the row is clicked — the light one when present. */
  readonly primary: string;
  /** Its modes, light before dark. */
  readonly modes: readonly string[];
  /** The primary variant's colour, for the row's dot. */
  readonly color?: string;
  /** Whether every variant in the family validated. */
  readonly valid: boolean;
}

/** One registry file the inspector read, and what it contributed. */
export interface WorkspaceFile {
  /** Workspace-relative path, with `/` separators. */
  readonly path: string;
  readonly status: string;
  /** The status in plain language. */
  readonly statusLabel: string;
  /** One sentence explaining the status. */
  readonly detail: string;
  readonly themes: readonly WorkspaceFileTheme[];
  /** The same themes grouped by family, which is what the list renders. */
  readonly families: readonly WorkspaceFamily[];
}

/** One folder as the view shows it. */
export interface WorkspaceRoot {
  /** The folder's display name. */
  readonly name: string;
  /** Its absolute path, for the tooltip. */
  readonly path: string;
  /** The status label, e.g. "themes detected". */
  readonly status: string;
  /** A sentence explaining the status. */
  readonly statusDetail: string;
  /** The framework, as a display name. */
  readonly framework: string;
  /** What the framework was inferred from. */
  readonly frameworkEvidence: string;
  /** The package manager. */
  readonly packageManager: string;
  /** Every readable registry path. */
  readonly sources: readonly string[];
  /** Every theme the registries hold. */
  readonly themes: readonly WorkspaceTheme[];
  /** The registry files, with the themes each contributed. */
  readonly files: readonly WorkspaceFile[];
  /** The declared Themvora packages. */
  readonly packages: readonly ThemvoraPackage[];
  /** What this folder is actually set up for. */
  readonly setup: WorkspaceSetup;
}

/** One preset the catalog offers. */
export interface WorkspacePreset {
  /** The family id, which is what selecting it sends back. */
  readonly id: string;
  /** The label core gives it. */
  readonly label: string;
  /** The family the two modes share. */
  readonly family: string;
  /** Curated preset or brand-inspired. */
  readonly kind: string;
  /** The generation style. */
  readonly style: string;
  /** The recipe's one-line character descriptor. */
  readonly description: string;
  /** A few colours from the light variant, for a swatch strip. */
  readonly swatches: readonly string[];
  /** Which modes this family ships. */
  readonly modes: readonly string[];
}

/** Everything the view renders. */
export interface WorkspaceState {
  /** One entry per workspace folder. */
  readonly roots: readonly WorkspaceRoot[];
  /** The canonical catalog, once it has been read. */
  readonly presets?: readonly WorkspacePreset[];
  /** A message from the last action, when there is one. */
  readonly notice?: { readonly kind: "info" | "error"; readonly text: string };
}

/** Display names for the frameworks the profile can detect. */
const FRAMEWORK_LABELS: Record<ProjectProfile["framework"], string> = {
  next: "Next.js",
  nuxt: "Nuxt",
  astro: "Astro",
  remix: "Remix",
  svelte: "Svelte",
  solid: "Solid",
  vue: "Vue",
  angular: "Angular",
  react: "React",
  unknown: "Unknown",
};

/**
 * Build the view model from inspections and profiles.
 *
 * Pure, so the shape the webview receives is testable without a host.
 *
 * @param roots - The controller's current roots.
 * @param profiles - A profile per root path.
 * @returns The state the webview renders.
 */
/**
 * Group one file's themes into families.
 *
 * `rose-light` and `rose-dark` are two themes to the registry and one theme to
 * a developer. The Presets tab already shows one row per family; grouping here
 * makes the file list agree instead of listing each variant as its own theme.
 *
 * @param themes - The themes one file contributed, in file order.
 * @returns One entry per family, in first-seen order.
 */
function groupFamilies(themes: readonly WorkspaceFileTheme[]): readonly WorkspaceFamily[] {
  interface Draft {
    name: string;
    primary: string;
    modes: string[];
    color?: string;
    valid: boolean;
  }

  const grouped = new Map<string, Draft>();

  for (const theme of themes) {
    const existing = grouped.get(theme.family);
    if (existing === undefined) {
      grouped.set(theme.family, {
        name: theme.family,
        primary: theme.name,
        modes: theme.mode === undefined ? [] : [theme.mode],
        ...(theme.color === undefined ? {} : { color: theme.color }),
        valid: theme.valid,
      });
      continue;
    }

    if (theme.mode !== undefined && !existing.modes.includes(theme.mode)) {
      existing.modes.push(theme.mode);
    }
    existing.valid = existing.valid && theme.valid;
    // The row opens the light variant when there is one, so a click lands on
    // the mode a reader expects to see first.
    if (theme.mode === "light") {
      existing.primary = theme.name;
      if (theme.color !== undefined) existing.color = theme.color;
    }
  }

  const known = ["light", "dark"];
  const rank = (mode: string): number => {
    const index = known.indexOf(mode);
    return index === -1 ? known.length : index;
  };

  return [...grouped.values()].map((family) => ({
    ...family,
    modes: [...family.modes].sort((a, b) => rank(a) - rank(b)),
  }));
}

export function buildWorkspaceState(
  roots: readonly RootView[],
  profiles: ReadonlyMap<string, ProjectProfile>,
): WorkspaceState {
  return {
    roots: roots.map((root) => {
      const profile = profiles.get(root.inspection.root);
      const registries = root.inspection.registries;
      const themes: WorkspaceTheme[] = [];
      const files = registries.map((entry) => {
        const contributed = (entry.themes ?? []).map((theme) => {
          // Validated here, in the host, so the webview never decides whether a
          // theme is usable — it only displays the verdict.
          const report = validateTheme(theme);
          const issue = report.issues[0];
          const primary = theme.tokens?.colors?.primary;

          themes.push({
            name: theme.name,
            ...(theme.meta?.mode === undefined ? {} : { mode: theme.meta.mode }),
            ...(theme.meta?.family === undefined ? {} : { family: theme.meta.family }),
            source: entry.path,
            valid: report.valid,
            ...(issue === undefined ? {} : { issue: issue.message }),
            tokens: Object.entries(theme.tokens?.colors ?? {})
              .filter(([, value]) => typeof value === "string")
              .map(([name, value]) => ({ name, value: value as string })),
          });

          return {
            name: theme.name,
            family: themeFamilyName(theme),
            ...(theme.meta?.mode === undefined ? {} : { mode: theme.meta.mode }),
            valid: report.valid,
            ...(typeof primary === "string" ? { color: primary } : {}),
          };
        });

        return {
          path: entry.path,
          status: entry.status,
          statusLabel: statusLabel(entry.status),
          detail: entry.detail,
          themes: contributed,
          families: groupFamilies(contributed),
        };
      });

      return {
        name: root.name,
        path: root.inspection.root,
        status: statusLabel(root.inspection.status),
        statusDetail: describeProjectStatus(root.inspection.status),
        framework: profile === undefined ? "Unknown" : FRAMEWORK_LABELS[profile.framework],
        frameworkEvidence: profile?.frameworkEvidence ?? "not inspected",
        packageManager: profile?.packageManager ?? "unknown",
        sources: registries.map((entry) => entry.path),
        themes,
        files,
        packages: profile?.packages ?? [],
        setup: workspaceSetup(root.inspection, profile),
      };
    }),
  };
}

/**
 * Create a CSP nonce.
 *
 * @returns A random nonce for the inline style and script.
 */
function createNonce(): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let nonce = "";
  for (let index = 0; index < 32; index += 1) {
    nonce += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return nonce;
}

/** The bundled font URIs, when the host can resolve them for this webview. */
export interface WorkspaceAssets {
  /** The webview's `cspSource`, allowed for fonts only. */
  readonly cspSource: string;
  /** The Inter variable font. */
  readonly inter: string;
  /** The JetBrains Mono variable font. */
  readonly mono: string;
}

/** The sidebar's own rules, on top of the shared design tokens. */
const WORKSPACE_CSS = `
* { box-sizing: border-box; }
html, body { height: 100%; }
body {
  margin: 0;
  padding: 0;
  overflow: hidden;
  background: var(--bg-1);
  color: var(--text);
  font-family: var(--font-ui);
  font-size: var(--fs-body);
  line-height: 1.45;
  -webkit-font-smoothing: antialiased;
}
button { appearance: none; margin: 0; border: 0; background: none; color: inherit; font: inherit; cursor: pointer; text-align: left; }
button:disabled { cursor: default; opacity: 0.5; }
:focus-visible { outline: 2px solid var(--ring); outline-offset: 1px; }
:focus:not(:focus-visible) { outline: none; }
h1, h2, p { margin: 0; }
.muted { color: var(--text-muted); }
.mono { font-family: var(--font-mono); }
.ellipsis { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.overline { font-size: var(--fs-overline); font-weight: 600; letter-spacing: 0.08em; line-height: 1.4; text-transform: uppercase; color: var(--text-muted); }
.note { color: var(--text-muted); font-size: var(--fs-sm); line-height: 1.5; }
.ok { color: var(--ok); }
.warn { color: var(--warn); }
.bad { color: var(--bad); }
svg.icon { flex: none; fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }

.shell { display: flex; flex-direction: column; height: 100vh; min-height: 0; }
.head { display: flex; flex-direction: column; gap: var(--sp-3); flex: none; padding: var(--sp-3) var(--sp-4) 0; }
.project { display: flex; align-items: center; gap: var(--sp-3); min-width: 0; }
/* The logo, not a tile with a logo on it: same drawing as the Activity Bar icon,
 * in the appearance's own indigo so it holds on both surfaces. */
.brand { display: grid; place-items: center; flex: none; width: 32px; height: 32px; color: var(--brand-mark); }
.brand svg { width: 28px; height: 28px; }
.project-text { display: flex; flex-direction: column; flex: 1; min-width: 0; }
.project-name { font-size: 14px; font-weight: 600; line-height: 1.3; }
.project-meta { color: var(--text-muted); font-size: var(--fs-sm); }

.pill { display: inline-flex; align-items: center; gap: 6px; flex: none; height: 20px; padding: 0 8px; border-radius: 999px; background: var(--surface-2); color: var(--text-2); font-size: 11.5px; font-weight: 500; white-space: nowrap; }
.pill.ok { background: var(--ok-bg); color: var(--ok); }
.pill.warn { background: var(--warn-bg); color: var(--warn); }
.pill.bad { background: var(--bad-bg); color: var(--bad); }
.pill-dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; }

.roots { display: flex; flex-wrap: wrap; gap: var(--sp-1); }
.root-button { display: inline-flex; align-items: center; gap: 6px; height: 24px; padding: 0 8px; border: 1px solid var(--border-ctl); border-radius: 999px; color: var(--text-muted); font-size: var(--fs-sm); transition: background-color var(--dur) var(--ease), color var(--dur) var(--ease); }
.root-button:hover { background: var(--hover-btn); color: var(--text); }
.root-button[aria-pressed="true"] { border-color: var(--accent-border); background: var(--surface-sel); color: var(--text); }

.tabs { display: flex; gap: 2px; padding: 3px; border: 1px solid var(--border-ctl); border-radius: var(--radius-md); background: var(--surface-1); }
.tabs button { flex: 1 1 auto; min-width: 0; height: 26px; padding: 0 6px; border-radius: var(--radius-sm); color: var(--text-muted); font-size: var(--fs-ctl); font-weight: 500; text-align: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; transition: background-color var(--dur) var(--ease), color var(--dur) var(--ease); }
.tabs button:hover:not([aria-selected="true"]) { background: var(--hover-btn); color: var(--text); }
.tabs button[aria-selected="true"] { background: var(--seg-active); color: var(--seg-active-text); font-weight: 600; }

.panel { display: flex; flex-direction: column; flex: 1; min-height: 0; }
.scroll { display: flex; flex-direction: column; gap: var(--sp-3); flex: 1; min-height: 0; overflow: auto; padding: var(--sp-3) var(--sp-4) var(--sp-4); }
.fixed { display: flex; flex-direction: column; gap: var(--sp-3); flex: none; padding: var(--sp-3) var(--sp-4) 0; }
.list-wrap { display: flex; flex-direction: column; flex: 1; min-height: 0; padding: var(--sp-1) var(--sp-4) var(--sp-2); }

.cta { display: flex; align-items: center; justify-content: center; gap: var(--sp-2); width: 100%; height: 40px; border-radius: var(--radius-md); background: var(--cta); color: var(--cta-text); box-shadow: var(--cta-shadow); font-size: var(--fs-body); font-weight: 600; text-align: center; transition: filter var(--dur) var(--ease), box-shadow var(--dur) var(--ease); }
.cta:hover { filter: brightness(1.07); }
.cta:active { filter: brightness(0.96); }
.cta:focus-visible { outline-offset: 2px; }

.link { color: var(--accent); font-size: var(--fs-sm); font-weight: 500; }
.link:hover { text-decoration: underline; }
.quiet-link { display: inline-flex; align-items: center; gap: 4px; height: 24px; padding: 0 6px; border-radius: var(--radius-sm); color: var(--text-muted); font-size: var(--fs-sm); white-space: nowrap; transition: background-color var(--dur) var(--ease), color var(--dur) var(--ease); }
.quiet-link:hover { background: var(--hover-btn); color: var(--accent); }

.dot { flex: none; width: 16px; height: 16px; border-radius: 50%; background: var(--surface-2); box-shadow: var(--chip-ring); }
.dot.sm { width: 12px; height: 12px; }
.dots { display: inline-flex; flex: none; padding-left: 4px; }
.dots .dot { width: 14px; height: 14px; margin-left: -4px; box-shadow: 0 0 0 2px var(--bg-1), var(--chip-ring); }

.theme-list { display: flex; flex-direction: column; gap: 2px; flex: 1; min-height: 0; overflow: auto; margin: 0 calc(var(--sp-2) * -1); padding: 3px var(--sp-2); }
.theme-row { display: flex; align-items: center; gap: 10px; flex: none; width: 100%; min-height: 36px; padding: 0 var(--sp-2); border-radius: var(--radius-sm); transition: background-color var(--dur) var(--ease); }
.theme-row:hover { background: var(--hover-row); }
.theme-row[aria-current="true"] { background: var(--surface-sel); }
.theme-row-name { flex: 1; font-weight: 600; }
.theme-row-meta { flex: none; color: var(--text-muted); font-size: var(--fs-sm); white-space: nowrap; }

.foot { display: flex; flex-direction: column; gap: var(--sp-2); flex: none; padding: var(--sp-3) var(--sp-4) var(--sp-4); border-top: 1px solid var(--border); background: var(--bg-1); }
.file-line { display: flex; align-items: center; gap: var(--sp-2); min-width: 0; min-height: 22px; }
.file-line .icon { color: var(--ok); }
.file-link { min-width: 0; overflow: hidden; color: var(--text-2); font-family: var(--font-mono); font-size: var(--fs-sm); text-overflow: ellipsis; white-space: nowrap; border-radius: 4px; }
.file-link:hover { color: var(--accent); text-decoration: underline; }
.file-list { display: flex; flex-direction: column; gap: var(--sp-3); }
.file-block { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
.file-block + .file-block { padding-top: var(--sp-3); border-top: 1px solid var(--border); }
.file-block .file-line .icon { color: var(--text-muted); }
.file-line .pill { margin-left: auto; flex: none; }
.file-themes { display: flex; flex-direction: column; gap: 1px; padding-left: 21px; }
.file-theme { display: flex; align-items: center; gap: var(--sp-2); min-width: 0; height: 26px; padding: 0 6px; border-radius: 5px; color: var(--text-2); font-size: var(--fs-sm); text-align: left; }
.file-theme:hover { background: var(--hover-row); color: var(--text); }
.file-theme .theme-row-name { flex: 1; font-weight: 500; }
.file-theme-mode { flex: none; font-size: 11px; color: var(--text-muted); }
.file-note { padding-left: 21px; }
.card-head .overline { margin: 0; }
.chips { display: flex; flex-wrap: wrap; gap: 6px; }
.chip { display: inline-flex; align-items: center; height: 22px; padding: 0 8px; border: 1px solid var(--border-strong); border-radius: 999px; color: var(--text-2); font-size: 11.5px; white-space: nowrap; }
.chip.warn { border-color: transparent; background: var(--warn-bg); color: var(--warn); }

/* Onboarding: what a folder with no Themvora in it shows instead of an
 * unexplained "not found". */
.onboard { display: flex; flex-direction: column; gap: 12px; padding: 16px; border: 1px solid var(--border); border-radius: var(--radius-md); background: var(--surface-1); }
.onboard-title { margin: 0; font-size: 15px; font-weight: 600; color: var(--text); }
.onboard-lede { margin: 0; font-size: 12.5px; line-height: 1.55; color: var(--text-2); }
.onboard-evidence { margin: 0; padding-left: 18px; font-size: 12px; line-height: 1.6; color: var(--text-muted); }
.onboard-links { display: flex; flex-direction: column; gap: 6px; }
.onboard-link { display: inline-flex; align-items: center; gap: 8px; align-self: flex-start; min-height: 28px; padding: 0 10px; border: 1px solid var(--border-ctl); border-radius: var(--radius-sm); background: var(--surface-2); color: var(--text); font-size: 12.5px; }
.onboard-link.primary { border-color: var(--accent-border); background: var(--accent-tint); color: var(--accent-tint-text); }
.onboard-link:hover { background: var(--hover-btn); }
.onboard-link:focus-visible { outline: 2px solid var(--ring); outline-offset: 1px; }

.card { display: flex; flex-direction: column; gap: var(--sp-2); padding: var(--sp-3); border: 1px solid var(--border); border-radius: var(--radius-md); background: var(--surface-1); }
.card-head { display: flex; align-items: center; justify-content: space-between; gap: var(--sp-2); }
.kv { display: flex; align-items: center; justify-content: space-between; gap: var(--sp-3); min-height: 22px; font-size: var(--fs-ctl); }
.kv > :first-child { flex: none; color: var(--text-muted); }
.kv > :last-child { min-width: 0; overflow: hidden; text-align: right; text-overflow: ellipsis; white-space: nowrap; }
.family-line { display: flex; align-items: center; gap: var(--sp-2); min-height: 24px; font-size: var(--fs-ctl); }
.family-line .theme-row-name { font-weight: 500; }
.issue-line { display: flex; gap: var(--sp-2); font-size: var(--fs-ctl); }
.issue-line .icon { margin-top: 2px; color: var(--bad); }

.notice { display: flex; align-items: flex-start; gap: var(--sp-2); padding: var(--sp-2) 10px; border: 1px solid var(--border); border-radius: var(--radius-sm); background: var(--surface-notice); color: var(--text-2); font-size: var(--fs-sm); }
.notice .icon { margin-top: 1px; color: var(--accent); }
.notice.error { border-color: transparent; background: var(--bad-bg); color: var(--bad); }
.notice.error .icon { color: var(--bad); }

.search { position: relative; display: flex; align-items: center; }
.search .icon { position: absolute; left: 10px; color: var(--text-muted); pointer-events: none; }
.search input { width: 100%; height: 34px; padding: 0 10px 0 32px; border: 1px solid var(--border-ctl); border-radius: var(--radius-sm); background: var(--surface-1); color: var(--text); font: inherit; font-size: var(--fs-ctl); transition: border-color var(--dur) var(--ease), box-shadow var(--dur) var(--ease); }
.search input::placeholder { color: var(--text-muted); opacity: 1; }
.search input:hover { border-color: var(--border-strong); }
.search input:focus { outline: none; border-color: var(--accent-border); box-shadow: var(--ring-soft); }
.search input::-webkit-search-cancel-button { display: none; }

.table { width: 100%; border-collapse: collapse; table-layout: fixed; font-size: var(--fs-ctl); }
.table th { padding: 0 var(--sp-2) 6px; color: var(--text-muted); font-size: var(--fs-overline); font-weight: 600; letter-spacing: 0.08em; text-align: left; text-transform: uppercase; }
.table td { padding: 7px var(--sp-2); border-top: 1px solid var(--border); vertical-align: middle; }
.table th:first-child, .table td:first-child { padding-left: 0; }
.table th:last-child, .table td:last-child { padding-right: 0; text-align: right; }
.table tbody tr { transition: background-color var(--dur) var(--ease); }
.table tbody tr:hover { background: var(--hover-row); }
.preset-cell { display: flex; align-items: center; gap: var(--sp-2); min-width: 0; }
.preset-text { display: flex; flex-direction: column; min-width: 0; }
.preset-name { overflow: hidden; color: var(--text); font-weight: 600; text-overflow: ellipsis; white-space: nowrap; border-radius: 4px; }
.preset-name:hover { color: var(--accent); }
.preset-meta { overflow: hidden; color: var(--text-muted); font-size: var(--fs-sm); text-overflow: ellipsis; white-space: nowrap; }
.col-kind { width: 26%; color: var(--text-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.col-action { width: 64px; }
.col-version { width: 30%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.empty { display: flex; flex-direction: column; align-items: flex-start; gap: var(--sp-2); padding: var(--sp-4); border: 1px dashed var(--border-strong); border-radius: var(--radius-md); color: var(--text-muted); font-size: var(--fs-ctl); }
.skeleton { display: flex; flex-direction: column; gap: var(--sp-3); padding: var(--sp-3) var(--sp-4); }
.bone { position: relative; overflow: hidden; height: 12px; border-radius: var(--radius-sm); background: var(--surface-2); }
.bone.lg { height: 36px; border-radius: var(--radius-md); }
.bone::after { content: ""; position: absolute; inset: 0; transform: translateX(-100%); background: linear-gradient(90deg, transparent, var(--hover-btn), transparent); animation: shimmer 1.4s ease-in-out infinite; }
@keyframes shimmer { to { transform: translateX(100%); } }

body.vscode-high-contrast .pill, body.vscode-high-contrast-light .pill,
body.vscode-high-contrast .cta, body.vscode-high-contrast-light .cta,
body.vscode-high-contrast .notice, body.vscode-high-contrast-light .notice,
body.vscode-high-contrast .chip, body.vscode-high-contrast-light .chip { border: 1px solid var(--vscode-contrastBorder); }
body.vscode-high-contrast .tabs button[aria-selected="true"], body.vscode-high-contrast-light .tabs button[aria-selected="true"],
body.vscode-high-contrast .theme-row[aria-current="true"], body.vscode-high-contrast-light .theme-row[aria-current="true"] { outline: 1px solid var(--vscode-contrastActiveBorder, var(--vscode-focusBorder)); outline-offset: -1px; }

@media (max-width: 380px) {
  .tabs button { padding: 0 2px; font-size: 10.5px; }
}
@media (max-width: 300px) {
  .head, .fixed, .list-wrap { padding-left: var(--sp-3); padding-right: var(--sp-3); }
  .scroll, .foot { padding-left: var(--sp-3); padding-right: var(--sp-3); }
  .tabs button { padding: 0 3px; font-size: 11.5px; }
  .project .pill { display: none; }
  .col-kind { display: none; }
}
@media (prefers-reduced-motion: reduce) { * { transition: none !important; animation: none !important; } }
`;

/**
 * The view's markup.
 *
 * Everything is inline and nonce-tagged, so `default-src 'none'` needs no
 * exceptions beyond the bundled fonts, which load from the extension itself when
 * the host passes their URIs. The chrome uses the shared design tokens, which
 * follow the workbench under light and high-contrast themes.
 *
 * @param nonce - The CSP nonce.
 * @param assets - The bundled font URIs, when the host can resolve them.
 * @returns The document.
 */
export function workspaceHtml(nonce: string, assets?: WorkspaceAssets): string {
  const fontSrc = assets === undefined ? "" : ` font-src ${assets.cspSource};`;
  const fonts = assets === undefined ? "" : fontFaceCss(assets.inter, assets.mono);
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta http-equiv="Content-Security-Policy"
  content="default-src 'none';${fontSrc} style-src 'nonce-${nonce}'; script-src 'nonce-${nonce}';" />
<style nonce="${nonce}">${fonts}${DESIGN_TOKENS_CSS}${WORKSPACE_CSS}</style>
</head>
<body>
  <div class="shell" id="app">
    <div class="skeleton" aria-busy="true" aria-label="Loading">
      <div class="bone lg"></div><div class="bone"></div><div class="bone"></div><div class="bone"></div>
    </div>
  </div>
<script nonce="${nonce}">
  const vscode = acquireVsCodeApi();
  const SECTIONS = [
    { id: "overview", label: "Project" },
    { id: "studio", label: "Studio" },
    { id: "presets", label: "Presets" },
    { id: "packages", label: "Packages" },
    { id: "validation", label: "Health" }
  ];
  const BUILT = { overview: true, packages: true, studio: true, presets: true, validation: true };
  const SVG = ["http", "//www.w3.org/2000/svg"].join(":");
  const ICONS = {
    check: "M5 12.5l4.5 4.5L19 7.5",
    search: "M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-3.5-3.5",
    info: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 11v5M12 8h.01",
    alert: "M12 3 2.5 20h19zM12 10v4M12 17h.01",
    external: "M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5",
    file: "M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8zM14 3v5h5"
  };
  let state = null;
  let section = "overview";
  let rootIndex = 0;
  let selectedTheme = 0;
  let saveFormat = "json";
  let fileName = "";
  let fileText = null;
  let presetFilter = "";
  let selectedFamily = null;

  function el(tag, props, ...children) {
    const node = document.createElement(tag);
    for (const [key, value] of Object.entries(props || {})) {
      if (value === undefined || value === null) continue;
      if (key === "class") node.className = value;
      else if (key === "onClick") node.addEventListener("click", value);
      else if (key === "onInput") node.addEventListener("input", value);
      else if (key === "onKeydown") node.addEventListener("keydown", value);
      else if (key === "css") {
        // CSSOM, not a style attribute: the policy blocks the attribute.
        for (const [name, css] of Object.entries(value)) node.style.setProperty(name, css);
      } else if (key === "value") node.value = value;
      else node.setAttribute(key, value);
    }
    for (const child of children) {
      if (child === undefined || child === null || child === false) continue;
      node.append(typeof child === "string" ? document.createTextNode(child) : child);
    }
    return node;
  }

  function icon(name, size) {
    const svg = document.createElementNS(SVG, "svg");
    svg.setAttribute("class", "icon");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("width", String(size || 14));
    svg.setAttribute("height", String(size || 14));
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("focusable", "false");
    const path = document.createElementNS(SVG, "path");
    path.setAttribute("d", ICONS[name]);
    svg.append(path);
    return svg;
  }

  /**
   * The Themvora mark, from the same geometry as media/themvora.svg.
   *
   * The sidebar and the Studio used to draw an approximation — three discs on a
   * gradient tile — which is not the icon the Activity Bar shows. The ring and
   * the three discs at their real coordinates are the logo, so this is that
   * drawing in currentColor.
   */
  function brandMark() {
    const svg = document.createElementNS(SVG, "svg");
    svg.setAttribute("viewBox", "0 0 128 128");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("focusable", "false");

    const ring = document.createElementNS(SVG, "rect");
    ring.setAttribute("x", "6.5");
    ring.setAttribute("y", "6.5");
    ring.setAttribute("width", "115");
    ring.setAttribute("height", "115");
    ring.setAttribute("rx", "26");
    ring.setAttribute("fill", "none");
    ring.setAttribute("stroke", "currentColor");
    ring.setAttribute("stroke-width", "7");
    svg.append(ring);

    for (const [cx, cy, r, opacity] of [[42.5, 81.5, 18, 1], [66.5, 48.5, 15, 0.65], [88, 75.5, 11.5, 0.4]]) {
      const circle = document.createElementNS(SVG, "circle");
      circle.setAttribute("cx", String(cx));
      circle.setAttribute("cy", String(cy));
      circle.setAttribute("r", String(r));
      circle.setAttribute("fill", "currentColor");
      circle.setAttribute("fill-opacity", String(opacity));
      svg.append(circle);
    }
    return el("span", { class: "brand" }, svg);
  }

  function dot(color, extra) {
    return el("span", {
      class: "dot" + (extra ? " " + extra : ""),
      "aria-hidden": "true",
      css: color ? { background: color } : undefined
    });
  }

  function row(label, value) {
    return el("div", { class: "kv" }, el("span", {}, label),
      typeof value === "string" ? el("span", { title: value }, value) : value);
  }

  function statusClass(root) {
    if (root.status === "themes detected") return "ok";
    if (root.status === "invalid") return "bad";
    return "warn";
  }

  function statusPill(root) {
    return el("span", { class: "pill " + statusClass(root), title: root.statusDetail },
      el("span", { class: "pill-dot", "aria-hidden": "true" }), root.status);
  }

  function noticeBanner() {
    if (!state.notice) return null;
    const error = state.notice.kind === "error";
    return el("div", { class: "notice" + (error ? " error" : ""), role: error ? "alert" : "status" },
      icon(error ? "alert" : "info", 14), el("span", {}, state.notice.text));
  }

  // Grouped by family: light and dark are two halves of one theme. This is
  // plain JavaScript inside the document, so no type annotations.
  function familiesOf(root) {
    const families = [];
    for (const theme of root.themes) {
      const name = theme.family || theme.name.replace(/-(light|dark)$/u, "");
      let entry = families.find((candidate) => candidate.name === name);
      if (entry === undefined) {
        entry = { name: name, first: theme, modes: [], color: undefined };
        families.push(entry);
      }
      const mode = theme.mode || "default";
      if (entry.modes.indexOf(mode) === -1) entry.modes.push(mode);
      if (entry.color === undefined) {
        const primary = (theme.tokens || []).find((token) => token.name === "primary");
        if (primary) entry.color = primary.value;
      }
    }
    return families;
  }

  function scrollPanel(key, ...children) {
    return el("div", { class: "panel", role: "tabpanel", id: "panel", "aria-labelledby": "tab-" + section },
      el("div", { class: "scroll", "data-scroll-key": key }, ...children));
  }

  function renderOverview(root) {
    if (root.setup.kind === "not-configured") return renderOnboarding(root);
    return scrollPanel("overview",
      el("div", { class: "card" },
        el("h2", { class: "overline" }, "Project"),
        row("Framework", root.framework),
        row("Evidence", root.frameworkEvidence),
        row("Package manager", root.packageManager),
        row("Path", el("span", { class: "mono", title: root.path }, root.path)),
        row("Status", statusPill(root))),
      el("p", { class: "note" }, root.statusDetail),
      el("div", { class: "card" },
        el("div", { class: "card-head" },
          el("h2", { class: "overline" }, "Files"),
          refreshAction()),
        root.files.length === 0
          ? el("p", { class: "note" }, "No Themvora registry was found in this folder.")
          : el("div", { class: "file-list" }, ...root.files.map((file) => renderFile(file)))));
  }

  /**
   * What a developer sees in a folder that has no Themvora in it.
   *
   * The point is to say what is missing, what Themvora would do for them, and
   * where to read the install steps — not to imply the extension is broken.
   */
  function renderOnboarding(root) {
    return scrollPanel("overview",
      el("div", { class: "onboard" },
        el("h2", { class: "onboard-title" }, "Get started with Themvora"),
        el("p", { class: "onboard-lede" },
          "Themvora generates, previews and validates accessible light and dark theme pairs for your UI. "
          + "No Themvora integration or recognized theme configuration was found in " + root.name + "."),
        el("ul", { class: "onboard-evidence" },
          ...root.setup.evidence.map((line) => el("li", {}, line))),
        el("div", { class: "onboard-links", role: "group", "aria-label": "Setup resources" },
          setupLink("framework-guides", "Framework guides", "Install Themvora for your framework", true),
          setupLink("npm", "Themvora on npm", "Browse the published @themvora packages", true),
          setupLink("github", "GitHub repository", "Source, issues and contributions", false)),
        el("p", { class: "note" },
          "The preset catalog ships with the extension, so it is still available in the Presets tab.")));
  }

  /** One fixed destination, opened by the host. The webview never sends a URL. */
  function setupLink(target, label, hint, primary) {
    return el("button", {
      type: "button",
      class: "onboard-link" + (primary ? " primary" : ""),
      title: hint,
      onClick: () => vscode.postMessage({ type: "openExternal", target: target })
    }, icon("external", 14), el("span", {}, label));
  }

  function refreshAction() {
    return el("button", {
      type: "button",
      class: "quiet-link",
      title: "Re-read every workspace folder",
      onClick: () => vscode.postMessage({ type: "command", command: "themvora.refresh" })
    }, "Refresh");
  }

  function fileStatusClass(file) {
    if (file.status === "supported") return "ok";
    if (file.status === "malformed") return "bad";
    return "warn";
  }

  /** One registry file: open it, see its status, preview the themes it holds. */
  function renderFile(file) {
    return el("div", { class: "file-block" },
      el("div", { class: "file-line" },
        icon("file", 13),
        el("button", {
          type: "button",
          class: "file-link",
          title: "Open " + file.path,
          onClick: () => vscode.postMessage({ type: "open", path: file.path })
        }, file.path),
        el("span", { class: "pill " + fileStatusClass(file), title: file.detail }, file.statusLabel)),
      file.families.length === 0
        ? el("p", { class: "note file-note" }, file.detail)
        : el("div", { class: "file-themes" }, ...file.families.map((family) =>
            el("button", {
              type: "button",
              class: "file-theme",
              title: "Preview " + family.name,
              onClick: () => vscode.postMessage({ type: "selectProject", path: file.path, name: family.primary })
            },
              dot(family.color, "sm"),
              el("span", { class: "theme-row-name ellipsis" }, family.name),
              el("span", { class: "file-theme-mode" }, family.modes.length === 0 ? "default" : family.modes.join(" / "))))));
  }

  function renderPackages(root) {
    if (!root.packages.length) {
      return scrollPanel("packages",
        el("div", { class: "empty" }, "No @themvora package is declared in this project."));
    }
    return scrollPanel("packages",
      el("table", { class: "table" },
        el("thead", {}, el("tr", {},
          el("th", {}, "Package"), el("th", { class: "col-version" }, "Declared"), el("th", { class: "col-version" }, "Installed"))),
        el("tbody", {}, ...root.packages.map((pkg) =>
          el("tr", {},
            el("td", { class: "ellipsis", title: pkg.name }, pkg.name),
            el("td", { class: "col-version muted mono", title: pkg.declaredRange }, pkg.declaredRange),
            el("td", { class: "col-version" },
              el("span", { class: "pill " + (pkg.status === "installed" ? "ok" : "bad") },
                pkg.installedVersion || "not resolved")))))),
      el("p", { class: "note" },
        'A declared package is not an installed one — "not resolved" means nothing was found in node_modules.'));
  }

  /**
   * The Studio tab in the sidebar is a launcher.
   *
   * The Studio itself lives in the editor panel, which has the room for a
   * preview and a token table. Keeping a second selection here is what made the
   * two surfaces able to disagree, so the sidebar lists themes and hands off.
   */
  function renderStudio(root) {
    const open = el("button", {
      type: "button",
      class: "cta",
      "data-focus-key": "open-studio",
      onClick: () => vscode.postMessage({ type: "command", command: "themvora.openStudio" })
    }, "Open Theme Studio");

    // One row per family, as a list: chips ran together into an unreadable line.
    const byFamily = familiesOf(root);
    const rows = byFamily.map((family) => el("button", {
      type: "button",
      class: "theme-row",
      title: "Preview " + family.name,
      "aria-current": selectedFamily === family.name ? "true" : undefined,
      "data-focus-key": "family-" + family.name,
      onClick: () => {
        selectedFamily = family.name;
        vscode.postMessage({
          type: "selectProject",
          path: family.first.source,
          name: family.first.name
        });
        render();
      }
    },
      dot(family.color),
      el("span", { class: "theme-row-name ellipsis" }, family.name),
      el("span", { class: "theme-row-meta" }, family.modes.join(" / "))));

    const list = byFamily.length === 0
      ? el("div", { class: "empty" }, "No theme this project defines.")
      : el("div", { class: "theme-list", role: "list", "aria-label": "Project themes", "data-scroll-key": "studio-list" },
          ...rows.map((button) => el("div", { role: "listitem" }, button)));

    return el("div", { class: "panel", role: "tabpanel", id: "panel", "aria-labelledby": "tab-studio" },
      el("div", { class: "fixed" },
        open,
        el("p", { class: "note" },
          root.themes.length + " project-defined " + (root.themes.length === 1 ? "theme" : "themes") +
          ". Click one to preview it here; edit and save in the Studio."),
        el("h2", { class: "overline" }, "Project themes")),
      el("div", { class: "list-wrap" }, list));
  }

  /** Validation in the sidebar: the project's verdict, and where the details live. */
  function renderValidation(root) {
    if (root.setup.kind === "not-configured") {
      return scrollPanel("validation",
        el("div", { class: "empty" },
          el("span", {}, "Project health is unavailable: no Themvora integration was found in this workspace."),
          el("span", { class: "note" }, "Validation runs against a theme. Set Themvora up, or preview a canonical preset to see a theme checked.")));
    }
    const invalid = root.themes.filter((theme) => !theme.valid);
    return scrollPanel("validation",
      el("div", { class: "card" },
        el("h2", { class: "overline" }, "Project"),
        row("Status", el("span", { class: "pill " + (invalid.length === 0 ? "ok" : "bad") },
          el("span", { class: "pill-dot", "aria-hidden": "true" }), root.status)),
        row("Themes", String(root.themes.length)),
        row("Invalid", el("span", { class: invalid.length === 0 ? "" : "bad" }, String(invalid.length)))),
      invalid.length === 0
        ? el("p", { class: "note" }, "Every theme this project defines passes the canonical validator.")
        : el("div", { class: "card" }, ...invalid.map((theme) =>
            el("div", { class: "issue-line" }, icon("alert", 13),
              el("span", {}, el("strong", {}, theme.name), el("span", { class: "muted" }, " — " + (theme.issue || "invalid")))))),
      el("p", { class: "note" }, "Per-token contrast and the full report are in the Theme Studio."));
  }

  function renderPresets() {
    const root = state.roots[Math.min(rootIndex, state.roots.length - 1)];
    const catalogOnly = root !== undefined && !root.setup.studioEnabled;
    const all = state.presets || [];
    if (!all.length) {
      return scrollPanel("presets",
        noticeBanner(),
        el("div", { class: "empty" },
          el("span", {}, "Reading the catalog\u2026"),
          el("button", { type: "button", class: "link", onClick: () => vscode.postMessage({ type: "presets" }) }, "Load presets")));
    }

    const query = presetFilter.toLowerCase();
    const matches = all.filter((preset) =>
      query.length === 0 ||
      preset.id.toLowerCase().includes(query) ||
      preset.label.toLowerCase().includes(query) ||
      preset.family.toLowerCase().includes(query));

    const search = el("label", { class: "search" },
      icon("search", 14),
      el("input", {
        type: "search",
        value: presetFilter,
        placeholder: "Search presets",
        "aria-label": "Search presets",
        spellcheck: "false",
        "data-focus-key": "preset-search",
        onInput: (event) => { presetFilter = event.target.value; render(); }
      }));

    const rows = matches.slice(0, 40).map((preset) =>
      el("tr", {},
        el("td", {},
          el("div", { class: "preset-cell" },
            el("span", { class: "dots", "aria-hidden": "true" }, ...preset.swatches.map((color) => dot(color))),
            el("div", { class: "preset-text" },
              el("button", {
                type: "button",
                class: "preset-name",
                title: preset.description || preset.label,
                "data-focus-key": "preset-" + preset.id,
                onClick: () => vscode.postMessage({ type: "selectPreset", name: preset.id })
              }, preset.label),
              el("span", { class: "preset-meta" }, (preset.modes || []).join(" / "))))),
        el("td", { class: "col-kind", title: preset.kind }, preset.kind),
        el("td", { class: "col-action" }, el("button", {
          type: "button",
          class: "quiet-link",
          title: "Open " + preset.label + " in the Theme Studio",
          onClick: () => vscode.postMessage({ type: "command", command: "themvora.openStudio", preset: preset.id })
        }, "studio"))));

    return scrollPanel("presets",
      noticeBanner(),
      search,
      ...(catalogOnly
        ? [el("p", { class: "note" }, "Catalog only \u2014 these presets ship with the extension and are not read from this project.")]
        : []),
      matches.length === 0
        ? el("div", { class: "empty" }, "No preset matches \u201c" + presetFilter + "\u201d.")
        : el("table", { class: "table" },
            el("thead", {}, el("tr", {},
              el("th", {}, "Preset"), el("th", { class: "col-kind" }, "Kind"), el("th", { class: "col-action" }, ""))),
            el("tbody", {}, ...rows)),
      el("p", { class: "note" },
        matches.length + " of " + all.length + " canonical presets. Selecting one opens it read-only in the Studio."));
  }

  function renderNotYet(label) {
    return scrollPanel("not-yet",
      el("div", { class: "empty" }, label + " is not in this build yet. This increment ships Overview and Packages; the theme preview is still the separate Preview Theme command."));
  }

  let presetsRequested = false;

  function render() {
    const app = document.getElementById("app");
    const active = document.activeElement;
    const focusKey = active && active.getAttribute ? active.getAttribute("data-focus-key") : null;
    const caret = active && typeof active.selectionStart === "number" ? active.selectionStart : null;
    const scrolls = {};
    for (const node of app.querySelectorAll("[data-scroll-key]")) scrolls[node.getAttribute("data-scroll-key")] = node.scrollTop;

    app.replaceChildren();
    if (!state || !state.roots.length) {
      app.append(el("div", { class: "scroll" },
        el("div", { class: "empty" }, "No folder open. Open a folder to detect its themes.")));
      return;
    }

    const root = state.roots[Math.min(rootIndex, state.roots.length - 1)];
    // A folder can lose its Themvora setup between renders; never leave the view
    // sitting on a section that is no longer available.
    if (section === "studio" && !root.setup.studioEnabled) section = "overview";

    const header = el("div", { class: "head" },
      el("div", { class: "project", title: root.path },
        brandMark(),
        el("div", { class: "project-text" },
          el("h1", { class: "project-name ellipsis" }, root.name),
          el("span", { class: "project-meta ellipsis" },
            root.framework + " \u00b7 " + root.packageManager + " \u00b7 " + root.themes.length + " themes")),
        statusPill(root)));

    if (state.roots.length > 1) {
      header.append(el("div", { class: "roots", role: "group", "aria-label": "Workspace folder" },
        ...state.roots.map((entry, index) =>
          el("button", {
            type: "button",
            class: "root-button",
            title: entry.path,
            "aria-pressed": String(index === rootIndex),
            "data-focus-key": "root-" + index,
            onClick: () => { rootIndex = index; render(); }
          }, entry.name))));
    }

    header.append(el("nav", { class: "tabs", role: "tablist", "aria-label": "Sections" }, ...SECTIONS.map((entry) => {
      // The Studio edits this project's themes, so it needs a project that has
      // Themvora in it. Everything else in the view works without one.
      const locked = entry.id === "studio" && !root.setup.studioEnabled;
      return el("button", {
        type: "button",
        role: "tab",
        id: "tab-" + entry.id,
        "aria-selected": String(entry.id === section),
        "aria-controls": "panel",
        "aria-disabled": locked ? "true" : "false",
        disabled: locked ? "disabled" : undefined,
        title: locked ? "The Studio needs Themvora in this project. See the Project tab for setup." : undefined,
        tabindex: entry.id === section ? "0" : "-1",
        "data-focus-key": "tab-" + entry.id,
        onClick: () => { if (locked) return; section = entry.id; render(); }
      }, entry.label);
    })));
    app.append(header);

    // Asked once, not on every render: the catalog does not change while the
    // view is open, and a request per paint would be a loop.
    if (section === "presets" && !state.presets && !presetsRequested) {
      presetsRequested = true;
      vscode.postMessage({ type: "presets" });
    }

    if (!BUILT[section]) app.append(renderNotYet(SECTIONS.find((entry) => entry.id === section).label));
    else if (section === "overview") app.append(renderOverview(root));
    else if (section === "packages") app.append(renderPackages(root));
    else if (section === "studio") app.append(renderStudio(root));
    else if (section === "presets") app.append(renderPresets());
    else app.append(renderValidation(root));

    for (const node of app.querySelectorAll("[data-scroll-key]")) {
      const top = scrolls[node.getAttribute("data-scroll-key")];
      if (top) node.scrollTop = top;
    }
    if (focusKey) {
      const target = Array.from(app.querySelectorAll("[data-focus-key]"))
        .find((node) => node.getAttribute("data-focus-key") === focusKey);
      if (target) {
        target.focus();
        if (caret !== null && typeof target.setSelectionRange === "function") target.setSelectionRange(caret, caret);
      }
    }
  }

  window.addEventListener("message", (event) => {
    const message = event.data;
    if (message.type === "state") { state = message.state; render(); }
    if (message.type === "fileText") { fileText = message.text; render(); }
  });

  document.addEventListener("keydown", (event) => {
    const keys = ["ArrowRight", "ArrowLeft", "Home", "End"];
    if (keys.indexOf(event.key) === -1) return;
    if (!event.target || !event.target.closest || !event.target.closest('nav[role="tablist"]')) return;
    event.preventDefault();
    const index = SECTIONS.findIndex((entry) => entry.id === section);
    let next = index;
    if (event.key === "ArrowRight") next = (index + 1) % SECTIONS.length;
    else if (event.key === "ArrowLeft") next = (index - 1 + SECTIONS.length) % SECTIONS.length;
    else if (event.key === "Home") next = 0;
    else next = SECTIONS.length - 1;
    section = SECTIONS[next].id;
    render();
    const button = document.querySelector('nav button[aria-selected="true"]');
    if (button) button.focus();
  });

  vscode.postMessage({ type: "ready" });
</script>
</body>
</html>`;
}

/** What the provider needs from the rest of the extension. */
export interface WorkspaceViewOptions {
  /** The current roots, read lazily. */
  readonly roots: () => readonly RootView[];
  /** Build a profile for one root path. */
  readonly profileFor: (rootPath: string) => Promise<ProjectProfile>;
  /**
   * Show themes in the existing preview panel.
   *
   * Passed in rather than constructed here: there is one preview, and a second
   * one in the workspace would drift from it.
   */
  readonly preview?: {
    openThemes(themes: readonly ThemeDefinition[], label: string): Promise<void>;
  };
  /** The canonical client, for generation and the catalog. */
  readonly client?: ThemvoraClient;
  /** The extension's root, so the view can load the bundled fonts. */
  readonly extensionUri?: Uri;
  /** Write a generated pair, through the same path the command uses. */
  readonly save?: (
    themes: readonly ThemeDefinition[],
    options: { readonly format: ThemeFileFormat; readonly fileName: string; readonly css?: string },
  ) => Promise<SaveOutcome>;
}

/** The provider handle. */
export interface WorkspaceViewHandle extends Disposable {
  /** Re-render from the current roots. */
  refresh(): Promise<void>;
}

/**
 * Register the workspace view.
 *
 * @param options - Access to the current roots and to profiles.
 * @returns A handle whose `refresh` re-renders.
 */
export function registerWorkspaceView(options: WorkspaceViewOptions): WorkspaceViewHandle {
  let view: WebviewView | undefined;
  let nonce = createNonce();

  // Only what the sidebar itself needs: the themes it previews, and the catalog.
  // The Studio's selection lives in the panel, which is the one surface with a
  // preview and a token table — two owners is what let them disagree.
  let selectedThemes: readonly ThemeDefinition[] = [];
  let presets: readonly WorkspacePreset[] | undefined;
  let notice: { kind: "info" | "error"; text: string } | undefined;

  /**
   * Recompute and post the state.
   *
   * A view that was never resolved has nothing to post to, and building the state
   * costs a profile read per root — a walk of the project. So an unopened sidebar
   * is a no-op rather than a discarded render.
   *
   * @returns A promise that settles once the state has been posted.
   */
  async function refresh(): Promise<void> {
    if (view === undefined) return;

    const roots = options.roots();
    const profiles = new Map<string, ProjectProfile>();

    for (const root of roots) {
      profiles.set(root.inspection.root, await options.profileFor(root.inspection.root));
    }

    const state = buildWorkspaceState(roots, profiles);
    view.webview.postMessage({
      type: "state",
      state: {
        ...state,
        ...(presets === undefined ? {} : { presets }),
        ...(notice === undefined ? {} : { notice }),
      },
    });
  }

  const provider: WebviewViewProvider = {
    resolveWebviewView(resolved: WebviewView): void {
      view = resolved;
      const fonts =
        options.extensionUri === undefined
          ? undefined
          : Uri.joinPath(options.extensionUri, "dist", "webview", "fonts");
      resolved.webview.options = {
        enableScripts: true,
        localResourceRoots: fonts === undefined ? [] : [fonts],
      };
      resolved.webview.html = workspaceHtml(
        nonce,
        fonts === undefined
          ? undefined
          : {
              cspSource: resolved.webview.cspSource,
              inter: resolved.webview.asWebviewUri(Uri.joinPath(fonts, "inter-var-latin.woff2")).toString(),
              mono: resolved.webview
                .asWebviewUri(Uri.joinPath(fonts, "jetbrains-mono-var-latin.woff2"))
                .toString(),
            },
      );

      resolved.webview.onDidReceiveMessage(async (message: unknown) => {
        if (typeof message !== "object" || message === null) return;
        const type = (message as { type?: unknown }).type;

        if (type === "ready") {
          void refresh();
          return;
        }

        if (type === "openExternal") {
          // The webview names one of three ids; the URL comes from the host, so
          // a compromised or buggy view cannot open an arbitrary destination.
          const target = setupLink((message as { target?: unknown }).target);
          if (target === undefined) return;
          void env.openExternal(Uri.parse(SETUP_LINKS[target]));
          return;
        }

        if (type === "selectProject") {
          const path = (message as { path?: unknown }).path;
          const name = (message as { name?: unknown }).name;
          if (typeof path !== "string" || typeof name !== "string") return;

          const entry = options.roots()[0]?.inspection.registries.find((registry) => registry.path === path);
          const theme = entry?.themes?.find((candidate) => candidate.name === name);
          if (theme === undefined) return;

          // One registry can hold several families. Pass the clicked theme's
          // family, not every theme in the file, or the preview's mode lookup
          // can land on another family's light theme.
          selectedThemes = familyOf(entry?.themes ?? [theme], theme);
          void options.preview?.openThemes(selectedThemes, path);
          return;
        }

        if (type === "presets") {
          const catalog = await options.client?.catalog();
          if (catalog === undefined || !catalog.ok || catalog.value === null) {
            notice = { kind: "error", text: "The preset catalog could not be read." };
            await refresh();
            return;
          }

          // One row per mode: a preset ships a light and a dark theme, and they
          // are different colours, not two views of one.
          // One row per family: a preset's light and dark variants are two halves
          // of one theme, not two presets. The row carries both modes so the
          // Studio can switch between them.
          presets = catalog.value.entries.map((entry) => {
            const light = entry.themes.light ?? Object.values(entry.themes)[0];
            return {
              id: entry.id,
              label: entry.name,
              family: entry.family,
              kind: entry.kind,
              style: entry.style,
              description: entry.character,
              modes: Object.keys(entry.themes),
              swatches: [
                light?.tokens?.colors?.primary,
                light?.tokens?.colors?.accent,
                light?.tokens?.colors?.background,
              ].filter((value): value is string => typeof value === "string"),
            };
          });
          notice = undefined;
          await refresh();
          return;
        }

        if (type === "selectPreset") {
          const name = (message as { name?: unknown }).name;
          if (typeof name !== "string") return;

          const catalog = await options.client?.catalog();
          const entry = catalog?.ok
            ? catalog.value?.entries.find((item) => item.id === name)
            : undefined;
          if (entry === undefined) return;

          const familyThemes = Object.values(entry.themes);
          if (familyThemes.length === 0) return;

          selectedThemes = familyThemes;
          notice = { kind: "info", text: "A preset is read-only and is not registered in this project." };
          await refresh();

          // Straight into the preview: choosing a preset and then having to find
          // a second button to see it is a step that earns nothing.
          void options.preview?.openThemes(familyThemes, `preset · ${entry.name}`);
          return;
        }

        if (type === "copy") {
          const text = (message as { text?: unknown }).text;
          if (typeof text === "string") await env.clipboard.writeText(text);
          return;
        }

        if (type === "command") {
          // Allow-listed: the webview names a command, it does not supply one.
          const command = (message as { command?: unknown }).command;
          const preset = (message as { preset?: unknown }).preset;

          if (command === "themvora.generateTheme") {
            void commands.executeCommand(command);
            return;
          }

          if (command === "themvora.openStudio") {
            // The preset id is a plain string from the catalog, not a command or
            // a path, so it is safe to forward.
            void commands.executeCommand(command, typeof preset === "string" ? preset : undefined);
          }

          if (command === "themvora.refresh") {
            void commands.executeCommand(command);
          }
          return;
        }

        if (type === "preview") {
          if (selectedThemes.length === 0) return;
          void options.preview?.openThemes(selectedThemes, "theme");
          return;
        }

        if (type === "open") {
          const path = (message as { path?: unknown }).path;
          if (typeof path !== "string") return;
          // Resolved against the folder the view is showing; the webview never
          // supplies an absolute path or a command.
          const root = options.roots()[0];
          if (root === undefined) return;
          // `vscode.open` takes a `Uri`. A string is accepted by the type but
          // resolved as nothing, which is why clicking a source did nothing.
          const uri = Uri.joinPath(Uri.file(root.inspection.root), ...path.split("/"));
          await commands.executeCommand("vscode.open", uri, { viewColumn: ViewColumn.One });
        }
      });

      resolved.onDidDispose(() => {
        view = undefined;
        nonce = createNonce();
      });
    },
  };

  const registration = window.registerWebviewViewProvider("themvora.workspace", provider, {
    // Re-created on reveal: the view re-sends `ready`, and a hidden view costs
    // nothing. Same policy as the preview panel.
    webviewOptions: { retainContextWhenHidden: false },
  });

  return {
    refresh,
    dispose(): void {
      registration.dispose();
    },
  };
}

/** The view's id, shared with the manifest. */
export const WORKSPACE_VIEW_ID = "themvora.workspace";

/**
 * Open a URI in the editor, for callers that already have one.
 *
 * @param uri - The URI to open.
 */
export async function openInEditor(uri: Uri): Promise<void> {
  await commands.executeCommand("vscode.open", uri);
}
