/**
 * The framework-adapter contract.
 *
 * An adapter is the only place a framework's integration shape lives. It is
 * given a fully resolved context — the project, the source, the theme objects —
 * and returns the file operations that integrate Themvora into that framework.
 * It never reads the filesystem itself, never spawns anything, and never decides
 * policy: `init` owns detection, the plan and `apply`, so an adapter that only
 * describes file contents is a small, testable unit.
 *
 * Adding a framework means adding one entry here plus one registry row in
 * `frameworks.ts`. No command branch changes.
 *
 * @packageDocumentation
 */
import type { ThemeDefinition } from "@themvora/core";
import type { ProjectManifest } from "../detect.js";
import type {
  FileOperation,
  InitSourceSummary,
  ManualStep,
  PackageManager,
  ProjectKind,
  StylingEngine,
  VerificationStep,
} from "../types.js";

/** Everything an adapter is allowed to know. */
export interface IntegrationContext {
  /** Absolute project root. */
  projectPath: string;
  /** The project's name, used for the page title. */
  projectName: string;
  /**
   * What the directory is.
   *
   * `existing` is load-bearing: an adapter must not replace the user's entry
   * component in an existing project, only in a scaffold Themvora created.
   */
  projectKind: ProjectKind;
  /** The styling engine the generated project uses. */
  styling: StylingEngine;
  /** Whether the richer showcase UI was requested. */
  example: boolean;
  /** Whether conflicts may be overwritten. */
  force: boolean;
  /** The resolved source, for file headers. */
  source: InitSourceSummary;
  /** The themes to register. */
  themes: readonly ThemeDefinition[];
  /**
   * The package specifiers generated code imports.
   *
   * Read from the framework registry rather than written into each adapter's
   * templates. That keeps the package name in exactly one place — the registry
   * that also decides what gets installed — so an adapter cannot generate an
   * import for a package the install step would not add.
   */
  imports: IntegrationImports;
  /** Read a file relative to the project root; `null` when absent. */
  read(relativePath: string): string | null;
  /** Whether a path exists relative to the project root. */
  exists(relativePath: string): boolean;
  /**
   * Every file in the project, relative to its root.
   *
   * Exposed for the scaffold-cleanup check, which has to prove nothing still
   * refers to a file before removing it. Adapters must not use it to make
   * decisions about the user's code.
   */
  listProjectFiles(): string[];
}

/** The package specifiers an adapter's generated code uses. */
export interface IntegrationImports {
  /** The framework's runtime adapter, e.g. `"@themvora/react"`. */
  adapter: string;
  /** The framework's client-only entry, e.g. `"@themvora/next/client"`. */
  client: string;
  /** The core package. */
  core: string;
  /** The core package's Vite subpath. */
  vite: string;
}

/** What an adapter produced. */
export interface IntegrationResult {
  /** The file operations, in application order. */
  files: FileOperation[];
  /** Changes the user must make by hand. */
  manualSteps: ManualStep[];
  /** Non-fatal problems the adapter noticed. */
  warnings: string[];
  /**
   * Extra runtime dependencies this integration needs beyond the framework's
   * own registry packages.
   *
   * Only the Tailwind variant contributes any: selecting `--styling tailwind`
   * is what makes `@themvora/tailwind` a dependency, and a plain-CSS project
   * must not install it. Keeping the list on the result rather than in the
   * framework registry is what keeps "install Tailwind" a consequence of the
   * styling choice instead of a property of the framework.
   */
  packages?: readonly string[];
  /**
   * Build-time dependencies, with the ranges to record in `package.json`.
   *
   * Written into the manifest before the install runs rather than added by a
   * second `add -D` command: the dev flag applies to a whole command, so two
   * commands would resolve the same tree twice for one new project.
   */
  devDependencies?: Readonly<Record<string, string>>;
}

/** What an adapter needs to describe its verification. */
export interface VerificationContext {
  /** The project's manifest, when there is one. */
  manifest: ProjectManifest | null;
  /** The package manager that was detected. */
  packageManager: PackageManager;
}

/** One framework's integration. */
export interface FrameworkAdapter {
  /** Matches `FrameworkIntegration.id`. */
  id: string;
  /** Produce the integration's file operations. */
  integrate(context: IntegrationContext): IntegrationResult;
  /** Describe the checks that prove the integration works. */
  verification(context: VerificationContext): VerificationStep[];
}

/**
 * Run a package manager's script command.
 *
 * @param manager - The detected package manager.
 * @param script - The script name, e.g. `"build"`.
 * @returns The command and arguments to spawn.
 *
 * @remarks
 * Arguments are returned as an array, never a shell string, so a script name can
 * never be interpreted by a shell. `bun` and `yarn` take the script bare;
 * `npm` and `pnpm` need `run` because both also have subcommands with the same
 * names.
 */
export function scriptCommand(
  manager: PackageManager,
  script: string,
): { command: string; args: string[] } {
  if (manager === "npm" || manager === "pnpm") {
    return { command: manager, args: ["run", script] };
  }
  return { command: manager, args: [script] };
}

/**
 * The standard verification every Vite-based integration shares.
 *
 * @param context - The verification context.
 * @param frameworkLabel - The framework name, for the step titles.
 * @returns The verification steps.
 */
export function viteVerification(
  context: VerificationContext,
  frameworkLabel: string,
): VerificationStep[] {
  const steps: VerificationStep[] = [];

  if (context.manifest?.scripts["typecheck"]) {
    const { command, args } = scriptCommand(context.packageManager, "typecheck");
    steps.push({
      id: "typecheck",
      title: `Typecheck the ${frameworkLabel} project`,
      command: { command, args, description: `${command} ${args.join(" ")}` },
      required: true,
    });
  }

  if (context.manifest?.scripts["build"]) {
    const { command, args } = scriptCommand(context.packageManager, "build");
    steps.push({
      id: "build",
      title: `Build the ${frameworkLabel} project`,
      command: { command, args, description: `${command} ${args.join(" ")}` },
      required: true,
    });
  }

  return steps;
}
