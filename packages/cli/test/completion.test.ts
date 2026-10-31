/**
 * Tests for `themvora completion`.
 *
 * The bash script is **executed**, not just inspected. That matters: the first
 * version of it cached registry values under a key built from a variable that
 * bash had not assigned yet, so every registry shared one cache entry and the
 * first one fetched answered for all of them. The generated text looked correct.
 * Only running it showed `--brand` returning presets.
 *
 * The other assertions are structural: registry values must **not** be embedded,
 * because embedding is what would make completions go stale.
 */
import { closeSync, existsSync, openSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { COMMAND_SPECS } from "../src/command-schema.js";
import { buildCompletionSpec, PROGRAM } from "../src/completion/spec.js";
import { renderBash } from "../src/completion/bash.js";
import { renderZsh } from "../src/completion/zsh.js";
import { renderFish } from "../src/completion/fish.js";
import { renderPowerShell } from "../src/completion/powershell.js";
import { cli, tempDir, type TempDir } from "./helpers.js";

let dir: TempDir | null = null;

afterEach(() => {
  dir?.cleanup();
  dir = null;
});

/** The four renderers, and the extension each script is saved with. */
const SHELLS = [
  ["bash", renderBash, "bash"],
  ["zsh", renderZsh, "zsh"],
  ["fish", renderFish, "fish"],
  ["powershell", renderPowerShell, "ps1"],
] as const;

/** Whether a working bash is available to execute the generated script. */
function bashPath(): string | null {
  // `stdio: "ignore"`, not `encoding`: setting `encoding` implies a piped
  // stdout, and this host cannot spawn a child with a pipe at all.
  const probe = spawnSync("bash", ["--version"], { stdio: "ignore" });
  return probe.status === 0 ? "bash" : null;
}

/**
 * Budget for a test that executes a generated script.
 *
 * Those tests spawn bash, and bash spawns `node dist/cli.cjs` once per registry
 * it is asked about — four processes for the shared-cache case. That is
 * inherently slower than the in-process tests the default budget was chosen
 * for. Measured on the maintainer host: 1.8 s with the suite alone, 4.6 s while
 * all 24 packages run in parallel. Against the 5 s default that is a 9 % margin,
 * so the test failed whenever the machine was busy — a timeout that reports
 * "busy machine" as "broken product". This is deliberately far above the
 * observed worst case; the inner {@link BASH_TIMEOUT_MS} is what catches a
 * genuinely wedged shell.
 */
const SCRIPT_TEST_TIMEOUT_MS = 60_000;

/**
 * Budget for a single bash invocation inside a test.
 *
 * Without it, a hung driver silently eats the whole test budget and the failure
 * reads as a bare timeout with no output. With it, the driver is killed and the
 * assertion below names what happened.
 */
const BASH_TIMEOUT_MS = 30_000;

describe("completion output", () => {
  it("renders a script for every supported shell", () => {
    for (const [, render, extension] of SHELLS) {
      const script = render(buildCompletionSpec());
      expect(script.length, `${extension} script is empty`).toBeGreaterThan(200);
      expect(script).toContain(PROGRAM);
    }
  });

  it("covers every command in the contract", () => {
    const spec = buildCompletionSpec();
    for (const command of COMMAND_SPECS) {
      for (const [, render] of SHELLS) {
        expect(render(spec), `${command.name} missing`).toContain(command.name);
      }
    }
  });

  it("covers every long flag in the contract", () => {
    const spec = buildCompletionSpec();
    for (const command of COMMAND_SPECS) {
      const rendered = renderBash(spec);
      for (const option of command.options) {
        if (!option.flag.startsWith("--")) continue;
        expect(rendered, `${command.name} ${option.flag} missing`).toContain(option.flag);
      }
    }
  });

  it("resolves registry values at completion time instead of embedding them", () => {
    // The whole point: no second copy of any value list. Every shell must ask
    // the CLI for the values rather than carrying the ids.
    for (const [name, render] of SHELLS) {
      const script = render(buildCompletionSpec());

      expect(script, `${name} does not call the CLI for values`).toContain("--ids");
      expect(script, `${name} does not read the registry`).toContain("list");

      // A canonical id must not appear as a literal.
      expect(script, `${name} embeds a preset id`).not.toContain("graphite");
      expect(script, `${name} embeds a brand id`).not.toContain("discord");
      expect(script, `${name} embeds a style id`).not.toContain("editorial");
    }
  });

  it("parameterises the registry selector where the shell allows it", () => {
    // Bash and zsh take a selector variable; fish and PowerShell emit one line
    // per registry, so theirs are literal.
    expect(renderBash(buildCompletionSpec())).toContain('list "$selector" --ids');
    expect(renderZsh(buildCompletionSpec())).toContain('list "$selector" --ids');

    for (const selector of ["presets", "brands", "styles", "frameworks"]) {
      expect(renderFish(buildCompletionSpec())).toContain(`list ${selector} --ids`);
      expect(renderPowerShell(buildCompletionSpec())).toContain(`list $Selector --ids`);
    }
  });
});

describe("completion command", () => {
  it("writes the script to stdout with nothing else", async () => {
    const result = await cli("completion", "bash");

    expect(result.code).toBe(0);
    expect(result.stderr).toBe("");
    expect(result.stdout).toContain(`complete -o default -F _themvora_complete ${PROGRAM}`);
  });

  it("accepts the shell as a flag", async () => {
    const result = await cli("completion", "--shell", "fish");
    expect(result.code).toBe(0);
    expect(result.stdout).toContain(`complete -c ${PROGRAM}`);
  });

  it("fails with a usage error when no shell is named", async () => {
    const result = await cli("completion");

    expect(result.code).toBe(2);
    expect(result.stderr).toContain("a shell is required");
  });

  it("rejects an unknown shell", async () => {
    const result = await cli("completion", "tcsh");

    expect(result.code).toBe(2);
    expect(result.stderr).toContain('unknown shell "tcsh"');
  });
});

describe("the bash script, executed", () => {
  const bash = bashPath();

  /**
   * Run a driver script through bash and return the lines it printed.
   *
   * Shared by every test that executes the completion script, so all of them get
   * the same three guarantees: real file descriptors (this host cannot read a
   * child's piped stdio), a status check that names the driver instead of
   * letting a crash surface as a confusing assertion on empty output, and a
   * timeout.
   *
   * @param work - The temp dir the driver and its output file live in.
   * @param lines - The driver script, one array entry per line.
   * @returns The non-empty lines the driver printed.
   */
  function runDriver(work: TempDir, lines: readonly string[]): string[] {
    const driverFile = join(work.path, "drive.sh");
    const outFile = join(work.path, "out.txt");
    writeFileSync(driverFile, lines.join("\n"), "utf8");

    const fd = openSync(outFile, "w");
    let result;
    try {
      result = spawnSync(bash!, [driverFile], {
        stdio: ["ignore", fd, fd],
        timeout: BASH_TIMEOUT_MS,
      });
    } finally {
      closeSync(fd);
    }

    expect(
      result.error?.message,
      `bash driver did not run: ${result.error?.message}`,
    ).toBeUndefined();
    expect(result.status, `bash driver exited ${result.status}`).toBe(0);

    const raw = existsSync(outFile) ? readFileSync(outFile, "utf8") : "";
    return raw.split("\n").filter((line) => line.length > 0);
  }

  /**
   * Drive the completion function and return what it offered.
   *
   * @param script - The generated completion script.
   * @param words - The command line as the shell sees it.
   * @param cword - The index of the word being completed.
   * @returns The completions, one per line.
   */
  function complete(script: string, words: readonly string[], cword: number): string[] {
    dir = tempDir();
    const scriptFile = join(dir.path, "themvora.bash");
    writeFileSync(scriptFile, script, "utf8");

    // `themvora` is a shell function rather than a PATH entry, so the test does
    // not depend on the binary being installed. Subshells inherit it, which is
    // what the command substitution inside the script relies on.
    const cliPath = join(process.cwd(), "dist", "cli.cjs");
    return runDriver(dir, [
      `themvora() { node ${JSON.stringify(cliPath)} "$@"; }`,
      `source ${JSON.stringify(scriptFile)}`,
      `COMP_WORDS=(${words.map((word) => JSON.stringify(word)).join(" ")})`,
      `COMP_CWORD=${cword}`,
      `_themvora_complete`,
      `printf '%s\\n' "\${COMPREPLY[@]}"`,
    ]);
  }

  it.skipIf(bash === null)(
    "passes a syntax check",
    () => {
      dir = tempDir();
      const file = join(dir.path, "themvora.bash");
      writeFileSync(file, renderBash(buildCompletionSpec()), "utf8");

      // No `encoding`: it would imply a piped stdout, which this host cannot spawn.
      const result = spawnSync(bash!, ["-n", file], {
        stdio: "ignore",
        timeout: BASH_TIMEOUT_MS,
      });
      expect(result.status).toBe(0);
    },
    SCRIPT_TEST_TIMEOUT_MS,
  );

  it.skipIf(bash === null)(
    "completes command names, including aliases",
    () => {
      const offered = complete(renderBash(buildCompletionSpec()), [PROGRAM, ""], 1);
      expect(offered).toContain("generate");
      expect(offered).toContain("init");
      expect(offered).toContain("gen");
      expect(offered).toContain("ls");
    },
    SCRIPT_TEST_TIMEOUT_MS,
  );

  it.skipIf(bash === null)(
    "filters command names by prefix",
    () => {
      const offered = complete(renderBash(buildCompletionSpec()), [PROGRAM, "gen"], 1);
      expect(offered).toEqual(["generate", "gen"]);
    },
    SCRIPT_TEST_TIMEOUT_MS,
  );

  it.skipIf(bash === null)(
    "completes a closed value set",
    () => {
      const offered = complete(
        renderBash(buildCompletionSpec()),
        [PROGRAM, "generate", "--mode", ""],
        3,
      );
      expect(offered).toEqual(["light", "dark", "both"]);
    },
    SCRIPT_TEST_TIMEOUT_MS,
  );

  it.skipIf(bash === null)(
    "completes a positional value set",
    () => {
      const offered = complete(renderBash(buildCompletionSpec()), [PROGRAM, "list", ""], 2);
      expect(offered).toEqual(["brands", "presets", "styles", "frameworks"]);
    },
    SCRIPT_TEST_TIMEOUT_MS,
  );

  it.skipIf(bash === null)(
    "completes flags for the current command",
    () => {
      const offered = complete(renderBash(buildCompletionSpec()), [PROGRAM, "init", "--"], 2);
      expect(offered).toContain("--framework");
      expect(offered).toContain("--preset");
      // A flag from another command must not leak in.
      expect(offered).not.toContain("--strict");
    },
    SCRIPT_TEST_TIMEOUT_MS,
  );

  it.skipIf(bash === null)(
    "resolves each registry from its own source, with a shared cache",
    () => {
      // The regression: every registry shared one cache entry, so the first
      // fetched answered for all of them. Driving them in sequence in one shell
      // is what exposes it — separate shells each populated the cache once and
      // looked correct.
      dir = tempDir();
      const scriptFile = join(dir.path, "themvora.bash");
      writeFileSync(scriptFile, renderBash(buildCompletionSpec()), "utf8");

      const cliPath = join(process.cwd(), "dist", "cli.cjs");
      const lines = runDriver(dir, [
        `themvora() { node ${JSON.stringify(cliPath)} "$@"; }`,
        `source ${JSON.stringify(scriptFile)}`,
        `ask() { COMP_WORDS=(${JSON.stringify(PROGRAM)} "$1" "$2" ""); COMP_CWORD=3; _themvora_complete; printf '%s: %s\\n' "$2" "\${COMPREPLY[*]}"; }`,
        `ask generate --preset`,
        `ask generate --brand`,
        `ask generate --style`,
        `ask init --framework`,
      ]);

      const byFlag = Object.fromEntries(
        lines.map((line) => [line.slice(0, line.indexOf(":")), line.slice(line.indexOf(":") + 2)]),
      );

      expect(byFlag["--preset"]).toContain("mint");
      expect(byFlag["--preset"]).not.toContain("apple");

      expect(byFlag["--brand"]).toContain("apple");
      expect(byFlag["--brand"]).not.toContain("mint");

      expect(byFlag["--style"]).toContain("balanced");

      expect(byFlag["--framework"]).toContain("react");
      expect(byFlag["--framework"]).not.toContain("mint");
    },
    SCRIPT_TEST_TIMEOUT_MS,
  );
});
