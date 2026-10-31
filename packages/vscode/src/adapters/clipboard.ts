/**
 * The clipboard, behind an interface.
 *
 * A command that writes to the clipboard needs `vscode.env`, and a test that
 * asserts "nothing was copied when the write failed" needs a clipboard that can
 * fail on demand. One small seam gives both, and keeps the command from reaching
 * for a host global directly.
 *
 * @packageDocumentation
 */
import { env } from "vscode";

/** The clipboard surface the extension uses. */
export interface Clipboard {
  /**
   * Replace the clipboard's text.
   *
   * @param text - The text to copy.
   * @returns Resolves once the clipboard has been written.
   */
  writeText(text: string): Promise<void>;
}

/**
 * Create the host-backed clipboard.
 *
 * @returns A clipboard that writes through `vscode.env.clipboard`.
 */
export function createClipboard(): Clipboard {
  return {
    async writeText(text: string): Promise<void> {
      await env.clipboard.writeText(text);
    },
  };
}
