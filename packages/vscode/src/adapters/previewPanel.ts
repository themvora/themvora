/**
 * The preview webview: its HTML, its CSP, and its lifecycle.
 *
 * The HTML is generated here and nowhere else, so the policy and the markup that
 * depends on it cannot drift apart. Three decisions are load-bearing:
 *
 * - **No external assets, except the bundled faces.** The style and script are
 *   inline and nonce-tagged, so `default-src 'none'` needs no exceptions; the
 *   two `@font-face` files are the one deliberate exception, because the panel
 *   must paint the preview in the same typeface as the Studio. `localResourceRoots`
 *   lists that directory and nothing else.
 * - **No `'unsafe-inline'` for styles.** Token values are applied through CSSOM
 *   (`style.setProperty`), which CSP does not govern, so the stylesheet itself
 *   never contains user data and never needs an inline-style allowance.
 * - **The script is a plain string, and it is tested as one.** The panel test
 *   extracts the emitted `<script>` and runs it against a small fake DOM, so the
 *   code that ships is the code under test — not a TypeScript lookalike.
 *
 * The surface is the same code the Studio renders. Its controller travels as
 * text (`mountPreview.toString()`), because the panel has no module graph; the
 * same function is imported normally by the Studio, so there is one behaviour.
 *
 * @packageDocumentation
 */
import { CORE_COLORS } from "@themvora/core";
import { Uri, ViewColumn, window, type Disposable, type WebviewPanel } from "vscode";

import {
  parseWebviewMessage,
  type HostToWebview,
  type WebviewToHost,
} from "./previewDocument.js";
import { DESIGN_TOKENS_VSCODE_CSS, fontFaceCss } from "../shared/designTokens.js";
import { DASHBOARD_SURFACE_CSS, dashboardMarkup } from "../shared/dashboardSurface.js";
import { mountPreview } from "../shared/previewController.js";
import { PREVIEW_SURFACE_CSS, previewSurfaceMarkup } from "../shared/previewSurface.js";

/** The panel's view type. */
const VIEW_TYPE = "themvora.preview";

/** The panel's tab title. */
const TITLE = "Theme Preview";

/**
 * Generate a CSP nonce.
 *
 * `crypto.randomUUID()` is available in the extension host (Node 20). The
 * fallback exists only so a host without it degrades instead of throwing; the
 * real defence is `default-src 'none'`, not nonce unpredictability.
 *
 * @returns A 36-character identifier.
 */
function createNonce(): string {
  const source = globalThis.crypto;
  if (typeof source?.randomUUID === "function") return source.randomUUID();

  let text = "";
  const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
  for (let index = 0; index < 32; index += 1) {
    text += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
  }
  return text;
}

/**
 * The webview script, verbatim.
 *
 * Deliberately plain ES5-style JavaScript with no build-time transforms: it is
 * embedded as text, so it has to stand on its own. It touches only the DOM
 * surface the panel test fakes, plus the controller, which is guarded so a
 * fake DOM never reaches it.
 */
