/**
 * The `init` plan model.
 *
 * `init` is modelled as **detect → resolve → plan → apply → verify**, and this
 * module is the contract between those phases. The split exists for one reason:
 * a plan can be produced, rendered and inspected without touching the
 * filesystem or spawning a process. That is what makes `--plan` and `--dry-run`
 * honest rather than a separate code path that approximates what `apply` would
 * do — they render the *same* plan object `apply` consumes.
 *
 * @packageDocumentation
 */

/** A package manager `init` can drive. */
export type PackageManager = "npm" | "pnpm" | "yarn" | "bun";

/**
 * The styling engine a generated project uses.
 *
 * - `css` — one plain global stylesheet that reads Themvora's semantic custom
 *   properties. The default everywhere, and the only option that needs no extra
 *   dependency.
 * - `tailwind` — Tailwind v4 via `@themvora/tailwind`, whose `@theme` mapping
 *   turns the same semantic tokens into utilities such as `bg-background`.
 *
 * Named `styling` rather than `style` deliberately: `--style` already means a
 * theme *generation* style (`generate --style minimal`), which is a different
 * concern entirely.
 */
export type StylingEngine = "css" | "tailwind";

/**
 * What the target directory is.
 *
 * - `missing` — the path does not exist; a new project will be scaffolded there.
 * - `empty` — the directory exists but holds no project.
 * - `existing` — the directory holds a project (`package.json` or framework files).
 */
export type ProjectKind = "missing" | "empty" | "existing";

/**
 * What will happen to one file.
 *
 * - `create` — the file does not exist and will be written.
 * - `update` — the file exists, is Themvora's, and will be rewritten.
 * - `unchanged` — the file already holds the intended contents; nothing is written.
 * - `conflict` — the file exists and is not Themvora's; `--force` is required.
 * - `delete` — the file is a known, untouched artifact of the framework's own
 *   scaffold and is removed so the starter contains no second styling system.
 *   Only ever planned for a project `init` just scaffolded, and only for paths
 *   on that framework's known-residue list — never for an existing project.
 */
export type FileAction =
  "create" | "update" | "unchanged" | "conflict" | "delete";

/** One file operation in a plan. */
export interface FileOperation {
  /** What will happen to the file. */
  action: FileAction;
  /** Path relative to the project root, always POSIX-separated. */
  path: string;
  /**
   * The file's intended contents.
   *
   * Carried even for `unchanged` so the plan can report a real diff, and for
   * `conflict` so `--force` has something to write.
   */
  contents: string;
  /** Why this operation exists, or why it is a conflict. */
  reason: string;
  /**
   * Whether Themvora owns the whole file.
   *
   * A generated file may be replaced outright with `--force`; a file Themvora
   * only *edits* may not, because the user's own code lives in it.
   */
  generated: boolean;
}

/**
 * A change `init` cannot make safely.
 *
 * Emitted instead of guessing when a file's shape is not recognised — the plan
 * carries the exact snippet and the file it belongs in, so the user finishes the
 * job by hand rather than discovering a silently mangled project later.
 */
export interface ManualStep {
  /** The file the step concerns. */
  path: string;
  /** What the user must do. */
  instruction: string;
  /** The exact code to insert. */
  snippet: string;
}

/** An external command the plan will run. */
export interface CommandStep {
  /** The command to spawn. */
  command: string;
  /** Arguments, always an array — never a shell string. */
  args: readonly string[];
  /** The working directory to run in. Defaults to the project root. */
  cwd?: string;
  /** What the command does, for the rendered plan. */
  description: string;
}

/** A verification `init` will attempt after applying. */
export interface VerificationStep {
  /** Stable identifier, e.g. `"typecheck"`. */
  id: string;
  /** Human-readable description. */
  title: string;
  /** The command to run, or `null` when the check is a file assertion. */
  command: CommandStep | null;
  /**
   * Whether a failure blocks the run.
   *
   * A missing typecheck script is advisory; a failing build is not.
   */
  required: boolean;
}

/** The theme source an `init` run resolved to. */
export interface InitSourceSummary {
  /**
   * The encoded source list, in registry order.
   *
   * This is what a generated file records and what `themvora add` reads back, so
   * a registry can be extended without parsing the TypeScript the CLI wrote.
   */
  sources: readonly string[];
  /** How the source is described in output, e.g. `"preset mint"`. */
  label: string;
  /** The theme family of the first source. */
  family: string;
  /** The theme name the app opens with. */
  defaultTheme: string;
  /** Every theme name the source registers, in order. */
  themes: readonly string[];
  /** The concrete modes the source provides. */
  modes: readonly ("light" | "dark")[];
}

/** The framework an `init` run targets, as the plan reports it. */
export interface InitFrameworkSummary {
  /** The `--framework` id. */
  id: string;
  /** Human-readable name. */
  displayName: string;
  /** The build system the integration targets. */
  buildSystem: string;
  /** Whether the generated app renders on the server. */
  ssr: boolean;
  /** Whether the integration wires the Vite bootstrap plugin. */
  vite: boolean;
}

/**
 * Everything `init` intends to do, resolved and inert.
 *
 * Nothing in this structure has happened yet. `applyInitPlan` is the only thing
 * that writes a file or spawns a command, and it consumes exactly this object.
 */
