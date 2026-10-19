#!/usr/bin/env node
/**
 * Executable documentation tests.
 *
 * Reads `examples.json` — the documented CLI examples — and runs every one
 * against an **isolated** temporary fixture, then asserts what it claimed to do.
 * This is the extension of the existing external-consumer verification path the
 * plan asks for: the same idea (drive the shipped binary and check the result),
 * applied to the examples the documentation actually prints.
 *
 * Three things this catches that a unit test cannot:
 *
 * 1. **A documented example that does not run.** The docs and the READMEs are
 *    prose; nothing else executes them.
 * 2. **A documented flag the parser rejects.** Every `--flag` in the manifest is
 *    checked against `command-schema.json`, and every command in the schema must
 *    appear at least once — so the example set cannot drift from the contract in
 *    either direction.
 * 3. **A "read-only" command that writes.** `writesNothing` and
 *    `unchangedPaths` assert the filesystem is untouched, which is the promise
 *    `--plan` and `--dry-run` make.
 *
 * Usage:
 *   node run-examples.mjs            # run every example
 *   node run-examples.mjs --filter init
 *   node run-examples.mjs --json
 *
 * The CLI is driven through real file descriptors rather than `execSync`'s piped
 * stdout: some hosts cannot spawn a child with a pipe at all, and this runner has
 * to work on the same machines the rest of the repository does.
 */
import { spawnSync } from "node:child_process";
import {
  closeSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  openSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "..", "..");

/** The built CLI. `dist/cli.cjs` is the published entry point. */
const CLI = join(repoRoot, "packages", "cli", "dist", "cli.cjs");
const SCHEMA = join(repoRoot, "packages", "cli", "src", "command-schema.json");
const MANIFEST = join(here, "examples.json");

const filter = (() => {
  const index = process.argv.indexOf("--filter");
  return index === -1 ? null : process.argv[index + 1];
})();
const asJson = process.argv.includes("--json");

if (!existsSync(CLI)) {
  console.error(`✗ ${CLI} not found — run \`npm run build\` in packages/cli first.`);
  process.exit(1);
}

/**
 * Run the CLI with a real-fd stdout/stderr capture.
 *
 * @param {string[]} argv - Arguments after `themvora`.
 * @param {string} cwd - Working directory.
 * @returns {{ status: number, stdout: string, stderr: string }}
 */
function runCli(argv, cwd) {
  const dir = mkdtempSync(join(tmpdir(), "themvora-example-"));
  const outFile = join(dir, "out");
  const errFile = join(dir, "err");
  const outFd = openSync(outFile, "w");
  const errFd = openSync(errFile, "w");

  let result;
  try {
    result = spawnSync(process.execPath, [CLI, ...argv], {
      cwd,
      stdio: ["ignore", outFd, errFd],
      windowsHide: true,
    });
  } finally {
    closeSync(outFd);
    closeSync(errFd);
  }

  const stdout = readFileSync(outFile, "utf8");
  const stderr = readFileSync(errFile, "utf8");
  rmSync(dir, { recursive: true, force: true });

  return { status: result.status ?? 1, stdout, stderr };
}

/** A stable snapshot of a directory tree, for the "writes nothing" checks. */
function snapshot(root, prefix = "") {
  const out = {};
  for (const entry of readdirSync(join(root, prefix), { withFileTypes: true })) {
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) Object.assign(out, snapshot(root, relative));
    else out[relative] = readFileSync(join(root, relative), "utf8");
  }
  return out;
}

/** The long flags a command accepts, from the contract. */
function flagsFor(schema, commandName) {
  const spec = schema.commands.find((command) => command.name === commandName);
  if (!spec) return null;
  return new Set(spec.options.flatMap((option) => [option.flag, ...(option.aliases ?? [])]));
}

// ---------------------------------------------------------------------------
// Contract sync — run before anything executes, so a broken example fails fast.
// ---------------------------------------------------------------------------
const schema = JSON.parse(readFileSync(SCHEMA, "utf8"));
const manifest = JSON.parse(readFileSync(MANIFEST, "utf8"));

const syncProblems = [];
const coveredCommands = new Set();

for (const example of manifest.examples) {
  const [commandName] = example.argv;
  const allowed = flagsFor(schema, commandName);

  if (!allowed) {
    syncProblems.push(`${example.id}: unknown command "${commandName}"`);
    continue;
  }
  coveredCommands.add(commandName);

  for (const token of example.argv.slice(1)) {
    if (!token.startsWith("--")) continue;
    const flag = token.includes("=") ? token.slice(0, token.indexOf("=")) : token;
    if (!allowed.has(flag) && !schema.global.options.some((option) => option.flag === flag)) {
      syncProblems.push(`${example.id}: "${flag}" is not in the contract for "${commandName}"`);
    }
  }
}

