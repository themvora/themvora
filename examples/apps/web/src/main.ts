/**
 * The page's only script.
 *
 * Order matters:
 *   1. `./log` drains the boot events buffered by the bridge in `<head>` and
 *      takes over as their sink, before anything else logs.
 *   2. The elements are already registered by the blocking `/themvora-web.js`
 *      script in `<head>` — they upgraded while the parser built the body, so
 *      the controls are in the first painted frame.
 *   3. Everything below reads the runtime the provider created and wires the
 *      readouts and the lab buttons to it.
 *
 * The page stylesheet is a `<link>` in index.html, not an import here: a CSS
 * import is injected by the module, which is too late for the first paint.
 */
import type { ThemeMode } from "@themvora/core";

import { clearLog, log } from "./log";
import { solarDefaultTheme, solarPack } from "./themes";

/**
 * The standalone build in `<head>` exposes the package's public API here, so
 * this module does not import `@themvora/web` again — one copy of the library,
 * and the elements exist before the first paint.
 *
 * `typeof import(...)` is erased at build time: this is a type, not a runtime
 * import of the package.
 */
declare global {
  interface Window {
    ThemvoraWeb?: typeof import("@themvora/web");
  }
}

const ThemvoraWeb = window.ThemvoraWeb;
if (!ThemvoraWeb) {
  throw new Error(
    "index.html must load /themvora-web.js before the app module.",
  );
}
const { getProviderRuntime } = ThemvoraWeb;

const provider = document.querySelector<HTMLElement>("themvora-provider");
if (!provider) {
  throw new Error("index.html must contain a <themvora-provider>.");
}

const runtime = getProviderRuntime(provider);
if (!runtime) {
  throw new Error(
    "The provider did not initialise. Check that @themvora/web is imported before this module reads the runtime.",
  );
}

/** Captured once, so "Restore" can undo the whole session. */
const bootSnapshot = runtime.snapshot();

/**
 * The card that demonstrates a late catalog.
 *
 * It deliberately has **no** `theme` attribute at boot: naming `solar` before
 * the pack exists is a configuration error (`TV_CONFIG_OPTION_INVALID`), and a
 * demo should not ship a warning on every load. The attribute is applied when
 * the pack is installed and removed before it is taken away again.
 */
const lateScope = document.querySelector<HTMLElement>("#late-scope");

// --- Readouts ---------------------------------------------------------------

const html = document.documentElement;

const readouts = {
  theme: document.querySelector<HTMLElement>('[data-readout="theme"]'),
  mode: document.querySelector<HTMLElement>('[data-readout="mode"]'),
  family: document.querySelector<HTMLElement>('[data-readout="family"]'),
  selection: document.querySelector<HTMLElement>('[data-readout="selection"]'),
};

/**
 * One entry per `[data-scope-readout]`, paired with the scope it reports on.
 *
 * The selector lives on the readout element (`data-scope-selector`), not here,
 * because the blocking script in index.html uses the same pairing to fill these
 * before the first paint. One declaration, two consumers.
 */
const scopeReadouts = [
  ...document.querySelectorAll<HTMLElement>("[data-scope-readout]"),
].map((readout) => {
  const selector = readout.dataset.scopeSelector;
  return {
    readout,
    scope: selector ? document.querySelector<HTMLElement>(selector) : null,
  };
});

const lateStatus = document.querySelector<HTMLElement>("[data-late-status]");

const solarInstalled = (): boolean =>
  runtime.themes.some((theme) => String(theme.name).startsWith("solar-"));

function setText(
  element: HTMLElement | null,
  value: string | null | undefined,
): void {
  if (!element) return;
  element.textContent = value && value.length > 0 ? value : "—";
}

function render(): void {
  setText(readouts.theme, html.dataset.theme);
  setText(readouts.mode, html.dataset.themeMode);
  setText(readouts.family, html.dataset.themeFamily);
  setText(readouts.selection, html.dataset.themeSelectionMode);

  for (const { readout, scope } of scopeReadouts) {
    setText(readout, scope?.getAttribute("data-theme"));
  }

  setText(
    lateStatus,
    solarInstalled() ? "installed" : "not installed — scope is not scoped yet",
  );
}

/**
 * Samples the DOM on the next frame rather than inside the notification.
 *
 * The provider commits its attributes inside a View Transition when the browser
 * supports one, so a `store.subscribe` callback still sees the *previous*
 * `data-theme` — the panel would show a value one change behind the page. Two
 * frames later the binding has committed, and a burst of changes coalesces into
 * one render.
 */
