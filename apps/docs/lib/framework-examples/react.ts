import type { FrameworkExamples } from "./types";

/**
 * React examples and use cases.
 *
 * Every entry was written against `packages/react/src` — the hook return
 * shapes come from `hooks.ts` (`useTheme` returns a plain object of values and
 * stable setters; `useThemeBatch` returns a *function*, not a value) and the
 * component props from `theme-scope.tsx` / `theme-mode-button.tsx` /
 * `inspector.tsx`. Where a hook's contract is easy to get wrong from the name
 * alone, the entry says so instead of showing a plausible-looking call.
 */
export const reactExamples: FrameworkExamples = {
  slug: "react",
  sections: {
    startHere: "One provider at the root",
    useCases: "The screens a themed app needs",
    api: "Exports, by category",
    combining: "Assembling a settings surface",
  },
  intro: [
    "React gets the widest surface of any integration: a provider that owns the runtime, hooks for every slice of theme state, scoped subtrees, a mode button and an inspector, optional root-level bootstrap, adapters for four UI libraries, and transition control.",
    "The examples below are ordered the way you would reach for them — provider first, then the state hooks, then the components, adapters and transitions. Each one states what the export does, when it beats the simpler alternative, and what changes on screen.",
  ],
  startHere: {
    body: "One provider at the root is the whole prerequisite. It creates the runtime, writes the active theme's CSS variables to `<html>`, and makes every hook below it work. Nothing else in this page runs without it.",
    note: "The built-in neutral themes need no configuration, so `ThemeProvider` with no `themes` prop is a complete setup rather than a placeholder.",
    code: [
      {
        title: "src/main.tsx",
        lang: "tsx",
        code: `import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ThemeProvider } from "@themvora/react";
import { App } from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider initialMode="system">
      <App />
    </ThemeProvider>
  </StrictMode>,
);`,
      },
      {
        title: "src/App.tsx",
        lang: "tsx",
        code: `import { useTheme } from "@themvora/react";

export function App() {
  const { theme, effectiveMode, toggleTheme } = useTheme();

  return (
    <main>
      <h1>{theme.name}</h1>
      <p>Currently rendering in {effectiveMode} mode.</p>
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
        "The provider is the runtime boundary. Everything else — hooks, scopes, adapters, transitions — reads the runtime it establishes.",
      entries: [
        {
          id: "theme-provider",
          name: "ThemeProvider",
          covers: ["ThemeProvider"],
          what: "Creates a runtime, installs the DOM and CSS-variable bindings, injects the pre-paint bootstrap script, and publishes the runtime through React context. It accepts every `ThemeRuntimeOptions` prop plus `initialMode` and `initialFamily`.",
          when: "Once, at the root of the app. Every hook in this package reads the runtime from this context and throws without it, so this is the one non-optional piece.",
          effect: "The active theme's variables and `data-theme` appear on `<html>` before the first paint, and children re-render when the selection changes.",
          related: ["runtime-injection", "use-theme"],
          code: [
            {
              title: "src/main.tsx",
              lang: "tsx",
              code: `import { createRoot } from "react-dom/client";
import { ThemeProvider } from "@themvora/react";
import { getBuiltInThemes } from "@themvora/core";
import { App } from "./App";

const themes = getBuiltInThemes();

createRoot(document.getElementById("root")!).render(
  <ThemeProvider
    themes={themes}
    defaultTheme="mint-light"
    initialMode="system"
    transition={{ enabled: true, duration: 250 }}
  >
    <App />
  </ThemeProvider>,
);`,
            },
          ],
        },
        {
          id: "runtime-injection",
          name: "runtime / initial",
          covers: ["Runtime injection"],
          what: "`runtime` hands the provider a runtime you already own, so the provider neither creates nor destroys it. `initial` seeds the selection the server already resolved, so the hydration render matches the server HTML.",
          when: "Two situations: the runtime has to be reachable outside React (a vanilla widget on the same page, a second root), or the server resolved the selection and recomputing it on the client would produce a different first render.",
          effect: "With `runtime`, unmounting the provider leaves the runtime alive. With `initial`, React's hydration render equals the server's markup — no theme flicker and no hydration mismatch warning.",
          related: ["theme-provider", "create-theme-root"],
          code: [
            {
              title: "src/theme-runtime.ts",
              lang: "ts",
              code: `import { createThemeRuntime, getBuiltInThemes } from "@themvora/core";

export const runtime = createThemeRuntime({
  themes: getBuiltInThemes(),
  defaultTheme: "mint-light",
});`,
            },
            {
              title: "src/main.tsx",
              lang: "tsx",
              code: `import { createRoot } from "react-dom/client";
import { ThemeProvider } from "@themvora/react";
import { App } from "./App";
import { runtime } from "./theme-runtime";

createRoot(document.getElementById("root")!).render(
  <ThemeProvider runtime={runtime}>
    <App />
  </ThemeProvider>,
);`,
            },
            {
              title: "Server-resolved first render",
              lang: "tsx",
              code: `// \`initial\` is what the server rendered. Pass the same object to the client
// so hydration matches, instead of letting the client re-derive the selection.
<ThemeProvider runtime={runtime} initial={{ theme, selection }}>
  <App />
</ThemeProvider>`,
            },
          ],
        },
        {
          id: "scheduled-prop",
          name: "scheduled",
          covers: ["scheduled prop"],
          what: "Starts a sunrise/sunset driver inside the runtime. Between sunrise and sunset the runtime applies `lightTheme`; outside it, `darkTheme`. Coordinates are optional — the visitor's timezone supplies them.",
          when: "The appearance should follow daylight without asking the visitor, or a kiosk should track local daylight with no interaction at all.",
          effect: "The page changes theme at the visitor's local sunrise and sunset. `useThemeMode()` keeps reporting what the visitor asked for; `useEffectiveThemeMode()` follows the sun.",
          related: ["use-theme-schedule", "use-effective-theme-mode"],
          code: [
            {
              title: "src/main.tsx",
              lang: "tsx",
              code: `import { createRoot } from "react-dom/client";
import { ThemeProvider } from "@themvora/react";
import { App } from "./App";

createRoot(document.getElementById("root")!).render(
  <ThemeProvider
    initialMode="system"
    scheduled={{ lightTheme: "mint-light", darkTheme: "mint-dark" }}
  >
    <App />
  </ThemeProvider>,
);`,
            },
            {
              title: "src/main.tsx — pinned location",
              lang: "tsx",
              code: `import { createRoot } from "react-dom/client";
import { ThemeProvider } from "@themvora/react";
import { App } from "./App";

// Auto-detection reads the browser timezone. Pin it when the app must follow
// a specific place rather than the visitor — a storefront for one city.
createRoot(document.getElementById("root")!).render(
  <ThemeProvider
    scheduled={{
      lightTheme: "mint-light",
      darkTheme: "mint-dark",
      latitude: 27.7172,
      longitude: 85.324,
    }}
  >
    <App />
  </ThemeProvider>,
);`,
            },
          ],
        },
      ],
    },
    {
      id: "root-bootstrap",
      label: "Root bootstrap",
      intro:
        "Both entries below mount the same application. The difference is who owns the React root and when the first commit is flushed.",
      entries: [
        {
          id: "create-theme-root",
          name: "createThemeRoot()",
          covers: ["createThemeRoot()"],
          what: "Creates the runtime, mounts the provider, and flushes the **first** commit synchronously so the browser's first frame is already the themed UI. It returns `{ root, runtime, unmount }`, and its `render` callback receives the runtime so other providers can be composed around it.",
          when: "Client-rendered apps where a reload can paint an empty or unthemed frame — reload-sensitive demos, apps whose UI-library provider needs the runtime at composition time. Not for SSR: server HTML must be hydrated, not replaced.",
          effect: "No flash on reload. Only the first commit is synchronous; later renders keep React's normal concurrent scheduling. Because it mounts the provider itself, do not render a second `ThemeProvider` inside `render`.",
          related: ["standard-create-root", "runtime-injection"],
          code: [
            {
              title: "src/main.tsx",
              lang: "tsx",
              code: `import { createThemeRoot } from "@themvora/react";
import { App } from "./App";

const handle = createThemeRoot({
  container: document.getElementById("root")!,
  defaultTheme: "mint-light",
  initialMode: "system",
  transition: { enabled: true },
  render: () => <App />,
});

// Hot-reload or teardown: unmounts the tree and destroys the runtime.
handle.unmount();`,
            },
            {
              title: "Composing a library provider",
              lang: "tsx",
              code: `import { createThemeRoot } from "@themvora/react";
import { MuiThemeProvider } from "@themvora/mui";
import { App } from "./App";

createThemeRoot({
  container: document.getElementById("root")!,
  defaultTheme: "mint-light",
  render: ({ runtime }) => (
    <MuiThemeProvider runtime={runtime}>
      <App />
    </MuiThemeProvider>
  ),
});`,
            },
          ],
        },
        {
          id: "standard-create-root",
          name: "createRoot() + ThemeProvider",
          covers: ["Standard createRoot()"],
          what: "The plain React entry point. You mount `ThemeProvider` yourself and React schedules the first commit.",
          when: "The default. Reach for it unless you have measured a first-frame flash that `createThemeRoot` removes — most apps are smooth without it, and this keeps the root yours.",
          effect: "Identical theming behaviour; the first commit follows React's concurrent scheduling rather than being forced.",
          related: ["create-theme-root", "theme-provider"],
          code: [
            {
              title: "src/main.tsx",
              lang: "tsx",
              code: `import { createRoot } from "react-dom/client";
import { ThemeProvider } from "@themvora/react";
import { App } from "./App";

createRoot(document.getElementById("root")!).render(
  <ThemeProvider defaultTheme="mint-light" initialMode="system">
    <App />
  </ThemeProvider>,
);`,
            },
          ],
        },
      ],
    },
    {
      id: "hooks",
      label: "Hooks",
      intro:
        "Reads return plain values and re-render the calling component; setters are stable identities and do not. That split is deliberate — a control that only writes never needs to re-render.",
      entries: [
        {
          id: "use-theme",
          name: "useTheme()",
          covers: ["useTheme()"],
          what: "The aggregate hook: `{ theme, mode, effectiveMode, family, setMode, setFamily, toggleTheme }`. `theme` is the active theme definition, `mode` is what the visitor asked for, `effectiveMode` is what is on screen.",
          when: "A component needs more than one slice at once — a settings panel, a header that shows the theme name and a toggle. For a single value, the granular hooks below re-render less.",
          effect: "The component re-renders whenever the theme, mode, effective mode or family changes, and the setters immediately update the page.",
          related: ["use-theme-mode", "use-effective-theme-mode", "use-set-theme-mode"],
          code: [
            {
              title: "src/ThemeSummary.tsx",
              lang: "tsx",
              code: `import { useTheme } from "@themvora/react";

export function ThemeSummary() {
  const { theme, mode, effectiveMode, family, setMode, toggleTheme } = useTheme();

  return (
    <section>
      <h2>{theme.name}</h2>
      <p>
        Family {family} · requested {mode} · showing {effectiveMode}
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
          id: "use-theme-value",
          name: "useThemeValue() / useThemeTokens()",
          covers: ["useThemeValue() / useThemeTokens()"],
          what: "`useThemeValue()` returns the active theme definition (name, `meta`, `tokens`); `useThemeTokens()` returns just its `tokens` group, or `undefined` when the theme declares none.",
          when: "You need theme data rather than a selection control — rendering the theme's label, computing a chart palette from its tokens, or building a preview card.",
          effect: "Re-renders on every theme change. `useThemeTokens()` is the cheaper read when the name and metadata are irrelevant.",
          related: ["use-theme", "use-generated-theme"],
          code: [
            {
              title: "src/TokenReadout.tsx",
              lang: "tsx",
              code: `import { useThemeTokens, useThemeValue } from "@themvora/react";

export function TokenReadout() {
  const theme = useThemeValue();
  const tokens = useThemeTokens();

  return (
    <dl>
      <dt>Theme</dt>
      <dd>{theme.meta?.label ?? theme.name}</dd>
      <dt>Primary</dt>
      <dd>{tokens?.colors?.primary ?? "not declared"}</dd>
    </dl>
  );
}`,
            },
          ],
        },
        {
          id: "use-theme-mode",
          name: "useThemeMode() / useThemeFamily()",
          covers: ["useThemeMode() / useThemeFamily()"],
          what: "Granular reads of the two halves of the selection: the requested mode (`light` | `dark` | `system`) and the active family name.",
          when: "A three-way mode picker or a family picker needs to know the current selection to mark it — and should not re-render when the theme's tokens change.",
          effect: "Each hook re-renders only when its own value moves. `useThemeMode()` does not change at a sunrise/sunset transition, which is exactly what a picker needs.",
          related: ["use-effective-theme-mode", "use-set-theme-mode"],
          code: [
            {
              title: "src/ModePicker.tsx",
              lang: "tsx",
              code: `import { useThemeFamily, useThemeMode, useSetThemeMode } from "@themvora/react";

const MODES = ["light", "dark", "system"] as const;

export function ModePicker() {
  const mode = useThemeMode();
  const family = useThemeFamily();
  const setMode = useSetThemeMode();

  return (
    <fieldset>
      <legend>Mode for {family}</legend>
      {MODES.map((option) => (
        <label key={option}>
          <input
            type="radio"
            name="mode"
            checked={mode === option}
            onChange={() => setMode(option)}
          />
          {option}
        </label>
      ))}
    </fieldset>
  );
}`,
            },
          ],
        },
        {
          id: "use-effective-theme-mode",
          name: "useEffectiveThemeMode()",
          covers: ["useEffectiveThemeMode()"],
          what: "Returns the mode actually applied — `light` or `dark`, never `system`. It subscribes to the appearance rather than to the selection.",
          when: "Anything that states or illustrates the current appearance: a sun/moon icon, a label, an `aria-pressed` state. Binding those to `useThemeMode()` is the common bug — with `system` it never moves.",
          effect: "Updates on a click, an OS appearance change, and a sunrise/sunset transition. During SSR it reports what the server rendered, so hydration matches.",
          related: ["use-theme-mode", "use-theme-schedule"],
          code: [
            {
              title: "src/AppearanceIcon.tsx",
              lang: "tsx",
              code: `import { useEffectiveThemeMode } from "@themvora/react";

export function AppearanceIcon() {
  const effectiveMode = useEffectiveThemeMode();

  return (
    <span role="img" aria-label={\`\${effectiveMode} mode\`}>
      {effectiveMode === "dark" ? "🌙" : "☀️"}
    </span>
  );
}`,
            },
          ],
        },
        {
          id: "use-set-theme-mode",
          name: "useSetThemeMode() / useSetThemeFamily()",
          covers: ["useSetThemeMode() / useSetThemeFamily()"],
          what: "Stable setter functions for mode and family. They do not change identity between renders and never cause the calling component to re-render.",
          when: "A control that only writes — a menu item, a keyboard shortcut handler, an effect that applies a server-decided selection. Reading the value too would make the control re-render on every change.",
          effect: "Calling the setter updates the runtime, the DOM and any subscribed component. The component that called the hook does not re-render on its own.",
          related: ["use-theme-mode", "use-toggle-theme"],
          code: [
            {
              title: "src/Shortcuts.tsx",
              lang: "tsx",
              code: `import { useEffect } from "react";
import { useSetThemeFamily, useSetThemeMode } from "@themvora/react";

export function Shortcuts() {
  const setMode = useSetThemeMode();
  const setFamily = useSetThemeFamily();

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (!event.metaKey && !event.ctrlKey) return;
      if (event.key === "j") setMode("dark");
      if (event.key === "k") setMode("light");
      if (event.key === "p") setFamily("plum");
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setMode, setFamily]);

  return null;
}`,
            },
          ],
        },
        {
          id: "use-toggle-theme",
          name: "useToggleTheme()",
          covers: ["useToggleTheme()"],
          what: "A stable function that flips the applied appearance between light and dark.",
          when: "A single-button toggle — the overwhelmingly common case. It is the setter form of `useEffectiveThemeMode()`, so a component that only toggles needs no read at all.",
          effect: "The page switches to the other mode and the choice persists like any other selection change.",
          related: ["use-effective-theme-mode", "theme-mode-button"],
          code: [
            {
              title: "src/ToggleButton.tsx",
              lang: "tsx",
              code: `import { useToggleTheme } from "@themvora/react";

export function ToggleButton() {
  const toggleTheme = useToggleTheme();
  return <button onClick={toggleTheme}>Switch theme</button>;
}`,
            },
          ],
        },
        {
          id: "use-theme-runtime",
          name: "useThemeRuntime()",
          covers: ["useThemeRuntime()"],
          what: "Returns the runtime itself: registry, store, selection, history, lifecycle, plugins and any configured schedule. This is the escape hatch when no hook covers what you need.",
          when: "You are wiring something Themvora does not ship a hook for — a custom subscription, a UI-library adapter you write yourself, or a plugin installed after mount.",
          effect: "The runtime object is stable for the life of the provider. Reading from it does not subscribe you to changes; use the runtime's own `subscribe` methods for that.",
          related: ["use-theme-lifecycle", "css-variable-adapters"],
          code: [
            {
              title: "src/RuntimeBadge.tsx",
              lang: "tsx",
              code: `import { useEffect, useState } from "react";
import { useThemeRuntime } from "@themvora/react";

export function RuntimeBadge() {
  const runtime = useThemeRuntime();
  const [count, setCount] = useState(runtime.themes.length);

  useEffect(() => {
    // The registry changes when a pack is installed — the store does not.
    return runtime.registry.subscribe(() => setCount(runtime.themes.length));
  }, [runtime]);

  return <span>{count} theme definitions registered</span>;
}`,
            },
          ],
        },
        {
          id: "use-theme-history",
          name: "useThemeHistory()",
          covers: ["useThemeHistory()"],
          what: "Returns `{ undo, redo, canUndo, canRedo, clear }` for the runtime's selection history. Every selection change is recorded automatically.",
          when: "A theme editor, a live preview, or any surface where the visitor experiments and wants to step back. For read-only consumers this hook is unnecessary — history exists whether you read it or not.",
          effect: "`undo`/`redo` move the selection; `canUndo`/`canRedo` update reactively so the buttons can disable themselves.",
          related: ["use-theme-time-travel", "use-theme-batch"],
          code: [
            {
              title: "src/HistoryControls.tsx",
              lang: "tsx",
              code: `import { useThemeHistory } from "@themvora/react";

export function HistoryControls() {
  const { undo, redo, canUndo, canRedo, clear } = useThemeHistory();

  return (
    <div>
      <button onClick={undo} disabled={!canUndo}>Undo</button>
      <button onClick={redo} disabled={!canRedo}>Redo</button>
      <button onClick={clear} disabled={!canUndo && !canRedo}>Reset history</button>
    </div>
  );
}`,
            },
          ],
        },
        {
          id: "use-theme-batch",
          name: "useThemeBatch()",
          covers: ["useThemeBatch()"],
          what: "Returns a function that runs its callback with DOM writes and notifications deferred to a single flush. Note the shape: it returns `(callback) => void`, not a value.",
          when: "Several changes belong together — set the family and the mode at once, or apply a token patch plus a selection change. Without batching the page renders twice and a transition can start twice.",
          effect: "One re-render and one transition for the whole group. Intermediate states are never painted.",
          related: ["use-theme-history", "use-theme-runtime"],
          code: [
            {
              title: "src/ApplyPreset.tsx",
              lang: "tsx",
              code: `import { useThemeBatch, useThemeRuntime } from "@themvora/react";

export function ApplyPreset() {
  const batch = useThemeBatch();
  const runtime = useThemeRuntime();

  function applyPreset() {
    // One flush: no half-applied frame between the two writes.
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
          id: "use-theme-snapshot",
          name: "useThemeSnapshot() / useThemeRestore()",
          covers: ["useThemeSnapshot() / useThemeRestore()"],
          what: "`useThemeSnapshot()` returns a function that captures the full runtime state; `useThemeRestore()` returns a function that re-applies one. The snapshot is a value you can serialise, store, or send.",
          when: "Named presets the visitor saves, an undo checkpoint around a destructive edit, or a \"reset to how it looked\" action. History handles step-by-step undo; snapshots handle named states.",
          effect: "Restoring replaces the active theme and selection with the captured ones and notifies subscribers once.",
          related: ["use-theme-history", "use-theme-time-travel"],
          code: [
            {
              title: "src/SavedLooks.tsx",
              lang: "tsx",
              code: `import { useState } from "react";
import { useThemeRestore, useThemeSnapshot } from "@themvora/react";

export function SavedLooks() {
  const snapshot = useThemeSnapshot();
  const restore = useThemeRestore();
  const [saved, setSaved] = useState<ReturnType<typeof snapshot> | null>(null);

  return (
    <div>
      <button onClick={() => setSaved(snapshot())}>Save this look</button>
      <button onClick={() => saved && restore(saved)} disabled={!saved}>
        Restore
      </button>
    </div>
  );
}`,
            },
          ],
        },
        {
          id: "use-theme-time-travel",
          name: "useThemeTimeTravel()",
          covers: ["useThemeTimeTravel()"],
          what: "Returns `{ history, jump }` — the full timeline plus indexed navigation. `jump(n)` goes straight to a point instead of stepping with undo/redo.",
          when: "A scrubber or a timeline list in a theme editor. When you only need forward/back, `useThemeHistory()` is the smaller API.",
          effect: "`history` updates as entries are recorded; `jump` moves the selection to that index and notifies subscribers.",
          related: ["use-theme-history", "use-theme-snapshot"],
          code: [
            {
              title: "src/Timeline.tsx",
              lang: "tsx",
              code: `import { useThemeTimeTravel } from "@themvora/react";

export function Timeline() {
  const { history, jump } = useThemeTimeTravel();

  return (
    <ol>
      {history.map((entry, index) => (
        <li key={index}>
          <button onClick={() => jump(index)}>{entry.theme.name}</button>
        </li>
      ))}
    </ol>
  );
}`,
            },
          ],
        },
        {
          id: "use-theme-lifecycle",
          name: "useThemeLifecycle()",
          covers: ["useThemeLifecycle()"],
          what: "Returns `{ on }`, a typed subscription to runtime lifecycle events such as `beforeThemeChange` and `afterPersist`. Handlers receive event-specific payloads rather than `unknown`.",
          when: "You need to react to a change rather than to state — sending an analytics event, syncing an external store, or writing a value that must not trigger another render.",
          effect: "The handler runs when the event fires; the returned unsubscribe stops it. Subscribing does not re-render the component.",
          related: ["use-theme-runtime", "use-theme-batch"],
          code: [
            {
              title: "src/ThemeAnalytics.tsx",
              lang: "tsx",
              code: `import { useEffect } from "react";
import { useThemeLifecycle } from "@themvora/react";

export function ThemeAnalytics() {
  const { on } = useThemeLifecycle();

  useEffect(() => {
    return on("afterThemeChange", ({ theme }) => {
      // Fires after the DOM is updated — safe to measure the result.
      window.dispatchEvent(
        new CustomEvent("app:theme-changed", { detail: theme.name }),
      );
    });
  }, [on]);

  return null;
}`,
            },
          ],
        },
        {
          id: "use-theme-packs",
          name: "useThemePacks()",
          covers: ["useThemePacks()"],
          what: "Returns a function that installs a theme pack into the runtime's registry at runtime — `(pack) => void`, wrapping `runtime.use()`.",
          when: "Themes arrive after mount: fetched from an API, generated from a brand colour the visitor picks, or code-split so the initial bundle stays small.",
          effect: "The registry grows and `themes-change`-style notifications fire; the active selection is untouched unless the pack defines it. A `useProvidedThemes()` consumer sees the new families immediately.",
          related: ["use-theme-runtime", "use-provided-themes"],
          code: [
            {
              title: "src/BrandPack.tsx",
              lang: "tsx",
              code: `import { useEffect } from "react";
import { useThemePacks } from "@themvora/react";
import { generateTheme } from "@themvora/core";

export function BrandPack({ seed }: { seed: string }) {
  const usePack = useThemePacks();

  useEffect(() => {
    const generated = generateTheme({ seed, family: "brand" });
    // Registering the pair adds a family without changing the selection.
    usePack({ themes: [generated.light, generated.dark] });
  }, [seed, usePack]);

  return null;
}`,
            },
          ],
        },
        {
          id: "use-theme-schedule",
          name: "useThemeSchedule()",
          covers: ["useThemeSchedule()"],
          what: "A reactive view of the sunrise/sunset controller: `enabled`, `active`, `status`, `sunrise`, `sunset`, `nextTransition`, plus `enable()`, `disable()` and `set()`. Returns `null` when the provider has no `scheduled` option.",
          when: "The app offers a \"follow daylight\" switch, or shows when the next automatic switch happens. If you only want the feature on, the `scheduled` prop is enough.",
          effect: "State reads update as the sun moves; the returned object is a reactive view, so it is safe to render during SSR and settles after mount.",
          related: ["scheduled-prop", "use-effective-theme-mode"],
          code: [
            {
              title: "src/DaylightSwitch.tsx",
              lang: "tsx",
              code: `import { useThemeSchedule } from "@themvora/react";

export function DaylightSwitch() {
  const schedule = useThemeSchedule();

  // null when <ThemeProvider> was not given a \`scheduled\` option.
  if (!schedule) return null;

  return (
    <label>
      <input
        type="checkbox"
        checked={schedule.enabled}
        onChange={(event) =>
          event.target.checked ? schedule.enable() : schedule.disable()
        }
      />
      Follow daylight
      {schedule.nextTransition ? (
        <small>Next switch: {schedule.nextTransition.toLocaleTimeString()}</small>
      ) : null}
    </label>
  );
}`,
            },
          ],
        },
        {
          id: "use-provided-themes",
          name: "useProvidedThemes()",
          covers: ["useTheme()"],
          what: "The theme families this provider was given, grouped by family — not the built-in catalogue. Re-runs when the `themes` prop changes, a pack is installed, or the registry mutates.",
          when: "Building a family picker that lists what the app actually offers. Hard-coding the family list is how a picker ends up offering a theme the app no longer ships.",
          effect: "Returns a stable array instance while nothing changes, so it is safe to map over in render without memoisation tricks.",
          related: ["use-theme-mode", "use-theme-packs"],
          code: [
            {
              title: "src/FamilyPicker.tsx",
              lang: "tsx",
              code: `import { useProvidedThemes, useSetThemeFamily, useThemeFamily } from "@themvora/react";

export function FamilyPicker() {
  const families = useProvidedThemes();
  const family = useThemeFamily();
  const setFamily = useSetThemeFamily();

  return (
    <select value={family} onChange={(event) => setFamily(event.target.value)}>
      {families.map((entry) => (
        <option key={entry.family} value={entry.family}>
          {entry.name}
        </option>
      ))}
    </select>
  );
}`,
            },
          ],
        },
        {
          id: "use-generated-theme",
          name: "useGeneratedTheme()",
          covers: ["useThemeValue() / useThemeTokens()"],
          what: "Returns the theme produced by `generateTheme()` and registered with the provider — never a shipped preset. Throws when the provider holds no generated theme, or when several are registered and none is active.",
          when: "A theme studio or brand-onboarding flow needs to read back the theme it generated (its `meta`, its derived tokens) without keeping a parallel copy in state.",
          effect: "Re-resolves on registry, store and selection changes. If the generated theme is later removed, the next render raises the documented error instead of returning a stale value.",
          related: ["use-theme-value", "use-theme-packs"],
          code: [
            {
              title: "src/BrandSummary.tsx",
              lang: "tsx",
              code: `import { useGeneratedTheme } from "@themvora/react";

export function BrandSummary() {
  // Only valid when the provider was given a generateTheme() pair.
  const theme = useGeneratedTheme();

  return (
    <p>
      Generated from {theme.meta?.generation?.seed ?? "an unknown seed"} · primary{" "}
      <code>{theme.tokens?.colors?.primary}</code>
    </p>
  );
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
        "Ready-made pieces for the parts of a theme UI that are the same in every app. They are thin wrappers over the hooks above — copy them as a starting point rather than treating them as a design system.",
      entries: [
        {
          id: "theme-scope",
          name: "ThemeScope",
          covers: ["ThemeScope"],
          what: "Applies a theme to a subtree: emits the scoped CSS variables plus Tailwind-compatible `--color-*` and `--radius-*` variables on a wrapper element. `theme` pins an exact theme; `family` follows the provider's mode unless you pass `mode`.",
          when: "A preview panel, a marketing section in a fixed palette, or a code sample that must render in the theme it documents — without touching the app-wide selection.",
          effect: "Only the wrapped subtree repaints. The global selection is neither read for the scope nor changed by it; `transition` controls whether the scope animates.",
          related: ["use-scoped-theme", "theme-inspector"],
          code: [
            {
              title: "src/Preview.tsx",
              lang: "tsx",
              code: `import { ThemeScope } from "@themvora/react";

export function Preview() {
  return (
    <ThemeScope theme="cocoa-dark">
      <h3>Always cocoa</h3>
      <p>This panel keeps its own theme while the page changes.</p>
    </ThemeScope>
  );
}`,
            },
            {
              title: "A family that follows the page mode",
              lang: "tsx",
              code: `// \`family\` without \`mode\` flips light/dark with the page — the usual choice
// for a second brand surface rather than a fixed preview.
<ThemeScope family="plum">
  <PricingTable />
</ThemeScope>`,
            },
          ],
        },
        {
          id: "theme-mode-button",
          name: "ThemeModeButton",
          covers: ["ThemeModeButton"],
          what: "A `<button>` that cycles light → dark → system. Its label reads the *effective* mode, and it shows the configured mode alongside while that is `system`.",
          when: "Demos, prototypes and settings pages that need a correct mode control immediately. Replace it with your own once you need icons or a three-way segmented control.",
          effect: "Each click advances the configured mode; the label follows what is actually on screen, so it stays truthful under a sunrise/sunset schedule.",
          related: ["use-effective-theme-mode", "use-set-theme-mode"],
          code: [
            {
              title: "src/Settings.tsx",
              lang: "tsx",
              code: `import { ThemeModeButton } from "@themvora/react";

export function Settings() {
  return (
    <section>
      <h2>Appearance</h2>
      <ThemeModeButton />
    </section>
  );
}`,
            },
          ],
        },
        {
          id: "theme-inspector",
          name: "ThemeInspector",
          covers: ["ThemeInspector"],
          what: "A floating development panel showing the active theme, the selection, the flattened tokens and the generated CSS variables, live.",
          when: "Development only. It answers \"which token produced this colour\" and \"is my scoped theme actually applied\" without adding a debug page.",
          effect: "A fixed-position panel appears in the corner. It is a development aid, so mount it behind your build's development flag rather than in production.",
          related: ["theme-scope", "use-theme-value"],
          code: [
            {
              title: "src/DevTools.tsx",
              lang: "tsx",
              code: `import { ThemeInspector } from "@themvora/react";

export function DevTools() {
  if (!import.meta.env.DEV) return null;
  return <ThemeInspector bottom={16} />;
}`,
            },
          ],
        },
        {
          id: "use-scoped-theme",
          name: "useScopedTheme(ref, selection)",
          covers: ["useScopedTheme(ref, themeName)"],
          what: "The imperative form of `ThemeScope`: binds a theme to an element you already have a ref to. The second argument is a theme name, a family name, or `{ family, mode }`; pass `null` to remove the scope.",
          when: "The element is not a wrapper you control — a third-party widget's container, a canvas host, an element rendered by a portal.",
          effect: "The element receives the scoped variables and is cleaned up on unmount or when `selection` becomes `null`.",
          related: ["theme-scope"],
          code: [
            {
              title: "src/ChartHost.tsx",
              lang: "tsx",
              code: `import { useRef } from "react";
import { useScopedTheme } from "@themvora/react";

export function ChartHost() {
  const ref = useRef<HTMLDivElement>(null);

  // Pinned to one theme; pass \`null\` to release the scope.
  useScopedTheme(ref, "cocoa-dark");

  return <div ref={ref} />;
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
        "Adapters translate Themvora tokens into a UI library's own theme format. Themvora stays the source of selection and mode; the library keeps its own components, and each adapter rebuilds its theme when the active theme changes.",
      entries: [
        {
          id: "mui-chakra-adapter",
          name: "createMuiAdapter() / createChakraAdapter()",
          covers: ["createMuiAdapter() / createChakraAdapter()"],
          what: "Runtime adapters that map Themvora semantic tokens onto MUI's and Chakra's native theme objects, preserving the framework-neutral runtime contract so the adapter is not tied to React rendering.",
          when: "You need the derived theme as data — server-side rendering a library theme, generating a static CSS bundle, or driving a library from a non-React surface.",
          effect: "The adapter subscribes to the runtime and produces a new native theme whenever the active theme changes. It returns a handle you must dispose.",
          related: ["antd-adapter", "mantine-adapter"],
          code: [
            {
              title: "src/mui-adapter.ts",
              lang: "ts",
              code: `import { createMuiAdapter } from "@themvora/mui";
import { runtime } from "./theme-runtime";

// React-free: produces MUI theme objects from Themvora tokens.
const adapter = createMuiAdapter(runtime);

console.log(adapter.getTheme().palette.primary.main);

// Release the runtime subscription when the adapter is no longer needed.
adapter.dispose();`,
            },
          ],
        },
        {
          id: "antd-adapter",
          name: "AntdThemeProvider / AntdThemeAdapter",
          covers: ["createAntdAdapter() / createMuiAdapter() / createChakraAdapter()"],
          what: "Ant Design's bridge: `AntdThemeProvider` wraps `ConfigProvider` with a theme rebuilt from the active Themvora theme, and `createAntdAdapter(runtime)` exposes the same derivation as a reactive snapshot/subscribe pair.",
          when: "An Ant Design app that should inherit Themvora's palette instead of maintaining a second `ConfigProvider` theme by hand.",
          effect: "Ant Design components repaint when the Themvora theme changes. The provider takes `runtime` — mount it *inside* `ThemeProvider` and pass the runtime from `useThemeRuntime()`.",
          related: ["mui-chakra-adapter", "css-variable-adapters"],
          code: [
            {
              title: "src/App.tsx",
              lang: "tsx",
              code: `import { useThemeRuntime } from "@themvora/react";
import { AntdThemeProvider } from "@themvora/antd";

function AntdBridge({ children }: { children: React.ReactNode }) {
  const runtime = useThemeRuntime();
  return <AntdThemeProvider runtime={runtime}>{children}</AntdThemeProvider>;
}

export function App() {
  return (
    <AntdBridge>
      <Dashboard />
    </AntdBridge>
  );
}`,
            },
          ],
        },
        {
          id: "mantine-adapter",
          name: "MantineThemeProvider + createMantineTheme()",
          covers: ["MantineThemeProvider + createMantineTheme()"],
          what: "Mantine's bridge: `createMantineTheme(source)` rebuilds a native Mantine theme from Themvora tokens, and `MantineThemeProvider` forces Mantine's color scheme to match the active mode.",
          when: "A Mantine app that should follow Themvora's selection, including its built-in dark styles. Forcing the scheme is what keeps Mantine's own `dark` variants in step with `effectiveMode`.",
          effect: "Mantine components switch palette and scheme together with Themvora. `createMantineTheme` also accepts a theme definition or a token group, so it works without a runtime.",
          related: ["mui-chakra-adapter", "antd-adapter"],
          code: [
            {
              title: "src/App.tsx",
              lang: "tsx",
              code: `import { ThemeProvider, useThemeRuntime } from "@themvora/react";
import { MantineThemeProvider } from "@themvora/mantine";

function MantineBridge({ children }: { children: React.ReactNode }) {
  const runtime = useThemeRuntime();
  return (
    <MantineThemeProvider runtime={runtime}>{children}</MantineThemeProvider>
  );
}`,
            },
            {
              title: "Without a runtime",
              lang: "ts",
              code: `import { createMantineTheme } from "@themvora/mantine";
import { getBuiltInThemes } from "@themvora/core";

const [theme] = getBuiltInThemes();
const mantineTheme = createMantineTheme(theme);`,
            },
          ],
        },
        {
          id: "css-variable-adapters",
          name: "CSS-variable adapters (shadcn, Bootstrap, daisyUI, Open Props)",
          covers: ["CSS-variable adapters"],
          what: "Four adapters that project Themvora tokens onto a CSS-variable contract instead of a JS theme object. Their factories are React-free; the framework subpaths (`/react`, `/vue`, `/svelte`, `/solid`, `/angular`) add lifecycle wiring.",
          when: "The library reads CSS variables rather than a provider object — shadcn/ui, Bootstrap, daisyUI and Open Props all work this way. Use the subpath hook so the binding is disposed with the component.",
          effect: "The library's variables track the active theme; no second theme object exists to drift. Import the adapter's stylesheet once, and install the library's own CSS as usual.",
          related: ["use-theme-runtime", "mui-chakra-adapter"],
          code: [
            {
              title: "src/App.tsx",
              lang: "tsx",
              code: `import "@themvora/shadcn/shadcn.css";
import { ThemeProvider, useThemeRuntime } from "@themvora/react";
import { useShadcnTheme } from "@themvora/shadcn/react";

function ShadcnBridge({ children }: { children: React.ReactNode }) {
  const runtime = useThemeRuntime();
  // Installs the CSS-variable binding; disposes it on unmount.
  useShadcnTheme(runtime);
  return <>{children}</>;
}

export function App() {
  return (
    <ThemeProvider defaultTheme="mint-light">
      <ShadcnBridge>
        <Dashboard />
      </ShadcnBridge>
    </ThemeProvider>
  );
}`,
            },
            {
              title: "Without React",
              lang: "ts",
              code: `import { createShadcnAdapter } from "@themvora/shadcn/factory";

const adapter = createShadcnAdapter(runtime);
adapter.dispose();`,
            },
          ],
        },
      ],
    },
    {
      id: "transition",
      label: "Transition",
      intro:
        "Transitions belong to the runtime, not to a stylesheet: the option is applied when the variables swap, so a global CSS rule would also animate hover states and the first paint. The second entry is the escape hatch for updates that must not animate.",
      entries: [
        {
          id: "transition-prop",
          name: "transition",
          covers: ["transition prop"],
          what: "Enables and configures the cross-fade applied when the active theme changes: duration, easing, preset and which properties animate. Enabled by default at 300ms.",
          when: "Almost always leave it on. Tune it when the default feels slow on a large surface, or pass `{ enabled: false }` for an app that must repaint instantly.",
          effect: "A theme change animates instead of snapping. The prop is live — changing it after mount changes the next transition without a remount.",
          related: ["suppress-transition", "theme-provider"],
          code: [
            {
              title: "src/main.tsx",
              lang: "tsx",
              code: `import { ThemeProvider } from "@themvora/react";

<ThemeProvider
  defaultTheme="mint-light"
  transition={{ enabled: true, duration: 250, easing: "ease-in-out" }}
>
  <App />
</ThemeProvider>;`,
            },
            {
              title: "Respecting reduced motion",
              lang: "tsx",
              code: `// The runtime animates with CSS transitions, so the platform preference is
// honoured by turning the transition off rather than by a second animation path.
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

<ThemeProvider
  defaultTheme="mint-light"
  transition={{ enabled: !reduceMotion }}
>
  <App />
</ThemeProvider>;`,
            },
          ],
        },
        {
          id: "suppress-transition",
          name: "runtime.store.set(theme, { suppressTransition: true })",
          covers: ["runtime.store.set(theme, { suppressTransition: true })"],
          what: "A per-update escape hatch: applies the theme immediately, skipping the configured animation for that one switch.",
          when: "The first paint after hydration, a screenshot or print path, or a bulk import where animating every step would be noise. Do not disable the transition globally to solve one call site.",
          effect: "That single change is instant; every later change animates with the configured transition again.",
          related: ["transition-prop", "use-theme-runtime"],
          code: [
            {
              title: "src/PrintTheme.tsx",
              lang: "tsx",
              code: `import { useThemeRuntime } from "@themvora/react";

export function PrintTheme() {
  const runtime = useThemeRuntime();

  function applyForPrint() {
    const light = runtime.themes.find((theme) => theme.name === "mint-light");
    if (!light) return;
    // No cross-fade: the print path must not capture a mid-transition frame.
    runtime.store.set(light, { suppressTransition: true });
  }

  return <button onClick={applyForPrint}>Prepare for print</button>;
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
      title: "Let the visitor pick a family",
      problem:
        "A settings page must list the theme families the app actually ships, mark the active one, and switch on selection — without hard-coding a list that goes stale the moment a pack is installed.",
      apis: ["useProvidedThemes()", "useThemeFamily()", "useSetThemeFamily()"],
      why: "`useProvidedThemes()` reads the provider's registry, so the list follows the app's real catalogue. The granular read/set pair keeps the picker from re-rendering when only tokens change.",
      expect:
        "A `<select>` whose options are the registered families, with the current one selected. Choosing another repaints the page immediately and the choice persists.",
      caveats:
        "`useProvidedThemes()` returns families, not every variant. A family entry flips light/dark with the page mode — pin a variant only when the surface must not follow the mode.",
      code: [
        {
          title: "src/FamilyPicker.tsx",
          lang: "tsx",
          code: `import {
  useProvidedThemes,
  useSetThemeFamily,
  useThemeFamily,
} from "@themvora/react";

export function FamilyPicker() {
  const families = useProvidedThemes();
  const family = useThemeFamily();
  const setFamily = useSetThemeFamily();

  return (
    <label>
      Theme family
      <select value={family} onChange={(e) => setFamily(e.target.value)}>
        {families.map((entry) => (
          <option key={entry.family} value={entry.family}>
            {entry.name}
          </option>
        ))}
      </select>
    </label>
  );
}`,
        },
      ],
    },
    {
      id: "mode-toggle",
      title: "A mode toggle that tells the truth",
      problem:
        "A sun/moon button that reports the wrong state. Bound to `mode`, it reads \"light\" while the page is dark whenever the selection is `system` or a schedule is running.",
      apis: [
        "useEffectiveThemeMode()",
        "useThemeMode()",
        "useToggleTheme()",
        "useSetThemeMode()",
      ],
      why: "`effectiveMode` is the applied appearance and moves with the page; `mode` is the visitor's standing request. A toggle needs the first for its label and the second only to decide what a click should mean.",
      expect:
        "The label and icon match the page. A click switches to the other appearance and pins an explicit mode, so a `system` visitor stops following the OS after the first click.",
      caveats:
        "If the visitor should stay on `system`, use a three-way control instead — a two-state toggle cannot express \"follow the OS\".",
      code: [
        {
          title: "src/ModeToggle.tsx",
          lang: "tsx",
          code: `import {
  useEffectiveThemeMode,
  useSetThemeMode,
  useThemeMode,
} from "@themvora/react";

export function ModeToggle() {
  const effectiveMode = useEffectiveThemeMode();
  const mode = useThemeMode();
  const setMode = useSetThemeMode();

  const next = effectiveMode === "dark" ? "light" : "dark";

  return (
    <button
      onClick={() => setMode(next)}
      aria-label={\`Switch to \${next} mode\`}
      aria-pressed={effectiveMode === "dark"}
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
      id: "theme-aware-card",
      title: "A theme-aware card without a second palette",
      problem:
        "A card that hard-codes `#6366f1` looks correct in one theme and wrong in the other eleven. The colour has to come from the active theme, not from a duplicated constant.",
      apis: ["useThemeTokens()", "ThemeScope"],
      why: "The tokens are the resolved semantic values for the active theme. Reading them keeps the component theme-agnostic; the CSS-variable path (`var(--theme-color-primary)`) is even cheaper when the value only feeds CSS.",
      expect:
        "The card repaints on every theme change with no conditional logic in the component.",
      caveats:
        "`useThemeTokens()` returns `undefined` for a theme that declares no tokens — fall back rather than assuming a value exists.",
      code: [
        {
          title: "src/StatCard.tsx",
          lang: "tsx",
          code: `import { useThemeTokens } from "@themvora/react";

export function StatCard({ label, value }: { label: string; value: string }) {
  const tokens = useThemeTokens();
  const accent = tokens?.colors?.primary ?? "currentColor";

  return (
    <article
      style={{
        background: "var(--theme-color-card)",
        color: "var(--theme-color-cardForeground)",
        borderLeft: \`4px solid \${accent}\`,
        padding: "1rem",
        borderRadius: "var(--theme-radius-lg, 12px)",
      }}
    >
      <h3 style={{ color: "var(--theme-color-mutedForeground)" }}>{label}</h3>
      <strong>{value}</strong>
    </article>
  );
}`,
        },
      ],
    },
    {
      id: "scoped-preview",
      title: "Preview a theme without switching to it",
      problem:
        "A theme picker should show what each option looks like before the visitor commits. Applying it globally to preview it is not acceptable.",
      apis: ["ThemeScope", "useProvidedThemes()", "useSetThemeFamily()"],
      why: "`ThemeScope` writes the scoped variables onto its own wrapper and never touches the global selection, so any number of previews can coexist on one page.",
      expect:
        "Each preview card renders in its own theme; the rest of the page is unaffected. Clicking a card commits the choice through the normal setter.",
      caveats:
        "A scope resolved by `theme` is pinned to that exact theme; a scope resolved by `family` follows the page mode. Previews of a family should use `family` so the preview matches what the visitor will get.",
      code: [
        {
          title: "src/ThemeGallery.tsx",
          lang: "tsx",
          code: `import { ThemeScope, useProvidedThemes, useSetThemeFamily } from "@themvora/react";

export function ThemeGallery() {
  const families = useProvidedThemes();
  const setFamily = useSetThemeFamily();

  return (
    <div>
      {families.map((entry) => (
        <button key={entry.name} onClick={() => setFamily(entry.name)}>
          <ThemeScope family={entry.name}>
            <strong>{entry.name}</strong>
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
    {
      id: "persistence-and-init",
      title: "Persistence and the first render",
      problem:
        "The provider must paint the persisted theme on the first frame, and a server-rendered page must not paint one theme and then correct itself after hydration.",
      apis: ["ThemeProvider", "runtime / initial"],
      why: "`ThemeProvider` injects a blocking bootstrap script that applies the persisted selection before paint. On the server the selection is resolved from cookies, and `initial` carries that result into the hydration render.",
      expect:
        "A reload keeps the visitor's theme with no flash. A server-rendered page hydrates without a theme mismatch warning.",
      caveats:
        "`createThemeRoot` is for client-only apps; an SSR app must hydrate the server markup instead of mounting a fresh root over it.",
      code: [
        {
          title: "Client-only app",
          lang: "tsx",
          code: `<ThemeProvider defaultTheme="mint-light" initialMode="system">
  <App />
</ThemeProvider>`,
        },
        {
          title: "Server-resolved app",
          lang: "tsx",
          code: `// The server resolved the selection; hand the same object to the client.
<ThemeProvider runtime={runtime} initial={serverResolved}>
  <App />
</ThemeProvider>`,
        },
      ],
    },
    {
      id: "ui-library-integration",
      title: "Drive MUI from the Themvora selection",
      problem:
        "A MUI app ends up with two theme sources: Themvora's tokens for the page and a hand-written MUI theme for the components. They drift the first time a brand colour changes.",
      apis: ["useThemeRuntime()", "MuiThemeProvider", "createMuiTheme()"],
      why: "`MuiThemeProvider` subscribes to the runtime and rebuilds the MUI theme from the active Themvora theme, so MUI is derived rather than configured twice.",
      expect:
        "MUI components change palette when the Themvora theme changes, with no MUI theme object to maintain.",
      caveats:
        "The provider takes `runtime`, so it must sit inside `ThemeProvider`. `createMuiTheme()` is the escape hatch when you need the derived theme object outside a React subtree.",
      code: [
        {
          title: "src/App.tsx",
          lang: "tsx",
          code: `import { ThemeProvider, useThemeRuntime } from "@themvora/react";
import { MuiThemeProvider } from "@themvora/mui";
import { Button } from "@mui/material";

function MuiBridge({ children }: { children: React.ReactNode }) {
  const runtime = useThemeRuntime();
  return <MuiThemeProvider runtime={runtime}>{children}</MuiThemeProvider>;
}

export function App() {
  return (
    <ThemeProvider defaultTheme="mint-light">
      <MuiBridge>
        <Button variant="contained">Inherits the Themvora palette</Button>
      </MuiBridge>
    </ThemeProvider>
  );
}`,
        },
      ],
    },
  ],
  combining: [
    {
      id: "settings-page",
      title: "A complete appearance settings page",
      body: "The four controls a real settings page needs — family, mode, transition preference and a reset — assembled from the granular hooks so each control re-renders on its own value only.",
      code: [
        {
          title: "src/AppearanceSettings.tsx",
          lang: "tsx",
          code: `import {
  useEffectiveThemeMode,
  useProvidedThemes,
  useSetThemeFamily,
  useSetThemeMode,
  useThemeFamily,
  useThemeHistory,
  useThemeMode,
} from "@themvora/react";

const MODES = ["light", "dark", "system"] as const;

export function AppearanceSettings() {
  const families = useProvidedThemes();
  const family = useThemeFamily();
  const setFamily = useSetThemeFamily();
  const mode = useThemeMode();
  const setMode = useSetThemeMode();
  const effectiveMode = useEffectiveThemeMode();
  const { undo, canUndo } = useThemeHistory();

  return (
    <form>
      <label>
        Family
        <select value={family} onChange={(e) => setFamily(e.target.value)}>
          {families.map((entry) => (
            <option key={entry.name} value={entry.name}>
              {entry.name}
            </option>
          ))}
        </select>
      </label>

      <fieldset>
        <legend>Mode</legend>
        {MODES.map((option) => (
          <label key={option}>
            <input
              type="radio"
              name="mode"
              checked={mode === option}
              onChange={() => setMode(option)}
            />
            {option}
            {option === mode && mode === "system" ? \` (now \${effectiveMode})\` : null}
          </label>
        ))}
      </fieldset>

      <button type="button" onClick={undo} disabled={!canUndo}>
        Undo last change
      </button>
    </form>
  );
}`,
        },
      ],
    },
    {
      id: "brand-onboarding",
      title: "Generate a brand theme and install it live",
      body: "A brand colour is generated into a light/dark pair, registered with the runtime, and selected — then read back through `useGeneratedTheme()` so the UI can show what was produced. Batching keeps the page from painting the intermediate state.",
      code: [
        {
          title: "src/BrandSetup.tsx",
          lang: "tsx",
          code: `import { useThemeBatch, useThemePacks, useThemeRuntime } from "@themvora/react";
import { generateTheme } from "@themvora/core";

export function BrandSetup({ seed }: { seed: string }) {
  const usePack = useThemePacks();
  const batch = useThemeBatch();
  const runtime = useThemeRuntime();

  function applyBrand() {
    const generated = generateTheme({ seed, family: "brand" });
    batch(() => {
      usePack({ themes: [generated.light, generated.dark] });
      runtime.selection.setFamily("brand");
    });
  }

  return <button onClick={applyBrand}>Use {seed}</button>;
}`,
        },
      ],
    },
    {
      id: "dev-inspector",
      title: "Ship the inspector in development only",
      body: "The inspector is the fastest way to answer \"which token is this\", but it is a floating overlay. Gate it on the build flag so production bundles never mount it.",
      code: [
        {
          title: "src/App.tsx",
          lang: "tsx",
          code: `import { ThemeProvider } from "@themvora/react";
import { ThemeInspector } from "@themvora/react";
import { App } from "./App";

export function Root() {
  return (
    <ThemeProvider defaultTheme="mint-light" initialMode="system">
      <App />
      {import.meta.env.DEV ? <ThemeInspector /> : null}
    </ThemeProvider>
  );
}`,
        },
      ],
    },
  ],
  notAvailable: [
    {
      name: "A server-rendered first byte",
      reason:
        "`@themvora/react` is client-side only — there is no `getInitialThemeState()`, no `ThemeHead`. The provider does inject a blocking bootstrap script into `<head>`, so a client-rendered app paints the stored theme before the first frame, but the HTML the server sent still carries the fallback theme. When the first byte itself has to be correct, use `@themvora/next`, `@themvora/remix` or `@themvora/astro`.",
    },
  ],
};
