/**
 * Plan construction for `init`.
 *
 * Everything in this module is pure: it reads the filesystem to *inspect* a
 * project, but it never writes and never spawns. The result is the single object
 * `apply` consumes, which is what makes `--plan` and `--dry-run` truthful — they
 * render this object rather than re-deriving an approximation of it.
 *
 * @packageDocumentation
 */
import { dirname, resolve } from "node:path";
import type { ThemeDefinition } from "@themvora/core";
import {
  CORE_PACKAGE,
  findFramework,
  FRAMEWORK_INTEGRATIONS,
  INIT_FRAMEWORKS,
  type FrameworkIntegration,
} from "../frameworks.js";
import { findAdapter } from "./adapters/index.js";
import type { IntegrationContext } from "./adapters/context.js";
import { readProjectFile, projectFileExists, listProjectFiles } from "./files.js";
import { inspectProject, type ProjectInspection } from "./detect.js";
import { canScaffold, scaffoldCommand } from "./scaffold.js";
import { resolveSource, type SourceRequest } from "./source.js";
import type {
  CommandStep,
  FileOperation,
  InitPlan,
  InitSourceSummary,
  ManualStep,
  PackageManager,
  ProjectKind,
  StylingEngine,
  VerificationStep,
} from "./types.js";

/** What the caller asked `init` to do. */
export interface BuildInitOptions {
  /** The directory the user named. */
  target: string;
  /** The resolved framework id. */
  frameworkId: string;
  /** The theme source request. */
  source: SourceRequest;
  /** The styling engine the generated project uses. */
  styling: StylingEngine;
  /** Whether to generate the richer showcase UI. */
  example: boolean;
  /** Whether to install dependencies. */
  install: boolean;
  /** Whether conflicts may be overwritten. */
  force: boolean;
  /** An explicit package-manager choice, overriding detection. */
  packageManager?: PackageManager;
}

/** The result of running an adapter. */
export interface IntegrationOutcome {
  /** The file operations. */
  files: FileOperation[];
  /** Changes the user must make by hand. */
  manualSteps: ManualStep[];
  /** Non-fatal problems. */
  warnings: string[];
  /** Extra runtime dependencies the integration needs. */
  packages: readonly string[];
  /** Extra dev dependencies the integration needs. */
  devPackages: readonly string[];
}

/**
 * Build the adapter context for a project.
 *
 * @param projectPath - The project root.
 * @param projectName - The project's name, used in generated page titles.
 * @param kind - What the directory is.
 * @param options - The plan options.
 * @param framework - The framework integration being applied.
 * @param source - The resolved source summary.
 * @param themes - The resolved themes.
 * @returns The context an adapter integrates against.
 */
function integrationContext(
  projectPath: string,
  projectName: string,
  kind: ProjectKind,
  options: BuildInitOptions,
  framework: FrameworkIntegration,
  source: InitSourceSummary,
  themes: readonly ThemeDefinition[],
): IntegrationContext {
  // The adapter package is the framework's own runtime, read from the registry
  // that also decides what the install step adds. `@themvora/core` is always
  // present and is never the adapter.
  const adapter =
    framework.packages.find((name) => name !== CORE_PACKAGE) ?? framework.packages[0]!;

  return {
    projectPath,
    projectName,
    projectKind: kind,
    styling: options.styling,
    example: options.example,
    force: options.force,
    source,
    themes,
    imports: {
      adapter,
      client: `${adapter}/client`,
      core: CORE_PACKAGE,
      vite: `${CORE_PACKAGE}/vite`,
    },
    read: (relativePath) => readProjectFile(projectPath, relativePath),
    exists: (relativePath) => projectFileExists(projectPath, relativePath),
    listProjectFiles: () => listProjectFiles(projectPath),
  };
}

