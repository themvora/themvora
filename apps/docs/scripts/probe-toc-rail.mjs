/**
 * TOC rail probe — the marker follows the active section, smoothly.
 *
 * The rail used to paint the active entry with a coloured left border, which can
 * only appear where an item already is: the highlight jumped from row to row and
 * the "line" a reader follows down the page was really eight separate lines
 * blinking in turn. It is now one element that moves.
 *
 * That makes four things worth asserting in a browser, none of which a unit test
 * or a screenshot can see:
 *
 *   1. there is exactly one marker, it is decorative (`aria-hidden`), and the
 *      accessibility state still lives on the link (`aria-current="location"`);
 *   2. the marker's box matches the active link's box — measured, not assumed,
 *      because entries wrap to two lines and a row-height calculation drifts;
 *   3. changing section moves the marker, and it *arrives*: the final position is
 *      the active entry's position, not an approximation;
 *   4. the move is animated — a sample taken mid-flight sits strictly between
 *      where the marker was and where it ends up. A transition declared in CSS
 *      but never observed is exactly the regression this catches, and it is the
 *      difference between a marker that slides and one that teleports.
 *
 * Plus the reduced-motion contract: with `prefers-reduced-motion: reduce` the
 * marker must not animate at all.
 *
 * Usage:
 *   node scripts/probe-toc-rail.mjs              # spawns `next dev`
 *   PROBE_BASE=http://127.0.0.1:4413 node scripts/probe-toc-rail.mjs
 */
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { chromium, CHROME, NODE, probePort, nextBin } from "./lib/probe-env.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const PORT = probePort(4414);

const nextBin = path.join(
  path.dirname(createRequire(path.join(here, "package.json")).resolve("next/package.json")),
  "dist",
  "bin",
  "next",
);

/** A page with a rail long enough to have both `h2` and indented `h3` entries. */
const ROUTE = "/scoped-theme";

const externalBase = process.env.PROBE_BASE ?? null;

let proc = null;
let serverLog = "";
if (externalBase === null) {
  proc = spawn(NODE, [nextBin, "dev", "-p", String(PORT)], {
    cwd: path.dirname(here),
    stdio: ["ignore", "pipe", "pipe"],
  });
  proc.stdout.on("data", (d) => (serverLog += d));
  proc.stderr.on("data", (d) => (serverLog += d));
}

const base = externalBase ?? `http://localhost:${PORT}`;
for (let i = 0; i < 300; i++) {
  try {
    const response = await fetch(`${base}${ROUTE}`);
    if (response.status < 500) break;
  } catch {
    /* not listening yet */
  }
  await new Promise((resolve) => setTimeout(resolve, 500));
}

const failures = [];
const check = (condition, message) => {
  if (!condition) failures.push(message);
};

const browser = await chromium.launch({ executablePath: CHROME, headless: true });

/**
 * The rail's state, read in one frame.
 *
 * `relMarker` and `relLink` are both relative to the marker's parent — the
 * element that contains the track — so the comparison is immune to the rail
 * moving on the page while the reader scrolls.
 */
const readRail = (page) =>
  page.evaluate(() => {
    const marker = document.querySelector("[data-toc-marker]");
    if (!marker) return null;
    const rail = marker.parentElement;
    const active = document.querySelector(
      "nav[aria-label='On this page'] a[aria-current='location']",
    );
    const railRect = rail.getBoundingClientRect();
    const markerRect = marker.getBoundingClientRect();
    const activeRect = active?.getBoundingClientRect();
    const style = getComputedStyle(marker);
    return {
      markers: document.querySelectorAll("[data-toc-marker]").length,
      current: document.querySelectorAll("[aria-current='location']").length,
      hidden: marker.getAttribute("aria-hidden"),
      markerTop: +(markerRect.top - railRect.top).toFixed(2),
      markerHeight: +markerRect.height.toFixed(2),
      linkTop: activeRect ? +(activeRect.top - railRect.top).toFixed(2) : null,
      linkHeight: activeRect ? +activeRect.height.toFixed(2) : null,
      activeText: active?.textContent?.trim() ?? null,
      transitionProperty: style.transitionProperty,
      transitionDuration: style.transitionDuration,
      items: document.querySelectorAll("nav[aria-label='On this page'] ol a").length,
    };
  });

const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
await page.goto(base + ROUTE, { waitUntil: "networkidle", timeout: 90000 });

// The scroll-spy picks a section as the reader scrolls, so give it a moment and
// start from a position that is actually inside the document.
await page.evaluate(() => window.scrollTo({ top: 600, behavior: "instant" }));
await page.waitForTimeout(700);

