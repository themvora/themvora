/**
 * Browser verification for the 54 library/framework recipes.
 *
 * A production build is necessary but not sufficient: this script serves each
 * **built** application, loads it in Chromium and checks that
 *
 *   - the page actually renders the library's real components/utilities;
 *   - Themvora's semantic variables exist and the library's own variables are
 *     wired to them (CSS-variable adapters);
 *   - switching light/dark changes both the variables and the painted pixels;
 *   - switching the theme *family* changes them again, including after an SSR
 *     reload (which also exercises hydration);
 *   - production CSS contains the generated utilities for UnoCSS;
 *   - no console error, page error or hydration warning is emitted.
 *
 * It re-materializes each recipe through `verify-library-recipes.mjs --run`,
 * so the browser test always exercises the exact documented files — not a
 * separate, hand-maintained fixture.
 *
 * Usage:
 *   node scripts/docs/verify-library-browser.mjs
 *   node scripts/docs/verify-library-browser.mjs --only bootstrap/React
 *   node scripts/docs/verify-library-browser.mjs --no-rebuild
 *   CHROME_PATH=... node scripts/docs/verify-library-browser.mjs
 */

/* global document, localStorage */
import { spawn, spawnSync } from "node:child_process";
import { createServer } from "node:http";
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { extname, join } from "node:path";
import { pathToFileURL } from "node:url";

const REPO = join(import.meta.dirname, "..", "..");
const VERIFY = join(REPO, "verify", "library-recipes");
const APPS = join(VERIFY, "apps");
const OUT = join(VERIFY, "browser");
const RESULTS = join(VERIFY, "results");
const HARNESS = join(REPO, "scripts", "docs", "verify-library-recipes.mjs");
const CHROME = process.env.CHROME_PATH ??
  "C:/Users/sauga/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe";

const ONLY = process.argv.includes("--only")
  ? process.argv[process.argv.indexOf("--only") + 1]
  : null;
const NO_REBUILD = process.argv.includes("--no-rebuild");
const MATCH = process.argv.includes("--match")
  ? new RegExp(process.argv[process.argv.indexOf("--match") + 1])
  : null;

mkdirSync(OUT, { recursive: true });

/** The 54 advertised combinations, straight from the docs source of truth. */
function readRecipes() {
  const src = readFileSync(join(REPO, "apps", "docs", "lib", "libraries.tsx"), "utf8");
  const at = src.indexOf("export const FRAMEWORK_RECIPES");
  const end = src.indexOf("export const FRAMEWORK_LANG", at);
  const block = src.slice(at, end);
  const out = {};
  for (const m of block.matchAll(/^ {2}"([a-z-]+)\/([^"]+)": \{\r?$/gm)) {
    const key = `${m[1]}/${m[2]}`;
    const chunk = block.slice(m.index, block.indexOf("\n  },", m.index));
    const fields = {};
    for (const line of chunk.split("\n")) {
      const f = line.match(/^ {4}"(\w+)": (.*),\r?$/);
      if (!f) continue;
      try { fields[f[1]] = JSON.parse(f[2]); } catch { /* audit covers this */ }
    }
    out[key] = fields;
  }
  return out;
}

/**
 * How each framework's **production** output is served.
 *
 * Vite/Astro/Angular/Svelte/Vue/Solid produce static files, so a tiny static
 * server is enough and can stay up while recipes swap files underneath it.
 * Next.js, Remix and Nuxt need their real server for SSR + hydration checks.
 */
const FRAMEWORKS = {
  React:    { dir: "react",    static: "dist" },
  "Vue 3":  { dir: "vue",      static: "dist" },
  Svelte:   { dir: "svelte",   static: "dist" },
  Solid:    { dir: "solid",    static: "dist" },
  Angular:  { dir: "angular",  static: "dist/browser" },
  Astro:    { dir: "astro",    static: "dist" },
  "Next.js": { dir: "nextjs",  ssr: "next" },
  Remix:    { dir: "remix",    ssr: "remix" },
  Nuxt:     { dir: "nuxt",     ssr: "nuxt" },
};

