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
 * @param projectName - The directory name to create.
 * @param manager - The package manager to drive the generator with.
 * @param options - Generation options. `install: false` forwards the generator's
 *   own "do not install" flag, so `themvora init --no-install` installs nothing.
 * @returns The command, or `null` when the framework has no scaffold strategy.
 *
 * @remarks
 * Arguments are returned as an array and are never concatenated into a shell
 * string, so a project name can never be interpreted as shell syntax. Every
 * generator flag that would otherwise prompt is supplied explicitly, because
 * `init` must never block waiting for input in a non-interactive shell.
 */
export function scaffoldCommand(
  frameworkId: string,
  projectName: string,
  manager: PackageManager,
  options: { install?: boolean } = {},
): CommandStep | null {
  const viteTemplate = VITE_TEMPLATE[frameworkId];

  if (viteTemplate) {
    // `npm create <pkg> <name> -- --flag` needs the `--` separator; `pnpm`/`yarn`
    // create and `bun create` do not, and adding one there is an error.
    const separator = manager === "npm" ? ["--"] : [];
    const command = manager === "bun" ? "bun" : manager;
    const createArgs =
      manager === "npm"
        ? ["create", "vite@latest"]
        : manager === "bun"
          ? ["create", "vite"]
          : ["create", "vite@latest"];

    return {
      command,
      args: [
        ...createArgs,
        projectName,
        ...separator,
        "--template",
        viteTemplate,
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
        "--no-turbopack",
        "--import-alias",
        "@/*",
        "--use-npm",
        // `--no-install` must install nothing at all — `create-next-app`
        // installs its own dependencies by default, so it needs its own flag.
        ...(options.install === false ? ["--skip-install"] : []),
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
