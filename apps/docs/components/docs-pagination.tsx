"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { DOCS_ROUTES, type DocsRoute } from "../lib/docs-routes";

type PaginationItem = DocsRoute;

function findIndex(pathname: string): number {
  // Longest match wins so nested routes (e.g. /cli/generate) resolve to their
  // own entry instead of the parent (/cli).
  let bestIndex = -1;
  let bestLength = -1;
  DOCS_ROUTES.forEach((item, index) => {
    if (
      (pathname === item.href || pathname.startsWith(`${item.href}/`)) &&
      item.href.length > bestLength
    ) {
      bestLength = item.href.length;
      bestIndex = index;
    }
  });
  return bestIndex;
}

export function DocsPagination() {
  const pathname = usePathname();
  const index = findIndex(pathname);
  if (index === -1) return null;

  const prev = index > 0 ? DOCS_ROUTES[index - 1] : undefined;
  const next = index < DOCS_ROUTES.length - 1 ? DOCS_ROUTES[index + 1] : undefined;

  return (
    <nav
      aria-label="Documentation learning path"
      className="mt-14 pt-8 border-t border-border grid gap-4 sm:grid-cols-2"
    >
      {prev ? (
        <Link
          href={prev.href}
          className="group rounded-xl border border-border bg-card text-card-foreground p-4 no-underline flex flex-col gap-1 card-lift"
        >
          <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            ← Previous
          </span>
          <span className="font-semibold text-sm sm:text-base text-card-foreground group-hover:text-card-foreground">
            {prev.label}
          </span>
          {prev.hint ? (
            <span className="text-xs text-muted-foreground line-clamp-1">
              {prev.hint}
            </span>
          ) : null}
        </Link>
      ) : (
        <div />
      )}
      {next ? (
        <Link
          href={next.href}
          className="group rounded-xl border border-border bg-card text-card-foreground p-4 no-underline flex flex-col gap-1 sm:text-right card-lift"
        >
          <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            Next →
          </span>
          <span className="font-semibold text-sm sm:text-base text-card-foreground group-hover:text-card-foreground">
            {next.label}
          </span>
          {next.hint ? (
            <span className="text-xs text-muted-foreground line-clamp-1">
              {next.hint}
            </span>
          ) : null}
        </Link>
      ) : null}
    </nav>
  );
}
