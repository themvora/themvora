"use client";

import { useState } from "react";

import { InstallCommand, type PackageManager } from "./install-command";

type CommandSet = Record<PackageManager, { code: string; html?: string }>;

/**
 * Two install commands that move together.
 *
 * The primary command installs only the Themvora packages. The second is for a
 * project that does not have the framework itself yet — shown separately so a
 * reader who already created the project does not think they must reinstall its
 * framework packages. Both share one package-manager selection.
 */
export function InstallCommandPair({
  primary,
  secondary,
  secondaryLabel,
}: {
  primary: CommandSet;
  secondary: CommandSet;
  secondaryLabel: string;
}) {
  const [manager, setManager] = useState<PackageManager>("pnpm");

  return (
    <div className="grid gap-4">
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide opacity-60">
          Themvora packages
        </p>
        <InstallCommand commands={primary} value={manager} onChange={setManager} />
      </div>
      <div>
        <p className="mb-2 text-sm font-medium">{secondaryLabel}</p>
        <InstallCommand commands={secondary} value={manager} onChange={setManager} />
      </div>
    </div>
  );
}
