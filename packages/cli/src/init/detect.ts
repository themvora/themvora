/**
 * Project inspection for `init`.
 *
 * Every function here is read-only. Detection answers three questions and
 * nothing else: what is at the target path, what package manager the project
 * uses, and which framework its dependencies indicate. Any answer it cannot
 * reach confidently is reported as `undefined` rather than guessed — `init`
 * stops and asks instead of integrating into a project it does not understand.
 *
 * @packageDocumentation
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { detectFramework, type FrameworkIntegration } from "../frameworks.js";
import type { PackageManager, ProjectKind } from "./types.js";

/** A project's `package.json`, as far as `init` needs to read it. */
export interface ProjectManifest {
  /** The declared package name, when present. */
  name: string | undefined;
  /** Runtime dependency names. */
  dependencies: readonly string[];
  /** Development dependency names. */
  devDependencies: readonly string[];
  /** The `scripts` block, used to discover build and typecheck commands. */
  scripts: Record<string, string>;
  /** The corepack `packageManager` field, e.g. `"pnpm@9.0.0"`. */
  packageManagerField: string | undefined;
}

/**
 * How a package-manager answer was reached.
 *
 * - `declared` — the corepack `packageManager` field named it.
 * - `lockfile` — a lockfile identified it.
 * - `fallback` — nothing identified it and `npm` was assumed.
 *
 * The distinction matters for the interactive wizard: `fallback` is an
 * *assumption*, so a terminal user is asked instead of being handed npm. It
 * also keeps the non-interactive path unchanged — `fallback` still resolves to
 * `npm` there, which is what every script written against the previous release
 * already relies on.
 */
export type PackageManagerSource = "declared" | "lockfile" | "fallback";

/** What `init` learned about the target directory. */
export interface ProjectInspection {
  /** Absolute, normalized project root. */
  projectPath: string;
  /** The directory basename. */
  directoryName: string;
  /** What the directory is. */
  kind: ProjectKind;
  /** The parsed manifest, or `null` when there is none. */
  manifest: ProjectManifest | null;
  /** The package manager detection settled on. */
  packageManager: PackageManager;
  /** How that answer was reached. */
  packageManagerSource: PackageManagerSource;
  /** Every lockfile found, for the ambiguity warning. */
  lockfiles: readonly string[];
  /** Whether several lockfiles made the package-manager choice ambiguous. */
  ambiguousPackageManager: boolean;
  /** The framework the dependencies indicate, if any. */
  detectedFramework: FrameworkIntegration | undefined;
}

/** Lockfile to package manager, in detection priority order. */
const LOCKFILES: readonly { file: string; manager: PackageManager }[] = [
  { file: "pnpm-lock.yaml", manager: "pnpm" },
  { file: "bun.lockb", manager: "bun" },
  { file: "bun.lock", manager: "bun" },
  { file: "yarn.lock", manager: "yarn" },
  { file: "package-lock.json", manager: "npm" },
  { file: "npm-shrinkwrap.json", manager: "npm" },
];

/** The manager named by a corepack `packageManager` field. */
function managerFromField(field: string): PackageManager | undefined {
  const name = field.split("@")[0]?.trim().toLowerCase();
  return name === "npm" || name === "pnpm" || name === "yarn" || name === "bun" ? name : undefined;
}

/**
 * Read a project's `package.json`.
 *
 * @param projectPath - The project root.
 * @returns The parsed manifest, or `null` when the file is absent or unreadable.
 *
 * @remarks
 * A malformed `package.json` returns `null` rather than throwing: `init` treats
 * it as "no usable manifest" and refuses to integrate, which is the same
 * outcome as an absent file and produces a clearer message.
 */
