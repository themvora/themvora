import type { Metadata } from "next";
import Link from "next/link";

import { DocsLayout } from "../../components/docs-layout";
import { CodeExample } from "../../components/code-example";
import { FrameworkTabs } from "../../components/framework-tabs";
import { PageHeader } from "../../components/ui/page-header";
import { SectionHeading } from "../../components/ui/section-heading";
import { Callout } from "../../components/ui/callout";
import { Prerequisites } from "../../components/ui/prerequisites";
import { NextSteps } from "../../components/ui/next-step-card";
import { RelatedLinks } from "../../components/ui/related-links";
import { highlightCode } from "../../lib/highlight";
import { compatibilityBadge } from "../../lib/code-variants";
import { docsUrl } from "../../lib/site";

export const metadata: Metadata = {
  alternates: { canonical: docsUrl("/vite-plugin") },
  title: "Vite Plugin",
  description:
    "For Web Components and framework-free Vite apps: connect theme.config.ts to Vite's HTML pipeline so the pre-paint bootstrap is injected into index.html without repeating themes, defaultTheme or initialMode.",
};

/**
 * The canonical `theme.config.ts`, shown once.
 *
 * Kept separate from the per-framework registrations below on purpose: the file
 * is identical for every Vite-hosted framework, so repeating it in each tab
 * would teach the opposite of what this page is about.
 */
const themeConfigSnippet = {
  lang: "ts",
  title: "theme.config.ts",
  code: `import { defineThemvoraConfig } from "@themvora/core";
import { themes } from "./src/themes";

export default defineThemvoraConfig({
  themes,
  defaultTheme: "mint-light",
  initialMode: "system",
  initialFamily: "mint",
});`,
};

/**
 * Registration, for the integrations that actually need the plugin.
 *
 * SSR frameworks never serve index.html and already emit their own bootstrap,
 * so they are not listed here. Web Components and framework-free Vite apps do
 * serve index.html, and get the same one-line registration.
 */
const registrationExamples = [
  {
    label: "Web Components",
    lang: "ts",
    filename: "vite.config.ts",
    code: `import { defineConfig } from "vite";
import { themvoraVitePlugin } from "@themvora/web/vite";

export default defineConfig({
  plugins: [themvoraVitePlugin()],
});`,
  },
  {
    label: "Framework-free",
    lang: "ts",
    filename: "vite.config.ts",
    code: `import { defineConfig } from "vite";
import { themvoraVitePlugin } from "@themvora/core/vite";

export default defineConfig({
  plugins: [themvoraVitePlugin()],
});`,
  },
];

const registrationExamplesWithHtml = registrationExamples.map((example) => ({
  ...example,
  html: highlightCode(example.code, example.lang),
  ...compatibilityBadge(example.code, example.lang, example.label),
}));

/**
 * The keys of `ThemvoraConfig`, derived from the shipped type rather than
 * invented: the first six are exactly `ThemeBootstrapConfig` — the projection
 * both integrations serialize into the page.
 */
const themeConfigKeys = [
  {
    key: "themes",
    optional: false,
    decides: "The registry both the runtime and the pre-paint script resolve from. Required.",
  },
  {
    key: "defaultTheme",
    optional: true,
    decides:
      "The theme painted when nothing is persisted. Defaults to the first theme in the registry.",
  },
  {
    key: "initialMode",
    optional: true,
    decides:
      "The mode on a first visit. `system` follows the OS preference; omitting it keeps `defaultTheme`'s own mode.",
  },
  {
    key: "initialFamily",
    optional: true,
    decides:
      "The family on a first visit, when the registry groups themes into families.",
  },
  {
    key: "storageKey",
    optional: true,
    decides:
      "The localStorage key holding the selection. Both consumers read this one key. Defaults to `theme-selection`.",
  },
  {
    key: "prefix",
    optional: true,
    decides:
      "The CSS custom property prefix written by the bindings. Defaults to `theme-`.",
  },
];

/**
 * The registry the config above points at. Declared on the page because every
 * snippet here imports it: a page whose examples import a file it never shows
 * is not copy-pasteable.
 */
