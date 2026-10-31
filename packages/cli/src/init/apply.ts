/**
 * Plan application for `init`.
 *
 * This is the only module in `init` that touches the filesystem or spawns a
 * process, and every external effect goes through the injected {@link ApplyIo}.
 * That is what lets the whole pipeline — including scaffolding and verification —
 * be driven in-process by the test suite, on a host where a child process's piped
 * stdout cannot be read at all.
 *
 * Two safety properties are enforced here rather than trusted to callers:
 *
 * - **No path escapes the project root.** Every generated path is resolved and
 *   checked, so a registry value or a theme name can never write outside the
 *   project it was asked to integrate into.
 * - **No shell.** Commands are spawned with an argument array, so nothing derived
 *   from user input is ever parsed as shell syntax.
 *
 * @packageDocumentation
 */
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { findIntegration } from "../frameworks.js";
import { findAdapter } from "./adapters/index.js";
import { inspectProject, type ProjectManifest } from "./detect.js";
import { buildIntegration, type BuildInitOptions } from "./plan.js";
import { decodeSource, resolveSources, type SourceRequest } from "./source.js";
import type {
  CommandStep,
  FileOperation,
  InitPlan,
  InitReport,
  VerificationResult,
  VerificationStep,
} from "./types.js";

/** The external effects `apply` needs. */
export interface ApplyIo {
  /** Write a file, creating its directory. */
  writeFile(absolutePath: string, contents: string): void;
  /** Run a command. */
  run(
    command: CommandStep,
    options: { cwd: string },
  ): { ok: boolean; detail?: string };
  /** Read a file's current contents, or `null`. */
  readFile(absolutePath: string): string | null;
  /** Remove a file. Only ever called for a planned scaffold-cleanup deletion. */
  deleteFile(absolutePath: string): void;
}

/** The real filesystem and process effects. */
export const defaultIo: ApplyIo = {
  writeFile(absolutePath, contents) {
    mkdirSync(dirname(absolutePath), { recursive: true });
    writeFileSync(absolutePath, contents, "utf-8");
  },
  deleteFile(absolutePath) {
    rmSync(absolutePath, { force: true });
  },
  readFile(absolutePath) {
    if (!existsSync(absolutePath)) return null;
    try {
      return readFileSync(absolutePath, "utf-8");
    } catch {
      return null;
    }
  },
  run() {
    // Replaced by the command layer, which owns process spawning. Kept here so
    // `apply` has a total interface; `commands/init.ts` passes the real one.
    throw new Error("no process runner was supplied");
  },
};

/** What `apply` should do. */
export interface ApplyOptions {
  /** The plan to apply. */
  plan: InitPlan;
  /** The original options, used to recompute the integration after scaffolding. */
  build: BuildInitOptions;
  /** The external effects. */
  io: ApplyIo;
  /** Skip every external command. */
  skipCommands: boolean;
  /** Report progress. */
  onProgress?: (message: string) => void;
}

/**
 * The subset of `node:path` {@link resolveInsideProject} needs.
 *
 * @remarks
 * Injected rather than imported directly so the **Windows** rules can be tested
 * deterministically on any host: `path.win32` can be passed in from a Linux CI
 * run, where the platform's own `path` is POSIX and a `D:\…` root would be
 * meaningless.
 */
export interface ProjectPathApi {
  resolve(...segments: string[]): string;
  relative(from: string, to: string): string;
  isAbsolute(path: string): boolean;
  readonly sep: string;
}

const defaultPathApi: ProjectPathApi = { resolve, relative, isAbsolute, sep };

/**
 * Resolve a project-relative path and refuse anything outside the root.
 *
 * @param projectPath - The project root.
 * @param relativePath - The POSIX-separated path from a plan.
 * @param pathApi - Path implementation. Defaults to the platform's.
 * @returns The absolute path.
 *
 * @throws {Error} When the path escapes the project root.
 *
 * @remarks
 * Three distinct escapes have to be caught, and the obvious check catches only
 * the first:
 *
 * 1. **An absolute path** — `D:\evil\f.ts` against a `C:\proj` root, or
 *    `/etc/passwd`. Rejected outright rather than reinterpreted: `resolve()`
 *    would either return it unchanged (different drive) or silently re-anchor
 *    it under the root, and both are worse than refusing a plan that was never
 *    supposed to carry one.
 * 2. **Same-drive traversal** — `../../etc/passwd`. `relative()` yields a path
 *    whose first segment is `..`.
 * 3. **The root itself** — an empty relative path, which would have the caller
 *    writing to the project directory.
 *
 * The containment test is on the **first segment**, not on a `startsWith("..")`
 * prefix: `..foo/a.ts` is a legitimate in-project path whose first segment
 * merely begins with two dots, and the prefix test rejected it.
 *
 * The `isAbsolute(rel)` test is kept as defence in depth for the different-drive
 * case: `relative()` cannot express a path between two drives and hands back the
 * absolute target unchanged.
 */
