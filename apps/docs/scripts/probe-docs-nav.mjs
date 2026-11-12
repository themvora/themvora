#!/usr/bin/env node
/**
 * Docs navigation regression probe.
 *
 * Covers the hierarchical sidebar, active-route auto-expansion on direct load
 * and client navigation, the desktop collapse reflow, the mobile drawer, the
 * mobile "On this page" disclosure, TOC hierarchy and the responsive
 * geometry at the widths named in the brief.
 *
 * Usage:
 *   node scripts/probe-docs-nav.mjs                 # spawns its own next dev
 *   PROBE_URL=http://localhost:3000 node scripts/probe-docs-nav.mjs
 *
 * Screenshots are written to `apps/docs/.badges/docs-nav/` (git-ignored).
 */
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { chromium, CHROME, NODE, docsDir, probePort } from "./lib/probe-env.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const shotDir = path.join(docsDir, ".badges", "docs-nav");
mkdirSync(shotDir, { recursive: true });

const externalUrl = process.env.PROBE_URL;
const PORT = probePort(4404);
const base = externalUrl ?? `http://localhost:${PORT}`;

const failures = [];
const notes = [];
function check(condition, message) {
  if (condition) {
    console.log(`  ok   ${message}`);
  } else {
    failures.push(message);
    console.log(`  FAIL ${message}`);
  }
}

function near(actual, expected, tolerance, message) {
  check(
    Math.abs(actual - expected) <= tolerance,
    `${message} (${actual.toFixed(1)} ≈ ${expected.toFixed(1)})`,
  );
}

let server;
if (!externalUrl) {
  const bin = path.join(docsDir, "node_modules", "next", "dist", "bin", "next");
  server = spawn(NODE, [bin, "dev", "-p", String(PORT)], {
    cwd: docsDir,
    stdio: ["ignore", "pipe", "pipe"],
  });
  for (let i = 0; i < 300; i++) {
    try {
      const response = await fetch(`${base}/quick-start`);
      if (response.status < 500) break;
    } catch {
      /* not ready */
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
}

const browser = await chromium.launch({ executablePath: CHROME, headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
});
const page = await context.newPage();
const consoleErrors = [];
page.on("console", (message) => {
  if (message.type() === "error") consoleErrors.push(message.text());
});
page.on("pageerror", (error) => consoleErrors.push(String(error)));

async function goto(route, width, height = 900) {
  await page.setViewportSize({ width, height });
  let lastError;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await page.goto(`${base}${route}`, {
        waitUntil: "networkidle",
        timeout: 60000,
      });
      lastError = null;
      break;
    } catch (error) {
      lastError = error;
      await page.waitForTimeout(1000);
    }
  }
  if (lastError) throw lastError;
  await page.waitForSelector("nav[data-docs-sidebar]", {
    state: "attached",
    timeout: 30000,
  });
  await page.waitForTimeout(800);
}

async function shot(name) {
  await page.screenshot({
    path: path.join(shotDir, `${name}.png`),
    fullPage: false,
  });
}

/** Click inside the scrollable tree without landing under its sticky header. */
async function safeClick(locator) {
  await locator.evaluate((element) =>
    element.scrollIntoView({ block: "center", inline: "nearest" }),
  );
  await page.waitForTimeout(250);
  await locator.click();
  // Give a 220ms tree expansion (or the route transition) time to settle
  // before the next locator measures its position.
  await page.waitForTimeout(450);
}

async function clearStorage() {
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
}

const sectionToggle = (name) =>
  page
    .locator("nav[data-docs-sidebar] .docs-nav-section-toggle", { hasText: name })
    .first();
const groupToggle = (name) =>
  page
    .locator("nav[data-docs-sidebar] .docs-nav-group-toggle", { hasText: name })
    .first();

async function layout() {
  return page.evaluate(() => {
    const box = (element) => {
      if (!element) return null;
      const rect = element.getBoundingClientRect();
      return {
        left: rect.left,
        right: rect.right,
        width: rect.width,
        top: rect.top,
        height: rect.height,
      };
    };
    const nav = document.querySelector("nav[data-docs-sidebar]");
    const toc = document.querySelector("[data-toc-rail]");
    const grid = document.querySelector(".docs-grid");
    const active = nav?.querySelector('[aria-current="page"]');
    const head = nav?.querySelector(".docs-nav-head");
    const activeRect = active?.getBoundingClientRect();
    const navRect = nav?.getBoundingClientRect();
    const headRect = head?.getBoundingClientRect();
    const triggers = Array.from(
      document.querySelectorAll(".docs-article-controls button"),
    );
    const trigger = triggers.find(
      (element) => element.getBoundingClientRect().width > 0,
    );
    return {
      viewport: window.innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
      nav: box(nav),
      navVisible: nav ? getComputedStyle(nav).display !== "none" : false,
      navScrollable: nav ? nav.scrollHeight > nav.clientHeight + 1 : false,
      navClientHeight: nav?.clientHeight ?? 0,
      navScrollHeight: nav?.scrollHeight ?? 0,
      article: box(document.querySelector(".docs-article")),
      content: box(document.querySelector("[data-toc-root]")),
      toc: box(toc),
      tocVisible: toc
        ? getComputedStyle(toc).display !== "none" &&
          toc.getBoundingClientRect().width > 0
        : false,
      header: box(document.querySelector(".site-header .site-shell")),
      shell: box(document.querySelector("[data-docs-layout]")),
      gridColumns: grid ? getComputedStyle(grid).gridTemplateColumns : null,
      contentWidth: grid?.getAttribute("data-content-width") ?? null,
      triggerVisible: trigger ? trigger.getBoundingClientRect().width > 0 : false,
      stickyTop: nav ? getComputedStyle(nav).top : null,
      navOverflowsViewport: nav
        ? nav.getBoundingClientRect().bottom > window.innerHeight + 1
        : false,
      activeHref: active?.getAttribute("href") ?? null,
      activeVisible:
        activeRect !== undefined &&
        navRect !== undefined &&
        headRect !== undefined
          ? activeRect.top >= headRect.bottom - 1 &&
            activeRect.bottom <= navRect.bottom + 1
          : false,
    };
  });
}

