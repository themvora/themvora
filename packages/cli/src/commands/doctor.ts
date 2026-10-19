import { THEMVORA_CONFIG_FILES } from "@themvora/core/config";
import {
  generateTheme,
  validateTheme,
  type ThemeDefinition,
} from "@themvora/core";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { getBool } from "../utils.js";
import type { ParsedArgs } from "../utils.js";
import { CommandExit, ExitCodes } from "../exit-codes.js";
import { detectFramework, type FrameworkIntegration } from "../frameworks.js";
import { paint, wantsJson, wantsQuiet, writeJson } from "../output.js";

type Level = "error" | "warning" | "info";

/** One check result. */
interface Finding {
  id: string;
  level: Level;
  title: string;
  detail: string;
  /** What to do about it, when there is a concrete correction. */
  fix: string | null;
}

/** The health report, as data. */
interface DoctorReport {
  directory: string;
  framework: { id: string; displayName: string; initSupported: boolean } | null;
  packageManager: string | null;
  findings: Finding[];
  summary: { errors: number; warnings: number; info: number; healthy: boolean };
}

/** A finding builder that omits `fix` when there is none. */
function finding(
  id: string,
  level: Level,
  title: string,
  detail: string,
  fix?: string,
): Finding {
  return { id, level, title, detail, fix: fix ?? null };
}

/** Read and parse a project's `package.json`. */
function readManifest(
  directory: string,
): { name: string; dependencies: string[] } | { error: string } {
  const file = join(directory, "package.json");
  if (!existsSync(file)) return { error: `no package.json in ${directory}` };

  try {
    const manifest = JSON.parse(readFileSync(file, "utf8")) as {
      name?: string;
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
      peerDependencies?: Record<string, string>;
    };

    const dependencies = [
      ...Object.keys(manifest.dependencies ?? {}),
      ...Object.keys(manifest.devDependencies ?? {}),
      ...Object.keys(manifest.peerDependencies ?? {}),
    ];

    return { name: manifest.name ?? "(unnamed)", dependencies };
  } catch {
    return { error: "package.json is not valid JSON" };
  }
}

/** The package manager a project's lockfiles indicate. */
function detectPackageManager(directory: string): {
  name: string | null;
  found: string[];
} {
  const lockfiles: [string, string][] = [
    ["pnpm-lock.yaml", "pnpm"],
    ["package-lock.json", "npm"],
    ["yarn.lock", "yarn"],
    ["bun.lockb", "bun"],
  ];

  const found = lockfiles.filter(([file]) => existsSync(join(directory, file)));
  return { name: found[0]?.[1] ?? null, found: found.map(([file]) => file) };
}

/** The `theme.config.*` file a project has, if any. */
function findConfigFile(directory: string): string | null {
  return (
    THEMVORA_CONFIG_FILES.find((name) => existsSync(join(directory, name))) ??
    null
  );
}

/**
 * The theme JSON files a project has.
 *
 * Deliberately shallow — the project root, `*.theme.json` at the root, and one
 * level of `themes/`. A health check must never walk a filesystem.
 */
function findThemeFiles(directory: string): string[] {
  const files = new Set<string>();

  const rootTheme = join(directory, "theme.json");
  if (existsSync(rootTheme)) files.add(rootTheme);

  for (const entry of readdirSync(directory)) {
    if (entry.endsWith(".theme.json")) files.add(join(directory, entry));
  }

  const themesDir = join(directory, "themes");
  if (existsSync(themesDir) && statSync(themesDir).isDirectory()) {
    for (const entry of readdirSync(themesDir)) {
      if (entry.endsWith(".json")) files.add(join(themesDir, entry));
    }
  }

  return [...files].sort();
}

/** The generation algorithm the shipped generator currently produces. */
function currentAlgorithm(): string {
  return (
    generateTheme({ seed: "#000000" }).light.meta?.generation?.algorithm ??
    "unknown"
  );
}

/** Read the generation algorithms recorded in a theme file. */
function recordedAlgorithms(file: string): {
  algorithms: string[];
  error: string | null;
} {
  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(file, "utf8"));
  } catch {
    return { algorithms: [], error: "not valid JSON" };
  }

  const candidates: ThemeDefinition[] =
    typeof parsed === "object" &&
    parsed !== null &&
    "light" in parsed &&
    "dark" in parsed
      ? [
          (parsed as { light: ThemeDefinition }).light,
          (parsed as { dark: ThemeDefinition }).dark,
        ]
      : [parsed as ThemeDefinition];

  return {
    algorithms: candidates
      .map((theme) => theme.meta?.generation?.algorithm)
      .filter((value): value is string => typeof value === "string"),
    error: null,
  };
}

