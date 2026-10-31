/**
 * Applying a patch proposal to the filesystem.
 *
 * Takes a StudioPatchProposal and writes the updated content to the target file.
 * Handles both creating new files and updating existing ones.
 *
 * @packageDocumentation
 */
import { Uri, workspace } from "vscode";

import { describeError } from "../domain/errors.js";
import type { StudioPatchProposal } from "../shared/studioProtocol.js";
import type { RootSessions } from "./rootSessions.js";

/** The outcome of a patch application. */
export type PatchOutcome =
  | { readonly ok: true; readonly path: string }
  | { readonly ok: false; readonly reason: "failed"; readonly message: string };

/** Options for applying a patch. */
export interface ApplyPatchOptions {
  /** The patch to apply. */
  readonly patch: StudioPatchProposal;
  /** Coordinates writes per project root. */
  readonly sessions: RootSessions;
  /** Called once the write has succeeded. */
  readonly onWritten?: () => void;
}

/**
 * Apply a patch proposal to the filesystem.
 *
 * @param options - The patch and callbacks.
 * @returns The outcome.
 */
export async function applyPatch(options: ApplyPatchOptions): Promise<PatchOutcome> {
  const { patch, sessions } = options;

  // Resolve the target URI from the workspace-relative path.
  const target = resolvePatchTarget(patch.path);
  if (target === undefined) {
    return {
      ok: false,
      reason: "failed",
      message: `Cannot resolve path: ${patch.path}. No workspace folder is open.`,
    };
  }

  try {
    await sessions.run(projectRootOf(target), async () => {
      // For updates, verify the file content matches the expected original.
      if (patch.action === "update") {
        const currentContent = await workspace.fs.readFile(target);
        const currentText = Buffer.from(currentContent).toString("utf8");
        if (currentText !== patch.original) {
          throw new Error(
            `File content has changed since the patch was generated. ` +
              `Expected original content to match, but it differs.`,
          );
        }
      }

      // Write the updated content.
      await workspace.fs.writeFile(target, Buffer.from(patch.updated, "utf8"));
    });
  } catch (error) {
    return { ok: false, reason: "failed", message: describeError(error) };
  }

  // Only after the write succeeded: a refresh on failure would re-read a project
  // that did not change.
  options.onWritten?.();

  return { ok: true, path: target.fsPath };
}

/**
 * Resolve a workspace-relative path to a URI.
 *
 * @param path - The workspace-relative path.
 * @returns The URI, or `undefined` when no folder is open or the path is unsafe.
 */
function resolvePatchTarget(path: string): Uri | undefined {
  const folders = workspace.workspaceFolders;
  const first = folders && folders.length > 0 ? folders[0] : undefined;
  if (first === undefined) return undefined;

  // Reject absolute paths
  if (path.startsWith("/") || path.startsWith("\\") || /^[A-Za-z]:/.test(path)) {
    return undefined;
  }

  // Reject path traversal attempts
  if (path.includes("..")) {
    return undefined;
  }

  // The path should be workspace-relative, so join it with the first folder.
  const target = Uri.joinPath(first.uri, path);

  // Verify the resolved path is still within the workspace
  const workspacePath = first.uri.fsPath;
  const targetPath = target.fsPath;
  if (!targetPath.startsWith(workspacePath)) {
    return undefined;
  }

  return target;
}

/**
 * The folder a write belongs to.
 *
 * @param target - The file being written.
 * @returns Its parent path, so writes to the same project are serialised.
 */
function projectRootOf(target: Uri): string {
  const path = target.fsPath;
  const index = Math.max(path.lastIndexOf("/"), path.lastIndexOf("\\"));
  return index <= 0 ? path : path.slice(0, index);
}