async function tocHierarchy() {
  return page.evaluate(() => {
    const rail = document.querySelector("[data-toc-rail]");
    const links = rail
      ? Array.from(rail.querySelectorAll("a[href^='#']"))
      : [];
    const levels = links.map((link) => {
      const id = decodeURIComponent(link.getAttribute("href").slice(1));
      return document.getElementById(id)?.tagName ?? null;
    });
    const nested = links.filter((link) =>
      link.closest(".docs-toc-sublist"),
    ).length;
    return {
      links: links.length,
      sublists: rail?.querySelectorAll(".docs-toc-sublist").length ?? 0,
      levels,
      nested,
      h4: document.querySelectorAll("[data-toc-root] h4").length,
      h3: document.querySelectorAll("[data-toc-root] h3").length,
    };
  });
}

console.log("\n=== Docs navigation probe ===\n");

// ---------------------------------------------------------------------------
// Responsive geometry
// ---------------------------------------------------------------------------
for (const [width, height] of [
  [1920, 1080],
  [1648, 1000],
  [1600, 1000],
  [1440, 900],
  [1280, 900],
  [1024, 900],
  [768, 1000],
  [390, 844],
  [360, 800],
]) {
  console.log(`\nViewport ${width}×${height}`);
  await goto("/quick-start", width, height);
  const geometry = await layout();

  check(
    geometry.scrollWidth <= width + 1,
    `no horizontal page overflow (${geometry.scrollWidth}px)`,
  );
  near(geometry.header.left, geometry.shell.left, 1, "header aligns with docs shell (left)");
  near(geometry.header.right, geometry.shell.right, 1, "header aligns with docs shell (right)");

  if (width >= 1024) {
    check(geometry.navVisible, "desktop sidebar visible");
    check(!geometry.navOverflowsViewport, "sidebar stays inside the viewport");
    check(geometry.stickyTop !== "auto", "sidebar is sticky");
    check(
      Math.abs(geometry.nav.height - (height - 64 - 56)) <= 3,
      `sidebar fills the available viewport height (${geometry.nav.height.toFixed(0)}px)`,
    );
    check(
      width >= 1360
        ? geometry.nav.width >= 250 && geometry.nav.width <= 260
        : geometry.nav.width >= 235 && geometry.nav.width <= 245,
      `sidebar width ${geometry.nav.width.toFixed(0)}px`,
    );
    check(
      geometry.shell.width <= 1501,
      `expanded workspace width ${geometry.shell.width.toFixed(0)}px`,
    );
  } else {
    check(!geometry.navVisible, "sidebar replaced by drawer");
    check(geometry.triggerVisible, "documentation drawer trigger visible");
  }

  if (width >= 1360) {
    check(geometry.tocVisible, "contextual TOC visible");
    check(
      geometry.toc.width >= 190 && geometry.toc.width <= 230,
      `TOC width ${geometry.toc.width.toFixed(0)}px in 200–230 target band`,
    );
  } else {
    check(!geometry.tocVisible, "contextual TOC hidden where space is insufficient");
    if (width >= 1024) {
      check(
        await page.locator(".docs-toc-mobile").isVisible(),
        "compact On this page disclosure replaces the rail",
      );
    }
  }

  if (width >= 1024) {
    check(
      geometry.content.width >=
        (width >= 1440 ? 840 : width >= 1280 ? 900 : 650),
      `article receives ${geometry.content.width.toFixed(0)}px`,
    );
  }

  await shot(`quick-start-${width}`);
  notes.push({
    width,
    nav: geometry.nav?.width ?? 0,
    article: geometry.content?.width ?? 0,
    toc: geometry.toc?.width ?? 0,
    headerLeft: geometry.header.left,
    shellLeft: geometry.shell.left,
  });
}

// ---------------------------------------------------------------------------
// Direct load: the active route and its ancestors
// ---------------------------------------------------------------------------
console.log("\nDirect load active route (1920)");
await clearStorage();
await goto("/framework-guides/react", 1920, 1080);
const reactDirect = await layout();
await shot("react-expanded-1920");

check(
  reactDirect.activeHref === "/framework-guides/react",
  `React route highlights its Guide (${reactDirect.activeHref})`,
);
check(reactDirect.activeVisible, "active Guide is visible inside the sidebar scrollport");
check(
  (await sectionToggle("Framework Guides").getAttribute("aria-expanded")) === "true",
  "Framework Guides expands on direct load",
);
check(
  (await groupToggle("React").getAttribute("aria-expanded")) === "true",
  "React group expands on direct load",
);
check(
  (await sectionToggle("Getting Started").getAttribute("aria-expanded")) === "false",
  "unrelated Getting Started stays collapsed",
);
check(
  reactDirect.navClientHeight > 900,
  `sidebar uses viewport height (${reactDirect.navClientHeight}px)`,
);