/** Run every check. */
function diagnose(directory: string): DoctorReport {
  const findings: Finding[] = [];

  // --- project ---------------------------------------------------------------
  const manifest = readManifest(directory);
  if ("error" in manifest) {
    findings.push(
      finding(
        "project",
        "error",
        "Project manifest",
        manifest.error,
        "Run doctor from a project root, or pass a directory.",
      ),
    );

    return {
      directory,
      framework: null,
      packageManager: null,
      findings,
      summary: summarise(findings),
    };
  }

  findings.push(
    finding(
      "project",
      "info",
      "Project manifest",
      `${manifest.name} — ${manifest.dependencies.length} dependencies`,
    ),
  );

  // --- package manager -------------------------------------------------------
  const { name: packageManager, found } = detectPackageManager(directory);
  if (found.length === 0) {
    findings.push(
      finding(
        "package-manager",
        "warning",
        "Package manager",
        "no lockfile found",
        "Commit a lockfile so installs are reproducible.",
      ),
    );
  } else if (found.length > 1) {
    findings.push(
      finding(
        "package-manager",
        "warning",
        "Package manager",
        `${found.length} lockfiles found: ${found.join(", ")}`,
        "Keep one lockfile; several let different tools resolve different trees.",
      ),
    );
  } else {
    findings.push(
      finding("package-manager", "info", "Package manager", packageManager!),
    );
  }

  // --- framework -------------------------------------------------------------
  const framework: FrameworkIntegration | undefined = detectFramework(
    manifest.dependencies,
  );
  if (!framework) {
    findings.push(
      finding(
        "framework",
        "warning",
        "Framework",
        "no supported framework detected from dependencies",
        "Pass a theme source explicitly, or install a framework Themvora integrates with.",
      ),
    );
  } else {
    findings.push(
      finding(
        "framework",
        "info",
        "Framework",
        `${framework.displayName} (${framework.buildSystem}${framework.ssr ? ", SSR" : ""})`,
      ),
    );

    if (!framework.initSupported) {
      findings.push(
        finding(
          "framework-support",
          "info",
          "Init support",
          `${framework.displayName} is a supported library integration but not an \`init\` target yet`,
          `Install the integration manually: ${framework.packages.join(", ")}`,
        ),
      );
    }
  }

  // --- Themvora packages -----------------------------------------------------
  const themvora = manifest.dependencies.filter((name) =>
    name.startsWith("@themvora/"),
  );
  if (themvora.length === 0) {
    findings.push(
      finding(
        "themvora-packages",
        "error",
        "Themvora packages",
        "none installed",
        "Install @themvora/core (and the integration for your framework).",
      ),
    );
  } else {
    findings.push(
      finding(
        "themvora-packages",
        "info",
        "Themvora packages",
        themvora.join(", "),
      ),
    );
  }

  // --- integration for the detected framework --------------------------------
  if (framework) {
    const missing = framework.packages.filter(
      (name) => !themvora.includes(name),
    );
    if (missing.length > 0 && themvora.length > 0) {
      findings.push(
        finding(
          "framework-integration",
          "warning",
          "Framework integration",
          `${framework.displayName} is in use but ${missing.join(", ")} is not installed`,
          `Install it: ${missing.join(" ")}`,
        ),
      );
    }
  }

  // --- theme.config ----------------------------------------------------------
  const configFile = findConfigFile(directory);
  if (configFile === null) {
    findings.push(
      finding(
        "theme-config",
        "warning",
        "Theme config",
        `no ${THEMVORA_CONFIG_FILES[0]} found`,
        "Add a theme.config.ts so the pre-paint bootstrap and the runtime read one registry.",
      ),
    );
  } else if (!themvora.includes("@themvora/core")) {
    findings.push(
      finding(
        "theme-config",
        "error",
        "Theme config",
        `${configFile} exists but @themvora/core is not a dependency`,
        "Install @themvora/core, or remove the config file.",
      ),
    );
  } else {
    findings.push(finding("theme-config", "info", "Theme config", configFile));
  }

  // --- theme files -----------------------------------------------------------
  const themeFiles = findThemeFiles(directory);
  if (themeFiles.length === 0) {
    findings.push(
      finding(
        "theme-files",
        "info",
        "Theme files",
        "none found in the project root or themes/",
      ),
    );
  } else {
    const expected = currentAlgorithm();
    let invalid = 0;
    let outdated = 0;

    for (const file of themeFiles) {
      const { algorithms, error } = recordedAlgorithms(file);

      if (error) {
        invalid += 1;
        findings.push(
          finding(
            "theme-files",
            "error",
            "Theme files",
            `${file} — ${error}`,
            "Fix or remove the file.",
          ),
        );
        continue;
      }

      try {
        const parsed = JSON.parse(readFileSync(file, "utf8")) as unknown;
        const themes: ThemeDefinition[] =
          typeof parsed === "object" &&
          parsed !== null &&
          "light" in parsed &&
          "dark" in parsed
            ? [
                (parsed as { light: ThemeDefinition }).light,
                (parsed as { dark: ThemeDefinition }).dark,
              ]
            : [parsed as ThemeDefinition];

        for (const theme of themes) {
          if (!validateTheme(theme).valid) {
            invalid += 1;
            findings.push(
              finding(
                "theme-files",
                "error",
                "Theme files",
                `${file} — "${theme.name}" is missing required tokens`,
                "Run `themvora validate <file>` for the full list.",
              ),
            );
          }
        }
      } catch {
        invalid += 1;
        findings.push(
          finding(
            "theme-files",
            "error",
            "Theme files",
            `${file} — unreadable`,
            "Fix or remove the file.",
          ),
        );
      }

      const stale = algorithms.filter((algorithm) => algorithm !== expected);
      if (stale.length > 0) {
        outdated += 1;
        findings.push(
          finding(
            "generator-metadata",
            "warning",
            "Generator metadata",
            `${file} was generated by ${[...new Set(stale)].join(", ")}, current is ${expected}`,
            "Regenerate it, or run `themvora migrate <file>`.",
          ),
        );
      }
    }

    if (invalid === 0 && outdated === 0) {
      findings.push(
        finding(
          "theme-files",
          "info",
          "Theme files",
          `${themeFiles.length} valid, generated by ${expected}`,
        ),
      );
    }
  }

  return {
    directory,
    framework: framework
      ? {
          id: framework.id,
          displayName: framework.displayName,
          initSupported: framework.initSupported,
        }
      : null,
    packageManager,
    findings,
    summary: summarise(findings),
  };
}

