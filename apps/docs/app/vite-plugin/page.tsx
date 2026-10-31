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
    "Connect your theme.config.ts to Vite's HTML pipeline: the plugin discovers the configuration and injects the pre-paint bootstrap into index.html, so you never repeat themes, defaultTheme or initialMode in vite.config.ts.",
};

const antiPatternSnippet = {
  lang: "tsx",
  title: "the duplication this replaces",
  code: `themvoraVitePlugin({
  themes,
  initialMode: "system",
});

<ThemeProvider themes={themes} initialMode="system">
  <App />
</ThemeProvider>`,
};

const declaredOnceSnippet = {
  lang: "tsx",
  title: "declared once, in theme.config.ts",
  code: `themvoraVitePlugin();

<ThemeProvider>
  <App />
</ThemeProvider>`,
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
 * Registration, per Vite-hosted framework.
 *
 * Every entry is the same one line in a different config file — that is the
 * point. The framework's own plugin stays as it was; Themvora's is appended.
 */
const registrationExamples = [
  {
    label: "React",
    lang: "ts",
    filename: "vite.config.ts",
    code: `import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { themvoraVitePlugin } from "@themvora/core/vite";

export default defineConfig({
  plugins: [react(), themvoraVitePlugin()],
});`,
  },
  {
    label: "Vue",
    lang: "ts",
    filename: "vite.config.ts",
    code: `import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { themvoraVitePlugin } from "@themvora/core/vite";

export default defineConfig({
  plugins: [vue(), themvoraVitePlugin()],
});`,
  },
  {
    label: "Svelte",
    lang: "ts",
    filename: "vite.config.ts",
    code: `import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { themvoraVitePlugin } from "@themvora/core/vite";

export default defineConfig({
  plugins: [svelte(), themvoraVitePlugin()],
});`,
  },
  {
    label: "Solid",
    lang: "ts",
    filename: "vite.config.ts",
    code: `import { defineConfig } from "vite";
import solid from "vite-plugin-solid";
import { themvoraVitePlugin } from "@themvora/core/vite";

export default defineConfig({
  plugins: [solid(), themvoraVitePlugin()],
});`,
  },
  {
    label: "Astro",
    lang: "ts",
    filename: "astro.config.ts",
    code: `import { defineConfig } from "astro/config";
import themvora from "@themvora/astro";

export default defineConfig({
  integrations: [themvora()],
});`,
  },
  {
    label: "Nuxt",
    lang: "ts",
    filename: "nuxt.config.ts",
    code: `export default defineNuxtConfig({
  modules: ["@themvora/nuxt"],
  themvora: {
    themes,
    defaultTheme: "mint-light",
    initialMode: "system",
  },
});`,
  },
  {
    label: "Vanilla",
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

/**
 * The runtime side, shown as `App.tsx` rather than `main.tsx` so the snippet
 * stands alone — a `main.tsx` that imports `./App` would be a file the page
 * never declares.
 */
const providerSnippet = {
  lang: "tsx",
  title: "src/App.tsx",
  code: `import { ThemeProvider, useTheme } from "@themvora/react";

function Header() {
  const { theme, toggleTheme } = useTheme();
  return <button onClick={toggleTheme}>{theme.name}</button>;
}

export function App() {
  return (
    <ThemeProvider>
      <Header />
    </ThemeProvider>
  );
}`,
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
    label: "ThemeProvider initializes",
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
    fix: "The discovered config is resolved once and memoized for the life of the Vite process, so `vite dev` keeps serving the bootstrap it derived on startup. Restart the dev server. (A production build re-derives it every time.)",
  },
  {
    symptom: "I use more than one Vite config",
    fix: "Each one resolves its own root, so each discovers its own theme.config.ts. Two Vite configs sharing one root share one configuration; a config with an explicit root gets that root's file.",
  },
];

const discoveryWarnings = `[themvora] could not find Vite to load /app/theme.config.ts. Pass \`config\` explicitly, or declare \`vite\` as a dependency.
[themvora] could not load /app/theme.config.ts: config must export or return an object`;

const bootstrapSnippet = {
  lang: "html",
  title: "index.html — the script the plugin injects",
  code: `<!doctype html>
<html lang="en">
  <head>
    <!-- injected by themvoraVitePlugin() -->
    <script id="themvora-bootstrap">
(function () {
  // ... resolves mode from localStorage + prefers-color-scheme,
  //     writes CSS variables and data-theme attributes to <html>
})();
    </script>
    <title>My App</title>
  </head>
  <body>…</body>
</html>`,
};

const ssrNextSnippet = {
  lang: "tsx",
  title: "app/layout.tsx — Next.js",
  code: `import type { ReactNode } from "react";
import { ThemeProvider } from "@themvora/next";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider defaultTheme="light">
      {children}
    </ThemeProvider>
  );
}`,
};

const ssrNuxtSnippet = {
  lang: "ts",
  title: "nuxt.config.ts — Nuxt",
  code: `export default defineNuxtConfig({
  modules: ["@themvora/nuxt"],
  themvora: {
    defaultTheme: "light",
    initialMode: "system",
  },
});`,
};

const ssrRemixSnippet = {
  lang: "tsx",
  title: "app/root.tsx — Remix",
  code: `import type { ReactNode } from "react";
import { ThemeHead, ThemeProvider } from "@themvora/remix";

export function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <ThemeHead mode="system" />
      </head>
      <body>
        <ThemeProvider defaultTheme="light" initialMode="system">
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}`,
};

export default function VitePluginPage() {
  return (
    <DocsLayout>
      <div className="max-w-3xl">
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
              value: "A Vite-based application (React, Vue, Svelte, or vanilla)",
              href: "https://vitejs.dev/guide/",
            },
            {
              label: "Themvora provider installed",
              value: "@themvora/react, vue, svelte, or core/vanilla",
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
          <CodeExample
            code={providerSnippet.code}
            lang="tsx"
            filename={providerSnippet.title}
            className="m-0"
          />
          <p className="text-sm opacity-80 leading-relaxed mt-3 mb-3">
            Declaring the same values twice is the bug this architecture removes:
          </p>
          <CodeExample
            code={antiPatternSnippet.code}
            lang="tsx"
            filename={antiPatternSnippet.title}
            className="m-0"
          />
          <p className="text-sm opacity-80 leading-relaxed mt-3 mb-3">
            Read the configuration from one place instead:
          </p>
          <CodeExample
            code={declaredOnceSnippet.code}
            lang="tsx"
            filename={declaredOnceSnippet.title}
            className="m-0"
          />
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
            Your framework&apos;s own plugin is untouched — Themvora&apos;s is
            appended. Astro and Nuxt register their own integration instead;
            both discover the same{" "}
            <code className="mono text-[0.9em]">theme.config.ts</code>.
          </p>
          <FrameworkTabs examples={registrationExamplesWithHtml} />
          <Callout className="mt-3">
            <strong>Import path</strong>{" "}
            <span className="mx-1 opacity-40">|</span>
            The plugin is exported from{" "}
            <code className="mono text-[0.9em]">@themvora/core/vite</code>,
            not the main entry point. This keeps the core bundle clean when you
            only need the runtime.
          </Callout>
          <Link
            href="/examples#starter-apps"
            className="glass-card card-lift p-4 no-underline flex items-center justify-between gap-3 mt-3"
          >
            <div>
              <div className="font-semibold">
                See the complete Vite + React example
              </div>
              <div className="text-xs opacity-60">
                <code className="mono">examples/apps/react</code> —
                theme.config.ts,
                vite.config.ts, the provider with no props, and the dev
                prerender. A real source tree, read from the repository.
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
          <Callout variant="neutral" title="Do you still need this?">
            <p className="text-sm leading-relaxed">
              Since <code className="mono text-[0.9em]">@themvora/react</code>{" "}
              (and Vue, Svelte, Solid) <strong>1.2.0</strong>, the providers are
              flash-proof out of the box — they inject the blocking bootstrap
              themselves before first paint. The vite plugin is only needed if
              you want the theme applied on the absolute first frame{" "}
              <em>before the bundle loads</em> (relevant for slow bundles or
              network-sensitive previews).
            </p>
          </Callout>
          <ul className="text-sm opacity-80 leading-relaxed list-disc pl-5 space-y-1.5">
            <li>
              <strong>No runtime overhead</strong> — the script is injected at
              build time and does not ship as a separate chunk. It runs once
              and is never re-evaluated.
            </li>
            <li>
              <strong>SSR-compatible</strong> — the SSR framework packages
              (Next.js, Nuxt, Remix) emit this same bootstrap into the
              server-rendered HTML, so the client script and the server markup
              agree instead of fighting over the first frame.
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
                <li>The script is injected at the top of the head at build time.</li>
                <li>It runs synchronously, before anything is painted.</li>
                <li>It writes the theme and its variables onto the root element.</li>
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
            The plugin flattens your themes into CSS-variable tables, generates
            a self-contained IIFE that resolves the theme before any other
            script runs, and injects it head-prepend with{" "}
            <code className="mono text-[0.9em]">enforce: &quot;pre&quot;</code>.
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
          <Callout variant="neutral" className="mt-3">
            <p className="text-sm leading-relaxed">
              The two steps marked internal are shared implementation detail, not
              API — they are absent from the public export surface. The public
              entry point for the same pipeline is{" "}
              <code className="mono text-[0.9em]">
                createThemeBootstrapScript
              </code>
              , for an app that manages its own{" "}
              <code className="mono text-[0.9em]">&lt;head&gt;</code>.
            </p>
          </Callout>
          <Callout variant="neutral" title="Why doesn't the plugin read my provider's props?">
            <p className="text-sm leading-relaxed">
              Vite runs in the build/dev pipeline; provider props are runtime
              application state. The plugin does not inspect React/Vue/Solid
              components to discover configuration — both the plugin and the
              provider read the same project-level{" "}
              <code className="mono text-[0.9em]">theme.config.ts</code> instead.
              Nothing is parsed, so nothing can be missed by a dynamic prop
              expression.
            </p>
          </Callout>
          <p className="text-sm opacity-80 leading-relaxed mt-4 mb-3">
            What ends up in the served HTML:
          </p>
          <CodeExample
            code={bootstrapSnippet.code}
            lang="html"
            filename={bootstrapSnippet.title}
            className="m-0 mt-3"
          />
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

        <section id="ssr" className="scroll-mt-24 mb-10">
          <SectionHeading
            num={8}
            desc="SSR frameworks don't serve index.html — use their own package, which emits the same bootstrap from the server."
          >
            SSR Integration
          </SectionHeading>
          <p className="text-sm opacity-80 leading-relaxed mb-3">
            The Vite plugin only transforms{" "}
            <code className="mono text-[0.9em]">index.html</code>, which SSR
            frameworks never serve. Use their own package, which emits the same
            bootstrap into the server response.
          </p>
          <div className="space-y-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider opacity-50 mb-2">
                Next.js
              </div>
              <CodeExample
                code={ssrNextSnippet.code}
                lang="ts"
                filename={ssrNextSnippet.title}
                className="m-0"
              />
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider opacity-50 mb-2">
                Nuxt
              </div>
              <CodeExample
                code={ssrNuxtSnippet.code}
                lang="ts"
                filename={ssrNuxtSnippet.title}
                className="m-0"
              />
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider opacity-50 mb-2">
                Remix
              </div>
              <CodeExample
                code={ssrRemixSnippet.code}
                lang="tsx"
                filename={ssrRemixSnippet.title}
                className="m-0"
              />
            </div>
          </div>
          <Callout className="mt-3">
            <strong>Hydration safety</strong>{" "}
            <span className="mx-1 opacity-40">|</span>
            The framework package renders every attribute the pre-paint script
            writes —{" "}
            <code className="mono text-[0.9em]">data-theme</code>,{" "}
            <code className="mono text-[0.9em]">data-theme-mode</code>,{" "}
            <code className="mono text-[0.9em]">data-theme-family</code>,{" "}
            <code className="mono text-[0.9em]">data-theme-selection-mode</code>,{" "}
            <code className="mono text-[0.9em]">data-theme-selection-family</code>{" "}
            and{" "}
            <code className="mono text-[0.9em]">data-theme-ready</code> — so
            React finds nothing the script added that the server did not already
            declare. Its hooks also return the server&apos;s values for the
            hydration render, then switch to the live ones. If you hand-roll the
            script instead of using the framework package, declaring those
            attributes is yours to do.
          </Callout>
        </section>

        <section id="troubleshooting" className="scroll-mt-24 mb-10">
          <SectionHeading
            num={9}
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
