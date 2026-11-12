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
import { contractForSlug, explicitInstallPackages, formatInstallCommand } from "../../lib/package-contracts";

export const metadata: Metadata = {
  alternates: { canonical: docsUrl("/vanilla") },
  title: "Framework-Free",
  description:
    "Use Themvora with plain HTML and JavaScript — no framework, no bundler. One configuration element, one package-owned pre-paint script, and a single Themvora class for mode switching, family selection, CSS variables and persistence.",
};

const MANAGERS: PackageManager[] = ["pnpm", "npm", "yarn", "bun"];

const vanillaContract = contractForSlug("core");
const installPackages = vanillaContract
  ? explicitInstallPackages(vanillaContract)
  : ["@themvora/core"];

const installCommands = Object.fromEntries(
  MANAGERS.map((manager) => {
    const code = formatInstallCommand(installPackages, manager);
    return [manager, { code, html: highlightCode(code, "bash") }];
  }),
) as Record<PackageManager, { code: string; html: string }>;

/**
 * Step 2 — the whole integration, in one file.
 *
 * Kept in step with `examples/apps/vanilla/index.html`: the tags, their order
 * and their comments are the setup this page documents.
 */
const setupHtmlSnippet = {
  lang: "html",
  title: "index.html",
  code: `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Themvora</title>

    <!-- Your stylesheet. Render-blocking, so the page never paints unstyled. -->
    <link rel="stylesheet" href="/src/styles.css" />

    <!-- 1. The configuration. Declared once, read by both the first paint and
            the runtime. Omit "themes" to use the built-in catalog. -->
    <script type="application/json" id="themvora-config">
      {
        "defaultTheme": "light",
        "initialMode": "system"
      }
    </script>

    <!-- 2. The pre-paint bootstrap, straight out of the package. A classic
            script in the head is parser-blocking, so it runs before the body is
            parsed and before anything is painted. -->
    <script src="/node_modules/@themvora/core/dist/prepaint.js"></script>

    <!-- 3. Module resolution, so a browser with no bundler can load the entry. -->
    <script type="importmap">
      {
        "imports": {
          "@themvora/core/vanilla": "/node_modules/@themvora/core/dist/vanilla.js"
        }
      }
    </script>
  </head>
  <body>
    <main id="app">
      <h1>Hello, themed world</h1>
      <!-- The bootstrap fills this from the theme it applied. -->
      <p>Current theme: <strong data-tv-readout="theme">—</strong></p>
    </main>

    <script type="module" src="/src/app.js"></script>
  </body>
</html>`,
};

/** Step 3 — the smallest runtime construction. */
const setupJsSnippet = {
  lang: "js",
  title: "src/app.js",
  code: `import { Themvora } from "@themvora/core/vanilla";

// No configuration here: index.html declares it once, and the instance adopts
// the state the pre-paint script already applied.
const kit = new Themvora();

const readout = document.querySelector('[data-tv-readout="theme"]');

kit.on("themeChange", (theme) => {
  readout.textContent = String(theme.name);
});`,
};

/** Step 4 — the same page, with the controls the wiring below drives. */
const uiHtmlSnippet = {
  lang: "html",
  title: "index.html — body",
  code: `<main id="app">
  <h1>Themvora</h1>

  <p id="readouts">
    Theme <strong data-tv-readout="theme">—</strong> ·
    mode <strong data-tv-readout="mode">—</strong> ·
    showing <strong data-tv-readout="effective-mode">—</strong> ·
    family <strong data-tv-readout="family">—</strong>
  </p>

  <!-- The bootstrap writes aria-pressed on the matching option before the
       first paint, so the control can never disagree with the document. -->
  <p id="controls">
    <button type="button" data-mode="light" data-tv-pressed="mode" data-tv-value="light">Light</button>
    <button type="button" data-mode="dark" data-tv-pressed="mode" data-tv-value="dark">Dark</button>
    <button type="button" data-mode="system" data-tv-pressed="mode" data-tv-value="system">System</button>

    <select data-tv-select="family">
      <option value="default">Default</option>
      <option value="plum">Plum</option>
      <option value="mint">Mint</option>
      <option value="oat">Oat</option>
      <option value="cocoa">Cocoa</option>
    </select>
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

<script type="module" src="/src/app.js"></script>`,
};