/** Count findings by level. */
function summarise(findings: Finding[]): DoctorReport["summary"] {
  const errors = findings.filter((item) => item.level === "error").length;
  const warnings = findings.filter((item) => item.level === "warning").length;
  const info = findings.filter((item) => item.level === "info").length;
  return { errors, warnings, info, healthy: errors === 0 };
}

/** Render the human report. */
function renderReport(report: DoctorReport, quiet: boolean): string {
  const lines: string[] = [
    `${paint("bold", "themvora doctor")} — ${report.directory}`,
    "",
  ];

  for (const item of report.findings) {
    if (quiet && item.level === "info") continue;

    const marker =
      item.level === "error"
        ? paint("red", "✗")
        : item.level === "warning"
          ? paint("yellow", "!")
          : paint("green", "✓");

    lines.push(`  ${marker} ${item.title.padEnd(20)}${item.detail}`);
    if (item.fix !== null) lines.push(`      ${paint("dim", `→ ${item.fix}`)}`);
  }

  const { errors, warnings } = report.summary;
  lines.push("");
  lines.push(
    errors > 0
      ? paint("red", `${errors} error(s), ${warnings} warning(s)`)
      : warnings > 0
        ? paint("yellow", `healthy, with ${warnings} warning(s)`)
        : paint("green", "healthy"),
  );

  return lines.join("\n");
}

/**
 * Implements the `doctor` command.
 *
 * Reports the health of a Themvora project: its framework, package manager,
 * installed Themvora packages, theme configuration, and theme files. Only checks
 * the CLI can make reliably are performed, and every finding that has a concrete
 * correction carries it.
 *
 * Warnings and errors are distinct: a project with warnings is still healthy
 * (exit `0`); an actionable failure is exit `3`.
 *
 * Reads an optional `<dir>` (default: the current directory), plus `--json` and
 * `--quiet`.
 *
 * @param args The parsed command-line arguments.
 */
export async function cmdDoctor(args: ParsedArgs) {
  const directory = args._[1] ?? process.cwd();
  const quiet = wantsQuiet(args) || getBool(args, "quiet");

  if (!existsSync(directory) || !statSync(directory).isDirectory()) {
    process.stderr.write(`Error: not a directory: ${directory}\n`);
    throw new CommandExit(ExitCodes.Error);
  }

  const report = diagnose(directory);

  if (wantsJson(args)) {
    writeJson(report);
    if (!report.summary.healthy)
      throw new CommandExit(ExitCodes.ValidationFailed);
    return;
  }

  process.stdout.write(`${renderReport(report, quiet)}\n`);

  if (!report.summary.healthy)
    throw new CommandExit(ExitCodes.ValidationFailed);
}
