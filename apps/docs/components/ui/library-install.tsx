"use client";

import { useState } from "react";

import { InstallCommand, type PackageManager } from "../install-command";

/**
 * The two install steps, sharing one package-manager selection.
 *
 * The picker itself is `InstallCommand` — the same ARIA tablist every other page
 * uses. This only holds the selection so both steps move together: a reader who
 * picks `npm` must not end up with an npm command for the library and a pnpm one
 * for Themvora.
 *
 * The highlighted HTML arrives pre-rendered per manager; highlighting is a
 * server concern (shiki) and this component only chooses what to show.
 */
export type ManagerBlocks = Record<PackageManager, { code: string; html: string }>;

export function LibraryInstall({
  libraryName,
  officialUrl,
  library,
  themvora,
}: {
  libraryName: string;
  officialUrl: string;
  library: ManagerBlocks;
  themvora: ManagerBlocks;
}) {
  const [manager, setManager] = useState<PackageManager>("pnpm");

  return (
    <>
      <div className="mt-4 flex flex-col gap-4">
        <div>
          <div className="mb-2 text-sm font-medium">
            1. Install {libraryName}
          </div>
          <InstallCommand
            commands={library}
            value={manager}
            onChange={setManager}
          />
        </div>
        <div>
          <div className="mb-2 text-sm font-medium">2. Install Themvora</div>
          <InstallCommand
            commands={themvora}
            value={manager}
            onChange={setManager}
          />
        </div>
      </div>

      <p className="mt-3 text-sm opacity-70">
        The first command is {libraryName}&apos;s own — see its{" "}
        <a href={officialUrl} target="_blank" rel="noreferrer">
          installation guide
        </a>{" "}
        if you need more than this.
      </p>
    </>
  );
}
