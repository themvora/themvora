/**
 * The Next.js App Router integration.
 *
 * Next.js is the one target that is not Vite, and the differences are not
 * cosmetic:
 *
 * - **`@themvora/next`'s `ThemeProvider` renders `<html>` and `<body>` itself.**
 *   It must be the root of the layout tree and must not be nested inside those
 *   elements, so the generated layout contains neither.
 * - **It has no `initialMode` prop.** It resolves the server render from the
 *   persisted cookie and the fallback theme; passing `initialMode` — which the
 *   React provider *does* have — is a type error and a real bug, so the generated
 *   layout does not pass it. The light default is expressed by naming the light
 *   theme in `defaultTheme`.
 * - **Hooks come from `@themvora/next/client`, not the package root.** The root
 *   export is the server provider; importing `useTheme` from it pulls React into
 *   a server component.
 * - **`components/` sits outside `app/`.** A component directory inside `app/`
 *   would be a route segment, so the interactive parts live beside it.
 *
 * @packageDocumentation
 */
import { generatedHeader, insertImport, planFile } from "../files.js";
import { showcaseClasses } from "./showcase-classes.js";
import { planScaffoldCleanup } from "./shared.js";
import { renderShowcaseCss, renderShowcaseTailwind } from "./showcase-css.js";
import { renderThemesModule } from "./themes-module.js";
import { nextThemeSwitcher, nextThemvoraDefault } from "./showcase/next.js";
import { TAILWIND_POSTCSS_DEV_DEPENDENCIES } from "./tailwind-deps.js";
import {
  viteVerification,
  type FrameworkAdapter,
  type IntegrationContext,
  type IntegrationResult,
  type VerificationContext,
} from "./context.js";
import type { FileOperation, ManualStep, VerificationStep } from "../types.js";

/** The theme module, at the project root beside `app/`. */
const THEMES = "themes/themes.ts";
/** The App Router's global stylesheet. */
const STYLES = "app/globals.css";
/** The showcase, outside `app/` so it is not a route segment. */
const PAGE = "components/ThemvoraDefault.tsx";
const SWITCHER = "components/ThemeSwitcher.tsx";
const POSTCSS = "postcss.config.mjs";
const LAYOUT = "app/layout.tsx";
const ROUTE = "app/page.tsx";

/**
 * The root layout: the provider, which renders the document itself.
 *
 * No route-segment export is needed, and in particular no `instant = false`:
 * `@themvora/next` renders a request-independent document shell and resolves the
 * persisted selection behind a Suspense boundary inside it, so the route is
 * prerenderable under Cache Components. See the package's README.
 */
function renderLayout(): string {
  return `import type { Metadata } from "next";
import { ThemeProvider } from "@themvora/next";

import { defaultTheme, themes } from "../themes/themes";

import "./globals.css";

const transition = { enabled: true, duration: 250, easing: "ease-in-out" };

export const metadata: Metadata = {
  title: "Themvora",
  description: "A themed Next.js application built on Themvora.",
};

/**
 * The root layout.
 *
 * \`ThemeProvider\` renders \`<html>\` and \`<body>\` itself and resolves the
 * server-side theme, so neither element appears here and no bootstrap script is
 * hand-rolled.
 */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider lang="en" themes={themes} defaultTheme={defaultTheme} transition={transition}>
      {children}
    </ThemeProvider>
  );
}
`;
}

/** The home route: a server component that renders the showcase. */
function renderRoute(styling: "css" | "tailwind"): string {
  const c = showcaseClasses(styling);
  return `import ThemvoraDefault from "../components/ThemvoraDefault";

export default function Home() {
  return (
    <main className="${c.appShell}">
      <ThemvoraDefault />
    </main>
  );
}
`;
}

/**
 * The PostCSS configuration Tailwind v4 needs in Next.js.
 *
 * Next has no Vite plugin, so Tailwind runs as a PostCSS plugin. The file is only
 * written for `--styling tailwind`, and only into a project `init` scaffolded —
 * an existing project's PostCSS setup is its own.
 */
function renderPostcssConfig(): string {
  return `${generatedHeader("Tailwind v4 for Next.js.")}export default {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};
`;
}

