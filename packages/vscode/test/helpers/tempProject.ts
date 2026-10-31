/**
 * Temporary projects for tests that need real files on disk.
 *
 * Real directories rather than an in-memory map wherever the filesystem itself
 * is what is under test — the reader adapter, the "inspection does not write"
 * guarantee, and the CLI round-trip.
 *
 * @packageDocumentation
 */
import { mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

/** A scratch project directory. */
export interface TempProject {
  /** The absolute root. */
  readonly root: string;
  /**
   * Write a file, creating parent directories.
   *
   * @param relativePath - Path relative to the root.
   * @param contents - The file's contents.
   * @returns The absolute path written.
   */
  write(relativePath: string, contents: string): string;
  /** Every file in the tree, relative and sorted. */
  files(): string[];
  /** Remove the directory. */
  cleanup(): void;
}

/**
 * Create a scratch project.
 *
 * @param prefix - A prefix for the directory name; a suffix keeps it unique.
 * @returns The project handle.
 */
export function createTempProject(prefix = "themvora-test-"): TempProject {
  const root = mkdtempSync(join(tmpdir(), prefix));

  return {
    root,

    write(relativePath: string, contents: string): string {
      const target = join(root, ...relativePath.split("/"));
      mkdirSync(dirname(target), { recursive: true });
      writeFileSync(target, contents);
      return target;
    },

    files(): string[] {
      const found: string[] = [];
      const walk = (dir: string, prefix: string): void => {
        for (const entry of readdirSync(dir, { withFileTypes: true })) {
          const relative = prefix === "" ? entry.name : `${prefix}/${entry.name}`;
          if (entry.isDirectory()) walk(join(dir, entry.name), relative);
          else found.push(relative);
        }
      };
      walk(root, "");
      return found.sort();
    },

    cleanup(): void {
      rmSync(root, { recursive: true, force: true });
    },
  };
}
