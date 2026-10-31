/**
 * Portable environment resolution shared by the docs browser probes
 * (`apps/docs/scripts/probe-*.mjs`).
 *
 * The probes drive `next dev` with a real Chromium through `playwright-core`.
 * Playwright lives with the example verification harness rather than in this
 * app, so it is resolved from there instead of being added as a dependency here.
 *
 * Nothing in this module may hardcode a machine path or depend on an environment
 * variable that only exists on one host:
 *
 *   - Chromium comes from Playwright's own installation (`CHROME_PATH` wins).
 *   - The interpreter is the Node already running the probe (`PROBE_NODE` wins).
 *   - The port is per-probe, overridable with `PROBE_PORT`.
 *
 * The probes are manual/CI-optional checks, not part of `docs:release-gate`:
 * they need a Chromium download and a live `next dev`.
 */
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";

const here = path.dirname(fileURLToPath(import.meta.url));

/** `playwright-core`, resolved from the example verification harness. */
const toolsRequire = createRequire(
  path.join(here, "../../../../examples/apps/_tools/"),
);

export const { chromium } = toolsRequire("playwright-core");

/**
 * Resolve the Chromium executable.
 *
 * `CHROME_PATH` wins. Otherwise we ask `playwright-core` for its expected
 * path, but if that binary doesn't exist (the installed browser revision can
 * drift ahead of the pinned `playwright-core` version) we scan the Playwright
 * cache for the newest `chromium-*` directory and use its `chrome.exe` /
 * `chrome` binary instead.
 */
export const CHROME = (() => {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;

  const expected = chromium.executablePath();
  if (fs.existsSync(expected)) return expected;

  const platform = os.platform();
  const cacheDir =
    platform === "win32"
      ? path.join(process.env.LOCALAPPDATA ?? "", "ms-playwright")
      : platform === "darwin"
        ? path.join(process.env.HOME ?? "", "Library", "Caches", "ms-playwright")
        : path.join(process.env.HOME ?? "", ".cache", "ms-playwright");

  if (!fs.existsSync(cacheDir)) return expected;

  const dirs = fs
    .readdirSync(cacheDir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && d.name.startsWith("chromium-"))
    .sort()
    .reverse();

  for (const dir of dirs) {
    const sub = fs.readdirSync(path.join(cacheDir, dir.name));
    const chromeDir = sub.find((s) => s.startsWith("chrome-win") || s.startsWith("chrome-mac") || s.startsWith("chrome-linux"));
    if (!chromeDir) continue;
    const exe = platform === "win32" ? "chrome.exe" : "chrome";
    const full = path.join(cacheDir, dir.name, chromeDir, exe);
    if (fs.existsSync(full)) return full;
  }

  return expected;
})();

/** The Node running this probe — never a hardcoded interpreter path. */
export const NODE = process.env.PROBE_NODE ?? process.execPath;

/**
 * The port this probe's dev server should listen on.
 *
 * @param fallback - the probe's own default, used when `PROBE_PORT` is unset.
 */
export function probePort(fallback) {
  const raw = Number(process.env.PROBE_PORT ?? fallback);
  if (!Number.isInteger(raw) || raw <= 0 || raw > 65535) {
    throw new Error(`PROBE_PORT must be a valid TCP port, got "${process.env.PROBE_PORT}"`);
  }
  return raw;
}

/** The docs app directory (`apps/docs`) — the probes' `next` working directory. */
export const docsDir = path.join(here, "..", "..");

/**
 * The `next` binary path.
 *
 * pnpm hoists `next` to the monorepo root, so `apps/docs/node_modules/next`
 * does not exist. We resolve from the root `node_modules/next/dist/bin/next`
 * instead of the `.bin` shim, since the shim is a shell script that needs
 * to be executed directly, not passed to `node`.
 */
export const nextBin = path.join(here, "../../../../node_modules/next/dist/bin/next");
