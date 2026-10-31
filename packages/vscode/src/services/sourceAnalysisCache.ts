/**
 * Cross-inspection cache for source analysis results.
 *
 * Caches parsed source data by file path and content hash, allowing repeated
 * inspections to skip unchanged files. Invalidates on content change, file
 * deletion, or workspace disposal.
 *
 * @packageDocumentation
 */

import { createHash } from "crypto";

/** Cached analysis result for one source file. */
export interface CachedSourceAnalysis {
  /** The file path (workspace-relative). */
  readonly path: string;
  /** Content hash at time of analysis. */
  readonly contentHash: string;
  /** When the entry was created (epoch ms). */
  readonly createdAt: number;
  /** The analysis result. */
  readonly analysis: SourceAnalysisResult;
}

/** What we cache for each source file. */
export interface SourceAnalysisResult {
  /** The source text (null if file doesn't exist). */
  readonly content: string | null;
  /** Parsed module links (imports/exports). */
  readonly moduleLinks?: unknown;
  /** Theme API bindings found. */
  readonly themeApiBinding?: unknown;
  /** Theme definitions found. */
  readonly themeDefinitions?: unknown[];
  /** Whether this file is a provider/consumer. */
  readonly isProvider?: boolean;
}

/** Cache configuration. */
export interface SourceCacheOptions {
  /** Maximum number of entries (default: 10000). */
  readonly maxEntries?: number;
  /** Maximum age in milliseconds (default: 1 hour). */
  readonly maxAgeMs?: number;
}

/**
 * Cache for source analysis results.
 *
 * Keyed by file path, validated by content hash. Entries are evicted when:
 * - Content changes (hash mismatch)
 * - Cache exceeds max size (LRU eviction)
 * - Entry exceeds max age
 * - Cache is explicitly cleared
 */
export class SourceAnalysisCache {
  private readonly cache = new Map<string, CachedSourceAnalysis>();
  private readonly maxEntries: number;
  private readonly maxAgeMs: number;
  private hits = 0;
  private misses = 0;

  constructor(options: SourceCacheOptions = {}) {
    this.maxEntries = options.maxEntries ?? 10000;
    this.maxAgeMs = options.maxAgeMs ?? 60 * 60 * 1000; // 1 hour
  }

  /**
   * Get a cached analysis result if available and valid.
   *
   * @param path - The file path.
   * @param content - The current file content.
   * @returns The cached analysis, or undefined if not cached/invalid.
   */
  get(path: string, content: string | null): CachedSourceAnalysis | undefined {
    const entry = this.cache.get(path);
    if (!entry) {
      this.misses++;
      return undefined;
    }

    // Validate content hash
    const currentHash = this.hashContent(content);
    if (entry.contentHash !== currentHash) {
      // Content changed, invalidate
      this.cache.delete(path);
      this.misses++;
      return undefined;
    }

    // Check age
    const age = Date.now() - entry.createdAt;
    if (age > this.maxAgeMs) {
      this.cache.delete(path);
      this.misses++;
      return undefined;
    }

    this.hits++;
    return entry;
  }

  /**
   * Store an analysis result in the cache.
   *
   * @param path - The file path.
   * @param content - The file content.
   * @param analysis - The analysis result.
   */
  set(path: string, content: string | null, analysis: SourceAnalysisResult): void {
    // Evict if at capacity
    if (this.cache.size >= this.maxEntries) {
      this.evictOldest();
    }

    const entry: CachedSourceAnalysis = {
      path,
      contentHash: this.hashContent(content),
      createdAt: Date.now(),
      analysis,
    };

    this.cache.set(path, entry);
  }

  /**
   * Invalidate a specific file.
   *
   * @param path - The file path to invalidate.
   */
  invalidate(path: string): void {
    this.cache.delete(path);
  }

  /**
   * Invalidate all files matching a predicate.
   *
   * @param predicate - Function returning true for paths to invalidate.
   */
  invalidateWhere(predicate: (path: string) => boolean): void {
    for (const path of this.cache.keys()) {
      if (predicate(path)) {
        this.cache.delete(path);
      }
    }
  }

  /**
   * Clear the entire cache.
   */
  clear(): void {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * Get cache statistics.
   */
  stats(): { size: number; hits: number; misses: number; hitRate: number } {
    const total = this.hits + this.misses;
    return {
      size: this.cache.size,
      hits: this.hits,
      misses: this.misses,
      hitRate: total === 0 ? 0 : this.hits / total,
    };
  }

  /** Compute a hash of the content. */
  private hashContent(content: string | null): string {
    if (content === null) {
      return "null";
    }
    return createHash("sha256").update(content).digest("hex").slice(0, 16);
  }

  /** Evict the oldest entry (simple LRU). */
  private evictOldest(): void {
    let oldestPath: string | undefined;
    let oldestTime = Infinity;

    for (const [path, entry] of this.cache.entries()) {
      if (entry.createdAt < oldestTime) {
        oldestTime = entry.createdAt;
        oldestPath = path;
      }
    }

    if (oldestPath !== undefined) {
      this.cache.delete(oldestPath);
    }
  }
}

/**
 * Create a new source analysis cache.
 *
 * @param options - Cache configuration.
 * @returns The cache instance.
 */
export function createSourceAnalysisCache(
  options: SourceCacheOptions = {},
): SourceAnalysisCache {
  return new SourceAnalysisCache(options);
}
