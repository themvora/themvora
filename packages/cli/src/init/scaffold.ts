/**
 * Official scaffold commands.
 *
 * Themvora does not generate framework projects. It delegates to each
 * ecosystem's own generator and then integrates into the result, because a
 * hand-maintained copy of a framework's starter is stale the moment that
 * framework ships a template change.
 *
 * Nothing here hard-codes the *contents* of a scaffold's output. That is
 * deliberate: the shape of a Vite or Next template is not ours to depend on, so
 * the integration always re-reads the real files after scaffolding rather than
 * assuming what the generator wrote.
 *
 * ## Installation is Themvora's job, not the generator's
 *
 * Every generator here can install dependencies itself, and every one of them
 * asks the user first. For a Themvora starter that question is noise at best
 * and a contradiction at worst: the CLI installs the framework packages anyway,
 * so answering "No" still ends in an install, and answering "Yes" installs the
 * tree twice. Each command below therefore suppresses the generator's own
 * install step with that generator's documented flag, and `init` runs a single
 * install after the integration has finished editing `package.json`.
 *
 * @packageDocumentation
 */
import type { CommandStep, PackageManager } from "./types.js";

/** The Vite template id per framework. */
const VITE_TEMPLATE: Record<string, string> = {
  react: "react-ts",
  vue: "vue-ts",
  svelte: "svelte-ts",
  solid: "solid-ts",
};

/** How each package manager runs a one-off package's `create` binary. */
function createInvocation(
  manager: PackageManager,
  spec: string,
): { command: string; prefix: string[] } {
  switch (manager) {
    case "pnpm":
      return { command: "pnpm", prefix: ["dlx"] };
    case "yarn":
      return { command: "yarn", prefix: ["dlx"] };
    case "bun":
      return { command: "bunx", prefix: [] };
    default:
      return { command: "npx", prefix: ["--yes"] };
  }
}

/**
 * Build the scaffold command for a framework.
 *
 * @param frameworkId - The `--framework` id.
 * @param projectName - The directory name to create, or `.` to scaffold in place.
 * @param manager - The package manager to drive the generator with.
 * @returns The command, or `null` when the framework has no scaffold strategy.
 *
 * @remarks
 * Arguments are returned as an array and are never concatenated into a shell
 * string, so a project name can never be interpreted as shell syntax.
 *
 * Every flag that would otherwise prompt is supplied explicitly, and the
 * generator's interactive mode is switched off outright, because `init` must
 * never block waiting for input it is about to answer itself:
 *
 * - **create-vite** — `--no-interactive` is the documented switch (Vite's
 *   guide). With it, the generator skips its framework/variant prompts *and*
 *   its "Install with npm and start now?" question, and `--immediate` is what
 *   would otherwise install and launch a dev server. It is never passed.
 * - **create-next-app** — `--yes` answers its remaining preference prompts,
 *   `--skip-install` suppresses its own install, and `--use-<manager>` pins the
 *   manager it would otherwise infer from the invoking shell.
 *
 * The two generators do not accept identical flags, and the argument lists
 * below reflect what each one actually documents.
 */
export function scaffoldCommand(
  frameworkId: string,
  projectName: string,
  manager: PackageManager,
): CommandStep | null {
  const viteTemplate = VITE_TEMPLATE[frameworkId];

  if (viteTemplate) {
    // `npm create <pkg> <name> -- --flag` needs the `--` separator; `pnpm`/`yarn`
    // create and `bun create` do not, and adding one there is an error.
    const separator = manager === "npm" ? ["--"] : [];
    const command = manager === "bun" ? "bun" : manager;
    const createArgs =
      manager === "bun" ? ["create", "vite"] : ["create", "vite@latest"];

    return {
      command,
      args: [
        ...createArgs,
        projectName,
        ...separator,
        "--template",
        viteTemplate,
        "--no-interactive",
      ],
      description: `Scaffold a ${frameworkId} project with Vite's official generator`,
    };
  }

  if (frameworkId === "next") {
    const { command, prefix } = createInvocation(manager, "create-next-app");
    return {
      command,
      args: [
        ...prefix,
        "create-next-app@latest",
        projectName,
        "--typescript",
        "--app",
        "--no-src-dir",
        "--no-tailwind",
        "--no-eslint",
        "--import-alias",
        "@/*",
        // Pins the manager the generator would otherwise infer from the
        // invoking shell — `bun create` is not how this command is launched.
        `--use-${manager}`,
        // `create-next-app` installs its own dependencies by default. Themvora
        // installs once, after the integration has edited `package.json`.
        "--skip-install",
        "--yes",
      ],
      description: "Scaffold a Next.js App Router project with create-next-app",
    };
  }

  return null;
}

/**
 * Whether a framework can be scaffolded from nothing.
 *
 * @param frameworkId - The `--framework` id.
 * @returns `true` when {@link scaffoldCommand} returns a command.
 */
export function canScaffold(frameworkId: string): boolean {
  return VITE_TEMPLATE[frameworkId] !== undefined || frameworkId === "next";
}