/**
 * Run a framework's integration against a project.
 *
 * @param framework - The framework integration entry.
 * @param projectPath - The project root.
 * @param projectName - The project's name.
 * @param kind - What the directory is.
 * @param options - The plan options.
 * @param source - The resolved source summary.
 * @param themes - The resolved themes.
 * @returns The file operations, manual steps and warnings.
 *
 * @throws {Error} When the framework has no adapter — a registry inconsistency,
 *   asserted against by the test suite.
 */
export function buildIntegration(
  framework: FrameworkIntegration,
  projectPath: string,
  projectName: string,
  kind: ProjectKind,
  options: BuildInitOptions,
  source: InitSourceSummary,
  themes: readonly ThemeDefinition[],
): IntegrationOutcome {
  const adapter = findAdapter(framework.id);
  if (!adapter) {
    throw new Error(`no init adapter is registered for framework "${framework.id}"`);
  }

  const result = adapter.integrate(
    integrationContext(projectPath, projectName, kind, options, framework, source, themes),
  );

  return {
    files: result.files,
    manualSteps: result.manualSteps,
    warnings: result.warnings,
    packages: result.packages ?? [],
    devPackages: result.devPackages ?? [],
  };
}

/**
 * Build the package-install command.
 *
 * @param manager - The package manager.
 * @param packages - The packages to add.
 * @returns The command, or `null` when there is nothing to install.
 */
function installCommand(
  manager: PackageManager,
  packages: readonly string[],
  dev = false,
): CommandStep | null {
  if (packages.length === 0) return null;

  // The dev flag is spelled differently by each manager, and `npm install`
  // differs from the `add` the others use, so the two axes are resolved here
  // rather than at the call site.
  const devFlag = dev ? (manager === "yarn" ? "-D" : manager === "bun" ? "-d" : "-D") : null;
  const description = `Install ${packages.join(", ")}${dev ? " (dev)" : ""}`;

  switch (manager) {
    case "pnpm":
      return { command: "pnpm", args: ["add", ...(devFlag ? [devFlag] : []), ...packages], description };
    case "yarn":
      return { command: "yarn", args: ["add", ...(devFlag ? [devFlag] : []), ...packages], description };
    case "bun":
      return { command: "bun", args: ["add", ...(devFlag ? [devFlag] : []), ...packages], description };
    default:
      return { command: "npm", args: ["install", ...(devFlag ? [devFlag] : []), ...packages], description };
  }
}

/** A framework id that is not `init`-supported, with the supported set. */
export interface UnsupportedFramework {
  /** The id the user asked for. */
  requested: string;
  /** The ids `init` supports. */
  supported: string[];
  /** Whether the framework is a published integration at all. */
  published: boolean;
}

/**
 * Resolve the framework an `init` run targets.
 *
 * @param requested - The `--framework` value, or the detected framework id.
 * @returns The framework, or a description of why it is unsupported.
 *
 * @remarks
 * The distinction between "not published" and "published but not an init target"
 * is worth carrying: it tells a user asking for Nuxt that Themvora supports Nuxt
 * and `init` simply does not scaffold it yet, rather than that they misspelled
 * something.
 */
export function resolveFramework(
  requested: string,
): { framework: FrameworkIntegration } | { unsupported: UnsupportedFramework } {
  const supported = findFramework(requested);
  if (supported) return { framework: supported };

  const needle = requested.trim().toLowerCase();
  const published = FRAMEWORK_INTEGRATIONS.find((entry) => entry.id === needle);

  return {
    unsupported: {
      requested,
      supported: INIT_FRAMEWORKS.map((entry) => entry.id),
      published: published !== undefined,
    },
  };
}

/**
 * Build an `init` plan.
 *
 * @param options - What the caller asked for.
 * @returns The plan, ready to render or apply.
 *
 * @throws {Error} When the framework is unsupported, the source cannot be
 *   resolved, or a scaffold is required for a framework that has none.
 */
