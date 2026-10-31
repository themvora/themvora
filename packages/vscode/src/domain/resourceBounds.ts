/**
 * Resource bounds for large-workspace reliability.
 *
 * Large workspaces (1000+ files) can exhaust memory and CPU if left unbounded.
 * This module defines configurable limits and provides utilities to enforce them
 * during inspection and analysis.
 *
 * The bounds are conservative defaults that balance completeness with reliability.
 * Users can override them via workspace settings if needed.
 *
 * @packageDocumentation
 */

/** Resource bounds configuration. */
export interface ResourceBounds {
  /** Maximum number of files to enumerate during workspace walk. */
  readonly maxFilesToEnumerate: number;
  /** Maximum number of files to parse in a single inspection. */
  readonly maxFilesToParse: number;
  /** Maximum number of themes to discover and validate. */
  readonly maxThemesToDiscover: number;
  /** Maximum number of import edges to resolve in graph construction. */
  readonly maxImportEdgesToResolve: number;
  /** Maximum number of consumer files to analyze. */
  readonly maxConsumersToAnalyze: number;
  /** Maximum cache entries before eviction. */
  readonly maxCacheEntries: number;
  /** Maximum cache age in milliseconds before expiration. */
  readonly maxCacheAgeMs: number;
  /** Maximum concurrent file reads. */
  readonly maxConcurrentReads: number;
  /** Maximum memory usage in megabytes (soft limit, for monitoring). */
  readonly maxMemoryMb: number;
}

/** Default resource bounds for typical workspaces. */
export const DEFAULT_RESOURCE_BOUNDS: ResourceBounds = {
  maxFilesToEnumerate: 2000,
  maxFilesToParse: 1000,
  maxThemesToDiscover: 500,
  maxImportEdgesToResolve: 5000,
  maxConsumersToAnalyze: 200,
  maxCacheEntries: 10000,
  maxCacheAgeMs: 3600000, // 1 hour
  maxConcurrentReads: 10,
  maxMemoryMb: 512,
};

/** Large-workspace bounds for very large projects. */
export const LARGE_WORKSPACE_BOUNDS: ResourceBounds = {
  maxFilesToEnumerate: 5000,
  maxFilesToParse: 3000,
  maxThemesToDiscover: 1000,
  maxImportEdgesToResolve: 15000,
  maxConsumersToAnalyze: 500,
  maxCacheEntries: 25000,
  maxCacheAgeMs: 7200000, // 2 hours
  maxConcurrentReads: 20,
  maxMemoryMb: 1024,
};

/** Minimal bounds for resource-constrained environments. */
export const MINIMAL_BOUNDS: ResourceBounds = {
  maxFilesToEnumerate: 500,
  maxFilesToParse: 200,
  maxThemesToDiscover: 100,
  maxImportEdgesToResolve: 1000,
  maxConsumersToAnalyze: 50,
  maxCacheEntries: 2000,
  maxCacheAgeMs: 1800000, // 30 minutes
  maxConcurrentReads: 5,
  maxMemoryMb: 256,
};

/** Result of a bounded operation. */
export interface BoundedResult<T> {
  /** The operation result (may be partial if limits were hit). */
  readonly value: T;
  /** Whether the operation completed within bounds. */
  readonly complete: boolean;
  /** Which limits were approached or exceeded. */
  readonly limitsHit: readonly ResourceLimit[];
  /** Count of items processed before stopping. */
  readonly processedCount: number;
}

/** A resource limit that was approached or exceeded. */
export interface ResourceLimit {
  /** The limit name. */
  readonly name: keyof ResourceBounds;
  /** The limit value. */
  readonly limit: number;
  /** The actual count reached. */
  readonly actual: number;
  /** Whether the limit was exceeded (true) or approached (false). */
  readonly exceeded: boolean;
}

/** Threshold for warning about approaching a limit (80%). */
const WARNING_THRESHOLD = 0.8;

/**
 * Check if a count is approaching or has exceeded a limit.
 *
 * @param count - The current count.
 * @param limit - The limit to check against.
 * @returns A ResourceLimit if the limit was approached or exceeded, undefined otherwise.
 */
