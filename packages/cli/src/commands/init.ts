/**
 * `themvora init` — integrate Themvora into a project, or create one.
 *
 * The command is deliberately thin. It resolves flags into an
 * {@link BuildInitOptions}, delegates planning to `init/plan.ts`, rendering to
 * `init/render.ts` and every external effect to `init/apply.ts`. Nothing about a
 * framework lives here, which is what keeps "add a framework" a registry change
 * rather than a command change.
 *
 * Two things were added on top of that shape, and both stay out of the pipeline:
 *
 * - **An interactive wizard** (`init/wizard.ts`) that fills in the values the
 *   command line left out. It runs before a plan exists, so cancelling it cannot
 *   leave a half-scaffolded directory.
 * - **Progress reporting.** `apply` emits structured events; this module turns
 *   them into spinners on a terminal and plain log lines everywhere else.
 *
 * @packageDocumentation
 */
import { basename, resolve } from "node:path";
import { getBool, getString } from "../utils.js";
import type { ParsedArgs } from "../utils.js";
import { CommandExit, ExitCodes, UsageError } from "../exit-codes.js";
import {
  animationsEnabled,
  createProgress,
  failure,
  isInteractiveTerminal,
  promptsAllowed,
  renderBanner,
  renderPanel,
  status,
  wantsJson,
  wantsQuiet,
  writeJson,
} from "../output.js";
import { buildInitPlan, type BuildInitOptions } from "../init/plan.js";
import { applyInitPlan, defaultIo, type ApplyEvent, type ApplyIo } from "../init/apply.js";
import { renderPlan, renderReport } from "../init/render.js";
import { createProcessRunner, isSafeProjectName } from "../init/runner.js";
import {
  assertManagerAvailable,
  commandAvailable,
  type CommandProbe,
} from "../init/package-manager.js";
import {
  createPromptAdapter,
  isPromptCancellation,
  type PromptAdapter,
} from "../init/prompts.js";
import { resolveInitIntent, type InitIntent } from "../init/wizard.js";
import type { SourceRequest } from "../init/source.js";
import { resolveStyling } from "../init/styling.js";

/** The source flags, in the order they are documented. */
const SOURCE_FLAGS = ["preset", "brand", "seed"] as const;

/** The seams the command's tests replace. */
export interface InitDependencies {
  /** The prompt implementation. Defaults to Inquirer. */
  prompt?: PromptAdapter;
  /**
   * Overrides the TTY check only.
   *
   * `--json`, `--quiet`, `--plan`, `--dry-run`, CI and a dumb terminal still
   * forbid prompts: those are contracts, not terminal hints.
   */
  promptsEnabled?: boolean;
  /** The package-manager availability probe. Defaults to a `PATH` lookup. */
  commandAvailable?: CommandProbe;
  /** The process runner. Defaults to the real spawner. */
  run?: ApplyIo["run"];
}

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
 * Print the wizard's introduction.
 *
 * @param options - Whether decorative output is allowed.
 *
 * @remarks
 * The banner is printed **once**, and only when a question is about to be
 * asked. A non-interactive run, a `--json` run and every other command stay
 * plain: an ASCII logo above a machine-readable payload is noise at best and a
 * parsing hazard at worst.
 */
function introduceWizard(options: { json: boolean; quiet: boolean }): void {
  if (options.json || options.quiet) return;

  const columns = process.stdout.columns ?? 80;
  const intro = [
    `${renderBanner(columns)}`,
    "",
    renderPanel(
      "Create a Themvora application.\nAnswer a few questions and the CLI scaffolds it,\n" +
        "wires the provider and verifies the build.",
      { title: "themvora init", columns },
    ),
    "",
  ].join("\n");

  process.stdout.write(`${intro}\n`);
}

/**
 * Run `themvora init`.
 *
 * @param args - The parsed arguments.
 * @param deps - Test seams. Production passes none.
 *
 * @throws {CommandExit} With `3` when a verification step fails, `1` when
 *   conflicts block the run, and `130` when the user cancels a prompt.
 */
