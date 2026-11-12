/**
 * Interactive project creation for `init`.
 *
 * The wizard answers exactly four questions — project name, package manager,
 * framework, styling — and only the ones the command line did not already
 * answer. That "only the ones" is the whole design: `themvora init my-app --tool
 * pnpm --framework react --styling css` runs with no prompts at all, and every
 * prefix of that command prompts for precisely the remainder.
 *
 * Two behaviours are deliberate and worth stating:
 *
 * - **An existing project is never turned into a new one.** If the target holds
 *   a project, the wizard does not run at all; `init` integrates, and reports
 *   the supported framework list when it cannot tell which framework it is. The
 *   styling question is part of that: an existing project's stylesheets are the
 *   user's, so there is nothing to choose.
 * - **A non-interactive process never blocks.** When there is no usable TTY the
 *   missing value is a usage error naming the flag that supplies it, which is
 *   what keeps `init` usable in CI.
 *
 * @packageDocumentation
 */
import { resolve } from "node:path";
import { getString } from "../utils.js";
import type { ParsedArgs } from "../utils.js";
import { UsageError } from "../exit-codes.js";
import { INIT_FRAMEWORKS } from "../frameworks.js";
import { classifyProject, inspectProject } from "./detect.js";
import { defaultPackageManager, resolveExplicitPackageManager } from "./package-manager.js";
import type { PromptAdapter } from "./prompts.js";
import { isSafeProjectName } from "./runner.js";
import { DEFAULT_STYLING } from "./styling.js";
import type { PackageManager, StylingEngine } from "./types.js";

/** The values the wizard and the flags together resolved. */
export interface InitIntent {
  /** The directory to create or integrate, as the user named it. */
  target: string;
  /** The resolved framework id. */
  frameworkId: string;
  /**
   * The resolved package manager, or `undefined` when detection should decide.
   *
   * `undefined` is not "unknown": it means nothing needed an answer, so the
   * existing detection chain (corepack field → lockfile → npm) still owns it.
   */
  packageManager: PackageManager | undefined;
  /**
   * The styling engine, or `undefined` when the caller's default should decide.
   *
   * Same distinction as `packageManager`: an answer here means a person or a
   * flag chose it, and `undefined` means "whatever `init` defaults to" — which
   * is what keeps the documented `--styling` default in one place instead of
   * duplicated in the wizard.
   */
  styling: StylingEngine | undefined;
  /** The name the wizard created the project under, when it asked for one. */
  projectName: string | undefined;
  /** Whether any question was asked. */
  wizard: boolean;
}

/** Everything {@link resolveInitIntent} needs. */
export interface InitIntentOptions {
  /** The parsed arguments. */
  args: ParsedArgs;
  /** Whether prompts may be shown. */
  interactive: boolean;
  /** The prompt implementation. */
  prompt: PromptAdapter;
  /** The `--styling` value, already validated, when the user supplied one. */
  styling?: StylingEngine;
  /** The directory relative targets resolve against. Defaults to `process.cwd()`. */
  cwd?: string;
  /** The environment the invoking package manager is read from. */
  env?: NodeJS.ProcessEnv;
  /** Called once, before the first question, when the wizard will run. */
  onWizardStart?: () => void;
}

/** The framework ids `init` can scaffold, for an actionable message. */
function supportedFrameworks(): string {
  return INIT_FRAMEWORKS.map((framework) => framework.id).join(", ");
}

/**
 * Validate a project name typed at the prompt.
 *
 * @param name - What the user typed.
 * @param cwd - The directory the project would be created in.
 * @returns `true`, or the reason the name cannot be used.
 *
 * @remarks
 * The checks are ordered from cheapest to most specific so the message names
 * the real problem: an empty answer, a path, an unsafe character set, and only
 * then the filesystem. The last check is the one that protects a user's work —
 * a name that collides with a non-empty directory is refused here rather than
 * discovered after the generator has written into it.
 */
export function validateProjectName(name: string, cwd: string): true | string {
  const trimmed = name.trim();

  if (trimmed.length === 0) return "a project name is required";
  if (trimmed === "." || trimmed === "..") return 'choose a name other than "." or ".."';
  if (trimmed.includes("/") || trimmed.includes("\\")) {
    return "the name must be a single directory name, not a path";
  }
  if (!isSafeProjectName(trimmed)) {
    return "use only letters, digits, dots, dashes and underscores, starting with a letter or digit";
  }
  if (classifyProject(resolve(cwd, trimmed)) === "existing") {
    return `${trimmed} already exists and is not empty — choose another name`;
  }
  return true;
}

/** The package-manager menu, in the order the docs list them. */
const MANAGER_CHOICES: readonly {
  value: PackageManager;
  name: string;
  description: string;
}[] = [
  { value: "npm", name: "npm", description: "Node's built-in package manager" },
  { value: "pnpm", name: "pnpm", description: "Fast, disk-efficient, strict dependency isolation" },
  { value: "yarn", name: "yarn", description: "Yarn classic or Berry" },
  { value: "bun", name: "bun", description: "Bun's built-in package manager" },
];

