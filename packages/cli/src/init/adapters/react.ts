/**
 * The React + Vite integration.
 *
 * The generated app is a plain client-rendered Vite project running the Themvora
 * showcase. Four contracts from the shipped packages shape it:
 *
 * - **`<ThemeProvider>` in `main.tsx`.** The React provider is flash-free by
 *   itself: it applies the resolved theme to `<html>` before the first paint, so
 *   a client-rendered app needs neither a plugin nor a bootstrap helper. The
 *   registry and the initial configuration arrive as props.
 * - **Exactly one provider.** It is established in `main.tsx`; nothing below
 *   mounts a second.
 * - **The showcase lives in components.** `App` composes; `ThemvoraDefault` owns
 *   the page; `ThemeSwitcher` owns the toggle; `themes/themes.ts` owns the theme
 *   data.
 * - **One stylesheet.** `src/index.css`, whose contents the styling choice
 *   decides.
 *
 * @packageDocumentation
 */
import { generatedHeader, insertImport, planFile } from "../files.js";
import { showcaseClasses } from "./showcase-classes.js";
import { planScaffoldCleanup } from "./shared.js";
import { renderShowcaseCss, renderShowcaseTailwind } from "./showcase-css.js";
import { renderThemesModule } from "./themes-module.js";
import { reactThemeSwitcher, reactThemvoraDefault } from "./showcase/react.js";
import { planViteConfig, type ExtraVitePlugin } from "./vite-config.js";
import {
  viteVerification,
  type FrameworkAdapter,
  type IntegrationContext,
  type IntegrationResult,
} from "./context.js";
import type { FileOperation, ManualStep } from "../types.js";

/** The theme-definition module. */
const THEMES = "src/themes/themes.ts";
/** The global stylesheet. Both styling variants use this path. */
const STYLES = "src/index.css";
/** The showcase page. */
const PAGE = "src/components/ThemvoraDefault.tsx";
/** The light/dark control. */
const SWITCHER = "src/components/ThemeSwitcher.tsx";
/** The application root, replaced only in a scaffold Themvora created. */
const APP = "src/App.tsx";
/** The entry module, replaced in a scaffold and edited in an existing project. */
const MAIN = "src/main.tsx";

/** Tailwind's Vite plugin, registered only for `--styling tailwind`. */
const TAILWIND_PLUGIN: ExtraVitePlugin = {
  importLine: 'import tailwindcss from "@tailwindcss/vite";',
  call: "tailwindcss()",
};

/** The values the showcase renderers interpolate for React. */
const PORT = {
  adapter: "@themvora/react",
  editPath: "src/App.tsx",
  guideSlug: "react",
  hooksFrom: "@themvora/react",
};

/** The application root: the shell around the showcase. */
function renderApp(styling: "css" | "tailwind"): string {
  const c = showcaseClasses(styling);
  return `${generatedHeader("The application root.")}import ThemvoraDefault from "./components/ThemvoraDefault";

export function App() {
  return (
    <main className="${c.appShell}">
      <ThemvoraDefault />
    </main>
  );
}
`;
}

/**
 * The entry module.
 *
 * @param fresh - Whether Themvora scaffolded this project.
 * @param existing - The current `main.tsx`, when there is one.
 * @returns The file's intended contents, or `null` when it cannot be rewritten.
 *
 * @remarks
 * In a project Themvora scaffolded the entry module is ours, so it is replaced
 * wholesale with the standard `createRoot` mount wrapped in `<ThemeProvider>`.
 * In an existing project the module is the user's and only the stylesheet import
 * is added; the provider wiring is reported as a manual step, because replacing
 * someone's root would discard whatever else they compose there.
 */