export async function cmdInit(args: ParsedArgs, deps: InitDependencies = {}): Promise<void> {
  const json = wantsJson(args);
  const quiet = wantsQuiet(args);
  const planOnly = getBool(args, "plan");
  const dryRun = getBool(args, "dry-run");
  const force = getBool(args, "force");
  const example = getBool(args, "example");
  const install = !getBool(args, "no-install");

  const source = resolveSourceRequest(args);
  const stylingChoice = resolveStyling(args);

  const interactive = promptsAllowed(args) && (deps.promptsEnabled ?? isInteractiveTerminal());
  const prompt = deps.prompt ?? createPromptAdapter();

  let intent: InitIntent;
  try {
    intent = await resolveInitIntent({
      args,
      interactive,
      prompt,
      ...(stylingChoice.explicit ? { styling: stylingChoice.styling } : {}),
      onWizardStart: () => introduceWizard({ json, quiet }),
    });
  } catch (error) {
    if (isPromptCancellation(error)) {
      status("Cancelled.");
      throw new CommandExit(ExitCodes.Cancelled, "cancelled");
    }
    throw error;
  }

  // The wizard answers only when the flag did not; the flag answers only when it
  // was given. What is left is the documented default, resolved in one place.
  const styling = intent.styling ?? stylingChoice.styling;

  // A manager the user named — by flag or by answering the wizard — must exist.
  // Detection's own answer is not checked: a lockfile is evidence the manager is
  // in use, and probing four binaries on every run would cost more than it
  // explains. `--plan` and `--dry-run` are inert, so they never probe either.
  if (!planOnly && !dryRun && intent.packageManager !== undefined) {
    assertManagerAvailable(intent.packageManager, deps.commandAvailable ?? commandAvailable);
  }

  const build: BuildInitOptions = {
    target: intent.target,
    frameworkId: intent.frameworkId,
    source,
    styling,
    stylingExplicit: stylingChoice.explicit,
    example,
    install,
    force,
    ...(intent.packageManager !== undefined ? { packageManager: intent.packageManager } : {}),
  };

  // Fail before anything is planned when a name could not survive the trip to a
  // generator. The name is the only user input that reaches a command.
  if (!isSafeProjectName(basename(resolve(intent.target)))) {
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
    const message = `${conflicts.length} file(s) already exist and were not generated by themvora init. Re-run with --force to replace them.`;
    failure(message);
    throw new CommandExit(ExitCodes.Error, message);
  }

  const io: ApplyIo = {
    ...defaultIo,
    run: deps.run ?? createProcessRunner(),
  };

  const progress = createProgress({ quiet, json });
  const animated = !quiet && !json && animationsEnabled();

  const report = (() => {
    try {
      return applyInitPlan({
        plan,
        build,
        io,
        // The scaffold always runs: `--no-install` declines to install the
        // project's dependencies, it does not decline to create the project.
        // Dependency-backed verification is skipped by `applyInitPlan` itself,
        // which knows whether the dependencies are present.
        skipCommands: false,
        onProgress: (event: ApplyEvent) => {
          if (event.type === "begin") {
            progress.start(event.message, event.detail);
            return;
          }
          if (event.ok) progress.succeed(event.message);
          else progress.fail(event.message);
        },
      });
    } finally {
      // A thrown scaffold or install error leaves the spinner mid-frame; this
      // clears it before the error is reported so the message is readable.
      progress.stop();
    }
  })();

  // In a plain (non-animated) run the progress lines above are the log; a blank
  // line keeps them from running into the report that follows.
  if (!animated && !quiet && !json) status("");

  if (json) {
    writeJson(report);
  } else {
    process.stdout.write(`${renderReport(report)}\n`);
  }

  const failed = report.verification.filter((result) => result.status === "fail");
  if (failed.length > 0) {
    const message = `verification failed: ${failed.map((result) => result.id).join(", ")}`;
    // The exit code alone would leave the reason unreported: `run()` maps a
    // CommandExit to its code without printing anything.
    failure(message);
    throw new CommandExit(ExitCodes.ValidationFailed, message);
  }
}
