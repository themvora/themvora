/**
 * What the workspace is, beyond what themes it contains.
 *
 * The tree answers "which themes are here". The workspace answers the questions a
 * developer asks before that: is this a Themvora project, which framework is it,
 * which packages are declared, and are they actually installed.
 *
 * Every answer here is evidence-based and says what the evidence was. A guess with
 * no evidence is worse than "unknown", because the next screen offers integration
 * instructions based on it.
 *
 * @packageDocumentation
 */

/** A framework Themvora has an integration for. */
export type FrameworkId =
  | "next"
  | "nuxt"
  | "astro"
  | "remix"
  | "svelte"
  | "solid"
  | "vue"
  | "angular"
  | "react"
  | "unknown";

/** How a declared Themvora package stands. */
export type PackageStatus =
  /** Declared, and a version was found in `node_modules`. */
  | "installed"
  /** Declared, but nothing resolved — installed with a different manager, or not installed. */
  | "missing"
  /** Declared and nothing could be checked. */
  | "unknown";

/** Which dependency block a package was declared in. */
export type DependencyField = "dependencies" | "devDependencies" | "peerDependencies";

/** One `@themvora/*` package the project declares. */
export interface ThemvoraPackage {
  /** The package name. */
  readonly name: string;
  /** The declared range, verbatim from the manifest. */
  readonly declaredRange: string;
  /** Which block declared it. */
  readonly field: DependencyField;
  /** The version found in `node_modules`, when one was found. */
  readonly installedVersion?: string;
  /** The verdict. */
  readonly status: PackageStatus;
}

/** The package manager, when a lockfile says which. */
export type PackageManager = "npm" | "pnpm" | "yarn" | "bun" | "unknown";

/** Everything the workspace overview shows about one folder. */
export interface ProjectProfile {
  /** The framework, or `unknown`. */
  readonly framework: FrameworkId;
  /** What the framework was inferred from, in words. */
  readonly frameworkEvidence: string;
  /** The package manager. */
  readonly packageManager: PackageManager;
  /** What the package manager was inferred from. */
  readonly packageManagerEvidence: string;
  /** Every `@themvora/*` package the manifest declares. */
  readonly packages: readonly ThemvoraPackage[];
}

/**
 * The display name for a framework.
 *
 * @param framework - The detected framework.
 * @returns A product name, or "Unknown".
 */
export function frameworkLabel(framework: FrameworkId): string {
  return FRAMEWORK_RULES.find((rule) => rule.id === framework)?.label ?? "Unknown";
}

/** Evidence for one framework, checked in order. */
interface FrameworkRule {
  readonly id: FrameworkId;
  readonly label: string;
  /** Dependencies any one of which indicates this framework. */
  readonly dependencies: readonly string[];
  /** Config file base names that indicate it. */
  readonly configFiles: readonly string[];
}

/**
 * The framework rules, most specific first.
 *
 * Order matters: a Nuxt project also depends on `vue`, and an Astro project may
 * depend on `react`. The first match wins, so the meta-frameworks are listed
 * before the view libraries they build on.
 */
const FRAMEWORK_RULES: readonly FrameworkRule[] = [
  { id: "next", label: "Next.js", dependencies: ["next"], configFiles: ["next.config"] },
  { id: "nuxt", label: "Nuxt", dependencies: ["nuxt"], configFiles: ["nuxt.config"] },
  { id: "astro", label: "Astro", dependencies: ["astro"], configFiles: ["astro.config"] },
  {
    id: "remix",
    label: "Remix",
    dependencies: ["@remix-run/react", "@remix-run/dev"],
    configFiles: ["remix.config"],
  },
  { id: "svelte", label: "Svelte", dependencies: ["@sveltejs/kit", "svelte"], configFiles: ["svelte.config"] },
  { id: "solid", label: "Solid", dependencies: ["solid-js", "vite-plugin-solid"], configFiles: [] },
  { id: "vue", label: "Vue", dependencies: ["vue"], configFiles: [] },
  { id: "angular", label: "Angular", dependencies: ["@angular/core"], configFiles: ["angular.json"] },
  { id: "react", label: "React", dependencies: ["react"], configFiles: [] },
];

