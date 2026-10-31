import type { Metadata } from "next";
import Link from "next/link";

import { DocsLayout } from "../../components/docs-layout";
import { CodeExample } from "../../components/code-example";
import { PageHeader } from "../../components/ui/page-header";
import { SectionHeading } from "../../components/ui/section-heading";
import { Callout } from "../../components/ui/callout";
import { Prerequisites } from "../../components/ui/prerequisites";
import { RelatedLinks } from "../../components/ui/related-links";
import { docsUrl } from "../../lib/site";

export const metadata: Metadata = {
  alternates: { canonical: docsUrl("/adapters") },
  title: "Adapters",
  description:
    "How Themvora translates themes into Bootstrap, shadcn/ui, daisyUI, Open Props, MUI, Chakra, Ant Design, Mantine and UnoCSS — strategies, plugins, the registry, and how to use them in every framework.",
};

const shadcnHookSnippet = {
  lang: "tsx",
  title: "react — one-line binding",
  code: `import { ThemeProvider, useTheme, useThemeRuntime } from "@themvora/react";
import { useShadcnTheme } from "@themvora/shadcn/react";

function App() {
  const runtime = useThemeRuntime();
  useShadcnTheme(runtime);          // one line — the adapter runs itself
  const { mode, toggleTheme } = useTheme();
  return (
    <button onClick={toggleTheme}>{mode}</button>
    // …your shadcn/ui components
  );
}`,
};

const cssVarsSnippet = {
  lang: "ts",
  title: "css-variable adapter — factory",
  code: `import { createShadcnAdapter } from "@themvora/shadcn/factory";
import { createBootstrapAdapter } from "@themvora/bootstrap/factory";
import { createDaisyAdapter } from "@themvora/daisyui/factory";
import { createOpenPropsAdapter } from "@themvora/open-props/factory";

const handle = runtime.adapters.use(createShadcnAdapter());`,
};

const tailwindV4Snippet = {
  lang: "css",
  title: "tailwind.config.ts",
  code: `import { defineConfig } from "tailwindcss";
import { createTailwindPlugin } from "@themvora/tailwind";

export default defineConfig({
  plugins: [createTailwindPlugin()],
});`,
};

const shadcnAdapterSnippet = {
  lang: "ts",
  title: "manual registration",
  code: `import { createThemeRuntime } from "@themvora/core";
import { createShadcnAdapter } from "@themvora/shadcn/factory";

const runtime = createThemeRuntime({ defaultTheme: "light" });
const handle = runtime.adapters.use(createShadcnAdapter());

// switch themes at runtime — variables update automatically
runtime.selection.setMode("dark");

// cleanup when done
handle.dispose();`,
};

const antdAdapterSnippet = {
  lang: "tsx",
  title: "antd adapter — provider",
  code: `import { ThemeProvider, useThemeRuntime } from "@themvora/react";
import { useAntdTheme } from "@themvora/antd";

function AntdZone() {
  const runtime = useThemeRuntime();
  useAntdTheme(runtime);
  return <YourAntdApp />;
}

export function App() {
  return (
    <ThemeProvider>
      <AntdZone />
    </ThemeProvider>
  );
}`,
};

const unocssPresetSnippet = {
  lang: "ts",
  title: "uno.config.ts",
  code: `import { defineConfig, presetWind3 } from "unocss";
import { presetThemvora } from "@themvora/unocss";

export default defineConfig({
  presets: [presetWind3(), presetThemvora()],
});`,
};

const unocssStaticSnippet = {
  lang: "ts",
  title: "build-time static output",
  code: `import { createUnoTheme } from "@themvora/unocss";
import { getBuiltInThemes, resolveInitialTheme } from "@themvora/core";

// resolveInitialTheme takes the registry explicitly; the built-in set is a
// valid registry, so no theme file is needed.
const themes = getBuiltInThemes();

const { theme } = resolveInitialTheme({
  themes,
  family: "berry",
  mode: "light",
});

const staticTheme = createUnoTheme(theme);`,
};

