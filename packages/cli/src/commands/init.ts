/**
 * `themvora init` — integrate Themvora into a project, or create one.
 *
 * The command is deliberately thin. It resolves flags into a
 * {@link BuildInitOptions}, delegates planning to `init/plan.ts`, rendering to
 * `init/render.ts` and every external effect to `init/apply.ts`. Nothing about a
 * framework lives here, which is what keeps "add a framework" a registry change
 * rather than a command change.
 *
 * @packageDocumentation
 */
import { basename, resolve } from "node:path";
import { getBool, getString } from "../utils.js";
import type { ParsedArgs } from "../utils.js";
import { CommandExit, ExitCodes, UsageError } from "../exit-codes.js";
import { status, wantsJson, wantsQuiet, writeJson } from "../output.js";
import { INIT_FRAMEWORKS } from "../frameworks.js";
import { inspectProject } from "../init/detect.js";
import { buildInitPlan, type BuildInitOptions } from "../init/plan.js";
import { applyInitPlan, defaultIo, type ApplyIo } from "../init/apply.js";
import { renderPlan, renderReport } from "../init/render.js";
import { isSafeProjectName, createProcessRunner } from "../init/runner.js";
import type { SourceRequest } from "../init/source.js";
import type { PackageManager, StylingEngine } from "../init/types.js";

/** The source flags, in the order they are documented. */
const SOURCE_FLAGS = ["preset", "brand", "seed"] as const;

/** Every package manager `--package-manager` accepts. */
const MANAGERS: readonly PackageManager[] = ["npm", "pnpm", "yarn", "bun"];

/**
 * Every styling engine `--styling` accepts.
 *
 * `css` is first because it is the default, and it is the default because it is
 * the only choice that needs no extra dependency: a non-interactive run that
 * installs a build-time CSS framework the user did not ask for would be a
 * surprise, and CI has nobody to ask.
 */
const STYLING_ENGINES: readonly StylingEngine[] = ["css", "tailwind"];

/**
 * Resolve the theme source from the flags.
 *
 * @param args - The parsed arguments.
 * @returns The source request, defaulting to the built-in neutral pair.
 *
 * @throws {UsageError} When more than one source flag is given.
 */
function resolveSourceRequest(args: ParsedArgs): SourceRequest {
  const given = SOURCE_FLAGS.filter((flag) => args[flag] !== undefined);

  if (given.length > 1) {
    throw new UsageError(
      `choose one theme source — received ${given.map((flag) => `--${flag}`).join(" and ")}`,
    );
  }

  const flag = given[0];
  if (flag === "seed") return { kind: "seed", seed: getString(args, "seed")! };
  if (flag === "brand") return { kind: "brand", id: getString(args, "brand")! };
  if (flag === "preset") return { kind: "preset", id: getString(args, "preset")! };

  return { kind: "neutral" };
}

/**
 * Resolve the framework to integrate.
 *
 * @param args - The parsed arguments.
 * @param target - The directory the user named.
 * @returns The framework id.
 *
 * @throws {UsageError} When no framework was given and none could be detected.
 *
 * @remarks
 * Detection is only attempted for an existing project. A new project has nothing
 * to detect from, so `--framework` is required there — which is also why
 * non-interactive runs never block: the CLI reports the missing choice and the
 * supported set rather than prompting.
 */
function resolveFrameworkId(args: ParsedArgs, target: string): string {
  const explicit = getString(args, "framework");
  if (explicit) return explicit;

  const inspection = inspectProject(target);
  if (inspection.detectedFramework) return inspection.detectedFramework.id;

  const supported = INIT_FRAMEWORKS.map((framework) => framework.id).join(", ");
  throw new UsageError(
    inspection.kind === "existing"
      ? `could not detect a supported framework in ${inspection.projectPath} — pass --framework <id> (supported: ${supported})`
      : `a new project needs --framework <id> (supported: ${supported})`,
  );
}

/**
 * Resolve an explicit package-manager flag.
 *
 * @param args - The parsed arguments.
 * @returns The manager, or `undefined` when detection should decide.
 *
 * @throws {UsageError} When the value is not a supported manager.
 */