/**
 * The framework each `@themvora/*` integration package is for.
 *
 * The strongest evidence there is: a project that installs `@themvora/react` is a
 * React project, whatever else its manifest contains. Checked before the generic
 * dependency rules so a package integration outranks a shared dependency such as
 * `vue` inside Nuxt.
 */
const THEMVORA_FRAMEWORK_PACKAGES: readonly { readonly pkg: string; readonly id: FrameworkId }[] = [
  { pkg: "@themvora/next", id: "next" },
  { pkg: "@themvora/nuxt", id: "nuxt" },
  { pkg: "@themvora/astro", id: "astro" },
  { pkg: "@themvora/remix", id: "remix" },
  { pkg: "@themvora/svelte", id: "svelte" },
  { pkg: "@themvora/solid", id: "solid" },
  { pkg: "@themvora/vue", id: "vue" },
  { pkg: "@themvora/angular", id: "angular" },
  { pkg: "@themvora/react", id: "react" },
];

/** Lockfiles, and the manager each implies. */
const LOCKFILES: readonly { readonly file: string; readonly manager: PackageManager }[] = [
  { file: "pnpm-lock.yaml", manager: "pnpm" },
  { file: "yarn.lock", manager: "yarn" },
  { file: "bun.lockb", manager: "bun" },
  { file: "bun.lock", manager: "bun" },
  { file: "package-lock.json", manager: "npm" },
];

/** The dependency scope every Themvora package is published under. */
const THEMVORA_SCOPE = "@themvora/";

/**
 * Whether a value is a plain object.
 *
 * @param value - The value.
 * @returns `true` for a non-null, non-array object.
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Extensions a config file may carry. */
const CONFIG_EXTENSIONS = [".mjs", ".cjs", ".mts", ".cts", ".js", ".ts", ".json", ".yaml", ".yml", ".toml"];

/**
 * A config file's name without its extension.
 *
 * Strips a known extension rather than everything after the first dot: a
 * `next.config.mjs` must reduce to `next.config`, not `next`, or every rule
 * would match the wrong file.
 *
 * @param path - A workspace-relative path.
 * @returns For `astro.config.mjs`, `astro.config`.
 */
function configStem(path: string): string {
  const name = path.slice(path.lastIndexOf("/") + 1);
  const extension = CONFIG_EXTENSIONS.find((candidate) => name.endsWith(candidate));
  return extension === undefined ? name : name.slice(0, -extension.length);
}

/**
 * Detect the framework from declared dependencies, then config files.
 *
 * @param declared - Every dependency name the manifest declares.
 * @param files - Workspace-relative file paths.
 * @returns The framework and the evidence for it.
 */
function detectFramework(
  declared: ReadonlySet<string>,
  files: readonly string[],
): { framework: FrameworkId; evidence: string } {
  const stems = new Set(files.map(configStem));

  // An integration package first: it names the framework outright, whereas a
  // shared dependency or a bundler config file only hints at one.
  const integration = THEMVORA_FRAMEWORK_PACKAGES.find((entry) => declared.has(entry.pkg));
  if (integration !== undefined) {
    return { framework: integration.id, evidence: `${integration.pkg} is declared` };
  }

  for (const rule of FRAMEWORK_RULES) {
    const dependency = rule.dependencies.find((name) => declared.has(name));
    if (dependency !== undefined) {
      return { framework: rule.id, evidence: `${dependency} is declared` };
    }

    const config = rule.configFiles.find((stem) => stems.has(stem));
    if (config !== undefined) {
      return { framework: rule.id, evidence: `${config}.* is present` };
    }
  }

  return { framework: "unknown", evidence: "no framework dependency or config file was found" };
}

