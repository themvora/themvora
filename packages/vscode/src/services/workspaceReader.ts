/**
 * The `vscode` implementation of {@link ProjectReader}.
 *
 * This is the only place project reading touches the editor API. The domain
 * receives a `ProjectReader` and cannot tell whether it is backed by
 * `workspace.fs`, a test fixture or something else — which is what lets the
 * inspection logic be tested without a running editor, and keeps later commands
 * from reaching for `workspace.fs` directly.
 *
 * Both methods swallow their errors on purpose. A missing file, an unreadable
 * directory and a permission failure all mean the same thing to an inspection:
 * nothing was found there. `workspace.fs` throws for all three, so the
 * conversion happens once, here.
 *
 * @packageDocumentation
 */
import { FileType, Uri, workspace } from "vscode";

import type { ProjectReader } from "../domain/registry.js";

/** One decoder, reused — `TextDecoder` is stateless once constructed. */
const decoder = new TextDecoder();

/**
 * Directories a discovery walk never enters.
 *
 * Theme configuration lives in source, never in a dependency or build output, and
 * descending into `node_modules` would cost tens of thousands of entries for no
 * result. Dot-directories are skipped separately.
 */
const SKIPPED_DIRECTORIES = new Set([
  "node_modules",
  "bower_components",
  "dist",
  "build",
  "out",
  "coverage",
  "storybook-static",
  "vendor",
  "target",
  "tmp",
  "__pycache__",
  "Pods",
]);

/** How deep the walk descends below the project root. */
const MAX_DEPTH = 6;

/** How many files the walk collects before it stops. */
const MAX_FILES = 5000;

/**
 * Resolve a workspace-relative path against the project root.
 *
 * Segments are split on `/` rather than passed through as one string so a
 * nested path such as `src/themes/themes.ts` becomes real URI segments instead
 * of a single segment containing separators.
 *
 * @param root - The project root URI.
 * @param relativePath - The path to resolve; `"."` resolves to the root itself.
 * @returns The absolute URI.
 */
function resolveInside(root: Uri, relativePath: string): Uri {
  if (relativePath === "." || relativePath === "") return root;
  return Uri.joinPath(root, ...relativePath.split("/"));
}

/**
 * Create a reader over one workspace folder.
 *
 * It reads **saved bytes only**. An earlier version accepted a provider of open
 * document text so an inspection could see unsaved edits; that made a
 * project-wide scan depend on whatever was half-typed in an editor, and it made
 * "what the workspace contains" mean two different things depending on which
 * file happened to be dirty. An unsaved buffer is the editor's state, not the
 * workspace's, so the reader has no way to reach one.
 *
 * @param root - The folder to read from.
 * @returns A read-only reader.
 */
export function createWorkspaceReader(root: Uri): ProjectReader {
  return {
    async read(relativePath: string): Promise<string | null> {
      try {
        const bytes = await workspace.fs.readFile(resolveInside(root, relativePath));
        return decoder.decode(bytes);
      } catch {
        return null;
      }
    },

    async list(relativeDir: string): Promise<readonly string[]> {
      try {
        const entries = await workspace.fs.readDirectory(resolveInside(root, relativeDir));
        return entries
          .filter(([, type]) => (type & FileType.File) !== 0)
          .map(([name]) => name);
      } catch {
        return [];
      }
    },

    async walk(): Promise<readonly string[]> {
      const found: string[] = [];
      const queue: { dir: string; depth: number }[] = [{ dir: ".", depth: 0 }];

      // Breadth-first with an explicit queue rather than recursion: the depth and
      // file caps then apply to the whole walk, not per branch.
      while (queue.length > 0 && found.length < MAX_FILES) {
        const next = queue.shift();
        if (next === undefined) break;

        let entries: [string, FileType][];
        try {
          entries = await workspace.fs.readDirectory(resolveInside(root, next.dir));
        } catch {
          continue;
        }

        for (const [name, type] of entries) {
          const relativePath = next.dir === "." ? name : `${next.dir}/${name}`;

          if ((type & FileType.Directory) !== 0) {
            const skip = SKIPPED_DIRECTORIES.has(name) || name.startsWith(".");
            if (!skip && next.depth < MAX_DEPTH) {
              queue.push({ dir: relativePath, depth: next.depth + 1 });
            }
            continue;
          }

          if ((type & FileType.File) !== 0) found.push(relativePath);
        }
      }

      return found;
    },
  };
}