const WEBVIEW_SCRIPT = `(function () {
  var vscode = acquireVsCodeApi();
  var revision = -1;
  var controller = null;
  var inspect = false;
  var view = "dashboard";
  var rolesApplied = false;

  // Core's 21 roles, and the property each is exposed as on the preview root.
  var ROLE_NAMES = [
    "background", "foreground", "muted", "mutedForeground", "card", "cardForeground",
    "popover", "popoverForeground", "primary", "primaryForeground", "secondary",
    "secondaryForeground", "accent", "accentForeground", "destructive",
    "destructiveForeground", "success", "successForeground", "border", "input", "ring"
  ];

  function roleProperty(role) {
    return "--" + role.replace(/[A-Z]/g, function (letter) {
      return "-" + letter.toLowerCase();
    });
  }

  function setText(id, value) {
    var node = document.getElementById(id);
    if (node) node.textContent = value;
  }

  function persist() {
    if (typeof vscode.setState !== "function") return;
    try {
      vscode.setState({ view: view, inspect: inspect });
    } catch (error) {
      // A host that cannot persist state still gets a working panel.
    }
  }

  function applyView(next, save) {
    view = next;
    var dashboard = document.getElementById("surface-dashboard");
    var components = document.getElementById("surface-components");
    if (dashboard) dashboard.hidden = view !== "dashboard";
    if (components) components.hidden = view !== "components";
    var buttons = ["dashboard", "components"];
    for (var index = 0; index < buttons.length; index++) {
      var button = document.getElementById("view-" + buttons[index]);
      if (button) button.setAttribute("aria-pressed", buttons[index] === view ? "true" : "false");
    }
    if (save === true) persist();
  }

  function applyInspect(next, save) {
    inspect = next;
    var button = document.getElementById("inspect-toggle");
    if (button) {
      button.setAttribute("aria-pressed", inspect ? "true" : "false");
      button.className = inspect ? "pv-toggle is-on" : "pv-toggle";
    }
    if (controller) controller.setInspect(inspect);
    if (save === true) persist();
  }

  function applyPreview(model) {
    var root = document.getElementById("preview-root");
    var values = {};
    for (var roleIndex = 0; roleIndex < model.roles.length; roleIndex++) {
      values[model.roles[roleIndex].role] = model.roles[roleIndex].value;
    }

    // Only the theme's 21 roles enter the preview, every one of them. A missing
    // role becomes the guaranteed invalid value "initial", so a host page's own
    // --border or --accent can never be inherited in its place.
    if (root) {
      for (var role = 0; role < ROLE_NAMES.length; role++) {
        var name = ROLE_NAMES[role];
        var value = values[name];
        root.style.setProperty(
          roleProperty(name),
          value === undefined || value === null || value === "" ? "initial" : value
        );
      }
      root.setAttribute("data-mode", model.mode);
      // The document's scheme drives native widgets, including the scrollbar
      // gutter. A light preview under a dark workbench otherwise gets a dark
      // scrollbar strip down the side of a light page.
      document.documentElement.style.colorScheme = model.mode === "dark" ? "dark" : "light";
      // The panel's scrollbar belongs to the page, not to the preview root, so
      // its thumb cannot inherit the theme's roles. Pin it to the previewed
      // mode so a light theme never gets a dark bar down its side.
      document.documentElement.style.setProperty(
        "--pv-scroll-thumb",
        model.mode === "dark" ? "rgba(255, 255, 255, 0.24)" : "rgba(0, 0, 0, 0.28)",
      );

      // The first model arrives after paint. Without this the chrome's own
      // colours are the transition's starting point, so the preview flashes
      // (or, in a throttled webview, freezes) between two palettes. Establish
      // the roles with transitions off, then arm the 200ms crossfade for later
      // theme changes.
      if (!rolesApplied) {
        rolesApplied = true;
        void root.offsetWidth;
        setTimeout(function () {
          if (root) root.classList.add("tvp-ready");
        }, 24);
      }
    }

    setText("theme-name", model.themeName);
    setText("theme-family", model.family);
    setText("theme-contrast", model.contrast);
    setText("theme-source", model.source);
    setText("chrome-name", model.themeName);
    setText("chrome-source", model.source);

    setText("stat-tokens", String(model.roles.length));
    setText("stat-family", model.family);
    setText("stat-mode", model.mode);
    setText("stat-contrast", model.contrast);
    setText("theme-mode", model.systemMode ? "system \\u2192 " + model.mode : model.mode);

    var modeNames = ["light", "dark"];
    for (var modeIndex = 0; modeIndex < modeNames.length; modeIndex++) {
      var mode = modeNames[modeIndex];
      var button = document.getElementById("mode-" + mode);
      if (!button) continue;
      button.disabled = model.modes.indexOf(mode) === -1;
      button.setAttribute("aria-pressed", mode === model.mode ? "true" : "false");
    }

    for (var index = 0; index < model.roles.length; index++) {
      var entry = model.roles[index];
      var swatch = document.getElementById("swatch-" + entry.role);
      var cell = document.getElementById("value-" + entry.role);
      if (swatch) {
        swatch.style.setProperty(
          "background",
          entry.value === null ? "initial" : entry.value
        );
      }
      if (cell) cell.textContent = entry.value === null ? "(missing)" : entry.value;
    }

    var banner = document.getElementById("banner");
    if (banner) banner.hidden = true;
  }

  function applyError(message, stale) {
    var banner = document.getElementById("banner");
    if (!banner) return;
    banner.textContent = stale ? "Showing the last valid preview \\u2014 " + message : message;
    banner.setAttribute("data-stale", stale ? "true" : "false");
    banner.hidden = false;
  }

  window.addEventListener("message", function (event) {
    var data = event.data;
    if (!data || typeof data !== "object") return;

    if (typeof data.revision === "number") {
      if (data.revision <= revision) return;
      revision = data.revision;
    }

    if (data.type === "preview" && data.model) applyPreview(data.model);
    else if (data.type === "error") applyError(data.message, data.stale);
  });

  var light = document.getElementById("mode-light");
  if (light) {
    light.addEventListener("click", function () {
      vscode.postMessage({ type: "setMode", mode: "light" });
    });
  }

  var dark = document.getElementById("mode-dark");
  if (dark) {
    dark.addEventListener("click", function () {
      vscode.postMessage({ type: "setMode", mode: "dark" });
    });
  }

  var views = ["dashboard", "components"];
  for (var viewIndex = 0; viewIndex < views.length; viewIndex++) {
    (function (name) {
      var button = document.getElementById("view-" + name);
      if (!button) return;
      button.addEventListener("click", function () {
        applyView(name, true);
      });
    })(views[viewIndex]);
  }

  var inspectButton = document.getElementById("inspect-toggle");
  if (inspectButton) {
    inspectButton.addEventListener("click", function () {
      applyInspect(!inspect, true);
    });
  }

  // Restore the last view and inspect state, when the host supports state.
  var state = null;
  if (typeof vscode.getState === "function") {
    try {
      state = vscode.getState();
    } catch (error) {
      state = null;
    }
  }
  if (state && state.view === "components") view = "components";
  applyView(view, false);
  applyInspect(state && state.inspect === true, false);

  // The controller needs a real DOM; the panel test's fake one stops here.
  var root = document.getElementById("preview-root");
  if (
    root &&
    typeof root.querySelector === "function" &&
    typeof document.querySelector === "function"
  ) {
    controller = (${mountPreview.toString()})(root, { animate: true });
    controller.setInspect(inspect);

    // A development hook only: the harness adds ?themvora-audit=1 to run the
    // colour audit over the real painted tree. A VS Code webview never does.
    if (
      window.location &&
      typeof window.location.search === "string" &&
      window.location.search.indexOf("themvora-audit") !== -1
    ) {
      window.__themvoraAudit = function () {
        return controller ? controller.audit() : [];
      };
    }
  }

  vscode.postMessage({ type: "ready" });
})();`;

