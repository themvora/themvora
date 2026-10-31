import type { FrameworkExamples } from "./types";

/**
 * Next.js examples and use cases.
 *
 * The App Router integration is a server component that owns `<html>`,
 * `<head>` and `<body>`, so most of this page is about the server/client
 * boundary: what the server resolves, what the blocking script paints, and
 * what the client runtime adopts. Contracts verified against
 * `packages/next/src/layout.tsx`, `provider.tsx`, `theme-bootstrap.tsx` and
 * `client.ts`.
 */
export const nextExamples: FrameworkExamples = {
  slug: "next",
  sections: {
    startHere: "The server renders the document",
    useCases: "First byte, route overrides, honest labels",
    api: "Server, client, transitions, scrollbar",
    combining: "The root layout, end to end",
  },
  intro: [
    "Next.js is the integration where the first paint is decided on the server. `ThemeProvider` reads the theme cookies during the request, renders `<html data-theme>` with the resolved variables already inlined, and emits a blocking script that keeps the client from correcting what the server painted.",
    "That split drives the whole page: the server-side exports control the shell and the bootstrap, the client-side ones control live selection, and the transition and scrollbar options have to be configured where each half can see them.",
  ],
  startHere: {
    body: "The root layout is the only required file. `ThemeProvider` renders the document elements itself, so `app/layout.tsx` returns it instead of `<html>` — putting your own `<html>` around it produces two roots and the theme lands on the wrong one.",
    note: "Because the provider is a server component, `defaultTheme` and the persisted cookie are resolved before the response is sent. There is no flash to fix afterwards.",
    code: [
      {
        title: "app/layout.tsx",
        lang: "tsx",
        code: `import type { ReactNode } from "react";
import { ThemeProvider } from "@themvora/next";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider defaultTheme="mint-light" lang="en">
      {children}
    </ThemeProvider>
  );
}`,
      },
      {
        title: "app/page.tsx",
        lang: "tsx",
        code: `import { ThemeModeButton } from "@themvora/next/client";

export default function Page() {
  return (
    <main>
      <h1>Server-rendered, already themed</h1>
      <ThemeModeButton />
    </main>
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
        "The server half decides what the first byte looks like. Everything here runs during the request, so it can read cookies but cannot see `prefers-color-scheme`.",
      entries: [
        {
          id: "next-server-provider",
          name: "ThemeProvider (Server Component)",
          covers: ["ThemeProvider (Server Component)"],
          what: "A server component that reads the `theme-mode`, `theme-family` and `theme-fingerprint` cookies, validates the fingerprint against the current registry, resolves the initial theme, and renders `<html data-theme>` with the theme's CSS variables inlined. It mounts the client runtime for you.",
          when: "Once, in `app/layout.tsx`. This is the whole setup — there is no separate client provider to add.",
          effect: "The HTML that reaches the browser already carries the right theme and variables. Hydration attaches handlers to markup that is already correct.",
          related: ["next-client-provider", "next-bootstrap-script"],
          code: [
            {
              title: "app/layout.tsx",
              lang: "tsx",
              code: `import type { ReactNode } from "react";
import { ThemeProvider } from "@themvora/next";
import { getBuiltInThemes } from "@themvora/core";

const themes = getBuiltInThemes();

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider themes={themes} defaultTheme="mint-light" font="Inter, sans-serif">
      {children}
    </ThemeProvider>
  );
}`,
            },
            {
              title: "Forcing a theme for one route group",
              lang: "tsx",
              code: `// \`themeOverride\` is resolved on the server *and* in the browser, so the shell,
// the blocking script and the hydrated runtime all paint the same theme. It is
// never written to the cookies, so it does not stick after the visitor leaves.
<ThemeProvider defaultTheme="mint-light" themeOverride="plum-dark">
  {children}
</ThemeProvider>`,
            },
          ],
        },
        {
          id: "next-bootstrap-script",
          name: "Blocking bootstrap script",
          covers: ["Blocking bootstrap script"],
          what: "A blocking `<script>` in `<head>` that re-applies the persisted selection before the body is parsed. It exists because the server cannot know `prefers-color-scheme` when the mode is `system`.",
          when: "Always on — it is emitted by `ThemeProvider`, not configured. It matters most for `initialMode=\"system\"`, where the server's guess can be wrong for the visitor.",
          effect: "A dark-preferring visitor with `system` selected gets a dark first paint instead of a light flash corrected by script.",
          related: ["next-dark-fallback", "next-server-provider"],
          code: [
            {
              title: "What the head ends up containing",
              lang: "html",
              code: `<!-- Emitted by ThemeProvider; you do not write this. -->
<script>
  (function () {
    var d = document.documentElement;
    var mode = "system";
    var prefersDark = matchMedia("(prefers-color-scheme: dark)").matches;
    d.dataset.themeMode = mode === "system" ? (prefersDark ? "dark" : "light") : mode;
    d.classList.toggle("dark", d.dataset.themeMode === "dark");
  })();
</script>`,
            },
          ],
        },
        {
          id: "next-dark-fallback",
          name: "Dark-mode CSS fallback",
          covers: ["Dark-mode CSS fallback"],
          what: "When the persisted mode is `system`, the server also emits an `@media (prefers-color-scheme: dark)` block carrying the dark theme's variables, so the browser can pick the right palette without waiting for script.",
          when: "Automatic. It is what makes `system` correct on the very first paint in browsers that block scripts or apply the media query before the script runs.",
          effect: "No inline variable outranks the dark block: the light variables are emitted for the light scheme and the dark ones only inside the media query.",
          related: ["next-bootstrap-script", "next-scheduled"],
          code: [
            {
              title: "What the server emits for system mode",
              lang: "css",
              code: `/* Inlined in <head> by the server provider when the mode is \`system\`. */
:root {
  --theme-color-background: #ffffff;
  --theme-color-foreground: #0b0b0c;
}

@media (prefers-color-scheme: dark) {
  :root {
    --theme-color-background: #0b0b0c;
    --theme-color-foreground: #f5f5f6;
  }
}`,
            },
          ],
        },
        {
          id: "next-scheduled",
          name: "scheduled",
          covers: ["scheduled prop"],
          what: "Passes sunrise/sunset scheduling to the client runtime while the server still resolves the initial theme, so the page is themed before the schedule takes over.",
          when: "The appearance should follow daylight. The server cannot compute a schedule (no clock for the visitor, no location), so it resolves the cookie selection and the client schedule activates afterwards.",
          effect: "The first paint matches the persisted selection; from hydration onward the theme follows the visitor's local sunrise and sunset. `useThemeSchedule()` becomes non-null in client components.",
          related: ["next-use-schedule", "next-dark-fallback"],
          code: [
            {
              title: "app/layout.tsx",
              lang: "tsx",
              code: `import { ThemeProvider } from "@themvora/next";

<ThemeProvider
  defaultTheme="mint-light"
  scheduled={{ lightTheme: "mint-light", darkTheme: "mint-dark" }}
>
  {children}
</ThemeProvider>;`,
            },
          ],
        },
      ],
    },
    {
      id: "client",
      label: "Client",
      intro:
        "The client half reads the runtime the server mounted. Use these from files marked `\"use client\"`.",
      entries: [
        {
          id: "next-client-entry",
          name: "@themvora/next/client",
          covers: ["@themvora/next/client"],
          what: "The client entry point: `ClientThemeProvider`, `ThemeBootstrap`, `createNextThemePersistence`, every React hook, and `ThemeScope` / `ThemeInspector` / `ThemeModeButton`.",
          when: "Any file that needs theme state in the browser — a switcher, a readout, a scoped panel. Import from this path rather than `@themvora/react` so the persistence contract stays the Next one (cookies plus `localStorage`).",
          effect: "Hooks resolve the runtime the server provider mounted. Importing hooks from `@themvora/react` also works at runtime, but you lose the guarantee that the import is client-safe.",
          related: ["next-client-provider", "next-server-provider"],
          code: [
            {
              title: "app/theme-switcher.tsx",
              lang: "tsx",
              code: `"use client";

import { useTheme } from "@themvora/next/client";

export function ThemeSwitcher() {
  const { theme, effectiveMode, toggleTheme } = useTheme();
  return (
    <button onClick={toggleTheme}>
      {theme.name} · {effectiveMode}
    </button>
  );
}`,
            },
          ],
        },
        {
          id: "next-client-provider",
          name: "ClientThemeProvider",
          covers: ["ClientThemeProvider"],
          what: "The runtime for client components: mounts the runtime, syncs the `.dark` class and persists the selection. `ThemeProvider` (the server one) mounts it internally.",
          when: "Only when you own the document shell yourself — a Pages Router app, a test harness, or a layout that cannot use the server provider. In the App Router you already have it.",
          effect: "Theme state becomes available below it, and changes mirror back to the cookies the server reads on the next request.",
          related: ["next-client-entry", "next-persistence"],
          code: [
            {
              title: "Mounting the client runtime without the server shell",
              lang: "tsx",
              code: `"use client";

import { ClientThemeProvider } from "@themvora/next/client";
import { getBuiltInThemes } from "@themvora/core";

const themes = getBuiltInThemes();

export function Providers({ initial, children }: {
  initial: Parameters<typeof ClientThemeProvider>[0]["initial"];
  children: React.ReactNode;
}) {
  return (
    <ClientThemeProvider initial={initial} themes={themes} defaultTheme="mint-light">
      {children}
    </ClientThemeProvider>
  );
}`,
            },
          ],
        },
        {
          id: "next-theme-bootstrap",
          name: "ThemeBootstrap",
          covers: ["ThemeBootstrap"],
          what: "Injects the SSR dark-mode CSS through `useServerInsertedHTML`. It is the client-side half of the `system` fallback described above.",
          when: "Needed only when you mount `ClientThemeProvider` yourself — the App Router `ThemeProvider` already renders it.",
          effect: "The `prefers-color-scheme` block is inserted into the streamed HTML rather than being lost between server render and hydration.",
          related: ["next-dark-fallback", "next-client-provider"],
          code: [
            {
              title: "Paired with a manual client provider",
              lang: "tsx",
              code: `import { ThemeBootstrap, ClientThemeProvider } from "@themvora/next/client";
import { getBuiltInThemes } from "@themvora/core";

const themes = getBuiltInThemes();

export function Shell({ initial, children }: { initial: never; children: React.ReactNode }) {
  return (
    <ClientThemeProvider initial={initial} themes={themes}>
      <ThemeBootstrap themes={themes} initial={initial} />
      {children}
    </ClientThemeProvider>
  );
}`,
            },
          ],
        },
        {
          id: "next-persistence",
          name: "createNextThemePersistence()",
          covers: ["createNextThemePersistence()"],
          what: "Builds the persistence adapter `ClientThemeProvider` uses: `localStorage` for the browser plus the `theme-mode`, `theme-family` and `theme-fingerprint` cookies the server reads on the next request.",
          when: "You are constructing a runtime yourself and need Next's cookie contract — for example a runtime shared with a non-React widget on the same page.",
          effect: "Selection changes survive reloads and are visible to the server on the next navigation. The fingerprint rejects a cookie whose theme no longer exists instead of resolving a missing theme.",
          related: ["next-client-provider", "next-server-provider"],
          code: [
            {
              title: "app/theme-runtime.ts",
              lang: "ts",
              code: `import { createThemeRuntime, getBuiltInThemes } from "@themvora/core";
import { createNextThemePersistence } from "@themvora/next/client";

const themes = getBuiltInThemes();

export const runtime = createThemeRuntime({
  themes,
  defaultTheme: "mint-light",
  persistence: createNextThemePersistence({ themes }),
});`,
            },
          ],
        },
        {
          id: "next-use-schedule",
          name: "useThemeSchedule()",
          covers: ["useThemeSchedule()"],
          what: "The reactive sunrise/sunset controller: `enabled`, `active`, `status`, `sunrise`, `sunset`, `nextTransition` plus `enable()`/`disable()`/`set()`. Returns `null` when the provider has no `scheduled` option.",
          when: "A settings row that turns daylight following on or off, or a readout of the next automatic switch.",
          effect: "State reads update as the sun moves. The hook is SSR-safe: it renders the empty state on the server and adopts the live one after mount.",
          related: ["next-scheduled", "next-client-entry"],
          code: [
            {
              title: "app/daylight-toggle.tsx",
              lang: "tsx",
              code: `"use client";

import { useThemeSchedule } from "@themvora/next/client";

export function DaylightToggle() {
  const schedule = useThemeSchedule();
  if (!schedule) return null;

  return (
    <label>
      <input
        type="checkbox"
        checked={schedule.enabled}
        onChange={(e) => (e.target.checked ? schedule.enable() : schedule.disable())}
      />
      Follow daylight
    </label>
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
        "A server render cannot animate anything, so the first paint arrives already themed and the cross-fade applies from the first client-side switch onward.",
      entries: [
        {
          id: "next-transition",
          name: "transition",
          covers: ["transition prop"],
          what: "Configures the cross-fade applied when the theme changes. The runtime generates the transition styles, so the app does not need theme-transition rules in `globals.css`.",
          when: "Leave the default on; tune it when a large surface feels slow, or disable it for an app that must repaint instantly.",
          effect: "Theme changes animate. Because the option is live, changing it after mount changes the next transition without a reload.",
          related: ["next-suppress-transition", "next-server-provider"],
          code: [
            {
              title: "app/layout.tsx",
              lang: "tsx",
              code: `import { ThemeProvider } from "@themvora/next";

<ThemeProvider
  defaultTheme="mint-light"
  transition={{ enabled: true, duration: 250, easing: "ease-in-out" }}
>
  {children}
</ThemeProvider>;`,
            },
          ],
        },
        {
          id: "next-suppress-transition",
          name: "runtime.store.set(theme, { suppressTransition: true })",
          covers: ["runtime.store.set(theme, { suppressTransition: true })"],
          what: "Applies one theme change immediately, skipping the configured animation for that update only.",
          when: "A route transition, a print path, or a programmatic reset where animating would look like a glitch.",
          effect: "That one change is instant; subsequent changes animate again with the configured options.",
          related: ["next-transition", "next-client-entry"],
          code: [
            {
              title: "app/reset-theme.tsx",
              lang: "tsx",
              code: `"use client";

import { useThemeRuntime } from "@themvora/next/client";
import { getBuiltInThemes } from "@themvora/core";

export function ResetTheme() {
  const runtime = useThemeRuntime();

  function reset() {
    const fallback = getBuiltInThemes()[0];
    // Instant: a reset should not look like a deliberate theme change.
    runtime.store.set(fallback, { suppressTransition: true });
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
        "The overlay scrollbar has to exist before the first paint, otherwise the native bar is painted and then replaced. On Next.js that means opting in on the server.",
      entries: [
        {
          id: "next-scrollbar-prop",
          name: "scrollbar",
          covers: ["scrollbar prop"],
          what: "Enables Themvora's overlay scrollbar from the first paint: the server emits the `tv-scrollbar` class and a blocking style that hides the native bar, and the overlay engine takes over once the runtime hydrates.",
          when: "A custom scrollbar is part of the design. Without the server half the page paints a native bar for a frame, which is more distracting than having no custom scrollbar at all.",
          effect: "No native-scrollbar flash on load. The overlay stays theme-aware and follows runtime theme changes.",
          related: ["next-scrollbar-option", "next-server-provider"],
          code: [
            {
              title: "app/layout.tsx",
              lang: "tsx",
              code: `import { ThemeProvider } from "@themvora/next";

<ThemeProvider defaultTheme="mint-light" scrollbar>
  {children}
</ThemeProvider>;`,
            },
          ],
        },
        {
          id: "next-scrollbar-option",
          name: "scrollbar options",
          covers: ["scrollbar option"],
          what: "Configures the overlay from semantic tokens — thickness, radius, colours, auto-hide — instead of hand-written CSS.",
          when: "The default overlay is too subtle or too heavy for the design, or the app needs an explicit colour token rather than the derived one.",
          effect: "The overlay is built from the options on the server and rebuilt when they change; it keeps following the active theme.",
          related: ["next-scrollbar-prop"],
          code: [
            {
              title: "app/layout.tsx",
              lang: "tsx",
              code: `import { ThemeProvider } from "@themvora/next";

<ThemeProvider
  defaultTheme="mint-light"
  scrollbar={{ thickness: 10, radius: 999, autoHide: true }}
>
  {children}
</ThemeProvider>;`,
            },
          ],
        },
      ],
    },
  ],
  recipes: [
    {
      id: "ssr-first-paint",
      title: "Guarantee a themed first byte",
      problem:
        "A dashboard is server-rendered but still flashes the default theme for a frame on reload, and the theme switcher label changes text after hydration.",
      apis: ["ThemeProvider (Server Component)", "Blocking bootstrap script", "Dark-mode CSS fallback"],
      why: "The server resolves the cookie selection and inlines the variables, so the HTML is already correct. The blocking script only handles the one case the server cannot decide — `system` with a dark-preferring visitor.",
      expect:
        "Reloading with a persisted theme paints that theme immediately. No React hydration mismatch on any component that renders the theme name or mode.",
      caveats:
        "The cookies are the contract. A client-only persistence layer (plain `localStorage`) would leave the server rendering the fallback every request.",
      code: [
        {
          title: "app/layout.tsx",
          lang: "tsx",
          code: `import type { ReactNode } from "react";
import { ThemeProvider } from "@themvora/next";
import { getBuiltInThemes } from "@themvora/core";

const themes = getBuiltInThemes();

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider themes={themes} defaultTheme="mint-light">
      {children}
    </ThemeProvider>
  );
}`,
        },
      ],
    },
    {
      id: "route-scoped-theme",
      title: "Pin one route to its own theme",
      problem:
        "The marketing route must render in the brand theme regardless of what the signed-in app has selected, without changing the visitor's preference.",
      apis: ["ThemeScope", "@themvora/next/client"],
      why: "`ThemeScope` writes the scoped variables onto its own wrapper and never touches the global selection, so the route looks branded while the rest of the app keeps the visitor's choice.",
      expect:
        "The route renders in the pinned theme; navigating back shows the previous selection unchanged.",
      caveats:
        "A scope is markup, not a selection: it does not persist and does not affect `useTheme()` inside it unless the consumer reads the scoped binding.",
      code: [
        {
          title: "app/(marketing)/layout.tsx",
          lang: "tsx",
          code: `import { ThemeScope } from "@themvora/next/client";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return <ThemeScope theme="cocoa-light">{children}</ThemeScope>;
}`,
        },
      ],
    },
    {
      id: "client-readout",
      title: "Show the mode that is actually applied",
      problem:
        "The header icon says \"light\" while the page is dark, because the selection is `system` and the visitor's OS is dark.",
      apis: ["useTheme()", "@themvora/next/client"],
      why: "`useTheme()` exposes `effectiveMode` alongside `mode`; the icon must read the first, and only a control that changes the selection should care about the second.",
      expect:
        "The icon matches the page in every case — system, explicit mode, and after a sunrise/sunset transition.",
      code: [
        {
          title: "app/appearance-icon.tsx",
          lang: "tsx",
          code: `"use client";

import { useTheme } from "@themvora/next/client";

export function AppearanceIcon() {
  const { mode, effectiveMode } = useTheme();
  return (
    <span title={mode === "system" ? "Following the system" : undefined}>
      {effectiveMode === "dark" ? "🌙" : "☀️"}
    </span>
  );
}`,
        },
      ],
    },
  ],
  combining: [
    {
      id: "full-shell",
      title: "A complete root layout",
      body: "The shell the rest of this page assumes: server-resolved theme, transitions on, the overlay scrollbar opted in, and a client switcher rendered inside it.",
      code: [
        {
          title: "app/layout.tsx",
          lang: "tsx",
          code: `import type { ReactNode } from "react";
import { ThemeProvider } from "@themvora/next";
import { getBuiltInThemes } from "@themvora/core";
import { ThemeSwitcher } from "./theme-switcher";

const themes = getBuiltInThemes();

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider
      themes={themes}
      defaultTheme="mint-light"
      transition={{ enabled: true, duration: 250 }}
      scrollbar
    >
      <header>
        <ThemeSwitcher />
      </header>
      {children}
    </ThemeProvider>
  );
}`,
        },
      ],
    },
    {
      id: "two-halves",
      title: "Where each import belongs",
      body: "The most common Next.js mistake is importing a hook in a server component. The rule is mechanical: `@themvora/next` for the document shell, `@themvora/next/client` for anything with `\"use client\"`.",
      code: [
        {
          title: "app/layout.tsx — server",
          lang: "tsx",
          code: `import { ThemeProvider } from "@themvora/next"; // server component, owns <html>`,
        },
        {
          title: "app/theme-switcher.tsx — client",
          lang: "tsx",
          code: `"use client";

import { ThemeModeButton } from "@themvora/next/client"; // hooks need a client boundary`,
        },
      ],
    },
  ],
  notAvailable: [
    {
      name: "createThemeRoot()",
      reason:
        "Not exported here, and not usable: an SSR app must hydrate the server's markup. Mounting a fresh root over server-rendered HTML is the flash the integration exists to prevent.",
    },
  ],
};
