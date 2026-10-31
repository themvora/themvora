import type { Metadata } from "next";

import { DocsLayout } from "../../../components/docs-layout";
import { PageHeader } from "../../../components/ui/page-header";
import { SectionHeading } from "../../../components/ui/section-heading";
import { docsUrl } from "../../../lib/site";
import { CORE_COLORS, OPTIONAL_SEMANTICS, SEMANTIC_ROLE_GROUPS } from "@themvora/core";

export const metadata: Metadata = {
  title: "Semantic roles",
  description:
    "The colour vocabulary Themvora guarantees: 21 core roles every theme must define, 6 optional states, and which adapters consume them.",
  alternates: { canonical: docsUrl("/tokens/semantic-roles") },
};

export default function SemanticRolesPage() {
  return (
    <DocsLayout wide>
      <div className="max-w-3xl">
        <PageHeader
          icon={
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <circle cx="12" cy="12" r="4" />
              <circle cx="12" cy="12" r="1" />
            </svg>
          }
          title="Semantic roles"
          subtitle="@themvora/core — the colour vocabulary"
          description={
            <>
              Semantic roles are the colour vocabulary Themvora guarantees. A theme
              defines roles — <code className="mono">primary</code>,{" "}
              <code className="mono">border</code> — not raw palette values, and every
              adapter maps from this vocabulary rather than from a colour list. That is
              what lets one theme drive Material UI, Bootstrap and shadcn/ui at once.
            </>
          }
        />

        <section id="core-roles" className="scroll-mt-24 mb-10">
          <SectionHeading
            num={1}
            desc={`Every theme must define all ${CORE_COLORS.length}. An adapter may assume they are present, so a library page can map any of them without qualification.`}
          >
            Core roles — {CORE_COLORS.length}
          </SectionHeading>

          <div className="mt-5 flex flex-col gap-6">
            {SEMANTIC_ROLE_GROUPS.map((group) => (
              <div key={group.id}>
                <h3 className="text-sm font-semibold">{group.label}</h3>
                <p className="mt-1 text-sm opacity-70">{group.description}</p>
                <div className="mt-2 overflow-x-auto rounded-lg border border-border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/50">
                        <th className="px-4 py-2 text-left font-semibold">Role</th>
                        <th className="px-4 py-2 text-left font-semibold">
                          CSS variable
                        </th>
                        <th className="px-4 py-2 text-left font-semibold">
                          Required
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...group.roles, ...(group.optional ?? [])].map((role) => (
                        <tr key={role} className="border-b border-border">
                          <td className="px-4 py-2">
                            <code className="mono">{role}</code>
                          </td>
                          <td className="px-4 py-2">
                            <code className="mono">--theme-color-{kebab(role)}</code>
                          </td>
                          <td className="px-4 py-2">
                            {CORE_COLORS.includes(role as never) ? "core" : "optional"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section id="optional-states" className="scroll-mt-24 mb-10">
          <SectionHeading
            num={2}
            desc="A theme may define these. An adapter that maps one must treat it as optional and fall back, because a theme without them is valid."
          >
            Optional states — {OPTIONAL_SEMANTICS.length}
          </SectionHeading>
          <div className="mt-3 flex flex-wrap gap-2">
            {OPTIONAL_SEMANTICS.map((role) => (
              <code key={role} className="mono rounded border border-border px-2 py-1">
                {role}
              </code>
            ))}
          </div>
        </section>

        <section id="reading-from-code" className="scroll-mt-24 mb-10">
          <SectionHeading
            num={3}
            desc="Validate an adapter's mapping against the runtime contract."
          >
            Reading them from code
          </SectionHeading>
          <pre className="mt-3 overflow-x-auto rounded-lg border border-border p-4 text-sm">
            <code className="mono">{`import { CORE_COLORS, isCoreColor, isOptionalSemantic } from "@themvora/core";

// The full core vocabulary, as the runtime defines it.
CORE_COLORS.length;                 // ${CORE_COLORS.length}

// Validate an adapter's mapping against the contract.
isCoreColor("border");              // true
isCoreColor("warning");             // false — optional, not core
isOptionalSemantic("warning");      // true`}</code>
          </pre>
        </section>

        <section id="related" className="scroll-mt-24">
          <SectionHeading
            num={4}
            desc="Tokens are the vocabulary — here's where they're consumed."
          >
            Related
          </SectionHeading>
          <ul className="mt-2 flex flex-col gap-1 text-sm">
            <li>
              <a href="/tokens" className="text-foreground underline underline-offset-4 hover:decoration-foreground">
                Token reference
              </a>{" "}
              — every group a theme can define.
            </li>
            <li>
              <a href="/tokens/code" className="text-foreground underline underline-offset-4 hover:decoration-foreground">
                Code tokens
              </a>{" "}
              — the syntax-highlighting vocabulary.
            </li>
            <li>
              <a href="/adapters" className="text-foreground underline underline-offset-4 hover:decoration-foreground">
                Adapters
              </a>{" "}
              — how each library maps these roles.
            </li>
          </ul>
        </section>
      </div>
    </DocsLayout>
  );
}

/** `cardForeground` → `card-foreground`, matching the emitted CSS variables. */
function kebab(value: string): string {
  return value.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
}
