import type { ReactNode } from "react";
import Link from "next/link";

export type PrerequisiteItem = {
  label: string;
  value: string | ReactNode;
  href?: string;
};

export type PrerequisitesProps = {
  items: PrerequisiteItem[];
  className?: string;
};

export function Prerequisites({ items, className }: PrerequisitesProps) {
  return (
    <div
      className={`rounded-xl border border-border bg-card text-card-foreground overflow-hidden mb-10 ${className ?? ""}`.trim()}
    >
      <div className="px-4 py-2 border-b border-border bg-muted/30">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Prerequisites
        </div>
      </div>
      <div className="divide-y divide-border">
        {items.map((item, idx) => (
          <div
            key={idx}
            className="px-4 py-3 grid gap-1 sm:grid-cols-[140px_1fr] sm:gap-3"
          >
            <div className="text-xs font-semibold text-muted-foreground">
              {item.label}
            </div>
            <div className="text-sm text-card-foreground">
              {item.href ? (
                <Link href={item.href} className="underline hover:no-underline">
                  {item.value}
                </Link>
              ) : (
                item.value
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
