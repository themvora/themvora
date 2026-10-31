/**
 * What a workspace is actually set up for.
 *
 * The extension used to answer one question — "did we find a theme file?" — and
 * every surface inherited that answer. A C++ project with no Themvora at all and
 * a React app whose `@themvora/core` is declared but not installed both looked
 * like "not found", and the Studio opened onto nothing.
 *
 * This module separates the cases the user can act on differently. It reads the
 * evidence the inspector already produced — declared and resolved packages,
 * registry files and their themes, provider usage — and never infers from a
 * single package name or from the absence of one conventional file.
 *
 * @packageDocumentation
 */
import type { ProjectProfile } from "./projectProfile.js";
import type { ProjectInspection } from "./registry.js";

/**
 * The setup verdict.
 *
 * - `configured` — a recognized integration with readable theme source.
 * - `no-project-themes` — the integration is there, the project defines no theme.
 * - `dependency-unresolved` — source or project evidence says Themvora is used,
 *   but the package is missing, malformed or not installed.
 * - `unsupported` — theme source exists but cannot be read by this version.
 * - `not-configured` — no convincing evidence of Themvora at all.
 */
export type WorkspaceSetupKind =
  | "configured"
  | "no-project-themes"
  | "dependency-unresolved"
  | "unsupported"
  | "not-configured";

/** The verdict plus the evidence behind it. */
export interface WorkspaceSetup {
  readonly kind: WorkspaceSetupKind;
  /** One sentence for a heading or a notification. */
  readonly summary: string;
  /** What was looked for and what was found, for the onboarding panel. */
  readonly evidence: readonly string[];
  /**
   * Whether project-integrated Studio work can start.
   *
   * False only when there is nothing project-specific to open: a configured
   * project, or one with the package installed but no theme of its own, both
   * keep the Studio — the second one falls back to the catalog.
   */
  readonly studioEnabled: boolean;
  /**
   * Whether the bundled catalog can be browsed.
   *
   * Always true: the catalog ships with the extension, so it does not depend on
   * the workspace at all. It is stated rather than assumed so a caller cannot
   * disable it by accident.
   */
  readonly catalogAvailable: boolean;
}

/** Every `@themvora/*` package a profile declares. */
function declaredThemvora(profile: ProjectProfile | undefined): readonly { name: string; status: string }[] {
  return (profile?.packages ?? []).filter((entry) => entry.name.startsWith("@themvora/"));
}

/**
 * Work out what a workspace is set up for.
 *
 * @param inspection - What the inspector found, or `undefined` when it has not run.
 * @param profile - The framework/package profile, when one could be read.
 * @returns The verdict and its evidence.
 */
export function workspaceSetup(
  inspection: ProjectInspection | undefined,
  profile: ProjectProfile | undefined,
): WorkspaceSetup {
  if (inspection === undefined) {
    return {
      kind: "not-configured",
      summary: "No project has been inspected yet.",
      evidence: ["Open a folder so the extension can look for Themvora usage."],
      studioEnabled: false,
      catalogAvailable: true,
    };
  }

  // Every field is treated as optional: an inspection assembled by a caller that
  // does not fill them in is still a valid "nothing found" answer, and a missing
  // array must not become an exception in a command.
  const registries = inspection.registries ?? [];
  const themes = registries.reduce((total, entry) => total + (entry.themes?.length ?? 0), 0);
  const readable = registries.filter((entry) => entry.status === "supported" && (entry.themes?.length ?? 0) > 0);
  const unreadable = registries.filter(
    (entry) => entry.status === "unsupported" || entry.status === "malformed",
  );
  const declared = declaredThemvora(profile);
  const installed = inspection.packages ?? [];
  const providers = inspection.providers ?? [];

  const evidence: string[] = [];
  evidence.push(
    declared.length === 0
      ? "No @themvora/* package is declared in this project."
      : `Declared: ${declared.map((entry) => `${entry.name} (${entry.status})`).join(", ")}.`,
  );
  evidence.push(
    installed.length === 0
      ? "No installed @themvora/* package was found."
      : `Installed: ${installed.join(", ")}.`,
  );
  evidence.push(
    themes === 0
      ? "No readable Themvora theme definition was found."
      : `${themes} theme${themes === 1 ? "" : "s"} in ${readable.length} file${readable.length === 1 ? "" : "s"}.`,
  );
  if (providers.length > 0) {
    evidence.push(`${providers.length} file${providers.length === 1 ? "" : "s"} pass themes to a provider.`);
  }

  // Source exists but this build cannot read it: keep the distinction instead of
  // reporting "not configured", which would tell the user to install something
  // they already have.
  if (themes === 0 && unreadable.length > 0 && (declared.length > 0 || installed.length > 0)) {
    return {
      kind: "unsupported",
      summary: "Themvora is set up here, but this build cannot read the theme source.",
      evidence,
      studioEnabled: true,
      catalogAvailable: true,
    };
  }

  if (themes > 0) {
    const missing = declared.filter((entry) => entry.status !== "installed");
    if (declared.length > 0 && installed.length === 0) {
      return {
        kind: "dependency-unresolved",
        summary: `${missing[0]?.name ?? "@themvora/core"} is declared but not installed, so the themes cannot be resolved.`,
        evidence,
        studioEnabled: true,
        catalogAvailable: true,
      };
    }
    return {
      kind: "configured",
      summary: "Themvora is configured in this project.",
      evidence,
      studioEnabled: true,
      catalogAvailable: true,
    };
  }

  // No theme of its own, but the integration is real: a recognized project that
  // has not defined a theme yet. The Studio stays usable and falls back to the
  // catalog.
  if (declared.length > 0 || installed.length > 0 || providers.length > 0) {
    const missing = declared.filter((entry) => entry.status !== "installed");
    if (installed.length === 0 && declared.length > 0) {
      return {
        kind: "dependency-unresolved",
        summary: `${missing[0]?.name ?? "@themvora/core"} is declared but not installed.`,
        evidence,
        studioEnabled: true,
        catalogAvailable: true,
      };
    }
    // A provider that hands themes to a Themvora runtime is real usage, but with
    // no package declared the install is incomplete — saying "installed" would
    // send the user looking in the wrong place.
    if (declared.length === 0 && installed.length === 0) {
      return {
        kind: "dependency-unresolved",
        summary: "This project references Themvora in a provider, but no @themvora/* package is declared.",
        evidence,
        studioEnabled: true,
        catalogAvailable: true,
      };
    }
    return {
      kind: "no-project-themes",
      summary: "Themvora is installed here. This project defines no theme of its own yet.",
      evidence,
      studioEnabled: true,
      catalogAvailable: true,
    };
  }

  return {
    kind: "not-configured",
    summary: "No Themvora integration or theme configuration was found in this workspace.",
    evidence,
    studioEnabled: false,
    catalogAvailable: true,
  };
}

/** The fixed destinations the extension is allowed to open. */
export const SETUP_LINKS = {
  "framework-guides": "https://themvora-dev.vercel.app/framework-guides",
  npm: "https://www.npmjs.com/org/themvora",
  github: "https://github.com/themvora/themvora",
} as const;

/** A destination the user can ask the host to open. */
export type SetupLink = keyof typeof SETUP_LINKS;

/**
 * Narrow an untrusted value to a known destination.
 *
 * The webview may only name one of these ids; it can never supply a URL.
 *
 * @param value - The raw value from a message.
 * @returns The id, or `undefined`.
 */
export function setupLink(value: unknown): SetupLink | undefined {
  return value === "framework-guides" || value === "npm" || value === "github" ? value : undefined;
}