let renderFrame = 0;

function scheduleRender(): void {
  if (renderFrame !== 0) return;

  renderFrame = requestAnimationFrame(() => {
    renderFrame = requestAnimationFrame(() => {
      renderFrame = 0;
      render();
    });
  });
}

// --- Subscriptions ----------------------------------------------------------

runtime.store.subscribe((theme) => {
  log("store", `theme → ${theme.name}`, "good");
  scheduleRender();
});

runtime.selection.subscribe((selection) => {
  log("selection", `${selection.family} · ${selection.mode}`, "info");
  scheduleRender();
});

runtime.registry.subscribe(() => {
  log("registry", `catalog → ${runtime.themes.length} themes`, "info");
  scheduleRender();
});

// --- Lab actions ------------------------------------------------------------

const actions: Record<string, () => void> = {
  "load-pack": () => {
    if (solarInstalled()) {
      log("action", "the Solar pack is already installed", "warn");
      return;
    }

    // `use()` writes into the live catalog: the family selector gains "solar",
    // the `theme="solar"` scope resolves, and `themes-change` fires.
    runtime.use(solarPack);
    // Applied *after* the theme exists, so the scope resolves on its first
    // render instead of reporting an unknown theme.
    lateScope?.setAttribute("theme", "solar");
    log(
      "action",
      `runtime.use("${solarPack.name}") — ${solarPack.themes.length} themes added`,
      "good",
    );
  },

  "drop-pack": () => {
    const before = runtime.themes.length;
    const kept = runtime.themes.filter(
      (theme) => !String(theme.name).startsWith("solar-"),
    );

    if (kept.length === before) {
      log("action", "nothing to remove — install the Solar pack first", "warn");
      return;
    }

    // A catalog change that preserves the active theme emits no store change.
    // The scopes follow it through the registry signal. The attribute goes
    // first: the scope must stop naming a theme before the theme leaves.
    lateScope?.removeAttribute("theme");
    runtime.configure({ themes: kept });
    log(
      "action",
      `configure({ themes }) — removed ${before - kept.length} themes`,
      "good",
    );
  },

  "set-brand": () => {
    if (!solarInstalled()) {
      log("action", "install the Solar pack first", "warn");
      return;
    }

    runtime.configure({ defaultTheme: solarDefaultTheme });
    log(
      "action",
      `configure({ defaultTheme: "${solarDefaultTheme}" })`,
      "good",
    );
  },

  "family-plum": () => {
    runtime.selection.setFamily("plum");
    log("action", 'selection.setFamily("plum")', "good");
  },

  "mode-dark": () => {
    runtime.selection.setMode("dark");
    log("action", 'selection.setMode("dark")', "good");
  },

  restore: () => {
    runtime.restore(bootSnapshot);
    log("action", "runtime.restore(bootSnapshot)", "good");
  },

  "bad-mode": () => {
    // Reachable from plain JavaScript even though `ThemeMode` forbids it — which
    // is exactly why the runtime validates instead of trusting the type.
    runtime.configure({ initialMode: "banana" as unknown as ThemeMode });
    log("action", 'configure({ initialMode: "banana" })', "info");
  },

  "bad-family": () => {
    runtime.configure({ initialFamily: "nope" });
    log("action", 'configure({ initialFamily: "nope" })', "info");
  },

  "bad-attribute": () => {
    // A malformed attribute is reported and ignored: the live catalog is left
    // alone, so the page keeps working.
    provider.setAttribute("themes", "");
    log("action", 'setAttribute("themes", "") — reported and ignored', "info");
  },

  "clear-log": () => {
    clearLog();
  },
};

document.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof Element)) return;

  const button = target.closest<HTMLButtonElement>("[data-action]");
  const action = button?.dataset.action;
  if (!action) return;

  actions[action]?.();
});

// --- Boot -------------------------------------------------------------------

// Exposed for console exploration: `themeLab.runtime.themes`,
// `themeLab.runtime.selection.getSelection()`, `themeLab.runtime.use(pack)`.
// The page itself never reads it, so removing this line changes nothing.
Object.assign(window, { themeLab: { runtime, provider } });

render();
log(
  "boot",
  `ready — ${runtime.store.get().name} · ${runtime.themes.length} themes · ${runtime.selection.getMode()} mode`,
  "good",
);
