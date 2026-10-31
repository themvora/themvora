/**
 * Caching wrapper for ProjectReader.
 *
 * Records which files an inspection read, and a content hash for each, so the
 * cache can answer "did anything depend on this file?" after a save.
 *
 * **Why there is no content cache here.** This class used to consult the source
 * cache before reading, passing `null` as "the current content" because the file
 * had not been read yet. The cache validates by hashing what it is given, so
 * `null` never matched a stored hash: every lookup deleted the entry it had
 * stored on the previous read and returned a miss. It cost a hash lookup and a
 * retained copy of every file's contents per inspection, and saved no reads.
 * The inspection already de-duplicates reads within a run (`sourceCache` in
 * `inspectProject`), which is the only reuse that exists. So this class tracks
 * and does not cache; the cross-run cache that remains is the inspection itself,
 * invalidated by the controller's event stream.
 *
 * @packageDocumentation
 */

import { createHash } from "crypto";
import type { ProjectReader } from "../domain/registry.js";
import { cachePath } from "./inspectionCache.js";

/**
 * A ProjectReader that records which files were read.
 *
 * Used during inspection to enable event-driven invalidation: the recorded path
 * set is what `InspectionCacheService.invalidateFile` consults when a save
 * arrives.
 */
export class CachingProjectReader implements ProjectReader {
  private readonly accessedFiles = new Map<string, string>();
  private readonly accessedDirs = new Set<string>();

  constructor(
    private readonly inner: ProjectReader,
    private readonly rootPath: string,
  ) {}

  async read(relativePath: string): Promise<string | null> {
    // Normalised at the source: a recorded path is compared against event paths,
    // which arrive with the platform's separators.
    const fullPath = cachePath(`${this.rootPath}/${relativePath}`);

    const content = await this.inner.read(relativePath);

    // Track access, whether or not the file exists: "the analysis asked and got
    // nothing" is still a fact about this path, and a file appearing there later
    // is a create event that invalidates the root anyway.
    this.accessedFiles.set(fullPath, hashContent(content));

    return content;
  }

  async list(relativeDir: string): Promise<readonly string[]> {
    this.accessedDirs.add(relativeDir);
    return this.inner.list(relativeDir);
  }

  async walk(): Promise<readonly string[]> {
    return this.inner.walk();
  }

  /**
   * Get the files accessed during this inspection, with their content hashes.
   *
   * @returns Map of absolute file paths to content hashes.
   */
  getAccessedFiles(): ReadonlyMap<string, string> {
    return this.accessedFiles;
  }

  /**
   * The directories this inspection listed.
   *
   * Kept for the same reason as the file set: a directory that was enumerated is
   * one whose contents the result depends on.
   */
  getAccessedDirectories(): ReadonlySet<string> {
    return this.accessedDirs;
  }
}

/** Hash content for cache validation. */
function hashContent(content: string | null): string {
  if (content === null) return "null";
  return createHash("sha256").update(content).digest("hex").slice(0, 16);
}

/**
 * Wrap a ProjectReader so its reads are recorded.
 *
 * @param inner - The underlying reader.
 * @param rootPath - The absolute root path.
 * @returns The recording reader.
 */
export function createCachingReader(
  inner: ProjectReader,
  rootPath: string,
): CachingProjectReader {
  return new CachingProjectReader(inner, rootPath);
}