/** Step 4 — reading state, switching, and subscribing. */
const controlsJsSnippet = {
  lang: "js",
  title: "src/app.js — controls",
  code: `import { Themvora } from "@themvora/core/vanilla";

const kit = new Themvora();

const modeButtons = [...document.querySelectorAll("[data-mode]")];
const familySelect = document.querySelector("[data-tv-select='family']");

const readouts = {
  theme: document.querySelector('[data-tv-readout="theme"]'),
  mode: document.querySelector('[data-tv-readout="mode"]'),
  effective: document.querySelector('[data-tv-readout="effective-mode"]'),
  family: document.querySelector('[data-tv-readout="family"]'),
};

function render() {
  // \`theme.name\` is the resolved variant ("plum-dark"), \`mode\` is the choice
  // ("system" included), and \`resolvedMode\` is the appearance on screen.
  readouts.theme.textContent = String(kit.theme.name);
  readouts.mode.textContent = kit.mode;
  readouts.effective.textContent = kit.resolvedMode;
  readouts.family.textContent = kit.family;

  for (const button of modeButtons) {
    button.setAttribute("aria-pressed", String(button.dataset.mode === kit.mode));
  }
  familySelect.value = kit.family;
}

document.querySelector("#controls").addEventListener("click", (event) => {
  const button = event.target.closest("[data-mode]");
  if (button) kit.setMode(button.dataset.mode);
});

familySelect.addEventListener("change", () => kit.setFamily(familySelect.value));

// One subscription per event name; each fires once per logical change.
kit.on("themeChange", render);
kit.on("modeChange", render);
kit.on("familyChange", render);

render();`,
};

/** Step 5 — the shared stylesheet the framework guides also show. */
const stylesSnippet = {
  lang: "css",
  title: "src/styles.css",
  code: CANONICAL_STYLES,
};

const readSnippet = {
  lang: "js",
  title: "reading state",
  code: `// The resolved theme — its tokens, its mode and its label
const current = kit.theme;

// What the visitor chose: "light", "dark", or "system"
const mode = kit.mode;

// What is actually on screen: "light" or "dark", never "system"
const resolved = kit.resolvedMode;

// The family: "default", "plum", "mint", …
const family = kit.family;

// Every registered theme
const themes = kit.themes;

// A flat map of the active theme's custom properties
const vars = kit.toCSSVariables();`,
};

const switchSnippet = {
  lang: "js",
  title: "switching themes",
  code: `// Mode — persisted automatically
kit.setMode("dark");
kit.setMode("system");

// Family — the active mode is preserved
kit.setFamily("plum");
kit.setFamily("mint");

// Flip the appearance on screen into an explicit choice; "system" is ignored
kit.toggleTheme();`,
};

const subscribeSnippet = {
  lang: "js",
  title: "subscribing to changes",
  code: `// A selection change emits modeChange or familyChange first, then themeChange
// once the new theme is on the document. One event per name.
const unsubscribe = kit.on("themeChange", (theme) => {
  console.log("Now showing", theme.name);
});

kit.on("modeChange", (mode) => console.log("Mode is", mode));
kit.on("familyChange", (family) => console.log("Family is", family));

// Later
unsubscribe();`,
};

const persistSnippet = {
  lang: "js",
  title: "persistence",
  code: `// Every change is written to localStorage under "theme-selection".
kit.setMode("dark");
kit.setFamily("plum");
// → {"mode":"dark","family":"plum"}

// Read it before the runtime exists, if you need it in a test:
const saved = JSON.parse(localStorage.getItem("theme-selection") ?? "{}");`,
};

const customThemesSnippet = {
  lang: "html",
  title: "index.html — a custom catalog",
  code: `<!-- The same theme definitions \`new Themvora({ themes })\` takes. Whatever is
     declared here is what the first paint uses. -->
<script type="application/json" id="themvora-config">
  {
    "defaultTheme": "brand-light",
    "initialMode": "system",
    "themes": [
      {
        "name": "brand-light",
        "meta": { "family": "brand", "mode": "light" },
        "tokens": { "colors": { "primary": "#6d28d9", "primaryForeground": "#ffffff" } }
      },
      {
        "name": "brand-dark",
        "meta": { "family": "brand", "mode": "dark" },
        "tokens": { "colors": { "primary": "#a78bfa", "primaryForeground": "#140b2e" } }
      }
    ]
  }
</script>`,
};

