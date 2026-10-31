/**
 * The browser bundle for the Theme Studio.
 *
 * Separate from the extension-host bundle on purpose. The host bundle may only
 * import `vscode` (enforced by `test/bundle.test.ts`); React and React DOM are
 * bundled *here*, into assets the webview loads from the VSIX. Keeping the two
 * builds apart is what lets the gate stay strict while the UI uses a framework.
 *
 * @packageDocumentation
 */
import { build, transform } from "esbuild";
import { readFileSync, rmSync, writeFileSync } from "node:fs";

/** Where the browser assets land, relative to the package. */
const OUT_DIR = "dist/webview";

rmSync(OUT_DIR, { recursive: true, force: true });

const result = await build({
  entryPoints: ["webview/studio.tsx"],
  outdir: OUT_DIR,
  bundle: true,
  format: "iife",
  platform: "browser",
  target: ["chrome120"],
  jsx: "automatic",
  minify: true,
  sourcemap: false,
  // React is bundled in: a webview cannot fetch a CDN, and the CSP forbids one.
  loader: { ".css": "css", ".woff2": "file" },
  // Stable names: the sidebar resolves the same font files by path.
  assetNames: "fonts/[name]",
  logLevel: "warning",
  metafile: true,
});

/**
 * Load a TypeScript module that exports CSS strings.
 *
 * @param entry - The module path.
 * @returns The module namespace.
 */
async function cssModule(entry) {
  const bundled = await build({
    entryPoints: [entry],
    bundle: true,
    format: "esm",
    platform: "neutral",
    write: false,
    logLevel: "warning",
  });
  return import(`data:text/javascript;base64,${Buffer.from(bundled.outputFiles[0].text).toString("base64")}`);
}

async function minifyCss(css) {
  return (await transform(css, { loader: "css", minify: true })).code;
}

// The shared design tokens go first, so the Studio and the sidebar read the very
// same values; the Theme Preview panel's stylesheet goes last, so the embedded
// surface is styled by the rules the panel inlines and wins over Studio globals.
const { DESIGN_TOKENS_CSS } = await cssModule("src/shared/designTokens.ts");
const { PREVIEW_SURFACE_CSS } = await cssModule("src/shared/previewSurface.ts");
const { DASHBOARD_SURFACE_CSS } = await cssModule("src/shared/dashboardSurface.ts");
const studioCss = readFileSync(`${OUT_DIR}/studio.css`, "utf8");
writeFileSync(
  `${OUT_DIR}/studio.css`,
  `/* design tokens */
${await minifyCss(DESIGN_TOKENS_CSS)}
${studioCss}
/* preview surface */
${await minifyCss(PREVIEW_SURFACE_CSS)}
/* dashboard surface */
${await minifyCss(DASHBOARD_SURFACE_CSS)}`,
);

const outputs = Object.keys(result.metafile?.outputs ?? {});
console.log(`webview: ${outputs.length} asset(s)`);
for (const output of outputs) console.log(`  ${output}`);