const themesModuleSnippet = {
  lang: "ts",
  title: "src/themes.ts",
  code: `import { defineTheme } from "@themvora/core";

export const themes = [
  defineTheme({
    name: "mint-light",
    meta: { family: "mint", mode: "light", label: "Mint Light", order: 10 },
    tokens: { colors: { background: "#f8fafc", foreground: "#0f172a" } },
  }),
  defineTheme({
    name: "mint-dark",
    meta: { family: "mint", mode: "dark", label: "Mint Dark", order: 20 },
    tokens: { colors: { background: "#0f172a", foreground: "#f8fafc" } },
  }),
];`,
};

const optionsSnippet = {
  lang: "ts",
  title: "themvoraVitePlugin — every option, at once",
  code: `import { themvoraVitePlugin } from "@themvora/core/vite";

themvoraVitePlugin({
  config: "./src/theme.config.ts",
  scrollbar: true,
  syncFirstRender: true,
  ssrEntry: "/src/entry-server.tsx",
  ssrContainer: "root",
});`,
};

/**
 * The pipeline, rendered as a list rather than an ASCII block in a CodeBlock:
 * it is a sequence to read, not code to copy.
 *
 * The two `@internal` steps are named deliberately. They are real functions in
 * `packages/core/src/bootstrap.ts`, but they are tagged internal and are absent
 * from the public API manifest — so the page says which step is the public
 * entry point instead of presenting all of them as callable API.
 */
const pipelineSteps = [
  {
    label: "theme.config.ts",
    detail: "The application's configuration, at the project root.",
    internal: false,
  },
  {
    label: "themvoraVitePlugin()",
    detail:
      "Discovers the file and projects it with `toBootstrapConfig` — the serializable keys, which is what the pre-paint script and the client runtime both read.",
    internal: false,
  },
  {
    label: "buildBootstrapPlan()",
    detail:
      "Turns the registry into the CSS-variable tables and the resolution plan.",
    internal: true,
  },
  {
    label: "serializeThemeBootstrapScript()",
    detail: "Serializes the plan into the self-contained IIFE.",
    internal: true,
  },
  {
    label: "index.html <head>",
    detail:
      "The script is injected head-prepend with `enforce: \"pre\"`, so it runs before any other head script.",
    internal: false,
  },
  {
    label: "The browser resolves the theme",
    detail:
      "The script reads the persisted selection and resolves `system` against `prefers-color-scheme`.",
    internal: false,
  },
  {
    label: "The runtime initializes",
    detail:
      "The runtime starts from the same configuration, so it confirms what the script painted instead of correcting it.",
    internal: false,
  },
];

/**
 * Configuration-mismatch troubleshooting.
 *
 * Each answer describes what the shipped code does, not generic plugin advice.
 * The warning strings are copied from `packages/core/src/config-loader.ts` —
 * keep them in sync when that file changes.
 */
const configTroubleshooting = [
  {
    symptom: "I already have themes in vite.config.ts",
    fix: "Move them to theme.config.ts and call themvoraVitePlugin() with no theme options. The theme options on the plugin are a deprecated escape hatch — when a config is discovered they are ignored, so leaving them in place means editing values that no longer take effect.",
  },
  {
    symptom: "The plugin can't find my config",
    fix: "Discovery looks for theme.config.ts (then .tsx, .mts, .mjs, .js, .cjs) in Vite's root — config.root, or process.cwd() when unset. If the file lives elsewhere, name it: themvoraVitePlugin({ config: \"./src/theme.config.ts\" }).",
  },
  {
    symptom: "My provider and the bootstrap disagree",
    fix: "They should be reading the same object. Both the plugin's bootstrap and the provider's runtime come from the discovered theme.config.ts, so a disagreement means one of them was given an override — provider props win over the transported config. Drop the override and the source of truth is single again.",
  },
  {
    symptom: "I edited theme.config.ts and nothing changed",
    fix: "The plugin watches theme.config.ts and drops its cached configuration when the file changes, then reloads the page, so an edit is picked up on the next request. If a stale page is still served, the watcher did not see the write — a network drive, a container mount, or an editor that replaces the file through a path Vite does not watch. Restart the dev server in that case. A production build always re-derives it.",
  },
  {
    symptom: "I use more than one Vite config",
    fix: "Each one resolves its own root, so each discovers its own theme.config.ts. Two Vite configs sharing one root share one configuration; a config with an explicit root gets that root's file.",
  },
];

