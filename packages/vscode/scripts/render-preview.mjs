#!/usr/bin/env node
/**
 * Renders the Theme Preview panel in a real browser engine.
 *
 * The extension host cannot read a webview's DOM, so the automated suite can only
 * prove that a panel opens. This harness closes that gap without adding a
 * dependency: it loads the *built* bundle with a stub `vscode`, asks it for the
 * exact HTML the panel would set, feeds that HTML a real preview message, and
 * screenshots the result in Chromium — the same engine VS Code's webviews use.
 *
 * It is a verification tool, not part of the extension. `scripts/**` is excluded
 * from the .vsix.
 *
 * Usage:
 *   node scripts/render-preview.mjs [--out <dir>]
 *
 * Requires a Chromium-based browser; set `THEMVORA_BROWSER` to override the path.
 */
import { spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const bundle = join(packageRoot, "dist", "index.js");
const core = join(packageRoot, "..", "core", "dist", "index.js");

/** Where the screenshots go. */
const outDir = (() => {
  const index = process.argv.indexOf("--out");
  return index === -1 ? join(tmpdir(), "themvora-preview") : resolve(process.argv[index + 1]);
})();

/** A Chromium-based browser. */
const browser = (() => {
  const candidates = [
    process.env.THEMVORA_BROWSER,
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  ].filter((candidate) => typeof candidate === "string");
  return candidates.find((candidate) => {
    try {
      return spawnSync(candidate, ["--version"], { encoding: "utf8" }).status === 0;
    } catch {
      return false;
    }
  });
})();

if (browser === undefined) {
  console.error("No Chromium-based browser found. Set THEMVORA_BROWSER to one.");
  process.exit(1);
}

/**
 * Load the built bundle with a `vscode` stub.
 *
 * The bundle destructures `vscode` at import time but calls nothing until
 * `activate()`, so a stub of plain values is enough to reach `previewHtml()` and
 * `buildPreviewModel()`.
 *
 * @returns The bundle's exports.
 */
async function loadBundle() {
  const sandbox = mkdtempSync(join(tmpdir(), "themvora-render-"));
  const moduleDir = join(sandbox, "node_modules", "vscode");
  mkdirSync(moduleDir, { recursive: true });

  writeFileSync(
    join(moduleDir, "package.json"),
    JSON.stringify({ name: "vscode", version: "0.0.0", type: "module", main: "index.js" }),
  );
  writeFileSync(
    join(moduleDir, "index.js"),
    `export const env = { clipboard: { writeText: async () => {} } };
export const commands = { registerCommand: () => ({ dispose() {} }) };
export const window = { createWebviewPanel: () => { throw new Error("no host"); } };
export const workspace = {};
export const Uri = { file: (p) => ({ fsPath: p, path: p }), joinPath: (b, ...s) => ({ fsPath: b.fsPath, path: b.path }) };
export const ViewColumn = { Active: -1 };
export const StatusBarAlignment = { Left: 1, Right: 2 };
export class ThemeColor { constructor(id) { this.id = id; } }
export class EventEmitter { constructor() { this.event = () => ({ dispose() {} }); } fire() {} dispose() {} }
export class TreeItem { constructor(label, state) { this.label = label; this.collapsibleState = state; } }
export const TreeItemCollapsibleState = { None: 0, Collapsed: 1, Expanded: 2 };
export class ThemeIcon { constructor(id) { this.id = id; } }
export const FileType = { Unknown: 0, File: 1, Directory: 2, SymbolicLink: 64 };
export const languages = {};
export class Disposable { constructor(fn) { this.dispose = fn; } }
export class Diagnostic {}
export const DiagnosticSeverity = { Error: 0, Warning: 1, Information: 2, Hint: 3 };
export class Range {}
export class Position {}
export class Hover {}
export class TextEdit {}
export class Color {}
export class MarkdownString {}
`,
  );

  const entry = join(sandbox, "entry.mjs");
  copyFileSync(bundle, entry);
  return import(pathToFileURL(entry).href);
}

/**
 * Build a harness document: the panel's own HTML, plus a stub bridge and a
 * driver that delivers messages to the panel script.
 *
 * @param html - The panel HTML.
 * @param nonce - Its nonce.
 * @param messages - Messages to deliver, in order.
 * @returns The harness HTML.
 */
function withDriver(html, nonce, messages) {
  const prelude = `<script nonce="${nonce}">window.acquireVsCodeApi = function () { return { postMessage: function () {} }; };</script>`;
  const driver = `<script nonce="${nonce}">${messages
    .map(
      (message) =>
        `window.dispatchEvent(new MessageEvent("message", { data: ${JSON.stringify(message)} }));`,
    )
    .join("")}</script>`;
  // Report whether the bundled faces actually loaded, so a run can prove the
  // panel paints the same typeface as the Studio instead of falling back.
  const probe = `<script nonce="${nonce}">document.fonts.ready.then(function () {
    var h1 = document.querySelector(".tvd-h1");
    var cs = h1 ? getComputedStyle(h1) : null;
    document.title = "FONT:inter=" + document.fonts.check("13px Inter") +
      ",mono=" + document.fonts.check("11.5px 'JetBrains Mono'") +
      ",w=" + (h1 ? h1.getBoundingClientRect().width.toFixed(2) : "none") +
      ",fs=" + (cs ? cs.fontSize : "none") +
      ",ff=" + (cs ? cs.fontFamily.split(",")[0] : "none") +
      ",x=" + (h1 ? Math.round(h1.getBoundingClientRect().left) : "none") +
      ",y=" + (h1 ? Math.round(h1.getBoundingClientRect().top) : "none");
  });</script>`;

  // The prelude must run before the panel script; the driver after it.
  return html
    .replace(`<script nonce="${nonce}">`, `${prelude}<script nonce="${nonce}">`)
    .replace("</body>", `${driver}${probe}</body>`);
}

const bundleExports = await loadBundle();
const { previewHtml, buildPreviewModel } = bundleExports;
const { generateTheme } = await import(pathToFileURL(core).href);

const pair = generateTheme({ seed: "#4f46e5" });
const themes = [pair.light, pair.dark];

/**
 * Build a model or fail loudly.
 *
 * @param mode - The mode to render.
 * @returns The model.
 */
function model(mode) {
  const result = buildPreviewModel({ themes, mode, source: "themvora-theme.json" });
  if (!result.ok) throw new Error(result.message);
  return result.model;
}

const scenarios = [
  {
    name: "light",
    messages: [{ type: "preview", revision: 1, model: model("light") }],
  },
  {
    name: "dark",
    messages: [{ type: "preview", revision: 1, model: model("dark") }],
  },
  {
    name: "stale",
    messages: [
      { type: "preview", revision: 1, model: model("light") },
      {
        type: "error",
        revision: 2,
        message: "themvora-theme.json is not valid JSON.",
        stale: true,
      },
    ],
  },
];

mkdirSync(outDir, { recursive: true });

const nonce = "host-pass-nonce";
const written = [];

// The panel loads the bundled faces through webview URIs; on disk they are the
// same two files, so the harness points the CSP at `file:` and lets the browser
// read them directly.
const fontsDir = join(packageRoot, "dist", "webview", "fonts");
const assets = {
  inter: pathToFileURL(join(fontsDir, "inter-var-latin.woff2")).href,
  mono: pathToFileURL(join(fontsDir, "jetbrains-mono-var-latin.woff2")).href,
  cspSource: "file:",
};

for (const scenario of scenarios) {
  const html = withDriver(previewHtml(nonce, assets), nonce, scenario.messages);
  const htmlPath = join(outDir, `${scenario.name}.html`);
  const pngPath = join(outDir, `${scenario.name}.png`);
  writeFileSync(htmlPath, html);

  const shot = spawnSync(
    browser,
    [
      "--headless=new",
      "--disable-gpu",
      "--hide-scrollbars",
      "--force-device-scale-factor=1",
      // Let entrance animations settle, or the screenshot catches the dashboard
      // mid-fade and looks like it failed to render.
      "--virtual-time-budget=3000",
      "--window-size=900,1500",
      `--screenshot=${pngPath}`,
      pathToFileURL(htmlPath).href,
    ],
    { encoding: "utf8", timeout: 60_000 },
  );

  if (shot.status !== 0) {
    console.error(`\nRendering ${scenario.name} failed (exit ${shot.status}).`);
    console.error((shot.stderr ?? "").trim().split("\n").slice(-5).join("\n"));
    process.exit(1);
  }

  written.push(pngPath);
}

console.log(`Browser: ${browser}`);
for (const path of written) console.log(`  ${path}`);
