#!/usr/bin/env node
/**
 * Verify the packaged VSIX is self-contained.
 *
 * `bundle.test.ts` checks the *built* bundle. This checks the *packaged
 * artifact*, which is the thing users install and the thing that can differ:
 * `vsce` decides what ships, and `--no-dependencies` means nothing is vendored
 * beside it.
 *
 * The invariants, each of which has broken a real release somewhere:
 *
 * 1. `main` in the packaged manifest points at a file that is actually in the
 *    archive.
 * 2. No `node_modules` is shipped — if one appears, a dependency was declared as
 *    a runtime dependency and the extension now needs it on disk.
 * 3. The host bundle has no bare `@themvora/` import. Core is inlined by tsup;
 *    a bare import would fail at activation with "Cannot find module".
 * 4. The browser assets exist, and the manifest still declares the Studio command
 *    and the webview view they belong to.
 * 5. Source, tests and build config are not shipped.
 *
 * Usage: `node scripts/verify-vsix.mjs [path/to.vsix]`
 *
 * @packageDocumentation
 */
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

const packageRoot = join(import.meta.dirname, "..");

/** The archive to check: the argument, or the newest `.vsix` beside it. */
function findArchive() {
  const argument = process.argv[2];
  if (argument !== undefined) return argument;

  const candidates = readdirSync(packageRoot).filter((name) => name.endsWith(".vsix"));
  if (candidates.length === 0) return undefined;
  return join(packageRoot, candidates.sort().at(-1) ?? "");
}

/**
 * List the archive's members.
 *
 * @param archive - The `.vsix` path.
 * @returns Every entry name.
 */
function entries(archive) {
  const output = execFileSync("unzip", ["-Z1", archive], { encoding: "utf8" });
  return output.split("\n").map((line) => line.trim()).filter((line) => line.length > 0);
}

/**
 * Read one member.
 *
 * @param archive - The `.vsix` path.
 * @param name - The member name.
 * @returns Its text.
 */
function read(archive, name) {
  return execFileSync("unzip", ["-p", archive, name], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
}

const archive = findArchive();
if (archive === undefined || !existsSync(archive)) {
  console.error("No .vsix found. Run `pnpm package` first, or pass a path.");
  process.exit(1);
}

const names = entries(archive);
/** `./dist/index.js` and `dist/index.js` are the same member. */
const normalise = (path) => path.replace(/^\.\//u, "");
const has = (suffix) => {
  const target = normalise(suffix);
  return names.some((name) => name === `extension/${target}` || name.startsWith(`extension/${target}`));
};
const failures = [];

/** Record a check. */
function check(ok, description, detail = "") {
  if (ok) {
    console.log(`  PASS  ${description}`);
    return;
  }
  console.log(`  FAIL  ${description}${detail === "" ? "" : ` — ${detail}`}`);
  failures.push(description);
}

console.log(`Verifying ${archive}`);

// 1. The manifest and its entry point.
const manifest = JSON.parse(read(archive, "extension/package.json"));
const main = typeof manifest.main === "string" ? normalise(manifest.main) : "";
check(main.length > 0, "the manifest declares an entry point", String(manifest.main));
check(has(main), "the entry point is in the archive", main);

// 2. Nothing vendored.
const vendored = names.filter((name) => name.includes("node_modules/"));
check(vendored.length === 0, "no node_modules is shipped", vendored.slice(0, 3).join(", "));

// 3. Core is inlined, not imported.
//
// Anchored to the start of a line: esbuild hoists every import to column 0, while
// the bundle also contains *string literals* that write `import … from
// "@themvora/core"` into the files a user saves. Those are content, not imports.
const host = read(archive, `extension/${main}`);
const bare = /^import[^\n]*["']@themvora\//mu.exec(host);
check(bare === null, "the host bundle has no bare @themvora import", bare?.[0] ?? "");
check(!/^\s*import\s*\(\s*["']@themvora\//mu.test(host), "the host bundle has no dynamic @themvora import");

// 4. The browser assets and what declares them.
check(has("dist/webview/studio.js"), "the webview script ships");
check(has("dist/webview/studio.css"), "the webview stylesheet ships");
check(
  has("dist/webview/studio.css") && [".tvc-card", ".tvd", ".tvp"].every((selector) => read(archive, "extension/dist/webview/studio.css").includes(selector)),
  "the webview stylesheet carries the shared preview surface",
);
check(
  (manifest.contributes?.commands ?? []).some((command) => command.command === "themvora.openStudio"),
  "the Studio command is contributed",
);
check(
  (manifest.contributes?.views ?? {})["themvora"] !== undefined,
  "the Activity Bar view is contributed",
);

// 5. Source stays out.
check(!has("src/"), "source is not shipped");
check(!has("test/"), "tests are not shipped");
check(!has("webview/"), "webview source is not shipped");
check(!has("tsconfig"), "build config is not shipped");

console.log(
  failures.length === 0
    ? `\nOK: ${archive.split(/[\\/]/u).at(-1)} is self-contained.`
    : `\nFAIL: ${failures.length} check(s) failed.`,
);
process.exit(failures.length === 0 ? 0 : 1);