function renderMain(fresh: boolean, existing: string | null): string | null {
  if (!fresh) {
    if (existing === null) return null;
    return /["']\.\/index\.css["']/.test(existing)
      ? existing
      : insertImport(existing, 'import "./index.css";');
  }

  return `import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ThemeProvider } from "@themvora/react";

import { App } from "./App";
import { defaultTheme, themes } from "./themes/themes";
import "./index.css";

/**
 * Mount the application.
 *
 * \`ThemeProvider\` is the one provider boundary, and it is flash-free on its
 * own: it applies the resolved theme to \`<html>\` before the first paint, so
 * there is no empty-root frame to cover and no plugin to register. The theme
 * registry and the initial configuration are passed as props.
 *
 * Rendering on the server instead? \`createThemeRoot\` is the documented entry
 * for that — see the React guide. A client-rendered app does not need it.
 */
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider
      themes={themes}
      defaultTheme={defaultTheme}
      initialMode="light"
      transition={{ enabled: true, duration: 250, easing: "ease-in-out" }}
    >
      <App />
    </ThemeProvider>
  </StrictMode>,
);
`;
}

/** Integrate Themvora into a React + Vite project. */
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
      reason: tailwind
        ? "Tailwind entry point and semantic utilities"
        : "semantic showcase styles",
      // The scaffold's own `src/index.css` is the file this replaces, and it has
      // no generated marker — so a fresh scaffold has to be allowed to overwrite
      // it. An existing project's stylesheet is the user's and is not touched
      // without `--force`.
      force: fresh || context.force,
    }),
  );

  files.push(
    planFile({
      path: PAGE,
      contents: reactThemvoraDefault(c, PORT),
      existing: context.read(PAGE),
      generated: true,
      reason: "the Themvora showcase",
      force: context.force,
    }),
  );

  files.push(
    planFile({
      path: SWITCHER,
      contents: reactThemeSwitcher(c, PORT),
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
        reason: "the application shell around the showcase",
        force: true,
      }),
    );
  } else {
    manualSteps.push({
      path: APP,
      instruction:
        "Render the generated showcase inside your theme provider, so it is a descendant of the provider rather than its parent.",
      snippet: `import ThemvoraDefault from "./components/ThemvoraDefault";

// ...in your root component:
<ThemvoraDefault />`,
    });
  }

  const main = renderMain(fresh, context.read(MAIN));
  if (main === null) {
    manualSteps.push({
      path: MAIN,
      instruction:
        "Mount the application with the Themvora provider. Pass the registry from `./themes/themes` and import the stylesheet.",
      snippet: `import { ThemeProvider } from "@themvora/react";
import { defaultTheme, themes } from "./themes/themes";
import "./index.css";

// ...around your root element:
<ThemeProvider
  themes={themes}
  defaultTheme={defaultTheme}
  initialMode="light"
  transition={{ enabled: true, duration: 250, easing: "ease-in-out" }}
>
  <App />
</ThemeProvider>`,
    });
  } else {
    files.push(
      planFile({
        path: MAIN,
        contents: main,
        existing: context.read(MAIN),
        generated: fresh,
        reason: fresh
          ? "mount the app with the theme runtime"
          : "import the stylesheet",
        // The scaffold's own entry module is the file this replaces in a fresh
        // project, and it carries no generated marker — so without this the plan
        // reports a conflict and the project keeps mounting a bare `<App />`.
        force: fresh || context.force,
      }),
    );
  }

  // No `themvoraVitePlugin()`: the provider owns initialization through props
  // and is flash-free on its own, so the plugin has nothing left to do.
  // Tailwind's plugin is the only one added here.
  const vite = planViteConfig(context, tailwind ? [TAILWIND_PLUGIN] : []);
  if ("manual" in vite) manualSteps.push(vite.manual);
  else files.push(vite.file);

  files.push(
    ...planScaffoldCleanup(
      context,
      "react",
      Object.fromEntries(files.map((file) => [file.path, file.contents])),
    ),
  );

  return {
    files,
    manualSteps,
    warnings: [],
    ...(tailwind
      ? {
          packages: ["@themvora/tailwind"],
          devPackages: ["tailwindcss", "@tailwindcss/vite"],
        }
      : {}),
  };
}

/** The React + Vite adapter. */
export const reactAdapter: FrameworkAdapter = {
  id: "react",
  integrate,
  verification: (context) => viteVerification(context, "React"),
};