/** Integrate Themvora into a Next.js App Router project. */
function integrate(context: IntegrationContext): IntegrationResult {
  const files: FileOperation[] = [];
  const manualSteps: ManualStep[] = [];
  const warnings: string[] = [];
  const c = showcaseClasses(context.styling);
  const tailwind = context.styling === "tailwind";
  const fresh = context.projectKind !== "existing";

  const port = {
    adapter: "@themvora/next",
    editPath: "app/page.tsx",
    guideSlug: "next",
    hooksFrom: "@themvora/next/client",
  };

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
      // The scaffold's own `app/globals.css` is the file this replaces, and it
      // has no generated marker — so a fresh scaffold has to be allowed to
      // overwrite it. An existing project's stylesheet is the user's.
      force: fresh || context.force,
    }),
  );

  files.push(
    planFile({
      path: PAGE,
      contents: nextThemvoraDefault(c, port, context.styling),
      existing: context.read(PAGE),
      generated: true,
      reason: "the Themvora showcase",
      force: context.force,
    }),
  );

  files.push(
    planFile({
      path: SWITCHER,
      contents: nextThemeSwitcher(c, port),
      existing: context.read(SWITCHER),
      generated: true,
      reason: "a light/dark control the app can render",
      force: context.force,
    }),
  );

  if (tailwind) {
    files.push(
      planFile({
        path: POSTCSS,
        contents: renderPostcssConfig(),
        existing: context.read(POSTCSS),
        generated: true,
        reason: "Tailwind v4 runs through PostCSS in Next.js",
        force: context.force,
      }),
    );
  }

  if (fresh) {
    files.push(
      planFile({
        path: LAYOUT,
        contents: renderLayout(),
        existing: context.read(LAYOUT),
        generated: true,
        reason: "the root layout, with the server provider as the document shell",
        force: true,
      }),
    );
    files.push(
      planFile({
        path: ROUTE,
        contents: renderRoute(context.styling),
        existing: context.read(ROUTE),
        generated: true,
        reason: "the home route rendering the showcase",
        force: true,
      }),
    );
  } else {
    // A layout is structural: it owns the document shell. Rewriting it is the
    // destructive edit the ownership model forbids, so the user gets the target
    // shape instead.
    manualSteps.push({
      path: LAYOUT,
      instruction:
        "Replace the `<html>`/`<body>` elements with the Themvora provider — it renders them itself, and resolves the initial theme on the server.",
      snippet: `import { ThemeProvider } from "@themvora/next";
import { defaultTheme, themes } from "../themes/themes";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider lang="en" themes={themes} defaultTheme={defaultTheme}>
      {children}
    </ThemeProvider>
  );
}`,
    });

    const layout = context.read(LAYOUT);
    if (layout !== null && !layout.includes("./globals.css")) {
      const next = insertImport(layout, 'import "./globals.css";');
      files.push(
        planFile({
          path: LAYOUT,
          contents: next,
          existing: layout,
          generated: false,
          reason: "import the generated stylesheet",
          force: context.force,
        }),
      );
    }

    manualSteps.push({
      path: ROUTE,
      instruction:
        "Render the generated showcase inside the provider. It is a client component, so it can be placed anywhere in the server tree.",
      snippet:
        'import ThemvoraDefault from "../components/ThemvoraDefault";\n\n// ...in your route:\n<ThemvoraDefault />',
    });
  }

  // The project's caching model is left exactly as the generator wrote it.
  files.push(
    ...planScaffoldCleanup(
      context,
      "next",
      Object.fromEntries(files.map((file) => [file.path, file.contents])),
    ),
  );

  return {
    files,
    manualSteps,
    warnings,
    ...(tailwind
      ? {
          packages: ["@themvora/tailwind"],
          devDependencies: TAILWIND_POSTCSS_DEV_DEPENDENCIES,
        }
      : {}),
  };
}

/**
 * Verification for Next.
 *
 * The checks are the same two the Vite targets run — typecheck where the project
 * declares one, then a production build. The build is the load-bearing one here:
 * it is what proves the server provider renders and the client boundary holds,
 * which is the failure mode a Next integration actually has.
 */
function verification(context: VerificationContext): VerificationStep[] {
  return viteVerification(context, "Next.js");
}

/** The Next.js App Router adapter. */
export const nextAdapter: FrameworkAdapter = {
  id: "next",
  integrate,
  verification,
};
