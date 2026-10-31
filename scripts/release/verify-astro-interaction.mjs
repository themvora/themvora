#!/usr/bin/env node
/**
 * Interaction regression gate for the two Astro example apps.
 *
 * Guards the contracts a *click* depends on — the ones no static render and no
 * unit test can observe:
 *
 * | Contract | What must hold |
 * | -------- | -------------- |
 * | `[data-tv-select]` | Every instance works, however many the page rendered |
 * | `[data-tv-toggle]` | A click changes the theme, on every page |
 * | `[data-tv-readout]` | The text follows the live selection, before and after a navigation |
 * | `[data-tv-scope]` | A scoped subtree keeps its own theme while the page theme changes |
 * | island hydration | The React island hydrates, and shares one runtime with native controls |
 *
 * ## Why this file exists
 *
 * The reported bug was "selecting a theme does nothing until I save a file".
 * Saving a file is HMR, and HMR re-runs the page's `<script>` — which is exactly
 * the step that was missing in production. Astro bundles a page's `<script>` as
 * a module and module scripts never re-execute across `<ClientRouter />`
 * navigations, so returning to a page left its controls bound to the previous
 * visit's DOM, or to nothing at all. A `getElementById` binding also wires only
 * the first instance of a component rendered twice.
 *
 * Neither failure is visible in the server HTML: the markup is identical and
 * correct in both cases. They only exist after a click, on the second page, so
 * this gate drives a real browser through the sequence — load, select, toggle,
 * navigate, select again, navigate back, select again — and asserts the DOM
 * after each step.
 *
 * ## No SKIP path
 *
 * A missing build, a missing page, a missing browser, a server that will not
 * start and a failed assertion all exit non-zero with an actionable message. A
 * gate that passes without running is worse than one that fails.
 *
 * Usage:
 *   node scripts/release/verify-astro-interaction.mjs
 *   node scripts/release/verify-astro-interaction.mjs --skip-build
 *   node scripts/release/verify-astro-interaction.mjs --app astro-native
 *
 * Requires: headless Chromium (Playwright's, or `THEMVORA_CHROME`) and a
 * WebSocket client — `ws` when it is installed, otherwise the global one.
 */
import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { createServer } from "node:net";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import os from "node:os";

const repoRoot = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
const skipBuild = process.argv.includes("--skip-build");
const appFilter = (() => {
  const i = process.argv.indexOf("--app");
  return i === -1 ? null : process.argv[i + 1];
})();

class GateError extends Error {
  constructor(message, detail) {
    super(message);
    this.detail = detail;
  }
}

function fail(message, detail) {
  throw new GateError(message, detail);
}

// ---------------------------------------------------------------------------
// Process teardown. Registered as we go so a failure at any point still leaves
// no orphaned Chromium or preview server behind.
// ---------------------------------------------------------------------------
const teardown = [];

async function shutdown() {
  for (const fn of teardown.reverse()) {
    try {
      await fn();
    } catch {
      /* best effort */
    }
  }
}

function findChrome() {
  if (process.env.THEMVORA_CHROME && existsSync(process.env.THEMVORA_CHROME))
    return process.env.THEMVORA_CHROME;
  const pwRoot = process.env.LOCALAPPDATA
    ? join(process.env.LOCALAPPDATA, "ms-playwright")
    : join(os.homedir(), "AppData", "Local", "ms-playwright");
  if (!existsSync(pwRoot)) return null;
  for (const d of readdirSync(pwRoot).filter((x) => /^chromium(-\d+)?$/.test(x))) {
    const exe = join(pwRoot, d, "chrome-win64", "chrome.exe");
    if (existsSync(exe)) return exe;
  }
  return null;
}

function findWs() {
  // Resolve first, so the gate works under any install layout — the pnpm
  // virtual store, a hoisted tree, or a plain npm install. The `.pnpm` scan
  // below is only a fallback for a tree whose links are broken.
  try {
    return createRequire(import.meta.url).resolve("ws");
  } catch {
    // fall through
  }
  const pnpm = join(repoRoot, "node_modules", ".pnpm");
  if (!existsSync(pnpm)) return null;
  const dirs = readdirSync(pnpm).filter((d) => /^ws@\d+\.\d+\.\d+$/.test(d)).sort();
  for (const d of dirs.reverse()) {
    const p = join(pnpm, d, "node_modules", "ws", "package.json");
    if (existsSync(p)) return join(pnpm, d, "node_modules", "ws");
  }
  return null;
}

