import type { Metadata } from "next";

import { DocsLayout } from "../../components/docs-layout";
import { CodeExample } from "../../components/code-example";
import { PageHeader } from "../../components/ui/page-header";
import { SectionHeading } from "../../components/ui/section-heading";
import { Callout } from "../../components/ui/callout";
import { Prerequisites } from "../../components/ui/prerequisites";
import { InlineCode } from "../../components/ui/inline-code";
import { NextSteps } from "../../components/ui/next-step-card";
import { RelatedLinks } from "../../components/ui/related-links";
import {
  InstallCommand,
  type PackageManager,
} from "../../components/install-command";
import {
  CANONICAL_STYLES,
  CANONICAL_STYLES_NOTE,
  CANONICAL_STYLES_STEP,
} from "../../lib/frameworks";
import { highlightCode } from "../../lib/highlight";
import { docsUrl } from "../../lib/site";

export const metadata: Metadata = {
  alternates: { canonical: docsUrl("/vanilla") },
  title: "Framework-Free",
  description:
    "Use Themvora without React, Vue, or Svelte — a single Themvora class gives you mode switching, family selection, CSS variable binding, and localStorage persistence.",
};

const MANAGERS: PackageManager[] = ["pnpm", "npm", "yarn", "bun"];

const installCommands = Object.fromEntries(
  MANAGERS.map((manager) => {
    const code =
      manager === "npm"
        ? "npm install @themvora/core"
        : `${manager} add @themvora/core`;
    return [manager, { code, html: highlightCode(code, "bash") }];
  }),
) as Record<PackageManager, { code: string; html: string }>;

/** Step 2 — the minimal project: a container and the entry module. */
const setupHtmlSnippet = {
  lang: "html",
  title: "index.html",
  code: `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Themvora</title>
  </head>
  <body>
    <!-- Themvora writes the active theme's CSS custom properties onto <html>,
         so any element in the document can read them. -->
    <main id="app">
      <h1>Hello, themed world</h1>
      <p>Current theme: <strong id="theme-name"></strong></p>
    </main>

    <script type="module" src="/src/main.ts"></script>
  </body>
</html>`,
};

const setupTsSnippet = {
  lang: "ts",
  title: "src/main.ts",
  code: `import "./style.css";

import { Themvora } from "@themvora/core/vanilla";

// Omitting themes uses the built-in set. initialMode follows the OS on a first
// visit, and every later change is persisted to localStorage.
const kit = new Themvora({ defaultTheme: "light", initialMode: "system" });

const readout = document.querySelector<HTMLElement>("#theme-name");

if (!readout) {
  throw new Error("index.html must contain a #theme-name element.");
}

const render = () => {
  readout.textContent = kit.theme.name;

  for (const button of document.querySelectorAll<HTMLElement>("[data-mode]")) {
    button.setAttribute("aria-pressed", String(button.dataset.mode === kit.mode));
  }
  for (const button of document.querySelectorAll<HTMLElement>("[data-family]")) {
    button.setAttribute("aria-pressed", String(button.dataset.family === kit.family));
  }
};

// Controls are plain buttons carrying data-mode / data-family. Delegating from
// the document means the wiring does not depend on when they are rendered.
document.addEventListener("click", (event) => {
  const button = (event.target as HTMLElement).closest<HTMLElement>(
    "[data-mode], [data-family]",
  );
  if (!button) return;

  const { mode, family } = button.dataset;

  if (mode === "light" || mode === "dark" || mode === "system") {
    kit.setMode(mode);
  }
  if (family) {
    kit.setFamily(family);
  }
});

// Every change is persisted and emitted as an event.
kit.on("themeChange", render);
kit.on("modeChange", render);
kit.on("familyChange", render);
render();`,
};

/** Step 3 — the same file, with the UI the step-2 wiring already drives. */
const uiHtmlSnippet = {
  lang: "html",
  title: "index.html",
  code: `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Themvora</title>
  </head>
  <body>
    <main id="app">
      <h1>Themvora</h1>
      <p>Current theme: <strong id="theme-name"></strong></p>

      <p id="controls">
        <button type="button" data-mode="light">Light</button>
        <button type="button" data-mode="dark">Dark</button>
        <button type="button" data-mode="system">System</button>
        <button type="button" data-family="default">Default</button>
        <button type="button" data-family="plum">Plum</button>
      </p>

      <section class="themvora-example-card">
        <div class="themvora-example-header">
          <h2 class="themvora-example-title">Themed card</h2>
          <span class="themvora-example-status">Active</span>
        </div>
        <p class="themvora-example-description">
          Surface, border and text follow the active theme.
        </p>
        <p class="themvora-example-meta">Updated 2 minutes ago</p>
        <button class="themvora-example-button" type="button">Primary action</button>
      </section>
    </main>

    <script type="module" src="/src/main.ts"></script>
  </body>
</html>`,
};

