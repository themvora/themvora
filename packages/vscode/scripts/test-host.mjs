#!/usr/bin/env node
/**
 * Runs the extension-host smoke test.
 *
 * A deliberately small launcher rather than `@vscode/test-electron`. Three
 * reasons, in order of importance:
 *
 * 1. **The environment must be sanitised.** Electron here inherits
 *    `ELECTRON_RUN_AS_NODE=1` and a `NODE_OPTIONS` value, which make
 *    `Code.exe` run as plain Node — it rejects every VS Code flag with "bad
 *    option". Any launcher has to strip those, so a wrapper is unavoidable.
 * 2. **The installed editor is used, not a downloaded one.** The check is meant
 *    to prove the extension works in the editor the user actually runs.
 * 3. **No new dependency.** The package already ships no runtime dependencies,
 *    and this is a dev-only script of ~120 lines.
 *
 * The result file, not the exit code, is authoritative: VS Code can exit 0 even
 * when a test throws, so the in-host module writes its verdict before failing.
 *
 * @see test/host/smoke.cjs — the checks themselves
 */
import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const smokeModule = join(packageRoot, "test", "host", "smoke.cjs");
const timeoutMs = Number(process.env.THEMVORA_HOST_TIMEOUT ?? 180_000);

/**
 * Which way the extension is loaded.
 *
 * - `dev` — `--extensionDevelopmentPath`, i.e. the source tree, exactly what F5
 *   does. Catches a broken build or manifest.
 * - `vsix` — the packaged archive installed into a throwaway extensions
 *   directory. Catches a `.vsix` that packages wrongly, which the dev path
 *   cannot see because it never reads the archive.
 */
const mode = process.argv.includes("--vsix") ? "vsix" : "dev";

/**
 * Locate a real VS Code executable.
 *
 * The `code` shell wrapper is not used: it detaches and returns 0 before the
 * window closes, which would report success for a test that never ran.
 *
 * @returns The executable path, or `null` when none is found.
 */
function findExecutable() {
  const explicit = process.env.VSCODE_EXECUTABLE;
  if (explicit) return existsSync(explicit) ? explicit : null;

  const candidates = [];

  if (process.platform === "win32") {
    if (process.env.LOCALAPPDATA) {
      candidates.push(join(process.env.LOCALAPPDATA, "Programs", "Microsoft VS Code", "Code.exe"));
    }
    if (process.env.ProgramFiles) {
      candidates.push(join(process.env.ProgramFiles, "Microsoft VS Code", "Code.exe"));
    }
    if (process.env["ProgramFiles(x86)"]) {
      candidates.push(join(process.env["ProgramFiles(x86)"], "Microsoft VS Code", "Code.exe"));
    }
  } else if (process.platform === "darwin") {
    candidates.push("/Applications/Visual Studio Code.app/Contents/MacOS/Electron");
  } else {
    // The real binary first; `/usr/bin/code` is a wrapper that detaches.
    candidates.push("/usr/share/code/code", "/snap/bin/code", "/usr/bin/code");
  }

  return candidates.find((candidate) => existsSync(candidate)) ?? null;
}

/** Remove a directory, ignoring failures. */
function remove(dir) {
  try {
    rmSync(dir, { recursive: true, force: true });
  } catch {
    /* a locked temp directory is not worth failing the run over */
  }
}

const executable = findExecutable();
if (!executable) {
  console.error(
    "No VS Code executable found.\n" +
      "Set VSCODE_EXECUTABLE to the editor binary, or install VS Code in a standard location.",
  );
  process.exit(1);
}

if (!existsSync(join(packageRoot, "dist", "index.js"))) {
  console.error("dist/index.js is missing. Run `pnpm build` first (or use `pnpm test:host`).");
  process.exit(1);
}

const workspace = mkdtempSync(join(tmpdir(), "themvora-host-workspace-"));
const profile = mkdtempSync(join(tmpdir(), "themvora-host-profile-"));
const userData = join(profile, "user-data");
const extensions = join(profile, "extensions");
const resultPath = join(profile, "result.json");

mkdirSync(userData, { recursive: true });
mkdirSync(extensions, { recursive: true });

// A project the inspection can actually read, so the run exercises the tree and
// status bar rather than an empty window.
writeFileSync(
  join(workspace, "package.json"),
  JSON.stringify({ name: "host-smoke", dependencies: { "@themvora/core": "^1.4.0" } }, null, 2),
);

const args = [
  workspace,
  `--extensionTestsPath=${smokeModule}`,
  `--user-data-dir=${userData}`,
  `--extensions-dir=${extensions}`,
  // A headless-ish desktop: without these the GPU process dies and the renderer
  // goes with it, which looks exactly like a failed activation.
  "--no-sandbox",
  "--disable-gpu",
  "--disable-workspace-trust",
  "--skip-welcome",
  "--skip-release-notes",
];