/**
 * The panel-only rules. Everything a theme paints comes from the shared surface
 * stylesheets, so the panel and the Studio cannot render a theme differently.
 */
const STYLES = `${DESIGN_TOKENS_VSCODE_CSS}
    :root { color-scheme: light dark; }

    /* VS Code's webview defaults set scrollbar-color on html inside an
     * @layer; a non-auto value there makes Chromium ignore
     * ::-webkit-scrollbar and paint the platform bar with a track filled
     * from the workbench background. Reset it so the rules below apply. */
    html { scrollbar-color: auto; }
    ::-webkit-scrollbar { width: 10px; height: 10px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb {
      background-color: var(--pv-scroll-thumb, rgba(121, 121, 121, 0.4));
      border-radius: 999px;
    }
    ::-webkit-scrollbar-button { display: none; }
    body { margin: 0; background: var(--bg-0); color: var(--text); font-family: var(--font-ui); }

    .pv-chrome {
      position: sticky;
      top: 0;
      z-index: 5;
      font-family: var(--font-ui);
      background: var(--bg-0);
      color: var(--text);
      border-bottom: 1px solid var(--border);
    }

    .pv-strip {
      display: flex;
      align-items: center;
      gap: var(--sp-3);
      min-height: 44px;
      padding: 6px var(--sp-4);
      font-size: var(--fs-sm);
      min-width: 0;
      flex-wrap: wrap;
    }

    .pv-title { font-weight: 600; color: var(--text); flex: none; }

    .pv-meta {
      display: flex;
      gap: var(--sp-2);
      min-width: 0;
      overflow: hidden;
      color: var(--text-muted);
    }

    .pv-meta > span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .pv-meta > span:empty { display: none; }
    .pv-meta > span::before { content: "\\00b7"; margin-right: var(--sp-2); }

    .pv-actions { display: flex; align-items: center; gap: var(--sp-2); margin-left: auto; flex-wrap: wrap; }

    .pv-seg {
      display: inline-flex;
      gap: 2px;
      padding: 2px;
      border-radius: var(--radius-sm);
      background: var(--surface-1);
      border: 1px solid var(--border);
    }

    .pv-seg button {
      all: unset;
      box-sizing: border-box;
      display: inline-flex;
      align-items: center;
      height: 22px;
      padding: 0 9px;
      border-radius: 5px;
      color: var(--text-muted);
      font-size: var(--fs-sm);
      font-weight: 500;
      cursor: pointer;
      white-space: nowrap;
    }

    .pv-seg button:hover { color: var(--text); }

    .pv-seg button[aria-pressed="true"] {
      background: var(--seg-active);
      color: var(--seg-active-text);
      font-weight: 600;
    }

    .pv-seg button:focus-visible {
      outline: 2px solid var(--accent-border);
      outline-offset: 1px;
    }

    .pv-seg button:disabled { opacity: 0.45; cursor: default; }

    .pv-toggle {
      all: unset;
      box-sizing: border-box;
      display: inline-flex;
      align-items: center;
      height: 28px;
      padding: 0 10px;
      border-radius: 999px;
      border: 1px solid var(--border);
      background: var(--surface-1);
      color: var(--text-2);
      font-size: var(--fs-sm);
      font-weight: 600;
      cursor: pointer;
    }

    .pv-toggle:hover { border-color: var(--border-strong); color: var(--text); }

    .pv-toggle.is-on {
      background: var(--accent-tint);
      border-color: var(--accent-border);
      color: var(--accent-tint-text);
    }

    .pv-toggle:focus-visible { outline: 2px solid var(--accent-border); outline-offset: 2px; }

    #preview-root { min-height: calc(100vh - 45px); }
    #preview-root > .tvd { min-height: calc(100vh - 45px); }

    /* Until the first model has established every role, no colour may animate. */
    .tvp:not(.tvp-ready) :where(*) {
      transition: none !important;
    }

    #banner {
      display: flex;
      align-items: center;
      min-height: 36px;
      padding: var(--sp-2) var(--sp-4);
      font-size: var(--fs-sm);
      color: var(--text);
      background: var(--bad-bg);
      border-top: 1px solid var(--border);
      box-shadow: inset 2px 0 0 var(--bad);
    }

    #banner[data-stale="true"] { background: var(--warn-bg); box-shadow: inset 2px 0 0 var(--warn); }
    #banner[hidden] { display: none; }

    @media (max-width: 760px) {
      .pv-meta { display: none; }
    }

    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after { transition: none !important; animation: none !important; }
    }
${PREVIEW_SURFACE_CSS}
${DASHBOARD_SURFACE_CSS}`;