/**
 * The styling menu.
 *
 * The order answers the question as it is asked — "Would you like Tailwind?" —
 * so *Yes* comes first. The **preselection** is a separate decision and lives in
 * {@link DEFAULT_STYLING}: plain CSS, the same value a run with no terminal
 * gets. Keeping the two apart is deliberate, because they answer different
 * questions: the order reads the prompt, the default resolves the setting.
 */
const STYLING_CHOICES: readonly {
  value: StylingEngine;
  name: string;
  description: string;
}[] = [
  {
    value: "tailwind",
    name: "Yes — Tailwind CSS",
    description: "Tailwind CSS v4 with @themvora/tailwind",
  },
  {
    value: "css",
    name: "No — Plain CSS",
    description: "One semantic stylesheet, no Tailwind dependency",
  },
];

/**
 * Resolve what `init` should do, asking only for what is missing.
 *
 * @param options - The arguments, the prompt implementation and the environment.
 * @returns The target, framework and package manager to act on.
 *
 * @throws {UsageError} When a required value is missing and cannot be asked for,
 *   or when the target is an existing project whose framework cannot be
 *   determined.
 */
export async function resolveInitIntent(options: InitIntentOptions): Promise<InitIntent> {
  const { args, interactive, prompt } = options;
  const cwd = options.cwd ?? process.cwd();
  const positional = args._[1];
  const explicitFramework = getString(args, "framework");
  const explicitManager = resolveExplicitPackageManager(args);

  let target = positional ?? ".";
  const inspection = inspectProject(target);

  // An existing project is integrated, never re-scaffolded. Detection decides
  // the framework unless `--framework` overrides it; when neither answers, the
  // run stops with the supported list rather than guessing or creating a second
  // project next to the user's.
  if (inspection.kind === "existing") {
    const frameworkId = explicitFramework ?? inspection.detectedFramework?.id;
    if (!frameworkId) {
      throw new UsageError(
        `could not detect a supported framework in ${inspection.projectPath} — ` +
          `pass --framework <id> (supported: ${supportedFrameworks()})`,
      );
    }
    return {
      target,
      frameworkId,
      packageManager: explicitManager,
      // An existing project's stylesheets are the user's. The flag is carried
      // through so the command can say it had no effect, but nothing here asks
      // a question whose answer could rewrite someone's CSS.
      styling: options.styling,
      projectName: undefined,
      wizard: false,
    };
  }

  // --- a new project ---

  // A name is only asked for when the user named no directory at all: `init .`
  // is an explicit request to scaffold in place.
  const asksName = interactive && positional === undefined;
  // A lockfile or a corepack field is an answer; `fallback` is an assumption, so
  // a terminal user is asked instead of silently receiving npm.
  const asksManager =
    interactive && explicitManager === undefined && inspection.packageManagerSource === "fallback";
  const asksFramework = explicitFramework === undefined;
  // `--styling` is an answer; otherwise the person in front of the terminal
  // decides, because it is the one choice that changes the generated markup
  // rather than just the packages around it.
  const asksStyling = interactive && options.styling === undefined;

  if (!interactive) {
    if (explicitFramework === undefined) {
      throw new UsageError(
        `a new project needs --framework <id> (supported: ${supportedFrameworks()})`,
      );
    }
    return {
      target,
      frameworkId: explicitFramework,
      packageManager: explicitManager,
      styling: options.styling,
      projectName: undefined,
      wizard: false,
    };
  }

  const wizard = asksName || asksManager || asksFramework || asksStyling;
  if (wizard) options.onWizardStart?.();

  let projectName: string | undefined;
  if (asksName) {
    const answer = await prompt.input({
      message: "What would you like to name your project?",
      validate: (value) => validateProjectName(value, cwd),
    });
    projectName = answer.trim();
    target = projectName;
  }

  let packageManager = explicitManager;
  if (packageManager === undefined && asksManager) {
    packageManager = await prompt.select<PackageManager>({
      message: "Which package manager would you like to use?",
      choices: MANAGER_CHOICES,
      default: defaultPackageManager(options.env),
    });
  }

  let frameworkId = explicitFramework;
  if (frameworkId === undefined) {
    frameworkId = await prompt.select<string>({
      message: "Which framework would you like to use?",
      choices: INIT_FRAMEWORKS.map((framework) => ({
        name: framework.displayName,
        value: framework.id,
        description: `${framework.buildSystem} · ${
          framework.ssr ? "server-rendered" : "client-rendered"
        }`,
      })),
      default: INIT_FRAMEWORKS[0]!.id,
    });
  }

  let styling = options.styling;
  if (styling === undefined && asksStyling) {
    styling = await prompt.select<StylingEngine>({
      message: "Would you like to use Tailwind CSS with Themvora?",
      choices: STYLING_CHOICES,
      // Not a second default: the same constant the flag falls back to, so the
      // prompt and a scripted run cannot disagree.
      default: DEFAULT_STYLING,
    });
  }

  return { target, frameworkId, packageManager, styling, projectName, wizard };
}