export function buildInitPlan(options: BuildInitOptions): InitPlan {
  const inspection = inspectProject(options.target);
  const resolvedFramework = resolveFramework(options.frameworkId);

  if ("unsupported" in resolvedFramework) {
    const { requested, supported, published } = resolvedFramework.unsupported;
    throw new Error(
      published
        ? `"${requested}" is a supported Themvora integration but is not an \`init\` target yet — init supports: ${supported.join(", ")}`
        : `unknown framework "${requested}" — init supports: ${supported.join(", ")}`,
    );
  }

  const framework = resolvedFramework.framework;
  const source = resolveSource(options.source);
  const packageManager = options.packageManager ?? inspection.packageManager;

  const warnings: string[] = [];
  if (source.problems.length > 0) {
    warnings.push(
      `the resolved theme has ${source.problems.length} validation problem(s): ${source.problems.join("; ")}`,
    );
  }
  if (inspection.ambiguousPackageManager) {
    warnings.push(
      `several lockfiles found (${inspection.lockfiles.join(", ")}) — using ${packageManager}; ` +
        "keep one lockfile so every tool resolves the same dependency tree",
    );
  }
  if (options.packageManager !== undefined && options.packageManager !== inspection.packageManager) {
    warnings.push(
      `using ${options.packageManager} instead of the detected ${inspection.packageManager}`,
    );
  }

  const isNew = inspection.kind !== "existing";
  const scaffold = isNew
    ? scaffoldFor(framework.id, inspection, packageManager, options.install)
    : null;
  const projectName = inspection.manifest?.name ?? inspection.directoryName;

  const integration = buildIntegration(
    framework,
    inspection.projectPath,
    projectName,
    inspection.kind,
    options,
    source.summary,
    source.themes,
  );

  warnings.push(...integration.warnings);

  // The framework's own packages plus whatever the styling choice added. The
  // registry stays the single source for the framework's closure; the adapter
  // contributes only what the selected engine needs.
  const runtimePackages = [...framework.packages, ...integration.packages];

  const adapter = findAdapter(framework.id);
  const verification: VerificationStep[] = adapter
    ? adapter.verification({
        manifest: inspection.manifest,
        packageManager,
      })
    : [];

  return {
    version: 1,
    projectPath: inspection.projectPath,
    projectName,
    projectKind: inspection.kind,
    framework: {
      id: framework.id,
      displayName: framework.displayName,
      buildSystem: framework.buildSystem,
      ssr: framework.ssr,
      vite: framework.vite,
    },
    packageManager,
    source: source.summary,
    styling: options.styling,
    example: options.example,
    install: options.install,
    force: options.force,
    scaffold,
    preview: scaffold !== null,
    files: integration.files,
    packages: runtimePackages,
    installStep: options.install ? installCommand(packageManager, runtimePackages) : null,
    devInstallStep: options.install ? installCommand(packageManager, integration.devPackages, true) : null,
    manualSteps: integration.manualSteps,
    verification,
    warnings,
  };
}

/**
 * Build the scaffold command for a new project.
 *
 * @param frameworkId - The framework id.
 * @param inspection - What was found at the target path.
 * @param manager - The package manager to drive the generator with.
 * @param install - Whether dependencies will be installed. `false` forwards the
 *   generator's own "do not install" flag.
 * @returns The command, or `null` when the framework cannot be scaffolded.
 *
 * @throws {Error} When the directory is new and the framework has no scaffold
 *   strategy — `init` will not hand-write a framework project.
 */
function scaffoldFor(
  frameworkId: string,
  inspection: ProjectInspection,
  manager: PackageManager,
  install: boolean,
): CommandStep | null {
  if (!canScaffold(frameworkId)) return null;

  // A missing directory is created by the generator from its parent; an empty
  // directory is scaffolded in place, which every supported generator accepts
  // as `.`.
  const inPlace = inspection.kind === "empty";
  const name = inPlace ? "." : inspection.directoryName;
  const command = scaffoldCommand(frameworkId, name, manager, { install });
  if (!command) return null;

  return {
    ...command,
    cwd: inPlace ? inspection.projectPath : dirname(inspection.projectPath),
  };
}

/** Resolve a path the way `init` will treat it. */
export function normalizeTarget(target: string): string {
  return resolve(target);
}