const discoveryWarnings = `[themvora] could not find Vite to load /app/theme.config.ts. Pass \`config\` explicitly, or declare \`vite\` as a dependency.
[themvora] could not load /app/theme.config.ts: config must export or return an object`;

export default function VitePluginPage() {
  return (
    <DocsLayout>
      <div>
        <PageHeader
          eyebrow="Vite Plugin"
          title="Optional: zero-flash before the bundle loads"
          description={
            <>
              The{" "}
              <code className="mono text-[0.9em]">themvoraVitePlugin</code>{" "}
              injects a synchronous bootstrap script into your{" "}
              <code className="mono text-[0.9em]">index.html</code> at build
              time so the persisted theme is applied on the{" "}
              <strong>very first frame</strong> — before the JavaScript bundle
              even loads.
            </>
          }
        />

        <Prerequisites
          items={[
            {
              label: "Vite project",
              value: "A Web Components or framework-free Vite app",
              href: "https://vitejs.dev/guide/",
            },
            {
              label: "Themvora package installed",
              value: "@themvora/web or @themvora/core",
              href: "/get-started",
            },
          ]}
        />

        <section id="configuration" className="scroll-mt-24 mb-10">
          <SectionHeading
            num={1}
            desc="One configuration. Two consumers. Zero duplicated theme configuration."
          >
            Configuration
          </SectionHeading>
          <p className="text-sm opacity-80 leading-relaxed mb-4">
            Themvora&apos;s Vite plugin discovers{" "}
            <code className="mono text-[0.9em]">theme.config.ts</code> and
            injects the bootstrap — see the 7-step pipeline in Section 5.
          </p>
          <p className="text-sm opacity-80 leading-relaxed mb-4">
            The plugin and the runtime read the same configuration. The plugin
            injects the pre-paint CSS and blocking script; the provider or
            runtime starts from the same values. There is no second place to
            declare themes, <code className="mono text-[0.9em]">defaultTheme</code>{" "}
            or <code className="mono text-[0.9em]">initialMode</code>.
          </p>
          <Callout variant="neutral" className="mt-3">
            <p className="text-sm leading-relaxed">
              See{" "}
              <Link
                href="/architecture#configuration"
                className="text-foreground underline hover:decoration-foreground"
              >
                Architecture → Configuration
              </Link>{" "}
              for the full contract, including a table of which keys each
              consumer reads.
            </p>
          </Callout>
        </section>

        <section id="theme-config" className="scroll-mt-24 mb-10">
          <SectionHeading
            num={2}
            desc="The one file the plugin and the provider both read."
          >
            Create theme.config.ts
          </SectionHeading>
          <p className="text-sm opacity-80 leading-relaxed mb-4">
            Put it at the project root — the same level as{" "}
            <code className="mono text-[0.9em]">vite.config.ts</code>.{" "}
            <code className="mono text-[0.9em]">themes</code> can come from
            anywhere: a local file, a package, or the built-in set.
          </p>
          <CodeExample
            code={themeConfigSnippet.code}
            lang="ts"
            filename={themeConfigSnippet.title}
            className="m-0"
          />
          <CodeExample
            code={themesModuleSnippet.code}
            lang="ts"
            filename={themesModuleSnippet.title}
            className="m-0 mt-3"
          />
          <div className="mt-4 rounded-xl border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="px-4 py-2.5 text-left font-semibold text-xs uppercase tracking-wider whitespace-nowrap">
                      Key
                    </th>
                    <th className="px-4 py-2.5 text-left font-semibold text-xs uppercase tracking-wider">
                      What it decides
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {themeConfigKeys.map((row) => (
                    <tr
                      key={row.key}
                      className="border-b border-border last:border-0 align-top"
                    >
                      <td className="px-4 py-2.5 mono text-[0.85em] whitespace-nowrap">
                        {row.key}
                        {row.optional ? (
                          <span className="opacity-45"> ?</span>
                        ) : null}
                      </td>
                      <td className="px-4 py-2.5 opacity-70">{row.decides}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <p className="text-xs opacity-60 mt-2">
            The full config key reference is on the{" "}
            <Link
              href="/architecture#configuration"
              className="text-foreground underline hover:decoration-foreground"
            >
              Architecture page
            </Link>.
          </p>
          <Callout variant="neutral" className="mt-3" title="Which keys reach the page">
            <p className="text-sm leading-relaxed">
              The bootstrap needs a registry, a fallback theme, an initial
              mode/family, a storage key and a prefix — nothing else can affect
              a frame painted before the runtime exists. Keys like{" "}
              <code className="mono text-[0.9em]">transition</code>,{" "}
              <code className="mono text-[0.9em]">persistence</code>,{" "}
              <code className="mono text-[0.9em]">scrollbar</code>,{" "}
              <code className="mono text-[0.9em]">plugins</code> and{" "}
              <code className="mono text-[0.9em]">adapters</code> are never
              serialized — pass them to the provider directly.
            </p>
          </Callout>
          <p className="text-sm opacity-80 leading-relaxed mt-4">
            No file at all is also valid: the plugin and provider both fall back
            to built-in neutral themes.
          </p>
        </section>

        <section id="register" className="scroll-mt-24 mb-10">
          <SectionHeading
            num={3}
            desc="One line appended to the build config you already have."
          >
            Register the Plugin
          </SectionHeading>
          <p className="text-sm opacity-80 leading-relaxed mb-4">
            Only Web Components and framework-free Vite apps need this
            registration. SSR frameworks use their own package instead, because
            they already emit the bootstrap from the server and never serve{" "}
            <code className="mono text-[0.9em]">index.html</code>.
          </p>
          <FrameworkTabs examples={registrationExamplesWithHtml} />
          <Callout className="mt-3">
            <strong>Import path</strong>{" "}
            <span className="mx-1 opacity-40">|</span>
            The plugin is exported from{" "}
            <code className="mono text-[0.9em]">@themvora/web/vite</code> for
            Web Components and{" "}
            <code className="mono text-[0.9em]">@themvora/core/vite</code> for a
            framework-free app. Neither is the package&apos;s main entry point,
            which keeps the runtime bundle clean.
          </Callout>
          <Link
            href="/examples#starter-apps"
            className="glass-card card-lift p-4 no-underline flex items-center justify-between gap-3 mt-3"
          >
            <div>
              <div className="font-semibold">
                See the complete Web Components example
              </div>
              <div className="text-xs opacity-60">
                <code className="mono">examples/apps/web</code> —
                theme.config.ts, vite.config.ts, the plugin, and the provider
                with no theme attributes. A real source tree, read from the
                repository.
              </div>
            </div>
            <span style={{ color: "var(--theme-color-primary)" }}>→</span>
          </Link>
        </section>


        <section id="why" className="scroll-mt-24 mb-10">
          <SectionHeading
            num={4}
            desc="Providers are already flash-proof; the plugin covers the pre-bundle frame."
          >
            Why a Vite Plugin?
          </SectionHeading>
          <Callout variant="neutral">
            <p className="text-sm leading-relaxed">
              Web Components and framework-free Vite apps serve{" "}
              <code className="mono text-[0.9em]">index.html</code>, so the
              plugin can inject the pre-paint CSS and blocking script before the
              bundle loads.{" "}
              <code className="mono text-[0.9em]">&lt;themvora-provider&gt;</code>{" "}
              upgrades with the module, so without the plugin a saved selection
              is applied after the first visible frame. The generated stylesheet
              is also what themes the page when JavaScript is disabled or slow.
            </p>
            <p className="mt-2 text-sm leading-relaxed">
              SSR frameworks are different: Next.js, Nuxt, Astro, Remix and React
              Router never serve{" "}
              <code className="mono text-[0.9em]">index.html</code> and already
              emit their own bootstrap from the server. Use their package
              instead.
            </p>
          </Callout>
          <ul className="mt-4 text-sm opacity-80 leading-relaxed list-disc pl-5 space-y-1.5">
            <li>
              <strong>No runtime overhead</strong> — the script is injected at
              build time and does not ship as a separate chunk. It runs once
              and is never re-evaluated.
            </li>
            <li>
              <strong>Tree-shakeable</strong> — only the theme definitions you
              pass in are included in the bootstrap output. No unused code
              reaches the client.
            </li>
          </ul>
          <div className="grid gap-3 sm:grid-cols-2 mt-4">
            <div className="rounded-lg border border-border bg-muted/10 px-3.5 py-3">
              <div className="text-xs font-semibold uppercase tracking-wider opacity-50 mb-2">
                Without the plugin
              </div>
              <ol className="text-xs opacity-70 leading-relaxed list-decimal pl-4 space-y-1">
                <li>The browser paints the default theme.</li>
                <li>The bundle loads and the app hydrates.</li>
                <li>The runtime reads the persisted selection and swaps.</li>
                <li>The visitor saw the wrong theme for that whole gap.</li>
              </ol>
            </div>
            <div className="rounded-lg border border-border bg-muted/10 px-3.5 py-3">
              <div className="text-xs font-semibold uppercase tracking-wider opacity-50 mb-2">
                With the plugin
              </div>
              <ol className="text-xs opacity-70 leading-relaxed list-decimal pl-4 space-y-1">
                <li>Generated CSS is injected first and is render-blocking.</li>
                <li>The configuration global follows it.</li>
                <li>A classic script restores the saved selection synchronously.</li>
                <li>The first paint is already the right theme.</li>
              </ol>
            </div>
          </div>
        </section>

        <section id="what-it-does" className="scroll-mt-24 mb-10">
          <SectionHeading
            num={5}
            desc="The plugin reads theme.config.ts and produces an inline script that sets the correct theme before paint. It is not a second runtime."
          >
            What It Does
          </SectionHeading>
          <p className="text-sm opacity-80 leading-relaxed mb-3">
            The plugin flattens your themes into CSS-variable tables twice: once
            as a render-blocking <code className="mono text-[0.9em]">&lt;style&gt;</code>{" "}
            carrying the fallback and every declared theme, and once inside a
            self-contained classic script that restores the persisted selection.
            Both are injected head-prepend, in that order, with{" "}
            <code className="mono text-[0.9em]">enforce: &quot;pre&quot;</code>.
            It also validates the provider&apos;s catalog, default theme and
            initial mode against the plugin config and fails the build when they
            disagree.
            End to end:
          </p>
          <ul className="text-sm opacity-80 leading-relaxed list-disc pl-5 space-y-1.5 mb-3">
            <li>
              Fills in any element marked{" "}
              <code className="mono text-[0.9em]">
                data-tv-readout=&quot;theme&quot; | &quot;label&quot; |
                &quot;mode&quot; | &quot;family&quot; | &quot;var:&lt;name&gt;&quot;
              </code>
              . The script owns that element&apos;s text and watches for readouts
              that appear later so a prerendered label is corrected before paint.
            </li>
            <li>
              Reconciles values into elements marked{" "}
              <code className="mono text-[0.9em]">
                data-tv-pressed=&quot;mode&quot; | &quot;family&quot;
              </code>{" "}
              (as <code className="mono text-[0.9em]">aria-pressed</code>) and
              any{" "}
              <code className="mono text-[0.9em]">data-tv-select</code>{" "}
              <code className="mono text-[0.9em]">&lt;select&gt;</code>.
            </li>
          </ul>
          <ol className="flex flex-col gap-2">
            {pipelineSteps.map((step, i) => (
              <li key={step.label} className="flex gap-3 items-start">
                <span
                  aria-hidden
                  className="w-6 h-6 shrink-0 rounded-full grid place-items-center text-[11px] font-bold bg-muted text-foreground/50 mt-0.5"
                >
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <code className="mono text-[0.9em] font-semibold">
                      {step.label}
                    </code>
                    {step.internal ? (
                      <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded border border-border opacity-55">
                        internal
                      </span>
                    ) : null}
                  </div>
                  <div className="text-xs opacity-60 leading-relaxed mt-0.5">
                    {step.detail}
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section id="options" className="scroll-mt-24 mb-10">
          <SectionHeading
            num={6}
            desc="Full control over which themes are bundled, the default selection, and the storage key."
          >
            Options
          </SectionHeading>
          <CodeExample
            code={optionsSnippet.code}
            lang="ts"
            filename={optionsSnippet.title}
            className="m-0"
          />
          <div className="mt-3 rounded-xl border border-border overflow-hidden">
            <div className="px-4 py-2 border-b border-border bg-muted/40 text-xs font-semibold uppercase tracking-wider opacity-50">
              Options reference
            </div>
            <div className="divide-y divide-border text-sm">
              {[
                ["config", "ThemvoraConfig | string", "Optional. Normally omitted: the plugin discovers theme.config.ts at the project root. Pass a path when the file lives elsewhere, or the config object itself. The object wins outright, and the deprecated inline theme options are ignored when it is present."],
                ["css", "boolean", "Emits the render-blocking theme stylesheet (fallback + system pair + one rule per declared theme). Defaults to true. Disabling it leaves only the script's inline variables, so a no-JavaScript visitor sees an unthemed document."],
                ["boot", "boolean", "Emits the classic blocking boot script that restores the persisted selection. Defaults to true. Disabling it keeps the CSS fallback but cannot restore a saved non-default theme before first paint."],
                ["scrollbar", "boolean | PrePaintScrollbarOptions", "Injects the pre-paint scrollbar script so the native bar is hidden from the first frame. Defaults to false."],
                ["syncFirstRender", "boolean", "Commits React's first render synchronously, so the first painted frame is the app rather than an empty root. Defaults to true; ignored when React is absent."],
                ["ssrEntry", "string | null", "Module exporting `render(): string`. Prerenders #root in the dev server, where unbundled modules would otherwise leave it empty for seconds. Defaults to \"/src/entry-server.tsx\"; pass null to opt out. Builds prerender separately."],
                ["ssrContainer", "string", "id of the element ssrEntry's markup is injected into. Defaults to \"root\"."],
              ].map(([name, type, desc]) => (
                <div key={name} className="px-4 py-3 grid grid-cols-[120px_1fr] sm:grid-cols-[140px_160px_1fr] gap-2 items-baseline">
                  <code className="mono text-[0.85em] font-semibold">{name}</code>
                  <code className="mono text-[0.8em] opacity-50 hidden sm:block">{type}</code>
                  <span className="text-xs opacity-60 sm:col-span-1">{desc}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="first-render" className="scroll-mt-24 mb-10">
          <SectionHeading
            num={7}
            desc="React schedules its first commit; one frame with an empty root can be painted first. The plugin commits it synchronously for you."
          >
            The first render
          </SectionHeading>
          <p className="text-sm opacity-80 leading-relaxed mb-3">
            React&apos;s concurrent scheduling means the first render is
            synchronous. The plugin&apos;s bootstrap covers the gap between the
            HTML and the first commit. See the React docs for details.
          </p>
        </section>

        <section id="troubleshooting" className="scroll-mt-24 mb-10">
          <SectionHeading
            num={8}
            desc="The failures this architecture actually produces — and what each one means."
          >
            Troubleshooting
          </SectionHeading>
          <div className="flex flex-col gap-3">
            {configTroubleshooting.map((item) => (
              <div
                key={item.symptom}
                className="rounded-lg border border-border bg-muted/20 px-3.5 py-3"
              >
                <div className="text-sm font-semibold mb-1">
                  &ldquo;{item.symptom}&rdquo;
                </div>
                <p className="text-sm opacity-70 leading-relaxed">{item.fix}</p>
              </div>
            ))}
          </div>
          <p className="text-sm opacity-80 leading-relaxed mt-4 mb-3">
            Two warnings mean discovery returned{" "}
            <code className="mono text-[0.9em]">null</code> — the bootstrap
            silently fell back to built-in themes rather than failing the build:
          </p>
          <CodeExample
            code={discoveryWarnings}
            lang="bash"
            filename="what a failed discovery looks like"
            className="m-0"
          />
          <p className="text-sm opacity-80 leading-relaxed mt-3">
            The first means Vite could not be resolved — declare{" "}
            <code className="mono text-[0.9em]">vite</code> as a dependency, or
            pass the config object directly. The second means the file was found
            but Vite rejected its shape; discovery reads the default export.
          </p>
        </section>

        <NextSteps
          steps={[
            {
              title: "Understand zero-flash",
              description: "Learn how the bootstrap script prevents theme flashing",
              href: "/zero-flash",
            },
            {
              title: "Configure persistence",
              description: "Storage key, cookie sync, and SSR considerations",
              href: "/persistence",
            },
          ]}
        />

        <RelatedLinks
          links={[
            {
              title: "Zero Flash",
              description: "The complete story on flash-free theme loading",
              href: "/zero-flash",
            },
            {
              title: "Persistence",
              description: "Storage keys, cookies, and SSR considerations",
              href: "/persistence",
            },
            {
              title: "Custom Scrollbar",
              description: "Coordinate scrollbar hiding with the plugin",
              href: "/custom-scrollbar",
            },
          ]}
        />
      </div>
    </DocsLayout>
  );
}