for (const spec of schema.commands) {
  if (!coveredCommands.has(spec.name)) {
    syncProblems.push(`no documented example covers the "${spec.name}" command`);
  }
}

if (syncProblems.length > 0) {
  console.error("✗ examples.json is out of sync with the command contract:");
  for (const problem of syncProblems) console.error(`    ${problem}`);
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Execute
// ---------------------------------------------------------------------------
const results = [];

for (const example of manifest.examples) {
  if (filter && !example.id.includes(filter)) continue;

  const problems = [];
  const fixture = mkdtempSync(join(tmpdir(), "themvora-fixture-"));
  const work = join(fixture, "work");

  try {
    // A React + Vite project the `init`, `add`, `doctor` and `audit` examples can
    // work against. It deliberately declares no build or typecheck script, so
    // `init` plans no verification command and the run stays offline — real
    // scaffolding lives in the smoke test, not here.
    mkdirSync(join(work, "src"), { recursive: true });
    writeFileSync(
      join(work, "package.json"),
      JSON.stringify(
        {
          name: "example-fixture",
          private: true,
          type: "module",
          dependencies: { react: "^19.0.0", "react-dom": "^19.0.0" },
          devDependencies: { vite: "^6.0.0" },
        },
        null,
        2,
      ),
    );
    writeFileSync(
      join(work, "vite.config.ts"),
      'import { defineConfig } from "vite";\n\nexport default defineConfig({\n  plugins: [],\n});\n',
    );
    writeFileSync(
      join(work, "src", "main.tsx"),
      'import { createRoot } from "react-dom/client";\nimport App from "./App";\n\ncreateRoot(document.getElementById("root")!).render(<App />);\n',
    );
    writeFileSync(
      join(work, "src", "App.tsx"),
      "export default function App() {\n  return <h1>Mine</h1>;\n}\n",
    );

    for (const setup of example.setup ?? []) {
      runCli(setup, work);
    }

    const before = snapshot(work);
    const result = runCli(example.argv, work);
    const after = snapshot(work);

    const expectedExit = example.exit ?? 0;
    if (result.status !== expectedExit) {
      problems.push(`exit ${result.status}, expected ${expectedExit}: ${result.stderr.slice(0, 300)}`);
    }

    for (const needle of example.stdoutContains ?? []) {
      if (!result.stdout.includes(needle)) problems.push(`stdout missing ${JSON.stringify(needle)}`);
    }
    for (const needle of example.stdoutNotContains ?? []) {
      if (result.stdout.includes(needle)) problems.push(`stdout unexpectedly contains ${JSON.stringify(needle)}`);
    }
    for (const needle of example.stderrContains ?? []) {
      if (!result.stderr.includes(needle)) problems.push(`stderr missing ${JSON.stringify(needle)}`);
    }

    if (example.stdoutIsJson) {
      try {
        JSON.parse(result.stdout);
      } catch {
        problems.push("stdout is not valid JSON");
      }
    }

    if (example.validateStdoutAsTheme) {
      const themeFile = join(work, "generated-theme.json");
      writeFileSync(themeFile, result.stdout);
      const validation = runCli(["validate", themeFile], work);
      if (validation.status !== 0) {
        problems.push(`the generated theme does not validate: ${validation.stdout.slice(0, 200)}`);
      }
    }

    if (example.writesNothing) {
      const changed = [...new Set([...Object.keys(before), ...Object.keys(after)])].filter(
        (key) => before[key] !== after[key],
      );
      if (changed.length > 0) problems.push(`wrote ${changed.join(", ")} but promised not to`);
    }

    for (const path of example.unchangedPaths ?? []) {
      if (before[path] !== after[path]) problems.push(`${path} changed but promised not to`);
    }

    for (const path of example.writes ?? []) {
      if (!existsSync(join(work, path))) problems.push(`did not write ${path}`);
    }
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }

  results.push({ id: example.id, argv: example.argv, problems });
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------
const failed = results.filter((result) => result.problems.length > 0);

if (asJson) {
  console.log(JSON.stringify({ total: results.length, failed: failed.length, results }, null, 2));
} else {
  for (const result of results) {
    if (result.problems.length === 0) {
      console.log(`✓ ${result.id}`);
    } else {
      console.log(`✗ ${result.id} — themvora ${result.argv.join(" ")}`);
      for (const problem of result.problems) console.log(`    ${problem}`);
    }
  }
  console.log("");
  console.log(
    `Documented examples: ${results.length} run, ${results.length - failed.length} ok, ${failed.length} failed.`,
  );
  console.log(
    `Contract coverage: ${coveredCommands.size}/${schema.commands.length} commands have a documented example.`,
  );
}

process.exit(failed.length === 0 ? 0 : 1);