/** The surface before the first model arrives; the script fills it in. */
const COMPONENTS_PLACEHOLDER = previewSurfaceMarkup(
  {
    themeName: TITLE,
    family: "",
    contrast: "",
    mode: "",
    modeLabel: "",
    source: "",
    roles: CORE_COLORS.map((role) => ({ role, value: "—" })),
  },
  { ids: true },
);

const DASHBOARD_PLACEHOLDER = dashboardMarkup({ idPrefix: "dash", ids: true });

/**
 * Render the panel's HTML.
 *
 * @param nonce - The CSP nonce, reused for the style and script tags.
 * @returns A complete HTML document.
 */
/**
 * The bundled faces and the origin allowed to serve them.
 *
 * `--font-ui` names Inter and `--font-mono` names JetBrains Mono. The Studio
 * bundles both, so a panel that does not load them falls back to the workbench
 * font and the two surfaces disagree about the typeface — the same theme,
 * rendered in Segoe UI in one window and Inter in the other.
 */
export interface PreviewAssets {
  /** The webview URI of the Inter variable face. */
  readonly inter: string;
  /** The webview URI of the JetBrains Mono variable face. */
  readonly mono: string;
  /** `webview.cspSource`, so `font-src` allows exactly the webview origin. */
  readonly cspSource: string;
}

/**
 * Build the panel document.
 *
 * @param nonce - The per-load nonce for the inline style and script.
 * @param assets - The bundled faces and the webview origin.
 * @returns The document.
 */
