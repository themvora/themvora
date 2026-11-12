/**
 * Code-language selector probe.
 *
 * Drives the real pages in Chromium and asserts the behaviour the selector
 * promises — not that a component rendered, but that the documentation is
 * usable:
 *
 *   1. the TypeScript variant renders by default;
 *   2. choosing JavaScript switches the pane to the derived source;
 *   3. the pane is re-highlighted as the JavaScript language (`data-code-lang`),
 *      not merely re-labelled;
 *   4. Copy copies the *selected* source, not the hidden alternative;
 *   5. the radio group is keyboard operable and reports `aria-checked`;
 *   6. one choice switches every paired block on the page;
 *   7. blocks without a counterpart never render a selector;
 *   8. exactly one pane exists per block (the unselected snippet is not in the
 *      DOM, so it cannot be reached by `Ctrl+F` or a screen reader);
 *   9. no console error or hydration mismatch on any visited route;
 *  10. the toolbar badge names the languages the source is usable in — never the
 *      raw grammar id, which is what it used to show;
 *  11. a paired block shows the selector instead of the badge, so the two can
 *      never contradict each other;
 *  12. the badge does not change the filename, and switching language only
 *      changes its extension;
 *  13. Angular documentation is TypeScript-only — no selector anywhere on its
 *      guide, and no combined badge — while every other framework keeps its
 *      selector. This is the one framework exception, so it is asserted in the
 *      browser and not only in the label gate.
 *  14. no block renders a line-number gutter, the first line starts at the pane's
 *      own padding, the code padding is 12–16px, and consecutive lines are one
 *      line-height apart rather than two;
 *  15. Copy from an unpaired block copies its source verbatim — the case where a
 *      gutter leaking into the clipboard would still look correct on screen.
 *
 * Usage:
 *   node scripts/probe-code-language.mjs            # representative routes
 *   node scripts/probe-code-language.mjs /quick-start …
 */
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { chromium, CHROME, NODE, probePort } from "./lib/probe-env.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const PORT = probePort(4412);

/**
 * The `next` binary, resolved rather than assumed.
 *
 * pnpm hoists `next` to the workspace root, so the historical
 * `node_modules/next/dist/bin/next` path does not exist here and the spawned
 * server died with MODULE_NOT_FOUND while the probe waited out its readiness
 * loop. Resolving `next/package.json` from the docs directory works under both
 * layouts.
 */
const nextBin = path.join(
  path.dirname(
    createRequire(path.join(here, "..", "package.json")).resolve("next/package.json"),
  ),
  "dist",
  "bin",
  "next",
);

/**
 * Routes to visit, with the number of paired blocks each is expected to have.
 *
 * A zero is a real assertion, and there are four different reasons for one:
 * `/api-reference/core` renders generated signatures, where a JavaScript
 * rendering would be a syntax error; `/adapters` shows snippets that are already
 * plain JavaScript, so a selector there would toggle between two identical
 * blocks; `/zero-flash` and its siblings render through `FrameworkTabs`, which
 * carries a badge and no selector by design; and the Angular routes are
 * TypeScript-only by decision, which is the exception `noCombinedBadge` exists
 * to pin.
 *
 * `pick` names a framework chip to select before counting. Three guides render
 * their paired snippet only for particular frameworks, so visiting the page on
 * its default framework would assert the opposite of what the page offers. Two
 * of them used to pick Angular — whose snippet was the only one with a
 * TypeScript form on those pages — and now pick Next.js, because Angular's
 * examples never pair.
 */
