import type { Metadata } from "next";

import { DocsLayout } from "../../components/docs-layout";
import { PageHeader } from "../../components/ui/page-header";
import { SectionHeading } from "../../components/ui/section-heading";
import { Prerequisites } from "../../components/ui/prerequisites";
import { QuickStartGuide } from "../../components/quick-start/guide";
import { CodeExample } from "../../components/code-example";
import { Button } from "../../components/ui/button";
import type { PackageManager } from "../../components/install-command";
import { frameworks } from "../../lib/frameworks";
import type { FrameworkSnippet } from "../../lib/frameworks";
import { highlightCode } from "../../lib/highlight";
import { codeContent, type CodeContent } from "../../lib/code-variants";
import { docsUrl } from "../../lib/site";

export const metadata: Metadata = {
  alternates: { canonical: docsUrl("/quick-start") },
  title: "Quick Start",
  description:
    "From zero to a themed app with no token definitions: install the core and your framework adapter, register the runtime, and toggle light/dark.",
};

const MANAGERS: PackageManager[] = ["pnpm", "npm", "yarn", "bun"];

type InstallCommandEntry = { code: string; html: string };

/**
 * Both language forms of a snippet, highlighted here on the server.
 *
 * Shiki and the TypeScript compiler both live in the Node bundle, and this page's
 * guide is a client component, so the markup travels down as data. Every entry
 * carries `html` for the TypeScript form; `variants` is present only when a
 * JavaScript form exists, and its absence is what suppresses the selector.
 *
 * `html` is not optional. A block whose snippet has no second form is the common
 * case here — 63 of the 83 snippets in `lib/frameworks.tsx` are already
 * JavaScript or are not TypeScript at all — and passing `variants` alone left
 * every one of them with an empty pane.
 *
 * `framework` is the entry's own slug, not the snippet's language. Angular's
 * Quick Start examples are TypeScript-only by decision, so the slug is what keeps
 * a selector off them; see `TYPESCRIPT_ONLY_FRAMEWORKS`.
 */
function contentFor(
  snippet: FrameworkSnippet,
  framework: string,
): CodeContent {
  return codeContent(
    { code: snippet.code, lang: snippet.lang, framework, filename: snippet.title },
    highlightCode,
  );
}

const frameworkContent: Record<string, CodeContent> = Object.fromEntries(
  frameworks.map((fw) => [fw.slug, contentFor(fw.noTheme, fw.slug)]),
);

const setupExtraContent: Record<string, CodeContent | undefined> =
  Object.fromEntries(
    frameworks.map((fw) => [
      fw.slug,
      fw.setupExtra ? contentFor(fw.setupExtra, fw.slug) : undefined,
    ]),
  );

const switchContent: Record<string, CodeContent> = Object.fromEntries(
  frameworks.map((fw) => {
    const snippet = fw.switchSnippet ?? fw.snippet;
    return [fw.slug, contentFor(snippet, fw.slug)];
  }),
);

const installCommands: Record<
  string,
  Record<PackageManager, InstallCommandEntry>
> = Object.fromEntries(
  frameworks.map((fw) => {
    const pkgsArg = ["@themvora/core", fw.pkg, ...(fw.extraPackages ?? [])].join(
      " ",
    );
    const byManager = Object.fromEntries(
      MANAGERS.map((manager) => {
        const code =
          manager === "npm"
            ? `npm install ${pkgsArg}`
            : `${manager} add ${pkgsArg}`;
        return [manager, { code, html: highlightCode(code, "bash") }];
      }),
    ) as Record<PackageManager, InstallCommandEntry>;
    return [fw.pkg, byManager];
  }),
);

/**
 * Astro's Quick Start offers the same two shapes the framework guide explains,
 * so a reader meets the React island as an explicit choice rather than as step 3
 * of an otherwise React-free setup.
 *
 * The snippets come from the Astro entry itself — `snippet2` is the
 * framework-free switch, `reactSetup` is the config with the renderer — so the
 * two pages render one definition.
 */
const astro = frameworks.find((fw) => fw.slug === "astro");

/**
 * The canonical stylesheet, highlighted once.
 *
 * Every framework entry points its `styles` slot at the same source — only the
 * file name differs — so this is one string rather than a per-framework map.
 * It is CSS, so it has no language variants.
 */
const stylesHtml = highlightCode(
  frameworks[0]!.styles.code,
  frameworks[0]!.styles.lang,
);

