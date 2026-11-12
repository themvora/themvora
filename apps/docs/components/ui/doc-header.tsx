import type { ReactNode } from "react";
import { VersionBadge } from "./version-badge";
import { SupportBadge, type SupportLevel } from "./support-badge";

interface DocHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  metadata?: {
    package?: string;
    framework?: string;
    version?: string;
    lastVerified?: string;
    status?: "stable" | "experimental" | "deprecated";
    ssr?: SupportLevel;
    /** Canonical matrix label, e.g. `Client-only`, `Full`, `Helpers`, `N/A`. */
    ssrLabel?: string;
    zeroFlash?: SupportLevel;
    /** Canonical matrix label, e.g. `Auto`, `Manual`, `None`, `N/A`. */
    zeroFlashLabel?: string;
  };
  children?: ReactNode;
}

export function DocHeader({
  eyebrow,
  title,
  description,
  metadata,
  children,
}: DocHeaderProps) {
  return (
    <div className="mb-8 space-y-4">
      {/*
        No <Breadcrumbs /> here. `DocsLayout` already renders one at the top of
        every docs page's content column, so rendering it here too printed the
        trail twice on framework guides ("Home › Framework Guides › Astro").
      */}
      {eyebrow ? (
        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {eyebrow}
        </div>
      ) : null}

      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-3">{title}</h1>
        {description ? (
          <p className="text-lg text-muted-foreground leading-relaxed">
            {description}
          </p>
        ) : null}
      </div>

      {metadata ? (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {metadata.package ? (
            <code className="px-2 py-1 rounded bg-muted/60 text-foreground font-mono">
              {metadata.package}
            </code>
          ) : null}

          {metadata.version ? (
            <VersionBadge
              prefix="Package version:"
              version={metadata.version}
            />
          ) : null}

          {metadata.status ? (
            <span
              className={`px-2 py-1 rounded font-medium ${
                metadata.status === "stable"
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : metadata.status === "experimental"
                    ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                    : "bg-red-500/10 text-red-600 dark:text-red-400"
              }`}
            >
              {metadata.status.charAt(0).toUpperCase() +
                metadata.status.slice(1)}
            </span>
          ) : null}

          {metadata.ssr !== undefined ? (
            <span className="inline-flex items-center gap-1.5">
              <span className="text-xs opacity-60">SSR:</span>
              <SupportBadge
                level={metadata.ssr}
                {...(metadata.ssrLabel ? { label: metadata.ssrLabel } : {})}
              />
            </span>
          ) : null}

          {metadata.zeroFlash !== undefined ? (
            <span className="inline-flex items-center gap-1.5">
              <span className="text-xs opacity-60">Zero-flash:</span>
              <SupportBadge
                level={metadata.zeroFlash}
                {...(metadata.zeroFlashLabel
                  ? { label: metadata.zeroFlashLabel }
                  : {})}
              />
            </span>
          ) : null}

          {/* Verified metedata */}
          {/* {metadata.lastVerified ? (
            <span className="text-muted-foreground ml-auto">
              Verified {metadata.lastVerified}
            </span>
          ) : null} */}
        </div>
      ) : null}

      {children}
    </div>
  );
}