const ROUTES = [
  { path: "/quick-start", paired: 1 },
  { path: "/framework-guides/vue", paired: 5 },
  { path: "/framework-guides/svelte", paired: 4 },
  { path: "/framework-guides/astro", paired: 0 },
  { path: "/framework-guides/react", paired: 4 },
  { path: "/framework-guides/vue/examples", paired: 19 },
  { path: "/framework-guides/svelte/examples", paired: 21 },
  { path: "/framework-guides/react/examples", paired: 16 },
  // The exception, asserted where a reader meets it: the whole Angular guide,
  // and the whole Angular examples page, offer no language choice at all.
  { path: "/framework-guides/angular", paired: 0, expectBadge: "TS", noCombinedBadge: true },
  { path: "/framework-guides/angular/examples", paired: 0, noCombinedBadge: true },
  { path: "/adapters", paired: 0 },
  { path: "/persistence", paired: 4 },
  { path: "/scoped-theme", paired: 3 },
  // The default framework on these two pages is one whose snippet is already
  // JavaScript, so the selector only appears after a framework switch.
  { path: "/sunrise-sunset", paired: 1, pick: "Next.js" },
  { path: "/presets/default", paired: 1, pick: "Next.js" },
  { path: "/presets/brand", paired: 1, pick: "Next.js" },
  { path: "/custom-themes", paired: 1, pick: "Next.js" },
  // No framework snippet on this page has a TypeScript form any more: the
  // Angular config was the only one, and Angular is TypeScript-only.
  { path: "/animation", paired: 0 },
  { path: "/custom-scrollbar", paired: 1, pick: "Remix" },
  { path: "/libraries/shadcn", paired: 1 },
  { path: "/api-reference/core", paired: 0 },
  // Routes whose blocks are all *already* JavaScript, so they carry the combined
  // badge and no selector. `expectBadge` pins the label a reader should see —
  // these are the pages the badge exists for, and a silent regression to the raw
  // grammar id would otherwise be invisible.
  { path: "/", paired: 0, expectBadge: "TSX / JSX" },
  { path: "/presets", paired: 0, expectBadge: "TS / JS" },
  { path: "/tokens/code", paired: 0, expectBadge: "TS / JS" },
  { path: "/packages/core", paired: 0 },
  { path: "/examples", paired: 0 },
  { path: "/zero-flash", paired: 0 },
  { path: "/vite-plugin", paired: 0 },
  { path: "/theme-inspector", paired: 0 },
];

/**
 * Grammar ids a badge must never show.
 *
 * The badge used to be the raw `language` prop, so a TypeScript block read `ts`
 * — a grammar, not a statement about the source. Any of these surviving into the
 * toolbar means a rendering path was not given its label.
 */
const RAW_GRAMMAR = new Set(["ts", "tsx", "mts", "cts", "typescript"]);

const routes = process.argv.slice(2).length
  ? process.argv.slice(2).map((p) => ({ path: p, paired: null }))
  : ROUTES;

/**
 * `PROBE_BASE` attaches the probe to a server that is already running.
 *
 * `next dev` writes and prunes a large `.next` tree as it compiles, which is
 * fine in CI but trips host-level bulk-delete guards on some machines. Pointing
 * the probe at `next start` (after a `next build`) exercises the same pages
 * against the artefact that ships, so it is the stronger run anyway.
 */
const externalBase = process.env.PROBE_BASE ?? null;

let proc = null;
let serverLog = "";
if (externalBase === null) {
  proc = spawn(
    NODE,
    [nextBin, "dev", "-p", String(PORT)],
    { cwd: path.dirname(here), stdio: ["ignore", "pipe", "pipe"] },
  );
  proc.stdout.on("data", (d) => (serverLog += d));
  proc.stderr.on("data", (d) => (serverLog += d));
}

const base = externalBase ?? `http://localhost:${PORT}`;
for (let i = 0; i < 300; i++) {
  try {
    const response = await fetch(`${base}/quick-start`);
    if (response.status < 500) break;
  } catch {
    /* not listening yet */
  }
  await new Promise((resolve) => setTimeout(resolve, 500));
}

const browser = await chromium.launch({ executablePath: CHROME, headless: true });
const context = await browser.newContext({
  colorScheme: "light",
  permissions: ["clipboard-read", "clipboard-write"],
});

const failures = [];
const check = (route, condition, message) => {
  if (!condition) failures.push(`${route}: ${message}`);
};

