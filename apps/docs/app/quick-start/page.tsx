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
import {
  QUICK_START_COMPONENT_STYLES,
  QUICK_START_DOCUMENT_STYLES,
  QUICK_START_GLOBAL_STYLES,
  QUICK_START_SWITCHES,
} from "../../lib/quick-start-snippets";
import { docsUrl } from "../../lib/site";
import {
  contractForSlug,
  explicitInstallPackages,
  formatInstallCommand,
} from "../../lib/package-contracts";

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

const buildConfigContent: Record<string, CodeContent | undefined> =
  Object.fromEntries(
    frameworks.map((fw) => [
      fw.slug,
      fw.buildConfig ? contentFor(fw.buildConfig, fw.slug) : undefined,
    ]),
  );

const themeConfigContent: Record<string, CodeContent | undefined> =
  Object.fromEntries(
    frameworks.map((fw) => [
      fw.slug,
      fw.themeConfig ? contentFor(fw.themeConfig, fw.slug) : undefined,
    ]),
  );

// Quick Start's run step is class-only, so it reads its own snippets rather
// than the ones the framework guides render. The Astro entry carries the React
// island shape; `astro-native` is selected separately below.
const switchContent: Record<string, CodeContent> = Object.fromEntries(
  frameworks.map((fw) => {
    const snippet =
      QUICK_START_SWITCHES[fw.slug] ?? fw.switchSnippet ?? fw.snippet;
    return [fw.slug, contentFor(snippet, fw.slug)];
  }),
);

const appFileContent: Record<string, CodeContent | undefined> =
  Object.fromEntries(
    frameworks.map((fw) => [
      fw.slug,
      fw.appFile ? contentFor(fw.appFile, fw.slug) : undefined,
    ]),
  );

const installCommands: Record<
  string,
  Record<PackageManager, InstallCommandEntry>
> = Object.fromEntries(
  frameworks.map((fw) => {
    const contract = contractForSlug(fw.slug);
    const packages = contract
      ? explicitInstallPackages(contract, {
          extraPackages: fw.extraPackages ?? [],
        })
      : ["@themvora/core", fw.pkg, ...(fw.extraPackages ?? [])];
    const byManager = Object.fromEntries(
      MANAGERS.map((manager) => {
        const code = formatInstallCommand(packages, manager);
        return [manager, { code, html: highlightCode(code, "bash") }];
      }),
    ) as Record<PackageManager, InstallCommandEntry>;
    // Keyed by slug, not package: Remix v2 and React Router share
    // `@themvora/remix` but install different framework packages.
    return [fw.slug, byManager];
  }),
);

/**
 * The optional second command for projects that do not have the framework
 * installed yet. Kept separate from `installCommands` so the primary command
 * never presents framework packages as Themvora requirements.
 */
const prerequisiteInstallCommands: Record<
  string,
  Record<PackageManager, InstallCommandEntry> | undefined
> = Object.fromEntries(
  frameworks.map((fw) => {
    if (!fw.prerequisiteInstall) return [fw.slug, undefined];
    const byManager = Object.fromEntries(
      MANAGERS.map((manager) => {
        const code = formatInstallCommand(fw.prerequisiteInstall!.packages, manager);
        return [manager, { code, html: highlightCode(code, "bash") }];
      }),
    ) as Record<PackageManager, InstallCommandEntry>;
    return [fw.slug, byManager];
  }),
);

/**
 * Astro's Quick Start offers the same two shapes the framework guide explains,
 * so a reader meets the React island as an explicit choice rather than as step 3
 * of an otherwise React-free setup.
 *
 * `astro-native` is the framework-free switch and the Astro entry's
 * `reactSetup` is the config with the renderer; the React island itself is the
 * class-only Quick Start variant.
 */
const astro = frameworks.find((fw) => fw.slug === "astro");

/**
 * The two halves of the stylesheet, highlighted once each.
 *
 * The global step renders the document rule plus the four classes from the run
 * step. The styling step renders only the component rules, so the document rule
 * exists in one place on the page. CSS has no language variants; only the file
 * name changes per framework.
 */
const globalStylesHtml = highlightCode(QUICK_START_GLOBAL_STYLES, "css");
const globalStylesOnlyHtml = highlightCode(QUICK_START_DOCUMENT_STYLES, "css");

/**
 * The styling step per framework.
 *
 * Every runtime framework renders the component half of `CANONICAL_STYLES`.
 * Tailwind is CSS-only and has no component stylesheet, so it renders the
 * token→utility map that explains why its utilities need no second file.
 */
const styleContent: Record<string, CodeContent | undefined> = Object.fromEntries(
  frameworks.map((fw) => {
    const snippet = fw.cssOnly
      ? fw.snippet2
      : {
          title: fw.styles.title,
          lang: "css",
          code: QUICK_START_COMPONENT_STYLES,
        };
    return [fw.slug, snippet ? contentFor(snippet, fw.slug) : undefined];
  }),
);

/**
 * The small themed UI both this page and every guide render.
 *
 * Highlighted per framework here because the guide is a client component and
 * Shiki lives in the Node bundle. Every framework entry defines one today, but
 * the slot is optional in the type, so the guide omits the block rather than
 * rendering an empty one.
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
      onlySwitch: contentFor(QUICK_START_SWITCHES["astro-native"]!, astro.slug),
      reactSetup: astro.reactSetup
        ? contentFor(astro.reactSetup, astro.slug)
        : undefined,
      setupContent: astroSetupContent,
      reactInstall: Object.fromEntries(
        MANAGERS.map((manager) => {
          const astroContract = astro ? contractForSlug("astro") : undefined;
          const packages = astro && astroContract
            ? [
                ...explicitInstallPackages(astroContract),
                "@astrojs/react",
                "react",
                "react-dom",
              ]
            : [
                "@themvora/core",
                "@themvora/astro",
                "@astrojs/react",
                "react",
                "react-dom",
              ];
          const code = formatInstallCommand(packages, manager);
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
      <div>
        <PageHeader
          eyebrow="Quickstart"
          title="Quick Start"
          description="The shortest path to a working light/dark theme. No token definitions, no configuration — install, register the runtime, and toggle."
        />
        <Prerequisites
          items={[
            { label: "Node.js", value: "18+ (or your framework toolchain's minimum)" },
            { label: "Package manager", value: "npm, pnpm, yarn, or bun" },
            { label: "Framework", value: "Any supported framework", href: "/framework-guides" },
          ]}
          className="mb-8"
        />
        <QuickStartGuide
          frameworkContent={frameworkContent}
          setupExtraContent={setupExtraContent}
          buildConfigContent={buildConfigContent}
          themeConfigContent={themeConfigContent}
          switchContent={switchContent}
          appFileContent={appFileContent}
          globalStylesHtml={globalStylesHtml}
          globalStylesOnlyHtml={globalStylesOnlyHtml}
          styleContent={styleContent}
          installCommands={installCommands}
          prerequisiteInstallCommands={prerequisiteInstallCommands}
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
