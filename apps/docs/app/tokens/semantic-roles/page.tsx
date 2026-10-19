import type { Metadata } from "next";

import { docsUrl } from "../../../lib/site";
import { CORE_COLORS, OPTIONAL_SEMANTICS, SEMANTIC_ROLE_GROUPS } from "@themvora/core";

export const metadata: Metadata = {
  title: "Semantic roles",
  description:
    "The colour vocabulary Themvora guarantees: 21 core roles every theme must define, 6 optional states, and which adapters consume them.",
  alternates: { canonical: docsUrl("/tokens/semantic-roles") },
};

/**
 * The semantic-role vocabulary.
 *
 * **Generated from `@themvora/core`, not typed out.** The list is the contract
 * between a theme and every adapter — an adapter's mapping table can only refer
 * to roles that exist here — so a hand-copied table drifts the moment a role is
 * added. `SEMANTIC_ROLE_GROUPS` is the same constant `isCoreColor()` validates
 * against, so this page cannot disagree with the runtime.
 *
 * The distinction the page exists to make:
 *
 *   **Core (21)** — every theme must define these. An adapter may assume they
 *   are present. `border` is in here, which is why the library pages can map it
 *   for every library.
 *
 *   **Optional (6)** — a theme may define these. An adapter that maps `warning`
 *   must declare it as optional, because not every theme has one.
 */
export default function SemanticRolesPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Semantic roles</h1>
      <p className="mt-3 text-sm leading-relaxed opacity-80">
        Semantic roles are the colour vocabulary Themvora guarantees. A theme
        defines roles — <code className="mono">primary</code>,{" "}
        <code className="mono">border</code> — not raw palette values, and every
        adapter maps from this vocabulary rather than from a colour list. That is
        what lets one theme drive Material UI, Bootstrap and shadcn/ui at once.
      </p>

      <section className="mt-10">
        <h2 className="text-lg font-semibold tracking-tight">
          Core roles — {CORE_COLORS.length}
        </h2>
        <p className="mt-2 text-sm leading-relaxed opacity-80">
          Every theme must define all {CORE_COLORS.length}. An adapter may assume
          they are present, so a library page can map any of them without
          qualification.
        </p>

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

      <section className="mt-10">
        <h2 className="text-lg font-semibold tracking-tight">
          Optional states — {OPTIONAL_SEMANTICS.length}
        </h2>
        <p className="mt-2 text-sm leading-relaxed opacity-80">
          A theme may define these. An adapter that maps one must treat it as
          optional and fall back, because a theme without them is valid.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {OPTIONAL_SEMANTICS.map((role) => (
            <code key={role} className="mono rounded border border-border px-2 py-1">
              {role}
            </code>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold tracking-tight">
          Reading them from code
        </h2>
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

      <section className="mt-10">
        <h2 className="text-lg font-semibold tracking-tight">Related</h2>
        <ul className="mt-2 flex flex-col gap-1 text-sm">
          <li>
            <a href="/tokens">Token reference</a> — every group a theme can define.
          </li>
          <li>
            <a href="/tokens/code">Code tokens</a> — the syntax-highlighting
            vocabulary.
          </li>
          <li>
            <a href="/adapters">Adapters</a> — how each library maps these roles.
          </li>
        </ul>
      </section>
    </div>
  );
}

/** `cardForeground` → `card-foreground`, matching the emitted CSS variables. */
function kebab(value: string): string {
  return value.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
}