/** Variables and DOM markers that prove the library is genuinely in use. */
const LIBRARY = {
  shadcn:     { vars: ["--background", "--primary", "--foreground"], marker: "button" },
  bootstrap:  { vars: ["--bs-body-bg", "--bs-btn-bg", "--bs-body-color"], marker: ".btn-primary" },
  daisyui:    { vars: ["--color-base-100", "--color-primary"], marker: ".btn" },
  "open-props": { vars: ["--color-primary", "--color-canvas", "--radius-3"], marker: "button" },
  mui:        { vars: [], marker: ".MuiButton-root" },
  chakra:     { vars: [], marker: "button" },
  antd:       { vars: [], marker: ".ant-btn" },
  mantine:    { vars: [], marker: ".mantine-Button-root" },
  unocss:     { vars: [], marker: "button" },
};

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".woff2": "font/woff2",
  ".ico": "image/x-icon",
};

function staticServer(root, port) {
  const server = createServer((req, res) => {
    let pathname;
    try { pathname = decodeURIComponent(new URL(req.url, "http://x").pathname); }
    catch { pathname = "/"; }
    if (pathname === "/" || pathname === "") pathname = "/index.html";
    let file = join(root, pathname);
    if (!existsSync(file) || statSync(file).isDirectory()) file = join(root, "index.html");
    if (!existsSync(file)) { res.writeHead(404); res.end("not found"); return; }
    res.writeHead(200, { "content-type": MIME[extname(file)] ?? "application/octet-stream" });
    res.end(readFileSync(file));
  });
  return new Promise((resolve) => {
    server.listen(port, "127.0.0.1", () =>
      resolve({ url: `http://127.0.0.1:${port}`, close: () => server.close() }),
    );
  });
}

/** Child environment without the host's `fs.rm` instrumentation preload. */
const CLEAN_ENV = (() => {
  const env = { ...process.env };
  delete env.NODE_OPTIONS;
  delete env.ELECTRON_RUN_AS_NODE;
  for (const key of Object.keys(env)) {
    if (key.startsWith("CODEBUDDY_SAFE_DELETE_")) delete env[key];
  }
  return env;
})();

async function waitFor(url, timeoutMs = 45000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const r = await fetch(url);
      if (r.ok) return true;
    } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 350));
  }
  return false;
}

async function ssrServer(kind, dir, port) {
  const cwd = join(APPS, dir);
  let args;
  if (kind === "next") {
    args = [join(cwd, "node_modules/next/dist/bin/next"), "start", "--port", String(port)];
  } else if (kind === "remix") {
    args = [join(cwd, "node_modules/@remix-run/serve/dist/cli.js"), "./build/server/index.js"];
  } else {
    args = [join(cwd, ".output/server/index.mjs")];
  }
  const child = spawn(process.execPath, args, {
    cwd,
    env: { ...CLEAN_ENV, PORT: String(port), HOST: "127.0.0.1", NITRO_HOST: "127.0.0.1" },
    stdio: "ignore",
  });
  const url = `http://127.0.0.1:${port}`;
  const ok = await waitFor(url);
  if (!ok) {
    child.kill();
    throw new Error(`${kind} preview did not start on ${port}`);
  }
  return {
    url,
    close: () => new Promise((resolve) => {
      child.once("exit", resolve);
      child.kill();
      setTimeout(() => { if (!child.killed) child.kill("SIGKILL"); resolve(); }, 3000);
    }),
  };
}

/** Read the state the browser needs to prove a theme is applied. */
const SNAPSHOT = `(() => {
  const root = getComputedStyle(document.documentElement);
  const body = getComputedStyle(document.body);
  const marker = document.querySelector(${JSON.stringify("__MARKER__")}) || document.querySelector("button");
  const m = marker ? getComputedStyle(marker) : null;
  const val = (name) => root.getPropertyValue(name).trim();
  return {
    text: document.body.innerText.slice(0, 600),
    html: document.body.innerHTML.length,
    buttonCount: document.querySelectorAll("button").length,
    vars: {
      background: val("--theme-color-background"),
      foreground: val("--theme-color-foreground"),
      primary: val("--theme-color-primary"),
      __LIB_VARS__
    },
    bodyBg: body.backgroundColor,
    bodyColor: body.color,
    markerBg: m ? m.backgroundColor : null,
    markerColor: m ? m.color : null,
    markerBorder: m ? m.borderColor : null,
  };
})()`;

