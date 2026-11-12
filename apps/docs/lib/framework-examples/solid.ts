import type { FrameworkExamples } from "./types";

/**
 * Solid examples and use cases.
 *
 * Solid's composables return accessors (signals), so a component calls them
 * and reads the value by calling the accessor. One contract is easy to get
 * wrong and is called out where it matters: `useThemeHistory()` returns
 * **getters**, not signals, so destructuring it snapshots the value and stops
 * updating — keep the object.
 */
export const solidExamples: FrameworkExamples = {
  slug: "solid",
  sections: {
    startHere: "Provider, then accessors",
    useCases: "Reactivity that survives destructuring",
    api: "Accessors, components, and bindings",
    combining: "A settings panel with fine-grained updates",
  },
  intro: [
    "The Solid integration is signal-based end to end: every read is an accessor you call, and the runtime's subscriptions are disposed with the owning component. Because Solid components run once, an accessor call inside JSX is what creates the reactive dependency — calling it outside JSX gives you a value, not a subscription.",
    "The provider must wrap the tree: the runtime is published through Solid's context, and `useThemeRuntime()` throws outside it.",
  ],
  startHere: {
    body: "Wrap the app in `ThemeProvider`. It creates the runtime, installs the DOM and CSS-variable bindings, injects the pre-paint bootstrap and publishes the runtime through context.",
    note: "No `themes` prop means the built-in neutral themes, so the minimal setup needs no configuration at all.",
    code: [
      {
        title: "src/index.tsx",
        lang: "tsx",
        code: `import { render } from "solid-js/web";
import { ThemeProvider } from "@themvora/solid";
import { App } from "./App";

render(
  () => (
    <ThemeProvider defaultTheme="mint-light" initialMode="system">
      <App />
    </ThemeProvider>
  ),
  document.getElementById("root")!,
);`,
      },
      {
        title: "src/App.tsx",
        lang: "tsx",
        code: `import { useTheme } from "@themvora/solid";

export function App() {
  const { theme, effectiveMode, toggleTheme } = useTheme();

  // Accessors: call them to read, and call them inside JSX to stay reactive.
  return (
    <main>
      <h1>{theme().name}</h1>
      <p>Currently rendering in {effectiveMode()} mode.</p>
      <button onClick={toggleTheme}>Switch mode</button>
    </main>
  );
}`,
      },
    ],
  },
  categories: [
    {
      id: "provider",
      label: "Provider",
      intro:
        "The provider is the runtime boundary. Everything else reads the runtime it establishes.",
      entries: [
        {
          id: "solid-provider",
          name: "ThemeProvider",
          covers: ["ThemeProvider"],
          what: "Creates the runtime, installs the DOM and CSS-variable bindings, injects the pre-paint bootstrap script, and publishes the runtime through Solid context. Accepts every runtime option plus `runtime` to supply your own.",
          when: "Once, at the render root. `useThemeRuntime()` and every composable throw without it.",
          effect: "The active theme's variables and `data-theme` are applied to the document, and consumers re-run when the selection changes.",
          related: ["solid-use-theme"],
          code: [
            {
              title: "src/index.tsx",
              lang: "tsx",
              code: `import { render } from "solid-js/web";
import { ThemeProvider } from "@themvora/solid";
import { getBuiltInThemes } from "@themvora/core";
import { App } from "./App";

const themes = getBuiltInThemes();

render(
  () => (
    <ThemeProvider
      themes={themes}
      defaultTheme="mint-light"
      transition={{ enabled: true, duration: 250 }}
    >
      <App />
    </ThemeProvider>
  ),
  document.getElementById("root")!,
);`,
            },
          ],
        },
      ],
    },
    {
      id: "signals",
      label: "Signals",
      intro:
        "Every read is an accessor. Call it inside JSX (or inside a memo or effect) to subscribe; call it once in the component body and you have a plain value.",
      entries: [
        {
          id: "solid-use-theme",
          name: "useTheme()",
          covers: ["useTheme()"],
          what: "Returns accessors for `theme`, `mode`, `effectiveMode` and `family`, plus `setMode`, `setFamily` and `toggleTheme` as plain functions.",
          when: "A component needs more than one slice — a settings panel, or a header with the theme name and a toggle.",
          effect: "Reading an accessor inside JSX creates the dependency, so the DOM updates when that value changes.",
          related: ["solid-use-theme-mode", "solid-effective-mode"],
          code: [
            {
              title: "src/ThemeSummary.tsx",
              lang: "tsx",
              code: `import { useTheme } from "@themvora/solid";

export function ThemeSummary() {
  const { theme, mode, effectiveMode, family, setMode, toggleTheme } = useTheme();

  return (
    <section>
      <h2>{theme().name}</h2>
      <p>
        Family {family()} · requested {mode()} · showing {effectiveMode()}
      </p>
      <button onClick={toggleTheme}>Toggle</button>
      <button onClick={() => setMode("system")}>Follow system</button>
    </section>
  );
}`,
            },
          ],
        },
        {
          id: "solid-use-theme-mode",
          name: "useThemeMode() / useThemeFamily() / useThemeValue() / useThemeTokens()",
          covers: ["useTheme()"],
          what: "Granular accessors: the requested mode, the active family, the active theme definition, and its token group.",
          when: "A control that needs one value and should not re-run when the others change.",
          effect: "Each accessor subscribes only to its own source; `useThemeTokens()` returns `undefined` for a theme with no tokens.",
          related: ["solid-use-theme"],
          code: [
            {
              title: "src/TokenReadout.tsx",
              lang: "tsx",
              code: `import { useThemeTokens, useThemeValue } from "@themvora/solid";

export function TokenReadout() {
  const theme = useThemeValue();
  const tokens = useThemeTokens();

  return (
    <dl>
      <dt>Theme</dt>
      <dd>{theme().meta?.label ?? theme().name}</dd>
      <dt>Primary</dt>
      <dd>{tokens()?.colors?.primary ?? "not declared"}</dd>
    </dl>
  );
}`,
            },
          ],
        },
        {
          id: "solid-effective-mode",
          name: "useEffectiveThemeMode()",
          covers: ["useEffectiveThemeMode()"],
          what: "An accessor for the mode actually applied — `light` or `dark`, never `system`.",
          when: "Any label, icon or `aria-pressed` that states the current appearance. With `system`, `mode()` never moves; `effectiveMode()` does.",
          effect: "Updates on a click, an OS appearance change, and a sunrise/sunset transition.",
          related: ["solid-use-theme", "solid-schedule"],
          code: [
            {
              title: "src/AppearanceIcon.tsx",
              lang: "tsx",
              code: `import { useEffectiveThemeMode } from "@themvora/solid";

export function AppearanceIcon() {
  const effectiveMode = useEffectiveThemeMode();

  return (
    <span aria-label={\`\${effectiveMode()} mode\`}>
      {effectiveMode() === "dark" ? "🌙" : "☀️"}
    </span>
  );
}`,
            },
          ],
        },
        {
          id: "solid-history",
          name: "useThemeHistory()",
          covers: ["useThemeHistory()"],
          what: "Returns `undo`, `redo`, `clear`, `jump` and **getters** for `canUndo`, `canRedo` and `history`. The getters read internal signals, so they are reactive only while the returned object is kept intact.",
          when: "A theme editor or live preview where the visitor experiments and wants to step back or jump to a point.",
          effect: "Reading `history.canUndo` in JSX tracks the underlying signal. Destructuring (`const { canUndo } = …`) evaluates the getter once and stops updating — the single most common Solid mistake with this API.",
          related: ["solid-snapshot", "solid-batch"],
          code: [
            {
              title: "src/HistoryControls.tsx",
              lang: "tsx",
              code: `import { For } from "solid-js";
import { useThemeHistory } from "@themvora/solid";

export function HistoryControls() {
  // Keep the object: \`canUndo\` and \`history\` are getters, not signals.
  const history = useThemeHistory();

  return (
    <div>
      <button onClick={history.undo} disabled={!history.canUndo}>Undo</button>
      <button onClick={history.redo} disabled={!history.canRedo}>Redo</button>

      <ol>
        <For each={history.history}>
          {(entry, index) => (
            <li>
              <button onClick={() => history.jump(index())}>{entry.theme.name}</button>
            </li>
          )}
        </For>
      </ol>
    </div>
  );
}`,
            },
          ],
        },
        {
          id: "solid-batch",
          name: "useThemeBatch()",
          covers: ["useThemeBatch()"],
          what: "Returns a function that runs its callback with DOM writes and notifications coalesced into one store update.",
          when: "Several changes belong together: family plus mode, or a token patch plus a selection.",
          effect: "Subscribers observe one consolidated change instead of an intermediate state.",
          related: ["solid-history", "solid-use-theme"],
          code: [
            {
              title: "src/ApplyPreset.tsx",
              lang: "tsx",
              code: `import { useThemeBatch, useThemeRuntime } from "@themvora/solid";

export function ApplyPreset() {
  const batch = useThemeBatch();
  const runtime = useThemeRuntime();

  function applyPreset() {
    batch(() => {
      runtime.selection.setFamily("plum");
      runtime.selection.setMode("dark");
    });
  }

  return <button onClick={applyPreset}>Plum, dark</button>;
}`,
            },
          ],
        },
        {
          id: "solid-snapshot",
          name: "useThemeSnapshot() / useThemeRestore()",
          covers: ["useThemeSnapshot() / useThemeRestore()"],
          what: "Two functions: one captures the full runtime state as a serialisable value, the other re-applies one.",
          when: "Named presets the visitor saves, or a checkpoint around a destructive edit.",
          effect: "Restoring replaces the active theme and selection and notifies subscribers once.",
          related: ["solid-history"],
          code: [
            {
              title: "src/SavedLooks.tsx",
              lang: "tsx",
              code: `import { createSignal } from "solid-js";
import { useThemeRestore, useThemeSnapshot } from "@themvora/solid";

export function SavedLooks() {
  const snapshot = useThemeSnapshot();
  const restore = useThemeRestore();
  const [saved, setSaved] = createSignal<ReturnType<typeof snapshot> | null>(null);

  return (
    <div>
      <button onClick={() => setSaved(snapshot())}>Save this look</button>
      <button
        disabled={saved() === null}
        onClick={() => {
          const value = saved();
          if (value) restore(value);
        }}
      >
        Restore
      </button>
    </div>
  );
}`,
            },
          ],
        },
        {
          id: "solid-lifecycle",
          name: "useThemeLifecycle()",
          covers: ["useThemeLifecycle()"],
          what: "A typed subscription to runtime lifecycle events such as `beforeThemeChange` and `afterPersist`.",
          when: "You need to react to a change rather than to state — analytics, syncing an external store.",
          effect: "The handler runs when the event fires; the returned unsubscribe stops it. Subscribing does not re-run the component.",
          related: ["solid-batch", "solid-use-theme"],
          code: [
            {
              title: "src/ThemeAnalytics.tsx",
              lang: "tsx",
              code: `import { onCleanup } from "solid-js";
import { useThemeLifecycle } from "@themvora/solid";

export function ThemeAnalytics() {
  const { on } = useThemeLifecycle();

  // This subscription is ours, not the composable's — release it explicitly.
  const off = on("afterThemeChange", ({ theme }) => {
    window.dispatchEvent(new CustomEvent("app:theme-changed", { detail: theme.name }));
  });

  onCleanup(off);
  return null;
}`,
            },
          ],
        },
        {
          id: "solid-packs",
          name: "useThemePacks()",
          covers: ["useThemePacks()"],
          what: "Returns a function that installs a theme pack into the runtime's registry at runtime.",
          when: "Themes arrive after mount: fetched from an API, generated from a brand colour, or code-split out of the initial bundle.",
          effect: "The registry grows; consumers of `useProvidedThemes()` see the new families. The active selection is untouched unless the pack changes it.",
          related: ["solid-use-theme"],
          code: [
            {
              title: "src/BrandPack.tsx",
              lang: "tsx",
              code: `import { createEffect } from "solid-js";
import { useThemePacks } from "@themvora/solid";
import { generateTheme } from "@themvora/core";

export function BrandPack(props: { seed: string }) {
  const usePack = useThemePacks();

  createEffect(() => {
    const generated = generateTheme({ seed: props.seed, family: "brand" });
    usePack({ themes: [generated.light, generated.dark] });
  });

  return null;
}`,
            },
          ],
        },
        {
          id: "solid-schedule",
          name: "useThemeSchedule()",
          covers: ["useThemeSchedule()"],
          what: "Returns a controller with `enable()`, `disable()`, `set()` and getters for `enabled`, `active`, `status`, `sunrise`, `sunset` and `nextTransition`. Returns `null` when the provider has no `scheduled` option.",
          when: "A settings row that turns daylight following on or off, or a readout of the next automatic switch.",
          effect: "The getters read a signal that updates as the sun moves. Because it returns `null` without a schedule, guard before using it.",
          related: ["solid-effective-mode", "solid-provider"],
          code: [
            {
              title: "src/DaylightSwitch.tsx",
              lang: "tsx",
              code: `import { Show } from "solid-js";
import { useThemeSchedule } from "@themvora/solid";

export function DaylightSwitch() {
  const schedule = useThemeSchedule();

  return (
    <Show when={schedule}>
      {(controller) => (
        <label>
          <input
            type="checkbox"
            checked={controller().enabled}
            onChange={() =>
              controller().enabled ? controller().disable() : controller().enable()
            }
          />
          Follow daylight
        </label>
      )}
    </Show>
  );
}`,
            },
          ],
        },
      ],
    },
    {
      id: "library-adapters",
      label: "Library adapters",
      intro:
        "Install the adapter package alongside `@themvora/solid`; the framework package does not re-export it. These helpers follow Solid's owner graph — `onMount` installs, `onCleanup` disposes — and a component that runs once needs nothing more than a call in the body.",
      entries: [
        {
          id: "solid-adapter-subpaths",
          name: "Adapter framework subpaths",
          covers: ["Adapter framework subpaths"],
          what: "The four adapter packages expose a `/solid` entry next to their other framework subpaths. The subpath is the helper that ties the adapter to an owner; the root is the bare factory.",
          when: "Any component that installs an adapter. An adapter imported from the root registers nothing, so it writes no variables at all.",
          effect: "The adapter is disposed with its owner, so a component that unmounts takes its variables with it.",
          related: ["solid-shadcn-bootstrap", "solid-adapter-factories"],
          code: [
            {
              title: "Which specifier to import",
              lang: "ts",
              code: `// Solid wrapper (lifecycle-aware) — use this in a component.
import { useShadcnTheme } from "@themvora/shadcn/solid";

// Framework-neutral factory — no lifecycle wiring.
import { createShadcnAdapter } from "@themvora/shadcn/factory";

// The adapter's own stylesheet, imported once.
import "@themvora/shadcn/shadcn.css";`,
            },
          ],
        },
        {
          id: "solid-shadcn-bootstrap",
          name: "useShadcnTheme(runtime) / useBootstrapTheme(runtime)",
          covers: ["useShadcnTheme(runtime) / useBootstrapTheme(runtime)"],
          what: "Registers the adapter with the runtime you pass: `onMount` installs it, `onCleanup` disposes it with the owner. The return value is the adapter, not an accessor — there is no reactive value to read, because the library consumes the variables directly. Since Solid components run once, calling this in the body is all that's needed; there is no dependency to track.",
          when: "shadcn/ui or Bootstrap components should follow Themvora's selection rather than a palette you maintain separately.",
          effect: "The variables are written as the component mounts — after render, before the browser paints — and removed when the owner is disposed.",
          related: ["solid-adapter-subpaths", "solid-daisy-openprops"],
          code: [
            {
              title: "src/ShadcnBridge.tsx",
              lang: "tsx",
              code: `import "@themvora/shadcn/shadcn.css";
import { useThemeRuntime } from "@themvora/solid";
import { useShadcnTheme } from "@themvora/shadcn/solid";

export function ShadcnBridge(props: { children: JSX.Element }) {
  useShadcnTheme(useThemeRuntime());
  return <>{props.children}</>;
}`,
            },
          ],
        },
        {
          id: "solid-daisy-openprops",
          name: "useDaisyTheme(runtime) / useOpenPropsTheme(runtime)",
          covers: ["useDaisyTheme(runtime) / useOpenPropsTheme(runtime)"],
          what: "daisyUI and Open Props through the same `/solid` subpath, with the same `onMount`/`onCleanup` timing and the same explicit runtime argument.",
          when: "daisyUI's semantic classes or Open Props' custom properties should follow Themvora's selection rather than their package defaults.",
          effect: "Variables are in place as the component mounts and gone when it is disposed.",
          related: ["solid-shadcn-bootstrap", "solid-adapter-factories"],
          code: [
            {
              title: "src/DaisyBridge.tsx",
              lang: "tsx",
              code: `import "@themvora/daisyui/daisyui.css";
import { useThemeRuntime } from "@themvora/solid";
import { useDaisyTheme } from "@themvora/daisyui/solid";

export function DaisyBridge(props: { children: JSX.Element }) {
  useDaisyTheme(useThemeRuntime());
  return <>{props.children}</>;
}`,
            },
          ],
        },
        {
          id: "solid-adapter-factories",
          name: "Adapter factory subpaths",
          covers: ["adapter factory subpaths"],
          what: "`@themvora/shadcn/factory`, `-bootstrap/factory`, `-daisyui/factory` and `-open-props/factory` export the adapter with no owner attached: no `onMount`, no `onCleanup`. You register it with `runtime.adapters.use(adapter)` and keep the handle.",
          when: "The runtime is created outside a component — a module, a test, or a root that is not itself a Solid owner.",
          effect: "The adapter survives until you dispose it, whatever renders in the meantime.",
          related: ["solid-adapter-subpaths"],
          code: [
            {
              title: "src/adapters.ts",
              lang: "ts",
              code: `import { createDaisyAdapter } from "@themvora/daisyui/factory";
import type { ThemeRuntime } from "@themvora/core";

export function installAdapters(runtime: ThemeRuntime) {
  const handle = runtime.adapters.use(createDaisyAdapter());
  return () => handle.dispose();
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
        "The provider tracks the option and pushes changes into the live bindings, so a signal-backed `transition` takes effect on the next switch without rebuilding the runtime.",
      entries: [
        {
          id: "solid-transition",
          name: "transition",
          covers: ["transition prop"],
          what: "Enables and configures the cross-fade applied when the theme changes — duration, easing, preset, animated properties.",
          when: "Leave the default on; tune it when the default feels slow, or disable it for an app that must repaint instantly.",
          effect: "Theme changes animate; the DOM writes still happen in one flush.",
          related: ["solid-suppress-transition", "solid-provider"],
          code: [
            {
              title: "src/index.tsx",
              lang: "tsx",
              code: `<ThemeProvider
  defaultTheme="mint-light"
  transition={{ enabled: true, duration: 250, easing: "ease-in-out" }}
>
  <App />
</ThemeProvider>`,
            },
          ],
        },
        {
          id: "solid-suppress-transition",
          name: "runtime.store.set(theme, { suppressTransition: true })",
          covers: ["runtime.store.set(theme, { suppressTransition: true })"],
          what: "Applies one theme change immediately, skipping the configured animation for that update only.",
          when: "A print path, a screenshot, or a programmatic reset where animating would look like a glitch.",
          effect: "That change is instant; later changes animate again.",
          related: ["solid-transition", "solid-use-theme"],
          code: [
            {
              title: "src/PrintTheme.tsx",
              lang: "tsx",
              code: `import { useThemeRuntime } from "@themvora/solid";

export function PrintTheme() {
  const runtime = useThemeRuntime();

  function applyForPrint() {
    const light = runtime.themes.find((theme) => theme.name === "mint-light");
    if (!light) return;
    runtime.store.set(light, { suppressTransition: true });
  }

  return <button onClick={applyForPrint}>Prepare for print</button>;
}`,
            },
          ],
        },
      ],
    },
    {
      id: "components",
      label: "Components",
      intro:
        "Solid ships the scoped-theme component, the overlay scrollbar and the inspector. The React-only mode button has no counterpart — build it from the signals above.",
      entries: [
        {
          id: "solid-theme-scope",
          name: "ThemeScope",
          covers: ["ThemeScope"],
          what: "Applies a theme to a subtree: the wrapper carries the scoped CSS variables, so only that region repaints.",
          when: "A preview panel, a marketing section in a fixed palette, or a code sample that must render in the theme it documents.",
          effect: "The global selection is neither read for the scope nor changed by it. A `family` scope follows the page mode; an exact `theme` stays pinned.",
          related: ["solid-use-theme"],
          code: [
            {
              title: "src/Preview.tsx",
              lang: "tsx",
              code: `import { ThemeScope } from "@themvora/solid";

export function Preview() {
  return (
    <ThemeScope theme="cocoa-dark">
      <h3>Always cocoa</h3>
      <p>This panel keeps its own theme while the page changes.</p>
    </ThemeScope>
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
      id: "family-picker",
      title: "A family picker driven by the registry",
      problem:
        "The settings page derives its families from a constant, so the list stops matching the registry the moment a pack is installed.",
      apis: ["useProvidedThemes()", "useTheme()"],
      why: "`useProvidedThemes()` returns a signal accessor. Call it inside JSX or a memo and the option list tracks the registry; call it once in the body and you have a snapshot that never updates.",
      expect:
        "The options come from the accessor and the selected one follows the active family. A new pack shows up once the signal updates.",
      code: [
        {
          title: "src/FamilyPicker.tsx",
          lang: "tsx",
          code: `import { For } from "solid-js";
import { useProvidedThemes, useTheme } from "@themvora/solid";

export function FamilyPicker() {
  const families = useProvidedThemes();
  const { family, setFamily } = useTheme();

  return (
    <label>
      Theme family
      <select value={family()} onChange={(e) => setFamily(e.currentTarget.value)}>
        <For each={families()}>
          {(entry) => <option value={entry.name}>{entry.name}</option>}
        </For>
      </select>
    </label>
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
      apis: ["useEffectiveThemeMode()", "useTheme()"],
      why: "`effectiveMode()` is the applied appearance; `mode()` is the standing request. The label needs the first, the click needs the second.",
      expect:
        "Icon and label always match the page; a click pins an explicit mode so a `system` visitor stops following the OS.",
      code: [
        {
          title: "src/ModeToggle.tsx",
          lang: "tsx",
          code: `import { useEffectiveThemeMode, useTheme } from "@themvora/solid";

export function ModeToggle() {
  const effectiveMode = useEffectiveThemeMode();
  const { mode, setMode } = useTheme();
  const next = () => (effectiveMode() === "dark" ? "light" : "dark");

  return (
    <button
      aria-pressed={effectiveMode() === "dark"}
      aria-label={\`Switch to \${next()} mode\`}
      onClick={() => setMode(next())}
    >
      {effectiveMode() === "dark" ? "🌙 Dark" : "☀️ Light"}
      {mode() === "system" ? " (auto)" : null}
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
      apis: ["ThemeScope", "useProvidedThemes()"],
      why: "`ThemeScope` writes the scoped variables onto its own wrapper and renders `children` inside them, so previews coexist without the global selection moving.",
      expect:
        "Each card renders in its own family; clicking one commits the choice through the setter.",
      code: [
        {
          title: "src/ThemeGallery.tsx",
          lang: "tsx",
          code: `import { For } from "solid-js";
import { ThemeScope, useProvidedThemes, useTheme } from "@themvora/solid";

export function ThemeGallery() {
  const families = useProvidedThemes();
  const { setFamily } = useTheme();

  return (
    <div>
      <For each={families()}>
        {(entry) => (
          <button onClick={() => setFamily(entry.name)}>
            <ThemeScope family={entry.name}>
              <strong>{entry.name}</strong>
              <p>The quick brown fox</p>
            </ThemeScope>
          </button>
        )}
      </For>
    </div>
  );
}`,
        },
      ],
    },
    {
      id: "ssr-bootstrap",
      title: "Zero flash on a server-rendered Solid app",
      problem:
        "SolidStart renders the page on the server, but the theme is only known in the browser — so the first paint is the default theme and is corrected after hydration.",
      apis: ["createSolidThemeBootstrapScript()", "ThemeProvider"],
      why: "The generated script applies the persisted selection in `<head>` before the body is parsed, using the same storage key and prefix as the provider's persistence.",
      expect:
        "The first paint is the persisted theme; no correction frame on reload.",
      caveats:
        "Emit the script from the same module that defines the themes, so the embedded registry and the runtime's registry cannot disagree.",
      code: [
        {
          title: "src/entry-server.tsx",
          lang: "tsx",
          code: `import { createSolidThemeBootstrapScript } from "@themvora/solid";
import { getBuiltInThemes } from "@themvora/core";

const themes = getBuiltInThemes();

export const themeScript = createSolidThemeBootstrapScript({
  themes,
  defaultTheme: "mint-light",
});`,
        },
      ],
    },
  ],
  combining: [
    {
      id: "settings-page",
      title: "A complete appearance settings panel",
      body: "Family, mode and history controls in one component. Each control reads only the accessor it displays, so a token change does not re-run the panel.",
      code: [
        {
          title: "src/AppearanceSettings.tsx",
          lang: "tsx",
          code: `import { For } from "solid-js";
import {
  useEffectiveThemeMode,
  useProvidedThemes,
  useTheme,
  useThemeHistory,
} from "@themvora/solid";

const MODES = ["light", "dark", "system"] as const;

export function AppearanceSettings() {
  const families = useProvidedThemes();
  const { family, setFamily, mode, setMode } = useTheme();
  const effectiveMode = useEffectiveThemeMode();
  // Getters: keep the object so \`canUndo\` stays reactive.
  const history = useThemeHistory();

  return (
    <form>
      <label>
        Family
        <select value={family()} onChange={(e) => setFamily(e.currentTarget.value)}>
          <For each={families()}>
            {(entry) => <option value={entry.name}>{entry.name}</option>}
          </For>
        </select>
      </label>

      <fieldset>
        <legend>Mode</legend>
        <For each={MODES}>
          {(option) => (
            <label>
              <input
                type="radio"
                name="mode"
                checked={mode() === option}
                onChange={() => setMode(option)}
              />
              {option}
              {option === mode() && mode() === "system" ? \` (now \${effectiveMode()})\` : null}
            </label>
          )}
        </For>
      </fieldset>

      <button type="button" disabled={!history.canUndo} onClick={history.undo}>
        Undo last change
      </button>
    </form>
  );
}`,
        },
      ],
    },
    {
      id: "brand-pack",
      title: "Install a generated brand theme at runtime",
      body: "A seed colour becomes a light/dark pair, the pair is registered, and the family is selected — batched so the page never paints the half-applied state.",
      code: [
        {
          title: "src/BrandSetup.tsx",
          lang: "tsx",
          code: `import { useThemeBatch, useThemePacks, useThemeRuntime } from "@themvora/solid";
import { generateTheme } from "@themvora/core";

export function BrandSetup(props: { seed: string }) {
  const usePack = useThemePacks();
  const batch = useThemeBatch();
  const runtime = useThemeRuntime();

  function applyBrand() {
    const generated = generateTheme({ seed: props.seed, family: "brand" });
    batch(() => {
      usePack({ themes: [generated.light, generated.dark] });
      runtime.selection.setFamily("brand");
    });
  }

  return <button onClick={applyBrand}>Use {props.seed}</button>;
}`,
        },
      ],
    },
  ],
  notAvailable: [
    {
      name: "useThemeTimeTravel()",
      reason:
        "Not exported here. `useThemeHistory()` exposes `history` and `jump(index)` instead — keep the returned object intact or the getters stop updating.",
    },
    {
      name: "ThemeModeButton",
      reason:
        "React-only. Build the equivalent from `useTheme()` — the recipe on this page does exactly that.",
    },
  ],
};
