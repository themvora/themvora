import type { Metadata } from "next";
import Link from "next/link";

import { DocsLayout } from "../../components/docs-layout";
import { PageHeader } from "../../components/ui/page-header";
import { SectionHeading } from "../../components/ui/section-heading";
import { FrameworkTabs, type FrameworkExample } from "../../components/framework-tabs";
import { highlightCode } from "../../lib/highlight";
import { compatibilityBadge } from "../../lib/code-variants";
import { docsUrl } from "../../lib/site";

export const metadata: Metadata = {
  alternates: { canonical: docsUrl("/no-flash-ssr") },
  title: "No Flash SSR",
  description:
    "Zero-flash theming for every framework. Next, Nuxt, Remix, Astro and Angular resolve the theme on the server; React, Vue, Svelte and Solid providers are flash-proof out of the box.",
};

const reactSnippet = {
  label: "React (SPA)",
  lang: "tsx",
  filename: "main.tsx",
  code: `import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ThemeProvider } from "@themvora/react";

// Flash-proof out of the box. The provider reads the persisted selection
// (localStorage "theme-selection"), applies it before first paint, and
// injects a blocking bootstrap script — no vite plugin or manual <head>
// script required.
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider defaultTheme="light" initialMode="system">
      <App />
    </ThemeProvider>
  </StrictMode>,
);
`,
};

const vueSnippet = {
  label: "Vue",
  lang: "ts",
  filename: "main.ts",
  code: `import { createApp } from "vue";
import { ThemeProvider } from "@themvora/vue";

// Flash-proof out of the box — the provider injects the blocking bootstrap
// and applies the persisted theme before first paint. No extra setup.
createApp({
  render: () => h(ThemeProvider, { defaultTheme: "light", initialMode: "system" },
    () => h(App)),
}).mount("#app");
`,
};

const svelteSnippet = {
  label: "Svelte",
  lang: "svelte",
  filename: "+layout.svelte",
  code: `<script lang="ts">
  import { ThemeProvider } from "@themvora/svelte";
</script>

<!-- Flash-proof out of the box — the provider injects the blocking
     bootstrap and applies the persisted theme before first paint. -->
<ThemeProvider defaultTheme="light">
  {@render children()}
</ThemeProvider>
`,
};

const solidSnippet = {
  label: "Solid",
  lang: "tsx",
  filename: "index.tsx",
  code: `import { render } from "solid-js/web";
import { ThemeProvider } from "@themvora/solid";

// Flash-proof out of the box — the provider injects the blocking bootstrap
// and applies the persisted theme before first paint.
render(
  () => (
    <ThemeProvider defaultTheme="light" initialMode="system">
      <App />
    </ThemeProvider>
  ),
  document.getElementById("root")!,
);
`,
};

const examples: FrameworkExample[] = [reactSnippet, vueSnippet, svelteSnippet, solidSnippet].map(
  (s) => ({
    ...s,
    html: highlightCode(s.code, s.lang),
    ...compatibilityBadge(s.code, s.lang, s.label),
  }),
);

export default function NoFlashSSRPage() {
  return (
    <DocsLayout>
      <div className="max-w-3xl">
        <PageHeader
          eyebrow="Zero Flash"
          title="No Flash SSR"
          description="SPA client providers (React, Vue, Svelte, Solid) are flash-proof out of the box — no vite plugin or manual head script required."
        />

        <section id="how-it-works" className="scroll-mt-24 mb-10">
          <SectionHeading num={1}>How it works</SectionHeading>
          <p className="text-sm leading-relaxed opacity-80">
            Each client provider reads the persisted theme selection, applies the theme before first
            paint via a layout effect, and injects a blocking bootstrap script into{" "}
            <code className="mono text-[0.9em]">&lt;head&gt;</code>. The result is zero flash with
            zero configuration. See the{" "}
            <Link href="/zero-flash" className="text-foreground underline hover:decoration-foreground">
              /zero-flash
            </Link>{" "}
            page for the full mechanism and SSR integrations.
          </p>
        </section>

        <section id="framework-snippets" className="scroll-mt-24 mb-10">
          <SectionHeading num={2}>Framework snippets</SectionHeading>
          <FrameworkTabs examples={examples} scrollToId="framework-snippets" />
        </section>

        <p className="text-sm leading-relaxed opacity-80">
          If you want the theme applied on the very first frame before the bundle loads, see the{" "}
          <Link href="/zero-flash" className="text-foreground underline hover:decoration-foreground">
            bootstrap script mechanism
          </Link>{" "}
          and the{" "}
          <Link href="/vite-plugin" className="text-foreground underline hover:decoration-foreground">
            Vite plugin
          </Link>.
        </p>
      </div>
    </DocsLayout>
  );
}