const strategySnippet = {
  lang: "ts",
  title: "strategy.ts",
  code: `import { createThemeRuntime } from "@themvora/core";
import { createBootstrapAdapter } from "@themvora/bootstrap/factory";

const runtime = createThemeRuntime({ defaultTheme: "light" });

// "native" (the default) behaves like the library and derives the semantic
// concepts it expects. "aggressive" also adjusts spacing, typography,
// elevation, saturation and contrast.
runtime.adapters.use(createBootstrapAdapter({ strategy: "aggressive" }));`,
};

const strategyWrapperSnippet = {
  lang: "tsx",
  title: "strategy-wrapper.tsx",
  code: `import { useThemeRuntime } from "@themvora/react";
import { useShadcnTheme } from "@themvora/shadcn/react";

export function InstallAdapter() {
  const runtime = useThemeRuntime();
  // The framework wrappers forward the strategy to the factory they create.
  useShadcnTheme(runtime, { strategy: "exact" });
  return null;
}`,
};

const pluginsSnippet = {
  lang: "ts",
  title: "adapter-plugin.ts",
  code: `import { createThemeRuntime } from "@themvora/core";
import { createShadcnAdapter } from "@themvora/shadcn/factory";

const runtime = createThemeRuntime({ defaultTheme: "light" });

runtime.adapters.use(
  createShadcnAdapter({
    strategy: "aggressive",
    plugins: [
      {
        id: "rounded",
        // Receives the generated library variables, returns the final set.
        transform(variables) {
          return { ...variables, "--radius-md": "0.75rem" };
        },
      },
    ],
  }),
);`,
};

const lifecycleSnippet = {
  lang: "ts",
  title: "two-adapters.ts",
  code: `import { createThemeRuntime } from "@themvora/core";
import { createBootstrapAdapter } from "@themvora/bootstrap/factory";
import { createDaisyAdapter } from "@themvora/daisyui/factory";

const runtime = createThemeRuntime({ defaultTheme: "light" });

const bootstrap = runtime.adapters.use(createBootstrapAdapter());
const daisy = runtime.adapters.use(createDaisyAdapter());

bootstrap.dispose(); // bootstrap uninstalled; daisy stays installed
runtime.destroy();   // tears daisy down too — daisy.dispose() is now a safe no-op`,
};

const refcountSnippet = {
  lang: "ts",
  title: "refcount-and-replacement.ts",
  code: `import { createThemeRuntime } from "@themvora/core";
import { createShadcnAdapter } from "@themvora/shadcn/factory";

const runtime = createThemeRuntime({ defaultTheme: "light" });

// Same instance twice: installed once, reference count 2.
const adapter = createShadcnAdapter();
const h1 = runtime.adapters.use(adapter);
const h2 = runtime.adapters.use(adapter);
h1.dispose(); // 2 → 1 — still installed
h2.dispose(); // 1 → 0 — uninstall() runs exactly once

// A different instance under the same id replaces the previous one.
const first = runtime.adapters.use(createShadcnAdapter({ strategy: "exact" }));
const second = runtime.adapters.use(createShadcnAdapter({ strategy: "aggressive" }));
first.dispose();  // stale handle — safe no-op
second.dispose(); // uninstalls the aggressive adapter`,
};

const customAdapterSnippet = {
  lang: "ts",
  title: "my-lib-adapter.ts",
  code: `import type { ThemeAdapter } from "@themvora/core";
import type { AdapterSource } from "@themvora/adapters";
import { readColor, resolveAdapterSource } from "@themvora/adapters";

/**
 * A framework-neutral adapter: no framework import, one factory, and the
 * install/uninstall contract the registry expects.
 */
export function createMyLibAdapter(): ThemeAdapter {
  let unsubscribe: (() => void) | null = null;

  function write(source: AdapterSource) {
    // Accepts a runtime, a store, a theme or raw tokens — whatever the caller
    // has — and normalises it to already-resolved tokens.
    const theme = resolveAdapterSource(source);
    const surface = readColor(theme, "background", "#ffffff");
    document.documentElement.style.setProperty("--my-lib-surface", surface ?? "#ffffff");
  }

  return {
    id: "my-lib",
    supports: () => true,
    install(runtime) {
      write(runtime);                                                 // first paint
      unsubscribe = runtime.store.subscribe((theme) => write(theme));  // keep it live
    },
    uninstall() {
      unsubscribe?.();
      unsubscribe = null;
      document.documentElement.style.removeProperty("--my-lib-surface");
    },
  };
}`,
};

