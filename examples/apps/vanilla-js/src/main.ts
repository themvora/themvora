/**
 * The app's only script.
 *
 * Everything visible is in `index.html`; this file wires the controls to the
 * runtime and keeps the readouts in step. The theme catalog is not passed here:
 * `themvoraVitePlugin()` transports `theme.config.ts` to the page, so
 * `new Themvora()` starts with the same catalog the pre-paint script painted.
 */
import { Themvora } from "@themvora/core/vanilla";
import {
  createOverlayScrollbar,
  createScopedThemeBinding,
  type ThemeDefinition,
  type ThemeMode,
} from "@themvora/core";

const kit = new Themvora();

function query<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) {
    throw new Error(`index.html must contain ${selector}`);
  }
  return element;
}

const familySelect = query<HTMLSelectElement>("#family");
const modeSelect = query<HTMLSelectElement>("#mode");
const toggle = query<HTMLButtonElement>("#toggle");
const scopeElement = query<HTMLElement>("#scope");
const scopeState = query<HTMLElement>("#scope-state");
const pinButton = query<HTMLButtonElement>("#pin-scope");

const readouts = {
  theme: query<HTMLElement>('[data-readout="theme"]'),
  mode: query<HTMLElement>('[data-readout="mode"]'),
  family: query<HTMLElement>('[data-readout="family"]'),
  selection: query<HTMLElement>('[data-readout="selection"]'),
};

/* ---------- The scoped region ---------- */

const PINNED_THEME = "plum-dark";
let pinned = false;

const scope = createScopedThemeBinding(
  kit.runtime.themes as readonly ThemeDefinition[],
  scopeElement,
  kit.theme.name,
  {},
);

/* ---------- Render ---------- */

function render(): void {
  const theme = kit.theme;
  const applied = String(theme.meta?.mode ?? "light");

  readouts.theme.textContent = String(theme.name);
  readouts.mode.textContent = applied;
  readouts.family.textContent = String(theme.meta?.family ?? "default");
  readouts.selection.textContent = kit.mode;

  // The controls mirror the runtime, so a change made anywhere else (the
  // toggle, a future URL parameter) is reflected here too.
  familySelect.value = kit.family;
  modeSelect.value = kit.mode;

  toggle.setAttribute("aria-pressed", String(applied === "dark"));
  toggle.title = applied === "dark" ? "Switch to light" : "Switch to dark";

  if (pinned) {
    scopeState.textContent = `pinned to ${PINNED_THEME}`;
  } else {
    scope.update(theme.name);
    scopeState.textContent = `following the page · ${theme.name}`;
  }
}

/* ---------- Controls ---------- */

familySelect.addEventListener("change", () => {
  kit.setFamily(familySelect.value);
});

modeSelect.addEventListener("change", () => {
  kit.setMode(modeSelect.value as ThemeMode);
});

toggle.addEventListener("click", () => {
  kit.toggleTheme();
});

pinButton.addEventListener("click", () => {
  pinned = !pinned;
  pinButton.setAttribute("aria-pressed", String(pinned));
  pinButton.textContent = pinned ? "Follow the page again" : `Pin to ${PINNED_THEME}`;

  if (pinned) {
    scope.update(PINNED_THEME);
    scopeState.textContent = `pinned to ${PINNED_THEME}`;
  } else {
    scope.update(kit.theme.name);
    scopeState.textContent = `following the page · ${kit.theme.name}`;
  }
});

kit.on("themeChange", render);
kit.on("modeChange", render);
kit.on("familyChange", render);

/* ---------- The overlay scrollbar ---------- */

// The native bar is already hidden: `themvoraVitePlugin({ scrollbar: true })`
// injected the pre-paint class, so the engine only has to draw the overlay.
createOverlayScrollbar(kit.runtime.store);

render();
