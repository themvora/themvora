#!/usr/bin/env node
/**
 * Browser probe for the documentation search dialog.
 *
 * Verifies the presentation layer against the real generated index:
 * grouping, breadcrumbs, framework identities, keyboard navigation, click
 * destinations, empty/loading states, responsive overflow, and the duplicate
 * React-key warning that the old flat list could trigger.
 *
 * Usage:
 *   node scripts/probe-search-dialog.mjs
 *   PROBE_BASE=http://127.0.0.1:3000 node scripts/probe-search-dialog.mjs
 */
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";

import {
  CHROME,
  NODE,
  chromium,
  docsDir,
  probePort,
} from "./lib/probe-env.mjs";

// pnpm does not hoist `next` to the workspace root, so resolve it the same way
// Next itself is resolved from the docs package instead of assuming a path.
const requireFromDocs = createRequire(join(docsDir, "package.json"));
const NEXT_BIN = requireFromDocs.resolve("next/dist/bin/next");

const externalBase = process.env.PROBE_BASE ?? null;
const PORT = probePort(4555);
const base = externalBase ?? `http://127.0.0.1:${PORT}`;
const shotDir = join(docsDir, ".badges", "search-dialog");
mkdirSync(shotDir, { recursive: true });

let server = null;
if (!externalBase) {
  server = spawn(NODE, [NEXT_BIN, "dev", "-p", String(PORT)], {
    cwd: docsDir,
    stdio: "ignore",
    env: { ...process.env, NODE_OPTIONS: "" },
  });
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

for (let i = 0; i < 180; i++) {
  try {
    const response = await fetch(`${base}/`, { signal: AbortSignal.timeout(4000) });
    if (response.status < 500) break;
  } catch {
    /* not listening yet */
  }
  await sleep(1000);
}

const browser = await chromium.launch({ executablePath: CHROME, headless: true });
const failures = [];
const check = (condition, message) => {
  if (!condition) failures.push(message);
};

async function openDialog(page) {
  await page.locator('button[aria-label="Search documentation"]').first().click();
  await page.waitForFunction(
    () => {
      const dialog = document.querySelector("[role=dialog]");
      return dialog instanceof HTMLElement && !dialog.inert;
    },
    null,
    { timeout: 10000 },
  );
  await page.waitForTimeout(200);
}

async function closeDialog(page) {
  await page.keyboard.press("Escape");
  await page.waitForFunction(
    () => {
      const dialog = document.querySelector("[role=dialog]");
      return !(dialog instanceof HTMLElement) || dialog.inert;
    },
    null,
    { timeout: 5000 },
  );
}

async function search(page, query) {
  const input = page.locator(".search-dialog-input");
  await input.fill(query);
  await page.waitForTimeout(500);
}

function options(page) {
  return page.locator("#search-results [role=option]");
}

async function screenshot(page, name) {
  await page.locator("#search-dialog").screenshot({ path: join(shotDir, name) });
}

async function main() {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    colorScheme: "light",
  });
  const page = await context.newPage();
  const consoleProblems = [];
  let indexRequests = 0;
  page.on("request", (request) => {
    if (new URL(request.url()).pathname === "/search-index.json") indexRequests += 1;
  });
  page.on("console", (message) => {
    if (message.type() !== "error" && message.type() !== "warning") return;
    const text = message.text();
    if (/Encountered two children with the same key/i.test(text)) {
      consoleProblems.push(text);
    }
    if (/hydration|did not match/i.test(text)) {
      consoleProblems.push(text);
    }
  });
  page.on("pageerror", (error) => {
    consoleProblems.push(error.message);
  });

  let step = "home";
  try {
    await page.goto(`${base}/`, { waitUntil: "domcontentloaded", timeout: 90000 });
    await page.waitForSelector('button[aria-label="Search documentation"]');
    await page.waitForTimeout(800);

    // --- no-query state ----------------------------------------------------
    step = "no-query";
    console.log("  · no-query state");
    await openDialog(page);
    await page
      .locator("#search-dialog")
      .getByText("Search the Themvora documentation")
      .waitFor({ timeout: 20000 });
    check(
      (await page.locator("#search-dialog").innerText()).includes(
        "Search the Themvora documentation",
      ),
      "no-query state should invite a search",
    );
    await closeDialog(page);

    // --- useProvidedThemes: the acceptance case ---------------------------
    step = "useProvidedThemes";
    console.log("  · useProvidedThemes");
    await openDialog(page);
    await search(page, "useProvidedThemes");

    const resultOptions = await options(page);
    const resultCount = await resultOptions.count();
    check(resultCount >= 8, `useProvidedThemes should show its variants, got ${resultCount}`);

    const categoryLabels = await page
      .locator("#search-results > [role=group]")
      .evaluateAll((groups) => groups.map((group) => group.getAttribute("aria-label")));
    check(
      categoryLabels.includes("API Reference"),
      `expected an API Reference group, got ${categoryLabels.join(", ")}`,
    );

    const symbolHeaders = await page.locator("#search-results [role=group]").evaluateAll(
      (groups) =>
        groups
          .map((group) => group.getAttribute("aria-label"))
          .filter((label) => label?.startsWith("useProvidedThemes")),
    );
    check(
      symbolHeaders.some((label) => label?.includes("10 variants")),
      "useProvidedThemes should render one symbol header with its variant count",
    );

    const optionTexts = await resultOptions.allInnerTexts();
    const joined = optionTexts.join(" ").replace(/\s+/g, " ");
    for (const label of ["Web Components", "Svelte 5", "Astro", "React", "Vue 3"]) {
      check(joined.includes(label), `useProvidedThemes variants should identify ${label}`);
    }

    const optionRoutes = await resultOptions.evaluateAll((nodes) =>
      nodes.map((node) => node.getAttribute("data-route")),
    );
    check(
      optionRoutes.every((route) => route?.startsWith("/")),
      "every variant should expose a canonical destination",
    );
    check(
      new Set(optionRoutes).size === optionRoutes.length,
      "variant destinations should be distinct",
    );
    check(
      indexRequests === 1,
      `the index should be fetched once per session, got ${indexRequests} requests`,
    );
    check(
      joined.includes("API Reference / Web Components"),
      "variant rows should carry a human-readable breadcrumb",
    );
    check(
      !/\/api-reference\//.test(joined),
      "variant rows should not display raw route fragments",
    );

    const activeId = await page
      .locator(".search-dialog-input")
      .getAttribute("aria-activedescendant");
    check(Boolean(activeId), "the first result should be active");
    const selectedCount = await page
      .locator('#search-results [role=option][aria-selected="true"]')
      .count();
    check(selectedCount === 1, `exactly one result should be selected, got ${selectedCount}`);

    await screenshot(page, "use-provided-themes.png");

    // --- keyboard navigation ---------------------------------------------
    step = "keyboard";
    console.log("  · keyboard");
    await page.locator(".search-dialog-input").focus();
    await page.keyboard.press("ArrowDown");
    await page.waitForTimeout(150);
    const nextId = await page
      .locator(".search-dialog-input")
      .getAttribute("aria-activedescendant");
    check(nextId !== activeId, "ArrowDown should move the active result");

    for (let i = 0; i < 8; i++) await page.keyboard.press("ArrowDown");
    await page.waitForTimeout(200);
    const lastId = await page
      .locator(".search-dialog-input")
      .getAttribute("aria-activedescendant");
    const visible = await page.evaluate((id) => {
      const option = id ? document.getElementById(id) : null;
      const scroller = option?.closest(".overflow-y-auto");
      if (!option || !scroller) return false;
      const optionRect = option.getBoundingClientRect();
      const scrollerRect = scroller.getBoundingClientRect();
      return optionRect.top >= scrollerRect.top - 1 && optionRect.bottom <= scrollerRect.bottom + 1;
    }, lastId);
    check(visible, "the active result should be scrolled into view");

    await page.keyboard.press("ArrowUp");
    await page.waitForTimeout(150);
    const previousId = await page
      .locator(".search-dialog-input")
      .getAttribute("aria-activedescendant");
    check(previousId !== lastId, "ArrowUp should move the active result back");

    // --- Enter navigates to the active leaf -------------------------------
    step = "enter";
    console.log("  · enter navigation");
    const destination = await page.evaluate((id) => {
      const option = id ? document.getElementById(id) : null;
      return option?.textContent?.includes("API Reference") ? true : false;
    }, previousId);
    check(destination, "the active option should belong to API Reference");
    await page.keyboard.press("Enter");
    await page.waitForURL(/\/api-reference\//, { timeout: 20000 });
    check(
      /\/api-reference\//.test(page.url()),
      `Enter should navigate to the API page, landed on ${page.url()}`,
    );

    // --- click a child row -----------------------------------------------
    step = "click";
    console.log("  · click navigation");
    await page.goto(`${base}/`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector('button[aria-label="Search documentation"]');
    await page.waitForTimeout(500);
    await openDialog(page);
    await search(page, "useProvidedThemes");
    const webRow = page.locator('#search-results [role=option]').filter({
      hasText: "Web Components",
    });
    check((await webRow.count()) > 0, "the Web Components variant should be clickable");
    await webRow.first().click();
    await page.waitForURL(/\/api-reference\//, { timeout: 10000 });
    check(
      /\/api-reference\/web/.test(page.url()),
      `clicking the Web Components variant should open /api-reference/web, landed on ${page.url()}`,
    );

    // --- ThemeProvider and broad query ------------------------------------
    step = "theme-provider";
    console.log("  · ThemeProvider / broad theme");
    await page.goto(`${base}/`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector('button[aria-label="Search documentation"]');
    await page.waitForTimeout(500);
    await openDialog(page);
    await search(page, "ThemeProvider");
    check((await options(page).count()) > 0, "ThemeProvider should return results");
    await screenshot(page, "theme-provider.png");

    await search(page, "theme");
    const broadCategories = await page
      .locator("#search-results > [role=group]")
      .evaluateAll((groups) => groups.map((group) => group.getAttribute("aria-label")));
    check(
      broadCategories.length > 1,
      `a broad query should span multiple categories, got ${broadCategories.join(", ")}`,
    );
    await screenshot(page, "broad-theme.png");

    // --- required query coverage ------------------------------------------
    step = "required-queries";
    console.log("  · required queries");
    for (const query of [
      "initialMode",
      "themeOverride",
      "React",
      "Web Components",
      "@themvora/core",
      "persist",
    ]) {
      await search(page, query);
      const count = await options(page).count();
      check(count > 0, `query "${query}" should return results, got ${count}`);
      const labels = await page
        .locator("#search-results > [role=group]")
        .evaluateAll((groups) => groups.map((group) => group.getAttribute("aria-label")));
      check(labels.length > 0, `query "${query}" should render at least one group`);
    }

    // The two reported regressions: broad "use" should not collapse into
    // duplicate "Use Cases" rows, and `useTheme()` should resolve the hook.
    await search(page, "use");
    const useText = (await options(page).allInnerTexts()).join(" ").replace(/\s+/g, " ");
    check(!/Use Cases|\bsnippet\d*\b/.test(useText), 'query "use" still shows generated mirror rows');
    await screenshot(page, "use.png");

    await search(page, "useTheme()");
    const useThemeText = (await options(page).allInnerTexts())
      .join(" ")
      .replace(/\s+/g, " ");
    check(/useTheme/i.test(useThemeText), "useTheme() should resolve the useTheme hook");
    check(!/\bsnippet\d*\b/.test(useThemeText), "useTheme() still shows generated snippet labels");
    await screenshot(page, "use-theme.png");

    // --- empty state ------------------------------------------------------
    step = "no-results";
    console.log("  · no-results state");
    await search(page, "zzzz-no-such-result");
    check(
      (await page.locator("#search-dialog").innerText()).includes("No results for"),
      "unmatched queries should show a no-results message",
    );
    await screenshot(page, "no-results.png");
    await closeDialog(page);

    // --- loading state, with a delayed index ------------------------------
    step = "loading";
    console.log("  · loading state");
    const loadingContext = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      colorScheme: "light",
    });
    const loadingPage = await loadingContext.newPage();
    await loadingPage.route("**/search-index.json", async (route) => {
      await sleep(1200);
      await route.continue();
    });
    await loadingPage.goto(`${base}/`, { waitUntil: "domcontentloaded" });
    await loadingPage.waitForSelector('button[aria-label="Search documentation"]');
    await loadingPage.waitForTimeout(500);
    await openDialog(loadingPage);
    check(
      (await loadingPage.locator("#search-dialog").innerText()).includes(
        "Loading search index",
      ),
      "the loading state should be visible while the index is delayed",
    );
    await screenshot(loadingPage, "loading.png");
    await loadingPage.locator(".search-dialog-input").fill("useProvidedThemes");
    await loadingPage.waitForSelector("#search-results [role=option]", {
      timeout: 15000,
    });
    await screenshot(loadingPage, "loaded-after-delay.png");
    await loadingContext.close();

    // --- error + retry ----------------------------------------------------
    step = "error";
    console.log("  · error state");
    const errorContext = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      colorScheme: "light",
    });
    const errorPage = await errorContext.newPage();
    let failRequests = true;
    await errorPage.route("**/search-index.json", async (route) => {
      if (failRequests) {
        await route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ error: "search index unavailable" }),
        });
        return;
      }
      await route.continue();
    });
    await errorPage.goto(`${base}/`, { waitUntil: "domcontentloaded" });
    await errorPage.waitForSelector('button[aria-label="Search documentation"]');
    await errorPage.waitForTimeout(500);
    await openDialog(errorPage);
    await errorPage
      .locator("#search-dialog")
      .getByText(/Failed to load search index/)
      .waitFor({ timeout: 15000 });
    check(
      (await errorPage.locator("#search-dialog").innerText()).includes("Retry"),
      "the error state should offer a retry action",
    );
    await screenshot(errorPage, "error.png");
    failRequests = false;
    await errorPage.locator("#search-dialog button", { hasText: "Retry" }).click();
    await errorPage.locator(".search-dialog-input").fill("useProvidedThemes");
    await errorPage.waitForSelector("#search-results [role=option]", {
      timeout: 15000,
    });
    check(
      (await errorPage.locator("#search-results [role=option]").count()) > 0,
      "retry should recover and show results",
    );
    await errorContext.close();

    // --- responsive overflow ---------------------------------------------
    step = "responsive";
    console.log("  · responsive");
    for (const width of [1024, 768, 390, 360]) {
      const responsive = await browser.newContext({
        viewport: { width, height: width <= 390 ? 844 : 900 },
        colorScheme: "light",
      });
      const responsivePage = await responsive.newPage();
      await responsivePage.goto(`${base}/`, { waitUntil: "domcontentloaded" });
      await responsivePage.waitForSelector('button[aria-label="Search documentation"]');
      await responsivePage.waitForTimeout(500);
      await openDialog(responsivePage);
      await search(responsivePage, "useProvidedThemes");

      const overflow = await responsivePage.evaluate(() => ({
        viewport: window.innerWidth,
        document: document.documentElement.scrollWidth,
        dialog: document.querySelector("#search-dialog")?.getBoundingClientRect().right ?? 0,
      }));
      check(
        overflow.document <= overflow.viewport + 1,
        `${width}px: the page should not overflow horizontally (${overflow.document}px)`,
      );
      check(
        overflow.dialog <= overflow.viewport + 1,
        `${width}px: the dialog should stay inside the viewport (${overflow.dialog}px)`,
      );

      if (width === 390) {
        await screenshot(responsivePage, "mobile.png");
      }
      await responsiveContextCleanup(responsive, responsivePage);
    }

    // --- dark theme -------------------------------------------------------
    step = "dark";
    console.log("  · dark theme");
    await page.goto(`${base}/`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector('button[aria-label="Search documentation"]');
    await page.waitForTimeout(500);
    const darkToggle = page.locator('button[aria-label="Switch to Dark"]');
    if ((await darkToggle.count()) > 0) {
      await darkToggle.first().click();
      await page.waitForTimeout(400);
    }
    await openDialog(page);
    await search(page, "useProvidedThemes");
    const theme = await page.evaluate(() =>
      document.documentElement.getAttribute("data-theme"),
    );
    check(Boolean(theme), "dark-theme screenshot should run with a resolved theme");
    await screenshot(page, "dark.png");

    check(
      consoleProblems.length === 0,
      `console warnings/errors: ${consoleProblems.join(" | ")}`,
    );
  } catch (error) {
    failures.push(`${step} — ${error.message.split("\n")[0]}`);
  } finally {
    await context.close();
    await browser.close();
    server?.kill();
  }

  if (failures.length) {
    console.error("\nSearch dialog failures:\n");
    for (const failure of failures) console.error(`  ✗ ${failure}`);
    console.error(`\n${failures.length} failure(s).`);
    process.exitCode = 1;
  } else {
    console.log("Search dialog: OK");
    console.log(`  screenshots: ${shotDir}`);
  }
}

async function responsiveContextCleanup(context, page) {
  await page.close();
  await context.close();
}

main().catch((error) => {
  console.error("FAILED:", error.message);
  server?.kill();
  process.exitCode = 1;
});