const INTERESTING = /hydrat|mismatch|did not match|error #4\d\d|Warning:/i;

/**
 * The source a reader would copy from a pane.
 *
 * `innerText` is the wrong answer even now that the gutter is gone: it reports
 * the *rendered* text, so a line clipped by the pane's horizontal scroll would
 * be measured short, and a collapsed block would report only what is visible.
 * `textContent` of the `<code>` is the highlighted source exactly as Shiki
 * received it — which is also the strongest possible check that removing the
 * gutter did not touch the code.
 */
const visibleCode = (pane) =>
  pane.evaluate((node) => {
    const code = node.querySelector("code") ?? node;
    return (code.textContent ?? "").replace(/\n$/, "");
  });

/**
 * The clipboard as the documentation wrote it.
 *
 * Windows puts `\r\n` on the clipboard for text/plain, so comparing the copied
 * snippet with the rendered source byte for byte reported a nine-character
 * difference on a ten-line snippet — one carriage return per line, and no
 * product bug at all.
 */
const normaliseNewlines = (text) => text.replace(/\r\n/g, "\n");

/**
 * Drop comments before asking "does this still contain TypeScript?".
 *
 * Documentation prose inside a comment is not syntax — a JavaScript snippet may
 * legitimately say "we still implement the interface for consistency" — and a
 * naive regex over the raw text reported that as a TypeScript leak.
 */
const stripComments = (code) =>
  code.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/[^\n]*/g, "$1");

/**
 * Click Copy and return what landed on the clipboard.
 *
 * Two timing problems, both real:
 *
 *  - `navigator.clipboard.writeText` is asynchronous and the button only flips
 *    to "Copied" once it resolves, so reading the clipboard straight after the
 *    click races the write and returns the *previous* page's snippet.
 *  - The button is server-rendered, so a click that lands before hydration is a
 *    no-op on a large page. `/api-reference/core` is long enough that
 *    `networkidle` does not imply interactive, and the first attempt there did
 *    nothing at all.
 *
 * Waiting for the confirmation solves both, and the retry covers the hydration
 * case without a sleep. `confirmed` is returned rather than thrown so a route
 * that never confirms reports that, instead of a confusing length mismatch.
 */
const copyFrom = async (page, block) => {
  const copy = block.getByRole("button", { name: "Copy", exact: true });
  const done = block.getByRole("button", { name: "Copied", exact: true });

  let confirmed = false;
  for (let attempt = 0; attempt < 3 && !confirmed; attempt += 1) {
    await copy.click();
    confirmed = await done
      .waitFor({ state: "visible", timeout: 2000 })
      .then(() => true)
      .catch(() => false);
  }

  return {
    confirmed,
    copied: normaliseNewlines(await page.evaluate(() => navigator.clipboard.readText())),
  };
};

/** Shiki languages whose id changes when the TypeScript syntax is removed. */
const RENAMED = new Set(["ts", "tsx", "mts", "cts", "typescript"]);

