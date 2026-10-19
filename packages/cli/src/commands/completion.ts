/**
 * `themvora completion` — emit a shell completion script.
 *
 * The script is *generated*, never hand-maintained: commands and flags come from
 * `command-schema.json`, and registry values are resolved by the script at
 * completion time through `themvora list <registry> --ids`. That means there is
 * no second copy of any value list anywhere — the property the plan asks for —
 * and a completion can never offer a preset the installed CLI would reject.
 *
 * @packageDocumentation
 */
import { getString } from "../utils.js";
import type { ParsedArgs } from "../utils.js";
import { UsageError } from "../exit-codes.js";
import { suggestionSuffix } from "../suggest.js";
import { buildCompletionSpec } from "../completion/spec.js";
import { renderBash } from "../completion/bash.js";
import { renderZsh } from "../completion/zsh.js";
import { renderFish } from "../completion/fish.js";
import { renderPowerShell } from "../completion/powershell.js";

/** The shells `completion` supports. */
const SHELLS = ["bash", "zsh", "fish", "powershell"] as const;

type Shell = (typeof SHELLS)[number];

/**
 * Run `themvora completion`.
 *
 * @param args - The parsed arguments.
 *
 * @throws {UsageError} When no shell is named, or the shell is unsupported.
 *
 * @remarks
 * The script goes to **stdout** with nothing else, so the documented install is a
 * redirect:
 *
 * ```bash
 * themvora completion bash > /etc/bash_completion.d/themvora
 * ```
 *
 * A status line would break that, so there is none.
 */
export async function cmdCompletion(args: ParsedArgs): Promise<void> {
  const requested = getString(args, "shell") ?? args._[1];

  if (requested === undefined) {
    throw new UsageError(
      `a shell is required — use one of: ${SHELLS.join(", ")}`,
    );
  }

  const shell = requested.trim().toLowerCase() as Shell;
  if (!SHELLS.includes(shell)) {
    throw new UsageError(
      `unknown shell "${requested}"${suggestionSuffix(shell, SHELLS)} — use one of: ${SHELLS.join(", ")}`,
    );
  }

  const spec = buildCompletionSpec();

  const script =
    shell === "bash"
      ? renderBash(spec)
      : shell === "zsh"
        ? renderZsh(spec)
        : shell === "fish"
          ? renderFish(spec)
          : renderPowerShell(spec);

  process.stdout.write(script);
}