// In dev mode the source tree is the extension; in vsix mode the archive
// installed below is, so the development path must not be present.
if (mode === "dev") args.unshift(`--extensionDevelopmentPath=${packageRoot}`);

// The host must not inherit the agent/CI Electron variables.
const env = { ...process.env, THEMVORA_HOST_RESULT: resultPath };
delete env.ELECTRON_RUN_AS_NODE;
delete env.NODE_OPTIONS;

console.log(`VS Code:   ${executable}`);
console.log(`Mode:      ${mode}`);
console.log(`Workspace: ${workspace}`);

if (mode === "vsix") {
  const archives = readdirSync(packageRoot).filter((name) => name.endsWith(".vsix"));
  if (archives.length === 0) {
    console.error("\nNo .vsix found. Run `pnpm package` first.");
    process.exit(1);
  }

  const archive = join(packageRoot, archives.sort().at(-1));
  const extracted = join(profile, "unpacked");
  mkdirSync(extracted, { recursive: true });

  console.log(`Archive:   ${archive}`);

  // The archive is unpacked and the *unpacked* extension is launched, rather
  // than using `--install-extension`. In this environment the installer starts
  // the full application instead of running CLI-only and never completes, so it
  // is not a usable check. Unpacking still exercises the thing under test — the
  // packaged bytes — because a `.vsix` that omitted a file fails to activate
  // exactly as an installed one would.
  const unpack = spawnSync("unzip", ["-o", "-q", archive, "-d", extracted], {
    encoding: "utf8",
  });

  if (unpack.error || unpack.status !== 0) {
    console.error("\nCould not unpack the .vsix (is `unzip` available?).");
    if (unpack.error) console.error(unpack.error.message);
    remove(profile);
    remove(workspace);
    process.exit(1);
  }

  const packaged = join(extracted, "extension");
  if (!existsSync(join(packaged, "package.json"))) {
    console.error("\nThe .vsix does not contain extension/package.json.");
    remove(profile);
    remove(workspace);
    process.exit(1);
  }

  console.log("Unpacked.\n");

  // Swap the launch target from the source tree to the packaged copy.
  const devArgIndex = args.findIndex((arg) => arg.startsWith("--extensionDevelopmentPath="));
  if (devArgIndex >= 0) args[devArgIndex] = `--extensionDevelopmentPath=${packaged}`;
  else args.unshift(`--extensionDevelopmentPath=${packaged}`);
}

console.log("");

const child = spawn(executable, args, { env, stdio: ["ignore", "pipe", "pipe"] });

let stderr = "";
child.stderr.on("data", (chunk) => {
  stderr += String(chunk);
});

let timedOut = false;
const timer = setTimeout(() => {
  timedOut = true;
  child.kill();
}, timeoutMs);

child.on("close", (code) => {
  clearTimeout(timer);

  let result = null;
  try {
    result = JSON.parse(readFileSync(resultPath, "utf8"));
  } catch {
    /* reported below */
  }

  if (result === null) {
    console.error(`The extension host produced no result (exit ${code}).`);
    if (timedOut) console.error(`It was killed after ${timeoutMs} ms.`);
    const tail = stderr.trim().split("\n").slice(-12).join("\n");
    if (tail) console.error(`\nLast stderr:\n${tail}`);
    remove(profile);
    remove(workspace);
    process.exit(1);
  }

  console.log(`Extension host: VS Code ${result.vscodeVersion}`);
  for (const entry of result.results) {
    console.log(`  ${entry.ok ? "PASS" : "FAIL"}  ${entry.name}${entry.detail ? ` — ${entry.detail}` : ""}`);
  }

  // A host that exits mid-run still leaves the checks it completed. Treating a
  // partial record as success is how a hang gets shipped as a pass.
  const incomplete = result.complete !== true;
  const failed = result.failed;

  console.log("");
  if (incomplete) {
    console.log(
      `FAIL: the extension host stopped after ${result.results.length} check(s), before finishing.` +
        (timedOut ? ` It was killed after ${timeoutMs} ms.` : ""),
    );
  } else {
    console.log(failed === 0 ? `OK: ${result.results.length} checks passed.` : `FAIL: ${failed} check(s) failed.`);
  }

  if (process.env.THEMVORA_HOST_KEEP !== "1") {
    remove(profile);
    remove(workspace);
  } else {
    console.log(`Kept: ${workspace} and ${profile}`);
  }

  process.exit(failed === 0 && !incomplete ? 0 : 1);
});