const hierarchy = await tocHierarchy();
check(hierarchy.sublists > 0, `TOC groups H3s under H2s (${hierarchy.sublists} sublists)`);
check(hierarchy.links > 0, `TOC lists ${hierarchy.links} headings`);
check(
  hierarchy.levels.every((tag) => tag === "H2" || tag === "H3"),
  "TOC contains only H2/H3 targets",
);
check(!hierarchy.levels.includes("H4"), "TOC excludes H4 and deeper headings");
check(
  hierarchy.nested > 0 || hierarchy.h3 === 0,
  `TOC nests ${hierarchy.nested} secondary entries`,
);

// Open the last section so the tree is taller than the viewport, then verify
// the panel scrolls itself rather than the document.
await safeClick(sectionToggle("Reference & Resources"));
await page.waitForTimeout(500);
const scrollable = await layout();
check(scrollable.navScrollable, "long tree scrolls inside the sidebar");
await page.locator("nav[data-docs-sidebar]").evaluate((element) => {
  element.scrollTop = element.scrollHeight;
});
await page.waitForTimeout(200);
const bottomReachable = await page.evaluate(() => {
  const nav = document.querySelector("nav[data-docs-sidebar]");
  const last = nav?.querySelector('a[href="/roadmap"]');
  const head = nav?.querySelector(".docs-nav-head");
  if (!nav || !last || !head) return null;
  const lastRect = last.getBoundingClientRect();
  const navRect = nav.getBoundingClientRect();
  const headRect = head.getBoundingClientRect();
  return {
    visible:
      lastRect.top >= headRect.bottom - 1 &&
      lastRect.bottom <= navRect.bottom + 1,
    headTop: headRect.top,
    navTop: navRect.top,
  };
});
check(bottomReachable?.visible === true, "bottom of the navigation is reachable");
check(
  bottomReachable !== null &&
    Math.abs(bottomReachable.headTop - bottomReachable.navTop) < 2,
  "Documentation header stays fixed while the tree scrolls",
);

// Examples route: same ancestors, Examples leaf active instead of Guide.
await clearStorage();
await goto("/framework-guides/react/examples", 1920, 1080);
const examplesDirect = await layout();
check(
  examplesDirect.activeHref === "/framework-guides/react/examples",
  "Examples route highlights Examples",
);
check(
  examplesDirect.activeHref !== "/framework-guides/react",
  "the framework Guide link is not also current on Examples",
);
check(examplesDirect.activeVisible, "active Examples link is visible");
check(
  (await sectionToggle("Framework Guides").getAttribute("aria-expanded")) === "true" &&
    (await groupToggle("React").getAttribute("aria-expanded")) === "true",
  "Examples route expands both ancestors",
);
await shot("react-examples-1920");

// ---------------------------------------------------------------------------
// Client navigation: React → Vue, manual state preservation
// ---------------------------------------------------------------------------
console.log("\nClient navigation and manual state (1440)");
await clearStorage();
await goto("/framework-guides/react", 1440, 900);
const vueGroup = groupToggle("Vue 3");
check(
  (await vueGroup.getAttribute("aria-expanded")) === "false",
  "Vue group starts collapsed on React",
);
await safeClick(vueGroup);
await safeClick(page.locator('nav[data-docs-sidebar] a[href="/framework-guides/vue"]'));
await page.waitForURL("**/framework-guides/vue");
await page.waitForTimeout(400);
check(
  (await page
    .locator('nav[data-docs-sidebar] [aria-current="page"]')
    .getAttribute("href")) === "/framework-guides/vue",
  "navigating to Vue updates the active link",
);
check(
  (await groupToggle("Vue 3").getAttribute("aria-expanded")) === "true",
  "Vue parent is open",
);
check(
  (await groupToggle("React").getAttribute("aria-expanded")) === "false",
  "React group closes when it is not part of the new active trail",
);
check(
  (await sectionToggle("Framework Guides").getAttribute("aria-expanded")) === "true",
  "Framework Guides remains open",
);
await shot("framework-vue-active-1440");

await safeClick(sectionToggle("Themes"));
check(
  (await sectionToggle("Themes").getAttribute("aria-expanded")) === "true",
  "Themes opens manually",
);
// Client-side navigation keeps the module-level manual state, while a full
// reload deliberately starts from the active trail only.
await safeClick(groupToggle("React"));
await safeClick(page.locator('nav[data-docs-sidebar] a[href="/framework-guides/react"]'));
await page.waitForURL("**/framework-guides/react");
await page.waitForTimeout(400);
check(
  (await sectionToggle("Themes").getAttribute("aria-expanded")) === "true",
  "manually opened Themes survives client-side navigation",
);
check(
  (await groupToggle("React").getAttribute("aria-expanded")) === "true",
  "React is open after client-side navigation",
);
const persistedActive = await layout();
check(persistedActive.activeVisible, "active Guide is visible after client navigation");

await page.reload({ waitUntil: "networkidle" });
await page.waitForSelector("nav[data-docs-sidebar]", { state: "attached", timeout: 30000 });
await page.waitForTimeout(500);
const reloadedActive = await layout();
check(
  reloadedActive.activeHref === "/framework-guides/react" && reloadedActive.activeVisible,
  "active Guide is visible immediately after reload",
);
check(
  (await groupToggle("React").getAttribute("aria-expanded")) === "true",
  "active ancestors are open after reload",
);
check(
  (await sectionToggle("Themes").getAttribute("aria-expanded")) === "false",
  "manual-only groups do not reopen after reload",
);

// ---------------------------------------------------------------------------
// Tree interaction on Quick Start
// ---------------------------------------------------------------------------
console.log("\nTree interactions (1440)");
await clearStorage();
await goto("/quick-start", 1440, 900);

