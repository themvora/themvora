import { describe, expect, it } from "vitest";

import {
  createPartialAnalysisReport,
  formatPartialAnalysisReport,
  mergePartialAnalysisReports,
  shouldShowReport,
} from "../src/domain/partialAnalysisReport.js";

describe("createPartialAnalysisReport", () => {
  it("creates a complete report when no limits exceeded", () => {
    const report = createPartialAnalysisReport({
      limitsHit: [],
      processedCount: 100,
      analysisType: "files",
    });
    
    expect(report.complete).toBe(true);
    expect(report.severity).toBe("info");
    expect(report.summary).toContain("complete");
    expect(report.processedCount).toBe(100);
    expect(report.recommendations.length).toBe(0);
  });

  it("creates a warning report when limits approached but not exceeded", () => {
    const report = createPartialAnalysisReport({
      limitsHit: [{ name: "maxFilesToParse", limit: 1000, actual: 850, exceeded: false }],
      processedCount: 850,
      analysisType: "files",
    });
    
    expect(report.complete).toBe(true);
    expect(report.severity).toBe("info");
    expect(report.summary).toContain("approaching");
  });

  it("creates a warning report when one limit exceeded", () => {
    const report = createPartialAnalysisReport({
      limitsHit: [{ name: "maxFilesToParse", limit: 1000, actual: 1000, exceeded: true }],
      processedCount: 1000,
      estimatedTotal: 1500,
      analysisType: "files",
    });
    
    expect(report.complete).toBe(false);
    expect(report.severity).toBe("warning");
    expect(report.summary).toContain("partial");
    expect(report.summary).toContain("~1500");
    expect(report.recommendations.length).toBeGreaterThan(0);
  });

  it("creates an error report when multiple limits exceeded", () => {
    const report = createPartialAnalysisReport({
      limitsHit: [
        { name: "maxFilesToParse", limit: 1000, actual: 1000, exceeded: true },
        { name: "maxThemesToDiscover", limit: 500, actual: 500, exceeded: true },
        { name: "maxConsumersToAnalyze", limit: 200, actual: 200, exceeded: true },
      ],
      processedCount: 1000,
      analysisType: "files",
    });
    
    expect(report.complete).toBe(false);
    expect(report.severity).toBe("error");
    expect(report.recommendations.length).toBeGreaterThan(1);
  });

  it("includes targeted recommendations for specific limits", () => {
    const report = createPartialAnalysisReport({
      limitsHit: [{ name: "maxFilesToParse", limit: 1000, actual: 1000, exceeded: true }],
      processedCount: 1000,
      analysisType: "files",
    });
    
    expect(report.recommendations.some((r) => r.includes("workspace"))).toBe(true);
  });
});

describe("formatPartialAnalysisReport", () => {
  it("formats a complete report", () => {
    const report = createPartialAnalysisReport({
      limitsHit: [],
      processedCount: 100,
      analysisType: "files",
    });
    
    const formatted = formatPartialAnalysisReport(report);
    expect(formatted).toContain("ℹ️");
    expect(formatted).toContain("complete");
    expect(formatted).toContain("100");
  });

  it("formats a partial report with recommendations", () => {
    const report = createPartialAnalysisReport({
      limitsHit: [{ name: "maxFilesToParse", limit: 1000, actual: 1000, exceeded: true }],
      processedCount: 1000,
      analysisType: "files",
    });
    
    const formatted = formatPartialAnalysisReport(report);
    expect(formatted).toContain("⚡");
    expect(formatted).toContain("partial");
    expect(formatted).toContain("Recommendations");
  });

  it("formats an error report with warning icon", () => {
    const report = createPartialAnalysisReport({
      limitsHit: [
        { name: "maxFilesToParse", limit: 1000, actual: 1000, exceeded: true },
        { name: "maxThemesToDiscover", limit: 500, actual: 500, exceeded: true },
        { name: "maxConsumersToAnalyze", limit: 200, actual: 200, exceeded: true },
      ],
      processedCount: 1000,
      analysisType: "files",
    });
    
    const formatted = formatPartialAnalysisReport(report);
    expect(formatted).toContain("⚠️");
  });
});

describe("shouldShowReport", () => {
  it("shows warning and error reports", () => {
    const warningReport = createPartialAnalysisReport({
      limitsHit: [{ name: "maxFilesToParse", limit: 1000, actual: 1000, exceeded: true }],
      processedCount: 1000,
      analysisType: "files",
    });
    
    expect(shouldShowReport(warningReport)).toBe(true);
  });

  it("shows info reports when limits approached", () => {
    const report = createPartialAnalysisReport({
      limitsHit: [{ name: "maxFilesToParse", limit: 1000, actual: 850, exceeded: false }],
      processedCount: 850,
      analysisType: "files",
    });
    
    expect(shouldShowReport(report)).toBe(true);
  });

  it("hides info reports with no limits", () => {
    const report = createPartialAnalysisReport({
      limitsHit: [],
      processedCount: 100,
      analysisType: "files",
    });
    
    expect(shouldShowReport(report)).toBe(false);
  });
});

describe("mergePartialAnalysisReports", () => {
  it("returns empty report for no reports", () => {
    const merged = mergePartialAnalysisReports([]);
    expect(merged.complete).toBe(true);
    expect(merged.processedCount).toBe(0);
  });

  it("returns single report unchanged", () => {
    const report = createPartialAnalysisReport({
      limitsHit: [],
      processedCount: 100,
      analysisType: "files",
    });
    
    const merged = mergePartialAnalysisReports([report]);
    expect(merged).toEqual(report);
  });

  it("merges multiple complete reports", () => {
    const report1 = createPartialAnalysisReport({
      limitsHit: [],
      processedCount: 100,
      analysisType: "files",
    });
    const report2 = createPartialAnalysisReport({
      limitsHit: [],
      processedCount: 50,
      analysisType: "themes",
    });
    
    const merged = mergePartialAnalysisReports([report1, report2]);
    expect(merged.complete).toBe(true);
    expect(merged.processedCount).toBe(150);
  });

  it("merges reports with partial results", () => {
    const report1 = createPartialAnalysisReport({
      limitsHit: [{ name: "maxFilesToParse", limit: 1000, actual: 1000, exceeded: true }],
      processedCount: 1000,
      analysisType: "files",
    });
    const report2 = createPartialAnalysisReport({
      limitsHit: [],
      processedCount: 50,
      analysisType: "themes",
    });
    
    const merged = mergePartialAnalysisReports([report1, report2]);
    expect(merged.complete).toBe(false);
    expect(merged.processedCount).toBe(1050);
    expect(merged.limitsHit.length).toBeGreaterThan(0);
  });

  it("deduplicates recommendations", () => {
    const report1 = createPartialAnalysisReport({
      limitsHit: [{ name: "maxFilesToParse", limit: 1000, actual: 1000, exceeded: true }],
      processedCount: 1000,
      analysisType: "files",
    });
    const report2 = createPartialAnalysisReport({
      limitsHit: [{ name: "maxFilesToParse", limit: 1000, actual: 1000, exceeded: true }],
      processedCount: 500,
      analysisType: "files",
    });
    
    const merged = mergePartialAnalysisReports([report1, report2]);
    const uniqueRecs = new Set(merged.recommendations);
    expect(uniqueRecs.size).toBe(merged.recommendations.length);
  });
});
