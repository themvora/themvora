/**
 * Enhanced cache with resource bounds integration.
 *
 * Wraps SourceAnalysisCache with resource limit tracking and memory monitoring.
 *
 * @packageDocumentation
 */

import { SourceAnalysisCache, type SourceAnalysisResult, type SourceCacheOptions } from "./sourceAnalysisCache.js";
import { ResourceCounter, type ResourceBounds, type ResourceLimit } from "../domain/resourceBounds.js";

/** Cache wrapper with resource bounds tracking. */
export class BoundedSourceCache {
  private readonly cache: SourceAnalysisCache;
  private readonly counter: ResourceCounter;
  private memoryEstimateMb = 0;

  constructor(
    options: SourceCacheOptions = {},
    private readonly bounds: ResourceBounds,
  ) {
    this.cache = new SourceAnalysisCache(options);
    this.counter = new ResourceCounter(bounds);
  }

  /**
   * Get a cached analysis result with resource tracking.
   *
   * @param path - The file path.
   * @param content - The current file content.
   * @returns The cached analysis, or undefined if not cached/invalid.
   */
  get(path: string, content: string | null): { result: SourceAnalysisResult | undefined; limitsHit: readonly ResourceLimit[] } {
    const entry = this.cache.get(path, content);
    return {
      result: entry?.analysis,
      limitsHit: this.counter.getLimitsHit(),
    };
  }

  /**
   * Store an analysis result with resource tracking.
   *
   * @param path - The file path.
   * @param content - The file content.
   * @param analysis - The analysis result.
   * @returns True if the cache is within bounds, false if limits were exceeded.
   */
  set(path: string, content: string | null, analysis: SourceAnalysisResult): boolean {
    // Track cache entry count
    const exceeded = this.counter.increment("maxCacheEntries");
    
    // Estimate memory usage (rough: 1KB per entry)
    this.memoryEstimateMb = this.cache.stats().size * 0.001;
    this.counter.increment("maxMemoryMb", this.memoryEstimateMb);

    this.cache.set(path, content, analysis);
    
    return !exceeded;
  }

  /**
   * Invalidate a specific file.
   *
   * @param path - The file path to invalidate.
   */
  invalidate(path: string): void {
    this.cache.invalidate(path);
  }

  /**
   * Invalidate all files matching a predicate.
   *
   * @param predicate - Function returning true for paths to invalidate.
   */
  invalidateWhere(predicate: (path: string) => boolean): void {
    this.cache.invalidateWhere(predicate);
  }

  /**
   * Clear the entire cache and reset counters.
   */
  clear(): void {
    this.cache.clear();
    this.counter.reset();
    this.memoryEstimateMb = 0;
  }

  /**
   * Get cache and resource statistics.
   */
  stats(): {
    size: number;
    hits: number;
    misses: number;
    hitRate: number;
    memoryEstimateMb: number;
    limitsHit: readonly ResourceLimit[];
    anyExceeded: boolean;
  } {
    const cacheStats = this.cache.stats();
    return {
      ...cacheStats,
      memoryEstimateMb: this.memoryEstimateMb,
      limitsHit: this.counter.getLimitsHit(),
      anyExceeded: this.counter.anyExceeded(),
    };
  }

  /**
   * Check if the cache is within resource bounds.
   *
   * @returns True if within bounds, false if any limit was exceeded.
   */
  isWithinBounds(): boolean {
    return !this.counter.anyExceeded();
  }

  /**
   * Get all resource limits that were approached or exceeded.
   *
   * @returns The limits hit.
   */
  getLimitsHit(): readonly ResourceLimit[] {
    return this.counter.getLimitsHit();
  }
}

/**
 * Create a bounded source cache with default resource bounds.
 *
 * @param options - Cache configuration.
 * @param bounds - Resource bounds (defaults to DEFAULT_RESOURCE_BOUNDS).
 * @returns A BoundedSourceCache.
 */
export function createBoundedSourceCache(
  options: SourceCacheOptions = {},
  bounds: ResourceBounds,
): BoundedSourceCache {
  return new BoundedSourceCache(options, bounds);
}
