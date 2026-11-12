import type { FrameworkExamples } from "./types";

/**
 * Web Components examples and use cases.
 *
 * This is the framework-free integration: custom elements configured by
 * attributes, plus a few plain functions for the cases where markup is not
 * enough. Verified against `packages/web/src` — element names, attribute
 * names, event names and the imperative helpers all come from that source,
 * not from the React surface.
 */
export const webExamples: FrameworkExamples = {
  slug: "web",
  sections: {
    startHere: "Two script tags, or a bundler",
    useCases: "A page with no framework at all",
    api: "Elements, attributes, and events",
    combining: "Everything on one page",
  },
  intro: [
    "The Web Components integration is the one that needs no framework. A single side-effect import registers six custom elements and injects their stylesheet once; from then on a theme is markup — attributes on a provider, native controls inside it, and events if you need to react.",
    "Because everything is an attribute, the whole configuration is serialisable and works in static HTML, in a CMS template, in a PHP page, or inside any framework's template language. The imperative helpers exist for the cases where you need the runtime object itself.",
  ],
  startHere: {
    body: "Import the package once and put a `<themvora-provider>` around the page. The provider owns the runtime and applies the active theme to the document.",
    note: "Nothing else is required: the built-in neutral themes are the default catalog, so a provider with no attributes is already themed.",
    code: [
      {
        title: "index.html",
        lang: "html",
        code: `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Themed without a framework</title>
    <script type="module" src="/main.js"></script>
  </head>
  <body>
    <themvora-provider initial-mode="system">
      <header>
        <h1>Hello, themed world</h1>
        <themvora-toggle></themvora-toggle>
      </header>
      <main>
        <p>This card reads Themvora tokens.</p>
      </main>
    </themvora-provider>
  </body>
</html>`,
      },
      {
        title: "main.js",
        lang: "js",
        code: `import "@themvora/web";`,
      },
      {
        title: "vite.config.ts",
        lang: "ts",
        code: `import { defineConfig } from "vite";
import { themvoraVitePlugin } from "@themvora/web/vite";

// Injects the pre-paint CSS, the transported config and the blocking script.
export default defineConfig({ plugins: [themvoraVitePlugin()] });`,
      },
      {
        title: "theme.config.ts",
        lang: "ts",
        code: `import { defineThemvoraConfig, getBuiltInThemes } from "@themvora/core";

export default defineThemvoraConfig({
  themes: getBuiltInThemes(),
  defaultTheme: "light",
  initialMode: "system",
});`,
      },
    ],
  },
  categories: [
    {
      id: "setup",
      label: "Setup",
      intro:
        "Registration, the optional build-time helper, and editor support. None of these change what the elements do — they decide how the elements get onto the page.",
      entries: [
        {
          id: "web-import",
          name: 'import "@themvora/web"',
          covers: ['import "@themvora/web"'],
          what: "One side-effect import that registers all six elements and injects their stylesheet a single time. No manual registration step and no per-element import.",
          when: "Every page that uses any Themvora element. This is the shortest correct setup.",
          effect: "The custom elements upgrade, the provider initializes, and the page is themed. Importing twice is harmless — registration is idempotent.",
          related: ["web-define"],
          code: [
            {
              title: "main.js",
              lang: "js",
              code: `import "@themvora/web";`,
            },
            {
              title: "Bundler entry",
              lang: "ts",
              code: `import "@themvora/web";`,
            },
          ],
        },
        {
          id: "web-define",
          name: "defineCustomElements()",
          covers: ["defineCustomElements()"],
          what: "The explicit form of the same registration. Call it yourself, or register a single element under your own tag with `ThemvoraProvider.define(\"my-provider\")`.",
          when: "You need control over when registration happens — a lazy bundle, a micro-frontend that must not register twice, or a tag name that would collide with an existing one.",
          effect: "Registration happens at the call site instead of at import time. It is idempotent, and a no-op on the server.",
          related: ["web-import", "web-provider-el"],
          code: [
            {
              title: "src/elements.ts",
              lang: "ts",
              code: `import { ThemvoraProvider, defineCustomElements } from "@themvora/web";

defineCustomElements();

// Or register one element under your own tag name.
ThemvoraProvider.define("my-provider");`,
            },
          ],
        },
        {
          id: "web-vite-plugin",
          name: "themvoraVitePlugin()",
          covers: ["themvoraVitePlugin()"],
          what: "The Vite integration. It discovers `theme.config.ts` and injects three things in order: a render-blocking `<style>` generated from the declared themes, the serialized configuration the provider reads, and a classic blocking boot script that restores the persisted selection. No `<script>` tag, no prebuild/predev step and no second configuration.",
          when: "A Vite app (or any Vite-based meta-framework) that should paint the default theme and a saved selection on the first frame.",
          effect: "The generated CSS themes ordinary HTML even with JavaScript disabled, and the boot script restores a saved non-default selection before the body is parsed. The provider adopts what was painted. Pass `scrollbar: true` as well when the page uses `<themvora-scrollbar>`, so the same pre-paint pass hides the native bar.",
          related: ["web-import", "web-scrollbar-el"],
          code: [
            {
              title: "vite.config.ts",
              lang: "ts",
              code: `import { defineConfig } from "vite";
import { themvoraVitePlugin } from "@themvora/web/vite";

export default defineConfig({
  plugins: [
    // Reads theme.config.ts and injects the CSS + boot script into the HTML.
    themvoraVitePlugin(),
  ],
});`,
            },
            {
              title: "theme.config.ts",
              lang: "ts",
              code: `import { defineThemvoraConfig } from "@themvora/core";
import { getBuiltInThemes } from "@themvora/core";

export default defineThemvoraConfig({
  themes: getBuiltInThemes(),
  defaultTheme: "mint-light",
  initialMode: "system",
});`,
            },
          ],
        },
        {
          id: "web-vscode",
          name: "VS Code IntelliSense",
          covers: ["VS Code IntelliSense"],
          what: "The package ships `html-data.json`, an HTML custom-data file covering every element and attribute, so the editor completes tags, suggests attributes and shows hover documentation.",
          when: "Any project writing these tags by hand. VS Code does not load the file automatically — pointing at it is a one-line settings change.",
          effect: "Tag and attribute completion inside `.html` files, with the attribute's documentation on hover.",
          related: ["web-import"],
          code: [
            {
              title: ".vscode/settings.json",
              lang: "json",
              code: `{
  "html.customData": ["./node_modules/@themvora/web/html-data.json"]
}`,
            },
          ],
        },
      ],
    },
    {
      id: "configuration",
      label: "Configuration",
      intro:
        "Every option is an attribute on the provider, so the configuration is visible in the markup and survives a server render. Removing an attribute restores the default; changing one reconfigures the live runtime.",
      entries: [
        {
          id: "web-themes-attr",
          name: "themes",
          covers: ["themes"],
          what: "The theme catalog, in two syntaxes: names (`themes=\"light dark plum-dark\"`) resolved against the registered catalog, or definitions (`themes='[{\"name\":\"brand\",\"tokens\":{…}}]'`) that register your own.",
          when: "You ship themes beyond the built-in neutral pair. Use names when the themes come from the catalog, definitions when they come from data.",
          effect: "The provider registers the catalog and resolves the selection against it. An unknown name is reported and skipped rather than silently constructing a theme.",
          related: ["web-default-theme", "web-scope-el"],
          code: [
            {
              title: "By name",
              lang: "html",
              code: `<themvora-provider themes="light dark plum-light plum-dark">
  <themvora-select type="family" label="Theme family"></themvora-select>
</themvora-provider>`,
            },
            {
              title: "By definition",
              lang: "html",
              code: `<!-- JSON in the attribute: registered as a theme of its own. -->
<themvora-provider
  themes='[{"name":"brand","tokens":{"colors":{"primary":"#635bff"}}}]'
  default-theme="brand"
>
  <main>Brand tokens, no build step.</main>
</themvora-provider>`,
            },
          ],
        },
        {
          id: "web-default-theme",
          name: "default-theme",
          covers: ["default-theme"],
          what: "The theme used when nothing is persisted. Changing it re-resolves the selection; removing it does not disturb the live selection.",
          when: "Every app with more than one theme — it is what a first-time visitor sees.",
          effect: "A first visit paints this theme. A returning visitor keeps their persisted choice, because persistence wins over the default.",
          related: ["web-themes-attr", "web-initial-mode"],
          code: [
            {
              title: "index.html",
              lang: "html",
              code: `<themvora-provider default-theme="mint-light">
  <themvora-toggle></themvora-toggle>
</themvora-provider>`,
            },
          ],
        },
        {
          id: "web-initial-mode",
          name: "initial-mode",
          covers: ["initial-mode"],
          what: "The starting mode: `light`, `dark` or `system`, case-insensitive. Any other value is reported and ignored, and the mode falls back to the one derived from `default-theme`.",
          when: "You want the first visit to follow the OS (`system`) rather than the default theme's own mode.",
          effect: "`system` makes the first paint follow `prefers-color-scheme`; an explicit mode pins it until the visitor changes it.",
          related: ["web-default-theme", "web-toggle-el"],
          code: [
            {
              title: "index.html",
              lang: "html",
              code: `<themvora-provider initial-mode="system">
  <themvora-toggle></themvora-toggle>
</themvora-provider>`,
            },
          ],
        },
        {
          id: "web-initial-family",
          name: "initial-family",
          covers: ["initial-family"],
          what: "The family used when nothing is persisted. An unregistered family is reported by the runtime (`TV_THEME_FAMILY_UNKNOWN`) and normalised rather than applied blindly.",
          when: "A multi-family catalog where the default should be a specific family rather than the first registered theme.",
          effect: "A first visit starts in that family; the visitor's own choice still wins on later visits.",
          related: ["web-themes-attr", "web-select-el"],
          code: [
            {
              title: "index.html",
              lang: "html",
              code: `<themvora-provider
  themes="mint-light mint-dark plum-light plum-dark"
  initial-family="plum"
  initial-mode="dark"
>
  <themvora-select type="family" label="Theme family"></themvora-select>
</themvora-provider>`,
            },
          ],
        },
        {
          id: "web-transition-attr",
          name: "transition",
          covers: ["transition"],
          what: "JSON in the attribute: `true`, `false`, or `{\"enabled\":true,\"duration\":250,\"easing\":\"ease-in-out\"}`. Changing it reconfigures the live bindings; removing it returns to no configured transition.",
          when: "Tune the cross-fade, or turn it off for a page that must repaint instantly.",
          effect: "Theme changes animate with the configured options. The attribute is read live, so changing it does not require a reload.",
          related: ["web-provider-el"],
          code: [
            {
              title: "index.html",
              lang: "html",
              code: `<themvora-provider
  transition='{"enabled":true,"duration":250,"easing":"ease-in-out"}'
>
  <main>Changes cross-fade.</main>
</themvora-provider>`,
            },
          ],
        },
        {
          id: "web-scheduled-attr",
          name: "scheduled",
          covers: ["scheduled"],
          what: "JSON sunrise/sunset options, for example `{\"latitude\":27.7,\"longitude\":85.3}`. Removing the attribute tears the schedule down.",
          when: "The page should follow local daylight with no control at all — a kiosk, a lobby display, a marketing page.",
          effect: "The theme switches at the visitor's local sunrise and sunset. With no coordinates, the browser timezone supplies the location.",
          related: ["web-initial-mode", "web-effective-mode"],
          code: [
            {
              title: "index.html",
              lang: "html",
              code: `<themvora-provider
  themes="mint-light mint-dark"
  scheduled='{"lightTheme":"mint-light","darkTheme":"mint-dark"}'
>
  <main>Follows daylight.</main>
</themvora-provider>`,
            },
          ],
        },
      ],
    },
    {
      id: "elements",
      label: "Elements",
      intro:
        "Six elements cover the whole surface. Each one is configured by attributes and needs no script of its own.",
      entries: [
        {
          id: "web-provider-el",
          name: "<themvora-provider>",
          covers: ["<themvora-provider>"],
          what: "Owns the runtime for a page or subtree and applies the active theme to the document. Every configuration attribute is reactive — changing one reconfigures the runtime without a reload.",
          when: "Once per page, around the content. More than one provider is allowed; `getProviderRuntime(el)` is how you address a specific one.",
          effect: "The document carries the active theme's variables and `data-theme`. Removing the element tears the runtime down.",
          related: ["web-themes-attr", "web-get-provider-runtime"],
          code: [
            {
              title: "index.html",
              lang: "html",
              code: `<themvora-provider
  themes="mint-light mint-dark"
  default-theme="mint-light"
  initial-mode="system"
>
  <header>
    <themvora-toggle></themvora-toggle>
    <themvora-select type="family" label="Theme family"></themvora-select>
  </header>
  <main>Page content.</main>
</themvora-provider>`,
            },
          ],
        },
        {
          id: "web-scope-el",
          name: "<themvora-scope>",
          covers: ["<themvora-scope>"],
          what: "Applies a theme to its subtree through the `theme` attribute, in the light DOM. Accepts an exact theme name or a family name: a family follows the provider's mode, an exact name pins its own.",
          when: "A preview panel, a pricing block in a fixed palette, or a component gallery — anywhere a region must not follow the page theme.",
          effect: "Only the subtree repaints. Re-resolves when the provider's catalog changes, and falls back to the catalog's first theme (reported) when the name is unknown. Removing the attribute destroys the binding so the subtree inherits the surrounding theme.",
          related: ["web-themes-attr", "web-provider-el"],
          code: [
            {
              title: "index.html",
              lang: "html",
              code: `<themvora-scope theme="cocoa-dark">
  <h3>Always cocoa</h3>
  <p>This panel keeps its own theme while the page changes.</p>
</themvora-scope>`,
            },
            {
              title: "A family scope follows the page mode",
              lang: "html",
              code: `<!-- \`theme="plum"\` is a family: it flips light/dark with the page. -->
<themvora-scope theme="plum">
  <div>Second brand surface.</div>
</themvora-scope>`,
            },
          ],
        },
        {
          id: "web-toggle-el",
          name: "<themvora-toggle>",
          covers: ["<themvora-toggle>"],
          what: "A native `<button>` with built-in sun, moon and monitor icons. It reports three states, not two: `data-mode` is `light`, `dark` or `system`, and `aria-pressed` is `true`, `false` or `mixed`.",
          when: "The default mode control. It needs no icon package, stylesheet or script, and its three-state reporting means a page following the OS reads as `system` rather than pretending to be light or dark.",
          effect: "Activating it pins an explicit mode. The accessible state changes with it, so a token class keyed off `aria-pressed` stays in step with the visual state.",
          related: ["web-select-el", "web-initial-mode"],
          code: [
            {
              title: "index.html",
              lang: "html",
              code: `<themvora-toggle></themvora-toggle>`,
            },
            {
              title: "Styling it from its own state",
              lang: "css",
              code: `/* Themvora owns data-mode and aria-pressed, so CSS can key off either. */
themvora-toggle[data-mode="dark"] {
  --tv-toggle-icon: var(--theme-color-primary);
}

themvora-toggle[aria-pressed="mixed"] {
  opacity: 0.8;
}`,
            },
          ],
        },
        {
          id: "web-select-el",
          name: "<themvora-select>",
          covers: ["<themvora-select>"],
          what: "A native `<select>` for `type=\"mode\"` or `type=\"family\"`. Options come from the runtime, so a catalog change updates them; `label` sets the accessible name.",
          when: "A settings page, or any place where a segmented control would be less clear than a list. The native element brings keyboard and mobile behaviour for free.",
          effect: "The select's value mirrors the live selection, including a selection restored from persistence — so it never shows its first option on a page painted in another theme.",
          related: ["web-initial-family", "web-toggle-el"],
          code: [
            {
              title: "index.html",
              lang: "html",
              code: `<label>
  <themvora-select type="family" label="Theme family"></themvora-select>
</label>
<label>
  <themvora-select type="mode" label="Color mode"></themvora-select>
</label>`,
            },
          ],
        },
        {
          id: "web-scrollbar-el",
          name: "<themvora-scrollbar>",
          covers: ["<themvora-scrollbar>"],
          what: "An overlay scrollbar bound to the provider runtime. Every option is an attribute; changing one rebuilds the overlay.",
          when: "A custom scrollbar is part of the design. It needs the pre-paint class to avoid a native-bar flash — pass `scrollbar: true` to the Vite plugin, or load the pre-paint script yourself.",
          effect: "The overlay is theme-aware and follows runtime theme changes. Without the pre-paint pass the browser paints a native scrollbar for a frame before the overlay mounts.",
          related: ["web-vite-plugin", "web-provider-el"],
          code: [
            {
              title: "index.html",
              lang: "html",
              code: `<themvora-provider scrollbar>
  <themvora-scrollbar thickness="10" auto-hide></themvora-scrollbar>
  <main>Long content…</main>
</themvora-provider>`,
            },
          ],
        },
        {
          id: "web-inspector-el",
          name: "<themvora-inspector>",
          covers: ["<themvora-inspector>"],
          what: "A floating theme inspector: identity, selection, tokens and resolved CSS variables, live.",
          when: "Development only — it is the fastest way to answer \"which token produced this colour\" without adding a debug page.",
          effect: "A fixed-position panel appears over the page. Keep it out of production markup.",
          related: ["web-provider-el"],
          code: [
            {
              title: "index.html (development only)",
              lang: "html",
              code: `<!-- Add while developing; remove before shipping. -->
<themvora-inspector></themvora-inspector>`,
            },
          ],
        },
      ],
    },
    {
      id: "events",
      label: "Events",
      intro:
        "Two DOM events cover lifecycle and catalog changes. Subscriptions cover the cases where you need the state rather than the notification.",
      entries: [
        {
          id: "web-theme-ready",
          name: "theme-ready",
          covers: ["theme-ready"],
          what: "Dispatched once by `<themvora-provider>` after its runtime exists and the first theme is applied. It bubbles and is composed, so a listener on `document` sees it.",
          when: "Your script needs the runtime but cannot know whether the provider has upgraded yet — the classic race in a deferred module.",
          effect: "A `document` listener fires once per provider initialization, after the theme is applied. Inside it, `getProviderRuntime()` and `useThemeRuntime()` are safe to call.",
          related: ["web-get-provider-runtime", "web-use-runtime"],
          code: [
            {
              title: "main.js",
              lang: "js",
              code: `document.addEventListener("theme-ready", (event) => {
  // \`event.target\` is the provider that initialized.
  console.log("theme applied on", event.target);
});`,
            },
          ],
        },
        {
          id: "web-themes-change",
          name: "themes-change",
          covers: ["themes-change"],
          what: "Dispatched when the runtime's catalog changed — a `themes` attribute change, `runtime.use(pack)`, or `runtime.restore()`. `detail.themes` names the new catalog.",
          when: "You rebuild UI that lists themes. A catalog change can leave the active theme untouched, so `store.subscribe()` alone cannot report it.",
          effect: "Fires on a microtask, after the change is applied, so a listener may safely write back to `themes` without fighting the runtime.",
          related: ["web-store-subscribe", "web-themes-attr"],
          code: [
            {
              title: "main.js",
              lang: "js",
              code: `document.addEventListener("themes-change", (event) => {
  const names = event.detail.themes.map((theme) => theme.name);
  renderThemeList(names);
});`,
            },
          ],
        },
        {
          id: "web-store-subscribe",
          name: "runtime.store.subscribe()",
          covers: ["runtime.store.subscribe()"],
          what: "The canonical subscription for the active theme. The callback receives the theme; re-read any other state inside it, because the runtime's helpers are getters rather than subscriptions.",
          when: "You need to react to the active theme changing — a chart that must rebuild its palette, a canvas that must repaint.",
          effect: "The callback runs on every theme change until you unsubscribe. It does not report selection changes that resolve to the same theme.",
          related: ["web-selection-subscribe", "web-use-runtime"],
          code: [
            {
              title: "main.js",
              lang: "js",
              code: `import { useThemeRuntime } from "@themvora/web";

const runtime = useThemeRuntime();

const unsubscribe = runtime.store.subscribe((theme) => {
  document.querySelector("#theme-name").textContent = theme.name;
});

// Later, when the widget is removed:
unsubscribe();`,
            },
          ],
        },
        {
          id: "web-selection-subscribe",
          name: "runtime.selection.subscribe()",
          covers: ["runtime.selection.subscribe()"],
          what: "Fires for a selection change even when it resolves to the same theme — for example `system` following an OS change, or switching family between two variants of the same palette.",
          when: "The UI shows the *selection* rather than the theme: a family picker's checked state, a \"following the system\" hint.",
          effect: "The callback receives the selection (`mode`, `family`). Pair it with `store.subscribe()` when you need both the selection and the resulting theme.",
          related: ["web-store-subscribe", "web-effective-mode"],
          code: [
            {
              title: "main.js",
              lang: "js",
              code: `import { useThemeRuntime } from "@themvora/web";

const runtime = useThemeRuntime();

const unsubscribe = runtime.selection.subscribe((selection) => {
  document.querySelector("#mode-readout").textContent = selection.mode;
});`,
            },
          ],
        },
      ],
    },
    {
      id: "imperative",
      label: "Imperative",
      intro:
        "Plain functions for the cases markup cannot express: addressing a specific provider, driving the selection from your own control, or observing the applied mode.",
      entries: [
        {
          id: "web-get-provider-runtime",
          name: "getProviderRuntime(providerEl)",
          covers: ["getProviderRuntime(providerEl)"],
          what: "Returns the runtime attached to a specific provider element, or `undefined` before that element has upgraded.",
          when: "More than one provider exists on the page — a widget embedded twice, or a micro-frontend. `useThemeRuntime()` returns the first initialized provider, which would be the wrong one.",
          effect: "You get that provider's runtime, or `undefined`. Checking for `undefined` is how you avoid the upgrade race without a `theme-ready` listener.",
          related: ["web-use-runtime", "web-theme-ready"],
          code: [
            {
              title: "main.js",
              lang: "js",
              code: `import { getProviderRuntime } from "@themvora/web";

const el = document.querySelector("#sidebar-provider");
const runtime = getProviderRuntime(el);

// undefined before the element upgrades.
if (runtime) {
  runtime.selection.setMode("dark");
}`,
            },
          ],
        },
        {
          id: "web-use-runtime",
          name: "useThemeRuntime()",
          covers: ["useThemeRuntime()"],
          what: "Page-level convenience: the runtime of the first initialized provider in document order. Throws when none has initialized.",
          when: "A single-provider page — the common case — where you just need the runtime in a script.",
          effect: "Returns the runtime, or throws. Use `getProviderRuntime()` when more than one provider exists, or `theme-ready` when the script may run before upgrade.",
          related: ["web-get-provider-runtime", "web-selection-control"],
          code: [
            {
              title: "main.js",
              lang: "js",
              code: `import { useThemeRuntime } from "@themvora/web";

// Safe inside a \`theme-ready\` handler, or after the provider has upgraded.
const runtime = useThemeRuntime();
console.log(runtime.themes.map((theme) => theme.name));`,
            },
          ],
        },
        {
          id: "web-selection-control",
          name: "selection.setMode() / setFamily() / toggleTheme()",
          covers: ["Mode and family control"],
          what: "The three calls every control ultimately makes. The built-in `<themvora-toggle>` and `<themvora-select>` call exactly these, so a custom control needs no other API.",
          when: "Your own button, a keyboard shortcut, or a control inside a framework that has not adopted a Themvora element.",
          effect: "The selection changes, the document repaints, and every subscribed consumer is notified — identical to using the built-in elements.",
          related: ["web-use-runtime", "web-toggle-el"],
          code: [
            {
              title: "main.js",
              lang: "js",
              code: `import { useThemeRuntime } from "@themvora/web";

const runtime = useThemeRuntime();

document.querySelector("#dark").addEventListener("click", () => {
  runtime.selection.setMode("dark");
});

document.querySelector("#plum").addEventListener("click", () => {
  runtime.selection.setFamily("plum");
});

document.querySelector("#flip").addEventListener("click", () => {
  runtime.selection.toggleTheme();
});`,
            },
          ],
        },
        {
          id: "web-effective-mode",
          name: "useEffectiveThemeMode() / observeEffectiveThemeMode()",
          covers: ["useEffectiveThemeMode() / observeEffectiveThemeMode()"],
          what: "`useEffectiveThemeMode()` returns the applied mode (`light` or `dark`); `observeEffectiveThemeMode(listener)` subscribes to it and returns an unsubscribe.",
          when: "A label that states the current appearance, or a non-DOM consumer (a canvas, a chart library) that must follow the appearance rather than the request.",
          effect: "Both track the applied mode, so they move at an OS change and at a sunrise/sunset transition — unlike the selection's `mode`, which does not.",
          related: ["web-selection-subscribe", "web-scheduled-attr"],
          code: [
            {
              title: "main.js",
              lang: "js",
              code: `import { observeEffectiveThemeMode, useEffectiveThemeMode } from "@themvora/web";

document.body.dataset.appearance = useEffectiveThemeMode();

const unsubscribe = observeEffectiveThemeMode((selection) => {
  repaintCanvas(selection.mode);
});`,
            },
          ],
        },
      ],
    },
  ],
  recipes: [
    {
      id: "static-page",
      title: "A themed static page with no build step",
      problem:
        "A marketing page or CMS template needs a working theme switcher but has no framework and no bundler.",
      apis: ["import \"@themvora/web\"", "<themvora-provider>", "<themvora-toggle>", "<themvora-select>"],
      why: "The import registers the elements and the stylesheet; everything else is markup. The configuration lives in attributes, so it survives any template engine that can emit HTML.",
      expect:
        "A working light/dark toggle and family picker, with the choice persisted across reloads, on a page with no application code.",
      code: [
        {
          title: "index.html",
          lang: "html",
          code: `<themvora-provider
  themes="mint-light mint-dark plum-light plum-dark"
  default-theme="mint-light"
  initial-mode="system"
>
  <header>
    <themvora-toggle></themvora-toggle>
    <themvora-select type="family" label="Theme family"></themvora-select>
  </header>
  <main>
    <h1>Static, themed, persisted</h1>
  </main>
</themvora-provider>

<script type="module">
  import "@themvora/web";
</script>`,
        },
      ],
    },
    {
      id: "framework-island",
      title: "Adopt Themvora inside an existing framework page",
      problem:
        "The page is rendered by a framework that does not have a Themvora adapter, but one region needs to be themed and switchable.",
      apis: ["<themvora-provider>", "<themvora-scope>", "getProviderRuntime()"],
      why: "Custom elements are framework-agnostic: the framework renders the tags, the browser upgrades them, and the scoped element keeps the region's theme independent of the host app.",
      expect:
        "The region is themed and switchable while the rest of the page keeps whatever styling it already had.",
      caveats:
        "A `<themvora-provider>` applies the theme to the document, not only to its subtree. Use `<themvora-scope>` when the surrounding page must not be repainted.",
      code: [
        {
          title: "Embedded region",
          lang: "html",
          code: `<themvora-scope theme="cocoa-dark">
  <div>
    <h2>Embedded widget</h2>
    <themvora-toggle></themvora-toggle>
  </div>
</themvora-scope>`,
        },
      ],
    },
    {
      id: "canvas-consumer",
      title: "Keep a canvas in step with the theme",
      problem:
        "A chart library draws to a canvas and cannot read CSS variables, so it keeps rendering the old palette after a theme change.",
      apis: ["runtime.store.subscribe()", "useThemeRuntime()"],
      why: "The store subscription delivers the new theme definition, whose tokens are the resolved values — exactly what the canvas needs. Re-reading inside the callback avoids caching a stale theme.",
      expect:
        "The canvas repaints with the new palette on every theme change, including one triggered by the toggle or by a schedule.",
      caveats:
        "Unsubscribe when the widget is removed; a subscription holds the runtime and the callback alive.",
      code: [
        {
          title: "main.js",
          lang: "js",
          code: `import { useThemeRuntime } from "@themvora/web";

const runtime = useThemeRuntime();
const canvas = document.querySelector("#chart");

const unsubscribe = runtime.store.subscribe((theme) => {
  const colors = theme.tokens?.colors ?? {};
  drawChart(canvas, {
    background: colors.background,
    foreground: colors.foreground,
    accent: colors.primary,
  });
});`,
        },
      ],
    },
  ],
  combining: [
    {
      id: "full-page",
      title: "Everything on one page",
      body: "Provider, controls, a scoped panel, the overlay scrollbar and the inspector — the full element set configured by attributes alone.",
      code: [
        {
          title: "index.html",
          lang: "html",
          code: `<themvora-provider
  themes="mint-light mint-dark plum-light plum-dark"
  default-theme="mint-light"
  initial-mode="system"
  transition='{"enabled":true,"duration":250}'
  scrollbar
>
  <header>
    <themvora-toggle></themvora-toggle>
    <themvora-select type="family" label="Theme family"></themvora-select>
  </header>

  <main>
    <h1>Themed, switchable, persisted</h1>

    <themvora-scope theme="cocoa-dark">
      <p>This panel keeps its own theme.</p>
    </themvora-scope>
  </main>

  <themvora-scrollbar></themvora-scrollbar>
  <themvora-inspector></themvora-inspector>
</themvora-provider>`,
        },
      ],
    },
    {
      id: "custom-control",
      title: "Build your own control",
      body: "A three-state segmented control built on the runtime, mirroring what the built-in toggle does — including reading the applied mode for the label and the selection for the pressed state.",
      code: [
        {
          title: "main.js",
          lang: "js",
          code: `import { observeEffectiveThemeMode, useThemeRuntime } from "@themvora/web";

const runtime = useThemeRuntime();
const buttons = document.querySelectorAll("[data-mode-option]");

for (const button of buttons) {
  button.addEventListener("click", () => {
    runtime.selection.setMode(button.dataset.modeOption);
  });
}

// The pressed state is the selection; the label is the applied mode.
const unsubscribe = observeEffectiveThemeMode(({ mode }) => {
  document.querySelector("#appearance").textContent = mode;
});`,
        },
      ],
    },
  ],
  notAvailable: [
    {
      name: "Hooks and composables",
      reason:
        "This package has no framework runtime, so there is no `useTheme()` returning reactive state. Use the elements' attributes and events, or the imperative helpers above.",
    },
    {
      name: "Theme history and snapshots",
      reason:
        "No element or helper wraps them. The runtime you get from `useThemeRuntime()` or `getProviderRuntime()` has `history` and `snapshot()` members — reach for those directly if you need them.",
    },
  ],
};
