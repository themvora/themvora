import { describe, expect, it } from "vitest";

import {
  boundedResult,
  checkLimit,
  DEFAULT_RESOURCE_BOUNDS,
  formatResourceLimit,
  LARGE_WORKSPACE_BOUNDS,
  MINIMAL_BOUNDS,
  ResourceCounter,
  selectResourceBounds,
} from "../src/domain/resourceBounds.js";

describe("checkLimit", () => {
  it("returns undefined when count is below warning threshold", () => {
    const result = checkLimit(50, 100, "maxFilesToParse");
    expect(result).toBeUndefined();
  });

  it("returns a limit when count reaches warning threshold (80%)", () => {
    const result = checkLimit(80, 100, "maxFilesToParse");
    expect(result).toBeDefined();
    expect(result?.exceeded).toBe(false);
    expect(result?.actual).toBe(80);
    expect(result?.limit).toBe(100);
  });

  it("returns an exceeded limit when count reaches the limit", () => {
    const result = checkLimit(100, 100, "maxFilesToParse");
    expect(result).toBeDefined();
    expect(result?.exceeded).toBe(true);
    expect(result?.actual).toBe(100);
    expect(result?.limit).toBe(100);
  });

  it("returns an exceeded limit when count exceeds the limit", () => {
    const result = checkLimit(150, 100, "maxFilesToParse");
    expect(result).toBeDefined();
    expect(result?.exceeded).toBe(true);
    expect(result?.actual).toBe(150);
  });
});

describe("boundedResult", () => {
  it("marks result as complete when no limits exceeded", () => {
    const result = boundedResult(["a", "b"], [], 2);
    expect(result.complete).toBe(true);
    expect(result.value).toEqual(["a", "b"]);
    expect(result.processedCount).toBe(2);
  });

  it("marks result as incomplete when a limit is exceeded", () => {
    const limits = [{ name: "maxFilesToParse" as const, limit: 100, actual: 100, exceeded: true }];
    const result = boundedResult(["a"], limits, 1);
    expect(result.complete).toBe(false);
    expect(result.limitsHit).toEqual(limits);
  });

  it("marks result as complete when limits are approached but not exceeded", () => {
    const limits = [{ name: "maxFilesToParse" as const, limit: 100, actual: 85, exceeded: false }];
    const result = boundedResult(["a"], limits, 1);
    expect(result.complete).toBe(true);
    expect(result.limitsHit).toEqual(limits);
  });
});

describe("formatResourceLimit", () => {
  it("formats an exceeded limit", () => {
    const limit = { name: "maxFilesToParse" as const, limit: 100, actual: 150, exceeded: true };
    const formatted = formatResourceLimit(limit);
    expect(formatted).toBe("Files parsed exceeded: 150 / 100");
  });

  it("formats an approached limit", () => {
    const limit = { name: "maxThemesToDiscover" as const, limit: 500, actual: 420, exceeded: false };
    const formatted = formatResourceLimit(limit);
    expect(formatted).toBe("Themes discovered approached: 420 / 500");
  });
});

describe("selectResourceBounds", () => {
  it("returns default bounds for typical workspace", () => {
    const bounds = selectResourceBounds(500);
    expect(bounds).toBe(DEFAULT_RESOURCE_BOUNDS);
  });

  it("returns large workspace bounds for very large workspace", () => {
    const bounds = selectResourceBounds(4000);
    expect(bounds).toBe(LARGE_WORKSPACE_BOUNDS);
  });

  it("returns default bounds for small workspace", () => {
    const bounds = selectResourceBounds(100);
    expect(bounds).toBe(DEFAULT_RESOURCE_BOUNDS);
  });
});

describe("ResourceCounter", () => {
  it("tracks counts and detects limit exceeded", () => {
    const counter = new ResourceCounter(MINIMAL_BOUNDS);
    expect(counter.increment("maxFilesToParse", 250)).toBe(true);
    expect(counter.get("maxFilesToParse")).toBe(250);
    expect(counter.anyExceeded()).toBe(true);
  });

  it("tracks counts without exceeding limit", () => {
    const counter = new ResourceCounter(DEFAULT_RESOURCE_BOUNDS);
    expect(counter.increment("maxFilesToParse", 500)).toBe(false);
    expect(counter.get("maxFilesToParse")).toBe(500);
    expect(counter.anyExceeded()).toBe(false);
  });

  it("collects all limits hit", () => {
    const counter = new ResourceCounter(MINIMAL_BOUNDS);
    counter.increment("maxFilesToParse", 180);
    counter.increment("maxThemesToDiscover", 90);
    const limits = counter.getLimitsHit();
    expect(limits.length).toBe(2);
    expect(limits[0]?.name).toBe("maxFilesToParse");
    expect(limits[1]?.name).toBe("maxThemesToDiscover");
  });

  it("resets all counters", () => {
    const counter = new ResourceCounter(DEFAULT_RESOURCE_BOUNDS);
    counter.increment("maxFilesToParse", 100);
    counter.reset();
    expect(counter.get("maxFilesToParse")).toBe(0);
    expect(counter.getLimitsHit().length).toBe(0);
  });

  it("increments by 1 by default", () => {
    const counter = new ResourceCounter(DEFAULT_RESOURCE_BOUNDS);
    counter.increment("maxFilesToParse");
    counter.increment("maxFilesToParse");
    expect(counter.get("maxFilesToParse")).toBe(2);
  });
});

describe("resource bounds constants", () => {
  it("has sensible default bounds", () => {
    expect(DEFAULT_RESOURCE_BOUNDS.maxFilesToEnumerate).toBe(2000);
    expect(DEFAULT_RESOURCE_BOUNDS.maxFilesToParse).toBe(1000);
    expect(DEFAULT_RESOURCE_BOUNDS.maxThemesToDiscover).toBe(500);
    expect(DEFAULT_RESOURCE_BOUNDS.maxCacheEntries).toBe(10000);
  });

  it("has larger bounds for large workspaces", () => {
    expect(LARGE_WORKSPACE_BOUNDS.maxFilesToEnumerate).toBeGreaterThan(
      DEFAULT_RESOURCE_BOUNDS.maxFilesToEnumerate,
    );
    expect(LARGE_WORKSPACE_BOUNDS.maxFilesToParse).toBeGreaterThan(
      DEFAULT_RESOURCE_BOUNDS.maxFilesToParse,
    );
  });

  it("has smaller bounds for minimal environments", () => {
    expect(MINIMAL_BOUNDS.maxFilesToEnumerate).toBeLessThan(
      DEFAULT_RESOURCE_BOUNDS.maxFilesToEnumerate,
    );
    expect(MINIMAL_BOUNDS.maxFilesToParse).toBeLessThan(DEFAULT_RESOURCE_BOUNDS.maxFilesToParse);
  });
});