const gettingStarted = sectionToggle("Getting Started");
check(
  (await gettingStarted.getAttribute("aria-expanded")) === "true",
  "active section starts expanded",
);
await safeClick(gettingStarted);
check(
  (await gettingStarted.getAttribute("aria-expanded")) === "true",
  "active section cannot be collapsed out of view",
);

const themes = sectionToggle("Themes");
await safeClick(themes);
check(
  (await themes.getAttribute("aria-expanded")) === "true",
  "non-active section expands on click",
);
await safeClick(themes);
check(
  (await themes.getAttribute("aria-expanded")) === "false",
  "non-active section collapses on click",
);

const frameworks = sectionToggle("Framework Guides");
await safeClick(frameworks);
const react = groupToggle("React");
check(
  (await react.getAttribute("aria-expanded")) === "false",
  "nested framework group starts collapsed",
);
await safeClick(react);
check(
  (await react.getAttribute("aria-expanded")) === "true",
  "nested framework group expands",
);
check(
  await page
    .locator('nav[data-docs-sidebar] a[href="/framework-guides/react/examples"]')
    .isVisible(),
  "examples link nested under its framework",
);

const activeBefore = await page
  .locator('nav[data-docs-sidebar] [aria-current="page"]')
  .getAttribute("href");
check(activeBefore === "/quick-start", `active route highlighted (${activeBefore})`);

await safeClick(
  page.locator('nav[data-docs-sidebar] a[href="/framework-guides/react"]'),
);
await page.waitForURL("**/framework-guides/react");
await page.waitForTimeout(400);
check(
  (await page
    .locator('nav[data-docs-sidebar] [aria-current="page"]')
    .getAttribute("href")) === "/framework-guides/react",
  "guide route highlighted after client navigation",
);
check(
  (await groupToggle("React").getAttribute("aria-expanded")) === "true",
  "active framework parent stays expanded",
);
check(
  (await sectionToggle("Framework Guides").getAttribute("aria-expanded")) === "true",
  "active section stays expanded",
);
await shot("framework-guide-active-1440");

await safeClick(
  page.locator(
    'nav[data-docs-sidebar] a[href="/framework-guides/react/examples"]',
  ),
);
await page.waitForURL("**/framework-guides/react/examples");
await page.waitForTimeout(400);
check(
  (await page
    .locator('nav[data-docs-sidebar] [aria-current="page"]')
    .getAttribute("href")) === "/framework-guides/react/examples",
  "examples route highlighted, not the guide",
);
await shot("framework-examples-active-1440");

await goto("/cli/generate", 1440, 900);
check(
  (await page
    .locator('nav[data-docs-sidebar] [aria-current="page"]')
    .getAttribute("href")) === "/cli/generate",
  "deep CLI command highlighted",
);
check(
  (await groupToggle("Commands").getAttribute("aria-expanded")) === "true",
  "deep CLI parent auto-expanded",
);
check(
  (await sectionToggle("CLI").getAttribute("aria-expanded")) === "true",
  "deep CLI section auto-expanded",
);

// ---------------------------------------------------------------------------
// Desktop collapse: persistence and genuine grid reflow
// ---------------------------------------------------------------------------
console.log("\nDesktop collapse (1440)");
await clearStorage();
await goto("/quick-start", 1440, 900);
const restoreControl = page.locator('button[aria-label="Show documentation navigation"]');
check(
  (await restoreControl.count()) === 1,
  "restore control stays mounted while expanded (stable article child set)",
);
check(!(await restoreControl.isVisible()), "restore control is hidden while expanded");
const beforeCollapse = await layout();
await page.locator('button[aria-label="Collapse documentation navigation"]').click();
await page.waitForTimeout(350);
const collapsed = await layout();
check(!collapsed.navVisible, "desktop sidebar collapses");
check(collapsed.triggerVisible, "expand control remains available");
check(await restoreControl.isVisible(), "restore control becomes visible without remounting");
check(
  collapsed.content.width > beforeCollapse.content.width,
  "article gains width when collapsed",
);
check(
  collapsed.gridColumns?.trim().split(/\s+/).length === 2,
  `collapsed grid has two tracks (${collapsed.gridColumns})`,
);
await shot("collapsed-1440");

await page.reload({ waitUntil: "networkidle" });
await page.waitForSelector("nav[data-docs-sidebar]", {
  state: "attached",
  timeout: 30000,
});
await page.waitForTimeout(300);
const afterReload = await layout();
check(!afterReload.navVisible, "collapsed preference persists across reload");
await page.locator('button[aria-label="Show documentation navigation"]').click();
await page.waitForTimeout(300);
const expandedAgain = await layout();
check(expandedAgain.navVisible, "sidebar expands again");
check(
  expandedAgain.gridColumns?.trim().split(/\s+/).length === 3,
  `restored grid has three tracks (${expandedAgain.gridColumns})`,
);
check(
  await page.evaluate(
    () =>
      document.activeElement?.getAttribute("aria-label") ===
      "Collapse documentation navigation",
  ),
  "focus moves to the sidebar collapse control on expand",
);

console.log("\nCollapsed geometry at 1920");
await clearStorage();
await goto("/framework-guides/react", 1920, 1080);
const expandedGeometry = await layout();
await page.locator('button[aria-label="Collapse documentation navigation"]').click();
await page.waitForTimeout(350);
const collapsedGeometry = await layout();
const gapAfterCollapse =
  collapsedGeometry.toc.left - collapsedGeometry.content.right;
const leftGutter =
  collapsedGeometry.content.left - collapsedGeometry.shell.left;
const rightGutter =
  collapsedGeometry.shell.right - collapsedGeometry.toc.right;