export interface InitPlan {
  /** Schema version. Bumped only for a breaking change to this shape. */
  version: 1;
  /** Absolute path to the project root. */
  projectPath: string;
  /** The project's name — the directory basename, or `package.json`'s name. */
  projectName: string;
  /** What the target directory is. */
  projectKind: ProjectKind;
  /** The resolved framework. */
  framework: InitFrameworkSummary;
  /** The package manager that will be used. */
  packageManager: PackageManager;
  /** The theme source. */
  source: InitSourceSummary;
  /** The styling engine the generated project uses. */
  styling: StylingEngine;
  /** Whether the richer showcase UI will be generated. */
  example: boolean;
  /** Whether dependencies will be installed. */
  install: boolean;
  /** Whether conflicts may be overwritten. */
  force: boolean;
  /** The scaffolding command, or `null` for an existing project. */
  scaffold: CommandStep | null;
  /**
   * Whether `files` and `manualSteps` are a preview rather than the real set.
   *
   * True only for a new project: the integration is computed against a directory
   * that does not exist yet, so it cannot see the generator's own files. The
   * operations Themvora owns are accurate either way; the *edits* to the
   * generator's files are resolved once the scaffold has run, and the renderer
   * says so rather than showing edits that will not happen.
   */
  preview: boolean;
  /** The files that will be written, in the order they are applied. */
  files: readonly FileOperation[];
  /** The Themvora packages the integration requires. */
  packages: readonly string[];
  /** The install command, or `null` when `--no-install` was passed. */
  installStep: CommandStep | null;
  /**
   * The dev-dependency install command, or `null` when there are none.
   *
   * A separate step rather than a second argument list because the dev flag is
   * per-manager (`-D`, `-d`) and cannot be mixed into a single install line.
   */
  devInstallStep: CommandStep | null;
  /** Changes the user must make by hand. */
  manualSteps: readonly ManualStep[];
  /** The checks that will run after applying. */
  verification: readonly VerificationStep[];
  /** Non-fatal problems worth surfacing before anything is written. */
  warnings: readonly string[];
}

/** The outcome of one verification step. */
export interface VerificationResult {
  /** Matches {@link VerificationStep.id}. */
  id: string;
  /** Human-readable description. */
  title: string;
  /** How the check ended. */
  status: "pass" | "fail" | "skipped";
  /** Detail for a failure or a skip. */
  detail?: string;
}

/** One theme source being added to an existing registry. */
export interface AddSourceSummary {
  /** The encoded source, as it will be recorded. */
  encoded: string;
  /** How the source is described in output. */
  label: string;
}

/**
 * Everything `themvora add` intends to do, resolved and inert.
 *
 * Same shape as {@link InitPlan} where it overlaps, so `--plan` and `--dry-run`
 * behave the same way in both commands.
 */
export interface AddPlan {
  /** Schema version. */
  version: 1;
  /** Absolute path to the project root. */
  projectPath: string;
  /** The generated registry file, relative to the project root. */
  registry: string;
  /** The framework whose registry this is. */
  framework: "vite" | "next";
  /** The source being added. */
  source: AddSourceSummary;
  /** Every encoded source the registry will carry, in order. */
  sources: readonly string[];
  /** Every theme name the registry will carry, in order. */
  themes: readonly string[];
  /** The theme names this add introduces. */
  added: readonly string[];
  /** The theme the app opens with, after the add. */
  defaultTheme: string;
  /** The file operation that will be applied. */
  file: FileOperation;
  /** Non-fatal problems worth surfacing before anything is written. */
  warnings: readonly string[];
}

/** What `add` actually did. */
export interface AddReport {
  /** Schema version. */
  version: 1;
  /** Absolute path to the project root. */
  projectPath: string;
  /** The generated registry file that was written. */
  registry: string;
  /** Whether the registry changed. */
  changed: boolean;
  /** The theme names the registry now carries. */
  themes: readonly string[];
  /** The theme names this add introduced. */
  added: readonly string[];
  /** What the user should do next. */
  nextSteps: readonly string[];
}

/** What `applyInitPlan` actually did. */
export interface InitReport {
  /** Schema version. */
  version: 1;
  /** Absolute path to the project root. */
  projectPath: string;
  /** The framework that was integrated. */
  framework: string;
  /** Files written for the first time. */
  created: readonly string[];
  /** Files rewritten. */
  updated: readonly string[];
  /** Files that already held the intended contents. */
  unchanged: readonly string[];
  /** Files left alone because they are not Themvora's. */
  skipped: readonly string[];
  /**
   * Unused files from the framework's own scaffold that were removed.
   *
   * Only ever non-empty for a project `init` scaffolded in this run, and only
   * for paths on the framework's known-residue list.
   */
  deleted: readonly string[];
  /** Whether the scaffolding command ran. */
  scaffolded: boolean;
  /** Whether dependencies were installed. */
  installed: boolean;
  /** The verification results. */
  verification: readonly VerificationResult[];
  /**
   * Changes the user must still make by hand.
   *
   * Reported from the **apply** phase, not the plan: a file's shape is only
   * knowable once it exists, so an integration that could not make a safe edit
   * says so here. Dropping these would leave a project that looks integrated and
   * silently is not.
   */
  manualSteps: readonly ManualStep[];
  /** Non-fatal problems noticed while applying. */
  warnings: readonly string[];
  /** What the user should do next. */
  nextSteps: readonly string[];
}