/** TypeScript syntax that must never survive into a JavaScript pane. */
const TS_ONLY = [
  /\binterface\s+[A-Z]\w*\s*[{<]/,
  /\bimplements\s+[A-Z]\w*/,
  /\bas\s+const\b/,
  /\bsatisfies\s+[A-Z]\w*/,
  /\bimport\s+type\b/,
  /:\s*(string|number|boolean|void|unknown|any|never)\b/,
  /lang="ts"/,
];

for (const route of routes) {
  const page = await context.newPage();
  const consoleIssues = [];
  page.on("pageerror", (error) => consoleIssues.push(`pageerror: ${error.message}`));
  page.on("console", (message) => {
    if (INTERESTING.test(message.text())) {
      consoleIssues.push(`console.${message.type()}: ${message.text()}`);
    }
  });

  try {
    await page.goto(base + route.path, { waitUntil: "networkidle", timeout: 90000 });
  } catch (error) {
    failures.push(`${route.path}: navigation failed — ${error.message.split("\n")[0]}`);
    await page.close();
    continue;
  }

  // Some guides only offer the paired snippet for one framework, so the chip is
  // part of reaching the state under test. Waiting on the selector itself — not
  // on a timeout — keeps the probe honest when the pair is missing: the count
  // assertion below then fails with a real number instead of a flaky zero.
  //
  // The two pickers disagree on semantics — `FrameworkPicker` renders
  // `aria-pressed` buttons, the scrollbar guide a tablist — so the chip is
  // matched by name across both roles rather than assuming one.
  if (route.pick) {
    const chip = page
      .getByRole("button", { name: route.pick, exact: true })
      .or(page.getByRole("tab", { name: route.pick, exact: true }))
      .first();
    // The chip is reached through the accessibility tree first, because that is
    // what a reader uses. Some pickers sit inside a horizontally scrolling
    // strip where the synthetic click never becomes actionable; the DOM click
    // fallback keeps the probe measuring the page instead of the harness.
    try {
      await chip.click({ timeout: 5000 });
    } catch {
      const clicked = await page.evaluate((label) => {
        const el = [...document.querySelectorAll("button[aria-pressed], [role=tab]")].find(
          (node) => node.textContent.trim() === label,
        );
        if (!el) return false;
        el.click();
        return true;
      }, route.pick);
      if (!clicked) failures.push(`${route.path}: could not select "${route.pick}"`);
    }
    await page
      .locator("[data-code-variants]")
      .first()
      .waitFor({ state: "attached", timeout: 5000 })
      .catch(() => {});
  }

  const blocks = page.locator("[data-code-variants]");
  const paired = await blocks.count();
  if (route.paired !== null) {
    check(
      route.path,
      paired >= route.paired,
      `expected at least ${route.paired} paired blocks, found ${paired}`,
    );
    // A zero is a claim, not a floor: "at least zero" would assert nothing, and
    // the routes that declare one are exactly the ones where a selector would be
    // wrong — a TypeScript-only framework, a signature, an already-JavaScript
    // snippet.
    if (route.paired === 0) {
      check(
        route.path,
        paired === 0,
        `expected no paired blocks, found ${paired} — this page must not offer a language choice`,
      );
    }
  }

  // 8. One pane per block, and the unselected source is not in the document.
  const panes = page.locator(".code-block-content");
  const paneCount = await panes.count();
  const blockCount = await page.locator(".code-block").count();
  check(
    route.path,
    paneCount === blockCount,
    `${paneCount} code panes for ${blockCount} blocks — a block rendered two panes`,
  );

  // 8b. No pane is empty.
  //
  // A `CodeBlock` given neither `html` nor `variants` paints an empty box: the
  // filename and Copy button still render, so the block looks intentional while
  // showing nothing. That is exactly how Quick Start lost 63 of its 83 snippets
  // — every snippet with no JavaScript form — and no count-based assertion
  // noticed, because those blocks are legitimately unpaired. This checks the
  // rendered text instead of the block's configuration.
  const emptyPanes = await panes.evaluateAll((nodes) =>
    nodes
      .map((node, index) => ({ index, text: node.textContent?.trim() ?? "" }))
      .filter((pane) => pane.text === "")
      .map((pane) => pane.index),
  );
  check(
    route.path,
    emptyPanes.length === 0,
    `${emptyPanes.length} of ${paneCount} code panes are empty (pane indexes ${emptyPanes.slice(0, 8).join(", ")})`,
  );

  // 14. No line-number gutter, and the code starts at the content edge.
  //
  // The gutter used to be markup — a `.line-number` span per line inside a
  // `.line-code` wrapper — so its absence is a DOM fact, not a matter of the
  // numbers being invisible. The alignment check is the other half: a block
  // whose gutter was merely hidden would still be indented by its width, so the
  // first line's left edge is compared with the pane's own padding.
  const density = await page.evaluate(() => {
    const panes = [...document.querySelectorAll(".code-block-content")];
    const pre = panes.map((pane) => pane.querySelector("pre.shiki")).find(Boolean);
    if (!pre) return null;

    const preStyle = getComputedStyle(pre);
    const preRect = pre.getBoundingClientRect();
    const lines = [...pre.querySelectorAll(".line")];
    const first = lines.find((line) => (line.textContent ?? "").trim() !== "");

    // Spacing is measured between *consecutive* lines, blank ones included: a
    // blank line in the source is a line, and it must occupy exactly one line
    // box. Filtering them out would read the blank line's own height as a
    // doubled gap on the next pair — which is how the first version of this
    // check reported a false failure on every snippet with a blank line.
    const tops = lines.slice(0, 4).map((line) => line.getBoundingClientRect().top);
    const deltas = tops.slice(1).map((top, index) => +(top - tops[index]).toFixed(2));

    const lineStyle = first ? getComputedStyle(first) : null;
    return {
      gutters: document.querySelectorAll(".line-number, .line-code").length,
      numbered: document.querySelectorAll("pre.shiki code.has-line-numbers").length,
      paddingLeft: parseFloat(preStyle.paddingLeft),
      paddingTop: parseFloat(preStyle.paddingTop),
      paddingBottom: parseFloat(preStyle.paddingBottom),
      offset: first ? +(first.getBoundingClientRect().left - preRect.left).toFixed(2) : null,
      lineHeight: lineStyle ? parseFloat(lineStyle.lineHeight) : null,
      fontSize: lineStyle ? parseFloat(lineStyle.fontSize) : null,
      deltas,
    };
  });

  if (density) {
    check(
      route.path,
      density.gutters === 0,
      `${density.gutters} line-number gutter element(s) still rendered — numbering must be removed at the source, not hidden`,
    );
    check(
      route.path,
      density.numbered === 0,
      `${density.numbered} block(s) still carry the has-line-numbers class`,
    );
    check(
      route.path,
      density.offset !== null && Math.abs(density.offset - density.paddingLeft) <= 1,
      `the first code line starts ${density.offset}px from the pane edge, but the pane's padding is ${density.paddingLeft}px — the code is indented by a leftover gutter`,
    );
    check(
      route.path,
      density.paddingTop >= 12 && density.paddingTop <= 16,
      `code padding is ${density.paddingTop}px, outside the 12–16px band the density rule sets`,
    );
    check(
      route.path,
      density.paddingBottom >= 12 && density.paddingBottom <= 16,
      `code bottom padding is ${density.paddingBottom}px, outside the 12–16px band`,
    );
    const ratio = density.lineHeight / density.fontSize;
    check(
      route.path,
      ratio >= 1.45 && ratio <= 1.7,
      `code line-height is ${ratio.toFixed(2)}× the font size — outside the 1.5–1.65 band`,
    );
    // Every gap must be one line, not two. This is the assertion that would have
    // caught the doubled spacing: the line box was 21px and the gaps 42px.
    const doubled = density.deltas.filter(
      (delta) => Math.abs(delta - density.lineHeight) > 1,
    );
    check(
      route.path,
      doubled.length === 0,
      `code lines are spaced ${doubled.join(", ")}px apart while a line is ${density.lineHeight}px tall — the gaps are doubled`,
    );
  }

  // 15. Copy from an unpaired block copies its source verbatim.
  //
  // The paired case is checked below, after a language switch. This covers the
  // far more common block — no selector, one source — because that is where a
  // gutter leaking into the copied text would go unnoticed: the text would still
  // look right on screen.
  const unpairedBlock = page.locator(".code-block:not([data-code-variants])").first();
  if ((await unpairedBlock.count()) > 0) {
    const pane = unpairedBlock.locator(".code-block-content");
    const source = await visibleCode(pane);
    const { copied, confirmed } = await copyFrom(page, unpairedBlock);
    check(route.path, confirmed, "the Copy button never confirmed a copy");
    check(
      route.path,
      copied.trim() === source.trim(),
      `Copy from an unpaired block did not copy its source (${copied.trim().length} vs ${source.trim().length} chars)`,
    );
  }

  // 10. The toolbar badge names the languages, not the grammar.
  //
  // Only unpaired blocks with a filename render one: a paired block shows the
  // selector instead (asserted below), and a block with neither a filename nor a
  // label shows the badge in the filename slot.
  const badges = await page
    .locator(".code-block-lang")
    .evaluateAll((nodes) => nodes.map((node) => (node.textContent ?? "").trim()));
  // Exact match, not lowercased: `TS` and `TSX` are the *labels* for a
  // TypeScript-only snippet, while `ts` and `tsx` are the grammar ids that a
  // block without a label falls back to. Lowercasing would conflate the two and
  // report a correct badge as a regression.
  const raw = badges.filter((badge) => RAW_GRAMMAR.has(badge));
  check(
    route.path,
    raw.length === 0,
    `${raw.length} toolbar badge(s) still show the raw grammar id (${[...new Set(raw)].join(", ")}) — the block was not given its label`,
  );
  // The badge is shown in whichever slot the block has: the dedicated language
  // span when a filename is present, the filename slot otherwise.
  if (route.expectBadge) {
    const labels = await page
      .locator(".code-block-lang, .code-block-filename")
      .evaluateAll((nodes) => nodes.map((node) => (node.textContent ?? "").trim()));
    check(
      route.path,
      labels.includes(route.expectBadge),
      `expected a "${route.expectBadge}" badge, saw ${JSON.stringify([...new Set(labels)].slice(0, 8))}`,
    );
  }

  // 13. The TypeScript-only exception, read off the DOM.
  //
  // Angular's documentation offers no language choice (asserted by `paired: 0`
  // above), and its badges say `TS` rather than `TS / JS` — including on the
  // snippets that would run as JavaScript. The combined labels are the thing a
  // reader would take as "this example works in my .js project", so their
  // absence is the claim worth pinning.
  if (route.noCombinedBadge) {
    const combined = await page
      .locator(".code-block-lang")
      .evaluateAll((nodes) =>
        nodes
          .map((node) => (node.textContent ?? "").trim())
          .filter((text) => text.includes("/")),
      );
    check(
      route.path,
      combined.length === 0,
      `${combined.length} badge(s) claim a combined language (${[...new Set(combined)].join(", ")}) — this framework is TypeScript-only`,
    );
  }

  // 11. A paired block shows the selector, never the badge — so the two cannot
  // disagree about what is on screen.
  const pairedBadges = await page
    .locator("[data-code-variants] .code-block-lang")
    .count();
  check(
    route.path,
    pairedBadges === 0,
    `${pairedBadges} paired blocks render a badge alongside their selector`,
  );

  if (paired > 0) {
    const first = blocks.first();
    const pane = first.locator(".code-block-content");
    const radio = first.getByRole("radio", { name: "TypeScript" });
    const jsRadio = first.getByRole("radio", { name: "JavaScript" });

    // 1. TypeScript is the default.
    check(
      route.path,
      (await radio.getAttribute("aria-checked")) === "true",
      "TypeScript is not selected by default",
    );
    check(
      route.path,
      (await pane.getAttribute("data-code-language")) === "ts",
      "the first block did not start on the TypeScript variant",
    );

    const tsText = await visibleCode(pane);
    const tsHtml = await pane.innerHTML();
    const tsLang = await pane.getAttribute("data-code-lang");
    const tsFilename = (
      await first.locator(".code-block-filename").textContent()
    )?.trim();

    // 5. Keyboard: focus the selected radio, ArrowRight moves the choice.
    await radio.focus();
    await page.keyboard.press("ArrowRight");

    const jsSelected = await jsRadio.getAttribute("aria-checked");
    check(route.path, jsSelected === "true", "ArrowRight did not select JavaScript");

    // 2/3. The pane switched and was re-highlighted as the other language.
    const jsText = await visibleCode(pane);
    const jsHtml = await pane.innerHTML();
    const jsLang = await pane.getAttribute("data-code-lang");
    check(route.path, jsText !== tsText, "the code pane did not change when switching to JavaScript");
    check(
      route.path,
      jsHtml !== tsHtml,
      "the highlighted markup did not change — the pane was relabelled, not re-highlighted",
    );
    // A `.ts`/`.tsx` snippet is re-highlighted as `javascript`/`jsx`. A single
    // file component keeps its own grammar — the language of a `.vue` file does
    // not change when its script block stops being TypeScript — so the id is
    // only expected to move for the module languages.
    if (RENAMED.has(tsLang)) {
      check(route.path, jsLang !== tsLang, `the pane kept its highlight language (${tsLang})`);
    } else {
      check(route.path, jsLang === tsLang, `an SFC changed grammar on a language switch: ${tsLang} → ${jsLang}`);
    }
    // The JavaScript form must not carry TypeScript syntax into the reader's file.
    const stripped = stripComments(jsText);
    const leaked = TS_ONLY.filter((pattern) => pattern.test(stripped));
    check(
      route.path,
      leaked.length === 0,
      `the JavaScript pane still contains TypeScript syntax (${leaked.map(String).join(", ")})`,
    );

    // 6. One choice per page: every paired block followed the switch.
    const languages = await page
      .locator("[data-code-variants] .code-block-content")
      .evaluateAll((nodes) => nodes.map((node) => node.getAttribute("data-code-language")));
    check(
      route.path,
      languages.every((value) => value === "js"),
      `paired blocks did not all switch: ${languages.join(", ")}`,
    );

    // 4. Copy copies the selected source.
    const { copied: clipboard, confirmed } = await copyFrom(page, first);
    check(route.path, confirmed, "the Copy button never confirmed a copy");
    check(
      route.path,
      clipboard.trim() === jsText.trim(),
      `Copy copied something other than the visible snippet (${clipboard.trim().length} vs ${jsText.trim().length} chars)`,
    );

    // 12. The filename follows the language, and only its extension moves: the
    // reader still knows which file they are looking at.
    //
    // Skipped when the block has no filename: the toolbar's left slot then shows
    // the badge, and the JavaScript variant's fallback name is its grammar, so
    // there is no path to compare.
    const jsFilename = (
      await first.locator(".code-block-filename").textContent()
    )?.trim();
    // The extension can sit anywhere in the label — several guides append a
    // framework name (`app/root.tsx — Remix`) — so the comparison masks the
    // extension rather than stripping a suffix.
    const shape = (name) =>
      name.replace(/\.(tsx?|mts|cts|jsx?|mjs|cjs)\b/g, ".<ext>");
    if (tsFilename?.includes(".") && jsFilename?.includes(".") && tsFilename !== jsFilename) {
      check(
        route.path,
        shape(tsFilename) === shape(jsFilename),
        `the filename changed more than its extension on a language switch: ${tsFilename} → ${jsFilename}`,
      );
    }

    // 7. Blocks without a counterpart have no selector.
    const unpairedWithSwitch = await page
      .locator(".code-block:not([data-code-variants]) [role='radiogroup']")
      .count();
    check(route.path, unpairedWithSwitch === 0, `${unpairedWithSwitch} unpaired blocks render a selector`);
  }

  // 9. No hydration or console errors.
  if (consoleIssues.length > 0) {
    failures.push(`${route.path}: ${consoleIssues.length} console issue(s):\n    ${consoleIssues.join("\n    ")}`);
  }

  console.log(`ok  ${route.path}  (${paired} paired blocks)`);
  await page.close();
}

await browser.close();
proc?.kill("SIGKILL");

if (failures.length > 0) {
  console.error(`\n${failures.length} failure(s):`);
  for (const failure of failures) console.error(`  ✗ ${failure}`);
  console.error(`\n--- server log tail ---\n${serverLog.slice(-3000)}`);
  process.exit(1);
}

console.log("\nok — selector behaviour verified in Chromium");
