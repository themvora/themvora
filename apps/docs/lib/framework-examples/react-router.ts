import type { FrameworkExamples } from "./types";

/**
 * React Router Framework Mode examples.
 *
 * Framework Mode's root route owns the document and runs a loader for each
 * request. `createThemeDocument()` turns one static configuration into the
 * loader helper and the document component, so the head script, `<html>` shell
 * and runtime cannot drift apart.
 *
 * Verified against `packages/remix/src/document.tsx` and
 * `examples/apps/react-router` (react-router 8.5.1).
 */
export const reactRouterExamples: FrameworkExamples = {
  slug: "react-router",
  sections: {
    startHere: "One configuration, then the root route",
    useCases: "Loaders, layout, and runtime",
    api: "The document integration",
    combining: "Navigation and persistence",
  },
  intro: [
    "React Router Framework Mode is not Remix v2: the root route still owns `<html>` and runs a loader, but route modules use `react-router`, `app/routes.ts` and the generated `Route` types. This integration follows those conventions; the `@remix-run/*` imports in the Remix guide do not apply here.",
    "The root file declares the theme configuration once. `createThemeDocument()` derives `resolveInitial(request)` and a `Document` component from that object, so the blocking script in `<head>`, the attributes on `<html>` and the provider inside `<body>` always describe the same resolution.",
  ],
  startHere: {
    body: "Declare the registry, fallback theme, mode and scrollbar option once. Export the root loader from the helper, then render `theming.Document` in `Layout` and keep `app/routes.ts` as the Framework Mode route config.",
    note: "`Document` accepts the framework's own head and body-end slots, so `<Meta />`, `<Links />`, `<ScrollRestoration />` and `<Scripts />` remain owned by the app.",
    code: [
      {
        title: "app/root.tsx",
        lang: "tsx",
        code: `import type { ReactNode } from "react";
import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useRouteLoaderData,
} from "react-router";
import { getBuiltInThemes } from "@themvora/core";
import "@themvora/core/scrollbar.css";
import { ThemeScrollbar } from "@themvora/remix";
import { createThemeDocument } from "@themvora/remix/react-router";
import type { Route } from "./+types/root";

const themes = getBuiltInThemes();

const theming = createThemeDocument({
  themes,
  defaultTheme: "light",
  mode: "system",
  scrollbar: true,
});

export async function loader({ request }: Route.LoaderArgs) {
  return { theme: await theming.resolveInitial(request) };
}

export function Layout({ children }: { children: ReactNode }) {
  const data = useRouteLoaderData<typeof loader>("root");

  return (
    <theming.Document
      initial={data?.theme}
      htmlProps={{ lang: "en" }}
      head={[<Meta key="meta" />, <Links key="links" />]}
      afterContent={<><ScrollRestoration /><Scripts /></>}
    >
      {children}
    </theming.Document>
  );
}

export default function App() {
  return (
    <>
      <ThemeScrollbar />
      <Outlet />
    </>
  );
}`,
      },
      {
        title: "app/routes.ts",
        lang: "ts",
        code: `import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("about", "routes/about.tsx"),
] satisfies RouteConfig;`,
      },
    ],
  },
  categories: [
    {
      id: "server",
      label: "Server",
      intro:
        "These run in the root loader and the server render. Together they decide what the first byte contains.",
      entries: [
        {
          id: "rr-create-document",
          name: "createThemeDocument()",
          covers: ["createThemeDocument()"],
          what: "Takes the registry, fallback theme, mode, family, scrollbar option and explicit override once, and returns `resolveInitial`, `Document`, `Provider`, the frozen `config` and the static `fallback`.",
          when: "At module scope in `app/root.tsx`. It is the only theme configuration the app needs.",
          effect: "Every layer reads the same values. Changing `defaultTheme`, `mode`, the registry or `scrollbar` changes the loader result, the head script, the shell and the provider together.",
          related: ["rr-resolve-initial", "rr-provider"],
          code: [
            {
              title: "app/root.tsx",
              lang: "tsx",
              code: `import { createThemeDocument } from "@themvora/remix/react-router";
import { getBuiltInThemes } from "@themvora/core";

const themes = getBuiltInThemes();

const theming = createThemeDocument({
  themes,
  defaultTheme: "light",
  mode: "system",
  scrollbar: true,
});`,
            },
          ],
        },
        {
          id: "rr-resolve-initial",
          name: "theming.resolveInitial()",
          covers: ["theming.resolveInitial()"],
          what: "Reads the request's `theme-mode`, `theme-family` and `theme-fingerprint` cookies and resolves them against the configuration returned by the factory.",
          when: "In the root loader, once per document request. The result is the only request-specific theme state.",
          effect: "Two concurrent requests with different cookies resolve independently; nothing is stored on the shared handle.",
          related: ["rr-create-document", "rr-ssr-chain"],
          code: [
            {
              title: "app/root.tsx",
              lang: "tsx",
              code: `import type { Route } from "./+types/root";

export async function loader({ request }: Route.LoaderArgs) {
  return { theme: await theming.resolveInitial(request) };
}`,
            },
          ],
        },
        {
          id: "rr-ssr-chain",
          name: "SSR-first resolution",
          covers: ["SSR-first resolution"],
          what: "The static configuration plus the request cookies produce `initial`, which the shell and provider both receive. The blocking script applies the same persisted selection before the app hydrates.",
          when: "This is the architecture of every document request, not a call you make.",
          effect: "The first paint already carries the resolved theme. Hydration starts from a DOM that agrees with the server render.",
          related: ["rr-resolve-initial", "rr-root-owner"],
          code: [
            {
              title: "The chain",
              lang: "tsx",
              code: `const initial = await theming.resolveInitial(request);

<theming.Document initial={initial}>
  {children}
</theming.Document>`,
            },
          ],
        },
      ],
    },
    {
      id: "client",
      label: "Client",
      intro:
        "The document mounts the runtime. Route components read and change it through the shared React hooks.",
      entries: [
        {
          id: "rr-provider",
          name: "ThemeProvider",
          covers: ["ThemeProvider"],
          what: "`Document` mounts the provider around its children with the request-resolved state, the same registry and the same mode. The standalone `Provider` is available when a tree needs the runtime without the document.",
          when: "Use `Document` in the root layout. Use `theming.Provider` only in a harness that renders the provider outside the document.",
          effect: "The first client render equals the server markup; later selection changes mirror back to cookies.",
          related: ["rr-create-document", "rr-hooks"],
          code: [
            {
              title: "app/root.tsx",
              lang: "tsx",
              code: `<theming.Document initial={data?.theme}>
  {children}
</theming.Document>`,
            },
          ],
        },
        {
          id: "rr-hooks",
          name: "Full hook set + ThemeScope",
          covers: ["Full hook set + ThemeScope"],
          what: "The React hook set and `ThemeScope` are re-exported through `@themvora/remix`, so a route imports the version this integration was built against.",
          when: "Any route that reads or changes the selection, and any route that needs a scoped region.",
          effect: "Reads are reactive and writes persist through the same cookie contract the root loader reads on the next request.",
          related: ["rr-provider", "rr-scope"],
          code: [
            {
              title: "app/routes/home.tsx",
              lang: "tsx",
              code: `import { useTheme } from "@themvora/remix";

export default function Home() {
  const { theme, mode, effectiveMode, setMode, toggleTheme } = useTheme();

  return (
    <main>
      <p>{theme.name} · requested {mode} · showing {effectiveMode}</p>
      <button onClick={() => setMode("dark")}>Dark</button>
      <button onClick={toggleTheme}>Toggle</button>
    </main>
  );
}`,
            },
          ],
        },
        {
          id: "rr-persistence",
          name: "createRemixThemePersistence()",
          covers: ["createRemixThemePersistence()"],
          what: "Builds the persistence adapter the provider uses: localStorage plus the `theme-mode` / `theme-family` / `theme-fingerprint` cookies. The exported name is historical and the adapter is framework-neutral.",
          when: "When you construct the runtime yourself; `Document` wires it automatically otherwise.",
          effect: "A selection survives reloads and is visible to the next root loader call.",
          related: ["rr-provider", "rr-resolve-initial"],
          code: [
            {
              title: "app/theme-runtime.ts",
              lang: "ts",
              code: `import { createThemeRuntime, getBuiltInThemes } from "@themvora/core";
import { createRemixThemePersistence } from "@themvora/remix";

const themes = getBuiltInThemes();

export const runtime = createThemeRuntime({
  themes,
  defaultTheme: "light",
  persistence: createRemixThemePersistence(themes, "light"),
});`,
            },
          ],
        },
      ],
    },
    {
      id: "routing",
      label: "Routing",
      intro:
        "React Router keeps ownership of the document and the route tree; the integration only supplies the theme-owned pieces.",
      entries: [
        {
          id: "rr-root-owner",
          name: "Root route owns the document",
          covers: ["Root route owns the document"],
          what: "`Layout` still renders the document through `Document`, which places the blocking script first in `<head>`, renders the theme attributes on `<html>`, and mounts the provider in `<body>`.",
          when: "Always. Do not render a second `<html>`, `<head>` or `<body>` in a route.",
          effect: "Framework head and body-end slots keep their normal place; theme attributes are coordinated rather than hand-copied.",
          related: ["rr-provider", "rr-error-fallback"],
          code: [
            {
              title: "app/root.tsx",
              lang: "tsx",
              code: `<theming.Document
  initial={data?.theme}
  head={[<Meta key="meta" />, <Links key="links" />]}
  afterContent={<><ScrollRestoration /><Scripts /></>}
>
  {children}
</theming.Document>`,
            },
          ],
        },
        {
          id: "rr-scope",
          name: "Route-level scopes",
          covers: ["Route-level scopes"],
          what: "Wrap a route subtree in `ThemeScope` to pin it to a theme without moving the global selection.",
          when: "A marketing or pricing route that must render in a fixed palette.",
          effect: "Only the wrapped subtree repaints; the root loader state and cookies are untouched.",
          related: ["rr-hooks", "rr-root-owner"],
          code: [
            {
              title: "app/routes/pricing.tsx",
              lang: "tsx",
              code: `import { ThemeScope } from "@themvora/remix";

export default function Pricing() {
  return (
    <ThemeScope theme="plum-dark">
      <h1>Pricing</h1>
    </ThemeScope>
  );
}`,
            },
          ],
        },
        {
          id: "rr-error-fallback",
          name: "Error-boundary fallback",
          covers: ["Error-boundary fallback"],
          what: "The root `Layout` can render while the root loader has no data. `Document` treats a missing `initial` as the configuration's static fallback instead of throwing inside the error boundary.",
          when: "Read root data with `useRouteLoaderData<typeof loader>(\"root\")` and pass `data?.theme`.",
          effect: "The error boundary renders with a valid theme instead of a second failure.",
          related: ["rr-root-owner", "rr-create-document"],
          code: [
            {
              title: "app/root.tsx",
              lang: "tsx",
              code: `import { useRouteLoaderData } from "react-router";

export function Layout({ children }: { children: React.ReactNode }) {
  const data = useRouteLoaderData<typeof loader>("root");

  // data is undefined on an error path; Document uses its static fallback.
  return (
    <theming.Document initial={data?.theme}>
      {children}
    </theming.Document>
  );
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
        "The overlay needs two things from the server: a class on `<html>` and a pre-paint stylesheet.",
      entries: [
        {
          id: "rr-scrollbar-option",
          name: "scrollbar option",
          covers: ["scrollbar option"],
          what: "`scrollbar: true` in the configuration adds `tv-scrollbar` to `<html>` and emits the pre-paint hiding stylesheet in `<head>`.",
          when: "A custom scrollbar is part of the design. Without it the native bar is painted first and replaced after hydration.",
          effect: "The native bar never appears; the overlay engine takes over once the runtime mounts.",
          related: ["rr-scrollbar-css", "rr-root-owner"],
          code: [
            {
              title: "app/root.tsx",
              lang: "tsx",
              code: `import { getBuiltInThemes } from "@themvora/core";

const themes = getBuiltInThemes();

const theming = createThemeDocument({
  themes,
  defaultTheme: "light",
  scrollbar: true,
});`,
            },
          ],
        },
        {
          id: "rr-scrollbar-css",
          name: "Import the pre-paint styles",
          covers: ["Import the pre-paint styles"],
          what: "Import `@themvora/core/scrollbar.css` and render `ThemeScrollbar` inside the provider. `Document` renders the `tv-scrollbar` class for you.",
          when: "Always, together with `scrollbar: true`. The class scopes the stylesheet; the stylesheet hides the native bar.",
          effect: "The native bar is hidden before the first paint rather than after hydration.",
          related: ["rr-scrollbar-option"],
          code: [
            {
              title: "app/root.tsx",
              lang: "tsx",
              code: `import "@themvora/core/scrollbar.css";
import { ThemeScrollbar } from "@themvora/remix";

export default function App() {
  return (
    <>
      <ThemeScrollbar />
      <Outlet />
    </>
  );
}`,
            },
          ],
        },
      ],
    },
  ],
  recipes: [
    {
      id: "rr-first-request",
      title: "Get the first request right",
      problem:
        "The sample root looks correct but the theme configuration is repeated in the loader, the head script and the provider. One changed value leaves the others behind.",
      apis: ["createThemeDocument()", "theming.resolveInitial()", "ThemeProvider"],
      why: "The factory owns the static values and derives every layer from them. The loader only adds the request-specific resolution.",
      expect:
        "Changing `defaultTheme`, `mode`, the registry or `scrollbar` is a one-line edit that updates the loader result, the script, the shell and the runtime together.",
      code: [
        {
          title: "app/root.tsx",
          lang: "tsx",
          code: `import { getBuiltInThemes } from "@themvora/core";

const themes = getBuiltInThemes();

const theming = createThemeDocument({
  themes,
  defaultTheme: "mint-light",
  mode: "system",
  scrollbar: true,
});

export async function loader({ request }: Route.LoaderArgs) {
  return { theme: await theming.resolveInitial(request) };
}`,
        },
      ],
    },
  ],
  combining: [
    {
      id: "rr-navigation",
      title: "Navigation and persistence",
      body: "The root loader resolves the theme on the document request. Client-side navigation reuses the mounted provider, and a changed selection is mirrored to cookies so the next document request resolves it again.",
      code: [
        {
          title: "app/routes/about.tsx",
          lang: "tsx",
          code: `import { Link } from "react-router";
import type { Route } from "./+types/about";

export function meta({}: Route.MetaArgs) {
  return [{ title: "About" }];
}

export default function About() {
  return (
    <main>
      <h1>About this setup</h1>
      <Link to="/">Back to the demo</Link>
    </main>
  );
}`,
        },
      ],
    },
  ],
  notAvailable: [
    {
      name: "A framework-neutral `<html>` component",
      reason:
        "React Router owns the document lifecycle. `Document` participates in it; it does not replace the root route.",
    },
    {
      name: "`createThemeRoot()`",
      reason:
        "A React-SPA-only synchronous bootstrap. Framework Mode already owns the first commit and the server render.",
    },
  ],
};
