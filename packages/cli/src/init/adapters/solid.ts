/**
 * The Solid + Vite integration.
 *
 * The showcase lives in `src/components/` and `App.tsx` is the provider boundary
 * that composes it. Initialization is props on the provider — there is no Vite
 * plugin and no `theme.config.ts`.
 *
 * Three Solid-specific contracts shape the generated code, and all three were
 * found by building the generated project rather than by reading the types:
 *
 * - **JSX uses `class`, not React's `className`.** Solid's JSX type declarations
 *   expose `class` on intrinsic elements; `className` is accepted at runtime as an
 *   alias but is **not declared**, so a component using it fails `tsc --noEmit`.
 * - **`useTheme()` returns signals, not values.** The components keep the
 *   accessors intact and call them (`theme().name`); reading `theme.name` would
 *   freeze the value at first render.
 * - **`onClick`, not `on:click`** — Solid uses delegated DOM event props.
 *
 * @packageDocumentation
 */
import { generatedHeader, insertImport, planFile } from "../files.js";
import { showcaseClasses } from "./showcase-classes.js";
import { planScaffoldCleanup } from "./shared.js";
import { renderShowcaseCss, renderShowcaseTailwind } from "./showcase-css.js";
import { renderThemesModule } from "./themes-module.js";
import { solidThemeSwitcher, solidThemvoraDefault } from "./showcase/solid.js";
import { planViteConfig, type ExtraVitePlugin } from "./vite-config.js";
import { TAILWIND_VITE_DEV_DEPENDENCIES } from "./tailwind-deps.js";
import {
  viteVerification,
  type FrameworkAdapter,
  type IntegrationContext,
  type IntegrationResult,
} from "./context.js";
import type { FileOperation, ManualStep } from "../types.js";

const THEMES = "src/themes/themes.ts";
/** The root stylesheet the Solid Vite template creates. */
const STYLES = "src/index.css";
const PAGE = "src/components/ThemvoraDefault.tsx";
const SWITCHER = "src/components/ThemeSwitcher.tsx";
const APP = "src/App.tsx";
const ENTRY = "src/index.tsx";

/** Tailwind's Vite plugin, registered only for `--styling tailwind`. */
const TAILWIND_PLUGIN: ExtraVitePlugin = {
  importLine: 'import tailwindcss from "@tailwindcss/vite";',
  call: "tailwindcss()",
};

const PORT = {
  adapter: "@themvora/solid",
  editPath: "src/App.tsx",
  guideSlug: "solid",
  hooksFrom: "@themvora/solid",
};

/** The application root: the provider boundary and the showcase inside it. */
function renderApp(styling: "css" | "tailwind"): string {
  const c = showcaseClasses(styling);
  return `${generatedHeader("The application root.")}import { ThemeProvider } from "@themvora/solid";

import ThemvoraDefault from "./components/ThemvoraDefault";
import { defaultTheme, themes } from "./themes/themes";

const transition = { enabled: true, duration: 250, easing: "ease-in-out" };

export default function App() {
  return (
    <ThemeProvider themes={themes} defaultTheme={defaultTheme} initialMode="light" transition={transition}>
      <main class="${c.appShell}">
        <ThemvoraDefault />
      </main>
    </ThemeProvider>
  );
}
`;
}

/** Integrate Themvora into a Solid + Vite project. */
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
      contents: solidThemvoraDefault(c, PORT, context.styling),
      existing: context.read(PAGE),
      generated: true,
      reason: "the Themvora showcase",
      force: context.force,
    }),
  );

  files.push(
    planFile({
      path: SWITCHER,
      contents: solidThemeSwitcher(c, PORT),
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
        "Wrap your application root in the Themvora provider, then render the showcase inside it.",
      snippet: `import { ThemeProvider } from "@themvora/solid";
import ThemvoraDefault from "./components/ThemvoraDefault";
import { defaultTheme, themes } from "./themes/themes";

// ...in your root component:
<ThemeProvider themes={themes} defaultTheme={defaultTheme} initialMode="light">
  <ThemvoraDefault />
</ThemeProvider>`,
    });
  }

  const entry = context.read(ENTRY);
  if (entry === null) {
    manualSteps.push({
      path: ENTRY,
      instruction: "Import the generated stylesheet from your entry module.",
      snippet: 'import "./index.css";',
    });
  } else {
    let next = entry;
    let changed = false;

    if (!/["']\.\/index\.css["']/.test(next)) {
      const cssImport = /import\s+['"][^'"]*\.css['"];?/.exec(next)?.[0];
      if (cssImport && fresh) {
        next = next.replace(cssImport, 'import "./index.css";');
      } else {
        next = insertImport(next, 'import "./index.css";');
      }
      changed = true;
    }

    files.push(
      planFile({
        path: ENTRY,
        contents: next,
        existing: entry,
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
      "solid",
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
          devDependencies: TAILWIND_VITE_DEV_DEPENDENCIES,
        }
      : {}),
  };
}

/** The Solid + Vite adapter. */
export const solidAdapter: FrameworkAdapter = {
  id: "solid",
  integrate,
  verification: (context) => viteVerification(context, "Solid"),
};
