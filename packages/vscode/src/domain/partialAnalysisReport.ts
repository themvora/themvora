/**
 * Partial-analysis reporting for large-workspace reliability.
 *
 * When resource limits are hit during inspection, the analysis may be incomplete.
 * This module provides structured reporting of partial results with clear user
 * feedback about what was and wasn't analyzed.
 *
 * @packageDocumentation
 */

import type { ResourceLimit } from "./resourceBounds.js";
import { formatResourceLimit } from "./resourceBounds.js";

/** Severity of a partial analysis. */
export type PartialAnalysisSeverity = "info" | "warning" | "error";

/** A report of partial analysis results. */
export interface PartialAnalysisReport {
  /** Whether the analysis completed fully (true) or was partial (false). */
  readonly complete: boolean;
  /** Severity level for user feedback. */
  readonly severity: PartialAnalysisSeverity;
  /** Human-readable summary of what was analyzed. */
  readonly summary: string;
  /** Detailed list of limits that were approached or exceeded. */
  readonly limitsHit: readonly ResourceLimit[];
  /** Count of items successfully processed. */
  readonly processedCount: number;
  /** Estimated total items that would have been processed without limits. */
  readonly estimatedTotal: number | undefined;
  /** Recommendations for the user. */
  readonly recommendations: readonly string[];
}

/** Options for creating a partial analysis report. */
export interface PartialAnalysisOptions {
  /** The limits that were hit during analysis. */
  readonly limitsHit: readonly ResourceLimit[];
  /** Number of items successfully processed. */
  readonly processedCount: number;
  /** Estimated total items (if known). */
  readonly estimatedTotal?: number;
  /** What was being analyzed (e.g., "files", "themes"). */
  readonly analysisType: string;
}

/**
 * Create a partial analysis report from resource limits.
 *
 * @param options - The analysis options and results.
 * @returns A structured report with user feedback.
 */
export function createPartialAnalysisReport(options: PartialAnalysisOptions): PartialAnalysisReport {
  const { limitsHit, processedCount, estimatedTotal, analysisType } = options;
  
  const anyExceeded = limitsHit.some((limit) => limit.exceeded);
  const complete = !anyExceeded;
  
  // Determine severity based on how many limits were hit
  let severity: PartialAnalysisSeverity;
  if (complete) {
    severity = limitsHit.length > 0 ? "info" : "info";
  } else {
    severity = limitsHit.length > 2 ? "error" : "warning";
  }
  
  // Build summary
  const summary = buildSummary(complete, analysisType, processedCount, estimatedTotal, limitsHit);
  
  // Build recommendations
  const recommendations = buildRecommendations(limitsHit);
  
  return {
    complete,
    severity,
    summary,
    limitsHit,
    processedCount,
    estimatedTotal,
    recommendations,
  };
}

/**
 * Build a human-readable summary of the analysis.
 */
function buildSummary(
  complete: boolean,
  analysisType: string,
  processedCount: number,
  estimatedTotal: number | undefined,
  limitsHit: readonly ResourceLimit[],
): string {
  if (complete) {
    if (limitsHit.length === 0) {
      return `Analysis complete: ${processedCount} ${analysisType} processed.`;
    }
    return `Analysis complete: ${processedCount} ${analysisType} processed (approaching resource limits).`;
  }
  
  const total = estimatedTotal !== undefined ? ` of ~${estimatedTotal}` : "";
  const limitsDescription = limitsHit
    .filter((limit) => limit.exceeded)
    .map((limit) => formatResourceLimit(limit))
    .join(", ");
  
  return `Analysis partial: ${processedCount}${total} ${analysisType} processed. Limits exceeded: ${limitsDescription}.`;
}

/**
 * Build user recommendations based on limits hit.
 */
