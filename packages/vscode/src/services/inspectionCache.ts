/**
 * The form a path is cached under.
 *
 * A recorded path is built from a workspace folder's `fsPath` and a reader's
 * `/`-separated relative path, so on Windows it arrived as `C:\app/src/theme.ts`
 * — one string with two separators. Event paths arrive as `uri.fsPath`, which is
 * `C:\app\src\theme.ts`. The two never compared equal, so `invalidateFile` found
 * nothing to drop and a save silently left the old inspection in place. Every
 * path is normalised here, on the way in and on the way out.
 *
 * @param path - An absolute path in either form.
 * @returns The path with forward slashes.
 */
export function cachePath(path: string): string {
  return path.replace(/\\/g, "/");
}

/**
 * Inspection cache service.
 *
 * Manages cross-inspection caching for project analysis. Owned by the project
 * controller, invalidated on file changes, cleared on workspace disposal.
 *
 * **What makes a cached inspection valid.** Two mechanisms used to exist here and
 * only one of them worked. The hash check below needs the *current* hashes to
 * compare against, and the controller only had the hashes from the last run —
 * so every lookup passed an empty map, failed the "file deleted" loop on the
 * first entry, and dropped the entry it was about to return. The cache therefore
 * never hit, and every refresh was a full scan. The controller now invalidates by
 * *event* instead: a save, create, delete or rename names the paths that changed,
 * `invalidateFile`/`invalidateRoot` drop what depended on them, and
 * {@link InspectionCacheService.getCachedInspection} returns what survived.
 * The hash-validated lookup is kept for callers that do hold both sides.
 *
 * @packageDocumentation
 */

import type { ProjectInspection } from "../domain/registry.js";
import {
  createSourceAnalysisCache,
  type SourceAnalysisCache,
  type SourceAnalysisResult,
} from "./sourceAnalysisCache.js";

/**
 * Service for caching inspection results.
 *
 * Provides:
 * - Cross-inspection caching of source analysis
 * - Invalidation on file changes
 * - Full inspection result caching
 */
export class InspectionCacheService {
  private readonly sourceCache: SourceAnalysisCache;
  private inspectionCache: Map<string, CachedInspection> = new Map();

  constructor() {
    this.sourceCache = createSourceAnalysisCache({
      maxEntries: 10000,
      maxAgeMs: 60 * 60 * 1000, // 1 hour
    });
  }

  /**
   * Get cached source analysis for a file.
   *
   * @param path - The file path.
   * @param content - The current file content.
   * @returns The cached analysis, or undefined.
   */
  getSourceAnalysis(path: string, content: string | null): SourceAnalysisResult | undefined {
    const cached = this.sourceCache.get(path, content);
    return cached?.analysis;
  }

  /**
   * Cache source analysis for a file.
   *
   * @param path - The file path.
   * @param content - The file content.
   * @param analysis - The analysis result.
   */
  setSourceAnalysis(path: string, content: string | null, analysis: SourceAnalysisResult): void {
    this.sourceCache.set(path, content, analysis);
  }

  /**
   * Get cached inspection result for a project root.
   *
   * @param root - The project root path.
   * @param fileHashes - Current file hashes.
   * @returns The cached inspection, or undefined.
   */
  getInspection(root: string, fileHashes: Map<string, string>): CachedInspection | undefined {
    const key = cachePath(root);
    const cached = this.inspectionCache.get(key);
    if (!cached) {
      return undefined;
    }

    // Validate that all file hashes match
    for (const [path, hash] of fileHashes.entries()) {
      const cachedHash = cached.fileHashes.get(cachePath(path));
      if (cachedHash !== hash) {
        // File changed, invalidate
        this.inspectionCache.delete(key);
        return undefined;
      }
    }

    // Check for new files not in cache
    for (const path of cached.fileHashes.keys()) {
      if (!fileHashes.has(path) && !fileHashes.has(path.replace(/\//g, "\\"))) {
        // File deleted, invalidate
        this.inspectionCache.delete(key);
        return undefined;
      }
    }

    return cached;
  }

  /**
   * Cache an inspection result.
   *
   * @param root - The project root path.
   * @param inspection - The inspection result.
   * @param fileHashes - File hashes at time of inspection.
   */
  setInspection(
    root: string,
    inspection: ProjectInspection,
    fileHashes: Map<string, string>,
  ): void {
    this.inspectionCache.set(cachePath(root), {
      root,
      inspection,
      fileHashes: new Map([...fileHashes].map(([path, hash]) => [cachePath(path), hash])),
      cachedAt: Date.now(),
    });
  }

  /**
   * The cached inspection for a root, without re-validating it.
   *
   * Trusting the entry is only correct because the owner invalidates on every
   * event that could have changed it — the same trust the hash check was trying
   * to reconstruct after the fact, without the reads that would make it possible.
   *
   * @param root - The project root path.
   * @returns The cached inspection, or undefined when the root was never
   *   inspected or was invalidated since.
   */
  getCachedInspection(root: string): CachedInspection | undefined {
    return this.inspectionCache.get(cachePath(root));
  }

  /**
   * Whether any cached inspection read this file.
   *
   * A save is only worth re-analysing when the last analysis actually depended on
   * the file. Answering that here keeps the decision out of a filename heuristic:
   * the inspection already recorded exactly what it read.
   *
   * @param path - The absolute file path.
   * @returns `true` when some cached inspection recorded the file.
   */
  tracks(path: string): boolean {
    const key = cachePath(path);
    for (const cached of this.inspectionCache.values()) {
      if (cached.fileHashes.has(key)) return true;
    }
    return false;
  }

  /**
   * Invalidate cache entries for a specific file.
   *
   * @param path - The file path that changed.
   * @returns `true` when a cached inspection depended on the file and was
   *   dropped, `false` when nothing had read it.
   */
  invalidateFile(path: string): boolean {
    const key = cachePath(path);
    this.sourceCache.invalidate(path);

    let dropped = false;

    // Invalidate any inspection that included this file
    for (const [root, cached] of this.inspectionCache.entries()) {
      if (cached.fileHashes.has(key)) {
        this.inspectionCache.delete(root);
        dropped = true;
      }
    }

    return dropped;
  }

  /**
   * Invalidate cache entries for a project root.
   *
   * @param root - The project root path.
   */
  invalidateRoot(root: string): void {
    this.inspectionCache.delete(cachePath(root));
    // Note: source cache is shared across roots, so we don't clear it
  }

  /** How many roots currently hold a cached inspection. */
  get size(): number {
    return this.inspectionCache.size;
  }

  /**
   * Clear all cached data.
   */
  clear(): void {
    this.sourceCache.clear();
    this.inspectionCache.clear();
  }

  /**
   * Get cache statistics.
   */
  stats(): {
    sourceCache: { size: number; hits: number; misses: number; hitRate: number };
    inspectionCache: { size: number };
  } {
    return {
      sourceCache: this.sourceCache.stats(),
      inspectionCache: { size: this.inspectionCache.size },
    };
  }
}

/** A cached inspection result. */
export interface CachedInspection {
  readonly root: string;
  readonly inspection: ProjectInspection;
  readonly fileHashes: ReadonlyMap<string, string>;
  readonly cachedAt: number;
}

/**
 * Create a new inspection cache service.
 *
 * @returns The service instance.
 */
export function createInspectionCacheService(): InspectionCacheService {
  return new InspectionCacheService();
}
