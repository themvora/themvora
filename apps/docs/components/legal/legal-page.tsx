import type { ReactNode } from "react";
import type { Metadata } from "next";
import { docsUrl } from "../../lib/site";
import {
  PageMasthead,
  PROSE_MEASURE,
  STANDALONE_SHELL,
} from "../page-shell";

export function LegalShell({
  children,
  heading,
  updated,
  lead,
}: {
  children: ReactNode;
  heading: string;
  updated: string;
  lead: ReactNode;
}) {
  return (
    <div className={STANDALONE_SHELL}>
      <PageMasthead
        title={heading}
        meta={`Last updated: ${updated}`}
        lead={lead}
      />
      <div
        className={`${PROSE_MEASURE} space-y-8 text-[15px] leading-relaxed`}
      >
        {children}
      </div>
    </div>
  );
}

export function LegalSection({
  id,
  heading,
  children,
}: {
  id: string;
  heading: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-28">
      <h2 className="text-lg font-semibold tracking-tight mb-3">{heading}</h2>
      {children}
    </section>
  );
}

export function LegalList({ items }: { items: ReactNode[] }) {
  return (
    <ul className="list-disc pl-6 space-y-2">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}

export const legalMetadata = (
  title: string,
  description: string,
  path: string,
): Metadata => ({
  title,
  description,
  robots: { index: true, follow: true },
  alternates: { canonical: docsUrl(path) },
});
