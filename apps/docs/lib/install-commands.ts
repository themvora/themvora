/**
 * Package-manager derivation for documentation install commands.
 *
 * Every install command in the docs is authored **once**, in pnpm form, and
 * derived here. Authoring four variants by hand per page is how the npm command
 * ends up stale on one page and nobody notices.
 *
 * The mapping is not mechanical: `pnpm dlx` becomes `npx` for npm, `yarn dlx`
 * for Yarn and `bunx` for Bun, and a dev-dependency flag is `-D` everywhere
 * except Bun, which spells it `-d`. Those are the four package managers'
 * documented CLIs, not guesses.
 */

export type PackageManager = "pnpm" | "npm" | "yarn" | "bun";

export const PACKAGE_MANAGERS: PackageManager[] = [
  "pnpm",
  "npm",
  "yarn",
  "bun",
];

/** The `add` verb, plus the dev-dependency flag, for one manager. */
function addVerb(manager: PackageManager, dev: boolean): string {
  switch (manager) {
    case "npm":
      return `npm install${dev ? " -D" : ""}`;
    case "bun":
      return `bun add${dev ? " -d" : ""}`;
    default:
      return `${manager} add${dev ? " -D" : ""}`;
  }
}

/** The script runner (`dlx` / `npx` / `yarn dlx` / `bunx`) for one manager. */
function runnerVerb(manager: PackageManager): string {
  switch (manager) {
    case "npm":
      return "npx";
    case "yarn":
      return "yarn dlx";
    case "bun":
      return "bunx";
    default:
      return "pnpm dlx";
  }
}

/**
 * Rewrite one pnpm command for another package manager.
 *
 * Commands that are not installs or runners — `ng serve`, `vite` — are returned
 * unchanged: there is no portable rewrite, and inventing one would be worse
 * than leaving the reader's own script in place.
 */
export function forManager(command: string, manager: PackageManager): string {
  if (manager === "pnpm") return command;

  const dlx = command.match(/^pnpm dlx (\S+)(.*)$/);
  if (dlx) return `${runnerVerb(manager)} ${dlx[1]}${dlx[2]}`;

  const dev = command.match(/^pnpm add -D (\S.*)$/);
  if (dev) return `${addVerb(manager, true)} ${dev[1]}`;

  const add = command.match(/^pnpm add (\S.*)$/);
  if (add) return `${addVerb(manager, false)} ${add[1]}`;

  return command;
}