export function resolveInsideProject(
  projectPath: string,
  relativePath: string,
  pathApi: ProjectPathApi = defaultPathApi,
): string {
  const root = pathApi.resolve(projectPath);
  const target = pathApi.resolve(root, ...relativePath.split("/"));
  const rel = pathApi.relative(root, target);

  const escapesRoot =
    pathApi.isAbsolute(relativePath) ||
    rel === "" ||
    pathApi.isAbsolute(rel) ||
    rel.split(pathApi.sep)[0] === "..";

  if (escapesRoot) {
    throw new Error(
      `refusing to write outside the project root: "${relativePath}" resolves to "${target}"`,
    );
  }
  return target;
}

/**
 * Apply a plan.
 *
 * @param options - The plan, the build options, the IO and the skip flag.
 * @returns What actually happened.
 *
 * @remarks
 * When the plan scaffolds a new project, the integration is **recomputed** from a
 * fresh inspection after the scaffold has run. The plan's file list for a new
 * project is a preview computed against an empty directory; the scaffold's real
 * output — its entry module, its Vite config — is the truth, so the operations
 * that are applied are derived from it rather than from the preview.
 */
export function applyInitPlan(options: ApplyOptions): InitReport {
  const { plan, build, io, skipCommands } = options;
  const report = options.onProgress ?? (() => {});

  const created: string[] = [];
  const updated: string[] = [];
  const unchanged: string[] = [];
  const skipped: string[] = [];
  const deleted: string[] = [];

  // 1. Scaffold, when the target is a new project.
  let scaffolded = false;
  if (plan.scaffold) {
    if (skipCommands) {
      report(
        `would scaffold: ${plan.scaffold.command} ${plan.scaffold.args.join(" ")}`,
      );
    } else {
      report(
        `scaffolding: ${plan.scaffold.command} ${plan.scaffold.args.join(" ")}`,
      );
      const result = io.run(plan.scaffold, {
        cwd: plan.scaffold.cwd ?? dirname(plan.projectPath),
      });
      if (!result.ok) {
        throw new Error(
          `the scaffold command failed: ${result.detail ?? `${plan.scaffold.command} ${plan.scaffold.args.join(" ")}`}`,
        );
      }
      scaffolded = true;
    }
  }

  // 2. Recompute the integration against the project as it now is. For an
  //    existing project this is identical to the plan; for a new one it is the
  //    first time the real files are visible.
  const framework = findIntegration(plan.framework.id);
  if (!framework) throw new Error(`unknown framework "${plan.framework.id}"`);

  const inspection = inspectProject(plan.projectPath);
  const source = resolveSources(sourceRequestFromPlan(plan));

  // A project Themvora has just scaffolded is *ours*: the integration may
  // replace the generator's entry component, exactly as it would for an empty
  // directory. Re-inspecting alone would classify it as `existing` — which is
  // correct in general, and wrong here, because `existing` means "the user's
  // files, do not replace them".
  const kind = plan.scaffold ? plan.projectKind : inspection.kind;

  const integration = buildIntegration(
    framework,
    inspection.projectPath,
    plan.projectName,
    kind,
    build,
    source.summary,
    source.themes,
  );

  // 3. Write.
  for (const operation of integration.files) {
    applyFile(operation, plan.projectPath, io, {
      created,
      updated,
      unchanged,
      skipped,
      deleted,
    });
  }

  // 4. Install. Two steps at most: the framework's runtime packages, then the
  //    dev-only ones a styling engine needs (Tailwind's build-time packages).
  //    They cannot share a command because the dev flag is per-manager.
  let installed = false;
  const installSteps = [plan.installStep, plan.devInstallStep].filter(
    (step): step is CommandStep => step !== null,
  );

  for (const step of installSteps) {
    if (skipCommands) {
      report(`would install: ${step.command} ${step.args.join(" ")}`);
      continue;
    }
    report(`installing: ${step.command} ${step.args.join(" ")}`);
    const result = io.run(step, { cwd: plan.projectPath });
    if (!result.ok) {
      throw new Error(
        `installing dependencies failed: ${result.detail ?? step.command}`,
      );
    }
    installed = true;
  }

  // 5. Verify. The steps are recomputed too: a scaffolded project's scripts are
  //    only knowable once it exists.
  const verification = runVerification(
    plan,
    inspection.manifest,
    io,
    skipCommands,
    report,
  );

  return {
    version: 1,
    projectPath: plan.projectPath,
    framework: plan.framework.displayName,
    created,
    updated,
    unchanged,
    skipped,
    deleted,
    scaffolded,
    installed,
    verification,
    manualSteps: integration.manualSteps,
    warnings: integration.warnings,
    nextSteps: nextSteps(plan, verification),
  };
}