function buildRecommendations(limitsHit: readonly ResourceLimit[]): string[] {
  const recommendations: string[] = [];
  
  const exceededLimits = limitsHit.filter((limit) => limit.exceeded);
  
  if (exceededLimits.length === 0) {
    return recommendations;
  }
  
  // Check for specific limit types and add targeted recommendations
  for (const limit of exceededLimits) {
    switch (limit.name) {
      case "maxFilesToEnumerate":
        recommendations.push(
          "Consider excluding directories from the workspace (e.g., node_modules, build outputs).",
        );
        break;
      case "maxFilesToParse":
        recommendations.push(
          "Large workspace detected. Some files may not have been analyzed.",
          "Consider opening a smaller workspace folder for better performance.",
        );
        break;
      case "maxThemesToDiscover":
        recommendations.push(
          "Many themes detected. Some themes may not appear in the Studio.",
          "Consider organizing themes into separate files or folders.",
        );
        break;
      case "maxImportEdgesToResolve":
        recommendations.push(
          "Complex import graph detected. Some relationships may not be fully traced.",
        );
        break;
      case "maxConsumersToAnalyze":
        recommendations.push(
          "Many consumer files detected. Some may not be analyzed for theme usage.",
        );
        break;
      case "maxCacheEntries":
        recommendations.push(
          "Cache limit reached. Some files may need to be re-analyzed on next inspection.",
        );
        break;
      case "maxMemoryMb":
        recommendations.push(
          "Memory limit approached. Consider closing other extensions or increasing VS Code's memory limit.",
        );
        break;
      default:
        recommendations.push(`Resource limit reached: ${limit.name}.`);
    }
  }
  
  // Add general recommendations if multiple limits were hit
  if (exceededLimits.length > 2) {
    recommendations.push(
      "Multiple resource limits exceeded. Consider using a smaller workspace or adjusting resource bounds in settings.",
    );
  }
  
  return recommendations;
}

/**
 * Format a partial analysis report for display in the UI.
 *
 * @param report - The report to format.
 * @returns A formatted string suitable for display.
 */
export function formatPartialAnalysisReport(report: PartialAnalysisReport): string {
  const lines: string[] = [];
  
  // Header with severity icon
  const icon = report.severity === "error" ? "⚠️" : report.severity === "warning" ? "⚡" : "ℹ️";
  lines.push(`${icon} ${report.summary}`);
  
  // Add recommendations if any
  if (report.recommendations.length > 0) {
    lines.push("");
    lines.push("Recommendations:");
    for (const rec of report.recommendations) {
      lines.push(`  • ${rec}`);
    }
  }
  
  return lines.join("\n");
}

/**
 * Check if a report should be shown to the user.
 *
 * @param report - The report to check.
 * @returns True if the report should be displayed.
 */
export function shouldShowReport(report: PartialAnalysisReport): boolean {
  // Always show warnings and errors
  if (report.severity === "warning" || report.severity === "error") {
    return true;
  }
  
  // Show info reports only if limits were approached
  return report.limitsHit.length > 0;
}

/**
 * Merge multiple partial analysis reports into one.
 *
 * @param reports - The reports to merge.
 * @returns A merged report with combined limits and recommendations.
 */
export function mergePartialAnalysisReports(
  reports: readonly PartialAnalysisReport[],
): PartialAnalysisReport {
  if (reports.length === 0) {
    return {
      complete: true,
      severity: "info",
      summary: "No analysis performed.",
      limitsHit: [],
      processedCount: 0,
      estimatedTotal: undefined,
      recommendations: [],
    };
  }
  
  if (reports.length === 1) {
    return reports[0]!;
  }
  
  // Merge all reports
  const complete = reports.every((r) => r.complete);
  const severity = reports.reduce<PartialAnalysisSeverity>((max, r) => {
    if (r.severity === "error") return "error";
    if (r.severity === "warning" && max !== "error") return "warning";
    return max;
  }, "info");
  
  const allLimits = reports.flatMap((r) => r.limitsHit);
  const uniqueLimits = Array.from(new Map(allLimits.map((l) => [l.name, l])).values());
  
  const totalProcessed = reports.reduce((sum, r) => sum + r.processedCount, 0);
  const totalEstimated = reports.every((r) => r.estimatedTotal !== undefined)
    ? reports.reduce((sum, r) => sum + (r.estimatedTotal ?? 0), 0)
    : undefined;
  
  const allRecommendations = reports.flatMap((r) => r.recommendations);
  const uniqueRecommendations = Array.from(new Set(allRecommendations));
  
  const summary = complete
    ? `Analysis complete: ${totalProcessed} items processed across ${reports.length} operations.`
    : `Analysis partial: ${totalProcessed} items processed across ${reports.length} operations. ${uniqueLimits.length} resource limit(s) exceeded.`;
  
  return {
    complete,
    severity,
    summary,
    limitsHit: uniqueLimits,
    processedCount: totalProcessed,
    estimatedTotal: totalEstimated,
    recommendations: uniqueRecommendations,
  };
}