/** A port the OS says is free, so a stale server on a fixed port cannot fool us. */
function freePort() {
  return new Promise((resolve, reject) => {
    const probe = createServer();
    probe.on("error", reject);
    probe.listen(0, "127.0.0.1", () => {
      const { port } = probe.address();
      probe.close(() => resolve(port));
    });
  });
}

/** Reads a `"literal"` out of the built bootstrap script. */
function literal(source, re, label) {
  const m = source.match(re);
  if (!m) {
    fail(
      `could not read ${label} out of the built bootstrap script`,
      "The gate derives its expectations from the built script. If the " +
        "integration's emitted shape changed, update the patterns here rather " +
        "than hardcoding values — a hardcoded gate stops testing anything the " +
        "moment the example renames a theme.",
    );
  }
  return m[1];
}

/**
 * The state of the document, as the assertions see it.
 *
 * @remarks
 * Everything here is observable from the DOM: no Themvora global is read, so a
 * gate failure means the *page* is wrong, not that an internal shape moved.
 */
const SNAPSHOT = `(() => {
  const root = document.documentElement;
  const readouts = {};
  for (const el of document.querySelectorAll('[data-tv-readout]')) {
    readouts[el.getAttribute('data-tv-readout')] = (el.textContent || '').trim();
  }
  return {
    path: location.pathname,
    theme: root.getAttribute('data-theme'),
    resolvedMode: root.getAttribute('data-theme-mode'),
    selectionMode: root.getAttribute('data-theme-selection-mode'),
    selectionFamily: root.getAttribute('data-theme-selection-family'),
    readouts,
    readoutCount: document.querySelectorAll('[data-tv-readout]').length,
    selects: [...document.querySelectorAll('[data-tv-select]')].map((s) => s.value),
    // The painted colour, not the custom property: a scoped binding rewrites
    // the variable through core's colour pipeline, so the same colour can be
    // written as #1a1310 on the server and rgb(26, 19, 16) after binding.
    // What must not change is the colour behind it.
    scopes: [...document.querySelectorAll('[data-tv-scope]')].map((el) => ({
      theme: el.getAttribute('data-tv-scope'),
      background: getComputedStyle(el).backgroundColor,
    })),
    // Astro server-renders an island with a bare "ssr" attribute and removes it
    // once the client render has taken over, so its absence is the hydration
    // marker. The dev-only "client-render-time" attribute is not emitted in a
    // production build.
    islands: [...document.querySelectorAll('astro-island')].map((el) => ({
      hydrated: !el.hasAttribute('ssr'),
      // Long enough to include the panel's own "selection: …" line, which is
      // what proves React re-rendered from the shared runtime.
      text: (el.textContent || '').replace(/\\s+/g, ' ').trim().slice(0, 400),
    })),
    // Every visible text node that is NOT owned by the readout contract.
    //
    // This is the assertion the "Resolved: fluctuates between mint-light and
    // mint-dark" report needed. A theme value rendered as plain React text is
    // read through useSyncExternalStore, so during hydration it holds
    // runtime.initial — the *server's* resolution, which cannot know the
    // persisted selection or prefers-color-scheme. The line is painted with a
    // value the document does not have and corrects itself once hydration
    // commits, and no settled-DOM assertion can see it. The readout contract is
    // the only thing that prevents it, so any registered theme name appearing
    // outside a readout is a failure.
    strayText: (() => {
      const out = [];
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      let node = walker.nextNode();
      while (node) {
        const parent = node.parentElement;
        if (parent && !parent.closest('[data-tv-readout]') && !parent.closest('script,style')) {
          const text = (node.nodeValue || '').trim();
          if (text) out.push(text);
        }
        node = walker.nextNode();
      }
      return out.join(' | ');
    })(),
  };
})()`;

/** Dispatches `change` on the Nth `[data-tv-select]`, as a user would. */
function selectFamily(value, index = 0) {
  return `(() => {
    const sels = [...document.querySelectorAll('[data-tv-select]')];
    const sel = sels[${index}];
    if (!sel) return { error: 'no [data-tv-select] at index ${index}' };
    sel.value = ${JSON.stringify(value)};
    sel.dispatchEvent(new Event('change', { bubbles: true }));
    return sel.value;
  })()`;
}