function resolvePackageManager(args: ParsedArgs): PackageManager | undefined {
  const value = getString(args, "package-manager");
  if (value === undefined) return undefined;

  const needle = value.trim().toLowerCase() as PackageManager;
  if (!MANAGERS.includes(needle)) {
    throw new UsageError(
      `unknown package manager "${value}" — expected one of ${MANAGERS.join(", ")}`,
    );
  }
  return needle;
}

/**
 * Resolve the `--styling` choice.
 *
 * @param args - The parsed arguments.
 * @returns The selected engine, defaulting to `css`.
 *
 * @throws {UsageError} When the value is not a supported engine.
 */
function resolveStyling(args: ParsedArgs): StylingEngine {
  const value = getString(args, "styling");
  if (value === undefined) return "css";

  const needle = value.trim().toLowerCase() as StylingEngine;
  if (!STYLING_ENGINES.includes(needle)) {
    throw new UsageError(
      `unknown styling engine "${value}" — expected one of ${STYLING_ENGINES.join(", ")}`,
    );
  }
  return needle;
}

/**
 * Run `themvora init`.
 *
 * @param args - The parsed arguments.
 *
 * @throws {CommandExit} With `3` when a verification step fails, and `1` when
 *   conflicts block the run.
 */
export async function cmdInit(args: ParsedArgs): Promise<void> {
  // `args._[0]` is the command name; the first positional is `args._[1]`.
  const target = args._[1] ?? ".";
  const json = wantsJson(args);
  const quiet = wantsQuiet(args);
  const planOnly = getBool(args, "plan");
  const dryRun = getBool(args, "dry-run");
  const force = getBool(args, "force");
  const example = getBool(args, "example");
  const install = !getBool(args, "no-install");

  const frameworkId = resolveFrameworkId(args, target);
  const source = resolveSourceRequest(args);
  const packageManager = resolvePackageManager(args);
  const styling = resolveStyling(args);

  const build: BuildInitOptions = {
    target,
    frameworkId,
    source,
    styling,
    example,
    install,
    force,
    ...(packageManager !== undefined ? { packageManager } : {}),
  };

  // Fail before anything is planned when a name could not survive the trip to a
  // generator. The name is the only user input that reaches a command.
  if (!isSafeProjectName(basename(resolve(target)))) {
    throw new UsageError(
      "the project directory name may contain only letters, digits, dots, dashes and underscores",
    );
  }

  const plan = buildInitPlan(build);

  if (planOnly || dryRun) {
    if (json) writeJson(plan);
    else process.stdout.write(`${renderPlan(plan, { verbose: dryRun })}\n`);
    return;
  }

  const conflicts = plan.files.filter((file) => file.action === "conflict");
  if (conflicts.length > 0) {
    for (const conflict of conflicts) {
      status(`conflict: ${conflict.path} — ${conflict.reason}`);
    }
    throw new CommandExit(
      ExitCodes.Error,
      `${conflicts.length} file(s) already exist and were not generated by themvora init. Re-run with --force to replace them.`,
    );
  }

  const io: ApplyIo = {
    ...defaultIo,
    run: createProcessRunner(),
  };

  const report = applyInitPlan({
    plan,
    build,
    io,
    // The scaffold always runs: `--no-install` declines to install the
    // project's dependencies, it does not decline to create the project.
    // Dependency-backed verification is skipped by `applyInitPlan` itself, which
    // knows whether the dependencies are present.
    skipCommands: false,
    onProgress: (message) => {
      if (!quiet) status(`  ${message}`);
    },
  });

  if (json) {
    writeJson(report);
  } else {
    process.stdout.write(`${renderReport(report)}\n`);
  }

  const failed = report.verification.filter((result) => result.status === "fail");
  if (failed.length > 0) {
    throw new CommandExit(
      ExitCodes.ValidationFailed,
      `verification failed: ${failed.map((result) => result.id).join(", ")}`,
    );
  }
}
