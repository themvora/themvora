/**
 * `Themvora: Refresh Project`
 *
 * Re-reads every workspace folder. Exposed because the tree is only as fresh as
 * the last inspection, and a file can change without VS Code emitting a save —
 * a `git checkout`, a CLI run in a terminal, a generator writing from a script.
 *
 * @packageDocumentation
 */
import { commands, type Disposable } from "vscode";

/** The command identifier; must match `contributes.commands`. */
export const COMMAND_REFRESH = "themvora.refresh";

/**
 * Register the command.
 *
 * @param refresh - Re-reads the workspace. Supplied by the controller so this
 *   module never holds state of its own.
 * @returns The registration, for `context.subscriptions`.
 */
export function registerRefreshCommand(refresh: () => Promise<void>): Disposable {
  return commands.registerCommand(COMMAND_REFRESH, () => refresh());
}