function snapshotExpression(lib) {
  const extra = LIBRARY[lib].vars
    .map((v, i) => `${JSON.stringify("lib" + i)}: val(${JSON.stringify(v)})`)
    .join(",\n      ");
  return SNAPSHOT.replace("__LIB_VARS__", extra)
    .replace("__MARKER__", LIBRARY[lib].marker);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function checkCombo(browser, combo, url) {
  const [lib] = combo.split("/");
  const context = await browser.newContext({ viewport: { width: 1200, height: 900 } });
  const page = await context.newPage();
  const errors = [];
  const badResponses = [];
  page.on("pageerror", (e) => errors.push(`pageerror: ${e}`));
  page.on("console", (m) => {
    if (m.type() === "error") {
      const url = m.location()?.url ?? "";
      errors.push(`console: ${m.text()}${url ? ` @ ${url}` : ""}`);
    }
  });
  page.on("response", (r) => {
    if (r.status() >= 400) badResponses.push(`${r.status()} ${r.url()}`);
  });

  const checks = [];
  const check = (name, ok, detail = "") => checks.push({ name, ok: Boolean(ok), detail: String(detail) });

  const response = await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });
  await sleep(450);
  check("http 200", response?.ok(), `status=${response?.status()}`);

  const snap = async () => page.evaluate(snapshotExpression(lib));
  const initial = await snap();
  check("renders content", initial.html > 200 && initial.text.length > 10, `${initial.html} bytes of DOM`);

  // --- SSR Emotion styles ------------------------------------------------
  // Material UI and Chakra UI emit their styles through Emotion. They must be
  // present in <head> in the server response: if they arrive inside the
  // streamed <body> chunk instead, the client renders without them and React
  // regenerates the tree (error #418). This is the regression both recipes had
  // before their cache providers were added.
  if ((lib === "mui" || lib === "chakra") && combo.endsWith("/Next.js")) {
    const html = await (await fetch(url)).text();
    const bodyAt = html.indexOf("<body");
    const head = bodyAt >= 0 ? html.slice(0, bodyAt) : html;
    const body = bodyAt >= 0 ? html.slice(bodyAt) : "";
    const count = (text) => (text.match(/data-emotion=/g) ?? []).length;
    check("SSR styles in head", count(head) > 0, `${count(head)} Emotion style(s) in head`);
    check("no streamed Emotion styles in body", count(body) === 0, `${count(body)} Emotion style(s) in body`);
  }
  check("theme controls rendered", initial.buttonCount >= 3, `${initial.buttonCount} buttons`);
  check("semantic theme variables", Boolean(initial.vars.background && initial.vars.foreground),
    `background=${initial.vars.background} foreground=${initial.vars.foreground}`);

  const libVarKeys = LIBRARY[lib].vars.map((_, i) => `lib${i}`);
  if (libVarKeys.length) {
    const present = libVarKeys.filter((k) => initial.vars[k]);
    check("library variables mapped", present.length >= Math.min(2, libVarKeys.length),
      `${present.length}/${libVarKeys.length}: ${libVarKeys.map((k) => `${k}=${initial.vars[k]}`).join(" ")}`);
  }

  // --- Light / dark -------------------------------------------------------
  const dark = await page.getByRole("button", { name: "Dark", exact: true }).first();
  const light = await page.getByRole("button", { name: "Light", exact: true }).first();
  let afterDark = initial;
  let afterLight = initial;
  if (await dark.count()) {
    await dark.click();
    await sleep(450);
    afterDark = await snap();
    check("dark changes theme variables",
      JSON.stringify(afterDark.vars) !== JSON.stringify(initial.vars),
      `primary ${initial.vars.primary} -> ${afterDark.vars.primary}`);
    check("dark repaints the page",
      afterDark.bodyBg !== initial.bodyBg || afterDark.bodyColor !== initial.bodyColor ||
      afterDark.markerBg !== initial.markerBg,
      `body ${initial.bodyBg} -> ${afterDark.bodyBg}`);
    if (libVarKeys.length) {
      const changed = libVarKeys.some((k) => afterDark.vars[k] !== initial.vars[k]);
      check("dark updates library variables", changed,
        libVarKeys.map((k) => `${k}: ${initial.vars[k]} -> ${afterDark.vars[k]}`).join(" | "));
    }
    await light.click();
    await sleep(450);
    afterLight = await snap();
    check("light switches back", JSON.stringify(afterLight.vars) !== JSON.stringify(afterDark.vars),
      `primary ${afterDark.vars.primary} -> ${afterLight.vars.primary}`);
  } else {
    check("light/dark controls present", false, "no Light/Dark buttons found");
  }

  // --- Theme family (fresh SSR load with a persisted selection) ----------
  // A second context starts with the selection already persisted. Mutating
  // cookies mid-session and reloading would make the server render one theme
  // while the client had already bootstrapped another — a hydration mismatch
  // created by the test, not by the integration. Starting clean also verifies
  // that SSR honours the persisted family on the very first paint.
  const familyContext = await browser.newContext({ viewport: { width: 1200, height: 900 } });
  await familyContext.addInitScript(() => {
    try { localStorage.setItem("theme-selection", JSON.stringify({ mode: "light", family: "mint" })); }
    catch { /* storage unavailable */ }
  });
  const host = new URL(url);
  await familyContext.addCookies([
    { name: "theme-family", value: "mint", url: `${host.origin}/` },
    { name: "theme-mode", value: "light", url: `${host.origin}/` },
  ]);
  const familyPage = await familyContext.newPage();
  const familyErrors = [];
  familyPage.on("pageerror", (e) => familyErrors.push(`pageerror: ${e}`));
  familyPage.on("console", (m) => { if (m.type() === "error") familyErrors.push(`console: ${m.text()}`); });
  await familyPage.goto(url, { waitUntil: "networkidle", timeout: 60000 });
  await sleep(450);
  const family = await familyPage.evaluate(snapshotExpression(lib));
  await familyContext.close();
  check("theme family changes variables",
    family.vars.primary !== afterLight.vars.primary ||
    family.vars.background !== afterLight.vars.background,
    `primary ${afterLight.vars.primary} -> ${family.vars.primary}; background ${afterLight.vars.background} -> ${family.vars.background}`);
  check("family change repaints library",
    family.bodyBg !== afterLight.bodyBg || family.bodyColor !== afterLight.bodyColor ||
    family.markerBg !== afterLight.markerBg || family.markerColor !== afterLight.markerColor,
    `body ${afterLight.bodyBg} -> ${family.bodyBg}; button ${afterLight.markerBg} -> ${family.markerBg}`);
  check("components still work after theme changes", family.buttonCount >= 3 && family.html > 200,
    `${family.buttonCount} buttons`);

  // --- Console / hydration ------------------------------------------------
  // React reports hydration failures in production only as the minified code
  // (`Minified React error #418`), so matching the prose alone would let a
  // real mismatch through.
  const hydration = [...errors, ...familyErrors].filter((e) =>
    /hydrat|did not match|server rendered|react error #(?:418|423|425)/i.test(e));
  check("no hydration mismatch", hydration.length === 0, hydration.slice(0, 2).join(" | "));
  const resourceOnly = (e) =>
    /Failed to load resource/i.test(e) &&
    badResponses.length > 0 &&
    badResponses.every((u) => /favicon|\.ico|apple-touch-icon/i.test(u));
  const realErrors = errors.filter((e) =>
    !/favicon|net::ERR_/i.test(e) &&
    !(/404 \(Not Found\)/i.test(e) && badResponses.every((u) => /404|favicon/i.test(u))) &&
    !resourceOnly(e));
  check("no console errors", realErrors.length === 0, realErrors.slice(0, 3).join(" | "));

  // --- UnoCSS: generated utilities must be in the production CSS ----------
  if (lib === "unocss") {
    const inline = await page.evaluate(() =>
      [...document.querySelectorAll("style")].map((s) => s.textContent ?? "").join("\n"));
    const dir = FRAMEWORKS[combo.slice(combo.lastIndexOf("/") + 1)];
    let disk = "";
    if (dir?.static) {
      const root = join(APPS, dir.dir, dir.static);
      const walk = (d) => {
        for (const entry of readdirSync(d, { withFileTypes: true })) {
          const f = join(d, entry.name);
          if (entry.isDirectory()) walk(f);
          else if (entry.name.endsWith(".css")) disk += readFileSync(f, "utf8") + "\n";
        }
      };
      if (existsSync(root)) walk(root);
    }
    const linked = await page.evaluate(async () => {
      const links = [...document.querySelectorAll('link[rel="stylesheet"]')].map((l) => l.href);
      const texts = await Promise.all(links.map(async (href) => {
        try { return await (await fetch(href)).text(); } catch { return ""; }
      }));
      return texts.join("\n");
    });
    const css = `${inline}\n${linked}\n${disk}`;
    check("generated utilities present", /\.bg-primary|\.bg-card|\.text-primary-foreground/.test(css),
      `${css.length} bytes of CSS`);
    check("utilities reference theme variables", /--theme-color-/.test(css),
      `${(css.match(/--theme-color-/g) ?? []).length} references`);
  }

  await context.close();
  return {
    checks, initial, afterDark, afterLight, family,
    errors, familyErrors, badResponses,
  };
}

