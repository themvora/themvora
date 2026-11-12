import Link from "next/link";

import { CodeBlock } from "../code-block";
import { highlightCode } from "../../lib/highlight";
import { compatibilityBadge } from "../../lib/code-variants";

/**
 * The architecture section — "Define once. Theme your entire application."
 *
 * It sits where the built-in preset gallery used to be, and answers the question
 * the gallery left open: the presets are *examples of a format*, not the
 * product. What the product actually is, is the chain below — a theme
 * definition, the semantic tokens it compiles to, the components that read
 * those tokens, and the framework packages that put all three in front of an
 * application.
 *
 * Every claim here is checkable against the packages: `defineTheme` is exported
 * by `@themvora/core`, the tokens become `--theme-color-*` custom properties
 * (`themeToCSSVariables`), the Tailwind preset maps those to utilities
 * (`@themvora/tailwind`), and `ThemeProvider` is the server component in
 * `@themvora/next`.
 */

/**
 * Two snippets, in the shape the docs' snippet extractor recognises
 * (`{ lang, title, code }`), so the release gate's drift audit and the
 * invented-symbols audit actually cover them instead of skipping the homepage.
 */
const THEME_SNIPPET = {
  lang: "ts",
  title: "theme/theme.config.ts",
  code: `import { defineTheme } from "@themvora/core";

// Minimal (check custom themes for full theme integration)
export const brand = defineTheme({
  name: "brand-light",
  tokens: {
    colors: {
      background: "#ffffff",
      foreground: "#0f172a",
      primary: "#4f46e5",
    },
  },
});`,
};

const LAYOUT_SNIPPET = {
  lang: "tsx",
  title: "app/layout.tsx",
  code: `import { ThemeProvider } from "@themvora/next";
import { brand } from "./theme/theme.config.ts";

export default function RootLayout({ children }) {
  return (
    // ThemeProvider renders <html> and <body> itself — do not wrap it in them.
    // ThemeProvider can be used like <html> tag, for <body>, use body prop.
    <ThemeProvider themes={[brand]} defaultTheme="brand-light">
      <main>{children} {/* <YourApp /> */}</main>
    </ThemeProvider>
  );
}`,
};

const themeHtml = highlightCode(THEME_SNIPPET.code, THEME_SNIPPET.lang);
const layoutHtml = highlightCode(LAYOUT_SNIPPET.code, LAYOUT_SNIPPET.lang);

/**
 * The contract in three columns: the role a theme declares, the custom property
 * the runtime publishes, and the utility a component writes.
 *
 * Every value here is checkable — `themeToCSSVariables` prefixes each colour
 * role with `--theme-color-`, and `@themvora/tailwind` maps the same roles onto
 * `bg-*` / `text-*` / `border-*` utilities.
 */
const TOKEN_PIPELINE = [
  { role: "background", utility: "bg-background" },
  { role: "foreground", utility: "text-foreground" },
  { role: "primary", utility: "bg-primary" },
  { role: "border", utility: "border-border" },
  { role: "muted", utility: "bg-muted" },
];

const STEPS = [
  {
    id: "01",
    title: "Theme definition",
    body: "A name, a mode, and the token values that carry the identity. Built-in, generated, or written by hand — the shape is the same.",
    chips: ["brand-light", "brand-dark"],
    href: "/custom-themes",
  },
  {
    id: "02",
    title: "Semantic tokens",
    body: "Definitions compile to named roles, published as CSS custom properties. Nothing downstream sees a hex value.",
    chips: ["background", "foreground", "border", "primary"],
    href: "/tokens",
  },
  {
    id: "03",
    title: "Application UI",
    body: "The same components render in every theme — no props, no per-theme classes, no conditional styles. Only the variables behind them change.",
    chips: ["<Button />", "<Card />", "<Input />"],
    href: "/core-concepts",
  },
  {
    id: "04",
    title: "Framework integrations",
    body: "Each package wires the same runtime into its framework's own idioms — hooks, composables, signals, services — so the contract travels.",
    chips: ["@themvora/next", "@themvora/vue"],
    href: "/framework-guides",
  },
];