const injectCssSnippet = {
  lang: "ts",
  title: "manual-stylesheet.ts",
  code: `import { createThemeRuntime } from "@themvora/core";
import { createBootstrapAdapter } from "@themvora/bootstrap/factory";

// Import the compatibility stylesheet yourself…
import "@themvora/bootstrap/bootstrap.css";

const runtime = createThemeRuntime({ defaultTheme: "light" });

// …then disable auto-injection so it is not injected a second time.
runtime.adapters.use(createBootstrapAdapter({ injectCSS: false }));`,
};

export default function AdaptersPage() {
  return (
    <DocsLayout>
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
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
            </svg>
          }
          title="Adapters"
          subtitle="@themvora/core — the translation layer"
          description={
            <>
              An adapter translates a Themvora <code>ThemeDefinition</code>{" "}
              into whatever a specific UI library needs. Core knows nothing
              about Bootstrap, MUI, shadcn/ui, Ant Design or UnoCSS — it only
              knows themes, tokens and runtimes. Adapters bridge the gap.
            </>
          }
        />

        <Prerequisites
          items={[
            {
              label: "Core Package",
              value: "@themvora/core",
              href: "/packages/core",
            },
            {
              label: "Runtime",
              value: "Active ThemeRuntime instance",
              href: "/quick-start",
            },
            {
              label: "UI Library",
              value: "Bootstrap, shadcn/ui, daisyUI, MUI, Ant Design, or other supported library",
            },
          ]}
          className="mb-8"
        />

        <Callout title="Key idea">
          Adapters are <strong>framework-agnostic</strong>. The{" "}
          <code>createXxxAdapter</code> factories run in plain TypeScript with
          zero framework imports. Each framework package wraps the same
          factories with its own composable, hook or injectable, so the exact
          same adapter works in React, Vue, Svelte, Solid, Angular, Next, Nuxt,
          Remix and Astro.
        </Callout>

        <div className="mt-6 overflow-hidden rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-2.5 text-left font-semibold text-xs uppercase tracking-wider">Kind</th>
                <th className="px-4 py-2.5 text-left font-semibold text-xs uppercase tracking-wider">What it does</th>
                <th className="px-4 py-2.5 text-left font-semibold text-xs uppercase tracking-wider">Libraries</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-border align-top">
                <td className="px-4 py-3 font-semibold">CSS-variable</td>
                <td className="px-4 py-3 text-sm opacity-70 leading-relaxed">
                  Maintains a live <code className="mono text-[0.85em]">&lt;style&gt;</code>{" "}
                  element holding the library&apos;s own custom properties
                  (<code className="mono text-[0.85em]">--bs-*</code>,{" "}
                  <code className="mono text-[0.85em]">--background</code>,{" "}
                  <code className="mono text-[0.85em]">--color-base-*</code>). The
                  library&apos;s stylesheet consumes them, so components restyle
                  the instant the theme changes.
                </td>
                <td className="px-4 py-3 mono text-xs opacity-70 leading-relaxed">
                  Bootstrap, shadcn/ui, daisyUI, Open Props
                </td>
              </tr>
              <tr className="border-b border-border align-top">
                <td className="px-4 py-3 font-semibold">Generated-theme</td>
                <td className="px-4 py-3 text-sm opacity-70 leading-relaxed">
                  Builds the library&apos;s <em>native</em> theme object and hands
                  it to that library&apos;s own provider. The object is rebuilt on
                  every theme change.
                </td>
                <td className="px-4 py-3 mono text-xs opacity-70 leading-relaxed">
                  MUI, Chakra UI, Ant Design, Mantine
                </td>
              </tr>
              <tr className="align-top">
                <td className="px-4 py-3 font-semibold">Build-time</td>
                <td className="px-4 py-3 text-sm opacity-70 leading-relaxed">
                  Exposes tokens as utilities at build time; the utilities
                  reference the live{" "}
                  <code className="mono text-[0.85em]">--theme-*</code> variables,
                  so they follow the active theme at runtime.
                </td>
                <td className="px-4 py-3 mono text-xs opacity-70 leading-relaxed">UnoCSS</td>
              </tr>
            </tbody>
          </table>
        </div>

        <section id="css-variables" className="scroll-mt-24 mb-10 mt-10">
          <SectionHeading
            num={1}
            desc="Class / utility-first CSS libraries (Bootstrap, shadcn/ui, daisyUI, Open Props) use CSS-variable adapters. They inject a live <style> element that exposes the library's own custom properties — components restyle the instant the theme changes."
          >
            CSS Variables (default, automatic)
          </SectionHeading>
          <p className="text-sm opacity-80 leading-relaxed mb-3">
            Every CSS-variable adapter follows the same shape: a{" "}
            <code className="mono text-[0.9em]">factory</code> entry for
            framework-neutral use, framework wrapper subpaths ({" "}
            <code className="mono text-[0.9em]">/react</code>,{" "}
            <code className="mono text-[0.9em]">/vue</code>,{" "}
            <code className="mono text-[0.9em]">/svelte</code>,{" "}
            <code className="mono text-[0.9em]">/solid</code>,{" "}
            <code className="mono text-[0.9em]">/angular</code>) that take an
            explicit runtime, and a CSS injector. By default
            <code className="mono text-[0.9em]"> injectCSS: true</code> — the
            compatibility stylesheet is injected automatically at install time.
          </p>
          <CodeExample
            code={cssVarsSnippet.code}
            lang={cssVarsSnippet.lang}
            filename={cssVarsSnippet.title}
            className="rounded-lg m-0"
          />
          <div className="mt-3 text-sm opacity-70 leading-relaxed">
            <p>
              The <code className="mono text-[0.9em]">factory</code> subpath
              imports adapters <strong>without React</strong>. The adapter
              packages own their own framework wrappers behind subpaths, so a
              Vue app imports from{" "}
              <code className="mono text-[0.9em]">@themvora/shadcn/vue</code>{" "}
              — no React dependency is pulled in.
            </p>
          </div>

          <div className="mt-5">
            <h3 className="text-xs font-semibold uppercase tracking-widest opacity-50 mb-3">
              Bringing your own stylesheet
            </h3>
            <p className="text-sm opacity-70 leading-relaxed mb-3">
              Auto-injection is idempotent and SSR-safe, so the default is
              usually what you want. If you already import the library&apos;s
              official CSS — or ship it through your bundler — set{" "}
              <code className="mono text-xs">injectCSS: false</code> to avoid a
              second copy. <code className="mono text-xs">injectCSS</code> is a{" "}
              <strong className="opacity-100">factory</strong> option: the
              framework wrappers always inject, and only take{" "}
              <code className="mono text-xs">{"{ strategy }"}</code>.
            </p>
            <CodeExample
              code={injectCssSnippet.code}
              lang={injectCssSnippet.lang}
              filename={injectCssSnippet.title}
              className="rounded-lg m-0"
            />
            <p className="mt-3 text-xs opacity-60 leading-relaxed">
              The path is{" "}
              <code className="mono text-[0.9em]">@themvora/&lt;library&gt;/&lt;library&gt;.css</code>{" "}
              — <code className="mono text-[0.9em]">shadcn/shadcn.css</code>,{" "}
              <code className="mono text-[0.9em]">daisyui/daisyui.css</code>,{" "}
              <code className="mono text-[0.9em]">open-props/open-props.css</code>
              . The variable style element (the <code className="mono text-[0.9em]">--*</code>{" "}
              values for the current theme) is always managed by the adapter;
              this option only toggles the static compatibility stylesheet.
            </p>
          </div>
        </section>

        <section id="tailwind" className="scroll-mt-24 mb-10">
          <SectionHeading
            num={2}
            desc="Tailwind CSS v4 and UnoCSS are handled through build-time presets that expose Themvora tokens as utility classes referencing live --theme-* variables."
          >
            Tailwind CSS v4
          </SectionHeading>
          <p className="text-sm opacity-80 leading-relaxed mb-3">
            The <code className="mono text-[0.9em]">@themvora/tailwind</code>{" "}
            plugin maps resolved tokens to{" "}
            <code className="mono text-[0.9em]">--color-*</code>,{" "}
            <code className="mono text-[0.9em]">--radius-*</code>,{" "}
            <code className="mono text-[0.9em]">--spacing-*</code>,{" "}
            <code className="mono text-[0.9em]">--font-*</code> and{" "}
            <code className="mono text-[0.9em]">--shadow-*</code> utilities
            that update at runtime.
          </p>
          <CodeExample
            code={tailwindV4Snippet.code}
            lang={tailwindV4Snippet.lang}
            filename={tailwindV4Snippet.title}
            className="rounded-lg m-0"
          />
          <p className="mt-3 text-sm opacity-70 leading-relaxed">
            With this plugin, classes like{" "}
            <code className="mono text-[0.9em]">bg-primary</code>,{" "}
            <code className="mono text-[0.9em]">text-foreground</code>,{" "}
            <code className="mono text-[0.9em]">rounded-lg</code> and{" "}
            <code className="mono text-[0.9em]">shadow-md</code> all reference
            the active theme and switch instantly.
          </p>
        </section>

        <section id="shadcn" className="scroll-mt-24 mb-10">
          <SectionHeading
            num={3}
            desc="The shadcn/ui adapter writes CSS custom properties (--background, --foreground, --primary, etc.) that shadcn/ui components consume directly."
          >
            shadcn/ui adapter
          </SectionHeading>
          <p className="text-sm opacity-80 leading-relaxed mb-3">
            Use the React hook for zero-config binding, or register manually
            via the factory for full control over strategy, plugins and CSS
            injection.
          </p>
          <CodeExample
            code={shadcnHookSnippet.code}
            lang={shadcnHookSnippet.lang}
            filename={shadcnHookSnippet.title}
            className="rounded-lg m-0"
          />
          <p className="mt-3 text-sm opacity-70 leading-relaxed mb-3">
            For framework-neutral or non-React use, register the adapter
            manually:
          </p>
          <CodeExample
            code={shadcnAdapterSnippet.code}
            lang={shadcnAdapterSnippet.lang}
            filename={shadcnAdapterSnippet.title}
            className="rounded-lg m-0"
          />
        </section>

        <section id="antd" className="scroll-mt-24 mb-10">
          <SectionHeading
            num={4}
            desc="Generated-theme adapters build a native theme object (MUI Theme, Chakra system, AntD ThemeConfig, Mantine theme) that you hand to that library's own provider."
          >
            Ant Design adapter
          </SectionHeading>
          <p className="text-sm opacity-80 leading-relaxed mb-3">
            The <code className="mono text-[0.9em]">@themvora/antd</code>{" "}
            package provides <code className="mono text-[0.9em]">useAntdTheme</code> and{" "}
            <code className="mono text-[0.9em]">AntdThemeProvider</code>. The
            theme object is rebuilt automatically on every theme change.
          </p>
          <CodeExample
            code={antdAdapterSnippet.code}
            lang={antdAdapterSnippet.lang}
            filename={antdAdapterSnippet.title}
            className="rounded-lg m-0"
          />
          <p className="mt-3 text-sm opacity-70 leading-relaxed">
            The same pattern applies to MUI (
            <code className="mono text-[0.9em]">useMuiTheme</code>), Chakra (
            <code className="mono text-[0.9em]">useChakraTheme</code>) and
            Mantine (
            <code className="mono text-[0.9em]">useMantineTheme</code>) —
            each exposes a hook and provider in the same shape.
          </p>
        </section>

        <section id="unocss" className="scroll-mt-24 mb-10">
          <SectionHeading
            num={5}
            desc="UnoCSS gets a build-time preset that exposes Themvora tokens as utilities referencing live --theme-* variables."
          >
            UnoCSS adapter
          </SectionHeading>
          <p className="text-sm opacity-80 leading-relaxed mb-3">
            Add <code className="mono text-[0.9em]">presetThemvora()</code> to
            your UnoCSS config. Utilities like{" "}
            <code className="mono text-[0.9em]">bg-primary</code>,{" "}
            <code className="mono text-[0.9em]">text-foreground</code>,{" "}
            <code className="mono text-[0.9em]">border-border</code> and{" "}
            <code className="mono text-[0.9em]">font-sans</code> resolve to the
            active theme.
          </p>
          <CodeExample
            code={unocssPresetSnippet.code}
            lang={unocssPresetSnippet.lang}
            filename={unocssPresetSnippet.title}
            className="rounded-lg m-0"
          />
          <p className="mt-3 text-sm opacity-70 leading-relaxed mb-3">
            For build-time static output instead of runtime variables, use{" "}
            <code className="mono text-[0.9em]">createUnoTheme</code>:
          </p>
          <CodeExample
            code={unocssStaticSnippet.code}
            lang={unocssStaticSnippet.lang}
            filename={unocssStaticSnippet.title}
            className="rounded-lg m-0"
          />
        </section>

        <section id="strategies" className="scroll-mt-24 mb-10">
          <SectionHeading
            num={6}
            desc="How faithfully an adapter reproduces the target library's native feel — you trade strictness for how at home the library's components look."
          >
            Strategies
          </SectionHeading>
          <div className="overflow-hidden rounded-xl border border-border mb-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-2.5 text-left font-semibold text-xs uppercase tracking-wider">Strategy</th>
                  <th className="px-4 py-2.5 text-left font-semibold text-xs uppercase tracking-wider">Behavior</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-border align-top">
                  <td className="px-4 py-3"><code className="mono text-[0.85em] font-semibold">exact</code></td>
                  <td className="px-4 py-3 text-sm opacity-70 leading-relaxed">Only map what Themvora defines. Change nothing else.</td>
                </tr>
                <tr className="border-b border-border align-top">
                  <td className="px-4 py-3"><code className="mono text-[0.85em] font-semibold">native</code></td>
                  <td className="px-4 py-3 text-sm opacity-70 leading-relaxed">
                    Behave like the library: derive missing semantic concepts
                    (success / warning / info) and make small feel adjustments.{" "}
                    <strong className="opacity-100">Default.</strong>
                  </td>
                </tr>
                <tr className="align-top">
                  <td className="px-4 py-3"><code className="mono text-[0.85em] font-semibold">aggressive</code></td>
                  <td className="px-4 py-3 text-sm opacity-70 leading-relaxed">Fully emulate the library: also adjust spacing, typography, elevation, saturation and contrast.</td>
                </tr>
              </tbody>
            </table>
          </div>
          <CodeExample
            code={strategySnippet.code}
            lang={strategySnippet.lang}
            filename={strategySnippet.title}
            className="rounded-lg m-0"
          />
          <p className="mt-3 text-sm opacity-70 leading-relaxed mb-3">
            The framework wrappers take the same option as their second
            argument:
          </p>
          <CodeExample
            code={strategyWrapperSnippet.code}
            lang={strategyWrapperSnippet.lang}
            filename={strategyWrapperSnippet.title}
            className="rounded-lg m-0"
          />
        </section>

        <section id="adapter-plugins" className="scroll-mt-24 mb-10">
          <SectionHeading
            num={7}
            desc="Plugins extend any CSS-variable adapter with custom logic — refine the semantic state, or transform the generated variables."
          >
            Adapter plugins
          </SectionHeading>
          <p className="text-sm opacity-80 leading-relaxed mb-3">
            A plugin is an object with two optional hooks.{" "}
            <code className="mono text-[0.9em]">refine</code> receives the
            refined semantic state and may return updates to it;{" "}
            <code className="mono text-[0.9em]">transform</code> receives the
            generated library variables and must return the final set. Both get
            the current <code className="mono text-[0.9em]">strategy</code> and{" "}
            <code className="mono text-[0.9em]">mode</code> as context. Pass them
            through the factory options:
          </p>
          <CodeExample
            code={pluginsSnippet.code}
            lang={pluginsSnippet.lang}
            filename={pluginsSnippet.title}
            className="rounded-lg m-0"
          />
          <Callout className="mt-4" title="Factory-only">
            <p className="text-sm">
              The framework wrappers do not take{" "}
              <code className="mono text-[0.9em]">plugins</code> — they create
              the adapter for you and only forward{" "}
              <code className="mono text-[0.9em]">strategy</code>. To use a
              plugin, build the adapter with the factory and register it through{" "}
              <code className="mono text-[0.9em]">runtime.adapters.use()</code>.
            </p>
          </Callout>
        </section>

        <section id="registry" className="scroll-mt-24 mb-10">
          <SectionHeading
            num={8}
            desc="The runtime owns one registry. Registration is idempotent per instance, reference-counted, and deterministic on cleanup."
          >
            Lifecycle &amp; the registry
          </SectionHeading>
          <p className="text-sm opacity-80 leading-relaxed mb-3">
            <code className="mono text-[0.9em]">runtime.adapters.use()</code>{" "}
            installs an adapter and returns a{" "}
            <code className="mono text-[0.9em]">AdapterRegistration</code> whose{" "}
            <code className="mono text-[0.9em]">dispose()</code> uninstalls it.
            Several adapters can be installed at once — they write different sets
            of variables and do not conflict:
          </p>
          <CodeExample
            code={lifecycleSnippet.code}
            lang={lifecycleSnippet.lang}
            filename={lifecycleSnippet.title}
            className="rounded-lg m-0"
          />
          <p className="mt-4 text-sm opacity-80 leading-relaxed mb-3">
            The guarantees that make this safe to compose — React Strict Mode,
            Svelte lifecycles, nested providers — are per-instance idempotency,
            reference counting, and replacement on identity change:
          </p>
          <CodeExample
            code={refcountSnippet.code}
            lang={refcountSnippet.lang}
            filename={refcountSnippet.title}
            className="rounded-lg m-0"
          />
          <p className="mt-3 text-xs opacity-60 leading-relaxed">
            <code className="mono text-[0.9em]">unuse(id)</code> force-uninstalls
            every registration for an id and is deprecated — hold the handle from{" "}
            <code className="mono text-[0.9em]">use()</code> instead.{" "}
            <code className="mono text-[0.9em]">list()</code> returns the
            installed adapters, and{" "}
            <code className="mono text-[0.9em]">destroy()</code> uninstalls
            everything. The framework bindings all take this same path, so a
            composition API, an effect cleanup,{" "}
            <code className="mono text-[0.9em]">onUnmounted</code>,{" "}
            <code className="mono text-[0.9em]">onDestroy</code>,{" "}
            <code className="mono text-[0.9em]">onCleanup</code> and{" "}
            <code className="mono text-[0.9em]">DestroyRef.onDestroy</code> all
            behave identically.
          </p>
        </section>

        <section id="authoring" className="scroll-mt-24 mb-10">
          <SectionHeading
            num={9}
            desc="Implement the same contract the shipped adapters do, and every framework wrapper works with it."
          >
            Authoring a custom adapter
          </SectionHeading>
          <ol className="flex flex-col gap-2 text-sm opacity-80 leading-relaxed mb-4 list-decimal pl-5">
            <li>
              <strong className="opacity-100">Implement <code className="mono text-[0.9em]">ThemeAdapter</code></strong>{" "}
              — <code className="mono text-[0.9em]">id</code>,{" "}
              <code className="mono text-[0.9em]">supports</code>,{" "}
              <code className="mono text-[0.9em]">install</code>,{" "}
              <code className="mono text-[0.9em]">uninstall</code>. Declare{" "}
              <code className="mono text-[0.9em]">requires</code> /{" "}
              <code className="mono text-[0.9em]">optional</code> to make the
              roles you need a checkable contract instead of a silent empty
              variable.
            </li>
            <li>
              <strong className="opacity-100">Accept any source</strong> — run
              input through{" "}
              <code className="mono text-[0.9em]">resolveAdapterSource</code> from{" "}
              <code className="mono text-[0.9em]">@themvora/adapters</code> so
              your adapter takes a runtime, a store, a theme or raw tokens
              interchangeably, with token references already resolved.
            </li>
            <li>
              <strong className="opacity-100">Subscribe in <code className="mono text-[0.9em]">install</code></strong>{" "}
              so the output follows theme changes, and unsubscribe in{" "}
              <code className="mono text-[0.9em]">uninstall</code>.
            </li>
            <li>
              <strong className="opacity-100">Stay framework-neutral</strong> —
              export a <code className="mono text-[0.9em]">createMyAdapter()</code>{" "}
              factory with zero framework imports, and let each framework package
              wrap it exactly like the CSS-variable adapters do through their{" "}
              <code className="mono text-[0.9em]">factory</code> subpaths.
            </li>
            <li>
              <strong className="opacity-100">Honor the idempotency contract</strong>{" "}
              — <code className="mono text-[0.9em]">install</code> and{" "}
              <code className="mono text-[0.9em]">uninstall</code> must each be
              safe to call exactly once, and{" "}
              <code className="mono text-[0.9em]">uninstall</code> must remove
              everything <code className="mono text-[0.9em]">install</code>{" "}
              created (styles, listeners, DOM).
            </li>
          </ol>
          <CodeExample
            code={customAdapterSnippet.code}
            lang={customAdapterSnippet.lang}
            filename={customAdapterSnippet.title}
            className="rounded-lg m-0"
          />
          <Callout className="mt-4" title="Rule of thumb">
            <ul className="text-sm flex flex-col gap-1.5">
              <li>
                <strong>Class / utility-first CSS libraries</strong> (Bootstrap,
                shadcn/ui, daisyUI, Open Props) → CSS-variable adapters + the{" "}
                <code className="mono text-[0.9em]">factory</code> subpath for
                framework-neutral use.
              </li>
              <li>
                <strong>Component libraries with their own theme system</strong>{" "}
                (MUI, Chakra, AntD, Mantine) → generated-theme adapters and
                providers, React-first.
              </li>
              <li>
                <strong>Atomic-CSS engines</strong> (UnoCSS) → build-time presets
                plus runtime variable references.
              </li>
            </ul>
          </Callout>
        </section>

        <section id="next" className="scroll-mt-24">
          <SectionHeading
            num={10}
            desc="Tokens are the input — adapters consume them. Explore what else Themvora offers."
          >
            What&apos;s next
          </SectionHeading>
          <div className="flex flex-col gap-2">
            <Link
              href="/packages"
              className="glass-card card-lift p-4 no-underline flex items-center justify-between gap-3"
            >
              <div>
                <div className="font-semibold">Packages</div>
                <div className="text-xs opacity-60">
                  Browse every @themvora/* package — core, react, vue, svelte,
                  solid, angular, and every adapter.
                </div>
              </div>
              <span style={{ color: "var(--theme-color-primary)" }}>→</span>
            </Link>
            <Link
              href="/custom-themes"
              className="glass-card card-lift p-4 no-underline flex items-center justify-between gap-3"
            >
              <div>
                <div className="font-semibold">Custom Themes</div>
                <div className="text-xs opacity-60">
                  defineTheme, extendTheme, composeTheme and the generation
                  studio.
                </div>
              </div>
              <span style={{ color: "var(--theme-color-primary)" }}>→</span>
            </Link>
          </div>
        </section>

        <RelatedLinks
          links={[
            {
              title: "Custom Themes",
              href: "/custom-themes",
              description: "Define and compose custom themes",
            },
            {
              title: "Framework Integration",
              href: "/framework-guides",
              description: "Use adapters in React, Vue, Svelte",
            },
            {
              title: "Core Concepts",
              href: "/core-concepts",
              description: "Theme runtime and tokens",
            },
            {
              title: "Adapter API Reference",
              href: "/api-reference/core#adapters",
              description: "Complete adapter API docs",
            },
          ]}
        />
      </div>
    </DocsLayout>
  );
}
