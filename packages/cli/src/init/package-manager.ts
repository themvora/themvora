/**
 * Package-manager selection for `init`.
 *
 * Two spellings reach the same internal value: `--tool` is the canonical,
 * shorter flag, and `--package-manager` is kept as a compatibility alias for
 * scripts written against an earlier release. Resolving both here — rather than
 * in the command — is what keeps "one manager per run" a single implementation
 * instead of two that can disagree.
 *
 * The precedence chain is:
 *
 * 1. an explicit flag (`--tool` / `--package-manager`);
 * 2. the project's corepack `packageManager` field, then its lockfile — see
 *    `detectPackageManager`;
 * 3. the package manager that invoked the CLI, when the user agent identifies
 *    one;
 * 4. `npm`.
 *
 * Steps 3 and 4 are only reachable for a project that has no lockfile yet,
 * which in practice means a project about to be created.
 *
 * @packageDocumentation
 */
import { spawnSync } from "node:child_process";
import type { ParsedArgs } from "../utils.js";
import { getString } from "../utils.js";
import { UsageError } from "../exit-codes.js";
import { needsShell } from "./runner.js";
import type { PackageManager } from "./types.js";

/** Every package manager `init` can drive, in the order the docs list them. */
export const PACKAGE_MANAGERS: readonly PackageManager[] = ["npm", "pnpm", "yarn", "bun"];

/**
 * The flags that select a package manager, canonical spelling first.
 *
 * `--tool` is advertised; `--package-manager` is the documented alias. Both are
 * read here so a conflict is detected rather than silently resolved by whichever
 * one the resolver happened to look at first.
 */
export const PACKAGE_MANAGER_FLAGS = ["tool", "package-manager"] as const;

/** Whether a string names a package manager `init` can drive. */
export function isPackageManager(value: string): value is PackageManager {
  return (PACKAGE_MANAGERS as readonly string[]).includes(value);
}

/**
 * Validate one flag's value.
 *
 * @param flag - The flag name, for the error message.
 * @param value - The value the user typed.
 * @returns The normalised manager.
 *
 * @throws {UsageError} When the value is not a supported manager, or when the
 *   flag was given without a value.
 */
export function parsePackageManagerFlag(flag: string, value: string | true): PackageManager {
  if (value === true) {
    throw new UsageError(
      `--${flag} needs a value — one of ${PACKAGE_MANAGERS.join(", ")}`,
    );
  }

  const needle = value.trim().toLowerCase();
  if (!isPackageManager(needle)) {
    throw new UsageError(
      `unknown package manager "${value}" — expected one of ${PACKAGE_MANAGERS.join(", ")}`,
    );
  }
  return needle;
}

/**
 * Resolve the package manager an explicit flag selected.
 *
 * @param args - The parsed arguments.
 * @returns The manager, or `undefined` when neither flag was given.
 *
 * @throws {UsageError} When a value is invalid, or when both flags were given
 *   with different values.
 *
 * @remarks
 * A conflict is an error rather than a last-one-wins: `--tool pnpm
 * --package-manager yarn` is a request the CLI cannot satisfy, and picking one
 * silently would install a dependency tree the caller did not ask for.
 */
export function resolveExplicitPackageManager(args: ParsedArgs): PackageManager | undefined {
  const given = PACKAGE_MANAGER_FLAGS.flatMap((flag) => {
    const value = args[flag];
    if (value === undefined) return [];
    return [{ flag, manager: parsePackageManagerFlag(flag, value as string | true) }];
  });

  if (given.length === 0) return undefined;

  const distinct = [...new Set(given.map((entry) => entry.manager))];
  if (distinct.length > 1) {
    throw new UsageError(
      `--tool and --package-manager disagree (${given
        .map((entry) => `--${entry.flag} ${entry.manager}`)
        .join(" and ")}) — pass a single package manager`,
    );
  }
  return distinct[0];
}

/**
 * The package manager that invoked this CLI, when the user agent identifies one.
 *
 * @param env - The environment to read. Injectable for tests.
 * @returns The manager, or `undefined` when the CLI was not run through one
 *   (a direct `node dist/cli.js`, a bare `themvora`, or a wrapper).
 *
 * @remarks
 * `npm_config_user_agent` is set by every major package manager when it runs a
 * lifecycle script or an `exec`/`dlx` invocation, and it is the only reliable
 * signal for "which manager is the user actually using". It is treated as a
 * hint, never as a mandate: an unrecognised agent falls through to npm.
 */
export function invokingPackageManager(
  env: NodeJS.ProcessEnv = process.env,
): PackageManager | undefined {
  const agent = env["npm_config_user_agent"];
  if (!agent) return undefined;

  const name = agent.split("/")[0]?.trim().toLowerCase();
  return name !== undefined && isPackageManager(name) ? name : undefined;
}

/**
 * The manager to preselect in a project that has no lockfile.
 *
 * @param env - The environment to read.
 * @returns The invoking manager, or `npm`.
 */
export function defaultPackageManager(env: NodeJS.ProcessEnv = process.env): PackageManager {
  return invokingPackageManager(env) ?? "npm";
}

/** Whether a command can be launched on this host. Injectable for tests. */
export type CommandProbe = (command: string) => boolean;

/**
 * Probe whether an executable is on `PATH`.
 *
 * @param command - The bare executable name.
 * @returns Whether it ran and exited successfully.
 *
 * @remarks
 * stdio is ignored rather than piped: a piped child is unusable on some hosts,
 * and the exit status is the whole answer here. `--version` is used because it
 * is supported by all four managers and is cheap.
 */
export function commandAvailable(command: string): boolean {
  const result = spawnSync(command, ["--version"], {
    stdio: "ignore",
    shell: needsShell(command),
    windowsHide: true,
  });
  return !result.error && result.status === 0;
}

/**
 * Fail with an actionable message when an explicitly chosen manager is missing.
 *
 * @param manager - The manager the user chose.
 * @param probe - The availability check.
 *
 * @throws {UsageError} When the executable is not available.
 *
 * @remarks
 * This deliberately does **not** fall back to npm. A caller that asked for pnpm
 * and silently received an npm install ends up with a `package-lock.json` in a
 * pnpm workspace — a failure that surfaces much later than the missing binary.
 */
export function assertManagerAvailable(manager: PackageManager, probe: CommandProbe): void {
  if (probe(manager)) return;

  throw new UsageError(
    `${manager} is not available on PATH — install ${manager}, or choose another package manager with --tool`,
  );
}