/** Clicks the Nth `[data-tv-toggle]`. */
function clickToggle(index = 0) {
  return `(() => {
    const btns = [...document.querySelectorAll('[data-tv-toggle]')];
    const btn = btns[${index}];
    if (!btn) return { error: 'no [data-tv-toggle] at index ${index}' };
    btn.click();
    return true;
  })()`;
}

/** Clicks a same-origin link, so `<ClientRouter />` handles it. */
function navigate(href) {
  return `(() => {
    const a = document.querySelector('a[href="${href}"]');
    if (!a) return { error: 'no link to ${href}' };
    a.click();
    return true;
  })()`;
}

/** Clicks a button by its visible label, for the React island. */
function clickButton(label) {
  return `(() => {
    const btn = [...document.querySelectorAll('button')].find(
      (n) => (n.textContent || '').trim() === ${JSON.stringify(label)},
    );
    if (!btn) return { error: 'no button labelled ' + ${JSON.stringify(label)} };
    btn.click();
    return true;
  })()`;
}

/**
 * The assertions for one app.
 *
 * @param ctx - The browser handle and the expectations derived from the build.
 * @returns The number of failed assertions.
 */
async function runNativeApp(ctx) {
  const { base, evaluate, settle, goto, expect } = ctx;

  await goto(`${base}/`);

  let s = await evaluate(SNAPSHOT);
  expect("cold load: page path", s.path, "/");
  expect("cold load: theme", s.theme, ctx.themeOf(ctx.fallbackFamily, "light"));
  expect("cold load: selection family", s.selectionFamily, ctx.fallbackFamily);
  expect("cold load: select shows the selection", s.selects, [ctx.fallbackFamily]);
  expect("cold load: readout family", s.readouts.family, ctx.fallbackFamily);
  expect("cold load: readout theme", s.readouts.theme, ctx.themeOf(ctx.fallbackFamily, "light"));
  expect("cold load: the scopes are painted", s.scopes.length, 2);
  expect(
    "cold load: the scopes are themed independently of the page",
    s.scopes.every((x) => x.background && x.background !== "rgba(0, 0, 0, 0)"),
    true,
  );
  expect(
    "cold load: the two scopes differ from each other",
    new Set(s.scopes.map((x) => x.background)).size,
    2,
  );
  // The page theme changes below; a scope must not follow it.
  const scopedBackgrounds = s.scopes.map((x) => x.background);

  // --- selection, on the page we loaded ------------------------------------
  await evaluate(selectFamily(ctx.familyA));
  await settle(500);
  s = await evaluate(SNAPSHOT);
  expect("select: theme follows the family", s.theme, ctx.themeOf(ctx.familyA, "light"));
  expect("select: data-theme-family", s.selectionFamily, ctx.familyA);
  expect("select: readout follows", s.readouts.family, ctx.familyA);
  expect("select: control follows", s.selects, [ctx.familyA]);
  expect("select: scoped subtrees are unaffected", s.scopes.map((x) => x.background), scopedBackgrounds);

  // --- toggle --------------------------------------------------------------
  await evaluate(clickToggle(0));
  await settle(500);
  s = await evaluate(SNAPSHOT);
  expect("toggle: theme flips to dark", s.theme, ctx.themeOf(ctx.familyA, "dark"));
  expect("toggle: selection mode", s.selectionMode, "dark");
  expect("toggle: readout mode", s.readouts.mode, "dark");
  expect("toggle: readout theme", s.readouts.theme, ctx.themeOf(ctx.familyA, "dark"));
  expect("toggle: scoped subtrees are unaffected", s.scopes.map((x) => x.background), scopedBackgrounds);

  // --- client-side navigation to a second page -----------------------------
  const nav1 = await evaluate(navigate("/about"));
  if (nav1?.error) fail(`/about is not linked from /: ${nav1.error}`);
  await settle(1800);
  s = await evaluate(SNAPSHOT);
  expect("nav → /about: path", s.path, "/about");
  expect("nav → /about: theme preserved", s.theme, ctx.themeOf(ctx.familyA, "dark"));
  expect("nav → /about: selection preserved", s.selectionFamily, ctx.familyA);
  expect("nav → /about: readout family preserved", s.readouts.family, ctx.familyA);
  expect("nav → /about: readout theme preserved", s.readouts.theme, ctx.themeOf(ctx.familyA, "dark"));
  expect("nav → /about: select preserved", s.selects, [ctx.familyA]);

  // The reported bug: the destination page's control must be wired.
  await evaluate(selectFamily(ctx.familyB));
  await settle(500);
  s = await evaluate(SNAPSHOT);
  expect("nav → /about: select applies", s.theme, ctx.themeOf(ctx.familyB, "dark"));
  expect("nav → /about: selection family", s.selectionFamily, ctx.familyB);

  // --- back, then select again --------------------------------------------
  const nav2 = await evaluate(navigate("/"));
  if (nav2?.error) fail(`/ is not linked from /about: ${nav2.error}`);
  await settle(1800);
  s = await evaluate(SNAPSHOT);
  expect("nav → /: path", s.path, "/");
  expect("nav → /: theme preserved", s.theme, ctx.themeOf(ctx.familyB, "dark"));
  expect("nav → /: select preserved", s.selects, [ctx.familyB]);
  expect("nav → /: readouts preserved", s.readouts.family, ctx.familyB);

  // This is the exact reported symptom: back on the first page, selecting does
  // nothing until a file save re-runs its module script.
  await evaluate(selectFamily(ctx.familyA));
  await settle(500);
  s = await evaluate(SNAPSHOT);
  expect("nav → /: select applies after returning", s.theme, ctx.themeOf(ctx.familyA, "dark"));
  expect("nav → /: selection family", s.selectionFamily, ctx.familyA);
  expect("nav → /: readout follows", s.readouts.family, ctx.familyA);

  // --- several controls of the same kind -----------------------------------
  const nav3 = await evaluate(navigate("/two"));
  if (nav3?.error) fail(`/two is not linked from /: ${nav3.error}`);
  await settle(1800);
  s = await evaluate(SNAPSHOT);
  expect("nav → /two: path", s.path, "/two");
  expect("nav → /two: both controls show the selection", s.selects, [ctx.familyA, ctx.familyA]);
  expect("nav → /two: theme preserved", s.theme, ctx.themeOf(ctx.familyA, "dark"));

  // The second instance is the one a per-element `getElementById` binding
  // leaves inert.
  await evaluate(selectFamily(ctx.familyB, 1));
  await settle(500);
  s = await evaluate(SNAPSHOT);
  expect("second control applies", s.theme, ctx.themeOf(ctx.familyB, "dark"));
  expect("both controls follow", s.selects, [ctx.familyB, ctx.familyB]);
  expect("readout follows the second control", s.readouts.family, ctx.familyB);
}

