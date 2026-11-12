/**
 * The page's only module.
 *
 * The theme itself is already painted by the plugin's generated CSS and boot
 * script before this file evaluates, and `/themvora-web.js` has already
 * registered the elements. This file only wires the app: it reads the runtime
 * the `<themvora-provider>` created and keeps the readouts in step with later
 * changes.
 *
 * The classic bundle is used for the runtime API (`window.ThemvoraWeb`) rather
 * than a second side-effect import: importing `@themvora/web` here would load a
 * second copy of core into the module graph, while the registered elements and
 * the runtime belong to the classic bundle. The type-only import keeps the API
 * typed without emitting a runtime import.
 */
import type * as ThemvoraWeb from "@themvora/web";

type ThemvoraWebApi = typeof ThemvoraWeb;

declare global {
  interface Window {
    ThemvoraWeb?: ThemvoraWebApi;
  }
}

const web = window.ThemvoraWeb;
if (!web) {
  throw new Error(
    "The classic @themvora/web bundle did not load. Check /themvora-elements.js.",
  );
}

const runtime = web.useThemeRuntime();

const readouts = document.querySelectorAll<HTMLElement>("[data-tv-readout]");

function render(): void {
  const values: Record<string, string> = {
    theme: String(runtime.store.get().name),
    "effective-mode": runtime.selection.getEffectiveMode(),
    family: runtime.selection.getFamily(),
    mode: runtime.selection.getMode(),
  };

  for (const node of readouts) {
    const key = node.getAttribute("data-tv-readout");
    const next = key ? values[key] : undefined;
    // The pre-paint script has already written the same value; only mutate on
    // a real change, so mounting this module cannot replace the text node.
    if (next && node.textContent !== next) node.textContent = next;
  }
}

runtime.store.subscribe(render);
runtime.selection.subscribe(render);
render();

document.querySelector("#pick-plum")?.addEventListener("click", () => {
  runtime.selection.setFamily("plum");
});

document.querySelector("#pick-harbor")?.addEventListener("click", () => {
  runtime.selection.setFamily("harbor");
});

document.querySelector("#reload")?.addEventListener("click", () => {
  window.location.reload();
});