check(!collapsedGeometry.navVisible, "sidebar track is gone at 1920");
check(
  collapsedGeometry.content.width >= 1000,
  `collapsed article is ${collapsedGeometry.content.width.toFixed(0)}px wide`,
);
check(
  collapsedGeometry.content.width <= 1060,
  "collapsed article stays within the 1000–1050 target band",
);
check(
  collapsedGeometry.shell.width <= 1361,
  `collapsed workspace is ${collapsedGeometry.shell.width.toFixed(0)}px wide (max 1360)`,
);
check(
  collapsedGeometry.toc.width >= 190 && collapsedGeometry.toc.width <= 210,
  `collapsed TOC is ${collapsedGeometry.toc.width.toFixed(0)}px wide`,
);
check(
  gapAfterCollapse >= 20 && gapAfterCollapse <= 60,
  `article-to-TOC gap is ${gapAfterCollapse.toFixed(0)}px`,
);
check(
  collapsedGeometry.toc.left < expandedGeometry.toc.left - 20,
  "TOC moves left with the article instead of staying pinned right",
);
check(
  Math.abs(leftGutter - rightGutter) <= 8,
  `outer gutters balance (${leftGutter.toFixed(0)} / ${rightGutter.toFixed(0)})`,
);
check(
  collapsedGeometry.scrollWidth <= 1921,
  "collapsed layout has no horizontal overflow",
);
await shot("react-collapsed-1920");

await page.locator('button[aria-label="Show documentation navigation"]').click();
await page.waitForTimeout(350);
const restoredGeometry = await layout();
check(restoredGeometry.navVisible, "sidebar restores from the collapsed control");
check(
  restoredGeometry.gridColumns?.trim().split(/\s+/).length === 3,
  "three-column grid is restored",
);
check(
  Math.abs(restoredGeometry.content.width - expandedGeometry.content.width) <= 2,
  "article returns to its expanded width",
);
check(
  Math.abs(restoredGeometry.toc.left - expandedGeometry.toc.left) <= 2,
  "TOC returns to its expanded position",
);
await shot("react-restored-1920");

console.log("\nWorkspace geometry at 1648");
await clearStorage();
await goto("/framework-guides/react", 1648, 1000);
const expanded1648 = await layout();
check(
  expanded1648.shell.width >= 1495 && expanded1648.shell.width <= 1501,
  `expanded workspace is ${expanded1648.shell.width.toFixed(0)}px wide (target 1500)`,
);
check(
  expanded1648.nav.width >= 250 && expanded1648.nav.width <= 260,
  `sidebar is ${expanded1648.nav.width.toFixed(0)}px wide`,
);
check(
  expanded1648.toc.width >= 190 && expanded1648.toc.width <= 210,
  `TOC is ${expanded1648.toc.width.toFixed(0)}px wide`,
);
check(
  Math.abs(expanded1648.content.width - 900) <= 3,
  `expanded article track is ${expanded1648.content.width.toFixed(0)}px`,
);
check(
  Math.abs(expanded1648.toc.left - expanded1648.content.right - 28) <= 2,
  `expanded article-to-TOC gap is ${(expanded1648.toc.left - expanded1648.content.right).toFixed(0)}px`,
);
near(expanded1648.header.left, expanded1648.shell.left, 1, "1648 header aligns (left)");
near(expanded1648.header.right, expanded1648.shell.right, 1, "1648 header aligns (right)");
await shot("react-expanded-1648");

// Sticky elements must not travel with the document. Their initial top is the
// same value as their sticky offset, so there is no visible "little scroll".
await page.evaluate(() => window.scrollTo(0, 600));
await page.waitForTimeout(350);
const afterScroll1648 = await layout();
check(
  Math.abs(afterScroll1648.nav.top - expanded1648.nav.top) <= 1,
  `sidebar stays pinned while scrolling (${afterScroll1648.nav.top.toFixed(1)}px)`,
);
check(
  Math.abs(afterScroll1648.toc.top - expanded1648.toc.top) <= 1,
  `TOC stays pinned while scrolling (${afterScroll1648.toc.top.toFixed(1)}px)`,
);
check(
  afterScroll1648.nav.top >= 95 && afterScroll1648.nav.top <= 97,
  "sticky top offset clears the global header",
);

// At the very bottom the side panels must stop before the footer.
await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
await page.waitForTimeout(400);
const footerClearance = await page.evaluate(() => {
  const nav = document.querySelector("nav[data-docs-sidebar]")?.getBoundingClientRect();
  const toc = document.querySelector("[data-toc-rail]")?.getBoundingClientRect();
  const footer = document.querySelector("footer")?.getBoundingClientRect();
  return nav && toc && footer
    ? { navBottom: nav.bottom, tocBottom: toc.bottom, footerTop: footer.top }
    : null;
});
check(
  footerClearance !== null && footerClearance.navBottom <= footerClearance.footerTop - 8,
  "sidebar clears the footer at the end of the page",
);
check(
  footerClearance !== null && footerClearance.tocBottom <= footerClearance.footerTop - 8,
  "TOC clears the footer at the end of the page",
);
await page.evaluate(() => window.scrollTo(0, 0));