const initial = await readRail(page);
if (!initial) {
  failures.push("no [data-toc-marker] in the rail — the rail has no moving indicator");
} else {
  // 1. One decorative marker; the accessible state stays on the link.
  check(initial.markers === 1, `${initial.markers} markers rendered — expected exactly one`);
  check(initial.hidden === "true", "the marker is not aria-hidden — it is decorative");
  check(
    initial.current <= 1,
    `${initial.current} links carry aria-current — at most one section can be current`,
  );
  check(initial.items >= 4, `the rail lists only ${initial.items} entries — too short to test`);

  // 2. The marker sits on the active entry.
  if (initial.linkTop !== null) {
    check(
      Math.abs(initial.markerTop - initial.linkTop) <= 1,
      `the marker is at ${initial.markerTop}px but the active entry is at ${initial.linkTop}px`,
    );
    check(
      Math.abs(initial.markerHeight - initial.linkHeight) <= 1,
      `the marker is ${initial.markerHeight}px tall but the active entry is ${initial.linkHeight}px`,
    );
  }

  // 3/4. Move to a different section and watch it travel.
  const target = await page.evaluate((activeText) => {
    const links = [...document.querySelectorAll("nav[aria-label='On this page'] ol a")];
    const index = links.findIndex((a) => a.textContent.trim() === activeText);
    // Two rows away, so the distance is unambiguous whatever the first match was.
    const next = links[Math.min(links.length - 1, Math.max(0, index) + 2)];
    next?.click();
    return next?.textContent?.trim() ?? null;
  }, initial.activeText);

  check(target !== null, "could not choose a second section to move to");

  if (target !== null) {
    const samples = [];
    const start = initial.markerTop;
    for (let i = 0; i < 24; i += 1) {
      samples.push(await readRail(page));
      await page.waitForTimeout(30);
    }

    const final = samples[samples.length - 1];
    const destination = final?.linkTop ?? null;

    check(
      destination !== null,
      "no section became current after moving — the scroll-spy did not follow",
    );

    if (destination !== null) {
      // It arrived: the last sample is on the entry, not near it.
      check(
        Math.abs(final.markerTop - destination) <= 1,
        `the marker settled at ${final.markerTop}px but the active entry is at ${destination}px`,
      );

      // It travelled: the destination is a different place on the rail.
      check(
        Math.abs(destination - start) > 4,
        `the marker did not move (${start}px → ${destination}px) — the chosen section is where it already was`,
      );

      // It animated: some sample was strictly between the two ends. A marker
      // that teleports produces samples at exactly `start` and `destination` and
      // nothing in between, which is what this distinguishes.
      const low = Math.min(start, destination);
      const high = Math.max(start, destination);
      const inFlight = samples.filter(
        (sample) =>
          sample !== null &&
          sample.markerTop > low + 1 &&
          sample.markerTop < high - 1,
      );
      check(
        inFlight.length > 0,
        `the marker jumped from ${start}px to ${destination}px with no intermediate position — the transition is declared but not running`,
      );

      // And the transition is declared, with a duration a reader can perceive.
      check(
        final.transitionProperty.includes("transform"),
        `the marker does not transition its position (transition-property: ${final.transitionProperty})`,
      );
      const duration = parseFloat(final.transitionDuration);
      check(
        duration > 0 && duration <= 0.6,
        `the marker's transition duration is ${final.transitionDuration} — expected a short, sub-second move`,
      );
    }
  }
}

await page.close();

// The reduced-motion contract.
{
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    reducedMotion: "reduce",
  });
  const calm = await context.newPage();
  await calm.goto(base + ROUTE, { waitUntil: "networkidle", timeout: 90000 });
  await calm.waitForTimeout(400);
  const state = await readRail(calm);
  check(state !== null, "no marker under reduced motion");
  if (state) {
    check(
      state.transitionDuration === "0s" || state.transitionProperty === "none",
      `the marker still animates under prefers-reduced-motion (${state.transitionProperty} ${state.transitionDuration})`,
    );
  }
  await context.close();
}

await browser.close();
proc?.kill("SIGKILL");

if (failures.length > 0) {
  console.error(`\n${failures.length} failure(s):`);
  for (const failure of failures) console.error(`  ✗ ${failure}`);
  if (serverLog) console.error(`\n--- server log tail ---\n${serverLog.slice(-2000)}`);
  process.exit(1);
}

console.log(`ok — TOC rail marker follows ${ROUTE} and animates between sections`);