/**
 * The small themed UI both this page and every guide render.
 *
 * Highlighted per framework here because the guide is a client component and
 * Shiki lives in the Node bundle; the stylesheet is one string because it is
 * deliberately identical in every framework. Every framework entry defines one
 * today, but the slot is optional in the type, so the guide omits the block
 * rather than rendering an empty one.
 */
const uiExampleContent: Record<string, CodeContent | undefined> =
  Object.fromEntries(
    frameworks.map((fw) => [
      fw.slug,
      fw.uiExample ? contentFor(fw.uiExample, fw.slug) : undefined,
    ]),
  );

// Astro's setup is three files — `theme.config.ts`, `astro.config.ts` and the
// layout — so the guide renders them from the entry's own slots rather than the
// generic `noTheme` + `setupExtra` pair. Keyed by the snippet's title so the
// component cannot pair the wrong variants with a snippet if the order changes.
const astroSetupContent: Record<string, CodeContent | undefined> = {};
if (astro) {
  for (const snippet of [
    astro.quickStart,
    astro.noTheme,
    astro.snippet,
    astro.reactSetup,
  ]) {
    if (snippet) {
      astroSetupContent[snippet.title] = contentFor(snippet, astro.slug);
    }
  }
}

const astroContent = astro
  ? {
      onlySwitch: contentFor(astro.snippet2, astro.slug),
      reactSetup: astro.reactSetup
        ? contentFor(astro.reactSetup, astro.slug)
        : undefined,
      setupContent: astroSetupContent,
      reactInstall: Object.fromEntries(
        MANAGERS.map((manager) => {
          const pkgsArg = [
            "@themvora/core",
            astro.pkg,
            "@astrojs/react",
            "react",
            "react-dom",
          ].join(" ");
          const code =
            manager === "npm"
              ? `npm install ${pkgsArg}`
              : `${manager} add ${pkgsArg}`;
          return [manager, { code, html: highlightCode(code, "bash") }];
        }),
      ) as Record<PackageManager, InstallCommandEntry>,
    }
  : undefined;

const buildIncludedCode = `// The provider falls back to these two when you pass no \`themes\` prop:
// the neutral "light" and "dark" themes.
import { getBuiltInThemes, getNeutralThemes } from "@themvora/core";

const [light, dark] = getNeutralThemes();

// The full built-in set is 34 themes — 14 color families plus the neutral,
// high-contrast and large-text pairs. Merge it with your own. Theme names must
// be unique, so don't redefine a built-in name.
const themes = [...getBuiltInThemes(), ...myThemes];`;

// The guide is a client component, so its h2s are invisible to the server-side
// TOC collector (RSC serializes the subtree as a template). Provide them here
// so the rail is visible from the initial HTML and the ids match what the
// client scan assigns via `allocateId`.
export default function QuickStartPage() {
  return (
    <DocsLayout>
      <div className="max-w-3xl">
        <PageHeader
          eyebrow="Quickstart"
          title="Quick Start"
          description="The shortest path to a working light/dark theme. No token definitions, no configuration — install, register the runtime, and toggle."
        />
        <Prerequisites
          items={[
            { label: "Node.js", value: "18.x or later" },
            { label: "Package manager", value: "npm, pnpm, yarn, or bun" },
            { label: "Framework", value: "Any supported framework", href: "/framework-guides" },
          ]}
          className="mb-8"
        />
        <QuickStartGuide
          frameworkContent={frameworkContent}
          setupExtraContent={setupExtraContent}
          switchContent={switchContent}
          stylesHtml={stylesHtml}
          installCommands={installCommands}
          astroContent={astroContent}
          uiExampleContent={uiExampleContent}
        />

        <SectionHeading id="real-themes" className="mt-12">
          Ready for real themes?
        </SectionHeading>
        <p className="text-sm opacity-80 mb-4">
          The built-in themes cover the full semantic token set, so staying on
          them is a valid choice. When you want your own palette, define a theme
          and pass it in — the built-ins stay available alongside it.
        </p>
        <CodeExample
          code={buildIncludedCode}
          lang="ts"
          filename="your themes alongside the built-in set"
          className="rounded-lg m-0"
        />
        <div className="mt-6 flex flex-wrap gap-2">
          <Button href="/get-started">Full get-started guide</Button>
          <Button href="/custom-themes" variant="ghost">
            Define your first theme
          </Button>
        </div>
      </div>
    </DocsLayout>
  );
}