// The stylesheet the framework guides show is one shared definition, kept in
// `lib/frameworks.tsx` (where the mirror generator can evaluate it), so this
// page references it rather than keeping a copy that could drift. The example
// completeness gate resolves `code:` literals it can read in this file, so an
// imported constant is invisible to it — that single, justified entry is frozen
// in docs/reference/baselines/examples-baseline.json.
const stylesSnippet = {
  lang: "css",
  title: "src/style.css",
  code: CANONICAL_STYLES,
};

const readSnippet = {
  lang: "ts",
  title: "reading state",
  code: `// The full active theme definition (name, tokens, mode, …)
const current = kit.theme;

// The current mode: "light", "dark", or "system"
const mode = kit.mode;

// The current family: "default", "plum", "mint", …
const family = kit.family;

// Every registered theme
const themes = kit.themes;`,
};

const switchSnippet = {
  lang: "ts",
  title: "switching themes",
  code: `// Switch mode — persisted to localStorage automatically
kit.setMode("dark");
kit.setMode("light");
kit.setMode("system");

// Switch family
kit.setFamily("plum");
kit.setFamily("mint");

// Toggle between light and dark (ignores "system")
kit.toggleTheme();`,
};

const subscribeSnippet = {
  lang: "ts",
  title: "subscribing to changes",
  code: `// Fires on every theme change
const unsubscribe = kit.on("themeChange", (theme) => {
  console.log("New theme:", theme.name);
});

// Fires when only the mode changes
kit.on("modeChange", (mode) => {
  console.log("Mode:", mode);
});

// Fires when only the family changes
kit.on("familyChange", (family) => {
  console.log("Family:", family);
});

// Later — clean up
unsubscribe();`,
};

const domSnippet = {
  lang: "ts",
  title: "custom target and manual tokens",
  code: `// By default Themvora binds CSS variables to <html>. To target one element
// instead (the "!" satisfies strict narrowing):
const scoped = new Themvora({ target: document.getElementById("app")! });

// A flat map of the current theme's custom properties
const vars = scoped.toCSSVariables();
// → { "--theme-color-primary": "#0d162e", … }

// Merge partial tokens into the active theme at runtime
scoped.update({ colors: { primary: "#10b981" } });`,
};

const persistSnippet = {
  lang: "ts",
  title: "persistence",
  code: `// Mode and family are written to localStorage on every change and restored
// when a new instance is created.
kit.setMode("dark");
kit.setFamily("plum");
// ^ already persisted under the "theme-selection" key — no extra call needed

// To read the saved selection before instantiating:
const saved = JSON.parse(localStorage.getItem("theme-selection") ?? "{}");
console.log(saved.mode, saved.family); // "dark", "plum"`,
};

const customThemesSnippet = {
  lang: "ts",
  title: "your own themes",
  code: `import { defineTheme } from "@themvora/core";
import { Themvora } from "@themvora/core/vanilla";

const brand = defineTheme({
  name: "brand-light",
  meta: { family: "brand", mode: "light", label: "Brand Light" },
  tokens: { colors: { primary: "#6d28d9", primaryForeground: "#ffffff" } },
});

// Passing themes replaces the built-in set, so list everything you want.
const kit = new Themvora({ themes: [brand], defaultTheme: "brand-light" });`,
};

const apiSnippets = [
  readSnippet,
  switchSnippet,
  subscribeSnippet,
  domSnippet,
  persistSnippet,
  customThemesSnippet,
];