/**
 * Recover the source requests from a plan's summary.
 *
 * The summary carries the encoded sources, so this is a decode rather than a
 * reconstruction. The previous version parsed them back out of the display label
 * — which meant `add` could not exist, because the label is lossy.
 */
function sourceRequestFromPlan(plan: InitPlan): SourceRequest[] {
  const decoded = plan.source.sources
    .map(decodeSource)
    .filter((request): request is SourceRequest => request !== null);

  if (decoded.length !== plan.source.sources.length) {
    throw new Error(
      "this plan carries a theme source this version of the CLI does not understand",
    );
  }
  return decoded;
}

/** Apply one file operation. */
function applyFile(
  operation: FileOperation,
  projectPath: string,
  io: ApplyIo,
  buckets: {
    created: string[];
    updated: string[];
    unchanged: string[];
    skipped: string[];
    deleted: string[];
  },
): void {
  if (operation.action === "conflict") {
    buckets.skipped.push(operation.path);
    return;
  }
  if (operation.action === "unchanged") {
    buckets.unchanged.push(operation.path);
    return;
  }

  const absolute = resolveInsideProject(projectPath, operation.path);

  if (operation.action === "delete") {
    // The plan already proved this is an untouched artifact of a scaffold
    // Themvora just created; `apply` only carries it out.
    io.deleteFile(absolute);
    buckets.deleted.push(operation.path);
    return;
  }

  io.writeFile(absolute, operation.contents);

  if (operation.action === "create") buckets.created.push(operation.path);
  else buckets.updated.push(operation.path);
}

/** Run the verification steps. */
function runVerification(
  plan: InitPlan,
  manifest: ProjectManifest | null,
  io: ApplyIo,
  skipCommands: boolean,
  report: (message: string) => void,
): VerificationResult[] {
  const adapter = findAdapter(plan.framework.id);
  const steps: readonly VerificationStep[] = adapter
    ? adapter.verification({ manifest, packageManager: plan.packageManager })
    : plan.verification;

  const results: VerificationResult[] = [];

  // `--no-install` installs nothing — Themvora skips its own install steps and
  // asks the scaffold to skip its own (`--skip-install`) — so the
  // dependency-backed steps cannot run. Skip them and say why, instead of
  // running a build that fails only because nothing is installed.
  //
  // The signal is the invocation's own flag, not a filesystem probe: an
  // existing project may already have `@themvora` installed, and that says
  // nothing about whether *this* run installed anything.
  const dependenciesInstalled = plan.install;

  for (const step of steps) {
    if (!step.command) {
      results.push({
        id: step.id,
        title: step.title,
        status: "skipped",
        detail: "no command",
      });
      continue;
    }
    if (!dependenciesInstalled) {
      results.push({
        id: step.id,
        title: step.title,
        status: "skipped",
        detail: `dependencies are not installed, so it was skipped: ${step.command.command} ${step.command.args.join(" ")}`,
      });
      continue;
    }
    if (skipCommands) {
      results.push({
        id: step.id,
        title: step.title,
        status: "skipped",
        // Honest reason: the step needs installed dependencies to run, and
        // `--no-install` declined to install them. Reporting it as a failure
        // would read as "the generated code is broken".
        detail: `dependencies are not installed, so it was skipped: ${step.command.command} ${step.command.args.join(" ")}`,
      });
      continue;
    }

    report(`verifying: ${step.command.command} ${step.command.args.join(" ")}`);
    const result = io.run(step.command, { cwd: plan.projectPath });
    results.push({
      id: step.id,
      title: step.title,
      status: result.ok ? "pass" : "fail",
      ...(result.detail !== undefined ? { detail: result.detail } : {}),
    });
  }

  return results;
}

/** What the user should do after a successful run. */
function nextSteps(
  plan: InitPlan,
  verification: VerificationResult[],
): string[] {
  const steps: string[] = [];
  const failed = verification.filter((result) => result.status === "fail");

  if (failed.length > 0) {
    steps.push(
      `Fix the failing ${failed.map((result) => result.id).join(" and ")} step(s).`,
    );
  }

  if (plan.projectKind !== "existing" && plan.scaffold) {
    steps.push(`cd ${plan.projectPath}`);
  }

  const devCommand =
    plan.packageManager === "npm" || plan.packageManager === "pnpm"
      ? "run dev"
      : "dev";
  steps.push(`Start the dev server: ${plan.packageManager} ${devCommand}`);

  return steps;
}

/** A path inside the project, for tests and messages. */
export function projectFilePath(
  projectPath: string,
  relativePath: string,
): string {
  return join(projectPath, ...relativePath.split("/"));
}