const viteSnippet = {
  lang: "ts",
  title: "vite.config.ts",
  code: `import { defineConfig } from "vite";
import { themvoraVitePlugin } from "@themvora/core/vite";

// The plugin discovers theme.config.ts and injects the pre-paint stylesheet,
// the configuration and the blocking script into the served HTML. Nothing is
// added to index.html, and no asset is copied.
export default defineConfig({
  plugins: [themvoraVitePlugin()],
});`,
};

const viteConfigSnippet = {
  lang: "ts",
  title: "theme.config.ts",
  code: `import { defineTheme, defineThemvoraConfig } from "@themvora/core";

export default defineThemvoraConfig({
  themes: [
    defineTheme({
      name: "brand-light",
      meta: { family: "brand", mode: "light" },
      tokens: { colors: { background: "#ffffff", foreground: "#101014" } },
    }),
    defineTheme({
      name: "brand-dark",
      meta: { family: "brand", mode: "dark" },
      tokens: { colors: { background: "#101014", foreground: "#f5f5f5" } },
    }),
  ],
  defaultTheme: "brand-light",
  initialMode: "system",
});`,
};

const productionSnippet = {
  lang: "bash",
  title: "production",
  code: `# Copy the two package files into your static output.
cp node_modules/@themvora/core/dist/prepaint.js public/
cp node_modules/@themvora/core/dist/vanilla.js public/vendor/themvora-vanilla.js

# Then point the two tags at them:
#   <script src="/prepaint.js"></script>
#   { "imports": { "@themvora/core/vanilla": "/vendor/themvora-vanilla.js" } }`,
};

const apiSnippets = [
  readSnippet,
  switchSnippet,
  subscribeSnippet,
  persistSnippet,
];