async function runReactApp(ctx) {
  const { base, evaluate, settle, goto, expect } = ctx;

  await goto(`${base}/`);

  const cold = await evaluate(SNAPSHOT);
  expect("cold load: page path", cold.path, "/");
  expect("cold load: theme", cold.theme, ctx.themeOf(ctx.fallbackFamily, "light"));
  expect("cold load: the island is present", cold.islands.length, 1);
  expect("cold load: the island hydrated", cold.islands[0]?.hydrated, true);
  expect("cold load: readout family", cold.readouts.family, ctx.fallbackFamily);

  // The reported "Resolved: fluctuates between mint-light and mint-dark".
  //
  // `useTheme()` returns `theme`/`mode`/`family` through `useSyncExternalStore`,
  // so during hydration they hold `runtime.initial` — the server's resolution,
  // which cannot know the persisted selection or `prefers-color-scheme`. A panel
  // that renders one of them as text therefore paints a value the document does
  // not have and corrects it after hydration commits, and because the settled
  // DOM is right afterwards, only a rule about *where* a theme value may appear
  // can catch it. Every displayed theme value has to be a `ThemeReadout`.
  expect(
    "cold load: no theme name outside a readout",
    ctx.themeNames.filter((name) => cold.strayText.includes(name)),
    [],
  );

  // The island owns the runtime on this page; its own button must drive it.
  await evaluate(clickButton("Toggle light / dark"));
  await settle(600);
  const afterIslandToggle = await evaluate(SNAPSHOT);
  expect(
    "island toggle: theme flips",
    afterIslandToggle.theme,
    ctx.themeOf(ctx.fallbackFamily, "dark"),
  );
  expect("island toggle: readout mode", afterIslandToggle.readouts.mode, "dark");

  // --- native controls on a page that also mounts the island ---------------
  const nav = await evaluate(navigate("/native"));
  if (nav?.error) fail(`/native is not linked from /: ${nav.error}`);
  await settle(2200);
  const onNative = await evaluate(SNAPSHOT);
  expect("nav → /native: path", onNative.path, "/native");
  expect("nav → /native: theme preserved", onNative.theme, ctx.themeOf(ctx.fallbackFamily, "dark"));
  expect("nav → /native: the island re-hydrated", onNative.islands[0]?.hydrated, true);
  expect("nav → /native: select present", onNative.selects.length, 1);
  expect("nav → /native: select shows the selection", onNative.selects, [ctx.fallbackFamily]);

  // This is the Astro + React bug: the outgoing island destroys its runtime on
  // unmount, and the incoming island adopted the destroyed one, so every native
  // control changed the selection and painted nothing.
  await evaluate(selectFamily(ctx.familyA));
  await settle(600);
  const afterSelect = await evaluate(SNAPSHOT);
  expect("nav → /native: native select applies", afterSelect.theme, ctx.themeOf(ctx.familyA, "dark"));
  expect("nav → /native: selection family", afterSelect.selectionFamily, ctx.familyA);
  expect(
    "nav → /native: the island agrees with the document",
    afterSelect.islands[0]?.text?.includes(`selection: dark / ${ctx.familyA}`),
    true,
  );

  await evaluate(clickToggle(0));
  await settle(600);
  const afterNativeToggle = await evaluate(SNAPSHOT);
  expect(
    "nav → /native: native toggle applies",
    afterNativeToggle.theme,
    ctx.themeOf(ctx.familyA, "light"),
  );
  expect(
    "nav → /native: the island agrees after the toggle",
    afterNativeToggle.islands[0]?.text?.includes(`selection: light / ${ctx.familyA}`),
    true,
  );

  // --- back to the island-only page ---------------------------------------
  const back = await evaluate(navigate("/"));
  if (back?.error) fail(`/ is not linked from /native: ${back.error}`);
  await settle(2200);
  const backHome = await evaluate(SNAPSHOT);
  expect("nav → /: path", backHome.path, "/");
  expect("nav → /: theme preserved", backHome.theme, ctx.themeOf(ctx.familyA, "light"));
  expect("nav → /: the island re-hydrated", backHome.islands[0]?.hydrated, true);
  expect(
    "nav → /: the island reads the live selection",
    backHome.islands[0]?.text?.includes(`selection: light / ${ctx.familyA}`),
    true,
  );
  expect("nav → /: readout family preserved", backHome.readouts.family, ctx.familyA);
}