await page.locator('button[aria-label="Collapse documentation navigation"]').click();
await page.waitForTimeout(350);
const collapsed1648 = await layout();
check(
  collapsed1648.shell.width >= 1355 && collapsed1648.shell.width <= 1361,
  `collapsed workspace is ${collapsed1648.shell.width.toFixed(0)}px wide (target 1360)`,
);
near(collapsed1648.header.left, collapsed1648.shell.left, 1, "collapsed header aligns (left)");
near(collapsed1648.header.right, collapsed1648.shell.right, 1, "collapsed header aligns (right)");
check(!collapsed1648.navVisible, "collapsed 1648 state removes the sidebar");
check(
  collapsed1648.content.width > expanded1648.content.width + 100,
  `collapsed article grows from ${expanded1648.content.width.toFixed(0)}px to ${collapsed1648.content.width.toFixed(0)}px`,
);
check(
  Math.abs(collapsed1648.toc.left - collapsed1648.content.right - 28) <= 2,
  `collapsed article-to-TOC gap is ${(collapsed1648.toc.left - collapsed1648.content.right).toFixed(0)}px`,
);
check(
  collapsed1648.gridColumns?.trim().split(/\s+/).length === 2,
  "collapsed 1648 grid has no empty sidebar track",
);
await shot("react-collapsed-1648");

await page.locator('button[aria-label="Show documentation navigation"]').click();
await page.waitForTimeout(350);
const restored1648 = await layout();
check(restored1648.navVisible, "sidebar restores at 1648");
check(
  restored1648.gridColumns?.trim().split(/\s+/).length === 3,
  "three-column grid restores at 1648",
);
check(
  Math.abs(restored1648.content.width - expanded1648.content.width) <= 2,
  "article returns to its expanded 1648 track",
);

for (const [width, height] of [
  [1280, 900],
  [1024, 900],
]) {
  console.log(`
Collapsed geometry at ${width}`);
  await clearStorage();
  await goto("/quick-start", width, height);
  const expanded = await layout();
  await page.locator('button[aria-label="Collapse documentation navigation"]').click();
  await page.waitForTimeout(350);
  const collapsed = await layout();
  check(!collapsed.navVisible, `sidebar track is gone at ${width}`);
  check(
    collapsed.content.width > expanded.content.width + 100,
    `article grows from ${expanded.content.width.toFixed(0)}px to ${collapsed.content.width.toFixed(0)}px`,
  );
  check(
    collapsed.gridColumns?.trim().split(/\s+/).length === 1,
    `collapsed ${width} grid has one track (no reserved sidebar or TOC)`,
  );
  check(!collapsed.tocVisible, "persistent TOC stays hidden at this width");
  check(
    await page.locator(".docs-toc-mobile").isVisible(),
    "compact TOC remains available",
  );
  check(collapsed.scrollWidth <= width + 1, "no horizontal overflow when collapsed");
  await shot(`collapsed-${width}`);
  await page.locator('button[aria-label="Show documentation navigation"]').click();
  await page.waitForTimeout(350);
  const restored = await layout();
  check(restored.navVisible, `sidebar restores at ${width}`);
  check(
    restored.gridColumns?.trim().split(/\s+/).length === 2,
    `two-column grid restores at ${width}`,
  );
}

// ---------------------------------------------------------------------------
// TOC behavior
// ---------------------------------------------------------------------------
console.log("\nOn this page (1440)");
await goto("/quick-start", 1440, 900);
const tocLinks = page.locator("[data-toc-rail] a[href^='#']");
check((await tocLinks.count()) >= 2, "desktop TOC lists headings");
const tocIndex = Math.min(2, (await tocLinks.count()) - 1);
const targetHref = await tocLinks.nth(tocIndex).getAttribute("href");
await tocLinks.nth(tocIndex).click();
await page.waitForTimeout(1000);
const anchor = await page.evaluate((href) => {
  const id = decodeURIComponent(href.slice(1));
  const heading = document.getElementById(id);
  const header =
    document.querySelector(".site-header")?.getBoundingClientRect().height ?? 64;
  return heading
    ? { top: heading.getBoundingClientRect().top, header }
    : null;
}, targetHref);
check(anchor !== null, "TOC anchor resolves to a heading");
if (anchor) {
  check(
    anchor.top >= anchor.header - 2,
    `heading clears the fixed header (top ${anchor.top.toFixed(2)}px)`,
  );
}
check(
  (await page.locator('[data-toc-rail] [aria-current="location"]').count()) === 1,
  "TOC marks one active section after navigation",
);

const lastHeading = await page.evaluate(() => {
  const headings = Array.from(
    document.querySelectorAll("[data-toc-root] h2"),
  );
  const target = headings[headings.length - 1];
  if (!target) return null;
  target.scrollIntoView({ behavior: "auto", block: "start" });
  return target.textContent?.trim() ?? null;
});
await page.waitForTimeout(900);
check(lastHeading !== null, "article has headings to scroll through");
const activeToc = await page
  .locator('[data-toc-rail] [aria-current="location"]')
  .first()
  .textContent()
  .catch(() => null);
check(activeToc !== null, `TOC follows scroll (${activeToc})`);

// ---------------------------------------------------------------------------
// Representative routes and active detection
// ---------------------------------------------------------------------------
console.log("\nRepresentative routes (1440)");
const routes = [
  ["/quick-start", "/quick-start"],
  ["/get-started", "/get-started"],
  ["/core-concepts", "/core-concepts"],
  ["/framework-guides", "/framework-guides"],
  ["/framework-guides/react", "/framework-guides/react"],
  ["/framework-guides/react/examples", "/framework-guides/react/examples"],
  ["/framework-guides/vue", "/framework-guides/vue"],
  ["/framework-guides/web", "/framework-guides/web"],
  ["/packages/core", "/packages/core"],
  ["/cli/installation", "/cli/installation"],
  ["/reference/compatibility", "/reference/compatibility"],
  ["/api-reference", "/api-reference"],
];
for (const [route, expected] of routes) {
  await goto(route, 1440, 900);
  const active = await page
    .locator('nav[data-docs-sidebar] [aria-current="page"]')
    .getAttribute("href");
  check(active === expected, `${route} highlights ${expected} (got ${active})`);
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth + 1,
  );
  check(!overflow, `${route} has no horizontal overflow`);
  if (route === "/api-reference") {
    const noToc = await layout();
    check(
      noToc.gridColumns?.trim().split(/\s+/).length === 2,
      "no-TOC pages drop the third grid track",
    );
    check(noToc.content.width > 1000, `no-TOC article receives ${noToc.content.width.toFixed(0)}px`);
  }
  if (route === "/framework-guides/react" || route === "/api-reference") {
    await shot(`${route.slice(1).replaceAll("/", "-")}-1440`);
  }
}

