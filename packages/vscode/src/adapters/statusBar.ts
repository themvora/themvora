/**
 * The status bar item.
 *
 * One item, not one per folder: a status bar crowded with a row per workspace
 * folder is unreadable, and the multi-root case is better served by a count in
 * the text and a full breakdown in the tooltip.
 *
 * The item is hidden entirely when no folder is open. A Themvora indicator on a
 * window with no project would be an assertion about nothing.
 *
 * @packageDocumentation
 */
import { StatusBarAlignment, ThemeColor, window, type StatusBarItem } from "vscode";

import type { ProjectInspection, RegistryStatus } from "../domain/registry.js";
import { describeProjectStatus, statusLabel } from "../domain/statusLabels.js";

/** What the status bar needs to know. */
export interface StatusBarUpdate {
  /** The folder name, for the tooltip. */
  readonly name: string;
  /** Its inspection result. */
  readonly inspection: ProjectInspection;
}

/** A live status bar item. */
export interface StatusBarHandle {
  /** Re-render from the current inspections. */
  update(updates: readonly StatusBarUpdate[]): void;
  /** Remove the item. */
  dispose(): void;
}

/**
 * Create the status bar item.
 *
 * @returns A handle whose `update` may be called any number of times.
 */
export function createStatusBar(): StatusBarHandle {
  const item: StatusBarItem = window.createStatusBarItem(StatusBarAlignment.Right, 100);
  item.name = "Themvora";
  item.command = "themvora.workspace.focus";

  return {
    update(updates: readonly StatusBarUpdate[]): void {
      if (updates.length === 0) {
        item.hide();
        return;
      }

      const worst = updates.reduce<RegistryStatus>((current, update) => {
        // Surface the least healthy status: a project with one unreadable
        // registry should not read as healthy just because another folder is.
        return rank(update.inspection.status) < rank(current) ? update.inspection.status : current;
      }, "supported");

      const label = statusLabel(worst);
      item.text = updates.length === 1 ? `$(symbol-color) Themvora: ${label}` : `$(symbol-color) Themvora (${updates.length})`;

      item.tooltip = updates
        .map((update) => `${update.name}: ${describeProjectStatus(update.inspection.status)}`)
        .join("\n");

      if (worst === "malformed") {
        item.backgroundColor = new ThemeColor("statusBarItem.warningBackground");
      } else {
        item.backgroundColor = undefined;
      }

      item.show();
    },

    dispose(): void {
      item.dispose();
    },
  };
}

/** Ordering used to pick the least healthy status. Lower is worse. */
function rank(status: ProjectInspection["status"]): number {
  switch (status) {
    case "missing":
      return 0;
    case "unsupported":
      return 1;
    case "malformed":
      return 2;
    case "supported":
      return 3;
  }
}