export function previewHtml(nonce: string, assets: PreviewAssets): string {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta
      http-equiv="Content-Security-Policy"
      content="default-src 'none'; style-src 'nonce-${nonce}'; script-src 'nonce-${nonce}'; font-src ${assets.cspSource};"
    />
    <title>${TITLE}</title>
    <style nonce="${nonce}">html, body { background: var(--vscode-editor-background, #1f1f1f); }</style>
    <style nonce="${nonce}">${fontFaceCss(assets.inter, assets.mono)}${STYLES}</style>
  </head>
  <body>
    <header class="pv-chrome">
      <div class="pv-strip">
        <span class="pv-title">${TITLE}</span>
        <span class="pv-meta"><span id="chrome-name"></span><span id="chrome-source"></span></span>
        <div class="pv-actions">
          <div class="pv-seg" role="group" aria-label="Preview view">
            <button type="button" id="view-dashboard" aria-pressed="true">Dashboard</button>
            <button type="button" id="view-components" aria-pressed="false">Components</button>
          </div>
          <button type="button" id="inspect-toggle" class="pv-toggle" aria-pressed="false" title="Hover the preview to inspect the tokens each element paints">Inspect</button>
          <div class="pv-seg" role="group" aria-label="Preview mode">
            <button type="button" id="mode-light" aria-pressed="true">Light</button>
            <button type="button" id="mode-dark" aria-pressed="false">Dark</button>
          </div>
        </div>
      </div>
      <div id="banner" role="status" hidden></div>
    </header>

    <div class="tvp" id="preview-root" data-mode="light">
      ${DASHBOARD_PLACEHOLDER}
      <div id="surface-components" hidden>${COMPONENTS_PLACEHOLDER}</div>
    </div>

    <script nonce="${nonce}">${WEBVIEW_SCRIPT}</script>
  </body>
</html>`;
}

/** A live preview panel. */
export interface PreviewPanelHandle {
  /** `true` once the panel has been closed. */
  readonly disposed: boolean;
  /** Send a message to the webview. */
  post(message: HostToWebview): void;
  /** Bring the panel to the front. */
  reveal(): void;
  /** Close the panel. */
  dispose(): void;
}

/** What {@link createPreviewPanel} needs. */
export interface PreviewPanelOptions {
  /** Called for every valid message from the webview. */
  readonly onMessage: (message: WebviewToHost) => void;
  /** Called once, when the user closes the panel. */
  readonly onDispose: () => void;
  /** Where to report an ignored message. */
  readonly log: (line: string) => void;
  /**
   * The extension's root, for the panel's tab icon.
   *
   * A webview tab takes its icon from `panel.iconPath` rather than from the file
   * icon theme, so this is the one tab in the editor that can carry the Themvora
   * mark regardless of which icon theme the user runs.
   */
  readonly extensionUri: Uri;
}

/**
 * Create the panel.
 *
 * @param options - The message and disposal callbacks.
 * @returns A handle for posting and disposing.
 */
export function createPreviewPanel(options: PreviewPanelOptions): PreviewPanelHandle {
  const nonce = createNonce();

  const panel: WebviewPanel = window.createWebviewPanel(VIEW_TYPE, TITLE, ViewColumn.Active, {
    enableScripts: true,
    // Kept alive while another tab is in front. Re-creating it on every reveal
    // meant a fresh document that painted its default background for a frame
    // before the model arrived — the dark flash when switching between the
    // Studio and the preview. The host can still rebuild state at any time, so
    // retaining costs memory (one static document) and nothing else.
    retainContextWhenHidden: true,
    // The bundled faces are the only files this webview may load. The allow-list
    // names their directory rather than `dist`, so a stylesheet or script cannot
    // be pulled in by a later edit without changing this line on purpose.
    localResourceRoots: [Uri.joinPath(options.extensionUri, "dist", "webview", "fonts")],
  });

  // The brand mark, one file for both themes: the logo is indigo with varying
  // opacity, which reads on a light editor and a dark one alike. A light/dark
  // pair would mean inventing a second colour that is not in the brand.
  panel.iconPath = Uri.joinPath(options.extensionUri, "media", "themvora.svg");

  panel.webview.html = previewHtml(nonce, {
    inter: panel.webview
      .asWebviewUri(Uri.joinPath(options.extensionUri, "dist", "webview", "fonts", "inter-var-latin.woff2"))
      .toString(),
    mono: panel.webview
      .asWebviewUri(
        Uri.joinPath(options.extensionUri, "dist", "webview", "fonts", "jetbrains-mono-var-latin.woff2"),
      )
      .toString(),
    cspSource: panel.webview.cspSource,
  });

  const subscriptions: Disposable[] = [];

  subscriptions.push(
    panel.webview.onDidReceiveMessage((raw: unknown) => {
      const message = parseWebviewMessage(raw);
      if (message === null) {
        options.log("Ignored an unrecognised message from the preview webview.");
        return;
      }
      options.onMessage(message);
    }),
  );

  let disposed = false;

  subscriptions.push(
    panel.onDidDispose(() => {
      disposed = true;
      for (const subscription of subscriptions) subscription.dispose();
      options.onDispose();
    }),
  );

  return {
    get disposed(): boolean {
      return disposed;
    },

    post(message: HostToWebview): void {
      if (disposed) return;
      // A false result means the webview was not listening yet; the next `ready`
      // re-sends whatever the host holds, so there is nothing to retry here.
      void panel.webview.postMessage(message);
    },

    reveal(): void {
      if (disposed) return;
      panel.reveal(ViewColumn.Active, true);
    },

    dispose(): void {
      if (disposed) return;
      panel.dispose();
    },
  };
}