// ---------------------------------------------------------------------------
// Mobile drawer + mobile TOC + keyboard
// ---------------------------------------------------------------------------
console.log("\nContent width variants (1648)");

async function cardColumns(selector) {
  return page.evaluate((sel) => {
    const cards = Array.from(document.querySelectorAll(sel));
    if (cards.length === 0) return 0;
    const tops = cards.map((element) => Math.round(element.getBoundingClientRect().top));
    const first = Math.min(...tops);
    return tops.filter((top) => Math.abs(top - first) <= 1).length;
  }, selector);
}

await goto("/core-concepts", 1648, 1000);
const standardPage = await layout();
check(standardPage.contentWidth === "standard", "core-concepts uses the Standard content width");
const standardParagraph = await page.evaluate(() => {
  const paragraph = document.querySelector("[data-toc-root] .prose-doc p");
  return paragraph?.getBoundingClientRect().width ?? null;
});
check(
  standardPage.content.width >= 895,
  `Standard page still uses the ${standardPage.content.width.toFixed(0)}px track for components`,
);
check(
  standardParagraph !== null && standardParagraph >= 600 && standardParagraph <= 705,
  `Standard prose is ${standardParagraph?.toFixed(0)}px (44rem target)`,
);
await shot("content-standard-1648");

await goto("/quick-start", 1648, 1000);
const widePage = await layout();
check(widePage.contentWidth === "wide", "quick-start uses the Wide content width");
check(
  Math.abs(widePage.content.width - 900) <= 3,
  `Wide content uses the ${widePage.content.width.toFixed(0)}px article track`,
);
const desktopCardColumns = await cardColumns(".docs-card-grid button");
check(desktopCardColumns === 4, `framework cards use ${desktopCardColumns} columns at 900px`);
await shot("content-wide-1648");

await goto("/reference/compatibility", 1648, 1000);
const fullPage = await layout();
check(fullPage.contentWidth === "full", "compatibility uses the Full content width");
check(
  fullPage.content.width >= 895,
  `Full content uses the ${fullPage.content.width.toFixed(0)}px article track`,
);
const tableInfo = await page.evaluate(() => {
  const tables = Array.from(document.querySelectorAll("[data-toc-root] table"));
  return {
    count: tables.length,
    contained: tables.every((table) =>
      Boolean(table.closest(".overflow-x-auto, .prose-table-scroll")),
    ),
    pageOverflow: document.documentElement.scrollWidth > window.innerWidth + 1,
  };
});
check(tableInfo.count > 0, `compatibility renders ${tableInfo.count} tables`);
check(tableInfo.contained, "tables are wrapped in contained horizontal scrollers");
check(!tableInfo.pageOverflow, "tables do not create page-level overflow");
await shot("content-full-1648");

await goto("/api-reference", 1648, 1000);
const apiPage = await layout();
check(apiPage.contentWidth === "full", "API index uses the Full content width");
check(
  apiPage.content.width > 1000,
  `no-TOC API content receives ${apiPage.content.width.toFixed(0)}px`,
);
check(
  apiPage.gridColumns?.trim().split(/\s+/).length === 2,
  "API index has no reserved TOC track",
);
await shot("api-reference-1648");

await goto("/framework-guides/react", 1648, 1000);
const codeInfo = await page.evaluate(() => {
  const article = document.querySelector("[data-toc-root]")?.getBoundingClientRect();
  const blocks = Array.from(document.querySelectorAll("[data-toc-root] .code-block"));
  return {
    blocks: blocks.length,
    contained:
      article !== undefined &&
      blocks.every((block) => block.getBoundingClientRect().right <= article.right + 1),
  };
});
check(codeInfo.blocks > 0, `framework guide renders ${codeInfo.blocks} code blocks`);
check(codeInfo.contained, "code blocks stay inside the article track");

await goto("/quick-start", 390, 844);
const mobileCardColumns = await cardColumns(".docs-card-grid button");
check(
  mobileCardColumns === 2,
  `framework cards collapse to ${mobileCardColumns} columns on mobile`,
);

console.log("\nNarrow viewport (390)");
await clearStorage();
await goto("/framework-guides/react", 390, 844);
const mobileToc = page.locator(".docs-toc-mobile");
check(await mobileToc.isVisible(), "mobile On this page disclosure visible");
check((await mobileToc.getAttribute("open")) === null, "mobile TOC starts collapsed");
await mobileToc.locator("summary").click();
check((await mobileToc.getAttribute("open")) !== null, "mobile TOC expands");
check(
  (await mobileToc.locator(".docs-toc-mobile-sublist").count()) > 0,
  "mobile TOC keeps H3 hierarchy",
);
await shot("react-mobile-toc-390");
await mobileToc.locator("summary").click();