export function checkLimit(
  count: number,
  limit: number,
  name: keyof ResourceBounds,
): ResourceLimit | undefined {
  if (count >= limit) {
    return { name, limit, actual: count, exceeded: true };
  }
  if (count >= limit * WARNING_THRESHOLD) {
    return { name, limit, actual: count, exceeded: false };
  }
  return undefined;
}

/**
 * Create a bounded result from a value and any limits that were hit.
 *
 * @param value - The operation result.
 * @param limits - Limits that were approached or exceeded.
 * @param processedCount - Number of items processed.
 * @returns A BoundedResult indicating completeness.
 */
export function boundedResult<T>(
  value: T,
  limits: readonly ResourceLimit[],
  processedCount: number,
): BoundedResult<T> {
  const anyExceeded = limits.some((limit) => limit.exceeded);
  return {
    value,
    complete: !anyExceeded,
    limitsHit: limits,
    processedCount,
  };
}

/**
 * Format a resource limit for user display.
 *
 * @param limit - The limit to format.
 * @returns A human-readable description.
 */
export function formatResourceLimit(limit: ResourceLimit): string {
  const action = limit.exceeded ? "exceeded" : "approached";
  const name = humanReadableLimitName(limit.name);
  return `${name} ${action}: ${limit.actual} / ${limit.limit}`;
}

/**
 * Convert a limit name to human-readable form.
 *
 * @param name - The limit name.
 * @returns A human-readable label.
 */
function humanReadableLimitName(name: keyof ResourceBounds): string {
  const labels: Record<keyof ResourceBounds, string> = {
    maxFilesToEnumerate: "Files enumerated",
    maxFilesToParse: "Files parsed",
    maxThemesToDiscover: "Themes discovered",
    maxImportEdgesToResolve: "Import edges resolved",
    maxConsumersToAnalyze: "Consumers analyzed",
    maxCacheEntries: "Cache entries",
    maxCacheAgeMs: "Cache age",
    maxConcurrentReads: "Concurrent reads",
    maxMemoryMb: "Memory usage (MB)",
  };
  return labels[name];
}

/**
 * Select appropriate resource bounds based on workspace size.
 *
 * @param estimatedFileCount - Estimated number of files in the workspace.
 * @returns The appropriate ResourceBounds configuration.
 */
export function selectResourceBounds(estimatedFileCount: number): ResourceBounds {
  if (estimatedFileCount > 3000) {
    return LARGE_WORKSPACE_BOUNDS;
  }
  if (estimatedFileCount < 200) {
    return DEFAULT_RESOURCE_BOUNDS;
  }
  return DEFAULT_RESOURCE_BOUNDS;
}

/**
 * A counter that tracks resource usage and checks limits.
 */
export class ResourceCounter {
  private counts = new Map<keyof ResourceBounds, number>();
  private limits: ResourceLimit[] = [];

  constructor(private readonly bounds: ResourceBounds) {}

  /**
   * Increment a counter and check if it approaches or exceeds the limit.
   *
   * @param name - The counter name.
   * @param amount - Amount to increment (default: 1).
   * @returns True if the limit was exceeded, false otherwise.
   */
  increment(name: keyof ResourceBounds, amount: number = 1): boolean {
    const current = this.counts.get(name) ?? 0;
    const next = current + amount;
    this.counts.set(name, next);

    const limit = this.bounds[name];
    const check = checkLimit(next, limit, name);
    if (check !== undefined) {
      this.limits = [...this.limits, check];
      return check.exceeded;
    }
    return false;
  }

  /**
   * Get the current count for a resource.
   *
   * @param name - The counter name.
   * @returns The current count.
   */
  get(name: keyof ResourceBounds): number {
    return this.counts.get(name) ?? 0;
  }

  /**
   * Get all limits that were approached or exceeded.
   *
   * @returns The limits hit.
   */
  getLimitsHit(): readonly ResourceLimit[] {
    return this.limits;
  }

  /**
   * Check if any limits were exceeded.
   *
   * @returns True if any limit was exceeded.
   */
  anyExceeded(): boolean {
    return this.limits.some((limit) => limit.exceeded);
  }

  /**
   * Reset all counters.
   */
  reset(): void {
    this.counts.clear();
    this.limits = [];
  }
}
