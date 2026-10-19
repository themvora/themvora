/**
 * Human-readable rendering for `init`.
 *
 * Both renderers are pure functions from a plan or a report to a string. That is
 * what keeps `--plan`, `--dry-run` and a real run consistent: all three describe
 * the same objects, so the preview cannot drift from the outcome.
 *
 * @packageDocumentation
 */
import { paint } from "../output.js";
import type { CommandStep, FileOperation, InitPlan, InitReport } from "./types.js";

/** How each file action is labelled. */
const ACTION_LABEL: Record<FileOperation["action"], string> = {
  create: "create",
  update: "update",
  unchanged: "unchanged",
  conflict: "conflict",
  delete: "remove",
};

/** Format a command for display. */
function commandText(command: CommandStep): string {
  return `${command.command} ${command.args.join(" ")}`;
}

/**
 * Render a plan.
 *
 * @param plan - The plan to describe.
 * @param options - Rendering options.
 * @returns The rendered text, without a trailing newline.
 */
export function renderPlan(plan: InitPlan, options: { verbose?: boolean } = {}): string {
  const lines: string[] = [];
  const kindLabel =
    plan.projectKind === "existing"
      ? "existing project"
      : plan.projectKind === "empty"
        ? "empty directory"
        : "new project";

  lines.push(paint("bold", "themvora init — plan"));
  lines.push("");
  lines.push(`  project    ${plan.projectPath}  (${kindLabel})`);
  lines.push(
    `  framework  ${plan.framework.displayName} · ${plan.framework.buildSystem} · ${
      plan.framework.ssr ? "server-rendered" : "client-rendered"
    }`,
  );
  lines.push(`  manager    ${plan.packageManager}`);
  lines.push(
    `  theme      ${plan.source.label} · family ${plan.source.family} · ${plan.source.themes.length} theme(s) · ${plan.source.modes.join(", ")}`,
  );
  lines.push(`  default    ${plan.source.defaultTheme}`);
  lines.push(
    `  styling    ${plan.styling === "tailwind" ? "Tailwind CSS v4 (@themvora/tailwind)" : "plain CSS (semantic stylesheet)"}`,
  );
  lines.push(`  example    ${plan.example ? "yes" : "no"}`);
  lines.push("");

  let step = 1;

  if (plan.scaffold) {
    lines.push(`${step++}. Scaffold`);
    lines.push(`   ${commandText(plan.scaffold)}`);
    if (plan.scaffold.cwd) lines.push(`   in ${plan.scaffold.cwd}`);
    lines.push("");
    lines.push(
      "   The generator creates the project; Themvora then integrates into it.",
    );
    lines.push(
      "   The files below are previewed against an empty directory — the",
    );
    lines.push(
      "   generator's own files are re-read before anything is written.",
    );
    lines.push("");
  }

  const conflicts = plan.files.filter((file) => file.action === "conflict");
  const writes = plan.files.filter(
    (file) => file.action === "create" || file.action === "update",
  );

  lines.push(`${step++}. Files`);
  if (plan.files.length === 0) {
    lines.push("   (none)");
  } else {
    for (const file of plan.files) {
      if (!options.verbose && file.action === "unchanged") continue;
      const label =
        file.action === "conflict"
          ? paint("red", ACTION_LABEL[file.action].padEnd(9))
          : file.action === "create"
            ? paint("green", ACTION_LABEL[file.action].padEnd(9))
            : ACTION_LABEL[file.action].padEnd(9);
      lines.push(`   ${label}${file.path}`);
      if (options.verbose || file.action === "conflict") {
        lines.push(`             ${file.reason}`);
      }
    }
    if (plan.preview) {
      lines.push(
        "   …plus targeted edits to the generator's own entry module and build config.",
      );
    }
  }
  lines.push("");

  if (plan.manualSteps.length > 0 && !plan.preview) {
    lines.push(`${step++}. Manual steps`);
    for (const manual of plan.manualSteps) {
      lines.push(`   ${paint("yellow", "!")} ${manual.path}`);
      lines.push(`     ${manual.instruction}`);
    }
    lines.push("");
  }

  if (plan.installStep) {
    lines.push(`${step++}. Install`);
    lines.push(`   ${commandText(plan.installStep)}`);
    lines.push("");
  }

  if (plan.verification.length > 0) {
    lines.push(`${step++}. Verify`);
    for (const check of plan.verification) {
      lines.push(`   ${check.command ? commandText(check.command) : check.title}`);
    }
    lines.push("");
  }

  if (plan.warnings.length > 0) {
    lines.push("Warnings");
    for (const warning of plan.warnings) {
      lines.push(`   ${paint("yellow", "!")} ${warning}`);
    }
    lines.push("");
  }

  lines.push(
    conflicts.length > 0
      ? paint("red", `${conflicts.length} conflict(s) — re-run with --force to replace them.`)
      : `${writes.length} file(s) will be written.`,
  );

  return lines.join("\n");
}

/**
 * Render a report.
 *
 * @param report - The report to describe.
 * @returns The rendered text, without a trailing newline.
 */
export function renderReport(report: InitReport): string {
  const lines: string[] = [];

  lines.push(paint("bold", "themvora init — done"));
  lines.push("");
  lines.push(`  project    ${report.projectPath}`);
  lines.push(`  framework  ${report.framework}`);
  if (report.scaffolded) lines.push("  scaffolded yes");
  if (report.installed) lines.push("  installed  yes");
  lines.push("");

  lines.push(
    `  ${report.created.length} created · ${report.updated.length} updated · ${report.deleted.length} removed · ${report.unchanged.length} unchanged · ${report.skipped.length} skipped`,
  );
  for (const path of report.created) lines.push(`    ${paint("green", "+")} ${path}`);
  for (const path of report.updated) lines.push(`    ${paint("green", "~")} ${path}`);
  // Removals are only ever scaffold residue, and a removal is the one file
  // operation a reader should be able to see without reading the plan.
  for (const path of report.deleted) lines.push(`    ${paint("yellow", "-")} ${path} (scaffold residue)`);
  for (const path of report.skipped) lines.push(`    ${paint("yellow", "!")} ${path} (left alone)`);
  lines.push("");

  if (report.verification.length > 0) {
    lines.push("  verification");
    for (const check of report.verification) {
      const mark =
        check.status === "pass"
          ? paint("green", "✓")
          : check.status === "fail"
            ? paint("red", "✗")
            : paint("dim", "·");
      lines.push(`    ${mark} ${check.title}${check.detail ? ` — ${check.detail}` : ""}`);
    }
    lines.push("");
  }

  if (report.manualSteps.length > 0) {
    lines.push("  manual steps");
    for (const manual of report.manualSteps) {
      lines.push(`    ${paint("yellow", "!")} ${manual.path} — ${manual.instruction}`);
    }
    lines.push("");
  }

  if (report.warnings.length > 0) {
    lines.push("  warnings");
    for (const warning of report.warnings) {
      lines.push(`    ${paint("yellow", "!")} ${warning}`);
    }
    lines.push("");
  }

  if (report.nextSteps.length > 0) {
    lines.push("  next");
    for (const step of report.nextSteps) lines.push(`    ${step}`);
  }

  return lines.join("\n");
}
