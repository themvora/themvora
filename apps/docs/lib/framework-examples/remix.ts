import type { FrameworkExamples } from "./types";

/**
 * Remix examples and use cases.
 *
 * Remix owns the document, so the integration cannot render `<html>` for you:
 * the loader resolves the initial state, `ThemeHead` emits the blocking script,
 * `getThemeShellProps()` produces the `<html>` attributes the script will
 * write, and `ThemeProvider` hydrates against the loader's result. Verified
 * against `packages/remix/src` (`server/index.ts`, `shell.ts`,
 * `blocking-script.tsx`, `provider.tsx`).
 */
export const remixExamples: FrameworkExamples = {
  slug: "remix",
  sections: {
    startHere: "The root route owns the runtime",
    useCases: "Loaders, route scopes, and one provider",
    api: "Server exports, hooks, and scopes",
    combining: "The complete root route",
  },
  intro: [
    "Remix is the integration where the app, not the library, writes the document. That changes the shape of the setup: the loader resolves the theme from the request, the root route renders `<html>` with the attributes `getThemeShellProps()` derives, and `ThemeHead` puts the blocking script in `<head>`.",
    "Every piece has to agree, which is why the API is small and opinionated. `ThemeProvider` then hydrates against the loader's `initial` value, so the first client render equals the server's markup and the selection is mirrored back to cookies.",
  ],
  startHere: {
    body: "Four pieces in the root route: a loader that calls `getInitialThemeState()`, `<ThemeHead>` in the document head, `<html>` spread with `getThemeShellProps()`, and `<ThemeProvider>` around `<Outlet />`.",
    note: "`getThemeShellProps()` exists so you never hand-copy the seven attributes the blocking script writes — the script and the server markup come from one function.",
    code: [
      {
        title: "app/root.tsx",
        lang: "tsx",
        code: `import type { LinksFunction, LoaderFunctionArgs } from "@remix-run/node";
import { Links, Meta, Outlet, Scripts, ScrollRestoration } from "@remix-run/react";
import { ThemeProvider } from "@themvora/remix";
import { ThemeHead } from "@themvora/remix";
import { getInitialThemeState } from "@themvora/remix/server";
import { getThemeShellProps } from "@themvora/remix";
import { getBuiltInThemes } from "@themvora/core";

const themes = getBuiltInThemes();

export async function loader({ request }: LoaderFunctionArgs) {
  const initial = await getInitialThemeState({ request, themes, defaultTheme: "mint-light" });
  return { initial };
}

export default function App({ loaderData }: { loaderData: Awaited<ReturnType<typeof loader>> }) {
  const { initial } = loaderData;

  return (
    <html lang="en" {...getThemeShellProps(initial)}>
      <head>
        <Meta />
        <Links />
        <ThemeHead themes={themes} defaultTheme="mint-light" />
      </head>
      <body>
        <ThemeProvider initial={initial} themes={themes} defaultTheme="mint-light">
          <Outlet />
        </ThemeProvider>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}`,
      },
    ],
  },
  categories: [
    {
      id: "server",
      label: "Server",
      intro:
        "These run in the loader and in the document render. Together they decide what the first byte looks like.",
      entries: [
        {
          id: "remix-initial-state",
          name: "getInitialThemeState()",
          covers: ["getInitialThemeState()"],
          what: "Reads the `theme-mode` and `theme-family` cookies off the request and resolves the initial theme state against the registry. Imported from `@themvora/remix/server`.",
          when: "In the root loader, on every request. This is the value the rest of the setup is built around.",
          effect: "Returns the resolved theme and selection. Passing it to `ThemeProvider` is what makes hydration exact rather than approximate.",
          related: ["remix-provider", "remix-shell-props"],
          code: [
            {
              title: "app/root.tsx",
              lang: "tsx",
              code: `import type { LoaderFunctionArgs } from "@remix-run/node";
import { getInitialThemeState } from "@themvora/remix/server";
import { getBuiltInThemes } from "@themvora/core";

const themes = getBuiltInThemes();

export async function loader({ request }: LoaderFunctionArgs) {
  const initial = await getInitialThemeState({
    request,
    themes,
    defaultTheme: "mint-light",
  });

  return { initial };
}`,
            },
          ],
        },
        {
          id: "remix-theme-head",
          name: "ThemeHead",
          covers: ["ThemeHead"],
          what: "Emits the blocking bootstrap script in the document `<head>` so the page paints already themed, plus the `prefers-color-scheme` dark fallback for `system` mode.",
          when: "Once, in the root route's `<head>`. Without it the server markup is themed but a `system` visitor with a dark OS gets a correction frame.",
          effect: "The persisted selection is applied before first paint. `mode` on `ThemeHead` must match `initialMode` on `ThemeProvider`, or the script paints one theme and the runtime corrects it.",
          related: ["remix-initial-state", "remix-provider"],
          code: [
            {
              title: "app/root.tsx",
              lang: "tsx",
              code: `import { ThemeHead } from "@themvora/remix";

<head>
  <Meta />
  <Links />
  <ThemeHead themes={themes} defaultTheme="mint-light" mode="system" />
</head>`,
            },
          ],
        },
        {
          id: "remix-shell-props",
          name: "getThemeShellProps()",
          covers: ["getThemeShellProps()"],
          what: "Produces the `<html>` attributes and CSS variables the blocking script writes, plus `suppressHydrationWarning` for the resolved mode the server cannot know.",
          when: "Always, on the root `<html>`. Remix owns the document, so the shell has to be written by the app — this is what keeps it in agreement with the script instead of hand-copying seven attributes.",
          effect: "The server's `<html>` carries exactly what the script would write, so there is nothing to correct. `{ scrollbar: true }` adds the `tv-scrollbar` class the overlay needs from the first paint.",
          related: ["remix-theme-head", "remix-scrollbar"],
          code: [
            {
              title: "app/root.tsx",
              lang: "tsx",
              code: `import { getThemeShellProps } from "@themvora/remix";

// Attributes, variables and suppressHydrationWarning in one spread.
<html lang="en" {...getThemeShellProps(initial)}>

// With the overlay scrollbar opted in:
<html lang="en" {...getThemeShellProps(initial, { scrollbar: true })}>`,
            },
          ],
        },
        {
          id: "remix-ssr",
          name: "SSR-first resolution",
          covers: ["SSR-first resolution"],
          what: "The full path: request → loader → resolve initial state → HTML document → browser hydration. The server resolves the theme, so the first paint already matches the hydrated client.",
          when: "This is the architecture rather than a call you make. Understanding it is what tells you why `initial` must be threaded through every step.",
          effect: "No flash and no hydration mismatch, provided the loader's value reaches `ThemeProvider` and `getThemeShellProps()`.",
          related: ["remix-initial-state", "remix-provider"],
          code: [
            {
              title: "The chain, in one place",
              lang: "tsx",
              code: `const initial = await getInitialThemeState({ request, themes, defaultTheme: "mint-light" });

<html {...getThemeShellProps(initial)}>

<ThemeHead themes={themes} defaultTheme="mint-light" />

<ThemeProvider initial={initial} themes={themes} defaultTheme="mint-light">`,
            },
          ],
        },
      ],
    },
    {
      id: "client",
      label: "Client",
      intro:
        "The client half hydrates against the loader's result. The hooks come from `@themvora/remix`, which re-exports them so a route never has to reach into a second package.",
      entries: [
        {
          id: "remix-provider",
          name: "ThemeProvider",
          covers: ["ThemeProvider"],
          what: "Hydrates against the loader-resolved `initial` state and mirrors the selection back to cookies on change. Omitting `initial` is flash-free but not hydration-clean, because the server rendered the fallback.",
          when: "Once, in the root route around `<Outlet />`. Nested routes and layouts inherit it.",
          effect: "The first client render equals the server's markup. Selection changes persist to the cookies the loader reads on the next navigation.",
          related: ["remix-initial-state", "remix-persistence"],
          code: [
            {
              title: "app/root.tsx",
              lang: "tsx",
              code: `import { ThemeProvider } from "@themvora/remix";

<ThemeProvider initial={initial} themes={themes} defaultTheme="mint-light">
  <Outlet />
</ThemeProvider>`,
            },
          ],
        },
        {
          id: "remix-persistence",
          name: "createRemixThemePersistence()",
          covers: ["createRemixThemePersistence()"],
          what: "Builds the persistence adapter `ThemeProvider` uses: `localStorage` plus the `theme-mode`, `theme-family` and `theme-fingerprint` cookies the loader reads on the next request.",
          when: "You are constructing the runtime yourself — a shared runtime, a test, or a provider you wrap. The provider wires this for you otherwise.",
          effect: "Selection changes survive reloads and are visible to the loader. The fingerprint rejects a cookie whose theme no longer exists.",
          related: ["remix-provider", "remix-initial-state"],
          code: [
            {
              title: "app/theme-runtime.ts",
              lang: "ts",
              code: `import { createThemeRuntime, getBuiltInThemes } from "@themvora/core";
import { createRemixThemePersistence } from "@themvora/remix";

const themes = getBuiltInThemes();

export const runtime = createThemeRuntime({
  themes,
  defaultTheme: "mint-light",
  persistence: createRemixThemePersistence({ themes }),
});`,
            },
          ],
        },
        {
          id: "remix-hooks",
          name: "Full hook set + ThemeScope",
          covers: ["Full hook set + ThemeScope"],
          what: "The whole hook set — `useTheme()`, `useSetThemeMode()`, `useThemeRuntime()`, history, batch, schedule — plus scoped subtrees. All of it is re-exported from `@themvora/react` through this package, so a route imports from one place and gets the version this integration is built against.",
          when: "Any route component that reads or changes theme state, and any route that needs a scoped region.",
          effect: "Reads and writes behave as they do elsewhere in the app; what sits underneath is the Remix persistence contract, so a selection survives the next navigation.",
          related: ["remix-route-scopes", "remix-provider"],
          code: [
            {
              title: "app/routes/_index.tsx",
              lang: "tsx",
              code: `import { useTheme, useToggleTheme } from "@themvora/remix";

export default function Index() {
  // \`useTheme()\` carries both readings: \`mode\` is what the visitor asked for,
  // \`effectiveMode\` is what is actually painted.
  const { theme, mode, effectiveMode } = useTheme();
  const toggleTheme = useToggleTheme();

  return (
    <main>
      <h1>{theme.name}</h1>
      <p>
        Requested {mode} · showing {effectiveMode}
      </p>
      <button onClick={toggleTheme}>Toggle</button>
    </main>
  );
}`,
            },
          ],
        },
        {
          id: "remix-react-dep",
          name: "Intentional React dependency",
          covers: ["Intentional React dependency"],
          what: "`@themvora/remix` depends on `@themvora/core` and `@themvora/react` directly. Remix is a React framework, so there is no framework-neutral layer to preserve — and no other framework or adapter package is pulled in.",
          when: "Relevant when auditing your dependency tree or deciding where to import from. It explains why this package's surface is the React one.",
          effect: "One React implementation, not a wrapper around a wrapper. The hooks are the same code the React integration ships.",
          related: ["remix-hooks"],
          code: [
            {
              title: "package.json",
              lang: "json",
              code: `{
  "dependencies": {
    "@themvora/core": "workspace:*",
    "@themvora/react": "workspace:*"
  }
}`,
            },
          ],
        },
      ],
    },
    {
      id: "routing",
      label: "Routing",
      intro:
        "Two placement rules that follow from Remix's nested routing: where the provider goes, and where a scope goes.",
      entries: [
        {
          id: "remix-root",
          name: "Provider lives in the root",
          covers: ["Provider lives in the root"],
          what: "`ThemeProvider` is mounted in `app/root.tsx`; nested routes and layouts inherit it through `<Outlet />`.",
          when: "Always. Mounting a provider inside a route gives that route a second runtime, so the header and the page can disagree.",
          effect: "One runtime for the whole app, and one place that decides persistence.",
          related: ["remix-provider", "remix-route-scopes"],
          code: [
            {
              title: "app/root.tsx",
              lang: "tsx",
              code: `<body>
  <ThemeProvider initial={initial} themes={themes} defaultTheme="mint-light">
    <Outlet />
  </ThemeProvider>
  <ScrollRestoration />
  <Scripts />
</body>`,
            },
          ],
        },
        {
          id: "remix-route-scopes",
          name: "Route-level scopes",
          covers: ["Route-level scopes"],
          what: "Wrap a route subtree in `ThemeScope` to pin it to a theme without changing the global selection.",
          when: "A marketing or pricing route that must render in a fixed palette while the app keeps the visitor's choice.",
          effect: "Only the wrapped subtree repaints. The selection is neither read for the scope nor changed by it.",
          related: ["remix-root", "remix-hooks"],
          code: [
            {
              title: "app/routes/pricing.tsx",
              lang: "tsx",
              code: `import { ThemeScope } from "@themvora/remix";

export default function Pricing() {
  return (
    <ThemeScope theme="cocoa-light">
      <h1>Pricing</h1>
      <PricingTable />
    </ThemeScope>
  );
}`,
            },
          ],
        },
      ],
    },
    {
      id: "transition",
      label: "Transition",
      intro:
        "Configured on the root provider. Nested routes inherit the runtime, so there is one transition setting for the whole app.",
      entries: [
        {
          id: "remix-transition",
          name: "transition",
          covers: ["transition prop"],
          what: "Enables and configures the cross-fade applied when the theme changes — duration, easing, preset, animated properties.",
          when: "Leave the default on; tune it when a large surface feels slow, or disable it for an app that must repaint instantly.",
          effect: "Theme changes animate; the DOM writes still happen in one flush.",
          related: ["remix-suppress-transition", "remix-provider"],
          code: [
            {
              title: "app/root.tsx",
              lang: "tsx",
              code: `<ThemeProvider
  initial={initial}
  themes={themes}
  defaultTheme="mint-light"
  transition={{ enabled: true, duration: 250, easing: "ease-in-out" }}
>
  <Outlet />
</ThemeProvider>`,
            },
          ],
        },
        {
          id: "remix-suppress-transition",
          name: "runtime.store.set(theme, { suppressTransition: true })",
          covers: ["runtime.store.set(theme, { suppressTransition: true })"],
          what: "Applies one theme change immediately, skipping the configured animation for that update only.",
          when: "A print path, a screenshot, or a programmatic reset where animating would look like a glitch.",
          effect: "That change is instant; later changes animate again.",
          related: ["remix-transition", "remix-hooks"],
          code: [
            {
              title: "app/routes/settings.tsx",
              lang: "tsx",
              code: `import { useThemeRuntime } from "@themvora/remix";

export default function Settings() {
  const runtime = useThemeRuntime();

  function reset() {
    const light = runtime.themes.find((theme) => theme.name === "mint-light");
    if (!light) return;
    runtime.store.set(light, { suppressTransition: true });
  }

  return <button onClick={reset}>Reset appearance</button>;
}`,
            },
          ],
        },
      ],
    },
    {
      id: "scrollbar",
      label: "Scrollbar",
      intro:
        "The overlay needs two things from the server: a class on `<html>` and a pre-paint stylesheet. Miss either and the native bar is painted first.",
      entries: [
        {
          id: "remix-scrollbar",
          name: "scrollbar",
          covers: ["scrollbar prop"],
          what: "Passing `scrollbar` to `ThemeHead` hides the native scrollbar from the very first paint and hands over to Themvora's overlay engine once the runtime hydrates.",
          when: "A custom scrollbar is part of the design. Without the pre-paint half the page paints a native bar and then replaces it.",
          effect: "No native-bar flash. The overlay follows runtime theme changes.",
          related: ["remix-scrollbar-css", "remix-shell-props"],
          code: [
            {
              title: "app/root.tsx",
              lang: "tsx",
              code: `<head>
  <ThemeHead themes={themes} defaultTheme="mint-light" scrollbar />
</head>`,
            },
          ],
        },
        {
          id: "remix-scrollbar-css",
          name: "Import the pre-paint styles",
          covers: ["Import the pre-paint styles"],
          what: "The overlay needs `import \"@themvora/core/scrollbar.css\"` plus the `tv-scrollbar` class on `<html>`. `getThemeShellProps(initial, { scrollbar: true })` renders that class.",
          when: "Always, together with the `scrollbar` prop. Both halves are required — the class without the stylesheet hides nothing, and the stylesheet without the class has no effect.",
          effect: "The native bar is hidden before the first paint instead of after hydration.",
          related: ["remix-scrollbar", "remix-shell-props"],
          code: [
            {
              title: "app/root.tsx",
              lang: "tsx",
              code: `import "@themvora/core/scrollbar.css";

<html lang="en" {...getThemeShellProps(initial, { scrollbar: true })}>`,
            },
          ],
        },
      ],
    },
  ],
  recipes: [
    {
      id: "root-wiring",
      title: "Wire the root route once, correctly",
      problem:
        "The pieces are individually documented but only work together: a loader, a head script, shell attributes and a provider that all have to agree on the same resolution.",
      apis: ["getInitialThemeState()", "ThemeHead", "getThemeShellProps()", "ThemeProvider"],
      why: "Each piece consumes the same `initial` value, so there is exactly one resolution per request. That is what removes both the flash and the hydration mismatch.",
      expect:
        "Reloading with any persisted selection paints that selection immediately, and no component reports a hydration mismatch.",
      caveats:
        "`ThemeHead`'s `mode` and `ThemeProvider`'s `initialMode` must match. Leaving them out of step produces a wrong-theme flash, not a crash.",
      code: [
        {
          title: "app/root.tsx",
          lang: "tsx",
          code: `import type { LinksFunction, LoaderFunctionArgs } from "@remix-run/node";
import { Links, Meta, Outlet, Scripts, ScrollRestoration } from "@remix-run/react";
import { ThemeHead, ThemeProvider, getThemeShellProps } from "@themvora/remix";
import { getInitialThemeState } from "@themvora/remix/server";
import { getBuiltInThemes } from "@themvora/core";

const themes = getBuiltInThemes();

export async function loader({ request }: LoaderFunctionArgs) {
  const initial = await getInitialThemeState({ request, themes, defaultTheme: "mint-light" });
  return { initial };
}

export default function App({ loaderData }: { loaderData: Awaited<ReturnType<typeof loader>> }) {
  const { initial } = loaderData;

  return (
    <html lang="en" {...getThemeShellProps(initial)}>
      <head>
        <Meta />
        <Links />
        <ThemeHead themes={themes} defaultTheme="mint-light" mode="system" />
      </head>
      <body>
        <ThemeProvider initial={initial} themes={themes} defaultTheme="mint-light">
          <Outlet />
        </ThemeProvider>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}`,
        },
      ],
    },
    {
      id: "mode-toggle",
      title: "A mode toggle that reports the truth",
      problem:
        "The toggle's icon says light while the page is dark, because the selection is `system`.",
      apis: ["useTheme()", "useSetThemeMode()"],
      why: "`effectiveMode` is the applied appearance and moves with the page; `mode` is the standing request. A label needs the first.",
      expect:
        "Icon and label always match the page; a click pins an explicit mode so a `system` visitor stops following the OS.",
      code: [
        {
          title: "app/components/ModeToggle.tsx",
          lang: "tsx",
          code: `import { useSetThemeMode, useTheme } from "@themvora/remix";

export function ModeToggle() {
  // Both readings come off \`useTheme()\`: @themvora/remix re-exports the React
  // hook set, and the separate \`useEffectiveThemeMode()\` hook is not one of the
  // names it re-exports.
  const { mode, effectiveMode } = useTheme();
  const setMode = useSetThemeMode();
  const next = effectiveMode === "dark" ? "light" : "dark";

  return (
    <button
      onClick={() => setMode(next)}
      aria-pressed={effectiveMode === "dark"}
      aria-label={\`Switch to \${next} mode\`}
    >
      {effectiveMode === "dark" ? "🌙 Dark" : "☀️ Light"}
      {mode === "system" ? " (auto)" : null}
    </button>
  );
}`,
        },
      ],
    },
    {
      id: "scoped-preview",
      title: "Preview families without switching to them",
      problem:
        "A gallery should show each family before the visitor commits, without repainting the whole page per preview.",
      apis: ["ThemeScope", "useProvidedThemes()", "useSetThemeFamily()"],
      why: "`ThemeScope` writes the scoped variables onto its own wrapper. Inside a route it sits under the root provider, so a preview reads the same registry the page does — without the global selection moving.",
      expect:
        "Each card renders in its own family; clicking one commits the choice through the setter.",
      code: [
        {
          title: "app/routes/themes.tsx",
          lang: "tsx",
          code: `import {
  ThemeScope,
  useProvidedThemes,
  useSetThemeFamily,
} from "@themvora/remix";

export default function Themes() {
  const families = useProvidedThemes();
  const setFamily = useSetThemeFamily();

  return (
    <div>
      {families.map((f) => (
      <button key={f.family} onClick={() => setFamily(f.family)}>
        <ThemeScope family={f.family}>
          <strong>{f.family}</strong>
          <p>The quick brown fox</p>
        </ThemeScope>
      </button>
    ))}
    </div>
  );
}`,
        },
      ],
    },
  ],
  combining: [
    {
      id: "full-root",
      title: "A complete root route",
      body: "The wiring recipe with the optional pieces switched on: transitions, the overlay scrollbar and its pre-paint stylesheet.",
      code: [
        {
          title: "app/root.tsx",
          lang: "tsx",
          code: `import "@themvora/core/scrollbar.css";
import { ThemeHead, ThemeProvider, getThemeShellProps } from "@themvora/remix";
import { getInitialThemeState } from "@themvora/remix/server";
import { getBuiltInThemes } from "@themvora/core";

const themes = getBuiltInThemes();

export async function loader({ request }: LoaderFunctionArgs) {
  const initial = await getInitialThemeState({ request, themes, defaultTheme: "mint-light" });
  return { initial };
}

export default function App({ loaderData }: { loaderData: Awaited<ReturnType<typeof loader>> }) {
  const { initial } = loaderData;

  return (
    <html lang="en" {...getThemeShellProps(initial, { scrollbar: true })}>
      <head>
        <Meta />
        <Links />
        <ThemeHead themes={themes} defaultTheme="mint-light" scrollbar />
      </head>
      <body>
        <ThemeProvider
          initial={initial}
          themes={themes}
          defaultTheme="mint-light"
          transition={{ enabled: true, duration: 250 }}
        >
          <Outlet />
        </ThemeProvider>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}`,
        },
      ],
    },
  ],
  notAvailable: [
    {
      name: "A server-component `ThemeProvider` that renders `<html>`",
      reason:
        "Remix owns the document, so this package cannot render `<html>` for you. The equivalent is the loader + `ThemeHead` + `getThemeShellProps()` combination above.",
    },
    {
      name: "createThemeRoot()",
      reason:
        "Not exported here, and not usable: an SSR app must hydrate the server's markup rather than mount a fresh root over it.",
    },
  ],
};