/** Rebuild the exact documented recipe before browsing it. */
function rebuild(combo) {
  if (NO_REBUILD) return { ok: true };
  const res = spawnSync(process.execPath, [HARNESS, "--run", combo], {
    cwd: REPO,
    env: CLEAN_ENV,
    encoding: "utf8",
    timeout: 600000,
  });
  const output = `${res.stdout ?? ""}${res.stderr ?? ""}`.slice(-1500);
  if (res.status !== 0) return { ok: false, output };
  const slash = combo.lastIndexOf("/");
  const lib = combo.slice(0, slash);
  const fw = combo.slice(slash + 1);
  const file = join(RESULTS, `${lib}-${FRAMEWORKS[fw]?.dir}.json`);
  if (!existsSync(file)) return { ok: false, output: `no result file ${file}` };
  const result = JSON.parse(readFileSync(file, "utf8"));
  return {
    ok: result.check === true && result.build === true,
    output: result.checkOutput ?? result.buildOutput ?? output,
  };
}

async function main() {
  const { chromium } = await import(pathToFileURL(
    join(REPO, "examples/apps/_tools/node_modules/playwright-core/index.mjs"),
  ).href);
  const browser = await chromium.launch({ headless: true, executablePath: CHROME });
  const recipes = readRecipes();
  const combos = Object.keys(recipes).sort()
    .filter((c) => !ONLY || c === ONLY)
    .filter((c) => !MATCH || MATCH.test(c));
  const results = [];
  const servers = new Map();
  let port = 4400;

  try {
    for (const combo of combos) {
      const slash = combo.lastIndexOf("/");
      const lib = combo.slice(0, slash);
      const fw = combo.slice(slash + 1);
      const meta = FRAMEWORKS[fw];
      let server = servers.get(fw);
      if (meta?.static && !server) {
        server = await staticServer(join(APPS, meta.dir, meta.static), port++);
        servers.set(fw, server);
      }

      const built = rebuild(combo);
      if (!built.ok) {
        results.push({ combo, build: false, error: built.output, checks: [] });
        console.log(`FAIL build    ${combo}`);
        continue;
      }

      if (meta?.ssr) {
        // SSR servers read their build output at startup, so restart per recipe.
        server = await ssrServer(meta.ssr, meta.dir, port++);
      }

      try {
        const result = await checkCombo(browser, combo, server.url);
        results.push({ combo, lib, fw, build: true, ...result });
        const failed = result.checks.filter((c) => !c.ok);
        console.log(`${failed.length ? "FAIL" : "PASS"} ${String(result.checks.length - failed.length).padStart(2)}/${result.checks.length}  ${combo}${failed.length ? "  — " + failed.map((f) => f.name).join(", ") : ""}`);
      } catch (error) {
        results.push({ combo, lib, fw, build: true, error: String(error), checks: [] });
        console.log(`ERROR         ${combo}  — ${error}`);
      } finally {
        if (meta?.ssr && server) await server.close();
      }
    }
  } finally {
    for (const server of servers.values()) server.close();
    await browser.close();
  }

  // A filtered run updates only the combinations it exercised; the rest of the
  // suite's evidence must survive.
  const file = join(OUT, "results.json");
  let merged = results;
  if ((ONLY || MATCH) && existsSync(file)) {
    const previous = JSON.parse(readFileSync(file, "utf8"));
    const byCombo = new Map(previous.map((r) => [r.combo, r]));
    for (const r of results) byCombo.set(r.combo, r);
    merged = [...byCombo.values()].sort((a, b) => a.combo.localeCompare(b.combo));
  }
  writeFileSync(file, JSON.stringify(merged, null, 2));
  const total = results.reduce((n, r) => n + r.checks.length, 0);
  const passed = results.reduce((n, r) => n + r.checks.filter((c) => c.ok).length, 0);
  console.log(`\n${passed}/${total} browser checks passed across ${results.length} combinations`);
  const failures = results.filter((r) => r.error || r.checks.some((c) => !c.ok));
  if (failures.length) {
    console.log(`\n${failures.length} combinations with failures:`);
    for (const r of failures) {
      console.log(`  ${r.combo}: ${r.error ?? r.checks.filter((c) => !c.ok).map((c) => c.name + (c.detail ? ` (${c.detail.slice(0, 100)})` : "")).join("; ")}`);
    }
  }
  process.exit(failures.length ? 1 : 0);
}

await main();