export function readManifest(projectPath: string): ProjectManifest | null {
  const file = join(projectPath, "package.json");
  if (!existsSync(file)) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(file, "utf-8"));
  } catch {
    return null;
  }

  if (typeof parsed !== "object" || parsed === null) return null;
  const record = parsed as Record<string, unknown>;
  const collect = (value: unknown): string[] =>
    typeof value === "object" && value !== null ? Object.keys(value as Record<string, unknown>) : [];

  const scripts: Record<string, string> = {};
  if (typeof record["scripts"] === "object" && record["scripts"] !== null) {
    for (const [key, value] of Object.entries(record["scripts"] as Record<string, unknown>)) {
      if (typeof value === "string") scripts[key] = value;
    }
  }

  return {
    name: typeof record["name"] === "string" ? record["name"] : undefined,
    dependencies: collect(record["dependencies"]),
    devDependencies: collect(record["devDependencies"]),
    scripts,
    packageManagerField:
      typeof record["packageManager"] === "string" ? record["packageManager"] : undefined,
  };
}

/**
 * Determine the package manager a project uses.
 *
 * @param projectPath - The project root.
 * @param manifest - The parsed manifest, when there is one.
 * @returns The manager, the lockfiles found, and whether the choice was ambiguous.
 *
 * @remarks
 * The corepack `packageManager` field wins over a lockfile, because it is an
 * explicit declaration rather than an inference. Otherwise the first lockfile in
 * {@link LOCKFILES} order wins. Several lockfiles is a real problem — it means
 * different tools may resolve different trees — so it is reported rather than
 * silently resolved.
 */
export function detectPackageManager(
  projectPath: string,
  manifest: ProjectManifest | null,
): {
  manager: PackageManager;
  lockfiles: string[];
  ambiguous: boolean;
  source: PackageManagerSource;
} {
  const lockfiles = LOCKFILES.filter((entry) => existsSync(join(projectPath, entry.file))).map(
    (entry) => entry.file,
  );

  const declared = manifest?.packageManagerField
    ? managerFromField(manifest.packageManagerField)
    : undefined;
  if (declared) {
    return { manager: declared, lockfiles, ambiguous: lockfiles.length > 1, source: "declared" };
  }

  const found = LOCKFILES.find((entry) => lockfiles.includes(entry.file));
  return {
    manager: found?.manager ?? "npm",
    lockfiles,
    ambiguous: lockfiles.length > 1,
    source: found ? "lockfile" : "fallback",
  };
}

/**
 * Classify the target directory.
 *
 * @param projectPath - The path the user named.
 * @returns `missing`, `empty` or `existing`.
 *
 * @remarks
 * A directory counts as `existing` when it holds a `package.json` or any file
 * that is not a dotfile. A directory containing only `.git` is `empty` — a
 * freshly cloned, empty repository is a new project, not an existing one.
 */
export function classifyProject(projectPath: string): ProjectKind {
  if (!existsSync(projectPath)) return "missing";

  let stat;
  try {
    stat = statSync(projectPath);
  } catch {
    return "missing";
  }
  if (!stat.isDirectory()) return "existing";

  let entries: string[];
  try {
    entries = readdirSync(projectPath);
  } catch {
    return "existing";
  }

  const meaningful = entries.filter((entry) => !entry.startsWith("."));
  return meaningful.length === 0 ? "empty" : "existing";
}

/**
 * Inspect the target directory.
 *
 * @param target - The path the user named, absolute or relative to `cwd`.
 * @returns Everything detection established about the project.
 */
export function inspectProject(target: string): ProjectInspection {
  const projectPath = resolve(target);
  const kind = classifyProject(projectPath);
  const manifest = kind === "existing" ? readManifest(projectPath) : null;
  const { manager, lockfiles, ambiguous, source } = detectPackageManager(projectPath, manifest);

  const dependencyNames = manifest
    ? [...manifest.dependencies, ...manifest.devDependencies]
    : [];

  return {
    projectPath,
    directoryName: basename(projectPath),
    kind,
    manifest,
    packageManager: manager,
    packageManagerSource: source,
    lockfiles,
    ambiguousPackageManager: ambiguous,
    detectedFramework: detectFramework(dependencyNames),
  };
}
