import Link from "next/link";

import { highlightCode } from "../../lib/highlight";
import { CodeBlock } from "../code-block";
import { compatibilityBadge } from "../../lib/code-variants";
import { InstallCommand } from "../ui/install-command";

/**
 * The closing quick start.
 *
 * Three moves with no framework-specific wiring: install the core runtime,
 * create it, then switch the family and mode. The framework guides and their
 * adapters add SSR resolution, the pre-paint script and hooks on top.
 */
const INSTALL = "npm install @themvora/core";

/** In the shape the docs' snippet extractor recognises, so the drift audit sees it. */
const SNIPPETS = [
  {
    lang: "ts",
    title: "lib/theme.ts",
    code: `import { createThemeRuntime } from "@themvora/core";

const runtime = createThemeRuntime();

runtime.selection.setFamily("mint"); // swap the palette (mint-light / mint-dark)
runtime.selection.setMode("system"); // swap light/dark`,
  },
  {
    lang: "css",
    title: "/styles.css",
    code: `html, body {
  background: var(--theme-color-background);
  color: var(--theme-color-foreground);
}`,
  },
];

const highlightedSnippets = SNIPPETS.map(({ code, lang }) =>
  highlightCode(code, lang),
);

export function GetStarted() {
  return (
    <section className="relative overflow-hidden border-t border-border">
      <div className="hero-bg" aria-hidden />
      <div className="hero-aurora" aria-hidden />
      <div className="hero-orb hero-orb-1" aria-hidden />
      <div className="hero-orb hero-orb-2" aria-hidden />
      <div className="hero-vignette" aria-hidden />

      <div className="relative mx-auto max-w-6xl px-6 py-20">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)] lg:items-start">
          <div className="min-w-0">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-3">
              Start in four lines
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-6">
              Install the core runtime, create it, and the theme is live. Switch
              families and modes from the same selection API; adapters add SSR,
              persistence and framework hooks on top.
            </p>

            <ol className="mb-6 flex flex-col gap-2.5 text-sm">
              <li className="flex items-start gap-2.5">
                <span className="mono shrink-0 text-[11px] text-muted-foreground">
                  01
                </span>
                <span className="text-foreground">
                  Install the core runtime.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="mono shrink-0 text-[11px] text-muted-foreground">
                  02
                </span>
                <span className="text-foreground">
                  Create it with{" "}
                  <code className="mono text-[0.9em]">
                    createThemeRuntime()
                  </code>
                  .
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="mono shrink-0 text-[11px] text-muted-foreground">
                  03
                </span>
                <span className="text-foreground">
                  Style your app with themvora tokens.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="mono shrink-0 text-[11px] text-muted-foreground">
                  04
                </span>
                <span className="text-foreground">
                  Switch the family and mode with the selection API.
                </span>
              </li>
            </ol>

            <div className="mb-6 max-w-fit">
              <InstallCommand command={INSTALL} />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/framework-guides"
                className="btn btn-primary inline-flex items-center gap-2 no-underline"
              >
                Choose your framework
              </Link>
              <Link
                href="/get-started"
                className="text-sm font-semibold no-underline"
                style={{ color: "var(--docs-accent)" }}
              >
                Full getting-started guide →
              </Link>
            </div>
          </div>

          <div className="min-w-0 overflow-x-clip">
            {SNIPPETS.map((snippet, index) => (
              <CodeBlock
                key={snippet.title}
                className="border border-border rounded-xl"
                html={highlightedSnippets[index]}
                code={snippet.code}
                language={snippet.lang}
                filename={snippet.title}
                collapsible={false}
                {...compatibilityBadge(snippet.code, snippet.lang)}
              />
            ))}

            <p className="mt-2 text-xs text-muted-foreground">
              Core runtime shown. Framework adapters add the provider, SSR
              resolution and the pre-paint script around the same selection API.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