export function Architecture() {
  return (
    <section className="max-w-6xl mx-auto px-6 py-16 border-t border-border">
      <div className="mb-8">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2">
          Define once. Theme your entire application.
        </h2>
        <p className="opacity-70 max-w-2xl">
          Themvora is the layer between a theme definition and the components
          that render it. One definition reaches every surface — because the
          surfaces never named a colour in the first place.
        </p>
      </div>

      {/* The chain. Numbered rather than icon-decorated: the order is the
          information — each step is what the next one consumes. */}
      <ol className="grid gap-3 grid-cols-2 lg:grid-cols-4 lg:gap-5">
        {STEPS.map((step, i) => (
          <li key={step.id} className="relative">
            <Link
              href={step.href}
              className="flex h-full flex-col gap-2.5 rounded-xl border border-border bg-card p-4 no-underline card-lift"
            >
              <div className="flex items-center justify-between">
                <span className="mono text-[11px] font-semibold opacity-40">
                  {step.id}
                </span>
                <span className="text-[11px] opacity-40" aria-hidden>
                  →
                </span>
              </div>
              <h3 className="text-sm font-semibold leading-tight">
                {step.title}
              </h3>
              <p className="flex-1 text-xs leading-relaxed opacity-65">
                {step.body}
              </p>
              <div className="flex flex-wrap gap-1 pt-1">
                {step.chips.map((chip) => (
                  <span
                    key={chip}
                    className="mono text-[10px] px-1.5 py-0.5 rounded border border-border bg-muted/40 truncate max-w-full"
                  >
                    {chip}
                  </span>
                ))}
              </div>
            </Link>
            {i < STEPS.length - 1 ? (
              <span
                aria-hidden
                className="pointer-events-none absolute top-1/2 -right-[15px] hidden -translate-y-1/2 text-sm opacity-45 lg:block"
              >
                →
              </span>
            ) : null}
          </li>
        ))}
      </ol>

      {/* Two rows, not two columns.
          Side by side, the two code blocks are ~720px tall while the card that
          explains them is ~420px, which left a hole in whichever column was
          shorter — and stretching the card only moved the hole inside it. Split
          into rows, every element defines its own height and there is nothing to
          balance. The blocks also get the full width, so no line scrolls. */}
      <p className="max-w-2xl mt-8 text-muted-foreground">
        // next.js example | <code className="opacity-90">@themvora/next</code>
      </p>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="min-w-0 overflow-x-clip">
          <CodeBlock
            html={themeHtml}
            code={THEME_SNIPPET.code}
            language={THEME_SNIPPET.lang}
            filename={THEME_SNIPPET.title}
            collapsible={false}
            className="rounded-xl m-0"
            {...compatibilityBadge(THEME_SNIPPET.code, THEME_SNIPPET.lang)}
          />
        </div>
        <div className="min-w-0 overflow-x-clip">
          <CodeBlock
            html={layoutHtml}
            code={LAYOUT_SNIPPET.code}
            language={LAYOUT_SNIPPET.lang}
            filename={LAYOUT_SNIPPET.title}
            collapsible={false}
            className="rounded-xl m-0"
            {...compatibilityBadge(LAYOUT_SNIPPET.code, LAYOUT_SNIPPET.lang)}
          />
        </div>
      </div>

      <p className="mt-1 text-[11px] leading-relaxed opacity-55">
        In any component:{" "}
        <code className="mono text-[0.95em]">
          &lt;button className=&quot;bg-primary
          text-primary-foreground&quot;&gt;
        </code>{" "}
        — roles from{" "}
        <code className="mono text-[0.95em]">@themvora/tailwind</code>, or{" "}
        <code className="mono text-[0.95em]">var(--theme-color-primary)</code>{" "}
        in plain CSS.
      </p>

      {/* The contract, spelled out. Three columns at `lg`: the argument, the
          role → variable → utility mapping that makes it true, and the ways in. */}
      <div className="mt-4 rounded-xl border border-border bg-card p-5 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] lg:gap-8">
        <div>
          <h3 className="text-sm font-semibold">
            Not a palette collection. A contract.
          </h3>
          <p className="mt-2 max-w-xl text-[13px] leading-relaxed opacity-65">
            A preset is a theme that already satisfies the contract. The
            contract is what makes themes swappable: the same semantic roles
            exist in every theme, so a component written once keeps working when
            the theme changes — and a new theme needs no component changes at
            all.
          </p>
          <p className="mt-2 max-w-xl text-[13px] leading-relaxed opacity-65">
            That is also why the runtime, the adapters and the SSR story all
            speak the same vocabulary. They are not separate features; they are
            the same token contract at different layers.
          </p>
          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2">
            <Link
              href="/presets"
              className="text-xs font-semibold no-underline"
              style={{ color: "var(--docs-accent)" }}
            >
              Explore all built-in themes →
            </Link>
            <Link
              href="/custom-themes"
              className="text-xs font-semibold no-underline"
              style={{ color: "var(--docs-accent)" }}
            >
              Write your own theme →
            </Link>
          </div>
        </div>

        <div className="mt-4 self-start rounded-lg border border-border bg-background/60 p-3 lg:mt-0">
          <div className="mono grid grid-cols-[auto_minmax(0,1fr)_auto] gap-x-2 text-[9px] uppercase tracking-wide opacity-40">
            <span>role</span>
            <span>variable</span>
            <span>utility</span>
          </div>
          <div className="mt-1.5 flex flex-col gap-1.5">
            {TOKEN_PIPELINE.map((token) => (
              <div
                key={token.role}
                className="mono grid grid-cols-[auto_minmax(0,1fr)_auto] items-baseline gap-x-2 text-[10px]"
              >
                <span className="text-foreground">{token.role}</span>
                <span className="truncate opacity-50 min-w-0">
                  --theme-color-{token.role}
                </span>
                <span className="opacity-70">{token.utility}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
