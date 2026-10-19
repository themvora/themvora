/**
 * The Vue 3 + Vite integration.
 *
 * Three Vue-specific contracts shape the generated code:
 *
 * - **The provider renders its default slot with no wrapper element.** So
 *   `<ThemeProvider>` can sit directly inside `<template>` without changing the
 *   page's layout.
 * - **The component that renders the provider cannot use the composables.** The
 *   runtime is provided during the provider's own `setup`, so a `useTheme()` call
 *   in the same component's setup would inject nothing. The showcase and the
 *   switcher are therefore separate components rendered *inside* the provider.
 * - **`App.vue` composes; it does not contain the showcase.** Keeping the design
 *   in `components/ThemvoraDefault.vue` means replacing the starter is deleting
 *   one file and rendering one component, not unpicking the application root.
 *
 * Initialization is props on the provider — there is no Vite plugin and no
 * `theme.config.ts`.
 *
 * @packageDocumentation
 */
import { generatedHtmlHeader, insertImport, planFile } from "../files.js";
import { showcaseClasses } from "./showcase-classes.js";
import { planScaffoldCleanup } from "./shared.js";
import { renderShowcaseCss, renderShowcaseTailwind } from "./showcase-css.js";
import { renderThemesModule } from "./themes-module.js";
import { vueThemeSwitcher, vueThemvoraDefault } from "./showcase/vue.js";
import { planViteConfig, type ExtraVitePlugin } from "./vite-config.js";
import {
  viteVerification,
  type FrameworkAdapter,
  type IntegrationContext,
  type IntegrationResult,
} from "./context.js";
import type { FileOperation, ManualStep } from "../types.js";

const THEMES = "src/themes/themes.ts";
/** The root stylesheet the `create-vue` scaffold creates. */
const STYLES = "src/style.css";
const PAGE = "src/components/ThemvoraDefault.vue";
const SWITCHER = "src/components/ThemeSwitcher.vue";
const APP = "src/App.vue";
const MAIN = "src/main.ts";

/** Tailwind's Vite plugin, registered only for `--styling tailwind`. */
const TAILWIND_PLUGIN: ExtraVitePlugin = {
  importLine: 'import tailwindcss from "@tailwindcss/vite";',
  call: "tailwindcss()",
};

const PORT = {
  adapter: "@themvora/vue",
  editPath: "src/App.vue",
  guideSlug: "vue",
  hooksFrom: "@themvora/vue",
};

/** The application root: the provider boundary and the showcase inside it. */
function renderApp(styling: "css" | "tailwind"): string {
  const c = showcaseClasses(styling);
  return `${generatedHtmlHeader("The application root.")}<script setup lang="ts">
import { ThemeProvider } from "@themvora/vue";

import ThemvoraDefault from "./components/ThemvoraDefault.vue";
import { defaultTheme, themes } from "./themes/themes";

const transition = { enabled: true, duration: 250, easing: "ease-in-out" };
</script>

<template>
  <ThemeProvider
    :themes="themes"
    :default-theme="defaultTheme"
    initial-mode="light"
    :transition="transition"
  >
    <main class="${c.appShell}">
      <ThemvoraDefault />
    </main>
  </ThemeProvider>
</template>
`;
}

/** Integrate Themvora into a Vue 3 + Vite project. */
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
      contents: vueThemvoraDefault(c, PORT),
      existing: context.read(PAGE),
      generated: true,
      reason: "the Themvora showcase",
      force: context.force,
    }),
  );

  files.push(
    planFile({
      path: SWITCHER,
      contents: vueThemeSwitcher(c, PORT),
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
      snippet: `import ThemvoraDefault from "./components/ThemvoraDefault.vue";

// ...inside <ThemeProvider>:
<ThemvoraDefault />`,
    });
  }

  const main = context.read(MAIN);
  if (main === null) {
    manualSteps.push({
      path: MAIN,
      instruction: "Import the generated stylesheet from your entry module.",
      snippet: 'import "./style.css";',
    });
  } else {
    let next = main;
    let changed = false;

    if (!/["']\.\/style\.css["']/.test(next)) {
      const cssImport = /import\s+['"][^'"]*\.css['"];?/.exec(next)?.[0];
      if (cssImport && fresh) {
        next = next.replace(cssImport, 'import "./style.css";');
      } else {
        next = insertImport(next, 'import "./style.css";');
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
      "vue",
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

/** The Vue 3 + Vite adapter. */
export const vueAdapter: FrameworkAdapter = {
  id: "vue",
  integrate,
  verification: (context) => viteVerification(context, "Vue"),
};