/**
 * Detect the package manager.
 *
 * The `packageManager` field wins over a lockfile, because it is the explicit
 * statement; a lockfile only records what was last used.
 *
 * @param manifest - The parsed manifest.
 * @param files - Workspace-relative file paths.
 * @returns The manager and the evidence for it.
 */
function detectPackageManager(
  manifest: Record<string, unknown> | null,
  files: readonly string[],
): { manager: PackageManager; evidence: string } {
  const declared = manifest?.["packageManager"];
  if (typeof declared === "string") {
    const name = declared.split("@")[0] ?? "";
    if (name === "npm" || name === "pnpm" || name === "yarn" || name === "bun") {
      return { manager: name, evidence: `packageManager field says ${declared}` };
    }
  }

  for (const entry of LOCKFILES) {
    if (files.includes(entry.file)) {
      return { manager: entry.manager, evidence: `${entry.file} is present` };
    }
  }

  return { manager: "unknown", evidence: "no lockfile was found" };
}

/**
 * The `@themvora/*` packages a manifest declares, by name.
 *
 * Exists so a caller can resolve versions before building a profile: the resolver
 * needs the names to look for, and the profile needs the versions it found.
 *
 * @param manifestText - The `package.json` contents, or `null`.
 * @returns The declared package names, sorted and deduplicated.
 */
export function declaredThemvoraPackages(manifestText: string | null): string[] {
  const names = new Set<string>();
  if (manifestText === null) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(manifestText);
  } catch {
    return [];
  }
  if (!isRecord(parsed)) return [];

  for (const field of ["dependencies", "devDependencies", "peerDependencies"] as const) {
    const block = parsed[field];
    if (!isRecord(block)) continue;
    for (const name of Object.keys(block)) {
      if (name.startsWith(THEMVORA_SCOPE)) names.add(name);
    }
  }

  return [...names].sort();
}

/**
 * Read the profile of a project.
 *
 * @param manifestText - The `package.json` contents, or `null` when absent.
 * @param files - Workspace-relative file paths, from the reader's walk.
 * @param installedVersions - Resolved versions, keyed by package name. Empty when
 *   nothing could be resolved.
 * @returns The profile.
 *
 * @remarks
 * A declared package is **not** reported as installed. `installedVersions` is the
 * only evidence accepted for that, so a project that declares `@themvora/react`
 * without installing it reads as `missing` — which is the state that actually
 * breaks the app.
 */
export function readProjectProfile(
  manifestText: string | null,
  files: readonly string[],
  installedVersions: ReadonlyMap<string, string>,
): ProjectProfile {
  let manifest: Record<string, unknown> | null = null;

  if (manifestText !== null) {
    try {
      const parsed: unknown = JSON.parse(manifestText);
      manifest = isRecord(parsed) ? parsed : null;
    } catch {
      manifest = null;
    }
  }

  const declaredNames = new Set<string>();
  const packages: ThemvoraPackage[] = [];

  for (const field of ["dependencies", "devDependencies", "peerDependencies"] as const) {
    const block = manifest?.[field];
    if (!isRecord(block)) continue;

    for (const [name, range] of Object.entries(block)) {
      if (typeof range !== "string") continue;
      declaredNames.add(name);
      if (!name.startsWith(THEMVORA_SCOPE)) continue;

      const installedVersion = installedVersions.get(name);
      packages.push({
        name,
        declaredRange: range,
        field,
        status: installedVersion === undefined ? "missing" : "installed",
        ...(installedVersion === undefined ? {} : { installedVersion }),
      });
    }
  }

  const framework = detectFramework(declaredNames, files);
  const manager = detectPackageManager(manifest, files);

  return {
    framework: framework.framework,
    frameworkEvidence: framework.evidence,
    packageManager: manager.manager,
    packageManagerEvidence: manager.evidence,
    packages: packages.sort((left, right) => left.name.localeCompare(right.name)),
  };
}
