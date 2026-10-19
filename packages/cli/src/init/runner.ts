/**
 * The process runner for `init`.
 *
 * Isolated in its own module because it is the one place `init` crosses out of
 * Node, and the platform behaviour it has to work around is unusual enough to
 * deserve explaining rather than burying.
 *
 * @packageDocumentation
 */
import { spawnSync } from "node:child_process";
import type { StdioOptions } from "node:child_process";
import type { ApplyIo } from "./apply.js";

/**
 * A project name that is safe to pass to a generator.
 *
 * The scaffold command is the only place user input reaches a child process, and
 * on Windows that process is launched through a shell (see
 * {@link createProcessRunner}), where an unquoted argument can be interpreted as
 * shell syntax. Restricting the name to an ordinary directory-name character set
 * removes the whole class of problem, and every generator accepts these names
 * anyway.
 */
export const SAFE_PROJECT_NAME = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

/** Whether a value is a safe project name. */
export function isSafeProjectName(name: string): boolean {
  return name === "." || SAFE_PROJECT_NAME.test(name);
}

/**
 * The stdio a scaffold, install or verification command is given.
 *
 * stdin is inherited, so a generator that wants to prompt still can. **The
 * child's stdout is not inherited** — it is pointed at the parent's stderr,
 * because a child command's output is commentary and the CLI's stdout is
 * reserved for its payload.
 *
 * This is not a stylistic preference. With `"inherit"` the generator's banner
 * and the verification build's output were written straight into the middle of
 * `themvora init --json`'s own report, so the payload was not parseable JSON:
 *
 * ```text
 * > create-vite my-app --template react-ts
 * …
 * > my-app@0.0.0 build
 * { "version": 1, "projectPath": … }
 * ```
 *
 * A consumer piping `init --json` into a JSON parser saw the whole thing as
 * corrupt. The invariant is that nothing but the command's own payload is ever
 * written to fd 1, and this is where that is enforced.
 *
 * @returns The stdio configuration for a child command.
 */
export function childCommandStdio(): StdioOptions {
  return ["inherit", 2, 2];
}

/**
 * Build the real command runner.
 *
 * @param stdio - The stdio to give child commands. Defaults to
 *   {@link childCommandStdio}; injectable so a test can capture a child's output
 *   through file descriptors, which is the only way to observe it on a host
 *   where piped child stdio is unavailable.
 * @returns A runner that forwards child output to the parent's stderr.
 *
 * @remarks
 * Two platform facts drive this implementation:
 *
 * - **A shell is required on Windows.** `npm`, `npx`, `pnpm` and `yarn` are
 *   `.cmd` shims. Spawning them without a shell fails with `ENOENT`, and
 *   spawning the `.cmd` directly fails with `EINVAL`. The shell is therefore
 *   enabled on Windows only, and the one piece of user input that reaches a
 *   command — the scaffolded project name — is validated by
 *   {@link isSafeProjectName} before it gets there.
 * - **Piped stdio is unusable here.** File descriptors are used rather than
 *   `"pipe"` so the run works on hosts where a piped child fails outright.
 *
 * Exit status is the contract: `0` is success. Output is not parsed.
 */
export function createProcessRunner(stdio: StdioOptions = childCommandStdio()): ApplyIo["run"] {
  return (command, options) => {
    const result = spawnSync(command.command, [...command.args], {
      cwd: options.cwd,
      stdio,
      shell: needsShell(command.command),
      windowsHide: true,
    });

    if (result.error) {
      return { ok: false, detail: result.error.message };
    }
    if (result.status !== 0) {
      return {
        ok: false,
        detail: `exited with code ${result.status ?? "unknown"}`,
      };
    }
    return { ok: true };
  };
}

/**
 * Whether a command must be launched through a shell on this platform.
 *
 * A shell is required **only** for Windows `.cmd`/`.bat` shims — the `.cmd`
 * files `npm`, `npx`, `pnpm` and `yarn` install. Spawning those without a shell
 * fails with `ENOENT`, and spawning the `.cmd` directly fails with `EINVAL`.
 *
 * Everything else is spawned directly. A shell joins the command and its
 * arguments into one unescaped command line, so any argument containing a quote
 * or a space is re-parsed by `cmd.exe` and silently changes meaning — `-e
 * "process.exit(7)"` becomes `-e process.exit(7)`, which is a syntax error, and
 * a path with a space splits in two. Direct spawning passes the arguments
 * verbatim, which is what makes the runner faithful.
 */
function needsShell(command: string): boolean {
  if (process.platform !== "win32") return false;
  // An explicit executable (node.exe, a resolved binary) never needs a shell.
  if (/\.(exe|com)$/i.test(command)) return false;
  // A path is launched directly unless it names a batch shim.
  if (command.includes("\\") || command.includes("/")) {
    return /\.(cmd|bat)$/i.test(command);
  }
  // A bare name: assume the package-manager shims, which are `.cmd` files.
  return true;
}
