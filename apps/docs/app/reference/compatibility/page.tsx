import type { Metadata } from "next";

import { DocsLayout } from "../../../components/docs-layout";
import { PageHeader } from "../../../components/ui/page-header";
import {
  frameworkCompatibilityData,
  libraryCompatibilityData,
  VERIFIED_DATE,
  VERIFIED_VERSION,
  type FrameworkCompatibility,
  type LibraryCompatibility,
} from "../../../lib/compatibility-data";
import { docsUrl } from "../../../lib/site";

export const metadata: Metadata = {
  alternates: { canonical: docsUrl("/reference/compatibility") },
  title: "Compatibility & Support Matrix",
  description:
    "A single source of truth for Themvora framework, package, and library compatibility — SSR, zero-flash, persistence, adapter support, and last verification.",
};

function CompatibilityBadge({ value }: { value: string }) {
  const colorMap: Record<string, string> = {
    Full: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    Auto: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    Stable: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    Helpers: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    Manual: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    "Client-only": "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    Cookie: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
    LocalStorage: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
    Both: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
    None: "bg-muted/40 text-muted-foreground",
    "N/A": "bg-muted/40 text-muted-foreground",
  };

  const colorClass =
    colorMap[value] || "bg-muted/40 text-muted-foreground";

  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${colorClass}`}
    >
      {value}
    </span>
  );
}

function FrameworkTable({ data }: { data: FrameworkCompatibility[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead className="bg-muted/40 border-b border-border">
          <tr>
            <th className="text-left px-3 py-2.5 font-medium">Package</th>
            <th className="text-left px-3 py-2.5 font-medium">Framework</th>
            <th className="text-left px-3 py-2.5 font-medium">Version</th>
            <th className="text-left px-3 py-2.5 font-medium">SSR</th>
            <th className="text-left px-3 py-2.5 font-medium">Zero-flash</th>
            <th className="text-left px-3 py-2.5 font-medium">Persistence</th>
            <th className="text-left px-3 py-2.5 font-medium">Scrollbar</th>
            <th className="text-left px-3 py-2.5 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, idx) => (
            <tr
              key={idx}
              className="border-b border-border hover:bg-muted/20 transition-colors"
            >
              <td className="px-3 py-3 font-mono text-[0.6875rem]">
                {row.package}
              </td>
              <td className="px-3 py-3">{row.framework}</td>
              <td className="px-3 py-3 font-mono text-[0.6875rem] text-muted-foreground">
                {row.frameworkVersion}
              </td>
              <td className="px-3 py-3">
                <CompatibilityBadge value={row.ssr} />
              </td>
              <td className="px-3 py-3">
                <CompatibilityBadge value={row.zeroFlash} />
              </td>
              <td className="px-3 py-3">
                <CompatibilityBadge value={row.persistence} />
              </td>
              <td className="px-3 py-3 text-muted-foreground">
                {row.scrollbar}
              </td>
              <td className="px-3 py-3">
                <CompatibilityBadge value={row.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function LibraryTable({ data }: { data: LibraryCompatibility[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead className="bg-muted/40 border-b border-border">
          <tr>
            <th className="text-left px-3 py-2.5 font-medium">Library</th>
            <th className="text-left px-3 py-2.5 font-medium">Package</th>
            <th className="text-left px-3 py-2.5 font-medium">Architecture</th>
            <th className="text-left px-3 py-2.5 font-medium">
              Host Frameworks
            </th>
            <th className="text-left px-3 py-2.5 font-medium">CSS Vars / Type</th>
            <th className="text-left px-3 py-2.5 font-medium">SSR Safe</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, idx) => (
            <tr
              key={idx}
              className="border-b border-border hover:bg-muted/20 transition-colors"
            >
              <td className="px-3 py-3 font-medium">{row.library}</td>
              <td className="px-3 py-3 font-mono text-[0.6875rem]">
                {row.package}
              </td>
              <td className="px-3 py-3">
                <CompatibilityBadge value={row.adapterType} />
              </td>
              <td className="px-3 py-3 text-muted-foreground text-[0.6875rem]">
                {row.frameworkSupport}
              </td>
              <td className="px-3 py-3 font-mono text-[0.6875rem] text-muted-foreground max-w-xs truncate">
                {row.cssVarPrefix}
              </td>
              <td className="px-3 py-3">
                {row.ssrSafe ? (
                  <span className="text-emerald-600 dark:text-emerald-400">✓</span>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function CompatibilityMatrixPage() {
  return (
    <DocsLayout>
      <div>
        <PageHeader
          eyebrow="Reference"
          title="Compatibility & Support Matrix"
          description="Canonical answers for what is supported, tested, and production-ready — covering all frameworks, adapters, and libraries."
        />

        <div className="my-8 space-y-8">
          <div className="rounded-lg border border-border bg-muted/10 p-4 text-sm">
            <p className="font-medium mb-1">Data Verification</p>
            <p className="text-muted-foreground text-xs">
              Last verified: <strong>{VERIFIED_DATE}</strong> · Themvora{" "}
              <strong>v{VERIFIED_VERSION}</strong>
            </p>
            <p className="text-muted-foreground text-xs mt-2">
              All data sourced from the actual package manifests — normal
              dependencies, peer dependencies and optional peers — plus source
              audits. For feature-by-feature caveats, visit{" "}
              <a href="/known-limitations" className="underline">
                Known Limitations
              </a>
              .
            </p>
          </div>

          <section>
            <h2 className="text-lg font-semibold mb-4">
              Framework Package Compatibility
            </h2>
            <FrameworkTable data={frameworkCompatibilityData} />
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-4">
              Library Adapter Compatibility
            </h2>
            <LibraryTable data={libraryCompatibilityData} />
          </section>

          <section id="node-js-support-policy" className="scroll-mt-24">
            <h2 className="text-lg font-semibold mb-4">
              Node.js support policy
            </h2>
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-xs">
                <thead className="bg-muted/40 border-b border-border">
                  <tr>
                    <th className="text-left px-3 py-2.5 font-medium">
                      Category
                    </th>
                    <th className="text-left px-3 py-2.5 font-medium">
                      Declared requirement
                    </th>
                    <th className="text-left px-3 py-2.5 font-medium">
                      Why
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-border">
                    <td className="px-3 py-3">Browser runtime packages</td>
                    <td className="px-3 py-3 font-mono">
                      No Node.js runtime requirement
                    </td>
                    <td className="px-3 py-3 text-muted-foreground">
                      These packages run in the browser. They have no
                      Node.js-only APIs at runtime; use whatever Node version
                      your bundler and test runner support.
                    </td>
                  </tr>
                  <tr className="border-b border-border">
                    <td className="px-3 py-3">
                      Framework integrations and adapters
                    </td>
                    <td className="px-3 py-3 font-mono">
                      No Node.js engine declared
                    </td>
                    <td className="px-3 py-3 text-muted-foreground">
                      The framework&apos;s own toolchain sets the build-time
                      minimum. Use the newer of Node.js 18 and your
                      framework&apos;s supported Node range.
                    </td>
                  </tr>
                  <tr className="border-b border-border">
                    <td className="px-3 py-3">
                      <code className="mono">@themvora/core</code>
                    </td>
                    <td className="px-3 py-3 font-mono">node &gt;=18</td>
                    <td className="px-3 py-3 text-muted-foreground">
                      Declared for the package&apos;s tooling surface. The
                      browser runtime itself does not call Node.js APIs.
                    </td>
                  </tr>
                  <tr className="border-b border-border">
                    <td className="px-3 py-3">
                      <code className="mono">@themvora/cli</code>
                    </td>
                    <td className="px-3 py-3 font-mono">node &gt;=18</td>
                    <td className="px-3 py-3 text-muted-foreground">
                      The published CLI declares Node.js 18+ and runs on Node.js
                      18 and newer. It is a separate executable, so its
                      requirement is independent of the browser runtime.
                    </td>
                  </tr>
                  <tr>
                    <td className="px-3 py-3">Repository contributors</td>
                    <td className="px-3 py-3 font-mono">node &gt;=22.23.4</td>
                    <td className="px-3 py-3 text-muted-foreground">
                      The monorepo root declares this engine and{" "}
                      <code className="mono">.nvmrc</code> pins 22.23.4. The
                      docs toolchain and release gates run on it.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              The CLI carries its own{" "}
              <code className="mono">engines.node</code> declaration because it
              is an executable, separate from the browser-runtime packages. Use
              the{" "}
              <a href="/cli/installation" className="underline">
                CLI installation guide
              </a>{" "}
              for its install paths.
            </p>
          </section>

          <section className="mt-8 space-y-4 text-sm text-muted-foreground">
            <div>
              <h3 className="font-medium text-foreground mb-2">Legend</h3>
              <dl className="space-y-2 text-xs">
                <div className="flex gap-3">
                  <dt className="font-medium min-w-[8rem]">SSR:</dt>
                  <dd>
                    <strong>Full</strong> = the server resolves the theme and
                    renders the themed shell; <strong>Helpers</strong> = the
                    package exports bootstrap utilities that you wire into your
                    own server render; <strong>Client-only</strong> = the
                    runtime is created in the browser and does not resolve
                    request-specific server cookies; <strong>N/A</strong> = not
                    a runtime integration.
                  </dd>
                </div>
                <div className="flex gap-3">
                  <dt className="font-medium min-w-[8rem]">Zero-flash:</dt>
                  <dd>
                    <strong>Auto</strong> = the integration emits the blocking
                    pre-paint script automatically; <strong>Manual</strong> =
                    you must inline the documented bootstrap script yourself;{" "}
                    <strong>None</strong> = no supported pre-paint path;{" "}
                    <strong>N/A</strong> = not a runtime integration.
                  </dd>
                </div>
                <div className="flex gap-3">
                  <dt className="font-medium min-w-[8rem]">Persistence:</dt>
                  <dd>
                    <strong>Cookie</strong> = SSR-readable; <strong>LocalStorage</strong> = client-only; <strong>Both</strong> = supports
                    either
                  </dd>
                </div>
                <div className="flex gap-3">
                  <dt className="font-medium min-w-[8rem]">Adapter types:</dt>
                  <dd>
                    <strong>CSS-variable</strong> = writes :root CSS vars; <strong>Generated-theme</strong> = builds native library theme
                    object; <strong>Preset</strong> = build-time integration
                  </dd>
                </div>
              </dl>
            </div>

            <div>
              <h3 className="font-medium text-foreground mb-2">
                Important Notes
              </h3>
              <ul className="space-y-1.5 text-xs list-disc list-inside">
                <li>
                  <strong>MUI, Chakra, Ant Design, Mantine:</strong> React-only.
                  No framework subpaths exist. The pure theme builders
                  (createMuiTheme, etc.) are framework-neutral, but runtime
                  integration requires React.
                </li>
                <li>
                  <strong>shadcn/ui, Bootstrap, daisyUI, Open Props:</strong>{" "}
                  Framework-neutral CSS-variable adapters. Exports /react /vue
                  /svelte /solid /angular /factory.
                </li>
                <li>
                  <strong>Next.js, Astro, Nuxt:</strong> Fully automated
                  zero-flash SSR. Server reads cookies, emits blocking script,
                  renders theme before hydration.
                </li>
                <li>
                  <strong>Remix v2 and React Router:</strong> both use
                  <code>@themvora/remix</code>; React Router Framework Mode is
                  the <code>/react-router</code> entry point. Both are
                  SSR-capable and coordinate the scrollbar class through
                  <code>createThemeDocument()</code>.
                </li>
                <li>
                  <strong>Angular:</strong> Uses own bootstrap implementation
                  (createBlockingScriptContent), not core's
                  serializeThemeBootstrapScript.
                </li>
                <li>
                  <strong>Cross-window sync:</strong> All framework packages
                  support BroadcastChannel and storage events (implemented in
                  core).
                </li>
              </ul>
            </div>
          </section>
        </div>
      </div>
    </DocsLayout>
  );
}
