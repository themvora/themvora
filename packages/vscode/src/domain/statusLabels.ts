/**
 * Human wording for a {@link RegistryStatus}.
 *
 * Kept in the domain, and free of `vscode`, because the same words appear in the
 * tree description, the status bar tooltip and (later) the quick pick. One
 * table, so they cannot disagree.
 *
 * The wording is deliberately not the enum. `unsupported` is our limitation, so
 * the UI says "not readable yet" rather than "unsupported", which reads like a
 * verdict on the user's file.
 *
 * @packageDocumentation
 */
import type { RegistryStatus } from "./registry.js";

/** The short label used beside a node. */
const LABELS: Record<RegistryStatus, string> = {
  // "themes detected" rather than "readable": what a user wants to know is
  // that their themes were found, not that a file was parseable.
  supported: "themes detected",
  missing: "not found",
  malformed: "invalid",
  unsupported: "not readable yet",
};

/** The codicon id used as the node's icon. */
const ICONS: Record<RegistryStatus, string> = {
  supported: "pass",
  missing: "circle-slash",
  malformed: "error",
  unsupported: "warning",
};

/**
 * The label for a status.
 *
 * @param status - The status.
 * @returns A short phrase suitable for a tree description.
 */
export function statusLabel(status: RegistryStatus): string {
  return LABELS[status];
}

/**
 * The codicon id for a status.
 *
 * @param status - The status.
 * @returns A codicon name such as `pass` or `warning`.
 */
export function statusIcon(status: RegistryStatus): string {
  return ICONS[status];
}

/**
 * One sentence describing what the project status means.
 *
 * @param status - The project-level status.
 * @returns A sentence for a tooltip or a placeholder row.
 */
export function describeProjectStatus(status: RegistryStatus): string {
  switch (status) {
    case "supported":
      return "Themvora theme definitions were read from this project.";
    case "malformed":
      return "A Themvora file was found but could not be read as a theme.";
    case "unsupported":
      return "A Themvora registry was found, but this extension cannot read its format yet.";
    case "missing":
      return "No Themvora configuration or theme registry found.";
  }
}

/**
 * What to say when a project has no registries to show.
 *
 * "Nothing found" and "Themvora is installed but there is nothing to read yet"
 * look identical to a user, and the second is the normal state between `init`
 * and the first theme file — or the state of a project whose themes live in a
 * TypeScript module this extension cannot read. Naming the packages that *were*
 * found is the difference between "the extension is broken" and "this project is
 * not wired the way the extension can see".
 *
 * @param status - The project-level status.
 * @param packages - The `@themvora/*` dependencies the manifest declares.
 * @returns A sentence for the placeholder row.
 */
export function describeEmptyProject(
  status: RegistryStatus,
  packages: readonly string[],
): string {
  if (status !== "missing" || packages.length === 0) return describeProjectStatus(status);

  return (
    `Themvora is installed (${packages.join(", ")}) but no theme.config.*, theme.json or ` +
    "theme registry was found at the project root. TypeScript theme modules cannot be read yet."
  );
}
