/**
 * The Svelte 5 + Vite integration.
 *
 * Svelte's provider renders its children directly at the anchor — no wrapper
 * element — and takes its subtree as a plain snippet, which is the shape the
 * shipped playground uses. The generated components follow the same conventions:
 * runes-era event attributes (`onclick`, not `on:click`) and `$store`
 * auto-subscription for the readable stores `useTheme()` returns.
 *
 * Components live in `src/components/`, and `App.svelte` is the provider boundary
 * that composes the showcase rather than containing it. Initialization is props
 * on the provider — there is no Vite plugin and no `theme.config.ts`.
 *
 * @packageDocumentation
 */
import { generatedHtmlHeader, insertImport, planFile } from "../files.js";
import { showcaseClasses } from "./showcase-classes.js";
import { planScaffoldCleanup } from "./shared.js";
import { renderShowcaseCss, renderShowcaseTailwind } from "./showcase-css.js";
import { renderThemesModule } from "./themes-module.js";
import { svelteThemeSwitcher, svelteThemvoraDefault } from "./showcase/svelte.js";
import { planViteConfig, type ExtraVitePlugin } from "./vite-config.js";
import {
  viteVerification,
  type FrameworkAdapter,
  type IntegrationContext,
  type IntegrationResult,
} from "./context.js";
import type { FileOperation, ManualStep } from "../types.js";

const THEMES = "src/themes/themes.ts";
/** The root stylesheet the Vite Svelte template creates. */
const STYLES = "src/app.css";
const PAGE = "src/components/ThemvoraDefault.svelte";
const SWITCHER = "src/components/ThemeSwitcher.svelte";
const APP = "src/App.svelte";
const MAIN = "src/main.ts";

/** Tailwind's Vite plugin, registered only for `--styling tailwind`. */
const TAILWIND_PLUGIN: ExtraVitePlugin = {
  importLine: 'import tailwindcss from "@tailwindcss/vite";',
  call: "tailwindcss()",
};

const PORT = {
  adapter: "@themvora/svelte",
  editPath: "src/App.svelte",
  guideSlug: "svelte",
  hooksFrom: "@themvora/svelte",
};

/** The application root: the provider boundary and the showcase inside it. */
function renderApp(styling: "css" | "tailwind"): string {
  const c = showcaseClasses(styling);
  return `${generatedHtmlHeader("The application root.")}<script lang="ts">
  import { ThemeProvider } from "@themvora/svelte";

  import ThemvoraDefault from "./components/ThemvoraDefault.svelte";
  import { defaultTheme, themes } from "./themes/themes";

  const transition = { enabled: true, duration: 250, easing: "ease-in-out" };
</script>

<ThemeProvider {themes} {defaultTheme} initialMode="light" {transition}>
  <main class="${c.appShell}">
    <ThemvoraDefault />
  </main>
</ThemeProvider>
`;
}

/** Integrate Themvora into a Svelte 5 + Vite project. */
function integrate(context: IntegrationContext): IntegrationResult {
  const files: FileOperation[] = [];
  const manualSteps: ManualStep[] = [];
  const c = showcaseClasses(context.styling);
  const tailwind = context.styling === "tailwind";
  const fresh = context.projectKind !== "existing";

  files.push(
    planFile({
      path: THEMES,
      contents: renderThemesModule(context.themes, context.source),
      existing: context.read(THEMES),
      generated: true,
      reason: "the custom theme pair and the selected presets",
      force: context.force,
    }),
  );

  files.push(
    planFile({
      path: STYLES,
      contents: tailwind ? renderShowcaseTailwind() : renderShowcaseCss(),
      existing: context.read(STYLES),
      generated: true,
      reason: tailwind ? "Tailwind entry point and semantic utilities" : "semantic showcase styles",
      // The scaffold's own root stylesheet is the file this replaces, and it has
      // no generated marker — so a fresh scaffold has to be allowed to overwrite
      // it. An existing project's stylesheet is the user's.
      force: fresh || context.force,
    }),
  );

  files.push(
    planFile({
      path: PAGE,
      contents: svelteThemvoraDefault(c, PORT),
      existing: context.read(PAGE),
      generated: true,
      reason: "the Themvora showcase",
      force: context.force,
    }),
  );

  files.push(
    planFile({
      path: SWITCHER,
      contents: svelteThemeSwitcher(c, PORT),
      existing: context.read(SWITCHER),
      generated: true,
      reason: "a light/dark control the app can render",
      force: context.force,
    }),
  );

  if (fresh) {
    files.push(
      planFile({
        path: APP,
        contents: renderApp(context.styling),
        existing: context.read(APP),
        generated: true,
        reason: "the application root and its single provider boundary",
        force: true,
      }),
    );
  } else {
    manualSteps.push({
      path: APP,
      instruction:
        "Render the generated showcase inside your provider. It must be a descendant of the provider, not its parent.",
      snippet: `import ThemvoraDefault from "./components/ThemvoraDefault.svelte";

<!-- ...inside <ThemeProvider>: -->
<ThemvoraDefault />`,
    });
  }

  const main = context.read(MAIN);
  if (main === null) {
    manualSteps.push({
      path: MAIN,
      instruction: "Import the generated stylesheet from your entry module.",
      snippet: 'import "./app.css";',
    });
  } else {
    let next = main;
    let changed = false;

    if (!/["']\.\/app\.css["']/.test(next)) {
      const cssImport = /import\s+['"][^'"]*\.css['"];?/.exec(next)?.[0];
      if (cssImport && fresh) {
        next = next.replace(cssImport, 'import "./app.css";');
      } else {
        next = insertImport(next, 'import "./app.css";');
      }
      changed = true;
    }

    files.push(
      planFile({
        path: MAIN,
        contents: next,
        existing: main,
        generated: false,
        reason: changed ? "import the stylesheet" : "entry module",
        force: context.force,
      }),
    );
  }

  const vite = planViteConfig(context, tailwind ? [TAILWIND_PLUGIN] : []);
  if ("manual" in vite) manualSteps.push(vite.manual);
  else files.push(vite.file);

  files.push(
    ...planScaffoldCleanup(
      context,
      "svelte",
      Object.fromEntries(files.map((file) => [file.path, file.contents])),
    ),
  );

  return {
    files,
    manualSteps,
    warnings: [],
    ...(tailwind
      ? { packages: ["@themvora/tailwind"], devPackages: ["tailwindcss", "@tailwindcss/vite"] }
      : {}),
  };
}

/** The Svelte 5 + Vite adapter. */
export const svelteAdapter: FrameworkAdapter = {
  id: "svelte",
  integrate,
  verification: (context) => viteVerification(context, "Svelte"),
};