export default function VanillaPage() {
  return (
    <DocsLayout>
      <div>
        <PageHeader
          eyebrow="Vanilla"
          title="Framework-free theming"
          description={
            <>
              Plain HTML and JavaScript, no framework and no bundler. One
              configuration element, one script from the package, and a{" "}
              <code className="mono text-[0.9em]">Themvora</code> class for mode
              switching, family selection, CSS variables and persistence — with
              the saved theme applied before the first paint.
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
                "Any page served by a static file server. A bundler is optional, not required.",
            },
          ]}
        />

        <section id="install" className="scroll-mt-24 mt-10">
          <SectionHeading
            num={1}
            desc="One package. The vanilla entry has no framework peers, and core has no runtime dependencies."
          >
            Install
          </SectionHeading>
          <InstallCommand commands={installCommands} />
        </section>

        <section id="setup" className="scroll-mt-24 mt-10">
          <SectionHeading
            num={2}
            desc="Four tags in the head, one module at the end of the body. Nothing to copy, nothing to generate."
          >
            Set up a page
          </SectionHeading>
          <CodeExample
            code={setupHtmlSnippet.code}
            lang={setupHtmlSnippet.lang}
            filename={setupHtmlSnippet.title}
            className="rounded-lg m-0"
          />
          <Callout className="mt-3" variant="important" title="Why the script is in the head">
            <InlineCode>
              {`A module script is deferred: it runs after the document is parsed, which is after the first paint. Anything it applies is a correction the visitor can see. The pre-paint script is a classic script in the head, so it is parser-blocking and runs first. That is the whole mechanism — there is no timeout and no hidden page.`}
            </InlineCode>
          </Callout>
          <Callout className="mt-3" variant="info" title="What the JSON element is for">
            <InlineCode>
              {`The script needs the registry and the fallback selection before any application code runs, and it can only read them from the document. The element is that declaration — the same serializable subset of the application configuration the Vite plugin transports, including transition and scrollbar. It is data, not code: nothing in it is evaluated.`}
            </InlineCode>
          </Callout>
        </section>

        <section id="initialize" className="scroll-mt-24 mt-10">
          <SectionHeading
            num={3}
            desc="One class. It adopts the theme already on the page, then owns every later change."
          >
            Initialize Themvora
          </SectionHeading>
          <CodeExample
            code={setupJsSnippet.code}
            lang={setupJsSnippet.lang}
            filename={setupJsSnippet.title}
            className="rounded-lg m-0"
          />
          <Callout className="mt-3" variant="tip" title="One configuration, two consumers">
            <InlineCode>
              {`The bootstrap reads the JSON element, resolves the selection, applies it, and publishes the resolved configuration as window.__THEMVORA_CONFIG__. new Themvora() reads that global, so the runtime registers the same catalog, the same fallback theme and the same storage key the first paint used. There is no second copy of defaultTheme, initialMode or the theme list to drift.`}
            </InlineCode>
          </Callout>
          <Callout className="mt-3" variant="warning" title="Passing options explicitly">
            <InlineCode>
              {`new Themvora({ defaultTheme: "light", initialMode: "system" }) is accepted, and the values are used whenever the page has no bootstrap. But the element is what the first frame uses, so the same two values would then be declared twice — and if they disagree, the element wins and the runtime corrects the page after paint. Declare them once, in the element.`}
            </InlineCode>
          </Callout>
        </section>

        <section id="controls" className="scroll-mt-24 mt-10">
          <SectionHeading
            num={4}
            desc="A heading, the live state, three mode buttons, a family select and a card. The controls read the instance and change it."
          >
            Add controls
          </SectionHeading>
          <CodeExample
            code={uiHtmlSnippet.code}
            lang={uiHtmlSnippet.lang}
            filename={uiHtmlSnippet.title}
            className="rounded-lg m-0"
          />
          <CodeExample
            code={controlsJsSnippet.code}
            lang={controlsJsSnippet.lang}
            filename={controlsJsSnippet.title}
            className="rounded-lg m-0 mt-3"
          />
          <Callout className="mt-3" variant="tip" title="Handlers run after the page has changed">
            <InlineCode>
              {`The runtime commits a change inside a View Transition, whose update callback runs a task after the store update. Publishing from the store would therefore run a handler while data-theme and the --theme-* variables still described the previous theme — a label or a scoped region would repaint one frame before the page, and a rapid sequence of clicks turned that into visible flicker. The instance publishes from the commit instead, so inside a handler kit.theme, kit.mode and kit.family always match the document.`}
            </InlineCode>
          </Callout>
          <Callout className="mt-3" variant="info" title="data-tv-* is optional, not required">
            <InlineCode>
              {`data-tv-readout, data-tv-pressed and data-tv-select are how a control opts into being correct in the first frame — the same attributes the Vite plugin reconciles. A control without them works; it just starts from its markup and corrects when your module runs.`}
            </InlineCode>
          </Callout>
        </section>

        <section id="styling" className="scroll-mt-24 mt-10">
          <SectionHeading num={5} desc={CANONICAL_STYLES_STEP.desc}>
            {CANONICAL_STYLES_STEP.label}
          </SectionHeading>
          <CodeExample
            code={stylesSnippet.code}
            lang={stylesSnippet.lang}
            filename={stylesSnippet.title}
            className="rounded-lg m-0"
          />
          <Callout className="mt-3" title="This never needs a second stylesheet">
            <InlineCode>{CANONICAL_STYLES_NOTE}</InlineCode>
          </Callout>
        </section>

        <section id="api" className="scroll-mt-24 mt-10">
          <SectionHeading desc="The whole runtime surface is a few getters, setters, methods and events on the instance.">
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
          <div className="mt-8">
            <h3 className="text-sm font-semibold mb-2">a custom catalog</h3>
            <CodeExample
              code={customThemesSnippet.code}
              lang={customThemesSnippet.lang}
              filename={customThemesSnippet.title}
              className="rounded-lg m-0"
            />
            <p className="text-sm opacity-80 leading-relaxed mt-3">
              The definitions are the same shape{" "}
              <InlineCode>{`defineTheme()`}</InlineCode> produces — a name, optional{" "}
              <InlineCode>{`meta.family`}</InlineCode> and{" "}
              <InlineCode>{`meta.mode`}</InlineCode>, and a token set. Because the
              element is read before the first paint, a custom family is painted
              correctly on a reload too.
            </p>
          </div>
        </section>

        <section id="vite" className="scroll-mt-24 mt-10">
          <SectionHeading
            num={6}
            desc="If you do use a bundler, the plugin does the same job with nothing added to your HTML."
          >
            Vite users
          </SectionHeading>
          <CodeExample
            code={viteSnippet.code}
            lang={viteSnippet.lang}
            filename={viteSnippet.title}
            className="rounded-lg m-0"
          />
          <CodeExample
            code={viteConfigSnippet.code}
            lang={viteConfigSnippet.lang}
            filename={viteConfigSnippet.title}
            className="rounded-lg m-0 mt-3"
          />
          <p className="text-sm opacity-80 leading-relaxed mt-3">
            The plugin injects the pre-paint stylesheet, the configuration and the
            blocking script at build time, so the runtime needs no configuration
            either. <InlineCode>{`theme.config.ts`}</InlineCode> can list your own{" "}
            <InlineCode>{`defineTheme()`}</InlineCode> pairs — or, as the example
            application does, <InlineCode>{`getBuiltInThemes()`}</InlineCode>.{" "}
            <InlineCode>{`scrollbar: true`}</InlineCode> additionally hides the native
            scrollbar in the same pre-paint pass, for a page that draws{" "}
            <InlineCode>{`createOverlayScrollbar()`}</InlineCode> — the example does
            both. Do not add the pre-paint script as well: it detects an
            already-painted page and does nothing, but two mechanisms for one job is
            one more thing to explain later.
          </p>
          <Callout className="mt-3" variant="info" title="Transition options live in the same file">
            <InlineCode>
              {`transition: { enabled: false } disables the change animation; { enabled: true, duration: 900, easing: "ease-out" } customizes it. useViewTransition: false swaps the variables with CSS interpolation instead of crossfading the document — which is also the path where preset and properties apply, since a document-wide crossfade has no per-property set to filter. They are part of the transported configuration, so the runtime honours them without any change in your application code, and theme.config.ts is watched: an edit takes effect on the next reload instead of requiring a dev-server restart.`}
            </InlineCode>
          </Callout>
        </section>

        <section id="production" className="scroll-mt-24 mt-10">
          <SectionHeading
            num={7}
            desc="Static paths, script placement, CSP, and the handful of mistakes that produce a flash."
          >
            Production and troubleshooting
          </SectionHeading>

          <p className="text-sm opacity-80 leading-relaxed">
            During development you can serve the project root and let the two tags
            point into <InlineCode>{`node_modules`}</InlineCode>. A deployed site
            cannot, so copy the files into your output:
          </p>
          <CodeExample
            code={productionSnippet.code}
            lang={productionSnippet.lang}
            filename={productionSnippet.title}
            className="rounded-lg m-0 mt-3"
          />

          <ul className="text-sm opacity-80 leading-relaxed list-disc pl-5 space-y-2 mt-4">
            <li>
              <strong>The script must be a classic script in the head.</strong>{" "}
              <InlineCode>{`type="module"`}</InlineCode>,{" "}
              <InlineCode>{`defer`}</InlineCode> and{" "}
              <InlineCode>{`async`}</InlineCode> all move it after the first
              paint, which is exactly the flash it exists to prevent.
            </li>
            <li>
              <strong>The JSON element must come before the script.</strong> The
              script reads it synchronously; placed after, it falls back to the
              built-in catalog and the default selection.
            </li>
            <li>
              <strong>CSP.</strong> A strict{" "}
              <InlineCode>{`script-src`}</InlineCode> without{" "}
              <InlineCode>{`'unsafe-inline'`}</InlineCode> blocks the JSON element,
              because it is a script element even though it holds data. Add a
              nonce or hash for it, or use the Vite plugin, whose injected script
              is covered by the same policy decision.
            </li>
            <li>
              <strong>Do not import the pre-paint script.</strong> It is an IIFE
              with no exports. Loaded as a module it still runs, but after the
              document is parsed — which defeats it.
            </li>
            <li>
              <strong>The storage key is part of the contract.</strong> The
              runtime and the bootstrap read the same key from the same
              declaration. If you pass{" "}
              <InlineCode>{`storageKey`}</InlineCode> to the constructor, declare
              it in the element too, or the runtime writes where the bootstrap
              does not read.
            </li>
            <li>
              <strong>A cold load can paint an empty canvas.</strong> While the
              render-blocking files are still arriving, the browser has nothing to
              paint — the same as for your own stylesheet. The theme is applied in
              the first frame that contains content, and never changes afterwards;
              the verification script in the repository asserts exactly that, with
              the application module blocked.
            </li>
          </ul>
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
              The lightest possible integration — one package, one script tag, one
              class, and no build step.
            </li>
            <li>Theme controls embedded in an admin panel, docs site or widget.</li>
            <li>
              The runtime is identical to the one the framework adapters use
              internally: same token resolution, same persistence, same events.
            </li>
          </ul>
        </section>

        <NextSteps
          className="mt-10"
          steps={[
            {
              title: "Build custom themes",
              description: "Define your own token sets and theme families",
              href: "/custom-themes",
            },
            {
              title: "Zero-flash architecture",
              description: "How the pre-paint pass and the runtime cooperate",
              href: "/zero-flash",
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
