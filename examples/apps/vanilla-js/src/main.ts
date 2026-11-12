/**
 * The application module.
 *
 * `new Themvora()` takes no configuration: the Vite plugin injected
 * `window.__THEMVORA_CONFIG__` from `theme.config.ts` before this module ran,
 * and the pre-paint script already applied the saved selection. The instance
 * adopts that state and owns every change from here on.
 */
import {
  createOverlayScrollbar,
  createScopedThemeBinding,
  type ThemeDefinition,
} from "@themvora/core";
import { Themvora } from "@themvora/core/vanilla";

const kit = new Themvora();

/** Fail loudly at startup rather than on the first click. */
function query<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`index.html must contain ${selector}`);
  return element;
}

// Scoped to the segmented control on purpose: `createScopedThemeBinding()` also
// writes `data-mode` onto the element it owns, so a document-wide `[data-mode]`
// query would treat the scoped region as a mode button.
const modeButtons = Array.from(
  document.querySelectorAll<HTMLButtonElement>(".segmented [data-mode]"),
);
const familySelect = query<HTMLSelectElement>("#family");
const toggle = query<HTMLButtonElement>("#toggle");
const scopeElement = query<HTMLElement>("#scope");
const scopeState = query<HTMLElement>("#scope-state");
const pinButton = query<HTMLButtonElement>("#pin-scope");

const readouts = {
  theme: query<HTMLElement>('[data-tv-readout="theme"]'),
  mode: query<HTMLElement>('[data-tv-readout="mode"]'),
  effective: query<HTMLElement>('[data-tv-readout="effective-mode"]'),
  family: query<HTMLElement>('[data-tv-readout="family"]'),
};

/* ---------- the scoped region ---------- */

const PINNED_THEME = "plum-dark";
let pinned = false;
let scopedTheme = String(kit.theme.name);

const scope = createScopedThemeBinding<ThemeDefinition>(
  kit.themes,
  scopeElement,
  scopedTheme,
);

/* ---------- render ---------- */

/**
 * Mirror the runtime into the page.
 *
 * This runs on the instance's events, which fire **after** the new theme is on
 * the document. That ordering is the contract, not an accident: a handler that
 * read the instance during the selection event would run while the document
 * still carried the previous theme, so a label or a scoped region would change
 * one frame before the page — which is what a rapid sequence of toggles turns
 * into visible flicker.
 */
function render(): void {
  const theme = kit.theme;
  const name = String(theme.name);

  readouts.theme.textContent = name;
  readouts.mode.textContent = kit.mode;
  readouts.effective.textContent = kit.resolvedMode;
  readouts.family.textContent = kit.family;

  for (const button of modeButtons) {
    button.setAttribute(
      "aria-pressed",
      String(button.dataset.mode === kit.mode),
    );
  }
  familySelect.value = kit.family;

  toggle.setAttribute(
    "aria-label",
    kit.resolvedMode === "dark"
      ? "Switch to light mode"
      : "Switch to dark mode",
  );

  // Only touch the scope when the theme it should follow actually moved.
  // Re-applying the same selection rewrites every variable on the element for
  // nothing, and on a rapid sequence of changes that redundant work is what
  // makes the subtree lag the page.
  if (!pinned && name !== scopedTheme) {
    scopedTheme = name;
    scope.update(name);
  }
  scopeState.textContent = pinned
    ? `pinned to ${PINNED_THEME}`
    : `following the page · ${name}`;
}

/* ---------- controls ---------- */

document.querySelector(".segmented")?.addEventListener("click", (event) => {
  const button = (event.target as HTMLElement).closest<HTMLElement>(
    "[data-mode]",
  );
  if (!button) return;
  const mode = button.dataset.mode;
  if (mode === "light" || mode === "dark" || mode === "system")
    kit.setMode(mode);
});

familySelect.addEventListener("change", () => {
  kit.setFamily(familySelect.value);
});

toggle.addEventListener("click", () => {
  kit.toggleTheme();
});

pinButton.addEventListener("click", () => {
  pinned = !pinned;
  pinButton.setAttribute("aria-pressed", String(pinned));
  pinButton.textContent = pinned
    ? "Follow the page again"
    : `Pin to ${PINNED_THEME}`;

  scopedTheme = pinned ? PINNED_THEME : String(kit.theme.name);
  scope.update(scopedTheme);
  scopeState.textContent = pinned
    ? `pinned to ${PINNED_THEME}`
    : `following the page · ${scopedTheme}`;
});

// One subscription per event name. Each is emitted once per logical change and
// only after the document has the new theme, so a single handler is enough.
kit.on("themeChange", render);
kit.on("modeChange", render);
kit.on("familyChange", render);

render();

/* ---------- the overlay scrollbar ---------- */

// The native bar is already hidden: `themvoraVitePlugin({ scrollbar: true })`
// injected the pre-paint class, so the overlay only has to draw the thumb and
// its arrows. Bound to the runtime's store, the thumb is a theme token like
// every other surface on the page.
createOverlayScrollbar(kit.runtime.store, {
  arrowUpIcon: `<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 80 80"><path fill="currentColor" d="M36.964 17.7a3 3 0 1 1 6 .004zm3 .078l3 .002zm0 .889l-3-.003zm0 .888l3 .002zm-.001.89l3 .001zm-.001.888l-3-.002zm0 .889h-3v-.002zm3 20.074a3 3 0 0 1-6 0zm-6 .037a3 3 0 0 1 6 0zm6 21.667a3 3 0 0 1-6 0zm.002-46.296v.075l-6-.003V17.7zm0 .075v.89l-6-.005v-.888zm0 .89v.888l-6-.004v-.889zm0 .888l-.001.89l-6-.005v-.889zm-.001.89l-.001.888l-6-.004v-.889zm-.001.888v.889l-6-.004v-.889zm0 .887v20.074h-6V22.222zm0 20.111V64h-6V42.333z"/><path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="6" d="m15.11 39.11l21.177-21.176a5.25 5.25 0 0 1 7.425 0l21.176 21.177"/></g></svg>`,
  arrowDownIcon: `<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24"><title>arrow-down-bold-duotone</title><path fill="currentColor" fill-rule="evenodd" d="M12 3.25C12.4142 3.25 12.75 3.58579 12.75 4L12.75 13.25H11.25L11.25 4C11.25 3.58579 11.5858 3.25 12 3.25Z" clip-rule="evenodd" opacity=".5"/><path fill="currentColor" d="M6.00002 13.25C5.69667 13.25 5.4232 13.4327 5.30711 13.713C5.19103 13.9932 5.25519 14.3158 5.46969 14.5303L11.4697 20.5303C11.6103 20.671 11.8011 20.75 12 20.75C12.1989 20.75 12.3897 20.671 12.5304 20.5303L18.5304 14.5303C18.7449 14.3158 18.809 13.9932 18.6929 13.713C18.5768 13.4327 18.3034 13.25 18 13.25L6.00002 13.25Z"/></svg>`,
  iconSize: 20,
  offset: { right: 0.2 },
  thickness: 9,
});