const APPS = [
  {
    name: "astro-native",
    root: join(repoRoot, "examples", "apps", "astro-native"),
    pages: ["index.html", "about/index.html", "two/index.html"],
    scenario: runNativeApp,
  },
  {
    name: "astro-react",
    root: join(repoRoot, "examples", "apps", "astro-react"),
    pages: ["index.html", "native/index.html"],
    scenario: runReactApp,
  },
];

async function main() {
  console.log("\n=== ASTRO INTERACTION GATE ===\n");

  const selected = APPS.filter((app) => !appFilter || app.name === appFilter);
  if (!selected.length) {
    fail(
      `no app matches --app ${appFilter}`,
      `Known apps: ${APPS.map((a) => a.name).join(", ")}`,
    );
  }

  const chromePath = findChrome();
  if (!chromePath) {
    fail(
      "headless Chromium not found",
      "Install Playwright's Chromium, or point THEMVORA_CHROME at a chrome.exe.",
    );
  }
  const wsPath = findWs();
  const require = createRequire(import.meta.url);
  // `ws` when it is installed; otherwise the WebSocket the runtime has shipped
  // since Node 22. The CDP client below only needs `send`, `on`/`off` and the
  // `open`/`message`/`error` events, which both provide.
  const WebSocket = wsPath ? require(wsPath) : globalThis.WebSocket;
  if (!WebSocket) {
    fail(
      "no WebSocket implementation available",
      "Install `ws`, or run on a Node version that provides a global WebSocket (22+).",
    );
  }

  const failures = [];

  for (const app of selected) {
    // Resolved from the app, not assumed to sit in its own node_modules: a
    // hoisted install puts the CLI at the workspace root and the gate should
    // still be measuring the app. The entry point comes from the package's own
    // `bin` field, which moved from `astro.js` to `bin/astro.mjs` in Astro 7 —
    // hardcoding either path is what makes a gate stop testing the version it
    // claims to test.
    const appRequire = createRequire(join(app.root, "package.json"));
    let astroJs = join(app.root, "node_modules", "astro", "astro.js");
    try {
      const pkgPath = appRequire.resolve("astro/package.json");
      const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
      const bin = typeof pkg.bin === "string" ? pkg.bin : pkg.bin?.astro;
      if (bin) astroJs = join(dirname(pkgPath), bin);
    } catch {
      // keep the conventional path; the check below reports it if it is wrong
    }
    if (!existsSync(astroJs)) {
      fail(
        `the example's Astro CLI is missing at ${astroJs}`,
        "Install the workspace first (the example depends on the local `astro` install).",
      );
    }

    if (skipBuild) {
      console.log(`  ${app.name}: build skipped (--skip-build)`);
    } else {
      console.log(`  ${app.name}: astro build …`);
      const built = spawnSync(process.execPath, [astroJs, "build"], {
        cwd: app.root,
        encoding: "utf8",
      });
      if (built.status !== 0) {
        fail(
          `\`astro build\` failed in ${app.name} with exit code ${built.status}`,
          `${built.stdout ?? ""}${built.stderr ?? ""}`.trim().slice(-1500),
        );
      }
    }

    for (const page of app.pages) {
      const p = join(app.root, "dist", page);
      if (!existsSync(p)) {
        fail(
          `${p} not found`,
          `${app.name} is a static build: \`astro build\` must emit ${page}. ` +
            "The gate asserts interaction on that page, so a missing page means " +
            "the matrix would silently test less than it claims.",
        );
      }
    }

    const indexHtml = await readFile(join(app.root, "dist", app.pages[0]), "utf8");
    const bootstrap = [...indexHtml.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)]
      .map((m) => m[1])
      .find((s) => s.includes("var fams="));
    if (!bootstrap) {
      fail(
        `no pre-paint bootstrap script found in ${app.name}'s built index.html`,
        "Expected an inline <head> script declaring `var fams=[…]`.",
      );
    }

    const families = JSON.parse(literal(bootstrap, /var fams=(\[[^\]]*\])/, "the registered families"));
    const fallbackFamily = literal(bootstrap, /indexOf\(fam0\)!==-1\?fam0:"([^"]*)"/, "the fallback family");
    // Tolerant of what is emitted between `names` and `key`: the pre-paint
    // script gained a `var lbl={…}` (theme name → label) for the `label`
    // readout, and an anchor on `;var key=` alone turned that addition into a
    // `JSON.parse` failure here rather than a gate that still worked.
    const names = JSON.parse(literal(bootstrap, /var names=(\{[\s\S]*?\});var (?:lbl|key)=/, "the theme-name map"));

    const others = families.filter((f) => f !== fallbackFamily);
    if (others.length < 2) {
      fail(
        `${app.name} registers ${families.length} famil(ies); the matrix needs at least 3`,
        `families=${JSON.stringify(families)} — it selects two families that are not ` +
          "the fallback, so a selection that silently falls back cannot pass.",
      );
    }

    const themeOf = (family, mode) => {
      const name = names[`${family}:${mode}`] ?? names[`__default-${mode}`];
      if (!name) {
        fail(
          `could not derive the ${mode} theme name for family "${family}" in ${app.name}`,
          `families=${JSON.stringify(families)} names=${JSON.stringify(names)}`,
        );
      }
      return name;
    };

    // --- serve the built output --------------------------------------------
    const port = await freePort();
    const base = `http://127.0.0.1:${port}`;
    const server = spawn(
      process.execPath,
      [astroJs, "preview", "--host", "127.0.0.1", "--port", String(port)],
      { cwd: app.root, stdio: ["ignore", "pipe", "pipe"] },
    );
    teardown.push(() => server.kill());
    let serverLog = "";
    server.stdout.on("data", (d) => (serverLog += d));
    server.stderr.on("data", (d) => (serverLog += d));

    let serving = false;
    for (let i = 0; i < 120; i++) {
      if (server.exitCode !== null) {
        fail(
          `\`astro preview\` exited early in ${app.name} with code ${server.exitCode}`,
          serverLog.trim().slice(-1200),
        );
      }
      try {
        const res = await fetch(`${base}/`);
        if (res.ok) {
          serving = true;
          break;
        }
      } catch {
        /* not up yet */
      }
      await new Promise((r) => setTimeout(r, 250));
    }
    if (!serving) {
      fail(
        `\`astro preview\` never started serving ${app.name} (30 s timeout)`,
        serverLog.trim().slice(-1200),
      );
    }
    console.log(`  ${app.name}: preview on ${base}`);
    console.log(
      `  ${app.name}: families=${JSON.stringify(families)} fallback=${fallbackFamily} ` +
        `probes=${others[0]},${others[1]}`,
    );

    // --- CDP ----------------------------------------------------------------
    const profile = mkdtempSync(join(os.tmpdir(), `tv-interaction-${app.name}-`));
    const browser = spawn(
      chromePath,
      [
        "--headless=new",
        "--remote-debugging-port=0",
        `--user-data-dir=${profile}`,
        "--no-first-run",
        "--no-proxy-server",
        "--disable-gpu",
        "--window-size=1200,900",
        "about:blank",
      ],
      { stdio: "ignore", detached: true },
    );
    browser.unref();
    teardown.push(() => browser.kill());

    const portFile = join(profile, "DevToolsActivePort");
    for (let i = 0; i < 80; i++) {
      if (existsSync(portFile)) break;
      await new Promise((r) => setTimeout(r, 250));
    }
    if (!existsSync(portFile)) fail("headless Chromium did not expose a CDP endpoint");

    const [cdpPort, browserPath = "/devtools/browser"] = (await readFile(portFile, "utf8"))
      .split("\n")
      .map((s) => s.trim());

    const cdp = await new Promise((resolve, reject) => {
      const ws = new WebSocket(`ws://127.0.0.1:${cdpPort}${browserPath}`);
      let id = 0;
      const pending = new Map();
      const listeners = new Set();
      ws.on("message", (raw) => {
        const m = JSON.parse(raw);
        if (m.id && pending.has(m.id)) {
          const { resolve: res, reject: rej } = pending.get(m.id);
          pending.delete(m.id);
          m.error ? rej(new Error(m.error.message)) : res(m.result);
        }
        for (const l of listeners) l(raw);
      });
      const send = (method, params = {}, sessionId) =>
        new Promise((res, rej) => {
          const i = ++id;
          pending.set(i, { resolve: res, reject: rej });
          ws.send(
            JSON.stringify(sessionId ? { sessionId, id: i, method, params } : { id: i, method, params }),
          );
        });
      ws.on("open", () => resolve({ send, on: (h) => listeners.add(h), off: (h) => listeners.delete(h) }));
      ws.on("error", reject);
    });

    // Console errors and uncaught exceptions are part of the contract: a
    // hydration mismatch that React silently repairs would otherwise pass every
    // DOM assertion below.
    const pageIssues = [];
    cdp.on((raw) => {
      const m = JSON.parse(raw);
      if (m.method === "Runtime.consoleAPICalled") {
        const { type, args } = m.params;
        if (type !== "error" && type !== "warning") return;
        const text = args.map((a) => a.value ?? a.description ?? "").join(" ").trim();
        if (!text || /favicon|net::ERR_|\[vite\]|Download the React DevTools/i.test(text)) return;
        pageIssues.push({ app: app.name, kind: `console.${type}`, text: text.slice(0, 240) });
      }
      if (m.method === "Runtime.exceptionThrown") {
        const d = m.params.exceptionDetails;
        const text = String(d.exception?.description ?? d.text ?? "unknown");
        if (/favicon|net::ERR_/i.test(text)) return;
        pageIssues.push({ app: app.name, kind: "pageerror", text: text.slice(0, 240) });
      }
    });

    const { targetId } = await cdp.send("Target.createTarget", { url: "about:blank" });
    const { sessionId } = await cdp.send("Target.attachToTarget", { targetId, flatten: true });
    const send = (method, params) => cdp.send(method, params, sessionId);
    await send("Runtime.enable");
    await send("Page.enable");
    await send("Network.enable");
    await send("Network.setCacheDisabled", { cacheDisabled: true });
    // Rows share one profile; a cookie from a previous run would turn the cold
    // load into a warm one and hide a regression in the fallback path.
    await send("Network.clearBrowserCookies");

    const evaluate = async (expression) => {
      const { result, exceptionDetails } = await send("Runtime.evaluate", {
        expression,
        returnByValue: true,
        awaitPromise: true,
      });
      if (exceptionDetails) {
        fail(
          `${app.name}: evaluating a step threw`,
          String(exceptionDetails.exception?.description ?? exceptionDetails.text).slice(0, 600),
        );
      }
      if (!result || result.type === "undefined" || result.value === undefined) {
        fail(
          `${app.name}: a step returned nothing`,
          `expression: ${expression.slice(0, 120)}\nremote object: ${JSON.stringify(result)}`,
        );
      }
      return result.value;
    };

    const settle = (ms) => new Promise((r) => setTimeout(r, ms));

    /**
     * A full page load, waiting for the load event.
     *
     * @param url - The URL to load.
     *
     * @remarks
     * `Page.navigate` rather than assigning `location.href`: the latter returns
     * before the new document commits, so the first evaluation can land in the
     * old execution context and read `about:blank`.
     */
    const goto = async (url) => {
      const loaded = new Promise((resolve) => {
        const handler = (raw) => {
          if (JSON.parse(raw).method === "Page.loadEventFired") {
            cdp.off(handler);
            resolve();
          }
        };
        cdp.on(handler);
      });
      await send("Page.navigate", { url });
      await loaded;
      await settle(1200);
    };

    let passed = 0;
    const expect = (label, actual, wanted) => {
      const a = JSON.stringify(actual);
      const w = JSON.stringify(wanted);
      if (a === w) {
        passed += 1;
        return;
      }
      console.log(`  FAIL  ${app.name}: ${label}`);
      console.log(`          expected ${w}`);
      console.log(`          actual   ${a}`);
      failures.push({ app: app.name, detail: `${label} — expected ${w}, got ${a}` });
    };

    const before = failures.length;
    await app.scenario({
      base,
      evaluate,
      settle,
      goto,
      expect,
      families,
      fallbackFamily,
      familyA: others[0],
      familyB: others[1],
      themeOf,
      // Every theme *name* the registry holds, for the "no theme value outside
      // the readout contract" assertion. Derived from the built bootstrap like
      // everything else here, so renaming a theme moves the expectation with it.
      themeNames: [...new Set(Object.values(names).filter((n) => typeof n === "string" && n))],
    });

    console.log(
      `  ${failures.length === before ? "PASS" : "FAIL"}  ${app.name}: ` +
        `${passed} assertions, ${failures.length - before} failed`,
    );

    await cdp.send("Target.closeTarget", { targetId }).catch(() => {});
    if (pageIssues.length) {
      console.log(`  ${app.name}: ${pageIssues.length} console error/warning(s)`);
      for (const i of pageIssues.slice(0, 8)) console.log(`     [${i.kind}] ${i.text}`);
      failures.push({
        app: app.name,
        detail: `${pageIssues.length} console error/warning(s) — hydration mismatches surface here`,
      });
    }
    await cdp.send("Browser.close").catch(() => {});
  }

  console.log(`\n  failures: ${failures.length}`);
  for (const f of failures) console.log(`\n  ✗ ${f.app}: ${f.detail}`);
  return failures.length ? 1 : 0;
}

let exitCode = 0;
try {
  exitCode = await main();
} catch (err) {
  if (err instanceof GateError) {
    console.error(`\n  FATAL — ${err.message}`);
    if (err.detail) console.error(`\n${err.detail}`);
  } else {
    console.error(`\n  FATAL — ${err?.stack ?? err}`);
  }
  exitCode = 1;
} finally {
  await shutdown();
}
process.exit(exitCode);