const drawerTrigger = page.locator(
  'button[aria-label="Open documentation navigation"]',
);
await drawerTrigger.click();
await page.waitForTimeout(450);
check(
  (await page.locator("#docs-drawer").getAttribute("aria-hidden")) === "false",
  "documentation drawer opens",
);
check(
  await page.evaluate(() => document.body.style.overflow === "hidden"),
  "drawer locks background scroll",
);
const drawerActive = await page.evaluate(() => {
  const panel = document.querySelector("#docs-drawer");
  const active = panel?.querySelector('[aria-current="page"]');
  if (!panel || !active) return null;
  const panelRect = panel.getBoundingClientRect();
  const rect = active.getBoundingClientRect();
  return {
    href: active.getAttribute("href"),
    visible: rect.top >= panelRect.top && rect.bottom <= panelRect.bottom,
  };
});
check(drawerActive?.href === "/framework-guides/react", "drawer opens on the active page");
check(drawerActive?.visible === true, "active page is visible when the drawer opens");
check(
  (await page.locator('#docs-drawer .docs-nav-group-toggle', { hasText: "React" }).getAttribute("aria-expanded")) ===
    "true",
  "drawer opens with the active framework group expanded",
);
await shot("mobile-drawer-390");
await page.keyboard.press("Escape");
await page.waitForTimeout(350);
check(
  (await page.locator("#docs-drawer").getAttribute("aria-hidden")) === "true",
  "Escape closes the drawer",
);
check(
  await page.evaluate(
    () =>
      document.activeElement?.getAttribute("aria-label") ===
      "Open documentation navigation",
  ),
  "focus returns to the drawer trigger",
);

await drawerTrigger.click();
await page.waitForTimeout(450);
await safeClick(
  page.locator('#docs-drawer a[href="/framework-guides/react/examples"]'),
);
await page.waitForURL("**/framework-guides/react/examples");
await page.waitForTimeout(450);
check(
  (await page.locator("#docs-drawer").getAttribute("aria-hidden")) === "true",
  "drawer closes after navigation",
);
check(
  (await page
    .locator('nav[data-docs-sidebar] [aria-current="page"]')
    .getAttribute("href")) === "/framework-guides/react/examples",
  "drawer navigation leaves the correct active page",
);

// Keyboard reachability and visible focus.
await page.keyboard.press("Tab");
await page.keyboard.press("Tab");
await page.keyboard.press("Tab");
const focus = await page.evaluate(() => {
  const element = document.activeElement;
  if (!element) return null;
  const style = getComputedStyle(element);
  return {
    tag: element.tagName,
    outline: style.outlineStyle,
    width: style.outlineWidth,
  };
});
check(focus !== null && focus.tag !== "BODY", "keyboard focus reaches page controls");
check(
  focus !== null && focus.outline !== "none",
  `focused element has a visible outline (${focus?.outline})`,
);

// Group toggles are real buttons with state and controls.
const a11y = await page.evaluate(() => {
  const toggles = Array.from(
    document.querySelectorAll("nav[data-docs-sidebar] [aria-expanded]"),
  );
  return {
    total: toggles.length,
    buttons: toggles.every((element) => element.tagName === "BUTTON"),
    labelled: toggles.every((element) =>
      Boolean(
        element.textContent?.trim() || element.getAttribute("aria-label"),
      ),
    ),
    controlled: toggles.every((element) => {
      const id = element.getAttribute("aria-controls");
      return Boolean(id && document.getElementById(id));
    }),
    links: document.querySelectorAll("nav[data-docs-sidebar] a[href]").length,
    nestedInteractive: document.querySelectorAll(
      "nav[data-docs-sidebar] a button, nav[data-docs-sidebar] button a",
    ).length,
  };
});
check(a11y.buttons, "expand/collapse controls are buttons");
check(a11y.controlled, "every toggle controls a real panel");
check(a11y.labelled, "every toggle has an accessible name");
check(a11y.links > 0, `sidebar exposes ${a11y.links} links`);
check(a11y.nestedInteractive === 0, "no nested interactive elements");

// Reduced motion (desktop, where the tree panel is visible).
await goto("/quick-start", 1440, 900);
await page.emulateMedia({ reducedMotion: "reduce" });
await safeClick(sectionToggle("Themes"));
const reduce = await page.evaluate(() => {
  const panel = document.querySelector(
    "nav[data-docs-sidebar] .docs-nav-collapse",
  );
  return panel ? getComputedStyle(panel).transitionDuration : null;
});
check(reduce === "0s", `reduced motion disables tree animation (${reduce})`);
await page.emulateMedia({ reducedMotion: "no-preference" });

await clearStorage();

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------
console.log("\nResponsive measurements");
for (const note of notes) {
  console.log(
    `  ${String(note.width).padStart(4)}px  nav ${note.nav.toFixed(0).padStart(3)}  article ${note.article.toFixed(0).padStart(3)}  toc ${note.toc.toFixed(0).padStart(3)}  header/shell left ${note.headerLeft.toFixed(0)}/${note.shellLeft.toFixed(0)}`,
  );
}

const relevantConsoleErrors = consoleErrors.filter(
  (message) =>
    !/Download the React DevTools|favicon|Failed to load resource: the server responded with a status of 404/i.test(
      message,
    ),
);
check(
  relevantConsoleErrors.length === 0,
  `no console/page errors (${relevantConsoleErrors.length})`,
);
for (const message of relevantConsoleErrors.slice(0, 10)) {
  console.log(`  console: ${message}`);
}

await browser.close();
if (server) server.kill("SIGKILL");

console.log(
  failures.length === 0
    ? "\n>>> PASS: docs navigation probe"
    : `\n>>> FAIL: ${failures.length} check(s) failed\n  - ${failures.join("\n  - ")}`,
);
process.exit(failures.length === 0 ? 0 : 1);
