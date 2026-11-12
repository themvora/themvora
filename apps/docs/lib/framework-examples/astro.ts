import type { FrameworkExamples } from "./types";

/**
 * Astro examples and use cases.
 *
 * Astro is the integration with the most distinct surface — native components,
 * a framework-neutral browser controller, a delegated attribute contract, and
 * an optional React island — because it is the only one that can theme a page
 * with no client framework at all. Verified against `packages/astro/src` and
 * the `.astro` components shipped from that package.
 */
export const astroExamples: FrameworkExamples = {
  slug: "astro",
  sections: {
    startHere: "Add the integration",
    useCases: "Pages that ship no framework JavaScript",
    api: "Integration, components, islands",
    combining: "A full layout, then pick your level",
  },
  intro: [
    "Astro is the only integration where a themed, switchable page can ship no client framework at all. The provider renders the themed `<html>` on the server, `<ThemeToggle />` and `<ThemeFamilySelect />` are real elements with no hydration, and `getThemeController()` is a plain object any `<script>` can use.",
    "That gives three levels you can stop at: server-rendered theming only (zero JavaScript), native controls plus a small runtime script, or a React island when a component genuinely needs React. The page is organised in that order.",
  ],
  startHere: {
    body: "Add the integration to `astro.config.mjs` and put the provider around the document. `themvora()` finds `theme.config.ts` at the project root and derives the pre-paint bootstrap and the runtime configuration from it — nothing is repeated in the config file.",
    note: "The provider must wrap `<html>` itself: it server-renders the themed document element from the request cookies, which it cannot do if it is nested inside one.",
    code: [
      {
        title: "astro.config.mjs",
        lang: "ts",
        code: `import { defineConfig } from "astro/config";
import { themvora } from "@themvora/astro";

export default defineConfig({
  integrations: [themvora()],
});`,
      },
      {
        title: "theme.config.ts",
        lang: "ts",
        code: `import { defineThemvoraConfig, getBuiltInThemes } from "@themvora/core";

export default defineThemvoraConfig({
  themes: getBuiltInThemes(),
  defaultTheme: "mint-light",
});`,
      },
      {
        title: "src/layouts/Base.astro",
        lang: "astro",
        code: `---
import Provider from "@themvora/astro/provider.astro";
import ThemeToggle from "@themvora/astro/ThemeToggle.astro";
---

<Provider>
  <slot />
  <ThemeToggle showMode />
</Provider>`,
      },
    ],
  },
  categories: [
    {
      id: "integration",
      label: "Astro integration",
      intro:
        "The integration decides what goes into `<head>` and what the runtime is configured with. All of it is derived from `theme.config.ts`.",
      entries: [
        {
          id: "astro-integration",
          name: "themvora() in astro.config.mjs",
          covers: ["themvora() in astro.config.mjs"],
          what: "Registers the integration and injects the pre-paint bootstrap into every page's `<head>` with `injectScript(\"head-inline\")`.",
          when: "Once, in `astro.config.mjs`. Without it nothing is injected and the page relies on the runtime to apply the theme after it loads.",
          effect: "Every page gets the blocking bootstrap. The provider adopts what that script painted instead of starting from the default.",
          related: ["astro-config-discovery", "astro-bootstrap"],
          code: [
            {
              title: "astro.config.mjs",
              lang: "ts",
              code: `import { defineConfig } from "astro/config";
import { themvora } from "@themvora/astro";

export default defineConfig({
  integrations: [themvora({ navigation: true })],
});`,
            },
          ],
        },
        {
          id: "astro-config-discovery",
          name: "theme.config.ts discovery",
          covers: ["theme.config.ts discovery"],
          what: "`themvora()` finds `theme.config.ts` at the project root and derives everything from it: the pre-paint bootstrap and the runtime's configuration.",
          when: "Always — it is how the integration is configured. Nothing is repeated in `astro.config.mjs`.",
          effect: "One catalog, one default theme, one source of truth. A page cannot disagree with the bootstrap because both read the same file.",
          related: ["astro-integration", "astro-transport"],
          code: [
            {
              title: "theme.config.ts",
              lang: "ts",
              code: `import { defineThemvoraConfig, getBuiltInThemes } from "@themvora/core";

export default defineThemvoraConfig({
  themes: getBuiltInThemes(),
  defaultTheme: "mint-light",
  initialMode: "system",
});`,
            },
          ],
        },
        {
          id: "astro-transport",
          name: "Configuration transport",
          covers: ["Configuration transport"],
          what: "Injects the bootstrap projection as `window.__THEMVORA_CONFIG__` from `<head>`. The island reads it instead of taking theme props.",
          when: "Relevant when you write your own client script or island: the registry, default theme and initial mode are already on the page, so restating them creates a second source of truth.",
          effect: "A server-rendered island and its hydrated version come from the same registry, which is what prevents a React hydration mismatch.",
          related: ["astro-config-discovery", "astro-client-no-props"],
          code: [
            {
              title: "What the head carries",
              lang: "html",
              code: `<!-- Injected by the integration; you do not write this. -->
<script>
  window.__THEMVORA_CONFIG__ = {
    themes: [/* the projection of theme.config.ts */],
    defaultTheme: "mint-light",
    initialMode: "system"
  };
</script>`,
            },
          ],
        },
        {
          id: "astro-bootstrap",
          name: "Zero-flash bootstrap",
          covers: ["Zero-flash bootstrap"],
          what: "Reads the persisted cookies, resolves the effective mode against `prefers-color-scheme`, and applies the CSS variables plus `data-theme` before first paint.",
          when: "Always, once the integration is registered. It is the whole reason the Astro setup has no flash.",
          effect: "The first frame is the persisted theme, including for a `system` visitor whose OS preference differs from the server's assumption.",
          related: ["astro-integration", "astro-readout"],
          code: [
            {
              title: "What the script does, in order",
              lang: "ts",
              code: ``,
            },
          ],
        },
        {
          id: "astro-navigation",
          name: "navigation: true",
          covers: ["navigation: true (default)"],
          what: "Keeps the resolved theme across `<ClientRouter />` navigations. Astro otherwise copies each incoming page's `<html>` attributes over the live root, which would reset the theme on every navigation.",
          when: "Leave it on. It is inert without `<ClientRouter />`, so there is no cost to a multi-page site.",
          effect: "Client-side navigations keep the theme instead of flashing back to the server's markup attributes.",
          related: ["astro-integration"],
          code: [
            {
              title: "astro.config.mjs",
              lang: "ts",
              code: `import { defineConfig } from "astro/config";
import { themvora } from "@themvora/astro";

export default defineConfig({
  // Default; set it explicitly only to document the dependency on ClientRouter.
  integrations: [themvora({ navigation: true })],
});`,
            },
          ],
        },
        {
          id: "astro-no-react",
          name: "No client framework required",
          covers: ["No client framework required"],
          what: "`@themvora/astro` imports no React: the integration, the server helpers, `<ThemeToggle />` and the browser runtime are all framework-neutral. React is an optional peer, pulled in only by an island.",
          when: "Every Astro project. This is the property that lets an Astro-only site ship no framework bundle.",
          effect: "An Astro-only project never installs React, and its theme controls are real elements with no hydration.",
          related: ["astro-optional-react", "astro-bundle-cost"],
          code: [
            {
              title: "package.json — Astro only",
              lang: "json",
              code: `{
  "dependencies": {
    "@themvora/astro": "^2.0.0",
    "astro": "^5.0.0"
  }
}`,
            },
          ],
        },
      ],
    },
    {
      id: "astro-components",
      label: "Astro components (no React)",
      intro:
        "These are `.astro` components and plain browser APIs. None of them needs a framework renderer, and most need no client script at all.",
      entries: [
        {
          id: "astro-provider",
          name: "provider.astro",
          covers: ["provider.astro"],
          what: "Server-renders the themed `<html data-theme>` from the request cookies. A concrete mode inlines that theme's variables; `system` emits both schemes as media blocks instead, because an inline variable would outrank the dark block.",
          when: "Once per page, wrapping `<html>`. It is the server half of the whole integration.",
          effect: "The HTML arrives already themed. Add `scrollbar` to also hide the native scrollbar before first paint.",
          related: ["astro-integration", "astro-scope-component"],
          code: [
            {
              title: "src/layouts/Base.astro",
              lang: "astro",
              code: `---
import Provider from "@themvora/astro/provider.astro";
---

<Provider scrollbar>
  <slot />
</Provider>`,
            },
          ],
        },
        {
          id: "astro-toggle",
          name: "ThemeToggle.astro",
          covers: ["ThemeToggle.astro"],
          what: "A native Astro toggle: a real `<button>`, so keyboard and focus behaviour come from the platform. No island, no `client:load`, and no per-page `initialMode` / `initialFamily`. `showMode` makes its text the live mode.",
          when: "The default mode control. Reach for an island only when the control must render something React owns.",
          effect: "Clicking cycles the mode and the button's own text follows. The pre-paint bootstrap has already set its state, so it never renders a stale label.",
          related: ["astro-family-select", "astro-controller"],
          code: [
            {
              title: "src/layouts/Base.astro",
              lang: "astro",
              code: `---
import ThemeToggle from "@themvora/astro/ThemeToggle.astro";
---

<header>
  <!-- \`showMode\` renders the live mode as the button text. -->
  <ThemeToggle showMode />
</header>`,
            },
          ],
        },
        {
          id: "astro-family-select",
          name: "ThemeFamilySelect.astro",
          covers: ["ThemeFamilySelect.astro"],
          what: "A native `<select>` over the families in the registry. It renders from `theme.config.ts`, forwards `class` to the `<select>` itself, and needs no script of its own. A mode select is the same contract by hand: `<select data-tv-select=\"mode\">`.",
          when: "A settings page or a header with a family picker. Native `<select>` is the right control on mobile and needs no JavaScript.",
          effect: "The options are the registered families, and the selected option tracks the live selection — including one restored from persistence.",
          related: ["astro-data-tv-select", "astro-toggle"],
          code: [
            {
              title: "src/components/Settings.astro",
              lang: "astro",
              code: `---
import ThemeFamilySelect from "@themvora/astro/ThemeFamilySelect.astro";
---

<label>
  Theme family
  <ThemeFamilySelect />
</label>

<label>
  Color mode
  <!-- The same contract, written by hand. -->
  <select data-tv-select="mode">
    <option value="light">Light</option>
    <option value="dark">Dark</option>
    <option value="system">System</option>
  </select>
</label>`,
            },
          ],
        },
        {
          id: "astro-data-tv-select",
          name: "data-tv-select",
          covers: ["data-tv-select"],
          what: "The selection-control contract: a `change` event is delegated from `document`, and the live selection is written back into the element's `value`. Every control of a kind therefore agrees, a restored selection is shown rather than the first option, and a control swapped in by navigation works without re-running a script.",
          when: "Any hand-written `<select>` that should drive the theme. Use it instead of a per-element listener.",
          effect: "The control is kept in sync in both directions, and the pre-paint bootstrap writes it too — so a `<select>` never shows its first option on a page painted in another theme.",
          related: ["astro-family-select", "astro-install-bindings"],
          code: [
            {
              title: "src/components/ModeSelect.astro",
              lang: "astro",
              code: `<select data-tv-select="mode" aria-label="Color mode">
  <option value="light">Light</option>
  <option value="dark">Dark</option>
  <option value="system">System</option>
</select>`,
            },
          ],
        },
        {
          id: "astro-scope-component",
          name: "ThemeScope.astro",
          covers: ["ThemeScope.astro"],
          what: "A subtree painted with a theme of its own, resolved in the frontmatter — so the server markup already carries the scoped variables and nothing repaints. Independent of the app-wide selection.",
          when: "A preview panel, a pricing block in a fixed palette, or a component gallery.",
          effect: "The scoped panel is correct in the first paint. It ships no client JavaScript unless a runtime already exists.",
          related: ["astro-scope-props", "astro-scope-no-js"],
          code: [
            {
              title: "src/pages/index.astro",
              lang: "astro",
              code: `---
import ThemeScope from "@themvora/astro/ThemeScope.astro";
---

<ThemeScope theme="cocoa-dark">
  <h3>Always cocoa</h3>
  <p>This panel keeps its own theme while the page changes.</p>
</ThemeScope>`,
            },
          ],
        },
        {
          id: "astro-scrollbar-component",
          name: "ThemeScrollbar.astro",
          covers: ["ThemeScrollbar.astro"],
          what: "The overlay scrollbar as a native component — no island, no client framework. It installs the app-wide runtime itself when the page has none, so the overlay is live on the first load instead of waiting for a theme change.",
          when: "A custom scrollbar is part of the design. Pair it with `scrollbar` on `provider.astro` (or `themvora({ scrollbar })`), which is what puts the hiding class and CSS in the server-rendered HTML.",
          effect: "The overlay mounts without a framework bundle and follows runtime theme changes.",
          related: ["astro-provider"],
          code: [
            {
              title: "src/layouts/Base.astro",
              lang: "astro",
              code: `---
import Provider from "@themvora/astro/provider.astro";
import ThemeScrollbar from "@themvora/astro/ThemeScrollbar.astro";
---

<Provider scrollbar>
  <slot />
  <ThemeScrollbar />
</Provider>`,
            },
          ],
        },
        {
          id: "astro-controller",
          name: "getThemeController()",
          covers: ["getThemeController()"],
          what: "The framework-neutral browser API, from `@themvora/astro/runtime`. Not a hook: a plain object with `getMode()`, `setMode()`, `setFamily()`, `toggleTheme()` and `subscribe()`, valid in any `<script>`. Idempotent — one runtime per document, shared with every other consumer.",
          when: "A page needs to drive the theme from its own script — a keyboard shortcut, a canvas that must repaint, a control the components do not cover.",
          effect: "The script shares the runtime the components use, so there is no second source of truth and no double subscription.",
          related: ["astro-toggle", "astro-install-bindings"],
          code: [
            {
              title: "A page script",
              lang: "astro",
              code: `<script>
  import { getThemeController } from "@themvora/astro/runtime";

  const controller = getThemeController();
  controller.setMode("dark");

  const unsubscribe = controller.subscribe(({ mode }) => {
    document.querySelector("#mode-readout").textContent = mode;
  });
</script>`,
            },
          ],
        },
        {
          id: "astro-install-bindings",
          name: "installThemeBindings()",
          covers: ["installThemeBindings()"],
          what: "Registers the delegated `click` / `change` listeners for `[data-tv-toggle]` and `[data-tv-select]` once per document, and mirrors the live selection into `[data-tv-select]` and `[data-tv-pressed]` on every change.",
          when: "Your markup is hand-written and uses the attribute contract without the Themvora components. The components call it for you.",
          effect: "The attributes start working: a `[data-tv-toggle]` button toggles, a `[data-tv-select]` select writes back, and pressed states stay accurate.",
          related: ["astro-data-tv-select", "astro-pressed"],
          code: [
            {
              title: "A page with hand-written controls",
              lang: "astro",
              code: `<button data-tv-toggle aria-label="Toggle theme">Theme</button>

<select data-tv-select="family" aria-label="Theme family">
  <option value="mint">Mint</option>
  <option value="plum">Plum</option>
</select>

<script>
  import { installThemeBindings } from "@themvora/astro/runtime";
  // Idempotent: safe to call on every page and after a ClientRouter navigation.
  installThemeBindings();
</script>`,
            },
          ],
        },
        {
          id: "astro-readout",
          name: "data-tv-readout",
          covers: ["data-tv-readout"],
          what: "Marks an element whose text Themvora owns: `theme` (the machine name), `label` (the theme's `meta.label`), `mode`, `family`, or `var:--theme-color-primary`.",
          when: "A server-rendered label that states the theme. Without the attribute you would have to write the value from a script after load.",
          effect: "The pre-paint bootstrap patches it from `<head>`, before the body is parsed, and the controller keeps it in sync afterwards — so a server-rendered label is never painted and then corrected.",
          related: ["astro-bootstrap", "astro-controller"],
          code: [
            {
              title: "src/components/ThemeReadout.astro",
              lang: "astro",
              code: `<p>
  Theme: <strong data-tv-readout="label">…</strong>
  · mode: <span data-tv-readout="mode">…</span>
  · primary: <span data-tv-readout="var:--theme-color-primary">…</span>
</p>`,
            },
          ],
        },
        {
          id: "astro-pressed",
          name: "data-tv-pressed",
          covers: ["data-tv-pressed"],
          what: "Marks an element as one option of a segmented control: `data-tv-pressed=\"mode\"` or `\"family\"`, with `data-tv-value` naming the option it represents. Themvora owns its `aria-pressed`.",
          when: "A segmented control where the selected option must be both visually and accessibly marked, and the markup is server-rendered.",
          effect: "`aria-pressed` is written before the first paint and kept live afterwards, so a server-rendered control never asserts a selection the page is not showing. Only `aria-pressed` is written, which lets a token class keyed off it keep the visual and accessible states in step.",
          related: ["astro-install-bindings", "astro-data-tv-select"],
          code: [
            {
              title: "A segmented mode control",
              lang: "astro",
              code: `<div role="group" aria-label="Color mode">
  <button data-tv-pressed="mode" data-tv-value="light">Light</button>
  <button data-tv-pressed="mode" data-tv-value="dark">Dark</button>
  <button data-tv-pressed="mode" data-tv-value="system">System</button>
</div>

<style>
  /* Themvora writes aria-pressed, so one rule covers both states. */
  [data-tv-pressed][aria-pressed="true"] {
    background: var(--theme-color-primary);
    color: var(--theme-color-primaryForeground);
  }
</style>`,
            },
          ],
        },
        {
          id: "astro-initial-state",
          name: "getInitialThemeState()",
          covers: ["getInitialThemeState()"],
          what: "Resolves the initial state from `Astro.request` so a client island hydrates against exactly what the document rendered. Needs the registry (`config` or `themes`) and a request, so it belongs on a server-rendered page.",
          when: "You are passing the resolved state to an island or a custom script rather than letting the transported config supply it.",
          effect: "The island's first render equals the server's markup, which is what prevents a hydration mismatch and the text flicker that comes with it.",
          related: ["astro-transport", "astro-client"],
          code: [
            {
              title: "A page that resolves its own state",
              lang: "astro",
              code: `---
import { getInitialThemeState } from "@themvora/astro";
import config from "../../theme.config";

const initial = await getInitialThemeState({ request: Astro.request, config });
---

<p>Rendered in {initial.theme.name}.</p>`,
            },
          ],
        },
        {
          id: "astro-persistence",
          name: "createAstroThemePersistence() / computeFingerprint()",
          covers: ["createAstroThemePersistence() / computeFingerprint()"],
          what: "A cookie + `localStorage` persistence adapter, plus config fingerprinting so a cookie written against an older registry is rejected rather than resolved to a theme that no longer exists.",
          when: "You construct a runtime yourself — a shared runtime for several islands, or a custom script — and need the same persistence contract the components use.",
          effect: "Selection changes survive reloads, and a registry change invalidates stale cookies instead of applying a missing theme.",
          related: ["astro-initial-state", "astro-shared-runtime"],
          code: [
            {
              title: "A custom runtime with the Astro persistence contract",
              lang: "ts",
              code: `import { createThemeRuntime } from "@themvora/core";
import { computeFingerprint, createAstroThemePersistence } from "@themvora/astro";
import config from "../../theme.config";

const themes = config.themes;
const fingerprint = computeFingerprint(themes, config.defaultTheme);

export const runtime = createThemeRuntime({
  themes,
  defaultTheme: config.defaultTheme,
  persistence: createAstroThemePersistence({ themes, fingerprint }),
});`,
            },
          ],
        },
      ],
    },
    {
      id: "scoped-themes",
      label: "Scoped themes",
      intro:
        "The scope is resolved during render, not applied by a script — which is why a scoped panel is correct in the first paint instead of flashing the page theme first.",
      entries: [
        {
          id: "astro-scope-props",
          name: "ThemeScope props",
          covers: ["Props"],
          what: "`theme` (required), `themes` (only outside a provider), `as` (wrapper element, default `div`), `class`, `id` and `transition`. `class` merges with the `dark` marker the component adds for a dark theme.",
          when: "You need a scope with a specific element type or your own classes — a `<section>` rather than a `<div>`, or a utility class set.",
          effect: "The wrapper is the element you asked for, and Tailwind's `dark:` variants work inside the scope on the first paint because the marker is already in the markup.",
          related: ["astro-scope-component", "astro-scope-independent"],
          code: [
            {
              title: "src/components/BrandPanel.astro",
              lang: "astro",
              code: `<ThemeScope
  theme="plum-dark"
  as="section"
  transition={false}
>
  <h3>Plum, dark, no transition</h3>
</ThemeScope>`,
            },
          ],
        },
        {
          id: "astro-scope-independent",
          name: "Independent of the selection",
          covers: ["Independent of the selection"],
          what: "A scope does not read or change the app-wide selection. A page can show a cocoa panel next to a mint page, and switching the page theme leaves the panel alone.",
          when: "Anywhere two themes must coexist — a comparison view, a preview gallery, a marketing block.",
          effect: "The panel keeps its theme through every page-level change, including a schedule transition.",
          related: ["astro-scope-many", "astro-scope-component"],
          code: [
            {
              title: "Two themes on one page",
              lang: "astro",
              code: `<main>
  <h1>Page theme</h1>
</main>

<ThemeScope theme="cocoa-dark">
  <div>Always cocoa, whatever the page does.</div>
</ThemeScope>`,
            },
          ],
        },
        {
          id: "astro-scope-no-js",
          name: "No client JavaScript by default",
          covers: ["No client JavaScript by default"],
          what: "A scope is static markup. The component's script only refreshes an existing runtime's scopes when the registry is reconfigured, and honours `transition` — it never creates a runtime.",
          when: "A page that only displays a scoped panel. It stays a page with no client framework on it.",
          effect: "No runtime is created, so the panel costs nothing at runtime. If the page already has a runtime, the scope joins it.",
          related: ["astro-bundle-cost", "astro-scope-component"],
          code: [
            {
              title: "A static scoped page",
              lang: "astro",
              code: `---
import Provider from "@themvora/astro/provider.astro";
import ThemeScope from "@themvora/astro/ThemeScope.astro";
---

<Provider>
  <ThemeScope theme="cocoa-dark">
    <p>Server-rendered, no client script.</p>
  </ThemeScope>
</Provider>`,
            },
          ],
        },
        {
          id: "astro-scope-many",
          name: "Any number per page",
          covers: ["Any number per page"],
          what: "Scopes are matched by the `data-tv-scope` attribute, not by an id, so the same component can be rendered as many times as the page needs.",
          when: "A gallery of themes, or a page that renders a scope per data record.",
          effect: "Every instance is independent and correctly resolved; there is no id collision to avoid.",
          related: ["astro-scope-independent"],
          code: [
            {
              title: "src/pages/themes.astro",
              lang: "astro",
              code: `---
import ThemeScope from "@themvora/astro/ThemeScope.astro";

const families = ["mint", "plum", "cocoa"];
---

<div>
  {families.map((family) => (
    <ThemeScope theme={family}>
      <strong>{family}</strong>
      <p>The quick brown fox</p>
    </ThemeScope>
  ))}
</div>`,
            },
          ],
        },
      ],
    },
    {
      id: "client-islands",
      label: "Client islands (opt-in)",
      intro:
        "Only this group depends on React. Everything above works without a renderer, and adding one is a deliberate step rather than a default.",
      entries: [
        {
          id: "astro-client",
          name: "@themvora/astro/client",
          covers: ["@themvora/astro/client"],
          what: "The only entry that depends on React. It exports the `ThemeProviderClient` island, the `useTheme*` hooks, the React `ThemeScope` and `ThemeReadout`.",
          when: "A component genuinely needs React — an existing React widget, or a control with state the native components cannot express.",
          effect: "The island shares the page's runtime and renders with the transported config, so it does not restate the theme.",
          related: ["astro-add-renderer", "astro-client-no-props"],
          code: [
            {
              title: "src/components/ThemePanel.tsx",
              lang: "tsx",
              code: `import { useTheme } from "@themvora/astro/client";

export function ThemePanel() {
  const { theme, effectiveMode, toggleTheme } = useTheme();

  return (
    <section>
      <h2>{theme.name}</h2>
      <p>Showing {effectiveMode}</p>
      <button onClick={toggleTheme}>Toggle</button>
    </section>
  );
}`,
            },
          ],
        },
        {
          id: "astro-client-no-props",
          name: "No theme props needed",
          covers: ["No theme props needed"],
          what: "The registry, default theme and initial mode come from the transported `theme.config.ts`. Restating `initialMode` / `initialFamily` is a second source of truth.",
          when: "Always. When the props drift from the config, the island's server markup disagrees with its hydrated markup (React error #418) and the text fluctuates on every load.",
          effect: "One config drives the document, the bootstrap, the components and the island.",
          related: ["astro-transport", "astro-client"],
          code: [
            {
              title: "src/pages/index.astro",
              lang: "astro",
              code: `---
import { ThemeProviderClient } from "@themvora/astro/client";
import { ThemePanel } from "../components/ThemePanel";
---

<!-- No initialMode / initialFamily: they come from theme.config.ts. -->
<ThemeProviderClient client:load>
  <ThemePanel />
</ThemeProviderClient>`,
            },
          ],
        },
        {
          id: "astro-client-load",
          name: "client:load, not client:only",
          covers: ["client:load, not client:only"],
          what: "Astro server-renders the island and hydrates it in place, so the panel is in the first paint and hydration only attaches handlers.",
          when: "Always for a themed island. `client:only` renders nothing on the server, which is exactly the flash the integration exists to prevent.",
          effect: "The panel is present in the HTML; there is no empty placeholder that fills in after the bundle loads.",
          related: ["astro-client", "astro-bootstrap"],
          code: [
            {
              title: "src/pages/index.astro",
              lang: "astro",
              code: `<!-- Server-rendered and hydrated in place. -->
<ThemeProviderClient client:load>
  <ThemePanel />
</ThemeProviderClient>

<!-- client:only would render nothing on the server — the flash this avoids. -->`,
            },
          ],
        },
        {
          id: "astro-one-island",
          name: "One island, not several",
          covers: ["One island, not several"],
          what: "Astro hydrates islands in an unspecified order, so two separate islands would race. Write one island whose tree contains both the provider and its consumers — `ThemeProviderClient` renders nothing itself; it is the provider half of that tree.",
          when: "Any page with more than one themed React component.",
          effect: "One provider, one hydration order, no race. Components below it in the same tree share the runtime.",
          related: ["astro-shared-runtime", "astro-client"],
          code: [
            {
              title: "src/pages/dashboard.astro",
              lang: "astro",
              code: `---
import { ThemeProviderClient } from "@themvora/astro/client";
import { ThemePanel } from "../components/ThemePanel";
---

<!-- One island, one runtime. Everything rendered inside shares it — a second
     component here would not create a second runtime. -->
<ThemeProviderClient client:load>
  <ThemePanel />
</ThemeProviderClient>`,
            },
          ],
        },
        {
          id: "astro-shared-runtime",
          name: "One runtime, shared",
          covers: ["One runtime, shared"],
          what: "`ThemeProviderClient` adopts a runtime that already exists — one a `<ThemeToggle />` or `getThemeController()` script created — instead of making a second one, and leaves its destruction to the owner.",
          when: "A page mixes native controls with an island. This is the normal case, not an edge case.",
          effect: "Islands and native controls share one runtime, so a toggle in the header updates the island and vice versa.",
          related: ["astro-one-island", "astro-controller"],
          code: [
            {
              title: "Mixing native and React on one page",
              lang: "astro",
              code: `---
import ThemeToggle from "@themvora/astro/ThemeToggle.astro";
import { ThemeProviderClient } from "@themvora/astro/client";
import { ThemePanel } from "../components/ThemePanel";
---

<!-- The toggle creates the runtime; the island adopts it. -->
<ThemeToggle />
<ThemeProviderClient client:load>
  <ThemePanel />
</ThemeProviderClient>`,
            },
          ],
        },
        {
          id: "astro-optional-react",
          name: "Framework renderers stay optional",
          covers: ["Framework renderers stay optional"],
          what: "React is an optional peer dependency. Astro-only projects never install it — choosing a React island is what pulls it in.",
          when: "An Astro-only site. Keeping React out of the dependency tree is the point of the framework-neutral design.",
          effect: "No React in `node_modules` and no React in the client bundle unless an island exists.",
          related: ["astro-no-react", "astro-add-renderer"],
          code: [
            {
              title: "package.json — Astro only, no React",
              lang: "json",
              code: `{
  "dependencies": {
    "@themvora/astro": "^2.0.0",
    "astro": "^5.0.0"
  }
}`,
            },
          ],
        },
        {
          id: "astro-add-renderer",
          name: "Adding the renderer",
          covers: ["Adding the renderer"],
          what: "Opting in is one explicit step: install `@astrojs/react` and `react`, then add `react()` next to `themvora()` in `astro.config.mjs`.",
          when: "The moment you add the first React island — and not before.",
          effect: "Astro can render the island server-side and hydrate it. The Astro-only path never registers a renderer, so nothing changes for pages without islands.",
          related: ["astro-client", "astro-optional-react"],
          code: [
            {
              title: "astro.config.mjs",
              lang: "ts",
              code: `import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import { themvora } from "@themvora/astro";

export default defineConfig({
  // \`react()\` is what makes a React island possible; \`themvora()\` is unchanged.
  integrations: [themvora(), react()],
});`,
            },
          ],
        },
        {
          id: "astro-bundle-cost",
          name: "Client bundle cost",
          covers: ["Client bundle cost"],
          what: "`<ThemeToggle />` and `getThemeController()` pull in the theme runtime — persistence, cross-tab sync and the DOM contract all come from `@themvora/core` rather than a second implementation. A page that only needs the themed document, with no interactive control, ships no client JavaScript at all.",
          when: "A performance decision: a marketing page can be server-themed with zero script, while a settings page pays for the runtime once.",
          effect: "Pages without controls ship nothing; pages with controls ship the shared runtime, not a bespoke implementation.",
          related: ["astro-scope-no-js", "astro-no-react"],
          code: [
            {
              title: "Zero-JavaScript page",
              lang: "astro",
              code: `---
import Provider from "@themvora/astro/provider.astro";
---

<!-- Themed on the server. No toggle, no controller, no client script. -->
<Provider>
  <main>
    <h1>Server-themed, zero JavaScript</h1>
  </main>
</Provider>`,
            },
          ],
        },
      ],
    },
    {
      id: "transition",
      label: "Transition",
      intro:
        "Declare `transition` once in `theme.config.ts`: the runtime is built from the transported config, so native controls, the overlay scrollbar and an island all animate with one declaration. The island provider still accepts a per-island override, and per-update suppression works the same way in both.",
      entries: [
        {
          id: "astro-transition",
          name: "transition",
          covers: ["transition in theme.config.ts"],
          what: "Set `transition` in `theme.config.ts` — `{ enabled, duration, easing, useViewTransition }`, or `true` / `false`. The integration transports it to `window.__THEMVORA_CONFIG__`, and every runtime the page creates adopts it. The transported config is captured when the dev server starts, so restart `astro dev` after editing this file.",
          when: "The app should cross-fade theme changes. Declaring it here covers a page with only native controls, one with the overlay scrollbar, and one with a React island — no per-island prop is needed.",
          effect: "Theme changes cross-fade over the configured duration and easing. The browser uses a native View Transition when available and falls back to CSS custom-property interpolation; the DOM writes stay in one flush either way.",
          related: ["astro-suppress-transition", "astro-client"],
          code: [
            {
              title: "theme.config.ts",
              lang: "ts",
              code: `import { defineTheme, defineThemvoraConfig } from "@themvora/core";

export default defineThemvoraConfig({
  themes,
  defaultTheme: "mint-light",
  transition: {
    enabled: true,
    duration: 300,
    easing: "cubic-bezier(0.4, 0, 0.2, 1)",
  },
});`,
            },
          ],
        },
        {
          id: "astro-suppress-transition",
          name: "runtime.store.set(theme, { suppressTransition: true })",
          covers: ["runtime.store.set(theme, { suppressTransition: true })"],
          what: "Applies one theme change immediately, skipping the configured animation for that update only.",
          when: "A print path, a screenshot, or a programmatic reset where animating would look like a glitch.",
          effect: "That change is instant; later changes animate again.",
          related: ["astro-transition", "astro-controller"],
          code: [
            {
              title: "A page script",
              lang: "astro",
              code: `<script>
  import { getThemeController } from "@themvora/astro/runtime";

  const controller = getThemeController();
  // Instant: a reset should not look like a deliberate theme change.
  controller.runtime.store.set(controller.runtime.themes[0], {
    suppressTransition: true,
  });
</script>`,
            },
          ],
        },
      ],
    },
    {
      id: "scrolling",
      label: "Scrolling",
      intro:
        "The document keeps native scrolling. On a hard load, the saved position is restored before the first paint — with or without the overlay scrollbar, and with nothing to add to your layout.",
      entries: [
        {
          id: "astro-scroll-restoration",
          name: "scroll restoration",
          covers: [
            "Zero-flash scroll restoration",
            "ThemeScrollbar keeps native scrolling",
          ],
          what: "A full reload (or cross-document back/forward) restores the position Astro saved in `history.state` from an inline script at the end of `<body>`, before the deferred router module and the first paint. No `scrollRestoration` override, `sessionStorage` key or user script is involved.",
          when: "Any Themvora Astro page that uses `<ClientRouter />` — the router owns restoration and otherwise applies it only when its module runs, which on a slow load is after the page has painted at the top.",
          effect: "The first visible frame is already at the saved position. Ordinary navigation still starts at the top, back/forward still restores, and client-side navigation is untouched.",
          related: ["astro-scrollbar-component", "astro-transition"],
          code: [
            {
              title: "src/layouts/BaseLayout.astro",
              lang: "astro",
              code: `---
import Provider from "@themvora/astro/provider.astro";
import ThemeScrollbar from "@themvora/astro/ThemeScrollbar.astro";
import { ClientRouter } from "astro:transitions";
import themeConfig from "../../theme.config";
---

{/* No scroll-restoration script is needed: the provider emits it. */}
<Provider config={themeConfig} scrollbar>
  <title slot="head">My site</title>
  <ClientRouter slot="head" />
  <ThemeScrollbar />
  <slot />
</Provider>`,
            },
          ],
        },
      ],
    },
  ],
  recipes: [
    {
      id: "zero-js-page",
      title: "A themed page with zero client JavaScript",
      problem:
        "A content site wants light/dark that respects the visitor's saved choice, without shipping a framework or a runtime bundle.",
      apis: ["provider.astro", "theme.config.ts discovery", "Zero-flash bootstrap"],
      why: "The provider resolves the theme on the server from the cookies, and the bootstrap handles the one case the server cannot decide — `system` with a dark-preferring visitor.",
      expect:
        "The page paints the persisted theme on the first frame. No client bundle is emitted unless a control is added.",
      code: [
        {
          title: "src/layouts/Base.astro",
          lang: "astro",
          code: `---
import Provider from "@themvora/astro/provider.astro";
---

<Provider>
  <slot />
</Provider>`,
        },
      ],
    },
    {
      id: "native-controls",
      title: "Native controls, one small runtime",
      problem:
        "The page needs a working toggle and family picker, but the team does not want a framework renderer.",
      apis: ["ThemeToggle.astro", "ThemeFamilySelect.astro", "getThemeController()"],
      why: "The components are real elements with no hydration, and the controller is a plain object any `<script>` can use — so the only JavaScript is the shared runtime.",
      expect:
        "A working toggle and family picker that persist across reloads, with no React in the bundle.",
      caveats:
        "The toggle needs the runtime, so this page does ship `@themvora/core`. A page with no controls does not.",
      code: [
        {
          title: "src/layouts/Base.astro",
          lang: "astro",
          code: `---
import Provider from "@themvora/astro/provider.astro";
import ThemeToggle from "@themvora/astro/ThemeToggle.astro";
import ThemeFamilySelect from "@themvora/astro/ThemeFamilySelect.astro";
---

<Provider>
  <header>
    <ThemeToggle showMode />
    <ThemeFamilySelect />
  </header>
  <slot />
</Provider>`,
        },
      ],
    },
    {
      id: "scoped-preview",
      title: "A theme gallery that never flashes",
      problem:
        "A gallery must show several themes at once, and applying them from a script would paint the page theme first and repaint.",
      apis: ["ThemeScope.astro", "Any number per page"],
      why: "The scope resolves its variables in the frontmatter, so the server markup already carries them. There is nothing to repaint and no id to collide with.",
      expect:
        "Every panel is correct in the first paint, and switching the page theme leaves the panels alone.",
      code: [
        {
          title: "src/pages/themes.astro",
          lang: "astro",
          code: `---
import ThemeScope from "@themvora/astro/ThemeScope.astro";

const families = ["mint", "plum", "cocoa"];
---

<div>
  {families.map((family) => (
    <ThemeScope theme={family}>
      <strong>{family}</strong>
      <p>The quick brown fox</p>
    </ThemeScope>
  ))}
</div>`,
        },
      ],
    },
    {
      id: "island",
      title: "Add a React island without breaking the rest",
      problem:
        "One component needs React, but the rest of the page is native. Adding a renderer must not duplicate the runtime or change the theme on load.",
      apis: ["@themvora/astro/client", "Adding the renderer", "One runtime, shared"],
      why: "The island adopts the runtime the native controls created and takes its config from the transported `theme.config.ts`, so there is still one source of truth.",
      expect:
        "The island renders server-side in the correct theme, hydrates in place, and shares the selection with the native toggle.",
      caveats:
        "Use `client:load`, not `client:only`. And put every themed React component inside the same island — separate islands hydrate in an unspecified order.",
      code: [
        {
          title: "src/pages/dashboard.astro",
          lang: "astro",
          code: `---
import ThemeToggle from "@themvora/astro/ThemeToggle.astro";
import { ThemeProviderClient } from "@themvora/astro/client";
import { ThemePanel } from "../components/ThemePanel";
---

<ThemeToggle />
<ThemeProviderClient client:load>
  <ThemePanel />
</ThemeProviderClient>`,
        },
      ],
    },
  ],
  combining: [
    {
      id: "full-layout",
      title: "The full layout",
      body: "Provider with the overlay scrollbar, native controls in the header, and a slot for page content — the shape most Astro sites end up with.",
      code: [
        {
          title: "src/layouts/Base.astro",
          lang: "astro",
          code: `---
import Provider from "@themvora/astro/provider.astro";
import ThemeToggle from "@themvora/astro/ThemeToggle.astro";
import ThemeFamilySelect from "@themvora/astro/ThemeFamilySelect.astro";
import ThemeScrollbar from "@themvora/astro/ThemeScrollbar.astro";
---

<Provider scrollbar>
  <header>
    <ThemeToggle showMode />
    <ThemeFamilySelect />
  </header>

  <main>
    <slot />
  </main>

  <ThemeScrollbar />
</Provider>`,
        },
      ],
    },
    {
      id: "three-levels",
      title: "Which level to stop at",
      body: "The same page expressed three ways. Start at the top; move down only when the level above cannot do the job.",
      code: [
        {
          title: "1 — Server-themed, no JavaScript",
          lang: "astro",
          code: `<Provider>
  <slot />
</Provider>`,
        },
        {
          title: "2 — Native controls, shared runtime",
          lang: "astro",
          code: `<Provider>
  <ThemeToggle showMode />
  <slot />
</Provider>`,
        },
        {
          title: "3 — A React island inside it",
          lang: "astro",
          code: `<ThemeProviderClient client:load>
  <Chart />
</ThemeProviderClient>`,
        },
      ],
    },
  ],
  notAvailable: [
    {
      name: "createThemeRoot() / framework hooks in a .astro file",
      reason:
        "React APIs are not reachable from `.astro` frontmatter. Use the server helpers (`getInitialThemeState()`, `createAstroThemePersistence()`) on the server and `@themvora/astro/client` inside an island.",
    },
  ],
};