export default function VanillaPage() {
  return (
    <DocsLayout>
      <div className="max-w-3xl">
        <PageHeader
          eyebrow="Vanilla"
          title="Framework-free theming"
          description={
            <>
              No React, no Vue, no Svelte — just a{" "}
              <code className="mono text-[0.9em]">Themvora</code> class. Drop it
              into any Vite or plain-JS page and get mode switching, family
              selection, CSS variable binding, and localStorage persistence out
              of the box.
            </>
          }
        />

        <Prerequisites
          items={[
            {
              label: "Runtime",
              value:
                "Node.js 18+ and a package manager (npm, pnpm, yarn, or bun)",
            },
            {
              label: "Project",
              value:
                "A Vite project — the vanilla TypeScript template works as-is — or any page that can load a module script",
            },
          ]}
        />

        <section id="install" className="scroll-mt-24 mt-10">
          <SectionHeading
            num={1}
            desc="One package. The vanilla entry has no framework peer dependencies."
          >
            Install
          </SectionHeading>
          <InstallCommand commands={installCommands} />
        </section>

        <section id="setup" className="scroll-mt-24 mt-10">
          <SectionHeading
            num={2}
            desc="Create the instance in the entry module. Themvora resolves the starting theme, writes its tokens onto the page, and restores any saved selection."
          >
            Set up
          </SectionHeading>
          <CodeExample
            code={setupHtmlSnippet.code}
            lang={setupHtmlSnippet.lang}
            filename={setupHtmlSnippet.title}
            className="rounded-lg m-0"
          />
          <CodeExample
            code={setupTsSnippet.code}
            lang={setupTsSnippet.lang}
            filename={setupTsSnippet.title}
            className="rounded-lg m-0 mt-3"
          />
          <Callout className="mt-3" title="Choosing the starting theme">
            <InlineCode>
              {`defaultTheme chooses the starting theme and initialMode: "system" follows the visitor's OS. Omitting themes uses the built-in set, so there is nothing to define to get started.`}
            </InlineCode>
          </Callout>
        </section>

        <section id="ui" className="scroll-mt-24 mt-10">
          <SectionHeading
            num={3}
            desc="A heading, a card and a button. The controls read the current theme and change it — nothing is styled yet."
          >
            Add a small UI
          </SectionHeading>
          <CodeExample
            code={uiHtmlSnippet.code}
            lang={uiHtmlSnippet.lang}
            filename={uiHtmlSnippet.title}
            className="rounded-lg m-0"
          />
        </section>

        <section id="styling" className="scroll-mt-24 mt-10">
          <SectionHeading num={4} desc={CANONICAL_STYLES_STEP.desc}>
            {CANONICAL_STYLES_STEP.label}
          </SectionHeading>
          <CodeExample
            code={stylesSnippet.code}
            lang={stylesSnippet.lang}
            filename={stylesSnippet.title}
            className="rounded-lg m-0"
          />
          <Callout className="mt-3" title="Why this never needs a second stylesheet">
            <InlineCode>{CANONICAL_STYLES_NOTE}</InlineCode>
          </Callout>
        </section>

        <section id="api" className="scroll-mt-24 mt-10">
          <SectionHeading
            desc="The whole runtime surface is a few getters, setters, methods and events on the instance."
          >
            The Themvora class
          </SectionHeading>
          <div className="flex flex-col gap-8">
            {apiSnippets.map((snippet) => (
              <div key={snippet.title}>
                <h3 className="text-sm font-semibold mb-2">{snippet.title}</h3>
                <CodeExample
                  code={snippet.code}
                  lang={snippet.lang}
                  className="rounded-lg m-0"
                />
              </div>
            ))}
          </div>
        </section>

        <section id="when-to-use" className="scroll-mt-24 mt-10">
          <SectionHeading desc="When a framework adapter is overkill.">
            When to use it
          </SectionHeading>
          <ul className="text-sm opacity-80 leading-relaxed list-disc pl-5 space-y-1.5">
            <li>
              A static HTML page, CMS template or server-rendered view that does
              not use a JavaScript framework.
            </li>
            <li>
              The lightest possible integration — one import, one class, no build
              step required.
            </li>
            <li>Theme controls embedded in an admin panel, docs site or widget.</li>
            <li>
              The runtime is identical to the one the framework adapters use
              internally: same token resolution, same persistence, same events.
            </li>
          </ul>
        </section>

        <NextSteps
          steps={[
            {
              title: "Build custom themes",
              description: "Define your own token sets and theme families",
              href: "/custom-themes",
            },
            {
              title: "Add plugins",
              description: "Extend functionality with lifecycle hooks",
              href: "/plugins",
            },
          ]}
        />

        <RelatedLinks
          links={[
            {
              title: "Web Components Guide",
              description: "The same runtime through <themvora-*> custom elements",
              href: "/framework-guides/web",
            },
            {
              title: "DOM Adapters",
              description: "How CSS variables and attributes are applied",
              href: "/dom-adapters",
            },
            {
              title: "Architecture",
              description: "Core concepts and runtime design",
              href: "/architecture",
            },
          ]}
        />
      </div>
    </DocsLayout>
  );
}
